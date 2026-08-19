document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const session = await auth.getSession();
  if (!session) { window.location.href = "login.html?return=admin.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { window.location.href = "account.html"; return; }

  const message = document.getElementById("staff-message");
  const notice = (text, ok = true) => { message.textContent = text; message.className = "form-message " + (ok ? "success" : "error"); };
  document.getElementById("staff-welcome").textContent = `Signed in as ${session.user.email}`;
  document.getElementById("staff-sign-out").addEventListener("click", async () => {
    const button = document.getElementById("staff-sign-out"); button.disabled = true;
    try { await auth.signOut(); } catch (error) { button.disabled = false; notice(error?.message || "Could not sign out.", false); }
  });

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  async function loadWorkQueue() {
    const valuationsBox = document.getElementById("dashboard-valuations");
    const salesBox = document.getElementById("dashboard-sales");
    const { data: valuations, error } = await auth.supabase.from("valuations").select("id,quote_reference,status,manufacturer,model,package,quote_amount,submitted_at").order("submitted_at", { ascending: false });
    if (error) { valuationsBox.innerHTML = "<p>We couldn't load the staff queue.</p>"; return; }
    const ids = (valuations || []).map(v => v.id);
    const { data: items } = ids.length ? await auth.supabase.from("quote_items").select("id,valuation_id,item_name,item_status").in("valuation_id", ids) : { data: [] };
    const itemIds = (items || []).map(i => i.id);
    const { data: offers } = itemIds.length ? await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status").in("item_id", itemIds) : { data: [] };
    const rows = (valuations || []).slice(0, 10).map(v => {
      const item = (items || []).find(i => i.valuation_id === v.id);
      const itemOffers = (offers || []).filter(o => o.item_id === item?.id);
      const published = itemOffers.filter(o => ["published", "accepted", "refused"].includes(o.status));
      const status = published.length ? published[0].status : (v.status || "submitted");
      return `<article class="valuation-card"><div><span class="valuation-ref">${esc(v.quote_reference)}</span><p class="section-kicker">${esc(String(status).replaceAll("_", " "))}</p><h3>${esc(v.model || "Equipment submission")}</h3><p>${esc(v.manufacturer || "")}${v.package ? " — " + esc(v.package) : ""}</p></div><div class="valuation-meta"><strong>${v.quote_amount == null ? "Awaiting valuation" : money(v.quote_amount)}</strong><small>${v.submitted_at ? new Date(v.submitted_at).toLocaleString("en-GB") : ""}</small></div></article>`;
    }).join("");
    valuationsBox.innerHTML = rows || "<p>No valuations have been submitted yet.</p>";
    const accepted = (offers || []).filter(o => o.status === "accepted");
    salesBox.innerHTML = accepted.length ? `<p><strong>${accepted.length}</strong> accepted offer${accepted.length === 1 ? "" : "s"} currently recorded.</p>` : "<p>No accepted offers yet.</p>";
  }

  async function loadCustomers() {
    const box = document.getElementById("dashboard-customers");
    box.innerHTML = "<p>Loading customers...</p>";
    const { data: customers, error } = await auth.supabase.rpc("staff_customer_list");
    if (error) { box.innerHTML = "<p>We couldn't load customer accounts.</p>"; console.error(error); return; }
    if (!customers?.length) { box.innerHTML = "<p>No customer accounts found.</p>"; return; }
    box.innerHTML = customers.map(c => `<article class="valuation-card"><div><span class="valuation-ref">${esc(c.email)}</span><h3>${esc(c.full_name || "Unnamed customer")}</h3><p>${esc(c.phone || "No phone number")}</p></div><div class="valuation-meta"><span class="status-badge">${esc(c.account_status || "active")}</span>${c.closed_at ? `<small>Closed ${new Date(c.closed_at).toLocaleString("en-GB")}</small>` : ""}${c.account_status !== "closed" ? `<button class="btn btn-secondary close-customer" data-user="${esc(c.user_id)}" data-email="${esc(c.email)}" type="button">CLOSE ACCOUNT</button>` : ""}</div></article>`).join("");
    box.querySelectorAll(".close-customer").forEach(button => button.addEventListener("click", async () => {
      const email = button.dataset.email;
      if (!confirm(`Close the customer account for ${email}? Their valuation and sale history will be retained.`)) return;
      button.disabled = true;
      const { error: closeError } = await auth.supabase.rpc("staff_close_customer", { p_user_id: button.dataset.user });
      if (closeError) { button.disabled = false; notice(closeError.message || "The account could not be closed.", false); return; }
      notice(`Customer account ${email} has been closed.`);
      await loadCustomers();
    }));
  }

  await Promise.all([loadWorkQueue(), loadCustomers()]);
});
