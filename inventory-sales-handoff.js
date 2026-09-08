document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  const root = document.getElementById('asset-detail');
  if (!auth || !root) return;
  const session = await auth.getSession();
  if (!session) return;
  const db = auth.supabase;
  const staffRes = await db.from('staff_users').select('user_id,active').eq('user_id', session.user.id).maybeSingle();
  if (!staffRes.data?.active) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) return;
  const salesStatuses = new Set(['Sent to Sales','Listed','Reserved','Sold','Sold - Awaiting Shipping','Sold - Shipped','Returned','Archived']);
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const money = v => v === null || v === undefined || v === '' ? 'Not recorded' : Number(v).toLocaleString('en-GB',{style:'currency',currency:'GBP'});

  for (let i=0;i<100 && !root.querySelector('#workbench-form');i++) await new Promise(r=>setTimeout(r,75));
  if (!root.querySelector('#workbench-form')) return;

  const assetRes = await db.from('inventory_assets').select('*').eq('id', id).maybeSingle();
  const asset = assetRes.data;
  if (!asset || !salesStatuses.has(asset.status)) return;

  const [testingRes,evidenceRes,repairsRes,itemSalesRes,catalogSalesRes] = await Promise.all([
    db.from('inventory_testing').select('*').eq('asset_id',id).order('created_at',{ascending:false}),
    db.from('inventory_evidence').select('*').eq('asset_id',id).eq('evidence_type','Photographs').order('created_at',{ascending:true}),
    db.from('inventory_repairs').select('*').eq('asset_id',id).order('repaired_at',{ascending:false}),
    db.from('inventory_sales_content').select('*').eq('asset_id',id).maybeSingle(),
    asset.catalog_product_id ? db.from('catalog_sales_content').select('*').eq('catalog_product_id',asset.catalog_product_id).maybeSingle() : Promise.resolve({data:null})
  ]);
  const testingRows=testingRes.data||[];
  const evidenceRows=evidenceRes.data||[];
  const repairs=repairsRes.data||[];
  const itemSales=itemSalesRes.data||{};
  const catalogSales=catalogSalesRes.data||{};
  const inspection=testingRows.find(x=>x.stage==='inspection')||null;
  const testing=testingRows.find(x=>x.stage==='testing')||null;

  async function signedMap(rows){
    const paths=rows.map(x=>x.file_url).filter(Boolean);
    if(!paths.length) return [];
    const signed=await db.storage.from('quote-photos').createSignedUrls(paths,3600);
    const byPath=new Map((signed.data||[]).filter(x=>x.signedUrl).map(x=>[x.path,x.signedUrl]));
    return rows.map(x=>Object.assign({},x,{signedUrl:byPath.get(x.file_url)||''})).filter(x=>x.signedUrl);
  }
  const staffPhotos=await signedMap(evidenceRows);

  root.querySelector('#staff-photos-section')?.remove();
  root.querySelector('#sales-handoff-section')?.remove();

  const history=document.createElement('section');
  history.id='product-history';
  history.className='valuation-card';
  history.style.marginTop='1rem';
  const repairHtml=repairs.length ? repairs.map(r =>
    '<div class="notice" style="margin-top:.5rem"><strong>'+esc(r.repaired_at?new Date(r.repaired_at).toLocaleString('en-GB'):'Repair recorded')+'</strong><br>Fault: '+esc(r.fault_description||'Not recorded')+'<br>Repair: '+esc(r.repair_description||'Not recorded')+'<br>Provider: '+esc(r.provider_name||r.provider_type||'Not recorded')+'<br>Cost: '+esc(money(r.repair_cost))+'</div>'
  ).join('') : '<p>No repair records.</p>';
  history.innerHTML='<p class="section-kicker">PRODUCT HISTORY</p><h2>Purchase, inspection & repair history</h2>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem">'
    +'<div class="notice"><strong>Purchase price</strong><br>'+esc(money(asset.purchase_price))+'</div>'
    +'<div class="notice"><strong>Acquired</strong><br>'+esc(asset.acquired_at?new Date(asset.acquired_at).toLocaleString('en-GB'):'Not recorded')+'</div>'
    +'<div class="notice"><strong>Transaction</strong><br>'+esc(asset.transaction_number||'Not recorded')+'</div>'
    +'<div class="notice"><strong>Current status</strong><br>'+esc(asset.status||'Not recorded')+'</div>'
    +'<div class="notice"><strong>Inspection</strong><br>'+esc(inspection?.result||'Not recorded')+'</div>'
    +'<div class="notice"><strong>Technical test</strong><br>'+esc(testing?.result||'Not recorded')+'</div></div>'
    +'<h3 style="margin-top:1rem">Repairs ('+repairs.length+')</h3>'+repairHtml;
  root.appendChild(history);

  const presentation=document.createElement('section');
  presentation.id='sales-presentation-section';
  presentation.className='valuation-card';
  presentation.style.marginTop='1rem';
  const photoHtml=staffPhotos.length ? staffPhotos.map(p=>{
    const hero=itemSales.hero_image_url===p.file_url;
    return '<div class="notice" style="padding:.45rem"><a href="'+esc(p.signedUrl)+'" target="_blank" rel="noopener"><img src="'+esc(p.signedUrl)+'" alt="Staff photograph" style="width:100%;height:150px;object-fit:cover;border-radius:8px"></a><div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.4rem"><button class="btn btn-secondary" type="button" data-set-hero="'+esc(p.file_url)+'">'+(hero?'ITEM HERO SELECTED':'USE AS ITEM HERO')+'</button><button class="btn btn-secondary" type="button" data-remove-photo="'+esc(p.id)+'" data-photo-path="'+esc(p.file_url)+'">REMOVE</button></div></div>';
  }).join('') : '<p>No staff photographs yet.</p>';
  presentation.innerHTML='<p class="section-kicker">SALES PRESENTATION</p><h2>Condition, listing notes & photographs</h2>'
    +'<form id="item-sales-content-form" class="auth-form"><label>Condition description<textarea name="condition_description" rows="5">'+esc(itemSales.condition_description||'')+'</textarea></label><label>Listing notes<textarea name="listing_notes" rows="4">'+esc(itemSales.listing_notes||'')+'</textarea></label><div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-primary" type="submit">SAVE SALES PRESENTATION</button><p id="item-sales-message" class="form-message" aria-live="polite"></p></div></form>'
    +'<h3 style="margin-top:1rem">Staff photographs</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:1rem">'+photoHtml+'</div>'
    +'<form id="handoff-photo-form" class="auth-form"><label>Add / take photographs<input id="handoff-photos" type="file" accept="image/*" capture="environment" multiple></label><button class="btn btn-secondary" type="submit">UPLOAD PHOTOGRAPHS</button><p id="handoff-photo-message" class="form-message" aria-live="polite"></p></form>';
  root.appendChild(presentation);

  const catalogue=document.createElement('section');
  catalogue.className='valuation-card';
  catalogue.style.marginTop='1rem';
  catalogue.innerHTML='<p class="section-kicker">CATALOGUE CONTENT</p><h2>Reusable manufacturer & product content</h2>'
    +(asset.catalog_product_id
      ? '<form id="catalog-sales-content-form" class="auth-form"><label>Manufacturer / product description<textarea name="product_description" rows="7">'+esc(catalogSales.product_description||'')+'</textarea></label><label>Catalogue hero image URL<input name="hero_image_url" value="'+esc(catalogSales.hero_image_url||'')+'"></label><label>Manufacturer image URL<input name="manufacturer_image_url" value="'+esc(catalogSales.manufacturer_image_url||'')+'"></label><label>Source attribution<textarea name="source_attribution" rows="3">'+esc(catalogSales.source_attribution||'')+'</textarea></label><div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-primary" type="submit">SAVE CATALOGUE CONTENT</button><p id="catalog-sales-message" class="form-message" aria-live="polite"></p></div></form>'
      : '<p class="notice">This item is not linked to a catalogue product, so reusable catalogue content is not available for this asset.</p>');
  root.appendChild(catalogue);

  async function saveItem(form,heroOverride){
    const fd=new FormData(form);
    return db.from('inventory_sales_content').upsert({
      asset_id:id,
      condition_description:fd.get('condition_description')||null,
      listing_notes:fd.get('listing_notes')||null,
      hero_image_url:heroOverride===undefined ? (itemSales.hero_image_url||null) : heroOverride,
      updated_by:session.user.id,
      updated_at:new Date().toISOString()
    },{onConflict:'asset_id'});
  }

  root.querySelector('#item-sales-content-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const m=root.querySelector('#item-sales-message');
    const result=await saveItem(e.currentTarget);
    m.textContent=result.error?result.error.message:'Sales presentation saved.';
    m.className='form-message'+(result.error?' error':' success');
  });

  root.querySelectorAll('[data-set-hero]').forEach(btn=>btn.addEventListener('click',async()=>{
    const result=await saveItem(root.querySelector('#item-sales-content-form'),btn.dataset.setHero);
    if(result.error){alert(result.error.message);return;}
    location.reload();
  }));

  root.querySelectorAll('[data-remove-photo]').forEach(btn=>btn.addEventListener('click',async()=>{
    if(!confirm('Remove this staff photograph from the item record?')) return;
    const row=await db.from('inventory_evidence').delete().eq('id',btn.dataset.removePhoto).eq('asset_id',id);
    if(row.error){alert(row.error.message);return;}
    const storage=await db.storage.from('quote-photos').remove([btn.dataset.photoPath]);
    if(storage.error){alert(storage.error.message);return;}
    location.reload();
  }));

  root.querySelector('#handoff-photo-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const files=[...(root.querySelector('#handoff-photos').files||[])];
    const m=root.querySelector('#handoff-photo-message');
    if(!files.length){m.textContent='Choose at least one photograph.';m.className='form-message error';return;}
    m.textContent='Uploading photographs…';m.className='form-message';
    try{
      for(const file of files){
        const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        const path='inventory/'+id+'/'+Date.now()+'-'+crypto.randomUUID()+'-'+safe;
        const up=await db.storage.from('quote-photos').upload(path,file,{upsert:false});
        if(up.error) throw up.error;
        const ev=await db.from('inventory_evidence').insert({asset_id:id,evidence_type:'Photographs',file_url:path,description:'Staff resale photograph',created_by:session.user.id});
        if(ev.error) throw ev.error;
      }
      m.textContent='Photographs uploaded.';m.className='form-message success';setTimeout(()=>location.reload(),350);
    }catch(err){m.textContent=err?.message||'Could not upload photographs.';m.className='form-message error';}
  });

  root.querySelector('#catalog-sales-content-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const m=root.querySelector('#catalog-sales-message');
    const result=await db.from('catalog_sales_content').upsert({
      catalog_product_id:asset.catalog_product_id,
      product_description:fd.get('product_description')||null,
      hero_image_url:fd.get('hero_image_url')||null,
      manufacturer_image_url:fd.get('manufacturer_image_url')||null,
      source_attribution:fd.get('source_attribution')||null,
      created_by:session.user.id,
      updated_at:new Date().toISOString()
    },{onConflict:'catalog_product_id'});
    m.textContent=result.error?result.error.message:'Catalogue content saved.';
    m.className='form-message'+(result.error?' error':' success');
  });
});