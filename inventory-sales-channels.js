document.addEventListener('DOMContentLoaded', async () => {
  const auth=window.actionBuyerAuth,root=document.getElementById('asset-detail');
  if(!auth||!root) return;
  const session=await auth.getSession(); if(!session) return;
  const db=auth.supabase;
  const staff=(await db.from('staff_users').select('user_id,active').eq('user_id',session.user.id).maybeSingle()).data;
  if(!staff?.active) return;
  const id=new URLSearchParams(location.search).get('id'); if(!id) return;
  const salesStatuses=new Set(['Sent to Sales','Listed','Reserved','Sold','Sold - Awaiting Shipping','Sold - Shipped','Returned','Archived']);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const statusLabel=(row,website)=>{
    if(!row?.status) return 'NOT LISTED';
    if(row.status==='Published') return website?'LIVE ON WEBSITE':'SUBMITTED / LIVE';
    return row.status.toUpperCase();
  };
  const salesChannel=outlet=>({
    WEBSITE:'Website',EBAY:'eBay',FACEBOOK_MARKETPLACE:'Facebook Marketplace',
    AMAZON:'Amazon',VINTED:'Vinted',MARKETPLACE:'Marketplace',CENTRAL:'Central',
    GUMTREE:'Other',OTHER:'Other'
  })[outlet.outlet_code]||'Other';

  for(let i=0;i<140&&!root.querySelector('#sales-listing-editor');i++) await new Promise(r=>setTimeout(r,75));
  if(!root.querySelector('#sales-listing-editor')) return;

  const [assetRes,outletRes,listingRes]=await Promise.all([
    db.from('inventory_assets').select('*').eq('id',id).maybeSingle(),
    db.from('sales_outlets').select('id,outlet_code,outlet_name,outlet_type,active').eq('active',true),
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
  let html='<p class="section-kicker">SALES CHANNELS</p><h2>Website first, then marketplaces</h2><p>Save the master listing details above. Then publish directly to the GearCashOut website or record a marketplace as submitted/live with one click. There is no Draft or Ready to Upload stage.</p>';
  if(!canManage) html+='<p class="notice"><strong>History mode:</strong> this item is no longer open for new publishing actions.</p>';
  html+='<div style="display:grid;gap:.75rem;margin-top:1rem">';
  for(const outlet of outlets){
    const row=byOutlet.get(outlet.id)||null;
    const website=outlet.outlet_code==='WEBSITE'&&outlet.outlet_type==='owned_storefront';
    const delist=row?.status==='Delist Required';
    const reserved=row?.status==='Reserved';
    const closureText=website
      ?'Automatically removed from the GearCashOut website because the item sold through another channel.'
      :'MANUAL ACTION REQUIRED: close or remove this external listing. No marketplace API closure is currently configured for this outlet.';
    const action=website?(row?'UPDATE WEBSITE LISTING':'SEND TO WEBSITE'):(row?'UPDATE MARKETPLACE RECORD':'ADD TO MARKETPLACE');
    html+='<article style="border:1px solid '+(delist?'#c92a2a':'#d7dce2')+';border-radius:10px;padding:1rem;background:#fff">'
      +'<div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap"><div><h3 style="margin:0">'+esc(outlet.outlet_name)+'</h3><small>'+esc(website?'PRIMARY WEBSITE':'MARKETPLACE / EXTERNAL CHANNEL')+'</small></div><span class="notice"><strong>'+esc(statusLabel(row,website))+'</strong></span></div>'
      +(delist?'<p class="form-message error">'+esc(closureText)+'</p>':'')
      +'<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem">'
      +(canManage&&!delist?'<button class="btn btn-primary channel-action" type="button" data-outlet-id="'+esc(outlet.id)+'" data-website="'+(website?'true':'false')+'" data-listing-id="'+esc(row?.id||'')+'" '+(reserved?'disabled title="Reserved listings are not republished from this screen."':'')+'>'+esc(reserved?'RESERVED':action)+'</button>':'')
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
    const title=String(c.listing_title||[a.manufacturer,a.model,a.package_name].filter(Boolean).join(' ')).trim();
    const description=String(c.listing_notes||a.description||'').trim();
    const price=c.asking_price??a.approved_resale_price;
    const shipping=c.postage_packing??0;
    if(!title||!description||price===null||price===undefined||price===''){
      message.textContent='Save the master listing title, description and sale price above before sending to a sales channel.';
      message.className='form-message error';button.disabled=false;return;
    }
    const existing=button.dataset.listingId?listings.find(x=>x.id===button.dataset.listingId):null;
    const now=new Date().toISOString();
    const payload={
      asset_id:id,outlet_id:outlet.id,sales_channel:salesChannel(outlet),
      status:existing?.status==='Reserved'?'Reserved':'Published',
      asking_price:Number(price),shipping_cost:Number(shipping)||0,
      listing_title:title,listing_description:description,
      published_at:existing?.published_at||now,updated_at:now,
      listing_data:{
        outlet_code:outlet.outlet_code,outlet_name:outlet.outlet_name,
        transaction_number:a.transaction_number,manufacturer:a.manufacturer,model:a.model,
        // Only the staff inspection condition is carried into resale channel data.
        package_name:a.package_name,condition:a.condition_grade,
        package_contents:a.final_package_contents,serial_number:a.serial_number,
        actual_battery_count:a.actual_battery_count
      }
    };
    const result=existing
      ?await db.from('resale_listings').update(payload).eq('id',existing.id)
      :await db.from('resale_listings').insert(payload);
    if(result.error){message.textContent=result.error.message;message.className='form-message error';button.disabled=false;return;}
    message.textContent=button.dataset.website==='true'?'Published directly to the GearCashOut Retail Website.':'Marketplace recorded as submitted / live.';
    message.className='form-message success';
    setTimeout(()=>location.reload(),350);
  }));

  panel.querySelectorAll('.mark-sold').forEach(button=>button.addEventListener('click',async()=>{
    const soldPrice=prompt('Actual sold price (£):');if(soldPrice===null) return;
    const price=Number(soldPrice);if(!Number.isFinite(price)||price<0){alert('Enter a valid sold price.');return;}
    const fees=Number(prompt('Selling fees (£):','0')||0),shipping=Number(prompt('Shipping cost (£):','0')||0);
    button.disabled=true;
    const result=await db.rpc('staff_mark_resale_listing_sold',{p_listing_id:button.dataset.listingId,p_sold_price:price,p_selling_fees:Number.isFinite(fees)?fees:0,p_shipping_cost:Number.isFinite(shipping)?shipping:0});
    if(result.error){alert(result.error.message);button.disabled=false;return;}
    location.reload();
  }));
});