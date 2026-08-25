document.addEventListener('DOMContentLoaded', () => {
  const auth = window.actionBuyerAuth;
  const root = document.getElementById('asset-detail');
  if (!auth || !root) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return;

  const conditions = {
    'factory-sealed': 'Factory Sealed / Unopened',
    'opened-unused': 'Opened but Unused',
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    damaged: 'Damaged',
    'not-working': 'Not Working / Spares Only'
  };
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const labelCondition = v => conditions[String(v || '').toLowerCase()] || v || 'Not recorded';
  const money = v => Number(v || 0).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  const categories = ['Repair','Parts','Accessories','Cleaning','Packaging','Listing','Shipping','Other'];

  function lockStaffCondition() {
    const form = root.querySelector('#asset-edit-form');
    if (!form) return;
    const select = form.querySelector('select[name="condition_grade"]');
    if (!select) return;
    const value = select.value || '';
    select.disabled = true;
    select.title = 'Staff condition is recorded by the inspection workflow and cannot be edited here.';
    let hidden = form.querySelector('input[data-locked-staff-condition]');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'condition_grade';
      hidden.dataset.lockedStaffCondition = 'true';
      select.insertAdjacentElement('afterend', hidden);
    }
    hidden.value = value;
    const label = select.closest('label');
    if (label && !label.querySelector('.condition-lock-note')) {
      const note = document.createElement('small');
      note.className = 'condition-lock-note';
      note.textContent = 'Recorded by staff during inspection. Edit it from the inspection record.';
      label.appendChild(note);
    }
  }

  async function load() {
    if (document.getElementById('inventory-comparison-panel')) return;
    const db = auth.supabase;
    const [{ data: asset, error }, { data: expenses }] = await Promise.all([
      db.from('inventory_assets').select('*').eq('id', id).single(),
      db.from('inventory_expenses').select('*').eq('asset_id', id).order('incurred_at',{ascending:false})
    ]);
    if (error || !asset) return;

    const expenseRows = expenses || [];
    const expenseTotal = expenseRows.reduce((s,x)=>s+Number(x.amount||0),0);
    const expenseHtml = expenseRows.length
      ? `<div style="display:grid;gap:.75rem">${expenseRows.map(x=>`<form class="expense-edit notice" data-expense-id="${esc(x.id)}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem;align-items:end"><label>Category<select name="category">${categories.map(c=>`<option ${x.category===c?'selected':''}>${c}</option>`).join('')}</select></label><label>Amount<input name="amount" type="number" min="0" step="0.01" value="${esc(x.amount)}" required></label><label>Description<input name="description" value="${esc(x.description||'')}"></label><button class="btn btn-secondary" type="submit">SAVE COST</button><p class="form-message expense-edit-message" aria-live="polite"></p></form>`).join('')}</div><p style="margin-top:1rem"><strong>Total additional costs: ${money(expenseTotal)}</strong></p>`
      : '<p>No additional costs recorded.</p>';

    const panel = document.createElement('div');
    panel.id = 'inventory-comparison-panel';
    panel.className = 'valuation-card';
    panel.style.marginTop = '1rem';
    const canSend = asset.status === 'Ready for Resale';
    panel.innerHTML = `
      <h3>Customer Condition &amp; Package Comparison</h3>
      <p>The customer condition is a purchase record and is not editable by staff. Staff condition is recorded during inspection. Package changes, repairs and replacement items are recorded separately.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem">
        <div class="notice"><strong>Customer condition</strong><br>${esc(labelCondition(asset.customer_condition))}<br><small>Purchase record — locked</small></div>
        <div class="notice"><strong>Staff condition</strong><br>${esc(labelCondition(asset.condition_grade))}<br><small>Inspection record</small></div>
        <div class="notice"><strong>Customer package</strong><br>${esc(asset.customer_package_name || 'Not recorded')}</div>
        <div class="notice"><strong>Current package</strong><br>${esc(asset.package_name || 'Not recorded')}</div>
      </div>
      <div style="margin-top:1rem">
        <p><strong>Customer reported missing items:</strong> ${asset.customer_missing_items ? 'Yes' : 'No'}</p>
        ${asset.customer_missing_items ? `<p><strong>Customer missing-item details:</strong> ${esc(asset.customer_missing_items_details || 'No details recorded')}</p>` : ''}
        <p><strong>Customer reported damage:</strong> ${asset.customer_damage ? 'Yes' : 'No'}</p>
      </div>
      <form id="inventory-completeness-form" class="auth-form" style="margin-top:1rem">
        <label><input type="checkbox" name="missing_items_resolved" ${asset.missing_items_resolved ? 'checked' : ''}> Customer-reported missing items have been resolved / replacement parts added</label>
        <label>Items added / replaced<textarea name="items_added_replaced" rows="3" placeholder="e.g. Added two batteries and original charger.">${esc(asset.items_added_replaced || '')}</textarea></label>
        <label>Final package contents<textarea name="final_package_contents" rows="5" placeholder="Record the complete contents that will be sold with this item.">${esc(asset.final_package_contents || '')}</textarea></label>
        <label>Package notes<textarea name="package_notes" rows="4" placeholder="Replacement, substitution or package notes.">${esc(asset.package_notes || '')}</textarea></label>
        <label>Resolution / repair record<textarea name="missing_items_resolution" rows="4" placeholder="Record how missing items were resolved or repairs completed.">${esc(asset.missing_items_resolution || '')}</textarea></label>
        <button class="btn btn-primary" type="submit">SAVE PACKAGE / REPAIR UPDATE</button>
        <p id="inventory-completeness-message" class="form-message" aria-live="polite"></p>
      </form>

      <div class="valuation-card" style="margin-top:1rem">
        <h3>Send to Sales</h3>
        ${canSend ? `<p><strong>Ready for the Sales workflow.</strong> This action removes the item from Purchase Inventory and makes it available to the Sales Channels workspace.</p><div class="notice"><strong>Gate checks</strong><ul><li>Inspection and technical testing must have passed.</li><li>Staff condition must be recorded during inspection.</li><li>Customer-reported missing items must be resolved.</li></ul></div><button id="send-to-sales-button" class="btn btn-primary" type="button">SEND TO SALES</button>` : `<p>Current status: <strong>${esc(asset.status)}</strong></p><p>${asset.status === 'Sent to Sales' || ['Listed','Reserved'].includes(asset.status) ? 'This item has already left Purchase Inventory and is in the Sales workflow.' : 'Complete the inspection/testing workflow before sending this item to Sales.'}</p>`}
        <p id="send-to-sales-message" class="form-message" aria-live="polite"></p>
      </div>

      <div class="valuation-card" style="margin-top:1rem">
        <h3>Inventory Costs</h3>
        <p>Repair, replacement, accessories, cleaning, packaging, listing and other costs remain attached to this asset and feed the existing profit/loss calculation.</p>
        <div id="inventory-expense-list">${expenseHtml}</div>
        <form id="inventory-expense-form" class="auth-form" style="margin-top:1rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.75rem;align-items:end">
          <label>Cost category<select name="category">${categories.map(c=>`<option>${c}</option>`).join('')}</select></label>
          <label>Amount<input name="amount" type="number" min="0" step="0.01" required></label>
          <label>Description<input name="description" placeholder="What was the cost for?"></label>
          <button class="btn btn-secondary" type="submit">ADD COST</button>
          <p id="inventory-expense-message" class="form-message" aria-live="polite"></p>
        </form>
      </div>

      <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem">
        <a class="btn btn-secondary" href="inventory-sales.html?asset=${encodeURIComponent(id)}">VIEW SALES CHANNELS</a>
        <a class="btn btn-secondary" href="inventory-finance.html">VIEW PROFIT &amp; LOSS</a>
        <a class="btn btn-secondary" href="sold-items.html">SOLD ITEMS</a>
      </div>`;

    const editForm = root.querySelector('#asset-edit-form');
    if (editForm) editForm.parentElement.insertAdjacentElement('afterend', panel);
    else root.prepend(panel);

    lockStaffCondition();

    panel.querySelector('#inventory-completeness-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget, button = form.querySelector('button'), message = form.querySelector('#inventory-completeness-message'), fd = new FormData(form);
      button.disabled = true; message.textContent = 'Saving package / repair update…'; message.className = 'form-message';
      const { error: saveError } = await db.from('inventory_assets').update({
        missing_items_resolved: fd.get('missing_items_resolved') === 'on',
        missing_items_resolution: String(fd.get('missing_items_resolution') || '').trim() || null,
        items_added_replaced: String(fd.get('items_added_replaced') || '').trim() || null,
        final_package_contents: String(fd.get('final_package_contents') || '').trim() || null,
        package_notes: String(fd.get('package_notes') || '').trim() || null,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (saveError) { message.textContent = saveError.message; message.className = 'form-message error'; button.disabled = false; return; }
      message.textContent = 'Package / repair update saved.'; message.className = 'form-message success'; button.disabled = false;
    });

    const sendButton = panel.querySelector('#send-to-sales-button');
    if (sendButton) sendButton.addEventListener('click', async () => {
      const message = panel.querySelector('#send-to-sales-message');
      sendButton.disabled = true; message.textContent = 'Checking inspection and testing, then sending to Sales…'; message.className = 'form-message';
      const { data, error: sendError } = await db.rpc('staff_send_inventory_to_sales', { p_asset_id: id });
      if (sendError) { message.textContent = sendError.message; message.className = 'form-message error'; sendButton.disabled = false; return; }
      message.textContent = `Sent to Sales. Transaction ${data?.transaction_number || ''} has been removed from Purchase Inventory.`; message.className = 'form-message success';
      setTimeout(() => location.reload(), 500);
    });

    panel.querySelectorAll('.expense-edit').forEach(form => form.addEventListener('submit', async event => {
      event.preventDefault();
      const fd = new FormData(form), message = form.querySelector('.expense-edit-message'), button = form.querySelector('button'), amount = Number(fd.get('amount'));
      if (!Number.isFinite(amount) || amount < 0) { message.textContent = 'Enter a valid non-negative amount.'; message.className = 'form-message error'; return; }
      button.disabled = true; message.textContent = 'Saving cost…'; message.className = 'form-message';
      const { error: saveError } = await db.from('inventory_expenses').update({ category:String(fd.get('category')||'Other'), amount, description:String(fd.get('description')||'').trim()||null }).eq('id', form.dataset.expenseId);
      if (saveError) { message.textContent = saveError.message; message.className = 'form-message error'; button.disabled = false; return; }
      message.textContent = 'Cost updated.'; message.className = 'form-message success'; button.disabled = false;
    }));

    panel.querySelector('#inventory-expense-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget, button = form.querySelector('button'), message = form.querySelector('#inventory-expense-message'), fd = new FormData(form), amount = Number(fd.get('amount'));
      if (!Number.isFinite(amount) || amount < 0) { message.textContent = 'Enter a valid non-negative amount.'; message.className = 'form-message error'; return; }
      button.disabled = true; message.textContent = 'Saving cost…'; message.className = 'form-message';
      const { error: saveError } = await db.from('inventory_expenses').insert({asset_id:id,category:String(fd.get('category')||'Other'),amount,description:String(fd.get('description')||'').trim()||null,incurred_at:new Date().toISOString()});
      if (saveError) { message.textContent = saveError.message; message.className = 'form-message error'; button.disabled = false; return; }
      message.textContent = 'Cost added to this asset.'; message.className = 'form-message success'; button.disabled = false;
      setTimeout(() => location.reload(), 400);
    });
  }

  let timer;
  const observer = new MutationObserver(() => {
    lockStaffCondition();
    clearTimeout(timer);
    timer = setTimeout(load, 80);
  });
  observer.observe(root, { childList: true, subtree: true });
  setTimeout(() => { lockStaffCondition(); load(); }, 200);
});
