import { supabase } from "./supabaseClient.js";

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
}

/**
 * Vérifie le code reçu par SMS et établit la session.
 */
export async function verifyPhoneOtp(phone, token) {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
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
