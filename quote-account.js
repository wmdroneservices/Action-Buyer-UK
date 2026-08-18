/* Action Buyer UK — connect completed quotes to the signed-in customer account. */
(function () {
  "use strict";

  function safeQuoteData() {
    try {
      const raw = localStorage.getItem("wba_latest_quote");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error("Could not read saved quote:", error);
      return null;
    }
  }

  function quoteStatus(data) {
    return data && data.quoteAmount !== null && data.quoteAmount !== undefined
      ? "valued"
      : "manual_review";
  }

  function cleanQuoteData(data) {
    if (!data) return {};
    const copy = { ...data };
    copy.photos = [];
    delete copy.bankName;
    delete copy.accountNumber;
    delete copy.sortCode;
    return copy;
  }

  async function saveQuoteToAccount() {
    const saved = safeQuoteData();
    if (!saved || !saved.quoteReference) return;

    if (!window.actionBuyerAuth || !window.actionBuyerAuth.supabase) {
      console.error("Action Buyer UK authentication client is not loaded.");
      return;
    }

    const { data: userData, error: userError } =
      await window.actionBuyerAuth.supabase.auth.getUser();

    if (userError || !userData || !userData.user) {
      console.warn("No authenticated customer account; quote was not saved to an account.");
      return;
    }

    const record = {
      user_id: userData.user.id,
      quote_reference: saved.quoteReference,
      status: quoteStatus(saved),
      manufacturer: saved.manufacturer || null,
      model: saved.model || null,
      package: saved.package || null,
      condition: saved.condition || null,
      quote_amount:
        saved.quoteAmount === null || saved.quoteAmount === undefined
          ? null
          : Number(saved.quoteAmount),
      quote_data: cleanQuoteData(saved)
    };

    const { error } = await window.actionBuyerAuth.supabase
      .from("valuations")
      .upsert(record, { onConflict: "quote_reference" });

    if (error) {
      console.error("Could not save valuation to customer account:", error);
      return;
    }

    console.log("Action Buyer UK valuation saved to customer account:", saved.quoteReference);
  }

  function isManualStep12(step) {
    if (!step) return false;
    const title = step.querySelector("h3");
    const button = step.querySelector(".btn-accept, #quote-result-action");
    const titleText = title ? title.textContent.toLowerCase() : "";
    const buttonText = button ? button.textContent.toLowerCase() : "";
    return (
      titleText.includes("manual validation") ||
      buttonText.includes("manual review") ||
      (button && button.dataset.quoteAction === "manual")
    );
  }

  function setManualMode() {
    try {
      sessionStorage.setItem("actionBuyerManualValuation", "true");
    } catch (error) {
      console.warn("Could not store manual valuation mode.", error);
    }
  }

  function isManualMode() {
    try {
      return sessionStorage.getItem("actionBuyerManualValuation") === "true";
    } catch (error) {
      return false;
    }
  }

  function clearManualMode() {
    try {
      sessionStorage.removeItem("actionBuyerManualValuation");
    } catch (error) {
      // Ignore storage errors.
    }
  }

  /*
   * IMPORTANT:
   * Do not use a MutationObserver here. Step 13 is changed by quote.js when
   * the manual-review button is pressed, and observing the same hidden
   * attribute that we change creates a feedback loop that can make the page
   * unresponsive.
   */
  function prepareManualCustomerDetails(step) {
    if (!step) return;

    const addressFieldset = step.querySelector("fieldset");
    const addressInputs = step.querySelectorAll(
      "#address-line-1, #address-line-2, #city, #county, #postcode"
    );

    addressInputs.forEach(function (input) {
      input.required = false;
      input.value = "";
    });

    if (addressFieldset) {
      addressFieldset.hidden = true;
    }

    let notice = step.querySelector(".manual-address-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "manual-address-notice notice";
      notice.innerHTML =
        "<strong>Address not required yet.</strong> Your full return address will only be requested if a purchase offer is made and you choose to proceed.";

      const phone = step.querySelector("#phone-number");
      if (phone && phone.parentNode) {
        phone.parentNode.insertBefore(notice, phone.nextSibling);
      } else {
        step.insertBefore(notice, step.firstChild);
      }
    }
  }

  function generateManualReference() {
    return "WBA-" + new Date().getFullYear() + "-" +
      Math.floor(100000 + Math.random() * 900000);
  }

  function saveManualQuoteLocally() {
    const fullName = document.getElementById("full-name");
    const email = document.getElementById("email-address");
    const phone = document.getElementById("phone-number");
    const model = document.getElementById("dji-model");
    const packageSelect = document.getElementById("package-select");
    const condition = document.querySelector('input[name="condition"]:checked');
    const manufacturer = document.querySelector('input[name="manufacturer"]:checked');

    const record = {
      manufacturer: manufacturer ? manufacturer.value : "",
      model: model ? model.value : "",
      package: packageSelect ? packageSelect.value : "",
      condition: condition ? condition.value : "",
      flightHours: "",
      flightHoursRange: "",
      batteries: [],
      unbound: "",
      damage: "",
      damageDescription: "",
      packageContents: {},
      additionalAccessories: [],
      droneSerial: "",
      controllerSerial: "",
      photos: [],
      legalRight: "",
      fullName: fullName ? fullName.value.trim() : "",
      email: email ? email.value.trim() : "",
      phone: phone ? phone.value.trim() : "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      county: "",
      postcode: "",
      bankName: "",
      accountNumber: "",
      sortCode: "",
      quoteAmount: null,
      quoteReference: generateManualReference(),
      created: new Date().toISOString()
    };

    try {
      localStorage.setItem("wba_latest_quote", JSON.stringify(record));
    } catch (error) {
      console.error("Could not save manual valuation locally.", error);
      return null;
    }

    return record;
  }

  function showManualSubmittedScreen(record) {
    const steps = Array.from(document.querySelectorAll("#quote-form .wizard-step"));
    const step14 = steps.find(function (step) {
      return Number(step.dataset.step) === 14;
    });

    if (!step14) {
      console.error("Step 14 could not be found.");
      return;
    }

    steps.forEach(function (step) {
      step.hidden = step !== step14;
    });

    const heading = step14.querySelector("h3");
    if (heading) heading.textContent = "Manual Valuation Submitted";

    const reference = step14.querySelector("#quote-reference");
    if (reference) reference.textContent = record.quoteReference;

    const paragraphs = step14.querySelectorAll("p");
    paragraphs.forEach(function (paragraph) {
      if (paragraph.textContent.includes("Your quote information has been recorded")) {
        paragraph.textContent =
          "Your information and photographs have been submitted for manual review.";
      }

      if (paragraph.textContent.includes("BACKEND INTEGRATION REQUIRED")) {
        paragraph.hidden = true;
      }
    });

    const navigation = step14.querySelector(".navigation-buttons");
    if (navigation) {
      navigation.innerHTML = '<a class="btn" href="account.html">Return to My Account</a>';
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addNoBatteryOption() {
    const step6 = document.querySelector('#quote-form .wizard-step[data-step="6"]');
    if (!step6) return;
    if (step6.querySelector("#no-battery-supplied")) return;

    const addButton = step6.querySelector("#add-battery-btn");
    if (!addButton) return;

    const wrapper = document.createElement("label");
    wrapper.className = "no-battery-option";
    wrapper.style.display = "block";
    wrapper.style.margin = "1rem 0";
    wrapper.innerHTML =
      '<input type="checkbox" id="no-battery-supplied"> I do not have any batteries to supply with this drone';

    addButton.parentNode.insertBefore(wrapper, addButton.nextSibling);
  }

  function allowNoBatterySubmission() {
    const step6 = document.querySelector('#quote-form .wizard-step[data-step="6"]');
    if (!step6) return false;

    const checkbox = step6.querySelector("#no-battery-supplied");
    if (!checkbox || !checkbox.checked) return false;

    const container = step6.querySelector("#batteries-container");
    if (!container) return false;

    if (!container.querySelector(".battery-entry")) {
      const wrapper = document.createElement("div");
      wrapper.className = "battery-entry";
      wrapper.dataset.number = "not-supplied";
      wrapper.style.display = "none";
      wrapper.innerHTML =
        '<input type="text" class="battery-type" value="No battery supplied">' +
        '<input type="number" class="battery-cycles" value="0">';
      container.appendChild(wrapper);
    }

    return true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("quote-form");
    if (!form) return;

    /* quote.js creates the later wizard steps during its own DOMContentLoaded
       handler. Delay this one small enhancement until that work has completed. */
    window.setTimeout(addNoBatteryOption, 0);

    form.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button) return;

      const step = button.closest(".wizard-step");
      if (!step) return;

      const stepNumber = Number(step.dataset.step);

      if (stepNumber === 6 && button.classList.contains("btn-next")) {
        allowNoBatterySubmission();
        return;
      }

      if (stepNumber === 12 && isManualStep12(step)) {
        setManualMode();
        return;
      }

      if (stepNumber !== 13) return;

      if (isManualMode()) {
        event.preventDefault();
        event.stopImmediatePropagation();

        /* Prepare Step 13 immediately, rather than observing hidden changes. */
        prepareManualCustomerDetails(step);

        (async function () {
          const session = window.actionBuyerAuth
            ? await window.actionBuyerAuth.getSession()
            : null;

          if (!session) {
            alert("Please sign in or create an Action Buyer UK account before submitting your valuation.");
            window.location.href = "login.html?return=quote.html";
            return;
          }

          const fullName = document.getElementById("full-name");
          const email = document.getElementById("email-address");
          const phone = document.getElementById("phone-number");

          if (!fullName || !fullName.value.trim()) {
            alert("Please enter your full name.");
            return;
          }

          if (!email || !email.value.trim()) {
            alert("Please enter your email address.");
            return;
          }

          if (!phone || !phone.value.trim()) {
            alert("Please enter your telephone number.");
            return;
          }

          const record = saveManualQuoteLocally();
          if (!record) return;

          showManualSubmittedScreen(record);
          await saveQuoteToAccount();
          clearManualMode();
        })();

        return;
      }

      (async function () {
        const session = window.actionBuyerAuth
          ? await window.actionBuyerAuth.getSession()
          : null;

        if (!session) {
          event.preventDefault();
          event.stopImmediatePropagation();
          alert("Please sign in or create an Action Buyer UK account before submitting your valuation. Your account is used to track the submission and its status.");
          window.location.href = "login.html?return=quote.html";
          return;
        }

        window.setTimeout(saveQuoteToAccount, 250);
      })();
    }, true);
  });
})();
