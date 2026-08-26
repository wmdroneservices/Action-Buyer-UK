/* GearCashOut: restore standalone customer offers without touching active combined-quote authority. */
(function(){
  "use strict";
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  const terminal=s=>["accepted","refused","closed"].includes(String(s||""));
  let client=null,lastKey="";
  async function load(){
    if(!client)client=window.actionBuyerAuth;
    const session=await client?.getSession();
    if(!session?.user?.id)return null;
    const {data:vals,error:ve}=await client.supabase.from("valuations").select("id,quote_reference,status,submitted_at,quote_data").eq("user_id",session.user.id).is("archived_at",null).order("submitted_at",{ascending:false});
    if(ve)throw ve;
    const ids=(vals||[]).map(v=>v.id);
    if(!ids.length)return {singles:[]};
    const {data:items,error:ie}=await client.supabase.from("quote_items").select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position").in("valuation_id",ids).order("item_position",{ascending:true});
    if(ie)throw ie;
    const itemIds=(items||[]).map(i=>i.id);
    if(!itemIds.length)return {singles:[]};
    const {data:offers,error:oe}=await client.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status,customer_message,created_at").in("item_id",itemIds).order("created_at",{ascending:false});
    if(oe)throw oe;
    const {data:saleItems,error:se}=await client.supabase.from("sale_items").select("quote_item_id,sale_id").in("quote_item_id",itemIds);
    if(se)throw se;
    const sold=new Set((saleItems||[]).map(s=>s.quote_item_id));
    const singles=[];
    for(const v of vals||[]){
      const vis=items.filter(i=>i.valuation_id===v.id);
      if(vis.length!==1)continue;
      const item=vis[0];
      if(terminal(item.item_status)||sold.has(item.id))continue;
      const pub=(offers||[]).filter(o=>o.item_id===item.id&&o.status==="published");
      const offer=pub.find(o=>o.offer_type==="final")||pub.find(o=>o.offer_type==="manual")||pub.find(o=>o.offer_type==="automatic");
      if(!offer)continue;
      singles.push({v,item,offer});
    }
    return {singles};
  }
  function render(data){
    const section=document.getElementById("new-quotes-section"),box=document.getElementById("offers");
    if(!section||!box)return;
    if(!data.singles.length)return;
    const key=data.singles.map(x=>`${x.v.id}:${x.item.id}:${x.offer.id}:${x.offer.amount}`).join("|");
    if(key===lastKey)return;
    lastKey=key;
    const html=data.singles.map(({v,item,offer})=>{
      const title=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ")||"Equipment";
      return `<article class="valuation-card" style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1rem"><div><span class="valuation-ref">${esc(v.quote_reference||"")}</span><p class="section-kicker">NEW QUOTE</p><h3>${esc(title)}</h3>${item.package?`<p>${esc(item.package)}</p>`:""}<p>${esc(offer.customer_message||"Your valuation is ready. Please accept or refuse this offer below.")}</p></div><div class="valuation-meta"><strong>${money(offer.amount)}</strong><div class="navigation-buttons"><button type="button" class="btn btn-primary accept-offer" data-id="${esc(offer.id)}">ACCEPT</button><button type="button" class="btn btn-secondary refuse-offer" data-id="${esc(offer.id)}">REFUSE</button></div></div></article>`;
    }).join("");
    section.style.display="";
    box.innerHTML=html;
  }
  async function init(){
    while(!window.actionBuyerAuth)await sleep(200);
    client=window.actionBuyerAuth;
    async function refresh(){try{const data=await load();if(data)render(data);}catch(e){console.error("Standalone offer visibility:",e);}}
    await refresh();
    setInterval(()=>{if(!document.hidden)refresh();},2000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
