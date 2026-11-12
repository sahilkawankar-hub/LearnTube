export interface VideoSlice {
  sliceIndex: number;
  startSeconds: number;
  endSeconds: number;
}

const MIN_FINAL_SLICE_SECONDS = 180; // 3 minutes

/**
 * Splits a video duration into contiguous time slices with no gaps.
 * If the final slice is shorter than 3 minutes (180s), it is merged into the previous slice.
 *
 * Example 1 (last slice 100s < 180s -> merged into previous slice):
 *   makeSlices(3700, 1200)
 *   => [
 *        { sliceIndex: 0, startSeconds: 0, endSeconds: 1200 },
 *        { sliceIndex: 1, startSeconds: 1200, endSeconds: 2400 },
 *        { sliceIndex: 2, startSeconds: 2400, endSeconds: 3700 }
 *      ]
 *
 * Example 2 (last slice 300s >= 180s -> kept as its own slice):
 *   makeSlices(3900, 1200)
 *   => [
 *        { sliceIndex: 0, startSeconds: 0, endSeconds: 1200 },
 *        { sliceIndex: 1, startSeconds: 1200, endSeconds: 2400 },
 *        { sliceIndex: 2, startSeconds: 2400, endSeconds: 3600 },
 *        { sliceIndex: 3, startSeconds: 3600, endSeconds: 3900 }
 *      ]
 *
 * Example 3 (exact multiple of 1200s):
 *   makeSlices(2400, 1200)
 *   => [
 *        { sliceIndex: 0, startSeconds: 0, endSeconds: 1200 },
 *        { sliceIndex: 1, startSeconds: 1200, endSeconds: 2400 }
 *      ]
 */
export function makeSlices(
  durationSeconds: number,
  sliceSeconds = 1200
): VideoSlice[] {
  const totalDuration = Math.max(0, Math.floor(durationSeconds));
  const step = Math.max(180, Math.floor(sliceSeconds));

  if (totalDuration === 0) {
    return [];
  }

  const slices: VideoSlice[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < totalDuration) {
    const endSeconds = Math.min(totalDuration, cursor + step);
    slices.push({
      sliceIndex: index,
      startSeconds: cursor,
      endSeconds,
    });
    cursor = endSeconds;
    index++;
  }

  if (slices.length > 1) {
    const lastSlice = slices[slices.length - 1];
    const lastDuration = lastSlice.endSeconds - lastSlice.startSeconds;
    if (lastDuration < MIN_FINAL_SLICE_SECONDS) {
      slices.pop();
      slices[slices.length - 1].endSeconds = totalDuration;
    }
  }

  return slices;
}
