/* GearCashOut: customer quote presentation for combined and single submissions. */
(function(){
  "use strict";
  let rendering=false;
  let observer=null;

  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const effectiveOffer=(offers,itemId)=>{
    const list=offers.filter(o=>o.item_id===itemId&&["published","accepted"].includes(o.status));
    return list.find(o=>o.offer_type==="final")||list.find(o=>o.offer_type==="manual")||list.find(o=>o.offer_type==="automatic")||null;
  };

  async function load(){
    const auth=window.actionBuyerAuth;
    const box=document.getElementById("offers");
    const section=document.getElementById("new-quotes-section");
    if(!auth||!box||!section||rendering)return;
    const session=await auth.getSession();
    if(!session?.user?.id)return;

    const {data:valuations,error}=await auth.supabase.from("valuations")
      .select("id,quote_reference,status,submitted_at,quote_data")
      .eq("user_id",session.user.id).is("archived_at",null).order("submitted_at",{ascending:false});
    if(error)return;
    const vals=valuations||[];
    const ids=vals.map(v=>v.id);
    if(!ids.length){section.style.display="none";return;}

    const {data:items}=await auth.supabase.from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position")
      .in("valuation_id",ids).order("item_position",{ascending:true});
    const itemList=items||[];
    const itemIds=itemList.map(i=>i.id);
    const {data:offers}=itemIds.length?await auth.supabase.from("quote_offers")
      .select("id,item_id,offer_type,amount,status,customer_message,created_at")
      .in("item_id",itemIds).order("created_at",{ascending:false}):{data:[]};
    const offerList=offers||[];

    const groups=new Map();
    let combinedSeen=false;
    for(const v of vals){
      const key=v.quote_data?.submissionKey||v.id;
      const groupItems=itemList.filter(i=>i.valuation_id===v.id);
      if(groupItems.length>1)combinedSeen=true;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(v);
    }

    if(!combinedSeen){section.style.display="none";return;}

    const cards=[];
    for(const [key,group] of groups){
      const groupIds=new Set(group.map(v=>v.id));
      const groupItems=itemList.filter(i=>groupIds.has(i.valuation_id));
      const groupOffers=offerList.filter(o=>groupItems.some(i=>i.id===o.item_id));

      if(groupItems.length===1){
        const item=groupItems[0];
        if(['accepted','refused','closed'].includes(item.item_status))continue;
        const offer=effectiveOffer(groupOffers,item.id);
        if(!offer)continue;
        const name=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ");
        const pkg=item.package?String(item.package).toLowerCase():"";
        cards.push(`<article class="valuation-card offer-card" style="margin-bottom:1rem;"><div><span class="valuation-ref">${esc(group[0]?.quote_reference||"")}</span><p class="section-kicker">CUSTOMER OFFER</p><h3>${esc([name||"Equipment",pkg].filter(Boolean).join(" "))}</h3>${offer.customer_message?`<p>${esc(offer.customer_message)}</p>`:""}</div><div class="valuation-meta"><strong>${money(offer.amount)}</strong><div class="navigation-buttons"><button class="btn btn-primary accept-offer" data-id="${esc(offer.id)}" type="button">ACCEPT</button><button class="btn btn-secondary refuse-offer" data-id="${esc(offer.id)}" type="button">REFUSE</button></div></div></article>`);
        continue;
      }

      if(!group.some(v=>v.status==='customer_review'))continue;

      const pendingItems=groupItems.filter(i=>!['accepted','refused','closed'].includes(i.item_status));
      const anyResponded=groupItems.some(i=>['accepted','refused'].includes(i.item_status));
      if(!pendingItems.length)continue;
      const effectiveMap=new Map(groupItems.map(i=>[i.id,effectiveOffer(groupOffers,i.id)]));
      const ready=pendingItems.every(i=>!!effectiveMap.get(i.id));
      const quotedTotal=groupItems.reduce((sum,item)=>sum+(Number(effectiveMap.get(item.id)?.amount)||0),0);
      const acceptedTotal=groupItems.reduce((sum,item)=>item.item_status==='accepted'?(sum+(Number(effectiveMap.get(item.id)?.amount)||0)):sum,0);
      const displayedTotal=anyResponded?acceptedTotal:quotedTotal;

      const rows=groupItems.map((item,index)=>{
        const offer=effectiveMap.get(item.id);
        const name=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ");
        const pkg=item.package?String(item.package).toLowerCase():"";
        let actionHtml="";
        if(item.item_status==="accepted")actionHtml='<span class="status-badge">ACCEPTED — IN YOUR BASKET</span>';
        else if(item.item_status==="refused")actionHtml='<span class="status-badge">REFUSED</span>';
        else if(!ready||!offer)actionHtml='<span class="status-badge">AWAITING OFFER</span>';
        else actionHtml=`<div class="navigation-buttons"><button class="btn btn-primary accept-offer" data-id="${esc(offer.id)}" type="button">ACCEPT</button><button class="btn btn-secondary refuse-offer" data-id="${esc(offer.id)}" type="button">REFUSE</button></div>`;
        return `<article class="valuation-card offer-card" style="margin-bottom:1rem;"><div><span class="valuation-ref">ITEM ${esc(item.item_position||index+1)}</span><p class="section-kicker">${esc(String(item.item_status||"under_assessment").replaceAll("_"," "))}</p><h3>${esc([name||"Equipment",pkg].filter(Boolean).join(" "))}</h3>${offer?.customer_message?`<p>${esc(offer.customer_message)}</p>`:""}</div><div class="valuation-meta">${offer?`<strong>${money(offer.amount)}</strong>`:"<span class=\"status-badge\">AWAITING OFFER</span>"}${actionHtml}</div></article>`;
      }).join("");

      const remainingText=anyResponded
        ? `Your basket total is ${money(acceptedTotal)}. Accepting or refusing another item will update it immediately.`
        : "Your combined quote is ready. Accept or refuse each item separately; accepted items are added to your basket.";

      cards.push(`<article class="valuation-card" data-combined-key="${esc(key)}" style="display:grid;gap:1rem;margin-bottom:1.5rem;"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;"><div><span class="valuation-ref">${esc(group[0]?.quote_reference||"")}</span><p class="section-kicker">COMBINED QUOTE</p><h3>${groupItems.length} items</h3></div><span class="status-badge">${ready?"READY TO RESPOND":"AWAITING FINAL ITEM OFFER"}</span></div><p style="margin:0">${remainingText}</p><div>${rows}</div><div style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f;font-size:1.1rem;"><strong>${anyResponded?"CURRENT BASKET TOTAL":"COMBINED TOTAL OFFER"}</strong><strong>${money(displayedTotal)}</strong></div>${anyResponded&&acceptedTotal!==quotedTotal?`<small>Full quoted value: ${money(quotedTotal)} · Basket value: ${money(acceptedTotal)}</small>`:""}</article>`);
    }

    rendering=true;
    box.innerHTML=cards.join("");
    section.style.display=cards.length?"":"none";
    rendering=false;

    box.querySelectorAll(".accept-offer").forEach(btn=>btn.addEventListener("click",async()=>{
      btn.disabled=true;
      const {error}=await auth.supabase.rpc("accept_quote_offer",{p_offer_id:btn.dataset.id});
      if(error){alert(error.message||"The offer could not be accepted.");btn.disabled=false;return;}
      try{await auth.supabase.functions.invoke("send-quote-email-v2",{body:{offer_id:btn.dataset.id,event_type:"offer_accepted"}});}catch(_){ }
      await load();
    }));

    box.querySelectorAll(".refuse-offer").forEach(btn=>btn.addEventListener("click",async()=>{
      if(!confirm("Refuse this item?"))return;
      btn.disabled=true;
      const {error}=await auth.supabase.rpc("refuse_quote_offer",{p_offer_id:btn.dataset.id});
      if(error){alert(error.message||"The offer could not be refused.");btn.disabled=false;return;}
      try{await auth.supabase.functions.invoke("send-quote-email-v2",{body:{offer_id:btn.dataset.id,event_type:"offer_refused"}});}catch(_){ }
      await load();
    }));
  }

  function init(){
    const box=document.getElementById("offers");
    if(!box)return;
    load();
    observer=new MutationObserver(()=>{if(!rendering)load();});
    observer.observe(box,{childList:true,subtree:true});
    window.addEventListener("pageshow",load);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
