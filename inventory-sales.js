document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth, list = document.getElementById("sales-list"), summary = document.getElementById("sales-summary"), message = document.getElementById("sales-message");
  if (!auth || !list) return;
  const session = await auth.getSession(); if (!session) { location.href = "login.html?return=inventory-sales.html"; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { list.innerHTML = "<p>You do not have permission to access Sales Channels.</p>"; return; }
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const money = n => Number(n || 0).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
  const actionFor = state => window.AssetStateMachine?.getNextAction(state) || { label: "ACTION REQUIRED", detail: "Review this item and determine its next workflow step.", tone: "warning" };
  const toneStyle = tone => ({action:"border:2px solid #b06b00;background:#fff8e8",warning:"border:2px solid #b42318;background:#fff5f5",success:"border:2px solid #18794e;background:#f1fbf5",info:"border:1px solid #b8c4d1;background:#f7f9fb"}[tone] || "border:1px solid #b8c4d1;background:#f7f9fb");
  const activeStatuses = ["Sent to Sales","Listed","Reserved"];
  const channels = ["Marketplace","eBay","Website","Facebook Marketplace","Vinted","Amazon","Central","Other"];

  async function closeListing(listingId, button) {
    if (!listingId || !window.confirm("Confirm that this marketplace listing has been closed/removed.")) return;
    button.disabled = true; button.textContent = "CLOSING…";
    const { error } = await db.rpc("staff_close_resale_listing", { p_listing_id: listingId });
    if (error) { button.disabled = false; button.textContent = "TRY AGAIN"; alert(error.message); return; }
    await load();
  }

  async function load() {
    const [{ data: assets, error: assetError }, { data: listings, error: listingError }] = await Promise.all([
      db.from("inventory_assets").select("*").in("status", [...activeStatuses, "Sold"]).order("status_changed_at", { ascending: false }),
      db.from("resale_listings").select("*").order("sales_channel")
    ]);
    if (assetError || listingError) { list.innerHTML = "<p>Could not load sales channels.</p>"; message.textContent = assetError?.message || listingError?.message || "Could not load sales channels."; message.className = "form-message error"; return; }
    const allRows = assets || [], ls = listings || [], map = new Map();
    ls.forEach(x => { if (!map.has(x.asset_id)) map.set(x.asset_id, []); map.get(x.asset_id).push(x); });
    const rows = allRows.filter(a => activeStatuses.includes(a.status) || (a.status === "Sold" && (map.get(a.id) || []).some(x => x.status === "Delist Required")));
    const activeRows = allRows.filter(a => activeStatuses.includes(a.status));
    const published = ls.filter(x => ["Published","Reserved"].includes(x.status) && activeRows.some(a => a.id === x.asset_id));
    const warnings = ls.filter(x => x.status === "Delist Required").length;
    const readyToList = activeRows.filter(a => a.status === "Sent to Sales").length;
    summary.innerHTML = `<div style="display:flex;gap:2rem;flex-wrap:wrap"><div><strong>${activeRows.length}</strong><br>items in Sales</div><div><strong>${readyToList}</strong><br>ready to list for sale</div><div><strong>${published.length}</strong><br>live/reserved listings</div><div><strong style="color:#b42318">${warnings}</strong><br>delist warnings</div></div><p style="margin-top:1rem">Sold items with outstanding delist actions remain visible until every remaining marketplace listing is closed.</p>`;
    if (!rows.length) { list.innerHTML = '<div class="empty-account"><h3>No products requiring sales action</h3><p>Products sent to Sales appear here for listing. Sold products remain visible while marketplace closures are outstanding.</p></div>'; return; }
    list.innerHTML = rows.map(asset => {
      const assetListings = map.get(asset.id) || [], delists = assetListings.filter(x => x.status === "Delist Required"), warning = delists.length > 0, action = actionFor(asset.status);
      const cards = channels.map(ch => { const l = assetListings.find(x => x.sales_channel === ch); if (!l) return `<span style="display:inline-block;margin:.2rem .35rem .2rem 0;padding:.35rem .55rem;border:1px solid #ddd;border-radius:6px">${esc(ch)}: not listed</span>`; return `<span style="display:inline-block;margin:.2rem .35rem .2rem 0;padding:.35rem .55rem;border:1px solid ${l.status === "Delist Required" ? "#b42318" : "#ddd"};border-radius:6px"><strong>${esc(ch)}</strong>: ${esc(l.status)}${l.asking_price != null ? ` · ${money(l.asking_price)}` : ""}</span>`; }).join("");
      const closeButtons = delists.map(l => `<div style="display:flex;justify-content:space-between;gap:.75rem;align-items:center;flex-wrap:wrap;margin-top:.6rem;padding:.65rem;border-top:1px solid #e7b5b2"><strong>${esc(l.sales_channel)}${l.listing_reference ? ` · Ref ${esc(l.listing_reference)}` : ""}</strong><button type="button" class="btn btn-primary delist-close-button" data-listing-id="${esc(l.id)}" style="background:#b42318;border-color:#b42318;color:#fff;font-weight:900">LISTING CLOSED</button></div>`).join("");
      return `<article class="valuation-card" style="margin-bottom:1rem;${warning ? "border:3px solid #b42318;background:#fffafa" : ""}"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap"><div><p class="section-kicker">${esc(asset.status)}</p><h3>${esc([asset.manufacturer,asset.model].filter(Boolean).join(" ") || "Unnamed asset")}</h3><p>Transaction: ${esc(asset.transaction_number)} · Asset: ${esc(asset.asset_reference)}</p><p>Purchase cost: ${money(asset.purchase_price)}</p></div><div style="display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn btn-primary" href="listing-readiness.html?id=${encodeURIComponent(asset.id)}">OPEN SALES WORKBENCH</a><a class="btn btn-secondary" href="inventory-detail.html?id=${encodeURIComponent(asset.id)}">PRODUCT WORKBENCH</a></div></div><div style="margin-top:.75rem;padding:1rem;${toneStyle(warning ? "warning" : action.tone)}"><strong>${warning ? "CLOSE OTHER MARKETPLACE LISTINGS" : esc(action.label)}</strong><br><span>${warning ? `${delists.length} marketplace listing${delists.length === 1 ? "" : "s"} still require closure.` : esc(action.detail)}</span>${closeButtons}</div><div style="margin-top:1rem">${cards}</div></article>`;
    }).join("");
    list.querySelectorAll(".delist-close-button").forEach(button => button.addEventListener("click", () => closeListing(button.dataset.listingId, button)));
  }
  await load(); setInterval(() => { if (!document.hidden) load(); }, 5000);
});
