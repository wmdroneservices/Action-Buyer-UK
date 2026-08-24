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

    const { data: sales, error } = await auth.supabase
      .from("sales")
      .select("id,sale_reference,status")
      .eq("user_id", session.user.id);
    if (error || !sales?.length) return;

    const saleIds = sales.map(s => s.id);
    const { data: shipments } = await auth.supabase
      .from("shipments")
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

      const inbound = (shipments || []).find(x =>
        x.sale_id === sale.id &&
        x.shipment_type === "inbound" &&
        Array.isArray(x.label_urls) && x.label_urls.some(Boolean)
      );
      if (!inbound) return;

      const labelLinks = (inbound.label_urls || []).map((url, i) => {
        const safe = safeUrl(url);
        return safe ? `<a class="btn btn-secondary" href="${esc(safe)}" target="_blank" rel="noopener">DOWNLOAD SHIPPING LABEL${inbound.label_urls.length > 1 ? ` ${i + 1}` : ""}</a>` : "";
      }).join(" ");

      const qrLinks = (inbound.qr_code_urls || []).map((url, i) => {
        const safe = safeUrl(url);
        return safe ? `<a class="btn btn-secondary" href="${esc(safe)}" target="_blank" rel="noopener">VIEW QR CODE${inbound.qr_code_urls.length > 1 ? ` ${i + 1}` : ""}</a>` : "";
      }).join(" ");

      const showPostAction = ["awaiting_label", "label_created"].includes(String(inbound.status || ""));

      const action = document.createElement("div");
      action.className = "customer-shipping-links";
      action.style.cssText = "margin-top:12px;padding:12px;border-left:4px solid #d88732;background:#f7f4ee;";
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

          const { error: shipmentError } = await auth.supabase
            .from("shipments")
            .update({ status: "in_transit", shipped_at: new Date().toISOString() })
            .eq("id", inbound.id)
            .eq("sale_id", sale.id);

          if (shipmentError) {
            postedButton.disabled = false;
            const message = action.querySelector(".customer-shipping-message");
            message.textContent = shipmentError.message || "We could not update the shipment. Please try again.";
            message.className = "customer-shipping-message form-message error";
            return;
          }

          if (["collecting_items", "ready_for_shipping"].includes(String(sale.status || ""))) {
            await auth.supabase.from("sales")
              .update({ status: "shipping" })
              .eq("id", sale.id)
              .eq("user_id", session.user.id);
          }

          await loadShippingLinks();
        });
      }
    });
  }

  await new Promise(resolve => setTimeout(resolve, 500));
  await loadShippingLinks();
  setInterval(loadShippingLinks, 5000);
});
