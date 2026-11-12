import React from 'react';
import { Clock } from 'lucide-react';
import { formatTimestampChip } from '../store/useAppStore';

interface CountdownBarProps {
  remainingSeconds: number;
  totalSeconds?: number;
}

export const CountdownBar: React.FC<CountdownBarProps> = ({
  remainingSeconds,
  totalSeconds = 120,
}) => {
  const pct = Math.max(
    0,
    Math.min(100, (remainingSeconds / totalSeconds) * 100)
  );

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 sm:w-48 h-1.5 rounded-full bg-[#EAE8DF] overflow-hidden">
        <div
          className="h-full bg-[#435624] rounded-full transition-all duration-500 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#435624] tabular-nums">
        <Clock className="w-3.5 h-3.5" />
        <span>{formatTimestampChip(remainingSeconds)}</span>
      </span>
    </div>
  );
};
