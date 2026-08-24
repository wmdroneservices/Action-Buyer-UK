// GearCashOut sale workflow patch.
// Applies only after the existing sale page has rendered, so it does not get overwritten by admin-sale.js.
(async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;
  const saleId = new URLSearchParams(location.search).get('id');
  if (!saleId) return;

  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(n||0));
  const message = document.getElementById('admin-sale-message');
  const notice = (text, ok=true) => { if(message){message.textContent=text;message.className=`form-message ${ok?'success':'error'}`;} };

  const {data:sale,error:saleError}=await auth.supabase.from('sales').select('*').eq('id',saleId).maybeSingle();
  if(saleError || !sale) return;

  async function addCommunications() {
    const box=document.getElementById('sale-details');
    if(!box || box.querySelector('.customer-communications')) return;
    const {data:items}=await auth.supabase.from('sale_items').select('quote_item_id,accepted_offer_id').eq('sale_id',saleId);
    const offerIds=(items||[]).map(x=>x.accepted_offer_id).filter(Boolean);
    let query=auth.supabase.from('email_queue').select('event_type,subject,status,created_at,sent_at,offer_id').eq('user_id',sale.user_id).order('created_at',{ascending:false}).limit(30);
    if(offerIds.length) query=query.or(`offer_id.in.(${offerIds.join(',')}),offer_id.is.null`);
    const {data:emails}=await query;
    if(!emails?.length) return;
    const section=document.createElement('section');
    section.className='account-panel customer-communications';
    section.innerHTML=`<div class="section-heading"><p class="section-kicker">CUSTOMER COMMUNICATIONS</p><h2>Emails &amp; notifications</h2><p>A record of customer emails queued and sent for this sale.</p></div><div class="valuation-card"><div style="width:100%">${emails.map(e=>`<p style="margin:.7rem 0"><strong>${esc(e.subject||e.event_type||'Notification')}</strong> — ${esc(e.status||'queued')} — ${esc(new Date(e.sent_at||e.created_at).toLocaleString('en-GB'))}</p>`).join('')}</div></div>`;
    box.appendChild(section);
  }

  async function startInspection(button) {
    button.disabled=true;
    const {data,error}=await auth.supabase.rpc('staff_start_sale_inspection',{p_sale_id:saleId});
    if(error || data?.error){button.disabled=false;notice(data?.error||error?.message||'Inspection could not be started.',false);return;}
    notice('Inspection started. The sale is now ready for the final quote.');
    setTimeout(()=>location.reload(),500);
  }

  async function confirmPayment(button, referenceInput) {
    const reference=(referenceInput?.value||'').trim()||null;
    if(!confirm('Confirm that the bank payment has been sent to the customer? This will mark the sale completed and create the inventory record.')) return;
    button.disabled=true;
    const {error}=await auth.supabase.rpc('staff_mark_sale_paid_and_create_inventory',{p_sale_id:saleId,p_payment_reference:reference});
    if(error){button.disabled=false;notice(error.message||'Payment could not be confirmed.',false);return;}
    notice('Payment recorded. The customer will now see Payment received.');
    setTimeout(()=>location.reload(),600);
  }

  document.addEventListener('click', event => {
    const paymentButton=event.target.closest?.('#mark-payment-sent');
    if(paymentButton){
      event.preventDefault(); event.stopImmediatePropagation();
      confirmPayment(paymentButton,document.getElementById('workflow-payment-reference'));
    }
  }, true);

  let applied=false;
  async function applyWorkflow() {
    const box=document.getElementById('sale-details');
    if(!box || !box.children.length || applied) return;
    applied=true;
    await addCommunications();
    const section=document.createElement('section');
    section.className='account-panel workflow-next-step';
    section.style.cssText='margin-top:1rem;';

    if(sale.status==='received'){
      section.innerHTML=`<div class="section-heading"><p class="section-kicker">NEXT STEP</p><h2>Inspect the item</h2><p>The item has been received. Do not request bank details yet.</p></div><div class="valuation-card"><button id="start-inspection" class="btn btn-primary" type="button">START INSPECTION</button></div>`;
      box.prepend(section);
      document.getElementById('start-inspection').onclick=()=>startInspection(document.getElementById('start-inspection'));
    } else if(sale.status==='inspection'){
      const {data:si}=await auth.supabase.from('sale_items').select('quote_item_id').eq('sale_id',saleId).limit(1).maybeSingle();
      let valuationId='';
      if(si?.quote_item_id){ const {data:qi}=await auth.supabase.from('quote_items').select('valuation_id').eq('id',si.quote_item_id).maybeSingle(); valuationId=qi?.valuation_id||''; }
      section.innerHTML=`<div class="section-heading"><p class="section-kicker">NEXT STEP</p><h2>Send the final quote</h2><p>Complete the inspection, then send the final quote to the customer. Bank details are not requested at this stage.</p></div><div class="valuation-card">${valuationId?`<a class="btn btn-primary" href="admin-quote.html?id=${encodeURIComponent(valuationId)}">OPEN QUOTE / SEND FINAL QUOTE</a>`:'<p>Open the original quote below to send the final quote.</p>'}</div>`;
      box.prepend(section);
    } else if(sale.status==='payment_due'){
      section.innerHTML=`<div class="section-heading"><p class="section-kicker">PAYMENT</p><h2>Final quote accepted</h2><p>Bank details should now have been supplied by the customer before payment is sent.</p></div><div class="valuation-card"><div style="width:100%"><p><strong>Amount:</strong> ${money(sale.total_amount)}</p><p><strong>Bank details:</strong> ${sale.bank_details_confirmed_at?'Received':'Still waiting for customer'}</p>${sale.bank_details_confirmed_at?`<label>Bank transaction / payment reference <input id="workflow-payment-reference" type="text" maxlength="120" placeholder="Enter transaction number"></label><button id="workflow-payment-button" class="btn btn-primary" type="button">PAYMENT SENT TO CUSTOMER</button>`:'<p>Do not mark payment as sent until the customer has supplied bank details.</p>'}</div></div>`;
      box.prepend(section);
      document.getElementById('workflow-payment-button')?.addEventListener('click',()=>confirmPayment(document.getElementById('workflow-payment-button'),document.getElementById('workflow-payment-reference')));
      box.querySelector('#mark-payment-sent')?.closest('.valuation-card')?.remove();
    }
  }

  const box=document.getElementById('sale-details');
  if(!box) return;
  const observer=new MutationObserver(()=>applyWorkflow());
  observer.observe(box,{childList:true,subtree:true});
  applyWorkflow();
})();
