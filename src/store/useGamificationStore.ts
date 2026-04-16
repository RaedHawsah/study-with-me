import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';

export type PetType = 'CAT' | 'DOG' | 'FALCON' | 'EGG';

interface GamificationState {
  // Global stats
  totalXp: number;
  weeklyStudyMinutes: number;
  currentStreak: number;
  lastStudyDate: string | null;

  // Active pet
  activePetType: PetType | null;
  activePetName: string;

  // Actions
  fetchGamificationData: (userId?: string) => Promise<void>;
  logStudySession: (data: {
    type: string;
    duration: number;
    taskId?: string | null;
  }) => Promise<void>;
  setActivePet: (type: PetType, name: string) => Promise<void>;
  clearStore: () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  totalXp: 0,
  weeklyStudyMinutes: 0,
  currentStreak: 0,
  lastStudyDate: null,
  activePetType: 'CAT',
  activePetName: 'Luna',

  fetchGamificationData: async (userId?: string) => {
    const supabase = createClient();
    let effectiveUserId = userId;

    if (!effectiveUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      effectiveUserId = user?.id;
    }

    if (!effectiveUserId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('xp, level, study_minutes, current_streak, last_study_date, settings')
      .eq('id', effectiveUserId)
      .single();

    if (!error && data) {
      set({
        totalXp: data.xp || 0,
        weeklyStudyMinutes: data.study_minutes || 0,
        currentStreak: data.current_streak || 0,
        lastStudyDate: data.last_study_date || null,
        activePetType: data.settings?.pet?.type || 'CAT',
        activePetName: data.settings?.pet?.name || 'Luna',
      });
    }
  },

  logStudySession: async ({ type, duration, taskId }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // xpEarned: duration is in minutes. 1 min = 2 XP.
    const xpEarned = type === 'focus' ? Math.floor(duration * 2) : 0;
    const today = new Date().toLocaleDateString('en-CA');

    // 1. Update profile with new totals and streak (CRITICAL PATH)
    try {
      const state = get();
      const newXp = (state.totalXp || 0) + xpEarned;
      const newMinutes = (state.weeklyStudyMinutes || 0) + duration;
      const newLevel = getLevelFromXp(newXp);
      
      let newStreak = state.currentStreak || 0;
      if (!state.lastStudyDate) {
        newStreak = 1;
      } else if (state.lastStudyDate !== today) {
        const last = new Date(state.lastStudyDate);
        const current = new Date(today);
        const diffTime = Math.abs(current.getTime() - last.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) newStreak += 1;
        else if (diffDays > 1) newStreak = 1;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          xp: newXp,
          level: newLevel,
          study_minutes: newMinutes,
          current_streak: newStreak,
          last_study_date: today,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update gamification profile:', profileError);
      } else {
        set({
          totalXp: newXp,
          weeklyStudyMinutes: newMinutes,
          currentStreak: newStreak,
          lastStudyDate: today,
        });
      }
    } catch (e) {
      console.error('Error in profile gamification update:', e);
    }

    // 2. Insert session history (SECONDARY PATH)
    try {
      await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          session_type: type,
          duration_minutes: duration,
          xp_earned: xpEarned,
          task_id: taskId || null,
        });
    } catch (e) {
      console.error('Failed to log study session history:', e);
    }
  },

  setActivePet: async (type, name) => {
    set({ activePetType: type, activePetName: name });
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
      const updatedSettings = {
        ...(profile?.settings || {}),
        pet: { type, name }
      };
      await supabase.from('profiles').update({ settings: updatedSettings }).eq('id', user.id);
    }
  },

  clearStore: () => set({
    totalXp: 0,
    weeklyStudyMinutes: 0,
    currentStreak: 0,
    lastStudyDate: null,
    activePetType: 'CAT',
    activePetName: 'Luna',
  }),
}));

export const getLevelFromXp = (xp: number) => Math.max(1, Math.floor(xp / 500) + 1);
export const getProgressToNextLevel = (xp: number) => {
  const currentLevelXp = (getLevelFromXp(xp) - 1) * 500;
  const nextLevelXp = getLevelFromXp(xp) * 500;
  return {
    currentLevelXp,
    nextLevelXp,
    progressPercent: ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100,
  };
};
