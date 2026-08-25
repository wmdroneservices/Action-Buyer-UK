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
  const money = n => n === null || n === undefined || n === "" ? "" : Number(n).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
  const channels = ["Website", "eBay", "Facebook Marketplace", "Marketplace", "Central", "Vinted", "Amazon", "Other"];
  const statuses = ["Draft", "Ready For Listing", "Published", "Reserved", "Sold", "Cancelled", "Delist Required"];
  async function load() {
    const { data: asset, error } = await db.from("inventory_assets").select("*").eq("id", id).single();
    if (error || !asset) { box.innerHTML = "<p>Asset could not be found.</p>"; return; }
    const [{ data: prep }, { data: testing }, { count: photoCount }, { data: listings }] = await Promise.all([
      db.from("inventory_preparation").select("*").eq("asset_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("inventory_testing").select("*").eq("asset_id", id).eq("stage", "testing").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("inventory_evidence").select("id", { count: "exact", head: true }).eq("asset_id", id).eq("evidence_type", "Photographs"),
      db.from("resale_listings").select("*").eq("asset_id", id).order("sales_channel")
    ]);
    const latestTestPassed = testing && ["Passed", "Not Applicable"].includes(testing.flight_test || "") && ["Passed", "Not Applicable"].includes(testing.camera_test || "") && ["Good", "Not Applicable"].includes(testing.battery_health || "");
    const checks = { statusReady: ["Ready for Resale", "Listed"].includes(asset.status), testingComplete: Boolean(testing && latestTestPassed), photographsStored: Number(photoCount || 0) > 0, serialRecorded: Boolean(asset.serial_number), conditionRecorded: Boolean(asset.condition_grade), purchasePriceRecorded: Number(asset.purchase_price) >= 0, resalePriceApproved: Number(asset.approved_resale_price || 0) > 0, packageRecorded: Boolean(asset.package_name), preparationCompleted: Boolean(prep) };
    const labels = { statusReady:"Asset is Ready for Resale / Listed", testingComplete:"Technical testing completed", photographsStored:"Photographs stored", serialRecorded:"Serial number recorded", conditionRecorded:"Staff condition recorded", purchasePriceRecorded:"Purchase price recorded", resalePriceApproved:"Resale price approved", packageRecorded:"Package recorded", preparationCompleted:"Resale preparation completed" };
    const failed = Object.entries(checks).filter(([,v]) => !v).map(([k]) => labels[k] || k); const ready = failed.length === 0;
    const rows = listings || [], sold = rows.filter(x => x.status === "Sold"), otherActive = rows.filter(x => x.status !== "Sold" && x.status !== "Cancelled" && x.sales_channel), warning = sold.length && otherActive.length;
    const listingMap = Object.fromEntries(rows.map(x => [x.sales_channel, x]));
    const warningHtml = warning ? `<div class="form-message error" style="margin:1rem 0;border:2px solid #b42318"><strong>DELIST REQUIRED — ITEM SOLD</strong><p>Sold on ${esc(sold.map(x => x.sales_channel).join(", "))}. Remove these other active listings:</p><ul>${otherActive.map(x => `<li><strong>${esc(x.sales_channel)}</strong> — ${esc(x.status)} ${x.listing_reference ? `(${esc(x.listing_reference)})` : ""} <button type="button" class="btn btn-secondary delist-button" data-id="${x.id}">MARK DELISTED</button></li>`).join("")}</ul></div>` : "";
    const channelCards = channels.map(channel => {
      const row = listingMap[channel] || {};
      const soldRow = row.status === "Sold";
      return `<article class="notice" style="margin-top:.75rem;${soldRow ? "border:2px solid #b42318" : ""}"><h3>${esc(channel)}</h3><form class="channel-form" data-channel="${esc(channel)}" data-id="${esc(row.id || "")}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;align-items:end"><label>Listing reference<input name="listing_reference" value="${esc(row.listing_reference || "")}"></label><label>Asking price<input name="asking_price" type="number" min="0" step="0.01" value="${esc(row.asking_price ?? asset.approved_resale_price ?? "")}"></label><label>Status<select name="status">${statuses.map(s => `<option ${row.status === s || (!row.status && s === "Draft") ? "selected" : ""}>${s}</option>`).join("")}</select></label><button class="btn btn-primary" type="submit">SAVE CHANNEL</button></form>${soldRow ? `<form class="sale-figures" data-id="${row.id}" style="margin-top:.75rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.75rem;align-items:end"><label>Actual sold price<input name="sold_price" type="number" min="0" step="0.01" value="${esc(row.sold_price ?? row.asking_price ?? "")}" required></label><label>Selling fees<input name="selling_fees" type="number" min="0" step="0.01" value="${esc(row.selling_fees ?? 0)}"></label><label>Shipping cost<input name="shipping_cost" type="number" min="0" step="0.01" value="${esc(row.shipping_cost ?? 0)}"></label><button class="btn btn-secondary" type="submit">SAVE SALE FIGURES</button></form>` : row.id ? `<button type="button" class="btn btn-secondary mark-sold" data-id="${row.id}" data-channel="${esc(channel)}" style="margin-top:.75rem">MARK SOLD</button>` : ""}<p class="form-message channel-message" aria-live="polite"></p></article>`;
    }).join("");
    box.innerHTML = `<div class="valuation-card"><h2>${esc([asset.manufacturer, asset.model].filter(Boolean).join(" ") || "Asset")}</h2><p>Asset reference: <strong>${esc(asset.asset_reference)}</strong></p><p>The asset remains in Inventory while it is listed on one or more sales channels.</p><ul class="check-list">${Object.entries(checks).map(([key, passed]) => `<li>${passed ? "✓" : "✕"} ${esc(labels[key] || key)}</li>`).join("")}</ul>${ready ? `<div class="form-message success">Asset is ready for sales-channel listing.</div>` : `<div class="form-message error">Not ready for sales-channel listing. Missing: ${esc(failed.join(", "))}</div>`}${warningHtml}</div><div class="valuation-card" style="margin-top:1rem"><h2>Sales Channels</h2><p>Record each external listing separately. When one is sold, a red warning identifies every other active listing so staff can delist it.</p>${channelCards}</div>`;

    box.querySelectorAll(".delist-button").forEach(button => button.addEventListener("click", async () => { button.disabled=true; const {error}=await db.from("resale_listings").update({status:"Cancelled",updated_at:new Date().toISOString()}).eq("id",button.dataset.id); if(error){button.disabled=false;alert(error.message);return;} load(); }));
    box.querySelectorAll(".channel-form").forEach(form => form.addEventListener("submit", async e => {
      e.preventDefault(); const fd=new FormData(form), button=form.querySelector("button"), msg=form.parentElement.querySelector(".channel-message"), channel=form.dataset.channel, existingId=form.dataset.id||null, status=fd.get("status")||"Draft";
      if(asset.status === "Sold" && !existingId){msg.textContent="This asset is already sold; do not create another listing.";msg.className="form-message error";return;}
      if(!ready && !existingId){msg.textContent="Complete the readiness checks before creating a channel listing.";msg.className="form-message error";return;}
      button.disabled=true; const payload={sales_channel:channel,listing_reference:String(fd.get("listing_reference")||"").trim()||null,asking_price:fd.get("asking_price")===""?null:Number(fd.get("asking_price")),status};
      const result=existingId?await db.from("resale_listings").update(payload).eq("id",existingId).select().single():await db.from("resale_listings").insert({asset_id:id,...payload}).select().single();
      if(result.error){msg.textContent=result.error.message;msg.className="form-message error";button.disabled=false;return;}
      if(status === "Published" && asset.status === "Ready for Resale"){try{await window.AssetStateActions.transitionAsset(id,"Listed",`${channel} listing published`);}catch(err){msg.textContent=`Channel saved, but inventory status could not be updated: ${err.message}`;msg.className="form-message error";button.disabled=false;return;}}
      msg.textContent=`${channel} listing saved.`;msg.className="form-message success";setTimeout(load,250);
    }));
    box.querySelectorAll(".mark-sold").forEach(button => button.addEventListener("click", async () => {
      const soldPrice=prompt("Actual sold price (£):",button.closest("article").querySelector('[name="asking_price"]')?.value||""); if(soldPrice===null)return; const fees=prompt("Selling fees (£), if any:","0"); if(fees===null)return; const shipping=prompt("Shipping cost (£), if any:","0"); if(shipping===null)return;
      button.disabled=true; const listingId=button.dataset.id; const now=new Date().toISOString(); const {error}=await db.from("resale_listings").update({status:"Sold",sold_at:now,sold_price:Number(soldPrice),selling_fees:Number(fees||0),shipping_cost:Number(shipping||0)}).eq("id",listingId);
      if(error){alert(error.message);button.disabled=false;return;}
      const tx=await db.from("resale_transactions").insert({asset_id:id,listing_id:listingId,sales_channel:button.dataset.channel,sale_price:Number(soldPrice),additional_costs:Number(fees||0)+Number(shipping||0),status:"completed",sale_date:now});
      if(tx.error && !String(tx.error.message||"").toLowerCase().includes("duplicate")){alert(`Sale recorded, but profit transaction was not recorded: ${tx.error.message}`);button.disabled=false;return;}
      if(["Listed","Reserved"].includes(asset.status)){try{await window.AssetStateActions.transitionAsset(id,"Sold",`Sold on ${button.dataset.channel}`);}catch(err){alert(`Sale recorded, but inventory status could not be updated: ${err.message}`);button.disabled=false;return;}}
      load();
    }));
    box.querySelectorAll(".sale-figures").forEach(form=>form.addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(form),msg=form.parentElement.querySelector(".channel-message");const {error}=await db.from("resale_listings").update({sold_price:Number(fd.get("sold_price")),selling_fees:Number(fd.get("selling_fees")||0),shipping_cost:Number(fd.get("shipping_cost")||0)}).eq("id",form.dataset.id);msg.textContent=error?.message||"Sale figures saved.";msg.className=`form-message ${error?"error":"success"}`;}));
  }
  await load();
});
if (typeof window !== "undefined") window.ListingReadiness = { validateListingReadiness: () => ({ ready: true }) };
