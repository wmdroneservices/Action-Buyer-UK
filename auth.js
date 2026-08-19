const SUPABASE_URL = "https://npdpopaoazbpmwsgyosp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Plc9kcyye1asKxTJOmGdhQ_dP_LX59o";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function setAuthMarker(session) {
  try { if (session) localStorage.setItem("gearCashOutAuthenticated", "true"); else localStorage.removeItem("gearCashOutAuthenticated"); } catch (_) {}
}
function selectedText(select) { return select && select.selectedIndex >= 0 ? select.options[select.selectedIndex].textContent.trim() : ""; }
function checked(name) { const el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ""; }
function captureQuoteBeforeAuth() {
  const category = document.getElementById("gear-category"), manufacturer = document.getElementById("gear-manufacturer"), model = document.getElementById("dji-model"), packageSelect = document.getElementById("package-select"), title = document.getElementById("quote-result-title"), priceText = document.querySelector("#quote-summary .quote-price")?.textContent || "";
  const money = priceText.replace(/,/g, "").match(/£\s*([0-9]+(?:\.[0-9]+)?)/); const contents = {};
  document.querySelectorAll(".package-content-select, .generic-content-select").forEach(el => { contents[el.dataset.contentId || el.id] = el.value; });
  const resume = { category: category?.value || "", categoryName: selectedText(category), manufacturer: manufacturer?.value || "", manufacturerName: selectedText(manufacturer), model: model?.value || "", modelName: selectedText(model), package: packageSelect?.value || "", packageName: selectedText(packageSelect), condition: checked("condition"), flightHours: document.getElementById("flight-hours")?.value || "", flightHoursRange: checked("flightHoursRange"), unbound: checked("unbound"), damage: checked("damage"), damageDescription: document.getElementById("damage-description")?.value || "", packageContents: contents, droneSerial: document.getElementById("drone-serial-number")?.value || "", controllerSerial: document.getElementById("controller-serial-number")?.value || "", legalRight: checked("legalRight"), quoteAmount: money ? Number(money[1]) : null, manualValuation: /manual valuation|manual validation/i.test(title?.textContent || ""), photosProvided: !!document.getElementById("photo-uploads")?.files?.length, created: new Date().toISOString() };
  try { localStorage.setItem("gearCashOutQuoteResume", JSON.stringify(resume)); localStorage.setItem("actionBuyerReturnAfterAuth", "quote.html"); sessionStorage.setItem("actionBuyerAuthRequiredForQuote", "true"); } catch (_) {}
}

window.actionBuyerAuth = {
  supabase: supabaseClient,
  async getSession() { const { data, error } = await supabaseClient.auth.getSession(); if (error) console.error("Session error:", error); setAuthMarker(data?.session || null); return data?.session || null; },
  async signOut() { const { error } = await supabaseClient.auth.signOut(); if (error) throw error; setAuthMarker(null); try { localStorage.removeItem("gearCashOutAuthenticated"); } catch (_) {} window.location.href = "login.html"; },
  async updateAccountNavigation() { const accountLinks = document.querySelectorAll("[data-account-link]"); const session = await this.getSession(); accountLinks.forEach(link => { if (session) { link.textContent = "My Account"; link.href = "account.html"; } else { link.textContent = "Register / Login"; link.href = "login.html"; } }); },
  ensureAccountNavigation() { document.querySelectorAll(".nav-list, .footer-nav").forEach(nav => { if (nav.querySelector("[data-account-link]")) return; const item = document.createElement("li"); item.innerHTML = '<a href="login.html" data-account-link>Register / Login</a>'; nav.appendChild(item); }); },
  async getProfile() { const session = await this.getSession(); if (!session) return null; const { data, error } = await supabaseClient.from("profiles").select("full_name, phone, address_line1, address_line2, city, county, postcode").eq("id", session.user.id).maybeSingle(); if (error) { console.error("Could not load customer profile:", error); return null; } return data || null; },
  async prefillQuoteCustomerDetails() { const profile = await this.getProfile(); if (!profile) return; const fields = { "full-name": profile.full_name, "phone-number": profile.phone, "address-line-1": profile.address_line1, "address-line-2": profile.address_line2, "city": profile.city, "county": profile.county, "postcode": profile.postcode }; Object.entries(fields).forEach(([id,value]) => { const field=document.getElementById(id); if(field&&value&&!field.value) field.value=value; }); const email=document.getElementById("email-address"), session=await this.getSession(); if(email&&session?.user?.email&&!email.value) email.value=session.user.email; const addressFieldset=document.querySelector('#quote-form .wizard-step[data-step="13"] fieldset'); const addressInputs=document.querySelectorAll('#quote-form .wizard-step[data-step="13"] #address-line-1, #quote-form .wizard-step[data-step="13"] #address-line-2, #quote-form .wizard-step[data-step="13"] #city, #quote-form .wizard-step[data-step="13"] #county, #quote-form .wizard-step[data-step="13"] #postcode'); addressInputs.forEach(input=>input.required=false); if(addressFieldset) addressFieldset.hidden=true; const detailsStep=document.querySelector('#quote-form .wizard-step[data-step="13"]'); if(detailsStep&&!detailsStep.querySelector(".account-address-notice")){const notice=document.createElement("div");notice.className="account-address-notice notice";notice.innerHTML="<strong>Return address saved.</strong> We already have your return address on your account. It is not required again at this stage.";const firstField=detailsStep.querySelector("#full-name");if(firstField?.parentNode)firstField.parentNode.insertBefore(notice,firstField);}},
  async saveQuoteCustomerDetails() { const session=await this.getSession(); if(!session)return; const value=id=>{const field=document.getElementById(id);return field?field.value.trim():"";}; const record={id:session.user.id,full_name:value("full-name"),phone:value("phone-number"),address_line1:value("address-line-1"),address_line2:value("address-line-2"),city:value("city"),county:value("county"),postcode:value("postcode"),updated_at:new Date().toISOString()}; const existing=await this.getProfile(); if(existing){["address_line1","address_line2","city","county","postcode"].forEach(key=>{if(!record[key]&&existing[key])record[key]=existing[key];});if(!record.phone&&existing.phone)record.phone=existing.phone;if(!record.full_name&&existing.full_name)record.full_name=existing.full_name;} const{error}=await supabaseClient.from("profiles").upsert(record,{onConflict:"id"});if(error)console.error("Could not save customer profile:",error);}
};

document.addEventListener("DOMContentLoaded", () => {
  actionBuyerAuth.ensureAccountNavigation();
  actionBuyerAuth.updateAccountNavigation();
  const form = document.getElementById("quote-form");
  if (!form) return;
  form.addEventListener("click", async (event) => {
    const button = event.target.closest("button"), step = button?.closest(".wizard-step");
    if (!button || !step) return;
    const stepNumber = Number(step.dataset.step);
    if (stepNumber === 13 && button.classList.contains("btn-next")) window.setTimeout(() => actionBuyerAuth.saveQuoteCustomerDetails(), 500);
  }, true);
});

supabaseClient.auth.onAuthStateChange((_event, session) => { setAuthMarker(session); actionBuyerAuth.updateAccountNavigation(); });

window.captureGearCashOutQuoteBeforeAuth = captureQuoteBeforeAuth;
