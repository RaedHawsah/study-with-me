import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface NotesState {
  notes: Record<string, Note>;
  activeNoteId: string | null;
  searchQuery: string;
  loading: boolean;
  
  // Actions
  fetchNotes: (userId?: string) => Promise<void>;
  addNote: (note?: Partial<Note>) => Promise<string | undefined>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearStore: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: {},
  activeNoteId: null,
  searchQuery: '',
  loading: false,

  clearStore: () => set({ notes: {}, activeNoteId: null, searchQuery: '', loading: false }),

  fetchNotes: async (userId?: string) => {
    set({ loading: true });
    const supabase = createClient();
    let effectiveUserId = userId;

    if (!effectiveUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      effectiveUserId = user?.id;
    }

    if (!effectiveUserId) {
      set({ notes: {}, loading: false });
      return;
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      const notesMap: Record<string, Note> = {};
      data.forEach((note: any) => {
        notesMap[note.id] = {
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: new Date(note.created_at).getTime(),
          updatedAt: new Date(note.updated_at).getTime(),
        };
      });
      set({ notes: notesMap });
    }
    set({ loading: false });
  },

  addNote: async (noteUpdates) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please sign in to create study notes and sync them to the cloud.');
      return;
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: noteUpdates?.title || '',
        content: noteUpdates?.content || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to add note to Supabase:', error);
      return;
    }

    if (data) {
      const newNote: Note = {
        id: data.id,
        title: data.title,
        content: data.content,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      };
      set((state) => ({
        notes: { ...state.notes, [data.id]: newNote },
        activeNoteId: data.id,
      }));
      return data.id;
    }
  },

  updateNote: async (id, updates) => {
    const note = get().notes[id];
    if (!note) return;

    const updatedAt = Date.now();
    const updatedNote = { ...note, ...updates, updatedAt };

    // Optimistic Update
    set((state) => ({
      notes: { ...state.notes, [id]: updatedNote },
    }));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('notes')
        .update({
          title: updatedNote.title,
          content: updatedNote.content,
          updated_at: new Date(updatedAt).toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);
    }
  },

  deleteNote: async (id) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (!error) {
      set((state) => {
        const notes = { ...state.notes };
        delete notes[id];
        return {
          notes,
          activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        };
      });
    }
  },

  setActiveNote: (id) => set({ activeNoteId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
