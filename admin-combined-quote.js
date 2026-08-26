/* GearCashOut: combined staff quote guard. */
(function(){
  "use strict";
  let busy=false;
  const TERMINAL_SALES=["paid","completed","cancelled","closed","archived"];
  const state=async()=>{
    const auth=window.actionBuyerAuth;if(!auth)return null;
    const id=new URLSearchParams(location.search).get("id");if(!id)return null;
    const {data:valuation,error:ve}=await auth.supabase.from("valuations").select("id,quote_reference,quote_data").eq("id",id).maybeSingle();
    if(ve||!valuation)return null;
    const {data:items,error:ie}=await auth.supabase.from("quote_items").select("id,item_position,item_name,item_status").eq("valuation_id",id).order("item_position");
    if(ie)return null;
    const ids=(items||[]).map(i=>i.id);
    const {data:offers,error:oe}=ids.length?await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status,customer_message").in("item_id",ids).order("created_at",{ascending:false}):{data:[],error:null};
    if(oe)return null;
    return {auth,valuation,items:items||[],offers:offers||[],itemIds:ids};
  };
  const effective=(offers,itemId)=>{const list=offers.filter(o=>o.item_id===itemId&&o.status==="published");return list.find(o=>o.offer_type==="final")||list.find(o=>o.offer_type==="manual")||list.find(o=>o.offer_type==="automatic")||null;};
  const msg=(text,ok=true)=>{const el=document.getElementById("admin-message");if(el){el.textContent=text;el.className="form-message form-message "+(ok?"success":"error");el.scrollIntoView({block:"nearest",behavior:"smooth"});}};

  async function purchaseState(s){
    if(!s?.itemIds?.length)return {entered:false};
    const {data:saleItems,error:sie}=await s.auth.supabase.from("sale_items").select("sale_id,quote_item_id").in("quote_item_id",s.itemIds);
    if(sie)throw sie;
    if(!saleItems?.length)return {entered:false};
    const saleIds=[...new Set(saleItems.map(row=>row.sale_id).filter(Boolean))];
    if(!saleIds.length)return {entered:false};
    const {data:sales,error:se}=await s.auth.supabase.from("sales").select("id,status").in("id",saleIds);
    if(se)throw se;
    const active=sales||[];
    return {
      entered:active.some(sale=>!TERMINAL_SALES.includes(String(sale.status||""))),
      sales:active,
      saleItems:saleItems||[]
    };
  }

  async function handleSend(event){
    const button=event.target.closest("#send-combined-quote");
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(busy)return;
    busy=true;
    button.disabled=true;
    const original=button.textContent;
    button.textContent="SENDING...";
    try{
      const s=await state();
      if(!s)throw new Error("The combined quote could not be loaded.");
      if(s.items.length<2)throw new Error("This is not a combined quote.");

      // The combined customer quote exists only before any item has entered the
      // purchase/inspection workflow. Once a customer has accepted an item and
      // a sale exists, the next customer-facing pricing action is the final
      // inspection offer. Never re-send the original combined valuation here;
      // doing so can overwrite the inspection-stage state.
      const purchase=purchaseState(s);
      if(purchase.entered){
        throw new Error("This transaction has already entered the purchase or inspection workflow. Use the final inspection offer controls instead of sending another combined customer quote.");
      }

      const ready=s.items.every(i=>i.item_status==="refused"||!!effective(s.offers,i.id));
      if(!ready)throw new Error("Complete an offer or refusal for every item before sending the combined quote.");
      if(!confirm("Send ONE combined quote email to the customer now?"))return;

      const {data:queue,error:queueError}=await s.auth.supabase.rpc("queue_quote_review_email",{p_valuation_id:s.valuation.id});
      if(queueError)throw queueError;
      const offerId=queue?.first_offer_id;
      if(!offerId)throw new Error("The combined quote was not queued. No offer email could be prepared.");

      const {data:sentData,error:sendError}=await s.auth.supabase.functions.invoke("send-quote-email-v2",{body:{offer_id:offerId,event_type:"offer_published"}});
      if(sendError)throw sendError;
      if(!sentData?.sent)throw new Error(sentData?.error||"The combined quote email was not sent.");

      msg("One combined quote email has been sent to the customer.",true);
      button.textContent="SENT";
      setTimeout(()=>window.location.reload(),500);
    }catch(e){
      console.error("Combined quote send failed",e);
      msg(e?.message||"The combined quote email could not be sent.",false);
      button.disabled=false;
      button.textContent=original;
    }finally{busy=false;}
  }

  function init(){document.addEventListener("click",handleSend,true);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
