'use client';

import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';
import { useNotesStore } from '@/store/useNotesStore';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { isRtl, type Locale } from '@/i18n/config';

export function NotesManager({ locale }: { locale: string }) {
  const { activeNoteId, setActiveNote, fetchNotes } = useNotesStore();
  const { t } = useTranslation('common');
  const rtl = isRtl(locale as Locale);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // In mobile view, if a note is active, we show the editor. Otherwise, the list.
  return (
    <div className="h-[calc(100vh-8rem)] min-h-[500px] w-full max-w-6xl mx-auto flex rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
      
      {/* Mobile Back Button (only visible when active on sm screens) */}
      {activeNoteId && (
        <button
          onClick={() => setActiveNote(null)}
          className="md:hidden absolute top-4 start-4 z-50 p-2 bg-background/80 backdrop-blur rounded-full text-foreground hover:bg-card border border-white/10 shadow-lg"
        >
          <ChevronLeft 
            size={20} 
            className={rtl ? 'rotate-180' : ''} 
          />
        </button>
      )}

      {/* Sidebar List */}
      <div className={`
        absolute inset-y-0 start-0 z-10 w-full md:w-80 lg:w-96 md:relative transform transition-transform duration-300 ease-in-out
        ${activeNoteId ? 'max-md:-translate-x-full max-md:rtl:translate-x-full' : 'translate-x-0'}
      `}>
        <NoteList />
      </div>

      {/* Editor Content */}
      <div className={`
        flex-1 absolute inset-0 z-20 md:relative transform transition-transform duration-300 ease-in-out
        ${!activeNoteId ? 'max-md:translate-x-full max-md:rtl:-translate-x-full' : 'translate-x-0'}
      `}>
        <NoteEditor />
      </div>

    </div>
  );
}
