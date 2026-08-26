/* Purchasing queue: show published customer offers before a sale exists. */
(function(){
  "use strict";
  const effectiveOffer=(offers,itemId)=>{
    const list=offers.filter(o=>o.item_id===itemId&&o.status==="published");
    return list.find(o=>o.offer_type==="final")||list.find(o=>o.offer_type==="manual")||list.find(o=>o.offer_type==="automatic")||null;
  };
  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function refresh(){
    const auth=window.actionBuyerAuth;
    const box=document.getElementById("sales-list");
    if(!auth||!box)return;
    const session=await auth.getSession();
    if(!session?.user?.id)return;

    const {data:vals}=await auth.supabase.from("valuations")
      .select("id,quote_reference,status,submitted_at,quote_data")
      .is("archived_at",null).order("submitted_at",{ascending:false});
    const ids=(vals||[]).map(v=>v.id);
    if(!ids.length){document.getElementById("pending-customer-response-panel")?.remove();return;}
    const {data:items}=await auth.supabase.from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position")
      .in("valuation_id",ids).order("item_position",{ascending:true});
    const itemList=items||[];
    const itemIds=itemList.map(i=>i.id);
    const {data:offers}=itemIds.length?await auth.supabase.from("quote_offers")
      .select("id,item_id,offer_type,amount,status,customer_message,created_at")
      .in("item_id",itemIds):{data:[]};
    const offerList=offers||[];

    const ready=[];
    for(const v of vals||[]){
      const vi=itemList.filter(i=>i.valuation_id===v.id);
      const unresolved=vi.filter(i=>!['accepted','refused','closed'].includes(i.item_status));
      if(!unresolved.length)continue;
      const effective=unresolved.map(i=>effectiveOffer(offerList,i.id));
      if(!effective.every(Boolean))continue;
      ready.push({v,vi,effective});
    }

    let panel=document.getElementById("pending-customer-response-panel");
    if(!ready.length){panel?.remove();return;}
    if(!panel){panel=document.createElement("section");panel.id="pending-customer-response-panel";panel.className="account-panel";box.prepend(panel);}

    panel.innerHTML=`<div class="section-heading"><p class="section-kicker">CUSTOMER RESPONSE</p><h2>Offers awaiting customer response</h2><p>These offers have been published. No sale is created until the customer responds from My Account.</p></div>${ready.map(({v,vi,effective})=>{
      const total=effective.reduce((sum,o)=>sum+(Number(o?.amount)||0),0);
      return `<article class="valuation-card" style="margin-bottom:1rem;"><div><span class="valuation-ref">${esc(v.quote_reference)}</span><p class="section-kicker">${vi.length>1?"COMBINED QUOTE":"CUSTOMER OFFER"}</p><h3>${vi.length} item${vi.length===1?"":"s"}</h3>${vi.map((item,index)=>{const offer=effective[index];const name=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ");const pkg=item.package?String(item.package).toLowerCase():"";return `<p style="margin:.25rem 0"><strong>${esc([name||"Equipment",pkg].filter(Boolean).join(" "))}</strong> — ${money(offer.amount)}</p>`;}).join("")}<p style="margin-top:.75rem"><strong>Total offer: ${money(total)}</strong></p></div><div class="valuation-meta"><span class="status-badge">AWAITING CUSTOMER</span></div></article>`;
    }).join("")}`;
  }

  function init(){refresh();setInterval(()=>{if(!document.hidden)refresh();},5000);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
