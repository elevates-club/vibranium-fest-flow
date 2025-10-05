-- Event views tracking table
create table if not exists public.event_views (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid null,
  session_id text null,
  viewed_at timestamptz not null default now()
);

-- Helpful index for analytics
create index if not exists idx_event_views_event_id on public.event_views(event_id);
create index if not exists idx_event_views_viewed_at on public.event_views(viewed_at);

-- RLS: allow insert for anon to record views; restrict select to organizers/admins later if needed
alter table public.event_views enable row level security;

do $$ begin
  create policy event_views_insert_any on public.event_views
  for insert
  to anon, authenticated
  with check (true);
exception when duplicate_object then null; end $$;

comment on table public.event_views is 'Tracks event page/card views for funnel analytics';

