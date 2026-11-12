import React, { useEffect, useState } from 'react';
import { Trash2, Play } from 'lucide-react';
import { TimestampNote } from '../types';

interface NoteItemProps {
  note: TimestampNote;
  isNew?: boolean;
  onSeek: (seconds: number) => void;
  onDelete: (noteId: string) => void;
}

export const NoteItem: React.FC<NoteItemProps> = ({
  note,
  isNew = false,
  onSeek,
  onDelete,
}) => {
  // Optimistic opacity pulse from 0.6 to 1 on newly created notes
  const [opacityClass, setOpacityClass] = useState(
    isNew ? 'opacity-60' : 'opacity-100'
  );

  useEffect(() => {
    if (!isNew) return;
    const timer = window.setTimeout(() => {
      setOpacityClass('opacity-100');
    }, 40);
    return () => window.clearTimeout(timer);
  }, [isNew]);

  return (
    <div
      className={`group bg-white rounded-[14px] border border-[#EAE8DF] hover:border-[#C8D1B1] p-3.5 transition-all duration-300 ${opacityClass}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={() => onSeek(note.timestampSeconds)}
          title={`Jump to ${note.formattedTimestamp}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E2E8CE] hover:bg-[#435624] text-[#435624] hover:text-white text-[11.5px] font-semibold tabular-nums transition-colors cursor-pointer"
        >
          <Play className="w-2.5 h-2.5 fill-current" />
          <span>{note.formattedTimestamp}</span>
        </button>

        <button
          type="button"
          onClick={() => onDelete(note.id)}
          aria-label="Delete note"
          title="Delete note"
          className="p-1 rounded-lg text-[#6B6E65]/70 hover:text-[#181A16] hover:bg-[#F6F5EE] transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[13.5px] text-[#181A16] leading-relaxed whitespace-pre-wrap break-words">
        {note.content}
      </p>
    </div>
  );
};
