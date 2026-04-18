'use client';

/**
 * usePomodoro — owns the Web Worker lifecycle and co-ordinates between
 * useTimerStore and useTaskStore.
 *
 * Re-hydration: uses syncTimerWithReality for wall-clock accuracy.
 *
 * Completion: plays a short ding, sends an audible browser notification,
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
import { AmbientSoundEngine } from '@/lib/audioEngine';

// ─── Session colors ───────────────────────────────────────────────────────────

export const SESSION_COLORS: Record<SessionType, string> = {
  focus:      'var(--primary)',
  shortBreak: '#22c55e',
  longBreak:  '#3b82f6',
};

// ─── Audio feedback ───────────────────────────────────────────────────────────

function playDing() {
  // Use the professional engine for punctual background delivery
  AmbientSoundEngine.getInstance().schedulePomodoroAlarm(0);
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
    silent: false, // Ensure system sound fires
  });
}

let globalWorker: Worker | null = null;
let completing = false;
let initialized = false;

// ── Session Sync (re-calculates remaining based on wall-clock) ───────────────
function syncTimerWithReality() {
  const { status, remainingSeconds, lastUpdatedAt, sessionType } = useTimerStore.getState();
  if (status === 'running') {
    const elapsed = (Date.now() - lastUpdatedAt) / 1000;
    const actualRemaining = Math.max(0, remainingSeconds - elapsed);

    if (actualRemaining <= 0) {
      if (!completing) {
        completing = true;
        playDing();
        sendNotification(sessionType);
        advanceSession(sessionType);
        setTimeout(() => { completing = false; }, 600);
      }
    } else {
      const rounded = Math.floor(actualRemaining);
      // We DONT use setRemaining here because it would update lastUpdatedAt to NOW
      // Instead we use a silent update or just let the worker handle it
      // Actually, updating the store is fine as long as we also update the worker and alarm
      useTimerStore.getState().setRemaining(rounded);
      globalWorker?.postMessage({ type: 'START', totalSeconds: rounded });
      AmbientSoundEngine.getInstance().schedulePomodoroAlarm(rounded);
    }
  }
}

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
    AmbientSoundEngine.getInstance().schedulePomodoroAlarm(newTotal);
  } else {
    AmbientSoundEngine.getInstance().cancelPomodoroAlarm();
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

  // ── Sync Listeners ──
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncTimerWithReality();
  });
  window.addEventListener('focus', syncTimerWithReality);

  // ── Initial Sync ──
  syncTimerWithReality();
}

// ── Initializer Component ────────────────────────────────────────────────────
export function GlobalTimerInitializer() {
  useEffect(() => {
    initGlobalTimer();
  }, []);
  return null;
}

// ── Hook for UI controls ──────────────────────────────────────────────────────
export function usePomodoro() {
  const store = useTimerStore();

  const start = useCallback(() => {
    if (!globalWorker) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const currentRemaining = useTimerStore.getState().remainingSeconds;
    globalWorker.postMessage({
      type: 'START',
      totalSeconds: currentRemaining,
    });
    AmbientSoundEngine.getInstance().schedulePomodoroAlarm(currentRemaining);
    store.setStatus('running');
  }, [store]);

  const pause = useCallback(() => {
    globalWorker?.postMessage({ type: 'PAUSE' });
    AmbientSoundEngine.getInstance().cancelPomodoroAlarm();
    store.setStatus('paused');
  }, [store]);

  const resume = useCallback(() => {
    if (!globalWorker) return;
    const currentRemaining = useTimerStore.getState().remainingSeconds;
    globalWorker.postMessage({ type: 'RESUME' });
    AmbientSoundEngine.getInstance().schedulePomodoroAlarm(currentRemaining);
    store.setStatus('running');
  }, [store]);

  const reset = useCallback(() => {
    globalWorker?.postMessage({ type: 'STOP' });
    AmbientSoundEngine.getInstance().cancelPomodoroAlarm();
    const { sessionType, settings } = useTimerStore.getState();
    const total = getSessionDuration(sessionType, settings);
    store.setStatus('idle');
    store.setRemaining(total);
    store.setTotalSeconds(total);
  }, [store]);

  const skip = useCallback(() => {
    globalWorker?.postMessage({ type: 'STOP' });
    AmbientSoundEngine.getInstance().cancelPomodoroAlarm();
    advanceSession(useTimerStore.getState().sessionType, true);
  }, []);

  const switchSession = useCallback((type: SessionType) => {
    globalWorker?.postMessage({ type: 'STOP' });
    AmbientSoundEngine.getInstance().cancelPomodoroAlarm();
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
