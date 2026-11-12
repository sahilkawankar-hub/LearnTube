import React from 'react';
import { Clock, FileCheck2, Check, Award, Lock, AlertCircle } from 'lucide-react';
import { Lesson } from '../types';
import { formatDuration } from '../utils/planner';

interface LessonCardProps {
  lesson: Lesson;
  isCompleted?: boolean;
  quizScorePercent?: number;
  onSelect?: (lesson: Lesson) => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  isCompleted = false,
  quizScorePercent,
  onSelect,
}) => {
  const isLocked = lesson.isGeneratedReady === false;
  const hasFailed = Boolean(lesson.hasBuildFailed);

  if (isLocked) {
    return (
      <article
        aria-disabled="true"
        className={`relative overflow-hidden bg-[#F6F5EE]/90 rounded-[14px] border border-[#EAE8DF] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none opacity-80 ${
          hasFailed ? '' : 'animate-pulse'
        }`}
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white border border-[#EAE8DF] text-[#6B6E65] flex items-center justify-center shrink-0 mt-0.5">
            {hasFailed ? (
              <AlertCircle className="w-4 h-4 text-[#8E2A22]" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="space-y-1 min-w-0">
            <h3 className="text-[15.5px] font-semibold text-[#6B6E65] leading-snug">
              {lesson.title}
            </h3>
            <p className="text-[13.5px] text-[#6B6E65]/80 leading-relaxed">
              {lesson.summaryDescription}
            </p>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 pl-11 sm:pl-0 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6B6E65] tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[#6B6E65]/80" />
            <span>{formatDuration(lesson.durationSeconds)}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#EAE8DF] text-[#6B6E65] text-[11.5px] font-medium whitespace-nowrap">
            <Lock className="w-3 h-3" />
            <span>{hasFailed ? 'Paused — tap Retry above' : 'Building lesson...'}</span>
          </span>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={() => onSelect?.(lesson)}
      className="group bg-white rounded-[14px] border border-[#EAE8DF] p-4 sm:p-5 transition-all duration-200 ease-out hover:-translate-y-[2px] hover:border-[#C8D1B1] hover:shadow-[0_8px_20px_rgba(24,26,22,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
    >
      <div className="flex items-start gap-3.5 min-w-0">
        {/* Lesson Sequence Number or Green Completed Check */}
        {isCompleted ? (
          <div
            title="Completed"
            className="w-8 h-8 rounded-full bg-[#E2E8CE] border border-[#435624]/30 text-[#435624] flex items-center justify-center shrink-0 mt-0.5 transition-colors"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#F6F5EE] border border-[#EAE8DF] group-hover:bg-[#E2E8CE] group-hover:border-[#C8D1B1] text-[#435624] text-[12.5px] font-semibold flex items-center justify-center shrink-0 mt-0.5 tabular-nums transition-colors">
            {lesson.sequenceNumber}
          </div>
        )}

        {/* Title & Summary */}
        <div className="space-y-1 min-w-0">
          <h3 className="text-[15.5px] font-semibold text-[#181A16] group-hover:text-[#435624] transition-colors leading-snug">
            {lesson.title}
          </h3>
          <p className="text-[13.5px] text-[#6B6E65] leading-relaxed">
            {lesson.summaryDescription}
          </p>
        </div>
      </div>

      {/* Right Side: Duration + Quiz Score Badge + "Notes and quiz" badge */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 pl-11 sm:pl-0 shrink-0">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6B6E65] tabular-nums">
          <Clock className="w-3.5 h-3.5 text-[#6B6E65]/80" />
          <span>{formatDuration(lesson.durationSeconds)}</span>
        </span>

        <div className="flex items-center gap-2">
          {quizScorePercent !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E2E8CE] text-[#435624] text-[11.5px] font-semibold tabular-nums whitespace-nowrap">
              <Award className="w-3 h-3" />
              <span>Quiz: {quizScorePercent}%</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F6F5EE] border border-[#EAE8DF] text-[#435624] text-[11.5px] font-medium whitespace-nowrap">
            <FileCheck2 className="w-3 h-3" />
            <span>Notes and quiz</span>
          </span>
        </div>
      </div>
    </article>
  );
};

