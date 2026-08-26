document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const money = value => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
  const dateTime = value => value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "";

  async function load() {
    const { data: sales, error } = await auth.supabase.from("sales")
      .select("id,sale_reference,status,total_amount,payment_sent_at,payment_reference,created_at")
      .eq("user_id", session.user.id)
      .not("payment_sent_at", "is", null)
      .order("payment_sent_at", { ascending: false });

    if (error) {
      console.error("Payment notification query failed:", error);
      return;
    }

    let section = document.getElementById("payment-notifications-section");
    if (!sales?.length) {
      if (section) section.remove();
      return;
    }

    if (!section) {
      section = document.createElement("section");
      section.id = "payment-notifications-section";
      section.className = "account-panel";
      section.style.cssText = "margin-bottom:1.5rem;border-left:4px solid #d88732;";
      const completed = document.getElementById("completed-transactions-section");
      if (completed) completed.before(section);
      else document.querySelector("main .container")?.appendChild(section);
    }

    section.innerHTML = `
      <div class="section-heading">
        <p class="section-kicker">PAYMENT UPDATE</p>
        <h2>Payment sent</h2>
        <p>Your payment has been sent to the bank account you provided.</p>
      </div>
      ${sales.map(s => `
        <article class="valuation-card" style="margin-bottom:.75rem;background:#f3f1ec;">
          <div>
            <span class="valuation-ref">${esc(s.sale_reference || "SALE")}</span>
            <p class="section-kicker">PAYMENT SENT</p>
            <h3>${money(s.total_amount)}</h3>
            <p><strong>Your payment was sent on ${esc(dateTime(s.payment_sent_at))}.</strong></p>
            ${s.payment_reference ? `<p>Payment reference: ${esc(s.payment_reference)}</p>` : ""}
            <p>Your sale is now complete and has been added to your completed transactions.</p>
          </div>
          <div class="valuation-meta"><span class="status-badge">PAID</span></div>
        </article>
      `).join("")}`;
  }

  await load();
  window.addEventListener("pageshow", load);
  setInterval(load, 30000);
});
