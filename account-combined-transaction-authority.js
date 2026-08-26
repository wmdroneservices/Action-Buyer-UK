/* GearCashOut: authoritative customer UI for multi-item submissions. */
(function(){
  "use strict";
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  let client=null,busy=false,lastKey="";

  function effective(offers,itemId){
    const list=(offers||[]).filter(o=>o.item_id===itemId&&["published","accepted"].includes(o.status));
    const pick=t=>list.filter(o=>o.offer_type===t).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]||null;
    return pick("final")||pick("manual")||pick("automatic")||null;
  }
  function isTerminal(s){return ["accepted","refused","closed"].includes(String(s||""));}

  async function loadData(){
    if(!client)client=window.actionBuyerAuth;
    if(!client?.supabase)return null;
    const session=await client.getSession();
    if(!session?.user?.id)return null;
    const {data:vals,error:ve}=await client.supabase.from("valuations").select("id,quote_reference,status,submitted_at,quote_data").eq("user_id",session.user.id).is("archived_at",null).order("submitted_at",{ascending:false});
    if(ve)throw ve;
    const ids=(vals||[]).map(v=>v.id);
    const {data:items,error:ie}=ids.length?await client.supabase.from("quote_items").select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position").in("valuation_id",ids).order("item_position",{ascending:true}):{data:[]};
    if(ie)throw ie;
    const itemIds=(items||[]).map(i=>i.id);
    const {data:offers,error:oe}=itemIds.length?await client.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status,customer_message,created_at").in("item_id",itemIds):{data:[]};
    if(oe)throw oe;
    return {vals:vals||[],items:items||[],offers:offers||[]};
  }

  function combinedGroups(data){
    const map=new Map();
    for(const v of data.vals){
      const key=String(v.quote_data?.submissionKey||v.id);
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(v);
    }
    return [...map.entries()].map(([key,vals])=>{
      const ids=new Set(vals.map(v=>v.id));
      const items=data.items.filter(i=>ids.has(i.valuation_id)).sort((a,b)=>(a.item_position||999)-(b.item_position||999));
      return {key,vals,items,offers:data.offers.filter(o=>items.some(i=>i.id===o.item_id))};
    }).filter(g=>g.items.length>1);
  }

  async function respond(button,accept){
    if(busy)return;
    busy=true;button.disabled=true;
    try{
      const data=await loadData();
      const key=button.dataset.group;
      const group=combinedGroups(data).find(g=>g.key===key);
      if(!group)throw new Error("The combined transaction could not be found. Please refresh the page.");
      const item=group.items.find(i=>i.id===button.dataset.item);
      if(!item)throw new Error("The selected item could not be found.");
      if(isTerminal(item.item_status))throw new Error("This item has already been decided.");
      if(!group.vals.some(v=>v.status==="customer_review"))throw new Error("This combined quote is not yet available for a customer response.");
      const active=group.items.filter(i=>!isTerminal(i.item_status));
      if(active.some(i=>!effective(group.offers,i.id)))throw new Error("This combined quote is incomplete. Please wait until every item has a published offer.");
      const offer=effective(group.offers,item.id);
      if(!offer||offer.status!=="published")throw new Error("This offer is no longer available. Please refresh the page.");
      if(!confirm(accept?"Accept this item? It will be added to your GearCashOut basket.":"Refuse this item?"))return;
      const {error}=await client.supabase.rpc(accept?"accept_quote_offer":"refuse_quote_offer",{p_offer_id:offer.id});
      if(error)throw error;
      await render();
    }catch(error){alert(error?.message||"The response could not be saved.");}finally{busy=false;button.disabled=false;}
  }

  async function render(){
    if(busy)return;
    let data;
    try{data=await loadData();}catch(error){console.error("Combined transaction authority:",error);return;}
    if(!data)return;
    const section=document.getElementById("new-quotes-section"),box=document.getElementById("offers");
    if(!section||!box)return;
    const groups=combinedGroups(data);
    const activeGroups=groups.filter(g=>g.items.some(i=>!isTerminal(i.item_status)));
    if(!activeGroups.length){
      if(data.items.some(i=>groups.some(g=>g.items.some(x=>x.id===i.id)))){section.style.display="none";box.innerHTML="";}
      return;
    }
    const html=activeGroups.map(group=>{
      const sent=group.vals.some(v=>v.status==="customer_review");
      const active=group.items.filter(i=>!isTerminal(i.item_status));
      const ready=active.length>0&&active.every(i=>!!effective(group.offers,i.id));
      const decided=group.items.filter(i=>isTerminal(i.item_status));
      const quoted=group.items.reduce((s,i)=>s+(Number(effective(group.offers,i.id)?.amount)||0),0);
      const basket=group.items.reduce((s,i)=>i.item_status==="accepted"?s+(Number(effective(group.offers,i.id)?.amount)||0):s,0);
      const itemsHtml=group.items.map(i=>{
        const offer=effective(group.offers,i.id);
        const title=[i.manufacturer,i.model||i.item_name].filter(Boolean).join(" ")||"Equipment";
        let status="AWAITING OFFER",actions="";
        if(i.item_status==="accepted")status="ACCEPTED — IN YOUR BASKET";
        else if(i.item_status==="refused")status="REFUSED";
        else if(sent&&ready&&offer)actions=`<div class="navigation-buttons"><button type="button" class="btn btn-primary combined-authority-accept" data-group="${esc(group.key)}" data-item="${esc(i.id)}">ACCEPT</button><button type="button" class="btn btn-secondary combined-authority-refuse" data-group="${esc(group.key)}" data-item="${esc(i.id)}">REFUSE</button></div>`;
        return `<article class="valuation-card" style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1rem"><div><span class="valuation-ref">ITEM ${esc(i.item_position||"")}</span><p class="section-kicker">${esc(status)}</p><h3>${esc(title)}</h3>${i.package?`<p>${esc(i.package)}</p>`:""}</div><div class="valuation-meta"><strong>${offer?money(offer.amount):"Awaiting offer"}</strong>${actions}</div></article>`;
      }).join("");
      const badge=!sent?"AWAITING VALUATION":ready?`READY TO RESPOND${decided.length?` · ${decided.length} ALREADY DECIDED`:""}`:"AWAITING FINAL ITEM OFFER";
      const intro=!sent?"GearCashOut is still completing this combined valuation. No item can be accepted or refused yet.":ready?"Your combined quote is ready. You can accept or refuse each item separately.":"GearCashOut is still completing this combined quote. You cannot respond until every item has a published offer.";
      return `<article class="valuation-card" style="display:grid;gap:1rem;margin-bottom:1.5rem"><div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:flex-start"><div><span class="valuation-ref">${esc(group.vals[0]?.quote_reference||"")}</span><p class="section-kicker">COMBINED QUOTE</p><h3>${group.items.length} items</h3></div><span class="status-badge">${badge}</span></div><p>${esc(intro)}</p><div>${itemsHtml}</div><div style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f"><strong>${decided.length?"CURRENT BASKET TOTAL":"COMBINED TOTAL OFFER"}</strong><strong>${money(decided.length?basket:quoted)}</strong></div></article>`;
    }).join("");
    const signature=html;
    if(signature===lastKey)return;
    lastKey=signature;
    box.innerHTML=html;
    section.style.display="";
    box.querySelectorAll(".combined-authority-accept").forEach(b=>b.addEventListener("click",()=>respond(b,true)));
    box.querySelectorAll(".combined-authority-refuse").forEach(b=>b.addEventListener("click",()=>respond(b,false)));
  }

  function init(){
    const start=()=>{render();setInterval(()=>render(),2000);};
    if(window.actionBuyerAuth)start();else setTimeout(start,500);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
