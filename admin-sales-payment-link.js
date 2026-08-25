/* Stable payment action for the staff Sales & Shipping page.
   Deliberately uses a short one-shot poll instead of MutationObservers so it cannot
   create a DOM/query loop with admin-sales.js. */
document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("sales-list");
  const auth = window.actionBuyerAuth;
  if (!box || !auth) return;

  let attempts = 0;
  const maxAttempts = 12;

  const money = value => new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(Number(value || 0));

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  async function enhance() {
    attempts += 1;

    const cards = [...box.querySelectorAll("article.valuation-card")];
    if (!cards.length) {
      if (attempts < maxAttempts) setTimeout(enhance, 400);
      return;
    }

    const refs = cards
      .map(card => card.querySelector(".valuation-ref")?.textContent?.trim())
      .filter(Boolean);

    if (!refs.length) return;

    const { data: sales, error } = await auth.supabase
      .from("sales")
      .select("id,sale_reference,status,total_amount,bank_details_confirmed_at")
      .in("sale_reference", refs);

    if (error || !sales?.length) return;

    const byRef = new Map(sales.map(s => [s.sale_reference, s]));

    cards.forEach(card => {
      if (card.querySelector(".stable-payment-action")) return;

      const ref = card.querySelector(".valuation-ref")?.textContent?.trim();
      const sale = byRef.get(ref);
      if (!sale) return;

      const status = String(sale.status || "");
      const paymentDue = ["received", "inspection", "payment_due"].includes(status)
        && !["paid", "completed", "cancelled"].includes(status)
        && (status === "payment_due" || Boolean(sale.bank_details_confirmed_at));

      if (!paymentDue) return;

      const meta = card.querySelector(".valuation-meta");
      if (!meta) return;

      const action = document.createElement("div");
      action.className = "stable-payment-action";
      action.style.cssText = "margin:12px 0;padding:12px 14px;border-left:5px solid #c94b2c;background:#fff3ee;color:#8f321f;";
      action.innerHTML = `
        <strong style="display:block;letter-spacing:.06em;font-size:.82rem;">PAYMENT DUE — ACTION REQUIRED</strong>
        <span style="display:block;margin-top:4px;font-weight:600;">Customer has accepted the offer. Amount due: ${esc(money(sale.total_amount))}</span>
        <a class="btn btn-primary" href="admin-sale.html?id=${encodeURIComponent(sale.id)}" style="margin-top:9px;">OPEN SALE &amp; PAY CUSTOMER</a>
      `;
      meta.prepend(action);
    });
  }

  setTimeout(enhance, 900);
});
