-- ============================================================
-- Migration : questionnaire "service de nettoyage de poubelle"
-- proposé avant le retour à l'accueil depuis l'écran de confirmation
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

create table if not exists public.trash_service_survey (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_number text,
  wants_service boolean not null,
  price_choice text,
  created_at timestamptz not null default now()
);

alter table public.trash_service_survey enable row level security;

create policy "trash_survey_owner_insert" on public.trash_service_survey
  for insert with check (auth.uid() = user_id);

create policy "trash_survey_owner_select" on public.trash_service_survey
  for select using (auth.uid() = user_id);

-- Exemple : voir toutes les réponses (depuis le SQL Editor, en tant qu'admin)
-- select * from public.trash_service_survey order by created_at desc;
