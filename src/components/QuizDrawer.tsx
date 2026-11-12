import React, { useState, useEffect } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { QuizQuestion } from '../types';
import { QuestionCard } from './QuestionCard';
import { ScoreCard } from './ScoreCard';

interface QuizDrawerProps {
  isOpen: boolean;
  lessonTitle: string;
  questions: QuizQuestion[];
  hasNextLesson: boolean;
  onClose: () => void;
  onReplayTimestamp: (seconds: number) => void;
  onCompleteQuiz: (scorePercent: number) => void;
  onNextLesson: () => void;
}

export const QuizDrawer: React.FC<QuizDrawerProps> = ({
  isOpen,
  lessonTitle,
  questions,
  hasNextLesson,
  onClose,
  onReplayTimestamp,
  onCompleteQuiz,
  onNextLesson,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);

  // Reset quiz state when lesson changes
  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setIsFinished(false);
  }, [lessonTitle, questions]);

  if (!isOpen) return null;

  const currentQuestion = questions[currentIndex];
  const selectedOption = currentQuestion
    ? answers[currentQuestion.id] ?? null
    : null;

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion || answers[currentQuestion.id] !== undefined) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      const correctCount = questions.filter(
        (q) => answers[q.id] === q.correctOptionIndex
      ).length;
      const scorePercent =
        questions.length > 0
          ? Math.round((correctCount / questions.length) * 100)
          : 0;
      onCompleteQuiz(scorePercent);
      setIsFinished(true);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setAnswers({});
    setIsFinished(false);
  };

  const correctCount = questions.filter(
    (q) => answers[q.id] === q.correctOptionIndex
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end items-end md:items-stretch">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#181A16]/35 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-side Drawer on desktop, Bottom Sheet on mobile */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lesson Quiz"
        className="relative z-10 w-full md:w-[460px] max-h-[88vh] md:max-h-none md:h-full bg-[#FCFBF7] rounded-t-[24px] md:rounded-t-none md:rounded-l-[24px] border-t md:border-t-0 md:border-l border-[#EAE8DF] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-[#F6F5EE] border-b border-[#EAE8DF] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B6E65]">
                Lesson Check
              </p>
              <h2 className="text-[14px] font-semibold text-[#181A16] truncate">
                {lessonTitle}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close quiz drawer"
            className="p-2 rounded-full text-[#6B6E65] hover:text-[#181A16] hover:bg-[#EAE8DF]/70 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isFinished && currentQuestion ? (
            <QuestionCard
              question={currentQuestion}
              questionIndex={currentIndex}
              totalQuestions={questions.length}
              selectedOptionIndex={selectedOption}
              onSelectOption={handleSelectOption}
              onReplayTimestamp={(seconds) => {
                onClose();
                onReplayTimestamp(seconds);
              }}
              onNextQuestion={handleNext}
              showFeedback={true}
            />
          ) : (
            <ScoreCard
              correctCount={correctCount}
              totalQuestions={questions.length}
              hasNextLesson={hasNextLesson}
              onRetry={handleRetry}
              onNextLesson={() => {
                onClose();
                onNextLesson();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
