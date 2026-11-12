import React, { useState } from 'react';
import { Pin, Plus } from 'lucide-react';
import { TimestampNote } from '../types';
import { formatTimestampChip } from '../store/useAppStore';
import { PillButton } from './PillButton';
import { NoteItem } from './NoteItem';

interface NotesPanelProps {
  currentTime: number;
  notes: TimestampNote[];
  onAddNote: (timestampSeconds: number, content: string) => TimestampNote;
  onDeleteNote: (noteId: string) => void;
  onSeekToTimestamp: (seconds: number) => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  currentTime,
  notes,
  onAddNote,
  onDeleteNote,
  onSeekToTimestamp,
}) => {
  const [noteText, setNoteText] = useState('');
  const [pinnedSeconds, setPinnedSeconds] = useState<number | null>(null);
  const [lastAddedNoteId, setLastAddedNoteId] = useState<string | null>(null);

  // Capture timestamp the moment the user FOCUSES the input or types the first character
  const handleFocus = () => {
    if (pinnedSeconds === null) {
      setPinnedSeconds(Math.max(0, Math.floor(currentTime)));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    if (pinnedSeconds === null && nextValue.length > 0) {
      setPinnedSeconds(Math.max(0, Math.floor(currentTime)));
    }
    if (nextValue.length === 0) {
      // Keep pinnedSeconds while focused, or allow fresh capture on next focus/type
    }
    setNoteText(nextValue);
  };

  const handleBlur = () => {
    if (noteText.trim().length === 0) {
      setPinnedSeconds(null);
    }
  };

  const handleSave = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    const timestampToSave =
      pinnedSeconds !== null ? pinnedSeconds : Math.max(0, Math.floor(currentTime));
    const created = onAddNote(timestampToSave, trimmed);
    setLastAddedNoteId(created.id);
    setNoteText('');
    setPinnedSeconds(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const sortedNotes = [...notes].sort(
    (a, b) => a.timestampSeconds - b.timestampSeconds
  );

  return (
    <aside className="bg-[#F6F5EE] rounded-[16px] border border-[#EAE8DF] p-4 sm:p-5 flex flex-col h-full max-h-[680px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-[#181A16]">
          Timestamped Notes
        </h2>
        <span className="text-[12px] text-[#6B6E65] tabular-nums">
          {sortedNotes.length} {sortedNotes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      {/* Note Input Box at Top */}
      <div className="bg-white rounded-[14px] border border-[#EAE8DF] p-3.5 mb-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between text-[11.5px]">
          {pinnedSeconds !== null ? (
            <span className="inline-flex items-center gap-1 text-[#435624] font-medium tabular-nums">
              <Pin className="w-3 h-3" />
              <span>Pinned at {formatTimestampChip(pinnedSeconds)}</span>
            </span>
          ) : (
            <span className="text-[#6B6E65]">
              Focus or start typing to pin current timestamp
            </span>
          )}
          <span className="text-[#6B6E65]/70">Enter to save</span>
        </div>

        <textarea
          rows={3}
          value={noteText}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Write a key takeaway or question..."
          className="w-full resize-none bg-[#FCFBF7] border border-[#EAE8DF] rounded-xl px-3 py-2 text-[13.5px] text-[#181A16] placeholder:text-[#6B6E65]/60 focus:outline-none focus:border-[#435624] transition-colors"
        />

        <div className="flex justify-end">
          <PillButton
            type="button"
            variant="olive"
            size="sm"
            onClick={handleSave}
            disabled={!noteText.trim()}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save note</span>
          </PillButton>
        </div>
      </div>

      {/* Saved Notes List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {sortedNotes.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-[13px] text-[#6B6E65] leading-relaxed">
              No notes for this lesson yet. Click the input box while watching to pin a timestamped note.
            </p>
          </div>
        ) : (
          sortedNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isNew={note.id === lastAddedNoteId}
              onSeek={onSeekToTimestamp}
              onDelete={onDeleteNote}
            />
          ))
        )}
      </div>
    </aside>
  );
};
