import React from 'react';
import { Clock, BookOpen, Users, Play, Check, BookmarkPlus } from 'lucide-react';
import { Course, CourseBuildStatus } from '../types';
import { renderCourseArtwork } from './CourseCard';
import { PillButton } from './PillButton';

interface CourseHeaderProps {
  course: Course;
  isEnrolled: boolean;
  hasStarted?: boolean;
  onToggleEnroll: () => void;
  onStartLearning: () => void;
}

function getStatusBadgeStyle(status: CourseBuildStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-[#E2E8CE] text-[#435624] border-[#435624]/25';
    case 'FAILED':
      return 'bg-[#FDF3F2] text-[#8E2A22] border-[#EBC7C4]';
    case 'LESSON_1_READY':
    case 'GENERATING_REMAINING':
    case 'PLANNING':
    case 'QUEUED':
    default:
      return 'bg-[#F6F5EE] text-[#435624] border-[#C8D1B1]';
  }
}

export const CourseHeader: React.FC<CourseHeaderProps> = ({
  course,
  isEnrolled,
  hasStarted = false,
  onToggleEnroll,
  onStartLearning,
}) => {
  return (
    <div className="bg-white rounded-[16px] border border-[#EAE8DF] p-5 sm:p-6 md:p-7 shadow-[0_2px_10px_rgba(24,26,22,0.03)]">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Course Thumbnail */}
        <div className="w-full md:w-[280px] aspect-[16/9] rounded-[12px] overflow-hidden border border-[#EAE8DF] bg-[#F6F5EE] shrink-0">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            renderCourseArtwork(course.thumbnailTheme)
          )}
        </div>

        {/* Course Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-4 w-full">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-medium text-[#435624]">
                {course.channelName}
              </p>

              {course.isUserGenerated && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#E2E8CE] text-[#435624] text-[11px] font-semibold">
                  Built by you
                </span>
              )}

              {course.buildStatus && (
                <span
                  className={`px-2.5 py-0.5 rounded-full border text-[10.5px] font-semibold uppercase tracking-[0.05em] tabular-nums ${getStatusBadgeStyle(
                    course.buildStatus
                  )}`}
                >
                  {course.buildStatus}
                </span>
              )}
            </div>

            <h1 className="text-[24px] md:text-[30px] font-semibold tracking-tight text-[#181A16] leading-tight text-balance">
              {course.title}
            </h1>
            <p className="text-[14px] text-[#6B6E65] leading-relaxed max-w-2xl">
              {course.description}
            </p>
          </div>

          {/* Metadata + Actions Row */}
          <div className="pt-3 border-t border-[#EAE8DF]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#6B6E65] tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#6B6E65]/80" />
                <span>{course.totalDuration}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#6B6E65]/80" />
                <span>
                  {course.isLessonCountApproximate
                    ? `about ${course.lessonCount} lessons`
                    : `${course.lessonCount} lessons`}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#6B6E65]/80" />
                <span>{course.learnerCount.toLocaleString()} learners</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <PillButton
                variant={isEnrolled ? 'sage' : 'outline'}
                size="md"
                onClick={onToggleEnroll}
              >
                {isEnrolled ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Enrolled</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>Enroll</span>
                  </>
                )}
              </PillButton>

              <PillButton
                variant="olive"
                size="md"
                onClick={onStartLearning}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{hasStarted ? 'Continue' : 'Start learning'}</span>
              </PillButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

