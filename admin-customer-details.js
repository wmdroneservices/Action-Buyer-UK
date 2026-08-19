document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("customer-details");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) return;

  const { data: staff } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!staff) return;

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;

  const { data: valuation } = await auth.supabase
    .from("valuations")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!valuation?.user_id) return;

  const { data: customer, error } = await auth.supabase
    .rpc("staff_customer_details", { p_user_id: valuation.user_id });
  if (error || !customer?.length) return;

  const c = customer[0];
  const esc = v => String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const address = [c.address_line1, c.address_line2, c.city, c.county, c.postcode]
    .filter(Boolean).join(", ") || "No address recorded";

  box.innerHTML = `<div class="valuation-card">
    <div style="width:100%;">
      <p class="section-kicker">CUSTOMER ACCOUNT</p>
      <h3>${esc(c.full_name || "Unnamed customer")}</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem 1.5rem;">
        <p><strong>Account number</strong><br>${esc(c.account_number || "Not assigned")}</p>
        <p><strong>Email address</strong><br>${esc(c.email || "No email recorded")}</p>
        <p><strong>Phone</strong><br>${esc(c.phone || "No phone recorded")}</p>
        <p><strong>Account status</strong><br>${esc(c.account_status || "active")}</p>
      </div>
      <p><strong>Address</strong><br>${esc(address)}</p>
    </div>
  </div>`;
});
