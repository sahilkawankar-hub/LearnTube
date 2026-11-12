import { TranscriptSegment, TranscriptWindow } from '../types';

/**
 * Pure, typed transcript chunking and slicing utilities for long videos (up to 14 hours).
 *
 * Example 1 — Short 25-minute transcript (single window, no overlap needed):
 *   Input:
 *     segments = [
 *       { startSeconds: 0, text: "Welcome to systems programming." },
 *       { startSeconds: 600, text: "Memory layout and stack frames." },
 *       { startSeconds: 1400, text: "Wrapping up pointers." }
 *     ]
 *     windowSeconds = 1800
 *   Output:
 *     [
 *       {
 *         windowIndex: 0,
 *         startSeconds: 0,
 *         endSeconds: 1400,
 *         text: "[00:00] Welcome to systems programming.\n[10:00] Memory layout and stack frames.\n[23:20] Wrapping up pointers."
 *       }
 *     ]
 *
 * Example 2 — 65-minute transcript split into 30-minute windows with ~30s overlap context:
 *   Input:
 *     segments = [
 *       { startSeconds: 0, text: "Part 1 intro." },
 *       { startSeconds: 1780, text: "Transitioning into trees." },
 *       { startSeconds: 1810, text: "Binary search tree invariants." },
 *       { startSeconds: 3620, text: "Balancing rotations." }
 *     ]
 *     windowSeconds = 1800
 *   Output:
 *     [
 *       {
 *         windowIndex: 0,
 *         startSeconds: 0,
 *         endSeconds: 1810,
 *         text: "[00:00] Part 1 intro.\n[29:40] Transitioning into trees."
 *       },
 *       {
 *         windowIndex: 1,
 *         startSeconds: 1810,
 *         endSeconds: 3620,
 *         text: "[OVERLAP CONTEXT — DO NOT REPEAT IN NEW LESSONS]\n[29:40] Transitioning into trees.\n[END OVERLAP CONTEXT]\n[30:10] Binary search tree invariants.\n[1:00:20] Balancing rotations."
 *       }
 *     ]
 *
 * Example 3 — Slicing a single lesson range with sliceTranscript:
 *   Input:
 *     sliceTranscript(segments, 600, 1500)
 *   Output:
 *     "[10:00] Memory layout and stack frames.\n[23:20] Wrapping up pointers."
 */

const OVERLAP_SECONDS = 30;

export function formatBracketTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const padSecs = secs < 10 ? `0${secs}` : `${secs}`;
  if (hrs > 0) {
    const padMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `[${hrs}:${padMins}:${padSecs}]`;
  }
  const padMins = mins < 10 ? `0${mins}` : `${mins}`;
  return `[${padMins}:${padSecs}]`;
}

/**
 * Splits a sorted list of transcript segments into windows of ~windowSeconds (default 1800s = 30m).
 * - Cuts only at segment boundaries (never mid-segment or mid-sentence).
 * - Includes ~30 seconds of trailing segments from the previous window marked clearly as
 *   [OVERLAP CONTEXT — DO NOT REPEAT IN NEW LESSONS] so Gemini has continuity without duplicating lessons.
 */
export function chunkTranscript(
  segments: TranscriptSegment[],
  windowSeconds = 1800
): TranscriptWindow[] {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  const safeWindowSpan = Math.max(300, Math.floor(windowSeconds));
  const sorted = [...segments].sort((a, b) => a.startSeconds - b.startSeconds);

  const windows: TranscriptWindow[] = [];
  let cursorIdx = 0;
  let windowIndex = 0;

  while (cursorIdx < sorted.length) {
    const windowStartSeconds = sorted[cursorIdx].startSeconds;
    const targetEndSeconds = windowStartSeconds + safeWindowSpan;

    // Collect segments belonging to this window, cutting strictly at segment boundaries
    let endIdx = cursorIdx;
    while (
      endIdx < sorted.length &&
      sorted[endIdx].startSeconds < targetEndSeconds
    ) {
      endIdx++;
    }

    // Ensure at least one segment advances the cursor if there is a long silence gap
    if (endIdx === cursorIdx) {
      endIdx = cursorIdx + 1;
    }

    const primarySegments = sorted.slice(cursorIdx, endIdx);
    const windowEndSeconds =
      endIdx < sorted.length
        ? sorted[endIdx].startSeconds
        : primarySegments[primarySegments.length - 1].startSeconds;

    // Gather ~30 seconds of preceding segments as marked overlap context for windows after window 0
    const overlapSegments: TranscriptSegment[] = [];
    if (cursorIdx > 0) {
      const overlapCutoff = Math.max(0, windowStartSeconds - OVERLAP_SECONDS);
      for (let k = cursorIdx - 1; k >= 0; k--) {
        if (sorted[k].startSeconds >= overlapCutoff) {
          overlapSegments.unshift(sorted[k]);
        } else {
          break;
        }
      }
      // Guarantee at least 1 segment of prior context if immediately adjacent
      if (overlapSegments.length === 0 && cursorIdx > 0) {
        overlapSegments.push(sorted[cursorIdx - 1]);
      }
    }

    const lines: string[] = [];
    if (overlapSegments.length > 0) {
      lines.push('[OVERLAP CONTEXT — DO NOT REPEAT IN NEW LESSONS]');
      for (const seg of overlapSegments) {
        lines.push(`${formatBracketTimestamp(seg.startSeconds)} ${seg.text}`);
      }
      lines.push('[END OVERLAP CONTEXT]');
    }

    for (const seg of primarySegments) {
      lines.push(`${formatBracketTimestamp(seg.startSeconds)} ${seg.text}`);
    }

    windows.push({
      windowIndex,
      startSeconds: windowStartSeconds,
      endSeconds: windowEndSeconds,
      text: lines.join('\n'),
    });

    cursorIdx = endIdx;
    windowIndex++;
  }

  return windows;
}

/**
 * Returns the formatted transcript lines for a single lesson within [startSeconds, endSeconds].
 */
export function sliceTranscript(
  segments: TranscriptSegment[],
  startSeconds: number,
  endSeconds: number
): string {
  if (!Array.isArray(segments) || segments.length === 0) {
    return '';
  }

  const inRange = segments.filter(
    (seg) => seg.startSeconds >= startSeconds && seg.startSeconds <= endSeconds
  );

  // Fallback: if no segment landed inside the exact boundary, pick the nearest segments
  if (inRange.length === 0) {
    const nearest = segments
      .slice()
      .sort(
        (a, b) =>
          Math.abs(a.startSeconds - startSeconds) -
          Math.abs(b.startSeconds - startSeconds)
      )
      .slice(0, 8)
      .sort((a, b) => a.startSeconds - b.startSeconds);

    return nearest
      .map((seg) => `${formatBracketTimestamp(seg.startSeconds)} ${seg.text}`)
      .join('\n');
  }

  return inRange
    .map((seg) => `${formatBracketTimestamp(seg.startSeconds)} ${seg.text}`)
    .join('\n');
}
