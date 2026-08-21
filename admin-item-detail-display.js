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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const pretty = value => String(value ?? "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());

  const photoUrl = photo => {
    if (typeof photo === "string") return /^https?:\/\//i.test(photo) ? photo : "";
    const value = photo?.url || "";
    return /^https?:\/\//i.test(value) ? value : "";
  };

  let queued = false;

  async function applyDetails() {
    const { data: items } = await auth.supabase
      .from("quote_items")
      .select("id,item_data,item_name")
      .eq("valuation_id", valuationId)
      .order("item_position", { ascending: true });

    if (!items?.length) return;
    const byId = new Map(items.map(item => [item.id, item]));

    box.querySelectorAll(".valuation-card").forEach(card => {
      if (card.dataset.itemDetailsRendered === "1") return;
      const marker = card.querySelector("[data-item]");
      const itemId = marker?.dataset.item;
      if (!itemId) return;

      const item = byId.get(itemId);
      if (!item) return;
      const data = item.item_data && typeof item.item_data === "object" ? item.item_data : {};
      const batteries = Array.isArray(data.batteries) ? data.batteries : [];
      const contents = data.packageContents && typeof data.packageContents === "object" ? data.packageContents : {};
      const accessories = Array.isArray(data.additionalAccessories) ? data.additionalAccessories : [];
      const photos = Array.isArray(data.photos) ? data.photos.map(photoUrl).filter(Boolean) : [];

      const fields = [
        ["Condition", data.condition],
        ["Flight time", data.flightHours || data.flightHoursRange],
        ["Damage", data.damage ? `${pretty(data.damage)}${data.damageDescription ? ` — ${data.damageDescription}` : ""}` : ""],
        ["Unbound", data.unbound],
        ["Drone serial", data.droneSerial],
        ["Controller serial", data.controllerSerial],
        ["Legal right to sell", data.legalRight]
      ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

      const fieldHtml = fields.length
        ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem 1.25rem;">${fields.map(([label, value]) => `<div><strong>${esc(label)}</strong><p>${esc(pretty(value))}</p></div>`).join("")}</div>`
        : "<p>No additional item details were recorded.</p>";

      const batteryHtml = batteries.length
        ? `<h4>Batteries</h4><ul>${batteries.map((battery, index) => `<li>Battery ${index + 1}: ${esc(battery.type || "Unknown")}${battery.cycles !== undefined ? ` · ${esc(battery.cycles)} cycles` : ""}</li>`).join("")}</ul>`
        : "";

      const contentsHtml = Object.keys(contents).length
        ? `<h4>Package contents</h4><ul>${Object.entries(contents).map(([key, value]) => `<li><strong>${esc(pretty(key))}:</strong> ${esc(pretty(value))}</li>`).join("")}</ul>`
        : "";

      const accessoriesHtml = accessories.length
        ? `<h4>Additional accessories</h4><ul>${accessories.map(accessory => `<li>${esc(typeof accessory === "string" ? accessory : JSON.stringify(accessory))}</li>`).join("")}</ul>`
        : "";

      const photosHtml = photos.length
        ? `<h4>Customer photographs</h4><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.75rem;">${photos.map((url, index) => `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(item.item_name || "Item")} photograph ${index + 1}" loading="lazy" style="display:block;width:100%;height:150px;object-fit:cover;border-radius:4px;"></a>`).join("")}</div>`
        : "<p>No photographs supplied for this item.</p>";

      const details = document.createElement("details");
      details.className = "admin-item-details";
      details.style.cssText = "margin-top:1rem;border-top:1px solid #ddd;padding-top:1rem;";
      details.innerHTML = `<summary style="cursor:pointer;font-weight:800;">VIEW SUBMITTED ITEM DETAILS</summary><div style="padding-top:1rem;">${fieldHtml}${batteryHtml}${contentsHtml}${accessoriesHtml}${photosHtml}</div>`;

      const target = card.querySelector(".refuse-item-button")?.closest("div[style*='margin-top']") || card.querySelector(".offer-price")?.closest('div[style*="display:grid"]')?.parentElement || card.lastElementChild;
      if (target) target.insertAdjacentElement("beforebegin", details);
      else card.appendChild(details);
      card.dataset.itemDetailsRendered = "1";
    });
  }

  function queueApply() {
    if (queued) return;
    queued = true;
    window.setTimeout(async () => {
      queued = false;
      try { await applyDetails(); } catch (error) { console.error("Per-item detail display failed", error); }
    }, 80);
  }

  const observer = new MutationObserver(queueApply);
  observer.observe(box, { childList: true, subtree: true });
  queueApply();
});
