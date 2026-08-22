/* Show item-level submitted photographs on the main staff quote review. */
document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("quote-details");
  if (!auth || !box) return;

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;

  const { data: items, error } = await auth.supabase
    .from("quote_items")
    .select("id,item_position,item_name,item_data")
    .eq("valuation_id", id)
    .order("item_position", { ascending: true });

  if (error || !items?.length) return;

  const photos = [];
  const seen = new Set();
  for (const item of items) {
    const list = Array.isArray(item.item_data?.photos) ? item.item_data.photos : [];
    for (const photo of list) {
      const path = typeof photo === "string" ? photo : (photo?.path || photo?.url);
      if (!path || seen.has(path)) continue;
      seen.add(path);
      photos.push({ path, name: typeof photo === "string" ? "Customer photograph" : (photo.name || "Customer photograph"), item: item.item_name || `Item ${item.item_position || ""}` });
    }
  }

  function render() {
    if (!box.isConnected || box.querySelector(".item-photo-summary")) return;
    if (!box.querySelector(".valuation-card")) return;

    const section = document.createElement("section");
    section.className = "item-photo-summary";
    section.style.cssText = "margin-top:1rem;";
    section.innerHTML = photos.length
      ? `<h3>Submitted photographs (${photos.length})</h3><div class="admin-photo-grid">${photos.map((p, i) => `<a href="${escapeHtml(p.path)}" target="_blank" rel="noopener"><img src="${escapeHtml(p.path)}" alt="${escapeHtml(p.name)} for ${escapeHtml(p.item)}" loading="lazy"></a>`).join("")}</div>`
      : `<h3>Submitted photographs (0)</h3><p>No photographs were stored against the quote items.</p>`;

    box.appendChild(section);
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  const observer = new MutationObserver(render);
  observer.observe(box, { childList: true, subtree: true });
  render();
});
