// ============================================================
// STEP 9 - ADDITIONAL EQUIPMENT
// ============================================================

const additionalEquipmentList =
  document.getElementById("additional-equipment-list");

const addAdditionalItemButton =
  document.getElementById("add-additional-item-btn");

let additionalItemCount = 0;

function addAdditionalEquipment() {
  if (!additionalEquipmentList) return;

  additionalItemCount++;

  const item = document.createElement("div");
  item.className = "additional-equipment-item";

  item.innerHTML = `
    <div class="additional-item-header">
      <strong>Additional Item ${additionalItemCount}</strong>
      <button
        type="button"
        class="btn btn-remove-additional"
        aria-label="Remove additional equipment item">
        Remove
      </button>
    </div>

    <label for="additional-description-${additionalItemCount}">
      Item description
    </label>

    <input
      type="text"
      id="additional-description-${additionalItemCount}"
      name="additionalDescription${additionalItemCount}"
      placeholder="e.g. DJI Intelligent Flight Battery"
      required
    />

    <label for="additional-quantity-${additionalItemCount}">
      Quantity
    </label>

    <input
      type="number"
      id="additional-quantity-${additionalItemCount}"
      name="additionalQuantity${additionalItemCount}"
      min="1"
      step="1"
      value="1"
      required
    />

    <div class="additional-battery-fields">

      <label for="additional-battery-type-${additionalItemCount}">
        Battery type (if applicable)
      </label>

      <input
        type="text"
        id="additional-battery-type-${additionalItemCount}"
        name="additionalBatteryType${additionalItemCount}"
        placeholder="e.g. DJI Intelligent Flight Battery"
      />

      <label for="additional-battery-cycles-${additionalItemCount}">
        Battery cycle count (if applicable)
      </label>

      <input
        type="number"
        id="additional-battery-cycles-${additionalItemCount}"
        name="additionalBatteryCycles${additionalItemCount}"
        min="0"
        step="1"
        placeholder="e.g. 25"
      />

    </div>
  `;

  additionalEquipmentList.appendChild(item);

  const removeButton =
    item.querySelector(".btn-remove-additional");

  removeButton.addEventListener("click", () => {
    item.remove();
  });
}

if (addAdditionalItemButton) {
  addAdditionalItemButton.addEventListener("click", () => {
    addAdditionalEquipment();
  });
}
