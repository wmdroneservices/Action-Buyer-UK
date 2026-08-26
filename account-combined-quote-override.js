/* GearCashOut: authoritative combined customer quote renderer. */
(function(){
  "use strict";
  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let busy=false;
  let lastSignature="";

  function getAuth(){
    const auth=window.actionBuyerAuth;
    if(!auth||!auth.supabase)throw new Error("Your account connection is not ready. Please refresh the page and try again.");
    return auth;
  }

  async function getData(){
    const auth=getAuth();
    const session=await auth.getSession();
    if(!session?.user?.id)return null;
    const {data:valuations,error}=await auth.supabase.from("valuations")
      .select("id,quote_reference,status,submitted_at,quote_data")
      .eq("user_id",session.user.id).is("archived_at",null).order("submitted_at",{ascending:false});
    if(error)throw error;
    const vals=valuations||[];
    const ids=vals.map(v=>v.id);
    if(!ids.length)return {session,vals,items:[],offers:[]};
    const {data:items,error:itemError}=await auth.supabase.from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position")
      .in("valuation_id",ids).order("item_position",{ascending:true});
    if(itemError)throw itemError;
    const itemIds=(items||[]).map(i=>i.id);
    const {data:offers,error:offerError}=itemIds.length?await auth.supabase.from("quote_offers")
      .select("id,item_id,offer_type,amount,status,customer_message,created_at")
      .in("item_id",itemIds).order("created_at",{ascending:false}):{data:[]};
    if(offerError)throw offerError;
    return {session,vals,items:items||[],offers:offers||[]};
  }

  function effectiveOffer(offers,itemId){
    const list=(offers||[]).filter(o=>o.item_id===itemId&&["published","accepted"].includes(o.status));
    const pick=type=>list.filter(o=>o.offer_type===type).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]||null;
    return pick("final")||pick("manual")||pick("automatic");
  }

  async function respond(button,accepted){
    if(busy)return;
    busy=true;button.disabled=true;
    try{
      const auth=getAuth();
      const data=await getData();
      if(!data)throw new Error("Your session has expired. Please sign in again.");
      const groupKey=button.dataset.group;
      const groupVals=(data.vals||[]).filter(v=>(v.quote_data?.submissionKey||v.id)===groupKey);
      const groupIds=new Set(groupVals.map(v=>v.id));
      const groupItems=(data.items||[]).filter(i=>groupIds.has(i.valuation_id));
      const itemId=button.dataset.item;
      const item=groupItems.find(i=>i.id===itemId);
      if(!item)throw new Error("This quote item could not be found. Please refresh the page.");
      if(item.item_status==="accepted")throw new Error("This item has already been accepted.");
      if(item.item_status==="refused")throw new Error("This item has already been refused.");
      const offer=effectiveOffer(data.offers,itemId);
      if(!offer||offer.status!=="published")throw new Error("This offer is no longer available. Please refresh the page.");
      if(!groupVals.some(v=>v.status==="customer_review"))throw new Error("This combined quote is not ready for a customer response yet.");
      const active=groupItems.filter(i=>!['accepted','refused','closed'].includes(i.item_status));
      if(active.some(i=>!effectiveOffer(data.offers,i.id)))throw new Error("This combined quote is incomplete. Please wait until every item has a published offer.");
      if(!confirm(accepted?"Accept this item? It will be added to your GearCashOut basket.":"Refuse this item?"))return;

      const rpc=accepted?"accept_quote_offer":"refuse_quote_offer";
      const {data:result,error}=await auth.supabase.rpc(rpc,{p_offer_id:offer.id});
      if(error)throw error;

      // Notification email is supplementary; the acceptance/refusal itself has
      // already been committed successfully and must not be rolled back because
      // an email provider is unavailable.
      try{
        await auth.supabase.functions.invoke("send-quote-email-v2",{
          body:{offer_id:offer.id,event_type:accepted?"offer_accepted":"offer_refused",response_result:result||null}
        });
      }catch(emailError){console.warn("Offer response email failed:",emailError);}

      lastSignature="";
      await render(true);
    }catch(error){
      alert(error?.message||"The response could not be saved.");
    }finally{
      busy=false;
      button.disabled=false;
    }
  }

  async function render(force){
    const box=document.getElementById("offers");
    const section=document.getElementById("new-quotes-section");
    if(!box||!section||busy)return;
    let data;
    try{data=await getData();}catch(error){console.error("Combined quote load error:",error);return;}
    if(!data)return;

    const groups=new Map();
    for(const v of data.vals){
      const key=v.quote_data?.submissionKey||v.id;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(v);
    }

    const combined=[];
    for(const [key,vals] of groups){
      const ids=new Set(vals.map(v=>v.id));
      const items=data.items.filter(i=>ids.has(i.valuation_id));
      if(items.length<2)continue;
      const offers=data.offers.filter(o=>items.some(i=>i.id===o.item_id));
      const pending=items.filter(i=>!['accepted','refused','closed'].includes(i.item_status));
      const ready=pending.length>0&&pending.every(i=>!!effectiveOffer(offers,i.id));
      const sent=vals.some(v=>v.status==="customer_review");
      const allDecided=items.every(i=>['accepted','refused','closed'].includes(i.item_status));
      if(allDecided)continue;

      const rows=items.map((item,index)=>{
        const offer=effectiveOffer(offers,item.id);
        const title=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ")||"Equipment";
        const pkg=item.package?String(item.package):"";
        let action="<span class=\"status-badge\">AWAITING OFFER</span>";
        if(item.item_status==="accepted")action="<span class=\"status-badge\">ACCEPTED — IN YOUR BASKET</span>";
        else if(item.item_status==="refused")action="<span class=\"status-badge\">REFUSED</span>";
        else if(sent&&ready&&offer)action=`<div class="navigation-buttons"><button type="button" class="btn btn-primary combined-override-accept" data-group="${esc(key)}" data-item="${esc(item.id)}">ACCEPT</button><button type="button" class="btn btn-secondary combined-override-refuse" data-group="${esc(key)}" data-item="${esc(item.id)}">REFUSE</button></div>`;
        return `<article class="valuation-card offer-card" style="margin-bottom:1rem;"><div><span class="valuation-ref">ITEM ${esc(item.item_position||index+1)}</span><p class="section-kicker">${esc(String(item.item_status||"under_assessment").replaceAll("_"," "))}</p><h3>${esc(title)}</h3>${pkg?`<p>${esc(pkg)}</p>`:""}${offer?.customer_message?`<p>${esc(offer.customer_message)}</p>`:""}</div><div class="valuation-meta">${offer?`<strong>${money(offer.amount)}</strong>`:"<strong>Awaiting offer</strong>"}${action}</div></article>`;
      }).join("");
      const quoted=items.reduce((s,i)=>s+(Number(effectiveOffer(offers,i.id)?.amount)||0),0);
      const basket=items.reduce((s,i)=>i.item_status==="accepted"?s+(Number(effectiveOffer(offers,i.id)?.amount)||0):s,0);
      const responded=items.some(i=>['accepted','refused'].includes(i.item_status));
      const badge=!sent?"AWAITING VALUATION":ready?"READY TO RESPOND":"AWAITING FINAL ITEM OFFER";
      const intro=!sent?"GearCashOut is still completing your combined valuation. You cannot accept or refuse any item yet.":ready?"Your combined quote is ready. You can accept or refuse each item separately.":"GearCashOut is still completing this quote. You cannot respond until every item has a published offer.";
      combined.push(`<article class="valuation-card" style="display:grid;gap:1rem;margin-bottom:1.5rem;"><div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:flex-start;"><div><span class="valuation-ref">${esc(vals[0]?.quote_reference||"")}</span><p class="section-kicker">COMBINED QUOTE</p><h3>${items.length} items</h3></div><span class="status-badge">${badge}</span></div><p>${intro}</p><div>${rows}</div><div style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f;font-size:1.1rem;"><strong>${responded?"CURRENT BASKET TOTAL":"COMBINED TOTAL OFFER"}</strong><strong>${money(responded?basket:quoted)}</strong></div></article>`);
    }

    if(!combined.length)return;
    const signature=JSON.stringify(combined);
    if(!force&&signature===lastSignature)return;
    lastSignature=signature;
    box.innerHTML=combined.join("");
    section.style.display="";
    box.querySelectorAll(".combined-override-accept").forEach(b=>b.addEventListener("click",()=>respond(b,true)));
    box.querySelectorAll(".combined-override-refuse").forEach(b=>b.addEventListener("click",()=>respond(b,false)));
  }

  async function init(){
    for(let i=0;i<20;i++){
      await sleep(250);
      try{
        const d=await getData();
        const hasCombined=d?.items?.some(item=>d.items.filter(x=>x.valuation_id===item.valuation_id).length>1);
        if(hasCombined){
          const section=document.getElementById("new-quotes-section");
          const box=document.getElementById("offers");
          if(section&&box){section.style.display="";box.innerHTML="<p>Loading combined valuation...</p>";}
          await render(true);
          break;
        }
      }catch(error){console.error("Combined quote initialisation error:",error);}
    }
    setInterval(()=>render(false),1500);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
