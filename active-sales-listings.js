document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const list = document.getElementById("active-list");
  const summary = document.getElementById("active-summary");
  const message = document.getElementById("active-message");
  if (!auth || !list) return;
  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=active-sales-listings.html"; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { list.innerHTML = "<p>You do not have permission to access Active Sales / Listings.</p>"; return; }
  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money = n => Number(n || 0).toLocaleString("en-GB", { style: "currency", currency: "GBP" });

  async function load() {
    const [{ data: listings, error: listingError }, { data: assets, error: assetError }] = await Promise.all([
      db.from("resale_listings").select("*").in("status", ["Published", "Reserved"]).order("sales_channel"),
      db.from("inventory_assets").select("id,manufacturer,model,asset_reference,transaction_number,status,purchase_price")
    ]);
    if (listingError || assetError) {
      message.textContent = listingError?.message || assetError?.message || "Could not load active listings.";
      message.className = "form-message error";
      return;
    }
    const assetMap = new Map((assets || []).map(a => [a.id, a]));
    const rows = (listings || []).map(l => ({ listing: l, asset: assetMap.get(l.asset_id) })).filter(x => x.asset);
    summary.innerHTML = `<div style="display:flex;gap:2rem;flex-wrap:wrap"><div><strong>${rows.length}</strong><br>active listings</div><div><strong>${rows.filter(x=>x.listing.status === "Reserved").length}</strong><br>reserved</div></div><p style="margin-top:1rem">This page contains only products already listed for sale. New products arrive here after they have been sent from Inventory and listed in Sales.</p>`;
    if (!rows.length) {
      list.innerHTML = '<div class="empty-account"><h3>No active sales listings</h3><p>Products will appear here after staff list them from Sales.</p></div>';
      return;
    }
    list.innerHTML = rows.map(({listing:l, asset:a}) => `<article class="valuation-card" style="margin-bottom:1rem"><div><p class="section-kicker">${esc(l.status)} · ${esc(l.sales_channel || "Sales Channel")}</p><h3>${esc([a.manufacturer,a.model].filter(Boolean).join(" ") || "Unnamed asset")}</h3><p>Asset: ${esc(a.asset_reference)} · Transaction: ${esc(a.transaction_number || "Not recorded")}</p><p>Purchase cost: ${money(a.purchase_price)}</p></div><div class="valuation-meta"><strong>${l.asking_price != null ? money(l.asking_price) : "Price not set"}</strong><a class="btn btn-secondary" href="listing-readiness.html?id=${encodeURIComponent(a.id)}">MANAGE LISTING</a><a class="btn btn-light" href="inventory-detail.html?id=${encodeURIComponent(a.id)}">VIEW ITEM</a></div></article>`).join("");
  }
  await load();
  setInterval(() => { if (!document.hidden) load(); }, 5000);
});
