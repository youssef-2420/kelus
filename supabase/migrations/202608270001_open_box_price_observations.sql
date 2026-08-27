alter table public.price_observations
  drop constraint if exists price_observations_condition_check;

alter table public.price_observations
  add constraint price_observations_condition_check
  check (condition in ('new', 'open_box', 'used', 'refurbished'));
