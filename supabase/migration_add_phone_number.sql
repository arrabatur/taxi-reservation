-- ============================================================
-- Migration : ajoute le numéro de téléphone sur chaque réservation
-- + une vue récapitulative (chauffeur + agréments par numéro)
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

alter table public.reservations add column if not exists phone_number text;

create or replace view public.reservation_summary as
select
  r.id as reservation_id,
  r.phone_number,
  r.status,
  d.name as driver_name,
  r.pickup_date,
  r.pickup_time,
  r.created_at,
  coalesce(array_agg(a.label) filter (where a.label is not null), '{}') as amenities
from public.reservations r
join public.drivers d on d.id = r.driver_id
left join public.reservation_amenities ra on ra.reservation_id = r.id
left join public.amenities a on a.id = ra.amenity_id
group by r.id, r.phone_number, r.status, d.name, r.pickup_date, r.pickup_time, r.created_at
order by r.created_at desc;

-- Exemple : voir les choix d'une personne précise
-- select * from public.reservation_summary where phone_number = '+32470123456';
