-- ============================================================
-- QuickDrop — Supabase Postgres Schema
-- Run this in the Supabase SQL Editor to set up all tables,
-- Row Level Security policies, and Realtime publications.
-- ============================================================

-- ────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists postgis;   -- optional: for geo queries

-- ────────────────────────────────────────
-- ENUM types
-- ────────────────────────────────────────
do $$ begin
  create type online_status as enum ('Online', 'Offline');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ride_status as enum (
    'pending', 'accepted', 'started', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────
-- users
-- ────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key default uuid_generate_v4(),
  uid           text unique not null,  -- Supabase auth user id
  email         text unique,
  display_name  text not null default '',
  photo_url     text default '',
  phone_number  text default '',
  created_time  timestamptz default now(),
  is_active     boolean default true,
  is_online     online_status default 'Offline',
  wallet_balance numeric(12,2) default 0,
  numbe_trips   int default 0,
  "User_CurrentLocation" text default '',
  lat           double precision default 0,
  lng           double precision default 0
);

alter table public.users enable row level security;

create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid()::text = uid);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid()::text = uid);

create policy "Allow insert on signup"
  on public.users for insert
  with check (auth.uid()::text = uid);

-- ────────────────────────────────────────
-- drivers
-- ────────────────────────────────────────
create table if not exists public.drivers (
  id            uuid primary key default uuid_generate_v4(),
  uid           text unique not null,
  email         text unique,
  full_name     text not null default '',
  phone_number  text default '',
  photo_url     text default '',
  is_active     boolean default true,
  is_online     online_status default 'Offline',
  is_available  boolean default false,
  vehicle_type  text default '',
  vehicle_plate text default '',
  rating        numeric(3,2) default 5.0,
  total_trips   int default 0,
  lat           double precision default 0,
  lng           double precision default 0,
  created_time  timestamptz default now()
);

alter table public.drivers enable row level security;

create policy "Drivers can view their own row"
  on public.drivers for select
  using (auth.uid()::text = uid);

create policy "Drivers can update their own row"
  on public.drivers for update
  using (auth.uid()::text = uid);

create policy "Passengers can view available drivers"
  on public.drivers for select
  using (is_available = true);

-- ────────────────────────────────────────
-- ride_options
-- ────────────────────────────────────────
create table if not exists public.ride_options (
  id              uuid primary key default uuid_generate_v4(),
  "Type"          text not null,
  price           text default '0.00',
  features        text default '',
  numbersofseats  text default '4',
  image_url       text default ''
);

alter table public.ride_options enable row level security;

create policy "Anyone can read ride options"
  on public.ride_options for select
  using (true);

-- Seed default ride options (idempotent)
insert into public.ride_options ("Type", price, features, numbersofseats)
values
  ('Standard', '25.00', '4 seats', '4'),
  ('Premium',  '45.00', 'Luxury, 4 seats', '4'),
  ('XL',       '35.00', '6 seats', '6')
on conflict do nothing;

-- ────────────────────────────────────────
-- cities
-- ────────────────────────────────────────
create table if not exists public.cities (
  id            uuid primary key default uuid_generate_v4(),
  location_name text not null,
  lat           double precision default 0,
  lng           double precision default 0
);

alter table public.cities enable row level security;

create policy "Anyone can read cities"
  on public.cities for select
  using (true);

-- Seed default cities
insert into public.cities (location_name, lat, lng)
values
  ('San Francisco, CA', 37.7749, -122.4194),
  ('Los Angeles, CA',   34.0522, -118.2437),
  ('New York, NY',      40.7128, -74.0060)
on conflict do nothing;

-- ────────────────────────────────────────
-- rides
-- ────────────────────────────────────────
create table if not exists public.rides (
  id                  uuid primary key default uuid_generate_v4(),
  passenger_id        text references public.users(uid) on delete cascade,
  driver_id           text references public.drivers(uid) on delete set null,
  ride_option_id      uuid references public.ride_options(id),
  status              ride_status default 'pending',
  pickup_address      text default '',
  dropoff_address     text default '',
  pickup_lat          double precision default 0,
  pickup_lng          double precision default 0,
  dropoff_lat         double precision default 0,
  dropoff_lng         double precision default 0,
  fare                numeric(12,2) default 0,
  rating              int,
  created_time        timestamptz default now(),
  accepted_at         timestamptz,
  started_at          timestamptz,
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text
);

alter table public.rides enable row level security;

create policy "Passengers can view their own rides"
  on public.rides for select
  using (auth.uid()::text = passenger_id);

create policy "Drivers can view rides assigned to them"
  on public.rides for select
  using (auth.uid()::text = driver_id);

create policy "Drivers can view pending rides"
  on public.rides for select
  using (status = 'pending');

create policy "Passengers can create rides"
  on public.rides for insert
  with check (auth.uid()::text = passenger_id);

create policy "Drivers and passengers can update rides"
  on public.rides for update
  using (
    auth.uid()::text = passenger_id or
    auth.uid()::text = driver_id
  );

-- ────────────────────────────────────────
-- payments
-- ────────────────────────────────────────
create table if not exists public.payments (
  id            uuid primary key default uuid_generate_v4(),
  ride_id       uuid references public.rides(id) on delete cascade,
  passenger_id  text references public.users(uid),
  driver_id     text references public.drivers(uid),
  amount        numeric(12,2) default 0,
  status        text default 'pending',  -- pending | completed | failed
  method        text default 'wallet',
  created_time  timestamptz default now()
);

alter table public.payments enable row level security;

create policy "Users can view their own payments"
  on public.payments for select
  using (
    auth.uid()::text = passenger_id or
    auth.uid()::text = driver_id
  );

-- ────────────────────────────────────────
-- payment_details
-- ────────────────────────────────────────
create table if not exists public.payment_details (
  id            uuid primary key default uuid_generate_v4(),
  payment_id    uuid references public.payments(id) on delete cascade,
  card_number   text default '',
  card_expiry   text default '',
  card_holder   text default '',
  created_time  timestamptz default now()
);

alter table public.payment_details enable row level security;

create policy "Users can view their own payment details"
  on public.payment_details for select
  using (
    auth.uid()::text = (
      select passenger_id from public.payments p where p.id = payment_id
    )
  );

-- ────────────────────────────────────────
-- Realtime — enable for the tables that need live updates
-- ────────────────────────────────────────
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.drivers;
alter publication supabase_realtime add table public.users;
