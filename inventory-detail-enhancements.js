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

  async function load() {
    if (document.getElementById('inventory-comparison-panel')) return;
    const db = auth.supabase;
    const { data: asset, error } = await db.from('inventory_assets').select('*').eq('id', id).single();
    if (error || !asset) return;

    const panel = document.createElement('div');
    panel.id = 'inventory-comparison-panel';
    panel.className = 'valuation-card';
    panel.style.marginTop = '1rem';
    panel.innerHTML = `
      <h3>Customer Condition &amp; Package Comparison</h3>
      <p>Keep the original customer information for comparison. Staff can update the current condition and package as missing parts are sourced or replaced.</p>
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
        <label><input type="checkbox" name="missing_items_resolved" ${asset.missing_items_resolved ? 'checked' : ''}> Customer-reported missing items have been resolved / parts added</label>
        <label>What was added or changed<textarea name="missing_items_resolution" rows="4" placeholder="e.g. Added two batteries and original charger; package is now complete.">${esc(asset.missing_items_resolution || '')}</textarea></label>
        <button class="btn btn-primary" type="submit">SAVE PACKAGE / CONDITION UPDATE</button>
        <p id="inventory-completeness-message" class="form-message" aria-live="polite"></p>
      </form>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem">
        <a class="btn btn-primary" href="listing-readiness.html?id=${encodeURIComponent(id)}">SEND / MANAGE SALES CHANNELS</a>
        <a class="btn btn-secondary" href="sales-channels.html?asset=${encodeURIComponent(id)}">VIEW SALES CHANNELS</a>
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
  }

  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(load, 80);
  });
  observer.observe(root, { childList: true, subtree: true });
  setTimeout(load, 200);
});
