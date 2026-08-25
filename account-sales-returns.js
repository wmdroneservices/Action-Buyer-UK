document.addEventListener('DOMContentLoaded', async()=>{
  const auth=window.actionBuyerAuth;if(!auth)return;const session=await auth.getSession();if(!session)return;const db=auth.supabase;
  async function addReturnActions(){
    const {data:sales,error}=await db.from('sales').select('id,sale_reference,status').eq('user_id',session.user.id).order('created_at',{ascending:false});
    if(error)return;
    for(const card of document.querySelectorAll('.completed-sale-card')){
      const ref=card.querySelector('.valuation-ref')?.textContent?.trim();if(!ref||card.querySelector('.customer-return-actions'))continue;
      const sale=(sales||[]).find(s=>s.sale_reference===ref);if(!sale)continue;
      const {data:items}=await db.rpc('customer_get_returnable_items',{p_sale_id:sale.id});if(!items?.length)continue;
      const wrap=document.createElement('div');wrap.className='customer-return-actions notice';wrap.style.marginTop='1rem';
      wrap.innerHTML=`<h4>Returns</h4><p>If you need to return an item from this completed transaction, select it below.</p>${items.map(x=>`<div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap;padding:.65rem 0;border-top:1px solid #ddd"><span><strong>${escapeHtml([x.manufacturer,x.model].filter(Boolean).join(' '))}</strong><br><small>${escapeHtml(x.transaction_number)} · ${escapeHtml(x.return_status||'No return requested')}</small></span>${x.return_status&&!['Return Refused','Return Sent Back','Closed'].includes(x.return_status)?`<span class="status-badge">${escapeHtml(x.return_status)}</span>`:`<a class="btn btn-secondary" href="customer-return.html?sale=${encodeURIComponent(sale.id)}&asset=${encodeURIComponent(x.asset_id)}">REQUEST A RETURN</a>`}</div>`).join('')}`;
      card.querySelector('.sale-details')?.appendChild(wrap);
    }
  }
  function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
  const observer=new MutationObserver(()=>setTimeout(addReturnActions,100));observer.observe(document.getElementById('completed-transactions')||document.body,{childList:true,subtree:true});
  setTimeout(addReturnActions,800);
});
