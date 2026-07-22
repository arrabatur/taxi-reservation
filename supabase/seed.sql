-- ============================================================
-- Données de démonstration : chauffeurs et agréments
-- À exécuter APRÈS schema.sql dans Supabase > SQL Editor
-- ============================================================

insert into public.amenities (code, label, icon, description) values
  ('wifi', 'Wi-Fi à bord', '📶', 'Connexion Wi-Fi gratuite pendant le trajet'),
  ('child_seat', 'Siège enfant', '🧒', 'Siège auto homologué pour enfant'),
  ('pet_friendly', 'Animaux acceptés', '🐾', 'Le chauffeur accepte les animaux de compagnie'),
  ('luggage_xl', 'Bagages volumineux', '🧳', 'Coffre adapté aux gros bagages / matériel de sport'),
  ('phone_charger', 'Chargeur téléphone', '🔌', 'Câbles de charge USB-C / Lightning disponibles'),
  ('quiet_ride', 'Trajet silencieux', '🤫', 'Trajet sans musique ni conversation, sur demande'),
  ('bottled_water', 'Eau offerte', '💧', 'Bouteille d''eau offerte à bord'),
  ('meet_greet', 'Accueil personnalisé', '🪧', 'Accueil avec pancarte nominative (aéroport/gare)'),
  ('shupa_shoooops', 'Sucette Shupa Shoooops', '🍭', 'Une sucette Shupa Shoooops pour la route'),
  ('wine_white_iced', 'Verre de vin blanc glacé', '🥂', 'Un verre de vin blanc bien frais'),
  ('wine_red_hot', 'Verre de vin rouge chaud', '🍷', 'Un verre de vin rouge servi chaud'),
  ('get27', 'Verre de Get 27', '🍸', 'Un petit verre de Get 27'),
  ('tisane_bonne_nuit', 'Tisane bonne nuit', '🍵', 'Une tisane apaisante pour bien dormir'),
  ('tajine_pays', 'Véritable tajine du pays', '🍲', 'Un authentique tajine, fait maison'),
  ('autre_sur_place', 'Autre chose', '❓', 'Autre envie ? À préciser directement sur place avec le chauffeur')
on conflict (code) do nothing;

insert into public.drivers (name, vehicle, photo_emoji, rating, years_experience, bio, base_price_cents, price_label, is_available, availability_note) values
  ('Voliuz Leader', 'Renault Scenic 98 - vert pomme', '🚖', 4.9, 8, 'A souvent atteint son poste en passant plus de temps à essayer de ne rien faire et à faire porter le chapeau par un autre.', 2200, 'Trop cher', false, 'Indisponible, en train de surveiller le travail'),
  ('Voliuz Pirate', 'Volvo XC 60 modèle 2017 - RAL 7018', '🚕', 4.8, 5, 'Souriant et disponible, préfère passer son temps a emmerder les VOLIUZ LEADERS sur la route', 2000, 'Promo', true, 'Disponible uniquement sur les heures de bureau'),
  ('Voliuz Communication', '504 modèle pré-retraité', '🚗', 4.7, 3, 'Abonné au Figaro, fan des punks à chiens, first groupie du collectif VOLIUZ LEADERS -', 1700, 'Aime la sauce', false, 'Absent pour s''occuper du iench')
on conflict do nothing;

-- Associer des agréments à chaque chauffeur (avec supplément éventuel)
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
  ('Voliuz Pirate', 'shupa_shoooops', 0),
  ('Voliuz Pirate', 'wine_white_iced', 0),
  ('Voliuz Pirate', 'wine_red_hot', 0),
  ('Voliuz Pirate', 'get27', 0),
  ('Voliuz Pirate', 'tisane_bonne_nuit', 0),
  ('Voliuz Pirate', 'tajine_pays', 0),
  ('Voliuz Pirate', 'autre_sur_place', 0),
  ('Voliuz Communication', 'pet_friendly', 0),
  ('Voliuz Communication', 'phone_charger', 0),
  ('Voliuz Communication', 'luggage_xl', 0)
) as t(driver_name, amenity_code, extra)
join public.drivers d on d.name = t.driver_name
join public.amenities a on a.code = t.amenity_code
on conflict do nothing;
