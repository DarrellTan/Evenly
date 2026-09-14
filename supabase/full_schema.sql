-- ==============================================================================
-- EVENLY - COMPLETE DATABASE SCHEMA (IDEMPOTENT & SAFE TO RE-RUN)
-- Project: onglhhfekuagozlkvavu
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/onglhhfekuagozlkvavu/sql/new
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- 2. PROFILES (Linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  avatar_url text,
  payment_handles jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view any profile" on public.profiles;
create policy "Users can view any profile"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on Supabase user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.profiles.name);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any existing users who signed up before the schema was applied
insert into public.profiles (id, email, name, avatar_url)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- 3. TRIPS
create table if not exists public.trips (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  destination text,
  start_date date,
  end_date date,
  base_currency text default 'USD' not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  invite_code text unique not null default substring(md5(random()::text), 1, 8),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.trips enable row level security;

-- 4. TRIP MEMBERS
create table if not exists public.trip_members (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('owner', 'member')) default 'member' not null,
  joined_at timestamptz default now() not null,
  unique(trip_id, user_id)
);

alter table public.trip_members enable row level security;

-- Helper function to check if current user is a trip member
create or replace function public.is_trip_member(lookup_trip_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = lookup_trip_id and user_id = auth.uid()
  );
$$ language sql security definer;

-- Trip Policies
drop policy if exists "Members can view their trips" on public.trips;
create policy "Members can view their trips"
  on public.trips for select
  using (public.is_trip_member(id) or owner_id = auth.uid());

drop policy if exists "Users can create trips" on public.trips;
create policy "Users can create trips"
  on public.trips for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Trip owners can update trips" on public.trips;
create policy "Trip owners can update trips"
  on public.trips for update
  using (owner_id = auth.uid());

drop policy if exists "Trip owners can delete trips" on public.trips;
create policy "Trip owners can delete trips"
  on public.trips for delete
  using (owner_id = auth.uid());

-- Trip Member Policies
drop policy if exists "Members can view roster of their trips" on public.trip_members;
create policy "Members can view roster of their trips"
  on public.trip_members for select
  using (public.is_trip_member(trip_id));

drop policy if exists "Users can join trips via valid invite" on public.trip_members;
create policy "Users can join trips via valid invite"
  on public.trip_members for insert
  with check (auth.uid() = user_id);

drop policy if exists "Trip owners can remove members" on public.trip_members;
create policy "Trip owners can remove members"
  on public.trip_members for delete
  using (
    exists (
      select 1 from public.trips
      where id = trip_members.trip_id and owner_id = auth.uid()
    )
    or user_id = auth.uid()
  );

-- Auto-add creator as owner member upon trip creation
create or replace function public.handle_new_trip()
returns trigger as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (trip_id, user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_trip_created on public.trips;
create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- 5. EXPENSES
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  title text not null,
  date timestamptz default now() not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text default 'USD' not null,
  exchange_rate numeric(12, 6) default 1.0 not null,
  base_currency_amount numeric(12, 2) not null,
  category text default 'other' not null,
  paid_by_user_id uuid references public.profiles(id) on delete cascade not null,
  image_url text,
  notes text,
  include_service_charge boolean default false not null,
  service_charge_percent numeric(5, 2) default 0 not null,
  include_tax boolean default false not null,
  tax_percent numeric(5, 2) default 0 not null,
  split_tax_equally boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.expenses enable row level security;

drop policy if exists "Trip members can view expenses" on public.expenses;
create policy "Trip members can view expenses"
  on public.expenses for select
  using (public.is_trip_member(trip_id));

drop policy if exists "Trip members can insert expenses" on public.expenses;
create policy "Trip members can insert expenses"
  on public.expenses for insert
  with check (public.is_trip_member(trip_id));

drop policy if exists "Trip members can update expenses" on public.expenses;
create policy "Trip members can update expenses"
  on public.expenses for update
  using (public.is_trip_member(trip_id));

drop policy if exists "Trip members can delete expenses" on public.expenses;
create policy "Trip members can delete expenses"
  on public.expenses for delete
  using (public.is_trip_member(trip_id));

-- 6. EXPENSE ITEMS (for receipt itemization)
create table if not exists public.expense_items (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  name text not null,
  amount numeric(12, 2) not null,
  quantity integer default 1 not null,
  modifiers jsonb default '[]'::jsonb
);

alter table public.expense_items enable row level security;

drop policy if exists "Trip members can view expense items" on public.expense_items;
create policy "Trip members can view expense items"
  on public.expense_items for select
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_items.expense_id and public.is_trip_member(e.trip_id)
    )
  );

drop policy if exists "Trip members can manage expense items" on public.expense_items;
create policy "Trip members can manage expense items"
  on public.expense_items for all
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_items.expense_id and public.is_trip_member(e.trip_id)
    )
  );

-- 7. EXPENSE ASSIGNMENTS
create table if not exists public.expense_assignments (
  item_id uuid references public.expense_items(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  percentage numeric(5, 4) default 1.0 not null check (percentage > 0 and percentage <= 1),
  primary key (item_id, user_id)
);

alter table public.expense_assignments enable row level security;

drop policy if exists "Trip members can view item assignments" on public.expense_assignments;
create policy "Trip members can view item assignments"
  on public.expense_assignments for select
  using (
    exists (
      select 1 from public.expense_items ei
      join public.expenses e on e.id = ei.expense_id
      where ei.id = expense_assignments.item_id and public.is_trip_member(e.trip_id)
    )
  );

drop policy if exists "Trip members can manage item assignments" on public.expense_assignments;
create policy "Trip members can manage item assignments"
  on public.expense_assignments for all
  using (
    exists (
      select 1 from public.expense_items ei
      join public.expenses e on e.id = ei.expense_id
      where ei.id = expense_assignments.item_id and public.is_trip_member(e.trip_id)
    )
  );

-- 8. SETTLEMENTS
create table if not exists public.settlements (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  from_user_id uuid references public.profiles(id) on delete cascade not null,
  to_user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text default 'USD' not null,
  status text check (status in ('pending', 'completed')) default 'completed' not null,
  proof_image_url text,
  notes text,
  settled_at timestamptz default now(),
  created_at timestamptz default now() not null
);

alter table public.settlements enable row level security;

drop policy if exists "Trip members can view settlements" on public.settlements;
create policy "Trip members can view settlements"
  on public.settlements for select
  using (public.is_trip_member(trip_id));

drop policy if exists "Trip members can manage settlements" on public.settlements;
create policy "Trip members can manage settlements"
  on public.settlements for all
  using (public.is_trip_member(trip_id));

-- 9. TRIP INVITATIONS
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

-- 10. NOTIFICATIONS
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

-- 11. ACTIVITY FEED VIEW
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

-- 12. ENABLE SUPABASE REALTIME (Safely check if already added)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trips') then
    alter publication supabase_realtime add table public.trips;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_members') then
    alter publication supabase_realtime add table public.trip_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expenses') then
    alter publication supabase_realtime add table public.expenses;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expense_items') then
    alter publication supabase_realtime add table public.expense_items;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settlements') then
    alter publication supabase_realtime add table public.settlements;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_invitations') then
    alter publication supabase_realtime add table public.trip_invitations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
