(function(){
  "use strict";
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const dateTime=v=>v?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"Not recorded";
  const param=()=>new URLSearchParams(location.search).get("id");
  const text=v=>v===null||v===undefined||String(v).trim()===""?"Not provided":String(v);
  const title=item=>[item.manufacturer,item.model||item.item_name].filter(Boolean).join(" ")||item.item_name||"Equipment";
  const field=(label,value)=>`<div><strong>${esc(label)}</strong><br><span>${esc(text(value))}</span></div>`;

  async function signedPhotoUrls(db,paths){
    const valid=(paths||[]).filter(Boolean);
    const out=[];
    for(const path of valid){
      const {data,error}=await db.storage.from("quote-photos").createSignedUrl(path,3600);
      if(!error&&data?.signedUrl)out.push({path,url:data.signedUrl});
    }
    return out;
  }

  async function load(){
    const id=param(),box=document.getElementById("customer-valuation-view");
    if(!id){box.innerHTML='<div class="notice error">No valuation was selected.</div>';return;}
    while(!window.actionBuyerAuth)await sleep(100);
    const auth=window.actionBuyerAuth,session=await auth.getSession();
    if(!session?.user?.id){location.href="login.html";return;}
    const {data:staffRow}=await auth.supabase.from("staff_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
    if(staffRow){location.href="admin.html";return;}

    const {data:valuation,error}=await auth.supabase.from("valuations")
      .select("id,quote_reference,status,submitted_at,manufacturer,model,package,condition,quote_data")
      .eq("id",id).eq("user_id",session.user.id).maybeSingle();
    if(error)throw error;
    if(!valuation){box.innerHTML='<div class="notice error">This valuation could not be found in your account.</div>';return;}

    const {data:items,error:itemError}=await auth.supabase.from("quote_items")
      .select("id,item_name,manufacturer,model,package,item_position,item_data")
      .eq("valuation_id",valuation.id).order("item_position",{ascending:true});
    if(itemError)throw itemError;

    const cards=[];
    for(const item of items||[]){
      const data=item.item_data||{};
      const photos=await signedPhotoUrls(auth.supabase,(data.photos||[]).map(p=>typeof p==="string"?p:p?.path));
      const photoHtml=photos.length
        ?`<div class="valuation-photo-grid">${photos.map((p,index)=>`<a href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.url)}" alt="Submitted photograph ${index+1}"></a>`).join("")}</div>`
        :"<p>No submitted photographs are available to display.</p>";
      const details=[
        field("Manufacturer",item.manufacturer||data.manufacturerName||data.manufacturer),
        field("Model",item.model||data.modelName||data.model||item.item_name),
        field("Package",item.package||data.packageName||data.package),
        field("Category",data.categoryName||data.productTypeName||data.category),
        field("Condition you declared",data.condition||valuation.condition),
        field("Missing items",data.missingItems===true?"Yes":data.missingItems===false?"No":null),
        field("Serial number",data.serialNumber),
        field("Exceptions / notes",data.exceptionNotes)
      ].join("");
      cards.push(`<article class="valuation-card customer-submission-card"><div class="submission-item-header"><div><span class="valuation-ref">ITEM ${esc(item.item_position||cards.length+1)}</span><p class="section-kicker">YOUR ORIGINAL SUBMISSION</p><h2>${esc(title(item))}</h2></div><span class="status-badge">READ ONLY</span></div><div class="valuation-details-grid">${details}</div><h3>Photographs you sent</h3>${photoHtml}</article>`);
    }

    box.innerHTML=`<section class="account-panel"><div class="section-heading"><p class="section-kicker">YOUR ORIGINAL VALUATION</p><h1>${esc(valuation.quote_reference||"Valuation")}</h1><p>This is a read-only record of what you submitted to GearCashOut. It does not change as the item moves through inspection or the purchase process.</p></div><div class="valuation-card"><div class="valuation-details-grid">${field("Submitted",dateTime(valuation.submitted_at))}${field("Items submitted",(items||[]).length)}</div></div>${cards.join("")}<div class="navigation-buttons"><a class="btn btn-secondary" href="account.html">BACK TO MY ACCOUNT</a></div></section>`;
  }

  document.addEventListener("DOMContentLoaded",()=>load().catch(error=>{
    console.error("Customer valuation view:",error);
    const box=document.getElementById("customer-valuation-view");
    if(box)box.innerHTML=`<div class="notice error">${esc(error?.message||"The valuation could not be loaded.")}</div>`;
  }),{once:true});
})();