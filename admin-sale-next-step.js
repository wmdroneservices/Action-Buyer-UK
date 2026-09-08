/*
 * GearCashOut sale next-step workflow.
 *
 * This is deliberately independent of admin-sale.js, admin-sale-actions.js and
 * admin-sale-consolidated.js. Those scripts own the detailed sale record; this
 * script owns only the persistent next-action panel above it.
 *
 * It retries until auth and the host element exist, so it is not dependent on
 * defer/DOMContentLoaded ordering or on another sale-page MutationObserver.
 */
(() => {
  'use strict';

  const saleId = new URLSearchParams(window.location.search).get('id');
  if (!saleId) return;

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const money = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value || 0));
  const notice = text => `<div role="alert" class="sale-next-step-alert"><strong>NEXT STEP REQUIRED</strong><span>${esc(text)}</span></div>`;

  let running = false;
  let timer = null;

  function host() {
    return document.getElementById('sale-workflow-next-step');
  }

  function setMessage(text, ok = true) {
    const message = document.getElementById('admin-sale-message');
    if (!message) return;
    message.textContent = text;
    message.className = `form-message ${ok ? 'success' : 'error'}`;
  }

  async function getValuationId(auth) {
    const { data: saleItems, error: saleItemsError } = await auth.supabase
      .from('sale_items')
      .select('quote_item_id')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: true });
    if (saleItemsError) return '';
    const quoteItemId = saleItems?.[0]?.quote_item_id;
    if (!quoteItemId) return '';
    const { data: item } = await auth.supabase
      .from('quote_items')
      .select('valuation_id')
      .eq('id', quoteItemId)
      .maybeSingle();
    return item?.valuation_id || '';
  }

  async function getInspectionState(auth) {
    const { data: saleItems, error: saleItemsError } = await auth.supabase
      .from('sale_items')
      .select('quote_item_id')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: true });
    if (saleItemsError) throw saleItemsError;

    const quoteItemIds = (saleItems || []).map(row => row.quote_item_id).filter(Boolean);
    if (!quoteItemIds.length) return { asset: null, inspection: null, testing: null, repairOutstanding: false, complete: false };

    const { data: assets, error: assetError } = await auth.supabase
      .from('inventory_assets')
      .select('*')
      .eq('source_sale_id', saleId)
      .in('source_quote_item_id', quoteItemIds);
    if (assetError) throw assetError;

    const asset = (assets || [])[0] || null;
    if (!asset) return { asset: null, inspection: null, testing: null, repairOutstanding: false, complete: false };

    const { data: testingRows, error: testingError } = await auth.supabase
      .from('inventory_testing')
      .select('*')
      .eq('asset_id', asset.id)
      .order('created_at', { ascending: false });
    if (testingError) throw testingError;

    const rows = testingRows || [];
    const inspection = rows.find(row => row.stage === 'inspection') || null;
    const testing = rows.find(row => row.stage === 'testing') || null;
    const assetStatus = String(asset.status || '');
    const repairOutstanding = assetStatus === 'Repair Required';
    const complete = ['Ready for Resale', 'Sent to Sales', 'Listed', 'Reserved', 'Sold'].includes(assetStatus);

    return { asset, inspection, testing, repairOutstanding, complete };
  }

  async function startInspection(auth, button) {
    button.disabled = true;
    const { data, error } = await auth.supabase.rpc('staff_start_sale_inspection', { p_sale_id: saleId });
    if (error || data?.error) {
      button.disabled = false;
      setMessage(data?.error || error?.message || 'Inspection could not be started.', false);
      return;
    }

    try {
      const state = await getInspectionState(auth);
      if (state.asset?.id) {
        setMessage('Inspection started. Opening the editable inspection in Purchasing.');
        window.setTimeout(() => {
          window.location.href = 'inventory-detail.html?id=' + encodeURIComponent(state.asset.id);
        }, 250);
        return;
      }
    } catch (stateError) {
      console.warn('Inspection handoff lookup failed', stateError);
    }

    setMessage('Inspection started, but the linked inventory record could not be located.', false);
    button.disabled = false;
  }

  async function confirmPayment(auth, button, input) {
    if (!window.confirm('Confirm that the bank payment has been sent to the customer?')) return;
    button.disabled = true;
    const reference = (input?.value || '').trim() || null;
    const { error } = await auth.supabase.rpc('staff_mark_sale_paid_and_create_inventory', {
      p_sale_id: saleId,
      p_payment_reference: reference
    });
    if (error) {
      button.disabled = false;
      setMessage(error.message || 'Payment could not be confirmed.', false);
      return;
    }
    setMessage('Payment recorded. The customer will now see Payment received.');
    window.setTimeout(() => window.location.reload(), 600);
  }

  async function render() {
    if (running) return;
    const container = host();
    const auth = window.actionBuyerAuth;
    if (!container || !auth) return false;

    running = true;
    try {
      const session = await auth.getSession();
      if (!session) return false;

      const { data: sale, error: saleError } = await auth.supabase
        .from('sales')
        .select('id,status,payment_status,total_amount,bank_details_confirmed_at,payment_sent_at')
        .eq('id', saleId)
        .maybeSingle();
      if (saleError || !sale) {
        console.error('Sale next-step: sale lookup failed', saleError);
        return false;
      }

      const { data: shipments } = await auth.supabase
        .from('shipments')
        .select('shipment_type,status,delivered_at,shipped_at,tracking_number,created_at')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      const inbound = (shipments || []).filter(row => row.shipment_type === 'inbound');
      const delivered = inbound.some(row => row.delivered_at || row.status === 'delivered');
      const status = String(sale.status || '').toLowerCase();

      // Receipt is an earlier workflow stage. If the database still says
      // received, or the carrier proves delivery, show the inspection CTA.
      if (status === 'received' || delivered && !['inspection', 'payment_due', 'paid', 'completed', 'return_shipped'].includes(status)) {
        container.innerHTML = `
          <section class="account-panel workflow-next-step sale-next-step-panel">
            ${notice('The item has been received. Start the inspection before taking any further action.')}
            <div class="section-heading">
              <p class="section-kicker">ITEM RECEIVED</p>
              <h2>Inspect the item</h2>
              <p>The item has been received by GearCashOut. Start the physical inspection now. After inspection, you will either send the final offer or refuse the item.</p>
            </div>
            <div class="valuation-card sale-next-step-action">
              <strong>NEXT ACTION</strong>
              <button id="start-inspection" class="btn btn-primary" type="button">START INSPECTION</button>
            </div>
          </section>`;
        container.querySelector('#start-inspection')?.addEventListener('click', event => startInspection(auth, event.currentTarget));
        return true;
      }

      if (status === 'inspection') {
        const valuationId = await getValuationId(auth);
        let inspectionState;
        try {
          inspectionState = await getInspectionState(auth);
        } catch (inspectionError) {
          console.error('Inspection state lookup failed', inspectionError);
          container.innerHTML = `
            <section class="account-panel workflow-next-step sale-next-step-panel">
              ${notice('The inspection record could not be verified. Do not issue a final offer until Purchasing can confirm the physical inspection.')}
              <div class="section-heading"><p class="section-kicker">INSPECTION</p><h2>Inspection verification required</h2><p>Review the linked inventory record before continuing.</p></div>
            </section>`;
          return true;
        }

        const asset = inspectionState.asset;
        if (!asset) {
          container.innerHTML = `
            <section class="account-panel workflow-next-step sale-next-step-panel">
              ${notice('The sale is in inspection, but no linked inventory asset was found. Do not bypass this with a final offer.')}
              <div class="section-heading"><p class="section-kicker">INSPECTION</p><h2>Inventory handoff missing</h2><p>The physical inspection cannot be completed until the sale has a linked inventory asset.</p></div>
            </section>`;
          return true;
        }

        const inspection = inspectionState.inspection;
        const testing = inspectionState.testing;
        const inspectionFacts = `
          <div class="valuation-card" style="margin-top:1rem">
            <strong>INSPECTION RECORD · READ ONLY IN SALES</strong>
            <p><strong>Asset:</strong> ${esc(asset.asset_reference || asset.model || asset.id)}</p>
            <p><strong>Purchasing status:</strong> ${esc(asset.status || 'Not recorded')}</p>
            <p><strong>Inspection result:</strong> ${esc(inspection?.result || 'Not yet completed')}</p>
            <p><strong>Technical result:</strong> ${esc(testing?.result || 'Not yet completed')}</p>
          </div>`;

        if (inspectionState.repairOutstanding) {
          container.innerHTML = `
            <section class="account-panel workflow-next-step sale-next-step-panel">
              ${notice('Inspection is complete and has routed the item to Repair Required. Sales can only view the inspection; repair remains editable in Purchasing.')}
              <div class="section-heading">
                <p class="section-kicker">INSPECTION · REPAIR REQUIRED</p>
                <h2>Repair required before final offer</h2>
                <p>The physical inspection is retained here as read-only. Complete the authorised repair in Purchasing before returning to the final valuation decision.</p>
              </div>
              ${inspectionFacts}
              <div class="valuation-card sale-next-step-action">
                <strong>NEXT ACTION</strong>
                <a class="btn btn-primary" href="inventory-detail.html?id=${encodeURIComponent(asset.id)}">OPEN REPAIR IN PURCHASING</a>
              </div>
            </section>`;
          return true;
        }

        if (!inspectionState.complete) {
          container.innerHTML = `
            <section class="account-panel workflow-next-step sale-next-step-panel">
              ${notice('The item is under inspection. Complete the physical inspection in Purchasing before issuing a final offer or refusing the item.')}
              <div class="section-heading">
                <p class="section-kicker">INSPECTION IN PROGRESS</p>
                <h2>Complete final inspection</h2>
                <p>Sales cannot edit inspection facts. The linked Product Workbench in Purchasing is the editable inspection record.</p>
              </div>
              ${inspectionFacts}
              <div class="valuation-card sale-next-step-action">
                <strong>NEXT ACTION</strong>
                <a class="btn btn-primary" href="inventory-detail.html?id=${encodeURIComponent(asset.id)}">OPEN FINAL INSPECTION IN PURCHASING</a>
              </div>
            </section>`;
          return true;
        }

        container.innerHTML = `
          <section class="account-panel workflow-next-step sale-next-step-panel">
            ${notice('Final inspection is complete. The inspection record is now read-only in Sales; proceed with the final offer or refusal decision.')}
            <div class="section-heading">
              <p class="section-kicker">INSPECTION COMPLETE</p>
              <h2>Final offer or refuse item</h2>
              <p>The physical inspection has been completed in Purchasing. Sales may view the recorded result but cannot edit it here.</p>
            </div>
            ${inspectionFacts}
            <div class="valuation-card sale-next-step-action">
              <strong>NEXT ACTION</strong>
              ${valuationId
                ? `<a class="btn btn-primary" href="admin-quote.html?id=${encodeURIComponent(valuationId)}">OPEN FINAL OFFER / REFUSE ITEM</a>`
                : '<p>The original quote could not be located from this sale.</p>'}
            </div>
          </section>`;
        return true;
      }

      if (status === 'payment_due') {
        const bankReady = !!sale.bank_details_confirmed_at;
        container.innerHTML = `
          <section class="account-panel workflow-next-step sale-next-step-panel">
            ${notice(bankReady ? 'Bank details have been received. Payment is now the next action.' : 'The final quote has been accepted. Wait for the customer to provide bank details before sending payment.')}
            <div class="section-heading"><p class="section-kicker">PAYMENT</p><h2>Final quote accepted</h2><p>Bank details must be supplied before payment is sent.</p></div>
            <div class="valuation-card sale-next-step-action">
              <strong>NEXT ACTION</strong>
              <p><strong>Amount:</strong> ${money(sale.total_amount)}</p>
              <p><strong>Bank details:</strong> ${bankReady ? 'Received' : 'Still waiting for customer'}</p>
              ${bankReady ? '<label>Bank transaction / payment reference <input id="workflow-payment-reference" type="text" maxlength="120" placeholder="Enter transaction number"></label><button id="workflow-payment-button" class="btn btn-primary" type="button">PAYMENT SENT TO CUSTOMER</button>' : '<p>Do not mark payment as sent until the customer has supplied bank details.</p>'}
            </div>
          </section>`;
        container.querySelector('#workflow-payment-button')?.addEventListener('click', event => confirmPayment(auth, event.currentTarget, container.querySelector('#workflow-payment-reference')));
        return true;
      }

      if (status === 'paid' || status === 'completed') {
        container.innerHTML = `
          <section class="account-panel workflow-next-step sale-next-step-panel">
            ${notice('Payment has been completed. Check the inventory record and complete any remaining administration.')}
            <div class="section-heading"><p class="section-kicker">COMPLETED</p><h2>Sale completed</h2><p>The payment workflow is complete.</p></div>
          </section>`;
        return true;
      }

      if (['shipping', 'collecting_items', 'ready_for_shipping'].includes(status)) {
        container.innerHTML = `
          <section class="account-panel workflow-next-step sale-next-step-panel">
            ${notice('Monitor the inbound shipment. When the item is delivered, start the inspection.')}
            <div class="section-heading"><p class="section-kicker">${esc(status.replaceAll('_', ' ').toUpperCase())}</p><h2>Awaiting item receipt</h2><p>The next workflow stage is item receipt and inspection.</p></div>
          </section>`;
        return true;
      }

      // Do not silently remove the workflow area for an unexpected state.
      container.innerHTML = `
        <section class="account-panel workflow-next-step sale-next-step-panel">
          ${notice(`Current sale status: ${status || 'unknown'}. Review the sale record before proceeding.`)}
          <div class="section-heading"><p class="section-kicker">WORKFLOW</p><h2>Review current sale state</h2><p>The sale has an unrecognised workflow status. No underlying sale data has been changed by this panel.</p></div>
        </section>`;
      return true;
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer) window.clearInterval(timer);
    void render();
    timer = window.setInterval(async () => {
      const ok = await render();
      if (ok) window.clearInterval(timer);
    }, 500);
    window.setTimeout(() => { if (timer) window.clearInterval(timer); }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
