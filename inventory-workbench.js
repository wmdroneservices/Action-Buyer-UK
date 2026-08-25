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
  const val = (obj, ...keys) => { for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]; return ''; };

  async function signPaths(paths) {
    const clean = [...new Set((paths || []).filter(Boolean))];
    if (!clean.length) return [];
    const { data } = await db.storage.from('quote-photos').createSignedUrls(clean, 3600);
    return (data || []).filter(x => x.signedUrl).map((x,i) => ({ url:x.signedUrl, path:clean[i] }));
  }

  async function load() {
    root.innerHTML = '<div class="account-panel"><p>Loading product workbench…</p></div>';
    const { data: asset, error } = await db.from('inventory_assets').select('*').eq('id',id).single();
    if (error || !asset) { root.innerHTML = '<p>Asset could not be found.</p>'; return; }

    let quoteItem = null, valuation = null, profile = null;
    if (asset.source_quote_item_id) {
      const q = await db.from('quote_items').select('id,item_name,manufacturer,model,package,item_status,item_data,valuation_id').eq('id',asset.source_quote_item_id).maybeSingle();
      quoteItem = q.data || null;
      if (quoteItem?.valuation_id) {
        const v = await db.from('valuations').select('id,quote_reference,quote_amount,condition,quote_data,user_id').eq('id',quoteItem.valuation_id).maybeSingle();
        valuation = v.data || null;
        if (valuation?.user_id) profile = (await db.from('profiles').select('full_name').eq('id',valuation.user_id).maybeSingle()).data || null;
      }
    }

    const [{ data: testingRows }, { data: evidenceRows }] = await Promise.all([
      db.from('inventory_testing').select('*').eq('asset_id',id).order('created_at',{ascending:false}),
      db.from('inventory_evidence').select('*').eq('asset_id',id).eq('evidence_type','Photographs').order('created_at',{ascending:true})
    ]);
    const inspections = testingRows || [];
    const inspection = inspections.find(x => x.stage === 'inspection') || null;
    const testing = inspections.find(x => x.stage === 'testing') || null;
    const itemData = quoteItem?.item_data && typeof quoteItem.item_data === 'object' ? quoteItem.item_data : {};
    const quoteData = valuation?.quote_data && typeof valuation.quote_data === 'object' ? valuation.quote_data : {};
    const customerItem = itemData.singleItem || {};
    const customerName = profile?.full_name || quoteData.fullName || 'Not recorded';
    const customerDescription = val(itemData,'description','itemDescription') || val(customerItem,'description','itemDescription') || '';
    const customerPhotos = await signPaths([...(itemData.photos || []), ...(customerItem.photos || [])].map(x => typeof x === 'string' ? x : x?.path));
    const staffPhotos = await signPaths((evidenceRows || []).map(x => x.file_url));

    const currentStatus = asset.status || 'Awaiting Receipt';
    const inspectionPassed = inspection?.result === 'Passed';
    const testingPassed = testing && ['Passed','Not Applicable'].includes(testing.flight_test || '') && ['Passed','Not Applicable'].includes(testing.camera_test || '') && ['Good','Not Applicable'].includes(testing.battery_health || '');
    const missingResolved = !asset.customer_missing_items || asset.missing_items_resolved;
    const readyToSend = ['Ready for Resale'].includes(currentStatus) && Boolean(asset.condition_grade) && missingResolved && Boolean(asset.package_name || asset.final_package_contents);

    const customerCondition = val(asset,'customer_condition') || val(quoteData,'condition') || val(itemData,'condition') || val(customerItem,'condition') || 'Not recorded';
    const customerPackage = asset.customer_package_name || quoteItem?.package || itemData.packageName || 'Not recorded';
    const customerMissing = Boolean(asset.customer_missing_items || itemData.missingItems || customerItem.missingItems);
    const customerMissingDetails = asset.customer_missing_items_details || itemData.exceptionNotes || customerItem.exceptionNotes || '';
    const customerDamage = Boolean(asset.customer_damage || itemData.damage || customerItem.damage);
    const customerNotes = asset.customer_exception_notes || itemData.exceptionNotes || customerItem.exceptionNotes || '';

    const quoteSummary = [
      ['Customer', customerName], ['Quote reference', valuation?.quote_reference || 'Not recorded'], ['Quote amount', money(valuation?.quote_amount)],
      ['Category', val(quoteData,'category','categoryName') || val(itemData,'category','categoryName') || 'Not recorded'], ['Manufacturer', quoteItem?.manufacturer || asset.manufacturer || 'Not recorded'],
      ['Model', quoteItem?.model || asset.model || 'Not recorded'], ['Package', customerPackage], ['Customer condition', customerCondition]
    ];

    root.innerHTML = `
      <div class="valuation-card">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap">
          <div><p class="section-kicker">PRODUCT WORKBENCH · ${esc(currentStatus)}</p><h2>${esc([asset.manufacturer,asset.model].filter(Boolean).join(' ') || 'Unnamed asset')}</h2><p>Asset ${esc(asset.asset_reference)} · Transaction ${esc(asset.transaction_number || 'Not recorded')}</p></div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn btn-secondary" href="inventory.html">BACK TO INVENTORY</a>${['Sent to Sales','Listed','Reserved'].includes(currentStatus) ? `<a class="btn btn-primary" href="listing-readiness.html?id=${encodeURIComponent(id)}">OPEN SALES WORKBENCH</a>` : ''}</div>
        </div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:1rem"><span class="notice"><strong>1</strong> Customer quote</span><span class="notice"><strong>2</strong> Staff inspection & testing</span><span class="notice"><strong>3</strong> Photos & package</span><span class="notice"><strong>4</strong> Send to Sales</span></div>
      </div>

      <section class="valuation-card" style="margin-top:1rem"><h2>1. Customer quote — reference only</h2><p>Everything below is carried forward from the original customer quote. Staff do not overwrite the customer record.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem">${quoteSummary.map(([k,v])=>`<div class="notice"><strong>${esc(k)}</strong><br>${esc(v)}</div>`).join('')}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin-top:1rem"><div class="notice"><strong>Customer reported missing items</strong><br>${customerMissing?'YES':'No'}${customerMissingDetails?`<br><small>${esc(customerMissingDetails)}</small>`:''}</div><div class="notice"><strong>Customer reported damage</strong><br>${customerDamage?'YES':'No'}${customerNotes?`<br><small>${esc(customerNotes)}</small>`:''}</div></div>
        ${customerDescription ? `<div class="notice" style="margin-top:1rem"><strong>Customer description</strong><p>${esc(customerDescription)}</p></div>` : ''}
        <h3 style="margin-top:1.25rem">Customer photographs (${customerPhotos.length})</h3>${customerPhotos.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">${customerPhotos.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(x.url)}" alt="Customer supplied photograph" style="width:100%;height:130px;object-fit:cover;border-radius:8px"></a>`).join('')}</div>`:'<p>No customer photographs available.</p>'}
      </section>

      <section class="valuation-card" style="margin-top:1rem"><h2>2. Staff inspection & technical testing</h2><p>Compare the physical item with the customer quote, record what is actually present, and complete the technical checks here. There is no separate testing page.</p>
        <form id="workbench-form" class="auth-form">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem"><label>Manufacturer<input name="manufacturer" value="${esc(asset.manufacturer||quoteItem?.manufacturer||'')}"></label><label>Model<input name="model" value="${esc(asset.model||quoteItem?.model||'')}"></label><label>Serial number<input name="serial_number" value="${esc(asset.serial_number||itemData.serialNumber||customerItem.serialNumber||'')}></label><label>Staff condition<select name="condition_grade"><option value="">Not recorded</option>${conditionOptions}</select></label></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem"><label>Expected batteries<input name="expected_battery_count" type="number" min="0" value="${asset.expected_battery_count ?? ''}"></label><label>Actual batteries found<input name="actual_battery_count" type="number" min="0" value="${asset.actual_battery_count ?? ''}"></label><label>Battery health<select name="battery_health"><option>Not Applicable</option><option>Good</option><option>Fair</option><option>Requires Replacement</option></select></label><label>Inspection result<select name="inspection_result"><option>Passed</option><option>Requires Attention</option><option>Failed</option></select></label></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem"><label>Flight test<select name="flight_test"><option>Not Applicable</option><option>Passed</option><option>Requires Attention</option><option>Failed</option></select></label><label>Camera / main function test<select name="camera_test"><option>Not Applicable</option><option>Passed</option><option>Requires Attention</option><option>Failed</option></select></label><label><span>Checks</span><span style="display:block;margin-top:.5rem"><input type="checkbox" name="serial_verified"> Serial verified</span><span style="display:block;margin-top:.5rem"><input type="checkbox" name="accessories_verified"> Accessories checked</span></label><label><span>Customer missing items</span><span style="display:block;margin-top:.5rem"><input type="checkbox" name="missing_items_resolved" ${asset.missing_items_resolved?'checked':''}> Resolved / replaced</span></label></div>
          <label>Damage / defects found<textarea name="damage_notes" rows="4">${esc(testing?.damage_notes || inspection?.damage_notes || '')}</textarea></label>
          <label>Items added / replaced<textarea name="items_added_replaced" rows="3" placeholder="Record any missing item, replacement or additional item supplied.">${esc(asset.items_added_replaced||'')}</textarea></label>
          <label>Final package contents<textarea name="final_package_contents" rows="5" placeholder="Record exactly what the buyer will receive.">${esc(asset.final_package_contents||'')}</textarea></label>
          <label>Package / resolution notes<textarea name="package_notes" rows="4">${esc(asset.package_notes||asset.missing_items_resolution||'')}</textarea></label>
          <label>Resale description<textarea name="description" rows="6" placeholder="Internal master description. Improve it before the product reaches Sales.">${esc(asset.description||'')}</textarea></label>
          <label>Technical / inspection notes<textarea name="testing_notes" rows="5">${esc(testing?.notes||inspection?.notes||'')}</textarea></label>
          <div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-primary" type="submit">SAVE INSPECTION & TESTING</button><p id="workbench-message" class="form-message" aria-live="polite"></p></div>
        </form>
      </section>

      <section class="valuation-card" style="margin-top:1rem"><h2>3. Staff photographs</h2><p>Add inspection, damage, package or resale photographs without leaving this product.</p>${staffPhotos.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:1rem">${staffPhotos.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(x.url)}" alt="Staff photograph" style="width:100%;height:130px;object-fit:cover;border-radius:8px"></a>`).join('')}</div>`:'<p>No staff photographs yet.</p>'}<form id="photo-form" class="auth-form"><label>Add / take photographs<input id="workbench-photos" type="file" accept="image/*" capture="environment" multiple></label><button class="btn btn-secondary" type="submit">UPLOAD PHOTOGRAPHS</button><p id="photo-message" class="form-message" aria-live="polite"></p></form></section>

      <section class="valuation-card" style="margin-top:1rem"><h2>4. Complete & send to Sales</h2><div class="notice"><strong>Before sending:</strong><ul><li>Customer quote checked against the item received.</li><li>Staff condition recorded.</li><li>Serial and battery counts checked where applicable.</li><li>Missing items resolved and final package contents recorded.</li><li>Technical tests completed.</li><li>Resale description is usable.</li></ul></div><div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem"><a class="btn btn-secondary" href="inventory.html">SAVE & RETURN TO INVENTORY</a>${readyToSend?'<button id="send-sales" class="btn btn-primary" type="button">SEND TO SALES</button>':'<button class="btn btn-primary" type="button" disabled>SEND TO SALES — COMPLETE WORKFLOW FIRST</button>'}</div><p id="send-message" class="form-message" aria-live="polite"></p></section>
    `;

    const condition = root.querySelector('[name="condition_grade"]'); if (condition) condition.value = asset.condition_grade || '';
    const batteryHealth = root.querySelector('[name="battery_health"]'); if (batteryHealth) batteryHealth.value = testing?.battery_health || 'Not Applicable';
    const inspectionResult = root.querySelector('[name="inspection_result"]'); if (inspectionResult) inspectionResult.value = inspection?.result || 'Passed';
    const flight = root.querySelector('[name="flight_test"]'); if (flight) flight.value = testing?.flight_test || 'Not Applicable';
    const camera = root.querySelector('[name="camera_test"]'); if (camera) camera.value = testing?.camera_test || 'Not Applicable';
    const serialVerified = root.querySelector('[name="serial_verified"]'); if (serialVerified) serialVerified.checked = Boolean(inspection?.serial_verified || testing?.serial_verified);
    const accessoriesVerified = root.querySelector('[name="accessories_verified"]'); if (accessoriesVerified) accessoriesVerified.checked = Boolean(inspection?.accessories_verified || testing?.accessories_verified);

    root.querySelector('#workbench-form').addEventListener('submit', async e => {
      e.preventDefault();
      const form=e.currentTarget, fd=new FormData(form), button=form.querySelector('button[type="submit"]'), msg=root.querySelector('#workbench-message');
      button.disabled=true; msg.textContent='Saving inspection and testing…'; msg.className='form-message';
      const inspectionPayload={asset_id:id,stage:'inspection',result:String(fd.get('inspection_result')||'Passed'),visual_condition:String(fd.get('condition_grade')||'').trim()||null,missing_items:!Boolean(fd.get('missing_items_resolved')==='on'),damage_notes:String(fd.get('damage_notes')||'').trim()||null,serial_verified:fd.get('serial_verified')==='on',accessories_verified:fd.get('accessories_verified')==='on',notes:String(fd.get('testing_notes')||'').trim()||null,created_by:session.user.id,updated_by:session.user.id};
      const testingPayload={asset_id:id,stage:'testing',result:(fd.get('flight_test')==='Passed'||fd.get('flight_test')==='Not Applicable')&&(fd.get('camera_test')==='Passed'||fd.get('camera_test')==='Not Applicable')&&(fd.get('battery_health')==='Good'||fd.get('battery_health')==='Not Applicable')?'Passed':'Requires Attention',visual_condition:String(fd.get('condition_grade')||'').trim()||null,missing_items:!Boolean(fd.get('missing_items_resolved')==='on'),damage_notes:String(fd.get('damage_notes')||'').trim()||null,serial_verified:fd.get('serial_verified')==='on',accessories_verified:fd.get('accessories_verified')==='on',flight_test:String(fd.get('flight_test')||''),camera_test:String(fd.get('camera_test')||''),battery_health:String(fd.get('battery_health')||''),notes:String(fd.get('testing_notes')||'').trim()||null,created_by:session.user.id,updated_by:session.user.id};
      const assetPayload={manufacturer:String(fd.get('manufacturer')||'').trim()||null,model:String(fd.get('model')||'').trim()||null,serial_number:String(fd.get('serial_number')||'').trim()||null,condition_grade:String(fd.get('condition_grade')||'').trim()||null,expected_battery_count:fd.get('expected_battery_count')===''?null:Number(fd.get('expected_battery_count')),actual_battery_count:fd.get('actual_battery_count')===''?null:Number(fd.get('actual_battery_count')),missing_items_resolved:fd.get('missing_items_resolved')==='on',items_added_replaced:String(fd.get('items_added_replaced')||'').trim()||null,final_package_contents:String(fd.get('final_package_contents')||'').trim()||null,package_notes:String(fd.get('package_notes')||'').trim()||null,description:String(fd.get('description')||'').trim()||null,updated_at:new Date().toISOString()};
      let result;
      const saveRecord=async payload=>{const {data}=await db.from('inventory_testing').select('id').eq('asset_id',id).eq('stage',payload.stage).order('created_at',{ascending:false}).limit(1).maybeSingle();return data?.id?db.from('inventory_testing').update({...payload,updated_at:new Date().toISOString()}).eq('id',data.id):db.from('inventory_testing').insert(payload);};
      const a=await db.from('inventory_assets').update(assetPayload).eq('id',id); if(a.error){msg.textContent=a.error.message;msg.className='form-message error';button.disabled=false;return;}
      result=await saveRecord(inspectionPayload); if(result.error){msg.textContent=result.error.message;msg.className='form-message error';button.disabled=false;return;}
      result=await saveRecord(testingPayload); if(result.error){msg.textContent=result.error.message;msg.className='form-message error';button.disabled=false;return;}
      try {
        const current=(await db.from('inventory_assets').select('status').eq('id',id).single()).data?.status;
        if (inspectionPayload.result==='Failed' && ['Received','Inspection Required'].includes(current)) await window.AssetStateActions.transitionAsset(id,'Repair Required','Inspection failed during product workbench review');
        else if (inspectionPayload.result==='Passed' && current==='Received') await window.AssetStateActions.transitionAsset(id,'Inspection Required','Inspection started from product workbench');
        const after=(await db.from('inventory_assets').select('status').eq('id',id).single()).data?.status;
        if (inspectionPayload.result==='Passed' && after==='Inspection Required') await window.AssetStateActions.transitionAsset(id,'Testing','Inspection completed; technical testing started from product workbench');
        const afterTesting=(await db.from('inventory_assets').select('status').eq('id',id).single()).data?.status;
        if (testingPayload.result==='Passed' && afterTesting==='Testing') await window.AssetStateActions.transitionAsset(id,'Ready for Resale','Inspection and technical testing completed in product workbench');
        else if (testingPayload.result!=='Passed' && afterTesting==='Testing') await window.AssetStateActions.transitionAsset(id,'Repair Required','Technical testing requires attention');
      } catch(stateError) { msg.textContent=stateError.message; msg.className='form-message error'; button.disabled=false; return; }
      msg.textContent='Inspection, testing and product details saved.'; msg.className='form-message success'; button.disabled=false; setTimeout(load,500);
    });

    root.querySelector('#photo-form').addEventListener('submit', async e=>{
      e.preventDefault(); const form=e.currentTarget, files=[...root.querySelector('#workbench-photos').files], msg=root.querySelector('#photo-message'), button=form.querySelector('button');
      if(!files.length){msg.textContent='Select or take at least one photograph.';msg.className='form-message error';return;}
      button.disabled=true; msg.textContent='Uploading photographs…'; msg.className='form-message';
      try { for(const file of files){const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const path=`${session.user.id}/inventory/${id}/${Date.now()}-${crypto.randomUUID()}-${safe}`;const up=await db.storage.from('quote-photos').upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;const ev=await db.from('inventory_evidence').insert({asset_id:id,evidence_type:'Photographs',file_url:path,description:'Staff inspection / resale photograph',created_by:session.user.id});if(ev.error)throw ev.error;} msg.textContent='Photographs added to this product.';msg.className='form-message success';setTimeout(load,400);} catch(err){msg.textContent=err?.message||'Could not upload photographs.';msg.className='form-message error';} finally {button.disabled=false;}
    });

    const send=root.querySelector('#send-sales');
    if(send) send.addEventListener('click', async ()=>{
      const msg=root.querySelector('#send-message'); send.disabled=true; msg.textContent='Checking the completed product record and sending to Sales…'; msg.className='form-message';
      const {data,error:sendError}=await db.rpc('staff_send_inventory_to_sales',{p_asset_id:id});
      if(sendError){msg.textContent=sendError.message;msg.className='form-message error';send.disabled=false;return;}
      msg.textContent=`Sent to Sales${data?.transaction_number?` · ${data.transaction_number}`:''}.`;msg.className='form-message success';setTimeout(()=>location.href=`listing-readiness.html?id=${encodeURIComponent(id)}`,500);
    });
  }

  await load();
});
