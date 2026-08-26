/* GearCashOut: v5 single combined valuation submission path. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const auth = window.actionBuyerAuth;
  if (!form || !auth) return;
  const basket = () => window.gearCashOutReverseBasket?.readBasket?.() || [];
  const filesStore = () => window.gearCashOutReverseBasket?.filesStore?.() || [];
  const value = id => String(document.getElementById(id)?.value || "").trim();
  let busy = false;

  function baseRecord(items) {
    const first = items[0] || {};
    return {
      category:items.length === 1 ? (first.category || "") : "",
      categoryName:items.length === 1 ? (first.categoryName || "") : "",
      manufacturer:items.length === 1 ? (first.manufacturer || null) : null,
      model:items.length === 1 ? (first.model || null) : null,
      package:items.length === 1 ? (first.package || null) : null,
      condition:items.length === 1 ? (first.condition || null) : null,
      quoteBasket:items,
      multiItemQuote:items.length > 1,
      quoteItemCount:items.length,
      fullName:value("full-name"),
      email:value("email-address"),
      phone:value("phone-number"),
      addressLine1:value("address-line-1"),
      addressLine2:value("address-line-2"),
      city:value("city"),
      county:value("county"),
      postcode:value("postcode").toUpperCase(),
      legalRight:items.length === 1 ? (first.legalRight || "") : "",
      quoteAmount:null,
      created:new Date().toISOString(),
      userId:null
    };
  }

  function safeFileName(name) {
    return String(name || "photo.jpg")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "photo.jpg";
  }

  function isValidImageFile(file) {
    if (!file) return false;
    const name = String(file.name || "").toLowerCase();
    const allowed = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name);
    return String(file.type || "").toLowerCase().startsWith("image/") && allowed;
  }

  async function uploadPhotos(userId, reference, files) {
    const photos = [];
    for (const file of Array.isArray(files) ? files : []) {
      if (!file) continue;
      if (!isValidImageFile(file)) {
        throw new Error(`"${file.name || "Selected file"}" is not a photograph. Please select a JPG, PNG, WEBP, GIF, BMP or HEIC/HEIF image.`);
      }
      const path = `${userId}/${reference}/${crypto.randomUUID ? crypto.randomUUID() : Date.now()}-${safeFileName(file.name)}`;
      const { error } = await auth.supabase.storage.from("quote-photos").upload(path, file, { contentType:file.type, upsert:false });
      if (error) throw error;
      photos.push({ path, name:file.name || "Customer photograph", type:file.type });
    }
    return photos;
  }

  async function submit(){
    if(busy)return;
    busy=true;
    try{
      const session=await auth.getSession();
      if(!session)return;
      const items=basket();
      if(!items.length){alert("Please add at least one item to your quote.");return;}
      const storedFiles=filesStore();
      const submissionKey=crypto.randomUUID ? crypto.randomUUID() : `submission-${Date.now()}`;
      const submittedItems=[];

      for(let index=0;index<items.length;index++){
        const item=items[index];
        const files=storedFiles[index] || [];
        if(!files.length || files.some(file=>!isValidImageFile(file))){
          const bad=files.find(file=>!isValidImageFile(file));
          throw new Error(bad ? `"${bad.name || "Selected file"}" is not a photograph. Please go back and select an actual image file.` : "Please add at least one actual photograph.");
        }
        const reference=`WBA-${new Date().getFullYear()}-${Math.floor(100000+Math.random()*900000)}`;
        const photos=await uploadPhotos(session.user.id,reference,files);
        submittedItems.push({...item,photos});
      }

      const record=baseRecord(submittedItems);
      record.userId=session.user.id;
      record.submissionKey=submissionKey;
      record.multiItemQuote=submittedItems.length>1;
      record.quoteItemCount=submittedItems.length;

      const {data,error}=await auth.supabase.rpc("create_customer_quotes",{p_record:record,p_items:submittedItems});
      if(error)throw error;

      const reference=data?.quote_reference || data?.quotes?.[0]?.quote_reference || "";
      localStorage.setItem("wba_latest_quote",JSON.stringify({quoteReferences:reference ? [reference] : []}));
      localStorage.removeItem("gearCashOutQuoteBasket");
      const ref=document.getElementById("quote-reference");
      if(ref)ref.textContent=reference;
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