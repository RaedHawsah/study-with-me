import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimerStatus = 'idle' | 'running' | 'paused';
export type SessionType = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerSettings {
  focusDuration: number;           // minutes
  shortBreakDuration: number;      // minutes
  longBreakDuration: number;       // minutes
  cyclesBeforeLongBreak: number;   // focus sessions before a long break
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getSessionDuration(
  type: SessionType,
  settings: TimerSettings,
): number {
  switch (type) {
    case 'focus':      return settings.focusDuration * 60;
    case 'shortBreak': return settings.shortBreakDuration * 60;
    case 'longBreak':  return settings.longBreakDuration * 60;
  }
}

export const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  cyclesBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface TimerStore {
  // ── Runtime state ──
  status: TimerStatus;
  remainingSeconds: number;
  lastUpdatedAt: number;

  // ── Session state ──
  sessionType: SessionType;
  totalSeconds: number;
  currentCycle: number;
  completedFocusSessions: number;

  // ── User preferences ──
  settings: TimerSettings;
  activeTaskId: string | null;

  // ── Actions ──
  fetchSettings: (userId?: string) => Promise<void>;
  clearStore: () => void;
  updateSettings: (updates: Partial<TimerSettings>) => Promise<void>;
  
  // ── Setters ──
  setStatus: (s: TimerStatus) => void;
  setRemaining: (s: number) => void;
  setSessionType: (t: SessionType) => void;
  setCurrentCycle: (n: number) => void;
  setTotalSeconds: (n: number) => void;
  setActiveTask: (id: string | null) => void;
  incrementCompletedSessions: () => void;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      status: 'idle',
      remainingSeconds: DEFAULT_SETTINGS.focusDuration * 60,
      lastUpdatedAt: Date.now(),

      sessionType: 'focus',
      totalSeconds: DEFAULT_SETTINGS.focusDuration * 60,
      currentCycle: 1,
      completedFocusSessions: 0,

      settings: DEFAULT_SETTINGS,
      activeTaskId: null,

      fetchSettings: async (userId?: string) => {
        const supabase = createClient();
        let effectiveUserId = userId;

        if (!effectiveUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          effectiveUserId = user?.id;
        }

        if (!effectiveUserId) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', effectiveUserId)
          .single();

        if (!error && data?.settings?.timer) {
          const dbSettings = data.settings.timer as TimerSettings;
          const { sessionType, status } = get();
          const newTotal = getSessionDuration(sessionType, dbSettings);
          
          set({ 
            settings: dbSettings,
            totalSeconds: status === 'idle' ? newTotal : get().totalSeconds,
            remainingSeconds: status === 'idle' ? newTotal : get().remainingSeconds
          });
        }
      },

      clearStore: () => set({
        settings: DEFAULT_SETTINGS,
        status: 'idle',
        sessionType: 'focus',
        remainingSeconds: DEFAULT_SETTINGS.focusDuration * 60,
        totalSeconds: DEFAULT_SETTINGS.focusDuration * 60,
        currentCycle: 1,
      }),

      updateSettings: async (updates) => {
        const currentSettings = get().settings;
        const newSettings = { ...currentSettings, ...updates };
        set({ settings: newSettings });

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', user.id)
            .single();

          const updatedFullSettings = {
            ...(profile?.settings || {}),
            timer: newSettings
          };

          await supabase
            .from('profiles')
            .update({ settings: updatedFullSettings })
            .eq('id', user.id);
        }

        const { sessionType, status } = get();
        if (status === 'idle') {
          const newTotal = getSessionDuration(sessionType, newSettings);
          set({ totalSeconds: newTotal, remainingSeconds: newTotal });
        }
      },

      setStatus: (status) => set({ status, lastUpdatedAt: Date.now() }),
      setRemaining: (remainingSeconds) => set({ remainingSeconds, lastUpdatedAt: Date.now() }),
      setSessionType: (sessionType) => set({ sessionType }),
      setCurrentCycle: (currentCycle) => set({ currentCycle }),
      setTotalSeconds: (totalSeconds) => set({ totalSeconds }),
      setActiveTask: (activeTaskId) => set({ activeTaskId }),
      incrementCompletedSessions: () => 
        set((s) => ({ completedFocusSessions: s.completedFocusSessions + 1 })),
    }),
    {
      name: 'study-timer-v1',
      partialize: (state) => ({
        status: state.status,
        remainingSeconds: state.remainingSeconds,
        lastUpdatedAt: state.lastUpdatedAt,
        sessionType: state.sessionType,
        totalSeconds: state.totalSeconds,
        currentCycle: state.currentCycle,
        completedFocusSessions: state.completedFocusSessions,
        settings: state.settings,
        activeTaskId: state.activeTaskId,
      }),
    }
  )
);
