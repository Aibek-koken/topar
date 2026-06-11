import type { BudgetTier, Category, Marketplace } from './types';

export const CATEGORIES: { key: Category; emoji: string }[] = [
  { key: 'electronics', emoji: '📱' },
  { key: 'fashion', emoji: '👟' },
  { key: 'home', emoji: '🏠' },
  { key: 'beauty', emoji: '💄' },
  { key: 'sports', emoji: '🏋️' },
];

export const CITIES = ['Алматы', 'Астана', 'Шымкент', 'Қарағанды', 'Ақтөбе'];

// USD price bands matching onboarding budget tiers (~₸10k / ₸50k boundaries)
export const BUDGET_BANDS: Record<BudgetTier, { min: number; max: number }> = {
  low: { min: 0, max: 20 },
  mid: { min: 20, max: 100 },
  high: { min: 100, max: Infinity },
};

export const BUDGET_TIERS: BudgetTier[] = ['low', 'mid', 'high'];

export const MARKETPLACES: Record<Marketplace, { label: string; color: string; textColor: string }> = {
  aliexpress: { label: 'AliExpress', color: '#FFE9E2', textColor: '#D02804' },
  amazon: { label: 'Amazon', color: '#E8EDF4', textColor: '#232F3E' },
  temu: { label: 'Temu', color: '#FFF3E0', textColor: '#E07000' },
};
