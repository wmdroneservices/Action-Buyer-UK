document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const container = document.getElementById("asset-detail");
  if (!auth || !container) return;

  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-detail.html"; return; }

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { container.innerHTML = "You do not have permission to access inventory."; return; }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { container.innerHTML = "No asset selected."; return; }

  const { data: asset, error } = await auth.supabase.from("inventory_assets").select("*").eq("id", id).single();
  if (error || !asset) { container.innerHTML = "Asset could not be found."; return; }

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));

  container.innerHTML = `
  <div class="valuation-card">
    <p class="section-kicker">${esc(asset.status || "Purchased")}</p>
    <h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" "))}</h2>
    <p>Asset reference: ${esc(asset.asset_reference)}</p>
    <p>Serial number: ${esc(asset.serial_number || "Not recorded")}</p>
    <hr>
    <p><strong>Purchase price:</strong> ${money(asset.purchase_price)}</p>
    <p><strong>Condition:</strong> ${esc(asset.condition_grade || "Not recorded")}</p>
    <p><strong>Current location:</strong> ${esc(asset.current_location || "Not recorded")}</p>
    <p><strong>Notes:</strong> ${esc(asset.notes || "No notes")}</p>
  </div>
  <div class="valuation-card" style="margin-top:1rem">
    <h3>Lifecycle Modules</h3>
    <p>Testing reports: Ready for connection</p>
    <p>Expense history: Ready for connection</p>
    <p>Evidence and photographs: Ready for connection</p>
    <p>Movement history: Ready for connection</p>
  </div>`;
});
