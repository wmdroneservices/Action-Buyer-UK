document.addEventListener('DOMContentLoaded', async () => {
  const box = document.getElementById('quote-list');
  const message = document.getElementById('admin-message');
  const session = await window.actionBuyerAuth.getSession();
  if (!session) { window.location.href = 'login.html?return=admin-quotes.html'; return; }
  const { data: staff } = await window.actionBuyerAuth.supabase.from('staff_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = '<p>You do not have permission to access customer quotes.</p>'; return; }

  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money = v => v == null ? '—' : new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(v));
  const flash = (text, cls='success') => { message.textContent=text; message.className='form-message '+cls; };

  async function load() {
    box.innerHTML='<p>Loading quotes...</p>';
    const { data, error } = await window.actionBuyerAuth.supabase.from('valuations').select('id,user_id,quote_reference,status,manufacturer,model,package,condition,quote_amount,submitted_at,updated_at').order('submitted_at',{ascending:false});
    if(error){ console.error(error); box.innerHTML='<p>We could not load the quotes.</p>'; return; }
    if(!data?.length){ box.innerHTML='<p>No customer quotes yet.</p>'; return; }
    const ids=data.map(v=>v.id);
    const {data:items,error:itemError}=await window.actionBuyerAuth.supabase.from('quote_items').select('id,valuation_id,item_status').in('valuation_id',ids);
    if(itemError){ console.error(itemError); box.innerHTML='<p>We could not load quote items.</p>'; return; }
    const itemIds=(items||[]).map(i=>i.id);
    const {data:offers,error:offerError}=itemIds.length?await window.actionBuyerAuth.supabase.from('quote_offers').select('id,item_id,offer_type,amount,status,internal_notes,customer_message,published_at,created_at').in('item_id',itemIds).order('created_at',{ascending:false}):{data:[],error:null};
    if(offerError){console.error(offerError);box.innerHTML='<p>We could not load offers.</p>';return;}
    const itemByVal=new Map((items||[]).map(i=>[i.valuation_id,i]));
    const offersByItem=new Map();(offers||[]).forEach(o=>{if(!offersByItem.has(o.item_id))offersByItem.set(o.item_id,[]);offersByItem.get(o.item_id).push(o);});
    box.innerHTML=data.map(v=>{
      const item=itemByVal.get(v.id); const os=item?offersByItem.get(item.id)||[]:[];
      const published=os.filter(o=>o.status==='published');
      const latest=os[0];
      return `<article class="valuation-card admin-valuation-card" style="margin-bottom:1rem"><div><span class="valuation-ref">${esc(v.quote_reference)}</span><h3>${esc(v.manufacturer||'')} ${esc(v.model||'Equipment')}</h3><p>${esc(v.package||'')} ${v.condition?'— '+esc(v.condition):''}</p><small>Submitted ${v.submitted_at?new Date(v.submitted_at).toLocaleString('en-GB'):''}</small><p><strong>Item status:</strong> ${esc(item?.item_status||'under_assessment')}</p><p><strong>Published offers:</strong> ${published.length}</p></div><div style="min-width:300px;max-width:480px;width:100%"><form class="offer-form" data-item-id="${esc(item?.id||'')}" data-valuation-id="${esc(v.id)}"><label>Offer type<select name="offer_type"><option value="automatic">Automatic</option><option value="manual">Manual</option><option value="final">Final offer</option></select></label><label>Amount (£)<input name="amount" type="number" min="0" step="0.01" value="${latest?esc(latest.amount):esc(v.quote_amount??'')}"></label><label>Internal notes<textarea name="internal_notes" rows="2" placeholder="Inspection notes / deductions">${esc(latest?.internal_notes||'')}</textarea></label><label>Customer message<textarea name="customer_message" rows="2" placeholder="Optional message shown with the offer">${esc(latest?.customer_message||'')}</textarea></label><div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn btn-secondary save-draft" type="button">SAVE DRAFT</button><button class="btn btn-primary publish-offer" type="button">PUBLISH OFFER</button></div></form></div></article>`;
    }).join('');

    box.querySelectorAll('.offer-form').forEach(form=>{
      const getValues=()=>({item_id:form.dataset.itemId,offer_type:form.offer_type.value,amount:Number(form.amount.value),internal_notes:form.internal_notes.value.trim()||null,customer_message:form.customer_message.value.trim()||null});
      form.querySelector('.save-draft').addEventListener('click',async()=>{
        const x=getValues(); if(!x.item_id||!Number.isFinite(x.amount)||x.amount<0){flash('Enter a valid amount.','error');return;}
        const {error}=await window.actionBuyerAuth.supabase.from('quote_offers').insert({...x,status:'draft',created_by:session.user.id});
        if(error){console.error(error);flash('The draft could not be saved.','error');return;} flash('Draft saved.'); await load();
      });
      form.querySelector('.publish-offer').addEventListener('click',async()=>{
        const x=getValues(); if(!x.item_id||!Number.isFinite(x.amount)||x.amount<0){flash('Enter a valid amount.','error');return;}
        const {error}=await window.actionBuyerAuth.supabase.from('quote_offers').insert({...x,status:'published',published_at:new Date().toISOString(),created_by:session.user.id});
        if(error){console.error(error);flash('The offer could not be published.','error');return;}
        await window.actionBuyerAuth.supabase.from('quote_items').update({item_status:'final_offer',updated_at:new Date().toISOString()}).eq('id',x.item_id);
        flash('Offer published. The customer can now see and act on it.'); await load();
      });
    });
  }
  await load();
});