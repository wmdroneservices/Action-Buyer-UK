document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth, box = document.getElementById('readiness');
  if (!auth || !box) return;
  const session = await auth.getSession();
  if (!session) { location.href = 'login.html?return=listing-readiness.html'; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from('staff_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = '<p>You do not have permission to access Sales Channels.</p>'; return; }
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { box.innerHTML = '<p>No asset selected.</p>'; return; }
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money = n => n === null || n === undefined || n === '' ? '' : Number(n).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  const channels = ['Marketplace','eBay','Website','Facebook Marketplace','Vinted','Amazon','Central','Other'];
  const statuses = ['Draft','Ready For Listing','Published','Reserved','Cancelled','Delist Required'];
  const active = ['Draft','Ready For Listing','Published','Reserved','Delist Required'];

  async function signedUrls(records) {
    const paths = records.map(x => x.file_url).filter(Boolean);
    if (!paths.length) return [];
    const { data } = await db.storage.from('quote-photos').createSignedUrls(paths,3600);
    return (data || []).map((x,i)=>({...x,record:records[i]})).filter(x=>x.signedUrl);
  }

  async function load() {
    const [{ data: asset, error }, { data: listings }, { data: inspection }, { data: testing }, { data: evidence }, { data: prep }] = await Promise.all([
      db.from('inventory_assets').select('*').eq('id',id).single(),
      db.from('resale_listings').select('*').eq('asset_id',id).order('sales_channel'),
      db.from('inventory_testing').select('*').eq('asset_id',id).eq('stage','inspection').order('created_at',{ascending:false}).limit(1).maybeSingle(),
      db.from('inventory_testing').select('*').eq('asset_id',id).eq('stage','testing').order('created_at',{ascending:false}).limit(1).maybeSingle(),
      db.from('inventory_evidence').select('*').eq('asset_id',id).eq('evidence_type','Photographs').order('created_at',{ascending:true}),
      db.from('inventory_preparation').select('*').eq('asset_id',id).order('created_at',{ascending:false}).limit(1).maybeSingle()
    ]);
    if (error || !asset) { box.innerHTML='<p>Asset could not be found.</p>'; return; }

    const photos = await signedUrls(evidence || []);
    const inspectionPassed = inspection?.result === 'Passed';
    const testingPassed = Boolean(testing && ['Passed','Not Applicable'].includes(testing.flight_test || '') && ['Passed','Not Applicable'].includes(testing.camera_test || '') && ['Good','Not Applicable'].includes(testing.battery_health || ''));
    const missingResolved = !asset.customer_missing_items || asset.missing_items_resolved;
    const checks = {
      sentToSales: ['Sent to Sales','Listed','Reserved'].includes(asset.status),
      inspectionPassed,
      testingPassed,
      staffCondition: Boolean(asset.condition_grade),
      photos: photos.length > 0,
      package: Boolean(asset.package_name),
      missingItemsResolved: missingResolved,
      purchasePrice: asset.purchase_price !== null && asset.purchase_price !== undefined,
      resalePrice: Number(asset.approved_resale_price || 0) > 0,
      preparation: Boolean(prep)
    };
    const labels = {sentToSales:'Asset has been sent to Sales by staff',inspectionPassed:'Inspection passed',testingPassed:'Technical testing passed',staffCondition:'Staff condition recorded',photos:'Photographs stored',package:'Package recorded',missingItemsResolved:'Customer missing items resolved',purchasePrice:'Purchase price recorded',resalePrice:'Approved resale price recorded',preparation:'Resale preparation completed'};
    const failed = Object.entries(checks).filter(([,v])=>!v).map(([k])=>labels[k]);
    const ready = failed.length===0;
    const rows = listings || [];
    const listingMap = Object.fromEntries(rows.map(x=>[x.sales_channel,x]));
    const titleDefault = [asset.manufacturer,asset.model,asset.package_name].filter(Boolean).join(' — ');
    const descriptionDefault = [
      [asset.manufacturer,asset.model].filter(Boolean).join(' '),
      asset.package_name ? `Package: ${asset.package_name}` : '',
      `Staff condition: ${asset.condition_grade || 'Not recorded'}`,
      asset.final_package_contents ? `Package contents: ${asset.final_package_contents}` : '',
      asset.serial_number ? `Serial number: ${asset.serial_number}` : '',
      asset.actual_battery_count != null ? `Batteries included: ${asset.actual_battery_count}` : ''
    ].filter(Boolean).join('\n\n');

    box.innerHTML = `<div class="valuation-card"><p class="section-kicker">SALES CHANNEL WORKFLOW</p><h2>${esc([asset.manufacturer,asset.model].filter(Boolean).join(' ')||'Asset')}</h2><p>Transaction: <strong>${esc(asset.transaction_number)}</strong> · Asset: <strong>${esc(asset.asset_reference)}</strong> · Status: <strong>${esc(asset.status)}</strong></p><p>Purchase Inventory ends when staff use <strong>Send to Sales</strong>. Only items in the Sales workflow appear here.</p><ul class="check-list">${Object.entries(checks).map(([k,v])=>`<li>${v?'✓':'✕'} ${esc(labels[k])}</li>`).join('')}</ul>${ready?'<div class="form-message success">All checks passed. Staff can list this product on the relevant sales channels.</div>':`<div class="form-message error">This product cannot be listed yet. Complete: ${esc(failed.join(', '))}</div>`}</div>
    <div class="valuation-card" style="margin-top:1rem"><h2>Product master data</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem"><p><strong>Manufacturer</strong><br>${esc(asset.manufacturer)}</p><p><strong>Model</strong><br>${esc(asset.model)}</p><p><strong>Package</strong><br>${esc(asset.package_name||'Not recorded')}</p><p><strong>Staff condition</strong><br>${esc(asset.condition_grade||'Not recorded')}</p><p><strong>Customer condition</strong><br>${esc(asset.customer_condition||'Not recorded')}</p><p><strong>Purchase cost</strong><br>${money(asset.purchase_price)}</p><p><strong>Approved resale</strong><br>${money(asset.approved_resale_price)}</p><p><strong>Serial</strong><br>${esc(asset.serial_number||'Not recorded')}</p></div><p><strong>Final package contents</strong><br>${esc(asset.final_package_contents||'Not recorded')}</p></div>
    <div class="valuation-card" style="margin-top:1rem"><h2>Photographs</h2>${photos.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">${photos.map(x=>`<a href="${esc(x.signedUrl)}" target="_blank" rel="noopener"><img src="${esc(x.signedUrl)}" alt="Product photograph" style="width:100%;height:150px;object-fit:cover;border-radius:8px"></a>`).join('')}</div>`:'<p>No photographs stored.</p>'}</div>
    <div class="valuation-card" style="margin-top:1rem"><h2>Sales Channels</h2><p>Choose the channels where staff actually intend to list the product. Saving a channel does not recreate purchase inventory; the asset remains in the Sales workflow until sold.</p>${channels.map(channel=>{const row=listingMap[channel]||{};const sold=row.status==='Sold';return `<article class="notice" style="margin-top:1rem;${row.status==='Delist Required'?'border:2px solid #b42318':''}"><h3>${esc(channel)}</h3>${sold?'<p class="form-message error"><strong>SOLD — do not relist.</strong></p>':''}<form class="channel-form" data-id="${esc(row.id||'')}" data-channel="${esc(channel)}" style="display:grid;gap:.75rem"><label>Listing title<input name="listing_title" value="${esc(row.listing_title||titleDefault)}" required></label><label>Listing description<textarea name="listing_description" rows="7" required>${esc(row.listing_description||descriptionDefault)}</textarea></label><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;align-items:end"><label>External listing reference<input name="listing_reference" value="${esc(row.listing_reference||'')}"></label><label>Asking price<input name="asking_price" type="number" min="0" step="0.01" value="${esc(row.asking_price ?? asset.approved_resale_price ?? '')}" required></label><label>Status<select name="status">${statuses.map(s=>`<option value="${esc(s)}" ${(row.status===s)||(!row.status&&s==='Draft')?'selected':''}>${esc(s)}</option>`).join('')}</select></label><button class="btn btn-primary" type="submit">SAVE CHANNEL LISTING</button></div><p class="form-message channel-message" aria-live="polite"></p></form>${row.id&&!sold?`<button type="button" class="btn btn-secondary mark-sold" data-id="${esc(row.id)}" style="margin-top:.75rem">MARK SOLD</button>`:''}${row.status==='Delist Required'?`<button type="button" class="btn btn-secondary cancel-listing" data-id="${esc(row.id)}" style="margin-top:.75rem">MARK DELISTED</button>`:''}</article>`;}).join('')}</div>`;

    box.querySelectorAll('.channel-form').forEach(form=>form.addEventListener('submit',async event=>{
      event.preventDefault();
      const fd=new FormData(form), message=form.querySelector('.channel-message'), button=form.querySelector('button[type=submit]'), channel=form.dataset.channel, listingId=form.dataset.id||null, status=String(fd.get('status')||'Draft');
      if (!ready && !listingId) { message.textContent='Complete the inspection, testing, package and preparation checks before creating a sales-channel listing.'; message.className='form-message error'; return; }
      if (!['Sent to Sales','Listed','Reserved'].includes(asset.status)) { message.textContent='This product has not been sent to Sales. Use Send to Sales from the inventory item first.'; message.className='form-message error'; return; }
      button.disabled=true; message.textContent='Saving channel listing…'; message.className='form-message';
      const payload={asset_id:id,sales_channel:channel,listing_reference:String(fd.get('listing_reference')||'').trim()||null,status,asking_price:Number(fd.get('asking_price')||0),listing_title:String(fd.get('listing_title')||'').trim(),listing_description:String(fd.get('listing_description')||'').trim(),listing_data:{transaction_number:asset.transaction_number,manufacturer:asset.manufacturer,model:asset.model,package_name:asset.package_name,staff_condition:asset.condition_grade,customer_condition:asset.customer_condition,final_package_contents:asset.final_package_contents,serial_number:asset.serial_number,actual_battery_count:asset.actual_battery_count}};
      const response=listingId?await db.from('resale_listings').update({...payload,updated_at:new Date().toISOString()}).eq('id',listingId).select().single():await db.from('resale_listings').insert(payload).select().single();
      if(response.error){message.textContent=response.error.message;message.className='form-message error';button.disabled=false;return;}
      try{
        if(status==='Published' && asset.status==='Sent to Sales') await window.AssetStateActions.transitionAsset(id,'Listed','Product listed on sales channel');
        else if(status==='Reserved' && ['Sent to Sales','Listed'].includes(asset.status)) await window.AssetStateActions.transitionAsset(id,'Reserved','Product reserved on sales channel');
        else if(['Draft','Ready For Listing','Cancelled','Delist Required'].includes(status) && ['Listed','Reserved'].includes(asset.status)) await window.AssetStateActions.transitionAsset(id,'Sent to Sales','Sales channel listing removed from active sale');
      }catch(stateError){message.textContent=stateError.message;message.className='form-message error';button.disabled=false;return;}
      message.textContent='Sales-channel listing saved.';message.className='form-message success';button.disabled=false;setTimeout(load,350);
    }));

    box.querySelectorAll('.mark-sold').forEach(button=>button.addEventListener('click',async()=>{
      const soldPrice=prompt('Actual sold price (£):'); if(soldPrice===null)return;
      const price=Number(soldPrice); if(!Number.isFinite(price)||price<0){alert('Enter a valid sold price.');return;}
      const fees=Number(prompt('Selling fees (£):','0')||0), shipping=Number(prompt('Shipping cost (£):','0')||0);
      button.disabled=true;
      const {error}=await db.rpc('staff_mark_resale_listing_sold',{p_listing_id:button.dataset.id,p_sold_price:price,p_selling_fees:Number.isFinite(fees)?fees:0,p_shipping_cost:Number.isFinite(shipping)?shipping:0});
      if(error){alert(error.message);button.disabled=false;return;}
      load();
    }));
    box.querySelectorAll('.cancel-listing').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;const {error}=await db.from('resale_listings').update({status:'Cancelled',updated_at:new Date().toISOString()}).eq('id',button.dataset.id);if(error){alert(error.message);button.disabled=false;return;}load();}));
  }
  await load();
});
