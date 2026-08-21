document.addEventListener("DOMContentLoaded", async () => {
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
      "WARNING: This will permanently delete ALL TEST quote data.\n\nDelete test valuations, offers, email queue and test sales records?"
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "RESETTING...";

    try {
      const { error } = await auth.supabase.rpc("reset_test_quote_data");

      if (error) throw error;

      if (message) {
        message.textContent = "Test data reset complete.";
        message.className = "form-message success";
      }

      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      if (message) {
        message.textContent = error.message || "Reset failed.";
        message.className = "form-message error";
      }
      button.disabled = false;
      button.textContent = "RESET ALL TEST DATA";
    }
  });
});
