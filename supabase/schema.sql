-- ============================================================
-- Schéma de base de données pour le service de réservation taxi
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- Chauffeurs disponibles
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vehicle text not null,
  photo_emoji text not null default '🚕',
  rating numeric(2,1) not null default 5.0,
  years_experience int not null default 1,
  bio text,
  base_price_cents int not null default 1500,
  price_label text,
  is_available boolean not null default true,
  availability_note text,
  created_at timestamptz not null default now()
);

-- Catalogue global des agréments/options possibles
create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text not null,
  icon text not null default '✨',
  description text
);

-- Agréments proposés par chaque chauffeur, avec supplément de prix
create table if not exists public.driver_amenities (
  driver_id uuid not null references public.drivers(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  extra_price_cents int not null default 0,
  primary key (driver_id, amenity_id)
);

-- Réservations effectuées par les clients authentifiés (magic link)
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  driver_id uuid not null references public.drivers(id),
  pickup_date date not null,
  pickup_time time not null,
  pickup_address text not null,
  dropoff_address text not null,
  passengers int not null default 1,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Agréments choisis pour une réservation donnée
create table if not exists public.reservation_amenities (
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id),
  primary key (reservation_id, amenity_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.drivers enable row level security;
alter table public.amenities enable row level security;
alter table public.driver_amenities enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_amenities enable row level security;

-- Lecture publique du catalogue chauffeurs / agréments (pas besoin d'être connecté pour consulter)
create policy "drivers_public_read" on public.drivers
  for select using (true);

create policy "amenities_public_read" on public.amenities
  for select using (true);

create policy "driver_amenities_public_read" on public.driver_amenities
  for select using (true);

-- Réservations : chaque utilisateur ne voit / crée que les siennes
create policy "reservations_owner_select" on public.reservations
  for select using (auth.uid() = user_id);

create policy "reservations_owner_insert" on public.reservations
  for insert with check (auth.uid() = user_id);

create policy "reservations_owner_update" on public.reservations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Agréments de réservation : accessibles seulement si la réservation appartient à l'utilisateur
create policy "reservation_amenities_owner_select" on public.reservation_amenities
  for select using (
    exists (
      select 1 from public.reservations r
      where r.id = reservation_amenities.reservation_id
        and r.user_id = auth.uid()
    )
  );

create policy "reservation_amenities_owner_insert" on public.reservation_amenities
  for insert with check (
    exists (
      select 1 from public.reservations r
      where r.id = reservation_amenities.reservation_id
        and r.user_id = auth.uid()
    )
  );
