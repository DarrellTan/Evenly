-- 1. TRIP INVITATIONS
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

-- Only members can invite others to a trip
create policy "Members can view invitations for their trips"
  on public.trip_invitations for select
  using (public.is_trip_member(trip_id) or email = auth.email());

create policy "Members can create invitations"
  on public.trip_invitations for insert
  with check (public.is_trip_member(trip_id) and invited_by = auth.uid());

create policy "Invited users can update their invitation status"
  on public.trip_invitations for update
  using (email = auth.email());

-- 2. NOTIFICATIONS
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null, -- 'invite', 'expense_added', 'settled', etc.
  reference_id uuid, -- could be trip_id, expense_id, etc.
  message text not null,
  read boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can update their own notifications (mark read)"
  on public.notifications for update
  using (user_id = auth.uid());

-- Trigger to create notification when a user is invited (and already has an account)
create or replace function public.handle_new_invitation()
returns trigger as $$
declare
  invitee_id uuid;
  inviter_name text;
  trip_name text;
begin
  -- Check if user exists
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

create or replace trigger on_trip_invitation_created
  after insert on public.trip_invitations
  for each row execute function public.handle_new_invitation();

-- 3. ACTIVITY FEED VIEW
-- Unifies Expenses, Settlements, and Joins into a single chronological feed
create or replace view public.trip_activities as
  -- Expenses
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
  
  -- Settlements
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
  
  -- Members Joining
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

-- Enable Realtime for new tables
alter publication supabase_realtime add table public.trip_invitations;
alter publication supabase_realtime add table public.notifications;
