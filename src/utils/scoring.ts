import { Lesson, QuizQuestion } from '../types';

export interface PlacementScoreResult {
  skippedLessonIds: string[];
  masteredConceptTags: string[];
  savedSeconds: number;
  correctCount: number;
  totalQuestions: number;
}

/**
 * Evaluates a placement test by grouping presented questions by their lesson's conceptTag.
 * If the user answered ALL presented questions for a conceptTag correctly, every lesson
 * in the course sharing that conceptTag is marked as skipped (SKIPPED_BY_PLACEMENT).
 * Unanswered questions count as wrong.
 *
 * Examples:
 *
 * Example 1 (All questions for "Divide & Conquer" answered correctly, "Sorting" missed one):
 *   Input:
 *     questions = [
 *       { id: 'q1', lessonId: 'l1', correctOptionIndex: 1, ... }, // l1 has conceptTag "Divide & Conquer"
 *       { id: 'q2', lessonId: 'l2', correctOptionIndex: 0, ... }, // l2 has conceptTag "Sorting"
 *       { id: 'q3', lessonId: 'l3', correctOptionIndex: 2, ... }, // l3 has conceptTag "Sorting"
 *     ]
 *     userAnswers = { q1: 1, q2: 0, q3: 1 } // q3 is wrong
 *     lessons = [
 *       { id: 'l1', conceptTag: 'Divide & Conquer', durationSeconds: 780, ... },
 *       { id: 'l2', conceptTag: 'Sorting', durationSeconds: 720, ... },
 *       { id: 'l3', conceptTag: 'Sorting', durationSeconds: 760, ... },
 *     ]
 *   Output:
 *     {
 *       skippedLessonIds: ['l1'],
 *       masteredConceptTags: ['Divide & Conquer'],
 *       savedSeconds: 780,
 *       correctCount: 2,
 *       totalQuestions: 3
 *     }
 *
 * Example 2 (Unanswered question due to timer expiring counts as wrong):
 *   Input:
 *     questions = [
 *       { id: 'q1', lessonId: 'l1', correctOptionIndex: 2, ... }, // l1 has conceptTag "Vectors"
 *       { id: 'q2', lessonId: 'l1', correctOptionIndex: 3, ... }, // l1 has conceptTag "Vectors"
 *     ]
 *     userAnswers = { q1: 2 } // q2 is unanswered (undefined)
 *     lessons = [
 *       { id: 'l1', conceptTag: 'Vectors', durationSeconds: 600, ... }
 *     ]
 *   Output:
 *     {
 *       skippedLessonIds: [],
 *       masteredConceptTags: [],
 *       savedSeconds: 0,
 *       correctCount: 1,
 *       totalQuestions: 2
 *     }
 */
export function evaluatePlacementTest(
  questions: QuizQuestion[],
  userAnswers: Record<string, number>,
  lessons: Lesson[]
): PlacementScoreResult {
  const lessonById = new Map<string, Lesson>();
  for (const lesson of lessons) {
    lessonById.set(lesson.id, lesson);
  }

  const questionsByConcept = new Map<string, QuizQuestion[]>();
  let correctCount = 0;

  for (const q of questions) {
    const selected = userAnswers[q.id];
    if (selected !== undefined && selected === q.correctOptionIndex) {
      correctCount += 1;
    }

    const parentLesson = lessonById.get(q.lessonId);
    if (!parentLesson) continue;

    const tag = parentLesson.conceptTag;
    const list = questionsByConcept.get(tag) || [];
    list.push(q);
    questionsByConcept.set(tag, list);
  }

  const masteredConceptTags: string[] = [];
  for (const [conceptTag, conceptQuestions] of questionsByConcept.entries()) {
    if (conceptQuestions.length === 0) continue;
    const allCorrect = conceptQuestions.every(
      (q) => userAnswers[q.id] !== undefined && userAnswers[q.id] === q.correctOptionIndex
    );
    if (allCorrect) {
      masteredConceptTags.push(conceptTag);
    }
  }

  const masteredSet = new Set(masteredConceptTags);
  const skippedLessonIds: string[] = [];
  let savedSeconds = 0;

  for (const lesson of lessons) {
    if (masteredSet.has(lesson.conceptTag)) {
      skippedLessonIds.push(lesson.id);
      savedSeconds += lesson.durationSeconds;
    }
  }

  return {
    skippedLessonIds,
    masteredConceptTags,
    savedSeconds,
    correctCount,
    totalQuestions: questions.length,
  };
}

/**
 * Formats saved seconds into "Y hours Z minutes" for the placement result screen.
 */
export function formatHoursAndMinutes(totalSeconds: number): string {
  const totalMinutes = Math.round(Math.max(0, totalSeconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${
    minutes === 1 ? 'minute' : 'minutes'
  }`;
}
