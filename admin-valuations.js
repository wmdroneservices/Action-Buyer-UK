document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const box = document.getElementById("manual-valuations");
  const message = document.getElementById("admin-message");
  const archiveLink = document.getElementById("archive-link");
  const auth = window.actionBuyerAuth;
  if (!box || !auth) return;

  const session = await auth.getSession();
  if (!session) {
    window.location.href = "login.html?return=admin-valuations.html";
    return;
  }

  const { data: staff } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

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
  const esc = v => String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const setMessage = (text, ok = true) => {
    if (!message) return;
    message.textContent = text;
    message.className = "form-message " + (ok ? "success" : "error");
  };

  const effectiveOffer = (offers, itemId) => {
    const list = (offers || []).filter(o => o.item_id === itemId && o.status === "published");
    return list.find(o => o.offer_type === "final")
      || list.find(o => o.offer_type === "manual")
      || list.find(o => o.offer_type === "automatic")
      || null;
  };

  const submissionKey = valuation => {
    const key = valuation?.quote_data?.submissionKey;
    return key && String(key).trim() ? String(key).trim() : valuation.id;
  };

  const customerFromValuation = valuation => {
    const q = valuation?.quote_data || {};
    return {
      name: q.fullName || q.customerName || "Unnamed customer",
      email: q.email || q.emailAddress || "No email recorded",
      phone: q.phone || q.phoneNumber || "No phone recorded"
    };
  };

  async function quoteAction(action, valuationIds, reference) {
    const ids = Array.isArray(valuationIds) ? valuationIds : [valuationIds];
    if (action === "archive") {
      if (!confirm(`Archive quote ${reference}? It will disappear from the active valuation list but remain available under Archived Quotes.`)) return;
      for (const id of ids) {
        const { error } = await auth.supabase.rpc("staff_archive_valuation", { p_valuation_id: id });
        if (error) { setMessage(error.message || "The quote could not be archived.", false); return; }
      }
      setMessage(`Quote ${reference} has been archived.`);
    } else if (action === "restore") {
      if (!confirm(`Restore archived quote ${reference} to the active valuation list?`)) return;
      for (const id of ids) {
        const { error } = await auth.supabase.rpc("staff_restore_valuation", { p_valuation_id: id });
        if (error) { setMessage(error.message || "The quote could not be restored.", false); return; }
      }
      setMessage(`Quote ${reference} has been restored.`);
    } else if (action === "delete") {
      if (!confirm(`PERMANENTLY DELETE quote ${reference}? This removes the quote and its linked items, offers and offer history. This cannot be undone.`)) return;
      for (const id of ids) {
        const { error } = await auth.supabase.rpc("staff_delete_valuation", { p_valuation_id: id });
        if (error) { setMessage(error.message || "The quote could not be deleted.", false); return; }
      }
      setMessage(`Quote ${reference} has been permanently deleted.`);
    }
    await load();
  }

  async function publishManual(itemId, amount, button) {
    if (!Number.isFinite(amount) || amount < 0) {
      setMessage("Enter a valid manual offer amount.", false);
      return false;
    }

    button.disabled = true;
    try {
      const { error } = await auth.supabase.rpc("publish_quote_offer", {
        p_item_id: itemId,
        p_offer_type: "manual",
        p_amount: amount,
        p_internal_notes: "Manual valuation prepared for combined customer quote",
        p_customer_message: "We have reviewed your item and included this valuation in your combined GearCashOut quote."
      });
      if (error) throw error;
      return true;
    } catch (error) {
      setMessage(error?.message || "The manual valuation could not be saved.", false);
      button.disabled = false;
      return false;
    }
  }

  async function sendCombined(primaryValuationId, button, itemCount) {
    button.disabled = true;
    button.textContent = "SENDING...";
    try {
      const { data, error } = await auth.supabase.rpc("queue_quote_review_email", { p_valuation_id: primaryValuationId });
      if (error) throw error;

      const offerId = data?.first_offer_id;
      if (offerId) {
        const emailResult = await auth.supabase.functions.invoke("send-quote-email-v2", {
          body: { offer_id: offerId, event_type: "offer_published" }
        });
        if (emailResult.error) throw emailResult.error;
      }

      setMessage(`One combined quote containing ${itemCount} item${itemCount === 1 ? "" : "s"} has been sent to the customer.`);
      await load();
    } catch (error) {
      setMessage(error?.message || "The combined quote could not be sent.", false);
      button.disabled = false;
      button.textContent = "SEND OFFER TO CUSTOMER";
    }
  }

  async function load() {
    box.innerHTML = `<p>Loading ${showingArchive ? "archived" : "active"} customer valuations...</p>`;

    let valuationQuery = auth.supabase
      .from("valuations")
      .select("id,user_id,quote_reference,status,manufacturer,model,package,condition,quote_amount,submitted_at,updated_at,quote_data,archived_at")
      .order(showingArchive ? "archived_at" : "submitted_at", { ascending: false });

    valuationQuery = showingArchive
      ? valuationQuery.not("archived_at", "is", null)
      : valuationQuery.is("archived_at", null);

    const { data: loadedValuations, error } = await valuationQuery;
    if (error) {
      box.innerHTML = "<p>We couldn't load valuations.</p>";
      console.error(error);
      return;
    }

    let valuations = loadedValuations || [];
    if (!valuations.length) {
      box.innerHTML = showingArchive
        ? "<div class=\"empty-account\"><h3>No archived quotes</h3><p>Archived quotes will appear here.</p></div>"
        : "<p>No active valuations have been submitted yet.</p>";
      return;
    }

    const ids = valuations.map(v => v.id);
    const { data: items } = await auth.supabase
      .from("quote_items")
      .select("id,valuation_id,item_name,manufacturer,model,package,item_status,item_position")
      .in("valuation_id", ids)
      .order("item_position", { ascending: true });

    const itemIds = (items || []).map(i => i.id);
    const { data: offers } = itemIds.length
      ? await auth.supabase
        .from("quote_offers")
        .select("id,item_id,offer_type,amount,status,internal_notes,customer_message,published_at,responded_at,created_at")
        .in("item_id", itemIds)
        .order("created_at", { ascending: false })
      : { data: [] };

    // A quote moves to Sales only when one of its items has actually been accepted
    // and linked to a sale. A merely published automatic offer must not remove a
    // multi-item submission from this staff valuation queue.
    if (!showingArchive && itemIds.length) {
      const { data: saleItems, error: saleItemsError } = await auth.supabase
        .from("sale_items")
        .select("quote_item_id")
        .in("quote_item_id", itemIds);
      if (saleItemsError) {
        console.error("Sale linkage query error:", saleItemsError);
      } else {
        const linkedItemIds = new Set((saleItems || []).map(row => row.quote_item_id));
        const linkedValuationIds = new Set((items || [])
          .filter(i => linkedItemIds.has(i.id))
          .map(i => i.valuation_id));
        valuations = valuations.filter(v => !linkedValuationIds.has(v.id));
      }
    }

    const groups = new Map();
    valuations.forEach(v => {
      const key = submissionKey(v);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(v);
    });

    const groupRows = [...groups.entries()].map(([key, group]) => {
      const groupIds = new Set(group.map(v => v.id));
      const groupItems = (items || [])
        .filter(i => groupIds.has(i.valuation_id))
        .sort((a, b) => (a.item_position || 999) - (b.item_position || 999));
      const groupOffers = (offers || []).filter(o => groupItems.some(i => i.id === o.item_id));
      const unresolved = groupItems.filter(i => !["accepted", "refused", "closed"].includes(i.item_status));
      const effective = new Map(groupItems.map(i => [i.id, effectiveOffer(groupOffers, i.id)]));
      const ready = unresolved.length > 0 && unresolved.every(i => !!effective.get(i.id));
      const customerReview = group.some(v => v.status === "customer_review");
      const completed = groupItems.length > 0 && unresolved.length === 0;
      return { key, group, groupItems, groupOffers, effective, unresolved, ready, customerReview, completed };
    }).filter(row => row.groupItems.length > 0);

    groupRows.sort((a, b) => new Date(b.group[0]?.submitted_at || 0).getTime() - new Date(a.group[0]?.submitted_at || 0).getTime());

    if (!groupRows.length) {
      box.innerHTML = showingArchive
        ? "<div class=\"empty-account\"><h3>No archived quotes</h3><p>Archived quotes will appear here.</p></div>"
        : "<p>No active valuations require staff review.</p>";
      return;
    }

    box.innerHTML = groupRows.map(row => {
      const { key, group, groupItems, groupOffers, effective, unresolved, ready, customerReview, completed } = row;
      const customer = customerFromValuation(group[0]);
      const primary = group[0];
      const multiItem = groupItems.length > 1;
      const reference = primary.quote_reference || "Combined valuation";
      const total = [...effective.values()].reduce((sum, offer) => sum + (Number(offer?.amount) || 0), 0);
      const photos = group.reduce((sum, v) => sum + (Array.isArray(v.quote_data?.photos) ? v.quote_data.photos.length : 0), 0);
      const actionIds = esc(JSON.stringify(group.map(v => v.id)));

      const itemCards = groupItems.map(item => {
        const offer = effective.get(item.id);
        const currentStatus = String(item.item_status || "under_assessment");
        const title = [item.manufacturer, item.model || item.item_name].filter(Boolean).join(" ") || "Equipment";
        const isAutomatic = offer?.offer_type === "automatic";
        const isManual = offer?.offer_type === "manual" || offer?.offer_type === "final";
        const inputValue = isManual && offer ? Number(offer.amount).toFixed(2) : "";
        const canEdit = !customerReview && !["accepted", "refused", "closed"].includes(currentStatus) && !isAutomatic;
        const hasOffer = !!offer;

        let valueHtml = "";
        if (isAutomatic) {
          valueHtml = `<div><span class="section-kicker">AUTOMATIC VALUATION</span><strong style="font-size:1.25rem">${money(offer.amount)}</strong><small style="display:block;margin-top:.25rem">Pre-filled from the automatic valuation.</small></div>`;
        } else if (isManual) {
          valueHtml = `<label style="display:block;min-width:220px"><span class="section-kicker">MANUAL VALUATION</span><input class="combined-manual-amount" data-item="${esc(item.id)}" type="number" min="0" step="0.01" value="${inputValue}" placeholder="Enter buying price" ${customerReview || currentStatus !== "under_assessment" ? "disabled" : ""}></label>`;
        } else {
          valueHtml = `<label style="display:block;min-width:220px"><span class="section-kicker">MANUAL VALUATION REQUIRED</span><input class="combined-manual-amount" data-item="${esc(item.id)}" type="number" min="0" step="0.01" placeholder="Enter buying price"></label>`;
        }

        const saveButton = !customerReview && !["accepted", "refused", "closed"].includes(currentStatus) && !isAutomatic
          ? `<button class="btn btn-secondary save-combined-manual" data-item="${esc(item.id)}" type="button">${hasOffer ? "UPDATE PRICE" : "SAVE PRICE"}</button>`
          : "";

        return `<article class="valuation-card" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,340px);gap:1rem;margin:0;align-items:center;">
          <div><span class="valuation-ref">ITEM ${esc(item.item_position || "")}</span><p class="section-kicker">${esc(currentStatus.replaceAll("_", " "))}</p><h3>${esc(title)}</h3><p style="margin:.25rem 0">${esc(item.package || "")}</p></div>
          <div style="display:flex;gap:.6rem;justify-content:flex-end;align-items:flex-end;flex-wrap:wrap">${valueHtml}${saveButton}</div>
        </article>`;
      }).join("");

      const combinedButton = multiItem && !customerReview && !completed && ready
        ? `<button class="btn btn-primary send-combined" data-id="${esc(primary.id)}" data-count="${groupItems.length}" type="button">SEND OFFER TO CUSTOMER</button>`
        : "";
      const customerReviewBadge = customerReview
        ? `<span class="status-badge">SENT TO CUSTOMER — AWAITING RESPONSE</span>`
        : ready
          ? `<span class="status-badge">READY TO SEND</span>`
          : `<span class="status-badge">${unresolved.length} ITEM${unresolved.length === 1 ? "" : "S"} NEEDING REVIEW</span>`;

      const archiveButtons = showingArchive
        ? `<button class="btn btn-secondary quote-action" data-action="restore" data-ids="${actionIds}" data-reference="${esc(reference)}" type="button">RESTORE</button><button class="btn quote-action quote-delete" data-action="delete" data-ids="${actionIds}" data-reference="${esc(reference)}" type="button">DELETE</button>`
        : `<button class="btn btn-secondary quote-action" data-action="archive" data-ids="${actionIds}" data-reference="${esc(reference)}" type="button">ARCHIVE</button><button class="btn quote-action quote-delete" data-action="delete" data-ids="${actionIds}" data-reference="${esc(reference)}" type="button">DELETE</button>`;

      const detailsLink = `<a class="btn btn-secondary" href="admin-quote.html?id=${encodeURIComponent(primary.id)}">VIEW FULL DETAILS</a>`;

      return `<section class="customer-valuation-group" data-group-key="${esc(key)}" style="margin-bottom:2rem;border:1px solid #ddd;border-radius:12px;padding:1.25rem;background:#fff;">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1rem;">
          <div><p class="section-kicker">${multiItem ? "COMBINED CUSTOMER QUOTE" : "CUSTOMER QUOTE"}</p><h2 style="margin:.15rem 0 .35rem">${esc(reference)}</h2><p style="margin:.2rem 0">${esc(customer.name)} · ${esc(customer.email)}${customer.phone !== "No phone recorded" ? " · " + esc(customer.phone) : ""}</p></div>
          <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">${customerReviewBadge}<span class="status-badge">${groupItems.length} ITEM${groupItems.length === 1 ? "" : "S"}</span></div>
        </div>
        <div style="display:grid;gap:.75rem">${itemCards}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:1rem;padding:1rem 0;border-top:2px solid #102f4f;">
          <div><span class="section-kicker">COMBINED TOTAL</span><strong style="font-size:1.35rem;display:block">${money(total)}</strong><small>${photos} customer photo${photos === 1 ? "" : "s"}</small></div>
          <div style="display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap">${detailsLink}${combinedButton}${archiveButtons}</div>
        </div>
      </section>`;
    }).join("");

    box.querySelectorAll(".save-combined-manual").forEach(button => {
      button.addEventListener("click", async () => {
        const itemId = button.dataset.item;
        const input = box.querySelector(`.combined-manual-amount[data-item="${CSS.escape(itemId)}"]`);
        const amount = Number(input?.value);
        const ok = await publishManual(itemId, amount, button);
        if (ok) await load();
      });
    });

    box.querySelectorAll(".send-combined").forEach(button => {
      button.addEventListener("click", async () => {
        const state = groupRows.find(row => row.group.some(v => v.id === button.dataset.id));
        if (!state) return;
        await sendCombined(button.dataset.id, button, Number(button.dataset.count) || state.groupItems.length);
      });
    });

    box.querySelectorAll(".quote-action").forEach(button => {
      button.addEventListener("click", () => {
        let idsForAction;
        try { idsForAction = JSON.parse(button.dataset.ids || "[]"); } catch (_) { idsForAction = []; }
        quoteAction(button.dataset.action, idsForAction, button.dataset.reference);
      });
    });
  }

  await load();
});
