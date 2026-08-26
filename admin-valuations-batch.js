(function(){
  "use strict";
  function init(){
    const box=document.getElementById("manual-valuations"),auth=window.actionBuyerAuth;
    if(!box||!auth)return;
    const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
    const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n)||0);
    const effective=offers=>{
      const published=(offers||[]).filter(o=>o.status==="published");
      return published.find(o=>o.offer_type==="final")||published.find(o=>o.offer_type==="manual")||published.find(o=>o.offer_type==="automatic")||null;
    };
    const update=async()=>{
      const links=Array.from(box.querySelectorAll('a[href*="admin-quote.html?id="]'));
      for(const link of links){
        try{
          const id=new URL(link.href,location.href).searchParams.get("id");
          if(!id)continue;
          const{data:items}=await auth.supabase.from("quote_items").select("id,item_name,item_status,item_position").eq("valuation_id",id).order("item_position",{ascending:true});
          if(!items?.length)continue;
          const ids=items.map(i=>i.id);
          const{data:offers}=await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status,created_at").in("item_id",ids).order("created_at",{ascending:false});
          const currentByItem=new Map();
          (items||[]).forEach(item=>{
            const itemOffers=(offers||[]).filter(o=>o.item_id===item.id);
            const offer=effective(itemOffers);
            if(offer)currentByItem.set(item.id,offer);
          });
          const ready=items.every(item=>currentByItem.has(item.id)||["accepted","refused","closed"].includes(item.item_status));
          const total=[...currentByItem.values()].reduce((sum,o)=>sum+(Number(o.amount)||0),0);
          const card=link.closest("article");
          if(!card)continue;
          const heading=card.querySelector("h3");
          if(heading)heading.textContent=`${items.length} item${items.length===1?"":"s"}`;
          const names=items.slice(0,3).map(i=>esc(i.item_name||"Equipment"));
          const p=card.querySelector("h3")?.nextElementSibling;
          if(p)p.innerHTML=names.join(" · ")+(items.length>3?` · +${items.length-3} more`:"");
          const meta=link.closest(".valuation-meta");
          if(meta){
            const strong=meta.querySelector("strong");
            if(strong){
              if(items.length>1 && !ready) strong.textContent="Waiting for all item offers";
              else if(total>0) strong.textContent=money(total);
              else strong.textContent="Manual valuation required";
            }
          }
        }catch(_){ }
      }
    };
    const observer=new MutationObserver(()=>setTimeout(update,50));
    observer.observe(box,{childList:true,subtree:true});
    setTimeout(update,250);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
