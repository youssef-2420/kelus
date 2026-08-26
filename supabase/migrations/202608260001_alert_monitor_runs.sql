create table if not exists public.price_alert_monitor_runs (
  id uuid primary key,
  scope_user_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null,
  completed_at timestamptz,
  checked_alerts integer not null default 0,
  searched_configurations integer not null default 0,
  failed_configurations integer not null default 0,
  queued_events integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists price_alert_monitor_runs_started_at_idx
on public.price_alert_monitor_runs(started_at desc);

alter table public.price_alert_monitor_runs enable row level security;

-- Monitor runs are operational audit records. Only the server service role writes
-- or reads them; no browser role receives access to aggregate monitoring data.
revoke all on table public.price_alert_monitor_runs from anon, authenticated;
