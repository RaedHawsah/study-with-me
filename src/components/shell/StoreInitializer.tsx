'use client';

import { useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useTaskStore } from '@/store/useTaskStore';
import { useTimerStore } from '@/store/useTimerStore';
import { useGamificationStore } from '@/store/useGamificationStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useNotesStore } from '@/store/useNotesStore';

/**
 * StoreInitializer — hydrates our professional 100% backend stores
 * when the user session is available.
 */
export function StoreInitializer() {
  const { user, loading } = useSupabaseAuth();
  
  const fetchTasks = useTaskStore(s => s.fetchTasks);
  const fetchSettings = useTimerStore(s => s.fetchSettings);
  const fetchGamificationData = useGamificationStore(s => s.fetchGamificationData);
  const fetchPreferences = usePreferencesStore(s => s.fetchPreferences);
  const fetchNotes = useNotesStore(s => s.fetchNotes);

  const clearTasks = useTaskStore(s => s.clearStore);
  const clearTimer = useTimerStore(s => s.clearStore);
  const clearGamification = useGamificationStore(s => s.clearStore);
  const clearPreferences = usePreferencesStore(s => s.clearStore);
  const clearNotes = useNotesStore(s => s.clearStore);

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Hydrate all data from the database
        // PASS user.id to avoid parallel auth.getUser() lock contention
        const userId = user.id;
        Promise.all([
          fetchTasks(userId),
          fetchSettings(userId),
          fetchGamificationData(userId),
          fetchPreferences(userId),
          fetchNotes(userId)
        ]).catch(err => console.error('Failed to hydrate stores:', err));
      } else {
        // User logged out, clear all stores
        clearTasks();
        clearTimer();
        clearGamification();
        clearPreferences();
        clearNotes();
      }
    }
  }, [
    user, loading, fetchTasks, fetchSettings, fetchGamificationData, 
    fetchPreferences, fetchNotes, clearTasks, clearTimer, 
    clearGamification, clearPreferences, clearNotes
  ]);

  return null;
}
