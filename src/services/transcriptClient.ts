import type { TranscriptSegment } from '../types';

export interface ExtractedTranscript {
  segments: TranscriptSegment[];
  language: string;
  strategy: string;
}

export class TranscriptFetchError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'TranscriptFetchError';
    this.code = code;
  }
}

interface TranscriptApiPayload {
  segments?: unknown;
  language?: unknown;
  strategy?: unknown;
  errorCode?: unknown;
  message?: unknown;
}

function normalizeSegments(rawSegments: unknown): TranscriptSegment[] {
  if (!Array.isArray(rawSegments)) return [];

  const sorted = rawSegments
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const candidate = item as Record<string, unknown>;
      const startSeconds = Number(candidate.startSeconds);
      const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
      if (!Number.isFinite(startSeconds) || startSeconds < 0 || !text) return [];
      return [{ startSeconds: Math.floor(startSeconds), text }];
    })
    .sort((a, b) => a.startSeconds - b.startSeconds);

  return sorted.reduce<TranscriptSegment[]>((segments, segment) => {
    const previous = segments[segments.length - 1];
    if (previous?.startSeconds === segment.startSeconds) {
      previous.text = `${previous.text} ${segment.text}`.trim();
    } else {
      segments.push(segment);
    }
    return segments;
  }, []);
}

/** Fetches server-side YouTube captions without exposing provider diagnostics. */
export async function fetchYouTubeTranscript(
  videoId: string,
  signal?: AbortSignal
): Promise<ExtractedTranscript> {
  const response = await fetch(
    `/api/transcript?videoId=${encodeURIComponent(videoId)}`,
    { signal }
  );

  let payload: TranscriptApiPayload = {};
  try {
    payload = (await response.json()) as TranscriptApiPayload;
  } catch {
    // A stable client-facing error is preferable to parsing an unexpected response.
  }

  if (!response.ok) {
    throw new TranscriptFetchError(
      typeof payload.errorCode === 'string' ? payload.errorCode : 'FETCH_BLOCKED',
      typeof payload.message === 'string'
        ? payload.message
        : "We couldn't fetch captions automatically. You can paste or upload a transcript manually."
    );
  }

  const segments = normalizeSegments(payload.segments);
  if (segments.length === 0) {
    throw new TranscriptFetchError(
      'NO_CAPTIONS',
      'This video has no usable caption segments. You can paste or upload a transcript manually.'
    );
  }

  return {
    segments,
    language: typeof payload.language === 'string' ? payload.language : 'auto',
    strategy: typeof payload.strategy === 'string' ? payload.strategy : 'unknown',
  };
}
