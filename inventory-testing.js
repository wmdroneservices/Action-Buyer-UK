document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("testing-form");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-testing.html"; return; }

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = "No permission."; return; }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { box.innerHTML = "No asset selected."; return; }

  const { data: asset, error: assetError } = await auth.supabase.from("inventory_assets").select("manufacturer,model,status").eq("id", id).single();
  if (assetError || !asset) { box.innerHTML = "Asset could not be found."; return; }

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  const machineScript = document.createElement("script");
  machineScript.src = "asset-state-machine.js";
  document.head.appendChild(machineScript);
  await new Promise(resolve => machineScript.addEventListener("load", resolve, { once: true }));

  const actionScript = document.createElement("script");
  actionScript.src = "asset-state-actions.js";
  document.head.appendChild(actionScript);
  await new Promise(resolve => actionScript.addEventListener("load", resolve, { once: true }));

  box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2>
  <p><strong>Current status:</strong> ${esc(asset.status || "Unknown")}</p>
  <form id="test-form" class="auth-form">
  <label>Flight test</label><select name="flight"><option>Passed</option><option>Requires Attention</option><option>Failed</option></select>
  <label>Camera test</label><select name="camera"><option>Passed</option><option>Requires Attention</option><option>Failed</option></select>
  <label>Battery health</label><select name="battery"><option>Good</option><option>Fair</option><option>Requires Replacement</option></select>
  <label>Notes</label><textarea name="notes"></textarea>
  <button class="btn btn-primary" type="submit">SAVE TEST</button>
  </form>
  <p id="testing-message" class="form-message" aria-live="polite"></p>`;

  document.getElementById("test-form").addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const values = {
      flight_test: fd.get("flight"),
      camera_test: fd.get("camera"),
      battery_health: fd.get("battery"),
      notes: fd.get("notes")
    };

    const message = document.getElementById("testing-message");
    const saveButton = e.target.querySelector("button[type=submit]");
    saveButton.disabled = true;
    message.textContent = "Saving testing record…";

    const { error } = await auth.supabase.from("inventory_testing").insert({ asset_id: id, ...values });
    if (error) {
      message.textContent = error.message || "Could not save testing record.";
      message.className = "form-message error";
      saveButton.disabled = false;
      return;
    }

    const allPassed = values.flight_test === "Passed" && values.camera_test === "Passed" && values.battery_health === "Good";
    const nextState = allPassed ? "Ready for Resale" : "Repair Required";

    try {
      const updated = await window.AssetStateActions.transitionAsset(id, nextState, "Testing record completed");
      message.textContent = `Testing saved. Asset moved to ${updated.status}.`;
      message.className = "form-message success";
      e.target.innerHTML = "Testing record saved and asset lifecycle updated.";
    } catch (err) {
      message.textContent = `Testing saved, but the asset status could not be updated: ${err?.message || "Unknown error"}`;
      message.className = "form-message error";
      saveButton.disabled = false;
    }
  });
});
