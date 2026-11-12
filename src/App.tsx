/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { CourseOverviewPage } from './pages/CourseOverviewPage';
import { StudyPlayerPage } from './pages/StudyPlayerPage';
import { PlacementTestPage } from './pages/PlacementTestPage';
import { NotesPage } from './pages/NotesPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

function ToastBanner() {
  const { toastMessage, showToast } = useAppStore();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#181A16] text-white px-4 py-3 rounded-full shadow-[0_12px_30px_rgba(24,26,22,0.2)] border border-[#435624]/40 flex items-center gap-2.5 text-[13px] font-medium">
      <CheckCircle2 className="w-4 h-4 text-[#E2E8CE] shrink-0" />
      <span>{toastMessage}</span>
      <button
        type="button"
        onClick={() => showToast(null)}
        aria-label="Dismiss notification"
        className="ml-1 p-0.5 rounded-full text-white/70 hover:text-white cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const isFullScreenRoute =
    /^\/courses\/[^/]+\/learn\/[^/]+/.test(location.pathname) ||
    /^\/courses\/[^/]+\/placement\/?$/.test(location.pathname);

  // Distraction-Free Study Player and Placement Test hide the main sidebar
  if (isFullScreenRoute) {
    return (
      <>
        <Routes>
          <Route
            path="/courses/:slug/learn/:lessonId"
            element={<StudyPlayerPage />}
          />
          <Route
            path="/courses/:slug/placement"
            element={<PlacementTestPage />}
          />
        </Routes>
        <ToastBanner />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col xl:flex-row bg-[#FCFBF7] text-[#181A16]">
      {/* Left Sidebar (Desktop 240px sticky, <1280px sticky top bar + drawer, <768px bottom nav) */}
      <Sidebar />

      {/* Main Scrollable Content Area (padding 24px 32px on desktop) */}
      <main className="flex-1 min-w-0 bg-[#FCFBF7] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-6 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses/:slug" element={<CourseOverviewPage />} />
          <Route
            path="/my-courses"
            element={
              <PlaceholderPage
                title="Your enrolled"
                accentWord="courses"
                subtitle="Track your daily study blocks, video progress, and upcoming quizzes in one calm workspace."
                routeType="my-courses"
              />
            }
          />
          <Route
            path="/roadmaps"
            element={
              <PlaceholderPage
                title="Structured learning"
                accentWord="roadmaps"
                subtitle="Multi-course sequences curated to take you from first principles to practical mastery."
                routeType="roadmaps"
              />
            }
          />
          <Route path="/notes" element={<NotesPage />} />
          <Route
            path="/inbox"
            element={
              <PlaceholderPage
                title="Study updates &"
                accentWord="inbox"
                subtitle="Daily study reminders, streak milestones, and course readiness notifications."
                routeType="inbox"
              />
            }
          />
          <Route
            path="/community"
            element={
              <PlaceholderPage
                title="Learner"
                accentWord="community"
                subtitle="Discover structured courses and study plans crafted by other curious learners."
                routeType="community"
              />
            }
          />
          <Route
            path="/pricing"
            element={
              <PlaceholderPage
                title="Simple, calm"
                accentWord="plans"
                subtitle="Browse community courses for free, or upgrade to transform any YouTube video into a structured course."
                routeType="pricing"
              />
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <ToastBanner />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

