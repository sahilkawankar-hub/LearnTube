import React from 'react';
import { Clock } from 'lucide-react';
import { DailyPace } from '../store/useAppStore';

interface PaceSelectorProps {
  value: DailyPace;
  onChange: (pace: DailyPace) => void;
}

const PACE_OPTIONS: DailyPace[] = [30, 60, 90, 120];

export const PaceSelector: React.FC<PaceSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-[16px] border border-[#EAE8DF] px-5 py-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[#181A16]">
            Daily study pace
          </p>
          <p className="text-[12.5px] text-[#6B6E65]">
            Choose how much time you want to spend each day
          </p>
        </div>
      </div>

      <div
        role="group"
        aria-label="Select daily study pace"
        className="flex items-center gap-2 flex-wrap"
      >
        {PACE_OPTIONS.map((pace) => {
          const isActive = value === pace;
          return (
            <button
              key={pace}
              type="button"
              onClick={() => onChange(pace)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer tabular-nums hover:-translate-y-[1px] active:scale-[0.98] ${
                isActive
                  ? 'bg-[#435624] text-white shadow-[0_4px_12px_rgba(67,86,36,0.2)]'
                  : 'bg-[#F6F5EE] text-[#6B6E65] border border-[#EAE8DF] hover:border-[#C8D1B1] hover:text-[#181A16]'
              }`}
            >
              {pace} min
            </button>
          );
        })}
      </div>
    </div>
  );
};
