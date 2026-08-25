document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("testing-form");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-testing.html"; return; }

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = "No permission."; return; }

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const requestedStage = params.get("stage");
  if (!id) { box.innerHTML = "No asset selected."; return; }

  const { data: asset, error: assetError } = await auth.supabase.from("inventory_assets").select("manufacturer,model,status,condition_grade,serial_number,package_name").eq("id", id).single();
  if (assetError || !asset) { box.innerHTML = "Asset could not be found."; return; }

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  try {
    await loadScript("asset-state-machine.js?v=20260825-2");
    await loadScript("asset-state-actions.js?v=20260825-2");
  } catch (_) {
    box.innerHTML = "Inventory workflow controls could not be loaded.";
    return;
  }

  let stage = requestedStage === "inspection" ? "inspection" : "testing";

  // The first staff inspection begins immediately when an asset has been received.
  if (stage === "inspection" && asset.status === "Received") {
    try {
      await window.AssetStateActions.transitionAsset(id, "Inspection Required", "Initial inspection started on receipt");
      asset.status = "Inspection Required";
    } catch (err) {
      box.innerHTML = `<p class="form-message error">Could not start inspection: ${esc(err?.message || "Unknown error")}</p>`;
      return;
    }
  }

  if (stage === "inspection" && !["Inspection Required", "Received"].includes(asset.status)) {
    box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2><p>Current status: <strong>${esc(asset.status)}</strong></p><p>Initial inspection is only available when the asset has been received.</p>`;
    return;
  }

  if (stage === "testing" && asset.status !== "Testing") {
    if (asset.status === "Inspection Required") {
      try {
        await window.AssetStateActions.transitionAsset(id, "Testing", "Inspection completed; technical testing started");
        asset.status = "Testing";
      } catch (err) {
        box.innerHTML = `<p class="form-message error">Could not start technical testing: ${esc(err?.message || "Unknown error")}</p>`;
        return;
      }
    } else {
      box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2><p>Current status: <strong>${esc(asset.status)}</strong></p><p>Technical testing can only be entered while the asset is in Testing.</p>`;
      return;
    }
  }

  if (stage === "inspection") {
    box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2>
      <p><strong>Inspection status:</strong> ${esc(asset.status)}</p>
      <p>This is the first inspection record taken when the equipment is received. Record what staff actually found before technical testing begins.</p>
      <form id="inspection-form" class="auth-form">
        <label>Inspection result</label><select name="result"><option>Passed</option><option>Requires Attention</option><option>Failed</option></select>
        <label>Physical condition observed</label><input name="visual_condition" value="${esc(asset.condition_grade || "")}" placeholder="e.g. Good, signs of wear">
        <label><input type="checkbox" name="missing_items"> Items missing from package</label>
        <label>Damage / defects observed</label><textarea name="damage_notes" rows="4"></textarea>
        <label><input type="checkbox" name="serial_verified"> Serial number checked and verified</label>
        <label><input type="checkbox" name="accessories_verified"> Accessories/package contents checked</label>
        <label>Inspection notes</label><textarea name="notes" rows="6"></textarea>
        <button class="btn btn-primary" type="submit">SAVE INSPECTION</button>
      </form>
      <p id="testing-message" class="form-message" aria-live="polite"></p>`;

    document.getElementById("inspection-form").addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const values = {
        asset_id: id,
        stage: "inspection",
        result: fd.get("result"),
        visual_condition: fd.get("visual_condition"),
        missing_items: fd.get("missing_items") === "on",
        damage_notes: fd.get("damage_notes"),
        serial_verified: fd.get("serial_verified") === "on",
        accessories_verified: fd.get("accessories_verified") === "on",
        notes: fd.get("notes"),
        created_by: session.user.id
      };
      const message = document.getElementById("testing-message");
      const button = e.target.querySelector("button[type=submit]");
      button.disabled = true;
      message.textContent = "Saving inspection record…";
      message.className = "form-message";

      const { error } = await auth.supabase.from("inventory_testing").insert(values);
      if (error) {
        message.textContent = error.message || "Could not save inspection record.";
        message.className = "form-message error";
        button.disabled = false;
        return;
      }

      try {
        const nextState = values.result === "Passed" ? "Testing" : "Repair Required";
        const updated = await window.AssetStateActions.transitionAsset(id, nextState, "Initial inspection completed");
        message.textContent = `Inspection saved. Asset moved to ${updated.status}.`;
        message.className = "form-message success";
        e.target.innerHTML = `<p>Inspection record saved. ${updated.status === "Testing" ? "Technical testing can now be completed." : "The asset requires attention before testing."}</p>`;
        if (updated.status === "Testing") {
          setTimeout(() => { location.href = `inventory-testing.html?id=${encodeURIComponent(id)}&stage=testing`; }, 500);
        }
      } catch (err) {
        message.textContent = `Inspection saved, but the asset status could not be updated: ${err?.message || "Unknown error"}`;
        message.className = "form-message error";
        button.disabled = false;
      }
    });
    return;
  }

  box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2>
    <p><strong>Current status:</strong> ${esc(asset.status)}</p>
    <form id="test-form" class="auth-form">
      <label>Flight test</label><select name="flight"><option>Passed</option><option>Requires Attention</option><option>Failed</option><option>Not Applicable</option></select>
      <label>Camera test</label><select name="camera"><option>Passed</option><option>Requires Attention</option><option>Failed</option><option>Not Applicable</option></select>
      <label>Battery health</label><select name="battery"><option>Good</option><option>Fair</option><option>Requires Replacement</option><option>Not Applicable</option></select>
      <label>Testing notes</label><textarea name="notes" rows="6"></textarea>
      <button class="btn btn-primary" type="submit">SAVE TEST</button>
    </form>
    <p id="testing-message" class="form-message" aria-live="polite"></p>`;

  document.getElementById("test-form").addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const values = {
      asset_id: id,
      stage: "testing",
      flight_test: fd.get("flight"),
      camera_test: fd.get("camera"),
      battery_health: fd.get("battery"),
      notes: fd.get("notes"),
      created_by: session.user.id
    };
    const message = document.getElementById("testing-message");
    const saveButton = e.target.querySelector("button[type=submit]");
    saveButton.disabled = true;
    message.textContent = "Saving testing record…";
    message.className = "form-message";

    const { error } = await auth.supabase.from("inventory_testing").insert(values);
    if (error) {
      message.textContent = error.message || "Could not save testing record.";
      message.className = "form-message error";
      saveButton.disabled = false;
      return;
    }

    const flightOk = values.flight_test === "Passed" || values.flight_test === "Not Applicable";
    const cameraOk = values.camera_test === "Passed" || values.camera_test === "Not Applicable";
    const batteryOk = values.battery_health === "Good" || values.battery_health === "Not Applicable";
    const nextState = flightOk && cameraOk && batteryOk ? "Ready for Resale" : "Repair Required";

    try {
      const updated = await window.AssetStateActions.transitionAsset(id, nextState, "Technical testing record completed");
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
