document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const db = auth.supabase;
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");

  async function activeStaff() {
    const session = await auth.getSession();
    if (!session) return null;
    const { data } = await db.from('staff_users').select('user_id,active').eq('user_id', session.user.id).maybeSingle();
    return data?.active ? data : null;
  }

  async function closeListing(listingId, button) {
    if (!listingId) return;
    if (!window.confirm('Confirm that this listing has already been removed or closed on the named sales channel. This only clears the GearCashOut warning; it does not close the marketplace listing for you.')) return;
    button.disabled = true;
    button.textContent = 'CONFIRMING…';
    const { error } = await db.rpc('staff_close_resale_listing', { p_listing_id: listingId });
    if (error) {
      button.disabled = false;
      button.textContent = 'TRY AGAIN';
      const msg = document.createElement('span');
      msg.className = 'form-message error';
      msg.textContent = error.message;
      button.parentElement.appendChild(msg);
      return;
    }
    button.textContent = 'LISTING CLOSED';
    button.style.background = '#18794e';
    button.style.borderColor = '#18794e';
    setTimeout(() => location.reload(), 450);
  }

  async function renderDelistActions() {
    const anchor = document.getElementById('delist-actions');
    if (!anchor) return;
    const staff = await activeStaff();
    if (!staff) {
      anchor.innerHTML = '<p>You do not have permission to access listing-closure actions.</p>';
      return;
    }

    const { data: rows, error } = await db
      .from('resale_listings')
      .select('id,asset_id,sales_channel,listing_reference,listing_title,listing_url,status,updated_at')
      .eq('status','Delist Required')
      .order('updated_at');

    if (error) {
      anchor.innerHTML = '<p>Could not load listing-closure actions.</p>';
      return;
    }
    if (!rows?.length) {
      anchor.innerHTML = '<div class="form-message success"><strong>NO LISTINGS CURRENTLY REQUIRE CLOSURE</strong><br>There are no outstanding duplicate-sale closure actions.</div>';
      return;
    }

    const assetIds = [...new Set(rows.map(x => x.asset_id).filter(Boolean))];
    const [{ data: assets }, { data: siblings }] = await Promise.all([
      assetIds.length ? db.from('inventory_assets').select('id,manufacturer,model,sku,asset_reference,status,sold_channel,sold_listing_id').in('id', assetIds) : Promise.resolve({ data: [] }),
      assetIds.length ? db.from('resale_listings').select('id,asset_id,sales_channel,listing_reference,listing_url,status,listing_title').in('asset_id', assetIds).order('sales_channel') : Promise.resolve({ data: [] })
    ]);

    const assetMap = new Map((assets || []).map(a => [a.id, a]));
    const siblingsByAsset = new Map();
    (siblings || []).forEach(l => {
      if (!siblingsByAsset.has(l.asset_id)) siblingsByAsset.set(l.asset_id, []);
      siblingsByAsset.get(l.asset_id).push(l);
    });

    anchor.innerHTML = `
      <section class="valuation-card" style="border:3px solid #b42318;background:#fff7f7">
        <div style="font-size:.8rem;font-weight:900;letter-spacing:.12em;color:#b42318">URGENT SALES ACTION</div>
        <h1 style="margin:.35rem 0;color:#7f1d1d">CLOSE OTHER MARKETPLACE LISTINGS</h1>
        <p style="margin:.25rem 0 1rem;color:#5f1b18">Each action below identifies the exact SKU, the listing that must be removed, and every other sales channel currently recorded against the same physical item.</p>
        <div style="display:grid;gap:1rem">
          ${rows.map(l => {
            const a = assetMap.get(l.asset_id) || {};
            const name = [a.manufacturer, a.model].filter(Boolean).join(' ') || l.listing_title || 'Product';
            const group = siblingsByAsset.get(l.asset_id) || [];
            const sold = group.find(x => x.id === a.sold_listing_id || x.status === 'Sold');
            const otherChannels = group.filter(x => x.id !== l.id);
            return `
              <article style="background:#fff;border:2px solid #b42318;border-radius:10px;padding:1rem">
                <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap">
                  <div>
                    <div style="font-size:.78rem;font-weight:900;letter-spacing:.1em;color:#b42318">LISTING TO CLOSE</div>
                    <h2 style="margin:.25rem 0;color:#102f4f">${esc(name)}</h2>
                    <div><strong>SKU:</strong> ${esc(a.sku || 'Not recorded')} &nbsp;·&nbsp; <strong>Asset:</strong> ${esc(a.asset_reference || 'Not recorded')}</div>
                    <div style="margin-top:.35rem"><strong>Close on:</strong> ${esc(l.sales_channel || 'Sales channel')} ${l.listing_reference ? ' · Ref ' + esc(l.listing_reference) : ''}</div>
                    <div style="margin-top:.35rem"><strong>Inventory status:</strong> ${esc(a.status || 'Not recorded')}</div>
                    ${sold ? `<div style="margin-top:.35rem;padding:.55rem .7rem;background:#eef8f1;border-left:4px solid #18794e"><strong>Sold through:</strong> ${esc(sold.sales_channel || 'Recorded sales channel')} ${sold.listing_reference ? ' · Ref ' + esc(sold.listing_reference) : ''}</div>` : '<div style="margin-top:.35rem;padding:.55rem .7rem;background:#fff4df;border-left:4px solid #e6a23c"><strong>Workflow check:</strong> this test/action has no recorded Sold sibling yet. The closure warning is still shown because this listing is marked Delist Required.</div>'}
                  </div>
                  <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                    <a class="btn btn-secondary" href="listing-readiness.html?id=${encodeURIComponent(l.asset_id)}">OPEN SALES WORKBENCH</a>
                    ${l.listing_url ? `<a class="btn btn-primary" href="${esc(l.listing_url)}" target="_blank" rel="noopener" style="background:#b42318;border-color:#b42318;color:#fff;font-weight:900">OPEN LIVE LISTING</a>` : '<span style="align-self:center;font-weight:800;color:#7f1d1d">No live URL recorded — close it manually on the named channel.</span>'}
                    <button type="button" class="btn btn-primary delist-close-button" data-listing-id="${esc(l.id)}" style="background:#b42318;border-color:#b42318;color:#fff;font-weight:900">CONFIRM LISTING CLOSED</button>
                  </div>
                </div>
                <div style="margin-top:1rem;padding-top:.8rem;border-top:1px solid #e4d1d1">
                  <strong>ALL CHANNELS FOR THIS SKU</strong>
                  <div style="display:grid;gap:.45rem;margin-top:.55rem">
                    ${group.map(x => `
                      <div style="display:flex;justify-content:space-between;gap:.75rem;align-items:center;flex-wrap:wrap;padding:.55rem .7rem;border:1px solid ${x.id===l.id ? '#b42318' : '#d7dce2'};border-radius:7px;background:${x.id===l.id ? '#fff1f1' : '#f8fafc'}">
                        <span><strong>${esc(x.sales_channel || 'Sales channel')}</strong>${x.listing_reference ? ' · ' + esc(x.listing_reference) : ''}</span>
                        <span style="font-weight:900">${esc(x.status || 'Not started')}</span>
                      </div>`).join('')}
                  </div>
                </div>
              </article>`;
          }).join('')}
        </div>
      </section>`;

    anchor.querySelectorAll('.delist-close-button').forEach(button => {
      button.addEventListener('click', () => closeListing(button.dataset.listingId, button));
    });
  }

  async function addWorkbenchCloseButtons() {
    const box = document.getElementById('readiness');
    if (!box || !(await activeStaff())) return;
    const forms = [...box.querySelectorAll('.channel-form[data-id]')].filter(form => form.closest('.sales-channel-block')?.textContent.includes('DELIST REQUIRED'));
    forms.forEach(form => {
      if (form.querySelector('.delist-close-button')) return;
      const listingId = form.dataset.id;
      if (!listingId) return;
      const wrap = form.querySelector('.channel-message')?.parentElement;
      if (!wrap) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-primary delist-close-button';
      button.textContent = 'CONFIRM LISTING CLOSED';
      button.style.cssText = 'background:#b42318;border-color:#b42318;color:#fff;font-weight:900';
      button.addEventListener('click', () => closeListing(listingId, button));
      wrap.insertBefore(button, form.querySelector('.channel-message'));
    });
  }

  if (document.getElementById('readiness')) {
    setTimeout(addWorkbenchCloseButtons, 150);
    setTimeout(addWorkbenchCloseButtons, 800);
  }
  if (document.getElementById('delist-actions')) await renderDelistActions();
});