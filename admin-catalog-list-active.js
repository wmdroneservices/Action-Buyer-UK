/* GearCashOut: list-level Active controls. Does not alter quote/visibility logic. */
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

  async function syncStates(list){
    const sb=auth()?.supabase;
    if(!sb)return;
    const cards=Array.from(list.querySelectorAll('.valuation-card'));
    const ids=cards.map(card=>card.dataset.productId).filter(Boolean);
    if(!ids.length)return;
    const {data,error}=await sb.from('quote_catalog_products').select('id,active').in('id',ids);
    if(error)return;
    const states=new Map((data||[]).map(p=>[p.id,!!p.active]));
    cards.forEach(card=>{
      const id=card.dataset.productId;
      const cb=card.querySelector('.list-active-toggle');
      if(!cb||!states.has(id))return;
      cb.checked=states.get(id);
      cb.disabled=false;
    });
  }

  function render(){
    const list=document.getElementById('catalog-list');
    if(!list)return;
    list.querySelectorAll('.valuation-card').forEach(card=>{
      if(card.querySelector('.list-active-control'))return;
      const id=card.dataset.productId||card.querySelector('.edit-product')?.dataset.id;
      if(!id)return;

      const label=document.createElement('label');
      label.className='list-active-control';
      label.title='Set whether this catalogue product is active';
      label.innerHTML=`<input type="checkbox" class="list-active-toggle" data-id="${id}" disabled> <span>Active</span>`;

      card.style.position='relative';
      label.style.cssText='position:absolute;left:1rem;top:1rem;z-index:3;display:inline-flex;align-items:center;gap:.35rem;font-weight:700;margin:0;padding:.15rem .35rem;background:#fffdf8;border-radius:4px;';
      card.insertBefore(label,card.firstChild);
    });
    syncStates(list);
  }

  document.addEventListener('change',async e=>{
    const cb=e.target.closest('.list-active-toggle');
    if(!cb)return;
    const previous=!cb.checked;
    cb.disabled=true;
    const ok=await setActive(cb.dataset.id,cb.checked);
    cb.disabled=false;
    if(!ok)cb.checked=previous;
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
