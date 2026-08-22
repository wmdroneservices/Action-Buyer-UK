/* Staff review fixes: show uploaded quote photos from quoteBasket and make the offer workflow explicit. */
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
      .filter(path => path && !seen.has(path) && seen.add(path));
  }

  async function signedUrls(paths) {
    const results = [];
    for (const path of paths) {
      if (/^https?:\/\//i.test(path)) {
        results.push(path);
        continue;
      }
      const { data, error } = await auth.supabase.storage.from("quote-photos").createSignedUrl(path, 3600);
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

    const byReference = new Map(valuations.map(v => [v.quote_reference, v]));
    document.querySelectorAll(".valuation-ref").forEach(ref => {
      const valuation = byReference.get(ref.textContent.trim());
      if (!valuation) return;
      const photos = collectPhotos(valuation.quote_data || {});
      const badge = [...ref.closest("article")?.querySelectorAll(".status-badge") || []]
        .find(el => /photo/i.test(el.textContent));
      if (badge) badge.textContent = `${photos.length} photo${photos.length === 1 ? "" : "s"}`;
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
