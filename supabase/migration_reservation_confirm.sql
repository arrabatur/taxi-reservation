-- ============================================================
-- Migration : autorise la mise à jour du statut de sa propre
-- réservation (nécessaire pour le flux de confirmation par lien SMS).
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

create policy "reservations_owner_update" on public.reservations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
