-- Extend registration statuses to support approval workflow
-- Adds: pending, approved, denied

-- Drop existing status check constraint if it exists (name may vary in environments)
alter table if exists public.event_registrations
  drop constraint if exists event_registrations_status_check;

-- Recreate status check with new allowed values
alter table public.event_registrations
  add constraint event_registrations_status_check
  check (status in ('pending', 'approved', 'denied', 'registered', 'checked_in', 'attended', 'cancelled'));

-- Optional helpful indexes for coordinator dashboards
create index if not exists idx_event_registrations_event_status on public.event_registrations(event_id, status);
create index if not exists idx_event_registrations_user on public.event_registrations(user_id);


