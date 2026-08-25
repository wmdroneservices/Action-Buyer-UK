// GearCashOut - payment handoff fix
// Never mark a seller payment as merely "paid" from the sale page.
// The authoritative RPC records payment, completes the sale, and creates the inventory asset atomically.
document.addEventListener("DOMContentLoaded", () => {
  const auth = window.actionBuyerAuth;
  const details = document.getElementById("sale-details");
  const message = document.getElementById("admin-sale-message");
  if (!auth || !details) return;

  const replacePaymentButton = () => {
    const original = document.getElementById("mark-payment-sent");
    if (!original || original.dataset.handoffFixed === "1") return;

    const button = original.cloneNode(true);
    button.dataset.handoffFixed = "1";
    original.replaceWith(button);

    button.addEventListener("click", async () => {
      if (!confirm("Confirm that the payment has been sent to the customer's bank account? This will complete the purchase and create the inventory record.")) return;
      const reference = prompt("Optional bank payment reference:", "") || null;
      button.disabled = true;
      if (message) {
        message.textContent = "Recording payment and creating the inventory handoff...";
        message.className = "form-message";
      }

      try {
        const saleId = new URLSearchParams(location.search).get("id");
        if (!saleId) throw new Error("Sale ID is missing.");

        const { data, error } = await auth.supabase.rpc("staff_mark_sale_paid_and_create_inventory", {
          p_sale_id: saleId,
          p_payment_reference: reference
        });
        if (error) throw new Error(error.message || "Payment could not be recorded.");

        const result = Array.isArray(data) ? data[0] : data;
        if (message) {
          message.textContent = result?.inventory_asset_id
            ? `Payment recorded and inventory asset ${result.inventory_asset_id} created.`
            : "Payment recorded and inventory handoff completed.";
          message.className = "form-message success";
        }
        setTimeout(() => location.reload(), 700);
      } catch (error) {
        if (message) {
          message.textContent = error?.message || "Payment could not be recorded.";
          message.className = "form-message error";
        }
        button.disabled = false;
      }
    });
  };

  replacePaymentButton();
  new MutationObserver(replacePaymentButton).observe(details, { childList: true, subtree: true });
});
