/*
 * Keeps the existing Sales & Shipping screen intact while making ITEM RECEIVED
 * update the linked inventory asset through the secured Supabase RPC.
 */
document.addEventListener("click", async event => {
  const button = event.target.closest?.(".mark-received");
  if (!button) return;

  // Prevent the older handler in admin-sales.js from running as well.
  event.preventDefault();
  event.stopImmediatePropagation();

  const auth = window.actionBuyerAuth;
  const saleId = button.dataset.sale;
  const message = document.getElementById("admin-sales-message");
  const setMessage = (text, ok = true) => {
    if (!message) return;
    message.textContent = text;
    message.className = `form-message ${ok ? "success" : "error"}`;
  };

  if (!auth || !saleId) {
    setMessage("The receipt workflow could not be initialised.", false);
    return;
  }

  if (!confirm("Confirm that the customer's item(s) have been received? This will update the sale and the linked inventory asset(s), and email the customer.")) return;

  button.disabled = true;
  const { data, error } = await auth.supabase.rpc("staff_mark_item_received_and_sync_inventory", {
    p_sale_id: saleId
  });

  if (error || data?.error) {
    button.disabled = false;
    setMessage(data?.error || error?.message || "Could not mark item received.", false);
    return;
  }

  // Preserve the existing customer notification behaviour.
  let emailError = null;
  try {
    const email = await auth.supabase.functions.invoke("mark-item-received", {
      body: { sale_id: saleId }
    });
    emailError = email.error || email.data?.error || null;
  } catch (err) {
    emailError = err?.message || "Customer email could not be sent.";
  }

  const updated = Number(data?.inventory_assets_updated || 0);
  setMessage(
    emailError
      ? `Item received and ${updated} linked inventory asset(s) updated, but the customer email could not be sent.`
      : `Item received, ${updated} linked inventory asset(s) updated and customer email sent.`,
    !emailError
  );

  setTimeout(() => location.reload(), 700);
}, true);
