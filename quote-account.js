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

    // Photos are browser File objects and must not be sent to the JSON column.
    copy.photos = [];

    // Banking details must never be stored as part of this browser-side quote record.
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

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("quote-form");
    if (!form) return;

    form.addEventListener("click", async function (event) {
      const button = event.target.closest("button");
      if (!button) return;

      const step = button.closest(".wizard-step");
      if (!step || Number(step.dataset.step) !== 13) return;

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

      // Let the existing quote wizard validate and save the quote first,
      // then copy its saved record into Supabase.
      window.setTimeout(saveQuoteToAccount, 250);
    }, true);
  });
})();
