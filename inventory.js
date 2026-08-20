document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const list = document.getElementById("inventory-list");
  const summary = document.getElementById("inventory-summary");
  const message = document.getElementById("inventory-message");
  if (!auth || !list) return;

  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { list.innerHTML = "<p>You do not have permission to access inventory.</p>"; return; }

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  async function load() {
    const { data, error } = await auth.supabase.from("inventory_assets").select("*").order("created_at", { ascending: false });
    if (error) { list.innerHTML = "<p>Could not load inventory.</p>"; message.textContent = "Could not load inventory."; message.className = "form-message error"; return; }
    const assets = data || [];
    const active = assets.filter(a => a.status !== "Sold");
    const totalCost = active.reduce((sum, a) => sum + Number(a.purchase_price || 0), 0);
    summary.innerHTML = `<div><strong>${active.length}</strong> active assets</div><div style="margin-top:.4rem"><strong>${money(totalCost)}</strong> active stock purchase cost</div><div style="margin-top:.4rem"><strong>${assets.filter(a => a.status === "Sold").length}</strong> sold</div>`;
    if (!assets.length) { list.innerHTML = '<div class="empty-account"><h3>No inventory yet</h3><p>Use Add Asset to create the first stock record.</p></div>'; return; }
    list.innerHTML = assets.map(a => `<article class="valuation-card" style="margin-bottom:1rem"><div><p class="section-kicker">${esc(a.status || "Purchased")}</p><h3><a href="inventory-detail.html?id=${encodeURIComponent(a.id)}">${esc([a.manufacturer, a.model].filter(Boolean).join(" ") || "Unnamed asset")}</a></h3><p>Asset: ${esc(a.asset_reference)}</p><p>Serial: ${esc(a.serial_number || "Not recorded")}</p></div><div class="valuation-meta"><p><strong>Purchase cost</strong><br>${money(a.purchase_price)}</p><p><strong>Condition</strong><br>${esc(a.condition_grade || "Not recorded")}</p><p><strong>Location</strong><br>${esc(a.current_location || "Not recorded")}</p></div></article>`).join("");
  }
  await load();
});
