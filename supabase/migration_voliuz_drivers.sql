-- ============================================================
-- Migration : remplace les 4 chauffeurs existants par les 3 "Voliuz"
-- À exécuter dans Supabase > SQL Editor (nécessite les droits admin,
-- l'anon key utilisée par le site n'a que le droit de lecture sur drivers)
-- ============================================================

-- Ajoute les colonnes de disponibilité si elles n'existent pas encore
alter table public.drivers add column if not exists is_available boolean not null default true;
alter table public.drivers add column if not exists availability_note text;

-- Supprime les agréments et réservations liés aux anciens chauffeurs
delete from public.reservation_amenities
where reservation_id in (
  select id from public.reservations
);
delete from public.reservations;
delete from public.driver_amenities;
delete from public.drivers;

insert into public.drivers (name, vehicle, photo_emoji, rating, years_experience, bio, base_price_cents, is_available, availability_note) values
  ('Voliuz Leader', 'Mercedes Classe E — Noir', '🚖', 4.9, 8, 'Chauffeur professionnel, spécialiste des trajets aéroport. Ponctuel et discret.', 2200, false, 'Indisponible, en train de surveiller le travail'),
  ('Voliuz Pirate', 'Tesla Model 3 — Blanc', '🚕', 4.8, 5, 'Trajet 100% électrique, silencieux et confortable. Idéal pour vos rendez-vous professionnels.', 2000, true, 'Disponible uniquement sur les heures de bureau'),
  ('Voliuz Communication', 'Peugeot 508 — Gris', '🚗', 4.7, 3, 'Bonne humeur garantie ! Parfait pour les groupes et les longs trajets.', 1700, false, 'Absent pour s''occuper du iench');

insert into public.driver_amenities (driver_id, amenity_id, extra_price_cents)
select d.id, a.id, extra
from (values
  ('Voliuz Leader', 'wifi', 0),
  ('Voliuz Leader', 'meet_greet', 500),
  ('Voliuz Leader', 'luggage_xl', 0),
  ('Voliuz Leader', 'bottled_water', 0),
  ('Voliuz Pirate', 'wifi', 0),
  ('Voliuz Pirate', 'phone_charger', 0),
  ('Voliuz Pirate', 'quiet_ride', 0),
  ('Voliuz Pirate', 'bottled_water', 0),
  ('Voliuz Communication', 'pet_friendly', 0),
  ('Voliuz Communication', 'phone_charger', 0),
  ('Voliuz Communication', 'luggage_xl', 0)
) as t(driver_name, amenity_code, extra)
join public.drivers d on d.name = t.driver_name
join public.amenities a on a.code = t.amenity_code;
