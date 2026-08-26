/* Prevent automatic revisions from being emailed individually on combined quotes. */
(function(){
  "use strict";
  async function isCombined(itemId){
    const auth=window.actionBuyerAuth;if(!auth)return false;
    const {data:item}=await auth.supabase.from("quote_items").select("valuation_id").eq("id",itemId).maybeSingle();
    if(!item)return false;
    const {count}=await auth.supabase.from("quote_items").select("id",{count:"exact",head:true}).eq("valuation_id",item.valuation_id);
    return Number(count||0)>1;
  }
  document.addEventListener("click",async event=>{
    const button=event.target.closest(".automatic-revise");
    if(!button)return;
    if(!(await isCombined(button.dataset.item)))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const input=document.querySelector(`.automatic-price[data-item="${CSS.escape(button.dataset.item)}"]`);
    const amount=Number(input?.value);
    if(!Number.isFinite(amount)||amount<0){alert("Enter a valid automatic valuation.");return;}
    button.disabled=true;
    try{
      const auth=window.actionBuyerAuth;
      const {error}=await auth.supabase.rpc("publish_quote_offer",{
        p_item_id:button.dataset.item,
        p_offer_type:"automatic",
        p_amount:amount,
        p_internal_notes:"Confirmed revised automatic valuation after staff review",
        p_customer_message:"We have completed your combined valuation. Please sign in to your GearCashOut account to review the completed quote."
      });
      if(error)throw error;
      location.reload();
    }catch(error){button.disabled=false;alert(error?.message||"The automatic valuation could not be revised.");}
  },true);
})();
