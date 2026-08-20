/* Keep staff email history attached to the individual valuation, not the customer account. */
document.addEventListener("DOMContentLoaded", () => {
  const history = document.getElementById("email-history");
  if (!history || !window.actionBuyerAuth) return;

  const valuationId = new URLSearchParams(window.location.search).get("id");
  if (!valuationId) return;

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

  let running = false;
  let observer;

  async function refresh() {
    if (running) return;
    running = true;
    if (observer) observer.disconnect();

    try {
      const auth = window.actionBuyerAuth;
      const { data: valuation, error: valuationError } = await auth.supabase
        .from("valuations")
        .select("id,user_id,quote_reference")
        .eq("id", valuationId)
        .maybeSingle();

      if (valuationError || !valuation) return;

      const { data: items } = await auth.supabase
        .from("quote_items")
        .select("id")
        .eq("valuation_id", valuationId);

      const itemIds = (items || []).map(item => item.id);
      if (!itemIds.length) {
        history.innerHTML = "<p>No email history for this quote yet.</p>";
        return;
      }

      const { data: offers } = await auth.supabase
        .from("quote_offers")
        .select("id")
        .in("item_id", itemIds);

      const offerIds = (offers || []).map(offer => offer.id);
      if (!offerIds.length) {
        history.innerHTML = "<p>No email history for this quote yet.</p>";
        return;
      }

      const { data: emails, error: emailError } = await auth.supabase
        .from("email_queue")
        .select("id,event_type,subject,status,attempts,last_error,created_at,sent_at,offer_id")
        .in("offer_id", offerIds)
        .order("created_at", { ascending: false });

      if (emailError) {
        console.error("Could not load quote-specific email history", emailError);
        return;
      }

      history.innerHTML = emails?.length
        ? emails.map(e => `<article style="padding:.75rem 0;border-bottom:1px solid #ddd;">
            <strong>${esc(e.subject || pretty(e.event_type))}</strong>
            <p>${esc(pretty(e.event_type))} · ${esc(e.status || "queued")} · ${e.sent_at ? "Sent " + new Date(e.sent_at).toLocaleString("en-GB") : "Created " + new Date(e.created_at).toLocaleString("en-GB")}</p>
            ${e.last_error ? `<small>Error: ${esc(e.last_error)}</small>` : ""}
          </article>`).join("")
        : "<p>No email history for this quote yet.</p>";
    } finally {
      running = false;
      if (observer) observer.observe(history, { childList: true });
    }
  }

  observer = new MutationObserver(() => {
    if (!running) refresh();
  });
  observer.observe(history, { childList: true });
  refresh();
});
