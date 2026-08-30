/* GearCashOut: list-level Active controls only. Does not alter quote/visibility logic. */
(function(){
  'use strict';
  const auth=()=>window.actionBuyerAuth;

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
      if(card.querySelector('.list-active-control'))return;
      const edit=card.querySelector('.edit-product');
      if(!edit)return;
      const id=edit.dataset.id;
      const status=card.querySelector('.status-badge');
      const title=card.querySelector('h3');
      if(!title)return;

      const label=document.createElement('label');
      label.className='list-active-control';
      label.title='Set whether this catalogue product is active';
      label.innerHTML=`<input type="checkbox" class="list-active-toggle" data-id="${id}" ${status?.textContent?.trim().toLowerCase()==='active'?'checked':''}> <span>Active</span>`;

      const titleRow=document.createElement('div');
      titleRow.className='list-product-title-row';
      titleRow.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;';
      title.parentNode.insertBefore(titleRow,title);
      titleRow.appendChild(title);
      titleRow.appendChild(label);
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

  document.addEventListener('DOMContentLoaded',observe);
})();
