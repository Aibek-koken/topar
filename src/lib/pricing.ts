import { usdToKzt } from './currency';
import type { Product } from './types';

// Cross-border goods in KZ retail typically carry a 55–95% markup over the
// marketplace price; deterministic per product so it survives re-renders
function localMarkup(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 33 + slug.charCodeAt(i)) | 0;
  return 1.55 + (Math.abs(h) % 41) / 100;
}

/** Estimated price of the same product in local KZ stores ("Almaty retail"). */
export function localPriceKzt(product: Product): number {
  const raw = usdToKzt(product.price_usd) * localMarkup(product.slug);
  // Price-tag style: round to hundreds, end in 90
  return Math.max(990, Math.round(raw / 100) * 100 - 10);
}

/** How much the buyer saves vs. local retail when paying `paidUsd`. */
export function savedVsLocalKzt(product: Product, paidUsd: number): number {
  return Math.max(0, localPriceKzt(product) - usdToKzt(paidUsd));
}
