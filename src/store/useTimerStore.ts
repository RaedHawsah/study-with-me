/**
 * Timer Store — persists settings and session progress.
 * Runtime state (status, remainingSeconds, lastUpdatedAt) is also persisted
 * so the usePomodoro hook can re-hydrate correctly after tab navigation.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  cyclesBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface TimerStore {
  // ── Runtime state (also persisted for re-hydration) ──
  status: TimerStatus;
  remainingSeconds: number;
  /** Wall-clock timestamp when remainingSeconds was last updated by the worker */
  lastUpdatedAt: number;

  // ── Session state ──
  sessionType: SessionType;
  totalSeconds: number;
  currentCycle: number;
  completedFocusSessions: number;

  // ── User preferences ──
  settings: TimerSettings;
  activeTaskId: string | null;

  // ── Setters (called by usePomodoro hook) ──
  setStatus: (s: TimerStatus) => void;
  setRemaining: (s: number) => void;
  setSessionType: (t: SessionType) => void;
  setCurrentCycle: (n: number) => void;
  setTotalSeconds: (n: number) => void;
  setActiveTask: (id: string | null) => void;
  incrementCompletedSessions: () => void;
  updateSettings: (updates: Partial<TimerSettings>) => void;
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

      setStatus:    (status) => set({ status, lastUpdatedAt: Date.now() }),
      setRemaining: (remainingSeconds) => set({ remainingSeconds, lastUpdatedAt: Date.now() }),
      setSessionType:  (sessionType) => set({ sessionType }),
      setCurrentCycle: (currentCycle) => set({ currentCycle }),
      setTotalSeconds: (totalSeconds) => set({ totalSeconds }),
      setActiveTask:   (activeTaskId) => set({ activeTaskId }),

      incrementCompletedSessions: () =>
        set((s) => ({ completedFocusSessions: s.completedFocusSessions + 1 })),

      updateSettings: (updates) => {
        const newSettings = { ...get().settings, ...updates };
        const { sessionType, status } = get();
        const newTotal = getSessionDuration(sessionType, newSettings);
        if (status === 'idle') {
          set({
            settings: newSettings,
            totalSeconds: newTotal,
            remainingSeconds: newTotal,
          });
        } else {
          set({ settings: newSettings });
        }
      },
    }),
    {
      name: 'swm-timer-v2',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
