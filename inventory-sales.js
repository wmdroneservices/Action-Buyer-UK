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
  const salesStatuses = ["Sent to Sales","Listed","Reserved"];
  const channels = ["Marketplace","eBay","Website","Facebook Marketplace","Vinted","Amazon","Central","Other"];

  async function load() {
    const [{ data: assets, error: assetError }, { data: listings, error: listingError }] = await Promise.all([
      db.from("inventory_assets").select("*").in("status", salesStatuses).order("sent_to_sales_at", { ascending: false }),
      db.from("resale_listings").select("*").order("sales_channel")
    ]);
    if (assetError || listingError) { list.innerHTML = "<p>Could not load sales channels.</p>"; message.textContent = assetError?.message || listingError?.message || "Could not load sales channels."; message.className = "form-message error"; return; }
    const rows = assets || [], ls = listings || [];
    const map = new Map(); ls.forEach(x=>{if(!map.has(x.asset_id))map.set(x.asset_id,[]);map.get(x.asset_id).push(x);});
    const published = ls.filter(x=>['Published','Reserved'].includes(x.status) && rows.some(a=>a.id===x.asset_id));
    const warnings = rows.filter(asset=>{const r=map.get(asset.id)||[];return r.some(x=>x.status==='Delist Required');}).length;
    const readyToList = rows.filter(a=>a.status === "Sent to Sales").length;
    summary.innerHTML=`<div style="display:flex;gap:2rem;flex-wrap:wrap"><div><strong>${rows.length}</strong><br>items in Sales</div><div><strong>${readyToList}</strong><br>ready to list for sale</div><div><strong>${published.length}</strong><br>live/reserved listings</div><div><strong>${warnings}</strong><br>delist warnings</div></div><p style="margin-top:1rem">Only staff-sent items appear here. Inventory preparation remains in the Inventory section.</p>`;
    if(!rows.length){list.innerHTML='<div class="empty-account"><h3>No products in Sales Channels</h3><p>Complete inspection and testing, then use Send to Sales from Inventory. The product will then appear here as <strong>READY TO LIST FOR SALE</strong>.</p></div>';return;}
    list.innerHTML=rows.map(asset=>{
      const assetListings=map.get(asset.id)||[];
      const warning=assetListings.some(x=>x.status==='Delist Required');
      const action=actionFor(asset.status);
      const cards=channels.map(ch=>{const l=assetListings.find(x=>x.sales_channel===ch);if(!l)return `<span style="display:inline-block;margin:.2rem .35rem .2rem 0;padding:.35rem .55rem;border:1px solid #ddd;border-radius:6px">${esc(ch)}: not listed</span>`;return `<span style="display:inline-block;margin:.2rem .35rem .2rem 0;padding:.35rem .55rem;border:1px solid #ddd;border-radius:6px"><strong>${esc(ch)}</strong>: ${esc(l.status)}${l.asking_price!=null?` · ${money(l.asking_price)}`:''}</span>`;}).join('');
      return `<article class="valuation-card" style="margin-bottom:1rem;${warning?'border:2px solid #b42318':''}"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap"><div><p class="section-kicker">${esc(asset.status)}</p><h3>${esc([asset.manufacturer,asset.model].filter(Boolean).join(' ')||'Unnamed asset')}</h3><p>Transaction: ${esc(asset.transaction_number)} · Asset: ${esc(asset.asset_reference)}</p><p>Purchase cost: ${money(asset.purchase_price)}</p></div><div style="display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn btn-primary" href="listing-readiness.html?id=${encodeURIComponent(asset.id)}">MANAGE CHANNELS</a><a class="btn btn-secondary" href="inventory-detail.html?id=${encodeURIComponent(asset.id)}">VIEW ITEM</a></div></div><div style="margin-top:1rem;padding:1rem;${toneStyle(action.tone)}"><strong>${esc(action.label)}</strong><br><span>${esc(action.detail)}</span></div>${warning?'<div class="form-message error" style="margin-top:1rem"><strong>SOLD/DELIST ACTION REQUIRED</strong><br>Another sales-channel listing has been sold. Remove this product from every remaining active channel.</div>':''}<div style="margin-top:1rem">${cards}</div></article>`;
    }).join('');
  }
  await load();
});
