import { GEMINI_MODEL, GEMINI_MODELS } from '../config';
import { Course, Lesson, QuizQuestion } from '../types';
import { formatDuration } from '../utils/planner';
import { getCanonicalYouTubeWatchUrl } from '../utils/youtube';
import { VideoMetadataInfo } from '../hooks/useVideoInfo';

export { GEMINI_MODEL, GEMINI_MODELS };

export const Type = {
  TYPE_UNSPECIFIED: 'TYPE_UNSPECIFIED',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
  NULL: 'NULL',
} as const;

export const MediaResolution = {
  MEDIA_RESOLUTION_UNSPECIFIED: 'MEDIA_RESOLUTION_UNSPECIFIED',
  MEDIA_RESOLUTION_LOW: 'MEDIA_RESOLUTION_LOW',
  MEDIA_RESOLUTION_MEDIUM: 'MEDIA_RESOLUTION_MEDIUM',
  MEDIA_RESOLUTION_HIGH: 'MEDIA_RESOLUTION_HIGH',
} as const;

export interface Schema {
  type?: string;
  description?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
}

export interface GeminiGenerateContentRequest {
  contents: unknown;
  config?: Record<string, unknown>;
}

export type DashboardBuildStep =
  | 'IDLE'
  | 'READING_VIDEO'
  | 'PLANNING_LESSONS'
  | 'WRITING_LESSON_1';

export type CourseBuilderErrorType =
  | 'MISSING_API_KEY'
  | 'MODEL_NOT_AVAILABLE'
  | 'RATE_LIMIT'
  | 'DAILY_VIDEO_LIMIT'
  | 'PRIVATE_VIDEO'
  | 'INVALID_JSON'
  | 'NETWORK'
  | 'API_ERROR';

export const DAILY_VIDEO_LIMIT_MESSAGE =
  "Gemini's daily video limit was reached. Your progress is saved. Tap Resume tomorrow, or use a paid API key.";

export interface ValidatedOutlineItem {
  title: string;
  summaryDescription: string;
  startSeconds: number;
  endSeconds: number;
  conceptTag: string;
}

export interface ValidatedOutlineResponse {
  courseDescription: string;
  category: string;
  lessons: ValidatedOutlineItem[];
}

export interface ValidatedLessonContentResponse {
  articleMarkdown: string;
  quizQuestions: QuizQuestion[];
}

export class CourseBuilderError extends Error {
  errorType: CourseBuilderErrorType;
  statusCode?: number;

  constructor(
    errorType: CourseBuilderErrorType,
    message: string,
    statusCode?: number
  ) {
    super(message);
    this.name = 'CourseBuilderError';
    this.errorType = errorType;
    this.statusCode = statusCode;
  }
}

export function isModelUnsupportedOrNotFoundError(
  rawMessage: string,
  statusCode?: number
): boolean {
  if (statusCode === 404) return true;
  const lower = rawMessage.toLowerCase();
  return (
    rawMessage.includes('PROXY_GENERATION_DISABLED') ||
    lower.includes('proxy_generation_disabled') ||
    lower.includes('not supported') ||
    lower.includes('not found') ||
    lower.includes('404')
  );
}

export function isDailyVideoLimitError(rawMessage: string): boolean {
  const lower = rawMessage.toLowerCase();
  return (
    lower.includes('daily') ||
    lower.includes('per day') ||
    lower.includes('per_day') ||
    lower.includes('day_limit') ||
    lower.includes('youtube video limit') ||
    lower.includes('daily video') ||
    (lower.includes('quota') && lower.includes('video')) ||
    lower.includes('8 hours')
  );
}

export function isRetryableRateLimitOrServerError(
  error: unknown,
  statusCode?: number
): boolean {
  if (error instanceof CourseBuilderError) {
    if (
      error.errorType === 'DAILY_VIDEO_LIMIT' ||
      error.errorType === 'MODEL_NOT_AVAILABLE'
    ) {
      return false;
    }
    return (
      error.errorType === 'RATE_LIMIT' ||
      error.statusCode === 429 ||
      error.statusCode === 503
    );
  }
  const rawMsg = error instanceof Error ? error.message : String(error);
  if (isModelUnsupportedOrNotFoundError(rawMsg, statusCode)) return false;
  if (isDailyVideoLimitError(rawMsg)) return false;

  if (statusCode === 429 || statusCode === 503) return true;

  const lower = rawMsg.toLowerCase();
  return (
    lower.includes('429') ||
    lower.includes('503') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('overloaded') ||
    lower.includes('service unavailable') ||
    lower.includes('unavailable')
  );
}

export function mapGeminiSdkError(
  error: unknown,
  modelName?: string
): CourseBuilderError {
  if (error instanceof CourseBuilderError) {
    return error;
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  const statusCode = (error as { status?: number })?.status;
  const lower = rawMessage.toLowerCase();

  if (isModelUnsupportedOrNotFoundError(rawMessage, statusCode)) {
    const targetModel = modelName || GEMINI_MODEL;
    return new CourseBuilderError(
      'MODEL_NOT_AVAILABLE',
      `This model isn't available in this project: ${targetModel}. Change GEMINI_MODELS in the config file.`,
      404
    );
  }

  if (isDailyVideoLimitError(rawMessage)) {
    return new CourseBuilderError(
      'DAILY_VIDEO_LIMIT',
      DAILY_VIDEO_LIMIT_MESSAGE,
      429
    );
  }

  if (
    lower.includes('missing_api_key') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('unauthenticated') ||
    lower.includes('401')
  ) {
    return new CourseBuilderError(
      'MISSING_API_KEY',
      'Missing or invalid Gemini API key. Please check your key in the Settings > Secrets panel.',
      401
    );
  }

  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('quota')
  ) {
    return new CourseBuilderError(
      'RATE_LIMIT',
      'Gemini API rate limit reached. Please wait a moment and retry.',
      429
    );
  }

  if (
    lower.includes('503') ||
    lower.includes('overloaded') ||
    lower.includes('service unavailable') ||
    lower.includes('unavailable')
  ) {
    return new CourseBuilderError(
      'RATE_LIMIT',
      'Gemini is temporarily busy (HTTP 503). Retrying shortly...',
      503
    );
  }

  if (
    lower.includes('private') ||
    lower.includes('video unavailable') ||
    lower.includes('cannot access video') ||
    lower.includes('age-restricted') ||
    lower.includes('failed_precondition') ||
    (lower.includes('400') && lower.includes('video'))
  ) {
    return new CourseBuilderError(
      'PRIVATE_VIDEO',
      'This YouTube video is private, restricted, or cannot be watched by Gemini. Please try a public video.',
      400
    );
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('fetch failed')
  ) {
    return new CourseBuilderError(
      'NETWORK',
      'Network connection failed while reaching Google Gemini. Please check your internet connection and retry.'
    );
  }

  return new CourseBuilderError(
    'API_ERROR',
    rawMessage ||
      'We encountered an issue while communicating with Gemini. Please try again.'
  );
}

/**
 * Shared Gemini generateContent helper (calls server-side /api/gemini/generate):
 * - Tries models in GEMINI_MODELS in order.
 * - Logs the exact model name and full error message to the browser console on every failed call.
 * - Treats PROXY_GENERATION_DISABLED, "not supported", "not found", or HTTP 404 as NOT retryable on that model
 *   and skips immediately to the next model in GEMINI_MODELS with no waiting.
 * - Only waits and retries (3s, 6s, 12s, 24s) on 503 and 429 errors.
 * - If every model in GEMINI_MODELS is rejected as unsupported/not found, throws:
 *   "This model isn't available in this project: <model name>. Change GEMINI_MODELS in the config file."
 */
export async function callGeminiGenerateContent(
  params: GeminiGenerateContentRequest
): Promise<string> {
  const modelsToTry =
    GEMINI_MODELS.length > 0 ? GEMINI_MODELS : [GEMINI_MODEL];
  const retryDelaysMs = [3000, 6000, 12000, 24000];

  let rejectedCount = 0;
  let lastRejectedModel = modelsToTry[0];

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      try {
        const res = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelName,
            contents: params.contents,
            config: params.config,
          }),
        });

        let payload: {
          text?: string;
          message?: string;
          error?: string;
          statusCode?: number;
        } = {};
        try {
          payload = (await res.json()) as typeof payload;
        } catch {
          // Non-JSON response fallback
        }

        if (!res.ok) {
          const errMessage =
            payload.message ||
            payload.error ||
            `HTTP ${res.status}: ${res.statusText || 'Request failed'}`;
          const sdkErr = new Error(errMessage) as Error & { status?: number };
          sdkErr.status = payload.statusCode || res.status;
          throw sdkErr;
        }

        return payload.text ?? '';
      } catch (err) {
        const fullErrorMessage =
          err instanceof Error ? err.message : String(err);
        const statusCode = (err as { status?: number })?.status;

        console.error(
          `[Gemini API] Model "${modelName}" failed: ${fullErrorMessage}`,
          err
        );

        // Treat PROXY_GENERATION_DISABLED, "not supported", "not found", or HTTP 404 as NOT retryable on this model.
        // Skip to the next model in GEMINI_MODELS immediately without waiting.
        if (isModelUnsupportedOrNotFoundError(fullErrorMessage, statusCode)) {
          rejectedCount++;
          lastRejectedModel = modelName;
          break;
        }

        // Only use waiting and retries for 503 and 429
        if (
          isRetryableRateLimitOrServerError(err, statusCode) &&
          attempt < retryDelaysMs.length
        ) {
          const waitMs = retryDelaysMs[attempt];
          await new Promise((resolve) => window.setTimeout(resolve, waitMs));
          continue;
        }

        throw mapGeminiSdkError(err, modelName);
      }
    }
  }

  if (rejectedCount > 0) {
    throw new CourseBuilderError(
      'MODEL_NOT_AVAILABLE',
      `This model isn't available in this project: ${lastRejectedModel}. Change GEMINI_MODELS in the config file.`,
      404
    );
  }

  throw new CourseBuilderError(
    'MODEL_NOT_AVAILABLE',
    `This model isn't available in this project: ${lastRejectedModel}. Change GEMINI_MODELS in the config file.`,
    404
  );
}

export const OUTLINE_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    courseDescription: {
      type: Type.STRING,
      description: 'One or two sentence overview of the entire course.',
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
  required: ['courseDescription', 'category', 'lessons'],
};

export const LESSON_CONTENT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    articleMarkdown: {
      type: Type.STRING,
      description:
        'Markdown study guide (< 300 words) with heading, short paragraphs, bullet list, and optional code block if technical.',
    },
    quizQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionPrompt: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          correctOptionIndex: { type: Type.INTEGER },
          explanationText: { type: Type.STRING },
          explanationTimestampSeconds: { type: Type.INTEGER },
          isPlacementEligible: { type: Type.BOOLEAN },
        },
        required: [
          'questionPrompt',
          'options',
          'correctOptionIndex',
          'explanationText',
          'explanationTimestampSeconds',
          'isPlacementEligible',
        ],
      },
    },
  },
  required: ['articleMarkdown', 'quizQuestions'],
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function slugifyTitle(title: string, videoId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = videoId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  return `${base || 'custom-course'}-${suffix}`;
}

/**
 * Typed validator for Step A (course outline response).
 * Enforces non-overlapping ordered timestamps within [0, videoDurationSeconds].
 */
export function validateOutlineResponse(
  raw: unknown,
  videoDurationSeconds: number
): ValidatedOutlineResponse {
  if (!raw || typeof raw !== 'object') {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'Received an invalid course outline format from Gemini.'
    );
  }

  const obj = raw as Record<string, unknown>;
  const rawLessons = Array.isArray(obj.lessons) ? obj.lessons : [];

  if (rawLessons.length === 0) {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'Gemini returned an empty lesson outline. Please try again.'
    );
  }

  const maxDuration = Math.max(60, Math.floor(videoDurationSeconds));
  const lessons: ValidatedOutlineItem[] = [];
  let cursorSeconds = 0;

  const sliced = rawLessons.slice(0, 30);
  const defaultSpan = Math.max(60, Math.floor(maxDuration / sliced.length));

  for (let i = 0; i < sliced.length; i++) {
    const item = sliced[i] as Record<string, unknown>;
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    const summaryDescription =
      typeof item?.summaryDescription === 'string'
        ? item.summaryDescription.trim()
        : '';
    const conceptTag =
      typeof item?.conceptTag === 'string' && item.conceptTag.trim()
        ? item.conceptTag.trim()
        : 'Core Concept';

    if (!title || !summaryDescription) {
      continue;
    }

    const rawStart =
      typeof item.startSeconds === 'number' && !Number.isNaN(item.startSeconds)
        ? Math.floor(item.startSeconds)
        : cursorSeconds;
    const rawEnd =
      typeof item.endSeconds === 'number' && !Number.isNaN(item.endSeconds)
        ? Math.floor(item.endSeconds)
        : rawStart + defaultSpan;

    const startSeconds = clamp(
      Math.max(cursorSeconds, rawStart),
      0,
      Math.max(0, maxDuration - 10)
    );
    const minEnd = Math.min(maxDuration, startSeconds + 15);
    const endSeconds = clamp(Math.max(minEnd, rawEnd), minEnd, maxDuration);

    if (endSeconds <= startSeconds) {
      continue;
    }

    lessons.push({
      title,
      summaryDescription,
      startSeconds,
      endSeconds,
      conceptTag,
    });

    cursorSeconds = endSeconds;
    if (cursorSeconds >= maxDuration - 5) {
      break;
    }
  }

  if (lessons.length === 0) {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'Could not validate any lesson chapters from the outline response.'
    );
  }

  const courseDescription =
    typeof obj.courseDescription === 'string' && obj.courseDescription.trim()
      ? obj.courseDescription.trim()
      : `Structured daily study plan based on ${lessons.length} curated video lessons.`;

  const category =
    typeof obj.category === 'string' && obj.category.trim()
      ? obj.category.trim()
      : 'Custom Course';

  return {
    courseDescription,
    category,
    lessons,
  };
}

/**
 * Typed validator for Step B (per-lesson article & quiz questions).
 * - Clamps explanationTimestampSeconds into [startSeconds, endSeconds]
 * - Requires options to have exactly 4 strings
 * - Requires correctOptionIndex to be 0..3
 * - Drops broken questions
 */
export function validateLessonContentResponse(
  raw: unknown,
  lessonId: string,
  startSeconds: number,
  endSeconds: number
): ValidatedLessonContentResponse {
  if (!raw || typeof raw !== 'object') {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'Received an invalid lesson response format from Gemini.'
    );
  }

  const obj = raw as Record<string, unknown>;
  const articleMarkdown =
    typeof obj.articleMarkdown === 'string' ? obj.articleMarkdown.trim() : '';

  if (!articleMarkdown || articleMarkdown.length < 20) {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'Generated lesson article was empty or incomplete.'
    );
  }

  const rawQuestions = Array.isArray(obj.quizQuestions) ? obj.quizQuestions : [];
  const validQuestions: QuizQuestion[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i] as Record<string, unknown>;
    if (!q || typeof q !== 'object') continue;

    const questionPrompt =
      typeof q.questionPrompt === 'string' ? q.questionPrompt.trim() : '';
    const explanationText =
      typeof q.explanationText === 'string' ? q.explanationText.trim() : '';

    if (!questionPrompt || !explanationText) continue;

    if (!Array.isArray(q.options) || q.options.length !== 4) continue;
    const cleanOptions = q.options.map((opt) =>
      typeof opt === 'string' ? opt.trim() : ''
    );
    if (cleanOptions.some((opt) => !opt)) continue;

    const correctOptionIndex =
      typeof q.correctOptionIndex === 'number'
        ? Math.floor(q.correctOptionIndex)
        : -1;
    if (correctOptionIndex < 0 || correctOptionIndex > 3) continue;

    const rawTimestamp =
      typeof q.explanationTimestampSeconds === 'number' &&
      !Number.isNaN(q.explanationTimestampSeconds)
        ? Math.floor(q.explanationTimestampSeconds)
        : startSeconds;

    // Handle both relative-to-clip and absolute timestamps safely before clamping
    const adjustedTimestamp =
      rawTimestamp < startSeconds &&
      rawTimestamp >= 0 &&
      rawTimestamp <= Math.max(0, endSeconds - startSeconds)
        ? startSeconds + rawTimestamp
        : rawTimestamp;

    const clampedTimestamp = clamp(adjustedTimestamp, startSeconds, endSeconds);
    const isPlacementEligible =
      typeof q.isPlacementEligible === 'boolean'
        ? q.isPlacementEligible
        : i === 0;

    validQuestions.push({
      id: `${lessonId}_q${validQuestions.length + 1}`,
      lessonId,
      questionPrompt,
      options: [
        cleanOptions[0],
        cleanOptions[1],
        cleanOptions[2],
        cleanOptions[3],
      ],
      correctOptionIndex,
      explanationText,
      explanationTimestampSeconds: clampedTimestamp,
      isPlacementEligible,
    });
  }

  if (validQuestions.length === 0) {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'No valid 4-option quiz questions were returned for this lesson.'
    );
  }

  return {
    articleMarkdown,
    quizQuestions: validQuestions,
  };
}

export function parseGeminiJsonResponse(rawText: string | undefined): unknown {
  const trimmed = (rawText ?? '').trim();
  if (!trimmed) {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'Gemini returned an empty response. Please try again.'
    );
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new CourseBuilderError(
      'INVALID_JSON',
      'Gemini returned invalid JSON. Please try again.'
    );
  }
}

/**
 * Executes Step B (single lesson study article + 2-3 quiz questions) via the shared Gemini call helper
 * using videoMetadata { startOffset, endOffset } for the lesson segment.
 */
export async function requestSingleLessonFromGemini(
  youtubeUrl: string,
  videoTitle: string,
  lesson: Lesson
): Promise<ValidatedLessonContentResponse> {
  const startSeconds = Math.max(0, Math.floor(lesson.startSeconds));
  const endSeconds = Math.max(startSeconds + 1, Math.floor(lesson.endSeconds));

  const prompt = `Analyze the video segment from ${startSeconds}s to ${endSeconds}s of "${videoTitle}" for the lesson titled "${lesson.title}" (Concept: ${lesson.conceptTag} — ${lesson.summaryDescription}).

Generate:
1. articleMarkdown:
   - A concise, high-clarity study article under 300 words.
   - Include a Markdown heading (## ...), 2 to 3 short paragraphs, and a bullet list of key takeaways.
   - Include a short code block ONLY if the topic is technical (programming, math, computer science, data science, engineering).
2. quizQuestions:
   - 2 to 3 multiple-choice questions testing comprehension of this segment.
   - Each question must have:
     - questionPrompt: Clear, realistic question.
     - options: Array of EXACTLY 4 believable string options.
     - correctOptionIndex: Integer from 0 to 3 indicating the right option.
     - explanationText: Clear explanation of why the correct option is right.
     - explanationTimestampSeconds: Integer timestamp in seconds between ${startSeconds} and ${endSeconds} where this concept is explained in the video.
     - isPlacementEligible: Boolean (set true for roughly half of the questions).`;

  const responseText = await callGeminiGenerateContent({
    contents: [
      {
        fileData: {
          fileUri: youtubeUrl,
          mimeType: 'video/*',
        },
        videoMetadata: {
          startOffset: `${startSeconds}s`,
          endOffset: `${endSeconds}s`,
        },
      },
      { text: prompt },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: LESSON_CONTENT_RESPONSE_SCHEMA,
    },
  });

  const parsed = parseGeminiJsonResponse(responseText);
  return validateLessonContentResponse(
    parsed,
    lesson.id,
    startSeconds,
    endSeconds
  );
}

export async function generateCourseOutline(
  videoInfo: VideoMetadataInfo
): Promise<ValidatedOutlineResponse> {
  const youtubeUrl = getCanonicalYouTubeWatchUrl(videoInfo.videoId);
  const durationSeconds = Math.max(60, Math.floor(videoInfo.durationSeconds));
  const minLessons = 5;
  const maxLessons = 30;
  const targetCount = Math.max(
    minLessons,
    Math.min(maxLessons, Math.round(durationSeconds / 420))
  );

  const prompt = `Watch this YouTube video ("${videoInfo.title}" by ${videoInfo.channelName}, total duration: ${durationSeconds} seconds) and create a structured course lesson outline.

Requirements:
- Return between 5 and 30 lessons (aim for around ${targetCount} lessons depending on natural topic transitions).
- Each lesson should cover roughly 3 to 20 minutes (or proportional segments if the video is shorter).
- Lessons MUST be strictly in chronological order, MUST NOT overlap, and MUST stay within 0 to ${durationSeconds} seconds.
- For each lesson provide:
  1. title: Clear, specific educational title for the segment.
  2. summaryDescription: Exactly one concise sentence summarizing what the learner will master.
  3. startSeconds: Integer start timestamp in seconds (>= 0).
  4. endSeconds: Integer end timestamp in seconds (<= ${durationSeconds} and > startSeconds).
  5. conceptTag: Short concept label of 2 to 4 words (re-use the same conceptTag across closely related lessons so placement testing can group them).`;

  const responseText = await callGeminiGenerateContent({
    contents: [
      {
        fileData: {
          fileUri: youtubeUrl,
          mimeType: 'video/*',
        },
      },
      { text: prompt },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: OUTLINE_RESPONSE_SCHEMA,
    },
  });

  const parsed = parseGeminiJsonResponse(responseText);
  return validateOutlineResponse(parsed, durationSeconds);
}

export async function generateSingleLessonContent(
  youtubeUrl: string,
  videoTitle: string,
  lesson: Lesson
): Promise<ValidatedLessonContentResponse> {
  return requestSingleLessonFromGemini(youtubeUrl, videoTitle, lesson);
}

export function createInitialCourseShell(
  videoInfo: VideoMetadataInfo,
  outline: ValidatedOutlineResponse
): Course {
  const courseId = `crs_gen_${videoInfo.videoId}_${Date.now()}`;
  const slug = slugifyTitle(videoInfo.title, videoInfo.videoId);
  const youtubeUrl = getCanonicalYouTubeWatchUrl(videoInfo.videoId);

  const lessons: Lesson[] = outline.lessons.map((item, idx) => {
    const rawDuration = Math.max(60, item.endSeconds - item.startSeconds);
    const clampedDuration = clamp(rawDuration, 180, 1200);
    return {
      id: `${courseId}_les_${idx + 1}`,
      courseId,
      sequenceNumber: idx + 1,
      title: item.title,
      summaryDescription: item.summaryDescription,
      durationSeconds: clampedDuration,
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

  const totalSeconds = lessons.reduce((acc, l) => acc + l.durationSeconds, 0);

  return {
    id: courseId,
    slug,
    title: videoInfo.title,
    description: outline.courseDescription,
    youtubeUrl,
    youtubeVideoId: videoInfo.videoId,
    youtubeSourceId: videoInfo.videoId,
    channelName: videoInfo.channelName,
    thumbnailUrl: videoInfo.thumbnailUrl,
    thumbnailTheme: 'cs',
    totalDuration: formatDuration(totalSeconds),
    totalDurationMinutes: Math.max(1, Math.round(totalSeconds / 60)),
    lessonCount: lessons.length,
    learnerCount: 1,
    category: outline.category,
    difficulty: 'Intermediate',
    lessons,
    createdAt: new Date().toISOString(),
    isUserGenerated: true,
    buildStatus: 'PLANNING',
    completedLessonsCheckpoint: 0,
    currentlyBuildingLessonNumber: 1,
  };
}
