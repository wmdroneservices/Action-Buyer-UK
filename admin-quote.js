document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const session = await auth.getSession();
  const message = document.getElementById("admin-message");
  const params = new URLSearchParams(window.location.search);
  const valuationId = params.get("id");

  if (!session) {
    window.location.href = "login.html?return=" + encodeURIComponent(window.location.pathname + window.location.search);
    return;
  }

  const { data: staff } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!staff) {
    document.getElementById("quote-details").innerHTML = "<p>You do not have permission to access quote review.</p>";
    return;
  }

  if (!valuationId) {
    document.getElementById("quote-details").innerHTML = "<p>No quote was specified.</p>";
    return;
  }

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const pretty = v => String(v ?? "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, m => m.toUpperCase());

  function setMessage(text, ok = true) {
    message.textContent = text;
    message.className = "form-message " + (ok ? "success" : "error");
  }

  function customer(v) {
    const q = v.quote_data || {};
    return {
      name: q.fullName || "Unnamed customer",
      email: q.email || "No email recorded",
      phone: q.phone || "No phone recorded",
      address: [q.addressLine1, q.addressLine2, q.city, q.county, q.postcode].filter(Boolean).join(", ") || "No address recorded"
    };
  }

  function imageUrls(v) {
    const photos = Array.isArray(v.quote_data?.photos) ? v.quote_data.photos : [];
    return photos.filter(p => typeof p === "string" || p?.url || p?.path).map(p => typeof p === "string" ? p : (p.url || p.path));
  }

  async function notify(offerId, eventType) {
    try {
      await auth.supabase.functions.invoke("send-quote-email-v2", { body: { offer_id: offerId, event_type: eventType } });
    } catch (_) {}
  }

  async function load() {
    const { data: valuation, error: valuationError } = await auth.supabase
      .from("valuations")
      .select("id,user_id,quote_reference,status,manufacturer,model,package,condition,quote_amount,submitted_at,updated_at,quote_data")
      .eq("id", valuationId)
      .maybeSingle();

    if (valuationError || !valuation) {
      document.getElementById("quote-details").innerHTML = "<p>We couldn't load this quote.</p>";
      return;
    }

    const { data: items } = await auth.supabase
      .from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,created_at,updated_at")
      .eq("valuation_id", valuationId)
      .order("created_at", { ascending: true });

    const itemIds = (items || []).map(i => i.id);
    const { data: offers } = itemIds.length
      ? await auth.supabase
          .from("quote_offers")
          .select("id,item_id,offer_type,amount,status,internal_notes,customer_message,published_at,responded_at,created_at,updated_at")
          .in("item_id", itemIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const { data: emails } = await auth.supabase
      .from("email_queue")
      .select("id,event_type,subject,status,attempts,last_error,created_at,sent_at,offer_id")
      .eq("user_id", valuation.user_id)
      .order("created_at", { ascending: false });

    const c = customer(valuation);
    const q = valuation.quote_data || {};
    const photos = imageUrls(valuation);

    document.getElementById("quote-title").textContent = q.modelName || valuation.model || "Equipment submission";
    document.getElementById("quote-reference").textContent = `${valuation.quote_reference} · ${pretty(valuation.status || "submitted")}`;

    document.getElementById("customer-details").innerHTML = `<div class="valuation-card">
      <div><h3>${esc(c.name)}</h3><p><strong>Email:</strong> ${esc(c.email)}</p><p><strong>Phone:</strong> ${esc(c.phone)}</p><p><strong>Return address:</strong> ${esc(c.address)}</p></div>
      <div class="valuation-meta"><small>Submitted</small><strong>${valuation.submitted_at ? new Date(valuation.submitted_at).toLocaleString("en-GB") : ""}</strong></div>
    </div>`;

    const contents = q.packageContents && typeof q.packageContents === "object"
      ? Object.entries(q.packageContents).map(([k, v]) => `<li><strong>${esc(pretty(k))}:</strong> ${esc(pretty(v))}</li>`).join("")
      : "<li>No package contents recorded.</li>";

    const batteries = Array.isArray(q.batteries)
      ? q.batteries.map((b, i) => `<li><strong>Battery ${i + 1}:</strong> ${esc(b.type || "Unknown")} · ${esc(b.cycles)} cycles</li>`).join("")
      : "<li>No battery information recorded.</li>";

    const extra = Array.isArray(q.additionalAccessories) && q.additionalAccessories.length
      ? q.additionalAccessories.map(a => `<li>${esc(typeof a === "string" ? a : JSON.stringify(a))}</li>`).join("")
      : "<li>None recorded.</li>";

    const photoHtml = photos.length
      ? `<div class="admin-photo-grid">${photos.map((url, i) => `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="Customer photograph ${i + 1}" loading="lazy"></a>`).join("")}</div>`
      : `<div class="notice"><strong>No photographs are stored against this quote.</strong><p>The staff review is ready to display uploaded photographs when the quote record contains them. Existing quotes with an empty photos array will need their photographs resubmitted before they can be assessed from this screen.</p></div>`;

    document.getElementById("quote-details").innerHTML = `<div class="valuation-card">
      <div style="width:100%;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;">
          <div><strong>Manufacturer</strong><p>${esc(valuation.manufacturer || q.manufacturerName || "—")}</p></div>
          <div><strong>Model</strong><p>${esc(valuation.model || q.modelName || "—")}</p></div>
          <div><strong>Package</strong><p>${esc(valuation.package || q.packageName || "—")}</p></div>
          <div><strong>Condition</strong><p>${esc(valuation.condition || q.condition || "—")}</p></div>
          <div><strong>Flight time</strong><p>${esc(q.flightHours || q.flightHoursRange || "—")}</p></div>
          <div><strong>Damage</strong><p>${esc(q.damage || "—")}${q.damageDescription ? " · " + esc(q.damageDescription) : ""}</p></div>
          <div><strong>Unbound</strong><p>${esc(q.unbound || "—")}</p></div>
          <div><strong>Legal right to sell</strong><p>${esc(q.legalRight || "—")}</p></div>
          <div><strong>Drone serial</strong><p>${esc(q.droneSerial || "—")}</p></div>
          <div><strong>Controller serial</strong><p>${esc(q.controllerSerial || "—")}</p></div>
          <div><strong>Automatic quote</strong><p>${valuation.quote_amount == null ? "Manual valuation" : money(valuation.quote_amount)}</p></div>
        </div>
        <hr>
        <h3>Package contents</h3><ul>${contents}</ul>
        <h3>Batteries</h3><ul>${batteries}</ul>
        <h3>Additional accessories</h3><ul>${extra}</ul>
        <h3>Photographs</h3>${photoHtml}
      </div>
    </div>`;

    document.getElementById("offer-controls").innerHTML = (items || []).length
      ? items.map(item => {
          const itemOffers = (offers || []).filter(o => o.item_id === item.id);
          const current = type => itemOffers.find(o => o.offer_type === type && o.status !== "superseded");
          const automatic = current("automatic");
          const manual = current("manual");
          const final = current("final");
          return `<article class="valuation-card" style="margin-bottom:1rem;">
            <div style="width:100%;">
              <span class="valuation-ref">ITEM</span><h3>${esc(item.item_name || item.model || "Equipment")}</h3>
              <p>${esc(item.manufacturer || valuation.manufacturer || "")} ${esc(item.model || valuation.model || "")}${item.package ? " — " + esc(item.package) : ""}</p>
              <p><strong>Item status:</strong> ${esc(pretty(item.item_status || "pending"))}</p>
              <div style="display:grid;gap:.75rem;">
                ${offerControl("Automatic", automatic, item.id, "automatic")}
                ${offerControl("Manual", manual, item.id, "manual")}
                ${offerControl("Final inspection offer", final, item.id, "final")}
              </div>
              ${itemOffers.length ? `<details style="margin-top:1rem;"><summary>Offer history</summary>${itemOffers.map(o => `<p><strong>${esc(pretty(o.offer_type))}</strong>: ${money(o.amount)} — ${esc(pretty(o.status))}${o.responded_at ? " · Responded " + new Date(o.responded_at).toLocaleString("en-GB") : ""}</p>`).join("")}</details>` : ""}
            </div>
          </article>`;
        }).join("")
      : `<div class="notice"><strong>No quote item is linked yet.</strong><p>The valuation record exists, but it has not been converted into an individual quote item.</p></div>`;

    document.getElementById("email-history").innerHTML = emails?.length
      ? emails.map(e => `<article style="padding:.75rem 0;border-bottom:1px solid #ddd;"><strong>${esc(e.subject || pretty(e.event_type))}</strong><p>${esc(pretty(e.event_type))} · ${esc(e.status || "queued")} · ${e.sent_at ? "Sent " + new Date(e.sent_at).toLocaleString("en-GB") : "Created " + new Date(e.created_at).toLocaleString("en-GB")}</p>${e.last_error ? `<small>Error: ${esc(e.last_error)}</small>` : ""}</article>`).join("")
      : "<p>No email history found for this customer.</p>";

    document.querySelectorAll(".publish-offer").forEach(btn => {
      btn.addEventListener("click", async () => {
        const itemId = btn.dataset.item;
        const type = btn.dataset.type;
        const input = document.querySelector(`.offer-price[data-item="${itemId}"][data-type="${type}"]`);
        const amount = Number(input?.value);
        if (!Number.isFinite(amount) || amount < 0) {
          setMessage("Enter a valid price before publishing the offer.", false);
          return;
        }
        btn.disabled = true;
        const { data: offer, error } = await auth.supabase.rpc("publish_quote_offer", {
          p_item_id: itemId,
          p_offer_type: type,
          p_amount: amount,
          p_internal_notes: type === "final" ? "Final physical inspection offer" : null,
          p_customer_message: type === "final"
            ? "This is your final offer following our inspection. Please accept or refuse it in your account."
            : type === "manual"
              ? "We have reviewed your submission and made a manual offer."
              : "Your automatic GearCashOut offer is ready."
        });
        btn.disabled = false;
        if (error) {
          setMessage(error.message || "The offer could not be published.", false);
          return;
        }
        await notify(offer?.id, "offer_published");
        setMessage(pretty(type) + " offer published.");
        await load();
      });
    });
  }

  function offerControl(label, offer, itemId, type) {
    return `<div style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(120px,180px) auto;gap:.5rem;align-items:end;">
      <div><strong>${esc(label)}</strong><div><span class="status-badge">${esc(pretty(offer?.status || "not published"))}</span>${offer?.responded_at ? `<small style="margin-left:.5rem;">Responded ${new Date(offer.responded_at).toLocaleString("en-GB")}</small>` : ""}</div></div>
      <input class="offer-price" data-item="${esc(itemId)}" data-type="${esc(type)}" type="number" min="0" step="0.01" value="${offer?.amount ?? ""}" placeholder="Price">
      <button class="btn ${type === "automatic" ? "btn-secondary" : "btn-primary"} publish-offer" data-item="${esc(itemId)}" data-type="${esc(type)}" type="button">${offer ? "UPDATE" : "PUBLISH"}</button>
    </div>`;
  }

  await load();
});
