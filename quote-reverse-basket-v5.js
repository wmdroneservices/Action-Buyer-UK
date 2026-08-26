/* GearCashOut: stable database-driven valuation wizard. */
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
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const money = value => new Intl.NumberFormat("en-GB", {style:"currency", currency:"GBP"}).format(Number(value || 0));

  let catalog = [];
  let item = {};
  let currentStep = 1;
  let packageOptions = [];
  let currentItemFiles = [];

  function readBasket() {
    try {
      const value = JSON.parse(localStorage.getItem(basketKey) || "[]");
      return Array.isArray(value) ? value.filter(x => x && typeof x === "object") : [];
    } catch (_) { return []; }
  }
  function writeBasket(value) {
    try { localStorage.setItem(basketKey, JSON.stringify(Array.isArray(value) ? value : [])); } catch (_) {}
  }
  function filesStore() {
    if (!Array.isArray(window.__gcoMultiItemFiles)) window.__gcoMultiItemFiles = [];
    return window.__gcoMultiItemFiles;
  }
  window.gearCashOutReverseBasket = {readBasket, writeBasket, filesStore};
  window.gearCashOutGetMultiItemBasket = readBasket;
  window.gearCashOutGetMultiItemFiles = filesStore;
  window.gearCashOutResetForNewItem = resetItem;

  function renderPhotoList() {
    const target = el("photo-list");
    if (!target) return;
    if (!currentItemFiles.length) { target.textContent = "No photos added yet."; return; }
    target.innerHTML = `<strong>${currentItemFiles.length} photo${currentItemFiles.length === 1 ? "" : "s"} added</strong><ul>${currentItemFiles.map((file,i) => `<li>${esc(file.name)} <button type="button" class="btn btn-remove-photo" data-photo-index="${i}">Remove</button></li>`).join("")}</ul>`;
  }

  function isFactorySealed() { return checked("condition") === "factory-sealed"; }
  function flow() {
    const steps = packageOptions.length > 1 ? [1,2,3,4,5,6,7,8,9,10] : [1,2,3,5,6,7,8,9,10];
    return isFactorySealed() ? steps.filter(step => step !== 6) : steps;
  }
  function progressLabels() {
    const labels = {1:"Category",2:"Manufacturer",3:"Model",4:"Package",5:"Condition",6:"Exceptions",7:"Photos",8:"Your Quote",9:"Customer Details",10:"Submitted"};
    progress.innerHTML = flow().map((step,i) => `<li class="progress-step${step === currentStep ? " active" : ""}">${i+1}. ${labels[step]}</li>`).join("");
  }
  function show(step) {
    currentStep = step;
    form.querySelectorAll(".wizard-step").forEach(section => { section.hidden = Number(section.dataset.step) !== step; });
    progressLabels();
    window.scrollTo({top:0, behavior:"smooth"});
  }
  function nextStep() {
    const steps = flow(), i = steps.indexOf(currentStep);
    if (i >= 0 && i < steps.length - 1) show(steps[i+1]);
  }
  function previousStep() {
    const steps = flow(), i = steps.indexOf(currentStep);
    if (i > 0) show(steps[i-1]);
  }
  function setSelect(select, options, placeholder) {
    if (!select) return;
    select.innerHTML = `<option value="">${esc(placeholder)}</option>`;
    (options || []).forEach(option => {
      const node = document.createElement("option");
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    });
    select.disabled = !(options && options.length);
  }
  function categories() {
    return [...new Set(catalog.map(p => clean(p.category)).filter(Boolean))].sort().map(value => ({value,label:value.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase())}));
  }
  function manufacturers() {
    return [...new Set(catalog.filter(p => clean(p.category) === clean(item.category)).map(p => clean(p.manufacturer)).filter(Boolean))].sort().map(value => ({value,label:value}));
  }
  function models() {
    return [...new Set(catalog.filter(p => clean(p.category) === clean(item.category) && clean(p.manufacturer) === clean(item.manufacturer)).map(p => clean(p.model)).filter(Boolean))].sort((a,b)=>a.localeCompare(b)).map(value => ({value,label:value}));
  }
  function packages() {
    return catalog.filter(p => clean(p.category) === clean(item.category) && clean(p.manufacturer) === clean(item.manufacturer) && clean(p.model) === clean(item.model)).map(p => ({value:clean(p.package_key) || "standard",label:clean(p.package_name) || "Standard Package"}));
  }
  function validateStep(step) {
    if (step === 1 && !clean(item.category)) { alert("Please select a category."); return false; }
    if (step === 2 && !clean(item.manufacturer)) { alert("Please select a manufacturer."); return false; }
    if (step === 3 && !clean(item.model)) { alert("Please select a model."); return false; }
    if (step === 4 && !clean(item.package)) { alert("Please select a package."); return false; }
    if (step === 5 && !checked("condition")) { alert("Please select the condition."); return false; }
    if (step === 6 && !checked("missingItems")) { alert("Please tell us whether anything is missing."); return false; }
    if (step === 7) {
      if (!currentItemFiles.length) { alert("Please upload at least one photograph."); return false; }
      if (checked("legalRight") !== "yes") { alert("You must confirm that you have the legal right to sell this equipment."); return false; }
      const category = clean(item.category).toLowerCase();
      const manufacturer = clean(item.manufacturer).toLowerCase();
      if (manufacturer === "dji" && (category === "drone" || category === "controller") && !clean(el("drone-serial-number")?.value)) {
        alert("Please enter the DJI serial number before continuing."); return false;
      }
    }
    return true;
  }
  function findProduct() {
    const packageKey = clean(item.package) || "standard";
    return catalog.find(p => clean(p.category).toLowerCase() === clean(item.category).toLowerCase() && clean(p.manufacturer).toLowerCase() === clean(item.manufacturer).toLowerCase() && clean(p.model).toLowerCase() === clean(item.model).toLowerCase() && (clean(p.package_key) || "standard").toLowerCase() === packageKey.toLowerCase()) || null;
  }
  function valuation() {
    const product = findProduct();
    if (!product) return {route:"manual",reason:"product_not_found",product_id:null};
    if (checked("missingItems") === "yes") return {route:"manual",reason:"missing_items",product_id:product.id};
    if (item.condition === "damaged" || item.condition === "not-working") return {route:"manual",reason:"condition_requires_manual",product_id:product.id};
    const field = {"factory-sealed":"factory_sealed_price","opened-unused":"opened_unused_price","excellent":"excellent_price","good":"good_price","fair":"fair_price"}[item.condition];
    const price = field ? product[field] : null;
    if (price === null || price === undefined || price === "") return {route:"manual",reason:"product_not_priced",product_id:product.id};
    return {route:"automatic",reason:null,price:Number(price),product_id:product.id};
  }
  function renderBasket() {
    const target = el("basket-summary"), basket = readBasket();
    if (!target) return;
    if (!basket.length) { target.innerHTML = "<p>Your quote is empty. Add an item to begin.</p>"; return; }
    const total = basket.reduce((sum,x)=>sum + (x.valuation === "automatic" ? Number(x.amount || 0) : 0),0);
    target.innerHTML = `<div class="quote-basket">${basket.map((x,i)=>`<article class="notice"><strong>${esc(x.manufacturerName || x.manufacturer)} ${esc(x.modelName || x.model)}</strong><br><span>${esc(x.packageName || x.package)} · ${esc(x.condition)}</span><br>${x.valuation === "automatic" ? `<strong>${money(x.amount)}</strong> <span>automatic valuation</span>` : `<strong>Manual valuation</strong><span> — ${esc(x.valuationReason === "missing_items" ? "missing items" : x.valuationReason === "condition_requires_manual" ? "condition requires manual review" : x.valuationReason === "product_not_found" ? "product not found" : "no database price yet")}</span>`}<br><button type="button" class="btn btn-remove-item" data-index="${i}">Remove</button></article>`).join("")}<p><strong>Automatic total: ${money(total)}</strong>${basket.some(x=>x.valuation === "manual") ? "<br>One or more items require manual review." : ""}</p></div>`;
  }
  async function addCurrentItem() {
    const result = valuation();
    const entry = {
      category:item.category, categoryName:item.categoryName,
      manufacturer:item.manufacturer, manufacturerName:item.manufacturerName,
      model:item.model, modelName:item.modelName,
      package:item.package || "standard", packageName:item.packageName || "Standard Package",
      condition:item.condition, missingItems:checked("missingItems") === "yes",
      exceptionNotes:clean(el("exception-notes")?.value),
      damage:item.condition === "damaged" || item.condition === "not-working",
      legalRight:checked("legalRight"), serialNumber:clean(el("drone-serial-number")?.value),
      valuation:result.route, amount:result.route === "automatic" ? result.price : null,
      valuationReason:result.reason, catalogProductId:result.product_id, addedAt:new Date().toISOString()
    };
    const basket = readBasket();
    const duplicate = basket.some(x => clean(x.category).toLowerCase() === clean(entry.category).toLowerCase() && clean(x.manufacturer).toLowerCase() === clean(entry.manufacturer).toLowerCase() && clean(x.model).toLowerCase() === clean(entry.model).toLowerCase() && clean(x.package).toLowerCase() === clean(entry.package).toLowerCase());
    if (!duplicate) { basket.push(entry); filesStore().push([...currentItemFiles]); }
    writeBasket(basket);
    renderBasket();
    show(8);
  }
  function resetItem() {
    item = {}; packageOptions = []; currentItemFiles = [];
    ["gear-category","gear-manufacturer","dji-model","package-select"].forEach(id => { const node=el(id); if(node) node.value=""; });
    setSelect(el("gear-manufacturer"),[],"-- Select manufacturer --");
    setSelect(el("dji-model"),[],"-- Select model --");
    setSelect(el("package-select"),[],"-- Select package --");
    form.querySelectorAll('input[name="condition"],input[name="missingItems"],input[name="legalRight"]').forEach(input=>input.checked=false);
    if(el("exception-notes")) el("exception-notes").value="";
    if(el("drone-serial-number")) el("drone-serial-number").value="";
    if(el("photo-uploads")) el("photo-uploads").value="";
    renderPhotoList();
  }

  try {
    let all = [], from = 0, pageSize = 1000;
    while (true) {
      const {data,error} = await auth.supabase.from("quote_catalog_products").select("id,category,manufacturer,model,package_key,package_name,factory_sealed_price,opened_unused_price,excellent_price,good_price,fair_price").eq("active",true).range(from,from+pageSize-1).order("manufacturer").order("model");
      if (error) throw error;
      all.push(...(data || []));
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
    catalog = all;
  } catch (error) {
    console.error("GearCashOut catalogue load failed", error);
    alert("We could not load the equipment catalogue. Please refresh and try again.");
    return;
  }

  setSelect(el("gear-category"),categories(),"-- Select category --");
  renderBasket(); renderPhotoList(); progressLabels();

  el("gear-category")?.addEventListener("change", function(){
    item = {category:this.value, categoryName:this.options[this.selectedIndex]?.textContent || ""};
    packageOptions = [];
    setSelect(el("gear-manufacturer"),manufacturers(),"-- Select manufacturer --");
    setSelect(el("dji-model"),[],"-- Select model --");
    setSelect(el("package-select"),[],"-- Select package --");
    el("package-help").textContent = "";
  });
  el("gear-manufacturer")?.addEventListener("change", function(){
    item.manufacturer=this.value; item.manufacturerName=this.options[this.selectedIndex]?.textContent || this.value;
    packageOptions=[];
    setSelect(el("dji-model"),models(),"-- Select model --");
    setSelect(el("package-select"),[],"-- Select package --");
  });
  el("dji-model")?.addEventListener("change", function(){
    item.model=this.value; item.modelName=this.options[this.selectedIndex]?.textContent || this.value;
    packageOptions=packages();
    setSelect(el("package-select"),packageOptions,"-- Select package --");
    el("package-help").textContent = packageOptions.length > 1 ? "Select the package you actually have." : (packageOptions[0]?.label || "");
    if (packageOptions.length === 1) { item.package=packageOptions[0].value; item.packageName=packageOptions[0].label; }
    progressLabels();
  });
  el("package-select")?.addEventListener("change", function(){ item.package=this.value; item.packageName=this.options[this.selectedIndex]?.textContent || this.value; });
  el("photo-uploads")?.addEventListener("change", function(){ const selected=[...(this.files||[])]; if(selected.length) currentItemFiles.push(...selected); this.value=""; renderPhotoList(); });
  el("add-another-photo")?.addEventListener("click",()=>el("photo-uploads")?.click());
  form.querySelectorAll('input[name="condition"]').forEach(input=>input.addEventListener("change",function(){ item.condition=this.value; if(isFactorySealed()){form.querySelectorAll('input[name="missingItems"]').forEach(x=>x.checked=false); if(el("exception-notes"))el("exception-notes").value="";} progressLabels(); }));

  form.addEventListener("click", async function(event){
    const button=event.target.closest("button"), section=button?.closest(".wizard-step");
    if(!button || !section) return;
    const step=Number(section.dataset.step);
    if(button.classList.contains("btn-remove-photo")){event.preventDefault();currentItemFiles.splice(Number(button.dataset.photoIndex),1);renderPhotoList();return;}
    if(button.classList.contains("btn-remove-item")){event.preventDefault();const basket=readBasket(),i=Number(button.dataset.index);basket.splice(i,1);writeBasket(basket);filesStore().splice(i,1);renderBasket();return;}
    if(button.classList.contains("btn-back")){event.preventDefault();previousStep();return;}
    if(button.classList.contains("btn-add-another")){event.preventDefault();resetItem();show(1);return;}
    if(button.classList.contains("btn-next")){event.preventDefault();if(!validateStep(step))return;if(step===7){try{await addCurrentItem();}catch(error){console.error(error);alert(error?.message || "We could not add this item. Please try again.");}return;}if(step===8){show(9);return;}if(step===9)return;nextStep();}
  });

  if (readBasket().length) show(8); else show(1);
});
