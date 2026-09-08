document.addEventListener('DOMContentLoaded', async () => {
  const auth=window.actionBuyerAuth;
  const root=document.getElementById('asset-detail');
  if(!auth||!root) return;
  const session=await auth.getSession();
  if(!session) return;
  const db=auth.supabase;
  const staffRes=await db.from('staff_users').select('user_id,active').eq('user_id',session.user.id).maybeSingle();
  if(!staffRes.data?.active) return;

  const id=new URLSearchParams(location.search).get('id');
  if(!id) return;
  const salesStatuses=new Set(['Sent to Sales','Listed','Reserved','Sold','Sold - Awaiting Shipping','Sold - Shipped','Returned','Archived']);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const statusLabel=s=>({Published:'LIVE',Reserved:'RESERVED',Sold:'SOLD',Cancelled:'CANCELLED','Delist Required':'DELIST REQUIRED'}[s]||s||'NOT SUBMITTED');
  const outletTypeLabel=t=>({marketplace:'MARKETPLACE',auction:'AUCTION',other:'OTHER CHANNEL',owned_storefront:'OWNED WEBSITE'}[t]||'CHANNEL');

  for(let i=0;i<100&&!root.querySelector('#workbench-form');i++) await new Promise(r=>setTimeout(r,75));
  if(!root.querySelector('#workbench-form')) return;

  const [assetRes,outletRes,listingRes]=await Promise.all([
    db.from('inventory_assets').select('*').eq('id',id).maybeSingle(),
    db.from('sales_outlets').select('id,outlet_code,outlet_name,outlet_type,active').eq('active',true).order('outlet_name'),
    db.from('resale_listings').select('*').eq('asset_id',id).order('sales_channel')
  ]);
  const asset=assetRes.data;
  if(!asset||!salesStatuses.has(asset.status)||outletRes.error||listingRes.error) return;

  const canManage=['Sent to Sales','Listed','Reserved'].includes(asset.status);
  const outlets=outletRes.data||[];
  const listings=listingRes.data||[];
  const byOutlet=new Map(listings.map(x=>[x.outlet_id||x.sales_channel,x]));
  const defaultTitle=[asset.manufacturer,asset.model,asset.package_name].filter(Boolean).join(' ');
  const defaultDescription=asset.description||'';

  const panel=document.createElement('section');
  panel.id='sales-channels-unified';
  panel.className='valuation-card';
  panel.style.marginTop='1rem';
  let html='<p class="section-kicker">SALES CHANNELS</p><h2>Website and marketplaces</h2><p>This is the only per-product sales area. Save the product details above, then publish directly to the GearCashOut Retail Website or record an external marketplace as submitted/live. There is no Draft or Ready to Upload stage.</p>';
  if(!canManage) html+='<p class="notice"><strong>History mode:</strong> channel records remain visible but publishing is locked for this post-sale status.</p>';
  html+='<div style="display:grid;gap:1rem;margin-top:1rem">';

  for(const outlet of outlets){
    const row=byOutlet.get(outlet.id)||{};
    const website=outlet.outlet_code==='WEBSITE'&&outlet.outlet_type==='owned_storefront';
    const submitted=['Published','Reserved','Sold'].includes(row.status);
    const delist=row.status==='Delist Required';
    const title=row.listing_title||defaultTitle;
    const description=row.listing_description||defaultDescription;
    const price=row.asking_price??asset.approved_resale_price??'';
    const actionLabel=website?(submitted?'UPDATE WEBSITE LISTING':'PUBLISH TO WEBSITE'):(submitted?'UPDATE CHANNEL RECORD':(outlet.outlet_type==='marketplace'?'ADD TO MARKETPLACE / MARK SUBMITTED':'MARK CHANNEL SUBMITTED / LIVE'));
    html+='<article class="sales-channel-block" style="border:1px solid '+(delist?'#c92a2a':'#d7dce2')+';border-radius:10px;padding:1rem;background:#fff">';
    html+='<div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap"><div><h3 style="margin:0">'+esc(outlet.outlet_name)+'</h3><small>'+esc(website?'DIRECT WEBSITE PUBLISHING':outletTypeLabel(outlet.outlet_type))+'</small></div><span class="notice"><strong>'+esc(statusLabel(row.status))+'</strong></span></div>';
    if(delist) html+='<p class="form-message error">This listing must be closed because the item was sold through another channel.</p>';
    html+='<form class="unified-channel-form" data-listing-id="'+esc(row.id||'')+'" data-outlet-id="'+esc(outlet.id)+'" data-website="'+(website?'true':'false')+'">';
    html+='<div style="display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(140px,.45fr) minmax(140px,.45fr);gap:.75rem"><label>Listing title<input name="listing_title" value="'+esc(title)+'" required></label><label>Sale price (£)<input name="asking_price" type="number" min="0" step="0.01" value="'+esc(price)+'" required></label><label>P&amp;P (£)<input name="shipping_cost" type="number" min="0" step="0.01" value="'+esc(row.shipping_cost??'')+'"></label></div>';
    html+='<label>Listing description<textarea name="listing_description" rows="6" required>'+esc(description)+'</textarea></label>';
    html+='<div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center"><button class="btn btn-primary channel-submit" type="submit" '+(delist||!canManage?'disabled':'')+'>'+actionLabel+'</button>';
    if(row.id&&submitted&&!['Sold','Cancelled','Delist Required'].includes(row.status)) html+='<button class="btn btn-secondary mark-sold" type="button" data-listing-id="'+esc(row.id)+'">MARK SOLD</button>';
    if(row.listing_url) html+='<a class="btn btn-secondary" href="'+esc(row.listing_url)+'" target="_blank" rel="noopener">VIEW LISTING</a>';
    html+='<span class="form-message channel-message" aria-live="polite"></span></div></form></article>';
  }
  html+='</div>';
  panel.innerHTML=html;
  root.appendChild(panel);

  panel.querySelectorAll('.unified-channel-form').forEach(form=>form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!canManage) return;
    const fd=new FormData(form);
    const button=form.querySelector('.channel-submit');
    const message=form.querySelector('.channel-message');
    const outlet=outlets.find(x=>x.id===form.dataset.outletId);
    if(!outlet) return;
    button.disabled=true;message.textContent='Saving…';message.className='form-message';
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
    if(form.dataset.website==='true'){
      payload.listing_reference=null;
      payload.listing_url=null;
    }
    const listingId=form.dataset.listingId||null;
    const result=listingId
      ? await db.from('resale_listings').update(Object.assign({},payload,{updated_at:now})).eq('id',listingId)
      : await db.from('resale_listings').insert(payload);
    if(result.error){
      message.textContent=result.error.message;
      message.className='form-message error';
      button.disabled=false;
      return;
    }
    message.textContent=form.dataset.website==='true'?'Published directly to the GearCashOut Retail Website.':'External channel recorded as submitted/live.';
    message.className='form-message success';
    button.disabled=false;
    setTimeout(()=>location.reload(),300);
  }));

  panel.querySelectorAll('.mark-sold').forEach(button=>button.addEventListener('click',async()=>{
    const soldPrice=prompt('Actual sold price (£):');
    if(soldPrice===null) return;
    const price=Number(soldPrice);
    if(!Number.isFinite(price)||price<0){alert('Enter a valid sold price.');return;}
    const fees=Number(prompt('Selling fees (£):','0')||0);
    const shipping=Number(prompt('Shipping cost (£):','0')||0);
    button.disabled=true;
    const result=await db.rpc('staff_mark_resale_listing_sold',{
      p_listing_id:button.dataset.listingId,
      p_sold_price:price,
      p_selling_fees:Number.isFinite(fees)?fees:0,
      p_shipping_cost:Number.isFinite(shipping)?shipping:0
    });
    if(result.error){alert(result.error.message);button.disabled=false;return;}
    location.reload();
  }));
});