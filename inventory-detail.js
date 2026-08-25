document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const container = document.getElementById("asset-detail");
  if (!auth || !container) return;

  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-detail.html"; return; }

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { container.innerHTML = "You do not have permission to access inventory."; return; }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { container.innerHTML = "No asset selected."; return; }

  const { data: asset, error } = await auth.supabase.from("inventory_assets").select("*").eq("id", id).single();
  if (error || !asset) { container.innerHTML = "Asset could not be found."; return; }

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const machine = window.AssetStateMachine;

  async function loadModuleRecords() {
    const [testing, preparation] = await Promise.all([
      auth.supabase.from("inventory_testing").select("*").eq("asset_id", id).order("created_at", { ascending: false }),
      auth.supabase.from("inventory_preparation").select("*").eq("asset_id", id).order("created_at", { ascending: false })
    ]);
    return { testing: testing.data || [], preparation: preparation.data || [], testingError: testing.error, preparationError: preparation.error };
  }

  const render = async currentAsset => {
    const nextStates = machine?.getAllowedNextStates(currentAsset.status || 'Awaiting Receipt') || [];
    const progress = machine?.getLifecycleProgress(currentAsset.status || 'Awaiting Receipt');
    const records = await loadModuleRecords();
    const latestTest = records.testing[0];
    const latestPreparation = records.preparation[0];

    const testSummary = latestTest
      ? `<p><strong>Flight:</strong> ${esc(latestTest.flight_test)} &nbsp; <strong>Camera:</strong> ${esc(latestTest.camera_test)} &nbsp; <strong>Battery:</strong> ${esc(latestTest.battery_health)}</p><p>${esc(latestTest.notes || "No testing notes")}</p>`
      : '<p>No testing record yet.</p>';
    const prepSummary = latestPreparation
      ? `<p>Preparation checklist completed on ${esc(latestPreparation.created_at ? new Date(latestPreparation.created_at).toLocaleString("en-GB") : "recorded date") }.</p><p>${esc(latestPreparation.notes || "No preparation notes")}</p>`
      : '<p>No preparation checklist completed yet.</p>';

    let moduleLinks = '';
    if (currentAsset.status === 'Testing') moduleLinks += `<a class="btn btn-primary" href="inventory-testing.html?id=${encodeURIComponent(id)}">OPEN TESTING</a>`;
    if (currentAsset.status === 'Ready for Resale') moduleLinks += `<a class="btn btn-primary" href="inventory-ready.html?id=${encodeURIComponent(id)}">OPEN RESALE CHECKLIST</a>`;

    container.innerHTML = `
      <div class="valuation-card">
        <p class="section-kicker">${esc(currentAsset.status || "Awaiting Receipt")}</p>
        <h2>${esc([currentAsset.manufacturer, currentAsset.model].filter(Boolean).join(" "))}</h2>
        <p>Asset reference: ${esc(currentAsset.asset_reference)}</p>
        <p>Serial number: ${esc(currentAsset.serial_number || "Not recorded")}</p>
        <p>Package: ${esc(currentAsset.package_name || "Not recorded")}</p>
        <hr>
        <p><strong>Purchase price:</strong> ${money(currentAsset.purchase_price)}</p>
        <p><strong>Description:</strong> ${esc(currentAsset.description || currentAsset.model || "Not recorded")}</p>
        <p><strong>Condition:</strong> ${esc(currentAsset.condition_grade || "Not recorded")}</p>
        <p><strong>Current location:</strong> ${esc(currentAsset.current_location || "Not recorded")}</p>
        <p><strong>Notes:</strong> ${esc(currentAsset.notes || "No notes")}</p>
      </div>
      <div class="valuation-card" style="margin-top:1rem">
        <h3>Asset Lifecycle</h3>
        ${progress !== null ? `<p><strong>${progress}% complete</strong></p>` : ''}
        <p style="margin:.5rem 0 0;color:#68451f;"><strong>Held</strong> is a temporary quarantine/pause state. Use it when an asset must not progress through the normal workflow; it can later be returned to an appropriate lifecycle state.</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem">
          ${nextStates.length ? nextStates.map(state => `<button class="btn btn-primary lifecycle-action" type="button" data-state="${esc(state)}">${esc(state === 'Held' ? 'HOLD ASSET' : state)}</button>`).join('') : '<p>No further state changes are available.</p>'}
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem">${moduleLinks}</div>
        <p id="state-message" class="form-message" style="margin-top:1rem" aria-live="polite"></p>
      </div>
      <div class="valuation-card" style="margin-top:1rem">
        <h3>Testing History</h3>
        ${testSummary}
      </div>
      <div class="valuation-card" style="margin-top:1rem">
        <h3>Resale Preparation</h3>
        ${prepSummary}
      </div>`;

    container.querySelectorAll('.lifecycle-action').forEach(button => {
      button.addEventListener('click', async () => {
        const nextState = button.dataset.state;
        const msg = document.getElementById('state-message');
        if (nextState === 'Held' && !confirm('Place this asset on hold? This pauses the normal inventory lifecycle until you deliberately move it back to an appropriate state.')) return;
        button.disabled = true;
        msg.textContent = `Updating to ${nextState}…`;
        msg.className = 'form-message';
        try {
          const updated = await window.AssetStateActions.transitionAsset(id, nextState, nextState === 'Held' ? 'Asset placed on hold' : 'Staff lifecycle action');
          await render(updated);
        } catch (err) {
          msg.textContent = err?.message || 'Could not update asset status.';
          msg.className = 'form-message error';
          button.disabled = false;
        }
      });
    });
  };

  if (!machine) {
    container.innerHTML = '<p>Asset lifecycle controls could not be loaded.</p>';
    return;
  }

  await render(asset);
});
