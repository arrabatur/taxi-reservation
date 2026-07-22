import { supabase } from "./supabaseClient.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const PENDING_PHONE_KEY = "voliuz_pending_phone";

/**
 * Le SMS envoyé ne contient que le code ({{ .Code }}, seule variable
 * disponible dans le template Supabase) sous forme de lien cliquable.
 * On garde le numéro en attente de vérification en local pour pouvoir
 * vérifier automatiquement dès que le lien est ouvert, sans le ressaisir.
 */
export function getPendingPhone() {
  return localStorage.getItem(PENDING_PHONE_KEY);
}

function setPendingPhone(phone) {
  localStorage.setItem(PENDING_PHONE_KEY, phone);
}

function clearPendingPhone() {
  localStorage.removeItem(PENDING_PHONE_KEY);
}

/**
 * Envoie un code de connexion à usage unique par SMS (via Twilio,
 * configuré dans Supabase Auth > Providers > Phone).
 */
export async function sendPhoneOtp(phone) {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: "sms" },
  });
  if (error) throw error;
  setPendingPhone(phone);

  // Garde aussi une trace côté serveur de ce numéro en attente : permet de
  // retrouver automatiquement le bon numéro au clic du lien SMS même si le
  // localStorage de ce navigateur/appareil n'a pas persisté (navigation
  // privée, stockage isolé d'une PWA ajoutée à l'écran d'accueil, ITP...).
  const { error: pendingError } = await supabase.from("pending_logins").insert({ phone });
  if (pendingError) {
    console.error("Erreur enregistrement pending_logins :", pendingError.message);
  }
}

/**
 * Vérifie le code reçu par SMS et établit la session.
 */
export async function verifyPhoneOtp(phone, token) {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw error;
  clearPendingPhone();
}

/**
 * Lien SMS ouvert sans numéro retenu localement : demande au serveur
 * d'essayer le code contre les numéros ayant récemment demandé une
 * connexion (edge function verify-link-code, qui ne renvoie jamais les
 * numéros eux-mêmes, seulement une session si le code correspond).
 */
export async function verifyLinkCodeViaServer(code) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-link-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ code }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Code invalide ou expiré");

  const { error } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (error) throw error;
  clearPendingPhone();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
