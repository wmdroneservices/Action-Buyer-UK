/* GearCashOut: combined customer quote presentation. */
(function(){
  "use strict";
  let rendering=false;
  let observer=null;

  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const effectiveOffer=(offers,itemId)=>{
    const list=offers.filter(o=>o.item_id===itemId&&o.status==="published");
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
    if(!ids.length)return;

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

    // Never take ownership of the normal single-item quote area.
    if(!combinedSeen)return;

    const cards=[];
    for(const [key,group] of groups){
      const groupIds=new Set(group.map(v=>v.id));
      const groupItems=itemList.filter(i=>groupIds.has(i.valuation_id));
      if(groupItems.length<=1)continue;

      const pendingItems=groupItems.filter(i=>!['accepted','refused','closed'].includes(i.item_status));
      if(!pendingItems.length)continue;

      const groupOffers=offerList.filter(o=>groupItems.some(i=>i.id===o.item_id));
      const effectiveMap=new Map(groupItems.map(i=>[i.id,effectiveOffer(groupOffers,i.id)]));
      const ready=pendingItems.every(i=>!!effectiveMap.get(i.id));
      const combinedTotal=groupItems.reduce((sum,item)=>sum+(Number(effectiveMap.get(item.id)?.amount)||0),0);

      const rows=groupItems.map((item,index)=>{
        const offer=effectiveMap.get(item.id);
        const name=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ");
        const pkg=item.package?String(item.package).toLowerCase():"";
        const pending=!['accepted','refused','closed'].includes(item.item_status);
        let actionHtml="";
        if(item.item_status==="accepted") actionHtml='<span class="status-badge">ACCEPTED</span>';
        else if(item.item_status==="refused") actionHtml='<span class="status-badge">REFUSED</span>';
        else if(!ready || !offer) actionHtml='<span class="status-badge">AWAITING OFFER</span>';
        else if(pending) actionHtml=`<div class="navigation-buttons"><button class="btn btn-primary accept-offer" data-id="${esc(offer.id)}" type="button">ACCEPT</button><button class="btn btn-secondary refuse-offer" data-id="${esc(offer.id)}" type="button">REFUSE</button></div>`;
        return `<article class="valuation-card offer-card" style="margin-bottom:1rem;"><div><span class="valuation-ref">ITEM ${esc(item.item_position||index+1)}</span><p class="section-kicker">${esc(String(item.item_status||"under_assessment").replaceAll("_"," "))}</p><h3>${esc([name||"Equipment",pkg].filter(Boolean).join(" "))}</h3>${offer?.customer_message?`<p>${esc(offer.customer_message)}</p>`:""}</div><div class="valuation-meta">${offer?`<strong>${money(offer.amount)}</strong>`:"<span class=\"status-badge\">AWAITING OFFER</span>"}${actionHtml}</div></article>`;
      }).join("");

      cards.push(`<article class="valuation-card" data-combined-key="${esc(key)}" style="display:grid;gap:1rem;margin-bottom:1.5rem;"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;"><div><span class="valuation-ref">${esc(group[0]?.quote_reference||"")}</span><p class="section-kicker">COMBINED QUOTE</p><h3>${groupItems.length} items</h3></div><span class="status-badge">${ready?"READY FOR CUSTOMER RESPONSE":"WAITING FOR ALL ITEM PRICES"}</span></div><p style="margin:0">${ready?"Your combined valuation is complete. You can now accept or refuse each item separately.":"GearCashOut is still completing this valuation. No item can be accepted or refused until every item has a published price."}</p><div>${rows}</div><div style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f;font-size:1.1rem;"><strong>Current combined total</strong><strong>${money(combinedTotal)}</strong></div></article>`);
    }

    rendering=true;
    box.innerHTML=cards.join("");
    section.style.display=cards.length?"":"none";
    rendering=false;
  }

  function init(){
    const box=document.getElementById("offers");
    if(!box)return;
    load();
    observer=new MutationObserver(()=>{if(!rendering)load();});
    observer.observe(box,{childList:true,subtree:true});
    window.addEventListener("pageshow",load);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
