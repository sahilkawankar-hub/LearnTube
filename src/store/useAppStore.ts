import { create } from 'zustand';
import {
  Course,
  InboxItem,
  LessonStatus,
  TimestampNote,
  TranscriptSegment,
  WindowOutlineLesson,
} from '../types';
import { SHORT_VIDEO_LIMIT_SECONDS } from '../config';
import { mockCourses, mockNotes } from '../data/mock';
import {
  CourseBuilderError,
  DAILY_VIDEO_LIMIT_MESSAGE,
  DashboardBuildStep,
  createInitialCourseShell,
  generateCourseOutline,
  generateSingleLessonContent,
} from '../services/courseBuilder';
import {
  createInitialLongCourseShell,
  generateTranscriptLessonContent,
  generateWindowOutline,
  mergeWindowLessons,
  runWithConcurrency,
} from '../services/longCourseBuilder';
import {
  ESTIMATED_SECONDS_PER_SLICE,
  SLICE_DURATION_SECONDS,
  createInitialSliceCourseShell,
  generateSliceLessonContent,
  generateSliceOutline,
  mergeSliceLessons,
  runSliceQueue,
} from '../services/sliceCourseBuilder';
import { chunkTranscript } from '../utils/chunker';
import { makeSlices } from '../utils/slicer';
import { formatDuration } from '../utils/planner';
import { getCanonicalYouTubeWatchUrl } from '../utils/youtube';
import { VideoMetadataInfo } from '../hooks/useVideoInfo';

export type DiscoveryTab = 'POPULAR COURSES' | 'ROADMAPS';
export type DailyPace = 30 | 60 | 90 | 120;
export type PlayerViewMode = 'video' | 'article';

const ENROLLED_STORAGE_KEY = 'learntube_enrolled_slugs_v1';
const PROGRESS_STORAGE_KEY = 'learntube_lesson_progress_v1';
const NOTES_STORAGE_KEY = 'learntube_notes_v1';
const QUIZ_SCORES_STORAGE_KEY = 'learntube_quiz_scores_v1';
const SKIPPED_LESSONS_STORAGE_KEY = 'learntube_skipped_lessons_v1';
const GENERATED_COURSES_STORAGE_KEY = 'learntube_generated_courses_v1';
const INBOX_STORAGE_KEY = 'learntube_inbox_items_v1';

export type CourseProgressMap = Record<string, Record<string, LessonStatus>>;
export type GroupedNotesMap = Record<string, Record<string, TimestampNote[]>>;
export type QuizScoresMap = Record<string, Record<string, number>>;
export type SkippedLessonsMap = Record<string, string[]>;

export function formatTimestampChip(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  if (hrs > 0) {
    const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

export function getAllCourses(generatedCourses: Course[]): Course[] {
  return [...generatedCourses, ...mockCourses];
}

function loadEnrolledSlugs(): string[] {
  try {
    const raw = localStorage.getItem(ENROLLED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveEnrolledSlugs(slugs: string[]): void {
  try {
    localStorage.setItem(ENROLLED_STORAGE_KEY, JSON.stringify(slugs.slice(0, 5)));
  } catch {
    // Ignore storage errors
  }
}

function loadProgressMap(): CourseProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveProgressMap(map: CourseProgressMap): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function loadQuizScoresMap(): QuizScoresMap {
  try {
    const raw = localStorage.getItem(QUIZ_SCORES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveQuizScoresMap(map: QuizScoresMap): void {
  try {
    localStorage.setItem(QUIZ_SCORES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function loadSkippedLessonsMap(): SkippedLessonsMap {
  try {
    const raw = localStorage.getItem(SKIPPED_LESSONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveSkippedLessonsMap(map: SkippedLessonsMap): void {
  try {
    localStorage.setItem(SKIPPED_LESSONS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function loadGeneratedCourses(): Course[] {
  try {
    const raw = localStorage.getItem(GENERATED_COURSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGeneratedCourses(courses: Course[]): void {
  try {
    localStorage.setItem(GENERATED_COURSES_STORAGE_KEY, JSON.stringify(courses));
  } catch {
    // Ignore storage errors
  }
}

function buildDefaultInbox(): InboxItem[] {
  return [
    {
      id: 'inb_welcome_01',
      title: 'Welcome to LearnTube, Alex',
      message:
        'Paste any educational YouTube video link on the dashboard to transform it into a structured daily study plan with notes and quizzes.',
      type: 'welcome',
      isRead: false,
      createdAt: '2026-11-09T09:00:00Z',
    },
  ];
}

function loadInboxItems(): InboxItem[] {
  try {
    const raw = localStorage.getItem(INBOX_STORAGE_KEY);
    if (!raw) {
      const initial = buildDefaultInbox();
      localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : buildDefaultInbox();
  } catch {
    return buildDefaultInbox();
  }
}

function saveInboxItems(items: InboxItem[]): void {
  try {
    localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

function buildInitialNotesMap(): GroupedNotesMap {
  const seeded: GroupedNotesMap = {};
  for (const note of mockNotes) {
    if (!seeded[note.courseId]) seeded[note.courseId] = {};
    if (!seeded[note.courseId][note.lessonId]) {
      seeded[note.courseId][note.lessonId] = [];
    }
    seeded[note.courseId][note.lessonId].push(note);
  }
  return seeded;
}

function loadNotesMap(): GroupedNotesMap {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) {
      const initial = buildInitialNotesMap();
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : buildInitialNotesMap();
  } catch {
    return buildInitialNotesMap();
  }
}

function saveNotesMap(map: GroupedNotesMap): void {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

const activeBackgroundBuilds = new Set<string>();

interface AppState {
  isSidebarCollapsed: boolean;
  isMobileDrawerOpen: boolean;
  isHeroUnlocked: boolean;
  activeDiscoveryTab: DiscoveryTab;
  youtubeUrl: string;
  dailyPace: DailyPace;
  unreadInboxCount: number;
  inboxItems: InboxItem[];
  enrolledSlugs: string[];
  generatedCourses: Course[];
  activeBuildingCourseIds: string[];

  // Course builder status & long-video progress
  dashboardBuildStep: DashboardBuildStep;
  dashboardProgressDetail: string | null;
  dashboardBuildError: string | null;
  toastMessage: string | null;
  focusUrlInputTrigger: number;

  // Player slice
  activeLessonId: string | null;
  playerViewMode: PlayerViewMode;

  // Persisted progress, quiz scores, placement skips & notes
  lessonProgress: CourseProgressMap;
  quizScores: QuizScoresMap;
  skippedLessonsByCourse: SkippedLessonsMap;
  notesByCourse: GroupedNotesMap;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  toggleHeroUnlocked: () => void;
  setHeroUnlocked: (unlocked: boolean) => void;
  setActiveDiscoveryTab: (tab: DiscoveryTab) => void;
  setYoutubeUrl: (url: string) => void;
  setDailyPace: (pace: DailyPace) => void;
  enrollCourse: (slug: string) => void;
  toggleEnrollCourse: (slug: string) => void;

  // Builder & Toast actions
  showToast: (message: string | null) => void;
  clearDashboardBuildError: () => void;
  triggerFocusUrlInput: () => void;
  buildCourseFromVideo: (
    videoInfo: VideoMetadataInfo,
    manualTranscriptSegments?: TranscriptSegment[]
  ) => Promise<{ slug: string; deduplicated: boolean } | null>;
  resumeCourseBuild: (courseId: string) => Promise<void>;
  retryFailedLessons: (courseId: string) => Promise<void>;

  // Inbox actions
  addInboxNotification: (
    item: Omit<InboxItem, 'id' | 'isRead' | 'createdAt'>
  ) => void;
  markInboxItemRead: (id: string) => void;
  markAllInboxRead: () => void;

  // Player slice actions
  setActiveLessonId: (lessonId: string | null) => void;
  setPlayerViewMode: (mode: PlayerViewMode) => void;

  // Progress & Quiz actions
  setLessonStatus: (courseId: string, lessonId: string, status: LessonStatus) => void;
  markLessonInProgressIfTodo: (courseId: string, lessonId: string) => void;
  saveQuizScore: (courseId: string, lessonId: string, scorePercent: number) => void;
  savePlacementResult: (
    courseId: string,
    allLessonIds: string[],
    skippedLessonIds: string[]
  ) => void;

  // Notes actions
  addNote: (
    courseId: string,
    lessonId: string,
    timestampSeconds: number,
    content: string
  ) => TimestampNote;
  deleteNote: (courseId: string, lessonId: string, noteId: string) => void;
}

const initialInbox = loadInboxItems();

export const useAppStore = create<AppState>((set, get) => ({
  isSidebarCollapsed: false,
  isMobileDrawerOpen: false,
  isHeroUnlocked: true,
  activeDiscoveryTab: 'POPULAR COURSES',
  youtubeUrl: '',
  dailyPace: 90,
  inboxItems: initialInbox,
  unreadInboxCount: initialInbox.filter((i) => !i.isRead).length,
  enrolledSlugs: loadEnrolledSlugs(),
  generatedCourses: loadGeneratedCourses(),
  activeBuildingCourseIds: [],

  dashboardBuildStep: 'IDLE',
  dashboardProgressDetail: null,
  dashboardBuildError: null,
  toastMessage: null,
  focusUrlInputTrigger: 0,

  activeLessonId: null,
  playerViewMode: 'video',

  lessonProgress: loadProgressMap(),
  quizScores: loadQuizScoresMap(),
  skippedLessonsByCourse: loadSkippedLessonsMap(),
  notesByCourse: loadNotesMap(),

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setMobileDrawerOpen: (open) => set({ isMobileDrawerOpen: open }),
  toggleHeroUnlocked: () =>
    set((state) => ({ isHeroUnlocked: !state.isHeroUnlocked })),
  setHeroUnlocked: (unlocked) => set({ isHeroUnlocked: unlocked }),
  setActiveDiscoveryTab: (tab) => set({ activeDiscoveryTab: tab }),
  setYoutubeUrl: (url) =>
    set({
      youtubeUrl: url,
      dashboardBuildError: null,
    }),
  setDailyPace: (pace) => set({ dailyPace: pace }),

  enrollCourse: (slug) =>
    set((state) => {
      const filtered = state.enrolledSlugs.filter((item) => item !== slug);
      const next = [slug, ...filtered].slice(0, 5);
      saveEnrolledSlugs(next);
      return { enrolledSlugs: next };
    }),

  toggleEnrollCourse: (slug) =>
    set((state) => {
      const exists = state.enrolledSlugs.includes(slug);
      const next = exists
        ? state.enrolledSlugs.filter((item) => item !== slug)
        : [slug, ...state.enrolledSlugs].slice(0, 5);
      saveEnrolledSlugs(next);
      return { enrolledSlugs: next };
    }),

  showToast: (message) => {
    set({ toastMessage: message });
    if (message) {
      window.setTimeout(() => {
        set((state) =>
          state.toastMessage === message ? { toastMessage: null } : state
        );
      }, 4500);
    }
  },

  clearDashboardBuildError: () => set({ dashboardBuildError: null }),

  triggerFocusUrlInput: () =>
    set((state) => ({
      isHeroUnlocked: true,
      focusUrlInputTrigger: state.focusUrlInputTrigger + 1,
    })),

  addInboxNotification: (item) =>
    set((state) => {
      const newItem: InboxItem = {
        ...item,
        id: `inb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      const next = [newItem, ...state.inboxItems];
      saveInboxItems(next);
      return {
        inboxItems: next,
        unreadInboxCount: next.filter((i) => !i.isRead).length,
      };
    }),

  markInboxItemRead: (id) =>
    set((state) => {
      const next = state.inboxItems.map((item) =>
        item.id === id ? { ...item, isRead: true } : item
      );
      saveInboxItems(next);
      return {
        inboxItems: next,
        unreadInboxCount: next.filter((i) => !i.isRead).length,
      };
    }),

  markAllInboxRead: () =>
    set((state) => {
      const next = state.inboxItems.map((item) => ({ ...item, isRead: true }));
      saveInboxItems(next);
      return {
        inboxItems: next,
        unreadInboxCount: 0,
      };
    }),

  buildCourseFromVideo: async (videoInfo, manualTranscriptSegments) => {
    const state = get();
    const allCourses = getAllCourses(state.generatedCourses);

    // DEDUPLICATION: check saved courses for the same youtubeSourceId with status COMPLETED
    const existingCompleted = allCourses.find(
      (c) =>
        (c.youtubeSourceId === videoInfo.videoId ||
          c.youtubeVideoId === videoInfo.videoId) &&
        (!c.isUserGenerated || c.buildStatus === 'COMPLETED')
    );

    if (existingCompleted) {
      state.showToast('This course already exists. Opening it for you.');
      return { slug: existingCompleted.slug, deduplicated: true };
    }

    // OPTIONAL MANUAL TRANSCRIPT PIPELINE (only when user explicitly pastes/uploads a transcript)
    if (manualTranscriptSegments && manualTranscriptSegments.length > 0) {
      set({
        dashboardBuildStep: 'READING_VIDEO',
        dashboardProgressDetail: 'Reading pasted transcript...',
        dashboardBuildError: null,
      });

      try {
        const windows = chunkTranscript(manualTranscriptSegments, 1800);
        if (windows.length === 0) {
          throw new CourseBuilderError(
            'INVALID_JSON',
            'Timestamps are needed so lessons can link to the video.'
          );
        }

        set({
          dashboardBuildStep: 'PLANNING_LESSONS',
          dashboardProgressDetail: `Planning lessons: window 1 of ${windows.length}`,
        });

        const window0Outline = await generateWindowOutline(
          {
            title: videoInfo.title,
            channelName: videoInfo.channelName,
            durationSeconds: videoInfo.durationSeconds,
          },
          windows[0],
          windows.length
        );

        const approxTotal = Math.max(
          window0Outline.lessons.length,
          window0Outline.lessons.length * windows.length
        );

        set({
          dashboardBuildStep: 'WRITING_LESSON_1',
          dashboardProgressDetail: `Writing lessons: 1 of ${
            windows.length > 1 ? `about ${approxTotal}` : approxTotal
          }`,
        });

        const firstOutlineItem = window0Outline.lessons[0];
        const tempLesson1 = {
          id: 'les_1_temp',
          sequenceNumber: 1,
          title: firstOutlineItem.title,
          summaryDescription: firstOutlineItem.summaryDescription,
          durationSeconds: Math.max(
            180,
            Math.min(
              1200,
              firstOutlineItem.endSeconds - firstOutlineItem.startSeconds
            )
          ),
          youtubeVideoId: videoInfo.videoId,
          startSeconds: 0,
          endSeconds: firstOutlineItem.endSeconds,
          conceptTag: firstOutlineItem.conceptTag,
          articleMarkdown: '',
          quizQuestions: [],
        };

        const lesson1Content = await generateTranscriptLessonContent(
          videoInfo.title,
          tempLesson1,
          manualTranscriptSegments
        );

        const newCourse = createInitialLongCourseShell(
          videoInfo,
          window0Outline,
          lesson1Content,
          manualTranscriptSegments,
          windows.length
        );

        if (newCourse.lessons[0]) {
          const finalLesson1Id = newCourse.lessons[0].id;
          newCourse.lessons[0].quizQuestions =
            newCourse.lessons[0].quizQuestions.map((q, idx) => ({
              ...q,
              id: `${finalLesson1Id}_q${idx + 1}`,
              lessonId: finalLesson1Id,
            }));
        }

        set((curr) => {
          const updated = [
            newCourse,
            ...curr.generatedCourses.filter((c) => c.id !== newCourse.id),
          ];
          saveGeneratedCourses(updated);
          return {
            generatedCourses: updated,
            dashboardBuildStep: 'IDLE',
            dashboardProgressDetail: null,
            youtubeUrl: '',
          };
        });

        get().enrollCourse(newCourse.slug);

        if (newCourse.buildStatus === 'COMPLETED') {
          get().addInboxNotification({
            title: 'Your course is ready',
            message: `"${newCourse.title}" has finished building and is ready to study.`,
            courseId: newCourse.id,
            courseSlug: newCourse.slug,
            type: 'course_ready',
          });
        } else {
          void get().resumeCourseBuild(newCourse.id);
        }

        return { slug: newCourse.slug, deduplicated: false };
      } catch (err) {
        const friendlyMessage =
          err instanceof CourseBuilderError
            ? err.message
            : 'An unexpected error occurred while building from your transcript. Please try again.';
        set({
          dashboardBuildStep: 'IDLE',
          dashboardProgressDetail: null,
          dashboardBuildError: friendlyMessage,
        });
        return null;
      }
    }

    // ROUTING RULE:
    // Videos <= 60 minutes (SHORT_VIDEO_LIMIT_SECONDS = 3600) use the short video pipeline
    // Videos > 60 minutes use the 20-minute slice pipeline
    const isShortVideo = videoInfo.durationSeconds <= SHORT_VIDEO_LIMIT_SECONDS;

    if (isShortVideo) {
      set({
        dashboardBuildStep: 'READING_VIDEO',
        dashboardProgressDetail: 'Reading the video...',
        dashboardBuildError: null,
      });

      try {
        await new Promise((r) => window.setTimeout(r, 350));
        set({
          dashboardBuildStep: 'PLANNING_LESSONS',
          dashboardProgressDetail: 'Planning lessons...',
        });

        const outline = await generateCourseOutline(videoInfo);
        let newCourse = createInitialCourseShell(videoInfo, outline);

        set((curr) => {
          const updated = [
            newCourse,
            ...curr.generatedCourses.filter((c) => c.id !== newCourse.id),
          ];
          saveGeneratedCourses(updated);
          return {
            generatedCourses: updated,
            dashboardBuildStep: 'WRITING_LESSON_1',
            dashboardProgressDetail: `Writing lessons: 1 of ${newCourse.lessons.length}`,
          };
        });

        const lesson1 = newCourse.lessons[0];
        const lesson1Content = await generateSingleLessonContent(
          newCourse.youtubeUrl,
          newCourse.title,
          lesson1
        );

        const updatedLessons = newCourse.lessons.map((l, idx) =>
          idx === 0
            ? {
                ...l,
                articleMarkdown: lesson1Content.articleMarkdown,
                quizQuestions: lesson1Content.quizQuestions,
                isGeneratedReady: true,
                hasBuildFailed: false,
              }
            : l
        );

        const isSingleLessonCourse = updatedLessons.length === 1;
        newCourse = {
          ...newCourse,
          pipelineType: 'SHORT_VIDEO',
          lessons: updatedLessons,
          buildStatus: isSingleLessonCourse ? 'COMPLETED' : 'LESSON_1_READY',
          completedLessonsCheckpoint: 1,
          currentlyBuildingLessonNumber: isSingleLessonCourse ? undefined : 2,
        };

        set((curr) => {
          const updated = [
            newCourse,
            ...curr.generatedCourses.filter((c) => c.id !== newCourse.id),
          ];
          saveGeneratedCourses(updated);
          return {
            generatedCourses: updated,
            dashboardBuildStep: 'IDLE',
            dashboardProgressDetail: null,
            youtubeUrl: '',
          };
        });

        get().enrollCourse(newCourse.slug);

        if (isSingleLessonCourse) {
          get().addInboxNotification({
            title: 'Your course is ready',
            message: `"${newCourse.title}" has finished building and is ready to study.`,
            courseId: newCourse.id,
            courseSlug: newCourse.slug,
            type: 'course_ready',
          });
        } else {
          void get().resumeCourseBuild(newCourse.id);
        }

        return { slug: newCourse.slug, deduplicated: false };
      } catch (err) {
        const friendlyMessage =
          err instanceof CourseBuilderError
            ? err.message
            : 'An unexpected error occurred while building your course. Please try again.';
        set({
          dashboardBuildStep: 'IDLE',
          dashboardProgressDetail: null,
          dashboardBuildError: friendlyMessage,
        });
        return null;
      }
    }

    // LONG-VIDEO 20-MINUTE SLICE PIPELINE (> 60 minutes)
    const slices = makeSlices(videoInfo.durationSeconds, SLICE_DURATION_SECONDS);
    const totalSlices = Math.max(1, slices.length);

    set({
      dashboardBuildStep: 'PLANNING_LESSONS',
      dashboardProgressDetail: `Watching part 1 of ${totalSlices}`,
      dashboardBuildError: null,
    });

    try {
      // LESSON 1 FAST TRACK: run Step A on slice 1 only, then Step B for Lesson 1
      const slice0Outline = await generateSliceOutline(
        videoInfo,
        slices[0],
        totalSlices
      );

      const approxTotal =
        totalSlices === 1
          ? slice0Outline.lessons.length
          : Math.max(2, slice0Outline.lessons.length) * totalSlices;

      set({
        dashboardBuildStep: 'WRITING_LESSON_1',
        dashboardProgressDetail: `Writing lessons: 1 of ${
          totalSlices > 1 ? `about ${approxTotal}` : approxTotal
        }`,
      });

      const firstOutlineItem = slice0Outline.lessons[0];
      const tempLesson1 = {
        id: 'les_1_temp',
        sequenceNumber: 1,
        title: firstOutlineItem.title,
        summaryDescription: firstOutlineItem.summaryDescription,
        durationSeconds: Math.max(
          180,
          Math.min(
            1200,
            firstOutlineItem.endSeconds - firstOutlineItem.startSeconds
          )
        ),
        youtubeVideoId: videoInfo.videoId,
        startSeconds: 0,
        endSeconds: firstOutlineItem.endSeconds,
        conceptTag: firstOutlineItem.conceptTag,
        articleMarkdown: '',
        quizQuestions: [],
      };

      const youtubeUrl = getCanonicalYouTubeWatchUrl(videoInfo.videoId);
      const lesson1Content = await generateSliceLessonContent(
        youtubeUrl,
        videoInfo.title,
        tempLesson1
      );

      const newCourse = createInitialSliceCourseShell(
        videoInfo,
        slice0Outline,
        lesson1Content,
        slices
      );

      set((curr) => {
        const updated = [
          newCourse,
          ...curr.generatedCourses.filter((c) => c.id !== newCourse.id),
        ];
        saveGeneratedCourses(updated);
        return {
          generatedCourses: updated,
          dashboardBuildStep: 'IDLE',
          dashboardProgressDetail: null,
          youtubeUrl: '',
        };
      });

      get().enrollCourse(newCourse.slug);

      if (newCourse.buildStatus === 'COMPLETED') {
        get().addInboxNotification({
          title: 'Your course is ready',
          message: `"${newCourse.title}" has finished building and is ready to study.`,
          courseId: newCourse.id,
          courseSlug: newCourse.slug,
          type: 'course_ready',
        });
      } else {
        // Continue remaining slices (1 at a time) and remaining lessons (2 at a time) in the background
        void get().resumeCourseBuild(newCourse.id);
      }

      return { slug: newCourse.slug, deduplicated: false };
    } catch (err) {
      const friendlyMessage =
        err instanceof CourseBuilderError
          ? err.message
          : 'An unexpected error occurred while building this long course. Please try again.';

      set({
        dashboardBuildStep: 'IDLE',
        dashboardProgressDetail: null,
        dashboardBuildError: friendlyMessage,
      });
      return null;
    }
  },

  resumeCourseBuild: async (courseId) => {
    if (activeBackgroundBuilds.has(courseId)) return;
    activeBackgroundBuilds.add(courseId);
    set((curr) => ({
      activeBuildingCourseIds: Array.from(activeBackgroundBuilds),
    }));

    try {
      const initialCourse = get().generatedCourses.find(
        (c) => c.id === courseId
      );
      if (!initialCourse) return;

      // Branch 1: LONG_SLICE pipeline — Step A for remaining slices (1 at a time) -> Merge -> Step B for remaining lessons (2 at a time)
      if (initialCourse.pipelineType === 'LONG_SLICE') {
        const videoDurationSeconds =
          initialCourse.totalDurationMinutes * 60 || 3600;
        const slices = makeSlices(videoDurationSeconds, SLICE_DURATION_SECONDS);
        const totalSlices = Math.max(1, slices.length);

        const savedSliceMap: Record<number, WindowOutlineLesson[]> = {
          ...(initialCourse.sliceLessonsCheckpoint || {}),
        };

        const pendingSlices = slices.filter(
          (s) => !savedSliceMap[s.sliceIndex]
        );

        set((curr) => {
          const updated = curr.generatedCourses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  buildStatus:
                    pendingSlices.length > 0
                      ? ('PLANNING' as const)
                      : ('GENERATING_REMAINING' as const),
                  isDailyLimitPaused: false,
                  buildErrorMessage: undefined,
                }
              : c
          );
          saveGeneratedCourses(updated);
          return { generatedCourses: updated };
        });

        // STEP A for remaining slices (1 at a time)
        if (pendingSlices.length > 0) {
          try {
            await runSliceQueue(pendingSlices, 1, async (sliceItem) => {
              const outlineResp = await generateSliceOutline(
                {
                  videoId: initialCourse.youtubeVideoId,
                  title: initialCourse.title,
                  channelName: initialCourse.channelName,
                  durationSeconds: videoDurationSeconds,
                },
                sliceItem,
                totalSlices
              );

              savedSliceMap[sliceItem.sliceIndex] = outlineResp.lessons;
              const completedSliceCount = Object.keys(savedSliceMap).length;

              // Save checkpoint after every slice
              set((curr) => {
                const updated = curr.generatedCourses.map((c) => {
                  if (c.id !== courseId) return c;
                  return {
                    ...c,
                    completedVideoSlices: completedSliceCount,
                    sliceLessonsCheckpoint: { ...savedSliceMap },
                    estimatedSecondsRemaining: Math.max(
                      15,
                      (totalSlices - completedSliceCount) *
                        ESTIMATED_SECONDS_PER_SLICE +
                        c.lessonCount * 6
                    ),
                  };
                });
                saveGeneratedCourses(updated);
                return { generatedCourses: updated };
              });
            });
          } catch (sliceErr) {
            const isDailyLimit =
              sliceErr instanceof CourseBuilderError &&
              sliceErr.errorType === 'DAILY_VIDEO_LIMIT';
            const errMessage = isDailyLimit
              ? DAILY_VIDEO_LIMIT_MESSAGE
              : sliceErr instanceof CourseBuilderError
              ? sliceErr.message
              : 'Course build paused while watching video slices. Your progress is saved.';

            set((curr) => {
              const updated = curr.generatedCourses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      buildStatus: 'FAILED' as const,
                      isDailyLimitPaused: isDailyLimit,
                      buildErrorMessage: errMessage,
                    }
                  : c
              );
              saveGeneratedCourses(updated);
              return { generatedCourses: updated };
            });

            get().addInboxNotification({
              title: isDailyLimit
                ? 'Daily video limit reached — progress saved'
                : 'Your course build paused. Tap to resume',
              message: errMessage,
              courseId,
              courseSlug: initialCourse.slug,
              type: 'course_failed',
            });
            return;
          }
        }

        // MERGE: after all slices finish, join lessons in order, fix overlaps/gaps, set final lesson count
        const currentCourseState = get().generatedCourses.find(
          (c) => c.id === courseId
        );
        if (!currentCourseState) return;

        let lessonsToBuild = currentCourseState.lessons;
        if (
          currentCourseState.isLessonCountApproximate ||
          pendingSlices.length > 0
        ) {
          lessonsToBuild = mergeSliceLessons(
            savedSliceMap,
            totalSlices,
            videoDurationSeconds,
            courseId,
            initialCourse.youtubeVideoId,
            currentCourseState.lessons
          );

          const totalMergedSeconds = lessonsToBuild.reduce(
            (acc, l) => acc + l.durationSeconds,
            0
          );

          set((curr) => {
            const updated = curr.generatedCourses.map((c) =>
              c.id === courseId
                ? {
                    ...c,
                    lessons: lessonsToBuild,
                    lessonCount: lessonsToBuild.length,
                    totalDuration: formatDuration(totalMergedSeconds),
                    totalDurationMinutes: Math.max(
                      1,
                      Math.round(totalMergedSeconds / 60)
                    ),
                    isLessonCountApproximate: false,
                    completedVideoSlices: totalSlices,
                    buildStatus: 'GENERATING_REMAINING' as const,
                  }
                : c
            );
            saveGeneratedCourses(updated);
            return { generatedCourses: updated };
          });
        }

        // STEP B for remaining lessons (2 at a time)
        const latestCourseBeforeStepB = get().generatedCourses.find(
          (c) => c.id === courseId
        );
        if (!latestCourseBeforeStepB) return;

        const remainingLessons = latestCourseBeforeStepB.lessons.filter(
          (l) => !l.isGeneratedReady
        );

        try {
          await runSliceQueue(remainingLessons, 2, async (targetLesson) => {
            set((curr) => {
              const updated = curr.generatedCourses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      buildStatus: 'GENERATING_REMAINING' as const,
                      currentlyBuildingLessonNumber:
                        targetLesson.sequenceNumber,
                    }
                  : c
              );
              saveGeneratedCourses(updated);
              return { generatedCourses: updated };
            });

            try {
              const generated = await generateSliceLessonContent(
                latestCourseBeforeStepB.youtubeUrl,
                latestCourseBeforeStepB.title,
                targetLesson
              );

              // Save checkpoint after every completed lesson
              set((curr) => {
                const updated = curr.generatedCourses.map((c) => {
                  if (c.id !== courseId) return c;
                  const nextLessons = c.lessons.map((l) =>
                    l.id === targetLesson.id
                      ? {
                          ...l,
                          articleMarkdown: generated.articleMarkdown,
                          quizQuestions: generated.quizQuestions,
                          isGeneratedReady: true,
                          hasBuildFailed: false,
                        }
                      : l
                  );
                  const readyCount = nextLessons.filter(
                    (l) => l.isGeneratedReady
                  ).length;
                  const remainingCount = Math.max(
                    0,
                    nextLessons.length - readyCount
                  );
                  return {
                    ...c,
                    lessons: nextLessons,
                    completedLessonsCheckpoint: readyCount,
                    estimatedSecondsRemaining: Math.max(0, remainingCount * 8),
                  };
                });
                saveGeneratedCourses(updated);
                return { generatedCourses: updated };
              });
            } catch (lessonErr) {
              // If Gemini daily video limit was reached, rethrow to halt queue and save progress
              if (
                lessonErr instanceof CourseBuilderError &&
                lessonErr.errorType === 'DAILY_VIDEO_LIMIT'
              ) {
                throw lessonErr;
              }

              // Otherwise mark this lesson as failed and continue queue
              set((curr) => {
                const updated = curr.generatedCourses.map((c) => {
                  if (c.id !== courseId) return c;
                  const nextLessons = c.lessons.map((l) =>
                    l.id === targetLesson.id
                      ? {
                          ...l,
                          hasBuildFailed: true,
                          isGeneratedReady: false,
                        }
                      : l
                  );
                  return {
                    ...c,
                    lessons: nextLessons,
                  };
                });
                saveGeneratedCourses(updated);
                return { generatedCourses: updated };
              });
            }
          });
        } catch (queueErr) {
          if (
            queueErr instanceof CourseBuilderError &&
            queueErr.errorType === 'DAILY_VIDEO_LIMIT'
          ) {
            set((curr) => {
              const updated = curr.generatedCourses.map((c) =>
                c.id === courseId
                  ? {
                      ...c,
                      buildStatus: 'FAILED' as const,
                      isDailyLimitPaused: true,
                      buildErrorMessage: DAILY_VIDEO_LIMIT_MESSAGE,
                      estimatedSecondsRemaining: 0,
                    }
                  : c
              );
              saveGeneratedCourses(updated);
              return { generatedCourses: updated };
            });

            get().addInboxNotification({
              title: 'Daily video limit reached — progress saved',
              message: DAILY_VIDEO_LIMIT_MESSAGE,
              courseId,
              courseSlug: latestCourseBeforeStepB.slug,
              type: 'course_failed',
            });
            return;
          }
        }

        const afterQueueCourse = get().generatedCourses.find(
          (c) => c.id === courseId
        );
        if (!afterQueueCourse) return;

        const failedLessons = afterQueueCourse.lessons.filter(
          (l) => l.hasBuildFailed
        );

        if (failedLessons.length > 0) {
          const failMsg = `${failedLessons.length} ${
            failedLessons.length === 1 ? 'lesson' : 'lessons'
          } couldn't be generated due to rate limits or network errors. Click "Retry failed lessons" to rebuild only the failed lessons.`;

          set((curr) => {
            const updated = curr.generatedCourses.map((c) =>
              c.id === courseId
                ? {
                    ...c,
                    buildStatus: 'FAILED' as const,
                    isDailyLimitPaused: false,
                    buildErrorMessage: failMsg,
                    estimatedSecondsRemaining: 0,
                  }
                : c
            );
            saveGeneratedCourses(updated);
            return { generatedCourses: updated };
          });

          get().addInboxNotification({
            title: 'Your course build failed. Tap to retry',
            message: `"${afterQueueCourse.title}" had ${failedLessons.length} failed lesson(s). Tap to retry only the failed lessons.`,
            courseId,
            courseSlug: afterQueueCourse.slug,
            type: 'course_failed',
          });
          return;
        }

        set((curr) => {
          const updated = curr.generatedCourses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  buildStatus: 'COMPLETED' as const,
                  isDailyLimitPaused: false,
                  completedLessonsCheckpoint: c.lessons.length,
                  currentlyBuildingLessonNumber: undefined,
                  buildErrorMessage: undefined,
                  estimatedSecondsRemaining: 0,
                }
              : c
          );
          saveGeneratedCourses(updated);
          return { generatedCourses: updated };
        });

        get().addInboxNotification({
          title: 'Your course is ready',
          message: `All ${afterQueueCourse.lessons.length} lessons of "${afterQueueCourse.title}" are now ready.`,
          courseId: afterQueueCourse.id,
          courseSlug: afterQueueCourse.slug,
          type: 'course_ready',
        });
        return;
      }

      // Branch 2: Optional LONG_TRANSCRIPT pipeline (if user pasted transcript manually)
      if (initialCourse.pipelineType === 'LONG_TRANSCRIPT') {
        const segments = initialCourse.transcriptSegmentsCheckpoint || [];
        if (segments.length === 0) return;

        const windows = chunkTranscript(segments, 1800);
        const totalWindows = windows.length;
        const videoDurationSeconds =
          initialCourse.totalDurationMinutes * 60 || 3600;

        const savedWindowMap: Record<number, WindowOutlineLesson[]> = {
          ...(initialCourse.windowLessonsCheckpoint || {}),
        };

        const pendingWindows = windows.filter(
          (w) => !savedWindowMap[w.windowIndex]
        );

        set((curr) => {
          const updated = curr.generatedCourses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  buildStatus:
                    pendingWindows.length > 0
                      ? ('PLANNING' as const)
                      : ('GENERATING_REMAINING' as const),
                  buildErrorMessage: undefined,
                }
              : c
          );
          saveGeneratedCourses(updated);
          return { generatedCourses: updated };
        });

        if (pendingWindows.length > 0) {
          await runWithConcurrency(pendingWindows, 2, async (windowItem) => {
            const outlineResp = await generateWindowOutline(
              {
                title: initialCourse.title,
                channelName: initialCourse.channelName,
                durationSeconds: videoDurationSeconds,
              },
              windowItem,
              totalWindows
            );

            savedWindowMap[windowItem.windowIndex] = outlineResp.lessons;
            const completedWinCount = Object.keys(savedWindowMap).length;

            set((curr) => {
              const updated = curr.generatedCourses.map((c) => {
                if (c.id !== courseId) return c;
                return {
                  ...c,
                  completedTranscriptWindows: completedWinCount,
                  windowLessonsCheckpoint: { ...savedWindowMap },
                  estimatedSecondsRemaining: Math.max(
                    10,
                    (totalWindows - completedWinCount) * 7 + c.lessonCount * 3
                  ),
                };
              });
              saveGeneratedCourses(updated);
              return { generatedCourses: updated };
            });
          });
        }

        const currentCourseState = get().generatedCourses.find(
          (c) => c.id === courseId
        );
        if (!currentCourseState) return;

        let lessonsToBuild = currentCourseState.lessons;
        if (
          currentCourseState.isLessonCountApproximate ||
          pendingWindows.length > 0
        ) {
          lessonsToBuild = mergeWindowLessons(
            savedWindowMap,
            totalWindows,
            videoDurationSeconds,
            courseId,
            initialCourse.youtubeVideoId,
            currentCourseState.lessons
          );

          const totalMergedSeconds = lessonsToBuild.reduce(
            (acc, l) => acc + l.durationSeconds,
            0
          );

          set((curr) => {
            const updated = curr.generatedCourses.map((c) =>
              c.id === courseId
                ? {
                    ...c,
                    lessons: lessonsToBuild,
                    lessonCount: lessonsToBuild.length,
                    totalDuration: formatDuration(totalMergedSeconds),
                    totalDurationMinutes: Math.max(
                      1,
                      Math.round(totalMergedSeconds / 60)
                    ),
                    isLessonCountApproximate: false,
                    completedTranscriptWindows: totalWindows,
                    buildStatus: 'GENERATING_REMAINING' as const,
                  }
                : c
            );
            saveGeneratedCourses(updated);
            return { generatedCourses: updated };
          });
        }

        const latestCourseBeforeStepB = get().generatedCourses.find(
          (c) => c.id === courseId
        );
        if (!latestCourseBeforeStepB) return;

        const remainingLessons = latestCourseBeforeStepB.lessons.filter(
          (l) => !l.isGeneratedReady
        );

        await runWithConcurrency(remainingLessons, 3, async (targetLesson) => {
          set((curr) => {
            const updated = curr.generatedCourses.map((c) =>
              c.id === courseId
                ? {
                    ...c,
                    buildStatus: 'GENERATING_REMAINING' as const,
                    currentlyBuildingLessonNumber: targetLesson.sequenceNumber,
                  }
                : c
            );
            saveGeneratedCourses(updated);
            return { generatedCourses: updated };
          });

          try {
            const generated = await generateTranscriptLessonContent(
              latestCourseBeforeStepB.title,
              targetLesson,
              segments
            );

            set((curr) => {
              const updated = curr.generatedCourses.map((c) => {
                if (c.id !== courseId) return c;
                const nextLessons = c.lessons.map((l) =>
                  l.id === targetLesson.id
                    ? {
                        ...l,
                        articleMarkdown: generated.articleMarkdown,
                        quizQuestions: generated.quizQuestions,
                        isGeneratedReady: true,
                        hasBuildFailed: false,
                      }
                    : l
                );
                const readyCount = nextLessons.filter(
                  (l) => l.isGeneratedReady
                ).length;
                const remainingCount = Math.max(
                  0,
                  nextLessons.length - readyCount
                );
                return {
                  ...c,
                  lessons: nextLessons,
                  completedLessonsCheckpoint: readyCount,
                  estimatedSecondsRemaining: Math.max(0, remainingCount * 4),
                };
              });
              saveGeneratedCourses(updated);
              return { generatedCourses: updated };
            });
          } catch {
            set((curr) => {
              const updated = curr.generatedCourses.map((c) => {
                if (c.id !== courseId) return c;
                const nextLessons = c.lessons.map((l) =>
                  l.id === targetLesson.id
                    ? {
                        ...l,
                        hasBuildFailed: true,
                        isGeneratedReady: false,
                      }
                    : l
                );
                return {
                  ...c,
                  lessons: nextLessons,
                };
              });
              saveGeneratedCourses(updated);
              return { generatedCourses: updated };
            });
          }
        });

        const afterQueueCourse = get().generatedCourses.find(
          (c) => c.id === courseId
        );
        if (!afterQueueCourse) return;

        const failedLessons = afterQueueCourse.lessons.filter(
          (l) => l.hasBuildFailed
        );

        if (failedLessons.length > 0) {
          const failMsg = `${failedLessons.length} ${
            failedLessons.length === 1 ? 'lesson' : 'lessons'
          } couldn't be generated due to rate limits or network errors. Click "Retry failed lessons" to rebuild only the failed lessons.`;

          set((curr) => {
            const updated = curr.generatedCourses.map((c) =>
              c.id === courseId
                ? {
                    ...c,
                    buildStatus: 'FAILED' as const,
                    buildErrorMessage: failMsg,
                    estimatedSecondsRemaining: 0,
                  }
                : c
            );
            saveGeneratedCourses(updated);
            return { generatedCourses: updated };
          });

          get().addInboxNotification({
            title: 'Your course build failed. Tap to retry',
            message: `"${afterQueueCourse.title}" had ${failedLessons.length} failed lesson(s). Tap to retry only the failed lessons.`,
            courseId,
            courseSlug: afterQueueCourse.slug,
            type: 'course_failed',
          });
          return;
        }

        set((curr) => {
          const updated = curr.generatedCourses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  buildStatus: 'COMPLETED' as const,
                  completedLessonsCheckpoint: c.lessons.length,
                  currentlyBuildingLessonNumber: undefined,
                  buildErrorMessage: undefined,
                  estimatedSecondsRemaining: 0,
                }
              : c
          );
          saveGeneratedCourses(updated);
          return { generatedCourses: updated };
        });

        get().addInboxNotification({
          title: 'Your course is ready',
          message: `All ${afterQueueCourse.lessons.length} lessons of "${afterQueueCourse.title}" are now ready.`,
          courseId: afterQueueCourse.id,
          courseSlug: afterQueueCourse.slug,
          type: 'course_ready',
        });
        return;
      }

      // Branch 2: Existing SHORT_VIDEO pipeline (<= 60 minutes)
      const startIndex = Math.max(
        0,
        initialCourse.completedLessonsCheckpoint || 0
      );

      set((curr) => {
        const updated = curr.generatedCourses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                buildStatus: 'GENERATING_REMAINING' as const,
                buildErrorMessage: undefined,
                currentlyBuildingLessonNumber: startIndex + 1,
              }
            : c
        );
        saveGeneratedCourses(updated);
        return { generatedCourses: updated };
      });

      for (let i = startIndex; i < initialCourse.lessons.length; i++) {
        const latestCourse = get().generatedCourses.find(
          (c) => c.id === courseId
        );
        if (!latestCourse) break;

        const targetLesson = latestCourse.lessons[i];
        if (!targetLesson || targetLesson.isGeneratedReady) continue;

        set((curr) => {
          const updated = curr.generatedCourses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  buildStatus: 'GENERATING_REMAINING' as const,
                  currentlyBuildingLessonNumber: i + 1,
                }
              : c
          );
          saveGeneratedCourses(updated);
          return { generatedCourses: updated };
        });

        try {
          const generated = await generateSingleLessonContent(
            latestCourse.youtubeUrl,
            latestCourse.title,
            targetLesson
          );

          set((curr) => {
            const updated = curr.generatedCourses.map((c) => {
              if (c.id !== courseId) return c;
              const nextLessons = c.lessons.map((l, idx) =>
                idx === i
                  ? {
                      ...l,
                      articleMarkdown: generated.articleMarkdown,
                      quizQuestions: generated.quizQuestions,
                      isGeneratedReady: true,
                      hasBuildFailed: false,
                    }
                  : l
              );
              return {
                ...c,
                lessons: nextLessons,
                completedLessonsCheckpoint: i + 1,
              };
            });
            saveGeneratedCourses(updated);
            return { generatedCourses: updated };
          });
        } catch (lessonErr) {
          const errMessage =
            lessonErr instanceof CourseBuilderError
              ? lessonErr.message
              : `Failed while generating Lesson ${i + 1}.`;

          set((curr) => {
            const updated = curr.generatedCourses.map((c) => {
              if (c.id !== courseId) return c;
              const nextLessons = c.lessons.map((l, idx) =>
                idx === i ? { ...l, hasBuildFailed: true } : l
              );
              return {
                ...c,
                lessons: nextLessons,
                buildStatus: 'FAILED' as const,
                buildErrorMessage: errMessage,
              };
            });
            saveGeneratedCourses(updated);
            return { generatedCourses: updated };
          });

          const failedCourse = get().generatedCourses.find(
            (c) => c.id === courseId
          );
          get().addInboxNotification({
            title: 'Your course build failed. Tap to retry',
            message:
              failedCourse
                ? `"${failedCourse.title}" paused at Lesson ${i + 1}. Tap to resume from your saved checkpoint.`
                : errMessage,
            courseId,
            courseSlug: failedCourse?.slug,
            type: 'course_failed',
          });
          return;
        }
      }

      set((curr) => {
        const updated = curr.generatedCourses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                buildStatus: 'COMPLETED' as const,
                completedLessonsCheckpoint: c.lessons.length,
                currentlyBuildingLessonNumber: undefined,
                buildErrorMessage: undefined,
              }
            : c
        );
        saveGeneratedCourses(updated);
        return { generatedCourses: updated };
      });

      const finishedCourse = get().generatedCourses.find(
        (c) => c.id === courseId
      );
      if (finishedCourse) {
        get().addInboxNotification({
          title: 'Your course is ready',
          message: `All ${finishedCourse.lessons.length} lessons of "${finishedCourse.title}" are now ready.`,
          courseId: finishedCourse.id,
          courseSlug: finishedCourse.slug,
          type: 'course_ready',
        });
      }
    } finally {
      activeBackgroundBuilds.delete(courseId);
      set({
        activeBuildingCourseIds: Array.from(activeBackgroundBuilds),
      });
    }
  },

  retryFailedLessons: async (courseId) => {
    const course = get().generatedCourses.find((c) => c.id === courseId);
    if (!course) return;

    // Clear hasBuildFailed flags on failed lessons and delegate to resumeCourseBuild
    // which skips all lessons that already have isGeneratedReady === true
    set((curr) => {
      const updated = curr.generatedCourses.map((c) =>
        c.id === courseId
          ? {
              ...c,
              buildStatus: 'GENERATING_REMAINING' as const,
              buildErrorMessage: undefined,
              lessons: c.lessons.map((l) =>
                l.hasBuildFailed ? { ...l, hasBuildFailed: false } : l
              ),
            }
          : c
      );
      saveGeneratedCourses(updated);
      return { generatedCourses: updated };
    });

    await get().resumeCourseBuild(courseId);
  },

  setActiveLessonId: (lessonId) => set({ activeLessonId: lessonId }),
  setPlayerViewMode: (mode) => set({ playerViewMode: mode }),

  setLessonStatus: (courseId, lessonId, status) =>
    set((state) => {
      const courseMap = { ...(state.lessonProgress[courseId] || {}) };
      courseMap[lessonId] = status;
      const next: CourseProgressMap = {
        ...state.lessonProgress,
        [courseId]: courseMap,
      };
      saveProgressMap(next);
      return { lessonProgress: next };
    }),

  markLessonInProgressIfTodo: (courseId, lessonId) =>
    set((state) => {
      const currentStatus = state.lessonProgress[courseId]?.[lessonId] || 'TODO';
      if (currentStatus !== 'TODO') {
        return state;
      }
      const courseMap = { ...(state.lessonProgress[courseId] || {}) };
      courseMap[lessonId] = 'IN_PROGRESS';
      const next: CourseProgressMap = {
        ...state.lessonProgress,
        [courseId]: courseMap,
      };
      saveProgressMap(next);
      return { lessonProgress: next };
    }),

  saveQuizScore: (courseId, lessonId, scorePercent) =>
    set((state) => {
      const rounded = Math.round(scorePercent);
      const courseScores = { ...(state.quizScores[courseId] || {}) };
      const prevBest = courseScores[lessonId] ?? -1;
      courseScores[lessonId] = Math.max(prevBest, rounded);

      const nextQuizScores: QuizScoresMap = {
        ...state.quizScores,
        [courseId]: courseScores,
      };
      saveQuizScoresMap(nextQuizScores);

      let nextProgress = state.lessonProgress;
      if (rounded >= 50) {
        const courseMap = { ...(state.lessonProgress[courseId] || {}) };
        courseMap[lessonId] = 'COMPLETED';
        nextProgress = {
          ...state.lessonProgress,
          [courseId]: courseMap,
        };
        saveProgressMap(nextProgress);
      }

      return {
        quizScores: nextQuizScores,
        lessonProgress: nextProgress,
      };
    }),

  savePlacementResult: (courseId, allLessonIds, skippedLessonIds) =>
    set((state) => {
      const skippedSet = new Set(skippedLessonIds);
      const nextSkipped: SkippedLessonsMap = {
        ...state.skippedLessonsByCourse,
        [courseId]: skippedLessonIds,
      };
      saveSkippedLessonsMap(nextSkipped);

      const courseMap = { ...(state.lessonProgress[courseId] || {}) };
      for (const id of allLessonIds) {
        if (skippedSet.has(id)) {
          courseMap[id] = 'SKIPPED_BY_PLACEMENT';
        } else if (courseMap[id] === 'SKIPPED_BY_PLACEMENT') {
          courseMap[id] = 'TODO';
        }
      }

      const nextProgress: CourseProgressMap = {
        ...state.lessonProgress,
        [courseId]: courseMap,
      };
      saveProgressMap(nextProgress);

      return {
        skippedLessonsByCourse: nextSkipped,
        lessonProgress: nextProgress,
      };
    }),

  addNote: (courseId, lessonId, timestampSeconds, content) => {
    const now = new Date().toISOString();
    const safeTimestamp = Math.max(0, Math.floor(timestampSeconds));
    const newNote: TimestampNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: 'usr_alex_01',
      courseId,
      lessonId,
      timestampSeconds: safeTimestamp,
      formattedTimestamp: formatTimestampChip(safeTimestamp),
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const courseNotes = { ...(state.notesByCourse[courseId] || {}) };
      const existingLessonNotes = courseNotes[lessonId] || [];
      const updatedLessonNotes = [...existingLessonNotes, newNote].sort(
        (a, b) => a.timestampSeconds - b.timestampSeconds
      );
      courseNotes[lessonId] = updatedLessonNotes;
      const next: GroupedNotesMap = {
        ...state.notesByCourse,
        [courseId]: courseNotes,
      };
      saveNotesMap(next);
      return { notesByCourse: next };
    });

    return newNote;
  },

  deleteNote: (courseId, lessonId, noteId) =>
    set((state) => {
      const courseNotes = { ...(state.notesByCourse[courseId] || {}) };
      const existingLessonNotes = courseNotes[lessonId] || [];
      courseNotes[lessonId] = existingLessonNotes.filter((n) => n.id !== noteId);
      const next: GroupedNotesMap = {
        ...state.notesByCourse,
        [courseId]: courseNotes,
      };
      saveNotesMap(next);
      return { notesByCourse: next };
    }),
}));
