-- ============================================================
-- Migration : ajoute un libellé de prix textuel aux chauffeurs Voliuz
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

alter table public.drivers add column if not exists price_label text;

update public.drivers set price_label = 'Trop cher' where name = 'Voliuz Leader';
update public.drivers set price_label = 'Promo' where name = 'Voliuz Pirate';
update public.drivers set price_label = 'Ne te payera pas un verre — même pas' where name = 'Voliuz Communication';
