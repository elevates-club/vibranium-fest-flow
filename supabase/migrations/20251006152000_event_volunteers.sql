-- Table for assigning volunteers to events
create table if not exists public.event_volunteers (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (user_id, event_id)
);

create index if not exists idx_event_volunteers_event on public.event_volunteers(event_id);
create index if not exists idx_event_volunteers_user on public.event_volunteers(user_id);

alter table public.event_volunteers enable row level security;

-- Allow reading assignments (non-sensitive)
drop policy if exists ev_vol_select_all on public.event_volunteers;
create policy ev_vol_select_all on public.event_volunteers for select using (true);

-- Allow admin or staff of matching department to insert
drop policy if exists ev_vol_insert_staff on public.event_volunteers;
create policy ev_vol_insert_staff on public.event_volunteers
for insert
with check (
  public.has_role('admin')
  or exists (
    select 1 from public.event_staff es
    join public.events e on e.id = event_volunteers.event_id
    where es.user_id = auth.uid() and es.department = e.department
  )
);

-- Allow admin or staff of matching department to delete
drop policy if exists ev_vol_delete_staff on public.event_volunteers;
create policy ev_vol_delete_staff on public.event_volunteers
for delete
using (
  public.has_role('admin')
  or exists (
    select 1 from public.event_staff es
    join public.events e on e.id = event_volunteers.event_id
    where es.user_id = auth.uid() and es.department = e.department
  )
);


