create table if not exists public.price_alerts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  alert_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.price_alerts enable row level security;

revoke all on table public.price_alerts from anon, authenticated;
grant select, insert, update, delete on table public.price_alerts to authenticated;

drop policy if exists "Users can read only their own alerts" on public.price_alerts;
drop policy if exists "Users can create only their own alerts" on public.price_alerts;
drop policy if exists "Users can update only their own alerts" on public.price_alerts;
drop policy if exists "Users can delete only their own alerts" on public.price_alerts;

create policy "Users can read only their own alerts"
on public.price_alerts for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can create only their own alerts"
on public.price_alerts for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can update only their own alerts"
on public.price_alerts for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can delete only their own alerts"
on public.price_alerts for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
