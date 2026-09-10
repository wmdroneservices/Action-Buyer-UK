document.addEventListener('DOMContentLoaded', async () => {
  const auth=window.actionBuyerAuth,root=document.getElementById('asset-detail');
  if(!auth||!root) return;
  const removePurchasingLink=()=>root.querySelectorAll('a[href="admin-purchasing.html"]').forEach(link=>link.remove());
  removePurchasingLink();
  new MutationObserver(removePurchasingLink).observe(root,{childList:true,subtree:true});
  const session=await auth.getSession(); if(!session) return;
  const db=auth.supabase;
  const staff=(await db.from('staff_users').select('user_id,active').eq('user_id',session.user.id).maybeSingle()).data;
  if(!staff?.active) return;
  const id=new URLSearchParams(location.search).get('id'); if(!id) return;
  const salesStatuses=new Set(['Sent to Sales','Listed','Reserved','Sold','Sold - Awaiting Shipping','Sold - Shipped','Returned','Archived']);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const statusLabel=(row,website)=>{
    if(!row?.status) return 'NOT LISTED';
    if(row.status==='Published') return website?'LIVE ON WEBSITE':'SUBMITTED / LIVE';
    return row.status.toUpperCase();
  };
  const salesChannel=outlet=>({WEBSITE:'Website',EBAY:'eBay',FACEBOOK_MARKETPLACE:'Facebook Marketplace',AMAZON:'Amazon',VINTED:'Vinted',MARKETPLACE:'Marketplace',CENTRAL:'Central',GUMTREE:'Other',OTHER:'Other'})[outlet.outlet_code]||'Other';
  const websiteUrl=(row,outlet)=>{
    if(!row?.id) return null;
    if(row.listing_url) return row.listing_url;
    const base=String(outlet?.public_base_url||'').trim().replace(/\/+$/,'');
    return base?`${base}/product.html?listing=${encodeURIComponent(row.id)}`:null;
  };

  for(let i=0;i<140&&!root.querySelector('#sales-listing-editor');i++) await new Promise(r=>setTimeout(r,75));
  if(!root.querySelector('#sales-listing-editor')) return;

  const [assetRes,outletRes,listingRes]=await Promise.all([
    db.from('inventory_assets').select('*').eq('id',id).maybeSingle(),
    db.from('sales_outlets').select('id,outlet_code,outlet_name,outlet_type,active,public_base_url').eq('active',true),
    db.from('resale_listings').select('*').eq('asset_id',id)
  ]);
  const asset=assetRes.data;
  if(!asset||!salesStatuses.has(asset.status)||outletRes.error||listingRes.error) return;
  const canManage=['Sent to Sales','Listed','Reserved'].includes(asset.status);
  const listings=listingRes.data||[];
  const byOutlet=new Map(listings.map(x=>[x.outlet_id,x]));
  const outlets=(outletRes.data||[]).slice().sort((a,b)=>{
    const aw=a.outlet_code==='WEBSITE'?0:(a.outlet_type==='marketplace'?1:2);
    const bw=b.outlet_code==='WEBSITE'?0:(b.outlet_type==='marketplace'?1:2);
    return aw-bw||a.outlet_name.localeCompare(b.outlet_name);
  });

  const panel=document.createElement('section');
  panel.id='sales-channels-unified';panel.className='valuation-card';panel.style.marginTop='1rem';
  const websiteOutlet=outlets.find(x=>x.outlet_code==='WEBSITE'&&x.outlet_type==='owned_storefront');
  const websiteListing=websiteOutlet?byOutlet.get(websiteOutlet.id):null;
  const websiteLive=websiteListing?.status==='Published';
  let html='<p class="section-kicker">SALES CHANNELS</p><h2>Website first, then marketplaces</h2><p>Save the master listing details above. Then publish directly to the GearCashOut website or record a marketplace as submitted/live with one click. Sold listings remain available here for post-sale corrections such as the actual sold price.</p>'
    +(websiteLive?'<div class="notice" style="margin-top:.75rem;border-left:4px solid #286b45"><strong>WEBSITE STATUS: LIVE ON GEARCASHOUT</strong><br>This item has a Published WEBSITE listing. The public storefront receives published WEBSITE stock through the live storefront query.</div>':'');
  if(!canManage) html+='<p class="notice"><strong>History mode:</strong> this item is no longer open for new publishing actions. Sold listing details that are explicitly editable remain available below.</p>';
  html+='<div style="display:grid;gap:.75rem;margin-top:1rem">';
  for(const outlet of outlets){
    const row=byOutlet.get(outlet.id)||null;
    const website=outlet.outlet_code==='WEBSITE'&&outlet.outlet_type==='owned_storefront';
    const delist=row?.status==='Delist Required';
    const reserved=row?.status==='Reserved';
    const sold=row?.status==='Sold';
    const closureText=website?'Automatically removed from the GearCashOut website because the item sold through another channel.':'MANUAL ACTION REQUIRED: close or remove this external listing. No marketplace API closure is currently configured for this outlet.';
    const action=website?(row?'UPDATE WEBSITE LISTING':'SEND TO WEBSITE'):(row?'UPDATE MARKETPLACE RECORD':'ADD TO MARKETPLACE');
    html+='<article style="border:1px solid '+(delist?'#c92a2a':'#d7dce2')+';border-radius:10px;padding:1rem;background:#fff">'
      +'<div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap"><div><h3 style="margin:0">'+esc(outlet.outlet_name)+'</h3><small>'+esc(website?'PRIMARY WEBSITE':'MARKETPLACE / EXTERNAL CHANNEL')+'</small></div><span class="notice"><strong>'+esc(statusLabel(row,website))+'</strong></span></div>'
      +(delist?'<p class="form-message error">'+esc(closureText)+'</p>':'')
      +(!website?'<label style="display:block;margin-top:.75rem"><strong>LIVE LISTING LINK</strong><input class="channel-listing-url" type="url" value="'+esc(row?.listing_url||'')+'" placeholder="Paste the live marketplace URL after publishing"></label>':'')
      +(sold?'<div style="margin-top:.85rem;padding:.85rem 1rem;background:#fff8e8;border:1px solid #e3b24f;border-radius:8px"><strong>ACTUAL SOLD PRICE</strong><div style="display:flex;gap:.6rem;align-items:end;flex-wrap:wrap;margin-top:.45rem"><label style="min-width:180px;max-width:240px">eBay sale price (£)<input class="sold-price-input" type="number" min="0.01" step="0.01" value="'+esc(row.sold_price??'')+'" data-listing-id="'+esc(row.id)+'"></label><button class="btn btn-secondary update-sold-price" type="button" data-listing-id="'+esc(row.id)+'">SAVE SOLD PRICE</button><span class="form-message sold-price-message" aria-live="polite"></span></div><small>Changing this updates the authoritative sold price on the listing and the physical inventory record. It does not reopen the listing.</small></div>':'')
      +'<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">'
      +(canManage&&!delist?'<button class="btn btn-primary channel-action" type="button" data-outlet-id="'+esc(outlet.id)+'" data-website="'+(website?'true':'false')+'" data-listing-id="'+esc(row?.id||'')+'" '+(reserved?'disabled title="Reserved listings are not republished from this screen."':'')+'>'+esc(reserved?'RESERVED':action)+'</button>':'')
      +(website&&websiteUrl(row,outlet)?'<a class="btn btn-secondary" href="'+esc(websiteUrl(row,outlet))+'" target="_blank" rel="noopener">VIEW ON WEBSITE</a>':'')
      +(!website&&row?.listing_url?'<a class="btn btn-secondary" href="'+esc(row.listing_url)+'" target="_blank" rel="noopener">VIEW ON '+esc(outlet.outlet_name.toUpperCase())+'</a>':'')
      +(row?.id&&['Published','Reserved'].includes(row.status)&&!delist?'<button class="btn btn-secondary mark-sold" type="button" data-listing-id="'+esc(row.id)+'">MARK SOLD</button>':'')
      +'</div><p class="form-message channel-message" aria-live="polite"></p></article>';
  }
  html+='</div>';panel.innerHTML=html;root.appendChild(panel);

  async function getMaster(){
    const [contentRes,assetRes]=await Promise.all([
      db.from('inventory_sales_content').select('*').eq('asset_id',id).maybeSingle(),
      db.from('inventory_assets').select('*').eq('id',id).maybeSingle()
    ]);
    if(contentRes.error) return {error:contentRes.error};
    if(assetRes.error) return {error:assetRes.error};
    const a=assetRes.data||{},c=contentRes.data||{};
    return {asset:a,content:c,error:null};
  }

  panel.querySelectorAll('.channel-action').forEach(button=>button.addEventListener('click',async()=>{
    const message=button.closest('article').querySelector('.channel-message');
    button.disabled=true;message.textContent='Preparing channel listing…';message.className='form-message';
    const outlet=outlets.find(x=>x.id===button.dataset.outletId);
    const master=await getMaster();
    if(master.error){message.textContent=master.error.message;message.className='form-message error';button.disabled=false;return;}
    const a=master.asset,c=master.content;
    const existing=button.dataset.listingId?listings.find(x=>x.id===button.dataset.listingId):null;
    const title=String(c.listing_title||existing?.listing_title||[a.manufacturer,a.model,a.package_name].filter(Boolean).join(' ')).trim();
    const manufacturerDescription=String(c.manufacturer_description||'').trim();
    const staffDescription=String(c.listing_notes||a.description||existing?.listing_description||'').trim();
    const conditionDescription=String(c.condition_description||'').trim();
    const description=[manufacturerDescription,staffDescription,conditionDescription].filter(Boolean).join('\n\n');
    const price=c.asking_price??a.approved_resale_price??existing?.asking_price;
    const shipping=c.postage_packing??existing?.shipping_cost??0;
    if(!title||!description||price===null||price===undefined||price===''){
      message.textContent='Save the master listing title, description and sale price above before sending to a sales channel.';
      message.className='form-message error';button.disabled=false;return;
    }
    const liveUrl=button.closest('article').querySelector('.channel-listing-url')?.value.trim()||null;
    const now=new Date().toISOString();
    const payload={asset_id:id,outlet_id:outlet.id,sales_channel:salesChannel(outlet),status:existing?.status==='Reserved'?'Reserved':'Published',asking_price:Number(price),shipping_cost:Number(shipping)||0,listing_title:title,listing_description:description,listing_url:button.dataset.website==='true'?(existing?.listing_url||null):liveUrl,published_at:existing?.published_at||now,updated_at:now,listing_data:{outlet_code:outlet.outlet_code,outlet_name:outlet.outlet_name,transaction_number:a.transaction_number,manufacturer:a.manufacturer,model:a.model,package_name:a.package_name,condition:a.condition_grade,manufacturer_description:manufacturerDescription,staff_description:staffDescription,condition_description:conditionDescription,missing_parts:a.package_notes||null,package_contents:a.final_package_contents,serial_number:a.serial_number,actual_battery_count:a.actual_battery_count,listing_photo_paths:Array.isArray(c.listing_photo_paths)?c.listing_photo_paths:[]}};
    const result=existing?await db.from('resale_listings').update(payload).eq('id',existing.id):await db.from('resale_listings').insert(payload);
    if(result.error){message.textContent=result.error.message;message.className='form-message error';button.disabled=false;return;}
    message.textContent=button.dataset.website==='true'?'Published directly to the GearCashOut Retail Website.':'Marketplace recorded as submitted / live.';
    message.className='form-message success';setTimeout(()=>location.reload(),350);
  }));

  panel.querySelectorAll('.update-sold-price').forEach(button=>button.addEventListener('click',async()=>{
    const article=button.closest('article');
    const input=article.querySelector('.sold-price-input');
    const message=article.querySelector('.sold-price-message');
    const price=Number(input.value);
    if(!Number.isFinite(price)||price<=0){message.textContent='Enter a positive actual sold price.';message.className='form-message error';return;}
    button.disabled=true;message.textContent='Saving sold price…';message.className='form-message';
    const result=await db.rpc('staff_correct_sold_price',{p_listing_id:button.dataset.listingId,p_sold_price:price});
    if(result.error){message.textContent=result.error.message;message.className='form-message error';button.disabled=false;return;}
    message.textContent='Sold price updated.';message.className='form-message success';
    setTimeout(()=>location.reload(),350);
  }));

  panel.querySelectorAll('.mark-sold').forEach(button=>button.addEventListener('click',async()=>{
    const soldPrice=prompt('Actual sold price (£):');if(soldPrice===null) return;
    const price=Number(soldPrice);if(!Number.isFinite(price)||price<=0){alert('Enter a positive sold price.');return;}
    const fees=Number(prompt('Selling fees (£):','0')||0),shipping=Number(prompt('Shipping cost (£):','0')||0);
    button.disabled=true;
    const result=await db.rpc('staff_mark_resale_listing_sold',{p_listing_id:button.dataset.listingId,p_sold_price:price,p_selling_fees:Number.isFinite(fees)&&fees>=0?fees:0,p_shipping_cost:Number.isFinite(shipping)&&shipping>=0?shipping:0});
    if(result.error){alert(result.error.message);button.disabled=false;return;}
    location.reload();
  }));
});