/* GearCashOut: restore standalone customer offers and surface single-item final offers in Valuation Update. */
(function(){
  "use strict";
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  const terminal=s=>["accepted","refused","closed"].includes(String(s||""));
  const inactiveSale=s=>["paid","completed","cancelled","closed","archived"].includes(String(s||""))||!!s?.payment_sent_at;
  let client=null,lastNewKey="",lastFinalKey="";

  async function load(){
    if(!client)client=window.actionBuyerAuth;
    const session=await client?.getSession();
    if(!session?.user?.id)return null;

    const {data:vals,error:ve}=await client.supabase
      .from("valuations")
      .select("id,quote_reference,status,submitted_at,quote_data")
      .eq("user_id",session.user.id)
      .is("archived_at",null)
      .order("submitted_at",{ascending:false});
    if(ve)throw ve;

    const ids=(vals||[]).map(v=>v.id);
    if(!ids.length)return {singles:[],finals:[]};

    const {data:items,error:ie}=await client.supabase
      .from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position")
      .in("valuation_id",ids)
      .order("item_position",{ascending:true});
    if(ie)throw ie;

    const itemIds=(items||[]).map(i=>i.id);
    if(!itemIds.length)return {singles:[],finals:[]};

    const {data:offers,error:oe}=await client.supabase
      .from("quote_offers")
      .select("id,item_id,offer_type,amount,status,customer_message,created_at")
      .in("item_id",itemIds)
      .order("created_at",{ascending:false});
    if(oe)throw oe;

    const {data:saleItems,error:se}=await client.supabase
      .from("sale_items")
      .select("quote_item_id,sale_id")
      .in("quote_item_id",itemIds);
    if(se)throw se;

    const saleIds=[...new Set((saleItems||[]).map(s=>s.sale_id).filter(Boolean))];
    const {data:sales,error:saleError}=saleIds.length
      ? await client.supabase.from("sales").select("id,sale_reference,status,total_amount,created_at,payment_sent_at").in("id",saleIds)
      : {data:[]};
    if(saleError)throw saleError;

    const saleMap=new Map((sales||[]).map(s=>[s.id,s]));
    const itemSaleMap=new Map();
    for(const row of saleItems||[])if(row.quote_item_id)itemSaleMap.set(row.quote_item_id,saleMap.get(row.sale_id)||null);

    // Build the submission-level item count so an item from a multi-item
    // submission is never treated as a standalone quote.
    const groupCounts=new Map();
    for(const v of vals||[]){
      const key=String(v.quote_data?.submissionKey||v.id);
      const count=(items||[]).filter(i=>i.valuation_id===v.id).length;
      groupCounts.set(key,(groupCounts.get(key)||0)+count);
    }

    const singles=[];
    const finals=[];
    for(const v of vals||[]){
      const vis=(items||[]).filter(i=>i.valuation_id===v.id);
      const groupKey=String(v.quote_data?.submissionKey||v.id);
      if(vis.length!==1||groupCounts.get(groupKey)!==1)continue;

      const item=vis[0];
      if(terminal(item.item_status))continue;

      const published=(offers||[]).filter(o=>o.item_id===item.id&&o.status==="published");
      const finalOffer=published.find(o=>o.offer_type==="final")||null;
      const regularOffer=published.find(o=>o.offer_type==="manual")||published.find(o=>o.offer_type==="automatic")||null;
      const sale=itemSaleMap.get(item.id)||null;

      if(!sale){
        const offer=finalOffer||regularOffer;
        if(offer)singles.push({v,item,offer});
      }else if(!inactiveSale(sale)&&finalOffer){
        finals.push({v,item,offer:finalOffer,sale});
      }
    }

    return {singles,finals};
  }

  function renderNewQuotes(data){
    const section=document.getElementById("new-quotes-section"),box=document.getElementById("offers");
    if(!section||!box)return;
    const key=data.singles.map(x=>`${x.v.id}:${x.item.id}:${x.offer.id}:${x.offer.amount}:${x.offer.status}`).join("|");
    if(key===lastNewKey)return;
    lastNewKey=key;

    if(!data.singles.length){
      return;
    }

    const html=data.singles.map(({v,item,offer})=>{
      const title=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ")||"Equipment";
      return `<article class="valuation-card" style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1rem"><div><span class="valuation-ref">${esc(v.quote_reference||"")}</span><p class="section-kicker">NEW QUOTE</p><h3>${esc(title)}</h3>${item.package?`<p>${esc(item.package)}</p>`:""}<p>${esc(offer.customer_message||"Your valuation is ready. Please accept or refuse this offer below.")}</p></div><div class="valuation-meta"><strong>${money(offer.amount)}</strong><div class="navigation-buttons"><button type="button" class="btn btn-primary accept-offer" data-id="${esc(offer.id)}">ACCEPT</button><button type="button" class="btn btn-secondary refuse-offer" data-id="${esc(offer.id)}">REFUSE</button></div></div></article>`;
    }).join("");
    section.style.display="";
    box.innerHTML=html;
  }

  function renderFinalOffers(data){
    const section=document.getElementById("sales-section"),box=document.getElementById("sales");
    if(!section||!box)return;
    const key=data.finals.map(x=>`${x.sale.id}:${x.item.id}:${x.offer.id}:${x.offer.amount}:${x.offer.status}`).join("|");
    if(key===lastFinalKey)return;
    lastFinalKey=key;

    if(!data.finals.length)return;

    const html=data.finals.map(({v,item,offer,sale})=>{
      const title=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ")||"Equipment";
      const message=offer.customer_message||"Your final valuation is ready. Please accept or refuse this final offer below.";
      return `<article class="valuation-card final-offer-card" style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1rem;border-left:4px solid #d88732"><div><span class="valuation-ref">${esc(v.quote_reference||sale.sale_reference||"")}</span><p class="section-kicker">FINAL OFFER READY</p><h3>${esc(title)}</h3><p><strong>Final offer from GearCashOut</strong></p><p>${esc(message)}</p></div><div class="valuation-meta"><strong>${money(offer.amount)}</strong><div class="navigation-buttons"><button type="button" class="btn btn-primary gco-final-accept" data-id="${esc(offer.id)}">ACCEPT FINAL OFFER</button><button type="button" class="btn btn-secondary gco-final-refuse" data-id="${esc(offer.id)}">REFUSE</button></div></div></article>`;
    }).join("");

    section.style.display="";
    box.innerHTML=html;
  }

  async function init(){
    while(!window.actionBuyerAuth)await sleep(200);
    client=window.actionBuyerAuth;

    async function refresh(){
      try{
        const data=await load();
        if(!data)return;
        renderNewQuotes(data);
        renderFinalOffers(data);
      }catch(e){console.error("Standalone/final offer visibility:",e);}
    }

    await refresh();
    setInterval(()=>{if(!document.hidden)refresh();},2000);

    document.addEventListener("click",async event=>{
      const accept=event.target.closest(".gco-final-accept");
      const refuse=event.target.closest(".gco-final-refuse");
      if(!accept&&!refuse)return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const button=accept||refuse;
      const offerId=button.dataset.id;
      if(!offerId)return;

      if(refuse&&!confirm("Refuse this final offer?"))return;

      button.disabled=true;
      const rpc=accept?"accept_quote_offer":"refuse_quote_offer";
      const {error}=await client.supabase.rpc(rpc,{p_offer_id:offerId});
      if(error){
        alert(error.message||"The offer response could not be saved.");
        button.disabled=false;
        return;
      }
      lastFinalKey="";
      window.location.reload();
    },true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
