/* Purchasing dashboard status routing for single and combined valuations. */
(function(){
  "use strict";

  const setCount=(id,value)=>{
    const el=document.getElementById(id);
    if(!el)return;
    const n=Number(value)||0;
    el.textContent=n;
    el.style.color=n>0?"#c62828":"";
    el.style.fontWeight=n>0?"800":"";
  };

  const effectiveOffer=(offers,itemId)=>{
    const list=(offers||[]).filter(o=>o.item_id===itemId&&o.status==="published");
    return list.find(o=>o.offer_type==="final")||list.find(o=>o.offer_type==="manual")||list.find(o=>o.offer_type==="automatic")||null;
  };

  const submissionKey=v=>{
    const key=v?.quote_data?.submissionKey;
    return key&&String(key).trim()?String(key).trim():v.id;
  };

  async function refresh(){
    const auth=window.actionBuyerAuth;
    if(!auth)return;
    const session=await auth.getSession();
    if(!session?.user?.id)return;

    const {data:vals,error}=await auth.supabase
      .from("valuations")
      .select("id,user_id,status,archived_at,quote_data,submitted_at")
      .is("archived_at",null);
    if(error)return;

    const ids=(vals||[]).map(v=>v.id);
    const {data:items}=ids.length
      ? await auth.supabase.from("quote_items").select("id,valuation_id,item_status,item_position").in("valuation_id",ids)
      : {data:[]};
    const itemList=items||[];
    const itemIds=itemList.map(i=>i.id);
    const {data:offers}=itemIds.length
      ? await auth.supabase.from("quote_offers").select("id,item_id,offer_type,status,amount").in("item_id",itemIds)
      : {data:[]};
    const offerList=offers||[];

    const groups=new Map();
    (vals||[]).forEach(v=>{
      const key=submissionKey(v);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(v);
    });

    let awaitingValuation=0;
    let awaitingCustomer=0;
    let combinedReadyToSend=0;
    let singleAutomaticWaiting=0;

    for(const group of groups.values()){
      const groupIds=new Set(group.map(v=>v.id));
      const groupItems=itemList.filter(i=>groupIds.has(i.valuation_id));
      if(!groupItems.length)continue;

      const unresolved=groupItems.filter(i=>!['accepted','refused','closed'].includes(i.item_status));
      if(!unresolved.length)continue;

      const published=groupItems.map(i=>({item:i,offer:effectiveOffer(offerList,i.id)}));
      const allPriced=unresolved.every(x=>!!published.find(y=>y.item.id===x.id)?.offer);
      const isCombined=groupItems.length>1 || group.length>1;
      const customerReview=group.some(v=>v.status==='customer_review');

      if(isCombined){
        if(customerReview){
          awaitingCustomer++;
        }else{
          // A combined quote belongs to Valuations until one combined customer
          // quote has actually been sent, even when one or more items already
          // have automatic prices.
          awaitingValuation++;
          if(allPriced)combinedReadyToSend++;
        }
      }else if(allPriced && groupItems[0]?.item_status!=='accepted'){
        const offer=published[0]?.offer;
        if(offer?.offer_type==='automatic' || offer?.offer_type==='manual'){
          awaitingCustomer++;
          if(offer.offer_type==='automatic')singleAutomaticWaiting++;
        }
      }else{
        awaitingValuation++;
      }
    }

    setCount("valuation-count",awaitingValuation);
    setCount("customer-response-count",awaitingCustomer);

    const cta=document.getElementById("automatic-response-cta");
    const text=document.getElementById("automatic-response-text");
    if(cta){
      const link=cta.querySelector("a");
      if(awaitingValuation>0){
        cta.hidden=false;
        if(link){
          link.href="admin-valuations.html";
          link.textContent=combinedReadyToSend>0?"OPEN VALUATIONS — READY TO SEND":"OPEN VALUATIONS";
        }
      }else if(awaitingCustomer>0){
        cta.hidden=false;
        if(link){
          link.href="admin-sales.html";
          link.textContent="OPEN PURCHASES, PAYMENTS & SHIPPING";
        }
      }else{
        cta.hidden=true;
      }
    }
    if(text){
      if(awaitingValuation>0){
        text.textContent=combinedReadyToSend>0
          ? `${combinedReadyToSend} combined valuation${combinedReadyToSend===1?"":"s"} is ready to send to the customer.`
          : `${awaitingValuation} valuation${awaitingValuation===1?"":"s"} require staff review before a customer quote is sent.`;
      }else if(awaitingCustomer>0){
        text.textContent=awaitingCustomer===1
          ? "1 quote is live and awaiting the customer's response."
          : `${awaitingCustomer} quotes are live and awaiting customer responses.`;
      }
    }
  }

  function init(){
    refresh();
    setInterval(()=>{if(!document.hidden)refresh();},5000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
