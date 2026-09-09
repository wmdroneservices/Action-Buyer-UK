document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("retail-purchases");
  const summary = document.getElementById("retail-purchases-summary");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) return;

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const date = v => v ? new Date(v).toLocaleDateString("en-GB") : "—";
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const statusLabel = v => String(v || "").replaceAll("_", " ");
  const safeUrl = v => /^https?:\/\//i.test(String(v || "")) ? String(v) : "";

  async function load() {
    box.innerHTML = "<p>Loading your purchases...</p>";
    const { data, error } = await auth.supabase.rpc("customer_retail_purchase_history");
    if (error) {
      console.error("Retail purchase history query error:", error);
      box.innerHTML = "<p>We couldn't load your GearCashOut purchase history right now.</p>";
      return;
    }

    const purchases = Array.isArray(data) ? data : [];
    if (summary) summary.textContent = purchases.length === 1
      ? "1 purchase recorded."
      : `${purchases.length} purchases recorded.`;

    if (!purchases.length) {
      box.innerHTML = `<div class="shipping-block"><p><strong>You have not purchased any equipment from GearCashOut yet.</strong></p><p>When you buy from our retail website, your orders and delivery updates will appear here automatically.</p></div>`;
      return;
    }

    box.innerHTML = purchases.map(p => {
      const title = p.listing_title || [p.manufacturer, p.model].filter(Boolean).join(" ") || "Equipment";
      const fulfilment = p.fulfilment || null;
      const returnCase = p.return_case || null;
      const listingUrl = safeUrl(p.listing_url);
      let delivery = "No delivery information recorded yet.";
      if (fulfilment) {
        delivery = `<strong>${esc(statusLabel(fulfilment.status))}</strong>`;
        if (fulfilment.carrier) delivery += ` · ${esc(fulfilment.carrier)}`;
        if (fulfilment.tracking_number) delivery += ` · Tracking ${esc(fulfilment.tracking_number)}`;
        if (fulfilment.delivered_at) delivery += ` · Delivered ${date(fulfilment.delivered_at)}`;
      }

      return `<details class="valuation-card retail-purchase-card" style="margin-bottom:1rem">
        <summary style="cursor:pointer;list-style:none;display:grid;grid-template-columns:minmax(160px,1.6fr) auto auto minmax(160px,1fr);gap:.75rem;align-items:center;padding:.85rem 0">
          <span class="valuation-ref">${esc(p.invoice_reference || "RETAIL PURCHASE")}</span>
          <span class="status-badge">${esc(statusLabel(p.status))}</span>
          <strong>${money(p.sale_price)}</strong>
          <span>${esc(title)}</span>
        </summary>
        <div style="margin-top:1rem">
          <div class="shipping-block">
            <h4>Purchase</h4>
            <p><strong>${esc(title)}</strong></p>
            <p>Purchase date: ${date(p.sale_date)}</p>
            <p>Sales channel: ${esc(p.sales_channel || "Website")}</p>
            ${p.asset_sku ? `<p>Order item reference: <strong>${esc(p.asset_sku)}</strong></p>` : ""}
            <p>Item price: <strong>${money(p.sale_price)}</strong></p>
            ${Number(p.additional_costs || 0) ? `<p>Additional costs: <strong>${money(p.additional_costs)}</strong></p>` : ""}
            ${listingUrl ? `<a class="btn btn-secondary" href="${esc(listingUrl)}" target="_blank" rel="noopener">VIEW LISTING</a>` : ""}
          </div>
          <div class="shipping-block">
            <h4>Delivery</h4>
            <p>${delivery}</p>
          </div>
          ${returnCase ? `<div class="shipping-block"><h4>Return</h4><p><strong>${esc(statusLabel(returnCase.status))}</strong>${returnCase.reason ? ` · ${esc(returnCase.reason)}` : ""}</p>${returnCase.resolution_summary ? `<p>${esc(returnCase.resolution_summary)}</p>` : ""}${returnCase.refund_amount !== null && returnCase.refund_amount !== undefined ? `<p>Refund: <strong>${money(returnCase.refund_amount)}</strong>${returnCase.refund_reference ? ` · ${esc(returnCase.refund_reference)}` : ""}</p>` : ""}${returnCase.replacement_reference ? `<p>Replacement: <strong>${esc(returnCase.replacement_reference)}</strong></p>` : ""}</div>` : ""}
        </div>
      </details>`;
    }).join("");
  }

  await load();
  window.addEventListener("pageshow", load);
});
