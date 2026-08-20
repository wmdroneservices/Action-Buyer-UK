document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const { data: sales, error: salesError } = await auth.supabase
    .from("sales")
    .select("id,sale_reference,status,total_amount,created_at,payment_status,payment_sent_at,payment_reference")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (salesError) {
    console.error("Customer sales load failed", salesError);
    return;
  }
  if (!sales?.length) return;

  const ids = sales.map(s => s.id);
  const { data: items, error: itemsError } = await auth.supabase
    .from("sale_items")
    .select("sale_id,quote_item_id,amount,created_at")
    .in("sale_id", ids);
  if (itemsError) console.error("Customer sale items load failed", itemsError);

  const qids = (items || []).map(i => i.quote_item_id);
  const { data: qitems, error: qitemsError } = qids.length
    ? await auth.supabase.from("quote_items").select("id,model,manufacturer,item_name").in("id", qids)
    : { data: [], error: null };
  if (qitemsError) console.error("Customer quote items load failed", qitemsError);

  const { data: shipments, error: shipmentsError } = await auth.supabase
    .from("shipments")
    .select("id,sale_id,shipment_type,status,carrier,tracking_number,parcel_count,label_count,label_urls,qr_code_urls,shipped_at,delivered_at,created_at,notes")
    .in("sale_id", ids)
    .order("created_at", { ascending: false });
  if (shipmentsError) console.error("Customer shipments load failed", shipmentsError);

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const date = value => value ? new Date(value).toLocaleDateString("en-GB") : "";
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const safeUrl = value => /^https?:\/\//i.test(String(value || "")) ? String(value) : "";
  const links = (values, label) => (Array.isArray(values) ? values : [])
    .map((url, index) => {
      const safe = safeUrl(url);
      return safe ? `<a class="btn btn-secondary" href="${esc(safe)}" target="_blank" rel="noopener">${esc(label)} ${index + 1}</a>` : "";
    }).join(" ");

  const section = document.createElement("section");
  section.className = "account-panel";
  section.innerHTML = `
    <div class="section-heading">
      <p class="section-kicker">ACCEPTED SALES</p>
      <h2>Your purchases</h2>
      <p>Each accepted offer is shown as its own purchase below. Open a purchase to see its complete progress and shipping history.</p>
    </div>
    ${sales.map(s => {
      const si = (items || []).filter(i => i.sale_id === s.id);
      const sh = (shipments || []).filter(x => x.sale_id === s.id);
      const inbound = sh.filter(x => x.shipment_type === "inbound");
      const returns = sh.filter(x => x.shipment_type === "return");
      const firstAccepted = si.map(x => x.created_at).filter(Boolean).sort()[0];
      const latestInbound = inbound[0];
      const received = ["received", "inspection", "payment_due", "paid", "completed", "return_shipped"].includes(s.status);
      const labelReady = inbound.some(x => x.status !== "awaiting_label" || (Array.isArray(x.label_urls) && x.label_urls.length));
      const posted = inbound.some(x => x.shipped_at || ["in_transit", "delivered"].includes(x.status));
      const delivered = inbound.some(x => x.delivered_at || x.status === "delivered") || received;
      const paymentReceived = s.status === "paid" || ["paid", "payment_sent"].includes(String(s.payment_status || "")) || !!s.payment_sent_at;
      const returnShipped = s.status === "return_shipped" || returns.some(x => x.shipped_at || ["in_transit", "delivered"].includes(x.status));
      const finalOutcome = paymentReceived ? `<div class="status-badge">PAYMENT RECEIVED</div><p><strong>Payment received.</strong> Your payment has been sent to your bank account${s.payment_sent_at ? ` on ${date(s.payment_sent_at)}` : ""}${s.payment_reference ? ` — reference ${esc(s.payment_reference)}` : ""}.</p>` : returnShipped ? `<div class="status-badge">RETURN SHIPPED</div><p><strong>Return shipped.</strong> Your item has been shipped back to you${returns.find(x => x.shipped_at || ["in_transit","delivered"].includes(x.status))?.tracking_number ? ` — tracking ${esc(returns.find(x => x.shipped_at || ["in_transit","delivered"].includes(x.status)).tracking_number)}` : ""}.</p>` : "";

      return `<details class="valuation-card sale-card">
        <summary style="cursor:pointer;list-style:none">
          <div>
            <span class="valuation-ref">${esc(s.sale_reference)}</span>
            <p class="section-kicker">${paymentReceived ? "PAYMENT RECEIVED" : returnShipped ? "RETURN SHIPPED" : esc(s.status.replaceAll("_", " "))}</p>
            <h3>${money(s.total_amount)}</h3>
            <p>${si.map(i => { const q = (qitems || []).find(x => x.id === i.quote_item_id); return esc(q?.model || q?.item_name || "Item") + " — " + money(i.amount); }).join("<br>")}</p>
          </div>
          <div class="valuation-meta"><span class="status-badge">VIEW PROGRESS</span><small>${firstAccepted ? `Accepted ${date(firstAccepted)}` : `Created ${date(s.created_at)}`}</small></div>
        </summary>
        <div class="sale-details">
          <div class="purchase-progress">
            <h4>Your GearCashOut sale</h4>
            <p><strong>1. Offer accepted</strong> — ${firstAccepted ? date(firstAccepted) : "Completed"}</p>
            <p><strong>2. Offer confirmed</strong> — Your accepted offer is now being processed.</p>
            <p><strong>3. Postal label</strong> — ${labelReady ? "Label ready" : "Waiting for label"}</p>
            <p><strong>4. Item sent to GearCashOut</strong> — ${posted ? "Posted" : "Not yet posted"}</p>
            <p><strong>5. Item received</strong> — ${delivered ? "Received by GearCashOut" : "Waiting for delivery"}</p>
            <p><strong>6. Final outcome</strong> — ${paymentReceived ? "Payment received" : returnShipped ? "Return shipped" : "Pending"}</p>
          </div>

          ${finalOutcome ? `<div class="shipping-block">${finalOutcome}</div>` : ""}

          <p><strong>Thank you.</strong> ${labelReady ? "Your postal label is ready and is available below. The label information is also sent to you by email." : "You will receive your postal label by email when it is ready. It will also appear here."}</p>

          ${inbound.map(x => `<div class="shipping-block">
            <h4>Customer → GearCashOut</h4>
            <p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — Tracking: <strong>${esc(x.tracking_number)}</strong>` : ""}</p>
            <p>${x.shipped_at ? `Posted ${date(x.shipped_at)}` : ""}${x.delivered_at ? ` — Delivered ${date(x.delivered_at)}` : ""}</p>
            <p>${esc(x.label_count)} label(s) / ${esc(x.parcel_count)} parcel(s)</p>
            <div class="navigation-buttons">${links(x.label_urls, "POSTAL LABEL")} ${links(x.qr_code_urls, "QR CODE")}</div>
          </div>`).join("")}

          ${returns.map(x => `<div class="shipping-block">
            <h4>GearCashOut → Customer</h4>
            <p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — Tracking: <strong>${esc(x.tracking_number)}</strong>` : ""}</p>
            <p>${x.shipped_at ? `Posted ${date(x.shipped_at)}` : ""}${x.delivered_at ? ` — Delivered ${date(x.delivered_at)}` : ""}</p>
            <p>${esc(x.label_count)} label(s) / ${esc(x.parcel_count)} parcel(s)</p>
            <div class="navigation-buttons">${links(x.label_urls, "RETURN LABEL")} ${links(x.qr_code_urls, "QR CODE")}</div>
          </div>`).join("")}

          ${!sh.length ? "<p>Your shipping details will appear here when the shipment is arranged.</p>" : ""}
        </div>
      </details>`;
    }).join("")}`;

  document.querySelector("main.account-page .container")?.prepend(section);
});
