'use client';

import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';
import { useTaskStore, type TaskFilter } from '@/store/useTaskStore';
import { useTimerStore } from '@/store/useTimerStore';
import { TaskItem } from './TaskItem';
import { AddTaskForm } from './AddTaskForm';

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTERS: { id: TaskFilter; labelKey: string }[] = [
  { id: 'all',       labelKey: 'tasks.all' },
  { id: 'active',    labelKey: 'tasks.active' },
  { id: 'completed', labelKey: 'tasks.done' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskList() {
  const { t }           = useTranslation('common');
  const {
    tasks,
    filter,
    addTask,
    toggleTask,
    deleteTask,
    setFilter,
    clearCompleted,
  } = useTaskStore();
  const { activeTaskId, setActiveTask } = useTimerStore();

  // Filter tasks for display
  const displayed = tasks.filter((task) => {
    if (filter === 'active')    return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const activeCount    = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  const handleDelete = (id: string) => {
    if (activeTaskId === id) setActiveTask(null);
    deleteTask(id);
  };

  return (
    <section aria-labelledby="tasks-heading" className="flex flex-col gap-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <h2
          id="tasks-heading"
          className="flex items-center gap-2 text-base font-semibold text-foreground"
        >
          <ClipboardList size={17} aria-hidden="true" />
          {t('tasks.title')}
          {tasks.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({activeCount} {t('tasks.active').toLowerCase()})
            </span>
          )}
        </h2>

        {/* Filter tabs */}
        <div
          className="flex gap-0.5 p-0.5 rounded-lg bg-muted"
          role="tablist"
          aria-label={t('tasks.filterLabel')}
        >
          {FILTERS.map(({ id, labelKey }) => (
            <button
              key={id}
              id={`task-filter-${id}`}
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className="
                px-2.5 py-1 text-xs font-medium rounded-md
                transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              "
              style={{
                background: filter === id ? 'var(--card)' : 'transparent',
                color:      filter === id ? 'var(--primary)' : 'var(--muted-foreground)',
                boxShadow:  filter === id ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Add task ───────────────────────────────────────────────────────── */}
      <AddTaskForm onAdd={(text, est) => addTask(text, est)} />

      {/* ── Task list ──────────────────────────────────────────────────────── */}
      {displayed.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 select-none">
          {t('tasks.noTasks')}
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5" role="list">
          {displayed.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isActive={activeTaskId === task.id}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => handleDelete(task.id)}
              onLink={() => setActiveTask(task.id)}
              onUnlink={() => setActiveTask(null)}
            />
          ))}
        </ul>
      )}

      {/* ── Clear completed ────────────────────────────────────────────────── */}
      {completedCount > 0 && (
        <button
          onClick={clearCompleted}
          className="
            self-end text-xs text-muted-foreground hover:text-foreground
            transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded
          "
        >
          {t('tasks.clearCompleted')} ({completedCount})
        </button>
      )}
    </section>
  );
}
