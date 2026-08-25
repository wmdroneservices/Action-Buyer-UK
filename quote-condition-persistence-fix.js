/* GearCashOut: preserve the customer's selected condition in the quote item. */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quote-form");
  if (!form) return;

  const clean = value => String(value ?? "").trim();
  const checked = name => form.querySelector(`input[name="${name}"]:checked`)?.value || "";

  // The reverse-basket wizard keeps the current item in a private closure.
  // Capture the Step 7 add-item click and repair the persisted basket after
  // the wizard has written the new row. This keeps the condition available to
  // quote submission and, ultimately, the purchase -> inventory boundary.
  form.addEventListener("click", event => {
    const button = event.target.closest("button.btn-next");
    if (!button || button.closest(".wizard-step")?.dataset.step !== "7") return;

    const condition = clean(checked("condition"));
    if (!condition) return;

    const manufacturer = clean(document.getElementById("gear-manufacturer")?.value);
    const model = clean(document.getElementById("dji-model")?.value);
    const packageValue = clean(document.getElementById("package-select")?.value);

    window.setTimeout(() => {
      try {
        const key = "gearCashOutQuoteBasket";
        const basket = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(basket)) return;

        const match = [...basket].reverse().find(row =>
          clean(row.manufacturer).toLowerCase() === manufacturer.toLowerCase() &&
          clean(row.model).toLowerCase() === model.toLowerCase() &&
          clean(row.package).toLowerCase() === packageValue.toLowerCase()
        );

        if (!match) return;
        match.condition = condition;
        match.missingItems = checked("missingItems") === "yes";
        match.exceptionNotes = clean(document.getElementById("exception-notes")?.value);
        match.damage = condition === "damaged" || condition === "not-working";
        match.serialNumber = clean(document.getElementById("drone-serial-number")?.value);
        localStorage.setItem(key, JSON.stringify(basket));
      } catch (error) {
        console.error("Could not preserve quote condition", error);
      }
    }, 0);
  }, false);
});
