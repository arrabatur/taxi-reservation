-- ============================================================
-- Migration : ajoute les commodités spéciales de Voliuz Pirate
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

insert into public.amenities (code, label, icon, description) values
  ('shupa_shoooops', 'Sucette Shupa Shoooops', '🍭', 'Une sucette Shupa Shoooops pour la route'),
  ('wine_white_iced', 'Verre de vin blanc glacé', '🥂', 'Un verre de vin blanc bien frais'),
  ('wine_red_hot', 'Verre de vin rouge chaud', '🍷', 'Un verre de vin rouge servi chaud'),
  ('get27', 'Verre de Get 27', '🍸', 'Un petit verre de Get 27'),
  ('tisane_bonne_nuit', 'Tisane bonne nuit', '🍵', 'Une tisane apaisante pour bien dormir'),
  ('tajine_pays', 'Véritable tajine du pays', '🍲', 'Un authentique tajine, fait maison'),
  ('autre_sur_place', 'Autre chose', '❓', 'Autre envie ? À préciser directement sur place avec le chauffeur')
on conflict (code) do nothing;

insert into public.driver_amenities (driver_id, amenity_id, extra_price_cents)
select d.id, a.id, 0
from public.drivers d
join public.amenities a on a.code in (
  'shupa_shoooops', 'wine_white_iced', 'wine_red_hot', 'get27',
  'tisane_bonne_nuit', 'tajine_pays', 'autre_sur_place'
)
where d.name = 'Voliuz Pirate'
on conflict do nothing;
