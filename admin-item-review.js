/* Dedicated staff drill-down page for one submitted quote item. */
document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const itemId = new URLSearchParams(window.location.search).get("item_id");
  const box = document.getElementById("item-details");
  const message = document.getElementById("review-message");
  if (!auth || !itemId || !box) return;

  const session = await auth.getSession();
  if (!session) {
    window.location.href = "login.html?return=" + encodeURIComponent(window.location.pathname + window.location.search);
    return;
  }

  const { data: staff } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!staff) {
    box.innerHTML = "<p>You do not have permission to access item review.</p>";
    return;
  }

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const pretty = value => String(value ?? "")
    .replaceAll("_", " ").replaceAll("-", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
  const money = value => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value) || 0);

  async function photoUrl(photo) {
    const path = typeof photo === "string" ? photo : (photo?.path || photo?.url || "");
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    try {
      const { data, error } = await auth.supabase.storage.from("quote-photos").createSignedUrl(path, 3600);
      return error || !data?.signedUrl ? "" : data.signedUrl;
    } catch (_) { return ""; }
  }

  const { data: item, error: itemError } = await auth.supabase
    .from("quote_items")
    .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position,item_data,created_at,updated_at")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item) {
    box.innerHTML = "<p>We couldn't load this submitted item.</p>";
    return;
  }

  const { data: valuation, error: valuationError } = await auth.supabase
    .from("valuations")
    .select("id,user_id,quote_reference,status,submitted_at,quote_data")
    .eq("id", item.valuation_id)
    .maybeSingle();

  if (valuationError || !valuation) {
    box.innerHTML = "<p>We couldn't load the parent quote for this item.</p>";
    return;
  }

  const data = item.item_data && typeof item.item_data === "object" ? item.item_data : {};
  const q = valuation.quote_data && typeof valuation.quote_data === "object" ? valuation.quote_data : {};

  document.getElementById("item-title").textContent = item.item_name || data.modelName || data.model || "Submitted item";
  document.getElementById("item-reference").textContent = `${valuation.quote_reference || "Quote"} · Item ${item.item_position || ""} · ${pretty(item.item_status || valuation.status || "submitted")}`;
  document.getElementById("back-quote").href = `admin-quote.html?id=${encodeURIComponent(valuation.id)}`;

  const customer = {
    name: q.fullName || "Unnamed customer",
    email: q.email || "No email recorded",
    phone: q.phone || "No phone recorded"
  };

  let rawPhotos = Array.isArray(data.photos) ? data.photos : [];
  if (!rawPhotos.length && Array.isArray(q.itemPhotos) && Array.isArray(q.itemPhotos[item.item_position - 1])) {
    rawPhotos = q.itemPhotos[item.item_position - 1];
  }
  const photos = (await Promise.all(rawPhotos.map(photoUrl))).filter(Boolean);

  const fields = [
    ["Equipment type", data.categoryName || data.category],
    ["Manufacturer", data.manufacturerName || data.manufacturer || item.manufacturer],
    ["Model", data.modelName || data.model || item.model],
    ["Package", data.packageName || data.package || item.package],
    ["Condition", data.condition],
    ["Flight time", data.flightHours],
    ["Flight-time range", data.flightHoursRange],
    ["Damage", data.damage],
    ["Damage description", data.damageDescription],
    ["Unbound status", data.unbound],
    ["Legal right to sell", data.legalRight],
    ["Drone serial", data.droneSerial],
    ["Drone serial status", data.droneSerialStatus],
    ["Controller serial", data.controllerSerial],
    ["Controller serial status", data.controllerSerialStatus],
    ["Submitted valuation", data.amount != null ? money(data.amount) : data.valuation]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  const fieldHtml = fields.length
    ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1rem 1.5rem;">${fields.map(([label, value]) => `<div><strong>${esc(label)}</strong><p>${esc(pretty(value))}</p></div>`).join("")}</div>`
    : "<p>No item fields were recorded.</p>";

  const batteries = Array.isArray(data.batteries) ? data.batteries : [];
  const batteryHtml = batteries.length
    ? `<h3>Batteries</h3><ul>${batteries.map((battery, index) => `<li><strong>Battery ${index + 1}:</strong> ${esc(battery.type || "Unknown")} · ${esc(battery.cycles ?? "—")} cycles</li>`).join("")}</ul>`
    : `<h3>Batteries</h3><p>No battery information recorded.</p>`;

  const contents = data.packageContents && typeof data.packageContents === "object" ? data.packageContents : {};
  const contentsHtml = Object.keys(contents).length
    ? `<h3>Package contents</h3><ul>${Object.entries(contents).map(([key, value]) => `<li><strong>${esc(pretty(key))}:</strong> ${esc(pretty(value))}</li>`).join("")}</ul>`
    : `<h3>Package contents</h3><p>No package contents recorded.</p>`;

  const accessories = Array.isArray(data.additionalAccessories) ? data.additionalAccessories : [];
  const accessoriesHtml = accessories.length
    ? `<h3>Additional accessories</h3><ul>${accessories.map(value => `<li>${esc(typeof value === "string" ? value : JSON.stringify(value))}</li>`).join("")}</ul>`
    : `<h3>Additional accessories</h3><p>None recorded.</p>`;

  const photosHtml = photos.length
    ? `<h3>Photographs (${photos.length})</h3><div class="admin-photo-grid item-photo-grid">${photos.map((url, index) => `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(item.item_name || "Item")} photograph ${index + 1}" loading="lazy"></a>`).join("")}</div>`
    : `<h3>Photographs</h3><div class="notice"><strong>No photographs are available for this item.</strong><p>The item record contains no usable photograph paths.</p></div>`;

  box.innerHTML = `<div class="valuation-card" style="display:block;">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem 1.5rem;padding-bottom:1.25rem;border-bottom:1px solid #ddd;margin-bottom:1.25rem;">
      <div><strong>Customer</strong><p>${esc(customer.name)}</p></div>
      <div><strong>Email</strong><p>${esc(customer.email)}</p></div>
      <div><strong>Phone</strong><p>${esc(customer.phone)}</p></div>
      <div><strong>Quote reference</strong><p>${esc(valuation.quote_reference || "—")}</p></div>
      <div><strong>Submitted</strong><p>${valuation.submitted_at ? new Date(valuation.submitted_at).toLocaleString("en-GB") : "—"}</p></div>
      <div><strong>Item status</strong><p>${esc(pretty(item.item_status || "submitted"))}</p></div>
    </div>
    ${fieldHtml}
    ${batteryHtml}
    ${contentsHtml}
    ${accessoriesHtml}
    ${photosHtml}
  </div>`;

  message.textContent = "This page is the item-specific submitted evidence record for staff review.";
  message.className = "form-message success";
});
