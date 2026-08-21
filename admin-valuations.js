document.addEventListener("DOMContentLoaded", async () => {
  const box = document.getElementById("manual-valuations");
  const message = document.getElementById("admin-message");
  const archiveLink = document.getElementById("archive-link");
  const auth = window.actionBuyerAuth;
  const session = await auth.getSession();

  if (!session) {
    window.location.href = "login.html?return=admin-valuations.html";
    return;
  }

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) {
    box.innerHTML = "<p>You do not have permission to access valuation review.</p>";
    return;
  }

  const showingArchive = new URLSearchParams(window.location.search).get("archive") === "1";
  if (archiveLink) {
    archiveLink.textContent = showingArchive ? "VIEW ACTIVE QUOTES" : "VIEW ARCHIVED QUOTES";
    archiveLink.href = showingArchive ? "admin-valuations.html" : "admin-valuations.html?archive=1";
  }

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const setMessage = (text, ok = true) => { message.textContent = text; message.className = "form-message " + (ok ? "success" : "error"); };

  function customerFromValuation(v) {
    const q = v.quote_data || {};
    return { userId: v.user_id || "unknown", name: q.fullName || "Unnamed customer", email: q.email || "No email recorded", phone: q.phone || "No phone recorded" };
  }

  function customerKey(v) {
    return v.user_id || `${v.quote_data?.email || "unknown"}|${v.quote_data?.fullName || ""}`;
  }

  async function quoteAction(action, valuationId, reference) {
    if (action === "archive") {
      if (!confirm(`Archive quote ${reference}? It will disappear from the active valuation list but remain available under Archived Quotes.`)) return;
      const { error } = await auth.supabase.rpc("staff_archive_valuation", { p_valuation_id: valuationId });
      if (error) { setMessage(error.message || "The quote could not be archived.", false); return; }
      setMessage(`Quote ${reference} has been archived.`);
    } else if (action === "restore") {
      if (!confirm(`Restore archived quote ${reference} to the active valuation list?`)) return;
      const { error } = await auth.supabase.rpc("staff_restore_valuation", { p_valuation_id: valuationId });
      if (error) { setMessage(error.message || "The quote could not be restored.", false); return; }
      setMessage(`Quote ${reference} has been restored.`);
    } else if (action === "delete") {
      if (!confirm(`PERMANENTLY DELETE quote ${reference}? This removes the quote and its linked items, offers and offer history. This cannot be undone.`)) return;
      const { error } = await auth.supabase.rpc("staff_delete_valuation", { p_valuation_id: valuationId });
      if (error) { setMessage(error.message || "The quote could not be deleted.", false); return; }
      setMessage(`Quote ${reference} has been permanently deleted.`);
    }
    await load();
  }

  async function load() {
    box.innerHTML = `<p>Loading ${showingArchive ? "archived" : "active"} customer valuations...</p>`;

    let valuationQuery = auth.supabase
      .from("valuations")
      .select("id,user_id,quote_reference,status,manufacturer,model,package,condition,quote_amount,submitted_at,updated_at,quote_data,archived_at")
      .order(showingArchive ? "archived_at" : "submitted_at", { ascending: false });

    valuationQuery = showingArchive ? valuationQuery.not("archived_at", "is", null) : valuationQuery.is("archived_at", null);
    const { data: valuations, error } = await valuationQuery;

    if (error) {
      box.innerHTML = "<p>We couldn't load valuations.</p>";
      console.error(error);
      return;
    }

    if (!valuations?.length) {
      box.innerHTML = showingArchive
        ? "<div class=\"empty-account\"><h3>No archived quotes</h3><p>Archived quotes will appear here.</p></div>"
        : "<p>No active valuations have been submitted yet.</p>";
      return;
    }

    const ids = valuations.map(v => v.id);
    const { data: items } = await auth.supabase.from("quote_items").select("id,valuation_id,item_name,manufacturer,model,package,item_status").in("valuation_id", ids);
    const itemIds = (items || []).map(i => i.id);
    const { data: offers } = itemIds.length
      ? await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status,internal_notes,customer_message,published_at,responded_at,created_at").in("item_id", itemIds).order("created_at", { ascending: false })
      : { data: [] };

    const groups = new Map();
    valuations.forEach(v => { const key = customerKey(v); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(v); });
    const sortedGroups = [...groups.entries()].sort((a, b) => new Date(b[1][0].submitted_at || 0).getTime() - new Date(a[1][0].submitted_at || 0).getTime());

    box.innerHTML = sortedGroups.map(([key, customerQuotes]) => {
      const customer = customerFromValuation(customerQuotes[0]);
      const customerId = `customer-${esc(String(key).replace(/[^a-zA-Z0-9_-]/g, "-"))}`;
      return `<section class="customer-valuation-group" style="margin-bottom:2rem;border:1px solid #ddd;border-radius:12px;padding:1.25rem;background:#fff;">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1rem;">
          <div><p class="section-kicker">CUSTOMER</p><h2 style="margin:.15rem 0 .35rem;">${esc(customer.name)}</h2><p style="margin:.2rem 0;">${esc(customer.email)}${customer.phone !== "No phone recorded" ? " · " + esc(customer.phone) : ""}</p></div>
          <div class="status-badge">${customerQuotes.length} quote${customerQuotes.length === 1 ? "" : "s"}</div>
        </div>
        <div class="customer-quotes-list" id="${customerId}">
          ${customerQuotes.map(v => {
            const quoteItems = (items || []).filter(i => i.valuation_id === v.id);
            const firstItem = quoteItems[0];
            const itemOffers = (offers || []).filter(o => quoteItems.some(i => i.id === o.item_id));
            const activeOffers = itemOffers.filter(o => o.status !== "superseded" && o.status !== "withdrawn");
            const accepted = activeOffers.filter(o => o.status === "accepted").length;
            const responded = activeOffers.filter(o => o.responded_at).length;
            const photos = Array.isArray(v.quote_data?.photos) ? v.quote_data.photos.length : 0;
            const title = v.quote_data?.modelName || v.model || firstItem?.item_name || "Equipment submission";
            const subtitle = quoteItems.length > 1 ? `${quoteItems.length} items` : (v.quote_data?.packageName || v.package || "");
            const detailUrl = `admin-quote.html?id=${encodeURIComponent(v.id)}`;
            const actions = showingArchive
              ? `<button class="btn btn-secondary quote-action" data-action="restore" data-id="${esc(v.id)}" data-reference="${esc(v.quote_reference)}" type="button">RESTORE</button><button class="btn quote-action quote-delete" data-action="delete" data-id="${esc(v.id)}" data-reference="${esc(v.quote_reference)}" type="button">DELETE</button>`
              : `<button class="btn btn-secondary quote-action" data-action="archive" data-id="${esc(v.id)}" data-reference="${esc(v.quote_reference)}" type="button">ARCHIVE</button><button class="btn quote-action quote-delete" data-action="delete" data-id="${esc(v.id)}" data-reference="${esc(v.quote_reference)}" type="button">DELETE</button>`;
            return `<article class="valuation-card admin-customer-quote" style="margin-bottom:1rem;">
              <div><span class="valuation-ref">${esc(v.quote_reference)}</span><p class="section-kicker">${esc(String(v.status || "submitted").replaceAll("_", " "))}</p><h3>${esc(title)}</h3><p>${esc(v.manufacturer || v.quote_data?.manufacturerName || firstItem?.manufacturer || "")}${subtitle ? " — " + esc(subtitle) : ""}</p><small>Submitted ${v.submitted_at ? new Date(v.submitted_at).toLocaleString("en-GB") : ""}${v.archived_at ? " · Archived " + new Date(v.archived_at).toLocaleString("en-GB") : ""}</small>
                <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem;"><span class="status-badge">${photos} photo${photos === 1 ? "" : "s"}</span><span class="status-badge">${activeOffers.length} offer${activeOffers.length === 1 ? "" : "s"}</span>${responded ? `<span class="status-badge">${responded} response${responded === 1 ? "" : "s"}` : ""}${accepted ? `<span class="status-badge">${accepted} accepted</span>` : ""}</div>
              </div>
              <div class="valuation-meta" style="min-width:260px;"><strong>${v.quote_amount == null ? (itemOffers.some(o => o.offer_type === "automatic" && o.status === "draft") ? "Automatic valuation ready" : "Manual valuation") : money(v.quote_amount)}</strong><a class="btn btn-primary" href="${detailUrl}">REVIEW &amp; SEND OFFER</a><div style="display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;">${actions}</div></div>
            </article>`;
          }).join("")}
        </div>
      </section>`;
    }).join("");

    box.querySelectorAll(".quote-action").forEach(button => button.addEventListener("click", () => quoteAction(button.dataset.action, button.dataset.id, button.dataset.reference)));
  }

  await load();
});
