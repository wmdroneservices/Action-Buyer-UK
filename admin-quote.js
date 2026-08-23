document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const auth = window.actionBuyerAuth;
  const message = document.getElementById("admin-message");
  const params = new URLSearchParams(window.location.search);
  const valuationId = params.get("id");

  if (!auth) return;

  const session = await auth.getSession();
  if (!session) {
    window.location.href = "login.html?return=" + encodeURIComponent(window.location.pathname + window.location.search);
    return;
  }

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) {
    document.getElementById("quote-details").innerHTML = "<p>You do not have permission to access quote review.</p>";
    return;
  }
  if (!valuationId) {
    document.getElementById("quote-details").innerHTML = "<p>No quote was specified.</p>";
    return;
  }

  const money = value => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value || 0));
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const pretty = value => String(value ?? "").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
  const activeOffer = offer => offer && !["superseded", "withdrawn"].includes(offer.status);
  const setMessage = (text, ok = true) => { if (message) { message.textContent = text; message.className = "form-message " + (ok ? "success" : "error"); } };

  async function notify(offerId, eventType) {
    if (!offerId) return { ok: false };
    try {
      const { data, error } = await auth.supabase.functions.invoke("send-quote-email-v2", { body: { offer_id: offerId, event_type: eventType } });
      return { ok: !error && data?.sent !== false, error };
    } catch (error) { return { ok: false, error }; }
  }

  async function signedPhotoUrl(photo) {
    const path = typeof photo === "string" ? photo : (photo?.path || photo?.url || "");
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    try {
      const { data, error } = await auth.supabase.storage.from("quote-photos").createSignedUrl(path, 3600);
      return error || !data?.signedUrl ? "" : data.signedUrl;
    } catch (_) { return ""; }
  }

  async function loadData() {
    const { data: valuation, error: valuationError } = await auth.supabase.from("valuations")
      .select("id,user_id,quote_reference,status,manufacturer,model,package,condition,quote_amount,submitted_at,updated_at,quote_data,archived_at")
      .eq("id", valuationId).maybeSingle();
    if (valuationError || !valuation) return null;

    const { data: items, error: itemError } = await auth.supabase.from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position,item_data,created_at,updated_at")
      .eq("valuation_id", valuationId).order("item_position", { ascending: true });
    if (itemError) return null;

    const ids = (items || []).map(item => item.id);
    const { data: offers } = ids.length ? await auth.supabase.from("quote_offers")
      .select("id,item_id,offer_type,amount,status,internal_notes,customer_message,published_at,responded_at,created_at,updated_at")
      .in("item_id", ids).order("created_at", { ascending: false }) : { data: [] };
    const { data: refusals } = ids.length ? await auth.supabase.from("quote_item_refusals")
      .select("id,item_id,offer_id,reason,refused_by,refused_at")
      .in("item_id", ids).order("refused_at", { ascending: false }) : { data: [] };
    return { valuation, items: items || [], offers: offers || [], refusals: refusals || [] };
  }

  function currentOffer(offers, itemId, type) { return offers.find(offer => offer.item_id === itemId && offer.offer_type === type && activeOffer(offer)); }
  function effectiveOffer(offers, itemId) { return currentOffer(offers, itemId, "final") || currentOffer(offers, itemId, "manual") || currentOffer(offers, itemId, "automatic"); }

  async function renderPhotos(items) {
    const photos = [], seen = new Set();
    for (const item of items) {
      const data = item.item_data && typeof item.item_data === "object" ? item.item_data : {};
      for (const photo of Array.isArray(data.photos) ? data.photos : []) {
        const raw = typeof photo === "string" ? photo : (photo?.path || photo?.url || "");
        if (!raw || seen.has(raw)) continue;
        seen.add(raw);
        const url = await signedPhotoUrl(photo);
        if (url) photos.push({ url, name: typeof photo === "string" ? "Customer photograph" : (photo.name || "Customer photograph"), item: item.item_name || `Item ${item.item_position || ""}` });
      }
    }
    if (!photos.length) return `<div class="notice"><strong>No photographs are available on the quote items.</strong><p>The new quote system stores photographs against each individual quote item.</p></div>`;
    return `<div class="admin-photo-grid">${photos.map(photo => `<a href="${esc(photo.url)}" target="_blank" rel="noopener"><img src="${esc(photo.url)}" alt="${esc(photo.name)} for ${esc(photo.item)}" loading="lazy"></a>`).join("")}</div>`;
  }

  function customer(valuation) {
    const q = valuation.quote_data || {};
    return { name: q.fullName || q.customerName || "Unnamed customer", email: q.email || q.emailAddress || "No email recorded", phone: q.phone || q.phoneNumber || "No phone recorded", address: [q.addressLine1,q.addressLine2,q.city,q.county,q.postcode].filter(Boolean).join(", ") || "No address recorded" };
  }

  function offerControl(label, offer, itemId, type, disabled) {
    return `<div style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(120px,180px) auto;gap:.5rem;align-items:end;"><div><strong>${esc(label)}</strong><div><span class="status-badge">${esc(pretty(offer?.status || "not published"))}</span>${offer?.responded_at ? `<small style="margin-left:.5rem">Responded ${new Date(offer.responded_at).toLocaleString("en-GB")}</small>` : ""}<label>${esc(label)} amount<input class="offer-price" data-item="${esc(itemId)}" data-type="${esc(type)}" type="number" min="0" step="0.01" value="${offer?.amount ?? ""}" placeholder="Price" ${disabled}></label><button class="btn btn-primary publish-offer" data-item="${esc(itemId)}" data-type="${esc(type)}" type="button" ${disabled}>${offer ? "UPDATE & SEND" : "PUBLISH"}</button></div>`;
  }

  function offerCard(item, offers, refusals) {
    const automaticDraft = offers.find(o => o.item_id === item.id && o.offer_type === "automatic" && o.status === "draft");
    const automatic = currentOffer(offers, item.id, "automatic");
    const manual = currentOffer(offers, item.id, "manual");
    const final = currentOffer(offers, item.id, "final");
    const closed = ["accepted", "refused", "closed"].includes(item.item_status);
    const disabled = closed ? "disabled" : "";
    const itemRefusals = refusals.filter(r => r.item_id === item.id);
    const automaticHtml = automaticDraft ? `<div class="notice" style="margin:1rem 0;background:#fff7eb;border-left:5px solid #d88732;"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;"><div><strong>AUTOMATIC VALUATION — READY FOR STAFF REVIEW</strong><p>Review the submitted evidence before sending this calculated valuation.</p></div><strong style="font-size:1.35rem">${money(automaticDraft.amount)}</strong></div><div style="display:grid;grid-template-columns:minmax(160px,1fr) auto auto;gap:.6rem;align-items:end;margin-top:1rem;"><label>Offer amount<input class="automatic-price" data-item="${esc(item.id)}" type="number" min="0" step="0.01" value="${Number(automaticDraft.amount).toFixed(2)}"></label><button class="btn btn-primary automatic-confirm" data-item="${esc(item.id)}" type="button">CONFIRM &amp; SEND</button><button class="btn btn-secondary automatic-revise" data-item="${esc(item.id)}" type="button">REVISE &amp; SEND</button></div></div>` : automatic?.status === "published" ? `<div class="notice" style="margin:1rem 0;"><strong>AUTOMATIC VALUATION PUBLISHED:</strong> ${money(automatic.amount)}</div>` : "";
    const refusalHtml = item.item_status === "refused" ? `<div class="notice" style="margin-top:1rem;"><strong>ITEM REFUSED</strong>${itemRefusals[0]?.reason ? `<p><strong>Internal reason:</strong> ${esc(itemRefusals[0].reason)}</p>` : "<p>No internal reason was recorded.</p>"}</div>` : `<button class="btn btn-secondary refuse-item" data-item="${esc(item.id)}" type="button" ${disabled}>REFUSE ITEM</button>`;
    const history = offers.filter(o => o.item_id === item.id).map(o => `<p><strong>${esc(pretty(o.offer_type))}</strong>: ${money(o.amount)} · ${esc(pretty(o.status))}${o.responded_at ? ` · Responded ${new Date(o.responded_at).toLocaleString("en-GB")}` : ""}</p>`).join("");
    return `<article class="valuation-card" style="margin-bottom:1rem;display:block;"><span class="valuation-ref">ITEM ${esc(item.item_position || "")}</span><h3>${esc(item.item_name || item.model || "Equipment")}</h3><p>${esc([item.manufacturer,item.model,item.package].filter(Boolean).join(" — "))}</p><p><strong>Item status:</strong> ${esc(pretty(item.item_status || "under_assessment"))}</p>${automaticHtml}<div style="display:grid;gap:.75rem;margin-top:1rem;">${offerControl("Manual offer",manual,item.id,"manual",disabled)}${offerControl("Final inspection offer",final,item.id,"final",disabled)}</div><div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem;">${refusalHtml}<a class="btn btn-secondary" href="admin-item-review.html?item_id=${encodeURIComponent(item.id)}">VIEW ITEM &amp; PHOTOS</a></div>${history ? `<details style="margin-top:1rem;"><summary>Offer history</summary>${history}</details>` : ""}</article>`;
  }

  async function renderEmailHistory(offers) {
    const history = document.getElementById("email-history");
    const ids = offers.map(o => o.id);
    if (!ids.length) { history.innerHTML = "<p>No email history for this quote yet.</p>"; return; }
    const { data: emails, error } = await auth.supabase.from("email_queue")
      .select("id,event_type,subject,status,attempts,last_error,created_at,sent_at,offer_id")
      .in("offer_id", ids).order("created_at", { ascending: false });
    if (error) { history.innerHTML = "<p>Email history could not be loaded.</p>"; return; }
    history.innerHTML = emails?.length ? emails.map(email => `<article style="padding:.75rem 0;border-bottom:1px solid #ddd;"><strong>${esc(email.subject || pretty(email.event_type))}</strong><p>${esc(pretty(email.event_type))} · ${esc(email.status || "queued")} · ${email.sent_at ? "Sent " + new Date(email.sent_at).toLocaleString("en-GB") : "Created " + new Date(email.created_at).toLocaleString("en-GB")}</p>${email.last_error ? `<small>Error: ${esc(email.last_error)}</small>` : ""}${email.status === "queued" ? `<button class="btn btn-secondary retry-email" data-offer="${esc(email.offer_id)}" data-event="${esc(email.event_type)}" type="button" style="margin-top:.35rem">RETRY EMAIL</button>` : ""}</article>`).join("") : "<p>No email history for this quote yet.</p>";
    history.querySelectorAll(".retry-email").forEach(button => button.addEventListener("click", async () => {
      button.disabled = true; button.textContent = "SENDING...";
      const result = await notify(button.dataset.offer, button.dataset.event);
      if (!result.ok) { button.disabled = false; button.textContent = "RETRY EMAIL"; setMessage(result.error?.message || "The email could not be sent.", false); return; }
      setMessage("Quote email sent successfully."); await render();
    }));
  }

  async function publish(itemId, type, amount, existing) {
    const { data: offer, error } = await auth.supabase.rpc("publish_quote_offer", {
      p_item_id:itemId,p_offer_type:type,p_amount:amount,
      p_internal_notes:type === "final" ? "Final physical inspection offer" : (type === "automatic" ? "Confirmed automatic valuation after staff review" : "Offer after staff review"),
      p_customer_message:type === "final" ? "This is your final offer following our inspection. Please sign in to your GearCashOut account to accept or refuse it." : "We have reviewed your submission and made an offer. Please sign in to your GearCashOut account to accept or refuse it."
    });
    if (error) throw error;
    const sent = await notify(offer?.id || existing?.id, "offer_published");
    if (!sent.ok) setMessage("The offer was saved, but the customer email could not be sent. Use RETRY EMAIL in Email History.", false);
    else setMessage("Offer published and customer email sent.");
  }

  async function sendCombinedQuote() {
    const data = await loadData();
    if (!data || data.items.length <= 1) return;
    const ready = data.items.every(item => item.item_status === "refused" || data.offers.some(o => o.item_id === item.id && o.status === "published"));
    if (!ready) { setMessage("Complete an offer or refusal for every item before sending the combined quote.", false); return; }
    if (!confirm("Send ONE combined quote email containing all completed items and the current total?")) return;
    const { data: result, error } = await auth.supabase.rpc("queue_quote_review_email", { p_valuation_id: valuationId });
    if (error) { setMessage(error.message || "The combined quote email could not be queued.", false); return; }
    if (result?.first_offer_id) {
      const sent = await notify(result.first_offer_id, "offer_published");
      if (!sent.ok) { setMessage("The combined quote was queued, but the customer email could not be sent. Use RETRY EMAIL in Email History.", false); await render(); return; }
    }
    setMessage("One combined quote email has been sent to the customer.");
    await render();
  }

  function bind(data) {
    document.querySelectorAll(".publish-offer").forEach(button => button.addEventListener("click", async () => {
      const itemId = button.dataset.item, type = button.dataset.type;
      const input = document.querySelector(`.offer-price[data-item="${CSS.escape(itemId)}"][data-type="${CSS.escape(type)}"]`);
      const amount = Number(input?.value);
      if (!Number.isFinite(amount) || amount < 0) { setMessage("Enter a valid offer amount.", false); return; }
      button.disabled = true;
      try { await publish(itemId,type,amount,data.offers.find(o => o.item_id === itemId && o.offer_type === type && activeOffer(o))); await render(); }
      catch (error) { button.disabled = false; setMessage(error?.message || "The offer could not be published.", false); }
    }));

    document.querySelectorAll(".automatic-confirm,.automatic-revise").forEach(button => button.addEventListener("click", async () => {
      const itemId = button.dataset.item, draft = data.offers.find(o => o.item_id === itemId && o.offer_type === "automatic" && o.status === "draft");
      if (!draft) return;
      const input = document.querySelector(`.automatic-price[data-item="${CSS.escape(itemId)}"]`), revised = Number(input?.value), confirming = button.classList.contains("automatic-confirm"), amount = confirming ? Number(draft.amount) : revised;
      if (!Number.isFinite(amount) || amount < 0) { setMessage("Enter a valid automatic valuation amount.", false); return; }
      if (!confirm(`${confirming ? "Confirm" : "Send revised"} offer of ${money(amount)} to the customer?`)) return;
      button.disabled = true;
      try { await publish(itemId,confirming ? "automatic" : "manual",amount,draft); await render(); }
      catch (error) { button.disabled = false; setMessage(error?.message || "The automatic valuation could not be published.", false); }
    }));

    document.querySelectorAll(".refuse-item").forEach(button => button.addEventListener("click", async () => {
      const reason = prompt("Optional internal reason for refusing this item. This is for staff records only:", "");
      if (reason === null || !confirm("Refuse this item? Other items in the quote will remain available.")) return;
      button.disabled = true;
      try {
        const { data: result, error } = await auth.supabase.rpc("staff_refuse_quote_item", { p_item_id:button.dataset.item,p_internal_reason:reason.trim() || null });
        if (error) throw error;
        if (result?.offer_id) await notify(result.offer_id,"offer_refused");
        setMessage("Item refused. The customer has been notified."); await render();
      } catch (error) { button.disabled = false; setMessage(error?.message || "The item could not be refused.", false); }
    }));

    const combined = document.getElementById("send-combined-quote");
    if (combined) combined.addEventListener("click", sendCombinedQuote);
  }

  async function render() {
    const data = await loadData();
    if (!data) { document.getElementById("quote-details").innerHTML = "<p>We couldn't load this quote.</p>"; return; }
    const { valuation, items, offers, refusals } = data;
    const c = customer(valuation);
    const total = items.reduce((sum,item) => { const offer = effectiveOffer(offers,item.id); return sum + (offer && Number.isFinite(Number(offer.amount)) ? Number(offer.amount) : 0); },0);
    document.getElementById("quote-title").textContent = items.length === 1 ? (items[0].item_name || items[0].model || "Equipment submission") : `${items.length}-ITEM QUOTE`;
    document.getElementById("quote-reference").textContent = `${valuation.quote_reference} · ${pretty(valuation.status || "submitted")}`;
    const archiveButton = document.getElementById("archive-quote"); if (archiveButton) archiveButton.textContent = valuation.archived_at ? "RESTORE" : "ARCHIVE";
    document.getElementById("customer-details").innerHTML = `<div class="valuation-card"><div style="width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem 1.5rem;"><p><strong>Name</strong><br>${esc(c.name)}</p><p><strong>Email</strong><br>${esc(c.email)}</p><p><strong>Phone</strong><br>${esc(c.phone)}</p><p><strong>Return address</strong><br>${esc(c.address)}</p></div><div class="valuation-meta"><small>Submitted</small><strong>${valuation.submitted_at ? new Date(valuation.submitted_at).toLocaleString("en-GB") : "—"}</strong></div></div>`;
    const itemCards = items.length ? items.map(item => { const d=item.item_data&&typeof item.item_data==="object"?item.item_data:{}; const count=Array.isArray(d.photos)?d.photos.length:0; const offer=effectiveOffer(offers,item.id); return `<article class="valuation-card" style="margin-bottom:1rem;"><div style="width:100%;"><span class="valuation-ref">ITEM ${esc(item.item_position || "")}</span><h3>${esc(item.item_name || item.model || "Equipment")}</h3><p>${esc([item.manufacturer,item.model,item.package].filter(Boolean).join(" — "))}</p><p><strong>Status:</strong> ${esc(pretty(item.item_status || "under_assessment"))} · <strong>Photos:</strong> ${count} · <strong>Offer:</strong> ${offer ? money(offer.amount) : "Not published"}</p><a class="btn btn-secondary" href="admin-item-review.html?item_id=${encodeURIComponent(item.id)}">VIEW ITEM &amp; PHOTOS</a></div></article>`; }).join("") : `<div class="notice"><strong>No quote items are linked to this valuation.</strong></div>`;
    document.getElementById("quote-details").innerHTML = `${itemCards}<div class="valuation-card" style="display:block;"><h3>Submitted photographs</h3>${await renderPhotos(items)}</div>`;
    document.getElementById("offer-controls").innerHTML = `${items.length > 1 ? `<div class="notice" style="margin-bottom:1rem;"><strong>Combined quote</strong><p>Complete an offer or refusal for every item.</p><div style="display:flex;justify-content:space-between;font-size:1.2rem;margin-top:.5rem;"><strong>Current combined offer total</strong><strong>${money(total)}</strong></div><button id="send-combined-quote" class="btn btn-primary" type="button" style="margin-top:.75rem">SEND ONE QUOTE EMAIL</button></div>` : ""}${items.map(item => offerCard(item,offers,refusals)).join("")}`;
    bind(data);
    await renderEmailHistory(offers);
  }

  const archiveButton = document.getElementById("archive-quote");
  if (archiveButton) archiveButton.addEventListener("click", async () => {
    const data=await loadData(); if(!data)return; const archived=!!data.valuation.archived_at;
    if(!confirm(`${archived ? "Restore" : "Archive"} quote ${data.valuation.quote_reference}?`))return;
    archiveButton.disabled=true;
    const {error}=await auth.supabase.rpc(archived ? "staff_restore_valuation" : "staff_archive_valuation",{p_valuation_id:valuationId});
    archiveButton.disabled=false;
    if(error){setMessage(error.message||"The quote could not be updated.",false);return;}
    if(!archived){window.location.href="admin-valuations.html";return;}
    setMessage("Quote restored to the active valuation list."); await render();
  });

  const deleteButton=document.getElementById("delete-quote");
  if(deleteButton)deleteButton.addEventListener("click",async()=>{
    const data=await loadData();if(!data)return;
    if(!confirm(`PERMANENTLY DELETE quote ${data.valuation.quote_reference}? This removes the quote and its linked items, offers and offer history. This cannot be undone.`))return;
    deleteButton.disabled=true;
    const {error}=await auth.supabase.rpc("staff_delete_valuation",{p_valuation_id:valuationId});
    if(error){deleteButton.disabled=false;setMessage(error.message||"The quote could not be deleted.",false);return;}
    window.location.href="admin-valuations.html";
  });

  await render();
});
