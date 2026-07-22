import { supabase } from "./supabaseClient.js";
import { sendPhoneOtp, verifyPhoneOtp, getSession, signOut, onAuthChange } from "./auth.js";

const euro = (cents) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// ---------- DOM refs ----------
const authToggleBtn = document.getElementById("auth-toggle-btn");
const authDropdown = document.getElementById("auth-dropdown");
const authDropdownPhone = document.getElementById("auth-dropdown-phone");
const authDropdownOtp = document.getElementById("auth-dropdown-otp");
const authDropdownSession = document.getElementById("auth-dropdown-session");
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
const sessionPhone = document.getElementById("session-phone");
const signoutBtn = document.getElementById("signout-btn");
const signedOutHint = document.getElementById("signed-out-hint");

const bookingForm = document.getElementById("booking-form");
const driverListEl = document.getElementById("driver-list");
const amenityGridEl = document.getElementById("amenity-grid");
const amenityHint = document.getElementById("amenity-hint");
const summaryEl = document.getElementById("summary");
const confirmBtn = document.getElementById("confirm-btn");

const FIXED_PICKUP_DATE = "2026-08-05";
const FIXED_PICKUP_TIME = "16:00";
const FIXED_PICKUP_ADDRESS = "Aéroport Charleroi Brussels (BSCA)";
const FIXED_DROPOFF_ADDRESS = "3 Baudets, Hem";
const FIXED_PASSENGERS = 1;

const landingPanel = document.getElementById("landing-panel");

const confirmationPanel = document.getElementById("confirmation-panel");
const confirmationText = document.getElementById("confirmation-text");
const homeBtn = document.getElementById("home-btn");

const trashSurveyOverlay = document.getElementById("trash-survey-overlay");
const trashSurveyStep1 = document.getElementById("trash-survey-step1");
const trashSurveyStep2 = document.getElementById("trash-survey-step2");
const trashSurveyStep3 = document.getElementById("trash-survey-step3");
const trashSurveyYesBtn = document.getElementById("trash-survey-yes");
const trashSurveyNoBtn = document.getElementById("trash-survey-no");

// ---------- State ----------
let currentSession = null;
let drivers = [];
let selectedDriverId = null;
let driverAmenities = []; // amenities available for the selected driver
let selectedAmenityIds = new Set();
let pendingPhone = null;

const confirmedIdFromUrl = new URLSearchParams(window.location.search).get("confirmed");

// ---------- Auth: SMS OTP ----------
phoneForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const phone = phoneInput.value.trim();
  if (!phone) return;

  phoneBtn.disabled = true;
  phoneBtn.textContent = "Envoi en cours…";
  showMsg(phoneMsg, "", "");

  try {
    await sendPhoneOtp(phone);
    pendingPhone = phone;
    otpPhoneDisplay.textContent = phone;
    authDropdownPhone.hidden = true;
    authDropdownOtp.hidden = false;
    showMsg(otpMsg, "", "");
    otpInput.value = "";
    otpInput.focus();
  } catch (err) {
    showMsg(phoneMsg, `Erreur : ${err.message}`, "error");
  } finally {
    phoneBtn.disabled = false;
    phoneBtn.textContent = "Recevoir mon invitation";
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
    otpForm.reset();
  } catch (err) {
    showMsg(otpMsg, `Erreur : ${err.message}`, "error");
  } finally {
    otpBtn.disabled = false;
    otpBtn.textContent = "Valider";
  }
});

otpBackBtn.addEventListener("click", () => {
  authDropdownOtp.hidden = true;
  authDropdownPhone.hidden = false;
  pendingPhone = null;
});

signoutBtn.addEventListener("click", async () => {
  await signOut();
  location.reload();
});

// ---------- Header auth dropdown ----------
authToggleBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  authDropdown.hidden = !authDropdown.hidden;
});

authDropdown.addEventListener("click", (e) => e.stopPropagation());

document.addEventListener("click", () => {
  authDropdown.hidden = true;
});

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = type ? `form-msg show ${type}` : "form-msg";
}

// ---------- Session handling ----------
async function refreshSessionUI(session) {
  currentSession = session;
  authDropdown.hidden = true;
  if (session) {
    authToggleBtn.textContent = session.user.phone;
    authDropdownPhone.hidden = true;
    authDropdownOtp.hidden = true;
    authDropdownSession.hidden = false;
    sessionPhone.textContent = session.user.phone;
    signedOutHint.hidden = true;
    if (landingPanel.hidden && confirmationPanel.hidden) {
      bookingForm.hidden = false;
    }
    await loadDrivers();
  } else {
    authToggleBtn.textContent = "Se connecter";
    authDropdownPhone.hidden = false;
    authDropdownOtp.hidden = true;
    authDropdownSession.hidden = true;
    pendingPhone = null;
    signedOutHint.hidden = false;
    bookingForm.hidden = true;
  }
}

onAuthChange((session) => refreshSessionUI(session));
await refreshSessionUI(await getSession());

// Arrivée via le lien de confirmation reçu par SMS (?confirmed=<id>)
if (confirmedIdFromUrl && currentSession) {
  await showConfirmedFromUrl(confirmedIdFromUrl);
}

async function showConfirmedFromUrl(reservationId) {
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("*, drivers(name)")
    .eq("id", reservationId)
    .maybeSingle();

  history.replaceState(null, "", window.location.pathname);

  if (error || !reservation) return;

  bookingForm.hidden = true;
  landingPanel.hidden = true;
  confirmationPanel.hidden = false;
  confirmationText.textContent =
    `Votre course avec ${reservation.drivers.name} est réservée pour le ${formatDate(reservation.pickup_date)} à ${reservation.pickup_time.slice(0, 5)}, ` +
    `direction ${reservation.dropoff_address}. Réservation confirmée par SMS.`;
}

// ---------- Drivers ----------
async function loadDrivers() {
  if (drivers.length) return renderDrivers();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .order("rating", { ascending: false });

  if (error) {
    driverListEl.innerHTML = `<p class="hint">Impossible de charger les chauffeurs : ${error.message}</p>`;
    return;
  }
  drivers = data;
  renderDrivers();
}

function renderDrivers() {
  driverListEl.innerHTML = "";
  drivers.forEach((driver) => {
    const card = document.createElement("div");
    card.className = "driver-option";
    if (driver.is_available === false) card.classList.add("unavailable");
    card.dataset.driverId = driver.id;
    card.innerHTML = `
      <div class="top">
        <span class="avatar">${driver.photo_emoji}</span>
        <div>
          <h4>${driver.name}</h4>
          <span class="vehicle">${driver.vehicle}</span>
        </div>
      </div>
      <p class="bio">${driver.bio ?? ""}</p>
      ${driver.availability_note ? `<p class="availability-note">${driver.availability_note}</p>` : ""}
      <div class="meta">
        <span>⭐ ${driver.rating} · ${driver.years_experience} ans d'expérience</span>
        <span class="price">${driver.price_label ?? euro(driver.base_price_cents)}</span>
      </div>
    `;
    if (driver.is_available === false) {
      card.title = "Ce chauffeur n'est pas disponible actuellement.";
    } else {
      card.addEventListener("click", () => selectDriver(driver.id));
    }
    driverListEl.appendChild(card);
  });
}

async function selectDriver(driverId) {
  selectedDriverId = driverId;
  selectedAmenityIds = new Set();

  [...driverListEl.children].forEach((el) => {
    el.classList.toggle("selected", el.dataset.driverId === driverId);
  });

  amenityHint.textContent = "Chargement des agréments…";
  amenityGridEl.innerHTML = "";

  const { data, error } = await supabase
    .from("driver_amenities")
    .select("extra_price_cents, amenities(id, code, label, icon, description)")
    .eq("driver_id", driverId);

  if (error) {
    amenityHint.textContent = `Impossible de charger les agréments : ${error.message}`;
    return;
  }

  driverAmenities = data;
  renderAmenities();
  updateSummary();
}

function renderAmenities() {
  if (!driverAmenities.length) {
    amenityHint.textContent = "Ce chauffeur ne propose pas d'agrément particulier pour ce trajet.";
    amenityGridEl.innerHTML = "";
    return;
  }
  amenityHint.textContent = "Sélectionnez les agréments souhaités pour ce trajet (facultatif).";
  amenityGridEl.innerHTML = "";

  driverAmenities.forEach(({ amenities: amenity, extra_price_cents }) => {
    const label = document.createElement("label");
    label.className = "amenity-option";
    label.innerHTML = `
      <input type="checkbox" value="${amenity.id}" />
      <div>
        <div class="label"><span class="icon">${amenity.icon}</span> ${amenity.label}</div>
        <div class="desc">${amenity.description ?? ""}</div>
        <div class="extra">${extra_price_cents > 0 ? `+ ${euro(extra_price_cents)}` : "Inclus"}</div>
      </div>
    `;
    label.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) selectedAmenityIds.add(amenity.id);
      else selectedAmenityIds.delete(amenity.id);
      updateSummary();
    });
    amenityGridEl.appendChild(label);
  });
}

// ---------- Summary & pricing ----------
function updateSummary() {
  const driver = drivers.find((d) => d.id === selectedDriverId);
  confirmBtn.disabled = !driver;

  if (!driver) {
    summaryEl.innerHTML = `<p class="hint">Choisissez un chauffeur pour voir le récapitulatif du prix.</p>`;
    return;
  }

  const chosenAmenities = driverAmenities.filter((da) => selectedAmenityIds.has(da.amenities.id));

  let rows = `
    <div class="summary-row"><span>Chauffeur</span><span>${driver.name}</span></div>
    <div class="summary-row"><span>Tarif</span><span>${driver.price_label ?? euro(driver.base_price_cents)}</span></div>
  `;
  chosenAmenities.forEach((da) => {
    rows += `<div class="summary-row"><span>${da.amenities.icon} ${da.amenities.label}</span><span>${da.extra_price_cents > 0 ? "+ " + euro(da.extra_price_cents) : "Inclus"}</span></div>`;
  });

  summaryEl.innerHTML = rows;
}

const LANDING_ANIMATION_MS = 2600;

// ---------- Enregistrement de la réservation ----------
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentSession || !selectedDriverId) return;

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Enregistrement…";

  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      user_id: currentSession.user.id,
      phone_number: currentSession.user.phone,
      driver_id: selectedDriverId,
      pickup_date: FIXED_PICKUP_DATE,
      pickup_time: FIXED_PICKUP_TIME,
      pickup_address: FIXED_PICKUP_ADDRESS,
      dropoff_address: FIXED_DROPOFF_ADDRESS,
      passengers: FIXED_PASSENGERS,
      notes: null,
      status: "confirmed",
    })
    .select()
    .single();

  if (error) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirmer la réservation";
    alert(`Erreur lors de la réservation : ${error.message}`);
    return;
  }

  if (selectedAmenityIds.size > 0) {
    const rows = [...selectedAmenityIds].map((amenityId) => ({
      reservation_id: reservation.id,
      amenity_id: amenityId,
    }));
    const { error: amenityError } = await supabase.from("reservation_amenities").insert(rows);
    if (amenityError) {
      console.error("Erreur enregistrement agréments :", amenityError.message);
    }
  }

  confirmBtn.disabled = false;
  confirmBtn.textContent = "Confirmer la réservation";
  bookingForm.hidden = true;
  landingPanel.hidden = false;

  const driver = drivers.find((d) => d.id === selectedDriverId);
  setTimeout(() => {
    landingPanel.hidden = true;
    confirmationPanel.hidden = false;
    confirmationText.textContent =
      `Votre course avec ${driver.name} est réservée pour le ${formatDate(FIXED_PICKUP_DATE)} à ${FIXED_PICKUP_TIME}, ` +
      `direction ${FIXED_DROPOFF_ADDRESS}.`;
  }, LANDING_ANIMATION_MS);
});

function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------- Questionnaire poubelle (avant retour à l'accueil) ----------
async function saveTrashSurveyAnswer(wantsService, priceChoice) {
  if (!currentSession) return;
  const { error } = await supabase.from("trash_service_survey").insert({
    user_id: currentSession.user.id,
    phone_number: currentSession.user.phone,
    wants_service: wantsService,
    price_choice: priceChoice,
  });
  if (error) {
    console.error("Erreur enregistrement questionnaire poubelle :", error.message);
  }
}

homeBtn.addEventListener("click", () => {
  trashSurveyStep1.hidden = false;
  trashSurveyStep2.hidden = true;
  trashSurveyStep3.hidden = true;
  trashSurveyOverlay.hidden = false;
});

trashSurveyNoBtn.addEventListener("click", async () => {
  await saveTrashSurveyAnswer(false, null);
  trashSurveyStep1.hidden = true;
  trashSurveyStep3.hidden = false;
});

trashSurveyYesBtn.addEventListener("click", () => {
  trashSurveyStep1.hidden = true;
  trashSurveyStep2.hidden = false;
});

trashSurveyStep2.querySelectorAll(".modal-option").forEach((btn) => {
  btn.addEventListener("click", async () => {
    await saveTrashSurveyAnswer(true, btn.dataset.choice);
    trashSurveyStep2.hidden = true;
    trashSurveyStep3.hidden = false;
  });
});
