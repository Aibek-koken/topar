# Topar

Buy together, pay less — a hackathon MVP for a group-buying mobile marketplace.
It aggregates products from global marketplaces (AliExpress, Amazon, Temu, as
mock data), shows a personalized recommendation feed, and lets users join group
buys whose price drops as more people join. It also includes a conceptual
SIM/eSIM identity layer.

Status: hackathon MVP. It runs out of the box in an offline demo mode on bundled
mock data; live cross-device features require a Supabase project (see below).

## Stack

Expo SDK 54 (React Native, TypeScript, expo-router) · Supabase (auth, Postgres,
Realtime) · Zustand · i18next (RU / KK / EN) · prices in tenge (KZT).

## Quick start

```bash
npm install
npx expo start
```

Scan the QR code in Expo Go (iOS/Android), or press `w` for the web build.

Without Supabase configured, the app runs in offline demo mode on bundled mock
data (36 products, 12 groups): the full path register → onboarding → feed →
group → join works locally. Realtime updates between devices do not work in this
mode.

## Live demo with Supabase (two devices)

1. Create a free project at supabase.com.
2. Authentication → Sign In / Providers → Email → turn off "Confirm email"
   (otherwise demo sign-up silently hangs).
3. In the SQL Editor, run in order:
   - `supabase/migrations/0001_schema.sql` (tables, counter trigger, RLS, Realtime)
   - `supabase/seed.sql` (36 products, 12 groups; re-runnable to refresh deadlines)
4. Project Settings → API → copy the URL and anon key into `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
5. Restart with a clean cache: `npx expo start -c` (env vars are inlined when the
   bundler starts).

## Optional: real catalog

Instead of the mock catalog, products can be synced from AliExpress / Amazon /
Temu via RapidAPI aggregators:

1. Run `supabase/migrations/0002_catalog_sync.sql` in the SQL Editor.
2. Subscribe (free tier) to the RapidAPI sources (AliExpress DataHub, Real-Time
   Amazon Data, Temu API).
3. Add `RAPIDAPI_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to `.env` (no
   `EXPO_PUBLIC_` prefix — these must not be bundled into the app).
4. `npm run sync-catalog` loads ~150 products and reseeds the 12 groups.

Flags: `--dry-run` (no DB writes), `--source=cache` (disk cache only, no API
calls), `--seed-groups-only` (reseed groups, for example to refresh deadlines).

## What's inside

- `src/app/` — screens (expo-router): onboarding (interests → budget → city →
  eSIM verification), tabs (feed / groups / search / profile), `product/[id]`,
  `group/[id]`.
- `src/lib/recommendations.ts` — transparent scoring:
  0.40·interests + 0.20·budget + 0.25·popularity + 0.15·group activity.
- `src/lib/groupBuy.ts` — pure tier math (1 unit = retail, 10+ = −15%, 50+ = −30%).
- `src/store/useCatalogStore.ts` — catalog plus a Realtime subscription to
  `group_buys` (one Postgres-trigger UPDATE per join).
- `src/locales/` — full RU / KK / EN localization, including Russian plurals.
- eSIM layer — a concept per the brief: a mock verification animation in
  onboarding and before joining, a "verified via eSIM" badge, and an explainer
  screen. There is no real carrier integration.

## MVP limitations (deliberate, per the hackathon brief)

Mock catalog instead of live marketplace APIs · fixed exchange rate
(1 USD = 512 tenge) · recommendations are scoring, not ML · eSIM is a UI concept
with no carrier integration · payment and logistics are not implemented.
