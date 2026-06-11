import type { Category } from '../../src/lib/types';

// One curated query per app category. 5 queries x 3 sources = 15 API requests
// per full live sync — fits free RapidAPI tiers.
export const QUERIES: Record<Category, string> = {
  electronics: 'wireless earbuds',
  fashion: 'sneakers',
  home: 'air fryer',
  beauty: 'makeup brush set',
  sports: 'yoga mat',
};

export const PRODUCTS_PER_QUERY = 10;
export const GROUPS_TO_SEED = 12;
