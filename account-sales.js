document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const { data: sales } = await auth.supabase
    .from("sales")
    .select("id,sale_reference,status,total_amount,created_at,accepted_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });
  if (!sales?.length) return;

  const ids = sales.map(s => s.id);
  const { data: items } = await auth.supabase
    .from("sale_items")
    .select("sale_id,quote_item_id,amount")
    .in("sale_id", ids);
  const qids = (items || []).map(i => i.quote_item_id);
  const { data: qitems } = qids.length
    ? await auth.supabase.from("quote_items").select("id,model,manufacturer,item_name").in("id", qids)
    : { data: [] };
  const { data: shipments } = await auth.supabase
    .from("shipments")
    .select("id,sale_id,shipment_type,status,carrier,tracking_number,parcel_count,label_count,label_urls,qr_code_urls,shipped_at,delivered_at,created_at,notes")
    .in("sale_id", ids)
    .order("created_at", { ascending: false });

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const date = value => value ? new Date(value).toLocaleDateString("en-GB") : "";
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const safeUrl = value => /^https?:\\/\\//i.test(String(value || "")) ? String(value) : "";
  const links = (values, label) => (Array.isArray(values) ? values : [])
    .map((url, index) => { const safe = safeUrl(url); return safe ? `<a class="btn btn-secondary" href="${esc(safe)}" target="_blank" rel="noopener">${esc(label)} ${index + 1}</a>` : ""; })
    .join(" ");

  const section = document.createElement("section");
  section.className = "account-panel";
  section.innerHTML = `
    <div class="section-heading">
      <p class="section-kicker">ACCEPTED SALE</p>
      <h2>Your purchase</h2>
      <p>Accepted items are combined into one sale. Open a sale to see your items, postal labels, QR codes and tracking history.</p>
    </div>
    ${sales.map(s => {
      const si = (items || []).filter(i => i.sale_id === s.id);
      const sh = (shipments || []).filter(x => x.sale_id === s.id);
      const inbound = sh.filter(x => x.shipment_type === "inbound");
      const returns = sh.filter(x => x.shipment_type === "return");
      const hasInboundLabel = inbound.some(x => Array.isArray(x.label_urls) && x.label_urls.length);
      return `<details class="valuation-card sale-card">
        <summary style="cursor:pointer;list-style:none">
          <div><span class="valuation-ref">${esc(s.sale_reference)}</span><p class="section-kicker">${esc(s.status.replaceAll("_", " "))}</p><h3>${money(s.total_amount)}</h3><p>${si.map(i => { const q = (qitems || []).find(x => x.id === i.quote_item_id); return esc(q?.model || q?.item_name || "Item") + " — " + money(i.amount); }).join("<br>")}</p></div>
          <div class="valuation-meta"><span class="status-badge">OPEN SALE</span><small>${s.accepted_at ? `Accepted ${date(s.accepted_at)}` : `Created ${date(s.created_at)}`}</small></div>
        </summary>
        <div class="sale-details">
          <p><strong>Thank you.</strong> ${hasInboundLabel ? "Your postal label is ready. It has also been sent to you by email and is available here." : "You will receive your postal label by email when it is ready. It will also appear here."}</p>
          ${inbound.map(x => `<div class="shipping-block"><h4>Customer → GearCashOut</h4><p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — Tracking: <strong>${esc(x.tracking_number)}</strong>` : ""}</p><p>${x.shipped_at ? `Posted ${date(x.shipped_at)}` : ""}${x.delivered_at ? ` — Delivered ${date(x.delivered_at)}` : ""}</p><p>${esc(x.label_count)} label(s) / ${esc(x.parcel_count)} parcel(s)</p><div class="navigation-buttons">${links(x.label_urls, "POSTAL LABEL")} ${links(x.qr_code_urls, "QR CODE")}</div></div>`).join("")}
          ${returns.map(x => `<div class="shipping-block"><h4>GearCashOut → Customer</h4><p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — Tracking: <strong>${esc(x.tracking_number)}</strong>` : ""}</p><p>${x.shipped_at ? `Posted ${date(x.shipped_at)}` : ""}${x.delivered_at ? ` — Delivered ${date(x.delivered_at)}` : ""}</p><p>${esc(x.label_count)} label(s) / ${esc(x.parcel_count)} parcel(s)</p><div class="navigation-buttons">${links(x.label_urls, "RETURN LABEL")} ${links(x.qr_code_urls, "QR CODE")}</div></div>`).join("")}
          ${!sh.length ? "<p>Your shipping details will appear here when the shipment is arranged.</p>" : ""}
        </div>
      </details>`;
    }).join("")}`;

  document.querySelector("main.account-page .container")?.prepend(section);
});
