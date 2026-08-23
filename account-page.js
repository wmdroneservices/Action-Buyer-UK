document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) { window.location.href = "login.html"; return; }

  const { data: staffRow } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (staffRow) { window.location.href = "admin.html"; return; }

  document.querySelectorAll("[data-account-link]").forEach(link => { link.textContent = "My Account"; link.href = "account.html"; });

  const user = session.user;
  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const offersBox = document.getElementById("offers");
  const valuationsBox = document.getElementById("valuations");
  const detailsBox = document.getElementById("customer-details");
  const welcome = document.getElementById("welcome-text");
  const signOut = document.getElementById("sign-out");

  const { data: profile } = await auth.supabase.from("profiles")
    .select("full_name,account_number,phone,address_line1,address_line2,city,county,postcode")
    .eq("id", user.id).maybeSingle();

  const name = profile?.full_name?.trim() || "Customer";
  if (welcome) welcome.textContent = `Welcome, ${name}.`;
  if (signOut) signOut.addEventListener("click", async () => {
    signOut.disabled = true;
    try { await auth.signOut(); } catch (e) { signOut.disabled = false; alert(e?.message || "Could not sign out. Please try again."); }
  });

  if (detailsBox) {
    const address = [profile?.address_line1, profile?.address_line2, profile?.city, profile?.county, profile?.postcode].filter(Boolean).map(esc).join(", ");
    detailsBox.innerHTML = `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem 2rem">
      <div><p class="section-kicker" style="margin-bottom:.25rem">NAME</p><strong>${esc(name)}</strong></div>
      <div><p class="section-kicker" style="margin-bottom:.25rem">EMAIL</p><strong>${esc(user.email || "Not available")}</strong></div>
      <div><p class="section-kicker" style="margin-bottom:.25rem">ACCOUNT NUMBER</p><strong>${esc(profile?.account_number || "Not assigned")}</strong></div>
      <div><p class="section-kicker" style="margin-bottom:.25rem">PHONE</p><strong>${esc(profile?.phone || "Not provided")}</strong></div>
      <div style="grid-column:1/-1"><p class="section-kicker" style="margin-bottom:.25rem">ADDRESS</p><strong>${address || "Not provided"}</strong></div>
    </div>`;
  }

  async function sendEmailForOffer(offerId, eventType) {
    try { await auth.supabase.functions.invoke("send-quote-email-v2", { body: { offer_id: offerId, event_type: eventType } }); } catch (_) {}
  }

  function quoteTotal(items, offers) {
    return items.reduce((sum, item) => {
      const o = offers.filter(x => x.item_id === item.id && ["published", "accepted"].includes(x.status)).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
      return sum + (Number(o?.amount) || 0);
    }, 0);
  }

  async function load() {
    if (offersBox) offersBox.innerHTML = "<p>Loading...</p>";
    if (valuationsBox) valuationsBox.innerHTML = "<p>Loading...</p>";

    const { data: valuations, error } = await auth.supabase.from("valuations")
      .select("id,quote_reference,status,manufacturer,model,package,condition,quote_amount,submitted_at,updated_at,quote_data")
      .eq("user_id", user.id).order("submitted_at", { ascending: false });

    if (error) {
      if (valuationsBox) valuationsBox.innerHTML = "<p>We couldn't load your valuations right now.</p>";
      if (offersBox) offersBox.innerHTML = "<p>We couldn't load your new quotes right now.</p>";
      return;
    }

    const ids = (valuations || []).map(v => v.id);
    const { data: items } = ids.length ? await auth.supabase.from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position")
      .in("valuation_id", ids) : { data: [] };
    const itemIds = (items || []).map(i => i.id);
    const { data: offers } = itemIds.length ? await auth.supabase.from("quote_offers")
      .select("id,item_id,offer_type,amount,status,customer_message,published_at,responded_at,created_at")
      .in("item_id", itemIds).order("created_at", { ascending: false }) : { data: [] };

    const activeQuotes = (valuations || []).map(v => {
      const its = (items || []).filter(i => i.valuation_id === v.id).sort((a,b) => (a.item_position || 999) - (b.item_position || 999));
      const os = (offers || []).filter(o => its.some(i => i.id === o.item_id));
      const pending = its.some(i => i.item_status !== "refused" && i.item_status !== "closed" && os.some(o => o.item_id === i.id && o.status === "published"));
      return { v, its, os, total: quoteTotal(its, os), pending };
    }).filter(x => x.pending);

    if (offersBox) {
      offersBox.innerHTML = activeQuotes.length ? `<div style="margin-bottom:1.25rem;padding:1rem 1.2rem;background:#fff7eb;border-left:4px solid #d88732"><strong>NEXT STEP · ACTION REQUIRED</strong><p style="margin:.25rem 0 0">Review the new quote below and accept or refuse each offered item.</p></div>` + activeQuotes.map(({v,its,os,total}) => `<section style="margin-bottom:1.5rem"><div class="section-heading"><p class="section-kicker">QUOTE</p><h3>${esc(v.quote_reference)}</h3><p>Review each item separately. Your total updates as you respond.</p></div><div>${its.map(item => {
        const current = os.filter(o => o.item_id === item.id && ["published", "accepted", "refused"].includes(o.status)).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
        const offered = current && ["published", "accepted"].includes(current.status);
        const status = item.item_status || "under_assessment";
        return `<article class="valuation-card offer-card"><div><span class="valuation-ref">ITEM ${esc(item.item_position || "")}</span><p class="section-kicker">${esc(String(status).replaceAll("_", " "))}</p><h3>${esc(item.item_name || item.model || "Equipment")}</h3><p>${esc(item.manufacturer || "")}${item.package ? " — " + esc(item.package) : ""}</p>${current?.customer_message ? `<p>${esc(current.customer_message)}</p>` : ""}</div><div class="valuation-meta">${offered ? `<strong>${money(current.amount)}</strong>` : status === "refused" ? `<span class="status-badge">REFUSED</span>` : `<span class="status-badge">AWAITING OFFER</span>`}${current?.status === "accepted" ? `<span class="status-badge">ACCEPTED</span>` : ""}${current?.status === "published" ? `<div class="navigation-buttons"><button class="btn btn-primary accept-offer" data-id="${current.id}">ACCEPT</button><button class="btn btn-secondary refuse-offer" data-id="${current.id}">REFUSE</button></div>` : ""}</div></article>`;
      }).join("")}</div><div style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f;margin-top:1rem;font-size:1.1rem"><strong>Current total offer</strong><strong>${money(total)}</strong></div></section>`).join("") : "<p>No new quotes currently require your response.</p>";
    }

    const activeValuations = (valuations || []).filter(v => (items || []).filter(i => i.valuation_id === v.id).some(i => !["accepted", "closed"].includes(i.item_status)));
    if (valuationsBox) {
      valuationsBox.innerHTML = activeValuations.length ? `<div style="margin-bottom:1.25rem;padding:1rem 1.2rem;background:#f3f1ec;border-left:4px solid #d88732"><strong>NEXT STEP</strong><p style="margin:.25rem 0 0">No action is needed from you right now. GearCashOut is processing the valuation and will contact you when the next stage is ready.</p></div>` + activeValuations.map(v => {
        const its = (items || []).filter(i => i.valuation_id === v.id);
        const date = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString("en-GB") : "";
        return `<article class="valuation-card"><div><span class="valuation-ref">${esc(v.quote_reference)}</span><p class="section-kicker">VALUATION IN PROGRESS</p><h3>${its.length} item${its.length === 1 ? "" : "s"}</h3><p>${its.map(i => esc(i.item_name || i.model || "Equipment")).join(" · ")}</p></div><div class="valuation-meta"><span class="status-badge">IN PROGRESS</span><small>Submitted ${date}</small></div></article>`;
      }).join("") : "<p>No valuations currently in progress.</p>";
    }

    document.querySelectorAll(".accept-offer").forEach(btn => btn.addEventListener("click", async () => {
      btn.disabled = true;

      const { error } = await auth.supabase.rpc("accept_quote_offer", {
        p_offer_id: btn.dataset.id
      });

      if (error) {
        alert(error.message || "The offer could not be accepted.");
        btn.disabled = false;
        return;
      }

      await sendEmailForOffer(btn.dataset.id, "offer_accepted");
      await load();
    }));

    document.querySelectorAll(".refuse-offer").forEach(btn => btn.addEventListener("click", async () => {
      if (!confirm("Refuse this item?")) return;

      btn.disabled = true;

      const { error } = await auth.supabase.rpc("refuse_quote_offer", {
        p_offer_id: btn.dataset.id
      });

      if (error) {
        alert(error.message || "The offer could not be refused.");
        btn.disabled = false;
        return;
      }

      await sendEmailForOffer(btn.dataset.id, "offer_refused");
      await load();
    }));
