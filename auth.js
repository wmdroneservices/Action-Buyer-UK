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
  }
};

document.addEventListener("DOMContentLoaded", () => actionBuyerAuth.updateAccountNavigation());
supabaseClient.auth.onAuthStateChange(() => actionBuyerAuth.updateAccountNavigation());
