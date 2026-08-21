document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById('readiness');
  if (!auth || !box) return;
  const session = await auth.getSession();
  if (!session) { location.href = 'login.html?return=listing-readiness.html'; return; }
  const { data: staff } = await auth.supabase.from('staff_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = '<p>You do not have permission to access inventory.</p>'; return; }
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { box.innerHTML = '<p>No asset selected.</p>'; return; }

  const { data: asset, error } = await auth.supabase.from('inventory_assets').select('*').eq('id', id).single();
  if (error || !asset) { box.innerHTML = '<p>Asset could not be found.</p>'; return; }
  const { data: prep } = await auth.supabase.from('inventory_preparation').select('*').eq('asset_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const result = window.ListingReadiness.validateListingReadiness(asset, prep);
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const labels = {
    statusReady: 'Asset is Ready for Resale',
    serialRecorded: 'Serial number recorded',
    conditionRecorded: 'Condition recorded',
    purchasePriceRecorded: 'Purchase price recorded',
    resalePriceApproved: 'Resale price approved',
    packageRecorded: 'Package recorded',
    preparationCompleted: 'Resale preparation completed'
  };
  const rows = Object.entries(result.checks).map(([key, passed]) => `<li>${passed ? '✓' : '✕'} ${esc(labels[key] || key)}</li>`).join('');

  box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(' ') || 'Asset')}</h2>
  <p>Asset reference: <strong>${esc(asset.asset_reference)}</strong></p>
  <ul class="check-list">${rows}</ul>
  ${result.ready ? `<div class="form-message success">✓ This asset is ready for listing.</div><div style="margin-top:1rem"><button id="mark-listed" class="btn btn-primary" type="button">MARK AS LISTED</button></div>` : `<div class="form-message error">Not ready for listing. Missing: ${esc(result.failedChecks.join(', '))}</div>`}
  <p id="listing-message" class="form-message" style="margin-top:1rem" aria-live="polite"></p>`;

  const button = document.getElementById('mark-listed');
  if (!button) return;
  button.addEventListener('click', async () => {
    button.disabled = true;
    const message = document.getElementById('listing-message');
    message.textContent = 'Updating asset…';
    try {
      const updated = await window.AssetStateActions.transitionAsset(id, 'Listed', 'Listing readiness checks completed');
      message.textContent = `Asset is now ${updated.status}. Create the external channel listing from the channel workflow.`;
      message.className = 'form-message success';
    } catch (err) {
      message.textContent = err?.message || 'Could not update asset status.';
      message.className = 'form-message error';
      button.disabled = false;
    }
  });
});
