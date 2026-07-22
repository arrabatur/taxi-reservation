import { sendPhoneOtp, verifyPhoneOtp, verifyLinkCodeViaServer, getSession, getPendingPhone } from "./auth.js";

const loginVerifying = document.getElementById("login-verifying");
const loginPhone = document.getElementById("login-phone");
const loginOtp = document.getElementById("login-otp");
const phoneForm = document.getElementById("phone-form");
const phoneBtn = document.getElementById("phone-btn");
const phoneInput = document.getElementById("phone-input");
const phoneMsg = document.getElementById("phone-msg");
const otpForm = document.getElementById("otp-form");
const otpBtn = document.getElementById("otp-btn");
const otpInput = document.getElementById("otp-input");
const otpMsg = document.getElementById("otp-msg");
const otpPhoneDisplay = document.getElementById("otp-phone-display");
const otpBackBtn = document.getElementById("otp-back-btn");

let pendingPhone = null;

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = type ? `form-msg show ${type}` : "form-msg";
}

// Lien magique : ?code=XXXXXX envoyé par SMS, vérifié automatiquement
// avec le numéro retenu en local lors de l'envoi du code.
const codeFromLink = new URLSearchParams(window.location.search).get("code");

// Si le lien est ouvert sur un autre appareil/navigateur que celui utilisé
// pour demander le code, le numéro en attente n'est pas dans le localStorage
// local : on demande alors de le confirmer pour finaliser avec ce même code.
let awaitingPhoneForLinkCode = false;

if (codeFromLink) {
  // Masqué immédiatement (avant tout appel réseau) pour éviter de voir le
  // formulaire de saisie du numéro s'afficher brièvement avant redirection.
  loginPhone.hidden = true;
  loginVerifying.hidden = false;

  const storedPhone = getPendingPhone();

  if (storedPhone) {
    try {
      await verifyPhoneOtp(storedPhone, codeFromLink);
      history.replaceState(null, "", window.location.pathname);
      window.location.href = "reservation.html";
    } catch (err) {
      history.replaceState(null, "", window.location.pathname);
      loginVerifying.hidden = true;
      loginPhone.hidden = false;
      showMsg(phoneMsg, `Erreur : ${err.message}. Réessayez avec un nouveau code.`, "error");
    }
  } else {
    // Numéro absent localement (navigation privée, autre appareil, stockage
    // isolé...) : on tente le code côté serveur avant de redemander le numéro.
    try {
      await verifyLinkCodeViaServer(codeFromLink);
      history.replaceState(null, "", window.location.pathname);
      window.location.href = "reservation.html";
    } catch {
      awaitingPhoneForLinkCode = true;
      loginVerifying.hidden = true;
      loginPhone.hidden = false;
      phoneBtn.textContent = "Confirmer mon numéro";
      showMsg(phoneMsg, "Confirmez votre numéro pour finaliser la connexion avec ce lien.", "");
    }
  }
} else {
  // Déjà connecté ? Direction la réservation.
  const existingSession = await getSession();
  if (existingSession) {
    window.location.href = "reservation.html";
  }
}

phoneForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const phone = phoneInput.value.trim();
  if (!phone) return;

  if (awaitingPhoneForLinkCode) {
    phoneBtn.disabled = true;
    phoneBtn.textContent = "Vérification…";
    showMsg(phoneMsg, "", "");

    try {
      await verifyPhoneOtp(phone, codeFromLink);
      history.replaceState(null, "", window.location.pathname);
      window.location.href = "reservation.html";
    } catch (err) {
      showMsg(phoneMsg, `Erreur : ${err.message}. Vérifiez le numéro ou redemandez un nouveau code.`, "error");
      awaitingPhoneForLinkCode = false;
      history.replaceState(null, "", window.location.pathname);
    } finally {
      phoneBtn.disabled = false;
      phoneBtn.textContent = "Recevoir mon code";
    }
    return;
  }

  phoneBtn.disabled = true;
  phoneBtn.textContent = "Envoi en cours…";
  showMsg(phoneMsg, "", "");

  try {
    await sendPhoneOtp(phone);
    pendingPhone = phone;
    otpPhoneDisplay.textContent = phone;
    loginPhone.hidden = true;
    loginOtp.hidden = false;
    otpInput.value = "";
    otpInput.focus();
  } catch (err) {
    showMsg(phoneMsg, `Erreur : ${err.message}`, "error");
  } finally {
    phoneBtn.disabled = false;
    phoneBtn.textContent = "Recevoir mon code";
  }
});

otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = otpInput.value.trim();
  if (!code || !pendingPhone) return;

  otpBtn.disabled = true;
  otpBtn.textContent = "Vérification…";
  showMsg(otpMsg, "", "");

  try {
    await verifyPhoneOtp(pendingPhone, code);
    window.location.href = "reservation.html";
  } catch (err) {
    showMsg(otpMsg, `Erreur : ${err.message}`, "error");
  } finally {
    otpBtn.disabled = false;
    otpBtn.textContent = "Valider et réserver";
  }
});

otpBackBtn.addEventListener("click", () => {
  loginOtp.hidden = true;
  loginPhone.hidden = false;
  pendingPhone = null;
});
