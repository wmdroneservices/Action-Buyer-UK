document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const esc = v => String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const safeUrl = v => /^https?:\/\//i.test(String(v || "")) ? String(v) : "";

  async function loadShippingLinks() {
    const salesBox = document.getElementById("sales");
    if (!salesBox) return;

    const { data: sales, error } = await auth.supabase.from("sales")
      .select("id,sale_reference,status")
      .eq("user_id", session.user.id);
    if (error || !sales?.length) return;

    const saleIds = sales.map(s => s.id);
    const { data: shipments } = await auth.supabase.from("shipments")
      .select("id,sale_id,shipment_type,status,carrier,tracking_number,label_urls,qr_code_urls,shipped_at,created_at")
      .in("sale_id", saleIds)
      .order("created_at", { ascending: false });

    (sales || []).forEach(sale => {
      const card = [...salesBox.querySelectorAll(".valuation-card")].find(el =>
        el.querySelector(".valuation-ref")?.textContent?.trim() === String(sale.sale_reference || "").trim()
      );
      if (!card) return;

      card.querySelector(".customer-shipping-links")?.remove();
      card.querySelector(".valuation-meta .status-badge")?.remove();

      const inbound = (shipments || []).find(x => x.sale_id === sale.id && x.shipment_type === "inbound");
      if (!inbound) return;

      const salePastShipping = ["payment_due", "payment_processing", "paid", "completed", "closed", "archived"].includes(String(sale.status || ""));
      const shipmentStatus = String(inbound.status || "");
      if (salePastShipping) return;

      const action = document.createElement("div");
      action.className = "customer-shipping-links";
      action.style.cssText = "margin-top:12px;padding:12px;border-left:4px solid #d88732;background:#f7f4ee;";

      if (shipmentStatus === "in_transit") {
        action.innerHTML = `<div class="status-badge">PARCEL ON ITS WAY</div><p style="margin:.45rem 0 0"><strong>Your parcel is on its way to GearCashOut.</strong> We’ll let you know when it arrives and your valuation progresses.</p>`;
        card.appendChild(action);
        return;
      }

      if (shipmentStatus === "delivered") {
        action.innerHTML = `<div class="status-badge">ITEM RECEIVED</div><p style="margin:.45rem 0 0"><strong>Your item has arrived at GearCashOut.</strong> We are now processing the inspection and final valuation.</p>`;
        card.appendChild(action);
        return;
      }

      if (!Array.isArray(inbound.label_urls) || !inbound.label_urls.some(Boolean)) return;

      const labelLinks = (inbound.label_urls || []).map((url, i) => {
        const safe = safeUrl(url);
        return safe ? `<a class="btn btn-secondary" href="${esc(safe)}" target="_blank" rel="noopener">DOWNLOAD SHIPPING LABEL${inbound.label_urls.length > 1 ? ` ${i + 1}` : ""}</a>` : "";
      }).join(" ");
      const qrLinks = (inbound.qr_code_urls || []).map((url, i) => {
        const safe = safeUrl(url);
        return safe ? `<a class="btn btn-secondary" href="${esc(safe)}" target="_blank" rel="noopener">VIEW QR CODE${inbound.qr_code_urls.length > 1 ? ` ${i + 1}` : ""}</a>` : "";
      }).join(" ");
      const showPostAction = ["awaiting_label", "label_created"].includes(shipmentStatus);

      action.innerHTML = `
        <p style="margin:0 0 .5rem"><strong>YOUR SHIPPING LABEL IS READY</strong></p>
        <p style="margin:.25rem 0 .75rem">Use the shipping label below to send your item to GearCashOut.</p>
        <div class="navigation-buttons" style="display:flex;gap:.5rem;flex-wrap:wrap;">${labelLinks}${qrLinks}</div>
        ${showPostAction ? `
          <div style="margin-top:.9rem;padding-top:.8rem;border-top:1px solid #ddd;">
            <p style="margin:0 0 .5rem"><strong>Once you have handed the parcel to the carrier:</strong></p>
            <button type="button" class="btn btn-primary customer-posted-button">I HAVE SHIPPED THIS ITEM</button>
            <p class="customer-shipping-message form-message" role="status" aria-live="polite"></p>
          </div>` : ""}
      `;
      card.appendChild(action);

      const postedButton = action.querySelector(".customer-posted-button");
      if (postedButton) {
        postedButton.addEventListener("click", async () => {
          if (!confirm("Confirm that you have shipped this item using the supplied shipping label?")) return;
          postedButton.disabled = true;

          const { error: shipmentError } = await auth.supabase.from("shipments")
            .update({ status: "in_transit", shipped_at: new Date().toISOString() })
            .eq("id", inbound.id).eq("sale_id", sale.id);
          if (shipmentError) {
            postedButton.disabled = false;
            const message = action.querySelector(".customer-shipping-message");
            message.textContent = shipmentError.message || "We could not update the shipment. Please try again.";
            message.className = "customer-shipping-message form-message error";
            return;
          }

          const { error: saleError } = await auth.supabase.from("sales")
            .update({ status: "shipping" })
            .eq("id", sale.id).eq("user_id", session.user.id)
            .in("status", ["collecting_items", "ready_for_shipping", "shipping"]);
          if (saleError) {
            console.error("Sale status update failed:", saleError);
            postedButton.disabled = false;
            const message = action.querySelector(".customer-shipping-message");
            message.textContent = "Your parcel was marked as shipped, but we could not update the sale status. Please refresh the page.";
            message.className = "customer-shipping-message form-message error";
            return;
          }

          action.innerHTML = `<div class="status-badge">PARCEL ON ITS WAY</div><p style="margin:.45rem 0 0"><strong>Your parcel is on its way to GearCashOut.</strong> We’ll let you know when it arrives and your valuation progresses.</p>`;
          window.setTimeout(loadShippingLinks, 5000);
        });
      }
    });
  }

  await new Promise(resolve => setTimeout(resolve, 500));
  await loadShippingLinks();
  setInterval(loadShippingLinks, 5000);
});
