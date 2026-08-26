create table if not exists public.price_alert_notifications (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique references public.price_alert_events(event_key) on delete cascade,
  user_id uuid not null,
  alert_id text not null,
  provider text not null check (provider = 'resend'),
  status text not null check (status in ('pending', 'sending', 'sent', 'failed')),
  attempt_count integer not null default 0,
  first_attempt_at timestamptz,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, alert_id) references public.price_alerts(user_id, id) on delete cascade
);

create index if not exists price_alert_notifications_delivery_idx
on public.price_alert_notifications(status, last_attempt_at, created_at);

alter table public.price_alert_notifications enable row level security;
revoke all on table public.price_alert_notifications from anon, authenticated;
grant select on table public.price_alert_notifications to authenticated;

drop policy if exists "Users can read only their own alert notifications" on public.price_alert_notifications;
create policy "Users can read only their own alert notifications"
on public.price_alert_notifications for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.claim_price_alert_notifications(p_limit integer default 50)
returns table (
  notification_id uuid,
  event_key text,
  user_id uuid,
  alert_id text,
  event_data jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select notification.id
    from public.price_alert_notifications notification
    where notification.status = 'pending'
      or (
        notification.status = 'failed'
        and notification.attempt_count < 5
        and notification.first_attempt_at > now() - interval '20 hours'
        and notification.last_attempt_at < now() - interval '15 minutes'
      )
    order by notification.created_at
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  ), claimed as (
    update public.price_alert_notifications notification
    set status = 'sending',
        attempt_count = notification.attempt_count + 1,
        first_attempt_at = coalesce(notification.first_attempt_at, now()),
        last_attempt_at = now(),
        updated_at = now()
    from candidates
    where notification.id = candidates.id
    returning notification.id, notification.event_key, notification.user_id, notification.alert_id
  )
  select claimed.id, claimed.event_key, claimed.user_id, claimed.alert_id, event.event_data
  from claimed
  join public.price_alert_events event on event.event_key = claimed.event_key;
end;
$$;

revoke all on function public.claim_price_alert_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_price_alert_notifications(integer) to service_role;

alter table public.price_alert_monitor_runs
  add column if not exists notifications_queued integer not null default 0,
  add column if not exists notifications_sent integer not null default 0,
  add column if not exists notifications_failed integer not null default 0;
