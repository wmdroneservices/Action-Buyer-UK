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
  const newQuotesSection = document.getElementById("new-quotes-section");
  const salesSection = document.getElementById("sales-section");
  const welcome = document.getElementById("welcome-text");
  const signOut = document.getElementById("sign-out");

  if (newQuotesSection) newQuotesSection.style.display = "none";
  if (salesSection) salesSection.style.display = "none";

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
    detailsBox.innerHTML = `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem 2rem"><div><p class="section-kicker" style="margin-bottom:.25rem">NAME</p><strong>${esc(name)}</strong></div><div><p class="section-kicker" style="margin-bottom:.25rem">EMAIL</p><strong>${esc(user.email || "Not available")}</strong></div><div><p class="section-kicker" style="margin-bottom:.25rem">ACCOUNT NUMBER</p><strong>${esc(profile?.account_number || "Not assigned")}</strong></div><div><p class="section-kicker" style="margin-bottom:.25rem">PHONE</p><strong>${esc(profile?.phone || "Not provided")}</strong></div><div style="grid-column:1/-1"><p class="section-kicker" style="margin-bottom:.25rem">ADDRESS</p><strong>${address || "Not provided"}</strong></div></div>`;
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
      if (newQuotesSection) newQuotesSection.style.display = "none";
      if (salesSection) salesSection.style.display = "none";
      if (valuationsBox) valuationsBox.innerHTML = "<p>We couldn't load your valuations right now.</p>";
      if (offersBox) offersBox.innerHTML = "<p>We couldn't load your new quotes right now.</p>";
      return;
    }

    const ids = (valuations || []).map(v => v.id);
    const { data: items } = ids.length ? await auth.supabase.from("quote_items").select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position").in("valuation_id", ids) : { data: [] };
    const itemIds = (items || []).map(i => i.id);
    const { data: offers } = itemIds.length ? await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status,customer_message,published_at,responded_at,created_at").in("item_id", itemIds).order("created_at", { ascending: false }) : { data: [] };
    const { data: sales } = await auth.supabase.from("sales").select("id,sale_reference,status,total_amount,created_at,payment_sent_at").eq("user_id", user.id).order("created_at", { ascending: false });
    const saleIds = (sales || []).map(s => s.id);
    const { data: shipments } = saleIds.length ? await auth.supabase.from("shipments").select("id,sale_id,status,carrier,tracking_number,created_at").in("sale_id", saleIds) : { data: [] };

    const activeQuotes = (valuations || []).map(v => {
      const its = (items || []).filter(i => i.valuation_id === v.id).sort((a,b) => (a.item_position || 999) - (b.item_position || 999));
      const os = (offers || []).filter(o => its.some(i => i.id === o.item_id));
      const pending = its.some(i => i.item_status !== "refused" && i.item_status !== "closed" && os.some(o => o.item_id === i.id && o.status === "published"));
      return { v, its, os, total: quoteTotal(its, os), pending };
    }).filter(x => x.pending);
    
    if (newQuotesSection) newQuotesSection.style.display = activeQuotes.length ? "" : "none";
    if (offersBox) {
      if (activeQuotes.length) {
        let html = '<div style="margin-bottom:1.25rem;padding:1rem 1.2rem;background:#fff7eb;border-left:4px solid #d88732"><strong>NEXT STEP · ACTION REQUIRED</strong><p style="margin:.25rem 0 0">Review the quotes below and let us know which items youd like to sell.</p></div>';
        html += activeQuotes.map(quote => {
          const { v, its, os } = quote;
          const total = quote.total;
          let section = '<section style="display:grid;gap:1rem;margin-bottom:1.5rem">';
          section += its.map(item => {
            const current = os.filter(o => o.item_id === item.id && ["published", "accepted", "refused"].includes(o.status)).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
            const offered = current && ["published", "accepted"].includes(current.status);
            const status = item.item_status || "under_assessment";
            let article = '<article class="valuation-card offer-card"><div>';
            article += '<span class="valuation-ref">ITEM ' + esc(item.item_position || "") + '</span>';
            article += '<p class="section-kicker">' + esc(String(status).replaceAll("_", " ")) + '</p>';
            article += '<h3>' + esc(item.item_name || item.model || "Equipment") + '</h3>';
            article += '<p>' + esc(item.manufacturer || "");
            if (item.package) article += ' — ' + esc(item.package);
            article += '</p>';
            if (current?.customer_message) article += '<p>' + esc(current.customer_message) + '</p>';
            article += '</div><div class="valuation-meta">';
            if (offered) article += '<strong>' + money(current.amount) + '</strong>';
            else if (status === "refused") article += '<span class="status-badge">REFUSED</span>';
            else article += '<span class="status-badge">AWAITING OFFER</span>';
            if (current?.status === "accepted") article += '<span class="status-badge">ACCEPTED</span>';
            if (current?.status === "published") {
              article += '<div class="navigation-buttons">';
              article += '<button class="btn btn-primary accept-offer" data-id="' + current.id + '">ACCEPT</button>';
              article += '<button class="btn btn-secondary refuse-offer" data-id="' + current.id + '">REFUSE</button>';
              article += '</div>';
            }
            article += '</div></article>';
            return article;
          }).join("");
          section += '</div><div style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f;margin-top:1rem;font-size:1.1rem">';
          section += '<strong>Current total offer</strong><strong>' + money(total) + '</strong>';
          section += '</div></section>';
          return section;
        }).join("");
        offersBox.innerHTML = html;
      } else {
        offersBox.innerHTML = "";
      }
    }

    const activeValuations = (valuations || []).filter(v => (items || []).filter(i => i.valuation_id === v.id).some(i => !["accepted", "closed"].includes(i.item_status)));
    if (valuationsBox) {
      if (activeValuations.length) {
        let html = '<div style="margin-bottom:1.25rem;padding:1rem 1.2rem;background:#f3f1ec;border-left:4px solid #d88732"><strong>NEXT STEP</strong><p style="margin:.25rem 0 0">No action is needed from you right now. GearCashOut is processing the valuation and will contact you when the next stage is ready.</p></div>';
        html += activeValuations.map(v => {
          const its = (items || []).filter(i => i.valuation_id === v.id);
          const date = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString("en-GB") : "";
          return '<article class="valuation-card"><div><span class="valuation-ref">' + esc(v.quote_reference) + '</span><p class="section-kicker">VALUATION IN PROGRESS</p><h3>' + its.length + ' item' + (its.length === 1 ? '' : 's') + '</h3><p>' + its.map(i => esc(i.item_name || i.model || "Equipment")).join(" · ") + '</p></div><div class="valuation-meta"><span class="status-badge">IN PROGRESS</span><small>Submitted ' + date + '</small></div></article>';
        }).join("");
        valuationsBox.innerHTML = html;
      } else {
        valuationsBox.innerHTML = "<p>No valuations currently in progress.</p>";
      }
    }

    const salesBox = document.getElementById("sales");
    if (salesBox) {
      const activeSales = (sales || []).filter(s => !["paid", "completed", "cancelled", "closed", "archived"].includes(String(s.status || "")) && !s.payment_sent_at);
      if (salesSection) salesSection.style.display = activeSales.length ? "" : "none";
      if (activeSales.length) {
        salesBox.innerHTML = activeSales.map(s => {
          const shipment = (shipments || []).filter(sh => sh.sale_id === s.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          let message = "Your offer has been accepted. We are preparing the next steps.";
          if (String(s.status || "") === "payment_due") {
            message = "Your bank details have been received. Payment is now being arranged and will be made shortly.";
          }
          if (shipment?.status === "awaiting_label") {
            message = "Your shipping details are being prepared. We will send your instructions shortly.";
          }
          if (shipment?.status === "label_created") {
            message = "Your shipping details are ready. Please follow the instructions provided.";
          }
          return '<article class="valuation-card"><div><span class="valuation-ref">' + esc(s.sale_reference || "") + '</span><p class="section-kicker">SALE UPDATE</p><h3>' + money(s.total_amount) + '</h3><p>' + esc(message) + '</p></div></article>';
        }).join("");
      } else {
        salesBox.innerHTML = "";
      }
    }

    document.querySelectorAll(".accept-offer").forEach(btn => btn.addEventListener("click", async () => {
      btn.disabled = true;
      const { error } = await auth.supabase.rpc("accept_quote_offer", { p_offer_id: btn.dataset.id });
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
      const { error } = await auth.supabase.rpc("refuse_quote_offer", { p_offer_id: btn.dataset.id });
      if (error) {
        alert(error.message || "The offer could not be refused.");
        btn.disabled = false;
        return;
      }
      await sendEmailForOffer(btn.dataset.id, "offer_refused");
      await load();
    }));
  }

  await load();
  window.addEventListener("pageshow", async () => { await load(); });
  setInterval(load, 30000);
});