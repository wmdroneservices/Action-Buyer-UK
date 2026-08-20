/* Return-shipment guard. A paid/completed sale does not automatically need a return shipment. */
document.addEventListener("DOMContentLoaded", () => {
  const box=document.getElementById("sales-list");
  const auth=window.actionBuyerAuth;
  if(!box||!auth)return;
  const params=new URLSearchParams(window.location.search);
  if(params.get("archive")==="1"||params.get("returned")==="1")return;

  let timer=null,running=false;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,250);};

  async function apply(){
    if(running)return;
    running=true;
    try{
      const cards=[...box.querySelectorAll("article.valuation-card")];
      const refs=cards.map(card=>card.querySelector(".valuation-ref")?.textContent?.trim()).filter(Boolean);
      if(!refs.length)return;
      const {data:sales}=await auth.supabase.from("sales").select("id,sale_reference").in("sale_reference",refs);
      if(!sales?.length)return;
      const saleIds=sales.map(s=>s.id);
      const {data:saleItems}=await auth.supabase.from("sale_items").select("sale_id,quote_item_id").in("sale_id",saleIds);
      const quoteItemIds=(saleItems||[]).map(x=>x.quote_item_id).filter(Boolean);
      const {data:refusedOffers}=quoteItemIds.length?await auth.supabase.from("quote_offers").select("item_id").in("item_id",quoteItemIds).eq("status","refused"): {data:[]};
      const refusedBySale=new Set();
      (saleItems||[]).forEach(si=>{if((refusedOffers||[]).some(o=>o.item_id===si.quote_item_id))refusedBySale.add(si.sale_id);});
      const saleByRef=new Map(sales.map(s=>[s.sale_reference,s]));
      cards.forEach(card=>{
        const sale=saleByRef.get(card.querySelector(".valuation-ref")?.textContent?.trim());
        if(!sale)return;
        const hasRefusal=refusedBySale.has(sale.id);
        card.querySelectorAll(".new-shipment[data-type='return']").forEach(button=>{button.hidden=!hasRefusal;button.disabled=!hasRefusal;});
      });
    }finally{running=false;}
  }
  new MutationObserver(schedule).observe(box,{childList:true,subtree:true});
  setTimeout(apply,900);
});
