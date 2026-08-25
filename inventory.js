document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth, list = document.getElementById("inventory-list"), summary = document.getElementById("inventory-summary"), message = document.getElementById("inventory-message");
  if (!auth || !list) return;
  const session = await auth.getSession(); if (!session) { location.href = "login.html?return=inventory.html"; return; }
  const db = auth.supabase; const { data: staff } = await db.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { list.innerHTML = "<p>You do not have permission to access inventory.</p>"; return; }
  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const inventoryStatuses = ["Awaiting Receipt","Received","Inspection Required","Testing","Repair Required","Ready for Resale"];
  const nextAction = state => window.AssetStateMachine?.getNextAction(state) || { label: "ACTION REQUIRED", detail: "Review this item and determine its next workflow step.", tone: "warning" };
  const toneStyle = tone => ({action:"border:2px solid #b06b00;background:#fff8e8",warning:"border:2px solid #b42318;background:#fff5f5",success:"border:2px solid #18794e;background:#f1fbf5",info:"border:1px solid #b8c4d1;background:#f7f9fb"}[tone] || "border:1px solid #b8c4d1;background:#f7f9fb");
  async function load() {
    const { data, error } = await db.from("inventory_assets").select("*").in("status", inventoryStatuses).order("created_at", { ascending: false });
    const { data: allAssets } = await db.from("inventory_assets").select("id,status,purchase_price");
    if (error) { list.innerHTML = "<p>Could not load inventory.</p>"; message.textContent = error.message || "Could not load inventory."; message.className = "form-message error"; return; }
    const assets = data || [], all = allAssets || [], totalCost = assets.reduce((sum, a) => sum + Number(a.purchase_price || 0), 0);
    const actionCounts = assets.reduce((map, a) => { const action = nextAction(a.status).label; map[action] = (map[action] || 0) + 1; return map; }, {});
    const actionSummary = Object.entries(actionCounts).map(([label, count]) => `<span style="display:inline-block;margin:.25rem .5rem .25rem 0"><strong>${count}</strong> ${esc(label.toLowerCase())}</span>`).join("");
    summary.innerHTML = `<div style="display:flex;gap:2rem;flex-wrap:wrap"><div><strong>${assets.length}</strong><br>purchase inventory</div><div><strong>${money(totalCost)}</strong><br>purchase cost in inventory</div><div><strong>${all.filter(a => ["Sent to Sales","Listed","Reserved"].includes(a.status)).length}</strong><br>in sales workflow</div><div><strong>${all.filter(a => ["Sold","Returned"].includes(a.status)).length}</strong><br>sold / returned history</div></div><div style="margin-top:1rem"><strong>NEXT ACTIONS</strong><br>${actionSummary || "No active inventory actions."}</div><p style="margin-top:1rem">Open a product once. Customer quote, inspection, testing, photographs, package checks and Send to Sales are now handled from that product workbench.</p>`;
    if (!assets.length) { list.innerHTML = '<div class="empty-account"><h3>No items currently in purchase inventory</h3><p>Items sent to Sales or sold are retained in their separate workflow records.</p></div>'; return; }
    list.innerHTML = assets.map(a => {
      const action = nextAction(a.status);
      return `<article class="valuation-card" style="margin-bottom:1rem"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap"><div><p class="section-kicker">${esc(a.status || "Purchased")}</p><h3><a href="inventory-detail.html?id=${encodeURIComponent(a.id)}">${esc([a.manufacturer, a.model].filter(Boolean).join(" ") || "Unnamed asset")}</a></h3><p>Asset: ${esc(a.asset_reference)} · Transaction: ${esc(a.transaction_number || "Not recorded")}</p><p>Serial: ${esc(a.serial_number || "Not recorded")}</p></div><a class="btn btn-primary" href="inventory-detail.html?id=${encodeURIComponent(a.id)}">OPEN PRODUCT</a></div><div style="margin-top:1rem;padding:1rem;${toneStyle(action.tone)}"><strong>${esc(action.label)}</strong><br><span>${esc(action.detail)}</span></div><div class="valuation-meta"><p><strong>Purchase cost</strong><br>${money(a.purchase_price)}</p><p><strong>Customer condition</strong><br>${esc(a.customer_condition || "Not recorded")}</p><p><strong>Staff condition</strong><br>${esc(a.condition_grade || "Not recorded")}</p><p><strong>Location</strong><br>${esc(a.current_location || "Not recorded")}</p></div>${a.customer_missing_items ? `<div class="form-message error" style="margin-top:1rem"><strong>Customer reported missing items:</strong> ${esc(a.customer_missing_items_details || "Details not recorded")}</div>` : ""}</article>`;
    }).join("");
  }
  await load();
});
