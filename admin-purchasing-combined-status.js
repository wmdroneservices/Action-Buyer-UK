/* Purchasing dashboard status correction for combined valuations. */
(function(){
  "use strict";
  const effectiveOffer=(offers,itemId)=>{
    const list=offers.filter(o=>o.item_id===itemId&&o.status==="published");
    return list.find(o=>o.offer_type==="final")||list.find(o=>o.offer_type==="manual")||list.find(o=>o.offer_type==="automatic")||null;
  };
  const setCount=(id,value)=>{const el=document.getElementById(id);if(!el)return;const n=Number(value)||0;el.textContent=n;el.style.color=n>0?"#c62828":"";el.style.fontWeight=n>0?"800":"";};

  async function refresh(){
    const auth=window.actionBuyerAuth;if(!auth)return;
    const session=await auth.getSession();if(!session?.user?.id)return;
    const {data:vals,error}=await auth.supabase.from("valuations").select("id,status,archived_at,quote_data").is("archived_at",null);
    if(error)return;
    const ids=(vals||[]).map(v=>v.id);
    const {data:items}=ids.length?await auth.supabase.from("quote_items").select("id,valuation_id,item_status,item_position").in("valuation_id",ids):{data:[]};
    const itemList=items||[];const itemIds=itemList.map(i=>i.id);
    const {data:offers}=itemIds.length?await auth.supabase.from("quote_offers").select("id,item_id,offer_type,status,amount").in("item_id",itemIds):{data:[]};
    const offerList=offers||[];

    const states=(vals||[]).map(v=>{
      const vi=itemList.filter(i=>i.valuation_id===v.id);
      const unresolved=vi.filter(i=>!['accepted','refused','closed'].includes(i.item_status));
      const effective=new Map(vi.map(i=>[i.id,effectiveOffer(offerList,i.id)]));
      const ready=unresolved.length>0&&unresolved.every(i=>!!effective.get(i.id));
      const needsStaff=unresolved.length>0&&unresolved.some(i=>!effective.get(i.id));
      const hasAutomatic=unresolved.some(i=>effective.get(i.id)?.offer_type==='automatic');
      return {v,vi,unresolved,ready,needsStaff,hasAutomatic};
    });

    const awaitingReview=states.filter(s=>s.needsStaff).length;
    const awaitingCustomer=states.filter(s=>s.ready).length;
    const automaticReady=states.filter(s=>s.ready&&s.hasAutomatic).length;
    const combinedReady=states.some(s=>s.ready&&s.vi.length>1);
    setCount("valuation-count",awaitingReview);
    setCount("customer-response-count",awaitingCustomer);

    const cta=document.getElementById("automatic-response-cta");
    const text=document.getElementById("automatic-response-text");
    const heading=cta?.querySelector("h2");
    if(cta)cta.hidden=automaticReady===0;
    if(heading)heading.textContent=combinedReady?"COMBINED QUOTE RECEIVED — AWAITING CUSTOMER TO ACCEPT OR REFUSE":"AUTOMATIC VALUATION RECEIVED — AWAITING CUSTOMER TO ACCEPT OR REFUSE";
    if(text){
      text.textContent=combinedReady
        ? "The complete combined quote is live and awaiting the customer's response."
        : automaticReady===1
          ? "1 automatic valuation is complete and awaiting the customer's response."
          : `${automaticReady} automatic valuations are complete and awaiting customer responses.`;
    }
  }

  function init(){refresh();setInterval(()=>{if(!document.hidden)refresh();},5000);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
