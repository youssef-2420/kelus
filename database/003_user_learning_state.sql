-- Authenticated cross-device state for the current Kelus learning engine.
-- The state remains a single versioned document while the product model is
-- evolving; user ownership is enforced by RLS at every operation.
create table if not exists learner_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table learner_states enable row level security;

create policy "learner_states_select_own"
  on learner_states for select
  using (auth.uid() = user_id);

create policy "learner_states_insert_own"
  on learner_states for insert
  with check (auth.uid() = user_id);

create policy "learner_states_update_own"
  on learner_states for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "learner_states_delete_own"
  on learner_states for delete
  using (auth.uid() = user_id);
