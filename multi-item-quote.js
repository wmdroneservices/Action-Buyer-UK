/* GearCashOut multi-item quote basket. */
(function () {
  "use strict";
  const KEY = "gearCashOutQuoteBasket";
  let basket = [];
  let currentCommitted = false;
  let resetting = false;
  let renderTimer = null;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const step = n => $(`#quote-form .wizard-step[data-step="${n}"]`);

  function escapeHtml(v) { return String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
  function money(v) { return new Intl.NumberFormat("en-GB", {style:"currency", currency:"GBP"}).format(Number(v)||0); }
  function readBasket() { try { const raw=localStorage.getItem(KEY); basket=raw?JSON.parse(raw):[]; if(!Array.isArray(basket)) basket=[]; } catch(e){ basket=[]; } }
  function saveBasket() { try { localStorage.setItem(KEY,JSON.stringify(basket)); } catch(e){} }

  function isManualResult(result) {
    if (!result) return false;
    const title = $("#quote-result-title", result);
    const text = title ? title.textContent.toLowerCase() : "";
    return text.includes("manual valuation") || !!$(".manual-valuation-box", result);
  }

  function injectStyles() {
    if ($("#gear-multi-item-styles")) return;
    const style=document.createElement("style"); style.id="gear-multi-item-styles";
    style.textContent=`.quote-basket-box{margin:1.25rem 0;padding:1.25rem;border:2px solid #d88732;border-radius:6px;background:#f8f6f1}.quote-basket-box h3{margin-top:0;color:#102f4f}.quote-basket-list{margin:0 0 1rem;padding-left:1.4rem}.quote-basket-list li{display:flex;justify-content:space-between;gap:1rem;padding:.5rem 0;border-bottom:1px solid #ddd}.quote-basket-total{display:flex;justify-content:space-between;gap:1rem;padding:.9rem 0;border-top:2px solid #102f4f;font-size:1.1rem}.quote-basket-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:.75rem}.quote-basket-actions button{border:0;border-radius:6px;padding:.75rem 1.25rem;font-weight:700;cursor:pointer}.quote-basket-actions .btn-add-another-item{background:#102f4f;color:#fff}.quote-basket-actions .btn-continue-basket{background:#d88732;color:#fff}`;
    document.head.appendChild(style);
  }

  function currentItem() {
    const result=step(12), price=$(".quote-price",result), model=$("#dji-model"), pack=$("#package-select"), man=$("#gear-manufacturer"), cat=$("#gear-category"), condition=$("input[name=\"condition\"]:checked");
    const amount=price?Number(price.textContent.replace(/[^0-9.]/g,"")):0;
    return {category:cat?.value||"Drone",manufacturer:man?.value||"DJI",model:model?.value||"",modelName:model?.selectedOptions?.[0]?.textContent||"Equipment",package:pack?.value||"",packageName:pack?.selectedOptions?.[0]?.textContent||"",condition:condition?.value||"",amount:Number.isFinite(amount)?amount:0,addedAt:new Date().toISOString()};
  }
  function totalWith(item) { return basket.reduce((s,x)=>s+(Number(x.amount)||0),0)+(Number(item?.amount)||0); }

  function renderBasket(item) {
    const result=step(12); if(!result || isManualResult(result))return;
    let box=$("#gear-basket-box",result);
    if(!box){ box=document.createElement("div"); box.id="gear-basket-box"; box.className="quote-basket-box"; const summary=$("#quote-summary",result); if(summary)summary.insertAdjacentElement("afterend",box); else result.prepend(box); }
    const all=basket.concat(item?[item]:[]);
    box.innerHTML=`<h3>Your Quote</h3><p>You can add more equipment before submitting your quote.</p><ol class="quote-basket-list">${all.map(x=>`<li><strong>${escapeHtml(x.modelName||"Equipment")}</strong>${x.packageName?` — ${escapeHtml(x.packageName)}`:""}<span>${money(x.amount)}</span></li>`).join("")}</ol><div class="quote-basket-total"><strong>Estimated total</strong><strong>${money(totalWith(item))}</strong></div><div class="quote-basket-actions"><button type="button" class="btn-add-another-item">Add Another Item</button><button type="button" class="btn-continue-basket">Continue with This Quote</button></div>`;
  }

  function scheduleRender(){ clearTimeout(renderTimer); renderTimer=setTimeout(()=>{ if(resetting)return; const result=step(12); if(!result||result.hidden||isManualResult(result))return; const item=currentItem(); if(item.model)renderBasket(item); },150); }

  function clearForNewItem(){
    const form=$("#quote-form");if(!form)return;resetting=true;form.reset();
    $$("input[type=file]",form).forEach(i=>{try{i.value="";}catch(e){}});
    ["extra-battery-count","extra-controller-count","extra-hardcase-count","extra-charger-count","extra-hub-count","extra-propeller-count","extra-small-count"].forEach(id=>{const e=$("#"+id);if(e)e.value="0";});
    const cycles=$("#extra-battery-cycles");if(cycles)cycles.innerHTML="";
    const cat=$("#gear-category");if(cat)cat.value="";
    const man=$("#gear-manufacturer");if(man){man.value="";man.disabled=true;}
    const model=$("#dji-model");if(model)model.innerHTML='<option value="">-- Select model --</option>';
    const pack=$("#package-select");if(pack)pack.innerHTML='<option value="">-- Select package --</option>';
    const contents=$("#package-contents-list");if(contents)contents.innerHTML="";
    currentCommitted=false;saveBasket();
    const back=()=>{const visible=$$("#quote-form .wizard-step").find(s=>!s.hidden);const n=visible?Number(visible.dataset.step):1;if(n<=1){resetting=false;window.scrollTo({top:0,behavior:"smooth"});return;}const b=$(".btn-back",visible);if(b){b.click();setTimeout(back,35);}else resetting=false;};
    back();
  }

  function commitCurrent(item){if(!item||!item.model)return;basket.push(item);saveBasket();currentCommitted=true;}
  function prepareSubmission(){const item=currentItem();if(!item.model)return;if(!currentCommitted)commitCurrent(item);const total=basket.reduce((s,x)=>s+(Number(x.amount)||0),0);try{const raw=localStorage.getItem("wba_latest_quote");if(raw){const saved=JSON.parse(raw);saved.quoteBasket=basket;saved.quoteItemCount=basket.length;saved.quoteAmount=total;saved.multiItemQuote=basket.length>1;localStorage.setItem("wba_latest_quote",JSON.stringify(saved));}saveBasket();}catch(e){}}

  function init(){
    const form=$("#quote-form");if(!form)return;readBasket();injectStyles();
    const observer=new MutationObserver(scheduleRender);observer.observe(form,{attributes:true,childList:true,characterData:true,subtree:true,attributeFilter:["hidden"]});
    form.addEventListener("click",function(event){
      const button=event.target.closest("button");if(!button||resetting)return;const result=step(12);if(!result||!result.contains(button)||isManualResult(result))return;
      if(button.classList.contains("btn-add-another-item")){event.preventDefault();event.stopImmediatePropagation();const item=currentItem();if(item.model)commitCurrent(item);clearForNewItem();return;}
      if(button.classList.contains("btn-continue-basket")){event.preventDefault();event.stopImmediatePropagation();prepareSubmission();const original=$("#quote-result-action",result);if(original)original.click();return;}
    },true);
    form.addEventListener("click",function(event){const button=event.target.closest("button");if(!button||resetting)return;const s=button.closest(".wizard-step");if(!s||Number(s.dataset.step)!==13)return;setTimeout(()=>{try{const raw=localStorage.getItem("wba_latest_quote");if(!raw||basket.length===0)return;const saved=JSON.parse(raw);saved.quoteBasket=basket;saved.quoteItemCount=basket.length;saved.quoteAmount=basket.reduce((sum,x)=>sum+(Number(x.amount)||0),0);saved.multiItemQuote=basket.length>1;localStorage.setItem("wba_latest_quote",JSON.stringify(saved));}catch(e){}},100);},true);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
