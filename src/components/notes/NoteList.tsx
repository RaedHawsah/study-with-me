'use client';

import { useNotesStore } from '@/store/useNotesStore';
import { useTranslation } from 'react-i18next';
import { Search, Plus, FileText, Trash2, Clock } from 'lucide-react';
import { useMemo } from 'react';

export function NoteList() {
  const { t } = useTranslation('common');
  const { 
    notes, 
    activeNoteId, 
    searchQuery, 
    setActiveNote, 
    setSearchQuery, 
    addNote, 
    deleteNote 
  } = useNotesStore();

  const filteredNotes = useMemo(() => {
    return Object.values(notes)
      .filter((note) => {
        if (!searchQuery) return true;
        return (
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-3xl border-e border-white/5 rtl:border-s rtl:border-e-0 md:rounded-s-[2rem] overflow-hidden">
      {/* Header & Search */}
      <div className="p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {t('nav.notes', { defaultValue: 'Notes' })}
          </h2>
          <button
            onClick={() => addNote()}
            title={t('common.add', { defaultValue: 'Add' })}
            className="p-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="relative">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('common.search', { defaultValue: 'Search...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background/50 border border-white/10 rounded-xl py-2 pe-4 ps-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center opacity-50 h-full">
            <FileText size={48} className="mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? t('common.no_results', { defaultValue: 'No results found' })
                : t('notes.empty', { defaultValue: 'No notes yet. Create one!' })
              }
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isActive = activeNoteId === note.id;
            
            return (
              <div
                key={note.id}
                onClick={() => setActiveNote(note.id)}
                className={`
                  p-3 rounded-xl cursor-pointer transition-all group
                  ${isActive 
                    ? 'bg-primary/20 border border-primary/30' 
                    : 'hover:bg-white/5 border border-transparent'}
                `}
              >
                <div className="flex items-start justify-between">
                  <h3 className={`font-semibold text-sm truncate pe-2 ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {note.title || t('notes.untitled', { defaultValue: 'Untitled Note' })}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded-md transition-all shrink-0"
                    title={t('common.delete', { defaultValue: 'Delete' })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">
                  {note.content || t('notes.no_content', { defaultValue: 'No content' })}
                </p>
                
                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/70">
                  <Clock size={10} />
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
