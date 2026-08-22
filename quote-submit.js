/* GearCashOut: one submission path for the reverse basket. */
document.addEventListener("DOMContentLoaded", function(){
  "use strict";
  const form=document.getElementById("quote-form");
  if(!form||!window.actionBuyerAuth)return;
  const BUCKET="quote-photos";
  let busy=false;
  const clean=v=>String(v??"").trim();
  const value=id=>clean(document.getElementById(id)?.value);
  const basket=()=>window.gearCashOutReverseBasket?.readBasket?.()||[];
  const files=()=>window.gearCashOutReverseBasket?.filesStore?.()||[];
  const keyName="gearCashOutQuoteSubmissionKey";
  function submissionKey(){try{let k=localStorage.getItem(keyName);if(!k){k=(crypto.randomUUID?crypto.randomUUID():"gco-"+Date.now()+"-"+Math.random().toString(36).slice(2));localStorage.setItem(keyName,k);}return k;}catch(_){return "gco-"+Date.now()+"-"+Math.random().toString(36).slice(2);}}
  function saveResume(){try{localStorage.setItem("gearCashOutQuoteResume",JSON.stringify({quoteBasket:basket(),submissionKey:submissionKey(),created:new Date().toISOString()}));localStorage.setItem("actionBuyerReturnAfterAuth","quote.html");}catch(_){} }
  function clearResume(){try{localStorage.removeItem("gearCashOutQuoteResume");localStorage.removeItem("actionBuyerReturnAfterAuth");}catch(_){} }
  function showSubmitted(reference){form.querySelectorAll(".wizard-step").forEach(s=>s.hidden=Number(s.dataset.step)!==14);const ref=document.getElementById("quote-reference");if(ref)ref.textContent=reference;const nav=document.querySelector('[data-step="14"] .navigation-buttons');if(nav)nav.innerHTML='<a class="btn" href="account.html">Return to My Account</a>';window.scrollTo({top:0,behavior:"smooth"});}
  async function uploadAll(session,reference){
    const groups=files();const b=basket();
    if(groups.length!==b.length)throw new Error("The photographs for one or more items were not retained. Please return to the item list and add the photographs again.");
    const updated=b.map(x=>({...x}));
    for(let itemIndex=0;itemIndex<groups.length;itemIndex++){
      const group=Array.isArray(groups[itemIndex])?groups[itemIndex]:[];
      if(!group.length)throw new Error("Each item must have at least one photograph.");
      const photos=[];
      for(let i=0;i<group.length;i++){
        const file=group[i];const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";const path=`${session.user.id}/${reference}/item-${itemIndex+1}/${Date.now()}-${i}.${ext}`;
        const {error}=await window.actionBuyerAuth.supabase.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||"image/jpeg"});
        if(error)throw error;
        photos.push({path,name:file.name,type:file.type||"image/jpeg"});
      }
      updated[itemIndex].photos=photos;
    }
    return updated;
  }
  function recordFor(session,reference,items){
    const first=items[0]||{};
    return {category:first.category||"",categoryName:first.categoryName||"",manufacturer:first.manufacturer||null,manufacturerName:first.manufacturerName||"",model:first.model||null,modelName:first.modelName||"",package:first.package||null,packageName:first.packageName||"",condition:first.condition||null,quoteBasket:items,multiItemQuote:items.length>1,quoteItemCount:items.length,fullName:value("full-name"),email:value("email-address"),phone:value("phone-number"),addressLine1:value("address-line-1"),addressLine2:value("address-line-2"),city:value("city"),county:value("county"),postcode:value("postcode").toUpperCase(),legalRight:items.every(x=>x.legalRight==="yes")?"yes":(items.find(x=>x.legalRight)?.legalRight||""),quoteAmount:items.length===1&&items[0].valuation==="automatic"?Number(items[0].amount):null,submissionKey:submissionKey(),photosProvided:true,created:new Date().toISOString(),userId:session.user.id};
  }
  async function submit(){
    if(busy)return;busy=true;const button=document.querySelector('[data-step="13"] .btn-submit-valuation');if(button)button.disabled=true;
    try{
      const session=await window.actionBuyerAuth.getSession();
      if(!session){saveResume();window.location.href="login.html?return=quote.html";return;}
      if(!value("full-name")){alert("Please enter your full name.");return;}if(!value("email-address")){alert("Please enter your email address.");return;}if(!value("phone-number")){alert("Please enter your telephone number.");return;}
      const items=basket();if(!items.length){alert("Please add at least one item to your quote.");return;}
      const reference="WBA-"+new Date().getFullYear()+"-"+Math.floor(100000+Math.random()*900000);
      const uploaded=await uploadAll(session,reference);const record=recordFor(session,reference,uploaded);
      const {data,error}=await window.actionBuyerAuth.supabase.rpc("save_customer_valuation",{p_record:record,p_items:uploaded});
      if(error)throw error;
      const actualReference=data?.quote_reference||reference;
      try{localStorage.setItem("wba_latest_quote",JSON.stringify({...record,quoteReference:actualReference,valuationId:data?.valuation_id||null}));localStorage.removeItem("gearCashOutQuoteBasket");localStorage.removeItem(keyName);clearResume();}catch(_){}
      if(Array.isArray(window.__gcoMultiItemFiles))window.__gcoMultiItemFiles.length=0;
      showSubmitted(actualReference);
    }catch(error){console.error("GearCashOut quote submission failed",error);alert(error?.message||"The quote could not be submitted. Please try again.");}
    finally{busy=false;if(button)button.disabled=false;}
  }
  form.addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;const step=b.closest(".wizard-step");if(!step||Number(step.dataset.step)!==13||!b.classList.contains("btn-submit-valuation"))return;e.preventDefault();e.stopImmediatePropagation();submit();},true);
  try{
    const saved=JSON.parse(localStorage.getItem("gearCashOutQuoteResume")||"null");
    if(saved&&Array.isArray(saved.quoteBasket)&&saved.quoteBasket.length){window.gearCashOutReverseBasket.writeBasket(saved.quoteBasket);window.setTimeout(()=>{const note=document.getElementById("resume-note");if(note){note.hidden=false;note.textContent=`Your ${saved.quoteBasket.length} saved item${saved.quoteBasket.length===1?" has":"s have"} been restored. Please re-upload photographs before submitting.`;}},250);}
  }catch(_){}
});
