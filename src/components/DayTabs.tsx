import React from 'react';
import { Day } from '../types';

interface DayTabsProps {
  days: Day[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
}

export const DayTabs: React.FC<DayTabsProps> = ({
  days,
  selectedDayNumber,
  onSelectDay,
}) => {
  return (
    <div
      role="tablist"
      aria-label="Daily study plan days"
      className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"
    >
      {days.map((day) => {
        const isActive = day.dayNumber === selectedDayNumber;
        const label =
          day.dayNumber === 1 ? 'Day 1 (today)' : `Day ${day.dayNumber}`;

        return (
          <button
            key={day.dayNumber}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onSelectDay(day.dayNumber)}
            className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer tabular-nums hover:-translate-y-[1px] active:scale-[0.98] ${
              isActive
                ? 'bg-[#E2E8CE] text-[#181A16] border border-[#C8D1B1] shadow-2xs'
                : 'bg-white text-[#6B6E65] border border-[#EAE8DF] hover:border-[#C8D1B1] hover:text-[#181A16]'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
