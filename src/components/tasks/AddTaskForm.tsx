'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddTaskFormProps {
  onAdd: (text: string, estimatedPomodoros: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const { t }    = useTranslation('common');
  const [text, setText]         = useState('');
  const [estimate, setEstimate] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim(), estimate);
    setText('');
    setEstimate(0);
    inputRef.current?.focus();
  };

  const hasText = text.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2" aria-label={t('tasks.add')}>
      {/* Text input row */}
      <div
        className="
          flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border
          glass shadow-lg transition-colors duration-200
          hover:border-primary/40 focus-within:border-primary border-white/10
        "
        style={{ borderColor: 'var(--border)' }}
      >
        <Plus size={15} className="text-muted-foreground flex-none" aria-hidden="true" />

        <input
          id="add-task-input"
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('tasks.placeholder')}
          maxLength={120}
          className="
            flex-1 bg-transparent text-sm text-foreground
            placeholder:text-muted-foreground outline-none
          "
        />

        {/* Pomodoro estimate — appears when user starts typing */}
        {hasText && (
          <div
            className="flex items-center gap-1 border-s border-border ps-2"
            style={{ direction: 'ltr' }}
          >
            <span className="text-xs" aria-hidden="true">🍅</span>
            <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
              <button 
                type="button" 
                onClick={() => setEstimate(Math.max(0, estimate - 1))}
                className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors leading-none"
                aria-label="Decrease Pomodoros"
              >
                −
              </button>
              <span className="w-5 text-center text-xs font-semibold text-foreground tabular-nums">
                {estimate}
              </span>
              <button 
                type="button"
                onClick={() => setEstimate(Math.min(20, estimate + 1))}
                className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors leading-none"
                aria-label="Increase Pomodoros"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={!hasText}
        className="
          px-4 py-2 rounded-xl text-sm font-semibold
          bg-primary text-primary-foreground hover:bg-primary-hover
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200 hover:scale-105 active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        "
      >
        {t('tasks.add')}
      </button>
    </form>
  );
}
