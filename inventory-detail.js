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
  const label = state => state.replaceAll("_", " ");

  const machineScript = document.createElement('script');
  machineScript.src = 'asset-state-machine.js';
  document.head.appendChild(machineScript);
  await new Promise(resolve => machineScript.addEventListener('load', resolve, { once: true }));

  const actionScript = document.createElement('script');
  actionScript.src = 'asset-state-actions.js';
  document.head.appendChild(actionScript);
  await new Promise(resolve => actionScript.addEventListener('load', resolve, { once: true }));

  const render = (currentAsset) => {
    const machine = window.AssetStateMachine;
    const nextStates = machine?.getAllowedNextStates(currentAsset.status || 'Awaiting Receipt') || [];
    const progress = machine?.getLifecycleProgress(currentAsset.status || 'Awaiting Receipt');

    container.innerHTML = `
      <div class="valuation-card">
        <p class="section-kicker">${esc(currentAsset.status || "Awaiting Receipt")}</p>
        <h2>${esc([currentAsset.manufacturer, currentAsset.model].filter(Boolean).join(" "))}</h2>
        <p>Asset reference: ${esc(currentAsset.asset_reference)}</p>
        <p>Serial number: ${esc(currentAsset.serial_number || "Not recorded")}</p>
        <hr>
        <p><strong>Purchase price:</strong> ${money(currentAsset.purchase_price)}</p>
        <p><strong>Condition:</strong> ${esc(currentAsset.condition_grade || "Not recorded")}</p>
        <p><strong>Current location:</strong> ${esc(currentAsset.current_location || "Not recorded")}</p>
        <p><strong>Notes:</strong> ${esc(currentAsset.notes || "No notes")}</p>
      </div>
      <div class="valuation-card" style="margin-top:1rem">
        <h3>Asset Lifecycle</h3>
        ${progress !== null ? `<p><strong>${progress}% complete</strong></p>` : ''}
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem">
          ${nextStates.length ? nextStates.map(state => `<button class="btn btn-primary lifecycle-action" type="button" data-state="${esc(state)}">${esc(label(state))}</button>`).join('') : '<p>No further state changes are available.</p>'}
        </div>
        <p id="state-message" class="form-message" style="margin-top:1rem" aria-live="polite"></p>
      </div>
      <div class="valuation-card" style="margin-top:1rem">
        <h3>Lifecycle Modules</h3>
        <p>Testing reports: Ready for connection</p>
        <p>Expense history: Ready for connection</p>
        <p>Evidence and photographs: Ready for connection</p>
        <p>Movement history: Ready for connection</p>
      </div>`;

    container.querySelectorAll('.lifecycle-action').forEach(button => {
      button.addEventListener('click', async () => {
        const nextState = button.dataset.state;
        const msg = document.getElementById('state-message');
        button.disabled = true;
        msg.textContent = `Updating to ${nextState}…`;
        msg.className = 'form-message';
        try {
          const updated = await window.AssetStateActions.transitionAsset(id, nextState, 'Staff lifecycle action');
          msg.textContent = `Asset updated to ${updated.status}.`;
          msg.className = 'form-message success';
          render(updated);
        } catch (err) {
          msg.textContent = err?.message || 'Could not update asset status.';
          msg.className = 'form-message error';
          button.disabled = false;
        }
      });
    });
  };

  render(asset);
});
