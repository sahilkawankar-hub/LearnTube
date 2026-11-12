export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: 'free' | 'pro' | 'team';
  dailyGoalMinutes: 30 | 60 | 90 | 120;
  streakDays: number;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  lessonId: string;
  questionPrompt: string;
  options: [string, string, string, string] | string[];
  correctOptionIndex: number; // 0 to 3
  explanationText: string;
  explanationTimestampSeconds: number;
  isPlacementEligible: boolean;
}

export type LessonStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED_BY_PLACEMENT';

export type CourseBuildStatus =
  | 'QUEUED'
  | 'PLANNING'
  | 'LESSON_1_READY'
  | 'GENERATING_REMAINING'
  | 'COMPLETED'
  | 'FAILED';

export interface Lesson {
  id: string;
  courseId?: string;
  sequenceNumber: number;
  title: string;
  summaryDescription: string;
  durationSeconds: number; // between 180 and 1200
  youtubeVideoId: string;
  startSeconds: number;
  endSeconds: number;
  conceptTag: string;
  articleMarkdown: string;
  quizQuestions: QuizQuestion[];
  isCompleted?: boolean;
  isGeneratedReady?: boolean;
  hasBuildFailed?: boolean;
}

export interface Day {
  dayNumber: number;
  lessons: Lesson[];
  totalSeconds: number;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  youtubeSourceId?: string;
  channelName: string;
  channelAvatar?: string;
  thumbnailUrl: string;
  thumbnailTheme: 'cs' | 'design' | 'physics' | 'ml' | 'economics' | 'history';
  totalDuration: string;
  totalDurationMinutes: number;
  lessonCount: number;
  learnerCount: number;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  lessons: Lesson[];
  createdAt: string;
  isUserGenerated?: boolean;
  buildStatus?: CourseBuildStatus;
  completedLessonsCheckpoint?: number;
  buildErrorMessage?: string;
  currentlyBuildingLessonNumber?: number;
  // Long-video slice & transcript pipeline metadata & checkpoints
  pipelineType?: 'SHORT_VIDEO' | 'LONG_SLICE' | 'LONG_TRANSCRIPT';
  isLessonCountApproximate?: boolean;
  totalVideoSlices?: number;
  completedVideoSlices?: number;
  sliceLessonsCheckpoint?: Record<number, WindowOutlineLesson[]>;
  isDailyLimitPaused?: boolean;
  totalTranscriptWindows?: number;
  completedTranscriptWindows?: number;
  transcriptSegmentsCheckpoint?: TranscriptSegment[];
  windowLessonsCheckpoint?: Record<number, WindowOutlineLesson[]>;
  estimatedSecondsRemaining?: number;
}

export interface TranscriptSegment {
  startSeconds: number;
  text: string;
}

export interface TranscriptWindow {
  windowIndex: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface WindowOutlineLesson {
  title: string;
  summaryDescription: string;
  startSeconds: number;
  endSeconds: number;
  conceptTag: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  dailyPaceMinutes: 30 | 60 | 90 | 120;
  completedLessonIds: string[];
  currentLessonId: string;
  progressPercent: number;
  startedAt: string;
  lastAccessedAt: string;
}

export interface Roadmap {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  estimatedWeeks: number;
  totalHours: number;
  courseIds: string[];
  courseCount: number;
  learnerCount: number;
  tags: string[];
}

export interface TimestampNote {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  timestampSeconds: number;
  formattedTimestamp: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface InboxItem {
  id: string;
  title: string;
  message: string;
  courseId?: string;
  courseSlug?: string;
  type: 'welcome' | 'course_ready' | 'course_failed';
  isRead: boolean;
  createdAt: string;
}

