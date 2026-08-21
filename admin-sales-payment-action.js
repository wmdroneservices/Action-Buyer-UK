// GearCashOut - staff payment confirmation UI
// The database RPC remains authoritative: payment + inventory creation happen together.
document.addEventListener('DOMContentLoaded', () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;

  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const attachButtons = () => {
    document.querySelectorAll('#sales-list article.valuation-card').forEach(article => {
      if (article.querySelector('.confirm-seller-payment')) return;
      const alert = article.querySelector('.payment-due-alert');
      const fullSale = article.querySelector('a[href^="admin-sale.html?id="]');
      if (!alert || !fullSale) return;

      const saleId = new URL(fullSale.href, location.href).searchParams.get('id');
      if (!saleId) return;

      const reference = fullSale.textContent.trim();
      const amountText = alert.textContent.match(/£[0-9,]+(?:\.\d{2})?/)?.[0] || '';
      const wrap = document.createElement('div');
      wrap.className = 'payment-confirmation';
      wrap.style.cssText = 'margin:12px 0;padding:12px;border:1px solid #ddd;border-radius:4px;';
      wrap.innerHTML = `<p><strong>Seller payment confirmation</strong></p><p>Confirm that ${esc(amountText)} has actually been paid to the customer before continuing.</p><label>Payment reference <span class="optional">(recommended)</span><input class="seller-payment-reference" type="text" maxlength="120" placeholder="Bank reference / transaction ID"></label><button class="btn btn-primary confirm-seller-payment" type="button">CONFIRM PAYMENT &amp; CREATE INVENTORY</button><p class="payment-confirmation-message form-message" role="status" aria-live="polite"></p>`;
      alert.insertAdjacentElement('afterend', wrap);

      wrap.querySelector('button').addEventListener('click', async event => {
        const button = event.currentTarget;
        const message = wrap.querySelector('.payment-confirmation-message');
        const paymentReference = wrap.querySelector('.seller-payment-reference').value.trim() || null;
        if (!confirm(`Confirm that payment for ${reference} has actually been sent${amountText ? ` (${amountText})` : ''}? This will mark the sale paid and create the inventory asset.`)) return;
        button.disabled = true;
        message.textContent = 'Confirming payment and creating inventory…';
        message.className = 'payment-confirmation-message form-message';
        try {
          const { data, error } = await auth.supabase.rpc('staff_mark_sale_paid_and_create_inventory', {
            p_sale_id: saleId,
            p_payment_reference: paymentReference
          });
          if (error) throw new Error(error.message || 'Payment could not be confirmed.');
          const result = Array.isArray(data) ? data[0] : data;
          message.textContent = result?.inventory_asset_id ? `Payment confirmed. Inventory asset ${result.inventory_asset_id} created.` : 'Payment confirmed and inventory creation completed.';
          message.className = 'payment-confirmation-message form-message success';
          setTimeout(() => location.reload(), 700);
        } catch (error) {
          message.textContent = error?.message || 'Payment could not be confirmed.';
          message.className = 'payment-confirmation-message form-message error';
          button.disabled = false;
        }
      });
    });
  };

  const observer = new MutationObserver(attachButtons);
  const list = document.getElementById('sales-list');
  if (list) observer.observe(list, { childList: true, subtree: true });
  attachButtons();
});
