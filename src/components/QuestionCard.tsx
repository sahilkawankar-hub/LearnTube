import React from 'react';
import { Check, X, Play, ArrowRight } from 'lucide-react';
import { QuizQuestion } from '../types';
import { formatTimestampChip } from '../store/useAppStore';
import { PillButton } from './PillButton';

interface QuestionCardProps {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  selectedOptionIndex: number | null;
  onSelectOption: (optionIndex: number) => void;
  onReplayTimestamp?: (seconds: number) => void;
  onNextQuestion?: () => void;
  showFeedback?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionIndex,
  totalQuestions,
  selectedOptionIndex,
  onSelectOption,
  onReplayTimestamp,
  onNextQuestion,
  showFeedback = true,
}) => {
  const hasAnswered = selectedOptionIndex !== null;
  const isCorrect =
    hasAnswered && selectedOptionIndex === question.correctOptionIndex;

  return (
    <div className="space-y-5">
      {/* Small Question X of Y label */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#435624] tabular-nums">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
      </div>

      {/* Question Prompt */}
      <h3 className="text-[17px] sm:text-[18px] font-semibold text-[#181A16] leading-snug">
        {question.questionPrompt}
      </h3>

      {/* 4 Option Buttons */}
      <div className="space-y-2.5" role="radiogroup" aria-label={question.questionPrompt}>
        {question.options.map((optionText, idx) => {
          const isThisSelected = selectedOptionIndex === idx;
          const isThisCorrect = idx === question.correctOptionIndex;

          let optionStyle =
            'bg-white border-[#EAE8DF] text-[#181A16] hover:border-[#C8D1B1] hover:bg-[#F6F5EE]/50';

          if (hasAnswered) {
            if (showFeedback) {
              if (isThisCorrect) {
                // Correct option highlighted in sage (#E2E8CE)
                optionStyle =
                  'bg-[#E2E8CE] border-[#435624]/40 text-[#181A16] font-medium';
              } else if (isThisSelected && !isThisCorrect) {
                // Wrong selected option highlighted in soft red
                optionStyle =
                  'bg-[#FCEAEA] border-[#E2B4B4] text-[#7D2828] font-medium';
              } else {
                optionStyle = 'bg-white border-[#EAE8DF] text-[#6B6E65] opacity-75';
              }
            } else if (isThisSelected) {
              optionStyle =
                'bg-[#E2E8CE] border-[#435624]/40 text-[#181A16] font-medium';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={hasAnswered && showFeedback}
              onClick={() => onSelectOption(idx)}
              className={`w-full text-left p-4 rounded-[14px] border text-[14px] leading-relaxed transition-all duration-150 flex items-start justify-between gap-3 ${
                hasAnswered && showFeedback ? 'cursor-default' : 'cursor-pointer'
              } ${optionStyle}`}
            >
              <span className="flex-1">{optionText}</span>

              {hasAnswered && showFeedback && isThisCorrect && (
                <span className="w-5 h-5 rounded-full bg-[#435624] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </span>
              )}

              {hasAnswered && showFeedback && isThisSelected && !isThisCorrect && (
                <span className="w-5 h-5 rounded-full bg-[#B43C3C] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <X className="w-3 h-3 stroke-[2.5]" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Instant Answer Explanation & Timestamp Replay Chip */}
      {hasAnswered && showFeedback && (
        <div
          className={`rounded-[14px] border p-4 space-y-3 ${
            isCorrect
              ? 'bg-[#F6F5EE] border-[#C8D1B1]'
              : 'bg-[#FCFBF7] border-[#E2B4B4]'
          }`}
        >
          <p className="text-[13px] font-semibold text-[#181A16]">
            {isCorrect ? 'Correct!' : 'Not quite right'}
          </p>
          <p className="text-[13.5px] text-[#6B6E65] leading-relaxed">
            {question.explanationText}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {!isCorrect && onReplayTimestamp ? (
              <button
                type="button"
                onClick={() =>
                  onReplayTimestamp(question.explanationTimestampSeconds)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E2E8CE] hover:bg-[#435624] text-[#435624] hover:text-white text-[12px] font-semibold tabular-nums transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>
                  Replay {formatTimestampChip(question.explanationTimestampSeconds)}{' '}
                  that explains it
                </span>
              </button>
            ) : (
              <span />
            )}

            {onNextQuestion && (
              <PillButton
                type="button"
                variant="olive"
                size="sm"
                onClick={onNextQuestion}
              >
                <span>
                  {questionIndex + 1 < totalQuestions
                    ? 'Next question'
                    : 'See score'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </PillButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
