'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2, ChevronDown } from 'lucide-react';
import { useTimerStore, type TimerSettings } from '@/store/useTimerStore';

// ─── Stepper input ────────────────────────────────────────────────────────────

function Stepper({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
          className="
            w-7 h-7 rounded-lg bg-muted text-foreground
            hover:bg-muted/70 transition-colors flex items-center justify-center
            font-bold text-base leading-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
        >
          −
        </button>
        <span className="text-sm font-bold tabular-nums w-9 text-center text-foreground">
          {value}{suffix}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label}`}
          className="
            w-7 h-7 rounded-lg bg-muted text-foreground
            hover:bg-muted/70 transition-colors flex items-center justify-center
            font-bold text-base leading-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 select-none cursor-pointer">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-9 h-5 rounded-full transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}
        `}
        style={{ direction: 'ltr' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>
    </label>
  );
}

// ─── Boolean setting keys ─────────────────────────────────────────────────────

type BoolKey = Extract<
  keyof TimerSettings,
  'autoStartBreaks' | 'autoStartFocus'
>;

const BOOL_SETTINGS: { key: BoolKey; labelKey: string }[] = [
  { key: 'autoStartBreaks', labelKey: 'timer.autoStartBreaks' },
  { key: 'autoStartFocus',  labelKey: 'timer.autoStartFocus' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TimerSettings() {
  const { t }                     = useTranslation('common');
  const { settings, updateSettings } = useTimerStore();
  const [open, setOpen]           = useState(false);

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-3">
      {/* Toggle button */}
      <button
        id="timer-settings-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="
          flex items-center gap-1.5
          text-xs text-muted-foreground hover:text-foreground
          transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded
        "
      >
        <Settings2 size={13} aria-hidden="true" />
        <span>{t('timer.settings')}</span>
        <ChevronDown
          size={13}
          aria-hidden="true"
          style={{
            transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* Collapsible settings panel */}
      {open && (
        <div className="w-full p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-2xl flex flex-col gap-5">
          {/* Duration steppers */}
          <div className="grid grid-cols-3 gap-4 place-items-center">
            <Stepper
              label={t('timer.focusDuration')}
              value={settings.focusDuration}
              min={1} max={90}
              suffix={t('timer.minutesSuffix')}
              onChange={(v) => updateSettings({ focusDuration: v })}
            />
            <Stepper
              label={t('timer.shortBreakDuration')}
              value={settings.shortBreakDuration}
              min={1} max={30}
              suffix={t('timer.minutesSuffix')}
              onChange={(v) => updateSettings({ shortBreakDuration: v })}
            />
            <Stepper
              label={t('timer.longBreakDuration')}
              value={settings.longBreakDuration}
              min={5} max={60}
              suffix={t('timer.minutesSuffix')}
              onChange={(v) => updateSettings({ longBreakDuration: v })}
            />
          </div>

          {/* Cycles stepper */}
          <div className="flex justify-center">
            <Stepper
              label={t('timer.cyclesBeforeLongBreak')}
              value={settings.cyclesBeforeLongBreak}
              min={1} max={8}
              onChange={(v) => updateSettings({ cyclesBeforeLongBreak: v })}
            />
          </div>

          {/* Auto-start toggles */}
          <div className="flex flex-col gap-3">
            {BOOL_SETTINGS.map(({ key, labelKey }) => (
              <Toggle
                key={key}
                label={t(labelKey)}
                checked={settings[key] as boolean}
                onChange={(v) => updateSettings({ [key]: v } as Partial<TimerSettings>)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
