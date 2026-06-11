import type { GroupBuy, Tier } from './types';

function sortedTiers(tiers: Tier[]): Tier[] {
  return [...tiers].sort((a, b) => a.min_qty - b.min_qty);
}

export function currentTier(tiers: Tier[], participants: number): Tier {
  const n = Math.max(participants, 1);
  const sorted = sortedTiers(tiers);
  let result = sorted[0];
  for (const tier of sorted) {
    if (tier.min_qty <= n) result = tier;
  }
  return result;
}

export function nextTier(tiers: Tier[], participants: number): Tier | null {
  const n = Math.max(participants, 1);
  return sortedTiers(tiers).find((t) => t.min_qty > n) ?? null;
}

export function gapToNext(tiers: Tier[], participants: number): number | null {
  const next = nextTier(tiers, participants);
  return next ? next.min_qty - participants : null;
}

export function discountedUsd(priceUsd: number, tier: Tier): number {
  return priceUsd * (1 - tier.discount_pct / 100);
}

export function currentPriceUsd(priceUsd: number, tiers: Tier[], participants: number): number {
  return discountedUsd(priceUsd, currentTier(tiers, participants));
}

export function bestTier(tiers: Tier[]): Tier {
  return sortedTiers(tiers)[sortedTiers(tiers).length - 1];
}

export function progress(participants: number, targetQty: number): number {
  if (targetQty <= 0) return 0;
  return Math.min(participants / targetQty, 1);
}

export function isExpired(group: GroupBuy, now: number = Date.now()): boolean {
  return group.status !== 'active' || new Date(group.deadline).getTime() <= now;
}
