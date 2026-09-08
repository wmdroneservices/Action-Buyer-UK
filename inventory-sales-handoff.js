document.addEventListener('DOMContentLoaded', async () => {
  const auth=window.actionBuyerAuth, root=document.getElementById('asset-detail');
  if(!auth||!root) return;
  const session=await auth.getSession(); if(!session) return;
  const db=auth.supabase;
  const staff=(await db.from('staff_users').select('user_id,active').eq('user_id',session.user.id).maybeSingle()).data;
  if(!staff?.active) return;
  const id=new URLSearchParams(location.search).get('id'); if(!id) return;
  const salesStatuses=new Set(['Sent to Sales','Listed','Reserved','Sold','Sold - Awaiting Shipping','Sold - Shipped','Returned','Archived']);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const money=v=>v===null||v===undefined||v===''?'Not recorded':Number(v).toLocaleString('en-GB',{style:'currency',currency:'GBP'});

  for(let i=0;i<120&&!root.querySelector('#workbench-form');i++) await new Promise(r=>setTimeout(r,75));
  if(!root.querySelector('#workbench-form')) return;

  const asset=(await db.from('inventory_assets').select('*').eq('id',id).maybeSingle()).data;
  if(!asset||!salesStatuses.has(asset.status)) return;

  const quoteItem=asset.source_quote_item_id?(await db.from('quote_items').select('*').eq('id',asset.source_quote_item_id).maybeSingle()).data:null;
  const valuation=quoteItem?.valuation_id?(await db.from('valuations').select('*').eq('id',quoteItem.valuation_id).maybeSingle()).data:null;
  const [tests,evidence,repairs,itemContent,catalogContent]=await Promise.all([
    db.from('inventory_testing').select('*').eq('asset_id',id).order('created_at',{ascending:false}),
    db.from('inventory_evidence').select('*').eq('asset_id',id).eq('evidence_type','Photographs').order('created_at',{ascending:true}),
    db.from('inventory_repairs').select('*').eq('asset_id',id).order('repaired_at',{ascending:false}),
    db.from('inventory_sales_content').select('*').eq('asset_id',id).maybeSingle(),
    asset.catalog_product_id?db.from('catalog_sales_content').select('*').eq('catalog_product_id',asset.catalog_product_id).maybeSingle():Promise.resolve({data:null})
  ]);
  const testRows=tests.data||[], photos=evidence.data||[], repairRows=repairs.data||[];
  const item=itemContent.data||{}, catalog=catalogContent.data||{};
  const inspection=testRows.find(x=>x.stage==='inspection')||null;
  const technical=testRows.find(x=>x.stage==='testing')||null;

  const inspectorId=inspection?.created_by||technical?.created_by||null;
  const [staffNameRes,profileNameRes]=inspectorId?await Promise.all([
    db.from('staff_users').select('display_name').eq('user_id',inspectorId).maybeSingle(),
    db.from('profiles').select('full_name').eq('id',inspectorId).maybeSingle()
  ]):[{data:null},{data:null}];
  const inspector=staffNameRes.data?.display_name||profileNameRes.data?.full_name||'Not recorded';

  const itemData=quoteItem?.item_data&&typeof quoteItem.item_data==='object'?quoteItem.item_data:{};
  const quoteData=valuation?.quote_data&&typeof valuation.quote_data==='object'?valuation.quote_data:{};
  const single=itemData.singleItem||{};
  const basket=(Array.isArray(quoteData.quoteBasket)?quoteData.quoteBasket:[]).find(x=>{
    if(!x||typeof x!=='object') return false;
    return String(x.model||x.modelName||'').trim().toLowerCase()===String(quoteItem?.model||asset.model||'').trim().toLowerCase()
      &&(!x.manufacturer||!asset.manufacturer||String(x.manufacturer).trim().toLowerCase()===String(asset.manufacturer).trim().toLowerCase());
  })||{};
  const originalCondition=asset.customer_condition||quoteData.condition||itemData.condition||single.condition||basket.condition||'Not recorded';
  const originalNote=asset.customer_exception_notes||itemData.conditionNotes||itemData.exceptionNotes||single.conditionNotes||single.exceptionNotes||basket.conditionNotes||basket.exceptionNotes||quoteData.conditionNotes||quoteData.exceptionNotes||'';
  // Customer-declared condition is historical reference only. Resale condition is the staff inspection condition.
  const inspectedCondition=asset.condition_grade||inspection?.visual_condition||technical?.visual_condition||'Not recorded';
  const inspectedAt=inspection?.created_at||technical?.created_at||null;
  const tested=inspection||technical?'TESTED / INSPECTED':'NO COMPLETED RECORD';

  async function signed(rows){
    const paths=rows.map(x=>x.file_url).filter(Boolean); if(!paths.length) return [];
    const r=await db.storage.from('quote-photos').createSignedUrls(paths,3600);
    const map=new Map((r.data||[]).filter(x=>x.signedUrl).map(x=>[x.path,x.signedUrl]));
    return rows.map(x=>({...x,signedUrl:map.get(x.file_url)||''})).filter(x=>x.signedUrl);
  }
  const signedPhotos=await signed(photos);
  const customerPaths=[...(itemData.photos||[]),...(single.photos||[]),...(basket.photos||[])].map(x=>typeof x==='string'?x:x?.path).filter(Boolean);
  const signedCustomer=customerPaths.length?await db.storage.from('quote-photos').createSignedUrls(customerPaths,3600):{data:[]};
  const customerMap=new Map((signedCustomer.data||[]).filter(x=>x.signedUrl).map(x=>[x.path,x.signedUrl]));
  const customerPhotos=customerPaths.map(path=>({path,signedUrl:customerMap.get(path)||''})).filter(x=>x.signedUrl);

  // The final sales page is deliberately not an editable inspection page.
  root.querySelector('#product-edit-section')?.remove();
  root.querySelector('#staff-photos-section')?.remove();
  root.querySelector('#sales-handoff-section')?.remove();
  root.querySelector('#sales-presentation-section')?.remove();
  root.querySelector('#product-history')?.remove();
  root.querySelectorAll('section.valuation-card').forEach(s=>{
    if((s.querySelector('h2')?.textContent||'').trim()==='1. Customer quote') s.remove();
  });

  const summary=document.createElement('section');
  summary.id='product-history'; summary.className='valuation-card'; summary.style.marginTop='1rem';
  summary.innerHTML='<p class="section-kicker">REFERENCE & INSPECTION HISTORY</p><h2>What has already happened</h2>'
    +'<p>Controlled history facts only. They cannot be edited from the listing stage.</p>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem">'
    +'<div class="notice"><strong>Original customer condition</strong><br>'+esc(originalCondition)+'</div>'
    +'<div class="notice"><strong>Condition after inspection</strong><br>'+esc(inspectedCondition)+'</div>'
    +'<div class="notice"><strong>Inspection result</strong><br>'+esc(inspection?.result||'Not recorded')+'</div>'
    +'<div class="notice"><strong>Inspection / testing</strong><br>'+esc(tested)+'</div>'
    +'<div class="notice"><strong>Inspected by</strong><br>'+esc(inspector)+'</div>'
    +'<div class="notice"><strong>Inspection date</strong><br>'+esc(inspectedAt?new Date(inspectedAt).toLocaleString('en-GB'):'Not recorded')+'</div>'
    +'<div class="notice"><strong>Price paid (reference only)</strong><br>'+esc(money(asset.purchase_price))+'</div>'
    +'</div>'+(originalNote?'<div class="notice" style="margin-top:1rem"><strong>Original customer condition / exception note</strong><br><small>'+esc(originalNote)+'</small></div>':'');
  if(repairRows.length) summary.innerHTML+='<details style="margin-top:1rem"><summary>Repair history ('+repairRows.length+')</summary>'+repairRows.map(r=>'<div class="notice" style="margin-top:.5rem"><strong>'+esc(r.repaired_at?new Date(r.repaired_at).toLocaleString('en-GB'):'Repair recorded')+'</strong><br>Fault: '+esc(r.fault_description||'Not recorded')+'<br>Repair: '+esc(r.repair_description||'Not recorded')+'</div>').join('')+'</details>';
  root.appendChild(summary);

  const defaultTitle=[asset.manufacturer,asset.model,asset.package_name].filter(Boolean).join(' ');
  const listing=document.createElement('section');
  listing.id='sales-listing-editor'; listing.className='valuation-card'; listing.style.marginTop='1rem';
  const selectedPaths=Array.isArray(item.listing_photo_paths)?item.listing_photo_paths:[];
  const selectedSet=new Set(selectedPaths);
  const customerPhotoHtml=customerPhotos.length?customerPhotos.map(p=>'<div class="notice" style="padding:.45rem"><a href="'+esc(p.signedUrl)+'" target="_blank" rel="noopener"><img src="'+esc(p.signedUrl)+'" alt="Customer photograph" style="width:100%;height:150px;object-fit:cover;border-radius:8px"></a><label style="display:block;margin-top:.4rem"><input type="checkbox" class="listing-photo-choice" value="'+esc(p.path)+'" '+(selectedSet.has(p.path)?'checked':'')+'> USE FOR SALE LISTING</label></div>').join(''):'<p>No customer photographs available.</p>';
  const staffPhotoHtml=signedPhotos.length?signedPhotos.map(p=>{
    const hero=item.hero_image_url===p.file_url;
    return '<div class="notice" style="padding:.45rem"><a href="'+esc(p.signedUrl)+'" target="_blank" rel="noopener"><img src="'+esc(p.signedUrl)+'" alt="Staff inspection photograph" style="width:100%;height:150px;object-fit:cover;border-radius:8px"></a><label style="display:block;margin-top:.4rem"><input type="checkbox" class="listing-photo-choice" value="'+esc(p.file_url)+'" '+(selectedSet.has(p.file_url)?'checked':'')+'> USE FOR SALE LISTING</label><div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.4rem"><button class="btn btn-secondary" type="button" data-set-hero="'+esc(p.file_url)+'">'+(hero?'ITEM HERO SELECTED':'USE AS ITEM HERO')+'</button><button class="btn btn-secondary" type="button" data-remove-photo="'+esc(p.id)+'" data-photo-path="'+esc(p.file_url)+'">REMOVE</button></div></div>';
  }).join(''):'<p>No staff photographs yet.</p>';

  listing.innerHTML='<p class="section-kicker">LISTING DETAILS</p><h2>Create and maintain the master listing</h2><p>Save these shared details once, then use the WEBSITE and marketplace buttons below. There is no Draft or Ready to Upload stage.</p>'
    +'<form id="master-listing-form" class="auth-form">'
    +'<div class="notice"><strong>Listing identity</strong><br>'+esc(defaultTitle||'Manufacturer and model not yet recorded')+'</div>'
    +(asset.catalog_product_id?'<label>Manufacturer / product description<textarea name="manufacturer_description" rows="6" placeholder="Pre-filled manufacturer/model information. Edit only if it needs correcting.">'+esc(item.manufacturer_description||catalog.product_description||'')+'</textarea></label>':'<label>Manufacturer / product description<textarea name="manufacturer_description" rows="6" placeholder="Add the product/manufacturer description needed for this item.">'+esc(item.manufacturer_description||'')+'</textarea></label>')
    +'<label>Our item description<textarea name="our_description" rows="7" placeholder="Describe this exact item for sale.">'+esc(item.listing_notes||asset.description||'')+'</textarea></label>'
    +'<label>Detailed staff condition description<textarea name="condition_description" rows="4" placeholder="Describe the staff-assessed cosmetic and functional condition for resale.">'+esc(item.condition_description||'')+'</textarea></label>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem">'
    +'<label>Number of batteries<input name="actual_battery_count" type="number" min="0" value="'+esc(asset.actual_battery_count??'')+'"></label>'
    +'<label>Missing parts / items<textarea name="missing_parts" rows="3" placeholder="Record anything the buyer will not receive.">'+esc(asset.package_notes||'')+'</textarea></label>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(140px,.45fr) minmax(140px,.45fr);gap:.75rem">'
    +'<label>Sale price (£)<input name="asking_price" type="number" min="0" step="0.01" value="'+esc(item.asking_price??asset.approved_resale_price??'')+'" required></label>'
    +'<label>Postage &amp; packing (£)<input name="postage_packing" type="number" min="0" step="0.01" value="'+esc(item.postage_packing??'0')+'"></label>'
    +'</div><div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-primary" type="submit">SAVE LISTING DETAILS</button><p id="master-listing-message" class="form-message" aria-live="polite"></p></div></form>'
    +'<h3 style="margin-top:1.25rem">Customer photographs</h3><p>Original photographs supplied with the valuation. Tick only the photographs you want used for sale listings.</p>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:1rem">'+customerPhotoHtml+'</div>'
    +'<h3>Staff inspection photographs</h3><p>Inspection photographs can also be selected for the sale listing, removed if no longer required, or used as the item hero.</p>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:1rem">'+staffPhotoHtml+'</div>'
    +'<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem"><button class="btn btn-secondary" type="button" id="save-photo-selection">SAVE PHOTO SELECTION</button><p id="photo-selection-message" class="form-message" aria-live="polite"></p></div>'
    +'<form id="listing-photo-form" class="auth-form"><label>Add / take photographs<input id="listing-photos" type="file" accept="image/*" capture="environment" multiple></label><button class="btn btn-secondary" type="submit">UPLOAD PHOTOGRAPHS</button><p id="listing-photo-message" class="form-message" aria-live="polite"></p></form>';
  root.appendChild(listing);

  async function saveMaster(form,heroOverride){
    const fd=new FormData(form), title=String(fd.get('listing_title')||defaultTitle).trim(), description=String(fd.get('our_description')||'').trim();
    const conditionDescription=String(fd.get('condition_description')||'').trim();
    const asking=fd.get('asking_price')===''?null:Number(fd.get('asking_price'));
    const postage=fd.get('postage_packing')===''?null:Number(fd.get('postage_packing'));
    const batteries=fd.get('actual_battery_count')===''?null:Number(fd.get('actual_battery_count'));
    const saved=await db.from('inventory_sales_content').upsert({
      asset_id:id,manufacturer_description:String(fd.get('manufacturer_description')||'').trim()||null,condition_description:conditionDescription||null,listing_notes:description||null,listing_title:title||null,
      listing_photo_paths:[...root.querySelectorAll('.listing-photo-choice:checked')].map(x=>x.value),
      asking_price:Number.isFinite(asking)?asking:null,postage_packing:Number.isFinite(postage)?postage:null,
      hero_image_url:heroOverride===undefined?(item.hero_image_url||null):heroOverride,updated_by:session.user.id,updated_at:new Date().toISOString()
    },{onConflict:'asset_id'});
    if(saved.error) return saved;
    const assetSave=await db.from('inventory_assets').update({
      description:description||null,
      approved_resale_price:Number.isFinite(asking)?asking:null,
      actual_battery_count:Number.isFinite(batteries)?batteries:null,
      package_notes:String(fd.get('missing_parts')||'').trim()||null,
      updated_at:new Date().toISOString()
    }).eq('id',id);
    if(assetSave.error) return assetSave;
    if(asset.catalog_product_id&&form.elements.manufacturer_description){
      const catalogSave=await db.from('catalog_sales_content').upsert({
        catalog_product_id:asset.catalog_product_id,product_description:String(fd.get('manufacturer_description')||'').trim()||null,
        hero_image_url:catalog.hero_image_url||null,manufacturer_image_url:catalog.manufacturer_image_url||null,
        source_attribution:catalog.source_attribution||null,created_by:catalog.created_by||session.user.id,updated_at:new Date().toISOString()
      },{onConflict:'catalog_product_id'});
      if(catalogSave.error) return catalogSave;
    }
    return {error:null};
  }

  root.querySelector('#master-listing-form').addEventListener('submit',async e=>{
    e.preventDefault(); const m=root.querySelector('#master-listing-message'); m.textContent='Saving listing details…'; m.className='form-message';
    const result=await saveMaster(e.currentTarget);
    m.textContent=result.error?result.error.message:'Listing details saved. WEBSITE and marketplace actions will use these details.';
    m.className='form-message'+(result.error?' error':' success');
    if(!result.error) document.dispatchEvent(new CustomEvent('gco:master-listing-saved',{detail:{assetId:id}}));
  });

  root.querySelector('#save-photo-selection')?.addEventListener('click',async()=>{
    const m=root.querySelector('#photo-selection-message');
    const paths=[...root.querySelectorAll('.listing-photo-choice:checked')].map(x=>x.value);
    m.textContent='Saving photograph selection…';m.className='form-message';
    const r=await db.from('inventory_sales_content').upsert({asset_id:id,listing_photo_paths:paths,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'asset_id'});
    m.textContent=r.error?r.error.message:'Photograph selection saved.';m.className='form-message'+(r.error?' error':' success');
  });

  root.querySelectorAll('[data-set-hero]').forEach(btn=>btn.addEventListener('click',async()=>{
    const result=await saveMaster(root.querySelector('#master-listing-form'),btn.dataset.setHero);
    if(result.error){alert(result.error.message);return;} location.reload();
  }));
  root.querySelectorAll('[data-remove-photo]').forEach(btn=>btn.addEventListener('click',async()=>{
    if(!confirm('Remove this staff photograph from the item record?')) return;
    const row=await db.from('inventory_evidence').delete().eq('id',btn.dataset.removePhoto).eq('asset_id',id);
    if(row.error){alert(row.error.message);return;}
    const storage=await db.storage.from('quote-photos').remove([btn.dataset.photoPath]);
    if(storage.error){alert(storage.error.message);return;} location.reload();
  }));
  root.querySelector('#listing-photo-form').addEventListener('submit',async e=>{
    e.preventDefault(); const files=[...(root.querySelector('#listing-photos').files||[])],m=root.querySelector('#listing-photo-message');
    if(!files.length){m.textContent='Choose at least one photograph.';m.className='form-message error';return;}
    m.textContent='Uploading photographs…';m.className='form-message';
    try{
      for(const file of files){
        const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path='inventory/'+id+'/'+Date.now()+'-'+crypto.randomUUID()+'-'+safe;
        const up=await db.storage.from('quote-photos').upload(path,file,{upsert:false}); if(up.error) throw up.error;
        const ev=await db.from('inventory_evidence').insert({asset_id:id,evidence_type:'Photographs',file_url:path,description:'Staff listing photograph',created_by:session.user.id});
        if(ev.error) throw ev.error;
      }
      m.textContent='Photographs uploaded.';m.className='form-message success';location.reload();
    }catch(error){m.textContent=error?.message||String(error);m.className='form-message error';}
  });
});