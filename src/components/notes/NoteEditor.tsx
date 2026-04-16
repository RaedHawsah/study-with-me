'use client';

import { useEffect, useState, useRef } from 'react';
import { useNotesStore } from '@/store/useNotesStore';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

export function NoteEditor() {
  const { t } = useTranslation('common');
  const { notes, activeNoteId, updateNote } = useNotesStore();
  
  const activeNote = activeNoteId ? notes[activeNoteId] : null;

  // Local state for immediate typing feedback without spamming the store
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when the active note changes
  useEffect(() => {
    if (activeNote) {
      setLocalTitle(activeNote.title);
      setLocalContent(activeNote.content);
    }
  }, [activeNoteId]); // Only trigger when ID changes, not when content updates to avoid losing cursor focus

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    
    if (activeNoteId) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateNote(activeNoteId, { title: newTitle });
      }, 500);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);

    if (activeNoteId) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateNote(activeNoteId, { content: newContent });
      }, 500);
    }
  };

  if (!activeNote) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-card/20 backdrop-blur-xl md:rounded-e-[2rem] text-center p-8">
        <div className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
          <FileText size={48} />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          {t('notes.select_prompt', { defaultValue: 'Select a note' })}
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          {t('notes.select_desc', { defaultValue: 'Choose a note from the list on the left, or create a new one to get started.' })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card/20 backdrop-blur-xl md:rounded-e-[2rem]">
      {/* Editor Header */}
      <div className="p-6 border-b border-white/5 shrink-0">
        <input
          type="text"
          value={localTitle}
          onChange={handleTitleChange}
          placeholder={t('notes.untitled', { defaultValue: 'Untitled Note' })}
          className="w-full bg-transparent text-2xl md:text-3xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        <div className="mt-2 flex items-center text-xs text-muted-foreground">
          <span>{t('notes.last_edited', { defaultValue: 'Last edited' })}: {new Date(activeNote.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <textarea
          value={localContent}
          onChange={handleContentChange}
          placeholder={t('notes.start_typing', { defaultValue: 'Start typing your note here...' })}
          className="flex-1 w-full resize-none bg-transparent text-base leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>
    </div>
  );
}
