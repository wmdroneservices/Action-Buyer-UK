document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("sale-details");
  const message = document.getElementById("admin-sale-message");
  const auth = window.actionBuyerAuth;
  const saleId = new URLSearchParams(window.location.search).get("id");
  if (!box || !auth || !saleId) return;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function setMessage(text, ok = true) {
    if (!message) return;
    message.textContent = text;
    message.className = "form-message " + (ok ? "success" : "error");
  }

  async function addReturnAction() {
    const outcomeHeading = [...box.querySelectorAll("h2")].find(h => h.textContent.trim() === "Payment or return");
    if (!outcomeHeading) return;

    const card = outcomeHeading.closest(".account-panel")?.querySelector(".valuation-card");
    if (!card || card.querySelector("#create-return-shipment-from-outcome")) return;

    const { data: sale } = await auth.supabase
      .from("sales")
      .select("id,user_id")
      .eq("id", saleId)
      .maybeSingle();
    if (!sale) return;

    const action = document.createElement("div");
    action.id = "create-return-shipment-from-outcome";
    action.style.cssText = "display:grid;gap:.65rem;margin-top:1rem;padding-top:1rem;border-top:1px solid #ddd;";
    action.innerHTML = `
      <p><strong>Return item to customer</strong></p>
      <p>Create the return shipment here. Once it has actually been posted, use <strong>RETURN SHIPPED TO CUSTOMER</strong> to complete the return.</p>
      <button id="show-return-shipment-form" class="btn btn-secondary" type="button">CREATE RETURN SHIPMENT</button>
      <div id="return-shipment-form" class="shipment-form" hidden>
        <label>Carrier / service <input id="return-carrier" type="text" placeholder="e.g. Royal Mail, DPD"></label>
        <label>Tracking number <input id="return-tracking" type="text" placeholder="Optional until posted"></label>
        <label>Labels <select id="return-label-count"><option value="1">1 label</option><option value="2">2 labels</option><option value="3">3 labels</option></select></label>
        <label>Parcels <input id="return-parcel-count" type="number" min="1" value="1"></label>
        <label>Label URL <input id="return-label-url" type="url" placeholder="https://..."></label>
        <label>QR code URL <input id="return-qr-url" type="url" placeholder="https://..."></label>
        <label>Notes <textarea id="return-notes" rows="2"></textarea></label>
        <button id="save-return-shipment" class="btn btn-primary" type="button">SAVE RETURN SHIPMENT</button>
      </div>
    `;

    const form = action.querySelector("#return-shipment-form");
    action.querySelector("#show-return-shipment-form").addEventListener("click", () => {
      form.hidden = false;
      action.querySelector("#return-carrier")?.focus();
    });

    action.querySelector("#save-return-shipment").addEventListener("click", async event => {
      const button = event.currentTarget;
      const labelCount = Number(action.querySelector("#return-label-count").value || 1);
      const parcelCount = Number(action.querySelector("#return-parcel-count").value || 1);
      const carrier = action.querySelector("#return-carrier").value.trim() || null;
      const tracking = action.querySelector("#return-tracking").value.trim() || null;
      const labelUrl = action.querySelector("#return-label-url").value.trim();
      const qrUrl = action.querySelector("#return-qr-url").value.trim();
      const notes = action.querySelector("#return-notes").value.trim() || null;

      if (labelCount < 1 || parcelCount < 1) {
        setMessage("Labels and parcels must be at least 1.", false);
        return;
      }

      button.disabled = true;
      const { error } = await auth.supabase.from("shipments").insert({
        sale_id: sale.id,
        user_id: sale.user_id,
        shipment_type: "return",
        status: "label_created",
        carrier,
        tracking_number: tracking,
        parcel_count: parcelCount,
        label_count: labelCount,
        label_urls: labelUrl ? [labelUrl] : [],
        qr_code_urls: qrUrl ? [qrUrl] : [],
        notes
      });
      button.disabled = false;

      if (error) {
        setMessage(error.message || "Return shipment could not be created.", false);
        return;
      }

      setMessage("Return shipment created. When it has actually been posted, click RETURN SHIPPED TO CUSTOMER.");
      await new Promise(resolve => setTimeout(resolve, 500));
      location.reload();
    });

    card.querySelector("div")?.appendChild(action);
  }

  const observer = new MutationObserver(addReturnAction);
  observer.observe(box, { childList: true, subtree: true });
  addReturnAction();
});
