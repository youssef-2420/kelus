-- Material intent and processing state prepare saved sources to become inputs to
-- concept extraction without claiming that the current local MVP analyzes them.
alter table course_materials
  add column if not exists role text not null default 'notes'
    check (role in ('syllabus', 'lecture_slides', 'notes', 'past_exam', 'course_outline', 'other')),
  add column if not exists processing_status text not null default 'saved'
    check (processing_status in ('saved', 'processing', 'ready', 'failed'));

create table if not exists learning_source_references (
  id uuid primary key,
  concept_id uuid not null references concepts(id) on delete cascade,
  material_id uuid not null references course_materials(id) on delete cascade,
  label text not null,
  locator text,
  created_at timestamptz not null default now(),
  unique (concept_id, material_id, locator)
);

create index if not exists learning_source_references_concept
  on learning_source_references(concept_id);

create table if not exists learning_activities (
  id uuid primary key,
  concept_id uuid not null references concepts(id) on delete cascade,
  learn jsonb not null,
  retrieve jsonb not null,
  apply jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (concept_id)
);
