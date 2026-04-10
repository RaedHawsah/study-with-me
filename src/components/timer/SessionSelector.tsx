'use client';

import { useTranslation } from 'react-i18next';
import type { SessionType } from '@/store/useTimerStore';
import { SESSION_COLORS } from '@/hooks/usePomodoro';

// ─── Types ────────────────────────────────────────────────────────────────────

const SESSIONS: { id: SessionType; labelKey: string }[] = [
  { id: 'focus',      labelKey: 'timer.focus' },
  { id: 'shortBreak', labelKey: 'timer.shortBreak' },
  { id: 'longBreak',  labelKey: 'timer.longBreak' },
];

interface SessionSelectorProps {
  current: SessionType;
  disabled: boolean;
  onSelect: (type: SessionType) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionSelector({
  current,
  disabled,
  onSelect,
}: SessionSelectorProps) {
  const { t } = useTranslation('common');

  return (
    <div
      className="flex gap-1 p-1 rounded-xl bg-muted"
      role="tablist"
      aria-label={t('timer.sessionSelector')}
    >
      {SESSIONS.map(({ id, labelKey }) => {
        const active = current === id;
        return (
          <button
            key={id}
            id={`session-tab-${id}`}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => !disabled && onSelect(id)}
            className="
              flex-1 px-3 py-1.5 rounded-lg
              text-xs font-semibold
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
            "
            style={{
              background: active ? 'var(--card)' : 'transparent',
              color:      active ? SESSION_COLORS[id] : 'var(--muted-foreground)',
              boxShadow:  active ? 'var(--shadow-sm)' : 'none',
              transform:  active ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}
