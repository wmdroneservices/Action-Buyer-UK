document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth, box = document.getElementById("readiness");
  if (!auth || !box) return;
  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=listing-readiness.html"; return; }
  const db = auth.supabase;
  const { data: staff } = await db.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = "<p>You do not have permission to access inventory.</p>"; return; }
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { box.innerHTML = "<p>No asset selected.</p>"; return; }
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const channels = ["Marketplace", "eBay", "Website", "Facebook Marketplace", "Vinted", "Amazon", "Central", "Other"];
  const statuses = ["Draft", "Ready For Listing", "Published", "Reserved", "Sold", "Cancelled", "Delist Required"];

  const signedUrls = async records => {
    const paths = records.map(x => x.file_url).filter(Boolean);
    if (!paths.length) return [];
    const { data } = await db.storage.from("quote-photos").createSignedUrls(paths, 3600);
    return (data || []).map((x, i) => ({ ...x, record: records[i] })).filter(x => x.signedUrl);
  };

  const defaultTitle = asset => [asset.manufacturer, asset.model, asset.package_name].filter(Boolean).join(" — ");
  const defaultDescription = asset => [
    [asset.manufacturer, asset.model].filter(Boolean).join(" "),
    asset.package_name ? `Package: ${asset.package_name}` : "",
    asset.condition_grade ? `Condition: ${asset.condition_grade}` : "",
    asset.actual_battery_count != null ? `Batteries included: ${asset.actual_battery_count}` : "",
    asset.serial_number ? `Serial number: ${asset.serial_number}` : "",
    asset.description || "",
    asset.customer_missing_items ? `Customer-reported missing items: ${asset.customer_missing_items_details || "Yes"}` : "",
    asset.customer_damage ? "Customer-reported damage was present at purchase; see inspection/testing record for final condition." : ""
  ].filter(Boolean).join("\n\n");

  async function load() {
    const { data: asset, error } = await db.from("inventory_assets").select("*").eq("id", id).single();
    if (error || !asset) { box.innerHTML = "<p>Asset could not be found.</p>"; return; }
    const [{ data: prep }, { data: testing }, { data: evidence }, { data: listings }] = await Promise.all([
      db.from("inventory_preparation").select("*").eq("asset_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("inventory_testing").select("*").eq("asset_id", id).eq("stage", "testing").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("inventory_evidence").select("*").eq("asset_id", id).eq("evidence_type", "Photographs").order("created_at", { ascending: true }),
      db.from("resale_listings").select("*").eq("asset_id", id).order("sales_channel")
    ]);
    const photos = await signedUrls(evidence || []);
    const latestTestPassed = testing && ["Passed", "Not Applicable"].includes(testing.flight_test || "") && ["Passed", "Not Applicable"].includes(testing.camera_test || "") && ["Good", "Not Applicable"].includes(testing.battery_health || "");
    const checks = {
      statusReady: ["Ready for Resale", "Listed"].includes(asset.status),
      testingComplete: Boolean(testing && latestTestPassed),
      photographsStored: photos.length > 0,
      serialRecorded: Boolean(asset.serial_number),
      conditionRecorded: Boolean(asset.condition_grade),
      purchasePriceRecorded: Number(asset.purchase_price) >= 0,
      resalePriceApproved: Number(asset.approved_resale_price || 0) > 0,
      packageRecorded: Boolean(asset.package_name),
      preparationCompleted: Boolean(prep)
    };
    const labels = {
      statusReady: "Asset is Ready for Resale / Listed",
      testingComplete: "Technical testing completed",
      photographsStored: "Photographs stored",
      serialRecorded: "Serial number recorded",
      conditionRecorded: "Staff condition recorded",
      purchasePriceRecorded: "Purchase price recorded",
      resalePriceApproved: "Resale price approved",
      packageRecorded: "Package recorded",
      preparationCompleted: "Resale preparation completed"
    };
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => labels[k] || k);
    const ready = failed.length === 0;
    const rows = listings || [];
    const sold = rows.filter(x => x.status === "Sold");
    const otherActive = rows.filter(x => !["Sold", "Cancelled"].includes(x.status) && x.sales_channel);
    const warning = sold.length > 0 && otherActive.length > 0;
    const listingMap = Object.fromEntries(rows.map(x => [x.sales_channel, x]));
    const sourceTitle = defaultTitle(asset);
    const sourceDescription = defaultDescription(asset);

    const photoHtml = photos.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">${photos.map(x => `<a href="${esc(x.signedUrl)}" target="_blank" rel="noopener"><img src="${esc(x.signedUrl)}" alt="${esc(x.record.description || "Asset photograph")}" style="width:100%;height:150px;object-fit:cover;border-radius:8px"></a>`).join("")}</div>` : "<p>No photographs are stored for this asset.</p>";
    const warningHtml = warning ? `<div class="form-message error" style="margin:1rem 0;border:2px solid #b42318"><strong>DELIST REQUIRED — ITEM SOLD</strong><p>Sold on ${esc(sold.map(x => x.sales_channel).join(", "))}. These other listings must be removed:</p><ul>${otherActive.map(x => `<li><strong>${esc(x.sales_channel)}</strong> — ${esc(x.status)}${x.listing_reference ? ` (${esc(x.listing_reference)})` : ""} <button type="button" class="btn btn-secondary delist-button" data-id="${x.id}">MARK DELISTED</button></li>`).join("")}</ul></div>` : "";

    const channelCards = channels.map(channel => {
      const row = listingMap[channel] || {};
      const title = row.listing_title || sourceTitle;
      const description = row.listing_description || sourceDescription;
      const soldRow = row.status === "Sold";
      const delistRow = row.status === "Delist Required";
      return `<article class="notice" style="margin-top:1rem;${soldRow || delistRow ? "border:2px solid #b42318" : ""}">
        <h3>${esc(channel)}</h3>
        ${soldRow ? `<p class="form-message error"><strong>SOLD — do not relist.</strong></p>` : delistRow ? `<p class="form-message error"><strong>DELIST THIS CHANNEL.</strong></p>` : ""}
        <form class="channel-form" data-channel="${esc(channel)}" data-id="${esc(row.id || "")}">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem">
            <label>Full listing title <input name="listing_title" value="${esc(title)}" required></label>
            <label>Listing reference <input name="listing_reference" value="${esc(row.listing_reference || "")}" placeholder="External listing number / URL reference"></label>
            <label>Asking price <input name="asking_price" type="number" min="0" step="0.01" value="${esc(row.asking_price ?? asset.approved_resale_price ?? "")}" required></label>
            <label>Status <select name="status">${statuses.map(s => `<option value="${esc(s)}" ${row.status === s || (!row.status && s === "Draft") ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
          </div>
          <label>Listing description <textarea name="listing_description" rows="10" required>${esc(description)}</textarea></label>
          <div class="notice"><strong>Listing information carried from Inventory</strong><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.5rem;margin-top:.5rem"><p><strong>Manufacturer:</strong> ${esc(asset.manufacturer || "Not recorded")}</p><p><strong>Model:</strong> ${esc(asset.model || "Not recorded")}</p><p><strong>Package:</strong> ${esc(asset.package_name || "Not recorded")}</p><p><strong>Staff condition:</strong> ${esc(asset.condition_grade || "Not recorded")}</p><p><strong>Customer condition:</strong> ${esc(asset.customer_condition || "Not recorded")}</p><p><strong>Serial number:</strong> ${esc(asset.serial_number || "Not recorded")}</p><p><strong>Batteries:</strong> ${esc(asset.actual_battery_count ?? "Not recorded")}</p><p><strong>Asset reference:</strong> ${esc(asset.asset_reference || "")}</p></div></div>
          <button class="btn btn-primary" type="submit">SAVE ${esc(channel.toUpperCase())} LISTING</button>
          <p class="form-message channel-message" aria-live="polite"></p>
        </form>
        ${row.id && !soldRow ? `<button type="button" class="btn btn-secondary mark-sold" data-id="${row.id}" data-channel="${esc(channel)}" style="margin-top:.75rem">MARK SOLD</button>` : ""}
        ${soldRow ? `<form class="sale-figures" data-id="${row.id}" style="margin-top:.75rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.75rem;align-items:end"><label>Actual sold price<input name="sold_price" type="number" min="0" step="0.01" value="${esc(row.sold_price ?? row.asking_price ?? "")}" required></label><label>Selling fees<input name="selling_fees" type="number" min="0" step="0.01" value="${esc(row.selling_fees ?? 0)}"></label><label>Shipping cost<input name="shipping_cost" type="number" min="0" step="0.01" value="${esc(row.shipping_cost ?? 0)}"></label><button class="btn btn-secondary" type="submit">SAVE SALE FIGURES</button></form>` : ""}
      </article>`;
    }).join("");

    box.innerHTML = `<div class="valuation-card"><h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2><p>Asset reference: <strong>${esc(asset.asset_reference)}</strong></p><p>This is the master listing page. Every sales-channel listing uses the same inventory record, photographs and product facts.</p><ul class="check-list">${Object.entries(checks).map(([key, passed]) => `<li>${passed ? "✓" : "✕"} ${esc(labels[key] || key)}</li>`).join("")}</ul>${ready ? `<div class="form-message success">Asset is ready for sales-channel listing.</div>` : `<div class="form-message error">Not ready for sales-channel listing. Missing: ${esc(failed.join(", "))}</div>`}${warningHtml}</div>
    <div class="valuation-card" style="margin-top:1rem"><h2>Product Listing Master Data</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem"><p><strong>Manufacturer:</strong><br>${esc(asset.manufacturer || "Not recorded")}</p><p><strong>Model:</strong><br>${esc(asset.model || "Not recorded")}</p><p><strong>Package:</strong><br>${esc(asset.package_name || "Not recorded")}</p><p><strong>Staff condition:</strong><br>${esc(asset.condition_grade || "Not recorded")}</p><p><strong>Customer condition:</strong><br>${esc(asset.customer_condition || "Not recorded")}</p><p><strong>Serial number:</strong><br>${esc(asset.serial_number || "Not recorded")}</p><p><strong>Batteries:</strong><br>${esc(asset.actual_battery_count ?? "Not recorded")}</p><p><strong>Purchase price:</strong><br>${asset.purchase_price == null ? "Not recorded" : `£${Number(asset.purchase_price).toFixed(2)}`}</p></div><p><strong>Inventory description:</strong></p><p>${esc(asset.description || "Not recorded")}</p></div>
    <div class="valuation-card" style="margin-top:1rem"><h2>Photographs</h2><p>${photos.length} photograph${photos.length === 1 ? "" : "s"} available to every sales channel listing.</p>${photoHtml}<p style="margin-top:1rem"><a class="btn btn-secondary" href="inventory-testing.html?id=${encodeURIComponent(id)}&stage=testing">ADD / TAKE PHOTOGRAPHS</a></p></div>
    <div class="valuation-card" style="margin-top:1rem"><h2>Sales Channels — Listing Editor</h2><p>Choose a channel below, edit its full title and description if needed, enter the external listing reference, price and status, then save. The asset remains in Inventory.</p>${channelCards}</div>`;

    box.querySelectorAll(".delist-button").forEach(button => button.addEventListener("click", async () => {
      button.disabled = true;
      const { error } = await db.from("resale_listings").update({ status: "Cancelled", updated_at: new Date().toISOString() }).eq("id", button.dataset.id);
      if (error) { button.disabled = false; alert(error.message); return; }
      load();
    }));

    box.querySelectorAll(".channel-form").forEach(form => form.addEventListener("submit", async event => {
      event.preventDefault();
      const fd = new FormData(form), button = form.querySelector("button[type=submit]"), message = form.querySelector(".channel-message");
      const channel = form.dataset.channel, existingId = form.dataset.id || null, status = String(fd.get("status") || "Draft");
      if (!ready && !existingId) { message.textContent = "Complete the readiness checks before creating a channel listing."; message.className = "form-message error"; return; }
      button.disabled = true; message.textContent = "Saving listing…"; message.className = "form-message";
      const listingData = { manufacturer: asset.manufacturer, model: asset.model, package: asset.package_name, staff_condition: asset.condition_grade, customer_condition: asset.customer_condition, serial_number: asset.serial_number, battery_count: asset.actual_battery_count, asset_reference: asset.asset_reference, photo_count: photos.length };
      const payload = { sales_channel: channel, listing_title: String(fd.get("listing_title") || "").trim(), listing_description: String(fd.get("listing_description") || "").trim(), listing_reference: String(fd.get("listing_reference") || "").trim() || null, asking_price: fd.get("asking_price") === "" ? null : Number(fd.get("asking_price")), status, listing_data: listingData };
      const result = existingId ? await db.from("resale_listings").update(payload).eq("id", existingId).select().single() : await db.from("resale_listings").insert({ asset_id: id, ...payload }).select().single();
      if (result.error) { message.textContent = result.error.message || "Could not save listing."; message.className = "form-message error"; button.disabled = false; return; }
      if (status === "Published" && ["Ready for Resale", "Listed"].includes(asset.status)) {
        try { await window.AssetStateActions.transitionAsset(id, "Listed", `${channel} listing published`); }
        catch (err) { message.textContent = `Listing saved, but inventory status could not be updated: ${err?.message || "Unknown error"}`; message.className = "form-message error"; button.disabled = false; return; }
      }
      message.textContent = `${channel} listing saved.`; message.className = "form-message success"; button.disabled = false; setTimeout(load, 250);
    }));

    box.querySelectorAll(".mark-sold").forEach(button => button.addEventListener("click", async () => {
      const article = button.closest("article");
      const soldPrice = prompt("Actual sold price (£):", article.querySelector('[name="asking_price"]')?.value || ""); if (soldPrice === null) return;
      const fees = prompt("Selling fees (£), if any:", "0"); if (fees === null) return;
      const shipping = prompt("Shipping cost (£), if any:", "0"); if (shipping === null) return;
      button.disabled = true;
      const listingId = button.dataset.id, now = new Date().toISOString();
      const { error } = await db.from("resale_listings").update({ status: "Sold", sold_at: now, sold_price: Number(soldPrice), selling_fees: Number(fees || 0), shipping_cost: Number(shipping || 0) }).eq("id", listingId);
      if (error) { alert(error.message); button.disabled = false; return; }
      const tx = await db.from("resale_transactions").insert({ asset_id: id, listing_id: listingId, sales_channel: button.dataset.channel, sale_price: Number(soldPrice), additional_costs: Number(fees || 0) + Number(shipping || 0), status: "completed", sale_date: now });
      if (tx.error && !String(tx.error.message || "").toLowerCase().includes("duplicate")) { alert(`Sale recorded, but profit transaction was not recorded: ${tx.error.message}`); button.disabled = false; return; }
      if (["Listed", "Reserved"].includes(asset.status)) {
        try { await window.AssetStateActions.transitionAsset(id, "Sold", `Sold on ${button.dataset.channel}`); }
        catch (err) { alert(`Sale recorded, but inventory status could not be updated: ${err.message}`); button.disabled = false; return; }
      }
      load();
    }));

    box.querySelectorAll(".sale-figures").forEach(form => form.addEventListener("submit", async event => {
      event.preventDefault();
      const fd = new FormData(form), message = form.querySelector("button");
      const { error } = await db.from("resale_listings").update({ sold_price: Number(fd.get("sold_price")), selling_fees: Number(fd.get("selling_fees") || 0), shipping_cost: Number(fd.get("shipping_cost") || 0) }).eq("id", form.dataset.id);
      const note = document.createElement("p"); note.className = `form-message ${error ? "error" : "success"}`; note.textContent = error?.message || "Sale figures saved."; form.appendChild(note); if (message) message.disabled = false;
    }));
  }
  await load();
});
if (typeof window !== "undefined") window.ListingReadiness = { validateListingReadiness: () => ({ ready: true }) };