/* GearCashOut: database-driven reverse shopping basket. */
document.addEventListener("DOMContentLoaded", async function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const progress = document.getElementById("progress-indicator");
  const auth = window.actionBuyerAuth;
  if (!form || !progress || !auth) return;

  const basketKey = "gearCashOutQuoteBasket";
  const el = id => document.getElementById(id);
  const clean = value => String(value ?? "").trim();
  const checked = name => document.querySelector(`input[name="${name}"]:checked`)?.value || "";
  const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const money = value => new Intl.NumberFormat("en-GB", {style:"currency", currency:"GBP"}).format(Number(value));

  let catalog = [];
  let item = {};
  let currentStep = 1;
  let packageOptions = [];

  function readBasket() {
    try { const value = JSON.parse(localStorage.getItem(basketKey) || "[]"); return Array.isArray(value) ? value : []; }
    catch (_) { return []; }
  }
  function writeBasket(value) { localStorage.setItem(basketKey, JSON.stringify(value)); }
  function filesStore() {
    if (!Array.isArray(window.__gcoMultiItemFiles)) window.__gcoMultiItemFiles = [];
    return window.__gcoMultiItemFiles;
  }
  window.gearCashOutReverseBasket = { readBasket, writeBasket, filesStore };
  window.gearCashOutGetMultiItemBasket = readBasket;
  window.gearCashOutGetMultiItemFiles = filesStore;

  // Factory-sealed items still require the evidence/ownership stage, but do not
  // need the normal missing-items/exception questionnaire. The customer can
  // therefore go directly from Condition to Photos & ownership.
  function isFactorySealed() {
    return checked("condition") === "factory-sealed";
  }
  function flow() {
    const steps = packageOptions.length > 1 ? [1,2,3,4,5,6,7,8,9,10] : [1,2,3,5,6,7,8,9,10];
    return isFactorySealed() ? steps.filter(step => step !== 6) : steps;
  }
  function progressLabels() {
    const labels = {1:"Category",2:"Manufacturer",3:"Model",4:"Package",5:"Condition",6:"Exceptions",7:"Photos",8:"Your Quote",9:"Customer Details",10:"Submitted"};
    const steps = flow();
    progress.innerHTML = steps.map((step, index) => `<li class="progress-step${step === currentStep ? " active" : ""}">${index + 1}. ${labels[step]}</li>`).join("");
  }
  function show(step) {
    currentStep = step;
    form.querySelectorAll(".wizard-step").forEach(section => section.hidden = Number(section.dataset.step) !== step);
    progressLabels();
    window.scrollTo({top:0, behavior:"smooth"});
  }
  function nextStep() {
    const steps = flow();
    const index = steps.indexOf(currentStep);
    if (index >= 0 && index < steps.length - 1) show(steps[index + 1]);
  }
  function previousStep() {
    const steps = flow();
    const index = steps.indexOf(currentStep);
    if (index > 0) show(steps[index - 1]);
  }
  function setSelect(select, options, placeholder) {
    select.innerHTML = `<option value="">${esc(placeholder)}</option>`;
    options.forEach(option => {
      const node = document.createElement("option");
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    });
    select.disabled = options.length === 0;
  }
  function categories() {
    return [...new Set(catalog.map(p => p.category))].sort().map(value => ({value, label:value.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase())}));
  }
  function manufacturers() {
    return [...new Set(catalog.filter(p => p.category === item.category).map(p => p.manufacturer))].sort().map(value => ({value,label:value}));
  }
  function models() {
    return [...new Map(catalog.filter(p => p.category === item.category && p.manufacturer === item.manufacturer).map(p => [p.model,{value:p.model,label:p.model}])).values()].sort((a,b)=>a.label.localeCompare(b.label));
  }
  function packages() {
    return catalog.filter(p => p.category === item.category && p.manufacturer === item.manufacturer && p.model === item.model).map(p => ({value:p.package_key,label:p.package_name}));
  }
  function validateStep(step) {
    if (step === 1 && !item.category) { alert("Please select a category."); return false; }
    if (step === 2 && !item.manufacturer) { alert("Please select a manufacturer."); return false; }
    if (step === 3 && !item.model) { alert("Please select a model."); return false; }
    if (step === 4 && !item.package) { alert("Please select a package."); return false; }
    if (step === 5 && !checked("condition")) { alert("Please select the condition."); return false; }
    if (step === 6 && !checked("missingItems")) { alert("Please tell us whether anything is missing."); return false; }
    if (step === 7) {
      const photos = el("photo-uploads")?.files;
      if (!photos || !photos.length) { alert("Please upload at least one photograph."); return false; }
      if (checked("legalRight") !== "yes") { alert("You must confirm that you have the legal right to sell this equipment."); return false; }

      // DJI drones and DJI controllers must have a serial number recorded.
      const category = clean(item.category).toLowerCase();
      const manufacturer = clean(item.manufacturer).toLowerCase();
      const requiresDjiSerial = manufacturer === "dji" && (category === "drone" || category === "controller");
      if (requiresDjiSerial && !clean(el("drone-serial-number")?.value)) {
        alert("Please enter the DJI serial number before continuing.");
        return false;
      }
    }
    return true;
  }
  async function lookup() {
    const {data,error} = await auth.supabase.rpc("lookup_quote_catalog_price", {
      p_category:item.category,
      p_manufacturer:item.manufacturer,
      p_model:item.model,
      p_package_key:item.package || "standard",
      p_condition:item.condition,
      p_missing_items:checked("missingItems") === "yes",
      p_damaged:item.condition === "damaged" || item.condition === "not-working"
    });
    if (error) throw error;
    return data || {route:"manual",reason:"product_not_priced",price:null};
  }
  async function addCurrentItem() {
    const result = await lookup();
    const photos = Array.from(el("photo-uploads")?.files || []);
    const entry = {
      category:item.category,
      categoryName:item.categoryName,
      manufacturer:item.manufacturer,
      manufacturerName:item.manufacturerName,
      model:item.model,
      modelName:item.modelName,
      package:item.package || "standard",
      packageName:item.packageName || "Standard Package",
      condition:item.condition,
      missingItems:checked("missingItems") === "yes",
      exceptionNotes:clean(el("exception-notes")?.value),
      damage:item.condition === "damaged" || item.condition === "not-working",
      legalRight:checked("legalRight"),
      serialNumber:clean(el("drone-serial-number")?.value),
      valuation:result.route === "automatic" ? "automatic" : "manual",
      amount:result.route === "automatic" ? Number(result.price) : null,
      valuationReason:result.reason || (result.route === "automatic" ? null : "product_not_priced"),
      catalogProductId:result.product_id || null,
      addedAt:new Date().toISOString()
    };
    const basket = readBasket();
    basket.push(entry);
    writeBasket(basket);
    filesStore().push(photos);
    renderBasket();
    show(8);
  }
  function resetItem() {
    item={};
    packageOptions=[];
    el("gear-category").value="";
    el("gear-manufacturer").innerHTML='<option value="">-- Select manufacturer --</option>';
    el("dji-model").innerHTML='<option value="">-- Select model --</option>';
    el("package-select").innerHTML='<option value="">-- Select package --</option>';
    el("package-select").disabled=true;
    form.querySelectorAll('input[name="condition"],input[name="missingItems"],input[name="legalRight"]').forEach(input=>input.checked=false);
    el("exception-notes").value="";
    el("drone-serial-number").value="";
    el("photo-uploads").value="";
  }
  function renderBasket() {
    const basket=readBasket();
    const target=el("basket-summary");
    if(!target)return;
    if(!basket.length){target.innerHTML="<p>Your quote is empty. Add an item to begin.</p>";return;}
    const total=basket.reduce((sum,x)=>sum+(x.valuation==="automatic"?Number(x.amount||0):0),0);
    target.innerHTML=`<div class="quote-basket">${basket.map((x,i)=>`<article class="notice"><strong>${esc(x.manufacturerName)} ${esc(x.modelName)}</strong><br><span>${esc(x.packageName)} · ${esc(x.condition)}</span><br>${x.valuation==="automatic"?`<strong>${money(x.amount)}</strong> <span>automatic valuation</span>`:`<strong>Manual valuation</strong><span> — ${esc(x.valuationReason === "missing_items" ? "missing items" : x.valuationReason === "condition_requires_manual" ? "condition requires manual review" : "no database price yet")}</span>`}<br><button type="button" class="btn btn-remove-item" data-index="${i}">Remove</button></article>`).join("")}<p><strong>Automatic total: ${money(total)}</strong>${basket.some(x=>x.valuation==="manual")?"<br>One or more items require manual review.":""}</p></div>`;
  }

  try {
    const {data,error}=await auth.supabase.from("quote_catalog_products")
      .select("id,category,manufacturer,model,package_key,package_name,factory_sealed_price,opened_unused_price,excellent_price,good_price,fair_price")
      .eq("active",true).order("manufacturer").order("model");
    if(error)throw error;
    catalog=data||[];
  } catch(error) {
    console.error("GearCashOut catalogue load failed",error);
    alert("We could not load the equipment catalogue. Please refresh and try again.");
    return;
  }

  setSelect(el("gear-category"),categories(),"-- Select category --");
  renderBasket();
  progressLabels();

  el("gear-category").addEventListener("change",function(){
    item={category:this.value,categoryName:this.options[this.selectedIndex]?.textContent||""};
    setSelect(el("gear-manufacturer"),manufacturers(),"-- Select manufacturer --");
    setSelect(el("dji-model"),[],"-- Select model --");
    setSelect(el("package-select"),[],"-- Select package --");
  });
  el("gear-manufacturer").addEventListener("change",function(){
    item.manufacturer=this.value;
    item.manufacturerName=this.value;
    setSelect(el("dji-model"),models(),"-- Select model --");
  });
  el("dji-model").addEventListener("change",function(){
    item.model=this.value;
    item.modelName=this.options[this.selectedIndex]?.textContent||this.value;
    packageOptions=packages();
    setSelect(el("package-select"),packageOptions,"-- Select package --");
    el("package-help").textContent=packageOptions.length>1?"Select the package you actually have.":(packageOptions[0]?.label||"");
    if(packageOptions.length===1){item.package=packageOptions[0].value;item.packageName=packageOptions[0].label;}
    progressLabels();
  });
  el("package-select").addEventListener("change",function(){
    item.package=this.value;
    item.packageName=this.options[this.selectedIndex]?.textContent||this.value;
  });

  // Rebuild the progress flow immediately when the customer selects a
  // condition, so Factory Sealed visibly skips the Exceptions step.
  form.querySelectorAll('input[name="condition"]').forEach(input => {
    input.addEventListener("change", function () {
      if (isFactorySealed()) {
        form.querySelectorAll('input[name="missingItems"]').forEach(control => control.checked = false);
        el("exception-notes").value = "";
      }
      progressLabels();
    });
  });

  form.addEventListener("click",async function(event){
    const button=event.target.closest("button");
    if(!button)return;
    const section=button.closest(".wizard-step");
    if(!section)return;
    const step=Number(section.dataset.step);
    if(button.classList.contains("btn-back")){event.preventDefault();previousStep();return;}
    if(button.classList.contains("btn-next")){
      event.preventDefault();
      if(!validateStep(step))return;
      if(step===7){try{await addCurrentItem();}catch(error){console.error(error);alert(error?.message||"We could not add this item. Please try again.");}return;}
      if(step===8){show(9);return;}
      if(step===9){return;}
      nextStep();
      return;
    }
    if(button.classList.contains("btn-add-another")){event.preventDefault();resetItem();show(1);return;}
    if(button.classList.contains("btn-remove-item")){
      event.preventDefault();
      const index=Number(button.dataset.index);
      const basket=readBasket();
      basket.splice(index,1);
      writeBasket(basket);
      filesStore().splice(index,1);
      renderBasket();
    }
  });

  if(readBasket().length)show(8);else show(1);
});
