import { BUDGET_BANDS } from './constants';
import { isExpired, progress } from './groupBuy';
import type { BudgetTier, GroupBuy, Product, Profile } from './types';

function budgetBandOf(priceUsd: number): BudgetTier {
  if (priceUsd < BUDGET_BANDS.low.max) return 'low';
  if (priceUsd < BUDGET_BANDS.mid.max) return 'mid';
  return 'high';
}

const BAND_ORDER: BudgetTier[] = ['low', 'mid', 'high'];

function budgetFit(priceUsd: number, tier: BudgetTier | null): number {
  if (!tier) return 0.5;
  const distance = Math.abs(BAND_ORDER.indexOf(budgetBandOf(priceUsd)) - BAND_ORDER.indexOf(tier));
  if (distance === 0) return 1;
  if (distance === 1) return 0.4;
  return 0;
}

// log10 keeps an 80 000-order bestseller from flattening everything else
function popularity(product: Product): number {
  const orders = Math.min(Math.log10(product.orders_count + 1) / 5, 1);
  const rating = product.rating / 5;
  return 0.6 * orders + 0.4 * rating;
}

function groupBoost(group: GroupBuy | undefined): number {
  if (!group || isExpired(group)) return 0;
  return 0.5 + 0.5 * progress(group.participants_count, group.target_qty);
}

// Deterministic jitter from product id so the feed isn't category-clustered
function jitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

// Deterministic per-city affinity so two users in different cities see
// visibly different feeds (stands in for real per-city demand data)
function cityAffinity(productId: string, city: string | null | undefined): number {
  if (!city) return 0;
  const s = `${productId}|${city}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

type FeedProfile = Pick<Profile, 'interests' | 'budget_tier'> & { city?: string | null };

export function scoreProduct(
  product: Product,
  profile: FeedProfile | null,
  group?: GroupBuy
): number {
  const interestMatch = profile?.interests?.includes(product.category) ? 1 : 0;
  return (
    0.4 * interestMatch +
    0.2 * budgetFit(product.price_usd, profile?.budget_tier ?? null) +
    0.25 * popularity(product) +
    0.15 * groupBoost(group) +
    0.05 * cityAffinity(product.id, profile?.city) +
    0.001 * jitter(product.id)
  );
}

/** Per-factor breakdown of the ranking score, used by the "why this?" sheet. */
export interface MatchBreakdown {
  /** Display percent shown on the badge (0–99). */
  pct: number;
  interest: boolean;
  budget: number; // 0..1
  popularity: number; // 0..1
  group: number; // 0..1
  hotInCity: boolean;
}

export function explainScore(
  product: Product,
  profile: FeedProfile | null,
  group?: GroupBuy
): MatchBreakdown {
  const interest = !!profile?.interests?.includes(product.category);
  const budget = budgetFit(product.price_usd, profile?.budget_tier ?? null);
  const pop = popularity(product);
  const grp = groupBoost(group);
  const city = cityAffinity(product.id, profile?.city);
  const total = 0.4 * (interest ? 1 : 0) + 0.2 * budget + 0.25 * pop + 0.15 * grp + 0.05 * city;
  return {
    pct: Math.min(99, Math.round(38 + 60 * total)),
    interest,
    budget,
    popularity: pop,
    group: grp,
    hotInCity: city > 0.6,
  };
}

export function rankFeed(
  products: Product[],
  profile: FeedProfile | null,
  groupsByProduct: Map<string, GroupBuy>
): Product[] {
  return [...products].sort(
    (a, b) =>
      scoreProduct(b, profile, groupsByProduct.get(b.id)) -
      scoreProduct(a, profile, groupsByProduct.get(a.id))
  );
}
