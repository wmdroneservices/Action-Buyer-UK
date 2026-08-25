document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth, list = document.getElementById("sales-list"), summary = document.getElementById("sales-summary"), message = document.getElementById("sales-message");
  if (!auth || !list) return;
  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-sales.html"; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { list.innerHTML = "<p>You do not have permission to access inventory.</p>"; return; }
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const money = n => Number(n || 0).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
  const channels = ["Website", "eBay", "Marketplace", "Central", "Vinted", "Amazon", "Other"];
  const activeStatuses = ["Draft", "Ready For Listing", "Published", "Reserved", "Delist Required"];
  async function load() {
    const [{ data: assets, error: assetError }, { data: listings, error: listingError }] = await Promise.all([db.from("inventory_assets").select("*").order("created_at", { ascending: false }), db.from("resale_listings").select("*").order("sales_channel")]);
    if (assetError || listingError) { list.innerHTML = "<p>Could not load sales channels.</p>"; message.textContent = assetError?.message || listingError?.message || "Could not load sales channels."; message.className = "form-message error"; return; }
    const rows = assets || [], ls = listings || [], map = new Map(); ls.forEach(x => { if (!map.has(x.asset_id)) map.set(x.asset_id, []); map.get(x.asset_id).push(x); });
    const published = ls.filter(x => ["Published", "Reserved"].includes(x.status)), sold = ls.filter(x => x.status === "Sold");
    const warnings = rows.filter(asset => { const assetListings = map.get(asset.id) || []; return assetListings.some(x => x.status === "Sold") && assetListings.some(x => activeStatuses.includes(x.status)); }).length;
    summary.innerHTML = `<div style="display:flex;gap:2rem;flex-wrap:wrap"><div><strong>${rows.filter(a => a.status !== "Sold").length}</strong><br>active stock</div><div><strong>${published.length}</strong><br>live/reserved listings</div><div><strong>${sold.length}</strong><br>sold channel listings</div>${warnings ? `<div style="color:#b42318"><strong>${warnings}</strong><br>delist warnings</div>` : ""}</div>`;
    if (!rows.length) { list.innerHTML = '<div class="empty-account"><h3>No inventory yet</h3></div>'; return; }
    list.innerHTML = rows.map(asset => {
      const assetListings = map.get(asset.id) || [], active = assetListings.filter(x => activeStatuses.includes(x.status)), soldListings = assetListings.filter(x => x.status === "Sold"), warning = Boolean(soldListings.length && active.length);
      const cards = channels.map(ch => { const l = assetListings.find(x => x.sales_channel === ch); if (!l) return `<span style="display:inline-block;margin:.2rem .35rem .2rem 0;padding:.35rem .55rem;border:1px solid #ddd;border-radius:6px">${esc(ch)}: not listed</span>`; const state = l.status === "Sold" ? "SOLD" : l.status === "Cancelled" ? "DELISTED" : l.status; return `<span style="display:inline-block;margin:.2rem .35rem .2rem 0;padding:.35rem .55rem;border:1px solid #ddd;border-radius:6px"><strong>${esc(ch)}</strong>: ${esc(state)}${l.asking_price != null ? ` · ${money(l.asking_price)}` : ""}</span>`; }).join("");
      return `<article class="valuation-card" style="margin-bottom:1rem;${warning ? "border:2px solid #b42318" : ""}"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap"><div><p class="section-kicker">${esc(asset.status || "Purchased")}</p><h3><a href="inventory-detail.html?id=${encodeURIComponent(asset.id)}">${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Unnamed asset")}</a></h3><p>${esc(asset.asset_reference)} · Purchase ${money(asset.purchase_price)}</p></div><div style="display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn btn-secondary" href="inventory-detail.html?id=${encodeURIComponent(asset.id)}">VIEW ITEM</a><a class="btn btn-primary" href="listing-readiness.html?id=${encodeURIComponent(asset.id)}">MANAGE CHANNELS</a></div></div>${warning ? `<div class="form-message error" style="margin-top:1rem;border:2px solid #b42318"><strong>SOLD — DELIST OTHER CHANNELS</strong><br>This item is marked sold on ${esc(soldListings.map(x => x.sales_channel).join(", "))} but remains active on ${esc(active.map(x => x.sales_channel).join(", "))}. Remove the other listings before selling the same item again.</div>` : ""}<div style="margin-top:1rem">${cards}</div></article>`;
    }).join("");
  }
  await load();
});
