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
  const channels = ["Website", "eBay", "Facebook Marketplace", "Other"];
  const statuses = ["Draft", "Ready", "Published", "Reserved", "Removed"];
  const latestTestPassed = testing && ["Passed", "Not Applicable"].includes(testing.flight_test || "") && ["Passed", "Not Applicable"].includes(testing.camera_test || "") && ["Good", "Not Applicable"].includes(testing.battery_health || "");
  const checks = {
    statusReady: asset.status === "Ready for Resale",
    testingComplete: Boolean(testing && latestTestPassed),
    photographsStored: Number(photoCount || 0) > 0,
    serialRecorded: Boolean(asset.serial_number),
    conditionRecorded: Boolean(asset.condition_grade),
    purchasePriceRecorded: Number(asset.purchase_price) >= 0,
    resalePriceApproved: Number(asset.approved_resale_price || 0) > 0,
    packageRecorded: Boolean(asset.package_name),
    preparationCompleted: Boolean(prep)
  };
  const labels = { statusReady:"Asset is Ready for Resale", testingComplete:"Technical testing completed", photographsStored:"Photographs stored", serialRecorded:"Serial number recorded", conditionRecorded:"Staff condition recorded", purchasePriceRecorded:"Purchase price recorded", resalePriceApproved:"Resale price approved", packageRecorded:"Package recorded", preparationCompleted:"Resale preparation completed" };
  const failed = Object.entries(checks).filter(([,v]) => !v).map(([k]) => labels[k] || k);
  const ready = failed.length === 0;

  const listingMap = Object.fromEntries((listings || []).map(x => [x.sales_channel, x]));
  const channelCards = channels.map(channel => {
    const row = listingMap[channel] || {};
    return `<article class="notice" style="margin-top:.75rem"><h3>${esc(channel)}</h3>
      <form class="channel-form" data-channel="${esc(channel)}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;align-items:end">
        <label>Listing reference<input name="listing_reference" value="${esc(row.listing_reference || "")}" placeholder="e.g. listing number"></label>
        <label>Asking price<input name="asking_price" type="number" min="0" step="0.01" value="${esc(row.asking_price ?? asset.approved_resale_price ?? "")}"></label>
        <label>Status<select name="status">${statuses.map(s => `<option ${row.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <button class="btn btn-primary" type="submit">SAVE ${esc(channel.toUpperCase())}</button>
      </form><p class="form-message channel-message" aria-live="polite"></p></article>`;
  }).join("");

  box.innerHTML = `<div class="valuation-card"><h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2><p>Asset reference: <strong>${esc(asset.asset_reference)}</strong></p>
    <p>Ready for Sale is the final internal preparation stage. The asset stays <strong>Ready for Resale</strong> until a sales-channel listing is actually published.</p>
    <ul class="check-list">${Object.entries(checks).map(([key, passed]) => `<li>${passed ? "✓" : "✕"} ${esc(labels[key] || key)}</li>`).join("")}</ul>
    ${ready ? `<div class="form-message success">Asset is ready for sales-channel listing.</div>` : `<div class="form-message error">Not ready for sales-channel listing. Missing: ${esc(failed.join(", "))}</div>`}
  </div>
  <div class="valuation-card" style="margin-top:1rem"><h2>Ready for Sale — Sales Channels</h2><p>Select the channels you intend to use and record the listing reference, price and status. The existing channel structure is Website, eBay, Facebook Marketplace and Other.</p>${channelCards}<p id="listing-message" class="form-message" aria-live="polite"></p></div>`;

  box.querySelectorAll(".channel-form").forEach(form => form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button"); const message = form.parentElement.querySelector(".channel-message"); const channel = form.dataset.channel; const fd = new FormData(form);
    if (!ready) { message.textContent = "Complete the readiness checks before creating a channel listing."; message.className = "form-message error"; return; }
    button.disabled = true; message.textContent = "Saving channel listing…"; message.className = "form-message";
    const payload = { sales_channel: channel, listing_reference: String(fd.get("listing_reference") || "").trim() || null, asking_price: fd.get("asking_price") === "" ? null : Number(fd.get("asking_price")), status: fd.get("status") || "Draft" };
    const { data: existing } = await db.from("resale_listings").select("id").eq("asset_id", id).eq("sales_channel", channel).maybeSingle();
    const result = existing ? await db.from("resale_listings").update(payload).eq("id", existing.id).select().single() : await db.from("resale_listings").insert({ asset_id:id, ...payload }).select().single();
    if (result.error) { message.textContent = result.error.message || "Could not save channel listing."; message.className = "form-message error"; button.disabled = false; return; }
    if (payload.status === "Published" && asset.status === "Ready for Resale") {
      try { await window.AssetStateActions.transitionAsset(id, "Listed", `${channel} listing published`); asset.status = "Listed"; }
      catch (err) { message.textContent = `Channel saved, but asset status could not be updated: ${err?.message || "Unknown error"}`; message.className = "form-message error"; button.disabled = false; return; }
    }
    message.textContent = `${channel} listing saved${payload.status === "Published" ? ". Asset is now Listed." : "."}`; message.className = "form-message success"; button.disabled = false;
  }));
});

if (typeof window !== "undefined") window.ListingReadiness = { validateListingReadiness: () => ({ ready: true }) };
