document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("readiness");
  if (!auth || !box) return;
  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=listing-readiness.html"; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = "<p>You do not have permission to access inventory.</p>"; return; }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { box.innerHTML = "<p>No asset selected.</p>"; return; }
  const { data: asset, error } = await db.from("inventory_assets").select("*").eq("id", id).single();
  if (error || !asset) { box.innerHTML = "<p>Asset could not be found.</p>"; return; }
  const [{ data: prep }, { data: testing }, { count: photoCount }, { data: listings }] = await Promise.all([
    db.from("inventory_preparation").select("*").eq("asset_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("inventory_testing").select("*").eq("asset_id", id).eq("stage", "testing").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("inventory_evidence").select("id", { count: "exact", head: true }).eq("asset_id", id).eq("evidence_type", "Photographs"),
    db.from("resale_listings").select("*").eq("asset_id", id).order("sales_channel")
  ]);

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const money = n => n === null || n === undefined || n === "" ? "" : Number(n).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
  const channels = ["Website", "eBay", "Facebook Marketplace", "Marketplace", "Central", "Vinted", "Amazon", "Other"];
  const statuses = ["Draft", "Ready For Listing", "Published", "Reserved", "Sold", "Cancelled", "Delist Required"];
  const activeStatuses = ["Draft", "Ready For Listing", "Published", "Reserved", "Delist Required"];
  const latestTestPassed = testing && ["Passed", "Not Applicable"].includes(testing.flight_test || "") && ["Passed", "Not Applicable"].includes(testing.camera_test || "") && ["Good", "Not Applicable"].includes(testing.battery_health || "");
  const checks = {
    statusReady: ["Ready for Resale", "Listed"].includes(asset.status),
    testingComplete: Boolean(testing && latestTestPassed),
    photographsStored: Number(photoCount || 0) > 0,
    serialRecorded: Boolean(asset.serial_number),
    conditionRecorded: Boolean(asset.condition_grade),
    purchasePriceRecorded: Number(asset.purchase_price) >= 0,
    resalePriceApproved: Number(asset.approved_resale_price || 0) > 0,
    packageRecorded: Boolean(asset.package_name),
    preparationCompleted: Boolean(prep)
  };
  const labels = { statusReady:"Asset is Ready for Resale / Listed", testingComplete:"Technical testing completed", photographsStored:"Photographs stored", serialRecorded:"Serial number recorded", conditionRecorded:"Staff condition recorded", purchasePriceRecorded:"Purchase price recorded", resalePriceApproved:"Resale price approved", packageRecorded:"Package recorded", preparationCompleted:"Resale preparation completed" };
  const failed = Object.entries(checks).filter(([,v]) => !v).map(([k]) => labels[k] || k);
  const ready = failed.length === 0;
  const rows = listings || [];
  const sold = rows.filter(x => x.status === "Sold");
  const otherActive = rows.filter(x => x.status !== "Sold" && x.status !== "Cancelled" && x.sales_channel);
  const warning = sold.length && otherActive.length ? `<div class="form-message error" style="margin:1rem 0;border:2px solid #b42318"><strong>DELIST REQUIRED — ITEM SOLD</strong><p>${esc(sold.map(x => x.sales_channel).join(", "))} has marked this asset sold. Remove it from these other sales channels:</p><ul>${otherActive.map(x => `<li><strong>${esc(x.sales_channel)}</strong> — ${esc(x.status)} ${x.listing_reference ? `(${esc(x.listing_reference)})` : ""} <button type="button" class="btn btn-secondary delist-button" data-id="${x.id}">MARK DELISTED</button></li>`).join("")}</ul></div>` : "";
  const listingMap = Object.fromEntries(rows.map(x => [x.sales_channel, x]));

  const channelCards = channels.map(channel => {
    const row = listingMap[channel] || {};
    const isSoldAsset = asset.status === "Sold";
    const isNew = !row.id;
    return `<article class="notice" style="margin-top:.75rem"><h3>${esc(channel)}</h3>
      <form class="channel-form" data-channel="${esc(channel)}" data-existing="${row.id ? "1" : "0"}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;align-items:end">
        <label>Listing reference<input name="listing_reference" value="${esc(row.listing_reference || "")}" placeholder="e.g. listing number"></label>
        <label>Asking price<input name="asking_price" type="number" min="0" step="0.01" value="${esc(row.asking_price ?? asset.approved_resale_price ?? "")}"></label>
        <label>Status<select name="status">${statuses.map(s => `<option ${row.status === s || (!row.status && s === "Draft") ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <button class="btn btn-primary" type="submit">SAVE ${esc(channel.toUpperCase())}</button>
      </form><p class="form-message channel-message" aria-live="polite"></p>
      ${row.id && row.status === "Sold" ? `<p><strong>Sold:</strong> ${esc(row.sold_at ? new Date(row.sold_at).toLocaleString("en-GB") : "date not recorded")}</p>` : ""}
      ${isSoldAsset && isNew ? `<p class="optional">This asset is already sold. Create no new listing here.</p>` : ""}
    </article>`;
  }).join("");

  box.innerHTML = `<div class="valuation-card"><h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2><p>Asset reference: <strong>${esc(asset.asset_reference)}</strong></p>
    <p>The asset remains in Inventory while it is listed on one or more external sales channels.</p>
    <ul class="check-list">${Object.entries(checks).map(([key, passed]) => `<li>${passed ? "✓" : "✕"} ${esc(labels[key] || key)}</li>`).join("")}</ul>
    ${ready ? `<div class="form-message success">Asset is ready for sales-channel listing.</div>` : `<div class="form-message error">Not ready for sales-channel listing. Missing: ${esc(failed.join(", "))}</div>`}
    ${warning}
  </div>
  <div class="valuation-card" style="margin-top:1rem"><h2>Sales Channels</h2><p>Record each external listing separately. A sale on any channel marks the inventory asset Sold and raises a red delist warning for every other active channel.</p>${channelCards}<p id="listing-message" class="form-message" aria-live="polite"></p></div>`;

  box.querySelectorAll(".delist-button").forEach(button => button.addEventListener("click", async () => {
    button.disabled = true;
    const { error: updateError } = await db.from("resale_listings").update({ status: "Cancelled", updated_at: new Date().toISOString() }).eq("id", button.dataset.id);
    if (updateError) { button.disabled = false; alert(updateError.message); return; }
    location.reload();
  }));

  box.querySelectorAll(".channel-form").forEach(form => form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    const message = form.parentElement.querySelector(".channel-message");
    const channel = form.dataset.channel;
    const fd = new FormData(form);
    const selectedStatus = fd.get("status") || "Draft";
    const existingId = form.dataset.existing === "1" ? (listingMap[channel]?.id || null) : null;
    if (asset.status === "Sold" && !existingId) {
      message.textContent = "This asset is already sold; do not create another listing.";
      message.className = "form-message error";
      return;
    }
    if (!ready && !existingId) {
      message.textContent = "Complete the readiness checks before creating a channel listing.";
      message.className = "form-message error";
      return;
    }
    button.disabled = true;
    message.textContent = "Saving channel listing…";
    message.className = "form-message";
    const payload = { sales_channel: channel, listing_reference: String(fd.get("listing_reference") || "").trim() || null, asking_price: fd.get("asking_price") === "" ? null : Number(fd.get("asking_price")), status: selectedStatus };
    const result = existingId ? await db.from("resale_listings").update(payload).eq("id", existingId).select().single() : await db.from("resale_listings").insert({ asset_id:id, ...payload }).select().single();
    if (result.error) { message.textContent = result.error.message || "Could not save channel listing."; message.className = "form-message error"; button.disabled = false; return; }
    if (selectedStatus === "Published" && asset.status === "Ready for Resale") {
      try { await window.AssetStateActions.transitionAsset(id, "Listed", `${channel} listing published`); }
      catch (err) { message.textContent = `Channel saved, but asset status could not be updated: ${err?.message || "Unknown error"}`; message.className = "form-message error"; button.disabled = false; return; }
    }
    message.textContent = `${channel} listing saved.`;
    message.className = "form-message success";
    setTimeout(() => location.reload(), 300);
  }));
});
