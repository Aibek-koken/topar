import { create } from 'zustand';
import type { BudgetTier, Category } from '@/lib/types';

interface OnboardingState {
  interests: Category[];
  budget: BudgetTier | null;
  city: string;
  toggleInterest: (category: Category) => void;
  setBudget: (tier: BudgetTier) => void;
  setCity: (city: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  interests: [],
  budget: null,
  city: 'Алматы',

  toggleInterest: (category) => {
    const current = get().interests;
    set({
      interests: current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category],
    });
  },

  setBudget: (tier) => set({ budget: tier }),
  setCity: (city) => set({ city }),
  reset: () => set({ interests: [], budget: null, city: 'Алматы' }),
}));
