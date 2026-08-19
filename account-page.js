document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) { window.location.href = "login.html"; return; }

  const { data: staffRow, error: staffError } = await auth.supabase
    .from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (staffError) console.error("Staff membership check failed", staffError);
  if (staffRow) { window.location.href = "admin.html"; return; }

  document.querySelectorAll("[data-account-link]").forEach(link => { link.textContent = "My Account"; link.href = "account.html"; });
  document.querySelectorAll('a[href="admin.html"]').forEach(link => { link.textContent = "My Account"; link.href = "account.html"; });

  const user = session.user;
  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const welcome = document.getElementById("welcome-text");
  const signOut = document.getElementById("sign-out");
  const offersBox = document.getElementById("offers");
  const valuationsBox = document.getElementById("valuations");

  const { data: profile } = await auth.supabase.from("profiles")
    .select("full_name,account_number,phone,address_line1,address_line2,city,county,postcode")
    .eq("id", user.id).maybeSingle();

  if (welcome) welcome.textContent = profile?.full_name?.trim()
    ? `Welcome, ${profile.full_name.trim()}. Your account number is ${profile.account_number || "not yet assigned"}.`
    : `Welcome. Signed in as ${user.email}`;

  if (signOut) signOut.addEventListener("click", async () => {
    signOut.disabled = true;
    try { await auth.signOut(); }
    catch (error) { signOut.disabled = false; alert(error?.message || "Could not sign out. Please try again."); }
  });

  async function sendEmailForOffer(offerId, eventType) {
    try { await auth.supabase.functions.invoke("send-quote-email-v2", { body: { offer_id: offerId, event_type: eventType } }); } catch (_) {}
  }

  async function load() {
    if (offersBox) offersBox.innerHTML = "<p>Loading...</p>";
    if (valuationsBox) valuationsBox.innerHTML = "<p>Loading...</p>";

    const { data: valuations, error } = await auth.supabase.from("valuations")
      .select("id,quote_reference,status,manufacturer,model,package,condition,quote_amount,submitted_at,updated_at,quote_data")
      .eq("user_id", user.id).order("submitted_at", { ascending: false });

    if (error) {
      console.error("Customer valuation load failed", error);
      if (valuationsBox) valuationsBox.innerHTML = "<p>We couldn't load your valuations right now.</p>";
      if (offersBox) offersBox.innerHTML = "<p>We couldn't load your offers right now.</p>";
      return;
    }

    if (!valuations?.length) {
      if (valuationsBox) valuationsBox.innerHTML = '<div class="empty-account"><h3>No valuations yet</h3><p>When you submit a valuation, it will appear here.</p><a class="btn btn-primary" href="quote.html">GET A VALUATION</a></div>';
      if (offersBox) offersBox.innerHTML = "<p>No active offers yet.</p>";
      return;
    }

    const ids = valuations.map(v => v.id);
    const { data: items } = await auth.supabase.from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status").in("valuation_id", ids);
    const itemIds = (items || []).map(i => i.id);
    const { data: offers } = itemIds.length ? await auth.supabase.from("quote_offers")
      .select("id,item_id,offer_type,amount,status,customer_message,published_at,responded_at,created_at")
      .in("item_id", itemIds).order("created_at", { ascending: false }) : { data: [] };

    // Accepted/refused offers move out of the active offers area. Accepted items are
    // represented by the combined sale card rendered by account-sales.js.
    const activeOffers = (offers || []).filter(o => o.status === "published");
    if (offersBox) offersBox.innerHTML = activeOffers.length ? activeOffers.map(o => {
      const item = (items || []).find(i => i.id === o.item_id);
      const label = o.offer_type === "automatic" ? "Automatic quote" : o.offer_type === "manual" ? "Manual quote" : "Final offer";
      return `<article class="valuation-card offer-card"><div><span class="valuation-ref">${esc(item?.item_name || "Equipment")}</span><p class="section-kicker">${label}</p><h3>${esc(item?.model || item?.manufacturer || "Equipment")}</h3><p>${esc(o.customer_message || "Your offer is ready to review.")}</p></div><div class="valuation-meta"><strong>${money(o.amount)}</strong><span class="status-badge">READY TO REVIEW</span><div class="navigation-buttons"><button class="btn btn-primary accept-offer" data-id="${o.id}">ACCEPT</button><button class="btn btn-secondary refuse-offer" data-id="${o.id}">REFUSE</button></div></div></article>`;
    }).join("") : "<p>No active offers. Accepted offers are now shown together as a sale below.</p>";

    if (valuationsBox) {
      const pendingValuations = valuations.filter(v => {
        const valuationItems = (items || []).filter(i => i.valuation_id === v.id);
        const hasAccepted = valuationItems.some(i => i.item_status === "accepted");
        const hasPending = valuationItems.some(i => i.item_status !== "accepted" && i.item_status !== "closed");
        return !hasAccepted || hasPending;
      });
      valuationsBox.innerHTML = pendingValuations.length ? pendingValuations.map(v => {
        const valuationItems = (items || []).filter(i => i.valuation_id === v.id);
        const valuationOffers = (offers || []).filter(o => valuationItems.some(i => i.id === o.item_id) && ["published", "accepted", "refused"].includes(o.status));
        const finalOffer = valuationOffers.find(o => o.offer_type === "final");
        const latestOffer = valuationOffers[0];
        const manual = String(v.status) === "manual_review" || v.quote_data?.manualValuation === true;
        const displayOffer = finalOffer || latestOffer;
        const label = finalOffer ? "Final offer" : (manual ? "Manual valuation" : "Automatic quote");
        const amount = displayOffer ? money(displayOffer.amount) : (v.quote_amount == null ? (manual ? "Awaiting manual valuation" : "No price available") : money(v.quote_amount));
        const status = displayOffer?.status || v.status || "submitted";
        const date = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString("en-GB") : "";
        return `<article class="valuation-card"><div><span class="valuation-ref">${esc(v.quote_reference)}</span><p class="section-kicker">${label}</p><h3>${esc(v.model || "Equipment submission")}</h3><p>${esc(v.manufacturer || "")}${v.package ? " — " + esc(v.package) : ""}</p></div><div class="valuation-meta"><strong>${esc(amount)}</strong><span class="status-badge">${esc(String(status).replaceAll("_", " "))}</span><small>Submitted ${date}</small></div></article>`;
      }).join("") : "<p>No outstanding submissions. Accepted items have been moved into your purchase summary above.</p>";
    }

    document.querySelectorAll(".accept-offer").forEach(btn => btn.addEventListener("click", async () => {
      btn.disabled = true;
      const { error: acceptError } = await auth.supabase.rpc("accept_quote_offer", { p_offer_id: btn.dataset.id });
      if (acceptError) { alert(acceptError.message || "The offer could not be accepted."); btn.disabled = false; return; }
      await sendEmailForOffer(btn.dataset.id, "offer_accepted");
      await load();
      window.location.reload();
    }));
    document.querySelectorAll(".refuse-offer").forEach(btn => btn.addEventListener("click", async () => {
      if (!confirm("Refuse this offer?")) return;
      btn.disabled = true;
      const { error: refuseError } = await auth.supabase.rpc("refuse_quote_offer", { p_offer_id: btn.dataset.id });
      if (refuseError) { alert(refuseError.message || "The offer could not be refused."); btn.disabled = false; return; }
      await sendEmailForOffer(btn.dataset.id, "offer_refused");
      await load();
    }));
  }

  await load();
});
