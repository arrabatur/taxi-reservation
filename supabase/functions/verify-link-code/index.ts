// Edge Function : permet au lien cliqué depuis le SMS de code (?code=XXXXXX)
// de fonctionner même quand le numéro de téléphone n'a pas été retenu par
// le navigateur qui ouvre le lien (navigation privée, appareil différent,
// stockage isolé d'une PWA...). Le template SMS de Supabase Auth n'expose
// que {{ .Code }} : impossible d'y inclure directement le numéro.
//
// À la place, on tente le code reçu contre les numéros ayant récemment
// demandé une connexion (table public.pending_logins, alimentée à chaque
// envoi de code). Aucun numéro n'est jamais renvoyé au client : seule une
// session valide est renvoyée en cas de correspondance, sinon une erreur
// générique.
//
// Ne nécessite aucun secret manuel : SUPABASE_URL, SUPABASE_ANON_KEY et
// SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CANDIDATE_WINDOW_MINUTES = 10;
const MAX_CANDIDATES = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let code: unknown;
  try {
    const body = await req.json();
    code = body.code;
  } catch {
    return jsonResponse({ error: "Corps de requête invalide" }, 400);
  }

  if (!code || typeof code !== "string") {
    return jsonResponse({ error: "Code requis" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const since = new Date(Date.now() - CANDIDATE_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data: candidates, error: candidatesError } = await adminClient
    .from("pending_logins")
    .select("phone")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_CANDIDATES);

  if (candidatesError) {
    return jsonResponse({ error: "Erreur serveur" }, 500);
  }

  const triedPhones = new Set<string>();
  for (const { phone } of candidates ?? []) {
    if (triedPhones.has(phone)) continue;
    triedPhones.add(phone);

    const authClient = createClient(supabaseUrl, anonKey);
    const { data, error } = await authClient.auth.verifyOtp({ phone, token: code, type: "sms" });

    if (!error && data.session) {
      return jsonResponse(
        {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
        200,
      );
    }
  }

  return jsonResponse({ error: "Code invalide ou expiré" }, 400);
});
