document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  const root = document.getElementById('asset-detail');
  if (!auth || !root) return;
  const session = await auth.getSession();
  if (!session) { location.href = 'login.html?return=inventory-detail.html'; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from('staff_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!staff) { root.innerHTML = '<p>You do not have permission to access inventory.</p>'; return; }
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { root.innerHTML = '<p>No asset selected.</p>'; return; }

  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money = v => v === null || v === undefined || v === '' ? 'Not recorded' : Number(v).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  const conditions = {'factory-sealed':'Factory Sealed / Unopened','opened-unused':'Opened but Unused',excellent:'Excellent',good:'Good',fair:'Fair',damaged:'Damaged','not-working':'Not Working / Spares Only'};
  const conditionOptions = Object.entries(conditions).map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
  const first = (o, keys) => { for (const k of keys) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return ''; };

  async function signed(paths) {
    const clean = [...new Set((paths || []).filter(Boolean))];
    if (!clean.length) return [];
    const { data } = await db.storage.from('quote-photos').createSignedUrls(clean, 3600);
    return (data || []).filter(x => x.signedUrl).map((x,i) => ({url:x.signedUrl,path:clean[i]}));
  }
  async function saveRecord(payload) {
    const { data: old } = await db.from('inventory_testing').select('id').eq('asset_id',id).eq('stage',payload.stage).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if (old?.id) return db.from('inventory_testing').update({...payload,updated_at:new Date().toISOString()}).eq('id',old.id);
    return db.from('inventory_testing').insert(payload);
  }

  async function load() {
    root.innerHTML = '<p>Loading product workbench…</p>';
    const { data: asset, error } = await db.from('inventory_assets').select('*').eq('id',id).single();
    if (error || !asset) { root.innerHTML = '<p>Asset could not be found.</p>'; return; }

    let quoteItem=null, valuation=null, profile=null;
    if (asset.source_quote_item_id) {
      quoteItem=(await db.from('quote_items').select('id,item_name,manufacturer,model,package,item_data,valuation_id').eq('id',asset.source_quote_item_id).maybeSingle()).data || null;
      if (quoteItem?.valuation_id) {
        valuation=(await db.from('valuations').select('id,quote_reference,quote_amount,condition,quote_data,user_id').eq('id',quoteItem.valuation_id).maybeSingle()).data || null;
        if (valuation?.user_id) profile=(await db.from('profiles').select('full_name').eq('id',valuation.user_id).maybeSingle()).data || null;
      }
    }
    const testingRows=(await db.from('inventory_testing').select('*').eq('asset_id',id).order('created_at',{ascending:false})).data || [];
    const evidenceRows=(await db.from('inventory_evidence').select('*').eq('asset_id',id).eq('evidence_type','Photographs').order('created_at',{ascending:true})).data || [];
    const inspection=testingRows.find(x=>x.stage==='inspection') || null;
    const testing=testingRows.find(x=>x.stage==='testing') || null;
    const itemData=quoteItem?.item_data && typeof quoteItem.item_data==='object' ? quoteItem.item_data : {};
    const quoteData=valuation?.quote_data && typeof valuation.quote_data==='object' ? valuation.quote_data : {};
    const single=itemData.singleItem || {};
    const customerName=profile?.full_name || quoteData.fullName || 'Not recorded';
    const customerCondition=asset.customer_condition || quoteData.condition || itemData.condition || single.condition || 'Not recorded';
    const customerPackage=asset.customer_package_name || quoteItem?.package || itemData.packageName || 'Not recorded';
    const customerMissing=Boolean(asset.customer_missing_items || itemData.missingItems || single.missingItems);
    const customerMissingDetails=asset.customer_missing_items_details || itemData.exceptionNotes || single.exceptionNotes || '';
    const customerDamage=Boolean(asset.customer_damage || itemData.damage || single.damage);
    const customerNotes=asset.customer_exception_notes || itemData.exceptionNotes || single.exceptionNotes || '';
    const customerDescription=first(itemData,['description','itemDescription']) || first(single,['description','itemDescription']) || '';
    const customerPhotos=await signed([...(itemData.photos||[]),...(single.photos||[])].map(x=>typeof x==='string'?x:x?.path));
    const staffPhotos=await signed(evidenceRows.map(x=>x.file_url));
    const status=asset.status || 'Awaiting Receipt';
    const missingResolved=!asset.customer_missing_items || asset.missing_items_resolved;
    const testsPass=testing && ['Passed','Not Applicable'].includes(testing.flight_test||'') && ['Passed','Not Applicable'].includes(testing.camera_test||'') && ['Good','Not Applicable'].includes(testing.battery_health||'');
    const canSend=status==='Ready for Resale' && Boolean(asset.condition_grade) && missingResolved && Boolean(asset.package_name || asset.final_package_contents) && Boolean(testsPass);

    const quoteCards=[
      ['Customer',customerName],['Quote reference',valuation?.quote_reference||'Not recorded'],['Quote amount',money(valuation?.quote_amount)],
      ['Category',first(quoteData,['category','categoryName'])||first(itemData,['category','categoryName'])||'Not recorded'],['Manufacturer',quoteItem?.manufacturer||asset.manufacturer||'Not recorded'],
      ['Model',quoteItem?.model||asset.model||'Not recorded'],['Package',customerPackage],['Customer condition',customerCondition]
    ].map(([k,v])=>`<div class="notice"><strong>${esc(k)}</strong><br>${esc(v)}</div>`).join('');
    const customerPhotoHtml=customerPhotos.length?customerPhotos.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(x.url)}" alt="Customer photograph" style="width:100%;height:130px;object-fit:cover;border-radius:8px"></a>`).join(''):'<p>No customer photographs available.</p>';
    const staffPhotoHtml=staffPhotos.length?staffPhotos.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(x.url)}" alt="Staff photograph" style="width:100%;height:130px;object-fit:cover;border-radius:8px"></a>`).join(''):'<p>No staff photographs yet.</p>';

    root.innerHTML=`
      <div class="valuation-card"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap"><div><p class="section-kicker">PRODUCT WORKBENCH · ${esc(status)}</p><h2>${esc([asset.manufacturer,asset.model].filter(Boolean).join(' ')||'Unnamed asset')}</h2><p>Asset ${esc(asset.asset_reference)} · Transaction ${esc(asset.transaction_number||'Not recorded')}</p></div><div style="display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn btn-secondary" href="inventory.html">BACK TO INVENTORY</a>${['Sent to Sales','Listed','Reserved'].includes(status)?`<a class="btn btn-primary" href="listing-readiness.html?id=${encodeURIComponent(id)}">OPEN SALES WORKBENCH</a>`:''}</div></div><div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:1rem"><span class="notice"><strong>1</strong> Customer quote</span><span class="notice"><strong>2</strong> Inspection & testing</span><span class="notice"><strong>3</strong> Photos & package</span><span class="notice"><strong>4</strong> Send to Sales</span></div></div>

      <section class="valuation-card" style="margin-top:1rem"><h2>1. Customer quote</h2><p>This is the original customer information carried into inventory. It is reference-only and is not overwritten by staff inspection.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem">${quoteCards}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin-top:1rem"><div class="notice"><strong>Missing items reported by customer</strong><br>${customerMissing?'YES':'No'}${customerMissingDetails?`<br><small>${esc(customerMissingDetails)}</small>`:''}</div><div class="notice"><strong>Damage reported by customer</strong><br>${customerDamage?'YES':'No'}${customerNotes?`<br><small>${esc(customerNotes)}</small>`:''}</div></div>${customerDescription?`<div class="notice" style="margin-top:1rem"><strong>Customer description</strong><p>${esc(customerDescription)}</p></div>`:''}<h3 style="margin-top:1.25rem">Customer photographs (${customerPhotos.length})</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">${customerPhotoHtml}</div></section>

      <section class="valuation-card" style="margin-top:1rem"><h2>2. Staff inspection & technical testing</h2><p>Compare the product with the customer quote and complete all checks here. There is no separate testing or product page to open.</p><form id="workbench-form" class="auth-form"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem"><label>Manufacturer<input name="manufacturer" value="${esc(asset.manufacturer||quoteItem?.manufacturer||'')}"></label><label>Model<input name="model" value="${esc(asset.model||quoteItem?.model||'')}"></label><label>Serial number<input name="serial_number" value="${esc(asset.serial_number||itemData.serialNumber||single.serialNumber||'')}"></label><label>Staff condition<select name="condition_grade"><option value="">Not recorded</option>${conditionOptions}</select></label></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem"><label>Expected batteries<input name="expected_battery_count" type="number" min="0" value="${asset.expected_battery_count??''}"></label><label>Actual batteries found<input name="actual_battery_count" type="number" min="0" value="${asset.actual_battery_count??''}"></label><label>Battery health<select name="battery_health"><option>Not Applicable</option><option>Good</option><option>Fair</option><option>Requires Replacement</option></select></label><label>Inspection result<select name="inspection_result"><option>Passed</option><option>Requires Attention</option><option>Failed</option></select></label></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem"><label>Flight test<select name="flight_test"><option>Not Applicable</option><option>Passed</option><option>Requires Attention</option><option>Failed</option></select></label><label>Camera / main function test<select name="camera_test"><option>Not Applicable</option><option>Passed</option><option>Requires Attention</option><option>Failed</option></select></label><label>Verification<span style="display:block;margin-top:.5rem"><input type="checkbox" name="serial_verified"> Serial verified</span><span style="display:block;margin-top:.5rem"><input type="checkbox" name="accessories_verified"> Accessories checked</span></label><label>Missing items<span style="display:block;margin-top:.5rem"><input type="checkbox" name="missing_items_resolved" ${asset.missing_items_resolved?'checked':''}> Resolved / replaced</span></label></div><label>Damage / defects found<textarea name="damage_notes" rows="4">${esc(testing?.damage_notes||inspection?.damage_notes||'')}</textarea></label><label>Items added / replaced<textarea name="items_added_replaced" rows="3" placeholder="Record any missing item, replacement or additional item supplied.">${esc(asset.items_added_replaced||'')}</textarea></label><label>Final package contents<textarea name="final_package_contents" rows="5" placeholder="Record exactly what the buyer will receive.">${esc(asset.final_package_contents||'')}</textarea></label><label>Package / resolution notes<textarea name="package_notes" rows="4">${esc(asset.package_notes||asset.missing_items_resolution||'')}</textarea></label><label>Resale description<textarea name="description" rows="6" placeholder="Improve the description before it reaches Sales.">${esc(asset.description||'')}</textarea></label><label>Technical / inspection notes<textarea name="testing_notes" rows="5">${esc(testing?.notes||inspection?.notes||'')}</textarea></label><div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-primary" type="submit">SAVE INSPECTION & TESTING</button><p id="workbench-message" class="form-message" aria-live="polite"></p></div></form></section>

      <section class="valuation-card" style="margin-top:1rem"><h2>3. Staff photographs</h2><p>Add inspection, damage, package and resale photographs without leaving the product.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:1rem">${staffPhotoHtml}</div><form id="photo-form" class="auth-form"><label>Add / take photographs<input id="workbench-photos" type="file" accept="image/*" capture="environment" multiple></label><button class="btn btn-secondary" type="submit">UPLOAD PHOTOGRAPHS</button><p id="photo-message" class="form-message" aria-live="polite"></p></form></section>

      <section class="valuation-card" style="margin-top:1rem"><h2>4. Complete & send to Sales</h2><div class="notice"><strong>Completion gate</strong><ul><li>Customer quote checked against item received.</li><li>Staff condition recorded.</li><li>Serial and battery counts checked where applicable.</li><li>Missing items resolved and final package contents recorded.</li><li>Technical tests completed.</li><li>Resale description is usable.</li></ul></div><div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem"><a class="btn btn-secondary" href="inventory.html">SAVE & RETURN TO INVENTORY</a>${canSend?'<button id="send-sales" class="btn btn-primary" type="button">SEND TO SALES</button>':'<button class="btn btn-primary" type="button" disabled>SEND TO SALES — COMPLETE WORKFLOW FIRST</button>'}</div><p id="send-message" class="form-message" aria-live="polite"></p></section>`;

    const setValue=(name,value)=>{const el=root.querySelector(`[name="${name}"]`);if(el&&value!==null&&value!==undefined&&value!=='')el.value=value;};
    setValue('condition_grade',asset.condition_grade); setValue('battery_health',testing?.battery_health||'Not Applicable'); setValue('inspection_result',inspection?.result||'Passed'); setValue('flight_test',testing?.flight_test||'Not Applicable'); setValue('camera_test',testing?.camera_test||'Not Applicable');
    root.querySelector('[name="serial_verified"]').checked=Boolean(inspection?.serial_verified||testing?.serial_verified);
    root.querySelector('[name="accessories_verified"]').checked=Boolean(inspection?.accessories_verified||testing?.accessories_verified);

    root.querySelector('#workbench-form').addEventListener('submit',async e=>{
      e.preventDefault(); const f=e.currentTarget,fd=new FormData(f),b=f.querySelector('button[type="submit"]'),m=root.querySelector('#workbench-message'); b.disabled=true;m.textContent='Saving inspection and testing…';m.className='form-message';
      const inspectResult=String(fd.get('inspection_result')||'Passed');
      const flight=String(fd.get('flight_test')||'Not Applicable'),camera=String(fd.get('camera_test')||'Not Applicable'),battery=String(fd.get('battery_health')||'Not Applicable');
      const testResult=(['Passed','Not Applicable'].includes(flight)&&['Passed','Not Applicable'].includes(camera)&&['Good','Not Applicable'].includes(battery))?'Passed':'Requires Attention';
      const missingResolved=fd.get('missing_items_resolved')==='on';
      const assetPayload={manufacturer:String(fd.get('manufacturer')||'').trim()||null,model:String(fd.get('model')||'').trim()||null,serial_number:String(fd.get('serial_number')||'').trim()||null,condition_grade:String(fd.get('condition_grade')||'').trim()||null,expected_battery_count:fd.get('expected_battery_count')===''?null:Number(fd.get('expected_battery_count')),actual_battery_count:fd.get('actual_battery_count')===''?null:Number(fd.get('actual_battery_count')),missing_items_resolved:missingResolved,items_added_replaced:String(fd.get('items_added_replaced')||'').trim()||null,final_package_contents:String(fd.get('final_package_contents')||'').trim()||null,package_notes:String(fd.get('package_notes')||'').trim()||null,description:String(fd.get('description')||'').trim()||null,updated_at:new Date().toISOString()};
      let r=await db.from('inventory_assets').update(assetPayload).eq('id',id); if(r.error){m.textContent=r.error.message;m.className='form-message error';b.disabled=false;return;}
      const common={asset_id:id,visual_condition:assetPayload.condition_grade,missing_items:!missingResolved,damage_notes:String(fd.get('damage_notes')||'').trim()||null,serial_verified:fd.get('serial_verified')==='on',accessories_verified:fd.get('accessories_verified')==='on',notes:String(fd.get('testing_notes')||'').trim()||null,created_by:session.user.id,updated_by:session.user.id};
      r=await saveRecord({...common,stage:'inspection',result:inspectResult}); if(r.error){m.textContent=r.error.message;m.className='form-message error';b.disabled=false;return;}
      r=await saveRecord({...common,stage:'testing',result:testResult,flight_test:flight,camera_test:camera,battery_health:battery}); if(r.error){m.textContent=r.error.message;m.className='form-message error';b.disabled=false;return;}
      try{
        let current=(await db.from('inventory_assets').select('status').eq('id',id).single()).data?.status;
        if(inspectResult==='Failed'&&['Received','Inspection Required'].includes(current)) current=(await window.AssetStateActions.transitionAsset(id,'Repair Required','Inspection failed in product workbench')).status;
        else if(inspectResult==='Passed'&&current==='Received') current=(await window.AssetStateActions.transitionAsset(id,'Inspection Required','Inspection completed in product workbench')).status;
        if(inspectResult==='Passed'&&current==='Inspection Required') current=(await window.AssetStateActions.transitionAsset(id,'Testing','Technical testing started from product workbench')).status;
        if(testResult==='Passed'&&current==='Testing') await window.AssetStateActions.transitionAsset(id,'Ready for Resale','Inspection and testing completed in product workbench');
        else if(testResult!=='Passed'&&current==='Testing') await window.AssetStateActions.transitionAsset(id,'Repair Required','Technical testing requires attention');
      }catch(err){m.textContent=err.message;m.className='form-message error';b.disabled=false;return;}
      m.textContent='Inspection, testing and product details saved.';m.className='form-message success';b.disabled=false;setTimeout(load,450);
    });

    root.querySelector('#photo-form').addEventListener('submit',async e=>{
      e.preventDefault(); const f=e.currentTarget,files=[...root.querySelector('#workbench-photos').files],b=f.querySelector('button'),m=root.querySelector('#photo-message');
      if(!files.length){m.textContent='Select or take at least one photograph.';m.className='form-message error';return;} b.disabled=true;m.textContent='Uploading photographs…';m.className='form-message';
      try{for(const file of files){const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const path=`${session.user.id}/inventory/${id}/${Date.now()}-${crypto.randomUUID()}-${safe}`;const up=await db.storage.from('quote-photos').upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;const ev=await db.from('inventory_evidence').insert({asset_id:id,evidence_type:'Photographs',file_url:path,description:'Staff inspection / resale photograph',created_by:session.user.id});if(ev.error)throw ev.error;}m.textContent='Photographs added to this product.';m.className='form-message success';setTimeout(load,450);}catch(err){m.textContent=err?.message||'Could not upload photographs.';m.className='form-message error';}finally{b.disabled=false;}
    });

    const send=root.querySelector('#send-sales');
    if(send) send.addEventListener('click',async()=>{const m=root.querySelector('#send-message');send.disabled=true;m.textContent='Checking the completed product and sending to Sales…';m.className='form-message';const {data,error}=await db.rpc('staff_send_inventory_to_sales',{p_asset_id:id});if(error){m.textContent=error.message;m.className='form-message error';send.disabled=false;return;}m.textContent=`Sent to Sales${data?.transaction_number?` · ${data.transaction_number}`:''}.`;m.className='form-message success';setTimeout(()=>location.href=`listing-readiness.html?id=${encodeURIComponent(id)}`,500);});
  }
  await load();
});
