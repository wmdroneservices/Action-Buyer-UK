document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById('sale-details');
  const saleId = new URLSearchParams(location.search).get('id');
  if (!auth || !box || !saleId) return;

  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const display = v => (v === undefined || v === null || v === '') ? '—' : String(v);

  const { data: sale } = await auth.supabase.from('sales').select('id').eq('id', saleId).maybeSingle();
  if (!sale) return;

  const { data: saleItems } = await auth.supabase.from('sale_items').select('quote_item_id').eq('sale_id', saleId).order('created_at', { ascending: true });
  const ids = (saleItems || []).map(x => x.quote_item_id).filter(Boolean);
  if (!ids.length) return;

  const { data: items } = await auth.supabase.from('quote_items').select('id,item_name,model,manufacturer,package,item_data').in('id', ids).order('created_at', { ascending: true });
  if (!items?.length) return;

  const section = document.createElement('section');
  section.className = 'account-panel customer-submitted-evidence';
  section.innerHTML = `<div class="section-heading"><p class="section-kicker">CUSTOMER SUBMITTED ITEM DATA</p><h2>Serial number &amp; missing items</h2><p>This is the information originally submitted by the customer and must remain visible throughout the purchase workflow.</p></div>${items.map((item, index) => {
    const d = item.item_data && typeof item.item_data === 'object' ? item.item_data : {};
    const serial = d.serialNumber || d.droneSerial || d.droneSerialNumber || '';
    const missing = d.missingItems === true || d.missingItems === 'yes';
    const notes = d.exceptionNotes || d.exceptionNotesText || '';
    return `<div class="valuation-card" style="display:block;margin-bottom:1rem;"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem 1.5rem;"><div><strong>Item</strong><p>${esc(display(item.item_name || d.modelName || d.model || `Item ${index + 1}`))}</p></div><div><strong>Manufacturer</strong><p>${esc(display(item.manufacturer || d.manufacturerName || d.manufacturer))}</p></div><div><strong>Model</strong><p>${esc(display(item.model || d.modelName || d.model))}</p></div><div><strong>Package</strong><p>${esc(display(item.package || d.packageName || d.package))}</p></div><div><strong>Serial number</strong><p>${esc(display(serial))}</p></div><div><strong>Missing items</strong><p>${missing ? 'Yes' : 'No'}</p></div></div><div style="margin-top:1rem;"><strong>Missing items / exceptions notes</strong><textarea readonly rows="3" style="width:100%;box-sizing:border-box;margin-top:.4rem;resize:vertical;">${esc(notes || (missing ? 'Customer marked missing items but supplied no additional notes.' : 'No additional notes supplied.'))}</textarea></div></div>`;
  }).join('')}`;

  const removeRedundantPlaceholders = () => {
    const removable = ['Package contents', 'Additional accessories'];
    box.querySelectorAll('.account-panel, .valuation-card, .sale-accordion-content').forEach(root => {
      [...root.querySelectorAll('h2,h3,h4,strong,p,li')].forEach(el => {
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        if (removable.includes(text)) {
          const parent = el.closest('div,section,article') || el;
          const next = parent.nextElementSibling;
          parent.remove();
          if (next && /^(No package contents recorded\.|None recorded\.)$/.test(next.textContent.trim())) next.remove();
        }
      });
      [...root.querySelectorAll('p')].forEach(p => {
        if (p.textContent.trim() === 'No photographs stored against this quote.') {
          const previous = p.previousElementSibling;
          p.remove();
          if (previous && /^Photographs$/i.test(previous.textContent.trim())) previous.remove();
        }
      });
    });
  };

  const insert = () => {
    if (!box.querySelector('.customer-submitted-evidence')) {
      const target = [...box.querySelectorAll('h2')].find(h => h.textContent.trim() === 'Complete process')?.closest('.account-panel');
      if (target) target.before(section); else box.appendChild(section);
    }
    removeRedundantPlaceholders();
  };

  const observer = new MutationObserver(insert);
  observer.observe(box, { childList: true, subtree: true });
  insert();
});
