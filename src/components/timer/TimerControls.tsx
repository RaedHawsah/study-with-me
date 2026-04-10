'use client';

import { useTranslation } from 'react-i18next';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import type { TimerStatus } from '@/store/useTimerStore';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimerControlsProps {
  status: TimerStatus;
  sessionColor: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
}

// ─── Icon button helper ───────────────────────────────────────────────────────

function IconBtn({
  id,
  onClick,
  label,
  children,
}: {
  id: string;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      aria-label={label}
      className="
        flex items-center justify-center w-12 h-12 rounded-full
        bg-muted text-muted-foreground
        hover:bg-muted/70 hover:text-foreground
        transition-all duration-200 hover:scale-105 active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
      "
    >
      {children}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimerControls({
  status,
  sessionColor,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
}: TimerControlsProps) {
  const { t } = useTranslation('common');

  const handleMain = () => {
    if (status === 'running') onPause();
    else if (status === 'paused') onResume();
    else onStart();
  };

  const mainLabel =
    status === 'running' ? t('timer.pause') :
    status === 'paused'  ? t('timer.resume') :
                           t('timer.start');

  const MainIcon = status === 'running' ? Pause : Play;

  return (
    <div className="flex items-center gap-4">
      {/* Reset */}
      <IconBtn id="timer-reset" onClick={onReset} label={t('timer.reset')}>
        <RotateCcw size={19} />
      </IconBtn>

      {/* Start / Pause / Resume — primary action */}
      <button
        id="timer-main-action"
        onClick={handleMain}
        aria-label={mainLabel}
        className="
          flex items-center gap-2.5 px-9 py-3.5 rounded-full
          text-sm font-bold text-white
          transition-all duration-200 hover:scale-105 active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        "
        style={{
          background: sessionColor,
          boxShadow:  `0 0 20px -2px var(--accent), 0 8px 16px -4px ${sessionColor}80`,
        }}
      >
        <MainIcon size={20} strokeWidth={2.5} fill="white" aria-hidden="true" />
        <span>{mainLabel}</span>
      </button>

      {/* Skip */}
      <IconBtn id="timer-skip" onClick={onSkip} label={t('timer.skip')}>
        <SkipForward size={19} />
      </IconBtn>
    </div>
  );
}
