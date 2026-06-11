-- Catalog sync support. Paste into Supabase Dashboard -> SQL Editor and run once
-- (after 0001_schema.sql).

alter table public.products add column if not exists external_id text;
alter table public.products add column if not exists product_url text;

-- Makes sync upserts idempotent: same marketplace product updates in place.
create unique index if not exists products_marketplace_external_id_key
  on public.products (marketplace, external_id);
