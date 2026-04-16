'use client';

/**
 * TimerView — the complete timer page Client Component.
 *
 * Layout (top → bottom):
 *   1. Session selector tabs (Focus / Short Break / Long Break)
 *   2. Timer display (shape-aware: circular | minimal | card)
 *   3. Cycle progress dots
 *   4. Controls (Reset / Start|Pause|Resume / Skip)
 *   5. Active task badge (if a task is linked)
 *   6. Collapsible timer settings
 *   7. Divider
 *   8. Task list
 */
import { useTranslation } from 'react-i18next';
import { useTimerStore } from '@/store/useTimerStore';
import { useTaskStore } from '@/store/useTaskStore';
import { usePomodoro, SESSION_COLORS } from '@/hooks/usePomodoro';
import { SessionSelector } from './SessionSelector';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { TimerSettings } from './TimerSettings';
import { TaskList } from '@/components/tasks/TaskList';
import { PetCompanion } from '@/components/gamification/PetCompanion';
import { StreakBadge } from '@/components/gamification/StreakBadge';

export function TimerView() {
  const { t } = useTranslation('common');

  const {
    status,
    sessionType,
    currentCycle,
    remainingSeconds,
    totalSeconds,
    settings,
    activeTaskId,
  } = useTimerStore();

  const { tasks } = useTaskStore();
  const { start, pause, resume, reset, skip, switchSession } = usePomodoro();

  const sessionColor = SESSION_COLORS[sessionType];
  const activeTask   = tasks.find((tk) => tk.id === activeTaskId);

  // Cycle dots (only shown during focus sessions)
  const cycleDots = Array.from(
    { length: settings.cyclesBeforeLongBreak },
    (_, i) => i + 1,
  );

  return (
    <div className="flex flex-col gap-8 items-center max-w-xl mx-auto py-2 w-full">
      
      {/* ── Gamification Header ────────────────────────────────────────── */}
      <div className="w-full flex justify-center">
        <StreakBadge />
      </div>

      {/* ── Session selector ──────────────────────────────────────────────── */}
      <div className="w-full">
        <SessionSelector
          current={sessionType}
          disabled={status === 'running'}
          onSelect={switchSession}
        />
      </div>

      {/* ── Timer + Controls block ────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-6 w-full">
        <TimerDisplay
          remainingSeconds={remainingSeconds}
          totalSeconds={totalSeconds}
          sessionType={sessionType}
          status={status}
        />

        {/* Cycle progress dots */}
        {sessionType === 'focus' && (
          <div
            className="flex items-center gap-2"
            role="status"
            aria-label={`${t('timer.cycle')} ${currentCycle} ${t('timer.of')} ${settings.cyclesBeforeLongBreak}`}
          >
            {cycleDots.map((n) => {
              const isCurrent   = n === currentCycle;
              const isCompleted = n < currentCycle;
              return (
                <span
                  key={n}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width:      isCurrent ? '10px' : '8px',
                    height:     isCurrent ? '10px' : '8px',
                    background: isCompleted || isCurrent ? sessionColor : 'var(--border)',
                    opacity:    isCompleted || isCurrent ? 1 : 0.4,
                    transform:  isCurrent ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Controls */}
        <TimerControls
          status={status}
          sessionColor={sessionColor}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onReset={reset}
          onSkip={skip}
        />

        {/* Active task badge */}
        {activeTask && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl max-w-xs w-full"
            style={{
              background:  `color-mix(in srgb, ${sessionColor} 10%, transparent)`,
              border:      `1px solid color-mix(in srgb, ${sessionColor} 28%, transparent)`,
            }}
          >
            <span className="text-xs" aria-hidden="true">🍅</span>
            <span className="flex-1 text-sm font-medium text-foreground truncate">
              {activeTask.text}
            </span>
            <span
              className="text-xs text-muted-foreground tabular-nums"
            >
              {activeTask.pomodorosCompleted}
              {activeTask.pomodorosEstimated > 0 && `/${activeTask.pomodorosEstimated}`}
            </span>
          </div>
        )}

        {/* 3D Pet Companion */}
        <div className="w-full max-w-sm mt-2">
          <PetCompanion />
        </div>

        {/* Timer settings (collapsible) */}
        <TimerSettings />
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="w-full h-px bg-border" aria-hidden="true" />

      {/* ── Task list ─────────────────────────────────────────────────────── */}
      <div className="w-full pb-safe">
        <TaskList />
      </div>
    </div>
  );
}
