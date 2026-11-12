import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Play,
  ArrowLeft,
  Compass,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useAppStore, getAllCourses } from '../store/useAppStore';
import { buildDailyPlan, formatDuration } from '../utils/planner';
import { CourseHeader } from '../components/CourseHeader';
import { PaceSelector } from '../components/PaceSelector';
import { DayTabs } from '../components/DayTabs';
import { LessonCard } from '../components/LessonCard';
import { PillButton } from '../components/PillButton';

export const CourseOverviewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const {
    dailyPace,
    setDailyPace,
    enrolledSlugs,
    enrollCourse,
    toggleEnrollCourse,
    lessonProgress,
    quizScores,
    skippedLessonsByCourse,
    generatedCourses,
    activeBuildingCourseIds,
    resumeCourseBuild,
    retryFailedLessons,
  } = useAppStore();

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [isKnownLessonsOpen, setIsKnownLessonsOpen] = useState<boolean>(false);

  const allCourses = useMemo(
    () => getAllCourses(generatedCourses),
    [generatedCourses]
  );

  const course = useMemo(
    () => allCourses.find((c) => c.slug === slug),
    [allCourses, slug]
  );

  const hasTakenPlacement = Boolean(
    course && skippedLessonsByCourse[course.id] !== undefined
  );
  const skippedLessonIds = useMemo(
    () => (course ? skippedLessonsByCourse[course.id] || [] : []),
    [course, skippedLessonsByCourse]
  );

  // Pass skippedLessonIds into buildDailyPlan so the daily plan shrinks
  const days = useMemo(() => {
    if (!course) return [];
    return buildDailyPlan(course.lessons, dailyPace, skippedLessonIds);
  }, [course, dailyPace, skippedLessonIds]);

  const skippedLessons = useMemo(() => {
    if (!course || skippedLessonIds.length === 0) return [];
    const skippedSet = new Set(skippedLessonIds);
    return course.lessons.filter((l) => skippedSet.has(l.id));
  }, [course, skippedLessonIds]);

  const savedSeconds = useMemo(
    () => skippedLessons.reduce((acc, l) => acc + l.durationSeconds, 0),
    [skippedLessons]
  );

  // Keep selectedDayNumber within bounds when dailyPace or skippedLessonIds changes the total number of days
  useEffect(() => {
    if (days.length > 0 && selectedDayNumber > days.length) {
      setSelectedDayNumber(1);
    }
  }, [days.length, selectedDayNumber]);

  // Reset to Day 1 when navigating between courses
  useEffect(() => {
    setSelectedDayNumber(1);
    setIsKnownLessonsOpen(false);
  }, [slug]);

  if (!course) {
    return (
      <div className="max-w-[720px] mx-auto py-16 text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center mx-auto">
          <Compass className="w-6 h-6" />
        </div>
        <h1 className="text-[28px] md:text-[34px] font-semibold tracking-tight text-[#181A16]">
          Course{' '}
          <span className="font-serif-accent text-[32px] md:text-[38px] font-normal">
            not found
          </span>
        </h1>
        <p className="text-[14.5px] text-[#6B6E65] max-w-md mx-auto leading-relaxed">
          We couldn&apos;t find the course you were looking for. It may have been moved or you may have followed an outdated link.
        </p>
        <div className="pt-2">
          <PillButton variant="olive" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to dashboard</span>
          </PillButton>
        </div>
      </div>
    );
  }

  const isEnrolled = enrolledSlugs.includes(course.slug);
  const currentDay =
    days.find((d) => d.dayNumber === selectedDayNumber) || days[0];

  const courseStatusMap = lessonProgress[course.id] || {};
  const courseQuizScores = quizScores[course.id] || {};
  const skippedSet = new Set(skippedLessonIds);

  const hasStarted = Object.values(courseStatusMap).some(
    (status) => status === 'IN_PROGRESS' || status === 'COMPLETED'
  );
  const firstUnfinishedLesson =
    course.lessons.find(
      (l) =>
        !skippedSet.has(l.id) &&
        l.isGeneratedReady !== false &&
        courseStatusMap[l.id] !== 'COMPLETED'
    ) || course.lessons[0];
  const targetLessonId = firstUnfinishedLesson?.id || 'lesson-1';

  const handleStartLearning = (lessonIdToOpen = targetLessonId) => {
    const targetLesson = course.lessons.find((l) => l.id === lessonIdToOpen);
    if (targetLesson && targetLesson.isGeneratedReady === false) {
      return;
    }
    enrollCourse(course.slug);
    navigate(`/courses/${course.slug}/learn/${lessonIdToOpen}`);
  };

  const isStatusInProgress =
    course.buildStatus === 'LESSON_1_READY' ||
    course.buildStatus === 'GENERATING_REMAINING' ||
    course.buildStatus === 'PLANNING' ||
    course.buildStatus === 'QUEUED';

  const isActivelyRunningInTab = activeBuildingCourseIds.includes(course.id);
  const isBackgroundBuilding = isStatusInProgress && isActivelyRunningInTab;
  const isInterruptedNeedsResume = isStatusInProgress && !isActivelyRunningInTab;

  const readyLessonsCount = course.lessons.filter(
    (l) => l.isGeneratedReady !== false
  ).length;
  const buildingLessonIndex = Math.min(
    course.lessonCount,
    Math.max(
      readyLessonsCount + 1,
      course.currentlyBuildingLessonNumber || readyLessonsCount + 1
    )
  );

  const isWatchingSlices =
    course.pipelineType === 'LONG_SLICE' &&
    course.totalVideoSlices !== undefined &&
    (course.completedVideoSlices ?? 0) < course.totalVideoSlices;

  const isPlanningWindows =
    course.pipelineType === 'LONG_TRANSCRIPT' &&
    course.totalTranscriptWindows !== undefined &&
    (course.completedTranscriptWindows ?? 0) < course.totalTranscriptWindows;

  const failedLessonCount = course.lessons.filter((l) => l.hasBuildFailed).length;

  const estimatedTimeLabel =
    course.estimatedSecondsRemaining && course.estimatedSecondsRemaining > 0
      ? course.estimatedSecondsRemaining >= 60
        ? `Estimated time left: about ${Math.ceil(
            course.estimatedSecondsRemaining / 60
          )} min`
        : `Estimated time left: about ${course.estimatedSecondsRemaining}s`
      : 'Lesson 1 is ready — start studying while the rest unlock';

  return (
    <div className="max-w-[1040px] mx-auto space-y-6 pb-20 md:pb-10">
      {/* Back navigation link */}
      <div>
        <PillButton
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to courses</span>
        </PillButton>
      </div>

      {/* Slim Background Build Banner */}
      {isBackgroundBuilding && (
        <div className="bg-[#E2E8CE]/80 rounded-[14px] border border-[#C8D1B1] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13.5px] text-[#435624]">
          <div className="flex items-center gap-2.5 font-medium tabular-nums">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {isWatchingSlices ? (
              <span>
                Watching part{' '}
                {Math.min(
                  course.totalVideoSlices || 1,
                  (course.completedVideoSlices ?? 1) + 1
                )}{' '}
                of {course.totalVideoSlices} (about {course.lessonCount}{' '}
                lessons)
              </span>
            ) : isPlanningWindows ? (
              <span>
                Planning lessons: window{' '}
                {Math.min(
                  course.totalTranscriptWindows || 1,
                  (course.completedTranscriptWindows ?? 1) + 1
                )}{' '}
                of {course.totalTranscriptWindows} (about {course.lessonCount}{' '}
                lessons)
              </span>
            ) : (
              <span>
                Writing lessons: {buildingLessonIndex} of{' '}
                {course.isLessonCountApproximate
                  ? `about ${course.lessonCount}`
                  : course.lessons.length}
              </span>
            )}
          </div>
          <span className="text-[12px] text-[#435624]/85 tabular-nums">
            {estimatedTimeLabel}
          </span>
        </div>
      )}

      {/* Resume Building Banner (if browser tab was closed mid-build) */}
      {isInterruptedNeedsResume && (
        <div className="bg-[#F6F5EE] rounded-[14px] border border-[#C8D1B1] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13.5px] text-[#181A16]">
          <div className="flex items-start sm:items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#435624] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold">
                {isWatchingSlices
                  ? `Course build paused at part ${
                      course.completedVideoSlices ?? 1
                    } of ${course.totalVideoSlices} (about ${
                      course.lessonCount
                    } lessons)`
                  : `Course build paused at checkpoint (${readyLessonsCount} of ${
                      course.isLessonCountApproximate
                        ? `about ${course.lessonCount}`
                        : course.lessons.length
                    } lessons ready)`}
              </p>
              <p className="text-[12.5px] text-[#6B6E65]">
                Resume building from your last saved checkpoint without redoing completed parts.
              </p>
            </div>
          </div>

          <PillButton
            variant="olive"
            size="sm"
            onClick={() => resumeCourseBuild(course.id)}
            className="self-start sm:self-auto shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resume building</span>
          </PillButton>
        </div>
      )}

      {/* Slim Failed / Daily Limit Build Banner with "Resume building" and "Retry failed lessons" */}
      {course.buildStatus === 'FAILED' && (
        <div className="bg-[#FDF3F2] rounded-[14px] border border-[#EBC7C4] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13.5px] text-[#8E2A22]">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold">
                {course.isDailyLimitPaused
                  ? "Gemini's daily video limit was reached. Your progress is saved. Tap Resume tomorrow, or use a paid API key."
                  : failedLessonCount > 0
                  ? `${failedLessonCount} lesson(s) failed to generate`
                  : isWatchingSlices
                  ? `Course build paused while watching part ${
                      (course.completedVideoSlices ?? 1) + 1
                    } of ${course.totalVideoSlices}`
                  : `Course build paused at lesson ${
                      (course.completedLessonsCheckpoint ?? 1) + 1
                    } of ${
                      course.isLessonCountApproximate
                        ? `about ${course.lessonCount}`
                        : course.lessons.length
                    }`}
              </p>
              {!course.isDailyLimitPaused && (
                <p className="text-[12.5px] text-[#8E2A22]/90">
                  {course.buildErrorMessage ||
                    "We couldn't finish building all lessons. Completed lessons are saved."}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {(course.isDailyLimitPaused || isWatchingSlices || failedLessonCount === 0) && (
              <PillButton
                variant="olive"
                size="sm"
                onClick={() => resumeCourseBuild(course.id)}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume building</span>
              </PillButton>
            )}
            {failedLessonCount > 0 && (
              <PillButton
                variant={course.isDailyLimitPaused ? 'outline' : 'olive'}
                size="sm"
                onClick={() => retryFailedLessons(course.id)}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry failed lessons</span>
              </PillButton>
            )}
          </div>
        </div>
      )}

      {/* 1. Course Header Card */}
      <CourseHeader
        course={course}
        isEnrolled={isEnrolled}
        hasStarted={hasStarted}
        onToggleEnroll={() => toggleEnrollCourse(course.slug)}
        onStartLearning={() => handleStartLearning(targetLessonId)}
      />

      {/* 2. Placement Test Banner Card */}
      <div className="bg-[#F6F5EE] rounded-[16px] border border-[#EAE8DF] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[#181A16]">
              Already know some of this?
            </h2>
            <p className="text-[13px] text-[#6B6E65]">
              Skip lessons you&apos;ve already mastered and tailor the study plan to your level.
            </p>
          </div>
        </div>

        {hasTakenPlacement ? (
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E2E8CE] text-[#435624] text-[12.5px] font-medium tabular-nums">
              <span>
                Placement test done · saved {formatDuration(savedSeconds)}
              </span>
            </span>
            <Link
              to={`/courses/${course.slug}/placement`}
              className="text-[13px] font-medium text-[#435624] hover:text-[#36461C] underline underline-offset-4 transition-colors"
            >
              Retake
            </Link>
          </div>
        ) : (
          <PillButton
            variant="outline"
            size="md"
            onClick={() => navigate(`/courses/${course.slug}/placement`)}
            className="self-start sm:self-auto"
          >
            <span>Take the 2-minute placement test</span>
          </PillButton>
        )}
      </div>

      {/* 3. Pace Selector */}
      <PaceSelector value={dailyPace} onChange={setDailyPace} />

      {/* 4. Daily Study Plan Section */}
      <section className="space-y-4 pt-2">
        {/* Day Tabs */}
        <DayTabs
          days={days}
          selectedDayNumber={currentDay?.dayNumber ?? 1}
          onSelectDay={setSelectedDayNumber}
        />

        {/* Selected Day Summary Line & Start Learning / Continue CTA */}
        {currentDay && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
              <p className="text-[13.5px] font-medium text-[#6B6E65] tabular-nums">
                <span className="font-semibold text-[#181A16]">
                  Day {currentDay.dayNumber}
                </span>
                {' · '}
                <span>
                  {currentDay.lessons.length}{' '}
                  {currentDay.lessons.length === 1 ? 'lesson' : 'lessons'}
                </span>
                {' · '}
                <span>{formatDuration(currentDay.totalSeconds)}</span>
                {currentDay.dayNumber === 1 && (
                  <>
                    {' · '}
                    <span className="text-[#435624] font-medium">Today</span>
                  </>
                )}
              </p>

              <PillButton
                variant="olive"
                size="sm"
                onClick={() => handleStartLearning(targetLessonId)}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{hasStarted ? 'Continue' : 'Start learning'}</span>
              </PillButton>
            </div>

            {/* Lesson Cards List */}
            <div className="space-y-3">
              {currentDay.lessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  isCompleted={courseStatusMap[lesson.id] === 'COMPLETED'}
                  quizScorePercent={courseQuizScores[lesson.id]}
                  onSelect={(selected) => handleStartLearning(selected.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* Collapsed "Known lessons" Section at the Bottom for Skipped Lessons */}
        {skippedLessons.length > 0 && (
          <div className="pt-4">
            <div className="bg-[#F6F5EE] rounded-[16px] border border-[#EAE8DF] overflow-hidden">
              <button
                type="button"
                onClick={() => setIsKnownLessonsOpen((prev) => !prev)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#EAE8DF]/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[14px] font-semibold text-[#181A16]">
                    Known lessons
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E2E8CE] text-[#435624] text-[11.5px] font-medium tabular-nums">
                    {skippedLessons.length} skipped · {formatDuration(savedSeconds)}
                  </span>
                </div>
                {isKnownLessonsOpen ? (
                  <ChevronUp className="w-4 h-4 text-[#6B6E65]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#6B6E65]" />
                )}
              </button>

              {isKnownLessonsOpen && (
                <div className="px-5 pb-4 pt-1 space-y-2 border-t border-[#EAE8DF]">
                  {skippedLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      onClick={() => handleStartLearning(lesson.id)}
                      className="flex items-center justify-between gap-3 py-2.5 px-3.5 rounded-[12px] bg-white/80 border border-[#EAE8DF] hover:border-[#C8D1B1] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[12px] font-medium text-[#6B6E65] tabular-nums shrink-0">
                          #{lesson.sequenceNumber}
                        </span>
                        <span className="text-[13.5px] text-[#6B6E65] line-through truncate">
                          {lesson.title}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[12px] text-[#6B6E65] tabular-nums shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(lesson.durationSeconds)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

