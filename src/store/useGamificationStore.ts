import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PetType = 'CAT' | 'DOG' | 'FALCON' | 'EGG';

interface GamificationState {
  // Global stats
  totalXp: number;
  weeklyStudyMinutes: number;

  // Active pet
  activePetType: PetType | null;
  activePetName: string;

  // Actions
  addXp: (amount: number) => void;
  addStudyMinutes: (minutes: number) => void;
  setActivePet: (type: PetType, name: string) => void;
  resetProgress: () => void;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set) => ({
      totalXp: 0,
      weeklyStudyMinutes: 0,
      activePetType: 'CAT', // default cute cat
      activePetName: 'Luna',

      addXp: (amount) =>
        set((state) => ({ totalXp: state.totalXp + amount })),

      addStudyMinutes: (minutes) =>
        set((state) => ({
          weeklyStudyMinutes: state.weeklyStudyMinutes + minutes,
        })),

      setActivePet: (type, name) =>
        set({ activePetType: type, activePetName: name }),

      resetProgress: () =>
        set({
          totalXp: 0,
          weeklyStudyMinutes: 0,
        }),
    }),
    {
      name: 'swm-gamification-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Helpers to compute dynamic derived state
export const getLevelFromXp = (xp: number) => Math.max(1, Math.floor(xp / 500) + 1);
export const getProgressToNextLevel = (xp: number) => {
  const currentLevelXp = (getLevelFromXp(xp) - 1) * 500;
  const nextLevelXp = getLevelFromXp(xp) * 500;
  return {
    currentLevelXp,
    nextLevelXp,
    progressPercent: ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100,
  };
};
