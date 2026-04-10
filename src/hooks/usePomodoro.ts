'use client';

/**
 * usePomodoro — owns the Web Worker lifecycle and co-ordinates between
 * useTimerStore and useTaskStore.
 *
 * Re-hydration: on mount it checks whether the timer was running when the
 * component last unmounted (tab switch / navigation) by comparing
 * lastUpdatedAt with Date.now() and adjusting remainingSeconds accordingly.
 *
 * Completion: plays a short ding, sends a browser notification (if granted),
 * advances to the next session, and awards a Pomodoro to the active task.
 */
import { useEffect, useRef, useCallback } from 'react';
import {
  useTimerStore,
  getSessionDuration,
  type SessionType,
} from '@/store/useTimerStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useGamificationStore } from '@/store/useGamificationStore';

// ─── Session colors (shared with UI components) ────────────────────────────────

export const SESSION_COLORS: Record<SessionType, string> = {
  focus:      'var(--primary)',
  shortBreak: '#22c55e',
  longBreak:  '#3b82f6',
};

// ─── Audio feedback ───────────────────────────────────────────────────────────

function playDing() {
  try {
    const ctx = new AudioContext();
    const notes = [660, 880, 1100];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t0 = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0.22, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    });
  } catch {
    // AudioContext not available (SSR / some browsers)
  }
}

// ─── Browser notification ─────────────────────────────────────────────────────

async function sendNotification(type: SessionType) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'denied') return;
  if (Notification.permission === 'default') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') return;
  }
  const isBreak = type !== 'focus';
  new Notification(isBreak ? '🎉 Focus session done!' : '⏰ Break is over!', {
    body: isBreak ? 'Great work — take a well-deserved break.' : 'Time to focus!',
    silent: true,
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePomodoro() {
  const store    = useTimerStore();
  const taskStore= useTaskStore();
  const workerRef     = useRef<Worker | null>(null);
  const completingRef = useRef(false); // guard against double-fire

  // ── Session advance (also called on skip, but then skipped=true) ─────────────
  const advanceSession = useCallback(
    (completedType: SessionType, skipped = false) => {
      const { settings, currentCycle, activeTaskId } = useTimerStore.getState();

      // Award Pomodoro to active task on a completed (non-skipped) focus session
      if (!skipped && completedType === 'focus' && activeTaskId) {
        taskStore.incrementPomodoro(activeTaskId);
      }
      // Award XP to global gamification and internal stats if perfectly completed
      if (!skipped && completedType === 'focus') {
        store.incrementCompletedSessions();
        const durationMinutes = Math.floor(settings.focusDuration);
        // Base formula: 2 XP per minute focused
        const xpEarned = durationMinutes * 2; 
        
        useGamificationStore.getState().addStudyMinutes(durationMinutes);
        useGamificationStore.getState().addXp(xpEarned);
      }

      // Determine next session type
      let nextType: SessionType;
      let nextCycle = currentCycle;

      if (completedType === 'focus') {
        if (currentCycle >= settings.cyclesBeforeLongBreak) {
          nextType = 'longBreak';
        } else {
          nextType = 'shortBreak';
        }
      } else {
        nextType = 'focus';
        if (completedType === 'longBreak') {
          nextCycle = 1;
        } else {
          nextCycle = currentCycle + 1;
        }
      }

      const newTotal  = getSessionDuration(nextType, settings);
      const autoStart = completedType === 'focus'
        ? settings.autoStartBreaks
        : settings.autoStartFocus;

      store.setCurrentCycle(nextCycle);
      store.setSessionType(nextType);
      store.setTotalSeconds(newTotal);
      store.setRemaining(newTotal);
      store.setStatus(autoStart ? 'running' : 'idle');

      if (autoStart && workerRef.current) {
        workerRef.current.postMessage({ type: 'START', totalSeconds: newTotal });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Worker lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker('/timerWorker.js');
    workerRef.current = worker;

    worker.onmessage = ({ data }) => {
      if (data.type === 'TICK') {
        useTimerStore.getState().setRemaining(data.remaining);
      } else if (data.type === 'DONE') {
        if (completingRef.current) return;
        completingRef.current = true;

        const type = useTimerStore.getState().sessionType;
        playDing();
        sendNotification(type);
        advanceSession(type);
        setTimeout(() => { completingRef.current = false; }, 600);
      }
    };

    // ── Re-hydrate after navigation ─────────────────────────────────────────────
    const { status, remainingSeconds, lastUpdatedAt, sessionType } =
      useTimerStore.getState();

    if (status === 'running') {
      const elapsed         = (Date.now() - lastUpdatedAt) / 1000;
      const actualRemaining = Math.max(0, remainingSeconds - elapsed);

      if (actualRemaining <= 0) {
        playDing();
        sendNotification(sessionType);
        advanceSession(sessionType);
      } else {
        store.setRemaining(Math.floor(actualRemaining));
        worker.postMessage({ type: 'START', totalSeconds: Math.floor(actualRemaining) });
      }
    }

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public controls ───────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (!workerRef.current) return;
    // Request notification permission proactively on first start
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    workerRef.current.postMessage({
      type: 'START',
      totalSeconds: useTimerStore.getState().remainingSeconds,
    });
    store.setStatus('running');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = useCallback(() => {
    workerRef.current?.postMessage({ type: 'PAUSE' });
    store.setStatus('paused');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resume = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'RESUME' });
    store.setStatus('running');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.postMessage({ type: 'STOP' });
    const { sessionType, settings } = useTimerStore.getState();
    const total = getSessionDuration(sessionType, settings);
    store.setStatus('idle');
    store.setRemaining(total);
    store.setTotalSeconds(total);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = useCallback(() => {
    workerRef.current?.postMessage({ type: 'STOP' });
    advanceSession(useTimerStore.getState().sessionType, true);
  }, [advanceSession]);

  const switchSession = useCallback((type: SessionType) => {
    workerRef.current?.postMessage({ type: 'STOP' });
    const { settings } = useTimerStore.getState();
    const total = getSessionDuration(type, settings);
    store.setStatus('idle');
    store.setSessionType(type);
    store.setTotalSeconds(total);
    store.setRemaining(total);
    // Reset cycle when switching to focus manually
    if (type === 'focus') store.setCurrentCycle(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { start, pause, resume, reset, skip, switchSession };
}
