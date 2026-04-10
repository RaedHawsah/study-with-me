'use client';

import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { SESSION_COLORS } from '@/hooks/usePomodoro';
import { ProgressRing } from './ProgressRing';
import type { TimerStatus, SessionType } from '@/store/useTimerStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface DisplayProps {
  remainingSeconds: number;
  totalSeconds: number;
  sessionType: SessionType;
  status: TimerStatus;
}

// ─── Circular (default) ───────────────────────────────────────────────────────

function CircularTimer({ remainingSeconds, totalSeconds, sessionType, status }: DisplayProps) {
  const { t } = useTranslation('common');
  const color    = SESSION_COLORS[sessionType];
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;

  return (
    <ProgressRing size={270} strokeWidth={10} progress={progress} color={color}>
      <div className="flex flex-col items-center select-none">
        <span
          className="text-6xl font-bold tabular-nums tracking-tighter"
          style={{ color: status === 'idle' ? 'var(--foreground)' : color }}
          aria-live="polite"
          aria-label={formatTime(remainingSeconds)}
        >
          {formatTime(remainingSeconds)}
        </span>
        <span
          className="text-xs font-bold uppercase tracking-widest mt-1.5"
          style={{ color }}
        >
          {t(`timer.${sessionType}`)}
        </span>
      </div>
    </ProgressRing>
  );
}

// ─── Minimal ─────────────────────────────────────────────────────────────────

function MinimalTimer({ remainingSeconds, sessionType, status }: Omit<DisplayProps, 'totalSeconds'>) {
  const { t } = useTranslation('common');
  const color  = SESSION_COLORS[sessionType];

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <span
        className="font-bold tabular-nums tracking-tighter leading-none"
        style={{
          fontSize: 'clamp(80px, 20vw, 128px)',
          color: status === 'idle' ? 'var(--foreground)' : color,
        }}
        aria-live="polite"
      >
        {formatTime(remainingSeconds)}
      </span>
      <span
        className="text-sm font-bold uppercase tracking-widest"
        style={{ color }}
      >
        {t(`timer.${sessionType}`)}
      </span>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CardTimer({ remainingSeconds, totalSeconds, sessionType, status }: DisplayProps) {
  const { t } = useTranslation('common');
  const color    = SESSION_COLORS[sessionType];
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;

  return (
    <div
      className="flex flex-col items-center gap-5 px-10 py-8 rounded-3xl border w-full max-w-sm select-none bg-card/60 backdrop-blur-md"
      style={{
        borderColor:  `${color}40`,
        boxShadow:    `0 0 40px ${color}18, var(--shadow-sm)`,
      }}
    >
      <span
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color }}
      >
        {t(`timer.${sessionType}`)}
      </span>
      <span
        className="text-8xl font-bold tabular-nums tracking-tighter"
        style={{ color: status === 'idle' ? 'var(--foreground)' : color }}
        aria-live="polite"
      >
        {formatTime(remainingSeconds)}
      </span>
      {/* Linear progress bar */}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width:      `${progress * 100}%`,
            background: color,
            transition: 'width 0.4s linear',
          }}
        />
      </div>
    </div>
  );
}

// ─── Main export (shape-aware) ────────────────────────────────────────────────

export function TimerDisplay(props: DisplayProps) {
  const { timerShape } = usePreferencesStore();

  if (timerShape === 'minimal') return <MinimalTimer {...props} />;
  if (timerShape === 'card')    return <CardTimer    {...props} />;
  return <CircularTimer {...props} />;
}
