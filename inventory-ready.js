document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("ready-form");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=inventory-ready.html"; return; }

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = "<p>You do not have permission to access inventory.</p>"; return; }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { box.innerHTML = "<p>No asset selected.</p>"; return; }

  const { data: asset, error } = await auth.supabase.from("inventory_assets").select("*").eq("id", id).single();
  if (error || !asset) { box.innerHTML = "<p>Asset could not be found.</p>"; return; }

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  if (asset.status !== "Ready for Resale") {
    box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2><p>Current status: <strong>${esc(asset.status || "Unknown")}</strong></p><p>This checklist is only available when the asset has passed testing and is <strong>Ready for Resale</strong>.</p>`;
    return;
  }

  box.innerHTML = `<h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2>
  <p>Complete every item before listing this asset.</p>
  <form id="ready-checklist" class="auth-form">
    <label><input type="checkbox" name="cleaned"> Asset cleaned and presentable</label>
    <label><input type="checkbox" name="photos"> Product photographs completed</label>
    <label><input type="checkbox" name="serial"> Serial number checked and recorded</label>
    <label><input type="checkbox" name="accessories"> Package contents checked</label>
    <label><input type="checkbox" name="batteries"> Batteries/accessories checked and counted</label>
    <label><input type="checkbox" name="reset"> Device reset and personal accounts removed</label>
    <label><input type="checkbox" name="listing"> Listing information prepared</label>
    <label for="notes">Preparation notes <span class="optional">(optional)</span></label>
    <textarea id="notes" name="notes" rows="5"></textarea>
    <p id="ready-message" class="form-message" role="status" aria-live="polite"></p>
    <button class="btn btn-primary" type="submit">MARK READY FOR LISTING</button>
  </form>`;

  document.getElementById("ready-checklist").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    const message = document.getElementById("ready-message");
    const required = [...form.querySelectorAll('input[type="checkbox"]')];
    if (!required.every(input => input.checked)) {
      message.textContent = "Please complete every checklist item before continuing.";
      message.className = "form-message error";
      return;
    }

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    message.textContent = "Saving preparation record…";
    message.className = "form-message";

    const fd = new FormData(form);
    const checklist = Object.fromEntries(required.map(input => [input.name, input.checked]));
    const { error: saveError } = await auth.supabase.from("inventory_preparation").insert({ asset_id: id, checklist, notes: fd.get("notes") || null, completed_by: session.user.id });
    if (saveError) {
      message.textContent = saveError.message || "Could not save the preparation record.";
      message.className = "form-message error";
      button.disabled = false;
      return;
    }

    try {
      const updated = await window.AssetStateActions.transitionAsset(id, "Listed", "Ready for resale checklist completed");
      message.textContent = `Preparation saved. Asset moved to ${updated.status}.`;
      message.className = "form-message success";
      form.innerHTML = "Preparation checklist completed and asset is now ready to be listed.";
    } catch (err) {
      message.textContent = `Checklist saved, but status could not be updated: ${err?.message || "Unknown error"}`;
      message.className = "form-message error";
      button.disabled = false;
    }
  });
});
