document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  const list = document.getElementById('sales-channel-list');
  const summary = document.getElementById('sales-channel-summary');
  if (!auth || !list || !summary) return;
  const session = await auth.getSession();
  if (!session) { location.href = 'login.html?return=sales-channels.html'; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from('staff_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!staff) { list.innerHTML = '<p>You do not have permission to access inventory.</p>'; return; }

  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money = n => n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  const requested = new URLSearchParams(location.search).get('asset');
  const { data: assets, error } = await db.from('inventory_assets').select('id,asset_reference,manufacturer,model,status,approved_resale_price').order('created_at',{ascending:false});
  if (error) { list.innerHTML = '<p>Could not load sales channels.</p>'; return; }
  const { data: listings, error: listingsError } = await db.from('resale_listings').select('*').order('sales_channel');
  if (listingsError) { list.innerHTML = '<p>Could not load channel listings.</p>'; return; }

  const byAsset = {};
  (listings || []).forEach(row => { (byAsset[row.asset_id] ||= []).push(row); });
  const activeStatuses = ['Draft','Ready For Listing','Published','Reserved','Delist Required'];
  const channelOrder = ['Website','eBay','Facebook Marketplace','Marketplace','Central','Vinted','Amazon','Other'];
  const filteredAssets = requested ? (assets || []).filter(a => a.id === requested) : (assets || []);

  const warningCount = filteredAssets.reduce((n,a) => {
    const rows = byAsset[a.id] || [];
    return n + (rows.some(r => r.status === 'Sold') && rows.some(r => activeStatuses.includes(r.status)) ? 1 : 0);
  }, 0);
  summary.innerHTML = `<div><strong>${filteredAssets.length}</strong> inventory item${filteredAssets.length === 1 ? '' : 's'}</div><div style="margin-top:.4rem"><strong>${warningCount}</strong> item${warningCount === 1 ? '' : 's'} requiring delist action</div>`;

  if (!filteredAssets.length) { list.innerHTML = '<div class="empty-account"><h3>No inventory items found</h3></div>'; return; }

  list.innerHTML = filteredAssets.map(asset => {
    const rows = byAsset[asset.id] || [];
    const soldRows = rows.filter(r => r.status === 'Sold');
    const otherActive = rows.filter(r => activeStatuses.includes(r.status));
    const warning = soldRows.length && otherActive.length ? `<div class="form-message error" style="margin:0 0 1rem;border:2px solid #b42318"><strong>DELIST REQUIRED — SOLD ON ${esc(soldRows.map(r => r.sales_channel).join(', '))}</strong><p>Remove this item from: ${esc(otherActive.map(r => r.sales_channel).join(', '))}</p></div>` : '';
    const channelMap = Object.fromEntries(rows.map(r => [r.sales_channel,r]));
    const cards = channelOrder.map(channel => {
      const row = channelMap[channel];
      if (!row) return `<span class="notice" style="display:inline-block;margin:.2rem">${esc(channel)} — not listed</span>`;
      const state = row.status === 'Sold' ? 'SOLD' : row.status === 'Cancelled' ? 'DELISTED' : row.status;
      return `<span class="notice" style="display:inline-block;margin:.2rem"><strong>${esc(channel)}</strong><br>${esc(state)}${row.asking_price != null ? ` · ${money(row.asking_price)}` : ''}${row.listing_reference ? `<br>${esc(row.listing_reference)}` : ''}</span>`;
    }).join('');
    return `<article class="valuation-card" id="asset-${esc(asset.id)}" style="margin-bottom:1rem"><div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap"><div><p class="section-kicker">${esc(asset.status)}</p><h2>${esc([asset.manufacturer,asset.model].filter(Boolean).join(' ') || 'Unnamed asset')}</h2><p>${esc(asset.asset_reference)} · Approved resale ${money(asset.approved_resale_price)}</p></div><div style="display:flex;gap:.5rem;align-items:flex-start;flex-wrap:wrap"><a class="btn btn-secondary" href="inventory-detail.html?id=${encodeURIComponent(asset.id)}">VIEW ITEM</a><a class="btn btn-primary" href="listing-readiness.html?id=${encodeURIComponent(asset.id)}">MANAGE CHANNELS</a></div></div>${warning}<div style="margin-top:.75rem">${cards}</div></article>`;
  }).join('');
});
