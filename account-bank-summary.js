document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const detailsSection = document.getElementById("customer-details-section");
  if (!detailsSection || document.getElementById("customer-bank-summary")) return;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const maskAccount = value => value ? `XXXX${String(value).slice(-4)}` : "";
  const maskSort = value => value ? `XX-XX-${String(value).slice(-2)}` : "";

  let saved = null;
  try {
    const { data } = await auth.supabase.rpc("get_saved_customer_bank_details");
    saved = data || null;
  } catch (_) {}

  let latest = null;
  const { data: sales } = await auth.supabase.from("sales")
    .select("bank_account_name,bank_sort_code,bank_account_number,bank_details_confirmed_at,bank_details_storage_consent,bank_details_deleted_at,created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  latest = (sales || []).find(s => s.bank_account_name && s.bank_sort_code && s.bank_account_number && s.bank_details_confirmed_at && !s.bank_details_deleted_at) || null;

  const details = saved || latest;
  const panel = document.createElement("section");
  panel.id = "customer-bank-summary";
  panel.className = "account-panel";
  panel.style.marginBottom = "1.5rem";

  const renderForm = (values = {}) => {
    panel.querySelector(".bank-summary-content").innerHTML = `<div class="section-heading"><p class="section-kicker">PAYMENT DETAILS</p><h2>${values.account_name ? "Update your bank details" : "Add your bank details"}</h2><p>Keep your payment details securely saved to your account. Sensitive numbers are masked when displayed.</p></div><form class="account-bank-form"><label>Account name<input name="account_name" type="text" autocomplete="name" required value="${esc(values.account_name || "")}"></label><label>Sort code<input name="sort_code" type="text" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="12-34-56" required value="${esc(values.sort_code || "")}"></label><label>Account number<input name="account_number" type="text" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="12345678" required value="${esc(values.account_number || "")}"></label><label style="display:flex;gap:.6rem;align-items:flex-start;margin-top:.75rem"><input name="storage_consent" type="checkbox" value="yes" checked style="width:auto;margin-top:.2rem"><span><strong>Keep my bank details for future payments</strong><br><small>I authorise GearCashOut to securely retain these bank details for future payments for items I sell to GearCashOut.</small></span></label><button class="btn btn-primary" type="submit">SAVE BANK DETAILS</button><p class="bank-summary-message" role="status" aria-live="polite"></p></form>`;
    const form = panel.querySelector(".account-bank-form");
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      const message = form.querySelector(".bank-summary-message");
      button.disabled = true;
      message.textContent = "Saving...";
      message.className = "bank-summary-message";
      const data = new FormData(form);
      const { error } = await auth.supabase.rpc("save_customer_bank_details", {
        p_account_name: data.get("account_name"),
        p_sort_code: data.get("sort_code"),
        p_account_number: data.get("account_number"),
        p_storage_consent: data.get("storage_consent") === "yes"
      });
      if (error) {
        message.textContent = error.message || "Bank details could not be saved.";
        message.className = "bank-summary-message error";
        button.disabled = false;
        return;
      }
      message.textContent = "Bank details saved.";
      message.className = "bank-summary-message success";
      setTimeout(() => window.location.reload(), 500);
    });
  };

  panel.innerHTML = `<div class="bank-summary-content"></div>`;

  const renderSaved = savedDetails => {
    panel.querySelector(".bank-summary-content").innerHTML = `<div class="section-heading"><p class="section-kicker">PAYMENT DETAILS</p><h2>Your bank details</h2><p>Your saved payment details are shown securely with sensitive numbers masked.</p></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem 2rem"><div><p class="section-kicker" style="margin-bottom:.25rem">ACCOUNT NAME</p><strong>${esc(savedDetails.account_name)}</strong></div><div><p class="section-kicker" style="margin-bottom:.25rem">SORT CODE</p><strong>${esc(maskSort(savedDetails.sort_code))}</strong></div><div><p class="section-kicker" style="margin-bottom:.25rem">ACCOUNT NUMBER</p><strong>${esc(maskAccount(savedDetails.account_number))}</strong></div></div><div class="account-next-step" style="margin-top:1.5rem;padding:1rem 1.2rem;background:#f3f1ec;border-left:4px solid #d88732"><strong>BANK DETAILS ON FILE</strong><p style="margin:.25rem 0 0">These details can be used for future payments.</p></div><div class="navigation-buttons" style="margin-top:1rem"><button type="button" class="btn btn-secondary edit-bank-details">UPDATE BANK DETAILS</button></div><p class="bank-summary-message" role="status" aria-live="polite"></p>`;
    panel.querySelector(".edit-bank-details").addEventListener("click", () => renderForm(savedDetails));
  };

  if (details?.account_name && details?.sort_code && details?.account_number) renderSaved(details);
  else renderForm();

  const customerNextStep = detailsSection.querySelector(".account-next-step");
  if (customerNextStep) customerNextStep.after(panel);
  else detailsSection.after(panel);
});
