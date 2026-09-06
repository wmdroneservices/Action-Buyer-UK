document.addEventListener('DOMContentLoaded',async()=>{
  const auth=window.actionBuyerAuth;
  const list=document.getElementById('sales-customer-returns-list');
  if(!auth||!list)return;
  const session=await auth.getSession();
  if(!session){location.href='login.html?return=sales-customer-returns.html';return;}
  const db=auth.supabase;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  const money=v=>v===null||v===undefined||v===''?'Not recorded':'£'+Number(v).toFixed(2);
  const dateTime=v=>v?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'Not recorded';
  const options=(values,selected='')=>values.map(v=>'<option'+(v===selected?' selected':'')+'>'+esc(v)+'</option>').join('');

  async function load(){
    const [{data:rows,error},{data:assets}]=await Promise.all([
      db.from('sales_customer_returns').select('*').order('created_at',{ascending:false}),
      db.from('inventory_assets').select('id,sku,transaction_number,manufacturer,model,sold_at,sold_price,sold_channel')
    ]);
    if(error){list.innerHTML='<p>'+esc(error.message)+'</p>';return;}
    if(!(rows||[]).length){
      list.innerHTML='<div class="empty-account"><h3>No post-sale customer returns</h3><p>Open a return from Sold Items when a buyer contacts you.</p></div>';
      return;
    }

    list.innerHTML=rows.map(r=>{
      const a=(assets||[]).find(x=>x.id===r.asset_id)||{};
      const product=[a.manufacturer,a.model].filter(Boolean).join(' ')||'Product';
      let action='';

      if(r.status==='Requested'){
        action='<button class="btn btn-primary return-action" data-id="'+r.id+'" data-action="approve">APPROVE RETURN</button> <button class="btn btn-secondary refuse" data-id="'+r.id+'">REFUSE RETURN</button>';
      }else if(r.status==='Approved'){
        action=labelForm(r);
      }else if(r.status==='Label Created'){
        action='<div class="notice"><strong>Return label recorded</strong><br>Carrier: '+esc(r.carrier||'Not recorded')+'<br>Tracking: '+esc(r.tracking_number||'Not recorded')+'<br>Label cost: '+money(r.return_label_cost)+'</div>'+labelForm(r)+'<div style="margin-top:.75rem"><button class="btn btn-primary return-action" data-id="'+r.id+'" data-action="collected">MARK RETURN COLLECTED</button></div>';
      }else if(r.status==='Collected'){
        action='<button class="btn btn-primary return-action" data-id="'+r.id+'" data-action="received">MARK ITEM RECEIVED</button>';
      }else if(r.status==='Item Received'){
        action=closureForm(r,assets||[]);
      }else if(r.status==='Resolved'){
        action=closureSummary(r,assets||[]);
      }else if(r.status==='Refused'){
        action='<div class="notice"><strong>Return refused</strong><br>'+esc(r.refusal_reason||'No refusal reason recorded')+'</div>';
      }

      const transaction='<div class="notice" style="margin-top:.75rem"><strong>Transaction and return timeline</strong><br><br><strong>Sold:</strong> '+dateTime(a.sold_at)+'<br><strong>Customer paid:</strong> '+money(a.sold_price)+'<br><strong>Sales channel:</strong> '+esc(a.sold_channel||'Not recorded')+'<br><br><strong>Return opened:</strong> '+dateTime(r.created_at)+'<br><strong>Return collected:</strong> '+dateTime(r.collected_at)+'<br><strong>Item returned to GearCashOut:</strong> '+dateTime(r.item_received_at)+'</div>';
      return '<article class="valuation-card" style="margin-bottom:1rem"><p class="section-kicker">'+esc(r.status)+'</p><h2>'+esc(product)+'</h2><p>'+esc(r.return_reference)+' · SKU '+esc(a.sku||'Not recorded')+' · '+esc(a.transaction_number||'')+'</p>'+transaction+'<div class="notice" style="margin-top:.75rem"><strong>Reason</strong><br>'+esc(r.reason)+'<br><br><strong>Customer notes</strong><br>'+esc(r.customer_notes||'None recorded')+'</div><div style="margin-top:1rem">'+action+'</div></article>';
    }).join('');

    bindEvents();
  }

  function labelForm(r={}){
    return '<form class="label-form" data-id="'+esc(r.id||'')+'" style="display:grid;gap:.6rem;margin-top:1rem"><h3 style="margin:0">Return shipping label</h3><label>Carrier<input name="carrier" required value="'+esc(r.carrier||'')+'"></label><label>Tracking number<input name="tracking" value="'+esc(r.tracking_number||'')+'"></label><label>Label URL<input name="url" type="url" value="'+esc(r.label_url||'')+'"></label><label>Return label cost (£)<input name="label_cost" type="number" min="0" step="0.01" value="'+esc(r.return_label_cost??'')+'"></label><button class="btn btn-primary">SAVE RETURN LABEL AND COST</button></form>';
  }

  function closureForm(r,assets){
    const disposition=['Returned to Stock / Resale','Sent to Auction','Broken Down for Spares','Sent for Repair','Second-hand Spares Sale','Written Off / Recycled','Other'];
    const resolution=['Full Refund','Partial Refund','Replacement Item','Refund and Replacement','No Customer Payment','Other'];
    const refundMethods=['Card Refund','Bank Transfer','Cash','Store Credit','Other','Not Applicable'];
    const replacementOptions='<option value="">No linked replacement asset</option>'+assets.map(a=>'<option value="'+esc(a.id)+'">'+esc([a.sku,a.manufacturer,a.model].filter(Boolean).join(' · '))+'</option>').join('');
    return '<form class="closure-form" data-id="'+esc(r.id)+'" style="display:grid;gap:.75rem;margin-top:1rem"><h3 style="margin:0">Return assessment and financial closure</h3><p style="margin:0">These details are required before the return can be resolved and retained for the future accounts trail.</p><label>What happened? / assessment<textarea name="resolution_summary" required></textarea></label><label>Damage or condition found on return<textarea name="damage_assessment" required></textarea></label><label>What happened to the returned item?<select name="item_disposition" required><option value="">Select outcome</option>'+options(disposition)+'</select></label><label>Outcome notes<textarea name="item_disposition_notes"></textarea></label><label>How was the customer resolved?<select name="customer_resolution_type" required><option value="">Select customer resolution</option>'+options(resolution)+'</select></label><label>Refund method<select name="refund_method"><option value="">Select if a refund was made</option>'+options(refundMethods)+'</select></label><label>Refund provider / processor<input name="refund_provider" placeholder="e.g. Stripe"></label><label>Refund amount (£)<input name="refund_amount" type="number" min="0" step="0.01"></label><label>Refund transaction / reference<input name="refund_reference"></label><label>Replacement inventory item<select name="replacement_asset_id">'+replacementOptions+'</select></label><label>Replacement reference / tracking<input name="replacement_reference"></label><label>Replacement notes<textarea name="replacement_notes"></textarea></label><button class="btn btn-primary">COMPLETE RETURN ASSESSMENT AND RESOLVE</button></form>';
  }

  function closureSummary(r,assets){
    const replacement=(assets||[]).find(a=>a.id===r.replacement_asset_id);
    return '<div class="notice"><strong>Return resolved</strong><br><br><strong>What happened</strong><br>'+esc(r.resolution_summary||r.staff_notes||'Not recorded')+'<br><br><strong>Damage / condition</strong><br>'+esc(r.damage_assessment||'Not recorded')+'<br><br><strong>Item outcome</strong><br>'+esc(r.item_disposition||'Not recorded')+(r.item_disposition_notes?'<br>'+esc(r.item_disposition_notes):'')+'<br><br><strong>Customer resolution</strong><br>'+esc(r.customer_resolution_type||'Not recorded')+'<br>Refund method: '+esc(r.refund_method||'Not applicable')+'<br>Provider: '+esc(r.refund_provider||'Not recorded')+'<br>Refund amount: '+money(r.refund_amount)+'<br>Refund reference: '+esc(r.refund_reference||'Not recorded')+'<br>Replacement: '+esc(replacement?[replacement.sku,replacement.manufacturer,replacement.model].filter(Boolean).join(' · '):r.replacement_reference||'None recorded')+(r.replacement_notes?'<br>Replacement notes: '+esc(r.replacement_notes):'')+'</div>';
  }

  function bindEvents(){
    const rpc=(id,action,args={})=>db.rpc('staff_update_sales_customer_return',{p_return_id:id,p_action:action,p_label_url:null,p_carrier:null,p_tracking_number:null,p_refusal_reason:null,p_staff_notes:null,...args});

    list.querySelectorAll('.return-action').forEach(b=>b.addEventListener('click',async()=>{
      const {error}=await rpc(b.dataset.id,b.dataset.action);
      if(error){alert(error.message);return;}
      load();
    }));

    list.querySelectorAll('.refuse').forEach(b=>b.addEventListener('click',async()=>{
      const reason=prompt('Reason for refusing the return:');
      if(reason===null)return;
      const {error}=await rpc(b.dataset.id,'refuse',{p_refusal_reason:reason});
      if(error){alert(error.message);return;}
      load();
    }));

    list.querySelectorAll('.label-form').forEach(f=>f.addEventListener('submit',async e=>{
      e.preventDefault();
      const fd=new FormData(f);
      const cost=String(fd.get('label_cost')||'').trim();
      const {error}=await db.rpc('staff_record_sales_customer_return_label',{
        p_return_id:f.dataset.id,
        p_carrier:String(fd.get('carrier')||'').trim(),
        p_tracking_number:String(fd.get('tracking')||'').trim()||null,
        p_label_url:String(fd.get('url')||'').trim()||null,
        p_label_cost:cost===''?null:Number(cost)
      });
      if(error){alert(error.message);return;}
      load();
    }));

    list.querySelectorAll('.closure-form').forEach(f=>f.addEventListener('submit',async e=>{
      e.preventDefault();
      const fd=new FormData(f);
      const amount=String(fd.get('refund_amount')||'').trim();
      const {error}=await db.rpc('staff_resolve_sales_customer_return',{
        p_return_id:f.dataset.id,
        p_resolution_summary:String(fd.get('resolution_summary')||'').trim(),
        p_damage_assessment:String(fd.get('damage_assessment')||'').trim(),
        p_item_disposition:String(fd.get('item_disposition')||'').trim(),
        p_item_disposition_notes:String(fd.get('item_disposition_notes')||'').trim()||null,
        p_customer_resolution_type:String(fd.get('customer_resolution_type')||'').trim(),
        p_refund_method:String(fd.get('refund_method')||'').trim()||null,
        p_refund_provider:String(fd.get('refund_provider')||'').trim()||null,
        p_refund_amount:amount===''?null:Number(amount),
        p_refund_reference:String(fd.get('refund_reference')||'').trim()||null,
        p_replacement_asset_id:String(fd.get('replacement_asset_id')||'').trim()||null,
        p_replacement_reference:String(fd.get('replacement_reference')||'').trim()||null,
        p_replacement_notes:String(fd.get('replacement_notes')||'').trim()||null
      });
      if(error){alert(error.message);return;}
      load();
    }));
  }

  await load();
});