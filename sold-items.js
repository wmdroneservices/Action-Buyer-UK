document.addEventListener('DOMContentLoaded', async () => {
  const auth=window.actionBuyerAuth, list=document.getElementById('sold-list'), summary=document.getElementById('sold-summary');
  if(!auth||!list)return;
  const session=await auth.getSession();if(!session){location.href='login.html?return=sold-items.html';return;}
  const db=auth.supabase;
  const {data:staff}=await db.from('staff_users').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(!staff){list.innerHTML='<p>You do not have permission to access sold items.</p>';return;}
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money=n=>Number(n||0).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  const date=v=>v?new Date(v).toLocaleString('en-GB'):'Not recorded';
  async function signed(records){const paths=records.map(x=>x.file_url).filter(Boolean);if(!paths.length)return[];const {data}=await db.storage.from('quote-photos').createSignedUrls(paths,3600);return(data||[]).map((x,i)=>({...x,record:records[i]})).filter(x=>x.signedUrl);}
  const [{data:assets,error},{data:listings},{data:returns},{data:expenses},{data:testing},{data:evidence}]=await Promise.all([
    db.from('inventory_assets').select('*').in('status',['Sold','Returned']).order('sold_at',{ascending:false}),
    db.from('resale_listings').select('*'),
    db.from('customer_return_requests').select('*').order('created_at',{ascending:false}),
    db.from('inventory_expenses').select('*'),
    db.from('inventory_testing').select('*').order('created_at',{ascending:true}),
    db.from('inventory_evidence').select('*').eq('evidence_type','Photographs').order('created_at',{ascending:true})
  ]);
  if(error){list.innerHTML=`<p>Could not load sold items: ${esc(error.message)}</p>`;return;}
  const rows=assets||[];
  const soldRevenue=rows.reduce((s,a)=>s+Number(a.sold_price||0),0);
  const delistRows=(listings||[]).filter(x=>x.status==='Delist Required');
  const delistAssets=new Map();
  delistRows.forEach(l=>{if(!delistAssets.has(l.asset_id))delistAssets.set(l.asset_id,[]);delistAssets.get(l.asset_id).push(l);});
  const delistCount=delistRows.length;

  summary.innerHTML=`<div style="display:flex;gap:2rem;flex-wrap:wrap"><div><strong>${rows.length}</strong><br>sold / returned products</div><div><strong>${money(rows.filter(a=>a.status==='Sold').reduce((s,a)=>s+Number(a.sold_price||0),0))}</strong><br>sold revenue</div><div><strong>${money(rows.reduce((s,a)=>s+Number(a.purchase_price||0),0))}</strong><br>purchase cost</div><div><strong>${money(soldRevenue)}</strong><br>gross sold value</div></div>`;

  if(delistCount){
    const urgent=document.createElement('section');
    urgent.id='delist-actions';
    urgent.style.cssText='border:3px solid #b42318;background:#fff1f1;border-radius:12px;padding:1.2rem 1.3rem;margin:0 0 1.5rem;box-shadow:0 6px 18px rgba(180,35,24,.16)';
    urgent.innerHTML=`<div style="font-size:.8rem;font-weight:900;letter-spacing:.12em;color:#b42318">URGENT — CLOSE OTHER MARKETPLACE LISTINGS</div><h2 style="margin:.3rem 0;color:#7f1d1d">${delistCount} LISTING${delistCount===1?'':'S'} REQUIRE IMMEDIATE ACTION</h2><p style="margin:.25rem 0 .9rem;color:#5f1b18"><strong>A product has already sold.</strong> The listings below are still open on other sales channels. Close or remove each one immediately to prevent a duplicate sale.</p><div style="display:grid;gap:.75rem">${delistRows.map(l=>{
      const a=rows.find(x=>x.id===l.asset_id);
      const name=a?[a.manufacturer,a.model].filter(Boolean).join(' '):'Sold product';
      return `<div style="background:#fff;border:2px solid #b42318;border-radius:8px;padding:.85rem;display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap"><div><strong style="color:#7f1d1d">CLOSE THIS LISTING NOW</strong><br>${esc(name)} · <strong>${esc(l.sales_channel||'Sales channel')}</strong>${l.listing_reference?` · Ref ${esc(l.listing_reference)}`:''}</div><div style="display:flex;gap:.5rem;flex-wrap:wrap">${l.listing_url?`<a class="btn btn-primary" href="${esc(l.listing_url)}" target="_blank" rel="noopener" style="background:#b42318;border-color:#b42318;color:#fff;font-weight:900">OPEN LIVE LISTING</a>`:''}</div></div>`;
    }).join('')}</div>`;
    list.parentNode.insertBefore(urgent,list);
  }

  if(!rows.length){list.innerHTML='<div class="empty-account"><h3>No sold items yet</h3><p>When a sales-channel listing is marked sold, the product moves here automatically.</p></div>';return;}
  for(const a of rows){
    const ls=(listings||[]).filter(x=>x.asset_id===a.id);const primary=ls.find(x=>x.id===a.sold_listing_id)||ls.find(x=>x.status==='Sold');
    const otherDelists=ls.filter(x=>x.status==='Delist Required');
    const ret=(returns||[]).filter(x=>x.asset_id===a.id)[0];const ex=(expenses||[]).filter(x=>x.asset_id===a.id);const ts=(testing||[]).filter(x=>x.asset_id===a.id);const ev=(evidence||[]).filter(x=>x.asset_id===a.id);const photos=await signed(ev);
    const additional=ex.reduce((s,x)=>s+Number(x.amount||0),0);const cost=Number(a.purchase_price||0)+additional;const sold=Number(a.sold_price||0);const fees=Number(primary?.selling_fees||0)+Number(primary?.shipping_cost||0);const profit=sold-cost-fees;
    const card=document.createElement('details');card.className='valuation-card';card.style.marginBottom='1rem';
    const urgentHtml=otherDelists.length?`<div style="margin:0 0 1rem;padding:1rem;border:3px solid #b42318;background:#fff1f1;border-radius:9px"><strong style="display:block;color:#b42318;font-size:1.05rem;letter-spacing:.04em">CLOSE OTHER MARKETPLACE LISTINGS NOW</strong><p style="margin:.35rem 0 .75rem;color:#5f1b18">This item sold through <strong>${esc(a.sold_channel||primary?.sales_channel||'another sales channel')}</strong>. Close the following listing${otherDelists.length===1?'':'s'} immediately.</p>${otherDelists.map(l=>`<div style="display:flex;justify-content:space-between;gap:.75rem;align-items:center;flex-wrap:wrap;padding:.65rem 0;border-top:1px solid #e7b5b2"><strong>${esc(l.sales_channel||'Sales channel')}</strong>${l.listing_url?`<a class="btn btn-primary" href="${esc(l.listing_url)}" target="_blank" rel="noopener" style="background:#b42318;border-color:#b42318;color:#fff;font-weight:900">OPEN LISTING &amp; CLOSE IT</a>`:'<span style="font-weight:800;color:#7f1d1d">No live listing link recorded — close this channel manually.</span>'}</div>`).join('')}</div>`:'';
    card.innerHTML=`<summary style="cursor:pointer;list-style:none"><div style="display:grid;grid-template-columns:minmax(220px,2fr) repeat(4,minmax(110px,1fr));gap:.75rem;align-items:center"><div><p class="section-kicker">${esc(a.status)}</p><strong>${esc([a.manufacturer,a.model].filter(Boolean).join(' ')||'Product')}</strong><br><small>${esc(a.transaction_number)} · ${esc(a.asset_reference)}</small></div><div><strong>Cost</strong><br>${money(cost)}</div><div><strong>Sold for</strong><br>${money(sold)}</div><div><strong>Fees</strong><br>${money(fees)}</div><div><strong>Result</strong><br>${money(profit)}</div></div></summary>
    <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #ddd">${urgentHtml}<div class="notice"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.6rem"><p><strong>Transaction number</strong><br>${esc(a.transaction_number)}</p><p><strong>Asset reference</strong><br>${esc(a.asset_reference)}</p><p><strong>Product</strong><br>${esc(a.manufacturer)} ${esc(a.model)}</p><p><strong>Package</strong><br>${esc(a.package_name||'Not recorded')}</p><p><strong>Customer condition</strong><br>${esc(a.customer_condition||'Not recorded')}</p><p><strong>Staff condition</strong><br>${esc(a.condition_grade||'Not recorded')}</p><p><strong>Serial</strong><br>${esc(a.serial_number||'Not recorded')}</p><p><strong>Sold channel</strong><br>${esc(a.sold_channel||primary?.sales_channel||'Not recorded')}</p><p><strong>Purchase price</strong><br>${money(a.purchase_price)}</p><p><strong>Additional costs</strong><br>${money(additional)}</p><p><strong>Total cost</strong><br>${money(cost)}</p><p><strong>Sold for</strong><br>${money(sold)}</p><p><strong>Sold date</strong><br>${esc(date(a.sold_at))}</p><p><strong>Profit / loss</strong><br>${money(profit)}</p></div></div>
    <div class="notice" style="margin-top:1rem"><h4>Product details</h4><p><strong>Final package contents:</strong><br>${esc(a.final_package_contents||'Not recorded')}</p><p><strong>Items added/replaced:</strong><br>${esc(a.items_added_replaced||'None recorded')}</p><p><strong>Package notes:</strong><br>${esc(a.package_notes||'None recorded')}</p><p><strong>Description:</strong><br>${esc(a.description||'Not recorded')}</p></div>
    <details style="margin-top:1rem"><summary style="cursor:pointer"><strong>Photos (${photos.length})</strong></summary>${photos.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:1rem">${photos.map(x=>`<a href="${esc(x.signedUrl)}" target="_blank" rel="noopener"><img src="${esc(x.signedUrl)}" alt="Sold product photograph" style="width:100%;height:150px;object-fit:cover;border-radius:8px"></a>`).join('')}</div>`:'<p>No photographs recorded.</p>'}</details>
    <details style="margin-top:1rem"><summary style="cursor:pointer"><strong>Inspection / testing history (${ts.length})</strong></summary>${ts.length?ts.map(t=>`<div class="notice" style="margin-top:.6rem"><strong>${esc(t.stage)}</strong> · ${esc(date(t.created_at))}<br>Result: ${esc(t.result||'Not recorded')} ${t.visual_condition?`· Condition: ${esc(t.visual_condition)}`:''}<br>${esc(t.notes||'')}</div>`).join(''):'<p>No testing history.</p>'}</details>
    ${ret?`<div class="form-message ${ret.status==='Return Authorised'?'success':'error'}" style="margin-top:1rem"><strong>RETURN: ${esc(ret.status)}</strong><br>${esc(ret.return_reference)}${ret.reason?` · ${esc(ret.reason)}`:''}</div>`:''}
    <p style="margin-top:1rem"><a class="btn btn-secondary" href="inventory-detail.html?id=${encodeURIComponent(a.id)}">OPEN FULL ASSET RECORD</a></p></div>`;
    list.appendChild(card);
  }
});
