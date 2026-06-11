import 'dotenv/config';
import type { Category } from '../../src/lib/types';
import { adapters } from './adapters';
import { readCache, writeCache } from './cache';
import { GROUPS_TO_SEED, PRODUCTS_PER_QUERY, QUERIES } from './config';
import { createAdminClient } from './db';
import { QuotaError } from './http';
import { normalize } from './normalize';
import { seedGroups } from './seedGroups';
import type { ProductRow } from './types';
import { upsertProducts } from './upsert';

async function main() {
  const args = process.argv.slice(2);
  const flag = (n: string) => args.includes(`--${n}`);
  const opt = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

  const dryRun = flag('dry-run');
  const seedOnly = flag('seed-groups-only');
  const source = opt('source'); // marketplace name, or 'cache' for cache-only
  const cacheOnly = source === 'cache';

  if (dryRun && seedOnly) {
    console.log('--dry-run with --seed-groups-only: nothing to do');
    return;
  }

  if (!seedOnly) {
    const collected: ProductRow[] = [];

    for (const adapter of adapters) {
      if (source && !cacheOnly && adapter.marketplace !== source) continue;
      let quotaHit = false;

      for (const [category, query] of Object.entries(QUERIES) as [Category, string][]) {
        let raw = readCache(adapter.marketplace, query);
        if (raw === null) {
          if (cacheOnly) {
            console.warn(`[${adapter.marketplace}] no cache for "${query}", skipping`);
            continue;
          }
          if (quotaHit) continue;
          try {
            raw = await adapter.fetchRaw(query);
            writeCache(adapter.marketplace, query, raw);
          } catch (err) {
            if (err instanceof QuotaError) {
              console.warn(`[${adapter.marketplace}] ${err.message} — skipping remaining queries`);
              quotaHit = true;
            } else {
              console.warn(`[${adapter.marketplace}] "${query}" failed: ${(err as Error).message}`);
            }
            continue;
          }
        }

        let rows: ProductRow[];
        try {
          rows = normalize(adapter.parse(raw), category, adapter.marketplace).slice(0, PRODUCTS_PER_QUERY);
        } catch (err) {
          console.warn(`[${adapter.marketplace}] "${query}" parse failed: ${(err as Error).message}`);
          continue;
        }
        console.log(`[${adapter.marketplace}] ${category} "${query}": ${rows.length} products`);
        collected.push(...rows);
      }
    }

    console.log(`Collected ${collected.length} products total`);
    if (dryRun) {
      console.log('[dry-run] sample rows:');
      console.log(JSON.stringify(collected.slice(0, 3), null, 2));
      console.log('[dry-run] skipping upsert and group seeding');
      return;
    }
    const upserted = await upsertProducts(createAdminClient(), collected);
    console.log(`Upserted ${upserted} products`);
  }

  const seeded = await seedGroups(createAdminClient(), GROUPS_TO_SEED);
  console.log(`Seeded ${seeded} group buys`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
