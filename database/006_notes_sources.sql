-- Allow notes (Markdown / plain text) as a course source, alongside PDFs.
-- Run once in the Supabase SQL editor before signed-in learners add notes. Safe to run twice.
-- Until it is applied, notes still work on the device; only cloud sync of a notes source is refused.

alter table public.course_materials drop constraint if exists course_materials_kind_check;
alter table public.course_materials
  add constraint course_materials_kind_check check (kind in ('pdf', 'text', 'video', 'link'));

update storage.buckets
set allowed_mime_types = array['application/pdf', 'text/markdown', 'text/plain'],
    file_size_limit = 20971520
where id = 'kelus-course-materials';
