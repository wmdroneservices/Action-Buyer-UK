document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const alerts = document.getElementById("shipping-action-alerts");
  const countBadge = document.getElementById("shipping-action-count");
  if (!auth || !alerts) return;

  const session = await auth.getSession();
  if (!session) return;

  const { data: staff } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!staff) return;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  async function load() {
    const { data: sales, error } = await auth.supabase
      .from("sales")
      .select("id,sale_reference,status,total_amount,bank_details_confirmed_at,accepted_at")
      .not("bank_details_confirmed_at", "is", null)
      .not("status", "in", "(paid,completed,cancelled)")
      .order("bank_details_confirmed_at", { ascending: false });

    if (error) {
      console.error("Shipping action notification load failed", error);
      return;
    }

    if (!sales?.length) {
      alerts.innerHTML = "";
      if (countBadge) countBadge.style.display = "none";
      return;
    }

    const ids = sales.map(s => s.id);
    const { data: shipments } = await auth.supabase
      .from("shipments")
      .select("id,sale_id,shipment_type,status")
      .in("sale_id", ids);

    const needsLabel = sales.filter(s =>
      !(shipments || []).some(sh => sh.sale_id === s.id && sh.shipment_type === "inbound")
    );

    if (countBadge) {
      countBadge.textContent = String(needsLabel.length);
      countBadge.style.display = needsLabel.length ? "inline-block" : "none";
    }

    if (!needsLabel.length) {
      alerts.innerHTML = "";
      return;
    }

    alerts.innerHTML = `<section class="account-panel" style="border:2px solid #c94b2c;background:#fff7f3;margin-bottom:24px;">
      <div class="section-heading">
        <p class="section-kicker" style="color:#c94b2c;">ACTION REQUIRED</p>
        <h2>Shipping labels to create <span style="display:inline-block;background:#c94b2c;color:#fff;border-radius:999px;padding:3px 9px;font-size:13px;vertical-align:middle;">${needsLabel.length}</span></h2>
        <p>These customers have accepted their offer and supplied their bank details. You now need to create the customer → GearCashOut shipping label.</p>
      </div>
      ${needsLabel.map(s => `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-top:1px solid #ead8d0;flex-wrap:wrap;">
        <div><strong>${esc(s.sale_reference)}</strong><br><span>Bank details received — shipping label required</span></div>
        <a class="btn btn-primary" href="admin-sale.html?id=${encodeURIComponent(s.id)}">CREATE SHIPPING LABEL</a>
      </div>`).join("")}
    </section>`;
  }

  await load();
  setInterval(load, 30000);
});