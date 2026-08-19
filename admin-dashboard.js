document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const session = await auth.getSession();
  if (!session) { window.location.href = "login.html?return=admin.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { window.location.href = "account.html"; return; }

  const message = document.getElementById("staff-message");
  const notice = (text, ok = true) => { if (message) { message.textContent = text; message.className = "form-message " + (ok ? "success" : "error"); } };
  document.getElementById("staff-welcome").textContent = `Signed in as ${session.user.email}`;
  document.getElementById("staff-sign-out").addEventListener("click", async () => { const b=document.getElementById("staff-sign-out"); b.disabled=true; try { await auth.signOut(); } catch(e) { b.disabled=false; notice(e?.message||"Could not sign out.",false); } });

  async function loadCounts() {
    const { data: valuations, error: valuationError } = await auth.supabase.from("valuations").select("id,status,archived_at").is("archived_at", null);
    if (valuationError) { notice("Could not load work queue counts.", false); return; }

    // Only active valuations needing staff attention belong in the valuation counter.
    const awaitingStatuses = new Set(["submitted", "manual_review", "pending_review", "awaiting_valuation"]);
    document.getElementById("valuation-count").textContent = (valuations || []).filter(v => awaitingStatuses.has(v.status)).length;

    const { data: sales, error: salesError } = await auth.supabase.from("sales").select("id,status");
    if (salesError) { notice("Could not load sales counts.", false); return; }
    const acceptedStatuses = new Set(["collecting_items", "awaiting_delivery", "awaiting_inspection", "inspection", "final_valuation", "payment_processing", "paid"]);
    const accepted = (sales || []).filter(s => acceptedStatuses.has(s.status));
    document.getElementById("accepted-count").textContent = accepted.length;
    const deliveryStatuses = new Set(["collecting_items", "awaiting_delivery"]);
    document.getElementById("delivery-count").textContent = accepted.filter(s => deliveryStatuses.has(s.status)).length;
    document.getElementById("paid-count").textContent = (sales || []).filter(s => s.status === "paid").length;

    const { data: customers, error: customerError } = await auth.supabase.rpc("staff_customer_list");
    if (customerError) { notice("Could not load customer count.", false); return; }
    document.getElementById("customer-count").textContent = (customers || []).length;
  }

  await loadCounts();
});
