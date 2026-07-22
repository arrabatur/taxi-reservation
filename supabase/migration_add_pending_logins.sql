-- ============================================================
-- Migration : table pending_logins pour retrouver le numéro de téléphone
-- au clic du lien SMS quand le navigateur ne l'a pas gardé en mémoire
-- (navigation privée, appareil différent, stockage isolé d'une PWA...).
-- Utilisée par l'edge function verify-link-code.
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

create table if not exists public.pending_logins (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  created_at timestamptz not null default now()
);

alter table public.pending_logins enable row level security;

create policy "pending_logins_public_insert" on public.pending_logins
  for insert with check (true);

-- Aucune policy select : la table n'est lisible que par l'edge function
-- (clé service_role), jamais par le client (anon/authenticated).
