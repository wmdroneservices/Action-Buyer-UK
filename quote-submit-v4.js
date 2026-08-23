/* GearCashOut: v4 per-item quote submission path. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const auth = window.actionBuyerAuth;
  if (!form || !auth) return;
  const basket = () => window.gearCashOutReverseBasket?.readBasket?.() || [];
  const value = id => String(document.getElementById(id)?.value || "").trim();
  let busy = false;

  function baseRecord(item) {
    return {
      category:item.category || "",
      categoryName:item.categoryName || "",
      manufacturer:item.manufacturer || null,
      model:item.model || null,
      package:item.package || null,
      condition:item.condition || null,
      quoteBasket:[item],
      multiItemQuote:false,
      quoteItemCount:1,
      fullName:value("full-name"),
      email:value("email-address"),
      phone:value("phone-number"),
      addressLine1:value("address-line-1"),
      addressLine2:value("address-line-2"),
      city:value("city"),
      county:value("county"),
      postcode:value("postcode").toUpperCase(),
      legalRight:item.legalRight || "",
      quoteAmount:item.amount || null,
      created:new Date().toISOString(),
      userId:null
    };
  }

  async function submit(){
    if(busy)return;
    busy=true;
    try{
      const session=await auth.getSession();
      if(!session)return;
      const items=basket();
      if(!items.length){alert("Please add at least one item to your quote.");return;}
      const references=[];
      for(const item of items){
        const reference=`WBA-${new Date().getFullYear()}-${Math.floor(100000+Math.random()*900000)}`;
        const record=baseRecord(item);
        record.userId=session.user.id;
        record.submissionKey=crypto.randomUUID ? crypto.randomUUID() : reference;
        const {data,error}=await auth.supabase.rpc("create_customer_quotes",{p_record:record,p_items:[item]});
        if(error)throw error;
        references.push(data?.quote_reference || reference);
      }
      localStorage.setItem("wba_latest_quote",JSON.stringify({quoteReferences:references}));
      localStorage.removeItem("gearCashOutQuoteBasket");
      const ref=document.getElementById("quote-reference");
      if(ref)ref.textContent=references.join(", ");
      form.querySelectorAll(".wizard-step").forEach(s=>s.hidden=Number(s.dataset.step)!==10);
    }catch(e){console.error(e);alert(e.message || "Quote submission failed");}
    finally{busy=false;}
  }

  form.addEventListener("click",e=>{
    const b=e.target.closest(".btn-submit-valuation");
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    submit();
  },true);
});