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

  async function load() {
    if (document.getElementById('inventory-comparison-panel')) return;
    const db = auth.supabase;
    const [{ data: asset, error }, { data: expenses }] = await Promise.all([
      db.from('inventory_assets').select('*').eq('id', id).single(),
      db.from('inventory_expenses').select('*').eq('asset_id', id).order('incurred_at',{ascending:false})
    ]);
    if (error || !asset) return;

    const panel = document.createElement('div');
    panel.id = 'inventory-comparison-panel';
    panel.className = 'valuation-card';
    panel.style.marginTop = '1rem';
    panel.innerHTML = `
      <h3>Customer Condition &amp; Package Comparison</h3>
      <p>The original customer information is retained separately from the staff assessment. Update the package record here when missing or replacement items are dealt with.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem">
        <div class="notice"><strong>Customer condition</strong><br>${esc(labelCondition(asset.customer_condition))}</div>
        <div class="notice"><strong>Current staff condition</strong><br>${esc(labelCondition(asset.condition_grade))}</div>
        <div class="notice"><strong>Customer package</strong><br>${esc(asset.customer_package_name || 'Not recorded')}</div>
        <div class="notice"><strong>Current package</strong><br>${esc(asset.package_name || 'Not recorded')}</div>
      </div>
      <div style="margin-top:1rem">
        <p><strong>Customer reported missing items:</strong> ${asset.customer_missing_items ? 'Yes' : 'No'}</p>
        ${asset.customer_missing_items ? `<p><strong>Customer missing-item details:</strong> ${esc(asset.customer_missing_items_details || 'No details recorded')}</p>` : ''}
      </div>
      <form id="inventory-completeness-form" class="auth-form" style="margin-top:1rem">
        <label><input type="checkbox" name="missing_items_resolved" ${asset.missing_items_resolved ? 'checked' : ''}> Customer-reported missing items have been resolved / replacement parts added</label>
        <label>Items added / replaced<textarea name="items_added_replaced" rows="3" placeholder="e.g. Added two batteries and original charger.">${esc(asset.items_added_replaced || '')}</textarea></label>
        <label>Final package contents<textarea name="final_package_contents" rows="5" placeholder="Record the complete contents that will be sold with this item.">${esc(asset.final_package_contents || '')}</textarea></label>
        <label>Package notes<textarea name="package_notes" rows="4" placeholder="Any notes about replacements, substitutions or package condition.">${esc(asset.package_notes || '')}</textarea></label>
        <label>Resolution / preparation record<textarea name="missing_items_resolution" rows="4" placeholder="e.g. Customer reported missing battery and charger; replacements added from stock.">${esc(asset.missing_items_resolution || '')}</textarea></label>
        <button class="btn btn-primary" type="submit">SAVE PACKAGE / CONDITION UPDATE</button>
        <p id="inventory-completeness-message" class="form-message" aria-live="polite"></p>
      </form>

      <div class="valuation-card" style="margin-top:1rem">
        <h3>Inventory Costs</h3>
        <p>All additional costs remain attached to this asset and feed the existing profit/loss calculation.</p>
        <div id="inventory-expense-list">${(expenses || []).length ? `<ul>${expenses.map(x => `<li><strong>${esc(x.category || 'Other')}</strong> — ${money(x.amount)}${x.description ? ` — ${esc(x.description)}` : ''}</li>`).join('')}</ul><p><strong>Total additional costs: ${money((expenses || []).reduce((s,x)=>s+Number(x.amount||0),0))}</strong></p>` : '<p>No additional costs recorded.</p>'}</div>
        <form id="inventory-expense-form" class="auth-form" style="margin-top:1rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.75rem;align-items:end">
          <label>Cost category<select name="category"><option>Repair</option><option>Parts</option><option>Accessories</option><option>Cleaning</option><option>Packaging</option><option>Listing</option><option>Shipping</option><option>Other</option></select></label>
          <label>Amount<input name="amount" type="number" min="0" step="0.01" required></label>
          <label>Description<input name="description" placeholder="What was the cost for?"></label>
          <button class="btn btn-secondary" type="submit">ADD COST</button>
          <p id="inventory-expense-message" class="form-message" aria-live="polite"></p>
        </form>
      </div>

      <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem">
        <a class="btn btn-primary" href="listing-readiness.html?id=${encodeURIComponent(id)}">SEND / MANAGE SALES CHANNELS</a>
        <a class="btn btn-secondary" href="inventory-sales.html?asset=${encodeURIComponent(id)}">VIEW SALES CHANNELS</a>
        <a class="btn btn-secondary" href="inventory-finance.html">VIEW PROFIT &amp; LOSS</a>
      </div>`;

    const editForm = root.querySelector('#asset-edit-form');
    if (editForm) editForm.parentElement.insertAdjacentElement('afterend', panel);
    else root.prepend(panel);

    panel.querySelector('#inventory-completeness-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button');
      const message = form.querySelector('#inventory-completeness-message');
      const fd = new FormData(form);
      button.disabled = true;
      message.textContent = 'Saving package update…';
      message.className = 'form-message';
      const { error: saveError } = await db.from('inventory_assets').update({
        missing_items_resolved: fd.get('missing_items_resolved') === 'on',
        missing_items_resolution: String(fd.get('missing_items_resolution') || '').trim() || null,
        items_added_replaced: String(fd.get('items_added_replaced') || '').trim() || null,
        final_package_contents: String(fd.get('final_package_contents') || '').trim() || null,
        package_notes: String(fd.get('package_notes') || '').trim() || null,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (saveError) {
        message.textContent = saveError.message;
        message.className = 'form-message error';
        button.disabled = false;
        return;
      }
      message.textContent = 'Package / condition update saved.';
      message.className = 'form-message success';
      button.disabled = false;
    });

    panel.querySelector('#inventory-expense-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button');
      const message = form.querySelector('#inventory-expense-message');
      const fd = new FormData(form);
      const amount = Number(fd.get('amount'));
      if (!Number.isFinite(amount) || amount < 0) {
        message.textContent = 'Enter a valid non-negative amount.';
        message.className = 'form-message error';
        return;
      }
      button.disabled = true;
      message.textContent = 'Saving cost…';
      message.className = 'form-message';
      const { error: saveError } = await db.from('inventory_expenses').insert({
        asset_id: id,
        category: String(fd.get('category') || 'Other'),
        amount,
        description: String(fd.get('description') || '').trim() || null,
        incurred_at: new Date().toISOString()
      });
      if (saveError) {
        message.textContent = saveError.message;
        message.className = 'form-message error';
        button.disabled = false;
        return;
      }
      message.textContent = 'Cost added to this asset.';
      message.className = 'form-message success';
      button.disabled = false;
      setTimeout(() => load(), 150);
    });
  }

  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(load, 80);
  });
  observer.observe(root, { childList: true, subtree: true });
  setTimeout(load, 200);
});
