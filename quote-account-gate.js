/* GearCashOut: require a customer account before final quote submission. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  const form = document.getElementById("quote-form");
  const auth = window.actionBuyerAuth;
  const gate = document.getElementById("account-gate");
  const sessionBox = document.getElementById("account-session");
  const fields = document.getElementById("customer-details-fields");
  const submitButton = form?.querySelector(".btn-submit-valuation");
  if (!form || !auth || !gate || !sessionBox || !fields || !submitButton) return;

  async function syncAccountStep() {
    const session = await auth.getSession();
    if (!session) {
      gate.hidden = false;
      sessionBox.hidden = true;
      fields.hidden = true;
      submitButton.hidden = true;
      return;
    }

    try {
      if (typeof auth.prefillQuoteCustomerDetails === "function") {
        await auth.prefillQuoteCustomerDetails();
      }
    } catch (error) {
      console.error("GearCashOut customer profile prefill failed", error);
    }

    gate.hidden = true;
    fields.hidden = true;
    submitButton.hidden = false;
    sessionBox.hidden = false;
    const email = session.user?.email || "";
    sessionBox.innerHTML = `<strong>You are signed in.</strong><p>Your saved GearCashOut account details will be used for this valuation${email ? ` (${String(email).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")})` : ""}.</p><p>You do not need to enter your name, address or contact details again.</p>`;
  }

  let lastStepVisible = false;
  const observer = new MutationObserver(() => {
    const step = form.querySelector('.wizard-step[data-step="9"]');
    const visible = !!step && !step.hidden;
    if (visible && !lastStepVisible) syncAccountStep();
    lastStepVisible = visible;
  });
  observer.observe(form, { subtree: true, attributes: true, attributeFilter: ["hidden"] });

  const step = form.querySelector('.wizard-step[data-step="9"]');
  if (step && !step.hidden) syncAccountStep();
});
