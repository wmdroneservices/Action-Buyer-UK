document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const auth = window.actionBuyerAuth;
  const host = document.getElementById("customer-details-editor");
  if (!auth || !host) return;

  const session = await auth.getSession();
  if (!session) return;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const { data: profile, error } = await auth.supabase
    .from("profiles")
    .select("full_name,phone,address_line1,address_line2,city,county,postcode")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("GearCashOut customer details could not be loaded", error);
    return;
  }

  const value = key => esc(profile?.[key] || "");
  const hasContactDetails = Boolean(
    profile?.phone || profile?.address_line1 || profile?.address_line2 ||
    profile?.city || profile?.county || profile?.postcode
  );

  host.innerHTML = `
    <div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid #ddd">
      <button id="edit-customer-details" class="btn btn-secondary" type="button">
        ${hasContactDetails ? "EDIT CONTACT DETAILS" : "ADD ADDRESS & TELEPHONE"}
      </button>
      <div id="customer-details-form" hidden style="margin-top:1rem;padding:1.25rem;background:#f8f7f4;border:1px solid #ddd">
        <p class="section-kicker" style="margin-bottom:.25rem">UPDATE YOUR DETAILS</p>
        <h3 style="margin-top:0">Address and telephone</h3>
        <p style="margin-bottom:1rem">Keep your contact details up to date so GearCashOut can contact you and arrange payment or collection when needed.</p>
        <form id="account-contact-form" novalidate>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem">
            <label style="display:flex;flex-direction:column;gap:.35rem;font-weight:600">
              Telephone number
              <input id="account-phone" name="phone" type="tel" autocomplete="tel" value="${value("phone")}" required>
            </label>
            <label style="display:flex;flex-direction:column;gap:.35rem;font-weight:600">
              Address line 1
              <input id="account-address-line1" name="address_line1" type="text" autocomplete="address-line1" value="${value("address_line1")}" required>
            </label>
            <label style="display:flex;flex-direction:column;gap:.35rem;font-weight:600">
              Address line 2 <span style="font-weight:400">(optional)</span>
              <input id="account-address-line2" name="address_line2" type="text" autocomplete="address-line2" value="${value("address_line2")}">
            </label>
            <label style="display:flex;flex-direction:column;gap:.35rem;font-weight:600">
              Town / City
              <input id="account-city" name="city" type="text" autocomplete="address-level2" value="${value("city")}" required>
            </label>
            <label style="display:flex;flex-direction:column;gap:.35rem;font-weight:600">
              County <span style="font-weight:400">(optional)</span>
              <input id="account-county" name="county" type="text" autocomplete="address-level1" value="${value("county")}">
            </label>
            <label style="display:flex;flex-direction:column;gap:.35rem;font-weight:600">
              Postcode
              <input id="account-postcode" name="postcode" type="text" autocomplete="postal-code" value="${value("postcode")}" required>
            </label>
          </div>
          <div style="display:flex;gap:.75rem;align-items:center;margin-top:1rem;flex-wrap:wrap">
            <button id="save-customer-details" class="btn btn-primary" type="submit">SAVE DETAILS</button>
            <button id="cancel-customer-details" class="btn btn-secondary" type="button">CANCEL</button>
            <span id="customer-details-status" role="status" aria-live="polite"></span>
          </div>
        </form>
      </div>
    </div>`;

  const editButton = document.getElementById("edit-customer-details");
  const formBox = document.getElementById("customer-details-form");
  const form = document.getElementById("account-contact-form");
  const cancelButton = document.getElementById("cancel-customer-details");
  const saveButton = document.getElementById("save-customer-details");
  const status = document.getElementById("customer-details-status");

  const openForm = () => {
    formBox.hidden = false;
    editButton.hidden = true;
    document.getElementById("account-phone")?.focus();
  };

  const closeForm = () => {
    formBox.hidden = true;
    editButton.hidden = false;
    status.textContent = "";
  };

  editButton.addEventListener("click", openForm);
  cancelButton.addEventListener("click", closeForm);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    status.textContent = "";

    if (!form.reportValidity()) return;

    saveButton.disabled = true;
    cancelButton.disabled = true;
    status.textContent = "Saving...";

    const clean = id => document.getElementById(id)?.value.trim() || null;
    const updates = {
      id: session.user.id,
      phone: clean("account-phone"),
      address_line1: clean("account-address-line1"),
      address_line2: clean("account-address-line2"),
      city: clean("account-city"),
      county: clean("account-county"),
      postcode: clean("account-postcode"),
      updated_at: new Date().toISOString()
    };

    const { error: saveError } = await auth.supabase
      .from("profiles")
      .update(updates)
      .eq("id", session.user.id);

    if (saveError) {
      console.error("GearCashOut customer details could not be saved", saveError);
      status.textContent = saveError.message || "Could not save your details. Please try again.";
      saveButton.disabled = false;
      cancelButton.disabled = false;
      return;
    }

    status.textContent = "Details saved.";
    window.setTimeout(() => window.location.reload(), 400);
  });
});
