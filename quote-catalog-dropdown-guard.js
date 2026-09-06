/* GearCashOut: customer valuation dropdown identity guard.
   Defence-in-depth only: preserves legitimate package variants while removing
   duplicate option identities caused by stale client code or duplicate reads. */
(function(){
  "use strict";

  function norm(value){
    return String(value ?? "")
      .normalize("NFKC")
      .replace(/\s+/g," ")
      .trim()
      .toLocaleLowerCase("en-GB");
  }

  function dedupeSelect(select, mode){
    if(!select) return;
    const seen=new Set();
    [...select.options].forEach((option,index)=>{
      if(index===0 && !option.value) return;
      const key=mode==="package"
        ? norm(option.value)
        : norm(option.textContent || option.value);
      if(!key) return;
      if(seen.has(key)) option.remove();
      else seen.add(key);
    });
  }

  function dedupeAll(){
    dedupeSelect(document.getElementById("gear-category"),"label");
    dedupeSelect(document.getElementById("gear-product-type"),"label");
    dedupeSelect(document.getElementById("gear-manufacturer"),"label");
    dedupeSelect(document.getElementById("dji-model"),"label");
    // Package identity is the package key, not just the display wording.
    // This keeps RC-N1 and DJI RC variants separate while removing true duplicates.
    dedupeSelect(document.getElementById("package-select"),"package");
  }

  function schedule(){
    requestAnimationFrame(()=>requestAnimationFrame(dedupeAll));
  }

  document.addEventListener("DOMContentLoaded",()=>{
    dedupeAll();
    ["gear-category","gear-product-type","gear-manufacturer","dji-model"]
      .forEach(id=>document.getElementById(id)?.addEventListener("change",schedule));
    const form=document.getElementById("quote-form");
    if(form && window.MutationObserver){
      const observer=new MutationObserver(schedule);
      ["gear-category","gear-product-type","gear-manufacturer","dji-model","package-select"]
        .map(id=>document.getElementById(id))
        .filter(Boolean)
        .forEach(node=>observer.observe(node,{childList:true}));
    }
  });
})();