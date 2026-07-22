-- ============================================================
-- Migration : met à jour véhicule, description et price_label
-- des chauffeurs Voliuz
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

update public.drivers
set vehicle = 'Renault Scenic 98 - vert pomme',
    bio = 'A souvent atteint son poste en passant plus de temps à essayer de ne rien faire et à faire porter le chapeau par un autre.'
where name = 'Voliuz Leader';

update public.drivers
set vehicle = 'Volvo XC 60 modèle 2017 - RAL 7018',
    bio = 'Souriant et disponible, préfère passer son temps a emmerder les VOLIUZ LEADERS sur la route'
where name = 'Voliuz Pirate';

update public.drivers
set vehicle = '504 modèle pré-retraité',
    bio = 'Abonné au Figaro, fan des punks à chiens, first groupie du collectif VOLIUZ LEADERS -',
    price_label = 'Aime la sauce'
where name = 'Voliuz Communication';
