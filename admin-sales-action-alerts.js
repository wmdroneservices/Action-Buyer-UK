/* Staff action prompts for accepted-sale cards. */
document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("sales-list");
  const auth = window.actionBuyerAuth;
  if (!box || !auth) return;

  let timer = null;
  let loading = false;
  const esc = v => String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 100);
  }

  async function enhance() {
    if (loading) return;
    loading = true;
    try {
      const cards = [...box.querySelectorAll("article.valuation-card")];
      if (!cards.length) return;

      const refs = cards.map(c => c.querySelector(".valuation-ref")?.textContent?.trim()).filter(Boolean);
      if (!refs.length) return;

      const { data: sales, error } = await auth.supabase
        .from("sales")
        .select("id,sale_reference,status,bank_details_confirmed_at,total_amount")
        .in("sale_reference", refs);
      if (error || !sales?.length) return;

      const saleIds = sales.map(s => s.id);
      const { data: shipments } = await auth.supabase
        .from("shipments")
        .select("id,sale_id,shipment_type,status,shipped_at,delivered_at")
        .in("sale_id", saleIds);

      const byRef = new Map(sales.map(s => [s.sale_reference, s]));
      const shipmentsBySale = new Map();
      (shipments || []).forEach(sh => {
        if (!shipmentsBySale.has(sh.sale_id)) shipmentsBySale.set(sh.sale_id, []);
        shipmentsBySale.get(sh.sale_id).push(sh);
      });

      cards.forEach(card => {
        if (card.querySelector(".sale-next-action")) return;
        const ref = card.querySelector(".valuation-ref")?.textContent?.trim();
        const sale = byRef.get(ref);
        if (!sale) return;

        const sh = shipmentsBySale.get(sale.id) || [];
        const inbound = sh.find(x => x.shipment_type === "inbound");
        const outbound = sh.find(x => x.shipment_type === "return");
        const status = String(sale.status || "");

        let tone = "wait";
        let title = "NEXT ACTION";
        let text = "Check the sale record for the next step.";

        if (["collecting_items", "ready_for_shipping", "shipping"].includes(status) && !inbound) {
          tone = "urgent";
          title = "CUSTOMER ACCEPTED OFFER — ACTION REQUIRED";
          text = "Create the customer → GearCashOut shipping label and send it to the customer.";
        } else if (["collecting_items", "ready_for_shipping", "shipping"].includes(status) && inbound && !inbound.shipped_at) {
          tone = "wait";
          title = "WAITING FOR CUSTOMER";
          text = "The inbound shipment has been created. Wait for the customer to send the item.";
        } else if (["received", "inspection"].includes(status)) {
          tone = "urgent";
          title = "ITEM RECEIVED — ACTION REQUIRED";
          text = "Inspect the item and complete the next valuation/payment decision.";
        } else if (status === "payment_due" && !sale.bank_details_confirmed_at) {
          tone = "urgent";
          title = "AWAITING CUSTOMER BANK DETAILS";
          text = "The customer accepted the offer. Waiting for bank details before payment can be sent.";
        } else if (status === "payment_due" && sale.bank_details_confirmed_at) {
          tone = "urgent";
          title = "PAYMENT DUE — ACTION REQUIRED";
          text = `Customer bank details are confirmed. Pay the accepted amount and record the payment.`;
        } else if (status === "paid" && !outbound) {
          tone = "urgent";
          title = "PAYMENT SENT — ACTION REQUIRED";
          text = "Create the GearCashOut → customer return shipment and send the tracking details.";
        } else if (status === "paid" && outbound && !outbound.shipped_at) {
          tone = "urgent";
          title = "RETURN READY — ACTION REQUIRED";
          text = "The return shipment exists. Post the item and record the tracking details.";
        } else if (status === "return_shipped") {
          tone = "wait";
          title = "RETURN SHIPPED — WAITING FOR DELIVERY";
          text = "The return is on its way to the customer.";
        } else if (["completed", "cancelled"].includes(status)) {
          tone = "wait";
          title = "NO ACTION REQUIRED";
          text = "This sale has been completed or cancelled.";
        } else {
          tone = "wait";
          title = "SALE IN PROGRESS";
          text = "Open the sale to see the current status and next step.";
        }

        const styles = tone === "urgent"
          ? "border-left:5px solid #c94b2c;background:#fff3ee;color:#8f321f;"
          : "border-left:5px solid #d88732;background:#fffaf2;color:#68451f;";
        const el = document.createElement("div");
        el.className = "sale-next-action";
        el.style.cssText = `margin:.9rem 0;padding:12px 14px;border-radius:4px;${styles}`;
        el.innerHTML = `<strong style="display:block;font-size:.8rem;letter-spacing:.08em;">${esc(title)}</strong><span style="display:block;margin-top:.25rem;font-weight:600;">${esc(text)}</span><a class="btn ${tone === "urgent" ? "btn-primary" : "btn-secondary"}" href="admin-sale.html?id=${encodeURIComponent(sale.id)}" style="margin-top:.6rem;">VIEW SALE &amp; ACTION</a>`;
        card.querySelector(".valuation-meta")?.prepend(el);
      });
    } finally {
      loading = false;
    }
  }

  const observer = new MutationObserver(schedule);
  observer.observe(box, { childList: true, subtree: true });
  setTimeout(enhance, 700);
});
