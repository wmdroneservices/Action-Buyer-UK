/* GearCashOut: combined staff quote guard. */
(function(){
  "use strict";
  let combined=false;
  let busy=false;
  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  const message=text=>{const el=document.getElementById("admin-message");if(el){el.textContent=text;el.className="form-message success";}};

  async function loadState(){
    const auth=window.actionBuyerAuth;if(!auth)return null;
    const id=new URLSearchParams(location.search).get("id");if(!id)return null;
    const {data:valuation}=await auth.supabase.from("valuations").select("id,quote_reference,quote_data").eq("id",id).maybeSingle();
    if(!valuation)return null;
    const {data:items}=await auth.supabase.from("quote_items").select("id,item_position,item_name,item_status").eq("valuation_id",id).order("item_position");
    const itemIds=(items||[]).map(i=>i.id);
    const {data:offers}=itemIds.length?await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status").in("item_id",itemIds).order("created_at",{ascending:false}):{data:[]};
    combined=(items||[]).length>1;
    return {valuation,items:items||[],offers:offers||[]};
  }

  function effective(offers,itemId){
    const list=offers.filter(o=>o.item_id===itemId&&o.status==="published");
    return list.find(o=>o.offer_type==="final")||list.find(o=>o.offer_type==="manual")||list.find(o=>o.offer_type==="automatic")||null;
  }

  async function publishWithoutEmail(itemId,type,amount){
    const auth=window.actionBuyerAuth;
    const {data,error}=await auth.supabase.rpc("publish_quote_offer",{
      p_item_id:itemId,
      p_offer_type:type,
      p_amount:amount,
      p_internal_notes:type==="final"?"Final physical inspection offer":type==="automatic"?"Confirmed automatic valuation after staff review":"Offer after staff review",
      p_customer_message:type==="final"?"This is your final offer following our inspection. Please sign in to your GearCashOut account to accept or refuse it.":"We have reviewed your submission and made an offer. Please sign in to your GearCashOut account to accept or refuse it."
    });
    if(error)throw error;
    message(combined?"Item offer saved. No customer email was sent yet; the combined quote will be sent once every item is ready.":"Offer published.");
  }

  async function sendCombined(state){
    const auth=window.actionBuyerAuth;
    const effectiveOffers=state.items.map(i=>effective(state.offers,i.id));
    if(!effectiveOffers.every(Boolean)){
      message("Complete an effective published offer for every item before sending the combined quote.");
      return;
    }
    if(!confirm(`Send ONE combined quote email for all ${state.items.length} items?`))return;
    const {data,result,error}=await auth.supabase.rpc("queue_quote_review_email",{p_valuation_id:state.valuation.id});
    if(error)throw error;
    const offerId=data?.first_offer_id||result?.first_offer_id||effectiveOffers[0]?.id;
    if(offerId){
      const sent=await auth.supabase.functions.invoke("send-quote-email-v2",{body:{offer_id:offerId,event_type:"offer_published"}});
      if(sent.error)throw sent.error;
    }
    message("One combined quote email has been sent to the customer.");
    await renderCombinedButton();
  }

  async function renderCombinedButton(){
    const state=await loadState();
    if(!state||!state.items.length||!combined)return;
    const target=document.getElementById("offer-controls");if(!target)return;
    const ready=state.items.every(i=>!!effective(state.offers,i.id));
    let bar=document.getElementById("combined-send-bar");
    if(!bar){bar=document.createElement("div");bar.id="combined-send-bar";bar.style.cssText="margin:1rem 0;padding:1rem 1.2rem;background:#fff7eb;border-left:5px solid #d88732;display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap;";target.prepend(bar);}
    bar.innerHTML=`<div><strong>COMBINED CUSTOMER QUOTE</strong><p style="margin:.25rem 0 0">${ready?`All ${state.items.length} item offers are ready. Send one total to the customer.`:`Waiting for all ${state.items.length} item offers to be published.`}</p></div>${ready?'<button class="btn btn-primary" id="send-combined-quote" type="button">SEND COMBINED QUOTE</button>':''}`;
    const button=bar.querySelector("#send-combined-quote");
    if(button)button.addEventListener("click",async()=>{button.disabled=true;try{await sendCombined(state);}catch(e){alert(e?.message||"The combined quote could not be sent.");button.disabled=false;}});
  }

  document.addEventListener("click",async event=>{
    if(busy)return;
    const publish=event.target.closest(".publish-offer,.automatic-confirm");
    if(!publish)return;
    const state=await loadState();
    if(!state?.items.length||!combined)return;
    event.preventDefault();event.stopImmediatePropagation();
    const itemId=publish.dataset.item;
    const type=publish.classList.contains("automatic-confirm")?"automatic":publish.dataset.type;
    const selector=publish.classList.contains("automatic-confirm")?`.automatic-price[data-item="${CSS.escape(itemId)}"]`:`.offer-price[data-item="${CSS.escape(itemId)}"][data-type="${CSS.escape(type)}"]`;
    const amount=Number(document.querySelector(selector)?.value);
    if(!Number.isFinite(amount)||amount<0){alert("Enter a valid offer amount.");return;}
    busy=true;publish.disabled=true;
    try{await publishWithoutEmail(itemId,type,amount);await renderCombinedButton();}
    catch(e){alert(e?.message||"The offer could not be saved.");publish.disabled=false;}
    finally{busy=false;}
  },true);

  async function init(){
    await new Promise(r=>setTimeout(r,250));
    await renderCombinedButton();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
