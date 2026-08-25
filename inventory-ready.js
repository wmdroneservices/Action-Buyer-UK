document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("ready-form");
  if (!auth || !box) return;
  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-ready.html"; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = "<p>You do not have permission to access inventory.</p>"; return; }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { box.innerHTML = "<p>No asset selected.</p>"; return; }
  const { data: asset, error } = await db.from("inventory_assets").select("*").eq("id", id).single();
  if (error || !asset) { box.innerHTML = "<p>Asset could not be found.</p>"; return; }
  const { count: photoCount } = await db.from("inventory_evidence").select("id", { count: "exact", head: true }).eq("asset_id", id).eq("evidence_type", "Photographs");

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const spec = window.PackageSpecifications?.getPackageSpecification(asset.model, asset.package_name);
  const expectedBatteries = asset.expected_battery_count ?? spec?.expectedBatteries ?? null;
  if (asset.status !== "Ready for Resale") {
    box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2><p>Current status: <strong>${esc(asset.status || "Unknown")}</strong></p><p>This checklist is only available when the asset has passed testing and is <strong>Ready for Resale</strong>.</p>`;
    return;
  }

  const packageDisplay = asset.package_name || "Not recorded";
  const packageContents = spec?.expectedContents || [];
  box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2>
  <div class="valuation-card" style="margin:1rem 0"><h3>Package Verification</h3>
    <p><strong>Selected package:</strong> ${esc(packageDisplay)}</p>
    <p><strong>Expected batteries:</strong> ${expectedBatteries === null ? "Not configured" : esc(expectedBatteries)}</p>
    ${packageContents.length ? `<p><strong>Expected contents:</strong> ${esc(packageContents.join(", "))}</p>` : ""}
    <label for="actual_battery_count">Batteries physically present</label>
    <input id="actual_battery_count" type="number" min="0" step="1" value="${asset.actual_battery_count ?? expectedBatteries ?? 0}" required>
    <p id="battery-status" class="form-message" aria-live="polite"></p>
  </div>
  <div class="valuation-card" style="margin:1rem 0"><h3>Photographs</h3><p><strong>${Number(photoCount || 0)}</strong> photographs are stored against this asset. At least one is required before the asset can move through Ready for Sale.</p></div>
  <p>Complete every item before moving to the <strong>Ready for Sale</strong> sales-channel section.</p>
  <form id="ready-checklist" class="auth-form">
    <label><input type="checkbox" name="cleaned"> Asset cleaned and presentable</label>
    <label><input type="checkbox" name="photos"> Product photographs completed</label>
    <label><input type="checkbox" name="serial"> Serial number checked and recorded</label>
    <label><input type="checkbox" name="accessories"> Package contents checked</label>
    <label><input type="checkbox" name="batteries"> Battery count physically verified</label>
    <label><input type="checkbox" name="reset"> Device reset and personal accounts removed</label>
    <label><input type="checkbox" name="listing"> Listing information prepared</label>
    <label for="notes">Preparation notes <span class="optional">(optional)</span></label>
    <textarea id="notes" name="notes" rows="5"></textarea>
    <p id="ready-message" class="form-message" role="status" aria-live="polite"></p>
    <button class="btn btn-primary" type="submit">CONTINUE TO READY FOR SALE</button>
  </form>`;

  const batteryInput = document.getElementById("actual_battery_count");
  const batteryStatus = document.getElementById("battery-status");
  const updateBatteryStatus = () => {
    if (expectedBatteries === null) { batteryStatus.textContent = "No package battery specification is configured."; batteryStatus.className = "form-message error"; return false; }
    const actual = Number(batteryInput.value);
    const valid = actual === Number(expectedBatteries);
    batteryStatus.textContent = valid ? `Correct: ${actual} battery${actual === 1 ? "" : "ies"} present.` : `Expected ${expectedBatteries}; ${actual} recorded.`;
    batteryStatus.className = valid ? "form-message success" : "form-message error";
    return valid;
  };
  batteryInput.addEventListener("input", updateBatteryStatus); updateBatteryStatus();

  document.getElementById("ready-checklist").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    const message = document.getElementById("ready-message");
    const batteryValid = updateBatteryStatus();
    const required = [...form.querySelectorAll('input[type="checkbox"]')];
    if (!batteryValid || Number(photoCount || 0) < 1 || !required.every(input => input.checked)) {
      message.textContent = !batteryValid ? "The package battery count must match the expected package specification." : Number(photoCount || 0) < 1 ? "At least one photograph must be stored against the asset." : "Please complete every checklist item before continuing.";
      message.className = "form-message error";
      return;
    }

    const button = form.querySelector("button[type=submit]"); button.disabled = true;
    message.textContent = "Saving preparation record…"; message.className = "form-message";
    const fd = new FormData(form);
    const actualBatteryCount = Number(batteryInput.value);
    const checklist = Object.fromEntries(required.map(input => [input.name, input.checked]));
    checklist.actual_battery_count = actualBatteryCount; checklist.expected_battery_count = Number(expectedBatteries);

    const { error: assetError } = await db.from("inventory_assets").update({ actual_battery_count: actualBatteryCount }).eq("id", id);
    if (assetError) { message.textContent = assetError.message || "Could not save the verified battery count."; message.className = "form-message error"; button.disabled = false; return; }
    const { error: saveError } = await db.from("inventory_preparation").insert({ asset_id: id, checklist, notes: fd.get("notes") || null, completed_by: session.user.id });
    if (saveError) { message.textContent = saveError.message || "Could not save the preparation record."; message.className = "form-message error"; button.disabled = false; return; }

    message.textContent = "Preparation completed. Opening Ready for Sale…"; message.className = "form-message success";
    setTimeout(() => { location.href = `listing-readiness.html?id=${encodeURIComponent(id)}`; }, 400);
  });
});
