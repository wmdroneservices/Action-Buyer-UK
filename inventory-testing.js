document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("testing-form");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-testing.html"; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = "No permission."; return; }

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const requestedStage = params.get("stage");
  if (!id) { box.innerHTML = "No asset selected."; return; }

  const { data: asset, error: assetError } = await db.from("inventory_assets")
    .select("*").eq("id", id).single();
  if (assetError || !asset) { box.innerHTML = "Asset could not be found."; return; }

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const date = v => v ? new Date(v).toLocaleString("en-GB") : "Not recorded";
  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement("script"); script.src = src;
    script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
  });

  try {
    await loadScript("asset-state-machine.js?v=20260825-3");
    await loadScript("asset-state-actions.js?v=20260825-3");
  } catch (_) { box.innerHTML = "Inventory workflow controls could not be loaded."; return; }

  async function getEvidence() {
    const { data } = await db.from("inventory_evidence").select("*").eq("asset_id", id)
      .eq("evidence_type", "Photographs").order("created_at", { ascending: true });
    return data || [];
  }

  async function signedPhotoUrls(records) {
    const paths = records.map(x => x.file_url).filter(Boolean);
    if (!paths.length) return [];
    const { data } = await db.storage.from("quote-photos").createSignedUrls(paths, 3600);
    return (data || []).map((x, i) => ({ ...x, record: records[i] })).filter(x => x.signedUrl);
  }

  async function photoSection() {
    const records = await getEvidence();
    const urls = await signedPhotoUrls(records);
    return `<div class="valuation-card" style="margin-top:1rem">
      <h3>Photographs</h3>
      <p><strong>Customer photographs are retained as part of the asset record.</strong> Staff can add additional photographs below.</p>
      ${urls.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:1rem 0">${urls.map(x => `<a href="${esc(x.signedUrl)}" target="_blank" rel="noopener"><img src="${esc(x.signedUrl)}" alt="Asset photograph" style="width:100%;height:150px;object-fit:cover;border-radius:8px"></a>`).join("")}</div>` : "<p>No photographs are currently linked to this asset.</p>"}
      <form id="photo-form" class="auth-form">
        <label>Add inspection / resale photographs</label>
        <input id="extra-photos" type="file" accept="image/*" multiple>
        <p class="optional">These are stored against this individual asset and remain available for resale preparation.</p>
        <button class="btn btn-primary" type="submit">UPLOAD PHOTOGRAPHS</button>
        <p id="photo-message" class="form-message" aria-live="polite"></p>
      </form>
    </div>`;
  }

  async function uploadPhotos(files) {
    const uploaded = [];
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const path = `${session.user.id}/inventory/${id}/${Date.now()}-${crypto.randomUUID()}-${safe}`;
      const { error } = await db.storage.from("quote-photos").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { error: evidenceError } = await db.from("inventory_evidence").insert({
        asset_id: id, evidence_type: "Photographs", file_url: path,
        description: "Staff inspection / resale photograph", created_by: session.user.id
      });
      if (evidenceError) throw evidenceError;
      uploaded.push(path);
    }
    return uploaded;
  }

  let stage = requestedStage === "inspection" ? "inspection" : "testing";

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
    const customerCondition = asset.customer_condition || "Not recorded";
    const customerMissing = Boolean(asset.customer_missing_items);
    box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2>
      <div class="valuation-card" style="margin:1rem 0"><h3>Customer information carried into inspection</h3>
        <p><strong>Customer condition:</strong> ${esc(customerCondition)}</p>
        <p><strong>Customer reported missing items:</strong> ${customerMissing ? "Yes" : "No"}</p>
        ${customerMissing ? `<p><strong>Customer missing-item details:</strong> ${esc(asset.customer_missing_items_details || "No details recorded")}</p>` : ""}
        <p><strong>Customer reported damage:</strong> ${asset.customer_damage ? "Yes" : "No"}</p>
        ${asset.customer_exception_notes ? `<p><strong>Customer notes:</strong> ${esc(asset.customer_exception_notes)}</p>` : ""}
        <p><strong>Package:</strong> ${esc(asset.package_name || "Not recorded")}</p>
      </div>
      <form id="inspection-form" class="auth-form">
        <label>Inspection result</label><select name="result"><option>Passed</option><option>Requires Attention</option><option>Failed</option></select>
        <label>Physical condition observed by staff</label><input name="visual_condition" value="${esc(asset.condition_grade || "")}" placeholder="e.g. Good, signs of wear">
        <label><input type="checkbox" name="missing_items"> Items currently missing from package</label>
        <label>Damage / defects observed</label><textarea name="damage_notes" rows="4"></textarea>
        <label><input type="checkbox" name="serial_verified"> Serial number checked and verified</label>
        <label><input type="checkbox" name="accessories_verified"> Accessories/package contents checked</label>
        <label>Inspection notes</label><textarea name="notes" rows="5"></textarea>
        <button class="btn btn-primary" type="submit">SAVE INSPECTION</button>
        <p id="testing-message" class="form-message" aria-live="polite"></p>
      </form>
      ${await photoSection()}`;

    document.getElementById("inspection-form").addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const values = {
        asset_id: id, stage: "inspection", result: fd.get("result"),
        visual_condition: String(fd.get("visual_condition") || "").trim(),
        missing_items: fd.get("missing_items") === "on", damage_notes: fd.get("damage_notes"),
        serial_verified: fd.get("serial_verified") === "on", accessories_verified: fd.get("accessories_verified") === "on",
        notes: fd.get("notes"), created_by: session.user.id
      };
      const message = document.getElementById("testing-message");
      const button = e.target.querySelector("button[type=submit]");
      button.disabled = true; message.textContent = "Saving inspection record…"; message.className = "form-message";
      const { error } = await db.from("inventory_testing").insert(values);
      if (error) { message.textContent = error.message || "Could not save inspection record."; message.className = "form-message error"; button.disabled = false; return; }

      const assetUpdate = { condition_grade: values.visual_condition || null };
      const { error: assetUpdateError } = await db.from("inventory_assets").update(assetUpdate).eq("id", id);
      if (assetUpdateError) { message.textContent = assetUpdateError.message || "Inspection saved but asset details could not be updated."; message.className = "form-message error"; button.disabled = false; return; }

      try {
        const nextState = values.result === "Passed" ? "Testing" : "Repair Required";
        const updated = await window.AssetStateActions.transitionAsset(id, nextState, "Initial inspection completed");
        message.textContent = `Inspection saved. Asset moved to ${updated.status}.`; message.className = "form-message success";
        e.target.innerHTML = `<p>Inspection saved. ${updated.status === "Testing" ? "Technical testing can now be completed." : "The asset requires attention before testing."}</p>`;
        if (updated.status === "Testing") setTimeout(() => { location.href = `inventory-testing.html?id=${encodeURIComponent(id)}&stage=testing`; }, 500);
      } catch (err) { message.textContent = `Inspection saved, but the asset status could not be updated: ${esc(err?.message || "Unknown error")}`; message.className = "form-message error"; button.disabled = false; }
    });

    document.getElementById("photo-form").addEventListener("submit", async e => {
      e.preventDefault();
      const message = document.getElementById("photo-message");
      const files = [...document.getElementById("extra-photos").files];
      if (!files.length) { message.textContent = "Select at least one photograph."; message.className = "form-message error"; return; }
      try { message.textContent = "Uploading photographs…"; await uploadPhotos(files); message.textContent = "Photographs added to the asset record."; message.className = "form-message success"; setTimeout(() => location.reload(), 400); }
      catch (err) { message.textContent = err?.message || "Could not upload photographs."; message.className = "form-message error"; }
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
      <p id="testing-message" class="form-message" aria-live="polite"></p>
    </form>
    ${await photoSection()}`;

  document.getElementById("test-form").addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const values = { asset_id: id, stage: "testing", flight_test: fd.get("flight"), camera_test: fd.get("camera"), battery_health: fd.get("battery"), notes: fd.get("notes"), created_by: session.user.id };
    const message = document.getElementById("testing-message");
    const saveButton = e.target.querySelector("button[type=submit]");
    saveButton.disabled = true; message.textContent = "Saving testing record…"; message.className = "form-message";
    const { error } = await db.from("inventory_testing").insert(values);
    if (error) { message.textContent = error.message || "Could not save testing record."; message.className = "form-message error"; saveButton.disabled = false; return; }
    const flightOk = values.flight_test === "Passed" || values.flight_test === "Not Applicable";
    const cameraOk = values.camera_test === "Passed" || values.camera_test === "Not Applicable";
    const batteryOk = values.battery_health === "Good" || values.battery_health === "Not Applicable";
    const nextState = flightOk && cameraOk && batteryOk ? "Ready for Resale" : "Repair Required";
    try {
      const updated = await window.AssetStateActions.transitionAsset(id, nextState, "Technical testing record completed");
      message.textContent = `Testing saved. Asset moved to ${updated.status}.`; message.className = "form-message success";
      e.target.innerHTML = "Testing record saved and asset lifecycle updated.";
    } catch (err) { message.textContent = `Testing saved, but the asset status could not be updated: ${esc(err?.message || "Unknown error")}`; message.className = "form-message error"; saveButton.disabled = false; }
  });

  document.getElementById("photo-form").addEventListener("submit", async e => {
    e.preventDefault();
    const message = document.getElementById("photo-message");
    const files = [...document.getElementById("extra-photos").files];
    if (!files.length) { message.textContent = "Select at least one photograph."; message.className = "form-message error"; return; }
    try { message.textContent = "Uploading photographs…"; await uploadPhotos(files); message.textContent = "Photographs added to the asset record."; message.className = "form-message success"; setTimeout(() => location.reload(), 400); }
    catch (err) { message.textContent = err?.message || "Could not upload photographs."; message.className = "form-message error"; }
  });
});
