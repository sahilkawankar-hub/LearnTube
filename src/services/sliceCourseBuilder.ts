import { GEMINI_MODEL } from '../config';
import { Course, Lesson, WindowOutlineLesson } from '../types';
import { formatDuration } from '../utils/planner';
import { VideoSlice, makeSlices } from '../utils/slicer';
import { getCanonicalYouTubeWatchUrl } from '../utils/youtube';
import { VideoMetadataInfo } from '../hooks/useVideoInfo';
import {
  CourseBuilderError,
  DAILY_VIDEO_LIMIT_MESSAGE,
  MediaResolution,
  OUTLINE_RESPONSE_SCHEMA,
  ValidatedLessonContentResponse,
  ValidatedOutlineResponse,
  callGeminiGenerateContent,
  generateSingleLessonContent,
  isRetryableRateLimitOrServerError,
  mapGeminiSdkError,
  parseGeminiJsonResponse,
  slugifyTitle,
  validateOutlineResponse,
} from './courseBuilder';

export { GEMINI_MODEL, DAILY_VIDEO_LIMIT_MESSAGE };

/**
 * Toggle for slice timestamp interpretation:
 * - true: Instructs Gemini to report lesson timestamps relative to the start of the 20-minute clip (0..clipLength),
 *         then adds slice.startSeconds in code before clamping into [slice.startSeconds, slice.endSeconds].
 * - false: Instructs Gemini to report absolute video timestamps and clamps into [slice.startSeconds, slice.endSeconds].
 */
export const TIMESTAMPS_RELATIVE_TO_CLIP = true;

export const SLICE_DURATION_SECONDS = 1200; // 20 minutes per slice
export const ESTIMATED_SECONDS_PER_SLICE = 40; // ~40s per slice for build time estimate

export interface SliceOutlineResponse {
  courseDescription: string;
  category: string;
  lessons: WindowOutlineLesson[];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Estimates total build time in minutes for a long video using ~40 seconds per 20-minute slice.
 */
export function estimateSliceBuildMinutes(durationSeconds: number): number {
  const slices = makeSlices(durationSeconds, SLICE_DURATION_SECONDS);
  const totalEstimatedSeconds = Math.max(
    40,
    slices.length * ESTIMATED_SECONDS_PER_SLICE
  );
  return Math.max(1, Math.round(totalEstimatedSeconds / 60));
}

/**
 * Retries an async operation with waits of 3s, 6s, 12s, 24s ONLY on 429 or 503 errors.
 * Immediately stops without retrying on MODEL_NOT_AVAILABLE, DAILY_VIDEO_LIMIT, MISSING_API_KEY, or PRIVATE_VIDEO.
 */
export async function withSliceBackoff<T>(fn: () => Promise<T>): Promise<T> {
  const waitDelaysMs = [3000, 6000, 12000, 24000];
  let lastError: unknown;

  for (let attempt = 0; attempt <= waitDelaysMs.length; attempt++) {
    try {
      return await fn();
    } catch (rawErr) {
      const mapped = mapGeminiSdkError(rawErr);
      lastError = mapped;

      if (
        mapped.errorType === 'MODEL_NOT_AVAILABLE' ||
        mapped.errorType === 'DAILY_VIDEO_LIMIT' ||
        mapped.errorType === 'MISSING_API_KEY' ||
        mapped.errorType === 'PRIVATE_VIDEO'
      ) {
        throw mapped;
      }

      if (
        isRetryableRateLimitOrServerError(mapped) &&
        attempt < waitDelaysMs.length
      ) {
        const waitMs = waitDelaysMs[attempt];
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
        continue;
      }

      throw mapped;
    }
  }

  throw lastError instanceof CourseBuilderError
    ? lastError
    : mapGeminiSdkError(lastError);
}

/**
 * Queue runner with configurable concurrency limit.
 * If any worker throws a DAILY_VIDEO_LIMIT or MODEL_NOT_AVAILABLE error, the queue halts remaining items and rethrows it.
 */
export async function runSliceQueue<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const queue = items.map((item, index) => ({ item, index }));
  let cursor = 0;
  let fatalStopError: CourseBuilderError | null = null;

  const runners = Array.from(
    { length: Math.max(1, Math.min(concurrency, queue.length)) },
    async () => {
      while (cursor < queue.length && !fatalStopError) {
        const currentIdx = cursor++;
        const entry = queue[currentIdx];
        if (!entry) break;
        try {
          await worker(entry.item, entry.index);
        } catch (err) {
          if (
            err instanceof CourseBuilderError &&
            (err.errorType === 'DAILY_VIDEO_LIMIT' ||
              err.errorType === 'MODEL_NOT_AVAILABLE')
          ) {
            fatalStopError = err;
            break;
          }
          throw err;
        }
      }
    }
  );

  await Promise.all(runners);

  if (fatalStopError) {
    throw fatalStopError;
  }
}

/**
 * Validates and clamps slice outline timestamps into [slice.startSeconds, slice.endSeconds].
 * Uses validateOutlineResponse from the short pipeline and applies TIMESTAMPS_RELATIVE_TO_CLIP offset.
 */
export function validateSliceOutlineResponse(
  raw: unknown,
  slice: VideoSlice
): SliceOutlineResponse {
  const clipDuration = Math.max(60, slice.endSeconds - slice.startSeconds);

  let baseValidated: ValidatedOutlineResponse;
  try {
    baseValidated = validateOutlineResponse(
      raw,
      TIMESTAMPS_RELATIVE_TO_CLIP ? clipDuration : slice.endSeconds
    );
  } catch (error) {
    throw error;
    // Fallback single lesson covering the slice if Gemini returned an empty/unparseable outline for this slice
    /* Legacy fallback intentionally disabled: malformed Gemini output must fail visibly.
    return {
      courseDescription:
        'Structured course built by watching the video in 20-minute parts.',
      category: 'Video Course',
      lessons: [
        {
          title: `Part ${slice.sliceIndex + 1} (${Math.floor(
            slice.startSeconds / 60
          )}m–${Math.floor(slice.endSeconds / 60)}m)`,
          summaryDescription:
            'Core concepts and demonstrations covered in this part of the video.',
          startSeconds: slice.startSeconds,
          endSeconds: slice.endSeconds,
          conceptTag: 'Core Concept',
        },
      ],
    }; */
  }

  const clampedLessons: WindowOutlineLesson[] = [];
  let cursor = slice.startSeconds;

  for (const item of baseValidated.lessons) {
    const rawStart = item.startSeconds;
    const rawEnd = item.endSeconds;

    let absStart: number;
    let absEnd: number;

    if (TIMESTAMPS_RELATIVE_TO_CLIP) {
      absStart = slice.startSeconds + rawStart;
      absEnd = slice.startSeconds + rawEnd;
    } else {
      absStart = rawStart;
      absEnd = rawEnd;
    }

    const startSeconds = clamp(
      Math.max(cursor, absStart),
      slice.startSeconds,
      Math.max(slice.startSeconds, slice.endSeconds - 30)
    );
    const endSeconds = clamp(
      Math.max(startSeconds + 60, absEnd),
      Math.min(slice.endSeconds, startSeconds + 30),
      slice.endSeconds
    );

    if (endSeconds <= startSeconds) continue;

    clampedLessons.push({
      title: item.title,
      summaryDescription: item.summaryDescription,
      startSeconds,
      endSeconds,
      conceptTag: item.conceptTag,
    });

    cursor = endSeconds;
    if (cursor >= slice.endSeconds - 15) {
      break;
    }
  }

  if (clampedLessons.length === 0) {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'Gemini returned no usable lessons for this video slice. Please retry.'
    );
    clampedLessons.push({
      title: `Part ${slice.sliceIndex + 1} (${Math.floor(
        slice.startSeconds / 60
      )}m–${Math.floor(slice.endSeconds / 60)}m)`,
      summaryDescription:
        'Core concepts and explanations covered in this segment.',
      startSeconds: slice.startSeconds,
      endSeconds: slice.endSeconds,
      conceptTag: 'Core Concept',
    });
  }

  return {
    courseDescription: baseValidated.courseDescription,
    category: baseValidated.category,
    lessons: clampedLessons,
  };
}

/**
 * STEP A (per slice):
 * Sends the YouTube URL with videoMetadata { startOffset, endOffset } set to the slice range
 * and mediaResolution set to LOW to save tokens.
 * Asks for the lessons (5 to 20 minutes each, in order, no overlap) that START inside this slice.
 */
export async function generateSliceOutline(
  videoInfo: {
    videoId: string;
    title: string;
    channelName: string;
    durationSeconds: number;
  },
  slice: VideoSlice,
  totalSlices: number
): Promise<SliceOutlineResponse> {
  const youtubeUrl = getCanonicalYouTubeWatchUrl(videoInfo.videoId);
  const clipDuration = Math.max(60, slice.endSeconds - slice.startSeconds);

  const timestampInstruction = TIMESTAMPS_RELATIVE_TO_CLIP
    ? `IMPORTANT TIMESTAMP RULE: Report startSeconds and endSeconds as seconds from the START OF THIS CLIP (from 0 to ${clipDuration}), NOT from the start of the full video. For example, the beginning of this clip is 0 and the end of this clip is ${clipDuration}.`
    : `IMPORTANT TIMESTAMP RULE: Report startSeconds and endSeconds as seconds between ${slice.startSeconds} and ${slice.endSeconds}.`;

  const prompt = `Watch this part (Part ${slice.sliceIndex + 1} of ${totalSlices}, clip length: ${clipDuration} seconds) of the YouTube video "${videoInfo.title}" by ${videoInfo.channelName}.

Identify the structured lessons that START inside this slice.
Requirements:
- Return 1 to 4 lessons covering this ${Math.round(clipDuration / 60)}-minute clip.
- Lessons should be 5 to 20 minutes long (300 to 1200 seconds), strictly in chronological order, with no overlap.
- ${timestampInstruction}
- For each lesson provide:
  1. title: Clear, specific educational title for the segment.
  2. summaryDescription: Exactly one concise sentence summarizing what the learner will master.
  3. startSeconds: Integer start time in seconds.
  4. endSeconds: Integer end time in seconds (> startSeconds).
  5. conceptTag: Short concept label of 2 to 4 words.`;

  const responseText = await callGeminiGenerateContent({
    contents: [
      {
        fileData: {
          fileUri: youtubeUrl,
          mimeType: 'video/*',
        },
        videoMetadata: {
          startOffset: `${Math.max(0, Math.floor(slice.startSeconds))}s`,
          endOffset: `${Math.max(
            slice.startSeconds + 1,
            Math.floor(slice.endSeconds)
          )}s`,
        },
      },
      { text: prompt },
    ],
    config: {
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
      responseMimeType: 'application/json',
      responseSchema: OUTLINE_RESPONSE_SCHEMA,
    },
  });

  const parsed = parseGeminiJsonResponse(responseText);
  return validateSliceOutlineResponse(parsed, slice);
}

/**
 * MERGE:
 * After all slices complete:
 * - Joins lessons in order across all slices.
 * - Fixes overlaps by trimming the earlier lesson's endSeconds.
 * - Fixes gaps by extending the earlier lesson's endSeconds.
 * - Makes the first lesson start at 0 and the last lesson end at videoDurationSeconds.
 * - Renumbers sequenceNumber from 1.
 */
export function mergeSliceLessons(
  sliceLessonsMap: Record<number, WindowOutlineLesson[]>,
  totalSlices: number,
  videoDurationSeconds: number,
  courseId: string,
  videoId: string,
  existingLessons: Lesson[] = []
): Lesson[] {
  const ordered: WindowOutlineLesson[] = [];

  for (let s = 0; s < totalSlices; s++) {
    const sliceItems = sliceLessonsMap[s] || [];
    for (const item of sliceItems) {
      ordered.push({ ...item });
    }
  }

  if (ordered.length === 0) {
    return existingLessons;
  }

  const safeTotalDuration = Math.max(60, Math.floor(videoDurationSeconds));

  // Make the first lesson start at 0
  ordered[0].startSeconds = 0;

  // Fix overlaps by trimming the earlier lesson's end, and fix gaps by extending the earlier lesson
  for (let i = 0; i < ordered.length - 1; i++) {
    const earlier = ordered[i];
    const next = ordered[i + 1];

    // Ensure next.startSeconds is strictly after earlier.startSeconds
    if (next.startSeconds <= earlier.startSeconds + 30) {
      next.startSeconds = Math.min(
        safeTotalDuration - (ordered.length - i) * 30,
        earlier.startSeconds + 60
      );
    }

    // Both overlap trimming and gap extension set earlier.endSeconds to next.startSeconds
    earlier.endSeconds = next.startSeconds;
  }

  // Make the last lesson end at the video duration
  const last = ordered[ordered.length - 1];
  last.endSeconds = Math.max(last.startSeconds + 30, safeTotalDuration);

  // Renumber sequenceNumber from 1 and preserve any already-generated lesson content (such as Lesson 1)
  return ordered.map((item, idx) => {
    const sequenceNumber = idx + 1;
    const lessonId = `${courseId}_les_${sequenceNumber}`;
    const existing = existingLessons[idx];
    const rawSpan = Math.max(60, item.endSeconds - item.startSeconds);
    const durationSeconds = clamp(rawSpan, 180, 1200);

    if (existing && existing.isGeneratedReady) {
      const updatedQuestions = (existing.quizQuestions || []).map((q, qIdx) => ({
        ...q,
        id: `${lessonId}_q${qIdx + 1}`,
        lessonId,
        explanationTimestampSeconds: clamp(
          q.explanationTimestampSeconds,
          item.startSeconds,
          item.endSeconds
        ),
      }));

      return {
        ...existing,
        id: lessonId,
        courseId,
        sequenceNumber,
        startSeconds: item.startSeconds,
        endSeconds: item.endSeconds,
        durationSeconds,
        quizQuestions: updatedQuestions,
      };
    }

    return {
      id: lessonId,
      courseId,
      sequenceNumber,
      title: item.title,
      summaryDescription: item.summaryDescription,
      durationSeconds,
      youtubeVideoId: videoId,
      startSeconds: item.startSeconds,
      endSeconds: item.endSeconds,
      conceptTag: item.conceptTag,
      articleMarkdown: existing?.articleMarkdown || '',
      quizQuestions: existing?.quizQuestions || [],
      isGeneratedReady: Boolean(existing?.isGeneratedReady),
      hasBuildFailed: Boolean(existing?.hasBuildFailed),
    };
  });
}

/**
 * STEP B (per lesson):
 * Reuses the existing short-pipeline Step B (generateSingleLessonContent with videoMetadata
 * set to the lesson's startSeconds and endSeconds, and identical validation), wrapped in
 * slice backoff (3s, 6s, 12s, 24s) for 429/503 resilience.
 */
export async function generateSliceLessonContent(
  youtubeUrl: string,
  videoTitle: string,
  lesson: Lesson
): Promise<ValidatedLessonContentResponse> {
  return generateSingleLessonContent(youtubeUrl, videoTitle, lesson);
}

/**
 * Creates the initial Course shell after Slice 1 (Step A) and Lesson 1 (Step B) complete.
 * Labels lesson count as approximate ("about X") until all slices finish and merge.
 */
export function createInitialSliceCourseShell(
  videoInfo: VideoMetadataInfo,
  slice0Outline: SliceOutlineResponse,
  lesson1Content: ValidatedLessonContentResponse,
  slices: VideoSlice[]
): Course {
  const courseId = `crs_slice_${videoInfo.videoId}_${Date.now()}`;
  const slug = slugifyTitle(videoInfo.title, videoInfo.videoId);
  const youtubeUrl = getCanonicalYouTubeWatchUrl(videoInfo.videoId);
  const totalSlices = slices.length;

  const slice0Lessons = slice0Outline.lessons;
  const approxPerSlice = Math.max(2, slice0Lessons.length);
  const estimatedTotalLessons =
    totalSlices === 1 ? slice0Lessons.length : approxPerSlice * totalSlices;

  const initialLessons: Lesson[] = slice0Lessons.map((item, idx) => {
    const sequenceNumber = idx + 1;
    const lessonId = `${courseId}_les_${sequenceNumber}`;
    const rawSpan = Math.max(60, item.endSeconds - item.startSeconds);
    const durationSeconds = clamp(rawSpan, 180, 1200);

    if (idx === 0) {
      const rekeyedQuestions = lesson1Content.quizQuestions.map((q, qIdx) => ({
        ...q,
        id: `${lessonId}_q${qIdx + 1}`,
        lessonId,
      }));
      return {
        id: lessonId,
        courseId,
        sequenceNumber,
        title: item.title,
        summaryDescription: item.summaryDescription,
        durationSeconds,
        youtubeVideoId: videoInfo.videoId,
        startSeconds: 0,
        endSeconds: item.endSeconds,
        conceptTag: item.conceptTag,
        articleMarkdown: lesson1Content.articleMarkdown,
        quizQuestions: rekeyedQuestions,
        isGeneratedReady: true,
        hasBuildFailed: false,
      };
    }

    return {
      id: lessonId,
      courseId,
      sequenceNumber,
      title: item.title,
      summaryDescription: item.summaryDescription,
      durationSeconds,
      youtubeVideoId: videoInfo.videoId,
      startSeconds: item.startSeconds,
      endSeconds: item.endSeconds,
      conceptTag: item.conceptTag,
      articleMarkdown: '',
      quizQuestions: [],
      isGeneratedReady: false,
      hasBuildFailed: false,
    };
  });

  // Add locked shimmer placeholder lessons for slices 2..N so the study plan displays right away
  if (totalSlices > 1 && initialLessons.length < estimatedTotalLessons) {
    const lastSlice0End =
      initialLessons[initialLessons.length - 1]?.endSeconds ||
      slices[0].endSeconds;
    const remainingCount = estimatedTotalLessons - initialLessons.length;
    const remainingSeconds = Math.max(
      600,
      videoInfo.durationSeconds - lastSlice0End
    );
    const avgPlaceholderSpan = Math.max(
      300,
      Math.floor(remainingSeconds / remainingCount)
    );

    for (let k = 0; k < remainingCount; k++) {
      const seq = initialLessons.length + 1;
      const startSec = Math.min(
        videoInfo.durationSeconds - 60,
        lastSlice0End + k * avgPlaceholderSpan
      );
      const endSec =
        k === remainingCount - 1
          ? videoInfo.durationSeconds
          : Math.min(videoInfo.durationSeconds, startSec + avgPlaceholderSpan);

      initialLessons.push({
        id: `${courseId}_les_${seq}`,
        courseId,
        sequenceNumber: seq,
        title: `Upcoming Lesson ${seq} (Watching video slice...)`,
        summaryDescription:
          'This lesson will unlock automatically as Gemini finishes watching the remaining 20-minute parts.',
        durationSeconds: clamp(endSec - startSec, 180, 1200),
        youtubeVideoId: videoInfo.videoId,
        startSeconds: startSec,
        endSeconds: endSec,
        conceptTag: 'Upcoming Topic',
        articleMarkdown: '',
        quizQuestions: [],
        isGeneratedReady: false,
        hasBuildFailed: false,
      });
    }
  }

  return {
    id: courseId,
    slug,
    title: videoInfo.title,
    description:
      slice0Outline.courseDescription ||
      `Structured course built by watching the full ${formatDuration(
        videoInfo.durationSeconds
      )} video in 20-minute parts.`,
    youtubeUrl,
    youtubeVideoId: videoInfo.videoId,
    youtubeSourceId: videoInfo.videoId,
    channelName: videoInfo.channelName,
    thumbnailUrl: videoInfo.thumbnailUrl,
    thumbnailTheme: 'cs',
    totalDuration: formatDuration(videoInfo.durationSeconds),
    totalDurationMinutes: Math.max(
      1,
      Math.round(videoInfo.durationSeconds / 60)
    ),
    lessonCount: estimatedTotalLessons,
    learnerCount: 1,
    category: slice0Outline.category || 'Long Video Course',
    difficulty: 'Intermediate',
    lessons: initialLessons,
    createdAt: new Date().toISOString(),
    isUserGenerated: true,
    pipelineType: 'LONG_SLICE',
    isLessonCountApproximate: totalSlices > 1,
    totalVideoSlices: totalSlices,
    completedVideoSlices: 1,
    sliceLessonsCheckpoint: {
      0: slice0Lessons,
    },
    isDailyLimitPaused: false,
    buildStatus:
      totalSlices === 1 && initialLessons.length === 1
        ? 'COMPLETED'
        : 'LESSON_1_READY',
    completedLessonsCheckpoint: 1,
    currentlyBuildingLessonNumber: 2,
    estimatedSecondsRemaining: Math.max(
      20,
      (totalSlices - 1) * ESTIMATED_SECONDS_PER_SLICE
    ),
  };
}
