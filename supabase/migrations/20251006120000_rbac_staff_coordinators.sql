-- Tables for role scoping
create table if not exists public.event_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  department text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.event_coordinators (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (user_id, event_id)
);

create index if not exists idx_event_staff_department on public.event_staff(department);
create index if not exists idx_event_coordinators_event on public.event_coordinators(event_id);
create index if not exists idx_event_coordinators_user on public.event_coordinators(user_id);

-- Helper: does user have role (cast enum to text for comparison)
create or replace function public.has_role(role_name text)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role::text = role_name
  );
$$;

-- RLS for events: allow edit by admin, or staff matching department, or coordinator of the event
alter table public.events enable row level security;

-- events select
drop policy if exists events_select_all on public.events;
create policy events_select_all on public.events
for select using (true);

-- events insert
drop policy if exists events_insert_staff on public.events;
create policy events_insert_staff on public.events
for insert with check (
  public.has_role('admin')
  or (
    public.has_role('staff') and exists (
      select 1 from public.event_staff es
      where es.user_id = auth.uid() and es.department = events.department
    )
  )
);

-- events update
drop policy if exists events_update_scoped on public.events;
create policy events_update_scoped on public.events
for update using (
  public.has_role('admin')
  or (
    public.has_role('staff') and exists (
      select 1 from public.event_staff es
      where es.user_id = auth.uid() and es.department = events.department
    )
  )
  or (
    public.has_role('coordinator') and exists (
      select 1 from public.event_coordinators ec
      where ec.user_id = auth.uid() and ec.event_id = events.id
    )
  )
) with check (
  public.has_role('admin')
  or (
    public.has_role('staff') and exists (
      select 1 from public.event_staff es
      where es.user_id = auth.uid() and es.department = events.department
    )
  )
  or (
    public.has_role('coordinator') and exists (
      select 1 from public.event_coordinators ec
      where ec.user_id = auth.uid() and ec.event_id = events.id
    )
  )
);

-- RLS for event_registrations moderation by coordinators
alter table public.event_registrations enable row level security;

-- registrations select
drop policy if exists regs_select_all on public.event_registrations;
create policy regs_select_all on public.event_registrations
for select using (true);

-- registrations update (moderate)
drop policy if exists regs_update_moderate on public.event_registrations;
create policy regs_update_moderate on public.event_registrations
for update using (
  public.has_role('admin')
  or exists (
    select 1 from public.event_coordinators ec
    where ec.user_id = auth.uid() and ec.event_id = event_registrations.event_id
  )
) with check (
  public.has_role('admin')
  or exists (
    select 1 from public.event_coordinators ec
    where ec.user_id = auth.uid() and ec.event_id = event_registrations.event_id
  )
);
