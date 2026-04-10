/**
 * Task Store — persists the to-do list with Pomodoro counters.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  pomodorosCompleted: number;
  pomodorosEstimated: number; // 0 = no estimate
}

export type TaskFilter = 'all' | 'active' | 'completed';

// ─── Store ────────────────────────────────────────────────────────────────────

interface TaskStore {
  tasks: Task[];
  filter: TaskFilter;

  addTask: (text: string, pomodorosEstimated?: number) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  incrementPomodoro: (id: string) => void;
  setFilter: (filter: TaskFilter) => void;
  clearCompleted: () => void;
  updateTaskText: (id: string, text: string) => void;
}

function makeId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],
      filter: 'all',

      addTask: (text, pomodorosEstimated = 0) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        set((s) => ({
          tasks: [
            {
              id: makeId(),
              text: trimmed,
              completed: false,
              createdAt: Date.now(),
              pomodorosCompleted: 0,
              pomodorosEstimated,
            },
            ...s.tasks,
          ],
        }));
      },

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: !t.completed,
                  completedAt: !t.completed ? Date.now() : undefined,
                }
              : t,
          ),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      incrementPomodoro: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 }
              : t,
          ),
        })),

      setFilter: (filter) => set({ filter }),

      clearCompleted: () =>
        set((s) => ({ tasks: s.tasks.filter((t) => !t.completed) })),

      updateTaskText: (id, text) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, text } : t)),
        })),
    }),
    {
      name: 'swm-tasks-v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
