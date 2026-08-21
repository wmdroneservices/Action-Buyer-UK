/* GearCashOut admin per-item detail and photograph display. */
document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("offer-controls");
  if (!auth || !box) return;
  const session = await auth.getSession();
  if (!session) return;
  const valuationId = new URLSearchParams(window.location.search).get("id");
  if (!valuationId) return;
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const pretty = value => String(value ?? "").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
  async function signedPhotoUrl(photo) {
    const path = typeof photo === "string" ? photo : (photo?.path || photo?.url || "");
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    try {
      const { data, error } = await auth.supabase.storage.from("quote-photos").createSignedUrl(path, 3600);
      return error || !data?.signedUrl ? "" : data.signedUrl;
    } catch (_) { return ""; }
  }
  let queued = false;
  async function applyDetails() {
    const [{ data: items }, { data: valuation }] = await Promise.all([
      auth.supabase.from("quote_items").select("id,item_data,item_name,item_position").eq("valuation_id", valuationId).order("item_position", { ascending: true }),
      auth.supabase.from("valuations").select("quote_data").eq("id", valuationId).maybeSingle()
    ]);
    if (!items?.length) return;
    const byId = new Map(items.map(item => [item.id, item]));
    const groupedPhotos = Array.isArray(valuation?.quote_data?.itemPhotos) ? valuation.quote_data.itemPhotos : [];
    for (const card of box.querySelectorAll(".valuation-card")) {
      if (card.dataset.itemDetailsRendered === "1") continue;
      const itemId = card.querySelector("[data-item]")?.dataset.item;
      const item = itemId ? byId.get(itemId) : null;
      if (!item) continue;
      const data = item.item_data && typeof item.item_data === "object" ? item.item_data : {};
      const batteries = Array.isArray(data.batteries) ? data.batteries : [];
      const contents = data.packageContents && typeof data.packageContents === "object" ? data.packageContents : {};
      const accessories = Array.isArray(data.additionalAccessories) ? data.additionalAccessories : [];
      let rawPhotos = Array.isArray(data.photos) ? data.photos : [];
      if (!rawPhotos.length && groupedPhotos[item.item_position - 1]) rawPhotos = groupedPhotos[item.item_position - 1];
      const photos = (await Promise.all(rawPhotos.map(signedPhotoUrl))).filter(Boolean);
      const fields = [["Condition", data.condition],["Flight time", data.flightHours || data.flightHoursRange],["Damage", data.damage ? `${pretty(data.damage)}${data.damageDescription ? ` — ${data.damageDescription}` : ""}` : ""],["Unbound", data.unbound],["Drone serial", data.droneSerial],["Controller serial", data.controllerSerial],["Legal right to sell", data.legalRight]].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
      const fieldHtml = fields.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem 1.25rem;">${fields.map(([label, value]) => `<div><strong>${esc(label)}</strong><p>${esc(pretty(value))}</p></div>`).join("")}</div>` : "<p>No additional item details were recorded.</p>";
      const batteryHtml = batteries.length ? `<h4>Batteries</h4><ul>${batteries.map((battery, index) => `<li>Battery ${index + 1}: ${esc(battery.type || "Unknown")}${battery.cycles !== undefined ? ` · ${esc(battery.cycles)} cycles` : ""}</li>`).join("")}</ul>` : "";
      const contentsHtml = Object.keys(contents).length ? `<h4>Package contents</h4><ul>${Object.entries(contents).map(([key, value]) => `<li><strong>${esc(pretty(key))}:</strong> ${esc(pretty(value))}</li>`).join("")}</ul>` : "";
      const accessoriesHtml = accessories.length ? `<h4>Additional accessories</h4><ul>${accessories.map(accessory => `<li>${esc(typeof accessory === "string" ? accessory : JSON.stringify(accessory))}</li>`).join("")}</ul>` : "";
      const photosHtml = photos.length ? `<h4>Photographs</h4><div class="admin-photo-grid item-photo-grid">${photos.map((url, index) => `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(item.item_name || "Item")} photograph ${index + 1}" loading="lazy"></a>`).join("")}</div>` : "<h4>Photographs</h4><p>No photographs supplied for this item.</p>";
      const details = document.createElement("details");
      details.className = "admin-item-details";
      details.style.cssText = "margin-top:1rem;border-top:1px solid #ddd;padding-top:1rem;";
      details.innerHTML = `<summary style="cursor:pointer;font-weight:800;">VIEW SUBMITTED ITEM DETAILS</summary><div style="padding-top:1rem;">${fieldHtml}${batteryHtml}${contentsHtml}${accessoriesHtml}${photosHtml}</div>`;
      const target = card.querySelector(".refuse-item-button")?.closest("div[style*='margin-top']") || card.querySelector(".offer-price")?.closest('div[style*="display:grid"]')?.parentElement || card.lastElementChild;
      if (target) target.insertAdjacentElement("beforebegin", details); else card.appendChild(details);
      card.dataset.itemDetailsRendered = "1";
    }
  }
  function queueApply() {
    if (queued) return;
    queued = true;
    window.setTimeout(async () => { queued = false; try { await applyDetails(); } catch (error) { console.error("Per-item detail display failed", error); } }, 80);
  }
  new MutationObserver(queueApply).observe(box, { childList: true, subtree: true });
  queueApply();
});
