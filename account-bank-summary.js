document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const detailsSection = document.getElementById("customer-details-section");
  if (!detailsSection || document.getElementById("customer-bank-summary")) return;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const maskAccount = value => value ? `XXXX${String(value).slice(-4)}` : "";
  const maskSort = value => value ? `XX-XX-${String(value).slice(-2)}` : "";

  let saved = null;
  try {
    const { data } = await auth.supabase.rpc("get_saved_customer_bank_details");
    saved = data || null;
  } catch (_) {}

  let latest = null;
  const { data: sales } = await auth.supabase.from("sales")
    .select("bank_account_name,bank_sort_code,bank_account_number,bank_details_confirmed_at,bank_details_storage_consent,bank_details_deleted_at,created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  latest = (sales || []).find(s => s.bank_account_name && s.bank_sort_code && s.bank_account_number && s.bank_details_confirmed_at && !s.bank_details_deleted_at) || null;

  const details = saved || latest;
  const panel = document.createElement("section");
  panel.id = "customer-bank-summary";
  panel.className = "account-panel";
  panel.style.marginBottom = "1.5rem";

  if (details?.account_name && details?.sort_code && details?.account_number) {
    const retained = saved || latest?.bank_details_storage_consent;
    panel.innerHTML = `<div class="section-heading"><p class="section-kicker">PAYMENT DETAILS</p><h2>Your bank details</h2><p>Your saved payment details are shown securely with sensitive numbers masked.</p></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem 2rem"><div><p class="section-kicker" style="margin-bottom:.25rem">ACCOUNT NAME</p><strong>${esc(details.account_name)}</strong></div><div><p class="section-kicker" style="margin-bottom:.25rem">SORT CODE</p><strong>${esc(maskSort(details.sort_code))}</strong></div><div><p class="section-kicker" style="margin-bottom:.25rem">ACCOUNT NUMBER</p><strong>${esc(maskAccount(details.account_number))}</strong></div></div><div class="account-next-step" style="margin-top:1.5rem;padding:1rem 1.2rem;background:#f3f1ec;border-left:4px solid #d88732"><strong>BANK DETAILS ON FILE</strong><p style="margin:.25rem 0 0">These details can be used for future payments when you choose to use your saved bank details.</p></div>`;
  } else {
    panel.innerHTML = `<div class="section-heading"><p class="section-kicker">PAYMENT DETAILS</p><h2>Your bank details</h2><p>No saved bank details are currently on your account.</p></div>`;
  }

  const customerNextStep = detailsSection.querySelector(".account-next-step");
  if (customerNextStep) customerNextStep.after(panel);
  else detailsSection.after(panel);
});
