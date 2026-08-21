/* GearCashOut admin per-item detail and photograph display. */
document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("offer-controls");
  if (!auth || !box) return;
  const session = await auth.getSession();
  if (!session) return;
  const valuationId = new URLSearchParams(window.location.search).get("id");
  if (!valuationId) return;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const pretty = value => String(value ?? "")
    .replaceAll("_", " ").replaceAll("-", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());

  async function signedPhotoUrl(photo) {
    const path = typeof photo === "string" ? photo : (photo?.path || photo?.url || "");
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    try {
      const { data, error } = await auth.supabase.storage.from("quote-photos").createSignedUrl(path, 3600);
      return error || !data?.signedUrl ? "" : data.signedUrl;
    } catch (_) { return ""; }
  }

  function findCardForItem(item) {
    const cards = [...box.querySelectorAll(".valuation-card")];
    const wanted = String(item.item_name || item.item_data?.itemName || "").trim().toLowerCase();
    return cards.find(card => {
      const heading = card.querySelector("h3")?.textContent?.trim().toLowerCase() || "";
      return heading === wanted;
    }) || null;
  }

  function valueOrDash(value) {
    return value === undefined || value === null || String(value).trim() === "" ? "—" : pretty(value);
  }

  async function renderItem(card, item, groupedPhotos) {
    if (!card || card.dataset.itemDetailsRendered === "1") return;
    const data = item.item_data && typeof item.item_data === "object" ? item.item_data : {};
    const batteries = Array.isArray(data.batteries) ? data.batteries : [];
    const contents = data.packageContents && typeof data.packageContents === "object" ? data.packageContents : {};
    const accessories = Array.isArray(data.additionalAccessories) ? data.additionalAccessories : [];

    let rawPhotos = Array.isArray(data.photos) ? data.photos : [];
    if (!rawPhotos.length && groupedPhotos[item.item_position - 1]) rawPhotos = groupedPhotos[item.item_position - 1];
    const photos = (await Promise.all(rawPhotos.map(signedPhotoUrl))).filter(Boolean);

    const fields = [
      ["Equipment type", data.categoryName || data.category],
      ["Manufacturer", data.manufacturerName || data.manufacturer],
      ["Model", data.modelName || data.model],
      ["Package", data.packageName || data.package],
      ["Condition", data.condition],
      ["Flight hours", data.flightHours],
      ["Flight-hour range", data.flightHoursRange],
      ["Damage", data.damage],
      ["Damage description", data.damageDescription],
      ["Unbound status", data.unbound],
      ["Legal right to sell", data.legalRight],
      ["Drone serial", data.droneSerial],
      ["Drone serial status", data.droneSerialStatus],
      ["Controller serial", data.controllerSerial],
      ["Controller serial status", data.controllerSerialStatus],
      ["Valuation", data.amount != null ? `£${Number(data.amount).toFixed(2)}` : data.valuation]
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

    const fieldHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.75rem 1.25rem;">${fields.map(([label, value]) => `<div><strong>${esc(label)}</strong><p>${esc(valueOrDash(value))}</p></div>`).join("")}</div>`;
    const batteryHtml = batteries.length
      ? `<h4>Batteries</h4><ul>${batteries.map((battery, index) => `<li><strong>Battery ${index + 1}:</strong> ${esc(battery.type || "Unknown")} · ${esc(battery.cycles ?? "—")} cycles</li>`).join("")}</ul>`
      : `<h4>Batteries</h4><p>No battery information recorded.</p>`;
    const contentsHtml = Object.keys(contents).length
      ? `<h4>Package contents</h4><ul>${Object.entries(contents).map(([key, value]) => `<li><strong>${esc(pretty(key))}:</strong> ${esc(pretty(value))}</li>`).join("")}</ul>`
      : `<h4>Package contents</h4><p>No package contents recorded.</p>`;
    const accessoriesHtml = accessories.length
      ? `<h4>Additional accessories</h4><ul>${accessories.map(accessory => `<li>${esc(typeof accessory === "string" ? accessory : JSON.stringify(accessory))}</li>`).join("")}</ul>`
      : `<h4>Additional accessories</h4><p>None recorded.</p>`;
    const photosHtml = photos.length
      ? `<h4>Photographs</h4><div class="admin-photo-grid item-photo-grid">${photos.map((url, index) => `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(item.item_name || "Item")} photograph ${index + 1}" loading="lazy"></a>`).join("")}</div>`
      : `<h4>Photographs</h4><p>No photographs supplied for this item.</p>`;

    const details = document.createElement("details");
    details.className = "admin-item-details";
    details.style.cssText = "margin-top:1rem;border-top:1px solid #ddd;padding-top:1rem;";
    details.innerHTML = `<summary style="cursor:pointer;font-weight:800;">VIEW SUBMITTED ITEM DETAILS</summary><div style="padding-top:1rem;">${fieldHtml}${batteryHtml}${contentsHtml}${accessoriesHtml}${photosHtml}</div>`;
    details.open = false;
    card.appendChild(details);
    card.dataset.itemDetailsRendered = "1";
  }

  let queued = false;
  async function applyDetails() {
    const [{ data: items }, { data: valuation }] = await Promise.all([
      auth.supabase.from("quote_items").select("id,item_data,item_name,item_position").eq("valuation_id", valuationId).order("item_position", { ascending: true }),
      auth.supabase.from("valuations").select("quote_data").eq("id", valuationId).maybeSingle()
    ]);
    if (!items?.length) return;
    const groupedPhotos = Array.isArray(valuation?.quote_data?.itemPhotos) ? valuation.quote_data.itemPhotos : [];
    for (const item of items) {
      const card = findCardForItem(item);
      if (card) await renderItem(card, item, groupedPhotos);
    }
  }

  function queueApply() {
    if (queued) return;
    queued = true;
    window.setTimeout(async () => {
      queued = false;
      try { await applyDetails(); } catch (error) { console.error("Per-item detail display failed", error); }
    }, 80);
  }

  new MutationObserver(queueApply).observe(box, { childList: true, subtree: true });
  queueApply();
});
