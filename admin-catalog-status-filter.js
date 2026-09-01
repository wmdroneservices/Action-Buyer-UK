/* Catalogue status filter only.
   Online comparison pricing is intentionally NOT calculated here.
   admin-catalog-market-structure.js is the sole display/calculation layer and
   accepts only GBP + UK + New/New Sale selling evidence.
*/
(function(){
'use strict';
function apply(){const f=document.getElementById('status-filter'),list=document.getElementById('catalog-list');if(!f||!list)return;const selected=f.value,cards=list.querySelectorAll('.valuation-card');cards.forEach(card=>{const badge=card.querySelector('.status-badge'),title=card.querySelector('.gco-status,.catalog-title-status'),status=(badge?.textContent||title?.textContent||'').trim().toLowerCase();card.style.display=(!selected||status===selected)?'':'none'});let empty=list.querySelector('.status-filter-empty');const visible=[...cards].some(c=>c.style.display!=='none');if(selected&&cards.length&&!visible){if(!empty){empty=document.createElement('div');empty.className='empty-account status-filter-empty';list.appendChild(empty)}empty.innerHTML=`<h3>No ${selected} products found</h3><p>Change the Status filter or choose All products.</p>`;empty.style.display=''}else if(empty)empty.style.display='none'}
function wire(){const f=document.getElementById('status-filter'),list=document.getElementById('catalog-list');if(!f||!list||list.dataset.gcoStatusOnly==='1')return;list.dataset.gcoStatusOnly='1';f.addEventListener('change',apply);new MutationObserver(apply).observe(list,{childList:true,subtree:false});apply()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
