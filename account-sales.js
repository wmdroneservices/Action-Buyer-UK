document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const { data: sales, error: salesError } = await auth.supabase.from("sales")
    .select("id,sale_reference,status,total_amount,created_at,payment_status,payment_sent_at,payment_reference")
    .eq("user_id", session.user.id).order("created_at", { ascending: false });
  if (salesError) { console.error("Customer sales load failed", salesError); return; }

  const completed = (sales || []).filter(s => s.status === "paid" || ["paid", "payment_sent"].includes(String(s.payment_status || "")) || !!s.payment_sent_at);
  const box = document.getElementById("completed-transactions");
  if (!box) return;
  if (!completed.length) { box.innerHTML = "<p>No completed transactions yet.</p>"; return; }

  const ids = completed.map(s => s.id);
  const { data: items } = await auth.supabase.from("sale_items").select("sale_id,quote_item_id,amount,created_at").in("sale_id", ids);
  const qids = (items || []).map(i => i.quote_item_id);
  const { data: qitems } = qids.length ? await auth.supabase.from("quote_items").select("id,model,manufacturer,item_name").in("id", qids) : { data: [] };
  const { data: shipments } = await auth.supabase.from("shipments")
    .select("id,sale_id,shipment_type,status,carrier,tracking_number,parcel_count,label_count,label_urls,qr_code_urls,shipped_at,delivered_at,created_at,notes")
    .in("sale_id", ids).order("created_at", { ascending: false });

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const date = v => v ? new Date(v).toLocaleDateString("en-GB") : "";
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const safeUrl = v => /^https?:\/\//i.test(String(v || "")) ? String(v) : "";
  const links = (values, label) => (Array.isArray(values) ? values : []).map((url, i) => { const safe = safeUrl(url); return safe ? `<a class="btn btn-secondary" href="${esc(safe)}" target="_blank" rel="noopener">${esc(label)} ${i + 1}</a>` : ""; }).join(" ");

  box.innerHTML = completed.map(s => {
    const si = (items || []).filter(i => i.sale_id === s.id);
    const sh = (shipments || []).filter(x => x.sale_id === s.id);
    const inbound = sh.filter(x => x.shipment_type === "inbound");
    const returns = sh.filter(x => x.shipment_type === "return");
    const firstAccepted = si.map(x => x.created_at).filter(Boolean).sort()[0];
    const received = ["received", "inspection", "payment_due", "paid", "completed", "return_shipped"].includes(s.status);
    const labelReady = inbound.some(x => x.status !== "awaiting_label" || (Array.isArray(x.label_urls) && x.label_urls.length));
    const posted = inbound.some(x => x.shipped_at || ["in_transit", "delivered"].includes(x.status));
    const delivered = inbound.some(x => x.delivered_at || x.status === "delivered") || received;
    const finalOutcome = `<div class="status-badge">PAYMENT RECEIVED</div><p><strong>Payment received.</strong> Your payment was sent to your bank account${s.payment_sent_at ? ` on ${date(s.payment_sent_at)}` : ""}${s.payment_reference ? ` — reference ${esc(s.payment_reference)}` : ""}.</p>`;

    return `<details class="valuation-card sale-card" style="margin-bottom:1rem">
      <summary style="cursor:pointer;list-style:none"><div><span class="valuation-ref">${esc(s.sale_reference)}</span><p class="section-kicker">PAYMENT RECEIVED</p><h3>${money(s.total_amount)}</h3><p>${si.map(i => { const q = (qitems || []).find(x => x.id === i.quote_item_id); return esc(q?.model || q?.item_name || "Item") + " — " + money(i.amount); }).join("<br>")}</p></div><div class="valuation-meta"><span class="status-badge">VIEW RECORD</span><small>${firstAccepted ? `Accepted ${date(firstAccepted)}` : `Completed ${date(s.created_at)}`}</small></div></summary>
      <div class="sale-details"><div class="purchase-progress"><h4>Completed transaction</h4><p><strong>1. Offer accepted</strong> — ${firstAccepted ? date(firstAccepted) : "Completed"}</p><p><strong>2. Item received</strong> — ${delivered ? "Received by GearCashOut" : "Completed"}</p><p><strong>3. Final outcome</strong> — Payment received</p></div>
      <div class="shipping-block">${finalOutcome}</div>
      ${labelReady ? `<p>Your postal label was issued for this transaction.</p>` : ""}
      ${inbound.map(x => `<div class="shipping-block"><h4>Customer → GearCashOut</h4><p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — Tracking: <strong>${esc(x.tracking_number)}</strong>` : ""}</p><p>${x.shipped_at ? `Posted ${date(x.shipped_at)}` : ""}${x.delivered_at ? ` — Delivered ${date(x.delivered_at)}` : ""}</p><div class="navigation-buttons">${links(x.label_urls, "POSTAL LABEL")} ${links(x.qr_code_urls, "QR CODE")}</div></div>`).join("")}
      ${returns.map(x => `<div class="shipping-block"><h4>GearCashOut → Customer</h4><p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — Tracking: <strong>${esc(x.tracking_number)}</strong>` : ""}</p><p>${x.shipped_at ? `Posted ${date(x.shipped_at)}` : ""}${x.delivered_at ? ` — Delivered ${date(x.delivered_at)}` : ""}</p><div class="navigation-buttons">${links(x.label_urls, "RETURN LABEL")} ${links(x.qr_code_urls, "QR CODE")}</div></div>`).join("")}
      </div></details>`;
  }).join("");
});
