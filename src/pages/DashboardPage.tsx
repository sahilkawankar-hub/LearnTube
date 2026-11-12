import React, { useMemo, useRef } from 'react';
import { Lock, Unlock, Compass, Clock, BookOpen, Users, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, DiscoveryTab, getAllCourses } from '../store/useAppStore';
import { mockRoadmaps } from '../data/mock';
import { HeroSection } from '../components/HeroSection';
import { CourseCard } from '../components/CourseCard';

const TABS: DiscoveryTab[] = ['POPULAR COURSES', 'ROADMAPS'];

export const DashboardPage: React.FC = () => {
  const {
    isHeroUnlocked,
    toggleHeroUnlocked,
    activeDiscoveryTab,
    setActiveDiscoveryTab,
    generatedCourses,
  } = useAppStore();
  const discoveryRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const allCourses = useMemo(
    () => getAllCourses(generatedCourses),
    [generatedCourses]
  );

  const handleScrollToCourses = () => {
    setActiveDiscoveryTab('POPULAR COURSES');
    discoveryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 pb-20 md:pb-8">
      {/* Top-Right Dev-Only State Toggle */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={toggleHeroUnlocked}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F6F5EE] border border-[#EAE8DF] hover:border-[#C8D1B1] text-[12px] font-medium text-[#6B6E65] hover:text-[#181A16] transition-all cursor-pointer shadow-2xs"
          title="Developer toggle: switch between Locked (Free) and Unlocked (Plan) hero card"
        >
          {isHeroUnlocked ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-[#435624]" />
              <span>Dev Preview: Unlocked Builder</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-[#6B6E65]" />
              <span>Dev Preview: Locked (Free Tier)</span>
            </>
          )}
        </button>
      </div>

      {/* Hero Section */}
      <HeroSection onBrowseCourses={handleScrollToCourses} />

      {/* Below Hero: Discovery Section */}
      <section ref={discoveryRef} className="space-y-6 pt-2">
        {/* Heading + Uppercase Tabs Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#EAE8DF] pb-4">
          <h2 className="text-[22px] md:text-[28px] font-semibold tracking-tight text-[#181A16] text-balance">
            No link handy?{' '}
            <span className="font-serif-accent text-[26px] md:text-[32px] font-normal">
              Start with one of these
            </span>
          </h2>

          {/* Two small uppercase tabs: POPULAR COURSES and ROADMAPS */}
          <div
            role="tablist"
            aria-label="Course discovery tabs"
            className="inline-flex items-center gap-1 p-1 rounded-full bg-[#F6F5EE] border border-[#EAE8DF] self-start sm:self-auto"
          >
            {TABS.map((tab) => {
              const isActive = activeDiscoveryTab === tab;
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveDiscoveryTab(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.06em] transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#E2E8CE] text-[#435624] shadow-2xs'
                      : 'text-[#6B6E65] hover:text-[#181A16]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Panel Content */}
        {activeDiscoveryTab === 'POPULAR COURSES' ? (
          /* 3-Column Grid on desktop, 1 column under 768px */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onSelect={() => navigate(`/courses/${course.slug}`)}
              />
            ))}
          </div>
        ) : (
          /* Roadmaps List */
          <div className="space-y-4">
            {mockRoadmaps.map((roadmap, index) => (
              <div
                key={roadmap.id}
                onClick={() => navigate('/roadmaps')}
                className="group bg-white rounded-[16px] border border-[#EAE8DF] p-5 sm:p-6 transition-all duration-200 hover:-translate-y-[2px] hover:border-[#C8D1B1] hover:shadow-[0_10px_24px_rgba(24,26,22,0.05)] flex flex-col md:flex-row md:items-center justify-between gap-5 cursor-pointer"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 text-[12px] text-[#6B6E65] tabular-nums">
                    <span className="font-semibold text-[#435624]">
                      0{index + 1}. Curated Track
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{roadmap.estimatedWeeks} weeks</span>
                    <span aria-hidden="true">·</span>
                    <span>{roadmap.tags.join(' / ')}</span>
                  </div>

                  <h3 className="text-[18px] font-semibold text-[#181A16] group-hover:text-[#435624] transition-colors">
                    {roadmap.title}
                  </h3>

                  <p className="text-[13.5px] text-[#6B6E65] leading-relaxed">
                    {roadmap.description}
                  </p>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#EAE8DF]/80 shrink-0 tabular-nums">
                  <div className="flex items-center gap-3 text-[12px] text-[#6B6E65]">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{roadmap.courseCount} courses</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{roadmap.totalHours}h total</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{roadmap.learnerCount.toLocaleString()}</span>
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#435624] group-hover:translate-x-0.5 transition-transform">
                    <Compass className="w-4 h-4" />
                    <span>Explore roadmap</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
