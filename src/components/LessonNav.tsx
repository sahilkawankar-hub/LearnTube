import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, HelpCircle } from 'lucide-react';
import { Lesson } from '../types';
import { PillButton } from './PillButton';

interface LessonNavProps {
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  isCompleted: boolean;
  quizScorePercent?: number;
  onNavigateLesson: (lessonId: string) => void;
  onToggleComplete: () => void;
  onOpenQuiz: () => void;
}

export const LessonNav: React.FC<LessonNavProps> = ({
  prevLesson,
  nextLesson,
  isCompleted,
  quizScorePercent,
  onNavigateLesson,
  onToggleComplete,
  onOpenQuiz,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-[#EAE8DF]">
      <div className="flex items-center gap-2.5">
        <PillButton
          type="button"
          variant="outline"
          size="md"
          disabled={!prevLesson}
          onClick={() => prevLesson && onNavigateLesson(prevLesson.id)}
          className="flex-1 sm:flex-initial"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous lesson</span>
        </PillButton>

        <PillButton
          type="button"
          variant="outline"
          size="md"
          disabled={!nextLesson}
          onClick={() => nextLesson && onNavigateLesson(nextLesson.id)}
          className="flex-1 sm:flex-initial"
        >
          <span>Next lesson</span>
          <ArrowRight className="w-4 h-4" />
        </PillButton>
      </div>

      <div className="flex items-center gap-2.5">
        <PillButton
          type="button"
          variant="sage"
          size="md"
          onClick={onOpenQuiz}
          className="flex-1 sm:flex-initial"
        >
          <HelpCircle className="w-4 h-4" />
          <span>
            {quizScorePercent !== undefined
              ? `Take quiz (${quizScorePercent}%)`
              : 'Take quiz'}
          </span>
        </PillButton>

        <PillButton
          type="button"
          variant={isCompleted ? 'sage' : 'olive'}
          size="md"
          onClick={onToggleComplete}
          className="flex-1 sm:flex-initial"
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#435624]" />
              <span>Completed</span>
            </>
          ) : (
            <>
              <Circle className="w-4 h-4" />
              <span>Mark as complete</span>
            </>
          )}
        </PillButton>
      </div>
    </div>
  );
};
