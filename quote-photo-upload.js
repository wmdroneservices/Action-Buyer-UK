/* Stores customer photographs in private Supabase Storage and records their paths on the valuation. */
(function () {
  "use strict";

  const BUCKET = "quote-photos";
  let busy = false;
  let replay = false;

  const money = text => {
    const match = String(text || "").replace(/,/g, "").match(/£\s*([0-9]+(?:\.[0-9]+)?)/);
    return match ? Number(match[1]) : null;
  };

  const clean = value => String(value || "").trim();
  const checked = name => document.querySelector(`input[name="${name}"]:checked`)?.value || "";
  const selectedText = id => {
    const el = document.getElementById(id);
    return el?.selectedIndex >= 0 ? el.options[el.selectedIndex].textContent.trim() : "";
  };

  function quoteRecord(userId, photos) {
    const title = document.getElementById("quote-result-title")?.textContent || "";
    const manual = /manual valuation|manual validation/i.test(title);
    const reference = "WBA-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
    const value = id => clean(document.getElementById(id)?.value);
    const category = document.getElementById("gear-category");
    const manufacturer = document.getElementById("gear-manufacturer");
    const model = document.getElementById("dji-model");
    const packageSelect = document.getElementById("package-select");
    const batteries = Array.from(document.querySelectorAll(".battery-entry")).map(row => ({
      type: clean(row.querySelector(".battery-type")?.value),
      cycles: Number(row.querySelector(".battery-cycles")?.value || 0)
    }));
    const contents = {};
    document.querySelectorAll(".package-content-select,.generic-content-select").forEach(el => {
      contents[el.dataset.contentId || el.id] = el.value;
    });

    return {
      user_id: userId,
      quote_reference: reference,
      status: manual ? "manual_review" : "valued",
      manufacturer: manufacturer?.value || null,
      model: model?.value || null,
      package: packageSelect?.value || null,
      condition: checked("condition") || null,
      quote_amount: manual ? null : money(document.querySelector("#quote-summary .quote-price")?.textContent),
      quote_data: {
        category: category?.value || "",
        categoryName: selectedText("gear-category"),
        manufacturer: manufacturer?.value || "",
        manufacturerName: selectedText("gear-manufacturer"),
        model: model?.value || "",
        modelName: selectedText("dji-model"),
        package: packageSelect?.value || "",
        packageName: selectedText("package-select"),
        condition: checked("condition"),
        flightHours: value("flight-hours"),
        flightHoursRange: checked("flightHoursRange"),
        batteries,
        unbound: checked("unbound"),
        damage: checked("damage"),
        damageDescription: value("damage-description"),
        packageContents: contents,
        additionalAccessories: [],
        droneSerial: value("drone-serial-number"),
        controllerSerial: value("controller-serial-number"),
        photos,
        legalRight: checked("legalRight"),
        fullName: value("full-name"),
        email: value("email-address"),
        phone: value("phone-number"),
        addressLine1: value("address-line-1"),
        addressLine2: value("address-line-2"),
        city: value("city"),
        county: value("county"),
        postcode: value("postcode").toUpperCase(),
        quoteAmount: manual ? null : money(document.querySelector("#quote-summary .quote-price")?.textContent),
        quoteReference: reference,
        photosProvided: photos.length > 0,
        resumedAfterLogin: false,
        created: new Date().toISOString()
      }
    };
  }

  async function uploadPhotos(userId, quoteReference) {
    const input = document.getElementById("photo-uploads");
    const files = Array.from(input?.files || []);
    if (!files.length) return [];

    const uploaded = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/${quoteReference}/${Date.now()}-${i}.${ext}`;
      const { error } = await window.actionBuyerAuth.supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
      if (error) throw error;
      uploaded.push({ path, name: file.name, type: file.type || "image/jpeg" });
    }
    return uploaded;
  }

  function showSubmitted(record) {
    document.querySelectorAll("#quote-form .wizard-step").forEach(step => {
      step.hidden = Number(step.dataset.step) !== 14;
    });
    const heading = document.querySelector('#quote-form .wizard-step[data-step="14"] h3');
    if (heading) heading.textContent = record.quote_amount == null ? "Manual Valuation Submitted" : "Quote Submitted";
    const ref = document.getElementById("quote-reference");
    if (ref) ref.textContent = record.quote_reference;
    const nav = document.querySelector('#quote-form .wizard-step[data-step="14"] .navigation-buttons');
    if (nav) nav.innerHTML = '<a class="btn" href="account.html">Return to My Account</a>';
  }

  async function submitAuthenticatedQuote() {
    const auth = window.actionBuyerAuth;
    const session = await auth.getSession();
    if (!session) return false;

    const required = [
      ["full-name", "Please enter your full name."],
      ["email-address", "Please enter your email address."],
      ["phone-number", "Please enter your telephone number."]
    ];
    for (const [id, error] of required) {
      if (!clean(document.getElementById(id)?.value)) {
        alert(error);
        return true;
      }
    }

    busy = true;
    const button = document.querySelector('#quote-form .wizard-step[data-step="13"] .btn-next');
    if (button) button.disabled = true;

    try {
      const reference = "WBA-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
      const photos = await uploadPhotos(session.user.id, reference);
      const record = quoteRecord(session.user.id, photos);
      record.quote_reference = reference;
      record.quote_data.quoteReference = reference;

      const { error } = await auth.supabase.from("valuations").upsert(record, { onConflict: "quote_reference" });
      if (error) throw error;

      try {
        localStorage.setItem("wba_latest_quote", JSON.stringify(record.quote_data));
      } catch (_) {}

      showSubmitted(record);
      return true;
    } catch (error) {
      console.error("Could not submit quote with photographs:", error);
      alert(error?.message || "The quote could not be submitted. Please try again.");
      return true;
    } finally {
      busy = false;
      if (button) button.disabled = false;
    }
  }

  document.addEventListener("click", async event => {
    const button = event.target.closest("#quote-form .wizard-step[data-step=\"13\"] .btn-next");
    if (!button || replay || busy) return;

    const session = await window.actionBuyerAuth?.getSession?.();
    if (!session) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    await submitAuthenticatedQuote();
  }, true);
})();
