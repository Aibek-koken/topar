export type Lang = 'ru' | 'kk' | 'en';

export type LocalizedText = {
  ru: string;
  kk?: string;
  en?: string;
};

export type Category = 'electronics' | 'fashion' | 'home' | 'beauty' | 'sports';

export type Marketplace = 'aliexpress' | 'amazon' | 'temu';

export type BudgetTier = 'low' | 'mid' | 'high';

export interface Product {
  id: string;
  slug: string;
  title: LocalizedText;
  description?: LocalizedText;
  category: Category;
  marketplace: Marketplace;
  price_usd: number;
  rating: number;
  orders_count: number;
  image_url: string;
}

export interface Tier {
  min_qty: number;
  discount_pct: number;
}

export type GroupBuyStatus = 'active' | 'completed' | 'expired';

export interface GroupBuy {
  id: string;
  product_id: string;
  tiers: Tier[];
  target_qty: number;
  participants_count: number;
  deadline: string; // ISO timestamp
  status: GroupBuyStatus;
  product?: Product;
}

export interface Profile {
  id: string;
  display_name: string;
  city: string;
  budget_tier: BudgetTier | null;
  interests: Category[];
  language: Lang;
  esim_verified: boolean;
  onboarding_completed: boolean;
}
