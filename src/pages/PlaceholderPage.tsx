import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { PillButton } from '../components/PillButton';
import { CourseCard } from '../components/CourseCard';
import { mockNotes, mockRoadmaps } from '../data/mock';
import { useAppStore, getAllCourses } from '../store/useAppStore';

interface PlaceholderPageProps {
  title: string;
  accentWord: string;
  subtitle: string;
  routeType: 'my-courses' | 'roadmaps' | 'notes' | 'inbox' | 'community' | 'pricing';
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  accentWord,
  subtitle,
  routeType,
}) => {
  const navigate = useNavigate();
  const {
    inboxItems,
    markInboxItemRead,
    retryFailedLessons,
    enrolledSlugs,
    generatedCourses,
  } = useAppStore();

  const allCourses = useMemo(
    () => getAllCourses(generatedCourses),
    [generatedCourses]
  );

  const myEnrolledCourses = useMemo(
    () =>
      enrolledSlugs
        .map((slug) => allCourses.find((c) => c.slug === slug))
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [enrolledSlugs, allCourses]
  );

  return (
    <div className="max-w-[960px] mx-auto space-y-8 pb-20 md:pb-8">
      {/* Top Breadcrumb / Back Action */}
      <div>
        <PillButton
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Today</span>
        </PillButton>
      </div>

      {/* Editorial Heading */}
      <header className="space-y-2 border-b border-[#EAE8DF] pb-6">
        <h1 className="text-[26px] md:text-[36px] font-semibold tracking-tight text-[#181A16]">
          {title}{' '}
          <span className="font-serif-accent text-[30px] md:text-[40px] font-normal">
            {accentWord}
          </span>
        </h1>
        <p className="text-[14.5px] text-[#6B6E65] max-w-xl leading-relaxed">
          {subtitle}
        </p>
      </header>

      {/* Route-Specific Editorial Content */}
      {routeType === 'inbox' && (
        <div className="space-y-4">
          {inboxItems.map((item) => {
            const isFailed = item.type === 'course_failed';
            const isReady = item.type === 'course_ready';

            const handleItemClick = () => {
              markInboxItemRead(item.id);
              if (isFailed && item.courseId) {
                retryFailedLessons(item.courseId);
              }
              if (item.courseSlug) {
                navigate(`/courses/${item.courseSlug}`);
              }
            };

            return (
              <div
                key={item.id}
                onClick={handleItemClick}
                className={`bg-white rounded-[16px] border p-5 sm:p-6 space-y-2.5 transition-all cursor-pointer hover:-translate-y-[1px] ${
                  !item.isRead
                    ? 'border-[#C8D1B1] shadow-[0_6px_18px_rgba(67,86,36,0.05)]'
                    : 'border-[#EAE8DF]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[12px] text-[#6B6E65]">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#435624]">
                    {isFailed ? (
                      <AlertCircle className="w-3.5 h-3.5 text-[#8E2A22]" />
                    ) : isReady ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#435624]" />
                    ) : null}
                    <span className={isFailed ? 'text-[#8E2A22]' : 'text-[#435624]'}>
                      {isFailed
                        ? 'Build Interrupted'
                        : isReady
                        ? 'Course Ready'
                        : 'Welcome Message'}
                    </span>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#435624]" />
                    )}
                  </span>
                  <span>Today</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-[16px] font-semibold text-[#181A16]">
                      {item.title}
                    </h2>
                    <p className="text-[13.5px] text-[#6B6E65] leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {isFailed && item.courseId && (
                    <PillButton
                      variant="olive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick();
                      }}
                      className="self-start sm:self-auto shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry build</span>
                    </PillButton>
                  )}

                  {isReady && item.courseSlug && (
                    <PillButton
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick();
                      }}
                      className="self-start sm:self-auto shrink-0"
                    >
                      <span>Open course</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </PillButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {routeType === 'pricing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-[16px] border border-[#EAE8DF] p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6B6E65]">
                Free Explorer
              </p>
              <p className="text-[28px] font-semibold text-[#181A16] tabular-nums">
                $0 <span className="text-[14px] font-normal text-[#6B6E65]">/ month</span>
              </p>
              <p className="text-[13.5px] text-[#6B6E65]">
                Join unlimited community-built courses and follow curated learning roadmaps.
              </p>
              <ul className="space-y-2 pt-2 text-[13px] text-[#181A16]">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#435624]" />
                  <span>Access all public community courses</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#435624]" />
                  <span>Timestamped markdown notes</span>
                </li>
              </ul>
            </div>
            <PillButton variant="outline" onClick={() => navigate('/dashboard')}>
              Current plan
            </PillButton>
          </div>

          <div className="bg-white rounded-[16px] border border-[#C8D1B1] p-6 flex flex-col justify-between space-y-6 shadow-[0_6px_20px_rgba(67,86,36,0.06)]">
            <div className="space-y-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#435624]">
                Scholar Pro
              </p>
              <p className="text-[28px] font-semibold text-[#181A16] tabular-nums">
                $12 <span className="text-[14px] font-normal text-[#6B6E65]">/ month</span>
              </p>
              <p className="text-[13.5px] text-[#6B6E65]">
                Build custom AI-structured courses from any YouTube lecture, playlist, or talk.
              </p>
              <ul className="space-y-2 pt-2 text-[13px] text-[#181A16]">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#435624]" />
                  <span>Unlimited custom YouTube course builds</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#435624]" />
                  <span>Daily study pace planner &amp; chapter quizzes</span>
                </li>
              </ul>
            </div>
            <PillButton variant="olive" onClick={() => navigate('/dashboard')}>
              Return to dashboard
            </PillButton>
          </div>
        </div>
      )}

      {routeType === 'notes' && (
        <div className="bg-white rounded-[16px] border border-[#EAE8DF] p-6 space-y-3">
          {mockNotes.map((note) => (
            <div key={note.id} className="space-y-1.5">
              <div className="text-[12px] text-[#435624] font-medium tabular-nums">
                Timestamp {note.formattedTimestamp} · Neural Networks Masterclass
              </div>
              <p className="text-[14px] text-[#181A16] leading-relaxed">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {routeType === 'roadmaps' && (
        <div className="space-y-4">
          {mockRoadmaps.map((roadmap) => (
            <div
              key={roadmap.id}
              className="bg-white rounded-[16px] border border-[#EAE8DF] p-5 space-y-1.5"
            >
              <h3 className="text-[16px] font-semibold text-[#181A16]">
                {roadmap.title}
              </h3>
              <p className="text-[13.5px] text-[#6B6E65]">{roadmap.description}</p>
            </div>
          ))}
        </div>
      )}

      {routeType === 'my-courses' &&
        (myEnrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myEnrolledCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onSelect={() => navigate(`/courses/${course.slug}`)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[16px] border border-[#EAE8DF] p-8 text-center space-y-4">
            <p className="text-[15px] font-medium text-[#181A16]">
              You haven&apos;t started a course yet.
            </p>
            <p className="text-[13.5px] text-[#6B6E65] max-w-md mx-auto">
              Head back to the Today dashboard to browse popular courses or build a new course from a YouTube link.
            </p>
            <PillButton variant="olive" onClick={() => navigate('/dashboard')}>
              Browse popular courses
            </PillButton>
          </div>
        ))}

      {routeType === 'community' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onSelect={() => navigate(`/courses/${course.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

