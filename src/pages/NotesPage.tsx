import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Play, Trash2, ArrowRight } from 'lucide-react';
import { useAppStore, getAllCourses } from '../store/useAppStore';
import { PillButton } from '../components/PillButton';

interface EnrichedNote {
  noteId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  lessonId: string;
  lessonSequence: number;
  lessonTitle: string;
  timestampSeconds: number;
  formattedTimestamp: string;
  content: string;
  createdAt: string;
}

export const NotesPage: React.FC = () => {
  const { notesByCourse, deleteNote, generatedCourses } = useAppStore();
  const navigate = useNavigate();

  const allCourses = useMemo(
    () => getAllCourses(generatedCourses),
    [generatedCourses]
  );

  const allNotes = useMemo<EnrichedNote[]>(() => {
    const list: EnrichedNote[] = [];

    for (const [courseId, lessonMap] of Object.entries(notesByCourse)) {
      const course = allCourses.find((c) => c.id === courseId);
      if (!course || !lessonMap) continue;

      for (const [lessonId, notes] of Object.entries(lessonMap)) {
        const lesson = course.lessons.find((l) => l.id === lessonId);
        if (!lesson || !Array.isArray(notes)) continue;

        for (const note of notes) {
          list.push({
            noteId: note.id,
            courseId: course.id,
            courseSlug: course.slug,
            courseTitle: course.title,
            lessonId: lesson.id,
            lessonSequence: lesson.sequenceNumber,
            lessonTitle: lesson.title,
            timestampSeconds: note.timestampSeconds,
            formattedTimestamp: note.formattedTimestamp,
            content: note.content,
            createdAt: note.createdAt,
          });
        }
      }
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notesByCourse, allCourses]);

  return (
    <div className="max-w-[960px] mx-auto space-y-8 pb-20 md:pb-10">
      <header className="space-y-2 border-b border-[#EAE8DF] pb-6">
        <h1 className="text-[26px] md:text-[36px] font-semibold tracking-tight text-[#181A16]">
          Timestamped study{' '}
          <span className="font-serif-accent text-[30px] md:text-[40px] font-normal">
            notes
          </span>
        </h1>
        <p className="text-[14.5px] text-[#6B6E65] max-w-xl leading-relaxed">
          Every insight and timestamped bookmark captured across your courses. Click any note to open the study player at that lesson.
        </p>
      </header>

      {allNotes.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-[#EAE8DF] p-10 text-center space-y-4">
          <div className="w-11 h-11 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center mx-auto">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-[16px] font-semibold text-[#181A16]">
            No saved notes yet
          </h2>
          <p className="text-[13.5px] text-[#6B6E65] max-w-md mx-auto">
            Open any lesson in the study player and type in the notes panel to pin notes directly to video timestamps.
          </p>
          <PillButton variant="olive" onClick={() => navigate('/dashboard')}>
            <span>Browse courses</span>
            <ArrowRight className="w-4 h-4" />
          </PillButton>
        </div>
      ) : (
        <div className="space-y-3.5">
          {allNotes.map((item) => (
            <article
              key={item.noteId}
              onClick={() =>
                navigate(`/courses/${item.courseSlug}/learn/${item.lessonId}`)
              }
              className="group bg-white rounded-[16px] border border-[#EAE8DF] p-5 transition-all duration-200 hover:-translate-y-[2px] hover:border-[#C8D1B1] hover:shadow-[0_8px_20px_rgba(24,26,22,0.04)] cursor-pointer space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#6B6E65]">
                  <span className="font-semibold text-[#435624]">
                    {item.courseTitle}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Lesson {item.lessonSequence}: {item.lessonTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E2E8CE] group-hover:bg-[#435624] text-[#435624] group-hover:text-white text-[11.5px] font-semibold tabular-nums transition-colors">
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{item.formattedTimestamp}</span>
                  </span>

                  <button
                    type="button"
                    aria-label="Delete note"
                    title="Delete note"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(item.courseId, item.lessonId, item.noteId);
                    }}
                    className="p-1.5 rounded-lg text-[#6B6E65]/70 hover:text-[#181A16] hover:bg-[#F6F5EE] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-[14.5px] text-[#181A16] leading-relaxed whitespace-pre-wrap">
                {item.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
