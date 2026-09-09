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

    let quoteItem=null, valuation=null, profile=null, sourceSale=null;
    if (asset.source_sale_id) sourceSale=(await db.from('sales').select('id,sale_reference,status,payment_status').eq('id',asset.source_sale_id).maybeSingle()).data || null;
    if (asset.source_quote_item_id) {
      quoteItem=(await db.from('quote_items').select('id,item_name,manufacturer,model,package,item_data,valuation_id').eq('id',asset.source_quote_item_id).maybeSingle()).data || null;
      if (quoteItem?.valuation_id) {
        valuation=(await db.from('valuations').select('id,quote_reference,quote_amount,condition,quote_data,user_id').eq('id',quoteItem.valuation_id).maybeSingle()).data || null;
        if (valuation?.user_id) profile=(await db.from('profiles').select('full_name').eq('id',valuation.user_id).maybeSingle()).data || null;
      }
    }
    const testingRows=(await db.from('inventory_testing').select('*').eq('asset_id',id).order('created_at',{ascending:false})).data || [];
    const evidenceRows=(await db.from('inventory_evidence').select('*').eq('asset_id',id).eq('evidence_type','Photographs').order('created_at',{ascending:true})).data || [];
    const repairs=(await db.from('inventory_repairs').select('*').eq('asset_id',id).order('repaired_at',{ascending:false})).data || [];
    const latestRepair=repairs[0] || null;
    const inspection=testingRows.find(x=>x.stage==='inspection') || null;
    const testing=testingRows.find(x=>x.stage==='testing') || null;
    const itemData=quoteItem?.item_data && typeof quoteItem.item_data==='object' ? quoteItem.item_data : {};
    const quoteData=valuation?.quote_data && typeof valuation.quote_data==='object' ? valuation.quote_data : {};
    const single=itemData.singleItem || {};
    const quoteBasket=Array.isArray(quoteData.quoteBasket)?quoteData.quoteBasket:[];
    const basketItem=quoteBasket.find(x=>{
      if(!x||typeof x!=='object') return false;
      const sameModel=String(x.model||x.modelName||'').trim().toLowerCase()===String(quoteItem?.model||asset.model||'').trim().toLowerCase();
      const sameManufacturer=!x.manufacturer || !asset.manufacturer || String(x.manufacturer).trim().toLowerCase()===String(asset.manufacturer).trim().toLowerCase();
      return sameModel && sameManufacturer;
    }) || {};
    const customerName=profile?.full_name || quoteData.fullName || 'Not recorded';
    const customerCondition=asset.customer_condition || quoteData.condition || itemData.condition || single.condition || 'Not recorded';
    const customerPackage=asset.customer_package_name || quoteItem?.package || itemData.packageName || 'Not recorded';
    const customerMissing=Boolean(asset.customer_missing_items || itemData.missingItems || single.missingItems);
    const customerMissingDetails=asset.customer_missing_items_details || itemData.missingItemsDetails || itemData.exceptionNotes || single.missingItemsDetails || single.exceptionNotes || basketItem.missingItemsDetails || basketItem.exceptionNotes || quoteData.missingItemsDetails || quoteData.exceptionNotes || '';
    const customerDamage=Boolean(asset.customer_damage || itemData.damage || single.damage || basketItem.damage);
    const customerConditionNote=asset.customer_exception_notes || itemData.conditionNotes || itemData.exceptionNotes || single.conditionNotes || single.exceptionNotes || basketItem.conditionNotes || basketItem.exceptionNotes || quoteData.conditionNotes || quoteData.exceptionNotes || '';
    const customerDescription=first(itemData,['description','itemDescription']) || first(single,['description','itemDescription']) || first(basketItem,['description','itemDescription']) || '';
    const customerPhotos=await signed([...(itemData.photos||[]),...(single.photos||[]),...(basketItem.photos||[])].map(x=>typeof x==='string'?x:x?.path));
    const staffPhotos=await signed(evidenceRows.map(x=>x.file_url));
    const status=asset.status || 'Awaiting Receipt';
    const missingResolved=!asset.customer_missing_items || asset.missing_items_resolved;
    const testsPass=testing && ['Passed','Not Applicable'].includes(testing.flight_test||'') && ['Passed','Not Applicable'].includes(testing.camera_test||'') && ['Good','Not Applicable'].includes(testing.battery_health||'');
    const purchaseFinalised=!sourceSale || (sourceSale.status==='completed' && sourceSale.payment_status==='paid');
    const canSend=status==='Ready for Resale' && purchaseFinalised && Boolean(asset.condition_grade) && missingResolved && Boolean(asset.package_name || asset.final_package_contents) && Boolean(testsPass);
    // Ready for Resale means the physical inspection is complete. The exact
    // next action depends on the linked customer-purchase state.
    const saleWorkflowStatus=String(sourceSale?.status||'').toLowerCase();
    const paymentWorkflowStatus=String(sourceSale?.payment_status||'').toLowerCase();
    const awaitingFinalOffer=saleWorkflowStatus==='inspection' || paymentWorkflowStatus==='awaiting_final_quote';
    const awaitingPurchaseCompletion=Boolean(sourceSale?.id) && !purchaseFinalised;
    const finalOfferReady=status==='Ready for Resale' && awaitingFinalOffer && Boolean(valuation?.id);
    const inspectionComplete=status==='Ready for Resale';
    const nextWorkflowLabel=finalOfferReady
      ? 'Final offer & payment'
      : (status==='Ready for Resale' && awaitingPurchaseCompletion ? 'Complete customer purchase' : 'Send to Sales');
    const repairFault=latestRepair?.fault_description || [
      asset.status_change_reason, testing?.damage_notes, testing?.notes, inspection?.damage_notes, inspection?.notes
    ].filter(Boolean).join(' · ') || 'Record the exact fault or defect that requires repair.';
    const repairHistoryHtml=repairs.length ? repairs.map(r=>`
      <div class="notice" style="margin-top:.6rem">
        <strong>Repair completed ${esc(new Date(r.repaired_at||r.created_at).toLocaleString('en-GB'))}</strong><br>
        Fault: ${esc(r.fault_description)}<br>
        Repair: ${esc(r.repair_description)}<br>
        Provider: ${esc(r.provider_type)}${r.provider_name?` · ${esc(r.provider_name)}`:''}<br>
        Cost: ${money(r.repair_cost)}${Array.isArray(r.evidence_paths)&&r.evidence_paths.length?` · ${r.evidence_paths.length} evidence file(s) attached`:''}
      </div>`).join('') : '<p>No completed repair has been recorded yet.</p>';
    const repairPanel=status==='Repair Required'?`
      <section class="valuation-card" style="margin-top:1rem;border:2px solid #b54708">
        <p class="section-kicker">ACTION REQUIRED · REPAIR</p>
        <h2>⚠ This item requires repair before it can be sold</h2>
        <div class="notice"><strong>Fault currently recorded</strong><p>${esc(repairFault)}</p></div>
        <p>Record what was repaired. Completing this repair also records the controlled post-repair test as passed and returns the item directly to Ready for Resale. It does not send the item to Sales.</p>
        <form id="repair-form" class="auth-form">
          <label>Exact fault / defect requiring repair<textarea name="fault_description" rows="4" required>${esc(repairFault)}</textarea></label>
          <label>What repair was carried out?<textarea name="repair_description" rows="5" required placeholder="Record the actual work completed, parts replaced and any relevant result."></textarea></label>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem">
            <label>Repair carried out by<select name="provider_type"><option>Internal</option><option>External</option><option>Manufacturer / Service Centre</option></select></label>
            <label>Repairer / company name<input name="provider_name" placeholder="Optional for internal repairs"></label>
            <label>Repair cost (£)<input name="repair_cost" type="number" min="0" step="0.01" value="0"></label>
            <label>Repair completed date<input name="repaired_at" type="datetime-local" value="${new Date().toISOString().slice(0,16)}"></label>
          </div>
          <label>Repair evidence (optional)<input id="repair-evidence" type="file" multiple accept="image/*,.pdf"></label>
          <div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="btn btn-primary" type="submit">COMPLETE REPAIR & MARK TESTED</button><p id="repair-message" class="form-message" aria-live="polite"></p></div>
        </form>
        <h3 style="margin-top:1.25rem">Repair history</h3>${repairHistoryHtml}
      </section>`:'';
    const stepOffset=status==='Repair Required'?1:0;

    const quoteCards=[
      ['Customer',customerName],['Quote reference',valuation?.quote_reference||'Not recorded'],['Quote amount',money(valuation?.quote_amount)],
      ['Category',first(quoteData,['category','categoryName'])||first(itemData,['category','categoryName'])||'Not recorded'],['Manufacturer',quoteItem?.manufacturer||asset.manufacturer||'Not recorded'],
      ['Model',quoteItem?.model||asset.model||'Not recorded'],['Package',customerPackage],['Customer condition',customerCondition]
    ].map(([k,v])=>`<div class="notice"><strong>${esc(k)}</strong><br>${esc(v)}</div>`).join('');
    const customerPhotoHtml=customerPhotos.length?customerPhotos.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(x.url)}" alt="Customer photograph" style="width:100%;height:130px;object-fit:cover;border-radius:8px"></a>`).join(''):'<p>No customer photographs available.</p>';
    const staffPhotoHtml=staffPhotos.length?staffPhotos.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(x.url)}" alt="Staff photograph" style="width:100%;height:130px;object-fit:cover;border-radius:8px"></a>`).join(''):'<p>No staff photographs yet.</p>';

    root.innerHTML=`
      <div class="valuation-card"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap"><div><p class="section-kicker"${status==='Repair Required'?' style="display:inline-block;color:#b42318;background:#fff1f0;border:1px solid #b42318;padding:.4rem .7rem;border-radius:4px;font-weight:900;letter-spacing:.08em"':''}>PRODUCT WORKBENCH · ${esc(status)}</p><h2>${esc([asset.manufacturer,asset.model].filter(Boolean).join(' ')||'Unnamed asset')}</h2><p>Asset ${esc(asset.asset_reference)} · Transaction ${esc(asset.transaction_number||'Not recorded')}</p></div><div style="display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn btn-secondary" href="admin-purchasing.html">PURCHASING DASHBOARD</a>${finalOfferReady?'<a class="btn btn-primary" href="admin-quote.html?id='+encodeURIComponent(valuation.id)+'">OPEN CUSTOMER FINAL OFFER</a>':''}<a class="btn btn-secondary" href="#product-history">PRODUCT HISTORY</a></div></div><div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:1rem"><span class="notice"><strong>1</strong> Customer quote</span>${status==='Repair Required'?'<span class="notice"><strong>2</strong> Repair required</span>':''}<span class="notice"><strong>${2+stepOffset}</strong> Inspection & testing</span><span class="notice"><strong>${3+stepOffset}</strong> Photos & package</span><span class="notice"><strong>${4+stepOffset}</strong> ${esc(nextWorkflowLabel)}</span></div>${finalOfferReady?'<div class="notice" style="margin-top:1rem;border-left:4px solid #d88732"><strong>NEXT ACTION · CUSTOMER FINAL OFFER</strong><p>The item has completed physical inspection and testing. Review the completed inspection, then send the customer the final offer or refuse the item.</p><a class="btn btn-primary" href="admin-quote.html?id='+encodeURIComponent(valuation.id)+'">OPEN CUSTOMER FINAL OFFER</a></div>':''}</div>

      <section class="valuation-card" style="margin-top:1rem"><h2>1. Customer quote</h2><p>This is the original customer information carried into inventory. It is reference-only and is not overwritten by staff inspection.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem">${quoteCards}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin-top:1rem"><div class="notice"><strong>Missing items reported by customer</strong><br>${customerMissing?'YES':'No'}${customerMissingDetails?`<br><small>${esc(customerMissingDetails)}</small>`:''}</div><div class="notice"><strong>Damage reported by customer</strong><br>${customerDamage?'YES':'No'}</div>${customerConditionNote?`<div class="notice"><strong>Customer condition / exception note</strong><br><small>${esc(customerConditionNote)}</small></div>`:''}</div>${customerDescription?`<div class="notice" style="margin-top:1rem"><strong>Customer description</strong><p>${esc(customerDescription)}</p></div>`:''}<h3 style="margin-top:1.25rem">Customer photographs (${customerPhotos.length})</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">${customerPhotoHtml}</div></section>

      ${repairPanel}

      <section id="product-edit-section" class="valuation-card" style="margin-top:1rem"><h2>${2+stepOffset}. Product details, inspection & technical testing</h2><p>Compare the product with the customer quote and complete all checks here. There is no separate testing or product page to open.</p>${status==='Repair Required'?'<p class="form-message error">Repair must be recorded before this item can continue through post-repair testing.</p>':''}<form id="workbench-form" class="auth-form"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem"><label>Manufacturer<input name="manufacturer" value="${esc(asset.manufacturer||quoteItem?.manufacturer||'')}"></label><label>Model<input name="model" value="${esc(asset.model||quoteItem?.model||'')}"></label><label>Serial number<input name="serial_number" value="${esc(asset.serial_number||itemData.serialNumber||single.serialNumber||'')}"></label><label>Package<input name="package_name" value="${esc(asset.package_name||'')}"></label><label>Staff condition<select name="condition_grade"><option value="">Not recorded</option>${conditionOptions}</select></label></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem"><label>Expected batteries<input name="expected_battery_count" type="number" min="0" value="${asset.expected_battery_count??''}"></label><label>Actual batteries found<input name="actual_battery_count" type="number" min="0" value="${asset.actual_battery_count??''}"></label><label>Battery health<select name="battery_health"><option>Not Applicable</option><option>Good</option><option>Fair</option><option>Requires Replacement</option></select></label><label>Inspection result<select name="inspection_result"><option>Passed</option><option>Requires Repair</option><option>Failed</option></select></label></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem"><label>Flight test<select name="flight_test"><option>Not Applicable</option><option>Passed</option><option>Requires Attention</option><option>Failed</option></select></label><label>Camera / main function test<select name="camera_test"><option>Not Applicable</option><option>Passed</option><option>Requires Attention</option><option>Failed</option></select></label><label>Verification<span style="display:block;margin-top:.5rem"><input type="checkbox" name="serial_verified"> Serial verified</span><span style="display:block;margin-top:.5rem"><input type="checkbox" name="accessories_verified"> Accessories checked</span></label><label>Missing items<span style="display:block;margin-top:.5rem"><input type="checkbox" name="missing_items_resolved" ${asset.missing_items_resolved?'checked':''}> Resolved / replaced</span></label></div><label>Damage / defects found<textarea name="damage_notes" rows="4">${esc(testing?.damage_notes||inspection?.damage_notes||'')}</textarea></label><label>Items added / replaced<textarea name="items_added_replaced" rows="3" placeholder="Record any missing item, replacement or additional item supplied.">${esc(asset.items_added_replaced||'')}</textarea></label><label>Final package contents<textarea name="final_package_contents" rows="5" placeholder="Record exactly what the buyer will receive.">${esc(asset.final_package_contents||'')}</textarea></label><label>Package / resolution notes<textarea name="package_notes" rows="4">${esc(asset.package_notes||asset.missing_items_resolution||'')}</textarea></label><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem"><label>Default sale price (£)<input name="approved_resale_price" type="number" min="0" step="0.01" value="${esc(asset.approved_resale_price??'')}"></label><label>Purchase price (£)<input value="${esc(asset.purchase_price??'Not recorded')}" disabled></label></div><label>Resale description<textarea name="description" rows="6" placeholder="Write the master description used as the starting point for each sales channel.">${esc(asset.description||'')}</textarea></label><label>Technical / inspection notes<textarea name="testing_notes" rows="5">${esc(testing?.notes||inspection?.notes||'')}</textarea></label><div style="display:flex;gap:.6rem;flex-wrap:wrap">${inspectionComplete?'<button class="btn btn-secondary" type="button" disabled>INSPECTION COMPLETE</button>':'<button class="btn btn-primary" type="submit" '+(status==='Repair Required'?'disabled':'')+'>SAVE INSPECTION & TESTING</button>'}${finalOfferReady?'<a class="btn btn-primary" href="admin-quote.html?id='+encodeURIComponent(valuation.id)+'">MAKE FINAL OFFER</a>':''}<p id="workbench-message" class="form-message" aria-live="polite"></p></div></form></section>

      <section id="staff-photos-section" class="valuation-card" style="margin-top:1rem"><h2>${3+stepOffset}. Staff photographs</h2><p>Add inspection, damage, package and resale photographs without leaving the product.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:1rem">${staffPhotoHtml}</div><form id="photo-form" class="auth-form"><label>Add / take photographs<input id="workbench-photos" type="file" accept="image/*" capture="environment" multiple></label><button class="btn btn-secondary" type="submit">UPLOAD PHOTOGRAPHS</button><p id="photo-message" class="form-message" aria-live="polite"></p></form></section>

      <section id="sales-handoff-section" class="valuation-card" style="margin-top:1rem"><h2>${4+stepOffset}. ${finalOfferReady?'Final offer & payment':'Complete & send to Sales'}</h2>${sourceSale&&!purchaseFinalised?'<div class="notice" style="border-left-color:#d88732"><strong>PURCHASING NOT FINALISED</strong><p>The physical inspection is complete, but this customer purchase cannot enter Sales until the final offer is accepted and payment is completed.</p></div>':''}<div class="notice"><strong>Completion gate</strong><ul><li>Customer quote checked against item received.</li><li>Staff condition recorded.</li><li>Serial and battery counts checked where applicable.</li><li>Missing items resolved and final package contents recorded.</li><li>Technical tests completed.</li><li>Resale description is usable.</li></ul></div><div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem">${finalOfferReady?'<a class="btn btn-primary" href="admin-quote.html?id='+encodeURIComponent(valuation.id)+'">MAKE FINAL OFFER</a><a class="btn btn-secondary" href="admin-purchasing.html">RETURN TO PURCHASING DASHBOARD</a>':'<a class="btn btn-secondary" href="inventory.html">SAVE & RETURN TO INVENTORY</a>' + (canSend?'<button id="send-sales" class="btn btn-primary" type="button">SEND TO SALES</button>':(!purchaseFinalised?'<button class="btn btn-primary" type="button" disabled>WAITING FOR PURCHASE FINALISATION</button>':'<button class="btn btn-primary" type="button" disabled>SEND TO SALES — COMPLETE WORKFLOW FIRST</button>'))}</div>${!canSend&&!finalOfferReady?'<p class="form-message error">Blocked: current status is '+esc(status)+'. '+(status==='Repair Required'?'Complete and record the repair. Repair completion marks the post-repair test as passed and releases the item to Ready for Resale; then complete any remaining package or condition requirements.':'Complete the missing inspection, testing, package and condition requirements shown above.')+'</p>':''}<p id="send-message" class="form-message" aria-live="polite"></p></section>`;

    const setValue=(name,value)=>{const el=root.querySelector(`[name="${name}"]`);if(el&&value!==null&&value!==undefined&&value!=='')el.value=value;};
    setValue('condition_grade',asset.condition_grade); setValue('battery_health',testing?.battery_health||'Not Applicable'); setValue('inspection_result',inspection?.result==='Requires Attention'?'Requires Repair':(inspection?.result||'Passed')); setValue('flight_test',testing?.flight_test||'Not Applicable'); setValue('camera_test',testing?.camera_test||'Not Applicable');
    root.querySelector('[name="serial_verified"]').checked=Boolean(inspection?.serial_verified||testing?.serial_verified);
    root.querySelector('[name="accessories_verified"]').checked=Boolean(inspection?.accessories_verified||testing?.accessories_verified);

    const repairForm=root.querySelector('#repair-form');
    if(repairForm) repairForm.addEventListener('submit',async e=>{
      e.preventDefault();
      const f=e.currentTarget,fd=new FormData(f),b=f.querySelector('button[type="submit"]'),m=root.querySelector('#repair-message');
      b.disabled=true;m.textContent='Recording repair, marking the post-repair test as passed, and releasing the item to Ready for Resale…';m.className='form-message';
      try{
        const files=[...root.querySelector('#repair-evidence').files];
        const evidencePaths=[];
        for(const file of files){
          const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');
          const path=`${session.user.id}/inventory-repairs/${id}/${Date.now()}-${crypto.randomUUID()}-${safe}`;
          const up=await db.storage.from('quote-photos').upload(path,file,{contentType:file.type||undefined,upsert:false});
          if(up.error) throw up.error;
          evidencePaths.push(path);
        }
        const repairedAt=fd.get('repaired_at')?new Date(String(fd.get('repaired_at'))).toISOString():new Date().toISOString();
        const {error}=await db.rpc('staff_complete_inventory_repair',{
          p_asset_id:id,
          p_fault_description:String(fd.get('fault_description')||'').trim(),
          p_repair_description:String(fd.get('repair_description')||'').trim(),
          p_provider_type:String(fd.get('provider_type')||'Internal'),
          p_provider_name:String(fd.get('provider_name')||'').trim()||null,
          p_repair_cost:Number(fd.get('repair_cost')||0),
          p_repaired_at:repairedAt,
          p_evidence_paths:evidencePaths
        });
        if(error) throw error;
        m.textContent='Repair recorded and post-repair testing marked as passed. The item is now Ready for Resale.';
        m.className='form-message success';
        setTimeout(load,600);
      }catch(err){
        m.textContent=err?.message||'Could not record the repair.';
        m.className='form-message error';
        b.disabled=false;
      }
    });

    root.querySelector('#workbench-form').addEventListener('submit',async e=>{
      e.preventDefault(); const f=e.currentTarget,fd=new FormData(f),b=f.querySelector('button[type="submit"]'),m=root.querySelector('#workbench-message');
      if(inspectionComplete){m.textContent=finalOfferReady?'Inspection complete. Next action: make the customer final offer.':'Inspection is already complete. Use the next workflow action shown above.';m.className='form-message success';return;}
      b.disabled=true;m.textContent='Saving inspection and testing…';m.className='form-message';
      const inspectResult=String(fd.get('inspection_result')||'Passed');
      const flight=String(fd.get('flight_test')||'Not Applicable'),camera=String(fd.get('camera_test')||'Not Applicable'),battery=String(fd.get('battery_health')||'Not Applicable');
      const repairRequired=['Requires Repair','Requires Attention','Failed'].includes(inspectResult);
      const testResult=repairRequired?'Requires Attention':((['Passed','Not Applicable'].includes(flight)&&['Passed','Not Applicable'].includes(camera)&&['Good','Not Applicable'].includes(battery))?'Passed':'Requires Attention');
      const missingResolved=fd.get('missing_items_resolved')==='on';
      const assetPayload={manufacturer:String(fd.get('manufacturer')||'').trim()||null,model:String(fd.get('model')||'').trim()||null,serial_number:String(fd.get('serial_number')||'').trim()||null,package_name:String(fd.get('package_name')||'').trim()||null,condition_grade:String(fd.get('condition_grade')||'').trim()||null,approved_resale_price:fd.get('approved_resale_price')===''?null:Number(fd.get('approved_resale_price')),expected_battery_count:fd.get('expected_battery_count')===''?null:Number(fd.get('expected_battery_count')),actual_battery_count:fd.get('actual_battery_count')===''?null:Number(fd.get('actual_battery_count')),missing_items_resolved:missingResolved,items_added_replaced:String(fd.get('items_added_replaced')||'').trim()||null,final_package_contents:String(fd.get('final_package_contents')||'').trim()||null,package_notes:String(fd.get('package_notes')||'').trim()||null,description:String(fd.get('description')||'').trim()||null,updated_at:new Date().toISOString()};
      let r=await db.from('inventory_assets').update(assetPayload).eq('id',id); if(r.error){m.textContent=r.error.message;m.className='form-message error';b.disabled=false;return;}
      const common={asset_id:id,visual_condition:assetPayload.condition_grade,missing_items:!missingResolved,damage_notes:String(fd.get('damage_notes')||'').trim()||null,serial_verified:fd.get('serial_verified')==='on',accessories_verified:fd.get('accessories_verified')==='on',notes:String(fd.get('testing_notes')||'').trim()||null,created_by:session.user.id,updated_by:session.user.id};
      r=await saveRecord({...common,stage:'inspection',result:inspectResult}); if(r.error){m.textContent=r.error.message;m.className='form-message error';b.disabled=false;return;}
      r=await saveRecord({...common,stage:'testing',result:testResult,flight_test:flight,camera_test:camera,battery_health:battery}); if(r.error){m.textContent=r.error.message;m.className='form-message error';b.disabled=false;return;}
      try{
        let current=(await db.from('inventory_assets').select('status').eq('id',id).single()).data?.status;
        const failureReason=[
          repairRequired?'Inspection requires repair':'',
          String(fd.get('damage_notes')||'').trim(),
          String(fd.get('testing_notes')||'').trim(),
          inspectResult==='Failed'?'Inspection failed':'',
          testResult!=='Passed'&&!repairRequired?`Technical checks require attention: flight=${flight}, camera=${camera}, battery=${battery}`:''
        ].filter(Boolean).join(' · ');
        if(repairRequired){
          if(current==='Received') current=(await window.AssetStateActions.transitionAsset(id,'Inspection Required','Inspection completed and requires repair')).status;
          if(['Inspection Required','Testing'].includes(current)) current=(await window.AssetStateActions.transitionAsset(id,'Repair Required',failureReason||'Inspection requires repair')).status;
          if(current==='Repair Required'){
            m.textContent='Inspection complete: REQUIRES REPAIR. The item has been moved to Repair Required.';
            m.className='form-message error';
            b.disabled=false;
            setTimeout(load,650);
            return;
          }
        }
        else if(inspectResult==='Passed'&&current==='Received') current=(await window.AssetStateActions.transitionAsset(id,'Inspection Required','Inspection completed in product workbench')).status;
        if(current==='Repair Required') throw new Error('This item is marked Repair Required. Record the completed repair before post-repair testing can continue.');
        if(inspectResult==='Passed'&&current==='Inspection Required') current=(await window.AssetStateActions.transitionAsset(id,'Testing','Technical testing started from product workbench')).status;
        if(testResult==='Passed'&&current==='Testing') await window.AssetStateActions.transitionAsset(id,'Ready for Resale','Inspection and testing completed in product workbench');
        else if(testResult!=='Passed'&&current==='Testing') await window.AssetStateActions.transitionAsset(id,'Repair Required',failureReason||'Technical testing requires attention');
      }catch(err){m.textContent=err.message;m.className='form-message error';b.disabled=false;return;}
      m.textContent=finalOfferReady?'Inspection complete. Next action: make the customer final offer.':'Product, inspection, testing, package, price and master description saved.';m.className='form-message success';b.disabled=false;setTimeout(load,450);
    });

    root.querySelector('#photo-form').addEventListener('submit',async e=>{
      e.preventDefault(); const f=e.currentTarget,files=[...root.querySelector('#workbench-photos').files],b=f.querySelector('button'),m=root.querySelector('#photo-message');
      if(!files.length){m.textContent='Select or take at least one photograph.';m.className='form-message error';return;} b.disabled=true;m.textContent='Uploading photographs…';m.className='form-message';
      try{for(const file of files){const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const path=`${session.user.id}/inventory/${id}/${Date.now()}-${crypto.randomUUID()}-${safe}`;const up=await db.storage.from('quote-photos').upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;const ev=await db.from('inventory_evidence').insert({asset_id:id,evidence_type:'Photographs',file_url:path,description:'Staff inspection / resale photograph',created_by:session.user.id});if(ev.error)throw ev.error;}m.textContent='Photographs added to this product.';m.className='form-message success';setTimeout(load,450);}catch(err){m.textContent=err?.message||'Could not upload photographs.';m.className='form-message error';}finally{b.disabled=false;}
    });

    const send=root.querySelector('#send-sales');
    if(send) send.addEventListener('click',async()=>{const m=root.querySelector('#send-message');send.disabled=true;m.textContent='Checking the completed product and sending to Sales…';m.className='form-message';const {data,error}=await db.rpc('staff_send_inventory_to_sales',{p_asset_id:id});if(error){m.textContent=error.message;m.className='form-message error';send.disabled=false;return;}m.textContent=`Sent to Sales${data?.transaction_number?` · ${data.transaction_number}`:''}.`;m.className='form-message success';setTimeout(()=>location.href=`listing-readiness.html?id=${encodeURIComponent(id)}`,500);});
  }
  let loadTimeout = null;
  try {
    const loadPromise = load();
    loadTimeout = setTimeout(() => {
      root.innerHTML = '<div class="form-message error"><strong>Product Workbench is taking longer than expected to load.</strong><br>The workflow has been stopped from appearing to load indefinitely. Check the inventory record and browser console, then refresh.</div>';
    }, 20000);
    await loadPromise;
  } catch (err) {
    console.error('Product Workbench load failed', err);
    root.innerHTML = `<div class="form-message error"><strong>Could not load Product Workbench.</strong><br>${esc(err?.message || 'Unexpected loading error.')}</div>`;
  } finally {
    if (loadTimeout) clearTimeout(loadTimeout);
  }
});
