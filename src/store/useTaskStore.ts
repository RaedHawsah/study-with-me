import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  pomodorosCompleted: number;
  pomodorosEstimated: number;
}

export type TaskFilter = 'all' | 'active' | 'completed';

// ─── Store ────────────────────────────────────────────────────────────────────

interface TaskStore {
  tasks: Task[];
  filter: TaskFilter;
  loading: boolean;

  fetchTasks: (userId?: string) => Promise<void>;
  addTask: (text: string, pomodorosEstimated?: number) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  incrementPomodoro: (id: string) => Promise<void>;
  setFilter: (filter: TaskFilter) => void;
  updateTaskText: (id: string, text: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  clearStore: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  filter: 'all',
  loading: false,

  fetchTasks: async (userId?: string) => {
    set({ loading: true });
    try {
      const supabase = createClient();
      let effectiveUserId = userId;

      if (!effectiveUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        effectiveUserId = session?.user?.id;
      }

      if (!effectiveUserId) {
        set({ tasks: [], loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedTasks: Task[] = (data as any[]).map(t => ({
          id: t.id,
          text: t.title,
          completed: t.completed,
          createdAt: new Date(t.created_at).getTime(),
          pomodorosCompleted: t.pomodoros_completed,
          pomodorosEstimated: t.pomodoros_estimated,
        }));
        set({ tasks: mappedTasks });
      } else if (error) {
        console.warn('Failed to fetch tasks:', error);
      }
    } catch (e) {
      console.warn('Network error when fetching tasks:', e);
    }
    set({ loading: false });
  },

  addTask: async (text, pomodorosEstimated = 0) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert('Please sign in to add tasks and sync them to your cloud account.');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: session.user.id,
          title: trimmed,
          pomodoros_estimated: pomodorosEstimated,
        })
        .select()
        .single();

      if (error) {
        console.warn('Failed to add task:', error);
        return;
      }

      if (data) {
        const newTask: Task = {
          id: data.id,
          text: data.title,
          completed: data.completed,
          createdAt: new Date(data.created_at).getTime(),
          pomodorosCompleted: data.pomodoros_completed,
          pomodorosEstimated: data.pomodoros_estimated,
        };
        set((s) => ({ tasks: [newTask, ...s.tasks] }));
      }
    } catch (e) {
      console.warn('Network error when adding task:', e);
    }
  },

  toggleTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', id);

      if (error) {
        console.warn('Failed to toggle task:', error);
      } else {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          ),
        }));
      }
    } catch (e) {
      console.warn('Network error when toggling task:', e);
    }
  },

  deleteTask: async (id) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) {
        console.warn('Failed to delete task:', error);
      } else {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      }
    } catch (e) {
      console.warn('Network error when deleting task:', e);
    }
  },

  incrementPomodoro: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const newCount = task.pomodorosCompleted + 1;
    const isDone = task.pomodorosEstimated > 0 && newCount >= task.pomodorosEstimated;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({
          pomodoros_completed: newCount,
          completed: isDone ? true : task.completed,
        })
        .eq('id', id);

      if (error) {
        console.warn('Failed to increment pomodoro count:', error);
      } else {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  pomodorosCompleted: newCount,
                  completed: isDone ? true : t.completed,
                }
              : t
          ),
        }));
      }
    } catch (e) {
      console.warn('Network error when incrementing pomodoro:', e);
    }
  },

  setFilter: (filter) => set({ filter }),

  updateTaskText: async (id, text) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({ title: text })
        .eq('id', id);

      if (error) {
        console.warn('Failed to update task text:', error);
      } else {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, text } : t)),
        }));
      }
    } catch (e) {
      console.warn('Network error when updating task text:', e);
    }
  },

  clearCompleted: async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', session.user.id)
        .eq('completed', true);

      if (error) {
        console.warn('Failed to clear completed tasks:', error);
      } else {
        set((s) => ({ tasks: s.tasks.filter((t) => !t.completed) }));
      }
    } catch (e) {
      console.warn('Network error when clearing completed tasks:', e);
    }
  },

  clearStore: () => set({ tasks: [], filter: 'all', loading: false }),
}));
