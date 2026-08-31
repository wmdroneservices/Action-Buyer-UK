/* GearCashOut: staff catalogue customer-visibility UI. Keeps valuation prices untouched. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const auth=()=>window.actionBuyerAuth;

  function addVisibilityControl(){
    if($('customer-visible'))return;
    const active=$('active');
    if(!active)return;
    const wrap=document.createElement('label');
    wrap.style.display='block';wrap.style.margin='.65rem 0';
    wrap.innerHTML='<input id="customer-visible" type="checkbox" checked> Visible to customers';
    active.closest('label')?.insertAdjacentElement('afterend',wrap);
    $('customer-visible')?.addEventListener('change',async()=>{
      const id=$('product-id')?.value?.trim();
      if(!id||!auth()?.supabase)return;
      const {error}=await auth().supabase.from('quote_catalog_products').update({customer_visible:$('customer-visible').checked,updated_at:new Date().toISOString()}).eq('id',id);
      const msg=$('catalog-message');
      if(msg){msg.textContent=error?`Visibility update failed: ${error.message}`:'Customer visibility updated.';msg.className=`form-message ${error?'error':'success'}`;}
    });
  }

  async function loadVisibility(id){
    const cb=$('customer-visible');
    if(!cb||!id||!auth()?.supabase)return;
    const {data,error}=await auth().supabase.from('quote_catalog_products').select('customer_visible').eq('id',id).maybeSingle();
    if(!error)cb.checked=data?.customer_visible!==false;
  }

  document.addEventListener('click',e=>{
    const edit=e.target.closest('.edit-product');
    if(edit)setTimeout(()=>loadVisibility(edit.dataset.id),150);
  },true);

  document.addEventListener('DOMContentLoaded',()=>addVisibilityControl());
})();
