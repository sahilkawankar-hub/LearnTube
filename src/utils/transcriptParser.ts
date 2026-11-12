import { TranscriptSegment } from '../types';

export interface TranscriptParseResult {
  segments: TranscriptSegment[];
  error: string | null;
}

const NO_TIMESTAMPS_MESSAGE =
  'Timestamps are needed so lessons can link to the video.';

/**
 * Converts a timestamp string ("MM:SS", "HH:MM:SS", or "HH:MM:SS,mmm" / "HH:MM:SS.mmm")
 * into integer seconds. Returns null if invalid.
 */
export function parseTimestampToSeconds(raw: string): number | null {
  const cleaned = raw.trim().replace(/^\[|\]$/g, '').replace(',', '.');
  const match = cleaned.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\.\d+)?$/);
  if (!match) return null;

  const hours = match[1] !== undefined ? parseInt(match[1], 10) : 0;
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    minutes >= 60 ||
    seconds >= 60
  ) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parses .srt or .vtt subtitle blocks or plain text lines containing timestamps
 * such as "[00:12:30] Introduction" or "12:30 Topic overview" into sorted
 * TranscriptSegment[] items.
 */
export function parseManualTranscript(rawInput: string): TranscriptParseResult {
  const normalized = rawInput.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return {
      segments: [],
      error: NO_TIMESTAMPS_MESSAGE,
    };
  }

  // 1. Detect SRT / WebVTT cue timing lines: "00:01:12,000 --> 00:01:15,500" or "01:12.000 --> 01:15.500"
  const cueRegex =
    /((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\s*-->\s*(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?/;

  if (cueRegex.test(normalized)) {
    const blocks = normalized.split(/\n\s*\n/);
    const cueSegments: TranscriptSegment[] = [];

    for (const block of blocks) {
      const lines = block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) continue;

      let cueLineIndex = -1;
      let startSeconds: number | null = null;

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(cueRegex);
        if (match) {
          startSeconds = parseTimestampToSeconds(match[1]);
          cueLineIndex = i;
          break;
        }
      }

      if (cueLineIndex === -1 || startSeconds === null) continue;

      const textLines = lines
        .slice(cueLineIndex + 1)
        .map((line) => line.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);

      const text = textLines.join(' ').trim();
      if (text) {
        cueSegments.push({ startSeconds, text });
      }
    }

    if (cueSegments.length > 0) {
      return {
        segments: normalizeAndSortSegments(cueSegments),
        error: null,
      };
    }
  }

  // 2. Parse pasted transcript lines with inline timestamps like "[00:12:30] text", "(12:30) text", or "12:30 - text"
  const lines = normalized.split('\n');
  const lineSegments: TranscriptSegment[] = [];
  let activeTimestamp: number | null = null;
  let activeTextBuffer: string[] = [];

  const lineTimestampRegex =
    /^\s*(?:\[|\()?((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\]|\))?(?:\s*[-–—:]\s*|\s+)?(.*)$/;

  const flushActive = () => {
    if (activeTimestamp !== null && activeTextBuffer.length > 0) {
      const joined = activeTextBuffer.join(' ').replace(/\s+/g, ' ').trim();
      if (joined) {
        lineSegments.push({
          startSeconds: activeTimestamp,
          text: joined,
        });
      }
    }
    activeTextBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === 'WEBVTT') continue;

    const match = line.match(lineTimestampRegex);
    if (match) {
      const parsedSec = parseTimestampToSeconds(match[1]);
      if (parsedSec !== null) {
        flushActive();
        activeTimestamp = parsedSec;
        const remainder = (match[2] || '').trim();
        if (remainder) {
          activeTextBuffer.push(remainder);
        }
        continue;
      }
    }

    if (activeTimestamp !== null) {
      activeTextBuffer.push(line);
    }
  }

  flushActive();

  if (lineSegments.length === 0) {
    return {
      segments: [],
      error: NO_TIMESTAMPS_MESSAGE,
    };
  }

  return {
    segments: normalizeAndSortSegments(lineSegments),
    error: null,
  };
}

function normalizeAndSortSegments(
  segments: TranscriptSegment[]
): TranscriptSegment[] {
  const sorted = [...segments].sort((a, b) => a.startSeconds - b.startSeconds);
  const merged: TranscriptSegment[] = [];

  for (const seg of sorted) {
    const cleanText = seg.text.replace(/\s+/g, ' ').trim();
    if (!cleanText) continue;

    const prev = merged[merged.length - 1];
    if (prev && prev.startSeconds === seg.startSeconds) {
      prev.text = `${prev.text} ${cleanText}`.trim();
    } else {
      merged.push({
        startSeconds: Math.max(0, Math.floor(seg.startSeconds)),
        text: cleanText,
      });
    }
  }

  return merged;
}
