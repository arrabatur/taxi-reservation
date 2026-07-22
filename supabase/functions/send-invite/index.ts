// Edge Function : envoie un SMS d'invitation (lien vers login.html) à un
// numéro de téléphone, via l'API Twilio. Déclenchée manuellement depuis
// invite.html (page d'admin interne).
//
// Secrets requis (à définir avec `supabase secrets set`) :
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_MESSAGING_SERVICE_SID
//   ADMIN_KEY            (clé partagée qui protège cet endpoint)
//   SITE_URL              (ex: https://tonpseudo.github.io/taxi-reservation, optionnel)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminKey = req.headers.get("x-admin-key");
  if (!adminKey || adminKey !== Deno.env.get("ADMIN_KEY")) {
    return jsonResponse({ error: "Non autorisé" }, 401);
  }

  let phone: unknown;
  try {
    const body = await req.json();
    phone = body.phone;
  } catch {
    return jsonResponse({ error: "Corps de requête invalide" }, 400);
  }

  if (!phone || typeof phone !== "string") {
    return jsonResponse({ error: "Numéro de téléphone requis" }, 400);
  }

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:8099";

  if (!accountSid || !authToken || !messagingServiceSid) {
    return jsonResponse({ error: "Configuration Twilio manquante sur le serveur" }, 500);
  }

  const message = `Voliuz Transport : votre course vous attend ! Connectez-vous ici pour la réserver : ${siteUrl}/index.html`;

  const params = new URLSearchParams({
    To: phone,
    MessagingServiceSid: messagingServiceSid,
    Body: message,
  });

  const twilioResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  const twilioData = await twilioResponse.json();

  if (!twilioResponse.ok) {
    return jsonResponse({ error: twilioData.message ?? "Erreur Twilio" }, twilioResponse.status);
  }

  return jsonResponse({ success: true, sid: twilioData.sid }, 200);
});
