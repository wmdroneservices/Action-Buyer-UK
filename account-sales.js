document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  async function load() {
    try {
      const { data: sales, error: salesError } = await auth.supabase.from("sales")
        .select("id,sale_reference,status,total_amount,created_at,payment_status,payment_sent_at,payment_reference,archived_at")
        .eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (salesError) { console.error("Sales query error:", salesError); return; }

      const box = document.getElementById("completed-transactions");
      if (!box) { console.warn("completed-transactions box not found"); return; }

      const allSales = (sales || []).filter(s => !["cancelled", "closed", "archived"].includes(s.status));
      const completedSales = allSales.filter(s => ["paid", "completed"].includes(String(s.status || "")) || !!s.payment_sent_at);
      if (!completedSales.length) { box.innerHTML = "<p>No completed transactions currently.</p>"; return; }

      const ids = completedSales.map(s => s.id);
      const { data: items, error: itemsError } = await auth.supabase.from("sale_items")
        .select("sale_id,quote_item_id,amount,created_at").in("sale_id", ids);
      if (itemsError) { console.error("Items query error:", itemsError); return; }

      const qids = (items || []).map(i => i.quote_item_id);
      const { data: qitems, error: qitemsError } = qids.length
        ? await auth.supabase.from("quote_items").select("id,model,manufacturer,item_name").in("id", qids)
        : { data: [] };
      if (qitemsError) { console.error("Quote items query error:", qitemsError); return; }

      const { data: shipments, error: shipmentsError } = await auth.supabase.from("shipments")
        .select("id,sale_id,shipment_type,status,carrier,tracking_number,parcel_count,label_count,label_urls,qr_code_urls,shipped_at,delivered_at,created_at,notes")
        .in("sale_id", ids).order("created_at", { ascending: false });
      if (shipmentsError) { console.error("Shipments query error:", shipmentsError); return; }

      const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
      const date = v => v ? new Date(v).toLocaleDateString("en-GB") : "";
      const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
      const safeUrl = v => /^https?:\/\//i.test(String(v || "")) ? String(v) : "";
      const links = (values, label) => (Array.isArray(values) ? values : []).map((url, i) => {
        const safe = safeUrl(url);
        return safe ? `<a class="btn btn-secondary" href="${esc(safe)}" target="_blank" rel="noopener">${esc(label)} ${i + 1}</a>` : "";
      }).join(" ");

      box.innerHTML = completedSales.map(s => {
        const si = (items || []).filter(i => i.sale_id === s.id);
        const sh = (shipments || []).filter(x => x.sale_id === s.id);
        const inbound = sh.filter(x => x.shipment_type === "inbound");
        const returns = sh.filter(x => x.shipment_type === "return");
        const firstAccepted = si.map(x => x.created_at).filter(Boolean).sort()[0];
        const status = String(s.status || "");
        const labelReady = inbound.some(x => x.status !== "awaiting_label" || (Array.isArray(x.label_urls) && x.label_urls.length));
        const posted = inbound.some(x => ["in_transit", "delivered"].includes(x.status));
        const itemReceived = ["received", "inspection", "payment_due", "paid", "completed"].includes(status)
          || inbound.some(x => x.delivered_at || x.status === "delivered");
        const inspection = ["inspection", "payment_due", "paid", "completed"].includes(status);
        const finalQuoteAccepted = ["payment_due", "paid", "completed"].includes(status);
        const paymentReceived = ["paid", "completed"].includes(status) || !!s.payment_sent_at;

        let finalOutcome;
        if (paymentReceived) {
          finalOutcome = `<div class="status-badge">PAYMENT RECEIVED</div><p><strong>Payment received.</strong> Your payment was sent to your bank account${s.payment_sent_at ? ` on ${date(s.payment_sent_at)}` : ""}.</p>`;
        } else if (status === "payment_due") {
          finalOutcome = `<div class="status-badge">FINAL QUOTE ACCEPTED</div><p><strong>Your final quote has been accepted.</strong> Please provide your bank details so we can arrange payment.</p>`;
        } else if (inspection) {
          finalOutcome = `<div class="status-badge">UNDER INSPECTION</div><p><strong>Your item has been received and is being inspected.</strong> We will send your final quote when the inspection is complete.</p>`;
        } else if (itemReceived) {
          finalOutcome = `<div class="status-badge">ITEM RECEIVED</div><p><strong>We have received your item.</strong> It is now awaiting inspection.</p>`;
        } else if (posted) {
          finalOutcome = `<div class="status-badge">ITEM POSTED</div><p><strong>Your item has been posted.</strong> We will update you when it arrives.</p>`;
        } else if (labelReady) {
          const labelShipment = inbound.find(x => x.status === "label_created") || inbound[0];
          finalOutcome = `<div class="status-badge">LABEL READY</div><p><strong>Your shipping label is ready.</strong></p>${labelShipment ? links(labelShipment.label_urls, "Download label") : ""}${labelShipment ? links(labelShipment.qr_code_urls, "View QR code") : ""}${labelShipment && !posted ? `
            <button class="btn btn-primary post-shipment-btn" data-shipment-id="${esc(labelShipment.id)}">I HAVE POSTED MY ITEM</button>` : ""}`;
        } else {
          finalOutcome = `<div class="status-badge">AWAITING SHIPMENT</div><p><strong>Preparing your shipment.</strong> We will update you when your label is ready.</p>`;
        }

        const progress = [
          `<p><strong>1. Offer accepted</strong> — ${firstAccepted ? date(firstAccepted) : "Accepted"}</p>`,
          `<p><strong>2. Shipping</strong> — ${labelReady ? "Label ready" : posted ? "Item posted" : "Preparing"}</p>`
        ];
        if (itemReceived) progress.push(`<p><strong>3. Item received</strong> — Received by GearCashOut</p>`);
        if (inspection) progress.push(`<p><strong>4. Inspection</strong> — ${status === "inspection" ? "In progress" : "Complete"}</p>`);
        if (finalQuoteAccepted) progress.push(`<p><strong>5. Final quote</strong> — Accepted</p>`);
        if (status === "payment_due") progress.push(`<p><strong>6. Bank details</strong> — ${s.payment_status === "bank_details_received" ? "Received — payment awaiting processing" : "Required before payment"}</p>`);
        if (paymentReceived) progress.push(`<p><strong>6. Payment received</strong> — ${date(s.payment_sent_at)}</p>`);

        const productNames = si.map(item => {
          const qi = (qitems || []).find(q => q.id === item.quote_item_id);
          return qi ? [qi.manufacturer, qi.model || qi.item_name].filter(Boolean).join(" ") : "Equipment";
        }).filter(Boolean);
        const product = productNames.length ? productNames.join(", ") : "Equipment";
        const paidAmount = money(s.total_amount);
        const paidDate = s.payment_sent_at ? date(s.payment_sent_at) : "";
        const closedDate = s.archived_at ? date(s.archived_at) : paidDate;

        return `<details class="valuation-card sale-card completed-sale-card" style="margin-bottom:1rem">
          <summary class="completed-sale-summary" style="cursor:pointer;list-style:none;display:grid;grid-template-columns:minmax(150px,1.4fr) auto auto auto minmax(180px,2fr);gap:.75rem;align-items:center;padding:.85rem 0">
            <span class="valuation-ref">${esc(s.sale_reference)}</span>
            <span class="completed-sale-status">COMPLETED SALE</span>
            <span class="completed-sale-paid">PAID</span>
            <strong class="completed-sale-amount">${paidAmount}</strong>
            <span class="completed-sale-product">${esc(product)}</span>
          </summary>
          <div class="completed-sale-paid-date" style="padding:0 0 .25rem;color:#666;font-size:.9rem"><strong>Paid:</strong> ${paidDate || "Date not recorded"}</div>
          <div class="completed-sale-paid-date" style="padding:0 0 .75rem;color:#666;font-size:.9rem"><strong>Closed:</strong> ${closedDate || "Date not recorded"}</div>
          <div class="sale-details"><div class="purchase-progress"><h4>Sale progress</h4>${progress.join("")}</div>
          <div class="shipping-block">${finalOutcome}</div>
          ${labelReady ? `<p>Your postal label was issued for this transaction.</p>` : ""}
          ${inbound.map(x => `<div class="shipping-block"><h4>Customer → GearCashOut</h4><p><strong>${x.status === "in_transit" ? "POSTED" : esc(x.status.replaceAll("_", " "))}</strong>${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — ${esc(x.tracking_number)}` : ""}</p></div>`).join("")}
          ${returns.map(x => `<div class="shipping-block"><h4>GearCashOut → Customer</h4><p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — ${esc(x.tracking_number)}` : ""}</p></div>`).join("")}
          </div></details>`;
      }).join("");
    } catch (err) {
      console.error("Unexpected error in load():", err);
      const box = document.getElementById("completed-transactions");
      if (box) box.innerHTML = `<p>Error loading completed transactions. Check browser console for details.</p>`;
    }
  }

  await load();
  window.addEventListener("pageshow", async () => { await load(); });

  document.addEventListener("click", async event => {
    const button = event.target.closest(".post-shipment-btn");
    if (!button) return;
    event.preventDefault();
    const shipmentId = button.dataset.shipmentId;
    if (!shipmentId) return;

    button.disabled = true;
    const postedAt = new Date().toISOString();
    const { data, error } = await auth.supabase.from("shipments")
      .update({ status: "in_transit", shipped_at: postedAt })
      .eq("id", shipmentId).select("id,sale_id,status,shipped_at").single();

    if (error) {
      console.error("Shipment update failed:", error);
      button.disabled = false;
      alert("Unable to update shipment status. Please try again.");
      return;
    }

    if (data?.sale_id) {
      const { error: saleError } = await auth.supabase.from("sales")
        .update({ status: "shipping" }).eq("id", data.sale_id).eq("user_id", session.user.id)
        .in("status", ["collecting_items", "ready_for_shipping", "shipping"]);
      if (saleError) {
        console.error("Sale status update failed:", saleError);
        button.disabled = false;
        alert("Your item was marked as posted, but we could not update the sale status. Please refresh and try again.");
        await load();
        return;
      }
    }

    await load();
    const confirmation = document.createElement("div");
    confirmation.className = "shipping-block shipment-confirmation";
    confirmation.style.cssText = "margin-bottom:1rem;border-left:4px solid #d88732;background:#f3f1ec;padding:1rem 1.2rem";
    confirmation.innerHTML = `<div class="status-badge">PARCEL ON ITS WAY</div><p><strong>Your parcel is on its way to GearCashOut.</strong> We’ll let you know when it arrives and your valuation progresses.</p>`;
    const box = document.getElementById("completed-transactions");
    if (box) box.prepend(confirmation);
    window.setTimeout(() => confirmation.remove(), 5000);
  });
});
