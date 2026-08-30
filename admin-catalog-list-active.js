/* GearCashOut: product-level Active control beside EDIT PRODUCT. Uses the existing quote_catalog_products.active field only. */
(function(){
  'use strict';
  const getAuth=()=>window.actionBuyerAuth;

  async function setActive(id,active){
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
    const sb=getAuth()?.supabase;if(!sb)return;
    const cards=Array.from(list.querySelectorAll('.valuation-card[data-product-id]'));
    const ids=cards.map(card=>card.dataset.productId).filter(Boolean);if(!ids.length)return;
    const {data,error}=await sb.from('quote_catalog_products').select('id,active').in('id',ids);if(error)return;
    const states=new Map((data||[]).map(p=>[p.id,!!p.active]));
    cards.forEach(card=>{
      const control=card.querySelector('.list-active-control'),id=card.dataset.productId;if(!control||!states.has(id))return;
      const active=states.get(id);control.dataset.active=active?'true':'false';control.textContent=active?'ACTIVE':'INACTIVE';control.classList.toggle('active',active);control.classList.toggle('inactive',!active);
      const badge=card.querySelector('.status-badge');if(badge)badge.textContent=active?'Active':'Inactive';
    });
  }

  function render(){
    const list=document.getElementById('catalog-list');if(!list)return;
    list.querySelectorAll('.valuation-card').forEach(card=>{
      const edit=card.querySelector('.edit-product'),id=edit?.dataset.id;if(!id)return;
      card.dataset.productId=id;
      card.querySelectorAll('.list-active-checkbox-control,.list-active-toggle').forEach(el=>{const wrapper=el.closest('.list-active-checkbox-control');(wrapper||el).remove();});
      if(card.querySelector('.list-active-control'))return;
      const control=document.createElement('button');control.type='button';control.className='list-active-control';control.dataset.id=id;control.title='Click to change this catalogue product between active and inactive';control.textContent='ACTIVE';
      control.style.cssText='display:inline-flex;align-items:center;justify-content:center;margin-left:.5rem;padding:.55rem .8rem;border:0;border-radius:6px;font:inherit;font-size:.78rem;font-weight:800;letter-spacing:.02em;cursor:pointer;vertical-align:middle;';
      edit.insertAdjacentElement('afterend',control);
    });
    syncStates(list);
  }

  document.addEventListener('click',async e=>{
    const control=e.target.closest?.('.list-active-control');if(!control)return;
    e.preventDefault();e.stopPropagation();
    const id=control.dataset.id,currentlyActive=control.dataset.active==='true',desired=!currentlyActive;
    control.disabled=true;control.textContent='SAVING…';
    const result=await setActive(id,desired);
    if(!result.ok){control.disabled=false;control.textContent=currentlyActive?'ACTIVE':'INACTIVE';showError(result.error);return;}
    control.dataset.active=desired?'true':'false';control.textContent=desired?'ACTIVE':'INACTIVE';control.disabled=false;control.classList.toggle('active',desired);control.classList.toggle('inactive',!desired);
    const card=control.closest('.valuation-card'),badge=card?.querySelector('.status-badge');if(badge)badge.textContent=desired?'Active':'Inactive';
    const msg=document.getElementById('catalog-message');if(msg){msg.textContent=`Product ${desired?'activated':'deactivated'}.`;msg.className='form-message success';}
  },true);

  function addStyles(){
    if(document.getElementById('list-active-control-style'))return;
    const style=document.createElement('style');style.id='list-active-control-style';style.textContent='.list-active-control{background:#dff3e4;color:#18733b}.list-active-control.inactive{background:#f8dddd;color:#a32323}.list-active-control:disabled{opacity:.65;cursor:wait}.list-active-control:focus-visible{outline:3px solid #102f4f;outline-offset:2px}';document.head.appendChild(style);
  }

  function observe(){
    addStyles();render();const list=document.getElementById('catalog-list');
    if(list&&!list.dataset.activeObserver){list.dataset.activeObserver='1';new MutationObserver(()=>render()).observe(list,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
})();
