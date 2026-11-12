import React from 'react';
import { Clock, BookOpen, Users, Play } from 'lucide-react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
  onSelect?: (course: Course) => void;
}

export const renderCourseArtwork = (theme: Course['thumbnailTheme']) => {
  switch (theme) {
    case 'cs':
      return (
        <svg viewBox="0 0 400 225" className="w-full h-full object-cover" aria-hidden="true">
          <rect width="400" height="225" fill="#EAEFE3" />
          <circle cx="320" cy="50" r="85" fill="#D5E0C5" opacity="0.65" />
          <g stroke="#435624" strokeWidth="1.75" fill="none" opacity="0.85">
            <line x1="120" y1="75" x2="200" y2="55" />
            <line x1="200" y1="55" x2="280" y2="85" />
            <line x1="120" y1="75" x2="155" y2="145" />
            <line x1="200" y1="55" x2="225" y2="140" />
            <line x1="280" y1="85" x2="225" y2="140" />
          </g>
          <g fill="#FCFBF7" stroke="#435624" strokeWidth="2">
            <circle cx="120" cy="75" r="14" />
            <circle cx="200" cy="55" r="16" fill="#435624" />
            <circle cx="280" cy="85" r="14" />
            <circle cx="155" cy="145" r="13" />
            <circle cx="225" cy="140" r="15" fill="#E2E8CE" />
          </g>
          <text x="24" y="198" fill="#435624" fontSize="11" fontWeight="600" letterSpacing="0.08em">
            ALGORITHMS &amp; GRAPHS
          </text>
        </svg>
      );
    case 'ml':
      return (
        <svg viewBox="0 0 400 225" className="w-full h-full object-cover" aria-hidden="true">
          <rect width="400" height="225" fill="#F3EDE4" />
          <path d="M0 165 Q120 90 230 140 T400 95 L400 225 L0 225 Z" fill="#E5D8C5" opacity="0.6" />
          {/* Neural Layers */}
          <g stroke="#6B5B45" strokeWidth="1.2" opacity="0.45">
            <line x1="110" y1="65" x2="200" y2="55" />
            <line x1="110" y1="65" x2="200" y2="105" />
            <line x1="110" y1="115" x2="200" y2="55" />
            <line x1="110" y1="115" x2="200" y2="105" />
            <line x1="110" y1="115" x2="200" y2="155" />
            <line x1="200" y1="55" x2="290" y2="85" />
            <line x1="200" y1="105" x2="290" y2="85" />
            <line x1="200" y1="155" x2="290" y2="130" />
            <line x1="200" y1="105" x2="290" y2="130" />
          </g>
          <g fill="#435624">
            <circle cx="110" cy="65" r="9" />
            <circle cx="110" cy="115" r="9" />
            <circle cx="200" cy="55" r="10" fill="#8C5A3C" />
            <circle cx="200" cy="105" r="10" fill="#8C5A3C" />
            <circle cx="200" cy="155" r="10" fill="#8C5A3C" />
            <circle cx="290" cy="85" r="11" />
            <circle cx="290" cy="130" r="11" />
          </g>
          <text x="24" y="198" fill="#5C4D3C" fontSize="11" fontWeight="600" letterSpacing="0.08em">
            DEEP LEARNING &amp; TRANSFORMERS
          </text>
        </svg>
      );
    case 'design':
      return (
        <svg viewBox="0 0 400 225" className="w-full h-full object-cover" aria-hidden="true">
          <rect width="400" height="225" fill="#F5EFEA" />
          {/* Editorial Swiss Grid Lines */}
          <g stroke="#D8CFC4" strokeWidth="1">
            <line x1="80" y1="0" x2="80" y2="225" />
            <line x1="200" y1="0" x2="200" y2="225" />
            <line x1="320" y1="0" x2="320" y2="225" />
            <line x1="0" y1="65" x2="400" y2="65" />
            <line x1="0" y1="155" x2="400" y2="155" />
          </g>
          <rect x="80" y="65" width="120" height="90" fill="#E2E8CE" opacity="0.85" />
          <circle cx="260" cy="110" r="38" fill="#435624" opacity="0.9" />
          <text
            x="112"
            y="128"
            fill="#181A16"
            fontFamily="Instrument Serif, Georgia, serif"
            fontStyle="italic"
            fontSize="54"
          >
            Aa
          </text>
          <text x="24" y="198" fill="#6B6E65" fontSize="11" fontWeight="600" letterSpacing="0.08em">
            SWISS GRIDS &amp; TYPOGRAPHY
          </text>
        </svg>
      );
    case 'physics':
      return (
        <svg viewBox="0 0 400 225" className="w-full h-full object-cover" aria-hidden="true">
          <rect width="400" height="225" fill="#E8EEF2" />
          <g stroke="#C5D4E0" strokeWidth="1">
            <line x1="50" y1="112" x2="350" y2="112" />
            <line x1="200" y1="20" x2="200" y2="205" />
            <line x1="90" y1="175" x2="310" y2="50" strokeDasharray="4 4" />
          </g>
          <ellipse cx="200" cy="112" rx="95" ry="42" fill="none" stroke="#3B698B" strokeWidth="2" />
          <ellipse
            cx="200"
            cy="112"
            rx="95"
            ry="42"
            fill="none"
            stroke="#435624"
            strokeWidth="2"
            transform="rotate(38 200 112)"
          />
          <circle cx="200" cy="112" r="8" fill="#435624" />
          <circle cx="288" cy="95" r="6" fill="#3B698B" />
          <text x="24" y="198" fill="#3B698B" fontSize="11" fontWeight="600" letterSpacing="0.08em">
            LINEAR ALGEBRA &amp; VECTORS
          </text>
        </svg>
      );
    case 'economics':
      return (
        <svg viewBox="0 0 400 225" className="w-full h-full object-cover" aria-hidden="true">
          <rect width="400" height="225" fill="#F2F0E6" />
          <path
            d="M40 155 C95 150, 125 75, 185 85 C245 95, 270 140, 355 55"
            fill="none"
            stroke="#435624"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M40 135 C105 110, 160 145, 230 105 C285 75, 315 95, 355 82"
            fill="none"
            stroke="#9C7A44"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          <circle cx="185" cy="85" r="6" fill="#435624" />
          <circle cx="355" cy="55" r="6" fill="#435624" />
          <text x="24" y="198" fill="#5A584D" fontSize="11" fontWeight="600" letterSpacing="0.08em">
            MACROECONOMIC CYCLES
          </text>
        </svg>
      );
    case 'history':
    default:
      return (
        <svg viewBox="0 0 400 225" className="w-full h-full object-cover" aria-hidden="true">
          <rect width="400" height="225" fill="#EFEAE1" />
          {/* Classical Arch & Columns */}
          <g fill="#DED5C5" stroke="#8C7D65" strokeWidth="1.5">
            <rect x="105" y="75" width="22" height="90" />
            <rect x="189" y="75" width="22" height="90" />
            <rect x="273" y="75" width="22" height="90" />
            <polygon points="90,75 200,32 310,75" fill="#E5DEC9" />
            <rect x="95" y="165" width="210" height="10" />
          </g>
          <text x="24" y="198" fill="#6E6250" fontSize="11" fontWeight="600" letterSpacing="0.08em">
            CLASSICAL ANTIQUITY
          </text>
        </svg>
      );
  }
};

export const CourseCard: React.FC<CourseCardProps> = ({ course, onSelect }) => {
  return (
    <article
      onClick={() => onSelect?.(course)}
      className="group bg-white rounded-[16px] border border-[#EAE8DF] overflow-hidden transition-all duration-200 ease-out hover:-translate-y-[2px] hover:border-[#C8D1B1] hover:shadow-[0_10px_24px_rgba(24,26,22,0.05)] flex flex-col cursor-pointer"
    >
      {/* Thumbnail Slot */}
      <div className="relative aspect-[16/9] w-full bg-[#F6F5EE] overflow-hidden border-b border-[#EAE8DF]">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          renderCourseArtwork(course.thumbnailTheme)
        )}

        {/* "Built by you" Badge for User-Generated Courses */}
        {course.isUserGenerated && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#E2E8CE]/95 backdrop-blur-xs border border-[#435624]/25 text-[#435624] text-[11px] font-semibold tracking-tight shadow-2xs">
            Built by you
          </span>
        )}

        {/* Subtle Play Pill on Hover */}
        <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs border border-[#EAE8DF] flex items-center justify-center text-[#435624] shadow-xs group-hover:bg-[#435624] group-hover:text-white group-hover:border-[#435624] transition-colors">
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Channel Name */}
          <p className="text-[12px] font-medium text-[#6B6E65] mb-1.5 truncate">
            {course.channelName}
          </p>

          {/* Course Title */}
          <h3 className="text-[16px] font-semibold text-[#181A16] leading-snug group-hover:text-[#435624] transition-colors line-clamp-2 mb-4">
            {course.title}
          </h3>
        </div>

        {/* Clean Unboxed Metadata Footer: Total Duration · Lesson Count · Learner Count */}
        <div className="pt-3.5 border-t border-[#EAE8DF]/80 flex items-center justify-between text-[12px] text-[#6B6E65] tabular-nums">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#6B6E65]/80" />
              <span>{course.totalDuration}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-[#6B6E65]/80" />
              <span>
                {course.isLessonCountApproximate
                  ? `about ${course.lessonCount} lessons`
                  : `${course.lessonCount} lessons`}
              </span>
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-[#6B6E65]">
            <Users className="w-3.5 h-3.5 text-[#6B6E65]/80" />
            <span>{course.learnerCount.toLocaleString()}</span>
          </span>
        </div>
      </div>
    </article>
  );
};

