# Marketplace Catalog Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock catalog with real AliExpress/Amazon/Temu products synced into Supabase via a local CLI pipeline, with auto-seeded group buys.

**Architecture:** A local Node/TS script (`scripts/sync-catalog/`) fetches products from three RapidAPI aggregator endpoints, caches every raw response on disk (free-tier quotas), normalizes results into the existing `products` schema, upserts via the Supabase service-role key, then re-seeds `group_buys`. The Expo app does not change — it already reads these tables.

**Tech Stack:** TypeScript run via `tsx`, `@supabase/supabase-js` (already a dependency), `dotenv`, Node 18+ global `fetch`. No test framework — per the approved spec, verification is a fixture-based `selfcheck.ts` script plus `--dry-run` runs and a manual app smoke pass.

**Spec:** `docs/superpowers/specs/2026-06-12-marketplace-catalog-sync-design.md`

**Conventions for the worker:**
- All commands run from the repo root. They are cross-platform (`npx tsx ...`).
- `.env` at the repo root holds secrets and is already gitignored. Never prefix these new vars with `EXPO_PUBLIC_`.
- The repeated verification command is `npx tsx scripts/sync-catalog/selfcheck.ts` — it must print `All checks passed` at the end of every task that touches pipeline logic.

---

### Task 1: Scaffolding — deps, migration, shared types, config

**Files:**
- Modify: `package.json` (via `npm install`, plus one script entry)
- Modify: `.gitignore`
- Create: `supabase/migrations/0002_catalog_sync.sql`
- Create: `scripts/sync-catalog/types.ts`
- Create: `scripts/sync-catalog/config.ts`

- [ ] **Step 1: Install dev dependencies**

Run: `npm install -D tsx dotenv`
Expected: both appear under `devDependencies` in `package.json`.

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add:

```json
"sync-catalog": "tsx scripts/sync-catalog/index.ts"
```

- [ ] **Step 3: Ignore the response cache**

Append to `.gitignore` (skip if the line already exists):

```
scripts/.cache/
```

- [ ] **Step 4: Create the migration**

Create `supabase/migrations/0002_catalog_sync.sql`:

```sql
-- Catalog sync support. Paste into Supabase Dashboard -> SQL Editor and run once
-- (after 0001_schema.sql).

alter table public.products add column if not exists external_id text;
alter table public.products add column if not exists product_url text;

-- Makes sync upserts idempotent: same marketplace product updates in place.
create unique index if not exists products_marketplace_external_id_key
  on public.products (marketplace, external_id);
```

- [ ] **Step 5: Create shared pipeline types**

Create `scripts/sync-catalog/types.ts`:

```ts
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
```

- [ ] **Step 6: Create the sync config**

Create `scripts/sync-catalog/config.ts`:

```ts
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
```

- [ ] **Step 7: Verify it type-checks**

Run: `npx tsx -e "import('./scripts/sync-catalog/config.ts').then(m => console.log(Object.keys(m.QUERIES).length, 'queries'))"`
Expected: `5 queries`

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .gitignore supabase/migrations/0002_catalog_sync.sql scripts/sync-catalog/types.ts scripts/sync-catalog/config.ts
git commit -m "feat: scaffold catalog sync pipeline (deps, migration, types, config)"
```

---

### Task 2: HTTP helper, disk cache, parse utilities, selfcheck harness

**Files:**
- Create: `scripts/sync-catalog/http.ts`
- Create: `scripts/sync-catalog/cache.ts`
- Create: `scripts/sync-catalog/parseUtils.ts`
- Create: `scripts/sync-catalog/selfcheck.ts`

- [ ] **Step 1: Create the RapidAPI HTTP helper**

Create `scripts/sync-catalog/http.ts`:

```ts
// Thrown on 429/403 so the orchestrator can stop querying that source
// instead of burning the remaining free-tier quota on guaranteed failures.
export class QuotaError extends Error {}

export async function rapidApiGet(
  host: string,
  path: string,
  params: Record<string, string>
): Promise<unknown> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY is not set in .env');

  const url = new URL(`https://${host}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
  });
  if (res.status === 429 || res.status === 403) {
    throw new QuotaError(`${host} quota/auth blocked (HTTP ${res.status})`);
  }
  if (!res.ok) {
    throw new Error(`${host} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}
```

- [ ] **Step 2: Create the disk cache**

Create `scripts/sync-catalog/cache.ts`:

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_DIR = join(__dirname, '..', '.cache');

function cachePath(source: string, query: string): string {
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return join(CACHE_DIR, source, `${slug}.json`);
}

export function readCache(source: string, query: string): unknown | null {
  const p = cachePath(source, query);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function writeCache(source: string, query: string, data: unknown): void {
  const p = cachePath(source, query);
  mkdirSync(join(CACHE_DIR, source), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}
```

- [ ] **Step 3: Create shared parse utilities**

Create `scripts/sync-catalog/parseUtils.ts`:

```ts
export function str(v: unknown): string {
  return v == null ? '' : String(v);
}

// "$19.99" -> 19.99, 12.5 -> 12.5, garbage -> null
export function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// "10,000+ sold" -> 10000
export function salesToNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

// Protocol-relative AliExpress URLs ("//ae01.alicdn.com/...") -> https
export function httpsUrl(v: unknown): string | null {
  if (!v) return null;
  const s = String(v);
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('http')) return s;
  return null;
}
```

- [ ] **Step 4: Create the selfcheck harness**

Create `scripts/sync-catalog/selfcheck.ts` (later tasks append more blocks before the final `console.log`):

```ts
// Fixture-based checks for the sync pipeline. No test framework by design
// (hackathon spec) — run with: npx tsx scripts/sync-catalog/selfcheck.ts
import assert from 'node:assert/strict';
import { readCache, writeCache } from './cache';
import { httpsUrl, num, salesToNumber, str } from './parseUtils';

// --- parseUtils -------------------------------------------------------------
assert.equal(num('$19.99'), 19.99);
assert.equal(num(12.5), 12.5);
assert.equal(num('not a price'), null);
assert.equal(salesToNumber('10,000+ sold'), 10000);
assert.equal(salesToNumber(undefined), null);
assert.equal(httpsUrl('//ae01.alicdn.com/x.jpg'), 'https://ae01.alicdn.com/x.jpg');
assert.equal(httpsUrl('https://img/x.jpg'), 'https://img/x.jpg');
assert.equal(httpsUrl(''), null);
assert.equal(str(123), '123');
assert.equal(str(null), '');

// --- cache roundtrip ----------------------------------------------------------
writeCache('selfcheck', 'roundtrip query', { ok: true, n: 1 });
assert.deepEqual(readCache('selfcheck', 'roundtrip query'), { ok: true, n: 1 });
assert.equal(readCache('selfcheck', 'never written'), null);

console.log('All checks passed');
```

- [ ] **Step 5: Run selfcheck**

Run: `npx tsx scripts/sync-catalog/selfcheck.ts`
Expected: `All checks passed`

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-catalog/http.ts scripts/sync-catalog/cache.ts scripts/sync-catalog/parseUtils.ts scripts/sync-catalog/selfcheck.ts
git commit -m "feat: add catalog sync http helper, disk cache, parse utils, selfcheck"
```

---

### Task 3: AliExpress adapter

**Files:**
- Create: `scripts/sync-catalog/adapters/aliexpress.ts`
- Modify: `scripts/sync-catalog/selfcheck.ts` (append a block)

**Provider:** "AliExpress DataHub" on RapidAPI, host `aliexpress-datahub.p.rapidapi.com`. Field names in `parse()` follow its documented response; if the live response differs, Task 9 adjusts `parse()` against the cached JSON — the adapter structure does not change.

- [ ] **Step 1: Create the adapter**

Create `scripts/sync-catalog/adapters/aliexpress.ts`:

```ts
import { rapidApiGet } from '../http';
import { httpsUrl, num, salesToNumber, str } from '../parseUtils';
import type { RawProduct, SourceAdapter } from '../types';

const HOST = 'aliexpress-datahub.p.rapidapi.com';

export const aliexpress: SourceAdapter = {
  marketplace: 'aliexpress',
  fetchRaw: (query) =>
    rapidApiGet(HOST, '/item_search_2', { q: query, page: '1', sort: 'salesDesc' }),
  parse(json: any): RawProduct[] {
    const items: any[] = json?.result?.resultList ?? [];
    return items.map((entry) => {
      const item = entry?.item ?? entry;
      return {
        externalId: str(item?.itemId),
        title: str(item?.title),
        priceUsd: num(item?.sku?.def?.promotionPrice ?? item?.sku?.def?.price),
        rating: num(item?.averageStarRate),
        ordersCount: salesToNumber(item?.sales),
        imageUrl: httpsUrl(item?.image),
        productUrl: httpsUrl(item?.itemUrl),
      };
    });
  },
};
```

- [ ] **Step 2: Append the fixture check**

In `scripts/sync-catalog/selfcheck.ts`, add the import at the top and this block **before** the final `console.log`:

```ts
import { aliexpress } from './adapters/aliexpress';
```

```ts
// --- aliexpress adapter -------------------------------------------------------
{
  const rows = aliexpress.parse({
    result: {
      resultList: [
        {
          item: {
            itemId: 100500,
            title: 'TWS Earbuds',
            sku: { def: { promotionPrice: 12.34, price: 15.0 } },
            averageStarRate: 4.7,
            sales: '10,000+ sold',
            image: '//ae01.alicdn.com/x.jpg',
            itemUrl: '//www.aliexpress.com/item/100500.html',
          },
        },
      ],
    },
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    externalId: '100500',
    title: 'TWS Earbuds',
    priceUsd: 12.34,
    rating: 4.7,
    ordersCount: 10000,
    imageUrl: 'https://ae01.alicdn.com/x.jpg',
    productUrl: 'https://www.aliexpress.com/item/100500.html',
  });
  assert.deepEqual(aliexpress.parse({}), []); // missing/empty response is safe
}
```

- [ ] **Step 3: Run selfcheck**

Run: `npx tsx scripts/sync-catalog/selfcheck.ts`
Expected: `All checks passed`

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-catalog/adapters/aliexpress.ts scripts/sync-catalog/selfcheck.ts
git commit -m "feat: add AliExpress catalog adapter"
```

---

### Task 4: Amazon and Temu adapters + adapter registry

**Files:**
- Create: `scripts/sync-catalog/adapters/amazon.ts`
- Create: `scripts/sync-catalog/adapters/temu.ts`
- Create: `scripts/sync-catalog/adapters/index.ts`
- Modify: `scripts/sync-catalog/selfcheck.ts` (append blocks)

**Providers:** Amazon — "Real-Time Amazon Data" on RapidAPI, host `real-time-amazon-data.p.rapidapi.com`. Temu — RapidAPI Temu coverage is spotty; the adapter is written against the most common shape (`temu-api.p.rapidapi.com`) with fallback field names, and Task 9 adjusts `HOST`/`parse()` against the cached response of whichever Temu API actually gets subscribed. A Temu failure must never abort the sync (per-source isolation is in Task 8's orchestrator).

- [ ] **Step 1: Create the Amazon adapter**

Create `scripts/sync-catalog/adapters/amazon.ts`:

```ts
import { rapidApiGet } from '../http';
import { httpsUrl, num, str } from '../parseUtils';
import type { RawProduct, SourceAdapter } from '../types';

const HOST = 'real-time-amazon-data.p.rapidapi.com';

export const amazon: SourceAdapter = {
  marketplace: 'amazon',
  fetchRaw: (query) =>
    rapidApiGet(HOST, '/search', { query, country: 'US', page: '1' }),
  parse(json: any): RawProduct[] {
    const items: any[] = json?.data?.products ?? [];
    return items.map((p) => ({
      externalId: str(p?.asin),
      title: str(p?.product_title),
      priceUsd: num(p?.product_price),
      rating: num(p?.product_star_rating),
      // Amazon exposes no sales count; ratings volume is the closest popularity proxy
      ordersCount: num(p?.product_num_ratings),
      imageUrl: httpsUrl(p?.product_photo),
      productUrl: httpsUrl(p?.product_url),
    }));
  },
};
```

- [ ] **Step 2: Create the Temu adapter**

Create `scripts/sync-catalog/adapters/temu.ts`:

```ts
import { rapidApiGet } from '../http';
import { httpsUrl, num, salesToNumber, str } from '../parseUtils';
import type { RawProduct, SourceAdapter } from '../types';

// Temu has no official API and RapidAPI coverage is unstable. HOST and the
// field fallbacks below target the common "Temu API" shape; adjust against
// the cached response after the first live call (Task 9) if needed.
const HOST = 'temu-api.p.rapidapi.com';

// Temu APIs often return price in cents (price_info.price) or a plain number
function priceFrom(g: any): number | null {
  const cents = num(g?.price_info?.price);
  if (cents != null) return cents / 100;
  return num(g?.price ?? g?.min_price);
}

export const temu: SourceAdapter = {
  marketplace: 'temu',
  fetchRaw: (query) => rapidApiGet(HOST, '/search', { keyword: query, page: '1' }),
  parse(json: any): RawProduct[] {
    const items: any[] = json?.data?.items ?? json?.data?.goods_list ?? json?.items ?? [];
    return items.map((g) => ({
      externalId: str(g?.goods_id ?? g?.id),
      title: str(g?.title ?? g?.goods_name),
      priceUsd: priceFrom(g),
      rating: num(g?.goods_score ?? g?.rating),
      ordersCount: salesToNumber(g?.sales_num ?? g?.sales_tip),
      imageUrl: httpsUrl(g?.image ?? g?.thumb_url ?? g?.image_url),
      productUrl: httpsUrl(g?.link_url ?? g?.goods_url),
    }));
  },
};
```

- [ ] **Step 3: Create the adapter registry**

Create `scripts/sync-catalog/adapters/index.ts`:

```ts
import type { SourceAdapter } from '../types';
import { aliexpress } from './aliexpress';
import { amazon } from './amazon';
import { temu } from './temu';

export const adapters: SourceAdapter[] = [aliexpress, amazon, temu];
```

- [ ] **Step 4: Append fixture checks**

In `scripts/sync-catalog/selfcheck.ts`, add imports at the top and these blocks **before** the final `console.log`:

```ts
import { amazon } from './adapters/amazon';
import { temu } from './adapters/temu';
```

```ts
// --- amazon adapter -----------------------------------------------------------
{
  const rows = amazon.parse({
    data: {
      products: [
        {
          asin: 'B0TEST',
          product_title: 'Test Product',
          product_price: '$19.99',
          product_star_rating: '4.5',
          product_num_ratings: 1234,
          product_photo: 'https://img/x.jpg',
          product_url: 'https://amazon.com/dp/B0TEST',
        },
      ],
    },
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    externalId: 'B0TEST',
    title: 'Test Product',
    priceUsd: 19.99,
    rating: 4.5,
    ordersCount: 1234,
    imageUrl: 'https://img/x.jpg',
    productUrl: 'https://amazon.com/dp/B0TEST',
  });
  assert.deepEqual(amazon.parse({}), []);
}

// --- temu adapter ---------------------------------------------------------------
{
  const rows = temu.parse({
    data: {
      items: [
        {
          goods_id: 601099,
          title: 'Yoga Mat',
          price_info: { price: 1390 },
          sales_num: 2900,
          image: 'https://img.kwcdn.com/x.jpg',
          link_url: 'https://www.temu.com/g-601099.html',
        },
      ],
    },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].externalId, '601099');
  assert.equal(rows[0].priceUsd, 13.9);
  assert.equal(rows[0].ordersCount, 2900);
  assert.deepEqual(temu.parse({}), []);
}
```

- [ ] **Step 5: Run selfcheck**

Run: `npx tsx scripts/sync-catalog/selfcheck.ts`
Expected: `All checks passed`

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-catalog/adapters/amazon.ts scripts/sync-catalog/adapters/temu.ts scripts/sync-catalog/adapters/index.ts scripts/sync-catalog/selfcheck.ts
git commit -m "feat: add Amazon and Temu catalog adapters"
```

---

### Task 5: Normalizer

**Files:**
- Create: `scripts/sync-catalog/normalize.ts`
- Modify: `scripts/sync-catalog/selfcheck.ts` (append a block)

- [ ] **Step 1: Create the normalizer**

Create `scripts/sync-catalog/normalize.ts`:

```ts
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
```

- [ ] **Step 2: Append the fixture check**

In `scripts/sync-catalog/selfcheck.ts`, add the import at the top and this block **before** the final `console.log`:

```ts
import { normalize, slugify } from './normalize';
```

```ts
// --- normalize -----------------------------------------------------------------
{
  assert.equal(slugify('Great Thing!! 100% Cotton', 'AB12345'), 'great-thing-100-cotton-b12345');
  assert.equal(slugify('???', 'X1'), 'product-x1');

  const rows = normalize(
    [
      { externalId: 'A1', title: 'Great Thing', priceUsd: 10.456, rating: 4.92, ordersCount: 5.7, imageUrl: 'https://i/x.jpg', productUrl: null },
      { externalId: 'A1', title: 'Duplicate id', priceUsd: 9, rating: 4, ordersCount: 1, imageUrl: 'https://i/y.jpg', productUrl: null },
      { externalId: '', title: 'No id', priceUsd: 10, rating: 4, ordersCount: 5, imageUrl: 'https://i/x.jpg', productUrl: null },
      { externalId: 'A2', title: 'No image', priceUsd: 10, rating: 4, ordersCount: 5, imageUrl: null, productUrl: null },
      { externalId: 'A3', title: 'No price', priceUsd: null, rating: 4, ordersCount: 5, imageUrl: 'https://i/x.jpg', productUrl: null },
    ],
    'sports',
    'temu'
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].slug, 'great-thing-a1');
  assert.deepEqual(rows[0].title, { ru: 'Great Thing', en: 'Great Thing' });
  assert.equal(rows[0].price_usd, 10.46);
  assert.equal(rows[0].rating, 4.9);
  assert.equal(rows[0].orders_count, 6);
  assert.equal(rows[0].category, 'sports');
  assert.equal(rows[0].marketplace, 'temu');
}
```

- [ ] **Step 3: Run selfcheck**

Run: `npx tsx scripts/sync-catalog/selfcheck.ts`
Expected: `All checks passed`

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-catalog/normalize.ts scripts/sync-catalog/selfcheck.ts
git commit -m "feat: add catalog sync normalizer"
```

---

### Task 6: Supabase admin client + product upsert

**Files:**
- Create: `scripts/sync-catalog/db.ts`
- Create: `scripts/sync-catalog/upsert.ts`

- [ ] **Step 1: Create the admin client factory**

Create `scripts/sync-catalog/db.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Service-role client: bypasses RLS for writes. The key must only ever live
// in .env (gitignored) — never in EXPO_PUBLIC_* vars that get bundled.
export function createAdminClient(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
```

- [ ] **Step 2: Create the upsert**

Create `scripts/sync-catalog/upsert.ts`:

```ts
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
```

- [ ] **Step 3: Verify modules load and guard missing env**

Run: `npx tsx -e "import('./scripts/sync-catalog/db.ts').then(m => { try { m.createAdminClient(); } catch (e) { console.log('guard ok:', e.message.includes('must be set')); } })"`
Expected: `guard ok: true` (assuming `SUPABASE_SERVICE_ROLE_KEY` is not exported in your shell)

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-catalog/db.ts scripts/sync-catalog/upsert.ts
git commit -m "feat: add supabase admin client and product upsert"
```

---

### Task 7: Group seeding

**Files:**
- Create: `scripts/sync-catalog/seedGroups.ts`

Ports the group logic from `supabase/seed.sql` (lines 160–176): wipe `group_buys` (cascades to `group_participants`, profiles untouched), insert ~12 groups with the demo baseline participant counts, fresh deadlines, and one expired group. The `group_buys` table supplies the default tier ladder (10+ → −15%, 50+ → −30%) and `target_qty 50`, so inserts omit them — same as `seed.sql`.

- [ ] **Step 1: Create the seeder**

Create `scripts/sync-catalog/seedGroups.ts`:

```ts
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsx -e "import('./scripts/sync-catalog/seedGroups.ts').then(m => console.log(typeof m.seedGroups))"`
Expected: `function`

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-catalog/seedGroups.ts
git commit -m "feat: add group buy auto-seeding"
```

---

### Task 8: CLI orchestrator

**Files:**
- Create: `scripts/sync-catalog/index.ts`

Flags:
- `--dry-run` — fetch/cache/normalize and print a summary; no DB writes, no DB reads.
- `--source=<aliexpress|amazon|temu>` — sync one source only.
- `--source=cache` — all sources, but cache-only: never call an API; warn and skip on cache miss.
- `--seed-groups-only` — skip fetching entirely; just re-seed groups from products already in the DB.

Per-source isolation: a source whose queries all fail still lets the others sync. A `QuotaError` stops further queries to that source only.

- [ ] **Step 1: Create the entry point**

Create `scripts/sync-catalog/index.ts`:

```ts
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
```

- [ ] **Step 2: Verify the cache-only dry run (no API, no DB, no creds needed)**

Run: `npm run sync-catalog -- --dry-run --source=cache`
Expected output shape (every line a cache-miss warning, then):

```
[aliexpress] no cache for "wireless earbuds", skipping
... (one warning per source x query) ...
Collected 0 products total
[dry-run] sample rows:
[]
[dry-run] skipping upsert and group seeding
```

Exit code 0.

- [ ] **Step 3: Verify selfcheck still passes**

Run: `npx tsx scripts/sync-catalog/selfcheck.ts`
Expected: `All checks passed`

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-catalog/index.ts
git commit -m "feat: add catalog sync CLI orchestrator"
```

---

### Task 9: Live verification, parse adjustments, docs

This task needs human-owned inputs: RapidAPI subscriptions and the service-role key. If running as an autonomous worker, stop and ask the user to complete Step 1 and Step 2 before continuing.

**Files:**
- Modify: `scripts/sync-catalog/adapters/*.ts` (only if live response shapes differ)
- Modify: `README.md`

- [ ] **Step 1 (user): Subscribe to the three RapidAPI APIs (free tier)**

On rapidapi.com, subscribe to: "AliExpress DataHub", "Real-Time Amazon Data", and a Temu search API (pick the best-rated one available; note its host name). One API key covers all RapidAPI subscriptions.

- [ ] **Step 2 (user): Configure `.env` and run the migration**

Append to `.env` (no `EXPO_PUBLIC_` prefix — these must not reach the app bundle):

```
RAPIDAPI_KEY=<your rapidapi key>
SUPABASE_SERVICE_ROLE_KEY=<Project Settings -> API -> service_role key>
```

In Supabase SQL Editor, run `supabase/migrations/0002_catalog_sync.sql`.

- [ ] **Step 3: Live-test one source at a time, dry-run first**

Run: `npm run sync-catalog -- --dry-run --source=aliexpress`
Expected: 5 lines like `[aliexpress] electronics "wireless earbuds": 10 products`, sample rows with real titles/images/prices.

If a source reports 0 products: open the cached response in `scripts/.cache/<source>/<query>.json`, find where the items array and fields actually live, and adjust only that adapter's `parse()` (and `HOST`/path in `fetchRaw` if the subscribed API differs — most likely for Temu). Re-run with `--source=cache` (free) until products appear. Repeat for `amazon` and `temu`.

- [ ] **Step 4: Full sync into Supabase**

Run: `npm run sync-catalog`
Expected: per-query product counts, `Upserted ~100-150 products`, `Demo group ...`, `Seeded 12 group buys`.

- [ ] **Step 5: App smoke pass**

Run `npx expo start -c`, open the app (Supabase mode), and verify: feed shows real products with images and ₸ prices; search and category filters work; groups tab shows 12 groups; opening the demo group shows 9 participants one step below the −15% tier; joining still bumps the counter live (Realtime).

- [ ] **Step 6: Update README**

In `README.md`, under the Supabase setup section, document the real-catalog option:

```markdown
## Реальный каталог (опционально)

Вместо mock-каталога можно синхронизировать реальные товары с AliExpress / Amazon / Temu
через агрегаторы RapidAPI:

1. Выполните в SQL Editor `supabase/migrations/0002_catalog_sync.sql`.
2. Подпишитесь (free tier) на RapidAPI: AliExpress DataHub, Real-Time Amazon Data, Temu API.
3. Добавьте в `.env`: `RAPIDAPI_KEY=...` и `SUPABASE_SERVICE_ROLE_KEY=...`
   (без префикса `EXPO_PUBLIC_` — эти ключи не должны попадать в бандл приложения).
4. `npm run sync-catalog` — зальёт ~150 товаров и пересеет 12 групп.

Полезные флаги: `--dry-run` (без записи в БД), `--source=cache` (без запросов к API,
только дисковый кэш `scripts/.cache/`), `--seed-groups-only` (только пересеять группы —
например, обновить дедлайны перед демо).
```

- [ ] **Step 7: Final selfcheck + commit**

Run: `npx tsx scripts/sync-catalog/selfcheck.ts` → `All checks passed`

```bash
git add README.md scripts/sync-catalog
git commit -m "feat: verify live catalog sync and document setup"
```
