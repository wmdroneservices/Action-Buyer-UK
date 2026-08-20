document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("customer-details");
  if (!auth || !box) return;
  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=admin-customer-details.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { location.href = "account.html"; return; }

  const userId = new URLSearchParams(location.search).get("user_id");
  if (!userId) { box.innerHTML = `<section class="account-panel"><p>No customer was selected.</p></section>`; return; }

  const { data, error } = await auth.supabase.rpc("staff_customer_profile", { p_user_id: userId });
  if (error || !data?.customer) {
    box.innerHTML = `<section class="account-panel"><p>Customer history could not be loaded.</p></section>`;
    return;
  }

  const c = data.customer;
  const valuations = Array.isArray(data.valuations) ? data.valuations : [];
  const sales = Array.isArray(data.sales) ? data.sales : [];
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const date = v => v ? new Date(v).toLocaleDateString("en-GB") : "—";
  const money = v => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(v || 0));
  const address = [c.address_line1,c.address_line2,c.city,c.county,c.postcode].filter(Boolean).join(", ") || "No address recorded";
  const itemName = i => [i.manufacturer, i.model || i.item_name].filter(Boolean).join(" ") || "Item";
  const statusLabel = v => String(v || "").replaceAll("_", " ");

  document.getElementById("customer-name").textContent = c.full_name || "Unnamed customer";
  document.getElementById("customer-summary").textContent = `${c.account_number || "No account number"} · ${c.email || "No email"}`;

  const profile = `<section class="account-panel"><div class="section-heading"><p class="section-kicker">CUSTOMER ACCOUNT</p><h2>Customer details</h2></div><div class="dashboard-stats">
    <div><strong>${esc(c.account_number || "—")}</strong><span>account number</span></div>
    <div><strong>${esc(c.account_status || "active")}</strong><span>account status</span></div>
    <div><strong>${valuations.length}</strong><span>valuation requests</span></div>
    <div><strong>${sales.length}</strong><span>sales</span></div>
  </div><div class="valuation-card"><div style="width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem 1.5rem"><p><strong>Name</strong><br>${esc(c.full_name || "—")}</p><p><strong>Email</strong><br>${esc(c.email || "—")}</p><p><strong>Phone</strong><br>${esc(c.phone || "—")}</p><p><strong>Address</strong><br>${esc(address)}</p></div></div></section>`;

  const valuationSection = `<section class="account-panel"><div class="section-heading"><p class="section-kicker">VALUATION HISTORY</p><h2>Quote history</h2><p>Each submission remains one valuation request, with all its individual items, offers and refusals.</p></div>${valuations.length ? valuations.map(v => `<details class="valuation-card"><summary style="cursor:pointer;list-style:none"><div><span class="valuation-ref">${esc(v.quote_reference)}</span><p class="section-kicker">${esc(statusLabel(v.status))}</p><h3>${esc(v.items?.length || 0)} item${v.items?.length === 1 ? "" : "s"} · ${money(v.quote_amount)}</h3><p>Submitted ${date(v.submitted_at)}</p></div><div class="valuation-meta"><span class="status-badge">VIEW REQUEST</span></div></summary><div style="margin-top:1rem">${(v.items || []).map(i => { const offers=i.offers||[], refusals=i.refusals||[]; return `<div class="shipping-block"><h4>${esc(itemName(i))}</h4><p>Status: <strong>${esc(statusLabel(i.item_status))}</strong></p>${offers.length ? `<p><strong>Offers</strong><br>${offers.map(o => `${money(o.amount)} — ${esc(statusLabel(o.status))}${o.published_at ? ` · ${date(o.published_at)}` : ""}`).join("<br>")}</p>` : "<p>No offer recorded.</p>"}${refusals.length ? `<p><strong>Refusal history</strong><br>${refusals.map(r => `${esc(r.reason || "No internal reason recorded")} · ${date(r.refused_at)}`).join("<br>")}</p>` : ""}</div>`; }).join("")}</div></details>`).join("") : `<p>No valuation requests recorded.</p>`}</section>`;

  const salesSection = `<section class="account-panel"><div class="section-heading"><p class="section-kicker">PURCHASE HISTORY</p><h2>Sales &amp; payments</h2><p>Completed and active purchases, shipping, payment and return information. Email bodies are not stored or displayed here.</p></div>${sales.length ? sales.map(s => `<details class="valuation-card"><summary style="cursor:pointer;list-style:none"><div><span class="valuation-ref">${esc(s.sale_reference)}</span><p class="section-kicker">${esc(statusLabel(s.status))}</p><h3>${money(s.total_amount)}</h3><p>Created ${date(s.created_at)}${s.archived_at ? ` · Archived ${date(s.archived_at)}` : ""}</p></div><div class="valuation-meta"><span class="status-badge">VIEW SALE</span></div></summary><div style="margin-top:1rem"><div class="shipping-block"><h4>Items purchased</h4>${(s.items||[]).map(i => `<p>${esc(itemName(i))} — <strong>${money(i.amount)}</strong></p>`).join("") || "<p>No items recorded.</p>"}</div><div class="shipping-block"><h4>Payment</h4><p>Status: <strong>${esc(statusLabel(s.payment_status))}</strong>${s.payment_sent_at ? ` · Sent ${date(s.payment_sent_at)}` : ""}${s.payment_reference ? ` · Reference ${esc(s.payment_reference)}` : ""}</p>${s.bank_details_confirmed_at ? `<p>Bank details received ${date(s.bank_details_confirmed_at)}. ${s.bank_details_deleted_at ? "Full bank details have been automatically deleted." : "Full bank details are retained only according to the customer's storage preference."}</p>` : "<p>No bank details recorded.</p>"}${s.bank_account_masked ? `<p>Account number: <strong>${esc(s.bank_account_masked)}</strong><br>Sort code: <strong>${esc(s.bank_sort_code_masked || "")}</strong></p>` : ""}</div><div class="shipping-block"><h4>Shipping</h4>${(s.shipments||[]).length ? (s.shipments||[]).map(sh => `<p><strong>${esc(sh.shipment_type === "inbound" ? "Customer → GearCashOut" : "GearCashOut → Customer")}</strong> — ${esc(statusLabel(sh.status))}${sh.carrier ? ` · ${esc(sh.carrier)}` : ""}${sh.tracking_number ? ` · Tracking ${esc(sh.tracking_number)}` : ""}</p>`).join("") : "<p>No shipment records.</p>"}</div></div></details>`).join("") : `<p>No sales recorded.</p>`}</section>`;

  const notes = `<section class="account-panel"><div class="section-heading"><p class="section-kicker">RECORDS</p><h2>Staff record</h2><p>Only operational and transaction history is shown here. Individual email bodies are not retained as part of the customer profile.</p></div><p>Customer account information, valuation decisions, accepted purchases, refusals, payments and shipping records are retained separately so they can be reviewed without maintaining a complete email history.</p></section>`;

  box.innerHTML = profile + valuationSection + salesSection + notes;
});
