import React from 'react';
import { Award, RotateCcw, ArrowRight } from 'lucide-react';
import { PillButton } from './PillButton';

interface ScoreCardProps {
  correctCount: number;
  totalQuestions: number;
  hasNextLesson: boolean;
  onRetry: () => void;
  onNextLesson: () => void;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  correctCount,
  totalQuestions,
  hasNextLesson,
  onRetry,
  onNextLesson,
}) => {
  const scorePercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = scorePercent >= 50;

  return (
    <div className="bg-white rounded-[16px] border border-[#EAE8DF] p-6 text-center space-y-5 shadow-2xs">
      <div className="w-12 h-12 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center mx-auto">
        <Award className="w-6 h-6" />
      </div>

      <div className="space-y-1.5">
        <span className="inline-block px-3 py-0.5 rounded-full bg-[#F6F5EE] border border-[#EAE8DF] text-[12px] font-semibold text-[#435624] tabular-nums">
          {scorePercent}% score
        </span>
        <h3 className="text-[24px] font-semibold tracking-tight text-[#181A16] tabular-nums">
          {correctCount} of {totalQuestions}{' '}
          <span className="font-serif-accent text-[28px] font-normal">
            correct
          </span>
        </h3>
        <p className="text-[13.5px] text-[#6B6E65] leading-relaxed">
          {passed
            ? 'Lesson marked as completed! You’re ready for the next concept.'
            : 'Score 50% or higher to automatically mark this lesson as complete.'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-2">
        <PillButton type="button" variant="outline" onClick={onRetry}>
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry quiz</span>
        </PillButton>

        <PillButton type="button" variant="olive" onClick={onNextLesson}>
          <span>{hasNextLesson ? 'Next lesson' : 'Finish course'}</span>
          <ArrowRight className="w-4 h-4" />
        </PillButton>
      </div>
    </div>
  );
};
