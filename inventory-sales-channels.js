document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  const root = document.getElementById('asset-detail');
  if (!auth || !root) return;
  const session = await auth.getSession();
  if (!session) return;
  const db = auth.supabase;
  const { data: staff } = await db.from('staff_users').select('user_id,active').eq('user_id', session.user.id).maybeSingle();
  if (!staff?.active) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) return;
  const salesStatuses = new Set(['Sent to Sales','Listed','Reserved','Sold','Sold - Awaiting Shipping','Sold - Shipped','Returned','Archived']);
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const moneyInput = v => v === null || v === undefined ? '' : esc(v);
  const statusLabel = status => ({Published:'LIVE',Reserved:'RESERVED',Sold:'SOLD',Cancelled:'CANCELLED','Delist Required':'DELIST REQUIRED'}[status] || status || 'NOT SUBMITTED');

  for (let i = 0; i < 60 && !root.querySelector('#handoff-photo-form'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  if (!root.querySelector('#handoff-photo-form')) return;

  const [{ data: asset }, { data: outletRows, error: outletError }, { data: listingRows, error: listingError }] = await Promise.all([
    db.from('inventory_assets').select('*').eq('id',id).maybeSingle(),
    db.from('sales_outlets').select('id,outlet_code,outlet_name,outlet_type,active').eq('active',true).order('outlet_name'),
    db.from('resale_listings').select('*').eq('asset_id',id).order('sales_channel')
  ]);
  if (!asset || !salesStatuses.has(asset.status)) return;
  if (outletError || listingError) return;

  const outlets = outletRows || [];
  const listings = listingRows || [];
  const map = new Map(listings.map(row => [row.outlet_id || row.sales_channel,row]));
  const titleDefault = asset.listing_title || [asset.manufacturer,asset.model].filter(Boolean).join(' ');
  const descriptionDefault = asset.description || '';

  const panel = document.createElement('section');
  panel.className = 'valuation-card';
  panel.id = 'sales-channels-unified';
  panel.style.marginTop = '1rem';
  panel.innerHTML = `
    <p class="section-kicker">SALES CHANNELS</p>
    <h2>List this item from one workspace</h2>
    <p>Edit the product and listing information above, then use the buttons below. The GearCashOut Retail Website publishes directly. External marketplaces are recorded with one submitted/live action; there is no Draft or Ready to Upload stage.</p>
    <form id="unified-product-listing-form" class="auth-form" style="margin-top:1rem">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.75rem">
        <label>Manufacturer<input name="manufacturer" value="${esc(asset.manufacturer || '')}"></label>
        <label>Model<input name="model" value="${esc(asset.model || '')}"></label>
        <label>Serial number<input name="serial_number" value="${esc(asset.serial_number || '')}"></label>
        <label>Package<input name="package_name" value="${esc(asset.package_name || '')}"></label>
        <label>Condition<input name="condition_grade" value="${esc(asset.condition_grade || '')}"></label>
        <label>Default sale price (£)<input name="approved_resale_price" type="number" min="0" step="0.01" value="${moneyInput(asset.approved_resale_price)}"></label>
      </div>
      <label>Listing title<input name="listing_title" value="${esc(titleDefault)}" required></label>
      <label>Master listing description<textarea name="description" rows="8" required>${esc(descriptionDefault)}</textarea></label>
      <label>Final package contents<textarea name="final_package_contents" rows="5">${esc(asset.final_package_contents || '')}</textarea></label>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center"><button class="btn btn-primary" type="submit">SAVE PRODUCT & LISTING DETAILS</button><p id="unified-product-message" class="form-message" aria-live="polite"></p></div>
    </form>
    <div style="display:grid;gap:1rem;margin-top:1.25rem">
      ${outlets.map(outlet => {
        const row = map.get(outlet.id) || {};
        const isWebsite = outlet.outlet_code === 'WEBSITE' && outlet.outlet_type === 'owned_storefront';
        const title = row.listing_title || titleDefault;
        const description = row.listing_description || descriptionDefault;
        const price = row.asking_price ?? asset.approved_resale_price ?? '';
        const submitted = ['Published','Reserved','Sold'].includes(row.status);
        const delistRequired = row.status === 'Delist Required';
        return `
          <article class="sales-channel-block" style="border:1px solid ${delistRequired ? '#c92a2a' : '#d7dce2'};border-radius:10px;padding:1rem;background:#fff">
            <div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap">
              <div><h3 style="margin:0">${esc(outlet.outlet_name)}</h3><small>${isWebsite ? 'DIRECT WEBSITE PUBLISHING' : 'MARKETPLACE'}</small></div>
              <span class="notice"><strong>${esc(statusLabel(row.status))}</strong></span>
            </div>
            ${delistRequired ? '<p class="form-message error">This listing must be closed because the item has been sold through another channel.</p>' : ''}
            <form class="unified-channel-form" data-listing-id="${esc(row.id || '')}" data-outlet-id="${esc(outlet.id)}" data-channel="${esc(outlet.outlet_name)}" data-website="${isWebsite ? 'true' : 'false'}">
              <div style="display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(140px,.45fr) minmax(140px,.45fr);gap:.75rem">
                <label>Listing title<input name="listing_title" value="${esc(title)}" required></label>
                <label>Sale price (£)<input name="asking_price" type="number" min="0" step="0.01" value="${moneyInput(price)}" required></label>
                <label>P&amp;P (£)<input name="shipping_cost" type="number" min="0" step="0.01" value="${moneyInput(row.shipping_cost ?? '')}"></label>
              </div>
              <label>Listing description<textarea name="listing_description" rows="6" required>${esc(description)}</textarea></label>
              ${isWebsite ? '<p class="notice"><strong>Website:</strong> click publish and this item becomes a live central resale listing for the GearCashOut Retail Website.</p>' : '<p class="notice"><strong>Marketplace:</strong> create the listing on the marketplace, then click the button below to record it as submitted/live. A URL or listing ID is optional and can be added later if useful.</p>'}
              <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center">
                <button class="btn btn-primary channel-submit" type="submit" ${delistRequired ? 'disabled' : ''}>${isWebsite ? (submitted ? 'UPDATE WEBSITE LISTING' : 'PUBLISH TO WEBSITE') : (submitted ? 'UPDATE MARKETPLACE RECORD' : 'ADD TO MARKETPLACE / MARK SUBMITTED')}</button>
                ${row.id && submitted && !['Sold','Cancelled','Delist Required'].includes(row.status) ? `<button class="btn btn-secondary mark-sold" type="button" data-listing-id="${esc(row.id)}">MARK SOLD</button>` : ''}
                ${row.listing_url ? `<a class="btn btn-secondary" href="${esc(row.listing_url)}" target="_blank" rel="noopener">VIEW LISTING</a>` : ''}
                <span class="form-message channel-message" aria-live="polite"></span>
              </div>
            </form>
          </article>`;
      }).join('')}
    </div>`;
  root.appendChild(panel);

  panel.querySelector('#unified-product-listing-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form=e.currentTarget, fd=new FormData(form), message=panel.querySelector('#unified-product-message'), button=form.querySelector('button');
    button.disabled=true; message.textContent='Saving…'; message.className='form-message';
    const payload={
      manufacturer:String(fd.get('manufacturer')||'').trim()||null,
      model:String(fd.get('model')||'').trim()||null,
      serial_number:String(fd.get('serial_number')||'').trim()||null,
      package_name:String(fd.get('package_name')||'').trim()||null,
      condition_grade:String(fd.get('condition_grade')||'').trim()||null,
      approved_resale_price:String(fd.get('approved_resale_price')||'').trim()===''?null:Number(fd.get('approved_resale_price')),
      listing_title:String(fd.get('listing_title')||'').trim()||null,
      description:String(fd.get('description')||'').trim()||null,
      final_package_contents:String(fd.get('final_package_contents')||'').trim()||null,
      updated_at:new Date().toISOString()
    };
    const {error}=await db.from('inventory_assets').update(payload).eq('id',id);
    if (!error) Object.assign(asset,payload);
    message.textContent=error?error.message:'Product and listing details saved.';
    message.className='form-message'+(error?' error':' success');
    button.disabled=false;
  });

  panel.querySelectorAll('.unified-channel-form').forEach(form => form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd=new FormData(form);
    const message=form.querySelector('.channel-message');
    const button=form.querySelector('.channel-submit');
    const listingId=form.dataset.listingId || null;
    const outlet=outlets.find(x=>x.id===form.dataset.outletId);
    const isWebsite=form.dataset.website==='true';
    if (!outlet) return;
    button.disabled=true; message.textContent='Saving…'; message.className='form-message';
    const now=new Date().toISOString();
    const payload={
      asset_id:id,
      sales_channel:outlet.outlet_name,
      outlet_id:outlet.id,
      status:'Published',
      published_at:now,
      asking_price:Number(fd.get('asking_price')),
      shipping_cost:String(fd.get('shipping_cost')||'').trim()===''?null:Number(fd.get('shipping_cost')),
      listing_title:String(fd.get('listing_title')||'').trim()||null,
      listing_description:String(fd.get('listing_description')||'').trim()||null,
      listing_data:{
        transaction_number:asset.transaction_number,
        manufacturer:asset.manufacturer,
        model:asset.model,
        package_name:asset.package_name,
        condition:asset.condition_grade,
        package_contents:asset.final_package_contents,
        serial_number:asset.serial_number,
        actual_battery_count:asset.actual_battery_count
      }
    };
    if (isWebsite) {
      payload.listing_reference=null;
      payload.listing_url=null;
    }
    const response=listingId
      ? await db.from('resale_listings').update({...payload,updated_at:now}).eq('id',listingId)
      : await db.from('resale_listings').insert(payload);
    if (response.error) {
      message.textContent=response.error.message; message.className='form-message error'; button.disabled=false; return;
    }
    message.textContent=isWebsite?'Published directly to the GearCashOut Retail Website.':'Marketplace listing recorded as submitted/live.';
    message.className='form-message success';
    button.disabled=false;
    setTimeout(()=>location.reload(),350);
  }));

  panel.querySelectorAll('.mark-sold').forEach(button => button.addEventListener('click', async () => {
    const soldPrice = prompt('Actual sold price (£):');
    if (soldPrice === null) return;
    const price = Number(soldPrice);
    if (!Number.isFinite(price) || price < 0) { alert('Enter a valid sold price.'); return; }
    const fees = Number(prompt('Selling fees (£):', '0') || 0);
    const shipping = Number(prompt('Shipping cost (£):', '0') || 0);
    button.disabled = true;
    const { error } = await db.rpc('staff_mark_resale_listing_sold', {
      p_listing_id: button.dataset.listingId,
      p_sold_price: price,
      p_selling_fees: Number.isFinite(fees) ? fees : 0,
      p_shipping_cost: Number.isFinite(shipping) ? shipping : 0
    });
    if (error) { alert(error.message); button.disabled = false; return; }
    location.reload();
  }));
});