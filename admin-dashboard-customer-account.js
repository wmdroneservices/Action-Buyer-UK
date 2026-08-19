document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("dashboard-customers");
  if (!auth || !box) return;

  const session = await auth.getSession();
  if (!session) return;
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) return;

  const waitForCustomers = async () => {
    for (let i = 0; i < 20; i++) {
      if (box.querySelector(".valuation-card")) return;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  };
  await waitForCustomers();

  const { data: customers, error } = await auth.supabase.rpc("staff_customer_list");
  if (error || !customers?.length) return;

  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const byEmail = new Map(customers.map(c => [String(c.email || "").toLowerCase(), c]));

  box.querySelectorAll(".valuation-card").forEach(card => {
    const email = card.querySelector(".valuation-ref")?.textContent?.trim()?.toLowerCase();
    const c = byEmail.get(email);
    if (!c) return;
    const heading = card.querySelector("h3");
    if (heading && !card.querySelector(".customer-account-number")) {
      const account = document.createElement("p");
      account.className = "customer-account-number";
      account.innerHTML = `<strong>Account number:</strong> ${esc(c.account_number || "Not assigned")}`;
      heading.insertAdjacentElement("afterend", account);
    }
  });
});
