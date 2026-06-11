import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProductRow } from './types';

// Dedupe across the whole batch first: Postgres rejects an upsert that hits
// the same (marketplace, external_id) twice in one statement.
export async function upsertProducts(
  db: SupabaseClient,
  rows: ProductRow[]
): Promise<number> {
  const unique = new Map<string, ProductRow>();
  for (const r of rows) unique.set(`${r.marketplace}:${r.external_id}`, r);
  const deduped = [...unique.values()];
  if (deduped.length === 0) return 0;

  const { error } = await db
    .from('products')
    .upsert(deduped, { onConflict: 'marketplace,external_id' });
  if (error) throw new Error(`products upsert failed: ${error.message}`);
  return deduped.length;
}
