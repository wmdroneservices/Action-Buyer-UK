document.addEventListener("DOMContentLoaded", async () => {
  const auth=window.actionBuyerAuth, list=document.getElementById("purchase-returns-list"), summary=document.getElementById("purchase-returns-summary"), message=document.getElementById("purchase-returns-message");
  if(!auth||!list||!summary)return;
  const session=await auth.getSession();
  if(!session){location.href="login.html?return=purchase-returns.html";return;}
  const {data:staff}=await auth.supabase.from("staff_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(!staff){location.href="account.html";return;}
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const notice=(text,ok=true)=>{message.textContent=text;message.className="form-message "+(ok?"success":"error");};
  const label=s=>({return_required:"RETURN REQUIRED",return_arranged:"RETURN ARRANGED",dispatched:"RETURN DISPATCHED",delivered:"RETURN DELIVERED",closed:"CASE CLOSED"}[s]||"RETURN REVIEW");

  async function load(){
    const {data:refused,error}=await auth.supabase.from("quote_items").select("id,valuation_id,item_name,manufacturer,model,item_status,valuations(quote_reference,quote_data)").eq("item_status","refused").order("updated_at",{ascending:false});
    if(error){list.innerHTML="<p>Could not load refused valuation items.</p>";return;}
    const items=refused||[], ids=items.map(x=>x.id);
    const {data:cases,error:caseError}=ids.length?await auth.supabase.from("purchase_return_cases").select("*").in("quote_item_id",ids):{data:[],error:null};
    if(caseError){list.innerHTML="<p>Could not load purchase return cases.</p>";return;}
    const byItem=new Map((cases||[]).map(c=>[c.quote_item_id,c]));
    const open=items.filter(i=>{const c=byItem.get(i.id);return !c||c.status!=="closed";});
    const count=s=>open.filter(i=>byItem.get(i.id)?.status===s).length;
    summary.innerHTML='<div style="display:flex;gap:1.5rem;flex-wrap:wrap"><div><strong>'+open.length+'</strong><br>open return case'+(open.length===1?"":"s")+'</div><div><strong>'+count("return_arranged")+'</strong><br>arranged</div><div><strong>'+count("dispatched")+'</strong><br>dispatched</div><div><strong>'+count("delivered")+'</strong><br>awaiting closure</div></div>';
    if(!items.length){list.innerHTML='<div class="empty-account"><h3>No purchase returns currently required</h3><p>No refused valuation items are waiting in the purchasing return workflow.</p></div>';return;}
    list.innerHTML=items.map(item=>{
      const c=byItem.get(item.id), name=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ")||item.item_name||"Unnamed item";
      const ref=item.valuations?.quote_reference||"Valuation", customer=item.valuations?.quote_data?.fullName||item.valuations?.quote_data?.customerName||"Customer";
      const next=!c?"START RETURN CASE":c.status==="return_required"?"ARRANGE RETURN":c.status==="return_arranged"?"MARK DISPATCHED":c.status==="dispatched"?"MARK DELIVERED":c.status==="delivered"?"CLOSE CASE":"CASE CLOSED";
      const fields=!c||["return_required","return_arranged"].includes(c.status)
        ? '<label>Carrier <input data-field="carrier" data-id="'+esc(item.id)+'" value="'+esc(c?.carrier||"")+'" type="text"></label><label>Tracking number <input data-field="tracking" data-id="'+esc(item.id)+'" value="'+esc(c?.tracking_number||"")+'" type="text"></label><label>Return label URL <input data-field="label" data-id="'+esc(item.id)+'" value="'+esc(c?.return_label_url||"")+'" type="url" placeholder="https://..."></label>' : '';
      return '<article class="valuation-card" style="margin-top:1rem"><div><p class="section-kicker">'+esc(ref)+' · '+esc(label(c?.status||"return_required"))+'</p><h3>'+esc(name)+'</h3><p>Customer: '+esc(customer)+'</p><p><strong>Important:</strong> This item remains customer property and must not be sent to Inventory.</p>'+(c?.carrier?'<p>Carrier: '+esc(c.carrier)+(c.tracking_number?' · Tracking: '+esc(c.tracking_number):'')+'</p>':'')+'</div><div class="valuation-meta"><div class="shipment-form" style="margin-top:0">'+fields+'<label>Notes <textarea data-field="notes" data-id="'+esc(item.id)+'" rows="2">'+esc(c?.notes||"")+'</textarea></label><button class="btn btn-primary return-action" data-item="'+esc(item.id)+'" data-valuation="'+esc(item.valuation_id)+'" data-case="'+esc(c?.id||"")+'" data-status="'+esc(c?.status||"new")+'" type="button">'+next+'</button><a class="btn btn-secondary" href="admin-valuations.html">VIEW VALUATION</a></div></div></article>';
    }).join("");

    list.querySelectorAll(".return-action").forEach(button=>button.addEventListener("click",async()=>{
      button.disabled=true;
      const itemId=button.dataset.item, valuationId=button.dataset.valuation, current=button.dataset.status;
      const get=(field)=>list.querySelector('[data-field="'+field+'"][data-id="'+itemId+'"]')?.value.trim()||null;
      const carrier=get("carrier"), tracking=get("tracking"), returnLabel=get("label"), notes=get("notes");
      let payload, result;
      if(current==="new"){
        payload={quote_item_id:itemId,valuation_id:valuationId,status:"return_required",carrier,tracking_number:tracking,return_label_url:returnLabel,notes,created_by:session.user.id,updated_by:session.user.id};
        result=await auth.supabase.from("purchase_return_cases").insert(payload);
      }else{
        const next={return_required:"return_arranged",return_arranged:"dispatched",dispatched:"delivered",delivered:"closed"}[current];
        payload={status:next,carrier,tracking_number:tracking,return_label_url:returnLabel,notes,updated_by:session.user.id};
        if(next==="return_arranged")payload.arranged_at=new Date().toISOString();
        if(next==="dispatched")payload.dispatched_at=new Date().toISOString();
        if(next==="delivered")payload.delivered_at=new Date().toISOString();
        if(next==="closed")payload.closed_at=new Date().toISOString();
        result=await auth.supabase.from("purchase_return_cases").update(payload).eq("id",button.dataset.case);
      }
      if(result.error){notice(result.error.message||"Could not update the purchase return.",false);button.disabled=false;return;}
      notice("Purchase return updated.");await load();
    }));
  }
  await load();
});