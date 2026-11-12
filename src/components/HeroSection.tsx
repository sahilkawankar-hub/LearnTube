import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Link2,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Play,
  FileText,
  Upload,
} from 'lucide-react';
import { useAppStore, DailyPace } from '../store/useAppStore';
import { DashboardBuildStep } from '../services/courseBuilder';
import { estimateSliceBuildMinutes } from '../services/sliceCourseBuilder';
import { mockUser } from '../data/mock';
import { MAX_COURSE_SECONDS, SHORT_VIDEO_LIMIT_SECONDS } from '../config';
import { parseYouTubeUrl } from '../utils/youtube';
import { parseManualTranscript } from '../utils/transcriptParser';
import { useVideoInfo } from '../hooks/useVideoInfo';
import { formatDuration } from '../utils/planner';
import { PillButton } from './PillButton';
import {
  ExtractedTranscript,
  fetchYouTubeTranscript,
} from '../services/transcriptClient';

interface HeroSectionProps {
  onBrowseCourses: () => void;
}

const PACE_OPTIONS: DailyPace[] = [30, 60, 90, 120];

function formatHoursAndMinutes(totalSeconds: number): string {
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h 0m`;
  }
  return `${minutes}m`;
}

const STEPPER_STEPS: { key: DashboardBuildStep; label: string }[] = [
  { key: 'READING_VIDEO', label: 'Reading the video...' },
  { key: 'PLANNING_LESSONS', label: 'Planning lessons...' },
  { key: 'WRITING_LESSON_1', label: 'Writing Lesson 1...' },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onBrowseCourses }) => {
  const {
    isHeroUnlocked,
    youtubeUrl,
    setYoutubeUrl,
    dailyPace,
    setDailyPace,
    dashboardBuildStep,
    dashboardProgressDetail,
    dashboardBuildError,
    clearDashboardBuildError,
    buildCourseFromVideo,
    focusUrlInputTrigger,
  } = useAppStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const [isManualPanelOpen, setIsManualPanelOpen] = useState(false);
  const [manualTranscriptText, setManualTranscriptText] = useState('');
  const [manualParseError, setManualParseError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [automaticTranscript, setAutomaticTranscript] =
    useState<ExtractedTranscript | null>(null);
  const [transcriptStatus, setTranscriptStatus] = useState<
    'idle' | 'loading' | 'ready' | 'unavailable'
  >('idle');
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  // Scroll to and focus the URL input when "+ New course" is clicked in the sidebar
  useEffect(() => {
    if (focusUrlInputTrigger > 0) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [focusUrlInputTrigger]);

  // Reset manual transcript inputs when URL changes
  useEffect(() => {
    setIsManualPanelOpen(false);
    setManualTranscriptText('');
    setManualParseError(null);
    setUploadedFileName(null);
  }, [youtubeUrl]);

  const trimmedUrl = youtubeUrl.trim();
  const parsedUrl = useMemo(() => parseYouTubeUrl(trimmedUrl), [trimmedUrl]);
  const videoId = parsedUrl?.type === 'VIDEO' ? parsedUrl.id : null;

  const { status: videoInfoStatus, info: videoInfo, error: videoInfoError } =
    useVideoInfo(videoId);

  // Fetch captions as soon as a valid YouTube video ID is available. This is
  // deliberately independent of the iframe metadata check so users still get
  // a useful manual-transcript fallback for videos that cannot be embedded.
  useEffect(() => {
    if (!videoId) {
      setAutomaticTranscript(null);
      setTranscriptStatus('idle');
      setTranscriptError(null);
      return;
    }

    const controller = new AbortController();
    setAutomaticTranscript(null);
    setTranscriptStatus('loading');
    setTranscriptError(null);

    void fetchYouTubeTranscript(videoId, controller.signal)
      .then((transcript) => {
        if (controller.signal.aborted) return;
        setAutomaticTranscript(transcript);
        setTranscriptStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setTranscriptStatus('unavailable');
        setTranscriptError(
          error instanceof Error
            ? error.message
            : "We couldn't fetch captions automatically. You can paste or upload a transcript manually."
        );
      });

    return () => controller.abort();
  }, [videoId]);

  const isOverDurationLimit = Boolean(
    videoInfo && videoInfo.durationSeconds > MAX_COURSE_SECONDS
  );

  const isLongVideo = Boolean(
    videoInfo &&
      videoInfo.durationSeconds > SHORT_VIDEO_LIMIT_SECONDS &&
      videoInfo.durationSeconds <= MAX_COURSE_SECONDS
  );

  const estimatedBuildMinutes = useMemo(
    () =>
      videoInfo ? estimateSliceBuildMinutes(videoInfo.durationSeconds) : 1,
    [videoInfo]
  );

  const isBuilding = dashboardBuildStep !== 'IDLE';

  const canBuild =
    !isBuilding &&
    parsedUrl?.type === 'VIDEO' &&
    videoInfoStatus === 'ready' &&
    Boolean(videoInfo) &&
    !isOverDurationLimit;

  const handleBuildCourse = async () => {
    if (!canBuild || !videoInfo) return;

    // Long videos use the verified transcript path when captions are available.
    // If YouTube has no captions, retain the existing 20-minute video-slice path.
    const result = await buildCourseFromVideo(
      videoInfo,
      isLongVideo && automaticTranscript?.segments.length
        ? automaticTranscript.segments
        : undefined
    );
    if (result) {
      navigate(`/courses/${result.slug}`);
    }
  };

  const handleBuildWithManualTranscript = async () => {
    if (!videoInfo) return;
    const parsed = parseManualTranscript(manualTranscriptText);
    if (parsed.error || parsed.segments.length === 0) {
      setManualParseError(
        parsed.error ||
          'Timestamps are needed so lessons can link to the video.'
      );
      return;
    }
    setManualParseError(null);
    const result = await buildCourseFromVideo(videoInfo, parsed.segments);
    if (result) {
      navigate(`/courses/${result.slug}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setUploadedFileName(file.name);
      setManualTranscriptText(content);
      const check = parseManualTranscript(content);
      setManualParseError(check.error);
    } catch {
      setManualParseError('Could not read the uploaded transcript file.');
    }
  };

  const activeStepIndex = STEPPER_STEPS.findIndex(
    (s) => s.key === dashboardBuildStep
  );

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[450px] rounded-[24px] overflow-hidden border border-[#EAE8DF] flex items-center justify-center p-5 sm:p-8 md:p-12 shadow-[0_8px_30px_rgba(24,26,22,0.04)]"
    >
      {/* Custom SVG Landscape Background */}
      <svg
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        viewBox="0 0 1200 540"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="creamSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDFBF3" />
            <stop offset="55%" stopColor="#F9EFE2" />
            <stop offset="100%" stopColor="#F5DFC9" />
          </linearGradient>
          <radialGradient id="sunGlow" cx="75%" cy="24%" r="28%">
            <stop offset="0%" stopColor="#FFE6C4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFE6C4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mountainFar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9A89B4" />
            <stop offset="100%" stopColor="#C5B6D6" />
          </linearGradient>
          <linearGradient id="mountainMid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7A6B98" />
            <stop offset="100%" stopColor="#A697C0" />
          </linearGradient>
          <linearGradient id="lakeWater" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7EB2DD" />
            <stop offset="50%" stopColor="#659BC9" />
            <stop offset="100%" stopColor="#4F86B5" />
          </linearGradient>
          <linearGradient id="meadowBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#83A354" />
            <stop offset="100%" stopColor="#5D7B36" />
          </linearGradient>
          <linearGradient id="meadowFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6E8F40" />
            <stop offset="100%" stopColor="#486324" />
          </linearGradient>
        </defs>

        <rect width="1200" height="540" fill="url(#creamSky)" />
        <circle cx="900" cy="130" r="240" fill="url(#sunGlow)" />
        <circle cx="900" cy="130" r="46" fill="#FFF7E8" opacity="0.9" />

        <g fill="#F6C8AE" opacity="0.72">
          <path d="M120 115 C120 95, 155 85, 180 98 C198 78, 240 80, 255 102 C280 100, 300 115, 295 132 C295 142, 275 146, 250 146 L130 146 C105 146, 100 125, 120 115 Z" />
          <path d="M560 82 C560 66, 590 58, 612 69 C628 52, 665 55, 678 73 C698 72, 714 84, 710 98 C710 106, 692 110, 670 110 L568 110 C548 110, 544 92, 560 82 Z" />
          <path d="M950 155 C950 140, 978 132, 998 142 C1014 128, 1045 130, 1058 146 C1075 145, 1090 156, 1086 168 L956 168 C940 168, 938 162, 950 155 Z" />
        </g>
        <g fill="#FAD8C3" opacity="0.65">
          <ellipse cx="340" cy="160" rx="85" ry="14" />
          <ellipse cx="790" cy="128" rx="95" ry="15" />
          <ellipse cx="180" cy="185" rx="65" ry="10" />
        </g>

        <path
          d="M-40 350 L110 215 L235 290 L390 175 L545 285 L690 190 L840 280 L1010 168 L1150 265 L1240 220 L1240 370 L-40 370 Z"
          fill="url(#mountainFar)"
        />
        <path
          d="M390 175 L435 208 L405 215 L390 198 L372 218 Z"
          fill="#F5EBF7"
          opacity="0.45"
        />
        <path
          d="M1010 168 L1052 200 L1022 208 L1008 190 L988 212 Z"
          fill="#F5EBF7"
          opacity="0.45"
        />

        <path
          d="M-20 365 L75 268 L210 335 L315 245 L475 340 L615 235 L775 330 L915 242 L1085 335 L1220 265 L1220 390 L-20 390 Z"
          fill="url(#mountainMid)"
        />

        <path
          d="M0 348 Q320 338 640 346 T1200 344 L1200 430 L0 430 Z"
          fill="url(#lakeWater)"
        />
        <g stroke="#B8DAEE" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
          <line x1="160" y1="370" x2="245" y2="370" />
          <line x1="210" y1="382" x2="270" y2="382" />
          <line x1="520" y1="366" x2="610" y2="366" />
          <line x1="820" y1="375" x2="920" y2="375" />
          <line x1="860" y1="388" x2="940" y2="388" />
        </g>

        <g fill="#2B4722">
          <polygon points="45,305 22,368 68,368" />
          <polygon points="45,282 27,332 63,332" />
          <polygon points="85,295 60,372 110,372" />
          <polygon points="85,268 66,325 104,325" />
          <polygon points="128,312 108,374 148,374" />
          <polygon points="162,320 145,375 179,375" />
          <polygon points="1030,310 1008,378 1052,378" />
          <polygon points="1030,285 1012,338 1048,338" />
          <polygon points="1075,290 1048,382 1102,382" />
          <polygon points="1075,260 1054,326 1096,326" />
          <polygon points="1122,302 1098,384 1146,384" />
          <polygon points="1162,282 1136,385 1188,385" />
        </g>
        <g fill="#385B2C">
          <polygon points="64,315 44,375 84,375" />
          <polygon points="108,308 88,375 128,375" />
          <polygon points="995,322 976,380 1014,380" />
          <polygon points="1100,312 1080,384 1120,384" />
        </g>

        <path
          d="M-30 408 Q260 355 580 398 T1230 382 L1230 540 L-30 540 Z"
          fill="url(#meadowBack)"
        />
        <path
          d="M-30 442 Q340 395 720 432 T1230 412 L1230 540 L-30 540 Z"
          fill="url(#meadowFront)"
        />

        <g>
          <circle cx="95" cy="462" r="3.2" fill="#FFF7DF" />
          <circle cx="102" cy="468" r="2.5" fill="#FFD1B3" />
          <circle cx="155" cy="485" r="3" fill="#FFF7DF" />
          <circle cx="230" cy="452" r="3.5" fill="#FBE39B" />
          <circle cx="242" cy="458" r="2.5" fill="#E8D5F8" />
          <circle cx="310" cy="492" r="3" fill="#FFF7DF" />
          <circle cx="420" cy="468" r="3.2" fill="#FFD1B3" />
          <circle cx="495" cy="502" r="2.8" fill="#FFF7DF" />
          <circle cx="660" cy="475" r="3.2" fill="#FBE39B" />
          <circle cx="745" cy="495" r="3" fill="#FFF7DF" />
          <circle cx="835" cy="458" r="3.5" fill="#FFD1B3" />
          <circle cx="848" cy="464" r="2.5" fill="#FFF7DF" />
          <circle cx="930" cy="488" r="3.2" fill="#E8D5F8" />
          <circle cx="1025" cy="454" r="3" fill="#FBE39B" />
          <circle cx="1095" cy="476" r="3.4" fill="#FFF7DF" />
          <circle cx="1140" cy="498" r="2.8" fill="#FFD1B3" />
        </g>
      </svg>

      {/* Centered Frosted-Glass Card */}
      <div className="relative z-10 w-full max-w-[620px] bg-white/80 backdrop-blur-[16px] rounded-[24px] border border-white/90 p-6 sm:p-8 md:p-10 text-center shadow-[0_16px_40px_rgba(24,26,22,0.08)]">
        <div className="inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-[#E2E8CE] text-[#435624] text-[12px] font-medium tracking-tight mb-4">
          Welcome to LearnTube
        </div>

        <h1 className="text-[26px] md:text-[36px] leading-[1.18] font-semibold tracking-tight text-[#181A16] mb-6 text-balance">
          What should we learn,{' '}
          <span className="font-serif-accent text-[30px] md:text-[42px] font-normal">
            {mockUser.name}
          </span>
          ?
        </h1>

        {!isHeroUnlocked ? (
          <div className="bg-white rounded-[16px] border border-[#EAE8DF] p-5 sm:p-6 text-center shadow-[0_2px_10px_rgba(24,26,22,0.03)]">
            <div className="w-10 h-10 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center mx-auto mb-3">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-[16px] font-semibold text-[#181A16] mb-1">
              Building new courses needs a plan
            </h2>
            <p className="text-[13.5px] text-[#6B6E65] max-w-[400px] mx-auto mb-5 leading-relaxed">
              Browse courses other learners have built. They&apos;re free to join.
            </p>
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-center gap-2.5">
              <PillButton
                variant="olive"
                onClick={() => navigate('/pricing')}
                className="w-full md:w-auto min-w-[130px]"
              >
                Upgrade
              </PillButton>
              <PillButton
                variant="outline"
                onClick={onBrowseCourses}
                className="w-full md:w-auto min-w-[150px]"
              >
                Browse courses
              </PillButton>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[16px] border border-[#EAE8DF] p-5 sm:p-6 text-left shadow-[0_2px_10px_rgba(24,26,22,0.03)] space-y-4">
            {/* YouTube URL Input */}
            <div>
              <label
                htmlFor="youtube-url-input"
                className="block text-[12px] font-medium text-[#6B6E65] mb-1.5"
              >
                YouTube video link
              </label>
              <div className="relative flex items-center">
                <Link2 className="w-4 h-4 text-[#6B6E65] absolute left-3.5 pointer-events-none" />
                <input
                  ref={inputRef}
                  id="youtube-url-input"
                  type="url"
                  disabled={isBuilding}
                  value={youtubeUrl}
                  onChange={(e) => {
                    if (dashboardBuildError) clearDashboardBuildError();
                    setYoutubeUrl(e.target.value);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FCFBF7] border border-[#EAE8DF] rounded-xl text-[13.5px] text-[#181A16] placeholder:text-[#6B6E65]/60 focus:outline-none focus:border-[#435624] disabled:opacity-60 transition-colors"
                />
              </div>
            </div>

            {/* Instant URL Validation Feedback */}
            {trimmedUrl.length > 0 && parsedUrl === null && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#F6F5EE] border border-[#EAE8DF] text-[12.5px] text-[#6B6E65]">
                <AlertCircle className="w-4 h-4 text-[#6B6E65] shrink-0 mt-0.5" />
                <span>
                  Please paste a valid YouTube link (for example{' '}
                  <span className="font-mono text-[11.5px] text-[#181A16]">
                    youtube.com/watch?v=...
                  </span>{' '}
                  or{' '}
                  <span className="font-mono text-[11.5px] text-[#181A16]">
                    youtu.be/...
                  </span>
                  ).
                </span>
              </div>
            )}

            {/* Playlist Coming Soon Banner */}
            {parsedUrl?.type === 'PLAYLIST' && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#F6F5EE] border border-[#C8D1B1] text-[13px] text-[#435624]">
                <Sparkles className="w-4 h-4 text-[#435624] shrink-0 mt-0.5" />
                <span>
                  Playlists are coming soon. Please paste a single video link.
                </span>
              </div>
            )}

            {/* Pre-Flight Video Info Loading */}
            {parsedUrl?.type === 'VIDEO' && videoInfoStatus === 'loading' && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#FCFBF7] border border-[#EAE8DF] text-[13px] text-[#6B6E65]">
                <Loader2 className="w-4 h-4 text-[#435624] animate-spin shrink-0" />
                <span>Checking video details...</span>
              </div>
            )}

            {parsedUrl?.type === 'VIDEO' && transcriptStatus === 'loading' && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#FCFBF7] border border-[#EAE8DF] text-[13px] text-[#6B6E65]">
                <Loader2 className="w-4 h-4 text-[#435624] animate-spin shrink-0" />
                <span>Checking available English and Hindi captions...</span>
              </div>
            )}

            {parsedUrl?.type === 'VIDEO' && transcriptStatus === 'ready' && automaticTranscript && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#F6F5EE] border border-[#C8D1B1] text-[13px] text-[#435624]">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Captions found ({automaticTranscript.language}). Long videos will use them to keep lessons grounded in the source.
                </span>
              </div>
            )}

            {parsedUrl?.type === 'VIDEO' && transcriptStatus === 'unavailable' && transcriptError && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#FDF6EC] border border-[#E6D0B1] text-[13px] text-[#7D4E1D]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{transcriptError}</span>
              </div>
            )}

            {/* Pre-Flight Error (Private or Blocked from Embedding) */}
            {parsedUrl?.type === 'VIDEO' &&
              videoInfoStatus === 'error' &&
              videoInfoError && (
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#FDF3F2] border border-[#EBC7C4] text-[13px] text-[#8E2A22]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{videoInfoError}</span>
                </div>
              )}

            {/* Video Preview Card once Loaded */}
            {parsedUrl?.type === 'VIDEO' &&
              videoInfoStatus === 'ready' &&
              videoInfo && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-[#FCFBF7] border border-[#EAE8DF]">
                    <div className="relative w-24 aspect-[16/9] rounded-lg overflow-hidden bg-[#F6F5EE] border border-[#EAE8DF] shrink-0">
                      <img
                        src={videoInfo.thumbnailUrl}
                        alt={videoInfo.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-[#181A16]/10 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-[#435624]">
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-[#181A16] truncate">
                        {videoInfo.title}
                      </p>
                      <p className="text-[12px] text-[#6B6E65] truncate mt-0.5">
                        {videoInfo.channelName}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[11.5px] font-medium text-[#435624] tabular-nums">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(videoInfo.durationSeconds)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Long Video Info Card (> 60 minutes and <= 14 hours) */}
                  {isLongVideo && (
                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#F6F5EE] border border-[#C8D1B1] text-[13px] text-[#435624]">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-[#435624]" />
                      <span>
                        Long video detected. We&apos;ll build this by watching it in 20-minute parts. Estimated build time: about {estimatedBuildMinutes}{' '}
                        {estimatedBuildMinutes === 1 ? 'minute' : 'minutes'}. Lesson 1 will be ready first.
                      </span>
                    </div>
                  )}

                  {/* Max Duration Exceeded Banner (> 14 hours) */}
                  {isOverDurationLimit && (
                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#FDF6EC] border border-[#E6D0B1] text-[13px] text-[#7D4E1D]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        This video is {formatHoursAndMinutes(videoInfo.durationSeconds)}. The maximum is 14h.
                      </span>
                    </div>
                  )}
                </div>
              )}

            {/* Stepper While Building (with Window & Lesson Count Progress) */}
            {isBuilding && (
              <div className="p-4 rounded-xl bg-[#F6F5EE] border border-[#C8D1B1] space-y-2.5">
                <div className="flex items-center justify-between text-[12px] font-semibold text-[#435624]">
                  <span>Building your structured course</span>
                  <span>
                    {dashboardProgressDetail || 'Fast-tracking Lesson 1'}
                  </span>
                </div>
                <div className="space-y-2">
                  {STEPPER_STEPS.map((step, index) => {
                    const isDone = index < activeStepIndex;
                    const isCurrent = index === activeStepIndex;
                    const displayLabel =
                      isCurrent && dashboardProgressDetail
                        ? dashboardProgressDetail
                        : step.label;
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-2.5 text-[13px] transition-colors ${
                          isCurrent
                            ? 'text-[#181A16] font-medium'
                            : isDone
                            ? 'text-[#435624]'
                            : 'text-[#6B6E65]/60'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-[#435624] shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 text-[#435624] animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#6B6E65]/40 shrink-0" />
                        )}
                        <span>{displayLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dashboard Build Error Banner */}
            {dashboardBuildError && !isBuilding && (
              <div className="flex items-start justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#FDF3F2] border border-[#EBC7C4] text-[13px] text-[#8E2A22]">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{dashboardBuildError}</span>
                </div>
                {canBuild && (
                  <button
                    type="button"
                    onClick={handleBuildCourse}
                    className="text-[12px] font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Daily Pace Selector + Build Course Button */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
              <div>
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#6B6E65] mb-2">
                  <Clock className="w-3.5 h-3.5 text-[#435624]" />
                  <span>Daily study pace</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PACE_OPTIONS.map((pace) => {
                    const isSelected = dailyPace === pace;
                    return (
                      <button
                        key={pace}
                        type="button"
                        disabled={isBuilding}
                        onClick={() => setDailyPace(pace)}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all cursor-pointer tabular-nums disabled:opacity-60 ${
                          isSelected
                            ? 'bg-[#E2E8CE] text-[#435624] border border-[#435624]/30'
                            : 'bg-[#F6F5EE] text-[#6B6E65] border border-transparent hover:text-[#181A16]'
                        }`}
                      >
                        {pace} min
                      </button>
                    );
                  })}
                </div>
              </div>

              <PillButton
                type="button"
                variant="olive"
                disabled={!canBuild}
                onClick={handleBuildCourse}
                className="w-full md:w-auto disabled:opacity-50 disabled:pointer-events-none"
              >
                {isBuilding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Building...</span>
                  </>
                ) : (
                  <span>Build course</span>
                )}
              </PillButton>
            </div>

            {/* Optional Manual Transcript Link Under Builder */}
            {!isBuilding && (
              <div className="pt-2 border-t border-[#EAE8DF]/70">
                <button
                  type="button"
                  onClick={() => setIsManualPanelOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6B6E65] hover:text-[#435624] underline underline-offset-4 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Have a transcript? Paste it instead</span>
                </button>

                {isManualPanelOpen && (
                  <div className="mt-3 p-3.5 rounded-xl bg-[#F6F5EE] border border-[#EAE8DF] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-[#6B6E65]">
                        Paste transcript with timestamps (e.g. [00:12:30] or 12:30)
                      </span>

                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".srt,.vtt,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#EAE8DF] hover:border-[#C8D1B1] text-[12px] font-medium text-[#435624] transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {uploadedFileName
                              ? `Uploaded: ${uploadedFileName}`
                              : 'Upload .srt / .vtt'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={4}
                      value={manualTranscriptText}
                      onChange={(e) => {
                        setManualTranscriptText(e.target.value);
                        if (manualParseError) setManualParseError(null);
                      }}
                      placeholder={`[00:00] Welcome to the lecture on distributed systems...\n[04:15] Consensus protocols and fault tolerance...\n[12:30] State machine replication...`}
                      className="w-full p-3 rounded-xl bg-white border border-[#EAE8DF] text-[12.5px] font-mono text-[#181A16] placeholder:text-[#6B6E65]/60 focus:outline-none focus:border-[#435624]"
                    />

                    {manualParseError && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#FDF3F2] border border-[#EBC7C4] text-[12.5px] text-[#8E2A22]">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{manualParseError}</span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <PillButton
                        type="button"
                        variant="olive"
                        size="sm"
                        disabled={!canBuild || !manualTranscriptText.trim()}
                        onClick={handleBuildWithManualTranscript}
                      >
                        <span>Build from transcript</span>
                      </PillButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
