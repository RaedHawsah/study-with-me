'use client';

import { useTranslation } from 'react-i18next';
import { usePreferencesStore, type TimerShape } from '@/store/usePreferencesStore';

// ── Mini visual previews ───────────────────────────────────────────────────────

function CirclePreview({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" className="w-14 h-14" aria-hidden="true">
      <circle
        cx="28" cy="28" r="24"
        strokeWidth="3"
        stroke={active ? 'var(--primary)' : 'var(--border)'}
        fill={active ? 'var(--secondary)' : 'var(--muted)'}
      />
      <text
        x="28" y="33"
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill={active ? 'var(--primary)' : 'var(--muted-foreground)'}
        fontFamily="inherit"
      >
        25:00
      </text>
    </svg>
  );
}

function MinimalPreview({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" className="w-14 h-14" aria-hidden="true">
      <text
        x="28" y="35"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill={active ? 'var(--primary)' : 'var(--muted-foreground)'}
        fontFamily="inherit"
      >
        25:00
      </text>
    </svg>
  );
}

function CardPreview({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" className="w-14 h-14" aria-hidden="true">
      <rect
        x="4" y="12" width="48" height="32" rx="6"
        strokeWidth="2"
        stroke={active ? 'var(--primary)' : 'var(--border)'}
        fill={active ? 'var(--secondary)' : 'var(--muted)'}
      />
      <text
        x="28" y="33"
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill={active ? 'var(--primary)' : 'var(--muted-foreground)'}
        fontFamily="inherit"
      >
        25:00
      </text>
      {/* Progress bar */}
      <rect x="10" y="38" width="36" height="3" rx="1.5" fill={active ? 'var(--border)' : 'var(--border)'} />
      <rect x="10" y="38" width="20" height="3" rx="1.5" fill={active ? 'var(--primary)' : 'var(--muted-foreground)'} opacity="0.5" />
    </svg>
  );
}

// ── Shapes definition ──────────────────────────────────────────────────────────

const SHAPES: {
  id: TimerShape;
  labelKey: string;
  Preview: React.FC<{ active: boolean }>;
}[] = [
  { id: 'circular', labelKey: 'timerShape.circular', Preview: CirclePreview },
  { id: 'minimal',  labelKey: 'timerShape.minimal',  Preview: MinimalPreview },
  { id: 'card',     labelKey: 'timerShape.card',     Preview: CardPreview },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function TimerShapePicker() {
  const { t } = useTranslation('common');
  const { timerShape, setTimerShape } = usePreferencesStore();

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-medium text-foreground">{t('settings.timerShape')}</p>
      <div className="flex gap-3" role="radiogroup" aria-label={t('settings.timerShape')}>
        {SHAPES.map(({ id, labelKey, Preview }) => {
          const active = timerShape === id;
          return (
            <button
              key={id}
              id={`timer-shape-${id}`}
              role="radio"
              aria-checked={active}
              onClick={() => setTimerShape(id)}
              className="
                flex flex-col items-center gap-1.5 p-3 rounded-xl
                border-2 transition-all duration-200
                hover:scale-105 active:scale-95
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              "
              style={{
                borderColor: active ? 'var(--primary)' : 'var(--border)',
                background: active ? 'var(--secondary)' : 'var(--card)',
              }}
            >
              <Preview active={active} />
              <span
                className="text-xs font-medium"
                style={{ color: active ? 'var(--primary)' : 'var(--muted-foreground)' }}
              >
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
