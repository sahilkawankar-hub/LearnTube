import React from 'react';
import { Video, BookOpenText } from 'lucide-react';
import { PlayerViewMode } from '../store/useAppStore';

interface PlayerTabsProps {
  mode: PlayerViewMode;
  onChange: (mode: PlayerViewMode) => void;
}

export const PlayerTabs: React.FC<PlayerTabsProps> = ({ mode, onChange }) => {
  return (
    <div
      role="tablist"
      aria-label="Study mode switcher"
      className="inline-flex items-center gap-1 p-1 rounded-full bg-[#F6F5EE] border border-[#EAE8DF]"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'video'}
        onClick={() => onChange('video')}
        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
          mode === 'video'
            ? 'bg-[#E2E8CE] text-[#181A16] shadow-2xs'
            : 'text-[#6B6E65] hover:text-[#181A16]'
        }`}
      >
        <Video className="w-3.5 h-3.5 text-[#435624]" />
        <span>Video</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={mode === 'article'}
        onClick={() => onChange('article')}
        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
          mode === 'article'
            ? 'bg-[#E2E8CE] text-[#181A16] shadow-2xs'
            : 'text-[#6B6E65] hover:text-[#181A16]'
        }`}
      >
        <BookOpenText className="w-3.5 h-3.5 text-[#435624]" />
        <span>Article</span>
      </button>
    </div>
  );
};
