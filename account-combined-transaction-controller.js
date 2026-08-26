/* GearCashOut: authoritative controller for multi-item customer transactions. */
(function(){
  "use strict";
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  let auth=null,userId=null,busy=false,lastCombinedSignature="",lastSalesSignature="";

  function effectiveOffer(offers,itemId){
    const list=(offers||[]).filter(o=>o.item_id===itemId&&["published","accepted"].includes(o.status));
    const pick=t=>list.filter(o=>o.offer_type===t).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]||null;
    return pick("final")||pick("manual")||pick("automatic");
  }
  function combinedKey(v){return String(v?.quote_data?.submissionKey||v?.id||"").trim();}
  function isCombined(v,items){
    const its=(items||[]).filter(i=>i.valuation_id===v.id);
    return its.length>1||v.quote_data?.multiItemQuote===true;
  }
  function isTerminal(i){return ["accepted","refused","closed"].includes(String(i?.item_status||""));}

  async function getData(){
    if(!auth)return null;
    const session=await auth.getSession();
    if(!session?.user?.id)return null;
    userId=session.user.id;
    const {data:vals,error:ve}=await auth.supabase.from("valuations").select("id,quote_reference,status,submitted_at,quote_data").eq("user_id",userId).is("archived_at",null).order("submitted_at",{ascending:false});
    if(ve)throw ve;
    const ids=(vals||[]).map(v=>v.id);
    if(!ids.length)return {vals:[],items:[],offers:[],sales:[],saleItems:[],shipments:[]};
    const {data:items,error:ie}=await auth.supabase.from("quote_items").select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position").in("valuation_id",ids).order("item_position",{ascending:true});
    if(ie)throw ie;
    const itemIds=(items||[]).map(i=>i.id);
    const {data:offers,error:oe}=itemIds.length?await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status,customer_message,created_at,published_at,responded_at").in("item_id",itemIds):{data:[]};
    if(oe)throw oe;
    const {data:sales,error:se}=await auth.supabase.from("sales").select("id,sale_reference,status,total_amount,created_at,payment_sent_at").eq("user_id",userId).order("created_at",{ascending:false});
    if(se)throw se;
    const saleIds=(sales||[]).map(s=>s.id);
    const {data:saleItems,error:sie}=saleIds.length?await auth.supabase.from("sale_items").select("sale_id,quote_item_id,amount,accepted_offer_id,created_at").in("sale_id",saleIds):{data:[]};
    if(sie)throw sie;
    const {data:shipments,error:she}=saleIds.length?await auth.supabase.from("shipments").select("id,sale_id,shipment_type,status,carrier,tracking_number,created_at,shipped_at,delivered_at,label_urls,qr_code_urls").in("sale_id",saleIds).order("created_at",{ascending:false}):{data:[]};
    if(she)throw she;
    return {vals:vals||[],items:items||[],offers:offers||[],sales:sales||[],saleItems:saleItems||[],shipments:shipments||[]};
  }

  function hideLegacyCombined(){
    const boxes=[document.getElementById("offers"),document.getElementById("sales")];
    boxes.forEach(box=>{ if(!box)return; box.querySelectorAll(".combined-legacy-block").forEach(x=>x.remove()); });
  }

  async function renderCombined(data){
    const section=document.getElementById("new-quotes-section");
    const box=document.getElementById("offers");
    if(!section||!box)return;
    const groups=new Map();
    for(const v of data.vals){
      const key=combinedKey(v);
      if(!key)continue;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(v);
    }
    const cards=[];
    for(const [key,vals] of groups){
      const ids=new Set(vals.map(v=>v.id));
      const items=data.items.filter(i=>ids.has(i.valuation_id));
      if(items.length<2)continue;
      const sent=vals.some(v=>String(v.status)==="customer_review");
      const active=items.filter(i=>!isTerminal(i));
      if(!active.length)continue;
      const offers=data.offers.filter(o=>items.some(i=>i.id===o.item_id));
      const allReady=active.every(i=>!!effectiveOffer(offers,i.id));
      const decided=items.filter(i=>isTerminal(i));
      const currentBasket=items.reduce((sum,i)=>i.item_status==="accepted"?sum+(Number(effectiveOffer(offers,i.id)?.amount)||0):sum,0);
      const quotedTotal=items.reduce((sum,i)=>sum+(Number(effectiveOffer(offers,i.id)?.amount)||0),0);
      const rows=items.map((item,index)=>{
        const offer=effectiveOffer(offers,item.id);
        const title=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ")||"Equipment";
        let status="AWAITING OFFER";
        let controls="";
        if(item.item_status==="accepted")status="ACCEPTED — IN YOUR BASKET";
        else if(item.item_status==="refused")status="REFUSED";
        else if(sent&&allReady&&offer){
          controls=`<div class="navigation-buttons"><button type="button" class="btn btn-primary combined-transaction-accept" data-group="${esc(key)}" data-item="${esc(item.id)}">ACCEPT</button><button type="button" class="btn btn-secondary combined-transaction-refuse" data-group="${esc(key)}" data-item="${esc(item.id)}">REFUSE</button></div>`;
        }
        return `<article class="valuation-card offer-card combined-legacy-block" style="margin-bottom:1rem"><div><span class="valuation-ref">ITEM ${esc(item.item_position||index+1)}</span><p class="section-kicker">${esc(status)}</p><h3>${esc(title)}</h3>${item.package?`<p>${esc(item.package)}</p>`:""}${offer?.customer_message&&!controls&&item.item_status!=="accepted"?`<p>${esc(offer.customer_message)}</p>`:""}</div><div class="valuation-meta">${offer?`<strong>${money(offer.amount)}</strong>`:"<strong>Awaiting offer</strong>"}${item.item_status==="accepted"?`<span class="status-badge">ACCEPTED</span>`:""}${item.item_status==="refused"?`<span class="status-badge">REFUSED</span>`:""}${controls}</div></article>`;
      }).join("");
      const badge=!sent?"AWAITING VALUATION":allReady?"READY TO RESPOND":"AWAITING FINAL ITEM OFFER";
      const intro=!sent?"GearCashOut is still completing this combined valuation. No item can be accepted or refused yet.":allReady?`Your combined quote is ready. ${decided.length?`${decided.length} item${decided.length===1?" has":"s have"} already been decided. You can respond to the remaining items individually.`:"You can accept or refuse each item individually."}`:"GearCashOut is still completing this combined quote. You cannot respond until every item has a published offer.";
      cards.push(`<article class="valuation-card combined-legacy-block" data-combined-key="${esc(key)}" style="display:grid;gap:1rem;margin-bottom:1.5rem"><div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:flex-start"><div><span class="valuation-ref">${esc(vals[0]?.quote_reference||"")}</span><p class="section-kicker">COMBINED QUOTE</p><h3>${items.length} items</h3></div><span class="status-badge">${badge}</span></div><p>${esc(intro)}</p><div>${rows}</div><div style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f;font-size:1.1rem"><strong>${decided.length?"CURRENT BASKET TOTAL":"COMBINED TOTAL OFFER"}</strong><strong>${money(decided.length?currentBasket:quotedTotal)}</strong></div></article>`);
    }
    const signature=JSON.stringify(cards);
    if(signature===lastCombinedSignature)return;
    lastCombinedSignature=signature;
    if(cards.length){box.innerHTML=cards.join("");section.style.display="";} else if(!data.vals.some(v=>isCombined(v,data.items))){return;} else {box.innerHTML="";section.style.display="none";}
    box.querySelectorAll(".combined-transaction-accept").forEach(b=>b.addEventListener("click",()=>respond(b,true)));
    box.querySelectorAll(".combined-transaction-refuse").forEach(b=>b.addEventListener("click",()=>respond(b,false)));
  }

  async function renderSaleUpdates(data){
    const box=document.getElementById("sales");
    const section=document.getElementById("sales-section");
    if(!box||!section)return;
    const combinedValMap=new Map();
    for(const v of data.vals)combinedValMap.set(combinedKey(v),v);
    const relevant=[];
    for(const sale of data.sales){
      if(["paid","completed","cancelled","closed","archived"].includes(String(sale.status||""))||sale.payment_sent_at)continue;
      const sis=data.saleItems.filter(si=>si.sale_id===sale.id);
      if(!sis.length)continue;
      const qids=new Set(sis.map(si=>si.quote_item_id));
      const qi=data.items.filter(i=>qids.has(i.id));
      const combined=qi.map(i=>data.vals.find(v=>v.id===i.valuation_id)).filter(Boolean).find(v=>isCombined(v,data.items));
      relevant.push({sale,sis,qi,combined});
    }
    if(!relevant.length){section.style.display="none";return;}
    const html=relevant.map(({sale,sis,qi,combined})=>{
      const names=qi.map(i=>[i.manufacturer,i.model||i.item_name].filter(Boolean).join(" ")).filter(Boolean);
      const shipment=(data.shipments||[]).filter(s=>s.sale_id===sale.id&&s.shipment_type==="inbound").sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
      let message="Your accepted items are being processed as one transaction. We will send your shipping instructions next.";
      if(shipment?.status==="label_created")message="Your shipping label is ready. Please follow the shipping instructions provided.";
      else if(shipment?.status==="in_transit")message="Your parcel is on its way to GearCashOut.";
      const combinedText=names.length>1?`Accepted items: ${names.join(" · ")}.`:names.length===1?`Accepted item: ${names[0]}.`:"";
      return `<article class="valuation-card combined-legacy-block"><div><span class="valuation-ref">${esc(sale.sale_reference||"")}</span><p class="section-kicker">VALUATION UPDATE</p><h3>${money(sale.total_amount)}</h3><p>${esc(combinedText)}</p><p>${esc(message)}</p></div></article>`;
    }).join("");
    const signature=html;
    if(signature===lastSalesSignature)return;
    lastSalesSignature=signature;
    box.innerHTML=html;section.style.display="";
  }

  async function respond(button,accepted){
    if(busy)return;
    busy=true;button.disabled=true;
    try{
      const data=await getData();
      const key=button.dataset.group;
      const groupVals=data.vals.filter(v=>combinedKey(v)===key);
      const groupIds=new Set(groupVals.map(v=>v.id));
      const groupItems=data.items.filter(i=>groupIds.has(i.valuation_id));
      const active=groupItems.filter(i=>!isTerminal(i));
      const allReady=active.every(i=>!!effectiveOffer(data.offers,i.id));
      if(!groupVals.some(v=>v.status==="customer_review"))throw new Error("This combined quote is not ready for a customer response yet.");
      if(!allReady)throw new Error("This combined quote is not complete yet. Please wait until every item has a published offer.");
      const itemId=button.dataset.item;
      const offer=effectiveOffer(data.offers,itemId);
      if(!offer)throw new Error("The offer is no longer available.");
      if(!confirm(accepted?"Accept this item? It will be added to your GearCashOut basket.":"Refuse this item?"))return;
      const {error}=await data.auth.supabase.rpc(accepted?"accept_quote_offer":"refuse_quote_offer",{p_offer_id:offer.id});
      if(error)throw error;
      lastCombinedSignature="";lastSalesSignature="";
      const fresh=await getData();
      await renderCombined(fresh);await renderSaleUpdates(fresh);
    }catch(e){alert(e?.message||"The response could not be saved.");button.disabled=false;}finally{busy=false;}
  }

  async function refresh(){
    if(busy)return;
    try{
      const data=await getData();
      await renderCombined(data);
      await renderSaleUpdates(data);
    }catch(e){console.error("Combined transaction controller:",e);}
  }

  async function init(){
    while(!window.actionBuyerAuth){await sleep(200);}
    auth=window.actionBuyerAuth;
    await refresh();
    setInterval(()=>{if(!document.hidden&&!busy)refresh();},2000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
