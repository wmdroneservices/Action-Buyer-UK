const SUPABASE_URL = "https://npdpopaoazbpmwsgyosp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Plc9kcyye1asKxTJOmGdhQ_dP_LX59o";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

window.actionBuyerAuth = {
  supabase: supabaseClient,
  async getSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) console.error("Session error:", error);
    return data?.session || null;
  },
  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.href = "login.html";
  },
  async updateAccountNavigation() {
    const accountLinks = document.querySelectorAll("[data-account-link]");
    if (!accountLinks.length) return;
    const session = await this.getSession();
    accountLinks.forEach((link) => {
      if (session) {
        link.textContent = "My Account";
        link.href = "account.html";
      } else {
        link.textContent = "Register / Login";
        link.href = "login.html";
      }
    });
  },
  ensureAccountNavigation() {
    const navs = document.querySelectorAll(".nav-list, .footer-nav");
    navs.forEach((nav) => {
      if (nav.querySelector("[data-account-link]")) return;
      const item = document.createElement("li");
      item.innerHTML = '<a href="login.html" data-account-link>Register / Login</a>';
      nav.appendChild(item);
    });
  },
  async getProfile() {
    const session = await this.getSession();
    if (!session) return null;

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("full_name, phone, address_line1, address_line2, city, county, postcode")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Could not load customer profile:", error);
      return null;
    }

    return data || null;
  },
  async prefillQuoteCustomerDetails() {
    const profile = await this.getProfile();
    if (!profile) return;

    const fields = {
      "full-name": profile.full_name,
      "phone-number": profile.phone,
      "address-line-1": profile.address_line1,
      "address-line-2": profile.address_line2,
      "city": profile.city,
      "county": profile.county,
      "postcode": profile.postcode
    };

    Object.entries(fields).forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (field && value && !field.value) field.value = value;
    });

    const email = document.getElementById("email-address");
    const session = await this.getSession();
    if (email && session?.user?.email && !email.value) {
      email.value = session.user.email;
    }

    /* A signed-in customer already has their return address stored in their
       profile. The quote stage should not ask them to enter or confirm it
       again. It remains available in the profile for later shipping/returns. */
    const addressFieldset = document.querySelector(
      '#quote-form .wizard-step[data-step="13"] fieldset'
    );
    const addressInputs = document.querySelectorAll(
      '#quote-form .wizard-step[data-step="13"] #address-line-1, #quote-form .wizard-step[data-step="13"] #address-line-2, #quote-form .wizard-step[data-step="13"] #city, #quote-form .wizard-step[data-step="13"] #county, #quote-form .wizard-step[data-step="13"] #postcode'
    );

    addressInputs.forEach((input) => {
      input.required = false;
    });

    if (addressFieldset) {
      addressFieldset.hidden = true;
    }

    const detailsStep = document.querySelector(
      '#quote-form .wizard-step[data-step="13"]'
    );
    const addressNotice = detailsStep?.querySelector(".account-address-notice");

    if (detailsStep && !addressNotice) {
      const notice = document.createElement("div");
      notice.className = "account-address-notice notice";
      notice.innerHTML =
        "<strong>Return address saved.</strong> We already have your return address on your account. It is not required again at this stage.";

      const firstField = detailsStep.querySelector("#full-name");
      if (firstField?.parentNode) {
        firstField.parentNode.insertBefore(notice, firstField);
      }
    }
  },
  async saveQuoteCustomerDetails() {
    const session = await this.getSession();
    if (!session) return;

    const value = (id) => {
      const field = document.getElementById(id);
      return field ? field.value.trim() : "";
    };

    const record = {
      id: session.user.id,
      full_name: value("full-name"),
      phone: value("phone-number"),
      address_line1: value("address-line-1"),
      address_line2: value("address-line-2"),
      city: value("city"),
      county: value("county"),
      postcode: value("postcode"),
      updated_at: new Date().toISOString()
    };

    /* Never replace a saved address with blanks. This is important for the
       manual-review route, where the address is deliberately not collected. */
    const existing = await this.getProfile();
    if (existing) {
      ["address_line1", "address_line2", "city", "county", "postcode"].forEach((key) => {
        if (!record[key] && existing[key]) record[key] = existing[key];
      });
      if (!record.phone && existing.phone) record.phone = existing.phone;
      if (!record.full_name && existing.full_name) record.full_name = existing.full_name;
    }

    const { error } = await supabaseClient
      .from("profiles")
      .upsert(record, { onConflict: "id" });

    if (error) {
      console.error("Could not save customer profile:", error);
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  actionBuyerAuth.ensureAccountNavigation();
  actionBuyerAuth.updateAccountNavigation();

  const form = document.getElementById("quote-form");
  if (!form) return;

  form.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const step = button.closest(".wizard-step");
    if (!step) return;

    const stepNumber = Number(step.dataset.step);

    if (stepNumber === 12) {
      window.setTimeout(() => actionBuyerAuth.prefillQuoteCustomerDetails(), 150);
    }

    if (stepNumber === 13 && button.classList.contains("btn-next")) {
      window.setTimeout(() => actionBuyerAuth.saveQuoteCustomerDetails(), 500);
    }
  });
});

supabaseClient.auth.onAuthStateChange(() => actionBuyerAuth.updateAccountNavigation());
