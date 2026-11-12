import type { Express, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODEL } from '../src/config.ts';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error('MISSING_API_KEY');
    (err as Error & { code?: string }).code = 'MISSING_API_KEY';
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapGeminiError(error: unknown): {
  status: number;
  errorType: 'MISSING_API_KEY' | 'RATE_LIMIT' | 'INVALID_JSON' | 'API_ERROR';
  message: string;
} {
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (
    rawMessage.includes('MISSING_API_KEY') ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('403')
  ) {
    return {
      status: 401,
      errorType: 'MISSING_API_KEY',
      message:
        'Missing or invalid Gemini API key. Please check your key in the Settings > Secrets panel.',
    };
  }

  if (
    rawMessage.includes('RESOURCE_EXHAUSTED') ||
    rawMessage.includes('429') ||
    rawMessage.includes('503') ||
    rawMessage.toLowerCase().includes('rate limit') ||
    rawMessage.toLowerCase().includes('quota') ||
    rawMessage.toLowerCase().includes('overloaded')
  ) {
    return {
      status: 429,
      errorType: 'RATE_LIMIT',
      message:
        'Gemini API rate limit reached. Retrying automatically with backoff...',
    };
  }

  return {
    status: 500,
    errorType: 'API_ERROR',
    message:
      'We encountered an issue while communicating with Gemini. Please try again.',
  };
}

export function registerLongCourseRoutes(app: Express): void {
  // STEP A (per 30-minute transcript window): Extract lessons that START inside this window
  app.post('/api/long-course/window-outline', async (req: Request, res: Response) => {
    try {
      const {
        videoTitle,
        channelName,
        durationSeconds,
        windowIndex,
        totalWindows,
        windowStartSeconds,
        windowEndSeconds,
        windowTranscriptText,
      } = req.body as {
        videoTitle: string;
        channelName: string;
        durationSeconds: number;
        windowIndex: number;
        totalWindows: number;
        windowStartSeconds: number;
        windowEndSeconds: number;
        windowTranscriptText: string;
      };

      if (
        !windowTranscriptText ||
        typeof windowStartSeconds !== 'number' ||
        typeof windowEndSeconds !== 'number'
      ) {
        res.status(400).json({
          errorType: 'API_ERROR',
          message: 'Missing required transcript window parameters.',
        });
        return;
      }

      const ai = getGeminiClient();

      const prompt = `You are structuring a long educational video ("${videoTitle}" by ${channelName}, total duration: ${durationSeconds}s) into a course.
Below is transcript window ${windowIndex + 1} of ${totalWindows}, covering ${windowStartSeconds}s to ${windowEndSeconds}s.

IMPORTANT RULES:
- Return ONLY the lessons that START inside this window (startSeconds >= ${windowStartSeconds} and startSeconds <= ${windowEndSeconds}).
- Lines inside [OVERLAP CONTEXT — DO NOT REPEAT IN NEW LESSONS] ... [END OVERLAP CONTEXT] are from the end of the previous window for continuity only — do NOT create new lessons that start inside the overlap block.
- Each lesson should be 5 to 20 minutes long (300 to 1200 seconds) based on natural topic shifts in the transcript.
- Lessons must stay strictly in chronological order, must NOT overlap, and must use timestamps that exist in the transcript (convert [mm:ss] or [h:mm:ss] to integer seconds).
- If the final lesson in this window naturally runs past ${windowEndSeconds}s, extend its endSeconds to its natural end (up to ${durationSeconds}s).

TRANSCRIPT WINDOW:
${windowTranscriptText}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
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

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          errorType: 'INVALID_JSON',
          message: 'Gemini returned an empty response for this transcript window.',
        });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        res.status(502).json({
          errorType: 'INVALID_JSON',
          message: 'Gemini returned invalid JSON for this transcript window.',
        });
        return;
      }

      res.json({ data: parsed, model: GEMINI_MODEL });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({
        errorType: mapped.errorType,
        message: mapped.message,
      });
    }
  });

  // STEP B (per lesson): Generate study article (<350 words) + 2-3 quiz questions from the lesson's transcript slice
  app.post('/api/long-course/lesson', async (req: Request, res: Response) => {
    try {
      const {
        videoTitle,
        lessonTitle,
        summaryDescription,
        conceptTag,
        startSeconds,
        endSeconds,
        lessonTranscriptText,
      } = req.body as {
        videoTitle: string;
        lessonTitle: string;
        summaryDescription: string;
        conceptTag: string;
        startSeconds: number;
        endSeconds: number;
        lessonTranscriptText: string;
      };

      if (
        !lessonTranscriptText ||
        typeof startSeconds !== 'number' ||
        typeof endSeconds !== 'number'
      ) {
        res.status(400).json({
          errorType: 'API_ERROR',
          message: 'Missing required lesson transcript slice parameters.',
        });
        return;
      }

      const ai = getGeminiClient();

      const prompt = `You are writing study materials for a lesson in "${videoTitle}".
Lesson Title: "${lessonTitle}"
Concept Tag: "${conceptTag}"
Summary: "${summaryDescription}"
Time Range: ${startSeconds}s to ${endSeconds}s

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
     - explanationTimestampSeconds: Integer timestamp in seconds between ${startSeconds} and ${endSeconds} where the speaker explains this answer.
     - isPlacementEligible: Boolean (true for about half of the questions).

LESSON TRANSCRIPT SLICE:
${lessonTranscriptText}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ text: prompt }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              articleMarkdown: {
                type: Type.STRING,
                description:
                  'Study article under 350 words based strictly on the speaker transcript.',
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
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          errorType: 'INVALID_JSON',
          message: 'Gemini returned an empty response for the lesson transcript.',
        });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        res.status(502).json({
          errorType: 'INVALID_JSON',
          message: 'Gemini returned invalid JSON for the lesson transcript.',
        });
        return;
      }

      res.json({ data: parsed, model: GEMINI_MODEL });
    } catch (error) {
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({
        errorType: mapped.errorType,
        message: mapped.message,
      });
    }
  });
}
