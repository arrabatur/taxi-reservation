import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const inviteForm = document.getElementById("invite-form");
const inviteBtn = document.getElementById("invite-btn");
const adminKeyInput = document.getElementById("admin-key-input");
const invitePhoneInput = document.getElementById("invite-phone-input");
const inviteMsg = document.getElementById("invite-msg");

function showMsg(text, type) {
  inviteMsg.textContent = text;
  inviteMsg.className = type ? `form-msg show ${type}` : "form-msg";
}

inviteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const adminKey = adminKeyInput.value.trim();
  const phone = invitePhoneInput.value.trim();
  if (!adminKey || !phone) return;

  inviteBtn.disabled = true;
  inviteBtn.textContent = "Envoi en cours…";
  showMsg("", "");

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ phone }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Erreur inconnue");
    showMsg(`Invitation envoyée à ${phone}.`, "success");
    invitePhoneInput.value = "";
  } catch (err) {
    showMsg(`Erreur : ${err.message}`, "error");
  } finally {
    inviteBtn.disabled = false;
    inviteBtn.textContent = "Envoyer l'invitation";
  }
});
