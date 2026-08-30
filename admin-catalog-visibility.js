/* GearCashOut: staff catalogue visibility/status UI. Keeps valuation prices untouched. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const auth=()=>window.actionBuyerAuth;
  let observedIds=new Set();

  function addVisibilityControl(){
    if($('customer-visible')) return;
    const active=$('active');
    if(!active) return;
    const wrap=document.createElement('label');
    wrap.style.display='block'; wrap.style.margin='.65rem 0';
    wrap.innerHTML='<input id="customer-visible" type="checkbox" checked> Visible to customers';
    active.closest('label')?.insertAdjacentElement('afterend',wrap);
    const cb=$('customer-visible');
    cb?.addEventListener('change',async()=>{
      const id=$('product-id')?.value?.trim();
      if(!id||!auth()?.supabase)return;
      const {error}=await auth().supabase.from('quote_catalog_products').update({customer_visible:cb.checked,updated_at:new Date().toISOString()}).eq('id',id);
      const msg=$('catalog-message');
      if(msg){msg.textContent=error?`Visibility update failed: ${error.message}`:'Customer visibility updated.';msg.className=`form-message ${error?'error':'success'}`;}
      updateVisibilityBadge(id,cb.checked);
    });
  }

  function updateVisibilityBadge(id,visible){
    document.querySelectorAll(`.customer-visibility-badge[data-id="${CSS.escape(id)}"]`).forEach(b=>{b.textContent=visible?'Customer visible':'Hidden from customers';b.classList.toggle('hidden',!visible);});
  }

  async function loadVisibility(id){
    const cb=$('customer-visible'); if(!cb||!id||!auth()?.supabase)return;
    const {data,error}=await auth().supabase.from('quote_catalog_products').select('customer_visible').eq('id',id).maybeSingle();
    if(!error) cb.checked=data?.customer_visible!==false;
  }

  function decorateList(){
    document.querySelectorAll('#catalog-list .valuation-card').forEach(card=>{
      const edit=card.querySelector('.edit-product'); if(!edit)return;
      const id=edit.dataset.id;
      const meta=card.querySelector('.valuation-meta'); if(!meta)return;
      let badge=meta.querySelector('.customer-visibility-badge');
      if(!badge){
        badge=document.createElement('span'); badge.className='customer-visibility-badge'; badge.dataset.id=id; badge.textContent='Customer visible';
        meta.insertBefore(badge,meta.firstChild);
      }
      if(!observedIds.has(id)){
        observedIds.add(id);
        auth()?.supabase?.from('quote_catalog_products').select('customer_visible').eq('id',id).maybeSingle().then(({data})=>{if(data)updateVisibilityBadge(id,data.customer_visible!==false);});
      }
      const title=card.querySelector('h3');
      if(title&&!title.querySelector('.catalog-status-badge')){
        const active=card.querySelector('.status-badge')?.textContent?.trim().toLowerCase()==='active';
        const status=document.createElement('span'); status.className=`catalog-status-badge ${active?'active':'inactive'}`; status.textContent=active?'ACTIVE':'INACTIVE';
        title.append(' ',status);
      }
    });
  }

  document.addEventListener('click',e=>{
    const edit=e.target.closest('.edit-product');
    if(edit) setTimeout(()=>loadVisibility(edit.dataset.id),150);
  },true);
  const observer=new MutationObserver(()=>{addVisibilityControl();decorateList();});
  document.addEventListener('DOMContentLoaded',()=>{
    addVisibilityControl(); decorateList(); observer.observe($('catalog-list')||document.body,{childList:true,subtree:true});
  });
})();
