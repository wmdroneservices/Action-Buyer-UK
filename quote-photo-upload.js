/* Stores customer photographs in private Supabase Storage and submits one valuation containing multiple quote items. */
(function(){
  "use strict";
  const BUCKET="quote-photos";
  let busy=false;
  const clean=v=>String(v||"").trim();
  const checked=name=>document.querySelector(`input[name="${name}"]:checked`)?.value||"";
  const selectedText=id=>{const el=document.getElementById(id);return el?.selectedIndex>=0?el.options[el.selectedIndex].textContent.trim():""};
  function basket(){try{if(typeof window.gearCashOutGetMultiItemBasket==='function'){const b=window.gearCashOutGetMultiItemBasket();if(Array.isArray(b)&&b.length)return b}const raw=localStorage.getItem("gearCashOutQuoteBasket");const b=raw?JSON.parse(raw):[];return Array.isArray(b)?b:[]}catch(_){return[]}}
  function fileGroups(){try{if(typeof window.gearCashOutGetMultiItemFiles==='function'){const groups=window.gearCashOutGetMultiItemFiles();if(Array.isArray(groups))return groups.map(g=>Array.isArray(g)?g:[])}const files=Array.from(document.getElementById("photo-uploads")?.files||[]);return files.length?[files]:[]}catch(_){return[]}}
  function quoteRecord(userId,photoData,reference,items){
    const title=document.getElementById("quote-result-title")?.textContent||"",manual=/manual valuation|manual validation/i.test(title),value=id=>clean(document.getElementById(id)?.value),category=document.getElementById("gear-category"),manufacturer=document.getElementById("gear-manufacturer"),model=document.getElementById("dji-model"),packageSelect=document.getElementById("package-select"),equipmentSerialStatus=document.getElementById("equipment-serial-status")?.value||"available",controllerSerialStatus=document.getElementById("controller-serial-status")?.value||"not-applicable";
    const amount=items.length>1?null:(manual?null:(()=>{const m=String(document.querySelector("#quote-summary .quote-price")?.textContent||"").replace(/,/g,"").match(/£\s*([0-9]+(?:\.[0-9]+)?)/);return m?Number(m[1]):null})());
    const itemPhotos=photoData.byItem||[];
    const itemRecords=items.map((item,index)=>({...item,photos:itemPhotos[index]||[]}));
    return{user_id:userId,quote_reference:reference,status:items.length>1?"manual_review":(manual?"manual_review":"valued"),manufacturer:manufacturer?.value||null,model:model?.value||null,package:packageSelect?.value||null,condition:checked("condition"),quote_amount:amount,quote_data:{category:category?.value||"",categoryName:selectedText("gear-category"),manufacturer:manufacturer?.value||"",manufacturerName:selectedText("gear-manufacturer"),model:model?.value||"",modelName:selectedText("dji-model"),package:packageSelect?.value||"",packageName:selectedText("package-select"),condition:checked("condition"),flightHours:value("flight-hours"),flightHoursRange:checked("flightHoursRange"),batteries:Array.from(document.querySelectorAll(".battery-entry")).map(row=>({type:clean(row.querySelector(".battery-type")?.value),cycles:Number(row.querySelector(".battery-cycles")?.value||0)})),unbound:checked("unbound"),damage:checked("damage"),damageDescription:value("damage-description"),packageContents:Object.fromEntries(Array.from(document.querySelectorAll(".package-content-select,.generic-content-select")).map(el=>[el.dataset.contentId||el.id,el.value])),additionalAccessories:[],droneSerial:equipmentSerialStatus==="available"?value("drone-serial-number"):"",droneSerialStatus:equipmentSerialStatus,controllerSerial:controllerSerialStatus==="available"?value("controller-serial-number"):"",controllerSerialStatus:controllerSerialStatus,photos:photoData.all||[],itemPhotos:itemPhotos,legalRight:checked("legalRight"),fullName:value("full-name"),email:value("email-address"),phone:value("phone-number"),addressLine1:value("address-line-1"),addressLine2:value("address-line-2"),city:value("city"),county:value("county"),postcode:value("postcode").toUpperCase(),quoteAmount:amount,quoteReference:reference,quoteBasket:itemRecords,multiItemQuote:items.length>1,photosProvided:(photoData.all||[]).length>0,resumedAfterLogin:false,created:new Date().toISOString()},item_records:itemRecords};
  }
  async function uploadPhotos(userId,reference){
    const groups=fileGroups();if(!groups.length)return{all:[],byItem:[]};
    const all=[],byItem=[];
    for(let itemIndex=0;itemIndex<groups.length;itemIndex++){
      const group=groups[itemIndex]||[],itemUploaded=[];
      for(let i=0;i<group.length;i++){
        const file=group[i],ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg",path=`${userId}/${reference}/item-${itemIndex+1}/${Date.now()}-${i}.${ext}`;
        const result=await window.actionBuyerAuth.supabase.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||"image/jpeg"});
        if(result.error)throw result.error;
        const photo={path,name:file.name,type:file.type||"image/jpeg"};itemUploaded.push(photo);all.push({...photo,itemIndex});
      }
      byItem.push(itemUploaded);
    }
    return{all,byItem};
  }
  async function syncItems(valuationId,items){if(!valuationId||!items.length)return;const{error}=await window.actionBuyerAuth.supabase.rpc("sync_valuation_quote_items",{p_valuation_id:valuationId,p_items:items});if(error)throw error}
  function showSubmitted(record){document.querySelectorAll('#quote-form .wizard-step').forEach(step=>{step.hidden=Number(step.dataset.step)!==14});const heading=document.querySelector('#quote-form .wizard-step[data-step="14"] h3');if(heading)heading.textContent="Quote Submitted";const ref=document.getElementById("quote-reference");if(ref)ref.textContent=record.quote_reference;const nav=document.querySelector('#quote-form .wizard-step[data-step="14"] .navigation-buttons');if(nav)nav.innerHTML='<a class="btn" href="account.html">RETURN TO MY ACCOUNT</a>'}
  async function submitAuthenticatedQuote(){
    const auth=window.actionBuyerAuth,session=await auth.getSession();if(!session)return;
    for(const[id,error]of[["full-name","Please enter your full name."],["email-address","Please enter your email address."],["phone-number","Please enter your telephone number."]])if(!clean(document.getElementById(id)?.value)){alert(error);return}
    const items=basket();if(!items.length)items.push({itemName:selectedText("dji-model")||"Equipment item",manufacturer:document.getElementById("gear-manufacturer")?.value||"",manufacturerName:selectedText("gear-manufacturer"),model:document.getElementById("dji-model")?.value||"",modelName:selectedText("dji-model"),package:document.getElementById("package-select")?.value||"",packageName:selectedText("package-select")});
    busy=true;const button=document.querySelector('#quote-form .wizard-step[data-step="13"] .btn-next');if(button)button.disabled=true;
    try{const reference="WBA-"+new Date().getFullYear()+"-"+Math.floor(100000+Math.random()*900000),photoData=await uploadPhotos(session.user.id,reference),record=quoteRecord(session.user.id,photoData,reference,items),itemRecords=record.item_records;delete record.item_records;const saved=await auth.supabase.from("valuations").upsert(record,{onConflict:"quote_reference"});if(saved.error)throw saved.error;const{data:valuation,error:valuationError}=await auth.supabase.from("valuations").select("id").eq("quote_reference",reference).maybeSingle();if(valuationError||!valuation)throw valuationError||new Error("Could not locate submitted quote.");await syncItems(valuation.id,itemRecords);try{localStorage.setItem("wba_latest_quote",JSON.stringify(record.quote_data));localStorage.removeItem("gearCashOutQuoteBasket")}catch(_){}if(Array.isArray(window.__gcoMultiItemFiles))window.__gcoMultiItemFiles=[];showSubmitted(record)}catch(error){console.error("Could not submit batched quote:",error);alert(error?.message||"The quote could not be submitted. Please try again.")}finally{busy=false;if(button)button.disabled=false}
  }
  document.addEventListener("click",async event=>{const button=event.target.closest('#quote-form .wizard-step[data-step="13"] .btn-next');if(!button||busy)return;let resume=null;try{resume=JSON.parse(localStorage.getItem("gearCashOutQuoteResume")||"null")}catch(_){}if(resume)return;const session=await window.actionBuyerAuth?.getSession?.();if(!session)return;event.preventDefault();event.stopImmediatePropagation();await submitAuthenticatedQuote()},true);
})();
