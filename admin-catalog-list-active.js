/* GearCashOut: list-level Active controls only. Does not alter quote/visibility logic. */
(function(){
  'use strict';
  const auth=()=>window.actionBuyerAuth;
  let timer=null;

  async function setActive(id, active){
    const sb=auth()?.supabase;
    if(!sb||!id)return false;
    const {error}=await sb.from('quote_catalog_products').update({active,updated_at:new Date().toISOString()}).eq('id',id);
    if(error){
      const msg=document.getElementById('catalog-message');
      if(msg){msg.textContent=`Active status update failed: ${error.message}`;msg.className='form-message error';}
      return false;
    }
    return true;
  }

  function render(){
    const list=document.getElementById('catalog-list');
    if(!list)return;
    list.querySelectorAll('.valuation-card').forEach(card=>{
      const edit=card.querySelector('.edit-product');
      if(!edit||card.querySelector('.list-active-control'))return;
      const id=edit.dataset.id;
      const status=card.querySelector('.status-badge');
      const meta=card.querySelector('.valuation-meta');
      if(!meta)return;
      const label=document.createElement('label');
      label.className='list-active-control';
      label.style.cssText='display:inline-flex;align-items:center;gap:.35rem;font-weight:700;margin-right:.5rem;';
      label.innerHTML=`<input type="checkbox" class="list-active-toggle" data-id="${id}" ${status?.textContent?.trim().toLowerCase()==='active'?'checked':''}> Active`;
      meta.insertBefore(label,meta.firstChild);
    });
  }

  document.addEventListener('change',async e=>{
    const cb=e.target.closest('.list-active-toggle');
    if(!cb)return;
    cb.disabled=true;
    const ok=await setActive(cb.dataset.id,cb.checked);
    cb.disabled=false;
    if(ok){
      const card=cb.closest('.valuation-card');
      const status=card?.querySelector('.status-badge');
      if(status)status.textContent=cb.checked?'Active':'Inactive';
    }else cb.checked=!cb.checked;
  });

  function observe(){
    render();
    const list=document.getElementById('catalog-list');
    if(list&&!list.dataset.activeObserver){
      list.dataset.activeObserver='1';
      new MutationObserver(()=>render()).observe(list,{childList:true,subtree:true});
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{observe();timer=setInterval(observe,1000);});
})();
