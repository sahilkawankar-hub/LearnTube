import { Lesson, Day } from '../types';

/**
 * Pure daily study plan generator.
 *
 * Examples:
 *
 * Example 1 (Standard greedy packing):
 *   Input:
 *     lessons = [
 *       { id: 'l1', sequenceNumber: 1, durationSeconds: 900, ... },  // 15m
 *       { id: 'l2', sequenceNumber: 2, durationSeconds: 900, ... },  // 15m
 *       { id: 'l3', sequenceNumber: 3, durationSeconds: 600, ... },  // 10m
 *     ]
 *     dailyPaceMinutes = 30 (1800 seconds)
 *     skippedLessonIds = []
 *   Output:
 *     [
 *       { dayNumber: 1, lessons: [l1, l2], totalSeconds: 1800 },
 *       { dayNumber: 2, lessons: [l3], totalSeconds: 600 }
 *     ]
 *
 * Example 2 (Lesson longer than daily limit gets its own day without reordering):
 *   Input:
 *     lessons = [
 *       { id: 'l1', sequenceNumber: 1, durationSeconds: 600, ... },  // 10m
 *       { id: 'l2', sequenceNumber: 2, durationSeconds: 2100, ... }, // 35m (> 30m limit)
 *       { id: 'l3', sequenceNumber: 3, durationSeconds: 600, ... },  // 10m
 *     ]
 *     dailyPaceMinutes = 30 (1800 seconds)
 *     skippedLessonIds = []
 *   Output:
 *     [
 *       { dayNumber: 1, lessons: [l1], totalSeconds: 600 },
 *       { dayNumber: 2, lessons: [l2], totalSeconds: 2100 },
 *       { dayNumber: 3, lessons: [l3], totalSeconds: 600 }
 *     ]
 *
 * Example 3 (With skipped lessons removed first):
 *   Input:
 *     lessons = [
 *       { id: 'l1', sequenceNumber: 1, durationSeconds: 1200, ... }, // 20m
 *       { id: 'l2', sequenceNumber: 2, durationSeconds: 1200, ... }, // 20m (skipped)
 *       { id: 'l3', sequenceNumber: 3, durationSeconds: 600, ... },  // 10m
 *     ]
 *     dailyPaceMinutes = 30 (1800 seconds)
 *     skippedLessonIds = ['l2']
 *   Output:
 *     [
 *       { dayNumber: 1, lessons: [l1, l3], totalSeconds: 1800 }
 *     ]
 */
export function buildDailyPlan(
  lessons: Lesson[],
  dailyPaceMinutes: number,
  skippedLessonIds: string[] = []
): Day[] {
  const skippedSet = new Set(skippedLessonIds);
  const activeLessons = lessons.filter((lesson) => !skippedSet.has(lesson.id));

  if (activeLessons.length === 0) {
    return [];
  }

  const dailyLimitSeconds = Math.max(1, dailyPaceMinutes * 60);
  const days: Day[] = [];

  let currentLessons: Lesson[] = [];
  let currentTotalSeconds = 0;

  for (const lesson of activeLessons) {
    const duration = lesson.durationSeconds;

    if (currentLessons.length === 0) {
      currentLessons.push(lesson);
      currentTotalSeconds = duration;
    } else if (currentTotalSeconds + duration <= dailyLimitSeconds) {
      currentLessons.push(lesson);
      currentTotalSeconds += duration;
    } else {
      days.push({
        dayNumber: days.length + 1,
        lessons: currentLessons,
        totalSeconds: currentTotalSeconds,
      });
      currentLessons = [lesson];
      currentTotalSeconds = duration;
    }
  }

  if (currentLessons.length > 0) {
    days.push({
      dayNumber: days.length + 1,
      lessons: currentLessons,
      totalSeconds: currentTotalSeconds,
    });
  }

  return days;
}

/**
 * Formats a duration in seconds into a concise human-readable string.
 * Examples:
 *   formatDuration(6120) => "1h 42m"
 *   formatDuration(1620) => "27m"
 *   formatDuration(3600) => "1h"
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${ Math.max(1, minutes) }m`;
}
