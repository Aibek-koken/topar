import type { GroupBuy } from './types';

/** Extra discount verified (eSIM-bound) members see on top of the tier price. */
export const VERIFIED_BONUS_PCT = 2;

/**
 * How many participants of a group are eSIM-verified. Mocked with a
 * deterministic 80–95% ratio per group — the concept being demonstrated is
 * "group counters you can trust", not real attestation.
 */
export function verifiedCount(group: GroupBuy): number {
  const n = group.participants_count;
  if (n <= 1) return n;
  let h = 0;
  for (let i = 0; i < group.id.length; i++) h = (h * 31 + group.id.charCodeAt(i)) | 0;
  const ratio = 0.8 + (Math.abs(h) % 16) / 100;
  return Math.max(1, Math.min(n - 1, Math.round(n * ratio)));
}

export function withVerifiedBonusUsd(priceUsd: number): number {
  return priceUsd * (1 - VERIFIED_BONUS_PCT / 100);
}
