document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("sales-list");
  if (!box) return;

  function simplify() {
    box.querySelectorAll("article.valuation-card").forEach(card => {
      const ref = card.querySelector(".valuation-ref");
      if (ref && ref.tagName === "A") {
        const span = document.createElement("span");
        span.className = ref.className;
        span.textContent = ref.textContent;
        span.style.fontWeight = "700";
        ref.replaceWith(span);
      }

      card.querySelectorAll('a[href*="admin-sale.html"]').forEach(link => {
        if (link.closest(".sale-next-action")) {
          link.textContent = "OPEN SALE WORKBENCH";
          link.className = "btn btn-primary";
          return;
        }
        link.remove();
      });

      if (!card.querySelector(".sale-next-action a")) {
        const meta = card.querySelector(".valuation-meta");
        if (!meta || meta.querySelector(".open-sale-workbench")) return;
        const row = document.createElement("div");
        row.className = "navigation-buttons open-sale-workbench";
        row.style.cssText = "margin-top:1rem;display:flex;justify-content:flex-start;";
        row.innerHTML = `<a class="btn btn-primary" href="admin-sale.html?id=${encodeURIComponent(card.dataset.saleId || "")}">OPEN SALE WORKBENCH</a>`;
        const saleButton = card.querySelector(".mark-received")?.dataset.sale;
        const refText = card.querySelector(".valuation-ref")?.textContent?.trim();
        if (saleButton) row.querySelector("a").href = `admin-sale.html?id=${encodeURIComponent(saleButton)}`;
        else if (!refText) return;
        meta.appendChild(row);
      }
    });
  }

  new MutationObserver(simplify).observe(box, { childList: true, subtree: true });
  setTimeout(simplify, 500);
});
