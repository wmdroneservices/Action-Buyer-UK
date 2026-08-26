// GearCashOut - staff bank-details handoff
// Lets staff refresh customer bank details from the account and, when necessary, enter them manually.
document.addEventListener('DOMContentLoaded', () => {
  const auth = window.actionBuyerAuth;
  const details = document.getElementById('sale-details');
  if (!auth || !details) return;

  const saleId = new URLSearchParams(location.search).get('id');
  if (!saleId) return;
  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const maskAccount = value => value ? `XXXX${String(value).slice(-4)}` : '—';
  const maskSort = value => value ? `XX-XX-${String(value).slice(-2)}` : '—';

  const attach = async () => {
    if (details.querySelector('.staff-bank-details-handoff')) return;
    const { data: sale, error } = await auth.supabase.from('sales')
      .select('id,status,payment_status,bank_account_name,bank_sort_code,bank_account_number,bank_details_confirmed_at,user_id')
      .eq('id', saleId).maybeSingle();
    if (error || !sale) return;
    if (!['payment_due','paid','completed'].includes(String(sale.status || ''))) return;

    let saved = null;
    try {
      const { data } = await auth.supabase.rpc('staff_get_customer_saved_bank_details', { p_user_id: sale.user_id });
      saved = data || null;
    } catch (_) {}

    const complete = !!(sale.bank_account_name && sale.bank_sort_code && sale.bank_account_number && sale.bank_details_confirmed_at);
    const hasSaved = !!(saved?.account_name && saved?.sort_code && saved?.account_number);
    const panel = document.createElement('section');
    panel.className = 'account-panel staff-bank-details-handoff';
    panel.style.cssText = 'margin:1rem 0;padding:1rem;border-left:4px solid #d88732;background:#f8f6f1;';
    panel.innerHTML = `<div class="section-heading"><p class="section-kicker">PAYMENT DETAILS</p><h3>Bank details for this payment</h3><p>${complete ? 'Bank details are already attached to this sale.' : hasSaved ? 'The customer has bank details saved on their account. Refresh the sale from those details before confirming payment.' : 'No bank details are attached to this sale yet.'}</p></div>
      <div class="staff-bank-current" style="margin:.75rem 0;"><strong>Current sale details:</strong> ${complete ? `${esc(sale.bank_account_name)} · ${esc(maskSort(sale.bank_sort_code))} · ${esc(maskAccount(sale.bank_account_number))}` : 'Not recorded'}</div>
      <div class="navigation-buttons" style="display:flex;gap:.5rem;flex-wrap:wrap;">
        ${hasSaved && !complete ? '<button type="button" class="btn btn-primary staff-use-saved-bank">USE CUSTOMER SAVED DETAILS</button>' : ''}
        ${!complete ? '<button type="button" class="btn btn-secondary staff-enter-bank">ENTER BANK DETAILS</button>' : ''}
      </div>
      <div class="staff-bank-manual" hidden style="margin-top:1rem;"><form>
        <label>Account name<input name="account_name" type="text" autocomplete="off" required value="${esc(complete ? sale.bank_account_name : (saved?.account_name || ''))}"></label>
        <label>Sort code<input name="sort_code" type="text" inputmode="numeric" maxlength="8" placeholder="12-34-56" required value="${esc(complete ? sale.bank_sort_code : (saved?.sort_code || ''))}"></label>
        <label>Account number<input name="account_number" type="text" inputmode="numeric" maxlength="8" placeholder="12345678" required value="${esc(complete ? sale.bank_account_number : (saved?.account_number || ''))}"></label>
        <label style="display:flex;gap:.6rem;align-items:flex-start;margin-top:.75rem"><input name="storage_consent" type="checkbox" value="yes" style="width:auto;margin-top:.2rem" checked><span><strong>Customer has authorised retention for future payments</strong></span></label>
        <button class="btn btn-primary" type="submit">SAVE BANK DETAILS TO SALE</button>
      </form></div>
      <p class="staff-bank-message form-message" role="status" aria-live="polite"></p>`;

    const anchor = details.querySelector('#mark-payment-sent');
    if (anchor) anchor.closest('section, .account-panel, .valuation-card')?.insertBefore(panel, anchor.closest('section, .account-panel, .valuation-card')?.lastElementChild || null);
    else details.prepend(panel);

    const msg = panel.querySelector('.staff-bank-message');
    const refresh = () => window.setTimeout(() => window.location.reload(), 600);

    panel.querySelector('.staff-use-saved-bank')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      msg.textContent = 'Refreshing bank details from the customer account...';
      msg.className = 'staff-bank-message form-message';
      const { error } = await auth.supabase.rpc('staff_set_sale_bank_details', {
        p_sale_id: saleId,
        p_account_name: saved.account_name,
        p_sort_code: saved.sort_code,
        p_account_number: saved.account_number,
        p_storage_consent: true
      });
      if (error) { button.disabled = false; msg.textContent = error.message || 'Bank details could not be attached to this sale.'; msg.className = 'staff-bank-message form-message error'; return; }
      msg.textContent = 'Customer bank details attached to this sale.';
      msg.className = 'staff-bank-message form-message success';
      refresh();
    });

    panel.querySelector('.staff-enter-bank')?.addEventListener('click', () => {
      const form = panel.querySelector('.staff-bank-manual');
      form.hidden = !form.hidden;
    });

    panel.querySelector('.staff-bank-manual form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type=submit]');
      const data = new FormData(form);
      button.disabled = true;
      msg.textContent = 'Saving bank details to this sale...';
      msg.className = 'staff-bank-message form-message';
      const { error } = await auth.supabase.rpc('staff_set_sale_bank_details', {
        p_sale_id: saleId,
        p_account_name: data.get('account_name'),
        p_sort_code: data.get('sort_code'),
        p_account_number: data.get('account_number'),
        p_storage_consent: data.get('storage_consent') === 'yes'
      });
      if (error) { button.disabled = false; msg.textContent = error.message || 'Bank details could not be saved.'; msg.className = 'staff-bank-message form-message error'; return; }
      msg.textContent = 'Bank details saved to this sale.';
      msg.className = 'staff-bank-message form-message success';
      refresh();
    });
  };

  const observer = new MutationObserver(() => attach());
  observer.observe(details, { childList: true, subtree: true });
  attach();
});
