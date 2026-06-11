-- Topar schema. Paste into Supabase Dashboard -> SQL Editor and run once.

-- PROFILES ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  city text default 'Алматы',
  budget_tier text check (budget_tier in ('low','mid','high')),
  interests text[] not null default '{}',
  language text not null default 'ru',
  esim_verified boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- PRODUCTS ------------------------------------------------------------------
-- title/description are JSONB: {"ru": "...", "kk": "...", "en": "..."}
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title jsonb not null,
  description jsonb,
  category text not null check (category in ('electronics','fashion','home','beauty','sports')),
  marketplace text not null check (marketplace in ('aliexpress','amazon','temu')),
  price_usd numeric(10,2) not null,
  rating numeric(2,1) not null default 4.5,
  orders_count int not null default 0,
  image_url text not null,
  created_at timestamptz not null default now()
);

-- GROUP BUYS ----------------------------------------------------------------
-- participants_count is denormalized and owned by the trigger below, so
-- Realtime emits exactly one clean UPDATE on group_buys per join/leave.
create table public.group_buys (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  tiers jsonb not null default
    '[{"min_qty":1,"discount_pct":0},{"min_qty":10,"discount_pct":15},{"min_qty":50,"discount_pct":30}]',
  target_qty int not null default 50,
  participants_count int not null default 0,
  deadline timestamptz not null,
  status text not null default 'active' check (status in ('active','completed','expired')),
  created_at timestamptz not null default now()
);

create table public.group_participants (
  id uuid primary key default gen_random_uuid(),
  group_buy_id uuid not null references public.group_buys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  qty int not null default 1,
  joined_at timestamptz not null default now(),
  unique (group_buy_id, user_id)
);

-- security definer: joining users have no UPDATE policy on group_buys,
-- the trigger must bypass RLS to bump the counter
create or replace function public.sync_participants_count() returns trigger as $$
declare
  gid uuid := coalesce(new.group_buy_id, old.group_buy_id);
begin
  update public.group_buys g
     set participants_count = greatest(
       g.participants_count + (case when tg_op = 'INSERT' then 1 else -1 end), 0)
   where g.id = gid;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_sync_participants
after insert or delete on public.group_participants
for each row execute function public.sync_participants_count();

-- RLS: enabled but permissive (hackathon posture) -----------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.group_buys enable row level security;
alter table public.group_participants enable row level security;

create policy "read profiles"   on public.profiles for select using (true);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);
create policy "read products"   on public.products for select using (true);
create policy "read group buys" on public.group_buys for select using (true);
create policy "read participants" on public.group_participants for select using (true);
create policy "join group"      on public.group_participants for insert with check (auth.uid() = user_id);
create policy "leave group"     on public.group_participants for delete using (auth.uid() = user_id);

-- Realtime: without this, postgres_changes never fires for group_buys
alter publication supabase_realtime add table public.group_buys;
