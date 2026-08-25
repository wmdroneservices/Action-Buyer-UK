document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("sales-list");
  if (!box) return;

  const addAlerts = () => {
    box.querySelectorAll("article.valuation-card").forEach(card => {
      if (card.querySelector(".shipping-next-step")) return;
      const kicker = card.querySelector(".section-kicker")?.textContent?.trim().toLowerCase() || "";
      if (!kicker.includes("collecting items")) return;
      const meta = card.querySelector(".valuation-meta");
      if (!meta) return;

      const alert = document.createElement("div");
      alert.className = "shipping-next-step";
      alert.style.cssText = "margin:12px 0;padding:12px 14px;border-left:5px solid #c94b2c;background:#fff3ee;color:#8f321f;border-radius:4px;";
      alert.innerHTML = "<strong style=\"display:block;font-size:.8rem;letter-spacing:.08em;\">ACTION REQUIRED</strong><span style=\"display:block;margin-top:.25rem;font-weight:700;\">CUSTOMER ACCEPTED OFFER — CREATE THE CUSTOMER → US SHIPPING LABEL</span><span style=\"display:block;margin-top:.25rem;font-weight:500;\">Use the CUSTOMER → US button below, create the shipping label, enter the tracking details, and save the shipment to email the customer.</span>";
      const heading = meta.querySelector("h4");
      meta.insertBefore(alert, heading || meta.firstChild);
    });
  };

  addAlerts();
  new MutationObserver(addAlerts).observe(box, { childList: true, subtree: true });
});
