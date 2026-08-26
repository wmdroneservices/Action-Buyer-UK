/* Purchasing dashboard status correction for combined valuations. */
(function(){
  "use strict";
  const authReady=()=>window.actionBuyerAuth;
  const effectiveOffer=(offers,itemId)=>{
    const list=offers.filter(o=>o.item_id===itemId&&o.status==="published");
    return list.find(o=>o.offer_type==="final")||list.find(o=>o.offer_type==="manual")||list.find(o=>o.offer_type==="automatic")||null;
  };
  const setCount=(id,value)=>{const el=document.getElementById(id);if(!el)return;const n=Number(value)||0;el.textContent=n;el.style.color=n>0?"#c62828":"";el.style.fontWeight=n>0?"800":"";};

  async function refresh(){
    const auth=authReady();
    if(!auth)return;
    const session=await auth.getSession();
    if(!session?.user?.id)return;
    const {data:vals,error}=await auth.supabase.from("valuations").select("id,status,archived_at,quote_data").is("archived_at",null);
    if(error)return;
    const ids=(vals||[]).map(v=>v.id);
    const {data:items}=ids.length?await auth.supabase.from("quote_items").select("id,valuation_id,item_status,item_position").in("valuation_id",ids):{data:[]};
    const itemList=items||[];
    const itemIds=itemList.map(i=>i.id);
    const {data:offers}=itemIds.length?await auth.supabase.from("quote_offers").select("id,item_id,offer_type,status,amount").in("item_id",itemIds):{data:[]};
    const offerList=offers||[];

    const states=(vals||[]).map(v=>{
      const vi=itemList.filter(i=>i.valuation_id===v.id);
      const unresolved=vi.filter(i=>!['accepted','refused','closed'].includes(i.item_status));
      const effective=vi.map(i=>({item:i,offer:effectiveOffer(offerList,i.id)}));
      const ready=unresolved.length>0&&unresolved.every(x=>!!effective.find(e=>e.item.id===x.id)?.offer);
      const needsStaff=unresolved.length===0?false:unresolved.some(x=>!effective.find(e=>e.item.id===x.id)?.offer);
      const hasAutomatic=unresolved.some(x=>effective.find(e=>e.item.id===x.id)?.offer?.offer_type==='automatic');
      return {v,vi,unresolved,ready,needsStaff,hasAutomatic};
    });

    const awaitingReview=states.filter(s=>s.needsStaff).length;
    const awaitingCustomer=states.filter(s=>s.ready).length;
    const automaticReady=states.filter(s=>s.ready&&s.hasAutomatic).length;
    setCount("valuation-count",awaitingReview);
    setCount("customer-response-count",awaitingCustomer);

    const cta=document.getElementById("automatic-response-cta");
    const text=document.getElementById("automatic-response-text");
    if(cta)cta.hidden=automaticReady===0;
    if(text){
      text.textContent=automaticReady===1
        ? "1 automatic valuation is complete and awaiting the customer's response."
        : `${automaticReady} automatic valuations are complete and awaiting customer responses.`;
    }
  }

  function init(){refresh();setInterval(()=>{if(!document.hidden)refresh();},5000);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
