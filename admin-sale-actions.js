document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("sale-details");
  if (!box) return;

  function addReturnAction() {
    const outcomeHeading = [...box.querySelectorAll("h2")].find(h => h.textContent.trim() === "Payment or return");
    if (!outcomeHeading) return;

    const card = outcomeHeading.closest(".account-panel")?.querySelector(".valuation-card");
    if (!card || card.querySelector("#create-return-shipment-from-outcome")) return;

    const returnButton = box.querySelector('.new-shipment[data-type="return"]');
    const returnForm = returnButton ? document.getElementById("shipment-" + returnButton.dataset.sale) : null;
    if (!returnButton || !returnForm) return;

    const action = document.createElement("div");
    action.id = "create-return-shipment-from-outcome";
    action.style.cssText = "display:grid;gap:.65rem;margin-top:.5rem;";
    action.innerHTML = `
      <p><strong>Return shipment:</strong> Create the return shipment here, enter the carrier/service and tracking number, then save it. Once it has actually been posted, use the Return Shipped button to update the customer's account.</p>
      <button class="btn btn-secondary" type="button">CREATE RETURN SHIPMENT</button>
    `;
    action.querySelector("button").addEventListener("click", () => {
      returnButton.click();
      returnForm.scrollIntoView({ behavior: "smooth", block: "center" });
      returnForm.querySelector(".carrier")?.focus();
    });
    card.querySelector("div")?.appendChild(action);
  }

  const observer = new MutationObserver(addReturnAction);
  observer.observe(box, { childList: true, subtree: true });
  addReturnAction();
});
