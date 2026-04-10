'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Trash2, Link2, Unlink2 } from 'lucide-react';
import type { Task } from '@/store/useTaskStore';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onLink: () => void;
  onUnlink: () => void;
}

// ─── Pomodoro display ─────────────────────────────────────────────────────────

function PomodoroCount({ completed, estimated }: { completed: number; estimated: number }) {
  if (completed === 0 && estimated === 0) return null;
  return (
    <span className="text-xs text-muted-foreground tabular-nums flex-none whitespace-nowrap">
      🍅 {estimated > 0 ? `${completed}/${estimated}` : completed}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskItem({
  task,
  isActive,
  onToggle,
  onDelete,
  onLink,
  onUnlink,
}: TaskItemProps) {
  const { t }      = useTranslation('common');
  const [hovered, setHovered] = useState(false);

  return (
    <li
      className="
        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
        border transition-all duration-200
      "
      style={{
        background:   isActive ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent',
        borderColor:  isActive ? 'color-mix(in srgb, var(--primary) 25%, transparent)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Active indicator stripe */}
      {isActive && (
        <span
          className="absolute inset-y-2 start-0 w-0.5 rounded-full"
          style={{ background: 'var(--primary)' }}
          aria-hidden="true"
        />
      )}

      {/* Checkbox */}
      <button
        onClick={onToggle}
        aria-label={task.completed ? t('tasks.markActive') : t('tasks.complete')}
        className="
          flex-none flex items-center justify-center w-5 h-5 rounded-full border-2
          transition-all duration-200 hover:scale-110 active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        "
        style={{
          background:   task.completed ? 'var(--primary)' : 'transparent',
          borderColor:  task.completed ? 'var(--primary)' : 'var(--muted-foreground)',
        }}
      >
        {task.completed && (
          <Check size={11} color="white" strokeWidth={3} aria-hidden="true" />
        )}
      </button>

      {/* Task text */}
      <span
        className="flex-1 text-sm leading-snug"
        style={{
          color:          task.completed ? 'var(--muted-foreground)' : 'var(--foreground)',
          textDecoration: task.completed ? 'line-through' : 'none',
          textDecorationColor: 'var(--muted-foreground)',
        }}
      >
        {task.text}
      </span>

      {/* Pomodoro count */}
      <PomodoroCount
        completed={task.pomodorosCompleted}
        estimated={task.pomodorosEstimated}
      />

      {/* Action buttons — visible on hover or when active */}
      <div
        className="flex items-center gap-0.5 flex-none transition-opacity duration-200"
        style={{ opacity: hovered || isActive ? 1 : 0 }}
        aria-hidden={!hovered && !isActive}
      >
        {/* Link/Unlink — only for incomplete tasks */}
        {!task.completed && (
          <button
            onClick={isActive ? onUnlink : onLink}
            aria-label={isActive ? t('tasks.unlink') : t('tasks.linkToSession')}
            className="
              w-7 h-7 rounded-lg flex items-center justify-center
              transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
            "
            style={{
              background: isActive
                ? 'color-mix(in srgb, var(--primary) 15%, transparent)'
                : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
            }}
          >
            {isActive ? <Unlink2 size={13} /> : <Link2 size={13} />}
          </button>
        )}

        {/* Delete */}
        <button
          onClick={onDelete}
          aria-label={t('tasks.deleteTask')}
          className="
            w-7 h-7 rounded-lg flex items-center justify-center
            text-muted-foreground hover:text-red-500 hover:bg-red-500/10
            transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
        >
          <Trash2 size={13} />
        </button>
      </div>
    </li>
  );
}
