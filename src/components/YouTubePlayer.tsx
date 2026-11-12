import React from 'react';
import { Clock } from 'lucide-react';
import { formatTimestampChip } from '../store/useAppStore';

interface YouTubePlayerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isReady: boolean;
  startSeconds: number;
  endSeconds: number;
  currentTime: number;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  containerRef,
  isReady,
  startSeconds,
  endSeconds,
  currentTime,
}) => {
  return (
    <div className="space-y-2.5">
      <div className="relative w-full aspect-video rounded-[16px] overflow-hidden border border-[#EAE8DF] bg-[#181A16] shadow-[0_6px_24px_rgba(24,26,22,0.06)]">
        {/* Loading Skeleton while YouTube IFrame API initializes */}
        {!isReady && (
          <div className="absolute inset-0 z-10 bg-[#F6F5EE] flex flex-col items-center justify-center gap-3 p-6 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-[#E2E8CE] border border-[#C8D1B1] flex items-center justify-center">
              <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-[#435624] border-b-[7px] border-b-transparent ml-1" />
            </div>
            <div className="h-3.5 w-48 rounded-full bg-[#EAE8DF]" />
            <div className="h-2.5 w-32 rounded-full bg-[#EAE8DF]/70" />
          </div>
        )}

        {/* YouTube IFrame Mount Container */}
        <div
          ref={containerRef}
          className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
        />
      </div>

      {/* Subtle Chapter Window Bar */}
      <div className="flex items-center justify-between px-1 text-[12px] text-[#6B6E65] tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#435624]" />
          <span>
            Lesson segment: {formatTimestampChip(startSeconds)} –{' '}
            {formatTimestampChip(endSeconds)}
          </span>
        </span>
        <span>Current position: {formatTimestampChip(currentTime)}</span>
      </div>
    </div>
  );
};
