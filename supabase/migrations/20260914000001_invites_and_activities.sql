-- ==============================================================================
-- 1. TRIP INVITATIONS
-- ==============================================================================
create table if not exists public.trip_invitations (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  email text not null,
  invited_by uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending' not null,
  created_at timestamptz default now() not null,
  unique(trip_id, email)
);

alter table public.trip_invitations enable row level security;

drop policy if exists "Members can view invitations for their trips" on public.trip_invitations;
create policy "Members can view invitations for their trips"
  on public.trip_invitations for select
  using (public.is_trip_member(trip_id) or email = auth.email());

drop policy if exists "Members can create invitations" on public.trip_invitations;
create policy "Members can create invitations"
  on public.trip_invitations for insert
  with check (public.is_trip_member(trip_id) and invited_by = auth.uid());

drop policy if exists "Invited users can update their invitation status" on public.trip_invitations;
create policy "Invited users can update their invitation status"
  on public.trip_invitations for update
  using (email = auth.email());

-- ==============================================================================
-- 2. NOTIFICATIONS
-- ==============================================================================
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  reference_id uuid,
  message text not null,
  read boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "Users can update their own notifications (mark read)" on public.notifications;
create policy "Users can update their own notifications (mark read)"
  on public.notifications for update
  using (user_id = auth.uid());

-- Trigger to create notification when a user is invited
create or replace function public.handle_new_invitation()
returns trigger as $$
declare
  invitee_id uuid;
  inviter_name text;
  trip_name text;
begin
  select id into invitee_id from public.profiles where email = new.email limit 1;
  
  if invitee_id is not null then
    select name into inviter_name from public.profiles where id = new.invited_by limit 1;
    select name into trip_name from public.trips where id = new.trip_id limit 1;
    
    insert into public.notifications (user_id, type, reference_id, message)
    values (
      invitee_id, 
      'invite', 
      new.trip_id, 
      inviter_name || ' invited you to join ' || trip_name
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_trip_invitation_created on public.trip_invitations;
create trigger on_trip_invitation_created
  after insert on public.trip_invitations
  for each row execute function public.handle_new_invitation();

-- ==============================================================================
-- 3. ACTIVITY FEED VIEW
-- ==============================================================================
create or replace view public.trip_activities as
  select 
    e.id as activity_id,
    e.trip_id,
    e.created_at,
    'expense_added' as activity_type,
    e.paid_by_user_id as user_id,
    e.amount,
    e.currency,
    e.title as description
  from public.expenses e
  
  union all
  
  select 
    s.id as activity_id,
    s.trip_id,
    s.created_at,
    'settled' as activity_type,
    s.from_user_id as user_id,
    s.amount,
    s.currency,
    'Paid ' || p.name as description
  from public.settlements s
  join public.profiles p on p.id = s.to_user_id
  
  union all
  
  select 
    tm.id as activity_id,
    tm.trip_id,
    tm.joined_at as created_at,
    'member_joined' as activity_type,
    tm.user_id as user_id,
    0 as amount,
    'USD' as currency,
    'Joined the trip' as description
  from public.trip_members tm;

-- ==============================================================================
-- 4. ENABLE REALTIME
-- ==============================================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_invitations') then
    alter publication supabase_realtime add table public.trip_invitations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
