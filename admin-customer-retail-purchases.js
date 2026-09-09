document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("customer-details");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) return;
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) return;

  const userId = new URLSearchParams(location.search).get("user_id");
  if (!userId) return;

  for (let i = 0; i < 40; i++) {
    if (box.querySelector(".account-panel")) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const { data, error } = await auth.supabase.rpc("staff_customer_profile", { p_user_id: userId });
  if (error || !data?.customer) return;

  const purchases = Array.isArray(data.retail_purchases) ? data.retail_purchases : [];
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const date = v => v ? new Date(v).toLocaleDateString("en-GB") : "—";
  const money = v => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(v || 0));
  const statusLabel = v => String(v || "").replaceAll("_", " ");

  const section = document.createElement("section");
  section.className = "account-panel";
  section.innerHTML = `<div class="section-heading"><p class="section-kicker">BUYING FROM GEARCASHOUT</p><h2>Retail purchase history</h2><p>Products this customer has bought from GearCashOut, including fulfilment and return status where recorded.</p></div>`;

  if (!purchases.length) {
    section.innerHTML += `<p>No retail purchases recorded.</p>`;
    box.appendChild(section);
    return;
  }

  section.innerHTML += purchases.map(p => {
    const title = p.listing_title || [p.manufacturer, p.model].filter(Boolean).join(" ") || "Equipment";
    const fulfilment = p.fulfilment;
    const returnCase = p.return_case;
    return `<details class="valuation-card" style="margin-bottom:1rem"><summary style="cursor:pointer;list-style:none"><div><span class="valuation-ref">${esc(p.invoice_reference || "RETAIL PURCHASE")}</span><p class="section-kicker">${esc(statusLabel(p.status))}</p><h3>${esc(title)} · ${money(p.sale_price)}</h3><p>Purchased ${date(p.sale_date)}</p></div><div class="valuation-meta"><span class="status-badge">VIEW PURCHASE</span></div></summary><div style="margin-top:1rem"><div class="shipping-block"><h4>Purchase</h4><p>Channel: <strong>${esc(p.sales_channel || "Website")}</strong></p>${p.asset_sku ? `<p>SKU: <strong>${esc(p.asset_sku)}</strong></p>` : ""}<p>Price: <strong>${money(p.sale_price)}</strong></p>${Number(p.additional_costs || 0) ? `<p>Additional costs: <strong>${money(p.additional_costs)}</strong></p>` : ""}</div><div class="shipping-block"><h4>Fulfilment</h4><p>${fulfilment ? `<strong>${esc(statusLabel(fulfilment.status))}</strong>${fulfilment.carrier ? ` · ${esc(fulfilment.carrier)}` : ""}${fulfilment.tracking_number ? ` · Tracking ${esc(fulfilment.tracking_number)}` : ""}${fulfilment.delivered_at ? ` · Delivered ${date(fulfilment.delivered_at)}` : ""}` : "No fulfilment record yet."}</p></div>${returnCase ? `<div class="shipping-block"><h4>Return</h4><p><strong>${esc(statusLabel(returnCase.status))}</strong>${returnCase.reason ? ` · ${esc(returnCase.reason)}` : ""}</p>${returnCase.refund_amount !== null && returnCase.refund_amount !== undefined ? `<p>Refund: <strong>${money(returnCase.refund_amount)}</strong>${returnCase.refund_reference ? ` · ${esc(returnCase.refund_reference)}` : ""}</p>` : ""}</div>` : ""}</div></details>`;
  }).join("");

  box.appendChild(section);
});
