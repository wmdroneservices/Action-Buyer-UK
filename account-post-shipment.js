document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  // account-sales.js renders the accepted-sale cards on the same DOMContentLoaded event.
  // Run after that rendering, then add the customer confirmation action to inbound shipments.
  setTimeout(async () => {
    const { data: sales, error } = await auth.supabase
      .from("sales")
      .select("id,status")
      .eq("user_id", session.user.id);
    if (error || !sales?.length) return;

    const ids = sales.map(s => s.id);
    const { data: shipments } = await auth.supabase
      .from("shipments")
      .select("id,sale_id,shipment_type,status,shipped_at,label_urls")
      .in("sale_id", ids);

    (shipments || [])
      .filter(x => x.shipment_type === "inbound")
      .filter(x => Array.isArray(x.label_urls) && x.label_urls.length)
      .filter(x => !x.shipped_at && !["in_transit", "delivered"].includes(x.status))
      .forEach(shipment => {
        const block = [...document.querySelectorAll(".shipping-block")].find(el =>
          el.querySelector("h4")?.textContent?.trim() === "Customer → GearCashOut" &&
          !el.querySelector(".customer-posted-item")
        );
        if (!block) return;

        const action = document.createElement("div");
        action.className = "customer-posted-item";
        action.style.marginTop = "14px";
        action.innerHTML = `
          <p><strong>Have you posted your item?</strong></p>
          <p>Once you have handed the parcel to the carrier, confirm it here so GearCashOut knows it is on its way.</p>
          <button type="button" class="btn btn-primary customer-posted-button">I HAVE POSTED MY ITEM</button>
          <p class="customer-posted-message form-message" role="status" aria-live="polite"></p>`;
        block.appendChild(action);

        action.querySelector(".customer-posted-button").addEventListener("click", async () => {
          const button = action.querySelector(".customer-posted-button");
          const message = action.querySelector(".customer-posted-message");
          if (!confirm("Confirm that you have posted your item using the supplied label?")) return;
          button.disabled = true;

          const postedAt = new Date().toISOString();
          const { error: shipmentError } = await auth.supabase
            .from("shipments")
            .update({ status: "in_transit", shipped_at: postedAt })
            .eq("id", shipment.id)
            .eq("sale_id", shipment.sale_id);

          if (shipmentError) {
            button.disabled = false;
            message.textContent = shipmentError.message || "We could not update the shipment. Please try again.";
            message.className = "customer-posted-message form-message error";
            return;
          }

          const sale = sales.find(s => s.id === shipment.sale_id);
          if (sale && ["collecting_items", "ready_for_shipping"].includes(sale.status)) {
            await auth.supabase.from("sales").update({ status: "shipping" }).eq("id", sale.id).eq("user_id", session.user.id);
          }

          action.innerHTML = `<p class="status-badge">ITEM POSTED</p><p>Thank you. We have been notified that your item has been posted and is on its way to GearCashOut.</p>`;
          window.location.reload();
        });
      });
  }, 0);
});
