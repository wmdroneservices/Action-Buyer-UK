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

  async function getSavedBankDetails() {
    const { data, error } = await auth.supabase.rpc("get_saved_customer_bank_details");
    if (error) return null;
    return data || null;
  }

  async function submitBankDetails(sale, values, storageConsent) {
    return auth.supabase.rpc("submit_sale_bank_details", {
      p_sale_id: sale.id,
      p_account_name: String(values.account_name || "").trim(),
      p_sort_code: String(values.sort_code || "").trim(),
      p_account_number: String(values.account_number || "").trim(),
      p_storage_consent: !!storageConsent
    });
  }

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
      const paymentStage = ["payment_due", "paid", "completed"].includes(String(sale.status || ""));
      if (!paymentStage && !complete && !deleted) continue;

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
          await auth.supabase.rpc("delete_saved_customer_bank_details");
          msg.textContent = "Saved bank details removed.";
          msg.className = "bank-withdraw-message success";
          setTimeout(() => window.location.reload(), 700);
        });
      } else if (deleted) {
        panel.innerHTML = `<h4>Bank details</h4><p>Your bank details have been securely deleted because they are no longer required.</p>`;
      } else if (sale.status === "payment_due") {
        const saved = await getSavedBankDetails();
        if (saved?.account_name && saved?.sort_code && saved?.account_number) {
          panel.innerHTML = `<h4>Bank details</h4><p><strong>Saved bank details available.</strong> Because you are signed in, you can use the bank details you previously chose to save rather than entering them again.</p><p>Account name: ${esc(saved.account_name)}<br>Sort code: ${esc(maskSort(saved.sort_code))}<br>Account number: ${esc(maskAccount(saved.account_number))}</p><div class="navigation-buttons"><button type="button" class="btn btn-primary use-saved-bank">USE SAVED BANK DETAILS</button><button type="button" class="btn btn-secondary enter-bank-manually">ENTER DIFFERENT DETAILS</button></div><p class="bank-form-message" role="status" aria-live="polite"></p><div class="manual-bank-form" style="display:none"></div>`;
          const msg = panel.querySelector(".bank-form-message");
          const useSaved = panel.querySelector(".use-saved-bank");
          useSaved.addEventListener("click", async () => {
            useSaved.disabled = true;
            msg.textContent = "Confirming saved bank details...";
            const { error } = await submitBankDetails(sale, saved, true);
            if (error) { msg.textContent = error.message || "Saved bank details could not be used."; msg.className = "bank-form-message error"; useSaved.disabled = false; return; }
            msg.textContent = "Bank details received. Thank you.";
            msg.className = "bank-form-message success";
            setTimeout(() => window.location.reload(), 700);
          });
          panel.querySelector(".enter-bank-manually").addEventListener("click", () => {
            const holder = panel.querySelector(".manual-bank-form");
            holder.style.display = "";
            holder.innerHTML = `<form class="customer-bank-form"><label>Account name<input name="account_name" type="text" autocomplete="name" required value="${esc(saved.account_name)}"></label><label>Sort code<input name="sort_code" type="text" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="12-34-56" required value="${esc(saved.sort_code)}"></label><label>Account number<input name="account_number" type="text" inputmode="numeric" autocomplete="off" maxlength="8" required value="${esc(saved.account_number)}"></label><label style="display:flex;gap:.6rem;align-items:flex-start;margin-top:.75rem"><input name="storage_consent" type="checkbox" value="yes" checked style="width:auto;margin-top:.2rem"><span><strong>Keep my bank details for future payments</strong><br><small>I authorise GearCashOut to securely retain these bank details for future payments for items I sell to GearCashOut. I understand I can withdraw this permission.</small></span></label><button class="btn btn-primary" type="submit">SAVE BANK DETAILS</button></form>`;
            const form = holder.querySelector("form");
            form.addEventListener("submit", async event => {
              event.preventDefault();
              const button = form.querySelector("button[type=submit]");
              button.disabled = true; msg.textContent = "Saving..."; msg.className = "bank-form-message";
              const data = new FormData(form);
              const { error } = await submitBankDetails(sale, { account_name: data.get("account_name"), sort_code: data.get("sort_code"), account_number: data.get("account_number") }, data.get("storage_consent") === "yes");
              if (error) { msg.textContent = error.message || "Bank details could not be saved."; msg.className = "bank-form-message error"; button.disabled = false; return; }
              msg.textContent = "Bank details received. Thank you."; msg.className = "bank-form-message success";
              setTimeout(() => window.location.reload(), 700);
            });
          });
        } else {
          panel.innerHTML = `<h4>Bank details required</h4><p>Your final quote has been accepted. Please provide the bank account details you would like us to use for payment.</p><form class="customer-bank-form">
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
            const { error } = await submitBankDetails(sale, { account_name: data.get("account_name"), sort_code: data.get("sort_code"), account_number: data.get("account_number") }, data.get("storage_consent") === "yes");
            if (error) { msg.textContent = error.message || "Bank details could not be saved."; msg.className = "bank-form-message error"; button.disabled = false; return; }
            msg.textContent = "Bank details received. Thank you."; msg.className = "bank-form-message success";
            setTimeout(() => window.location.reload(), 700);
          });
        }
      }
      details.prepend(panel);

      const progress = details.querySelector(".purchase-progress");
      if (progress && !progress.querySelector(".bank-progress-step") && paymentStage) {
        const bankStep = document.createElement("p");
        bankStep.className = "bank-progress-step";
        bankStep.innerHTML = `<strong>Bank details</strong> — ${complete ? "Received" : deleted ? "Deleted after retention period" : "Required before payment"}`;
        progress.appendChild(bankStep);
      }
    }
  }

  const observer = new MutationObserver(() => attachForms());
  observer.observe(document.body, { childList: true, subtree: true });
  await attachForms();
});
