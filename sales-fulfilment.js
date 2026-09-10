document.addEventListener('DOMContentLoaded',async()=>{
  const auth=window.actionBuyerAuth,root=document.getElementById('fulfilment-root'),msg=document.getElementById('fulfilment-message');
  if(!auth||!root)return;
  const session=await auth.getSession();
  if(!session){location.href='login.html?return=sales-fulfilment.html';return}
  const db=auth.supabase;
  const {data:staff}=await db.from('staff_users').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(!staff){root.innerHTML='<p>You do not have permission to access Sales fulfilment.</p>';return}
  const id=new URLSearchParams(location.search).get('id');
  if(!id){root.innerHTML='<p>No product selected.</p>';return}
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money=v=>v==null||v===''?'Not recorded':Number(v).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  const date=v=>v?new Date(v).toLocaleString('en-GB'):'Not recorded';
  const show=(text,ok=false)=>{msg.textContent=text;msg.className='form-message '+(ok?'success':'error')};

  async function load(){
    root.innerHTML='<p>Loading fulfilment...</p>';
    const [{data:a,error:ae},{data:ls,error:le},{data:f,error:fe}]=await Promise.all([
      db.from('inventory_assets').select('id,sku,asset_reference,manufacturer,model,status,sold_at,sold_price,sold_channel,sold_listing_id').eq('id',id).single(),
      db.from('resale_listings').select('id,sales_channel,status,sold_price,listing_reference,listing_url').eq('asset_id',id).order('updated_at',{ascending:false}),
      db.from('sales_fulfillments').select('*').eq('asset_id',id).order('updated_at',{ascending:false}).limit(1).maybeSingle()
    ]);
    if(ae||!a){root.innerHTML='<p>Product could not be found.</p>';return}
    if(le||fe){root.innerHTML='<p>Could not load fulfilment records.</p>';return}
    const soldListing=(ls||[]).find(l=>l.id===a.sold_listing_id)|| (ls||[]).find(l=>l.status==='Sold');
    const badPrice=!a.sold_price||Number(a.sold_price)<=0;
    const isTerminal=['Sold - Shipped','Archived'].includes(a.status);
    const current=f||{};
    const statusClass=current.status==='Delivered'||a.status==='Sold - Shipped'?'good':badPrice?'bad':'';
    root.innerHTML=`
      <section class="account-panel fulfilment-card">
        <p class="section-kicker">SOLD ITEM</p><h2>${esc([a.manufacturer,a.model].filter(Boolean).join(' ')||'Product')}</h2>
        <div class="fulfilment-meta">
          <div><strong>SKU</strong><br>${esc(a.sku||'Not recorded')}</div>
          <div><strong>Asset</strong><br>${esc(a.asset_reference||'Not recorded')}</div>
          <div><strong>Sold channel</strong><br>${esc(a.sold_channel||'Not recorded')}</div>
          <div><strong>Sold price</strong><br>${money(a.sold_price)}</div>
          <div><strong>Inventory status</strong><br>${esc(a.status||'Not recorded')}</div>
          <div><strong>Sold at</strong><br>${date(a.sold_at)}</div>
        </div>
        ${badPrice?`<div class="fulfilment-status bad"><strong>SOLD PRICE MISSING</strong><br>This sale was recorded without a positive actual sold price. Shipping cannot be progressed until the eBay sale price is corrected.</div>`:''}
      </section>
      ${badPrice&&soldListing?`<section class="account-panel fulfilment-card"><h2>Correct sold price</h2><p>Enter the actual amount paid on eBay. This updates the sold listing and the physical stock record together.</p><form id="price-form" class="auth-form"><label>Actual eBay sold price (£)<input name="sold_price" type="number" min="0.01" step="0.01" required></label><button class="btn btn-primary" type="submit">SAVE ACTUAL SOLD PRICE</button></form></section>`:''}
      <section class="account-panel fulfilment-card">
        <div class="fulfilment-status ${statusClass}"><strong>FULFILMENT STATUS: ${esc(current.status||'Awaiting Shipping')}</strong><br>${current.status==='Delivered'?'Delivery recorded.':current.status==='Collected'?'Carrier collection recorded.':current.status==='Label Created'?'Shipping label/tracking recorded.':'Shipping information is still required.'}</div>
        <h2>Shipping record</h2>
        <p>For eBay sales, eBay may provide the label and shipping service. GearCashOut still records the operational shipping method, carrier and tracking against the physical SKU.</p>
        <form id="shipping-form" class="auth-form">
          <div class="fulfilment-grid">
            <label>Shipping method / service<input name="shipping_method" value="${esc(current.shipping_method||'')}" placeholder="eBay Tracked 48, Royal Mail Tracked 48, etc." required></label>
            <label>Carrier<input name="carrier" value="${esc(current.carrier||'')}" placeholder="Royal Mail, Evri, DPD, eBay Managed Shipping..."></label>
            <label>Tracking number<input name="tracking_number" value="${esc(current.tracking_number||'')}" placeholder="Enter tracking when issued"></label>
            <label>Shipping label URL<input name="label_url" type="url" value="${esc(current.label_url||'')}" placeholder="Paste label/download URL if available"></label>
          </div>
          <label style="display:block;margin-top:.8rem">Notes<textarea name="notes" rows="4" placeholder="eBay order/shipping notes, collection details, etc.">${esc(current.notes||'')}</textarea></label>
          <div class="fulfilment-actions">
            <button class="btn btn-primary" type="submit" ${badPrice||isTerminal?'disabled':''}>${current.id?'UPDATE SHIPPING RECORD':'CREATE SHIPPING RECORD'}</button>
            ${current.label_url?`<a class="btn btn-secondary" href="${esc(current.label_url)}" target="_blank" rel="noopener">OPEN LABEL</a>`:''}
            <a class="btn btn-light" href="inventory-detail.html?id=${encodeURIComponent(id)}">OPEN PRODUCT</a>
          </div>
        </form>
        <p class="notice" style="margin-top:1rem"><strong>Finalisation rule:</strong> an item remains <strong>Sold - Awaiting Shipping</strong> until fulfilment is recorded and the carrier collection step is completed. Tracking alone does not falsely mark the item as shipped.</p>
      </section>`;

    const pf=root.querySelector('#price-form');
    if(pf)pf.addEventListener('submit',async e=>{e.preventDefault();const b=pf.querySelector('button');const price=Number(new FormData(pf).get('sold_price'));if(!Number.isFinite(price)||price<=0){show('Enter the actual positive eBay sold price.');return}b.disabled=true;const {error}=await db.rpc('staff_correct_sold_price',{p_listing_id:soldListing.id,p_sold_price:price});if(error){show(error.message);b.disabled=false;return}show('Actual sold price corrected.',true);await load()});

    const sf=root.querySelector('#shipping-form');
    if(sf)sf.addEventListener('submit',async e=>{e.preventDefault();const b=sf.querySelector('button[type="submit"]');const fd=new FormData(sf);const method=String(fd.get('shipping_method')||'').trim(),carrier=String(fd.get('carrier')||'').trim(),tracking=String(fd.get('tracking_number')||'').trim(),label=String(fd.get('label_url')||'').trim();if(badPrice){show('Correct the actual sold price before recording shipping.');return}if(!method){show('Shipping method / service is required.');return}if(tracking&&!carrier){show('Enter the carrier when a tracking number is recorded.');return}b.disabled=true;b.textContent='SAVING...';const {error}=await db.rpc('staff_create_sales_fulfillment',{p_asset_id:id,p_listing_id:soldListing?.id||null,p_buyer_name:null,p_buyer_email:null,p_shipping_address:null,p_shipping_method:method,p_carrier:carrier||null,p_tracking_number:tracking||null,p_label_url:label||null,p_notes:String(fd.get('notes')||'').trim()||null});if(error){show(error.message);b.disabled=false;b.textContent=current.id?'UPDATE SHIPPING RECORD':'CREATE SHIPPING RECORD';return}show('Shipping record saved.',true);await load()});
  }
  await load();
});