/* GearCashOut: add read-only original-valuation links to customer account cards. */
(function(){
  "use strict";
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let mappings=null,loading=false;

  async function loadMappings(){
    if(loading)return mappings;
    loading=true;
    try{
      while(!window.actionBuyerAuth)await sleep(100);
      const auth=window.actionBuyerAuth,session=await auth.getSession();
      if(!session?.user?.id)return null;
      const db=auth.supabase;
      const {data:vals,error:valuationError}=await db.from("valuations").select("id,quote_reference").eq("user_id",session.user.id).is("archived_at",null);
      if(valuationError)throw valuationError;
      const valuationByRef=new Map((vals||[]).map(v=>[String(v.quote_reference||""),v]));
      const valuationIds=(vals||[]).map(v=>v.id);
      const {data:items,error:itemError}=valuationIds.length?await db.from("quote_items").select("id,valuation_id").in("valuation_id",valuationIds):{data:[]};
      if(itemError)throw itemError;
      const itemToValuation=new Map((items||[]).map(i=>[i.id,i.valuation_id]));
      const {data:sales,error:saleError}=await db.from("sales").select("id,sale_reference").eq("user_id",session.user.id);
      if(saleError)throw saleError;
      const saleIds=(sales||[]).map(s=>s.id);
      const {data:saleItems,error:saleItemError}=saleIds.length?await db.from("sale_items").select("sale_id,quote_item_id").in("sale_id",saleIds):{data:[]};
      if(saleItemError)throw saleItemError;
      const saleMap=new Map();
      for(const sale of sales||[]){
        const ids=[...new Set((saleItems||[]).filter(si=>si.sale_id===sale.id).map(si=>itemToValuation.get(si.quote_item_id)).filter(Boolean))];
        saleMap.set(String(sale.sale_reference||""),ids.map(id=>(vals||[]).find(v=>v.id===id)).filter(Boolean));
      }
      mappings={valuationByRef,saleMap};
      return mappings;
    }catch(error){console.error("Original valuation link loader:",error);return null;}
    finally{loading=false;}
  }

  function addLinks(){
    if(!mappings)return;
    document.querySelectorAll("#valuations .valuation-card, #sales .valuation-card").forEach(card=>{
      if(card.querySelector(".customer-original-valuation-links"))return;
      const ref=card.querySelector(".valuation-ref")?.textContent?.trim();
      if(!ref)return;
      const direct=mappings.valuationByRef.get(ref);
      const vals=direct?[direct]:(mappings.saleMap.get(ref)||[]);
      if(!vals.length)return;
      const wrap=document.createElement("div");
      wrap.className="navigation-buttons customer-original-valuation-links";
      wrap.style.marginTop="1rem";
      wrap.innerHTML=vals.map(v=>`<a class="btn btn-secondary" href="customer-valuation.html?id=${encodeURIComponent(v.id)}">VIEW WHAT YOU SENT</a>`).join("");
      card.appendChild(wrap);
    });
  }

  async function init(){
    await loadMappings();
    addLinks();
    const observe=target=>target&&new MutationObserver(()=>queueMicrotask(addLinks)).observe(target,{childList:true,subtree:true});
    observe(document.getElementById("valuations"));
    observe(document.getElementById("sales"));
    setInterval(addLinks,3000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();