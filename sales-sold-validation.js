/* Sold-sale validation and post-sale shipping controls. */
document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const db = auth.supabase;
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money = v => v === null || v === undefined || v === '' ? 'Not set' : Number(v).toLocaleString('en-GB',{style:'currency',currency:'GBP'});

  // Replace the old MARK SOLD click path before it reaches the existing button handler.
  document.addEventListener('click', async event => {
    const button = event.target.closest?.('.mark-sold');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const form = button.closest('.channel-form');
    const channel = form?.dataset.channel || 'Sales channel';
    const listingId = button.dataset.id;
    const message = form?.querySelector('.channel-message');
    const soldPriceText = prompt('Actual sold price (£) — required:', '');
    if (soldPriceText === null) return;
    const soldPrice = Number(soldPriceText);
    if (!Number.isFinite(soldPrice) || soldPrice <= 0) {
      alert('A real sold price greater than £0 is required. The sale has not been recorded.');
      return;
    }
    const feesText = prompt('Selling fees (£):', '0');
    if (feesText === null) return;
    const shippingCostText = prompt('Shipping cost (£):', '0');
    if (shippingCostText === null) return;
    const carrier = prompt(`Shipping method / carrier for ${channel} — required:`, channel === 'eBay' ? 'eBay Delivery / Packlink' : '');
    if (carrier === null) return;
    if (!carrier.trim()) {
      alert('A shipping method / carrier is required before the sale can be finalized.');
      return;
    }
    const tracking = prompt('Tracking number (optional if not issued yet):', '');
    if (tracking === null) return;
    const labelUrl = prompt('Shipping label URL (optional — paste the label/order link if available):', '');
    if (labelUrl === null) return;
    const notes = prompt('Shipping notes (optional):', '');
    if (notes === null) return;

    const fees = Number(feesText || 0);
    const shippingCost = Number(shippingCostText || 0);
    if (!Number.isFinite(fees) || fees < 0 || !Number.isFinite(shippingCost) || shippingCost < 0) {
      alert('Selling fees and shipping cost must be zero or greater. The sale has not been recorded.');
      return;
    }

    button.disabled = true;
    if (message) { message.textContent = 'Finalizing sale and creating fulfilment record…'; message.className = 'form-message'; }
    const { error } = await db.rpc('staff_finalize_resale_sale', {
      p_listing_id: listingId,
      p_sold_price: soldPrice,
      p_selling_fees: fees,
      p_shipping_cost: shippingCost,
      p_carrier: carrier.trim(),
      p_tracking_number: tracking.trim() || null,
      p_label_url: labelUrl.trim() || null,
      p_notes: notes.trim() || null
    });
    if (error) {
      button.disabled = false;
      if (message) { message.textContent = error.message; message.className = 'form-message error'; }
      else alert(error.message);
      return;
    }
    if (message) { message.textContent = 'Sale finalized with a post-sale shipping record.'; message.className = 'form-message success'; }
    setTimeout(() => location.reload(), 450);
  }, true);

  async function decorateWorkflow() {
    const list = document.getElementById('sales-workflow-list');
    if (!list) return;
    const { data: assets, error: assetError } = await db.from('inventory_assets')
      .select('id,status,sku,manufacturer,model,sold_price,sold_channel,sold_listing_id')
      .in('status',['Sold','Sold - Awaiting Shipping','Sold - Shipped','Dispatched']);
    if (assetError) return;
    const ids = (assets || []).map(a => a.id);
    if (!ids.length) return;
    const { data: fulfilments } = await db.from('sales_fulfillments')
      .select('id,asset_id,listing_id,status,carrier,tracking_number,label_url,notes')
      .in('asset_id', ids);
    const assetMap = new Map((assets || []).map(a => [a.id,a]));
    const fulfilmentMap = new Map((fulfilments || []).map(f => [f.asset_id,f]));

    list.querySelectorAll('.sales-workflow-item').forEach(item => {
      if (item.querySelector('.sales-fulfilment-editor')) return;
      const productLink = item.querySelector('a[href^="inventory-detail.html?id="]');
      if (!productLink) return;
      const url = new URL(productLink.href, location.href);
      const assetId = url.searchParams.get('id');
      const asset = assetMap.get(assetId);
      if (!asset) return;
      const body = item.querySelector('.sales-workflow-body');
      if (!body) return;
      const existing = fulfilmentMap.get(assetId);
      const invalidSale = asset.status !== 'Sold - Shipped' && asset.status !== 'Dispatched' && Number(asset.sold_price || 0) <= 0;
      const awaiting = ['Sold','Sold - Awaiting Shipping'].includes(asset.status);
      if (!awaiting && !invalidSale) return;

      const panel = document.createElement('section');
      panel.className = 'sales-workflow-panel sales-fulfilment-editor';
      panel.style.cssText = 'margin-top:1rem;padding:1rem;border:2px solid #b06b00;background:#fff8e8;border-radius:8px';
      panel.innerHTML = `
        <h4>POST-SALE SHIPPING &amp; FULFILMENT</h4>
        ${invalidSale ? `<div style="padding:.75rem;background:#fff0f0;border:2px solid #b42318;color:#7f1d1d;margin-bottom:.85rem"><strong>INVALID SALE RECORD:</strong> this sale was saved without a valid sold price. Correct the actual sale price before the record can be treated as complete.</div>` : ''}
        ${asset.sold_channel ? `<p><strong>Sold through:</strong> ${esc(asset.sold_channel)} · <strong>Sold price:</strong> ${money(asset.sold_price)}</p>` : ''}
        ${existing ? `<p><strong>Fulfilment status:</strong> ${esc(existing.status)}${existing.tracking_number ? ` · <strong>Tracking:</strong> ${esc(existing.tracking_number)}` : ''}</p>` : '<p><strong>Fulfilment:</strong> No shipping record has been created yet.</p>'}
        <form class="sales-fulfilment-form" style="display:grid;gap:.7rem">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.7rem">
            ${invalidSale ? '<label>Actual sold price (£)<input name="sold_price" type="number" min="0.01" step="0.01" required></label>' : ''}
            <label>Shipping method / carrier<input name="carrier" value="${esc(existing?.carrier || '')}" placeholder="eBay Delivery / Packlink, Royal Mail, DPD…" required></label>
            <label>Tracking number<input name="tracking" value="${esc(existing?.tracking_number || '')}" placeholder="Add when issued"></label>
          </div>
          <label>Label / order URL<input name="label_url" type="url" value="${esc(existing?.label_url || '')}" placeholder="Paste the eBay label or order URL if applicable"></label>
          <label>Shipping notes<textarea name="notes" rows="3" placeholder="Optional fulfilment notes">${esc(existing?.notes || '')}</textarea></label>
          <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center">
            <button class="btn btn-primary" type="submit">${invalidSale ? 'CORRECT SALE PRICE &amp; SAVE SHIPPING' : existing ? 'UPDATE SHIPPING DETAILS' : 'CREATE SHIPPING RECORD'}</button>
            ${asset.sold_channel === 'eBay' ? '<a class="btn btn-secondary" href="https://www.ebay.co.uk/sh/landing" target="_blank" rel="noopener">OPEN EBAY SELLER HUB</a>' : ''}
            <span class="form-message fulfilment-message" aria-live="polite"></span>
          </div>
        </form>
      `;
      body.appendChild(panel);
      panel.querySelector('.sales-fulfilment-form').addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button');
        const message = form.querySelector('.fulfilment-message');
        const fd = new FormData(form);
        button.disabled = true;
        message.textContent = 'Saving…';
        message.className = 'form-message';
        let result;
        if (invalidSale) {
          const price = Number(fd.get('sold_price'));
          if (!Number.isFinite(price) || price <= 0) {
            message.textContent = 'Enter the actual sold price greater than £0.';
            message.className = 'form-message error';
            button.disabled = false;
            return;
          }
          result = await db.rpc('staff_correct_resale_sale_price', { p_listing_id: asset.sold_listing_id, p_sold_price: price, p_selling_fees: 0, p_shipping_cost: 0 });
          if (result.error) {
            message.textContent = result.error.message;
            message.className = 'form-message error';
            button.disabled = false;
            return;
          }
        }
        const carrier = String(fd.get('carrier') || '').trim();
        if (!carrier) {
          message.textContent = 'Shipping method / carrier is required.';
          message.className = 'form-message error';
          button.disabled = false;
          return;
        }
        const fulfilment = await db.rpc('staff_create_sales_fulfillment', {
          p_asset_id: assetId,
          p_listing_id: asset.sold_listing_id || null,
          p_carrier: carrier,
          p_tracking_number: String(fd.get('tracking') || '').trim() || null,
          p_label_url: String(fd.get('label_url') || '').trim() || null,
          p_notes: String(fd.get('notes') || '').trim() || null
        });
        if (fulfilment.error) {
          message.textContent = fulfilment.error.message;
          message.className = 'form-message error';
          button.disabled = false;
          return;
        }
        message.textContent = 'Shipping details saved.';
        message.className = 'form-message success';
        setTimeout(() => location.reload(), 400);
      });
    });
  }

  setTimeout(decorateWorkflow, 500);
  setTimeout(decorateWorkflow, 1200);
});
