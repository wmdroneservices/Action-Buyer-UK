document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const maskAccount = value => value ? `XXXX${String(value).slice(-4)}` : "";
  const maskSort = value => value ? `XX-XX-${String(value).slice(-2)}` : "";

  async function attachForms() {
    const cards = document.querySelectorAll(".sale-card");
    for (const card of cards) {
      if (card.dataset.bankDetailsAttached === "1") continue;
      const ref = card.querySelector(".valuation-ref")?.textContent?.trim();
      if (!ref) continue;
      const { data: sale } = await auth.supabase.from("sales")
        .select("id,sale_reference,status,payment_status,bank_account_name,bank_sort_code,bank_account_number,bank_details_confirmed_at,bank_details_storage_consent,bank_details_deleted_at")
        .eq("user_id", session.user.id).eq("sale_reference", ref).maybeSingle();
      if (!sale) continue;
      card.dataset.bankDetailsAttached = "1";
      const details = card.querySelector(".sale-details");
      if (!details || details.querySelector(".bank-details-customer")) continue;

      const complete = !!(sale.bank_account_name && sale.bank_sort_code && sale.bank_account_number && sale.bank_details_confirmed_at);
      const deleted = !!sale.bank_details_deleted_at && !complete;
      const panel = document.createElement("div");
      panel.className = "shipping-block bank-details-customer";

      if (complete) {
        const retentionText = sale.bank_details_storage_consent
          ? "You authorised GearCashOut to retain these details for future payments."
          : "These details are being retained only for the payment process and will be automatically deleted after the temporary retention period.";
        panel.innerHTML = `<h4>Bank details</h4><p><strong>Bank details received.</strong> ${esc(retentionText)}</p><p>Account name: ${esc(sale.bank_account_name)}<br>Sort code: ${esc(maskSort(sale.bank_sort_code))}<br>Account number: ${esc(maskAccount(sale.bank_account_number))}</p>${sale.bank_details_storage_consent ? `<button type="button" class="btn btn-secondary withdraw-bank-consent">REMOVE SAVED BANK DETAILS</button><p class="bank-withdraw-message" role="status" aria-live="polite"></p>` : ""}`;
        const withdraw = panel.querySelector(".withdraw-bank-consent");
        if (withdraw) withdraw.addEventListener("click", async () => {
          if (!confirm("Remove your saved bank details and withdraw permission for GearCashOut to retain them for future payments?")) return;
          withdraw.disabled = true;
          const { error } = await auth.supabase.rpc("withdraw_bank_details_consent");
          const msg = panel.querySelector(".bank-withdraw-message");
          if (error) { withdraw.disabled = false; msg.textContent = error.message || "Could not remove the saved bank details."; msg.className = "bank-withdraw-message error"; return; }
          msg.textContent = "Saved bank details removed.";
          msg.className = "bank-withdraw-message success";
          setTimeout(() => window.location.reload(), 700);
        });
      } else if (deleted) {
        panel.innerHTML = `<h4>Bank details</h4><p>Your bank details have been securely deleted because they are no longer required.</p>`;
      } else if (!["paid", "completed", "cancelled"].includes(sale.status)) {
        panel.innerHTML = `<h4>Bank details required</h4><p>Thank you for accepting our offer. Before we can pay you, please provide the bank account details you would like us to use.</p><form class="customer-bank-form">
          <label>Account name<input name="account_name" type="text" autocomplete="name" required></label>
          <label>Sort code<input name="sort_code" type="text" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="12-34-56" required></label>
          <label>Account number<input name="account_number" type="text" inputmode="numeric" autocomplete="off" maxlength="8" required></label>
          <label style="display:flex;gap:.6rem;align-items:flex-start;margin-top:.75rem"><input name="storage_consent" type="checkbox" value="yes" style="width:auto;margin-top:.2rem"><span><strong>Keep my bank details for future payments</strong><br><small>I authorise GearCashOut to securely retain these bank details for future payments for items I sell to GearCashOut. I understand I can withdraw this permission.</small></span></label>
          <button class="btn btn-primary" type="submit">SAVE BANK DETAILS</button>
          <p class="bank-form-message" role="status" aria-live="polite"></p>
        </form>`;
        const form = panel.querySelector("form");
        const msg = panel.querySelector(".bank-form-message");
        form.addEventListener("submit", async event => {
          event.preventDefault();
          const button = form.querySelector("button[type=submit]");
          button.disabled = true; msg.textContent = "Saving..."; msg.className = "bank-form-message";
          const data = new FormData(form);
          const { error } = await auth.supabase.rpc("submit_sale_bank_details", {
            p_sale_id: sale.id,
            p_account_name: String(data.get("account_name") || "").trim(),
            p_sort_code: String(data.get("sort_code") || "").trim(),
            p_account_number: String(data.get("account_number") || "").trim(),
            p_storage_consent: data.get("storage_consent") === "yes"
          });
          if (error) { msg.textContent = error.message || "Bank details could not be saved."; msg.className = "bank-form-message error"; button.disabled = false; return; }
          msg.textContent = "Bank details received. Thank you."; msg.className = "bank-form-message success";
          setTimeout(() => window.location.reload(), 700);
        });
      }
      details.prepend(panel);

      const progress = details.querySelector(".purchase-progress");
      if (progress && !progress.querySelector(".bank-progress-step")) {
        const steps = progress.querySelectorAll("p");
        const bankStep = document.createElement("p"); bankStep.className = "bank-progress-step";
        bankStep.innerHTML = `<strong>3. Bank details</strong> — ${complete ? "Received" : deleted ? "Deleted after retention period" : "Required before payment"}`;
        if (steps[1]) steps[1].after(bankStep); else progress.appendChild(bankStep);
        [...progress.querySelectorAll("p")].forEach((p, index) => { if (index >= 3) p.innerHTML = p.innerHTML.replace(/<strong>\d+\./, `<strong>${index + 1}.`); });
      }
    }
  }
  const observer = new MutationObserver(() => attachForms());
  observer.observe(document.body, { childList: true, subtree: true });
  await attachForms();
});
