(function(){"use strict";
async function init(){
  const a=window.actionBuyerAuth;
  if(!a)return;

  async function groupReady(itemId){
    const {data:item}=await a.supabase.from("quote_items").select("id,valuation_id").eq("id",itemId).maybeSingle();
    if(!item)return {ready:true};
    const {data:valuation}=await a.supabase.from("valuations").select("id,user_id,quote_data").eq("id",item.valuation_id).maybeSingle();
    if(!valuation)return {ready:true};
    const key=valuation.quote_data?.submissionKey;
    if(!key)return {ready:true};
    const {data:valuations}=await a.supabase.from("valuations").select("id,quote_data").eq("user_id",valuation.user_id);
    const groupIds=(valuations||[]).filter(v=>v.quote_data?.submissionKey===key).map(v=>v.id);
    if(!groupIds.length)return {ready:true};
    const {data:items}=await a.supabase.from("quote_items").select("id,item_status,valuation_id").in("valuation_id",groupIds);
    const active=(items||[]).filter(i=>!['refused','closed'].includes(i.item_status));
    if(active.length<=1)return {ready:true};
    const itemIds=active.map(i=>i.id);
    const {data:offers}=await a.supabase.from("quote_offers").select("item_id,status").in("item_id",itemIds);
    const readyIds=new Set((offers||[]).filter(o=>o.status==='published').map(o=>o.item_id));
    return {ready:itemIds.every(id=>readyIds.has(id)),count:itemIds.length,readyCount:readyIds.size};
  }

  document.addEventListener("click",async event=>{
    const button=event.target.closest(".accept-offer,.refuse-offer");
    if(!button)return;
    const itemId=button.dataset.id;
    if(!itemId)return;
    const state=await groupReady(itemId);
    if(!state.ready){
      event.preventDefault();
      event.stopImmediatePropagation();
      alert(`This is a combined valuation. Please wait until all ${state.count} item prices are available before accepting or refusing the quote.`);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if(button.classList.contains("refuse-offer")&&!confirm("Refuse this item? The other items in this quote will not be affected."))return;
    button.disabled=true;
    const rpc=button.classList.contains("accept-offer")?"accept_quote_offer":"refuse_quote_offer";
    const{error}=await a.supabase.rpc(rpc,{p_offer_id:itemId});
    button.disabled=false;
    if(error){alert(error.message||"The item response could not be saved.");return;}
    location.reload();
  },true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
