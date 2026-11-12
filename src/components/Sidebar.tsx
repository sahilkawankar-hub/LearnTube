import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Calendar,
  BookOpen,
  Compass,
  FileText,
  Inbox,
  Users,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import { useAppStore, getAllCourses } from '../store/useAppStore';
import { PillButton } from './PillButton';

interface NavItemConfig {
  label: string;
  to: string;
  icon: React.FC<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isMobileDrawerOpen,
    setMobileDrawerOpen,
    unreadInboxCount,
    enrolledSlugs,
    lessonProgress,
    generatedCourses,
    triggerFocusUrlInput,
  } = useAppStore();
  const navigate = useNavigate();

  const allCourses = getAllCourses(generatedCourses);

  const enrolledCourses = enrolledSlugs
    .map((slug) => allCourses.find((c) => c.slug === slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .slice(0, 5);

  const mainNavItems: NavItemConfig[] = [
    { label: 'Today', to: '/dashboard', icon: Calendar },
    { label: 'My courses', to: '/my-courses', icon: BookOpen },
    { label: 'Roadmaps', to: '/roadmaps', icon: Compass },
    { label: 'Notes', to: '/notes', icon: FileText },
    {
      label: 'Inbox',
      to: '/inbox',
      icon: Inbox,
      badge: unreadInboxCount > 0 ? unreadInboxCount : undefined,
    },
  ];

  const handleNewCourseClick = () => {
    setMobileDrawerOpen(false);
    navigate('/dashboard');
    triggerFocusUrlInput();
  };

  const renderSidebarContent = (isDrawer = false) => (
    <div className="flex flex-col h-full w-[240px] bg-[#F6F5EE] border-r border-[#EAE8DF] px-4 py-5 select-none shrink-0">
      {/* Top Header: Graduation cap + App Name + Collapse button */}
      <div className="flex items-center justify-between mb-5 px-1">
        <Link
          to="/dashboard"
          onClick={() => isDrawer && setMobileDrawerOpen(false)}
          className="flex items-center gap-2.5 text-[#181A16] hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl bg-[#435624] flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-4.5 h-4.5" />
          </div>
          <span className="font-semibold text-[16px] tracking-tight text-[#181A16]">
            LearnTube
          </span>
        </Link>

        {isDrawer ? (
          <button
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close navigation drawer"
            className="p-1.5 rounded-lg text-[#6B6E65] hover:text-[#181A16] hover:bg-[#EAE8DF]/70 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="p-1.5 rounded-lg text-[#6B6E65] hover:text-[#181A16] hover:bg-[#EAE8DF]/70 transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Full-width olive pill button "+ New course" */}
      <div className="mb-6">
        <PillButton
          variant="olive"
          fullWidth
          onClick={handleNewCourseClick}
          className="py-2.5 text-[13px] font-medium"
        >
          <Plus className="w-4 h-4 stroke-[2.2]" />
          <span>New course</span>
        </PillButton>
      </div>

      {/* Primary Navigation Items */}
      <nav className="space-y-1" aria-label="Main Navigation">
        {mainNavItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => isDrawer && setMobileDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2 rounded-full text-[13.5px] transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#E2E8CE] text-[#181A16] font-medium'
                    : 'text-[#6B6E65] hover:text-[#181A16] hover:bg-[#EAE8DF]/50 font-normal'
                }`
              }
            >
              <span className="flex items-center gap-2.5 truncate">
                <IconComponent className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#435624] text-white text-[11px] font-medium tabular-nums">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* RECENTS Section */}
      <div className="mt-7 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6E65] mb-2">
          RECENTS
        </p>
        {enrolledCourses.length === 0 ? (
          <p className="text-[12.5px] leading-relaxed text-[#6B6E65]/90">
            Courses you start will show up here.
          </p>
        ) : (
          <ul className="space-y-1 -mx-1.5">
            {enrolledCourses.map((course) => {
              const statusMap = lessonProgress[course.id] || {};
              const completedCount = course.lessons.filter(
                (l) => statusMap[l.id] === 'COMPLETED'
              ).length;
              const pct =
                course.lessons.length > 0
                  ? Math.round((completedCount / course.lessons.length) * 100)
                  : 0;
              const circumference = 37.7;
              const dashOffset =
                circumference - (pct / 100) * circumference;

              return (
                <li key={course.slug}>
                  <NavLink
                    to={`/courses/${course.slug}`}
                    onClick={() => isDrawer && setMobileDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-full text-[12.5px] transition-colors ${
                        isActive
                          ? 'bg-[#E2E8CE] text-[#181A16] font-medium'
                          : 'text-[#6B6E65] hover:text-[#181A16] hover:bg-[#EAE8DF]/50'
                      }`
                    }
                  >
                    <span className="truncate">{course.title}</span>
                    {/* Dynamic Progress Ring */}
                    <span
                      className="inline-flex items-center gap-1 shrink-0 text-[10.5px] text-[#6B6E65] tabular-nums"
                      title={`${pct}% complete`}
                    >
                      <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 16 16" aria-hidden="true">
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          fill="none"
                          stroke="#D8D5C8"
                          strokeWidth="2"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          fill="none"
                          stroke="#435624"
                          strokeWidth="2"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>{pct}%</span>
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Promo Card + EXPLORE Section */}
      <div className="mt-6 space-y-4">
        <div className="bg-white border border-[#EAE8DF] rounded-[14px] p-3.5 shadow-[0_2px_8px_rgba(24,26,22,0.03)]">
          <p className="text-[13px] font-semibold text-[#181A16] mb-1">
            Build your own courses
          </p>
          <p className="text-[12px] text-[#6B6E65] leading-snug mb-2.5">
            Turn any lecture or playlist into a daily study plan.
          </p>
          <Link
            to="/pricing"
            onClick={() => isDrawer && setMobileDrawerOpen(false)}
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#435624] hover:text-[#36461C] transition-colors"
          >
            <span>See plans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6E65] mb-1.5">
            EXPLORE
          </p>
          <NavLink
            to="/community"
            onClick={() => isDrawer && setMobileDrawerOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3.5 py-2 rounded-full text-[13.5px] transition-colors duration-150 ${
                isActive
                  ? 'bg-[#E2E8CE] text-[#181A16] font-medium'
                  : 'text-[#6B6E65] hover:text-[#181A16] hover:bg-[#EAE8DF]/50'
              }`
            }
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Community</span>
          </NavLink>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (>= 1280px / xl) */}
      <aside
        aria-label="Sidebar"
        className={`hidden xl:block sticky top-0 h-screen overflow-hidden transition-[width] duration-200 ease-out shrink-0 ${
          isSidebarCollapsed ? 'w-0' : 'w-[240px]'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Floating Expand Button when desktop sidebar is collapsed */}
      {isSidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="hidden xl:flex fixed top-5 left-5 z-40 items-center gap-2 px-3 py-2 rounded-full bg-[#F6F5EE] border border-[#EAE8DF] text-[#181A16] shadow-md hover:bg-[#E2E8CE] hover:border-[#C8D1B1] transition-all duration-150 cursor-pointer"
        >
          <PanelLeftOpen className="w-4 h-4 text-[#435624]" />
          <span className="text-xs font-medium">Menu</span>
        </button>
      )}

      {/* Sticky 56px Top Bar for < 1280px (below xl) */}
      <header className="xl:hidden sticky top-0 z-30 h-[56px] w-full bg-[#F6F5EE]/95 backdrop-blur-md border-b border-[#EAE8DF] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 -ml-1 rounded-lg text-[#181A16] hover:bg-[#EAE8DF]/60 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#435624] flex items-center justify-center text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-[#181A16]">
              LearnTube
            </span>
          </Link>
        </div>

        <PillButton
          variant="olive"
          size="sm"
          onClick={handleNewCourseClick}
          className="hidden sm:inline-flex"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New course</span>
        </PillButton>
      </header>

      {/* Off-Canvas Drawer for < 1280px */}
      {isMobileDrawerOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#181A16]/30 backdrop-blur-[2px] transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Bottom Nav Bar for < 768px (below md) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-[62px] bg-[#F6F5EE]/95 backdrop-blur-md border-t border-[#EAE8DF] px-2 flex items-center justify-around"
      >
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
              isActive ? 'text-[#435624]' : 'text-[#6B6E65]'
            }`
          }
        >
          <Calendar className="w-4 h-4" />
          <span>Today</span>
        </NavLink>

        <NavLink
          to="/my-courses"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
              isActive ? 'text-[#435624]' : 'text-[#6B6E65]'
            }`
          }
        >
          <BookOpen className="w-4 h-4" />
          <span>My courses</span>
        </NavLink>

        <button
          onClick={handleNewCourseClick}
          className="flex flex-col items-center justify-center gap-0.5 px-3.5 py-1.5 rounded-full bg-[#435624] text-white text-[11px] font-medium shadow-xs active:scale-95 transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ New</span>
        </button>

        <NavLink
          to="/notes"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
              isActive ? 'text-[#435624]' : 'text-[#6B6E65]'
            }`
          }
        >
          <FileText className="w-4 h-4" />
          <span>Notes</span>
        </NavLink>

        <NavLink
          to="/inbox"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
              isActive ? 'text-[#435624]' : 'text-[#6B6E65]'
            }`
          }
        >
          <div className="relative">
            <Inbox className="w-4 h-4" />
            {unreadInboxCount > 0 && (
              <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 rounded-full bg-[#435624] text-white text-[9px] flex items-center justify-center tabular-nums">
                {unreadInboxCount}
              </span>
            )}
          </div>
          <span>Inbox</span>
        </NavLink>
      </nav>
    </>
  );
};
