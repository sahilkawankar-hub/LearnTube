import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODEL } from './src/config.ts';
import { registerTranscriptRoutes } from './server/transcriptRoute.ts';
import { registerLongCourseRoutes } from './server/longCourseRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local development secrets live in .env.local. Environment variables supplied
// by a deployment platform still take precedence because dotenv does not override
// existing values by default.
dotenv.config({ path: path.join(__dirname, '.env.local') });

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
    rawMessage.toLowerCase().includes('rate limit') ||
    rawMessage.toLowerCase().includes('quota')
  ) {
    return {
      status: 429,
      errorType: 'RATE_LIMIT',
      message:
        'Gemini API rate limit reached. Please wait a moment and retry.',
    };
  }

  return {
    status: 500,
    errorType: 'API_ERROR',
    message:
      'We encountered an issue while communicating with Gemini. Please try again.',
  };
}

async function startServer() {
  const app = express();
  const configuredPort = Number(process.env.PORT);
  const PORT = Number.isInteger(configuredPort) && configuredPort > 0
    ? configuredPort
    : 3000;

  app.use(express.json({ limit: '5mb' }));

  // Register long-video transcript and chunked course routes
  registerTranscriptRoutes(app);
  registerLongCourseRoutes(app);

  // Unified server-side Gemini generateContent endpoint
  app.post('/api/gemini/generate', async (req, res) => {
    const { model, contents, config } = req.body as {
      model?: string;
      contents?: unknown;
      config?: Record<string, unknown>;
    };
    const targetModel = model || GEMINI_MODEL;

    if (!contents) {
      res.status(400).json({
        errorType: 'API_ERROR',
        message: 'Missing contents parameter for Gemini generation.',
        statusCode: 400,
      });
      return;
    }

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: contents as Parameters<typeof ai.models.generateContent>[0]['contents'],
        config: config as Parameters<typeof ai.models.generateContent>[0]['config'],
      });

      res.json({
        text: response.text ?? '',
        model: targetModel,
      });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const rawStatus =
        typeof (error as { status?: unknown })?.status === 'number'
          ? ((error as { status: number }).status)
          : undefined;

      console.error(
        `[Server Gemini API] Model "${targetModel}" failed: ${rawMessage}`
      );

      const mapped = mapGeminiError(error);
      const statusCode = rawStatus || mapped.status || 500;

      res.status(statusCode).json({
        errorType: mapped.errorType,
        message: mapped.message,
        statusCode,
      });
    }
  });

  // STEP A: Generate course lesson outline from YouTube video
  app.post('/api/course-builder/outline', async (req, res) => {
    try {
      const { youtubeUrl, videoTitle, channelName, durationSeconds } = req.body as {
        youtubeUrl: string;
        videoTitle: string;
        channelName: string;
        durationSeconds: number;
      };

      if (!youtubeUrl || !durationSeconds) {
        res.status(400).json({
          errorType: 'API_ERROR',
          message: 'Missing youtubeUrl or durationSeconds.',
        });
        return;
      }

      const ai = getGeminiClient();

      // Determine recommended lesson count (5 to 30 lessons, roughly 3 to 20 minutes each)
      const minLessons = 5;
      const maxLessons = 30;
      const targetCount = Math.max(
        minLessons,
        Math.min(maxLessons, Math.round(durationSeconds / 420))
      );

      const prompt = `Watch this YouTube video ("${videoTitle}" by ${channelName}, total duration: ${durationSeconds} seconds) and create a structured course lesson outline.

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

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
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
          responseSchema: {
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
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          errorType: 'INVALID_JSON',
          message: 'Gemini returned an empty response for the lesson outline.',
        });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        res.status(502).json({
          errorType: 'INVALID_JSON',
          message: 'Gemini returned invalid JSON for the lesson outline.',
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

  // STEP B: Generate study article + 2-3 quiz questions for a specific video segment
  app.post('/api/course-builder/lesson', async (req, res) => {
    try {
      const {
        youtubeUrl,
        videoTitle,
        lessonTitle,
        summaryDescription,
        conceptTag,
        startSeconds,
        endSeconds,
      } = req.body as {
        youtubeUrl: string;
        videoTitle: string;
        lessonTitle: string;
        summaryDescription: string;
        conceptTag: string;
        startSeconds: number;
        endSeconds: number;
      };

      if (!youtubeUrl || typeof startSeconds !== 'number' || typeof endSeconds !== 'number') {
        res.status(400).json({
          errorType: 'API_ERROR',
          message: 'Missing required lesson segment parameters.',
        });
        return;
      }

      const ai = getGeminiClient();

      const prompt = `Analyze the video segment from ${startSeconds}s to ${endSeconds}s of "${videoTitle}" for the lesson titled "${lessonTitle}" (Concept: ${conceptTag} — ${summaryDescription}).

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

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            fileData: {
              fileUri: youtubeUrl,
              mimeType: 'video/*',
            },
            videoMetadata: {
              startOffset: `${Math.max(0, Math.floor(startSeconds))}s`,
              endOffset: `${Math.max(startSeconds + 1, Math.floor(endSeconds))}s`,
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
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
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          errorType: 'INVALID_JSON',
          message: 'Gemini returned an empty response for the lesson content.',
        });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        res.status(502).json({
          errorType: 'INVALID_JSON',
          message: 'Gemini returned invalid JSON for the lesson content.',
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

  // API-only catch-all: any unknown /api/* path returns JSON 404, never HTML
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND' });
  });
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND' });
  });

  // Keep malformed JSON responses consistent for API consumers and avoid
  // returning Express's default HTML error page.
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (error instanceof SyntaxError && 'body' in error) {
        res.status(400).json({
          errorType: 'API_ERROR',
          message: 'Request body must be valid JSON.',
          statusCode: 400,
        });
        return;
      }
      next(error);
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const registeredApiRoutes = [
    'GET /api/health',
    'GET /api/transcript',
    'POST /api/long-course/window-outline',
    'POST /api/long-course/lesson',
    'POST /api/course-builder/outline',
    'POST /api/course-builder/lesson',
  ];

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Server listening on port ${PORT} | Registered /api routes: ${registeredApiRoutes.join(', ')}`
    );
  });
}

startServer();
