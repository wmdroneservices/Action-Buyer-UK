document.addEventListener("DOMContentLoaded", async () => {
  const box = document.getElementById("sale-details");
  const auth = window.actionBuyerAuth;
  const saleId = new URLSearchParams(window.location.search).get("id");
  if (!box || !auth || !saleId) return;

  const pretty = value => String(value ?? "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  let items = [];
  try {
    const { data: saleItems } = await auth.supabase
      .from("sale_items")
      .select("quote_item_id")
      .eq("sale_id", saleId)
      .order("created_at", { ascending: true });
    const ids = (saleItems || []).map(row => row.quote_item_id).filter(Boolean);
    if (ids.length) {
      const { data } = await auth.supabase
        .from("quote_items")
        .select("id,item_status,item_data")
        .in("id", ids)
        .order("created_at", { ascending: true });
      items = data || [];
    }
  } catch (_) {}

  let enhanced = false;

  function addInspectionEvidence(section, item) {
    if (!item || section.querySelector(".sale-inspection-evidence")) return;
    const data = item.item_data && typeof item.item_data === "object" ? item.item_data : {};
    const serial = data.serialNumber || data.droneSerial || data.droneSerialNumber || "Not recorded";
    const missing = data.missingItems === true || data.missingItems === "yes" ? "Yes" : "No";
    const notes = data.exceptionNotes || data.exceptionNotesText || "No additional exception notes supplied.";
    const controllerSerial = data.controllerSerial || "Not recorded";
    const status = pretty(item.item_status || "submitted");

    const card = document.createElement("div");
    card.className = "valuation-card sale-inspection-evidence";
    card.style.marginTop = "1rem";
    card.innerHTML = `
      <div class="section-heading">
        <p class="section-kicker">INSPECTION EVIDENCE</p>
        <h3>Submitted item details</h3>
        <p>This information stays on the same sale page. There is no need to open a separate item-review page.</p>
      </div>
      <div class="sale-evidence-grid">
        <div><strong>Serial number</strong><p>${esc(serial)}</p></div>
        <div><strong>Controller serial</strong><p>${esc(controllerSerial)}</p></div>
        <div><strong>Missing items</strong><p>${esc(missing)}</p></div>
        <div><strong>Item status</strong><p>${esc(status)}</p></div>
      </div>
      <div style="margin-top:1rem"><strong>Customer notes / exceptions</strong><p>${esc(notes)}</p></div>
    `;
    section.appendChild(card);
  }

  function enhance() {
    if (enhanced) return true;
    const sections = [...box.querySelectorAll(":scope > .account-panel")];
    if (!sections.length) return false;

    enhanced = true;
    const wrapper = document.createElement("div");
    wrapper.className = "sale-accordion-list";
    let quoteIndex = 0;

    sections.forEach((section, index) => {
      const heading = section.querySelector(".section-heading h2");
      const kicker = section.querySelector(".section-heading .section-kicker");
      const title = heading?.textContent?.trim() || `Section ${index + 1}`;
      const label = kicker?.textContent?.trim() || "SALE";
      const details = document.createElement("details");
      details.className = "sale-accordion";
      if (index === 0 || /complete process/i.test(title)) details.open = true;

      const summary = document.createElement("summary");
      summary.innerHTML = `<span><small>${esc(label)}</small><strong>${esc(title)}</strong></span><span class="sale-accordion-chevron">+</span>`;
      details.appendChild(summary);

      const content = document.createElement("div");
      content.className = "sale-accordion-content";
      content.appendChild(section);
      details.appendChild(content);
      wrapper.appendChild(details);

      if (/original quote/i.test(label)) {
        addInspectionEvidence(section, items[quoteIndex] || items[0]);
        quoteIndex += 1;
      }
    });

    box.replaceChildren(wrapper);
    box.querySelectorAll('a[href*="admin-quote.html"]').forEach(link => link.remove());
    box.querySelectorAll('a[href*="admin-item-review.html"]').forEach(link => link.remove());
    return true;
  }

  const observer = new MutationObserver(() => {
    if (enhance()) observer.disconnect();
  });
  observer.observe(box, { childList: true, subtree: true });
  enhance();
});
