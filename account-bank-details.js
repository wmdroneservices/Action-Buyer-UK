document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  async function attachForms() {
    const cards = document.querySelectorAll(".sale-card");
    for (const card of cards) {
      if (card.dataset.bankDetailsAttached === "1") continue;
      const ref = card.querySelector(".valuation-ref")?.textContent?.trim();
      if (!ref) continue;

      const { data: sale } = await auth.supabase
        .from("sales")
        .select("id,sale_reference,payment_status,bank_account_name,bank_sort_code,bank_account_number,bank_details_confirmed_at")
        .eq("user_id", session.user.id)
        .eq("sale_reference", ref)
        .maybeSingle();
      if (!sale) continue;

      card.dataset.bankDetailsAttached = "1";
      const details = card.querySelector(".sale-details");
      if (!details) continue;

      const existing = details.querySelector(".bank-details-customer");
      if (existing) continue;

      const complete = !!(sale.bank_account_name && sale.bank_sort_code && sale.bank_account_number && sale.bank_details_confirmed_at);
      const panel = document.createElement("div");
      panel.className = "shipping-block bank-details-customer";

      if (complete) {
        panel.innerHTML = `<h4>Bank details</h4><p><strong>Bank details received.</strong> Your payment details have been securely recorded.</p><p>Account name: ${esc(sale.bank_account_name)}<br>Sort code: ${esc(sale.bank_sort_code)}<br>Account number: ${esc(sale.bank_account_number)}</p>`;
      } else if (!["paid","completed","cancelled"].includes(sale.status)) {
        panel.innerHTML = `<h4>Bank details required</h4><p>Thank you for accepting our offer. Before we can pay you, please provide the bank account details you would like us to use.</p><form class="customer-bank-form">
          <label>Account name<input name="account_name" type="text" autocomplete="name" required></label>
          <label>Sort code<input name="sort_code" type="text" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="12-34-56" required></label>
          <label>Account number<input name="account_number" type="text" inputmode="numeric" autocomplete="off" maxlength="8" required></label>
          <button class="btn btn-primary" type="submit">SAVE BANK DETAILS</button>
          <p class="bank-form-message" role="status" aria-live="polite"></p>
        </form>`;

        const form = panel.querySelector("form");
        const msg = panel.querySelector(".bank-form-message");
        form.addEventListener("submit", async event => {
          event.preventDefault();
          const button = form.querySelector("button[type=submit]");
          button.disabled = true;
          msg.textContent = "Saving...";
          msg.className = "bank-form-message";
          const data = new FormData(form);
          const { error } = await auth.supabase.rpc("submit_sale_bank_details", {
            p_sale_id: sale.id,
            p_account_name: String(data.get("account_name") || "").trim(),
            p_sort_code: String(data.get("sort_code") || "").trim(),
            p_account_number: String(data.get("account_number") || "").trim()
          });
          if (error) {
            msg.textContent = error.message || "Bank details could not be saved.";
            msg.className = "bank-form-message error";
            button.disabled = false;
            return;
          }
          msg.textContent = "Bank details received. Thank you.";
          msg.className = "bank-form-message success";
          setTimeout(() => window.location.reload(), 700);
        });
      }
      details.prepend(panel);
    }
  }

  const observer = new MutationObserver(() => attachForms());
  observer.observe(document.body, { childList: true, subtree: true });
  await attachForms();
});
