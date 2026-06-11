import type { Category, Marketplace } from '../../src/lib/types';

// What an adapter extracts from one aggregator response item. Nullable fields
// are dropped later by normalize() if required.
export interface RawProduct {
  externalId: string;
  title: string;
  priceUsd: number | null;
  rating: number | null;
  ordersCount: number | null;
  imageUrl: string | null;
  productUrl: string | null;
}

// A ready-to-upsert row for public.products (column names match the table).
export interface ProductRow {
  slug: string;
  title: { ru: string; en: string };
  category: Category;
  marketplace: Marketplace;
  price_usd: number;
  rating: number;
  orders_count: number;
  image_url: string;
  external_id: string;
  product_url: string | null;
}

// fetchRaw and parse are separate so cached raw responses can be re-parsed
// without spending an API request.
export interface SourceAdapter {
  marketplace: Marketplace;
  fetchRaw(query: string): Promise<unknown>;
  parse(json: unknown): RawProduct[];
}
