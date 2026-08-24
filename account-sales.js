document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  async function load() {
    try {
      const { data: sales, error: salesError } = await auth.supabase.from("sales")
        .select("id,sale_reference,status,total_amount,created_at,payment_status,payment_sent_at,payment_reference")
        .eq("user_id", session.user.id).order("created_at", { ascending: false });
      
      if (salesError) { 
        console.error("Sales query error:", salesError);
        return; 
      }
      
      const box = document.getElementById("completed-transactions");
      if (!box) {
        console.warn("completed-transactions box not found");
        return;
      }

      // Show all active sales, not just paid/completed ones
      const allSales = (sales || []).filter(s => !["cancelled", "closed", "archived"].includes(s.status));
      
      console.log("All sales count:", allSales.length, "Sales data:", allSales);
      
      if (!allSales.length) { 
        box.innerHTML = "<p>No transactions currently.</p>"; 
        return; 
      }

      const ids = allSales.map(s => s.id);
      
      const { data: items, error: itemsError } = await auth.supabase.from("sale_items")
        .select("sale_id,quote_item_id,amount,created_at")
        .in("sale_id", ids);
      
      if (itemsError) {
        console.error("Items query error:", itemsError);
        return;
      }
      
      const qids = (items || []).map(i => i.quote_item_id);
      const { data: qitems, error: qitemsError } = qids.length ? await auth.supabase.from("quote_items")
        .select("id,model,manufacturer,item_name")
        .in("id", qids) : { data: [] };
      
      if (qitemsError) {
        console.error("Quote items query error:", qitemsError);
        return;
      }
      
      const { data: shipments, error: shipmentsError } = await auth.supabase.from("shipments")
        .select("id,sale_id,shipment_type,status,carrier,tracking_number,parcel_count,label_count,label_urls,qr_code_urls,shipped_at,delivered_at,created_at,notes")
        .in("sale_id", ids)
        .order("created_at", { ascending: false });

      if (shipmentsError) {
        console.error("Shipments query error:", shipmentsError);
        return;
      }

      console.log("Shipments count:", (shipments || []).length, "Shipments data:", shipments);

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
          const received = [
  "received",
  "inspection",
  "payment_due",
  "paid",
  "completed"
].includes(s.status);
          const labelReady = inbound.some(x => x.status !== "awaiting_label" || (Array.isArray(x.label_urls) && x.label_urls.length));
          const posted = inbound.some(x =>
  ["in_transit", "delivered"].includes(x.status)
);
          const delivered = inbound.some(x => x.delivered_at || x.status === "delivered") || received;
          
          const finalOutcome = received
            ? `<div class="status-badge">PAYMENT RECEIVED</div><p><strong>Payment received.</strong> Your payment was sent to your bank account${s.payment_sent_at ? ` on ${date(s.payment_sent_at)}` : ""}.</p>`
            : posted
? `<div class="status-badge">ITEM POSTED</div><p><strong>Your item has been posted.</strong> We will update you when it arrives.</p>`
: labelReady
            ? `<div class="status-badge">LABEL READY</div><p><strong>Your shipping label is ready.</strong></p>${inbound[0] ? links(inbound[0].label_urls, "Download label") : ""}${inbound[0] ? links(inbound[0].qr_code_urls, "View QR code") : ""}${inbound[0] && !posted ? `
            <button class="btn btn-primary post-shipment-btn" data-shipment-id="${inbound.find(x => x.status === 'label_created')?.id}">
I HAVE POSTED MY ITEM
</button>` : ""}`
          
            : `<div class="status-badge">AWAITING SHIPMENT</div><p><strong>Preparing your shipment.</strong> We will update you when your label is ready.</p>`;

          return `<details open class="valuation-card sale-card" style="margin-bottom:1rem">
            <summary style="cursor:pointer;list-style:none"><div><span class="valuation-ref">${esc(s.sale_reference)}</span><p class="section-kicker">${received ? "PAYMENT RECEIVED" : "IN PROGRESS"}</p><h3>${money(s.total_amount)}</h3></div></summary>
            <div class="sale-details"><div class="purchase-progress"><h4>Sale progress</h4><p><strong>1. Offer accepted</strong> — ${firstAccepted ? date(firstAccepted) : "Accepted"}</p><p><strong>2. Shipping</strong> — ${labelReady ? "Label ready" : "Preparing"}</p>${received ? `<p><strong>3. Payment received</strong> — ${date(s.payment_sent_at)}</p>` : ""}</div>
            <div class="shipping-block">${finalOutcome}</div>
            ${labelReady ? `<p>Your postal label was issued for this transaction.</p>` : ""}
            ${inbound.map(x => `<div class="shipping-block"><h4>Customer → GearCashOut</h4><p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — ${esc(x.tracking_number)}` : ""}</p></div>`).join("")}
            ${returns.map(x => `<div class="shipping-block"><h4>GearCashOut → Customer</h4><p>${esc(x.status.replaceAll("_", " "))}${x.carrier ? ` — ${esc(x.carrier)}` : ""}${x.tracking_number ? ` — ${esc(x.tracking_number)}` : ""}</p></div>`).join("")}
            </div></details>`;
        }).join("");
      
      console.log("Rendered sales successfully");
    } catch (err) {
      console.error("Unexpected error in load():", err);
      const box = document.getElementById("completed-transactions");
      if (box) box.innerHTML = `<p>Error loading transactions. Check browser console for details.</p>`;
    }
  }

 // Load on initial page load
await load();

// Reload when customer returns to the page (e.g., after viewing shipment label)
window.addEventListener("pageshow", async () => {
  console.log("Page shown, reloading sales...");
  await load();
});

// Customer confirms item has been posted
document.addEventListener("click", async (event) => {
  const button = event.target.closest(".post-shipment-btn");
  if (!button) return;

  event.preventDefault();

  const shipmentId = button.dataset.shipmentId;

  console.log("Customer confirmed posted shipment:", shipmentId);

  const { error } = await auth.supabase
    .from("shipments")
    .update({
      status: "in_transit",
      shipped_at: new Date().toISOString()
    })
    .eq("id", shipmentId);

  if (error) {
    console.error("Shipment update failed:", error);
    alert("Unable to update shipment status. Please try again.");
    return;
  }

  alert("Thank you. Your item has been marked as posted.");

  console.log("Shipment updated successfully");

  await load();
});

});
