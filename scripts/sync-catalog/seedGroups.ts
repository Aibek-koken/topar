import type { SupabaseClient } from '@supabase/supabase-js';

interface PickedProduct {
  id: string;
  slug: string;
  category: string;
}

// First baseline is 9 on purpose: the demo group sits one join below the
// min_qty 10 tier, so a single live join on stage drops the price visibly.
// Last entry is expired (negative hours), mirroring seed.sql.
const PARTICIPANT_BASELINES = [9, 23, 41, 12, 18, 35, 27, 44, 31, 15, 8, 37];
const DEADLINE_HOURS = [26, 6, 14, 72, 30, 9, 48, 5, 20, 28, 40, -2];

export async function seedGroups(db: SupabaseClient, count: number): Promise<number> {
  const { data: products, error } = await db
    .from('products')
    .select('id, slug, category')
    .order('orders_count', { ascending: false });
  if (error) throw new Error(`fetching products failed: ${error.message}`);
  if (!products || products.length === 0) {
    throw new Error('no products in DB to seed groups from — run a sync first');
  }

  const picked = pickDiverse(products, count);

  // Re-runnable before a demo: wipe and re-insert, deadlines become fresh.
  const del = await db.from('group_buys').delete().not('id', 'is', null);
  if (del.error) throw new Error(`clearing group_buys failed: ${del.error.message}`);

  const rows = picked.map((p, i) => {
    const hours = DEADLINE_HOURS[i % DEADLINE_HOURS.length];
    return {
      product_id: p.id,
      participants_count: PARTICIPANT_BASELINES[i % PARTICIPANT_BASELINES.length],
      deadline: new Date(Date.now() + hours * 3_600_000).toISOString(),
      status: hours < 0 ? 'expired' : 'active',
    };
  });

  const ins = await db.from('group_buys').insert(rows);
  if (ins.error) throw new Error(`inserting group_buys failed: ${ins.error.message}`);

  console.log(`Demo group (9 participants, one join to the -15% tier): ${picked[0].slug}`);
  return rows.length;
}

// Round-robin across categories, most popular first within each, so the
// groups tab shows variety instead of 12 wireless earbuds.
function pickDiverse(products: PickedProduct[], count: number): PickedProduct[] {
  const byCategory = new Map<string, PickedProduct[]>();
  for (const p of products) {
    const list = byCategory.get(p.category);
    if (list) list.push(p);
    else byCategory.set(p.category, [p]);
  }
  const queues = [...byCategory.values()];
  const picked: PickedProduct[] = [];
  let i = 0;
  while (picked.length < count && queues.some((q) => q.length > 0)) {
    const q = queues[i % queues.length];
    const item = q.shift();
    if (item) picked.push(item);
    i++;
  }
  return picked;
}
