/* Staff action prompts for accepted-sale cards. */
document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("sales-list");
  const auth = window.actionBuyerAuth;
  if (!box || !auth) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get("archive") === "1" || params.get("returned") === "1") return;

  let timer = null;
  let loading = false;
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const schedule = () => { clearTimeout(timer); timer = setTimeout(enhance, 150); };

  async function enhance() {
    if (loading) return;
    loading = true;
    try {
      const cards = [...box.querySelectorAll("article.valuation-card")];
      const refs = cards.map(c => c.querySelector(".valuation-ref")?.textContent?.trim()).filter(Boolean);
      if (!refs.length) return;

      const { data: sales } = await auth.supabase.from("sales").select("id,sale_reference,status,bank_details_confirmed_at,bank_account_name,bank_sort_code,bank_account_number,total_amount").in("sale_reference", refs);
      if (!sales?.length) return;
      const saleIds = sales.map(s => s.id);
      const { data: saleItems } = await auth.supabase.from("sale_items").select("sale_id,quote_item_id").in("sale_id", saleIds);
      const quoteItemIds = (saleItems || []).map(x => x.quote_item_id).filter(Boolean);
      const { data: refusedOffers } = quoteItemIds.length ? await auth.supabase.from("quote_offers").select("id,item_id,status,offer_type,responded_at").in("item_id", quoteItemIds).eq("status", "refused") : { data: [] };
      const { data: shipments } = await auth.supabase.from("shipments").select("id,sale_id,shipment_type,status,shipped_at,delivered_at,created_at").in("sale_id", saleIds);

      const refusedBySale = new Set();
      (saleItems || []).forEach(si => { if ((refusedOffers || []).some(o => o.item_id === si.quote_item_id)) refusedBySale.add(si.sale_id); });
      const byRef = new Map(sales.map(s => [s.sale_reference, s]));
      const inboundBySale = new Map();
      (shipments || []).filter(sh => sh.shipment_type === "inbound").forEach(sh => {
        const existing = inboundBySale.get(sh.sale_id);
        if (!existing || new Date(sh.created_at || 0) > new Date(existing.created_at || 0)) inboundBySale.set(sh.sale_id, sh);
      });

      cards.forEach(card => {
        if (card.querySelector(".sale-next-action")) return;
        const ref = card.querySelector(".valuation-ref")?.textContent?.trim();
        const sale = byRef.get(ref);
        if (!sale) return;
        const status = String(sale.status || "");
        const inbound = inboundBySale.get(sale.id);
        const shipmentStatus = String(inbound?.status || "");
        const hasRefusal = refusedBySale.has(sale.id);
        let title = "", text = "", tone = "wait";

        if (status === "payment_due" && !sale.bank_details_confirmed_at) {
          tone="urgent";
          title="AWAITING CUSTOMER BANK DETAILS";
          text="The customer has accepted the final offer. Waiting for the customer's bank details before payment can be sent.";
        } else if (status === "payment_due" && sale.bank_details_confirmed_at) {
          tone="urgent";
          title="PAYMENT DUE — ACTION REQUIRED";
          text=`Customer bank details are confirmed. Pay ${new Intl.NumberFormat("en-GB", { style:"currency", currency:"GBP" }).format(Number(sale.total_amount || 0))} and record the payment.`;
        } else if (status === "paid" && hasRefusal) {
          tone="urgent";
          title="CUSTOMER REFUSED — ACTION REQUIRED";
          text="Arrange the GearCashOut → customer return shipment for the refused item.";
        } else if (status === "paid") {
          title="NO ACTION REQUIRED";
          text="Payment has been sent. No return shipment is required unless a customer refusal requires the item to be returned.";
        } else if (status === "return_shipped") {
          title="RETURN SHIPPED — WAITING FOR DELIVERY";
          text="The return is on its way to the customer.";
        } else if (["completed", "cancelled"].includes(status)) {
          title="NO ACTION REQUIRED";
          text="This sale has been completed or cancelled.";
        } else if (shipmentStatus === "in_transit") {
          title="CUSTOMER HAS POSTED ITEM";
          text="The item is in transit to GearCashOut. Await delivery.";
        } else if (shipmentStatus === "delivered") {
          tone="urgent";
          title="ITEM DELIVERED — ACTION REQUIRED";
          text="The customer's item has been delivered. Receive and inspect the item.";
        } else if (["collecting_items", "ready_for_shipping", "shipping"].includes(status)) {
          const inboundText = card.textContent.includes("CUSTOMER → US") && card.textContent.includes("label_created");
          if (!inboundText) {
            tone="urgent";
            title="CUSTOMER ACCEPTED OFFER — ACTION REQUIRED";
            text="Create the customer → GearCashOut shipping label and send it to the customer.";
          } else {
            title="WAITING FOR CUSTOMER";
            text="The inbound shipment has been created. Wait for the customer to send the item.";
          }
        } else if (["received", "inspection"].includes(status)) {
          tone="urgent";
          title="ITEM RECEIVED — ACTION REQUIRED";
          text="Inspect the item and complete the next valuation/payment decision.";
        } else {
          title="SALE IN PROGRESS";
          text="Open the sale to see the current status and next step.";
        }

        const styles=tone==="urgent"?"border-left:5px solid #c94b2c;background:#fff3ee;color:#8f321f;":"border-left:5px solid #d88732;background:#fffaf2;color:#68451f;";
        const bankBlock = status === "payment_due" && sale.bank_details_confirmed_at
          ? `<div style="margin-top:.7rem;padding:.7rem .8rem;background:#fff;border:1px solid #e0cfc8;border-radius:4px;"><strong>BANK DETAILS CONFIRMED</strong><div style="margin-top:.35rem;line-height:1.55;">Account name: ${esc(sale.bank_account_name)}<br>Sort code: ${esc(sale.bank_sort_code)}<br>Account number: ${esc(sale.bank_account_number)}</div></div>`
          : "";
        const el=document.createElement("div"); el.className="sale-next-action"; el.style.cssText=`margin:.9rem 0;padding:12px 14px;border-radius:4px;${styles}`;
        el.innerHTML=`<strong style="display:block;font-size:.8rem;letter-spacing:.08em;">${esc(title)}</strong><span style="display:block;margin-top:.25rem;font-weight:600;">${esc(text)}</span>${bankBlock}${tone==="urgent"?`<a class="btn btn-primary" href="admin-sale.html?id=${encodeURIComponent(sale.id)}" style="margin-top:.6rem;">VIEW SALE &amp; ACTION</a>`:""}`;
        card.querySelector(".valuation-meta")?.prepend(el);
      });
    } finally { loading=false; }
  }

  new MutationObserver(schedule).observe(box,{childList:true,subtree:true});
  setTimeout(enhance,700);
});
