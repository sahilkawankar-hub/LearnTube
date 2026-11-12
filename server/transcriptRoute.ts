import type { Express, Request, Response } from 'express';
import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptSegmentDTO {
  startSeconds: number;
  text: string;
}

export interface TranscriptResponseDTO {
  segments: TranscriptSegmentDTO[];
  language: string;
  strategy: string;
}

interface CacheEntry {
  data: TranscriptResponseDTO;
  expiresAt: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const transcriptCache = new Map<string, CacheEntry>();
const ipRateLimits = new Map<string, RateLimitEntry>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateLimits.get(ip) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (entry.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRateLimits.set(ip, entry);
    return true;
  }

  entry.timestamps.push(now);
  ipRateLimits.set(ip, entry);
  return false;
}

function normalizeYoutubeTranscriptItems(
  rawItems: Array<{ text: string; duration: number; offset: number; lang?: string }>,
  fallbackLang: string
): { segments: TranscriptSegmentDTO[]; language: string } {
  const sampleDurations = rawItems
    .slice(0, 25)
    .map((r) => Number(r.duration) || 0)
    .filter((d) => d > 0);
  const avgDuration =
    sampleDurations.length > 0
      ? sampleDurations.reduce((a, b) => a + b, 0) / sampleDurations.length
      : 0;
  const maxOffset = rawItems.reduce(
    (max, r) => Math.max(max, Number(r.offset) || 0),
    0
  );
  const isMilliseconds = avgDuration > 100 || maxOffset > 60000;

  const segments: TranscriptSegmentDTO[] = [];
  for (const item of rawItems) {
    const cleanText = String(item.text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) continue;

    const rawOffset = Number(item.offset) || 0;
    const startSeconds = Math.max(
      0,
      Math.floor(isMilliseconds ? rawOffset / 1000 : rawOffset)
    );

    const prev = segments[segments.length - 1];
    if (prev && prev.startSeconds === startSeconds) {
      prev.text = `${prev.text} ${cleanText}`.trim();
    } else {
      segments.push({
        startSeconds,
        text: cleanText,
      });
    }
  }

  const language =
    typeof rawItems[0]?.lang === 'string' && rawItems[0].lang
      ? rawItems[0].lang
      : fallbackLang;

  return { segments, language };
}

async function runYoutubeTranscriptStrategy(
  videoId: string,
  strategyName: string,
  lang: string | undefined,
  fallbackLang: string,
  details: string[]
): Promise<TranscriptResponseDTO | null> {
  const rawItems = await YoutubeTranscript.fetchTranscript(
    videoId,
    lang ? { lang } : undefined
  );

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const emptyMsg = 'Returned 0 transcript segments';
    console.log(
      `[/api/transcript] videoId=${videoId} strategy="${strategyName}" success=false error="${emptyMsg}"`
    );
    details.push(`${strategyName}: ${emptyMsg}`);
    return null;
  }

  const { segments, language } = normalizeYoutubeTranscriptItems(
    rawItems,
    fallbackLang
  );

  if (segments.length === 0) {
    const emptyNormMsg = 'Normalized transcript had 0 non-empty segments';
    console.log(
      `[/api/transcript] videoId=${videoId} strategy="${strategyName}" success=false error="${emptyNormMsg}"`
    );
    details.push(`${strategyName}: ${emptyNormMsg}`);
    return null;
  }

  const payload: TranscriptResponseDTO = {
    segments,
    language,
    strategy: strategyName,
  };

  console.log(
    `[/api/transcript] videoId=${videoId} strategy="${strategyName}" success=true segments=${segments.length} language="${language}"`
  );
  return payload;
}

async function runYoutubeiFallbackStrategy(
  videoId: string,
  details: string[]
): Promise<{
  payload: TranscriptResponseDTO | null;
  reportedNoCaptions: boolean;
}> {
  const strategyName = 'youtubei.js (Innertube)';
  let youtubeiModule: typeof import('youtubei.js');

  try {
    youtubeiModule = await import('youtubei.js');
  } catch (loadErr) {
    const loadErrMsg =
      loadErr instanceof Error ? loadErr.message : String(loadErr);
    console.log(`youtubei.js unavailable: ${loadErrMsg}`);
    console.log(
      `[/api/transcript] videoId=${videoId} strategy="${strategyName}" success=false error="youtubei.js unavailable: ${loadErrMsg}"`
    );
    details.push(`${strategyName}: youtubei.js unavailable: ${loadErrMsg}`);
    return { payload: null, reportedNoCaptions: false };
  }

  try {
    const innertube = await youtubeiModule.Innertube.create();
    const info = await innertube.getInfo(videoId);

    const captionTracks = info.captions?.caption_tracks;
    const hasCaptionTracks =
      Array.isArray(captionTracks) && captionTracks.length > 0;

    const transcriptInfo = await info.getTranscript();
    const rawSegments =
      transcriptInfo?.transcript?.content?.body?.initial_segments || [];

    const segments: TranscriptSegmentDTO[] = [];
    for (const seg of rawSegments) {
      if (!seg || typeof seg !== 'object' || !('start_ms' in seg)) continue;
      const rawStartMs = Number(
        (seg as { start_ms?: string | number }).start_ms
      );
      if (Number.isNaN(rawStartMs)) continue;

      const snippetObj = (
        seg as { snippet?: { text?: string; toString?: () => string } }
      ).snippet;
      const rawText =
        typeof snippetObj?.text === 'string'
          ? snippetObj.text
          : typeof snippetObj?.toString === 'function'
          ? snippetObj.toString()
          : '';

      const cleanText = rawText.replace(/\s+/g, ' ').trim();
      if (!cleanText) continue;

      const startSeconds = Math.max(0, Math.floor(rawStartMs / 1000));
      const prev = segments[segments.length - 1];
      if (prev && prev.startSeconds === startSeconds) {
        prev.text = `${prev.text} ${cleanText}`.trim();
      } else {
        segments.push({
          startSeconds,
          text: cleanText,
        });
      }
    }

    if (segments.length === 0) {
      const emptyMsg = hasCaptionTracks
        ? 'info.getTranscript() returned 0 segments'
        : 'Video has no caption tracks (caption_tracks is empty)';
      console.log(
        `[/api/transcript] videoId=${videoId} strategy="${strategyName}" success=false error="${emptyMsg}"`
      );
      details.push(`${strategyName}: ${emptyMsg}`);
      return {
        payload: null,
        reportedNoCaptions: !hasCaptionTracks,
      };
    }

    const language =
      transcriptInfo.selectedLanguage ||
      captionTracks?.[0]?.language_code ||
      'auto';

    const payload: TranscriptResponseDTO = {
      segments,
      language,
      strategy: strategyName,
    };

    console.log(
      `[/api/transcript] videoId=${videoId} strategy="${strategyName}" success=true segments=${segments.length} language="${language}"`
    );
    return { payload, reportedNoCaptions: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const lower = errMsg.toLowerCase();
    const reportedNoCaptions =
      lower.includes('transcript panel not found') ||
      lower.includes('engagement panels not found') ||
      lower.includes('video likely has no transcript');

    console.log(
      `[/api/transcript] videoId=${videoId} strategy="${strategyName}" success=false error="${errMsg}"`
    );
    details.push(`${strategyName}: ${errMsg}`);
    return { payload: null, reportedNoCaptions };
  }
}

export function registerTranscriptRoutes(app: Express): void {
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/transcript', async (req: Request, res: Response) => {
    try {
      const videoId =
        typeof req.query.videoId === 'string' ? req.query.videoId.trim() : '';

      const ip = getClientIp(req);
      if (isRateLimited(ip)) {
        const errMsg = 'Rate limit exceeded (10 requests per minute per IP)';
        console.log(
          `[/api/transcript] videoId=${videoId} strategy="rate-limit" success=false error="${errMsg}"`
        );
        res.status(429).json({
          errorCode: 'FETCH_BLOCKED',
          message:
            'Too many transcript requests from your connection (limit: 10 per minute). Please wait a moment or paste the transcript manually.',
        });
        return;
      }

      if (!VIDEO_ID_REGEX.test(videoId)) {
        const errMsg = 'Invalid videoId format (expected 11 characters)';
        console.log(
          `[/api/transcript] videoId=${videoId} strategy="validation" success=false error="${errMsg}"`
        );
        res.status(400).json({
          errorCode: 'VIDEO_UNAVAILABLE',
          message:
            'Invalid YouTube video ID. Video IDs must be 11 characters (letters, numbers, - and _).',
        });
        return;
      }

      // Check 1-hour in-memory cache
      const cached = transcriptCache.get(videoId);
      if (cached && cached.expiresAt > Date.now()) {
        console.log(
          `[/api/transcript] videoId=${videoId} strategy="${cached.data.strategy} (cached)" success=true segments=${cached.data.segments.length}`
        );
        res.json(cached.data);
        return;
      }

      const details: string[] = [];

      // Strategy a: youtube-transcript with lang: 'hi'
      try {
        const stratName = "youtube-transcript (lang: 'hi')";
        const payload = await runYoutubeTranscriptStrategy(
          videoId,
          stratName,
          'hi',
          'hi',
          details
        );
        if (payload) {
          transcriptCache.set(videoId, {
            data: payload,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          res.json(payload);
          return;
        }
      } catch (err) {
        const stratName = "youtube-transcript (lang: 'hi')";
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log(
          `[/api/transcript] videoId=${videoId} strategy="${stratName}" success=false error="${errMsg}"`
        );
        details.push(`${stratName}: ${errMsg}`);
      }

      // Strategy b: youtube-transcript with lang: 'en'
      try {
        const stratName = "youtube-transcript (lang: 'en')";
        const payload = await runYoutubeTranscriptStrategy(
          videoId,
          stratName,
          'en',
          'en',
          details
        );
        if (payload) {
          transcriptCache.set(videoId, {
            data: payload,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          res.json(payload);
          return;
        }
      } catch (err) {
        const stratName = "youtube-transcript (lang: 'en')";
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log(
          `[/api/transcript] videoId=${videoId} strategy="${stratName}" success=false error="${errMsg}"`
        );
        details.push(`${stratName}: ${errMsg}`);
      }

      // Strategy c: youtube-transcript with no lang option
      try {
        const stratName = 'youtube-transcript (no lang)';
        const payload = await runYoutubeTranscriptStrategy(
          videoId,
          stratName,
          undefined,
          'auto',
          details
        );
        if (payload) {
          transcriptCache.set(videoId, {
            data: payload,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          res.json(payload);
          return;
        }
      } catch (err) {
        const stratName = 'youtube-transcript (no lang)';
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log(
          `[/api/transcript] videoId=${videoId} strategy="${stratName}" success=false error="${errMsg}"`
        );
        details.push(`${stratName}: ${errMsg}`);
      }

      // Strategy d: Fallback to youtubei.js (lazy dynamic import inside runYoutubeiFallbackStrategy)
      let youtubeiReportedNoCaptions = false;
      try {
        const fallbackResult = await runYoutubeiFallbackStrategy(
          videoId,
          details
        );
        youtubeiReportedNoCaptions = fallbackResult.reportedNoCaptions;
        if (fallbackResult.payload) {
          transcriptCache.set(videoId, {
            data: fallbackResult.payload,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          res.json(fallbackResult.payload);
          return;
        }
      } catch (err) {
        const stratName = 'youtubei.js (Innertube)';
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log(
          `[/api/transcript] videoId=${videoId} strategy="${stratName}" success=false error="${errMsg}"`
        );
        details.push(`${stratName}: ${errMsg}`);
      }

      // All strategies failed
      const finalErrorCode = youtubeiReportedNoCaptions
        ? 'NO_CAPTIONS'
        : 'FETCH_BLOCKED';
      const status = youtubeiReportedNoCaptions ? 422 : 502;

      res.status(status).json({
        errorCode: finalErrorCode,
        message:
          finalErrorCode === 'NO_CAPTIONS'
            ? 'This video has no caption tracks available on YouTube. You can paste or upload a transcript manually.'
            : "We couldn't fetch captions automatically. You can paste or upload a transcript manually.",
      });
    } catch (unexpectedErr) {
      const errMsg =
        unexpectedErr instanceof Error
          ? unexpectedErr.message
          : String(unexpectedErr);
      console.log(
        `[/api/transcript] strategy="top-level" success=false error="${errMsg}"`
      );
      if (!res.headersSent) {
        res.status(500).json({
          errorCode: 'FETCH_BLOCKED',
          message:
            "We couldn't fetch captions automatically. You can paste or upload a transcript manually.",
        });
      }
    }
  });
}
