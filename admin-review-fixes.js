/* Staff review fixes: show uploaded quote photos and make the offer workflow explicit. */
document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;

  const path = window.location.pathname.split("/").pop();

  function collectPhotos(quoteData) {
    const direct = Array.isArray(quoteData?.photos) ? quoteData.photos : [];
    const basket = Array.isArray(quoteData?.quoteBasket) ? quoteData.quoteBasket : [];
    const nested = basket.flatMap(item => Array.isArray(item?.photos) ? item.photos : []);
    const all = [...direct, ...nested];
    const seen = new Set();
    return all
      .map(photo => typeof photo === "string" ? photo : photo?.path || photo?.url || "")
      .filter(photoPath => photoPath && !seen.has(photoPath) && seen.add(photoPath));
  }

  async function notify(offerId, eventType) {
    if (!offerId) return;
    try {
      await auth.supabase.functions.invoke("send-quote-email-v2", { body: { offer_id: offerId, event_type: eventType } });
    } catch (_) {}
  }

  async function signedUrls(paths) {
    const results = [];
    for (const photoPath of paths) {
      if (/^https?:\/\//i.test(photoPath)) {
        results.push(photoPath);
        continue;
      }
      const { data, error } = await auth.supabase.storage.from("quote-photos").createSignedUrl(photoPath, 3600);
      if (!error && data?.signedUrl) results.push(data.signedUrl);
    }
    return results;
  }

  if (path === "admin-valuations.html") {
    const { data: valuations, error } = await auth.supabase
      .from("valuations")
      .select("id,quote_reference,quote_data")
      .is("archived_at", null);
    if (error || !valuations) return;

    const ids = valuations.map(v => v.id);
    const { data: items } = ids.length
      ? await auth.supabase.from("quote_items").select("id,valuation_id,item_status,item_name,manufacturer,model,package").in("valuation_id", ids)
      : { data: [] };
    const itemIds = (items || []).map(item => item.id);
    const { data: offers } = itemIds.length
      ? await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status,responded_at").in("item_id", itemIds).order("created_at", { ascending: false })
      : { data: [] };

    const byReference = new Map(valuations.map(v => [v.quote_reference, v]));
    const itemsByValuation = new Map();
    (items || []).forEach(item => {
      if (!itemsByValuation.has(item.valuation_id)) itemsByValuation.set(item.valuation_id, []);
      itemsByValuation.get(item.valuation_id).push(item);
    });

    document.querySelectorAll(".valuation-ref").forEach(ref => {
      const article = ref.closest("article");
      const valuation = byReference.get(ref.textContent.trim());
      if (!valuation || !article) return;

      const photos = collectPhotos(valuation.quote_data || {});
      const badge = [...article.querySelectorAll(".status-badge")].find(el => /photo/i.test(el.textContent));
      if (badge) badge.textContent = `${photos.length} photo${photos.length === 1 ? "" : "s"}`;

      const quoteItems = itemsByValuation.get(valuation.id) || [];
      if (quoteItems.length !== 1 || article.querySelector(".quick-offer-controls")) return;
      const item = quoteItems[0];
      if (["accepted", "refused", "closed"].includes(item.item_status)) return;

      const activeOffer = (offers || []).find(o => o.item_id === item.id && !["superseded", "withdrawn"].includes(o.status));
      const controls = document.createElement("div");
      controls.className = "quick-offer-controls notice";
      controls.style.cssText = "margin-top:1rem;display:flex;gap:.6rem;align-items:end;flex-wrap:wrap;";
      controls.innerHTML = `<div style="flex:1;min-width:180px;"><strong>${activeOffer ? "Current customer offer" : "Set customer offer"}</strong><small style="display:block;margin-top:.2rem;">Enter your offer here. Publishing emails the customer so they can accept or refuse it in their account.</small></div><label style="min-width:130px;">Offer (£)<input class="quick-offer-price" type="number" min="0" step="0.01" value="${activeOffer?.amount ?? ""}" placeholder="0.00" style="display:block;width:100%;"></label><button type="button" class="btn btn-primary quick-offer-publish">${activeOffer ? "UPDATE & SEND" : "SEND OFFER"}</button>`;
      article.querySelector(".valuation-meta")?.before(controls);

      controls.querySelector(".quick-offer-publish").addEventListener("click", async () => {
        const button = controls.querySelector(".quick-offer-publish");
        const amount = Number(controls.querySelector(".quick-offer-price")?.value);
        if (!Number.isFinite(amount) || amount < 0) {
          alert("Enter a valid offer amount.");
          return;
        }
        button.disabled = true;
        const { data: offer, error: offerError } = await auth.supabase.rpc("publish_quote_offer", {
          p_item_id: item.id,
          p_offer_type: "manual",
          p_amount: amount,
          p_internal_notes: null,
          p_customer_message: "We have reviewed your submission and made a manual offer. Please accept or refuse it in your GearCashOut account."
        });
        if (offerError) {
          button.disabled = false;
          alert(offerError.message || "The offer could not be published.");
          return;
        }
        await notify(offer?.id, "offer_published");
        alert("Offer sent to the customer.");
        window.location.reload();
      });
    });

    document.querySelectorAll("a[href*='admin-quote.html']").forEach(link => {
      link.textContent = "REVIEW, VALUE & SEND OFFER";
    });
    return;
  }

  if (path !== "admin-quote.html") return;

  const valuationId = new URLSearchParams(window.location.search).get("id");
  const offerBox = document.getElementById("offer-controls");
  if (offerBox && !document.getElementById("offer-workflow-notice")) {
    const notice = document.createElement("div");
    notice.id = "offer-workflow-notice";
    notice.className = "notice";
    notice.style.marginBottom = "1rem";
    notice.innerHTML = "<strong>Set the customer offer below.</strong><p>Enter the amount in the Price box and click <strong>PUBLISH</strong>. The customer will be emailed the offer and can then accept or refuse it from their GearCashOut account.</p>";
    offerBox.parentNode.insertBefore(notice, offerBox);
  }

  if (!valuationId) return;
  const { data: valuation } = await auth.supabase
    .from("valuations")
    .select("quote_data")
    .eq("id", valuationId)
    .maybeSingle();
  if (!valuation) return;

  const paths = collectPhotos(valuation.quote_data || {});
  if (!paths.length) return;
  const urls = await signedUrls(paths);
  if (!urls.length) return;

  const details = document.getElementById("quote-details");
  const heading = [...details.querySelectorAll("h3")].find(h => h.textContent.trim() === "Photographs");
  if (!heading) return;
  const existing = heading.nextElementSibling;
  const grid = document.createElement("div");
  grid.className = "admin-photo-grid";
  urls.forEach((url, index) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    const img = document.createElement("img");
    img.src = url;
    img.alt = `Customer photograph ${index + 1}`;
    img.loading = "lazy";
    a.appendChild(img);
    grid.appendChild(a);
  });
  if (existing) existing.replaceWith(grid); else heading.after(grid);
});
