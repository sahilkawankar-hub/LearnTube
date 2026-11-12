import { GEMINI_MODEL } from '../config';
import {
  Course,
  Lesson,
  TranscriptSegment,
  TranscriptWindow,
  WindowOutlineLesson,
} from '../types';
import { formatDuration } from '../utils/planner';
import { getCanonicalYouTubeWatchUrl } from '../utils/youtube';
import { sliceTranscript } from '../utils/chunker';
import { VideoMetadataInfo } from '../hooks/useVideoInfo';
import {
  CourseBuilderError,
  LESSON_CONTENT_RESPONSE_SCHEMA,
  Type,
  ValidatedLessonContentResponse,
  callGeminiGenerateContent,
  parseGeminiJsonResponse,
  slugifyTitle,
  validateLessonContentResponse,
} from './courseBuilder';

export { GEMINI_MODEL };

export interface WindowOutlineResponse {
  courseDescription?: string;
  category?: string;
  lessons: WindowOutlineLesson[];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Validates the outline returned for a single 30-minute transcript window.
 */
export function validateWindowOutlineResponse(
  raw: unknown,
  windowStartSeconds: number,
  windowEndSeconds: number,
  videoDurationSeconds: number
): WindowOutlineResponse {
  if (!raw || typeof raw !== 'object') {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'Received an invalid window outline format from Gemini.'
    );
  }

  const obj = raw as Record<string, unknown>;
  const rawLessons = Array.isArray(obj.lessons) ? obj.lessons : [];

  if (rawLessons.length === 0) {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'Gemini returned an empty lesson outline for this transcript window.'
    );
    /* Legacy fallback intentionally disabled: malformed Gemini output must fail visibly.
    return {
      courseDescription:
        typeof obj.courseDescription === 'string'
          ? obj.courseDescription.trim()
          : undefined,
      category:
        typeof obj.category === 'string' ? obj.category.trim() : undefined,
      lessons: [
        {
          title: `Core Concepts (${Math.floor(windowStartSeconds / 60)}m–${Math.floor(
            windowEndSeconds / 60
          )}m)`,
          summaryDescription:
            'Key ideas and explanations covered in this lecture segment.',
          startSeconds: windowStartSeconds,
          endSeconds: Math.min(
            videoDurationSeconds,
            Math.max(windowStartSeconds + 300, windowEndSeconds)
          ),
          conceptTag: 'Core Concept',
        },
      ],
    }; */
  }

  const lessons: WindowOutlineLesson[] = [];
  let cursor = windowStartSeconds;
  const maxSpan = Math.max(windowEndSeconds, videoDurationSeconds);

  for (let i = 0; i < rawLessons.length; i++) {
    const item = rawLessons[i] as Record<string, unknown>;
    if (!item || typeof item !== 'object') continue;

    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const summaryDescription =
      typeof item.summaryDescription === 'string'
        ? item.summaryDescription.trim()
        : '';
    const conceptTag =
      typeof item.conceptTag === 'string' && item.conceptTag.trim()
        ? item.conceptTag.trim()
        : 'Core Concept';

    if (!title || !summaryDescription) continue;

    const rawStart =
      typeof item.startSeconds === 'number' && !Number.isNaN(item.startSeconds)
        ? Math.floor(item.startSeconds)
        : cursor;

    const rawEnd =
      typeof item.endSeconds === 'number' && !Number.isNaN(item.endSeconds)
        ? Math.floor(item.endSeconds)
        : rawStart + 600;

    const startSeconds = clamp(
      Math.max(cursor, rawStart),
      windowStartSeconds,
      Math.max(windowStartSeconds, maxSpan - 30)
    );
    const endSeconds = clamp(
      Math.max(startSeconds + 120, rawEnd),
      startSeconds + 60,
      maxSpan
    );

    lessons.push({
      title,
      summaryDescription,
      startSeconds,
      endSeconds,
      conceptTag,
    });

    cursor = Math.min(maxSpan, endSeconds);
  }

  if (lessons.length === 0) {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'No valid lessons could be parsed for this transcript window.'
    );
  }

  return {
    courseDescription:
      typeof obj.courseDescription === 'string'
        ? obj.courseDescription.trim()
        : undefined,
    category:
      typeof obj.category === 'string' ? obj.category.trim() : undefined,
    lessons,
  };
}

/**
 * MERGE STEP:
 * Joins lessons from all windows in chronological order:
 * - Fixes overlaps by trimming the earlier lesson's endSeconds.
 * - Fixes gaps by extending the earlier lesson's endSeconds to the next lesson's startSeconds.
 * - Ensures the first lesson starts at 0 and the last lesson ends at videoDurationSeconds.
 * - Renumbers sequenceNumber from 1.
 */
export function mergeWindowLessons(
  windowLessonsMap: Record<number, WindowOutlineLesson[]>,
  totalWindows: number,
  videoDurationSeconds: number,
  courseId: string,
  videoId: string,
  existingLessons: Lesson[] = []
): Lesson[] {
  const flat: WindowOutlineLesson[] = [];

  for (let w = 0; w < totalWindows; w++) {
    const windowItems = windowLessonsMap[w] || [];
    for (const item of windowItems) {
      flat.push({ ...item });
    }
  }

  if (flat.length === 0) {
    return existingLessons;
  }

  flat.sort((a, b) => a.startSeconds - b.startSeconds);

  const safeTotalDuration = Math.max(60, Math.floor(videoDurationSeconds));
  flat[0].startSeconds = 0;

  for (let i = 0; i < flat.length - 1; i++) {
    const current = flat[i];
    const next = flat[i + 1];

    if (next.startSeconds <= current.startSeconds + 60) {
      next.startSeconds = Math.min(
        safeTotalDuration - (flat.length - i) * 30,
        current.startSeconds + 180
      );
    }

    current.endSeconds = next.startSeconds;
  }

  const last = flat[flat.length - 1];
  last.endSeconds = Math.max(last.startSeconds + 60, safeTotalDuration);

  return flat.map((item, idx) => {
    const sequenceNumber = idx + 1;
    const lessonId = `${courseId}_les_${sequenceNumber}`;
    const existing = existingLessons[idx];
    const rawSpan = Math.max(60, item.endSeconds - item.startSeconds);
    const durationSeconds = clamp(rawSpan, 180, 1200);

    if (existing && existing.isGeneratedReady) {
      return {
        ...existing,
        id: lessonId,
        courseId,
        sequenceNumber,
        startSeconds: item.startSeconds,
        endSeconds: item.endSeconds,
        durationSeconds,
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

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxTries = 5
): Promise<T> {
  const backoffDelaysMs = [3000, 6000, 12000, 24000];
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (
        err instanceof CourseBuilderError &&
        (err.errorType === 'MODEL_NOT_AVAILABLE' ||
          err.errorType === 'MISSING_API_KEY' ||
          err.errorType === 'DAILY_VIDEO_LIMIT' ||
          err.errorType === 'PRIVATE_VIDEO')
      ) {
        throw err;
      }

      const isRetryableRateOrOverload =
        err instanceof CourseBuilderError &&
        (err.statusCode === 429 ||
          err.statusCode === 503 ||
          err.errorType === 'RATE_LIMIT');

      if (!isRetryableRateOrOverload || attempt >= maxTries) {
        break;
      }

      const delay =
        backoffDelaysMs[Math.min(attempt - 1, backoffDelaysMs.length - 1)];
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new CourseBuilderError('API_ERROR', 'Operation failed after retries.');
}

export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const queue = items.map((item, index) => ({ item, index }));
  let cursor = 0;

  const runners = Array.from(
    { length: Math.max(1, Math.min(concurrency, queue.length)) },
    async () => {
      while (cursor < queue.length) {
        const currentIdx = cursor++;
        const entry = queue[currentIdx];
        if (!entry) break;
        await worker(entry.item, entry.index);
      }
    }
  );

  await Promise.all(runners);
}

/**
 * STEP A (single 30-min transcript window): calls shared Gemini helper directly.
 */
export async function generateWindowOutline(
  videoInfo: {
    title: string;
    channelName: string;
    durationSeconds: number;
  },
  windowItem: TranscriptWindow,
  totalWindows: number
): Promise<WindowOutlineResponse> {
  const prompt = `You are structuring a long educational video ("${videoInfo.title}" by ${videoInfo.channelName}, total duration: ${videoInfo.durationSeconds}s) into a course.
Below is transcript window ${windowItem.windowIndex + 1} of ${totalWindows}, covering ${windowItem.startSeconds}s to ${windowItem.endSeconds}s.

IMPORTANT RULES:
- Return ONLY the lessons that START inside this window (startSeconds >= ${windowItem.startSeconds} and startSeconds <= ${windowItem.endSeconds}).
- Lines inside [OVERLAP CONTEXT — DO NOT REPEAT IN NEW LESSONS] ... [END OVERLAP CONTEXT] are from the end of the previous window for continuity only — do NOT create new lessons that start inside the overlap block.
- Each lesson should be 5 to 20 minutes long (300 to 1200 seconds) based on natural topic shifts in the transcript.
- Lessons must stay strictly in chronological order, must NOT overlap, and must use timestamps that exist in the transcript (convert [mm:ss] or [h:mm:ss] to integer seconds).
- If the final lesson in this window naturally runs past ${windowItem.endSeconds}s, extend its endSeconds to its natural end (up to ${videoInfo.durationSeconds}s).

TRANSCRIPT WINDOW:
${windowItem.text}`;

  const responseText = await callGeminiGenerateContent({
    contents: [{ text: prompt }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          courseDescription: {
            type: Type.STRING,
            description:
              'Concise 1-2 sentence overview of the course topic (used when windowIndex is 0).',
          },
          category: {
            type: Type.STRING,
            description: 'Short subject category name.',
          },
          lessons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summaryDescription: { type: Type.STRING },
                startSeconds: { type: Type.INTEGER },
                endSeconds: { type: Type.INTEGER },
                conceptTag: { type: Type.STRING },
              },
              required: [
                'title',
                'summaryDescription',
                'startSeconds',
                'endSeconds',
                'conceptTag',
              ],
            },
          },
        },
        required: ['lessons'],
      },
    },
  });

  const parsed = parseGeminiJsonResponse(responseText);
  return validateWindowOutlineResponse(
    parsed,
    windowItem.startSeconds,
    windowItem.endSeconds,
    videoInfo.durationSeconds
  );
}

/**
 * STEP B (single lesson from transcript slice): calls shared Gemini helper directly
 * and reuses validateLessonContentResponse from the short pipeline.
 */
export async function generateTranscriptLessonContent(
  videoTitle: string,
  lesson: Lesson,
  segments: TranscriptSegment[]
): Promise<ValidatedLessonContentResponse> {
  const lessonTranscriptText = sliceTranscript(
    segments,
    lesson.startSeconds,
    lesson.endSeconds
  );

  const prompt = `You are writing study materials for a lesson in "${videoTitle}".
Lesson Title: "${lesson.title}"
Concept Tag: "${lesson.conceptTag}"
Summary: "${lesson.summaryDescription}"
Time Range: ${lesson.startSeconds}s to ${lesson.endSeconds}s

CRITICAL RULE: Base everything strictly and exclusively on what the speaker says in the transcript slice below.

Generate:
1. articleMarkdown:
   - Under 350 words, grounded strictly in what the speaker explains in this transcript slice.
   - Include a Markdown heading (## ...), 2 to 4 short paragraphs, a bullet list of key points, and a short code block ONLY if the topic is technical.
2. quizQuestions:
   - 2 to 3 multiple-choice questions testing concepts from this transcript slice.
   - Each question must have:
     - questionPrompt: Clear, specific question.
     - options: Array of EXACTLY 4 believable string options.
     - correctOptionIndex: Integer from 0 to 3.
     - explanationText: Brief explanation referencing what the speaker said.
     - explanationTimestampSeconds: Integer timestamp in seconds between ${lesson.startSeconds} and ${lesson.endSeconds} where the speaker explains this answer.
     - isPlacementEligible: Boolean (true for about half of the questions).

LESSON TRANSCRIPT SLICE:
${lessonTranscriptText}`;

  const responseText = await callGeminiGenerateContent({
    contents: [{ text: prompt }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: LESSON_CONTENT_RESPONSE_SCHEMA,
    },
  });

  const parsed = parseGeminiJsonResponse(responseText);
  return validateLessonContentResponse(
    parsed,
    lesson.id,
    lesson.startSeconds,
    lesson.endSeconds
  );
}

/**
 * Creates the initial long-video Course shell after Window 1 and Lesson 1 are ready (for manual transcript flow).
 */
export function createInitialLongCourseShell(
  videoInfo: VideoMetadataInfo,
  window0Outline: WindowOutlineResponse,
  lesson1Content: ValidatedLessonContentResponse,
  segments: TranscriptSegment[],
  totalWindows: number
): Course {
  const courseId = `crs_long_${videoInfo.videoId}_${Date.now()}`;
  const slug = slugifyTitle(videoInfo.title, videoInfo.videoId);
  const youtubeUrl = getCanonicalYouTubeWatchUrl(videoInfo.videoId);

  const window0Lessons = window0Outline.lessons;
  const approxPerWindow = Math.max(2, window0Lessons.length);
  const estimatedTotalLessons =
    totalWindows === 1 ? window0Lessons.length : approxPerWindow * totalWindows;

  const initialLessons: Lesson[] = window0Lessons.map((item, idx) => {
    const sequenceNumber = idx + 1;
    const lessonId = `${courseId}_les_${sequenceNumber}`;
    const rawSpan = Math.max(60, item.endSeconds - item.startSeconds);
    const durationSeconds = clamp(rawSpan, 180, 1200);

    if (idx === 0) {
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
        quizQuestions: lesson1Content.quizQuestions,
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

  if (totalWindows > 1 && initialLessons.length < estimatedTotalLessons) {
    const lastWindow0End =
      initialLessons[initialLessons.length - 1]?.endSeconds || 1800;
    const remainingCount = estimatedTotalLessons - initialLessons.length;
    const remainingSeconds = Math.max(
      600,
      videoInfo.durationSeconds - lastWindow0End
    );
    const avgPlaceholderSpan = Math.max(
      300,
      Math.floor(remainingSeconds / remainingCount)
    );

    for (let k = 0; k < remainingCount; k++) {
      const seq = initialLessons.length + 1;
      const startSec = Math.min(
        videoInfo.durationSeconds - 60,
        lastWindow0End + k * avgPlaceholderSpan
      );
      const endSec =
        k === remainingCount - 1
          ? videoInfo.durationSeconds
          : Math.min(
              videoInfo.durationSeconds,
              startSec + avgPlaceholderSpan
            );

      initialLessons.push({
        id: `${courseId}_les_${seq}`,
        courseId,
        sequenceNumber: seq,
        title: `Upcoming Lesson ${seq} (Planning from transcript...)`,
        summaryDescription:
          'This lesson outline is being extracted from the lecture transcript.',
        durationSeconds: clamp(endSec - startSec, 180, 1200),
        youtubeVideoId: videoInfo.videoId,
        startSeconds: startSec,
        endSeconds: endSec,
        conceptTag: 'Lecture Topic',
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
      window0Outline.courseDescription ||
      `Comprehensive structured course built from the full ${formatDuration(
        videoInfo.durationSeconds
      )} lecture transcript.`,
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
    category: window0Outline.category || 'Long Lecture Course',
    difficulty: 'Intermediate',
    lessons: initialLessons,
    createdAt: new Date().toISOString(),
    isUserGenerated: true,
    pipelineType: 'LONG_TRANSCRIPT',
    isLessonCountApproximate: totalWindows > 1,
    totalTranscriptWindows: totalWindows,
    completedTranscriptWindows: 1,
    transcriptSegmentsCheckpoint: segments,
    windowLessonsCheckpoint: {
      0: window0Lessons,
    },
    buildStatus:
      totalWindows === 1 && initialLessons.length === 1
        ? 'COMPLETED'
        : 'LESSON_1_READY',
    completedLessonsCheckpoint: 1,
    currentlyBuildingLessonNumber: 2,
    estimatedSecondsRemaining: Math.max(
      15,
      (totalWindows - 1) * 8 + (estimatedTotalLessons - 1) * 4
    ),
  };
}
