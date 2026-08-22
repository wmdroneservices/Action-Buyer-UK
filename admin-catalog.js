document.addEventListener("DOMContentLoaded", async () => {
  const auth=window.actionBuyerAuth; const session=await auth.getSession();
  if(!session){location.href="login.html?return=admin-catalog.html";return;}
  const {data:staff}=await auth.supabase.from("staff_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(!staff){document.body.innerHTML='<main class="account-page"><div class="container"><h1>Staff access required</h1></div></main>';return;}
  const form=document.getElementById("catalog-form"), list=document.getElementById("catalog-list"), msg=document.getElementById("catalog-message"), search=document.getElementById("search"), retailerBody=document.getElementById("retailer-prices-body");
  let rows=[]; let retailerRows=[];
  const identityFields=["category","manufacturer","model","package-key","package-name"];
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const money=v=>v==null?"—":new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(v));
  const setMsg=(t,ok=true)=>{msg.textContent=t;msg.className="form-message "+(ok?"success":"error");};
  const num=id=>{const v=document.getElementById(id).value.trim();return v===""?null:Number(v);};
  const retailerNum=v=>{const n=String(v??"").trim();return n===""?null:Number(n);};

  function setIdentityEditMode(editable){
    identityFields.forEach(id=>{
      const el=document.getElementById(id);
      el.readOnly=!editable;
      el.classList.toggle("catalog-identity-locked",!editable);
    });
    const toggle=document.getElementById("edit-product-details");
    if(toggle){toggle.textContent=editable?"LOCK PRODUCT DETAILS":"EDIT PRODUCT DETAILS";toggle.setAttribute("aria-pressed",String(editable));}
  }

  function addRetailerRow(r={}){
    const tr=document.createElement("tr");
    tr.innerHTML=`<td><input data-field="retailer" value="${esc(r.retailer||"")}" placeholder="CeX" style="width:120px"></td><td><input data-field="condition" value="${esc(r.condition||"")}" placeholder="Excellent" style="width:120px"></td><td><input data-field="buy_price" type="number" min="0" step="0.01" value="${r.buy_price??""}" style="width:100px"></td><td><input data-field="sell_price" type="number" min="0" step="0.01" value="${r.sell_price??""}" style="width:100px"></td><td><input data-field="buy_method" value="${esc(r.buy_method||"")}" placeholder="Cash / Exchange" style="width:130px"></td><td><input data-field="source_url" type="url" value="${esc(r.source_url||"")}" placeholder="https://..." style="width:190px"></td><td><button type="button" class="btn btn-secondary remove-retailer-price">REMOVE</button></td>`;
    tr.querySelector(".remove-retailer-price").onclick=()=>tr.remove();
    retailerBody.appendChild(tr);
  }

  function retailerPayload(){
    return [...retailerBody.querySelectorAll("tr")].map(tr=>{const get=f=>tr.querySelector(`[data-field="${f}"]`).value.trim();const retailer=get("retailer"),condition=get("condition");if(!retailer||!condition)return null;return {retailer,condition,buy_price:retailerNum(get("buy_price")),sell_price:retailerNum(get("sell_price")),buy_method:get("buy_method")||null,source_url:get("source_url")||null};}).filter(Boolean);
  }

  async function loadRetailerPrices(productId){
    retailerBody.innerHTML="";
    if(!productId)return;
    const {data,error}=await auth.supabase.from("quote_catalog_retailer_prices").select("id,retailer,condition,buy_price,sell_price,buy_method,source_url,notes,checked_at").eq("catalog_product_id",productId).order("retailer").order("condition");
    if(error){setMsg(error.message,false);return;}
    (data||[]).forEach(addRetailerRow);
  }

  async function saveRetailerPrices(productId){
    const entries=retailerPayload();
    const {error:delError}=await auth.supabase.from("quote_catalog_retailer_prices").delete().eq("catalog_product_id",productId);
    if(delError)throw delError;
    if(!entries.length)return;
    const payload=entries.map(r=>({...r,catalog_product_id:productId,checked_at:new Date().toISOString()}));
    const {error:insError}=await auth.supabase.from("quote_catalog_retailer_prices").insert(payload);
    if(insError)throw insError;
  }

  async function fill(r){
    document.getElementById("product-id").value=r.id;document.getElementById("category").value=r.category;document.getElementById("manufacturer").value=r.manufacturer;document.getElementById("model").value=r.model;document.getElementById("package-key").value=r.package_key;document.getElementById("package-name").value=r.package_name;document.getElementById("factory-sealed").value=r.factory_sealed_price??"";document.getElementById("opened-unused").value=r.opened_unused_price??"";document.getElementById("excellent").value=r.excellent_price??"";document.getElementById("good").value=r.good_price??"";document.getElementById("fair").value=r.fair_price??"";document.getElementById("active").checked=!!r.active;document.getElementById("notes").value=r.notes||"";setIdentityEditMode(false);await loadRetailerPrices(r.id);window.scrollTo({top:0,behavior:"smooth"});
  }
  function clear(){form.reset();document.getElementById("product-id").value="";document.getElementById("package-key").value="standard";document.getElementById("package-name").value="Standard Package";document.getElementById("active").checked=true;retailerBody.innerHTML="";setIdentityEditMode(true);}
  function retailerQuickLinks(productId){
    const matches=retailerRows.filter(r=>r.catalog_product_id===productId && r.source_url);
    if(!matches.length)return "";
    const seen=new Set();
    return matches.map(r=>{const key=String(r.retailer||"").trim();if(!key||seen.has(key))return "";seen.add(key);return `<a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="margin:.15rem 0">${esc(key)} ↗</a>`;}).join(" ");
  }
  function retailerSummary(productId){
    const matches=retailerRows.filter(r=>r.catalog_product_id===productId);
    if(!matches.length)return "No retailer data yet";
    const names=[...new Set(matches.map(r=>r.retailer).filter(Boolean))];
    return `${matches.length} comparison${matches.length===1?"":"s"} · ${names.map(esc).join(", ")}`;
  }
  function render(){const q=search.value.trim().toLowerCase();const data=rows.filter(r=>!q||[r.category,r.manufacturer,r.model,r.package_name].some(v=>String(v||"").toLowerCase().includes(q)));if(!data.length){list.innerHTML="<p>No catalogue products found.</p>";return;}list.innerHTML=data.map(r=>`<article class="valuation-card" style="margin:.75rem 0;"><div><span class="valuation-ref">${esc(r.manufacturer)} ${esc(r.model)}</span><p>${esc(r.category)} · ${esc(r.package_name)} ${r.active?"":"· INACTIVE"}</p><p>Sealed ${money(r.factory_sealed_price)} · Unused ${money(r.opened_unused_price)} · Excellent ${money(r.excellent_price)} · Good ${money(r.good_price)} · Fair ${money(r.fair_price)}</p><p style="font-size:.9rem">${retailerSummary(r.id)}</p>${retailerQuickLinks(r.id)?`<p>${retailerQuickLinks(r.id)}</p>`:""}</div><div><button class="btn btn-secondary edit" data-id="${r.id}" type="button">EDIT</button></div></article>`).join("");list.querySelectorAll(".edit").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.id);if(r)fill(r);});}
  async function load(){const {data,error}=await auth.supabase.from("quote_catalog_products").select("*").order("manufacturer").order("model").order("package_name");if(error){setMsg(error.message,false);return;}rows=data||[];const {data:retailers,error:retailerError}=await auth.supabase.from("quote_catalog_retailer_prices").select("catalog_product_id,retailer,condition,buy_price,sell_price,source_url,checked_at").order("retailer").order("condition");if(retailerError){setMsg(retailerError.message,false);retailerRows=[];}else retailerRows=retailers||[];render();}
  form.onsubmit=async e=>{e.preventDefault();const editing=Boolean(document.getElementById("product-id").value);if(!editing){for(const id of identityFields){const el=document.getElementById(id);if(!el.value.trim()){el.focus();setMsg(`Please enter ${el.previousSibling?.textContent||id}.`,false);return;}}}const payload={p_id:document.getElementById("product-id").value||null,p_category:document.getElementById("category").value,p_manufacturer:document.getElementById("manufacturer").value,p_model:document.getElementById("model").value,p_package_key:document.getElementById("package-key").value,p_package_name:document.getElementById("package-name").value,p_factory_sealed_price:num("factory-sealed"),p_opened_unused_price:num("opened-unused"),p_excellent_price:num("excellent"),p_good_price:num("good"),p_fair_price:num("fair"),p_active:document.getElementById("active").checked,p_notes:document.getElementById("notes").value};const {data,error}=await auth.supabase.rpc("staff_upsert_catalog_product",payload);if(error){setMsg(error.message,false);return;}const productId=payload.p_id||data?.id||data;if(!productId){setMsg("Product saved, but its ID could not be resolved for retailer data.",false);await load();return;}try{await saveRetailerPrices(productId);}catch(err){setMsg("Product saved, but retailer comparison data could not be saved: "+err.message,false);await load();return;}setMsg("Product and retailer comparison data saved.");clear();await load();};
  document.getElementById("clear-form").onclick=clear;document.getElementById("add-retailer-price").onclick=()=>addRetailerRow();const editDetails=document.getElementById("edit-product-details");if(editDetails)editDetails.onclick=()=>setIdentityEditMode(editDetails.getAttribute("aria-pressed")!=="true");search.oninput=render;setIdentityEditMode(true);await load();
});