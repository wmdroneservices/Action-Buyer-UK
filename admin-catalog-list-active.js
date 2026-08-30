/* GearCashOut: list-level Active controls. Uses the existing quote_catalog_products.active field only. */
(function(){
  'use strict';
  const getAuth=()=>window.actionBuyerAuth;

  async function setActive(id, active){
    const sb=getAuth()?.supabase;
    if(!sb||!id)return {ok:false,error:'Authentication system unavailable.'};
    const session=await getAuth().getSession();
    if(!session)return {ok:false,error:'Your staff session has expired. Please sign in again.'};
    const {error}=await sb.from('quote_catalog_products').update({active:!!active,updated_at:new Date().toISOString()}).eq('id',id);
    if(error)return {ok:false,error:error.message};
    return {ok:true};
  }

  function showError(text){
    const msg=document.getElementById('catalog-message');
    if(msg){msg.textContent=`Active status update failed: ${text}`;msg.className='form-message error';}
  }

  async function syncStates(list){
    const sb=getAuth()?.supabase;
    if(!sb)return;
    const cards=Array.from(list.querySelectorAll('.valuation-card[data-product-id]'));
    const ids=cards.map(card=>card.dataset.productId).filter(Boolean);
    if(!ids.length)return;
    const {data,error}=await sb.from('quote_catalog_products').select('id,active').in('id',ids);
    if(error)return;
    const states=new Map((data||[]).map(p=>[p.id,!!p.active]));
    cards.forEach(card=>{
      const cb=card.querySelector('.list-active-toggle'),id=card.dataset.productId;
      if(!cb||!states.has(id))return;
      cb.checked=states.get(id);cb.disabled=false;
      const badge=card.querySelector('.status-badge');
      if(badge)badge.textContent=states.get(id)?'Active':'Inactive';
    });
  }

  function render(){
    const list=document.getElementById('catalog-list');
    if(!list)return;
    list.querySelectorAll('.valuation-card').forEach(card=>{
      if(card.querySelector('.list-active-control'))return;
      const id=card.querySelector('.edit-product')?.dataset.id;
      if(!id)return;
      card.dataset.productId=id;
      const label=document.createElement('label');
      label.className='list-active-control';
      label.title='Set whether this catalogue product is active';
      label.innerHTML=`<input type="checkbox" class="list-active-toggle" data-id="${id}"> <span>Active</span>`;
      /* Normal document flow: the checkbox gets its own line above the
         manufacturer/category text and can never cover the product name. */
      label.style.cssText='position:static;display:flex;align-items:center;gap:.35rem;width:max-content;font-weight:700;margin:0 0 .45rem 0;padding:0;cursor:pointer;';
      const content=card.firstElementChild;
      if(content)content.insertBefore(label,content.firstChild);
      else card.insertBefore(label,card.firstChild);
    });
    syncStates(list);
  }

  document.addEventListener('change',async e=>{
    const cb=e.target.closest?.('.list-active-toggle');
    if(!cb)return;
    const id=cb.dataset.id,desired=cb.checked;
    cb.disabled=true;
    const result=await setActive(id,desired);
    if(!result.ok){cb.checked=!desired;cb.disabled=false;showError(result.error);return;}
    cb.disabled=false;
    const card=cb.closest('.valuation-card'),badge=card?.querySelector('.status-badge');
    if(badge)badge.textContent=desired?'Active':'Inactive';
    const msg=document.getElementById('catalog-message');
    if(msg){msg.textContent=`Product ${desired?'activated':'deactivated'}.`;msg.className='form-message success';}
  },true);

  function observe(){
    render();
    const list=document.getElementById('catalog-list');
    if(list&&!list.dataset.activeObserver){
      list.dataset.activeObserver='1';
      new MutationObserver(()=>render()).observe(list,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});
  else observe();
})();
