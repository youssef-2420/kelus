-- Kelus core learning model. The static MVP currently persists through the
-- browser adapter; this schema is the server-persistence contract.
create table if not exists profiles (
  id uuid primary key,
  display_name text not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists exams (
  id uuid primary key,
  course_id uuid not null references courses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  exam_date timestamptz not null,
  target_percent integer not null check (target_percent between 50 and 100),
  available_minutes integer not null check (available_minutes between 15 and 90),
  is_active boolean not null default true
);

create table if not exists concepts (
  id uuid primary key,
  course_id uuid not null references courses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  exam_importance double precision not null check (exam_importance between 0 and 1),
  difficulty double precision not null check (difficulty between 0 and 1),
  estimated_minutes integer not null,
  mastery double precision not null check (mastery between 0 and 1),
  confidence double precision not null check (confidence between 0 and 1),
  predicted_retention double precision not null check (predicted_retention between 0 and 1),
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  retrieval_attempts integer not null default 0,
  successful_retrievals integer not null default 0,
  failed_retrievals integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists concept_relationships (
  id uuid primary key,
  from_id uuid not null references concepts(id) on delete cascade,
  to_id uuid not null references concepts(id) on delete cascade,
  kind text not null check (kind in ('prerequisite', 'related')),
  unique (from_id, to_id, kind)
);

create table if not exists prompts (
  id uuid primary key,
  concept_id uuid not null references concepts(id) on delete cascade,
  prompt_text text not null,
  model_answer text not null
);

create table if not exists study_sessions (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  planned_minutes integer not null,
  readiness_before double precision not null,
  initial_route jsonb not null,
  latest_route jsonb not null,
  route_changes jsonb not null default '[]'::jsonb,
  status text not null check (status in ('in_progress', 'complete')),
  summary jsonb
);

create table if not exists learning_events (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  session_id uuid references study_sessions(id) on delete set null,
  kind text not null,
  outcome text,
  self_rating text,
  assistance text not null default 'none',
  response_time_ms integer,
  prompt_id uuid references prompts(id) on delete set null,
  response_text text,
  mastery_before double precision not null,
  mastery_after double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists learning_events_concept_time on learning_events(concept_id, created_at);
create index if not exists learning_events_user_time on learning_events(user_id, created_at);
create index if not exists concepts_course on concepts(course_id);
