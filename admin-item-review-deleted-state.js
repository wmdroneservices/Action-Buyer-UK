/* Graceful handling for old item-review links after quote/test data is removed. */
document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const itemId = new URLSearchParams(window.location.search).get("item_id");
  if (!auth || !itemId) return;

  const session = await auth.getSession();
  if (!session) return;

  const { data: staff } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!staff) return;

  const { data: item } = await auth.supabase
    .from("quote_items")
    .select("id,valuation_id")
    .eq("id", itemId)
    .maybeSingle();

  if (item) return;

  const title = document.getElementById("item-title");
  const reference = document.getElementById("item-reference");
  const message = document.getElementById("review-message");
  const evidence = document.getElementById("submitted-evidence-panel");
  const physical = document.getElementById("physical-reference-panel");
  const back = document.getElementById("back-quote");

  if (title) title.textContent = "Quote no longer available";
  if (reference) reference.textContent = "This submission has been removed.";
  if (back) {
    back.href = "admin-valuations.html";
    back.textContent = "BACK TO VALUATIONS";
  }
  if (message) {
    message.textContent = "The requested test submission has been removed from the system.";
    message.className = "form-message";
  }
  if (evidence) {
    evidence.innerHTML = `
      <div class="section-heading">
        <p class="section-kicker">SUBMISSION UNAVAILABLE</p>
        <h2>Quote no longer available</h2>
        <div class="notice" style="background:#f8f5ef;border:1px solid #ddd6c9;padding:1rem 1.25rem;">
          <strong>This quote or item has been removed.</strong>
          <p style="margin:.5rem 0 0;color:#555;">This is normal for an old test-data link after a quote reset.</p>
          <p style="margin:.75rem 0 0;color:#555;">Return to Valuations to work with a current submission.</p>
        </div>
      </div>`;
  }
  if (physical) physical.hidden = true;
});
