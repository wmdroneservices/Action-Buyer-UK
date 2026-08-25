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
  const channels = ["Website", "eBay", "Facebook Marketplace", "Vinted", "Amazon", "Central", "Other"];
  async function load() {
    const [{ data: assets, error: assetError }, { data: listings, error: listingError }] = await Promise.all([
      db.from("inventory_assets").select("*").order("created_at", { ascending: false }),
      db.from("resale_listings").select("*").order("sales_channel")
    ]);
    if (assetError || listingError) { list.innerHTML = "<p>Could not load sales channels.</p>"; message.textContent = assetError?.message || listingError?.message || "Could not load sales channels."; message.className = "form-message error"; return; }
    const rows = assets || [], ls = listings || [], map = new Map();
    ls.forEach(x => { if (!map.has(x.asset_id)) map.set(x.asset_id, []); map.get(x.asset_id).push(x); });
    const published = ls.filter(x => ["Published", "Reserved"].includes(x.status));
    const sold = ls.filter(x => x.status === "Sold");
    const warnings = sold.filter(s => ls.some(x => x.asset_id === s.asset_id && x.id !== s.id && ["Published", "Reserved"].includes(x.status))).length;
    summary.innerHTML = `<div style="display:flex;gap:2rem;flex-wrap:wrap"><div><strong>${rows.filter(a => a.status !== "Sold").length}</strong><br>active stock</div><div><strong>${published.length}</strong><br>live/reserved listings</div><div><strong>${sold.length}</strong><br>sold channel listings</div>${warnings ? `<div style="color:#b42318"><strong>${warnings}</strong><br>delist warnings</div>` : ""}</div>`;
    if (!rows.length) { list.innerHTML = '<div class="empty-account"><h3>No inventory yet</h3></div>'; return; }
    list.innerHTML = rows.map(asset => {
      const assetListings = map.get(asset.id) || [];
      const active = assetListings.filter(x => ["Published", "Reserved"].includes(x.status));
      const soldListing = assetListings.find(x => x.status === "Sold");
      const warning = Boolean(soldListing && active.length);
      const cards = channels.map(ch => {
        const l = assetListings.find(x => x.sales_channel === ch);
        if (!l) return `<span style="display:inline-block;margin:.2rem .35rem .2rem 0;padding:.35rem .55rem;border:1px solid #ddd;border-radius:6px">${esc(ch)}: not listed</span>`;
        return `<span style="display:inline-block;margin:.2rem .35rem .2rem 0;padding:.35rem .55rem;border:1px solid #ddd;border-radius:6px">${esc(ch)}: <strong>${esc(l.status)}</strong>${l.asking_price != null ? ` · ${money(l.asking_price)}` : ""}</span>`;
      }).join("");
      return `<article class="valuation-card" style="margin-bottom:1rem;${warning ? "border:2px solid #b42318" : ""}"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap"><div><p class="section-kicker">${esc(asset.status || "Purchased")}</p><h3><a href="inventory-detail.html?id=${encodeURIComponent(asset.id)}">${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Unnamed asset")}</a></h3><p>${esc(asset.asset_reference)} · Purchase ${money(asset.purchase_price)}</p></div><a class="btn btn-secondary" href="listing-readiness.html?id=${encodeURIComponent(asset.id)}">MANAGE CHANNELS</a></div>${warning ? `<div class="form-message error" style="margin-top:1rem"><strong>SOLD — DELIST OTHER CHANNELS</strong><br>This item is marked sold on ${esc(soldListing.sales_channel)} but remains active on ${active.map(x => esc(x.sales_channel)).join(", ")}.</div>` : ""}<div style="margin-top:1rem">${cards}</div></article>`;
    }).join("");
  }
  await load();
});
