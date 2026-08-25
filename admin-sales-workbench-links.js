document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("sales-list");
  if (!box) return;

  function simplify() {
    box.querySelectorAll("article.valuation-card").forEach(card => {
      const ref = card.querySelector(".valuation-ref");
      const saleHref = ref?.getAttribute("href") || card.querySelector('a[href*="admin-sale.html"]')?.getAttribute("href") || "";

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
        if (!meta || meta.querySelector(".open-sale-workbench") || !saleHref) return;
        const row = document.createElement("div");
        row.className = "navigation-buttons open-sale-workbench";
        row.style.cssText = "margin-top:1rem;display:flex;justify-content:flex-start;";
        row.innerHTML = `<a class="btn btn-primary" href="${saleHref}">OPEN SALE WORKBENCH</a>`;
        meta.appendChild(row);
      }
    });
  }

  new MutationObserver(simplify).observe(box, { childList: true, subtree: true });
  setTimeout(simplify, 500);
});
