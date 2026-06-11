# Marketplace Catalog Sync — Design

**Date:** 2026-06-12
**Status:** Approved
**Project:** Topar (hackathon MVP — group buying app)

## Goal

Replace the 36-product mock catalog with real product data from AliExpress, Amazon,
and Temu, pulled via third-party aggregator APIs (RapidAPI-style), so the demo shows
real products with real images and prices.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Data source | Third-party aggregator APIs on RapidAPI (official APIs need approval processes) |
| Architecture | Sync into the existing Supabase `products` table; app reads from DB as it does today |
| Marketplace coverage | All three: AliExpress, Amazon, Temu (Temu expected weakest — design tolerates a source failing) |
| Localization | Store English only — EN title placed in all `LocalizedText` slots; no translation step |
| Product selection | Curated search queries per category (electronics, fashion, home, beauty, sports), ~10 products per query, ~150 total |
| Sync trigger | Manual, run on demand from the dev machine |
| Group buys | Auto-seeded in TS after sync (replaces hand-written `seed.sql` group seeding) |
| Budget | Free API tiers only — aggressive disk caching of raw responses is mandatory |
| Where the pipeline lives | Local Node/TS script (`npx tsx`), not an Edge Function — fastest iteration for a hackathon; adapters/normalizer port to an Edge Function later if needed |

## Architecture

A local pipeline at `scripts/sync-catalog/`, run with:

```bash
npx tsx scripts/sync-catalog/index.ts [--source=<name|cache>] [--dry-run] [--seed-groups-only]
```

It fetches products from three aggregator endpoints, caches every raw response to
disk, normalizes results into the existing `Product` shape, upserts them into
Supabase with the service-role key, then auto-seeds group buys.

**The app does not change.** It already reads `products` and `group_buys` from
Supabase (`src/lib/api.ts`); the offline mock mode remains for keyless demos.

**Secrets** go in `.env` as non-`EXPO_PUBLIC_` variables — `RAPIDAPI_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` — so they are never inlined into the app bundle.
`.env` is already gitignored.

## Components

```
scripts/sync-catalog/
  index.ts          CLI entry: flag parsing, orchestration, summary report
  config.ts         curated search queries per category × marketplace; size targets
  adapters/
    aliexpress.ts   searchProducts(query): Promise<RawProduct[]>
    amazon.ts       same interface
    temu.ts         same interface
  cache.ts          disk cache at scripts/.cache/<source>/<query-hash>.json
  normalize.ts      RawProduct → products row
  upsert.ts         batch upsert keyed on (marketplace, external_id)
  seedGroups.ts     generate ~12 group_buys against synced products
```

### Adapter contract

Every adapter exposes the same function: `searchProducts(query: string): Promise<RawProduct[]>`.
A failing source (quota exhausted, 429, response-schema drift) logs a warning and
yields zero products; the sync continues with the remaining sources.

### Normalization rules (`normalize.ts`)

- EN title written to the `ru` and `en` slots of `LocalizedText` (type and UI untouched).
- Price converted to USD (`price_usd`), consistent with the app's fixed 1 USD = 512 ₸ display conversion.
- Category = the app category whose configured query found the product.
- Slug generated from the title; deduplicated by the marketplace's own product id.
- Products missing price, image, or title are dropped, not inserted.

### Group seeding (`seedGroups.ts`)

Ports `seed.sql` group logic to TS: pick ~12 diverse products (spread across
categories/marketplaces), generate `group_buys` with tier ladders
(10+ → −15%, 50+ → −30%), fresh deadlines, and varied participant counts —
including one group seeded near its tier threshold for the Realtime demo moment.
Re-running refreshes deadlines like `seed.sql` does today.

## Data flow and free-tier frugality

One full sync = 5 categories × 1 query × 3 marketplaces = **15 search requests**
(~10 products each → ~150 products). Every raw API response is written to the disk
cache **before** normalization, so re-runs with tweaked normalization or seeding
logic cost zero API calls. `--source=cache` forces a cache-only run. Free tiers
(~50–100 requests/month per API) therefore survive a month of iteration.

## Schema changes

One migration adding two columns to `products`:

- `external_id text` — the marketplace's own product id; unique index on
  `(marketplace, external_id)` makes upserts idempotent.
- `product_url text` — link back to the original listing.

## Error handling

- **Per-source isolation:** one source failing never aborts the sync.
- **Quota awareness:** on 429/403 the adapter stops querying that source and reports it in the summary.
- **Validation:** invalid products are dropped in `normalize.ts` with a count in the summary.
- **`--dry-run`:** prints what would be upserted/seeded without touching the DB.

## Testing

No test framework exists in the project; hackathon-appropriate verification:

1. `--dry-run` against cached fixtures (the disk cache doubles as fixtures).
2. Manual smoke pass: run sync → open app → real products render in feed, search,
   and groups with images and ₸ prices; Realtime join counter still works.

## Out of scope

- Translation of titles to RU/KK.
- Scheduled/cron sync, Edge Function deployment.
- Price refresh of existing rows mid-group-buy (manual sync cadence avoids this).
- Payments, logistics, real eSIM — separate future specs.
