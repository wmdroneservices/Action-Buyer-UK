document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const session = await auth.getSession();
  if (!session) { window.location.href = "login.html?return=admin.html"; return; }

  // Only an actual staff_users member may use the staff dashboard.
  const { data: staff } = await auth.supabase.from("staff_users")
    .select("user_id").eq("user_id", session.user.id).maybeSingle();
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

    const { data: valuations, error } = await auth.supabase.from("valuations")
      .select("id,user_id,quote_reference,status,manufacturer,model,package,quote_amount,submitted_at")
      .is("archived_at", null).order("submitted_at", { ascending: false });
    if (error) { valuationsBox.innerHTML = "<p>We couldn't load the staff queue.</p>"; return; }

    const ids = (valuations || []).map(v => v.id);
    const { data: items } = ids.length ? await auth.supabase.from("quote_items")
      .select("id,valuation_id,item_name,item_status").in("valuation_id", ids) : { data: [] };
    const itemIds = (items || []).map(i => i.id);
    const { data: offers } = itemIds.length ? await auth.supabase.from("quote_offers")
      .select("id,item_id,offer_type,amount,status,created_at,customer_message").in("item_id", itemIds).order("created_at", { ascending: false }) : { data: [] };

    // Staff customer data is supplied by the SECURITY DEFINER RPC so the
    // dashboard can always identify the customer without exposing auth data.
    const { data: customers } = await auth.supabase.rpc("staff_customer_list");
    const customerById = new Map((customers || []).map(c => [String(c.user_id), c]));

    const rows = (valuations || []).slice(0, 10).map(v => {
      const customer = customerById.get(String(v.user_id));
      const customerName = customer?.full_name || customer?.email || "Customer details unavailable";
      const item = (items || []).find(i => i.valuation_id === v.id);
      const itemOffers = (offers || []).filter(o => o.item_id === item?.id);
      const latestOffer = itemOffers[0];
      const status = latestOffer?.status || v.status || "submitted";
      return `<article class="valuation-card">
        <div>
          <span class="valuation-ref">${esc(v.quote_reference)}</span>
          <h3>${esc(customerName)}</h3>
          <p><strong>Customer number:</strong> ${esc(customer?.account_number || "Not assigned")}</p>
          <p><strong>Email:</strong> ${esc(customer?.email || "Not available")}</p>
          <p class="section-kicker">${esc(String(status).replaceAll("_", " "))}</p>
          <h4>${esc(v.model || "Equipment submission")}</h4>
          <p>${esc(v.manufacturer || "")}${v.package ? " — " + esc(v.package) : ""}</p>
        </div>
        <div class="valuation-meta">
          <strong>${v.quote_amount == null ? "Awaiting valuation" : money(v.quote_amount)}</strong>
          <small>${v.submitted_at ? new Date(v.submitted_at).toLocaleString("en-GB") : ""}</small>
          <small>${itemOffers.length} offer${itemOffers.length === 1 ? "" : "s"} recorded</small>
        </div>
      </article>`;
    }).join("");
    valuationsBox.innerHTML = rows || "<p>No active valuations have been submitted yet.</p>";

    // Show every customer-visible offer, not just accepted offers. This keeps
    // the staff dashboard consistent with the customer account when there are
    // multiple offers for the same submission.
    const offerRows = (offers || []).filter(o => ["published", "accepted", "refused"].includes(o.status)).map(o => {
      const item = (items || []).find(i => i.id === o.item_id);
      const valuation = (valuations || []).find(v => v.id === item?.valuation_id);
      const customer = customerById.get(String(valuation?.user_id));
      const label = o.offer_type === "automatic" ? "Automatic quote" : o.offer_type === "manual" ? "Manual quote" : "Final offer";
      return `<article class="valuation-card offer-card">
        <div>
          <span class="valuation-ref">${esc(valuation?.quote_reference || "Offer")}</span>
          <p class="section-kicker">${label}</p>
          <h3>${esc(customer?.full_name || customer?.email || "Customer details unavailable")}</h3>
          <p><strong>Customer number:</strong> ${esc(customer?.account_number || "Not assigned")}</p>
          <p><strong>Email:</strong> ${esc(customer?.email || "Not available")}</p>
          <p>${esc(item?.model || item?.item_name || "Equipment")}</p>
          <p>${esc(o.customer_message || "")}</p>
        </div>
        <div class="valuation-meta">
          <strong>${money(o.amount)}</strong>
          <span class="status-badge">${esc(String(o.status).replaceAll("_", " "))}</span>
        </div>
      </article>`;
    }).join("");
    salesBox.innerHTML = offerRows || "<p>No customer offers recorded yet.</p>";
  }

  async function loadCustomers() {
    const box = document.getElementById("dashboard-customers");
    box.innerHTML = "<p>Loading customers...</p>";
    const { data: customers, error } = await auth.supabase.rpc("staff_customer_list");
    if (error) { box.innerHTML = "<p>We couldn't load customer accounts.</p>"; console.error(error); return; }
    if (!customers?.length) { box.innerHTML = "<p>No customer accounts found.</p>"; return; }
    box.innerHTML = customers.map(c => `<article class="valuation-card"><div><span class="valuation-ref">${esc(c.email)}</span><h3>${esc(c.full_name || "Unnamed customer")}</h3><p><strong>Customer number:</strong> ${esc(c.account_number || "Not assigned")}</p><p>${esc(c.phone || "No phone number")}</p></div><div class="valuation-meta"><span class="status-badge">${esc(c.account_status || "active")}</span>${c.closed_at ? `<small>Closed ${new Date(c.closed_at).toLocaleString("en-GB")}</small>` : ""}${c.account_status !== "closed" ? `<button class="btn btn-secondary close-customer" data-user="${esc(c.user_id)}" data-email="${esc(c.email)}" type="button">CLOSE ACCOUNT</button>` : ""}</div></article>`).join("");
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
