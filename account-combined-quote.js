/* GearCashOut: customer quote presentation for combined submissions only. */
(function(){
  "use strict";
  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const effectiveOffer=(offers,itemId)=>{
    const list=(offers||[]).filter(o=>o.item_id===itemId&&["published","accepted"].includes(o.status));
    return list.find(o=>o.offer_type==="final")||list.find(o=>o.offer_type==="manual")||list.find(o=>o.offer_type==="automatic")||null;
  };
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  async function getData(){
    const auth=window.actionBuyerAuth;
    if(!auth)return null;
    const session=await auth.getSession();
    if(!session?.user?.id)return null;
    const {data:vals,error}=await auth.supabase.from("valuations")
      .select("id,quote_reference,status,submitted_at,quote_data")
      .eq("user_id",session.user.id).is("archived_at",null).order("submitted_at",{ascending:false});
    if(error)throw error;
    const ids=(vals||[]).map(v=>v.id);
    if(!ids.length)return {auth,session,vals:[],items:[],offers:[]};
    const {data:items,error:itemError}=await auth.supabase.from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position")
      .in("valuation_id",ids).order("item_position",{ascending:true});
    if(itemError)throw itemError;
    const itemIds=(items||[]).map(i=>i.id);
    const {data:offers,error:offerError}=itemIds.length?await auth.supabase.from("quote_offers")
      .select("id,item_id,offer_type,amount,status,customer_message,created_at")
      .in("item_id",itemIds).order("created_at",{ascending:false}):{data:[]};
    if(offerError)throw offerError;
    return {auth,session,vals:vals||[],items:items||[],offers:offers||[]};
  }

  async function load(){
    const combinedSection=document.getElementById("combined-quotes-section");
    const combinedBox=document.getElementById("combined-offers");
    if(!combinedSection||!combinedBox)return;

    try{
      let data=null;
      for(let attempt=0;attempt<15;attempt++){
        data=await getData();
        if(data && data.items.length)break;
        await wait(100);
      }
      if(!data)return;
      const {auth,vals,items,offers}=data;
      const groups=new Map();
      for(const v of vals){
        const key=v.quote_data?.submissionKey||v.id;
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push(v);
      }

      const combinedGroups=[];
      for(const [key,group] of groups){
        const ids=new Set(group.map(v=>v.id));
        const groupItems=items.filter(i=>ids.has(i.valuation_id));
        if(groupItems.length<=1)continue;
        combinedGroups.push({key,group,groupItems});
      }
      if(!combinedGroups.length){combinedSection.style.display="none";return;}

      const cards=[];
      for(const state of combinedGroups){
        const groupOffers=offers.filter(o=>state.groupItems.some(i=>i.id===o.item_id));
        const valuationReady=state.group.some(v=>v.status==="customer_review");
        if(!valuationReady)continue;
        const effectiveMap=new Map(state.groupItems.map(i=>[i.id,effectiveOffer(groupOffers,i.id)]));
        const pending=state.groupItems.filter(i=>!["accepted","refused","closed"].includes(i.item_status));
        const ready=pending.length>0&&pending.every(i=>!!effectiveMap.get(i.id));
        const anyResponded=state.groupItems.some(i=>["accepted","refused"].includes(i.item_status));
        const quotedTotal=state.groupItems.reduce((s,i)=>s+(Number(effectiveMap.get(i.id)?.amount)||0),0);
        const basketTotal=state.groupItems.reduce((s,i)=>i.item_status==="accepted"?s+(Number(effectiveMap.get(i.id)?.amount)||0):s,0);
        const rows=state.groupItems.map((item,index)=>{
          const offer=effectiveMap.get(item.id);
          const title=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ")||"Equipment";
          let action="<span class=\"status-badge\">AWAITING OFFER</span>";
          if(item.item_status==="accepted")action="<span class=\"status-badge\">ACCEPTED — IN YOUR BASKET</span>";
          else if(item.item_status==="refused")action="<span class=\"status-badge\">REFUSED</span>";
          else if(ready&&offer)action=`<div class="navigation-buttons"><button type="button" class="btn btn-primary combined-item-accept" data-offer-id="${esc(offer.id)}">ACCEPT</button><button type="button" class="btn btn-secondary combined-item-refuse" data-offer-id="${esc(offer.id)}">REFUSE</button></div>`;
          return `<article class="valuation-card offer-card" style="margin-bottom:1rem;"><div><span class="valuation-ref">ITEM ${esc(item.item_position||index+1)}</span><p class="section-kicker">${esc(String(item.item_status||"under_assessment").replaceAll("_"," "))}</p><h3>${esc(title)}</h3><p>${esc(item.package||"")}</p></div><div class="valuation-meta">${offer?`<strong>${money(offer.amount)}</strong>`:"<strong>Awaiting offer</strong>"}${action}</div></article>`;
        }).join("");
        const ref=state.group[0]?.quote_reference||"Combined quote";
        cards.push(`<article class="valuation-card" data-combined-key="${esc(state.key)}" style="display:grid;gap:1rem;margin-bottom:1.5rem;"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;"><div><span class="valuation-ref">${esc(ref)}</span><p class="section-kicker">COMBINED QUOTE</p><h3>${state.groupItems.length} items</h3></div><span class="status-badge">${ready?"READY TO RESPOND":"AWAITING FINAL ITEM OFFER"}</span></div><p>${anyResponded?`Your current basket total is ${money(basketTotal)}.`:"Your combined quote is ready. Accept or refuse each item separately."}</p><div>${rows}</div><div style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f;font-size:1.1rem;"><strong>${anyResponded?"CURRENT BASKET TOTAL":"COMBINED TOTAL OFFER"}</strong><strong>${money(anyResponded?basketTotal:quotedTotal)}</strong></div></article>`);
      }
      combinedSection.style.display=cards.length?"":"none";
      combinedBox.innerHTML=cards.join("");

      combinedBox.querySelectorAll(".combined-item-accept").forEach(btn=>btn.addEventListener("click",async()=>{
        btn.disabled=true;
        const auth=(await getData()).auth;
        const {error}=await auth.supabase.rpc("accept_quote_offer",{p_offer_id:btn.dataset.offerId});
        if(error){alert(error.message||"The offer could not be accepted.");btn.disabled=false;return;}
        try{await auth.supabase.functions.invoke("send-quote-email-v2",{body:{offer_id:btn.dataset.offerId,event_type:"offer_accepted"}});}catch(_){ }
        window.location.reload();
      }));
      combinedBox.querySelectorAll(".combined-item-refuse").forEach(btn=>btn.addEventListener("click",async()=>{
        if(!confirm("Refuse this item?"))return;
        btn.disabled=true;
        const auth=(await getData()).auth;
        const {error}=await auth.supabase.rpc("refuse_quote_offer",{p_offer_id:btn.dataset.offerId});
        if(error){alert(error.message||"The offer could not be refused.");btn.disabled=false;return;}
        try{await auth.supabase.functions.invoke("send-quote-email-v2",{body:{offer_id:btn.dataset.offerId,event_type:"offer_refused"}});}catch(_){ }
        window.location.reload();
      }));
    }catch(error){
      console.error("Combined quote load failed:",error);
      combinedSection.style.display="none";
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load,{once:true});else load();
})();
