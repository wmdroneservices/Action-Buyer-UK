/* GearCashOut: combined customer quote presentation and response handling. */
(function(){
  "use strict";
  let rendering=false;
  let observer=null;

  const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n||0));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const effectiveOffer=(offers,itemId)=>{
    const list=offers.filter(o=>o.item_id===itemId&&o.status==="published");
    return list.find(o=>o.offer_type==="final")||list.find(o=>o.offer_type==="manual")||list.find(o=>o.offer_type==="automatic")||null;
  };

  async function load(){
    const auth=window.actionBuyerAuth;
    const box=document.getElementById("offers");
    const section=document.getElementById("new-quotes-section");
    if(!auth||!box||!section||rendering)return;
    const session=await auth.getSession();
    if(!session?.user?.id)return;

    const {data:valuations,error}=await auth.supabase.from("valuations")
      .select("id,quote_reference,status,submitted_at,quote_data")
      .eq("user_id",session.user.id).is("archived_at",null).order("submitted_at",{ascending:false});
    if(error)return;
    const vals=valuations||[];
    const ids=vals.map(v=>v.id);
    if(!ids.length){section.style.display="none";return;}
    const {data:items}=await auth.supabase.from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position")
      .in("valuation_id",ids).order("item_position",{ascending:true});
    const itemList=items||[];
    const itemIds=itemList.map(i=>i.id);
    const {data:offers}=itemIds.length?await auth.supabase.from("quote_offers")
      .select("id,item_id,offer_type,amount,status,customer_message,created_at")
      .in("item_id",itemIds).order("created_at",{ascending:false}):{data:[]};
    const offerList=offers||[];

    const groups=new Map();
    for(const v of vals){
      const key=v.quote_data?.submissionKey||v.id;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(v);
    }

    const cards=[];
    for(const [key,group] of groups){
      const groupIds=new Set(group.map(v=>v.id));
      const groupItems=itemList.filter(i=>groupIds.has(i.valuation_id));
      const activeItems=groupItems.filter(i=>!['refused','closed'].includes(i.item_status));
      const groupOffers=offerList.filter(o=>groupItems.some(i=>i.id===o.item_id));
      const effective=activeItems.map(i=>effectiveOffer(groupOffers,i.id));
      const hasResponses=groupItems.some(i=>i.item_status==='accepted');
      const ready=activeItems.length>0&&activeItems.every((item,index)=>!!effective[index]);
      const pending=activeItems.length>0&&!hasResponses;
      if(!pending)continue;

      const total=effective.reduce((sum,o)=>sum+(Number(o?.amount)||0),0);
      const isCombined=groupItems.length>1;
      if(!isCombined)continue;

      cards.push(`<article class="valuation-card offer-card" data-combined-key="${esc(key)}" style="display:grid;gap:1rem;margin-bottom:1.5rem;">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
          <div><span class="valuation-ref">${esc(group[0]?.quote_reference||"")}</span><p class="section-kicker">COMBINED QUOTE</p><h3>${groupItems.length} items</h3></div>
          <span class="status-badge">${ready?"READY TO RESPOND":"AWAITING FINAL ITEM OFFER"}</span>
        </div>
        <div style="display:grid;gap:.65rem;">
          ${groupItems.map((item,index)=>{
            const offer=effective[index];
            const name=[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ");
            const pkg=item.package?String(item.package).toLowerCase():"";
            return `<div style="display:flex;justify-content:space-between;gap:1rem;padding:.8rem 0;border-bottom:1px solid #ddd;"><div><strong>ITEM ${esc(item.item_position||index+1)}</strong><div>${esc([name||"Equipment",pkg].filter(Boolean).join(" "))}</div></div><strong>${offer?money(offer.amount):"Awaiting offer"}</strong></div>`;
          }).join("")}
        </div>
        <div style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f;font-size:1.1rem;"><strong>Combined total offer</strong><strong>${money(total)}</strong></div>
        ${ready?`<p style="margin:0">This is one combined quote. Accepting it will add all accepted items to the same sale and use one inbound postage shipment.</p><div class="navigation-buttons"><button class="btn btn-primary accept-combined" data-key="${esc(key)}" type="button">ACCEPT COMBINED QUOTE</button><button class="btn btn-secondary refuse-combined" data-key="${esc(key)}" type="button">REFUSE COMBINED QUOTE</button></div>`:`<p style="margin:0">GearCashOut is still completing the item prices. You cannot accept or refuse this combined quote until every item has a published offer.</p>`}
      </article>`);
    }

    if(!cards.length){
      // Leave single-item offers to the existing account page. Hide the combined section only
      // when there is genuinely no combined quote waiting for a customer response.
      const combinedExists=[...groups.values()].some(group=>itemList.filter(i=>group.some(v=>v.id===i.valuation_id)).length>1);
      if(!combinedExists)return;
      rendering=true;
      box.innerHTML="";
      section.style.display="none";
      rendering=false;
      return;
    }

    rendering=true;
    box.innerHTML=cards.join("");
    section.style.display="";
    rendering=false;

    box.querySelectorAll(".accept-combined").forEach(button=>button.addEventListener("click",()=>respond(button.dataset.key,true)));
    box.querySelectorAll(".refuse-combined").forEach(button=>button.addEventListener("click",()=>respond(button.dataset.key,false)));
  }

  async function respond(key,accept){
    const auth=window.actionBuyerAuth;
    const button=document.querySelector(`${accept?".accept-combined":".refuse-combined"}[data-key="${CSS.escape(key)}"]`);
    if(button)button.disabled=true;
    try{
      const session=await auth.getSession();
      const {data:valuations}=await auth.supabase.from("valuations").select("id,quote_data").eq("user_id",session.user.id).is("archived_at",null);
      const group=(valuations||[]).filter(v=>(v.quote_data?.submissionKey||v.id)===key);
      const ids=group.map(v=>v.id);
      const {data:items}=await auth.supabase.from("quote_items").select("id,item_status,valuation_id").in("valuation_id",ids);
      const itemIds=(items||[]).filter(i=>!['refused','closed','accepted'].includes(i.item_status)).map(i=>i.id);
      const {data:offers}=await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status").in("item_id",itemIds);
      const effective=itemIds.map(id=>effectiveOffer(offers||[],id));
      if(!effective.every(Boolean))throw new Error("The combined quote is not ready yet. Please wait until every item has a published offer.");
      if(!confirm(accept?"Accept the entire combined quote? All items will be placed in one sale and use one inbound postage shipment.":"Refuse the entire combined quote?"))return;
      for(const offer of effective){
        const {error}=await auth.supabase.rpc(accept?"accept_quote_offer":"refuse_quote_offer",{p_offer_id:offer.id});
        if(error)throw error;
      }
      await load();
      window.location.reload();
    }catch(error){alert(error?.message||"The combined quote response could not be saved.");if(button)button.disabled=false;}
  }

  function init(){
    const box=document.getElementById("offers");
    if(!box)return;
    load();
    observer=new MutationObserver(()=>{if(!rendering)load();});
    observer.observe(box,{childList:true,subtree:true});
    window.addEventListener("pageshow",load);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
