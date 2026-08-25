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

  let { data: asset, error } = await auth.supabase.from("inventory_assets").select("*").eq("id", id).single();
  if (error || !asset) { container.innerHTML = "Asset could not be found."; return; }

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const machine = window.AssetStateMachine;
  const conditionLabels = {
    "factory-sealed": "Factory Sealed / Unopened", "opened-unused": "Opened but Unused", excellent: "Excellent",
    good: "Good", fair: "Fair", damaged: "Damaged", "not-working": "Not Working / Spares Only"
  };
  const conditionOptions = Object.entries(conditionLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("");

  let sourceItem = null;
  if (asset.source_quote_item_id) {
    const { data } = await auth.supabase.from("quote_items").select("id,item_name,manufacturer,model,package,item_data").eq("id", asset.source_quote_item_id).maybeSingle();
    sourceItem = data || null;
  }
  const sourceData = sourceItem?.item_data && typeof sourceItem.item_data === "object" ? sourceItem.item_data : {};
  const customerCondition = asset.condition_grade || sourceData.condition || sourceData.singleItem?.condition || "";
  const displayCondition = conditionLabels[String(customerCondition).toLowerCase()] || customerCondition || "Not recorded";
  const missingItems = sourceData.missingItems === true || sourceData.missingItems === "true";
  const damageReported = sourceData.damage === true || sourceData.damage === "true";
  const exceptionNotes = String(sourceData.exceptionNotes || "").trim();

  async function loadRecords() {
    const [testing, preparation] = await Promise.all([
      auth.supabase.from("inventory_testing").select("*").eq("asset_id", id).order("created_at", { ascending: false }),
      auth.supabase.from("inventory_preparation").select("*").eq("asset_id", id).order("created_at", { ascending: false })
    ]);
    return { testing: testing.data || [], preparation: preparation.data || [], testingError: testing.error, preparationError: preparation.error };
  }

  const date = value => value ? new Date(value).toLocaleString("en-GB") : "Not recorded";
  const checked = value => value ? "checked" : "";
  const checklistNames = ["cleaned", "photos", "serial", "accessories", "batteries", "reset", "listing"];

  function testingCard(record) {
    const stage = record.stage === "inspection" ? "Initial Inspection" : "Technical Testing";
    return `<article class="notice" style="margin-top:.75rem">
      <p><strong>${esc(stage)}</strong> · ${esc(date(record.created_at))}</p>
      ${record.result ? `<p><strong>Result:</strong> ${esc(record.result)}</p>` : ""}
      ${record.visual_condition ? `<p><strong>Physical condition:</strong> ${esc(record.visual_condition)}</p>` : ""}
      ${record.missing_items !== null && record.missing_items !== undefined ? `<p><strong>Missing items:</strong> ${record.missing_items ? "Yes" : "No"}</p>` : ""}
      ${record.damage_notes ? `<p><strong>Damage / defects:</strong> ${esc(record.damage_notes)}</p>` : ""}
      ${record.serial_verified !== null && record.serial_verified !== undefined ? `<p><strong>Serial verified:</strong> ${record.serial_verified ? "Yes" : "No"}</p>` : ""}
      ${record.accessories_verified !== null && record.accessories_verified !== undefined ? `<p><strong>Accessories verified:</strong> ${record.accessories_verified ? "Yes" : "No"}</p>` : ""}
      ${record.flight_test ? `<p><strong>Flight:</strong> ${esc(record.flight_test)}</p>` : ""}
      ${record.camera_test ? `<p><strong>Camera:</strong> ${esc(record.camera_test)}</p>` : ""}
      ${record.battery_health ? `<p><strong>Battery:</strong> ${esc(record.battery_health)}</p>` : ""}
      <p>${esc(record.notes || "No notes")}</p>
      <button type="button" class="btn btn-secondary edit-testing" data-id="${record.id}">EDIT RECORD</button>
      <div id="edit-testing-${record.id}" hidden></div>
    </article>`;
  }

  function preparationCard(record) {
    const checklist = record.checklist && typeof record.checklist === "object" ? record.checklist : {};
    return `<article class="notice" style="margin-top:.75rem">
      <p><strong>Preparation record</strong> · ${esc(date(record.created_at))}</p>
      <p>${esc(record.notes || "No preparation notes")}</p>
      <p>${checklistNames.map(name => `${name}: ${checklist[name] ? "Yes" : "No"}`).join(" · ")}</p>
      <button type="button" class="btn btn-secondary edit-preparation" data-id="${record.id}">EDIT DETAILS</button>
      <div id="edit-preparation-${record.id}" hidden></div>
    </article>`;
  }

  function testingEditor(record) {
    const inspection = record.stage === "inspection";
    return `<form class="auth-form inline-editor testing-editor" data-id="${record.id}">
      <label>Record type</label><select name="stage"><option value="inspection" ${inspection ? "selected" : ""}>Initial Inspection</option><option value="testing" ${!inspection ? "selected" : ""}>Technical Testing</option></select>
      <label>Result</label><select name="result"><option value="">Not recorded</option><option ${record.result === "Passed" ? "selected" : ""}>Passed</option><option ${record.result === "Requires Attention" ? "selected" : ""}>Requires Attention</option><option ${record.result === "Failed" ? "selected" : ""}>Failed</option></select>
      <label>Physical condition</label><input name="visual_condition" value="${esc(record.visual_condition || "")}">
      <label><input type="checkbox" name="missing_items" ${checked(record.missing_items)}> Items missing</label>
      <label>Damage / defects</label><textarea name="damage_notes" rows="3">${esc(record.damage_notes || "")}</textarea>
      <label><input type="checkbox" name="serial_verified" ${checked(record.serial_verified)}> Serial verified</label>
      <label><input type="checkbox" name="accessories_verified" ${checked(record.accessories_verified)}> Accessories verified</label>
      <label>Flight test</label><select name="flight_test"><option value="">Not recorded</option><option ${record.flight_test === "Passed" ? "selected" : ""}>Passed</option><option ${record.flight_test === "Requires Attention" ? "selected" : ""}>Requires Attention</option><option ${record.flight_test === "Failed" ? "selected" : ""}>Failed</option><option ${record.flight_test === "Not Applicable" ? "selected" : ""}>Not Applicable</option></select>
      <label>Camera test</label><select name="camera_test"><option value="">Not recorded</option><option ${record.camera_test === "Passed" ? "selected" : ""}>Passed</option><option ${record.camera_test === "Requires Attention" ? "selected" : ""}>Requires Attention</option><option ${record.camera_test === "Failed" ? "selected" : ""}>Failed</option><option ${record.camera_test === "Not Applicable" ? "selected" : ""}>Not Applicable</option></select>
      <label>Battery health</label><select name="battery_health"><option value="">Not recorded</option><option ${record.battery_health === "Good" ? "selected" : ""}>Good</option><option ${record.battery_health === "Fair" ? "selected" : ""}>Fair</option><option ${record.battery_health === "Requires Replacement" ? "selected" : ""}>Requires Replacement</option><option ${record.battery_health === "Not Applicable" ? "selected" : ""}>Not Applicable</option></select>
      <label>Notes</label><textarea name="notes" rows="5">${esc(record.notes || "")}</textarea>
      <button class="btn btn-primary" type="submit">SAVE CHANGES</button>
    </form>`;
  }

  function preparationEditor(record) {
    const checklist = record?.checklist && typeof record.checklist === "object" ? record.checklist : {};
    return `<form class="auth-form inline-editor preparation-editor" data-id="${record?.id || ""}">
      ${checklistNames.map(name => `<label><input type="checkbox" name="${name}" ${checked(checklist[name])}> ${name.replace(/_/g, " ")}</label>`).join("")}
      <label>Preparation notes</label><textarea name="notes" rows="6">${esc(record?.notes || "")}</textarea>
      <button class="btn btn-primary" type="submit">SAVE PREPARATION DETAILS</button>
    </form>`;
  }

  const render = async currentAsset => {
    asset = currentAsset;
    const records = await loadRecords();
    const nextStates = machine?.getAllowedNextStates(asset.status || "Awaiting Receipt") || [];
    const progress = machine?.getLifecycleProgress(asset.status || "Awaiting Receipt");
    const inspectionButton = asset.status === "Received" ? `<button type="button" class="btn btn-primary" id="start-inspection">START INSPECTION</button>` : "";
    let moduleLinks = inspectionButton;
    if (asset.status === "Testing") moduleLinks += `<a class="btn btn-primary" href="inventory-testing.html?id=${encodeURIComponent(id)}&stage=testing">OPEN TECHNICAL TESTING</a>`;
    if (asset.status === "Ready for Resale") moduleLinks += `<a class="btn btn-primary" href="inventory-ready.html?id=${encodeURIComponent(id)}">OPEN RESALE CHECKLIST</a>`;

    container.innerHTML = `
      <div class="valuation-card">
        <p class="section-kicker">${esc(asset.status || "Awaiting Receipt")}</p>
        <h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" "))}</h2>
        <p>Asset reference: ${esc(asset.asset_reference)}</p>
        <form id="asset-edit-form" class="auth-form" style="margin-top:1rem">
          <label>Manufacturer</label><input name="manufacturer" value="${esc(asset.manufacturer || "")}">
          <label>Model</label><input name="model" value="${esc(asset.model || "")}">
          <label>Serial number</label><input name="serial_number" value="${esc(asset.serial_number || sourceData.serialNumber || "")}">
          <label>Package</label><input name="package_name" value="${esc(asset.package_name || sourceItem?.package || "")}">
          <label>Condition</label><select name="condition_grade"><option value="">Not recorded</option>${conditionOptions}</select>
          <label>Purchase price</label><input name="purchase_price" type="number" min="0" step="0.01" value="${asset.purchase_price ?? ""}">
          <label>Description</label><textarea name="description" rows="3">${esc(asset.description || "")}</textarea>
          <label>Current location</label><input name="current_location" value="${esc(asset.current_location || "")}">
          <label>Expected battery count</label><input name="expected_battery_count" type="number" min="0" step="1" value="${asset.expected_battery_count ?? ""}">
          <label>Actual battery count</label><input name="actual_battery_count" type="number" min="0" step="1" value="${asset.actual_battery_count ?? ""}">
          <label>Approved resale price</label><input name="approved_resale_price" type="number" min="0" step="0.01" value="${asset.approved_resale_price ?? ""}">
          <label>Internal notes</label><textarea name="notes" rows="5">${esc(asset.notes || "")}</textarea>
          <button class="btn btn-primary" type="submit">SAVE ASSET DETAILS</button>
          <p id="asset-edit-message" class="form-message" aria-live="polite"></p>
        </form>
      </div>

      <div class="valuation-card" style="margin-top:1rem"><h3>Customer valuation details</h3>
        <p><strong>Condition selected by customer:</strong> ${esc(displayCondition)}</p>
        <p><strong>Missing items:</strong> ${missingItems ? "Yes" : "No"}</p>
        <p><strong>Damage reported:</strong> ${damageReported ? "Yes" : "No"}</p>
        <p><strong>Packaging / exception notes:</strong> ${esc(exceptionNotes || "None recorded")}</p>
        <p><strong>Customer serial number:</strong> ${esc(sourceData.serialNumber || "Not recorded")}</p>
      </div>

      <div class="valuation-card" style="margin-top:1rem"><h3>Asset Lifecycle</h3>
        ${progress !== null ? `<p><strong>${progress}% complete</strong></p>` : ""}
        <p style="margin:.5rem 0 0;color:#68451f"><strong>Held</strong> is a temporary quarantine/pause state.</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem">${moduleLinks}</div>
        ${asset.status !== "Received" ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem">${nextStates.map(state => `<button class="btn btn-primary lifecycle-action" type="button" data-state="${esc(state)}">${esc(state === "Held" ? "HOLD ASSET" : state)}</button>`).join("")}</div>` : ""}
        <p id="state-message" class="form-message" style="margin-top:1rem" aria-live="polite"></p>
      </div>

      <div class="valuation-card" style="margin-top:1rem"><h3>Testing History</h3>
        <p>Every inspection and technical test remains in the history and can be edited by staff.</p>
        ${records.testing.length ? records.testing.map(testingCard).join("") : "<p>No inspection or testing records yet.</p>"}
      </div>

      <div class="valuation-card" style="margin-top:1rem"><h3>Resale Preparation</h3>
        <p>Preparation details can be added or edited without changing the asset's purchase record.</p>
        ${records.preparation.length ? records.preparation.map(preparationCard).join("") : `<div id="new-preparation">${preparationEditor(null)}</div>`}
      </div>`;

    const conditionSelect = container.querySelector('[name="condition_grade"]');
    if (conditionSelect) conditionSelect.value = String(asset.condition_grade || "");

    container.querySelector("#asset-edit-form")?.addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.target;
      const message = form.querySelector("#asset-edit-message");
      const button = form.querySelector("button[type=submit]");
      const fd = new FormData(form);
      const numeric = name => fd.get(name) === "" ? null : Number(fd.get(name));
      const payload = {
        manufacturer: String(fd.get("manufacturer") || "").trim() || null,
        model: String(fd.get("model") || "").trim() || null,
        serial_number: String(fd.get("serial_number") || "").trim() || null,
        package_name: String(fd.get("package_name") || "").trim() || null,
        condition_grade: String(fd.get("condition_grade") || "").trim() || null,
        purchase_price: numeric("purchase_price"),
        description: String(fd.get("description") || "").trim() || null,
        current_location: String(fd.get("current_location") || "").trim() || null,
        expected_battery_count: numeric("expected_battery_count"),
        actual_battery_count: numeric("actual_battery_count"),
        approved_resale_price: numeric("approved_resale_price"),
        notes: String(fd.get("notes") || "").trim() || null
      };
      button.disabled = true; message.textContent = "Saving asset details…"; message.className = "form-message";
      const { data: updated, error: saveError } = await auth.supabase.from("inventory_assets").update(payload).eq("id", id).select().single();
      if (saveError) { message.textContent = saveError.message || "Could not save asset details."; message.className = "form-message error"; button.disabled = false; return; }
      message.textContent = "Asset details saved."; message.className = "form-message success";
      await render(updated);
    });

    container.querySelector("#start-inspection")?.addEventListener("click", () => {
      location.href = `inventory-testing.html?id=${encodeURIComponent(id)}&stage=inspection`;
    });

    container.querySelectorAll(".lifecycle-action").forEach(button => button.addEventListener("click", async () => {
      const nextState = button.dataset.state;
      const msg = document.getElementById("state-message");
      if (nextState === "Held" && !confirm("Place this asset on hold?")) return;
      button.disabled = true; msg.textContent = `Updating to ${nextState}…`; msg.className = "form-message";
      try { const updated = await window.AssetStateActions.transitionAsset(id, nextState, nextState === "Held" ? "Asset placed on hold" : "Staff lifecycle action"); await render(updated); }
      catch (err) { msg.textContent = err?.message || "Could not update asset status."; msg.className = "form-message error"; button.disabled = false; }
    }));

    container.querySelectorAll(".edit-testing").forEach(button => button.addEventListener("click", () => {
      const record = records.testing.find(item => item.id === button.dataset.id);
      const target = document.getElementById(`edit-testing-${button.dataset.id}`);
      if (!record || !target) return;
      target.hidden = !target.hidden; if (!target.hidden) target.innerHTML = testingEditor(record);
      target.querySelector("form")?.addEventListener("submit", async event => {
        event.preventDefault();
        const fd = new FormData(event.target);
        const payload = {
          stage: fd.get("stage"), result: fd.get("result") || null, visual_condition: fd.get("visual_condition") || null,
          missing_items: fd.get("missing_items") === "on", damage_notes: fd.get("damage_notes") || null,
          serial_verified: fd.get("serial_verified") === "on", accessories_verified: fd.get("accessories_verified") === "on",
          flight_test: fd.get("flight_test") || null, camera_test: fd.get("camera_test") || null,
          battery_health: fd.get("battery_health") || null, notes: fd.get("notes") || null, updated_by: session.user.id
        };
        const { error: updateError } = await auth.supabase.from("inventory_testing").update(payload).eq("id", record.id);
        if (updateError) { alert(updateError.message || "Could not update testing record."); return; }
        await render(asset);
      });
    }));

    container.querySelectorAll(".edit-preparation").forEach(button => button.addEventListener("click", () => {
      const record = records.preparation.find(item => item.id === button.dataset.id);
      const target = document.getElementById(`edit-preparation-${button.dataset.id}`);
      if (!record || !target) return;
      target.hidden = !target.hidden; if (!target.hidden) target.innerHTML = preparationEditor(record);
      target.querySelector("form")?.addEventListener("submit", async event => {
        event.preventDefault();
        const fd = new FormData(event.target);
        const checklist = Object.fromEntries(checklistNames.map(name => [name, fd.get(name) === "on"]));
        const { error: updateError } = await auth.supabase.from("inventory_preparation").update({ checklist, notes: fd.get("notes") || null }).eq("id", record.id);
        if (updateError) { alert(updateError.message || "Could not update preparation details."); return; }
        await render(asset);
      });
    }));

    container.querySelector("#new-preparation form")?.addEventListener("submit", async event => {
      event.preventDefault();
      const fd = new FormData(event.target);
      const checklist = Object.fromEntries(checklistNames.map(name => [name, fd.get(name) === "on"]));
      const { error: insertError } = await auth.supabase.from("inventory_preparation").insert({ asset_id: id, checklist, notes: fd.get("notes") || null, completed_by: session.user.id });
      if (insertError) { alert(insertError.message || "Could not add preparation details."); return; }
      await render(asset);
    });
  };

  if (!machine) { container.innerHTML = "Asset lifecycle controls could not be loaded."; return; }
  await render(asset);
});
