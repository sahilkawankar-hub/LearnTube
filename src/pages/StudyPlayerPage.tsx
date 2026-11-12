import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Compass } from 'lucide-react';
import { useAppStore, getAllCourses } from '../store/useAppStore';
import { usePlayer } from '../hooks/usePlayer';
import { PlayerTabs } from '../components/PlayerTabs';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { NotesPanel } from '../components/NotesPanel';
import { LessonNav } from '../components/LessonNav';
import { QuizDrawer } from '../components/QuizDrawer';
import { PillButton } from '../components/PillButton';

export const StudyPlayerPage: React.FC = () => {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const navigate = useNavigate();

  const {
    playerViewMode,
    setPlayerViewMode,
    setActiveLessonId,
    lessonProgress,
    quizScores,
    skippedLessonsByCourse,
    setLessonStatus,
    markLessonInProgressIfTodo,
    saveQuizScore,
    enrollCourse,
    notesByCourse,
    addNote,
    deleteNote,
    generatedCourses,
  } = useAppStore();

  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const allCourses = useMemo(
    () => getAllCourses(generatedCourses),
    [generatedCourses]
  );

  const course = useMemo(
    () => allCourses.find((c) => c.slug === slug),
    [allCourses, slug]
  );

  const lessonIndex = useMemo(() => {
    if (!course || !lessonId) return -1;
    return course.lessons.findIndex((l) => l.id === lessonId);
  }, [course, lessonId]);

  const lesson =
    course && lessonIndex >= 0 ? course.lessons[lessonIndex] : undefined;

  // Set activeLessonId and mark lesson IN_PROGRESS if it was TODO
  useEffect(() => {
    if (!course || !lesson) return;
    setActiveLessonId(lesson.id);
    enrollCourse(course.slug);
    markLessonInProgressIfTodo(course.id, lesson.id);
    setIsQuizOpen(false);

    return () => {
      setActiveLessonId(null);
    };
  }, [course, lesson, setActiveLessonId, enrollCourse, markLessonInProgressIfTodo]);

  const { containerRef, currentTime, isReady, seekTo, play } = usePlayer({
    youtubeVideoId: lesson?.youtubeVideoId || '',
    startSeconds: lesson?.startSeconds || 0,
    endSeconds: lesson?.endSeconds || 0,
  });

  // Handle missing course or bad lesson id with a friendly message
  if (!course || !lesson) {
    return (
      <div className="min-h-screen bg-[#FCFBF7] flex items-center justify-center p-6">
        <div className="max-w-[520px] w-full bg-white rounded-[20px] border border-[#EAE8DF] p-8 text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <h1 className="text-[26px] md:text-[32px] font-semibold tracking-tight text-[#181A16]">
            Lesson{' '}
            <span className="font-serif-accent text-[30px] md:text-[36px] font-normal">
              not found
            </span>
          </h1>
          <p className="text-[14px] text-[#6B6E65] leading-relaxed">
            {course
              ? `We couldn't find that lesson inside "${course.title}". Choose another lesson from the course overview.`
              : "We couldn't find the course or lesson you requested."}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {course ? (
              <PillButton
                variant="olive"
                onClick={() => navigate(`/courses/${course.slug}`)}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to course overview</span>
              </PillButton>
            ) : (
              <PillButton variant="olive" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4" />
                <span>Back to dashboard</span>
              </PillButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  const courseStatusMap = lessonProgress[course.id] || {};
  const skippedIds = skippedLessonsByCourse[course.id] || [];
  const skippedSet = new Set(skippedIds);

  // Skipped lessons must not count in the progress bar
  const activeCourseLessons = course.lessons.filter(
    (l) => !skippedSet.has(l.id)
  );
  const completedCount = activeCourseLessons.filter(
    (l) => courseStatusMap[l.id] === 'COMPLETED'
  ).length;
  const progressPercent =
    activeCourseLessons.length > 0
      ? Math.round((completedCount / activeCourseLessons.length) * 100)
      : 0;

  const isCurrentLessonCompleted = courseStatusMap[lesson.id] === 'COMPLETED';
  const currentLessonQuizScore = quizScores[course.id]?.[lesson.id];

  const prevLessonCandidate =
    lessonIndex > 0 ? course.lessons[lessonIndex - 1] : null;
  const prevLesson =
    prevLessonCandidate && prevLessonCandidate.isGeneratedReady !== false
      ? prevLessonCandidate
      : null;

  const nextLessonCandidate =
    lessonIndex < course.lessons.length - 1
      ? course.lessons[lessonIndex + 1]
      : null;
  const nextLesson =
    nextLessonCandidate && nextLessonCandidate.isGeneratedReady !== false
      ? nextLessonCandidate
      : null;

  const currentLessonNotes = notesByCourse[course.id]?.[lesson.id] || [];

  const handleToggleComplete = () => {
    const nextStatus = isCurrentLessonCompleted ? 'IN_PROGRESS' : 'COMPLETED';
    setLessonStatus(course.id, lesson.id, nextStatus);
  };

  const handleSeekAndPlay = (seconds: number) => {
    if (playerViewMode !== 'video') {
      setPlayerViewMode('video');
    }
    seekTo(seconds);
    play();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFBF7] text-[#181A16]">
      {/* Slim Top Bar */}
      <header className="sticky top-0 z-30 h-[58px] bg-[#F6F5EE]/95 backdrop-blur-md border-b border-[#EAE8DF] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/courses/${course.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EAE8DF] hover:border-[#C8D1B1] text-[12.5px] font-medium text-[#181A16] transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#435624]" />
            <span className="hidden sm:inline">Course overview</span>
          </Link>

          <span className="text-[14px] font-semibold text-[#181A16] truncate">
            {course.title}
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0 tabular-nums">
          <span className="text-[12.5px] font-medium text-[#6B6E65]">
            Lesson {lesson.sequenceNumber} of {course.lessons.length}
          </span>

          {/* Course Progress Bar */}
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="w-28 h-2 rounded-full bg-[#EAE8DF] overflow-hidden">
              <div
                className="h-full bg-[#435624] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[12px] font-semibold text-[#435624]">
              {progressPercent}%
            </span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Study Workspace */}
      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Column (~65% on desktop) */}
          <div className="w-full lg:w-[65%] space-y-5 min-w-0">
            {/* Lesson Header + Video/Article Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#435624]">
                  Lesson {lesson.sequenceNumber} · {lesson.conceptTag}
                </p>
                <h1 className="text-[20px] sm:text-[24px] font-semibold tracking-tight text-[#181A16] leading-snug">
                  {lesson.title}
                </h1>
              </div>

              <PlayerTabs mode={playerViewMode} onChange={setPlayerViewMode} />
            </div>

            {/* Video View (kept mounted so switching tabs preserves playback state) */}
            <div className={playerViewMode === 'video' ? 'block' : 'hidden'}>
              <YouTubePlayer
                containerRef={containerRef}
                isReady={isReady}
                startSeconds={lesson.startSeconds}
                endSeconds={lesson.endSeconds}
                currentTime={currentTime}
              />
            </div>

            {/* Article View */}
            {playerViewMode === 'article' && (
              <div className="bg-white rounded-[16px] border border-[#EAE8DF] p-6 sm:p-8 shadow-[0_2px_12px_rgba(24,26,22,0.03)]">
                <div className="max-w-[65ch] mx-auto text-[#181A16] text-[15px] leading-[1.75] space-y-4">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-[22px] font-semibold tracking-tight text-[#181A16] mb-3 pb-2 border-b border-[#EAE8DF]">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-[16px] font-semibold text-[#435624] mt-5 mb-2">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-[15px] text-[#181A16]/90 leading-[1.75] mb-4">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 space-y-1.5 text-[14.5px] text-[#181A16]/90 mb-4">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      code: ({ className, children }) => {
                        const isBlock = Boolean(className);
                        if (isBlock) {
                          return (
                            <code className="block bg-[#F6F5EE] border border-[#EAE8DF] rounded-[12px] p-4 font-mono text-[13px] leading-relaxed text-[#181A16] overflow-x-auto my-4">
                              {children}
                            </code>
                          );
                        }
                        return (
                          <code className="px-1.5 py-0.5 rounded-md bg-[#F6F5EE] border border-[#EAE8DF] font-mono text-[13px] text-[#435624]">
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children }) => <div className="my-4">{children}</div>,
                    }}
                  >
                    {lesson.articleMarkdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Below Left Column: Previous / Next / Take Quiz / Mark as Complete */}
            <LessonNav
              prevLesson={prevLesson}
              nextLesson={nextLesson}
              isCompleted={isCurrentLessonCompleted}
              quizScorePercent={currentLessonQuizScore}
              onNavigateLesson={(targetId) =>
                navigate(`/courses/${course.slug}/learn/${targetId}`)
              }
              onToggleComplete={handleToggleComplete}
              onOpenQuiz={() => setIsQuizOpen(true)}
            />
          </div>

          {/* Right Column (~35% on desktop): Timestamped Notes Panel */}
          <div className="w-full lg:w-[35%] lg:sticky lg:top-[78px]">
            <NotesPanel
              currentTime={currentTime}
              notes={currentLessonNotes}
              onAddNote={(ts, content) =>
                addNote(course.id, lesson.id, ts, content)
              }
              onDeleteNote={(noteId) => deleteNote(course.id, lesson.id, noteId)}
              onSeekToTimestamp={handleSeekAndPlay}
            />
          </div>
        </div>
      </div>

      {/* End-of-Lesson Quiz Drawer (Right Drawer on desktop, Bottom Sheet on mobile) */}
      <QuizDrawer
        isOpen={isQuizOpen}
        lessonTitle={lesson.title}
        questions={lesson.quizQuestions || []}
        hasNextLesson={Boolean(nextLesson)}
        onClose={() => setIsQuizOpen(false)}
        onReplayTimestamp={handleSeekAndPlay}
        onCompleteQuiz={(scorePercent) =>
          saveQuizScore(course.id, lesson.id, scorePercent)
        }
        onNextLesson={() => {
          if (nextLesson) {
            navigate(`/courses/${course.slug}/learn/${nextLesson.id}`);
          } else {
            navigate(`/courses/${course.slug}`);
          }
        }}
      />
    </div>
  );
};
