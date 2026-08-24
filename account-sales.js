document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  async function load() {
    const { data: sales, error: salesError } = await auth.supabase.from("sales")
      .select("id,sale_reference,status,total_amount,created_at,payment_status,payment_sent_at,payment_reference")
      .eq("user_id", session.user.id).order("created_at", { ascending: false });
    
    if (salesError) { console.error("Customer sales load failed", salesError); return; }
    
    const box = document.getElementById("completed-transactions");
    if (!box) return;

    // Show all active sales, not just paid/completed ones
    const allSales = (sales || []).filter(s => !["cancelled", "closed", "archived"].includes(s.status));
    
    if (!allSales.length) { 
      box.innerHTML = "<p>No transactions currently.</p>"; 
      return; 
    }

    const ids = allSales.map(s => s.id);
    const { data: items } = await auth.supabase.from("sale_items")
      .select("sale_id,quote_item_id,amount,created_at")
      .in("sale_id", ids);
    
    const qids = (items || []).map(i => i.quote_item_id);
    const { data: qitems } = qids.length ? await auth.supabase.from("quote_items")
      .select("id,model,manufacturer,item_name")
      .in("id", qids) : { data: [] };
    
    const { data: shipments } = await auth.supabase.from("shipments")
      .select("id,sale_id,shipment_type,status,carrier,tracking_number,parcel_count,label_count,label_urls,qr_code_urls,shipped_at,delivered_at,created_at,notes")
      .in("sale_id", ids)
      .order("created_at", { ascending: false });

    const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
    const date = v => v ? new Date(v).toLocaleDateString("en-GB") : "";
    const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
    const safeUrl = v => /^https?:\/\//i.test(String(v || "")) ? String(v) : "";
    const links = (values, label) => (Array.isArray(values) ? values : []).map((url, i) => { const safe = safeUrl(url); return safe ? `<a class="btn btn-secondary" href="${esc(safe)}" target="_blank" rel="noopener">${esc(label)} ${i + 1}</a>` : ""; }).join(" ");

    box.innerHTML = allSales
      .map(s => {
        const si = (items || []).filter(i => i.sale_id === s.id);
        const sh = (shipments || []).filter(x => x.sale_id === s.id);
        const inbound = sh.filter(x => x.shipment_type === "inbound");
        const returns = sh.filter(x => x.shipment_type === "return");
        const firstAccepted = si.map(x => x.created_at).filter(Boolean).sort()[0];
        const received = ["received", "inspection", "payment_due", "paid", "completed", "return_shipped"].includes(s.status);
        const labelReady = inbound.some(x => x.status !== "awaiting_label" || (Array.isArray(x.label_urls) && x.label_urls.length));
        const posted = inbound.some(x => x.shipped_at || ["in_transit", "delivered"].includes(x.status));
        const delivered = inbound.some(x => x.delivered_at || x.status === "delivered") || received;
        
        const finalOutcome = received
          ? `<div class="status-badge">PAYMENT RECEIVED</div><p><strong>Payment received.</strong> Your payment was sent to your bank account${s.payment_sent_at ? ` on ${date(s.payment_sent_at)}` : ""}.</p>`
          : labelReady
          ? `<div class="status-badge">LABEL READY</div><p><strong>Your shipping label is ready.</strong></p>${inbound[0] ? links(inbound[0].label_urls, "Download label") : ""}${inbound[0] ? links(inbound[0].qr_code_urls, "View QR code") : ""}`
          : `<div class="status-badge">AWAITING SHIPMENT</div><p><strong>Preparing your shipment.</strong> We will update you when your label is ready.</p>`;

        return `<details class="valuation-card sale-card" style="margin-bottom:1rem">
          <summary style="cursor:pointer;list-style:none"><div><span class="valuation-ref">${esc(s.sale_reference)}</span><p class="section-kicker">${received ? "PAYMENT RECEIVED" : "IN PROGRESS"}</p><h3>${money(s.total_amount)}</h3></div></summary>
          <div class="sale-details"><div class="purchase-progress"><h4>Sale progress</h4><p><strong>1. Offer accepted</strong> — ${firstAccepted ? date(firstAccepted) : "Accepted"}</p><p><strong>2. Shipping</strong> — ${labelReady ? "Label ready" : "Preparing"}</p>${received ? `<p><strong>3. Payment received</strong> — ${date(s.payment_sent_at)}</p>` : ""}</div>
          <div class="shipping-block">${finalOutcome}</div>
          ${labelReady ? `<p>Your postal label was issued for this transaction.</p>` : ""}
          ${inbound.map(x => `<div class="shipping-block"><h4>Customer → GearCashOut</h4><p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — ${esc(x.tracking_number)}` : ""}</p></div>`).join("")}
          ${returns.map(x => `<div class="shipping-block"><h4>GearCashOut → Customer</h4><p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — ${esc(x.tracking_number)}` : ""}</p></div>`).join("")}
          </div></details>`;
      }).join("");
  }

  // Load on initial page load
  await load();

  // Reload when customer returns to the page (e.g., after viewing shipment label)
  window.addEventListener("pageshow", async () => {
    await load();
  });

  // Also reload periodically in case customer keeps the tab open
  setInterval(load, 30000);
});
