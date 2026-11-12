/**
 * Application-wide constants for LearnTube course generation and limits.
 */

// Videos <= 60 minutes (3600 seconds) use the direct Gemini short video pipeline;
// videos > 60 minutes use the 20-minute video slice pipeline.
export const SHORT_VIDEO_LIMIT_SECONDS = 3600;

// Maximum video length allowed for course generation: 14 hours (50400 seconds)
export const MAX_COURSE_SECONDS = 50400;

// Model list containing ONLY the original primary model that worked in the short pipeline
export const GEMINI_MODELS: readonly string[] = ['gemini-3.8-flash'];

// Primary Gemini model alias
export const GEMINI_MODEL = GEMINI_MODELS[0];
