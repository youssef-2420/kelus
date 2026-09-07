-- Private, account-scoped material metadata and PDFs. The browser keeps its
-- local-first copy; this layer restores the same sources on another device.
create table if not exists material_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  materials jsonb not null default '[]'::jsonb,
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table material_states enable row level security;

create policy "material_states_select_own"
  on material_states for select
  using (auth.uid() = user_id);

create policy "material_states_insert_own"
  on material_states for insert
  with check (auth.uid() = user_id);

create policy "material_states_update_own"
  on material_states for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "material_states_delete_own"
  on material_states for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kelus-course-materials', 'kelus-course-materials', false, 20971520, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "course_material_files_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'kelus-course-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "course_material_files_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'kelus-course-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "course_material_files_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'kelus-course-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'kelus-course-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "course_material_files_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'kelus-course-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
