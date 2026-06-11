-- SIM identity support. Paste into Supabase Dashboard -> SQL Editor and run once
-- (after 0001_schema.sql). Display-only carrier data read on-device; the
-- verified phone number itself lives in auth.users (set by the OTP flow).

alter table public.profiles add column if not exists sim_carrier text;
alter table public.profiles add column if not exists sim_country text;
