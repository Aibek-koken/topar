-- Group chat. Paste into Supabase Dashboard -> SQL Editor and run once
-- (after 0001_schema.sql).

create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_buy_id uuid not null references public.group_buys(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null, -- null for system/seed rows
  display_name text not null default '',
  kind text not null default 'text' check (kind in ('text','join')),
  body text, -- null for 'join'
  created_at timestamptz not null default now()
);

create index group_messages_group_idx on public.group_messages (group_buy_id, created_at);

alter table public.group_messages enable row level security;

-- Read for everyone (lurkers see the hype); write only for participants.
create policy "read messages" on public.group_messages for select using (true);
create policy "send messages" on public.group_messages for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.group_participants gp
    where gp.group_buy_id = group_messages.group_buy_id
      and gp.user_id = auth.uid()
  )
);

-- Server-authoritative join announcements (same pattern as sync_participants_count).
create or replace function public.announce_join() returns trigger as $$
begin
  insert into public.group_messages (group_buy_id, user_id, display_name, kind)
  select new.group_buy_id, null, coalesce(p.display_name, ''), 'join'
  from public.profiles p where p.id = new.user_id;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_announce_join
after insert on public.group_participants
for each row execute function public.announce_join();

alter publication supabase_realtime add table public.group_messages;
