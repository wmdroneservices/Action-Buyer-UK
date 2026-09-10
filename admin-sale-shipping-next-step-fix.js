/*
 * Purchasing sale-page shipping-stage correction.
 *
 * admin-sale-next-step.js owns the main workflow panel. This small overlay
 * corrects the collecting-items message when an inbound shipment exists but
 * its label has not yet been created/sent. Once the shipment is label_created
 * or in_transit, the normal monitor/receipt workflow remains authoritative.
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

  function host() {
    return document.getElementById('sale-workflow-next-step');
  }

  async function correctShippingStage() {
    const container = host();
    const auth = window.actionBuyerAuth;
    if (!container || !auth) return false;

    const session = await auth.getSession();
    if (!session) return false;

    const { data: sale, error: saleError } = await auth.supabase
      .from('sales')
      .select('id,status,sale_reference')
      .eq('id', saleId)
      .maybeSingle();
    if (saleError || !sale) return false;

    const status = String(sale.status || '').toLowerCase();
    if (!['shipping', 'collecting_items', 'ready_for_shipping'].includes(status)) return false;

    const { data: shipments, error: shipmentError } = await auth.supabase
      .from('shipments')
      .select('status,label_count,label_urls,qr_code_urls,shipped_at,delivered_at,created_at')
      .eq('sale_id', saleId)
      .eq('shipment_type', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1);
    if (shipmentError) return false;

    const inbound = shipments?.[0];
    if (!inbound) return false;

    const shipmentStatus = String(inbound.status || '').toLowerCase();
    const labelReady = ['label_created', 'in_transit', 'delivered'].includes(shipmentStatus)
      || (Array.isArray(inbound.label_urls) && inbound.label_urls.length > 0)
      || (Array.isArray(inbound.qr_code_urls) && inbound.qr_code_urls.length > 0);

    if (labelReady || inbound.shipped_at || inbound.delivered_at) return false;
    if (!['awaiting_label', 'label_required'].includes(shipmentStatus)) return false;

    container.innerHTML = `
      <section class="account-panel workflow-next-step sale-next-step-panel">
        <div role="alert" class="sale-next-step-alert">
          <strong>NEXT STEP REQUIRED</strong>
          <span>Create and send the customer → GearCashOut shipping label before the item can be sent.</span>
        </div>
        <div class="section-heading">
          <p class="section-kicker">SHIPPING LABEL REQUIRED</p>
          <h2>Create and send shipping label</h2>
          <p>The inbound shipment record exists, but its customer shipping label has not yet been created and sent. Do not switch this stage to monitoring until the label has been sent.</p>
        </div>
        <div class="valuation-card sale-next-step-action">
          <strong>NEXT ACTION</strong>
          <p>Use the existing Sales &amp; Shipping workflow to create the label, record the label/QR details and send the customer the shipping instructions.</p>
          <div class="navigation-buttons" style="margin-top:.8rem">
            <a class="btn btn-primary" href="admin-sales.html">OPEN SALES &amp; SHIPPING</a>
          </div>
        </div>
      </section>`;
    return true;
  }

  function start() {
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        if (await correctShippingStage() || attempts >= 30) window.clearInterval(timer);
      } catch (error) {
        console.warn('Sale shipping next-step correction failed', error);
        if (attempts >= 30) window.clearInterval(timer);
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
