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

let globalWorker: Worker | null = null;
let completing = false;
let initialized = false;

// ── Session advance (also called on skip, but then skipped=true) ─────────────
function advanceSession(completedType: SessionType, skipped = false) {
  const store = useTimerStore.getState();
  const { settings, currentCycle, activeTaskId } = store;

  if (!skipped && completedType === 'focus' && activeTaskId) {
    useTaskStore.getState().incrementPomodoro(activeTaskId);
  }

  if (!skipped && completedType === 'focus') {
    const durationMinutes = Math.floor(settings.focusDuration);
    useGamificationStore.getState().logStudySession({
      type: 'focus',
      duration: durationMinutes,
      taskId: activeTaskId
    });
  }

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

  const newTotal = getSessionDuration(nextType, settings);
  const autoStart =
    completedType === 'focus' ? settings.autoStartBreaks : settings.autoStartFocus;

  store.setCurrentCycle(nextCycle);
  store.setSessionType(nextType);
  store.setTotalSeconds(newTotal);
  store.setRemaining(newTotal);
  store.setStatus(autoStart ? 'running' : 'idle');

  if (autoStart && globalWorker) {
    globalWorker.postMessage({ type: 'START', totalSeconds: newTotal });
  }
}

// ── Worker lifecycle Singleton ────────────────────────────────────────────────
export function initGlobalTimer() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const worker = new Worker('/timerWorker.js');
  globalWorker = worker;

  worker.onmessage = ({ data }) => {
    if (data.type === 'TICK') {
      useTimerStore.getState().setRemaining(data.remaining);
    } else if (data.type === 'DONE') {
      if (completing) return;
      completing = true;

      const type = useTimerStore.getState().sessionType;
      playDing();
      sendNotification(type);
      advanceSession(type);
      setTimeout(() => {
        completing = false;
      }, 600);
    }
  };

  // ── Re-hydrate on startup ──
  const { status, remainingSeconds, lastUpdatedAt, sessionType } = useTimerStore.getState();

  if (status === 'running') {
    const elapsed = (Date.now() - lastUpdatedAt) / 1000;
    const actualRemaining = Math.max(0, remainingSeconds - elapsed);

    if (actualRemaining <= 0) {
      playDing();
      sendNotification(sessionType);
      advanceSession(sessionType);
    } else {
      useTimerStore.getState().setRemaining(Math.floor(actualRemaining));
      worker.postMessage({ type: 'START', totalSeconds: Math.floor(actualRemaining) });
    }
  }
}

// ── Initializer Component (place in layout or NavShell) ──────────────────────
export function GlobalTimerInitializer() {
  useEffect(() => {
    initGlobalTimer();
  }, []);
  return null;
}

// ── Hook for UI controls ──────────────────────────────────────────────────────
export function usePomodoro() {
  const store = useTimerStore();

  // ── Public controls ───────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (!globalWorker) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    globalWorker.postMessage({
      type: 'START',
      totalSeconds: useTimerStore.getState().remainingSeconds,
    });
    store.setStatus('running');
  }, [store]);

  const pause = useCallback(() => {
    globalWorker?.postMessage({ type: 'PAUSE' });
    store.setStatus('paused');
  }, [store]);

  const resume = useCallback(() => {
    if (!globalWorker) return;
    globalWorker.postMessage({ type: 'RESUME' });
    store.setStatus('running');
  }, [store]);

  const reset = useCallback(() => {
    globalWorker?.postMessage({ type: 'STOP' });
    const { sessionType, settings } = useTimerStore.getState();
    const total = getSessionDuration(sessionType, settings);
    store.setStatus('idle');
    store.setRemaining(total);
    store.setTotalSeconds(total);
  }, [store]);

  const skip = useCallback(() => {
    globalWorker?.postMessage({ type: 'STOP' });
    advanceSession(useTimerStore.getState().sessionType, true);
  }, []);

  const switchSession = useCallback((type: SessionType) => {
    globalWorker?.postMessage({ type: 'STOP' });
    const { settings } = useTimerStore.getState();
    const total = getSessionDuration(type, settings);
    store.setStatus('idle');
    store.setSessionType(type);
    store.setTotalSeconds(total);
    store.setRemaining(total);
    if (type === 'focus') store.setCurrentCycle(1);
  }, [store]);
  
  const { status } = store;

  return { start, pause, resume, reset, skip, switchSession, status };
}
