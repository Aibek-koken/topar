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

export function scoreProduct(
  product: Product,
  profile: Pick<Profile, 'interests' | 'budget_tier'> | null,
  group?: GroupBuy
): number {
  const interestMatch = profile?.interests?.includes(product.category) ? 1 : 0;
  return (
    0.4 * interestMatch +
    0.2 * budgetFit(product.price_usd, profile?.budget_tier ?? null) +
    0.25 * popularity(product) +
    0.15 * groupBoost(group) +
    0.001 * jitter(product.id)
  );
}

export function rankFeed(
  products: Product[],
  profile: Pick<Profile, 'interests' | 'budget_tier'> | null,
  groupsByProduct: Map<string, GroupBuy>
): Product[] {
  return [...products].sort(
    (a, b) =>
      scoreProduct(b, profile, groupsByProduct.get(b.id)) -
      scoreProduct(a, profile, groupsByProduct.get(a.id))
  );
}
