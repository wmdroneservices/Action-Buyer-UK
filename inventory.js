document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth, list = document.getElementById("inventory-list"), summary = document.getElementById("inventory-summary"), message = document.getElementById("inventory-message");
  if (!auth || !list) return;
  const session = await auth.getSession(); if (!session) { location.href = "login.html?return=inventory.html"; return; }
  const db = auth.supabase; const { data: staff } = await db.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { list.innerHTML = "<p>You do not have permission to access inventory.</p>"; return; }
  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  async function load() {
    const [{ data, error }, { data: listings }] = await Promise.all([db.from("inventory_assets").select("*").order("created_at", { ascending: false }), db.from("resale_listings").select("asset_id,status,sales_channel")]);
    if (error) { list.innerHTML = "<p>Could not load inventory.</p>"; message.textContent = "Could not load inventory."; message.className = "form-message error"; return; }
    const assets = data || [], ls = listings || [], active = assets.filter(a => a.status !== "Sold"), totalCost = active.reduce((sum, a) => sum + Number(a.purchase_price || 0), 0);
    const liveMap = new Map(); ls.forEach(x => { if (["Published","Reserved"].includes(x.status)) liveMap.set(x.asset_id, (liveMap.get(x.asset_id) || 0) + 1); });
    summary.innerHTML = `<div style="display:flex;gap:2rem;flex-wrap:wrap"><div><strong>${active.length}</strong><br>active assets</div><div><strong>${money(totalCost)}</strong><br>active stock purchase cost</div><div><strong>${assets.filter(a => a.status === "Sold").length}</strong><br>sold</div><div><strong>${ls.filter(x => ["Published","Reserved"].includes(x.status)).length}</strong><br>live/reserved listings</div></div>`;
    if (!assets.length) { list.innerHTML = '<div class="empty-account"><h3>No inventory yet</h3><p>Use Add Asset to create the first stock record.</p></div>'; return; }
    list.innerHTML = assets.map(a => `<article class="valuation-card" style="margin-bottom:1rem"><div><p class="section-kicker">${esc(a.status || "Purchased")}</p><h3><a href="inventory-detail.html?id=${encodeURIComponent(a.id)}">${esc([a.manufacturer, a.model].filter(Boolean).join(" ") || "Unnamed asset")}</a></h3><p>Asset: ${esc(a.asset_reference)}</p><p>Serial: ${esc(a.serial_number || "Not recorded")}</p></div><div class="valuation-meta"><p><strong>Purchase cost</strong><br>${money(a.purchase_price)}</p><p><strong>Customer condition</strong><br>${esc(a.customer_condition || "Not recorded")}</p><p><strong>Staff condition</strong><br>${esc(a.condition_grade || "Not recorded")}</p><p><strong>Location</strong><br>${esc(a.current_location || "Not recorded")}</p><p><strong>Live channels</strong><br>${liveMap.get(a.id) || 0}</p></div>${a.customer_missing_items ? `<div class="form-message error" style="margin-top:1rem"><strong>Customer reported missing items:</strong> ${esc(a.customer_missing_items_details || "Details not recorded")}</div>` : ""}</article>`).join("");
  }
  await load();
});
