-- Record-level material synchronization. A row per source avoids whole-library
-- last-write-wins conflicts and deleted_at prevents removed files resurfacing.
create table if not exists course_materials (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  course_id text not null,
  kind text not null check (kind in ('pdf', 'video', 'link')),
  storage text not null check (storage in ('local', 'url')),
  title text not null,
  source_url text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  role text not null,
  processing_status text not null,
  added_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create index if not exists course_materials_user_updated_idx
  on course_materials (user_id, updated_at desc);

alter table course_materials enable row level security;

create policy "course_materials_select_own" on course_materials
  for select to authenticated using (auth.uid() = user_id);
create policy "course_materials_insert_own" on course_materials
  for insert to authenticated with check (auth.uid() = user_id);
create policy "course_materials_update_own" on course_materials
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "course_materials_delete_own" on course_materials
  for delete to authenticated using (auth.uid() = user_id);
