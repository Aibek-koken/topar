import { create } from 'zustand';
import { currentTier } from '@/lib/groupBuy';
import type { GroupBuy, Product, Tier } from '@/lib/types';

export interface CelebrationEvent {
  groupId: string;
  product: Product;
  fromTier: Tier;
  toTier: Tier;
  participants: number;
}

interface CelebrationState {
  event: CelebrationEvent | null;
  fire: (event: CelebrationEvent) => void;
  clear: () => void;
}

let lastKey = '';
let lastAt = 0;

export const useCelebrationStore = create<CelebrationState>((set) => ({
  event: null,

  fire: (event) => {
    // The same crossing can be reported twice (local refresh + realtime tick)
    const key = `${event.groupId}:${event.toTier.min_qty}`;
    const now = Date.now();
    if (key === lastKey && now - lastAt < 8000) return;
    lastKey = key;
    lastAt = now;
    set({ event });
  },

  clear: () => set({ event: null }),
}));

/**
 * Compare two snapshots of the groups list and report the first upward tier
 * crossing (e.g. 9 → 10 participants unlocking −15%).
 */
export function detectTierCross(
  prev: GroupBuy[],
  next: GroupBuy[],
  products: Product[]
): CelebrationEvent | null {
  for (const g of next) {
    const old = prev.find((p) => p.id === g.id);
    if (!old || g.participants_count <= old.participants_count) continue;
    const fromTier = currentTier(g.tiers, old.participants_count);
    const toTier = currentTier(g.tiers, g.participants_count);
    if (toTier.discount_pct > fromTier.discount_pct) {
      const product = g.product ?? products.find((p) => p.id === g.product_id);
      if (!product) continue;
      return {
        groupId: g.id,
        product,
        fromTier,
        toTier,
        participants: g.participants_count,
      };
    }
  }
  return null;
}
