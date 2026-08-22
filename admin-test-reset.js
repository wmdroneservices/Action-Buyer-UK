document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const auth = window.actionBuyerAuth;
  if (!auth) return;

  const session = await auth.getSession();
  if (!session) return;

  const { data: staff } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!staff) return;

  const button = document.getElementById("test-reset-button");
  const message = document.getElementById("test-reset-message");
  if (!button) return;

  button.addEventListener("click", async () => {
    const confirmed = window.confirm(
      "WARNING: This permanently deletes TEST quote workflow data.\n\nThis removes test valuations, quote items, offers, offer events, refusals, queued quote emails, test sales records and quote photographs.\n\nCustomer accounts, staff accounts, catalogue products, pricing and retailer data are NOT deleted.\n\nContinue?"
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "RESETTING...";

    if (message) {
      message.textContent = "Resetting test data...";
      message.className = "form-message";
    }

    try {
      const { data, error } = await auth.supabase.rpc("reset_test_quote_data");
      if (error) throw error;

      const counts = data || {};
      const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);

      if (message) {
        message.textContent = total
          ? `Test data reset complete. ${total} test records/files removed.`
          : "Test data reset complete. There was no test data to remove.";
        message.className = "form-message success";
      }

      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      console.error("GearCashOut test data reset failed", error);
      if (message) {
        message.textContent = error?.message || "Reset failed.";
        message.className = "form-message error";
      }
      button.disabled = false;
      button.textContent = "RESET ALL TEST DATA";
    }
  });
});
