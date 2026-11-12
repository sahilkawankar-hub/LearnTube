import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, ArrowRight, Compass } from 'lucide-react';
import { Course, QuizQuestion } from '../types';
import { evaluatePlacementTest, formatHoursAndMinutes } from '../utils/scoring';
import { useAppStore } from '../store/useAppStore';
import { CountdownBar } from './CountdownBar';
import { PillButton } from './PillButton';

interface PlacementTestProps {
  course: Course;
}

function shuffleQuestions(items: QuizQuestion[]): QuizQuestion[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const PlacementTest: React.FC<PlacementTestProps> = ({ course }) => {
  const navigate = useNavigate();
  const { savePlacementResult } = useAppStore();

  // Pull all placement-eligible questions for the course, shuffled, max 8 questions
  const eligibleQuestions = useMemo(() => {
    const pool: QuizQuestion[] = [];
    for (const lesson of course.lessons) {
      for (const q of lesson.quizQuestions || []) {
        if (q.isPlacementEligible) {
          pool.push(q);
        }
      }
    }
    return shuffleQuestions(pool).slice(0, 8);
  }, [course]);

  const [isLoading, setIsLoading] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedForCurrent, setSelectedForCurrent] = useState<number | null>(
    null
  );
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);

  // Brief skeleton shimmer while questions load
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, []);

  // 120-second countdown timer
  useEffect(() => {
    if (isLoading || isFinished || eligibleQuestions.length === 0) return;

    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isLoading, isFinished, eligibleQuestions.length]);

  // Compute and persist placement test result when finished
  const scoreResult = useMemo(() => {
    if (!isFinished) return null;
    return evaluatePlacementTest(eligibleQuestions, userAnswers, course.lessons);
  }, [isFinished, eligibleQuestions, userAnswers, course.lessons]);

  useEffect(() => {
    if (!isFinished || !scoreResult) return;
    const allLessonIds = course.lessons.map((l) => l.id);
    savePlacementResult(
      course.id,
      allLessonIds,
      scoreResult.skippedLessonIds
    );
  }, [isFinished, scoreResult, course.id, course.lessons, savePlacementResult]);

  // Select option and advance to next question after 400ms (no explanations shown)
  const handleSelectOption = (optionIndex: number) => {
    if (selectedForCurrent !== null || isFinished) return;
    const currentQ = eligibleQuestions[currentIndex];
    if (!currentQ) return;

    setSelectedForCurrent(optionIndex);
    const updatedAnswers = {
      ...userAnswers,
      [currentQ.id]: optionIndex,
    };
    setUserAnswers(updatedAnswers);

    window.setTimeout(() => {
      setSelectedForCurrent(null);
      if (currentIndex + 1 < eligibleQuestions.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsFinished(true);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFBF7] text-[#181A16]">
      {/* Full-Screen Focused Top Bar */}
      <header className="sticky top-0 z-30 h-[58px] bg-[#F6F5EE]/95 backdrop-blur-md border-b border-[#EAE8DF] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <span className="text-[14px] font-semibold text-[#181A16] truncate">
          {course.title}
        </span>

        {!isFinished && eligibleQuestions.length > 0 && (
          <CountdownBar remainingSeconds={remainingSeconds} totalSeconds={120} />
        )}

        <button
          type="button"
          onClick={() => navigate(`/courses/${course.slug}`)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#EAE8DF] hover:border-[#C8D1B1] text-[12.5px] font-medium text-[#181A16] transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5 text-[#6B6E65]" />
          <span>Exit</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-[640px]">
          {isLoading ? (
            /* Skeleton Shimmer (#EAE8DF, animate-pulse) */
            <div className="bg-white rounded-[20px] border border-[#EAE8DF] p-6 sm:p-8 space-y-5 animate-pulse">
              <div className="h-3.5 w-32 rounded-full bg-[#EAE8DF]" />
              <div className="space-y-2">
                <div className="h-5 w-full rounded-full bg-[#EAE8DF]" />
                <div className="h-5 w-3/4 rounded-full bg-[#EAE8DF]" />
              </div>
              <div className="space-y-3 pt-2">
                <div className="h-14 w-full rounded-[14px] bg-[#EAE8DF]" />
                <div className="h-14 w-full rounded-[14px] bg-[#EAE8DF]" />
                <div className="h-14 w-full rounded-[14px] bg-[#EAE8DF]" />
                <div className="h-14 w-full rounded-[14px] bg-[#EAE8DF]" />
              </div>
            </div>
          ) : eligibleQuestions.length === 0 ? (
            /* Friendly message when course has no placement-eligible questions */
            <div className="bg-white rounded-[20px] border border-[#EAE8DF] p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <h1 className="text-[22px] font-semibold text-[#181A16]">
                No placement test is available for this course yet.
              </h1>
              <PillButton
                variant="olive"
                onClick={() => navigate(`/courses/${course.slug}`)}
              >
                <span>Back to course overview</span>
              </PillButton>
            </div>
          ) : !isFinished ? (
            /* Active Placement Question Card (no explanations shown) */
            <div className="bg-white rounded-[20px] border border-[#EAE8DF] p-6 sm:p-8 shadow-[0_6px_24px_rgba(24,26,22,0.04)] space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#435624] tabular-nums">
                  Question {currentIndex + 1} of {eligibleQuestions.length}
                </span>
                <span className="text-[12px] text-[#6B6E65]">
                  2-Minute Placement Check
                </span>
              </div>

              <h1 className="text-[19px] sm:text-[22px] font-semibold text-[#181A16] leading-snug">
                {eligibleQuestions[currentIndex].questionPrompt}
              </h1>

              <div className="space-y-3">
                {eligibleQuestions[currentIndex].options.map((opt, idx) => {
                  const isSelected = selectedForCurrent === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full text-left p-4 rounded-[14px] border text-[14.5px] leading-relaxed transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-[#E2E8CE] border-[#435624]/40 text-[#181A16] font-medium scale-[0.99]'
                          : 'bg-white border-[#EAE8DF] text-[#181A16] hover:border-[#C8D1B1] hover:bg-[#F6F5EE]/60'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Placement Result Screen */
            <div className="bg-white rounded-[20px] border border-[#EAE8DF] p-8 sm:p-10 text-center space-y-6 shadow-[0_8px_28px_rgba(24,26,22,0.05)]">
              <div className="w-12 h-12 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3.5 py-1 rounded-full bg-[#E2E8CE] text-[#435624] text-[12px] font-semibold tabular-nums">
                  {scoreResult?.correctCount ?? 0} of {eligibleQuestions.length}{' '}
                  questions correct
                </span>
                <h1 className="text-[24px] sm:text-[30px] font-semibold tracking-tight text-[#181A16] text-balance">
                  You can skip{' '}
                  <span className="font-serif-accent text-[28px] sm:text-[34px] font-normal">
                    {scoreResult?.skippedLessonIds.length ?? 0} lessons
                  </span>{' '}
                  and save {formatHoursAndMinutes(scoreResult?.savedSeconds ?? 0)}
                </h1>
                <p className="text-[14px] text-[#6B6E65] max-w-md mx-auto leading-relaxed">
                  {scoreResult && scoreResult.skippedLessonIds.length > 0
                    ? `You demonstrated mastery in ${scoreResult.masteredConceptTags.join(
                        ', '
                      )}. Those lessons have been moved to your Known lessons list.`
                    : 'We kept all lessons in your daily plan so you don’t miss any foundational concepts.'}
                </p>
              </div>

              <div className="pt-2">
                <PillButton
                  variant="olive"
                  size="lg"
                  onClick={() => navigate(`/courses/${course.slug}`)}
                >
                  <span>See my new plan</span>
                  <ArrowRight className="w-4 h-4" />
                </PillButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
