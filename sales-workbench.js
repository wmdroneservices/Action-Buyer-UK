document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById('readiness');
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) { location.href = 'login.html?return=listing-readiness.html'; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from('staff_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = '<p>You do not have permission to access Sales.</p>'; return; }

  const id = new URLSearchParams(location.search).get('id');
  if (!id) { box.innerHTML = '<p>No product selected.</p>'; return; }

  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money = v => v === null || v === undefined || v === '' ? 'Not set' : Number(v).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  const channels = ['eBay','Facebook Marketplace','Vinted','Amazon','Website','Marketplace','Central','Other'];
  const statuses = ['Draft','Ready For Listing','Published','Reserved','Sold','Cancelled','Delist Required'];
  const statusLabel = status => ({Draft:'DRAFT', 'Ready For Listing':'READY TO UPLOAD', Published:'LIVE', Reserved:'RESERVED', Sold:'SOLD', Cancelled:'CANCELLED', 'Delist Required':'DELIST REQUIRED'}[status] || status || 'NOT STARTED');
  const statusClass = status => ({Draft:'info', 'Ready For Listing':'action', Published:'success', Reserved:'success', Sold:'success', Cancelled:'muted', 'Delist Required':'warning'}[status] || 'muted');

  const load = async () => {
    box.innerHTML = '<p>Loading sales workbench…</p>';
    const [{ data: asset, error: assetError }, { data: listings, error: listingsError }] = await Promise.all([
      db.from('inventory_assets').select('*').eq('id', id).single(),
      db.from('resale_listings').select('*').eq('asset_id', id).order('sales_channel')
    ]);
    if (assetError || !asset) { box.innerHTML = '<p>Product could not be found.</p>'; return; }
    if (listingsError) { box.innerHTML = `<p>Could not load sales channels: ${esc(listingsError.message)}</p>`; return; }

    const rows = listings || [];
    const map = new Map(rows.map(row => [row.sales_channel, row]));
    const titleDefault = [asset.manufacturer, asset.model].filter(Boolean).join(' ');
    const descriptionDefault = asset.description || [
      titleDefault,
      asset.package_name ? `Package: ${asset.package_name}` : '',
      asset.condition_grade ? `Condition: ${asset.condition_grade}` : '',
      asset.final_package_contents ? `Package contents: ${asset.final_package_contents}` : '',
      asset.actual_battery_count != null ? `Batteries included: ${asset.actual_battery_count}` : ''
    ].filter(Boolean).join('\n\n');
    const liveCount = rows.filter(x => ['Published','Reserved'].includes(x.status)).length;
    const readyCount = rows.filter(x => x.status === 'Ready For Listing').length;
    const draftCount = rows.filter(x => x.status === 'Draft').length;

    box.innerHTML = `
      <section class="valuation-card">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap">
          <div>
            <p class="section-kicker">SALES WORKBENCH</p>
            <h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(' ') || 'Product')}</h2>
            <p>Asset ${esc(asset.asset_reference)} · Transaction ${esc(asset.transaction_number || 'Not recorded')}</p>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <a class="btn btn-secondary" href="inventory-sales.html">BACK TO SALES</a>
            <a class="btn btn-secondary" href="inventory-detail.html?id=${encodeURIComponent(id)}">PRODUCT WORKBENCH</a>
          </div>
        </div>
        <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem">
          <div class="notice"><strong>${draftCount}</strong><br>DRAFT</div>
          <div class="notice"><strong>${readyCount}</strong><br>READY TO UPLOAD</div>
          <div class="notice"><strong>${liveCount}</strong><br>LIVE / RESERVED</div>
        </div>
      </section>

      <section class="valuation-card" style="margin-top:1rem">
        <h2>Product sales information</h2>
        <p>This is the sales version of the product. The original customer quote remains unchanged in Inventory.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem">
          <div class="notice"><strong>Condition</strong><br>${esc(asset.condition_grade || 'Not recorded')}</div>
          <div class="notice"><strong>Package</strong><br>${esc(asset.package_name || 'Not recorded')}</div>
          <div class="notice"><strong>Package contents</strong><br>${esc(asset.final_package_contents || 'Not recorded')}</div>
          <div class="notice"><strong>Approved price</strong><br>${money(asset.approved_resale_price)}</div>
        </div>
        <form id="master-form" class="auth-form" style="margin-top:1rem">
          <label>Sales title<input name="title" value="${esc(asset.listing_title || titleDefault)}" placeholder="Clear product title"></label>
          <label>Master sales description<textarea name="description" rows="7" placeholder="Clean description staff can copy into marketplaces.">${esc(descriptionDefault)}</textarea></label>
          <button class="btn btn-secondary" type="submit">SAVE SALES INFORMATION</button>
          <p id="master-message" class="form-message" aria-live="polite"></p>
        </form>
      </section>

      <section class="valuation-card" style="margin-top:1rem">
        <h2>Sales channels</h2>
        <p>Each channel is a separate block. Create a draft, edit it, mark it <strong>Ready to Upload</strong>, then add the live link after publishing.</p>
        <div style="display:grid;gap:1rem;margin-top:1rem">
          ${channels.map(channel => {
            const row = map.get(channel) || {};
            const title = row.listing_title || asset.listing_title || titleDefault;
            const description = row.listing_description || descriptionDefault;
            const isNew = !row.id;
            const readyFields = Boolean(title.trim()) && Boolean(description.trim()) && row.asking_price !== null && row.asking_price !== undefined && row.asking_price !== '';
            return `
              <article class="sales-channel-block" style="border:1px solid #d7dce2;border-radius:10px;padding:1rem;background:#fff">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:.75rem">
                  <div><h3 style="margin:0">${esc(channel)}</h3><small>${isNew ? 'Not started' : 'Listing saved'}</small></div>
                  <span class="notice" style="padding:.35rem .65rem"><strong>${esc(statusLabel(row.status))}</strong></span>
                </div>
                <form class="channel-form" data-id="${esc(row.id || '')}" data-channel="${esc(channel)}">
                  <div style="display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(130px,.45fr) minmax(130px,.45fr);gap:.75rem">
                    <label>Listing title<input name="listing_title" value="${esc(title)}" required></label>
                    <label>Sale price<input name="asking_price" type="number" min="0" step="0.01" value="${esc(row.asking_price ?? asset.approved_resale_price ?? '')}" required></label>
                    <label>P&amp;P<input name="shipping_cost" type="number" min="0" step="0.01" value="${esc(row.shipping_cost ?? '')}" placeholder="0.00"></label>
                  </div>
                  <label style="display:block;margin-top:.75rem">Listing description<textarea name="listing_description" rows="6" required>${esc(description)}</textarea></label>
                  <div style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(220px,1fr);gap:.75rem;margin-top:.75rem">
                    <label>Marketplace listing reference<input name="listing_reference" value="${esc(row.listing_reference || '')}" placeholder="Optional item/listing ID"></label>
                    <label>Live listing link<input name="listing_url" type="url" value="${esc(row.listing_url || '')}" placeholder="Add after the listing is published"></label>
                  </div>
                  <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.75rem">
                    <button class="btn btn-primary" type="submit">${isNew ? 'SAVE DRAFT' : 'SAVE CHANGES'}</button>
                    ${row.id && row.status !== 'Published' && row.status !== 'Reserved' && row.status !== 'Sold' ? `<button class="btn btn-secondary ready-button" type="button" data-id="${esc(row.id)}" ${readyFields ? '' : 'disabled title="Add title, description and sale price first"'}>READY TO UPLOAD</button>` : ''}
                    ${row.listing_url ? `<a class="btn btn-secondary" href="${esc(row.listing_url)}" target="_blank" rel="noopener">VIEW LIVE LISTING</a>` : ''}
                    ${row.id && row.status !== 'Sold' && row.status !== 'Cancelled' ? `<button class="btn btn-secondary mark-sold" type="button" data-id="${esc(row.id)}">MARK SOLD</button>` : ''}
                    <span class="form-message channel-message" aria-live="polite"></span>
                  </div>
                </form>
              </article>`;
          }).join('')}
        </div>
      </section>`;

    box.querySelector('#master-form').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.currentTarget;
      const button = form.querySelector('button');
      const message = box.querySelector('#master-message');
      button.disabled = true;
      const fd = new FormData(form);
      const { error } = await db.from('inventory_assets').update({ description: String(fd.get('description') || '').trim() || null, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) { message.textContent = error.message; message.className = 'form-message error'; button.disabled = false; return; }
      message.textContent = 'Sales information saved.';
      message.className = 'form-message success';
      button.disabled = false;
    });

    box.querySelectorAll('.channel-form').forEach(form => form.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const message = form.querySelector('.channel-message');
      const button = form.querySelector('button[type="submit"]');
      const listingId = form.dataset.id || null;
      if (!['Sent to Sales','Listed','Reserved'].includes(asset.status)) {
        message.textContent = 'This product must be sent to Sales from Inventory first.';
        message.className = 'form-message error';
        return;
      }
      button.disabled = true;
      message.textContent = 'Saving…';
      message.className = 'form-message';
      const priceValue = String(fd.get('asking_price') || '').trim();
      const shippingValue = String(fd.get('shipping_cost') || '').trim();
      const payload = {
        asset_id: id,
        sales_channel: form.dataset.channel,
        listing_reference: String(fd.get('listing_reference') || '').trim() || null,
        listing_url: String(fd.get('listing_url') || '').trim() || null,
        status: 'Draft',
        asking_price: priceValue === '' ? null : Number(priceValue),
        shipping_cost: shippingValue === '' ? null : Number(shippingValue),
        listing_title: String(fd.get('listing_title') || '').trim() || null,
        listing_description: String(fd.get('listing_description') || '').trim() || null,
        listing_data: { transaction_number: asset.transaction_number, manufacturer: asset.manufacturer, model: asset.model, package_name: asset.package_name, condition: asset.condition_grade, package_contents: asset.final_package_contents, serial_number: asset.serial_number, actual_battery_count: asset.actual_battery_count }
      };
      const response = listingId
        ? await db.from('resale_listings').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', listingId)
        : await db.from('resale_listings').insert(payload);
      if (response.error) { message.textContent = response.error.message; message.className = 'form-message error'; button.disabled = false; return; }
      message.textContent = 'Saved as draft.';
      message.className = 'form-message success';
      button.disabled = false;
      setTimeout(load, 350);
    }));

    box.querySelectorAll('.ready-button').forEach(button => button.addEventListener('click', async () => {
      button.disabled = true;
      const message = button.parentElement.querySelector('.channel-message');
      const { error } = await db.from('resale_listings').update({ status: 'Ready For Listing', updated_at: new Date().toISOString() }).eq('id', button.dataset.id);
      if (error) { message.textContent = error.message; message.className = 'form-message error'; button.disabled = false; return; }
      message.textContent = 'Marked ready to upload.';
      message.className = 'form-message success';
      setTimeout(load, 350);
    }));

    box.querySelectorAll('.mark-sold').forEach(button => button.addEventListener('click', async () => {
      const soldPrice = prompt('Actual sold price (£):');
      if (soldPrice === null) return;
      const price = Number(soldPrice);
      if (!Number.isFinite(price) || price < 0) { alert('Enter a valid sold price.'); return; }
      const fees = Number(prompt('Selling fees (£):', '0') || 0);
      const shipping = Number(prompt('Shipping cost (£):', '0') || 0);
      button.disabled = true;
      const { error } = await db.rpc('staff_mark_resale_listing_sold', { p_listing_id: button.dataset.id, p_sold_price: price, p_selling_fees: Number.isFinite(fees) ? fees : 0, p_shipping_cost: Number.isFinite(shipping) ? shipping : 0 });
      if (error) { alert(error.message); button.disabled = false; return; }
      load();
    }));
  };

  await load();
});
