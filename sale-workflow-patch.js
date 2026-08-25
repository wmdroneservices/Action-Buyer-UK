// GearCashOut sale workflow UI.
// This file owns the prominent next-step box on admin-sale.html.
// It intentionally waits for DOMContentLoaded so auth.js/admin-sale.js are ready.
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('sale-workflow-next-step');
  const message = document.getElementById('admin-sale-message');
  const auth = window.actionBuyerAuth;
  const saleId = new URLSearchParams(location.search).get('id');
  if (!container || !auth || !saleId) return;

  const esc = v => String(v ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
  const money = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(n||0));
  const notice = text => `<div role="alert" class="sale-next-step-alert"><strong>NEXT STEP REQUIRED</strong><span>${esc(text)}</span></div>`;
  const setMessage = (text, ok=true) => {
    if (!message) return;
    message.textContent=text;
    message.className=`form-message ${ok?'success':'error'}`;
  };

  try {
    const session = await auth.getSession();
    if (!session) return;

    const {data:sale,error:saleError}=await auth.supabase
      .from('sales')
      .select('*')
      .eq('id',saleId)
      .maybeSingle();
    if (saleError || !sale) {
      console.error('Sale workflow: could not load sale', saleError);
      return;
    }

    const {data:shipments}=await auth.supabase
      .from('shipments')
      .select('shipment_type,status,delivered_at,shipped_at,tracking_number,created_at')
      .eq('sale_id',saleId)
      .order('created_at',{ascending:false});

    const inbound=(shipments||[]).filter(s=>s.shipment_type==='inbound');
    const delivered=inbound.some(s=>s.delivered_at || s.status==='delivered');
    const status=String(sale.status||'').toLowerCase();

    async function getValuationId(){
      const {data:items}=await auth.supabase
        .from('sale_items').select('quote_item_id').eq('sale_id',saleId).order('created_at',{ascending:true});
      const quoteItemId=items?.[0]?.quote_item_id;
      if(!quoteItemId) return '';
      const {data:item}=await auth.supabase.from('quote_items').select('valuation_id').eq('id',quoteItemId).maybeSingle();
      return item?.valuation_id||'';
    }

    async function startInspection(button){
      button.disabled=true;
      const {data,error}=await auth.supabase.rpc('staff_start_sale_inspection',{p_sale_id:saleId});
      if(error || data?.error){
        button.disabled=false;
        setMessage(data?.error||error?.message||'Inspection could not be started.',false);
        return;
      }
      setMessage('Inspection started. The sale is now ready for the final decision.');
      setTimeout(()=>location.reload(),500);
    }

    async function confirmPayment(button,input){
      const reference=(input?.value||'').trim()||null;
      if(!confirm('Confirm that the bank payment has been sent to the customer?')) return;
      button.disabled=true;
      const {error}=await auth.supabase.rpc('staff_mark_sale_paid_and_create_inventory',{p_sale_id:saleId,p_payment_reference:reference});
      if(error){button.disabled=false;setMessage(error.message||'Payment could not be confirmed.',false);return;}
      setMessage('Payment recorded. The customer will now see Payment received.');
      setTimeout(()=>location.reload(),600);
    }

    // Received takes priority when the carrier says the item is delivered,
    // even if an earlier status field was not advanced correctly.
    if(status==='received' || delivered){
      container.innerHTML=`
        <section class="account-panel workflow-next-step" style="margin:0 0 1.25rem;border:3px solid #b94a48;">
          ${notice('The item has been received. Start the inspection before taking any further action.')}
          <div class="section-heading">
            <p class="section-kicker">ITEM RECEIVED</p>
            <h2>Inspect the item</h2>
            <p>The item has been received by GearCashOut. Start the physical inspection now. After inspection, you will either send the final offer or refuse the item.</p>
          </div>
          <div class="valuation-card" style="display:grid;gap:.75rem;">
            <strong style="font-size:1.2rem;">NEXT ACTION</strong>
            <button id="start-inspection" class="btn btn-primary" type="button" style="font-size:1.05rem;padding:.9rem 1.25rem;">START INSPECTION</button>
          </div>
        </section>`;
      document.getElementById('start-inspection')?.addEventListener('click',e=>startInspection(e.currentTarget));
      return;
    }

    if(status==='inspection'){
      const valuationId=await getValuationId();
      container.innerHTML=`
        <section class="account-panel workflow-next-step" style="margin:0 0 1.25rem;border:3px solid #b94a48;">
          ${notice('The item is under inspection. Complete the inspection, then send the final offer or refuse the item.')}
          <div class="section-heading">
            <p class="section-kicker">INSPECTION</p>
            <h2>Final offer or refuse item</h2>
            <p>Complete the physical checks and then use the final-offer controls. You should not have to search through the sale page to find the next action.</p>
          </div>
          <div class="valuation-card" style="display:grid;gap:.75rem;">
            <strong style="font-size:1.2rem;">NEXT ACTION</strong>
            ${valuationId ? `<a class="btn btn-primary" href="admin-quote.html?id=${encodeURIComponent(valuationId)}" style="font-size:1.05rem;padding:.9rem 1.25rem;text-align:center;">OPEN FINAL OFFER / REFUSE ITEM</a>` : '<p>The original quote could not be located from this sale.</p>'}
          </div>
        </section>`;
      return;
    }

    if(status==='payment_due'){
      const bankReady=!!(sale.bank_details_confirmed_at || sale.bank_details_received_at);
      container.innerHTML=`
        <section class="account-panel workflow-next-step" style="margin:0 0 1.25rem;border:3px solid #b94a48;">
          ${notice(bankReady ? 'Bank details have been received. Payment is now the next action.' : 'The final quote has been accepted. Wait for the customer to provide bank details before sending payment.')}
          <div class="section-heading"><p class="section-kicker">PAYMENT</p><h2>Final quote accepted</h2><p>Bank details must be supplied before payment is sent.</p></div>
          <div class="valuation-card"><div style="width:100%"><p><strong>Amount:</strong> ${money(sale.total_amount)}</p><p><strong>Bank details:</strong> ${bankReady?'Received':'Still waiting for customer'}</p>${bankReady?`<label>Bank transaction / payment reference <input id="workflow-payment-reference" type="text" maxlength="120" placeholder="Enter transaction number"></label><button id="workflow-payment-button" class="btn btn-primary" type="button">PAYMENT SENT TO CUSTOMER</button>`:'<p>Do not mark payment as sent until the customer has supplied bank details.</p>'}</div></div>
        </section>`;
      document.getElementById('workflow-payment-button')?.addEventListener('click',e=>confirmPayment(e.currentTarget,document.getElementById('workflow-payment-reference')));
      return;
    }

    if(status==='completed' || status==='paid'){
      container.innerHTML=`
        <section class="account-panel workflow-next-step" style="margin:0 0 1.25rem;border:3px solid #b94a48;">
          ${notice('Payment has been completed. Check the inventory record and complete any remaining administration.')}
          <div class="section-heading"><p class="section-kicker">COMPLETED</p><h2>Sale completed</h2><p>The payment workflow is complete.</p></div>
        </section>`;
      return;
    }

    if(['shipping','collecting_items','ready_for_shipping'].includes(status)){
      container.innerHTML=`
        <section class="account-panel workflow-next-step" style="margin:0 0 1.25rem;border:3px solid #b94a48;">
          ${notice('Monitor the inbound shipment. When the item is delivered, mark it received and start the inspection.')}
          <div class="section-heading"><p class="section-kicker">${esc(status.replaceAll('_',' ').toUpperCase())}</p><h2>Awaiting item receipt</h2><p>The next workflow stage is item receipt and inspection.</p></div>
        </section>`;
      return;
    }

    container.replaceChildren();
  } catch(error) {
    console.error('Sale workflow UI error',error);
  }
});
