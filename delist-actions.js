document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const db = auth.supabase;
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  async function closeListing(listingId, button) {
    if (!listingId) return;
    if (!window.confirm('Confirm that this marketplace listing has been closed/removed on the marketplace.')) return;
    button.disabled = true;
    button.textContent = 'CLOSING…';
    const { error } = await db.rpc('staff_close_resale_listing', { p_listing_id: listingId });
    if (error) {
      button.disabled = false;
      button.textContent = 'TRY AGAIN';
      button.classList.add('error');
      const msg = document.createElement('span');
      msg.className = 'form-message error';
      msg.textContent = error.message;
      button.parentElement.appendChild(msg);
      return;
    }
    button.textContent = 'LISTING CLOSED';
    button.style.background = '#18794e';
    button.style.borderColor = '#18794e';
    button.style.cursor = 'default';
    setTimeout(() => location.reload(), 500);
  }

  async function addWorkbenchCloseButtons() {
    const box = document.getElementById('readiness');
    if (!box) return;
    const session = await auth.getSession();
    if (!session) return;
    const { data: staff } = await db.from('staff_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (!staff) return;

    const delistForms = [...box.querySelectorAll('.channel-form[data-id]')].filter(form => {
      const article = form.closest('.sales-channel-block');
      return article && article.textContent.includes('DELIST REQUIRED');
    });
    delistForms.forEach(form => {
      if (form.querySelector('.delist-close-button')) return;
      const listingId = form.dataset.id;
      if (!listingId) return;
      const wrap = form.querySelector('.channel-message')?.parentElement;
      if (!wrap) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-primary delist-close-button';
      button.textContent = 'LISTING CLOSED';
      button.style.cssText = 'background:#b42318;border-color:#b42318;color:#fff;font-weight:900;box-shadow:0 4px 10px rgba(180,35,24,.25)';
      button.title = 'Confirm this marketplace listing has been closed. This clears the Delist Required warning.';
      button.addEventListener('click', () => closeListing(listingId, button));
      wrap.insertBefore(button, form.querySelector('.channel-message'));
    });

    const stats = box.querySelector('.dashboard-stats');
    if (!stats) return;
    const { data: delists } = await db.from('resale_listings').select('id').eq('status','Delist Required');
    const count = (delists || []).length;
    let notice = box.querySelector('#delist-live-summary');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'delist-live-summary';
      stats.insertAdjacentElement('afterend', notice);
    }
    notice.innerHTML = count
      ? `<div style="margin-top:.85rem;padding:.9rem 1rem;border:3px solid #b42318;background:#fff0f0;border-radius:8px;color:#7f1d1d;text-align:center;box-shadow:0 4px 12px rgba(180,35,24,.12)"><strong style="font-size:1.05rem;letter-spacing:.08em">${count} LIVE LISTING${count === 1 ? '' : 'S'} — DELIST REQUIRED</strong><br><span style="font-weight:800">These are excluded from the LIVE total until they are confirmed closed.</span></div>`
      : '';
  }

  async function renderSoldDelistActions() {
    const anchor = document.getElementById('delist-actions');
    if (!anchor) return;
    const session = await auth.getSession();
    if (!session) return;
    const { data: staff } = await db.from('staff_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (!staff) return;

    const [{ data: listings }, { data: assets }] = await Promise.all([
      db.from('resale_listings').select('id,asset_id,sales_channel,listing_reference,listing_url,status').eq('status','Delist Required').order('updated_at'),
      db.from('inventory_assets').select('id,manufacturer,model,transaction_number,asset_reference').in('status',['Sold','Returned'])
    ]);
    const rows = listings || [];
    if (!rows.length) { anchor.remove(); return; }
    const assetMap = new Map((assets || []).map(a => [a.id, a]));
    anchor.innerHTML = `<div style="font-size:.8rem;font-weight:900;letter-spacing:.12em;color:#b42318">URGENT — CLOSE OTHER MARKETPLACE LISTINGS</div><h2 style="margin:.3rem 0;color:#7f1d1d">${rows.length} LISTING${rows.length === 1 ? '' : 'S'} REQUIRE IMMEDIATE ACTION</h2><p style="margin:.25rem 0 .9rem;color:#5f1b18"><strong>A product has already sold.</strong> Close each remaining marketplace listing, then press <strong>LISTING CLOSED</strong> to clear its warning.</p><div style="display:grid;gap:.75rem">${rows.map(l => { const a = assetMap.get(l.asset_id); const name = a ? [a.manufacturer,a.model].filter(Boolean).join(' ') : 'Sold product'; return `<div style="background:#fff;border:2px solid #b42318;border-radius:8px;padding:.85rem;display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap"><div><strong style="color:#7f1d1d">${esc(name)}</strong><br>${esc(l.sales_channel || 'Sales channel')}${l.listing_reference ? ` · Ref ${esc(l.listing_reference)}` : ''}<br><small>${esc(a?.transaction_number || '')} ${a?.asset_reference ? `· ${esc(a.asset_reference)}` : ''}</small></div><div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">${l.listing_url ? `<a class="btn btn-primary" href="${esc(l.listing_url)}" target="_blank" rel="noopener" style="background:#b42318;border-color:#b42318;color:#fff;font-weight:900">OPEN LIVE LISTING</a>` : ''}<button type="button" class="btn btn-primary delist-close-button" data-listing-id="${esc(l.id)}" style="background:#b42318;border-color:#b42318;color:#fff;font-weight:900">LISTING CLOSED</button></div></div>`; }).join('')}</div>`;
    anchor.querySelectorAll('.delist-close-button').forEach(button => button.addEventListener('click', () => closeListing(button.dataset.listingId, button)));
  }

  if (document.getElementById('readiness')) {
    setTimeout(addWorkbenchCloseButtons, 150);
    setTimeout(addWorkbenchCloseButtons, 800);
  }
  if (document.getElementById('delist-actions')) {
    setTimeout(renderSoldDelistActions, 150);
    setTimeout(renderSoldDelistActions, 800);
  }
});
