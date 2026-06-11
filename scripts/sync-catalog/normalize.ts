import type { Category, Marketplace } from '../../src/lib/types';
import type { ProductRow, RawProduct } from './types';

// Slug gets an external-id suffix so two marketplaces selling the
// same-titled product never collide on the unique slug column.
export function slugify(title: string, externalId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${base || 'product'}-${externalId.toLowerCase().slice(-6)}`;
}

// Drops items missing id/title/image/price (never insert junk), dedupes by
// external id, clamps rating into the DB's numeric(2,1) range.
export function normalize(
  raw: RawProduct[],
  category: Category,
  marketplace: Marketplace
): ProductRow[] {
  const seen = new Set<string>();
  const rows: ProductRow[] = [];
  for (const r of raw) {
    if (!r.externalId || !r.title || !r.imageUrl) continue;
    if (r.priceUsd == null || r.priceUsd <= 0) continue;
    if (seen.has(r.externalId)) continue;
    seen.add(r.externalId);
    rows.push({
      slug: slugify(r.title, r.externalId),
      title: { ru: r.title, en: r.title }, // EN-only catalog per spec
      category,
      marketplace,
      price_usd: Math.round(r.priceUsd * 100) / 100,
      rating: Math.min(5, Math.max(0, Math.round((r.rating ?? 4.5) * 10) / 10)),
      orders_count: Math.max(0, Math.round(r.ordersCount ?? 0)),
      image_url: r.imageUrl,
      external_id: r.externalId,
      product_url: r.productUrl,
    });
  }
  return rows;
}
