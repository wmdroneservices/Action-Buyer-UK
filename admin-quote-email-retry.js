document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const history = document.getElementById("email-history");
  const message = document.getElementById("admin-message");
  if (!auth || !history) return;

  const valuationId = new URLSearchParams(window.location.search).get("id");
  if (!valuationId) return;

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

  let running = false;

  async function addRetryControls() {
    if (running) return;
    running = true;
    try {
      const { data: items, error: itemError } = await auth.supabase
        .from("quote_items")
        .select("id")
        .eq("valuation_id", valuationId);
      if (itemError || !items?.length) return;

      const itemIds = items.map(item => item.id);
      const { data: offers } = await auth.supabase
        .from("quote_offers")
        .select("id,item_id")
        .in("item_id", itemIds);
      const offerIds = (offers || []).map(offer => offer.id);
      if (!offerIds.length) return;

      const { data: queued } = await auth.supabase
        .from("email_queue")
        .select("id,offer_id,event_type,status,last_error")
        .in("offer_id", offerIds)
        .eq("status", "queued");

      (queued || []).forEach(row => {
        const articles = Array.from(history.querySelectorAll("article"));
        const article = articles.find(a => a.textContent.includes(row.event_type.replaceAll("_", " ")) || a.textContent.includes("Offer Published"));
        const target = article || history;
        if (target.querySelector(`[data-email-retry="${row.id}"]`)) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-secondary";
        button.dataset.emailRetry = row.id;
        button.textContent = "RETRY EMAIL";
        button.style.marginTop = ".35rem";
        button.addEventListener("click", async () => {
          button.disabled = true;
          button.textContent = "SENDING...";
          try {
            const { data, error } = await auth.supabase.functions.invoke("send-quote-email-v2", {
              body: { offer_id: row.offer_id, event_type: row.event_type }
            });
            if (error) throw error;
            if (!data?.sent) throw new Error(data?.error || "The email was not sent.");
            setMessage("Quote email sent successfully.");
            await refreshHistory();
          } catch (error) {
            console.error("Quote email retry failed", error);
            const detail = error?.message || "The quote email could not be sent.";
            setMessage(detail, false);
            button.disabled = false;
            button.textContent = "RETRY EMAIL";
          }
        });

        target.appendChild(button);
      });
    } finally {
      running = false;
    }
  }

  async function refreshHistory() {
    const valuation = await auth.supabase
      .from("valuations")
      .select("user_id")
      .eq("id", valuationId)
      .maybeSingle();
    if (!valuation.data?.user_id) return;

    const { data: items } = await auth.supabase
      .from("quote_items")
      .select("id")
      .eq("valuation_id", valuationId);
    const itemIds = (items || []).map(item => item.id);
    if (!itemIds.length) return;

    const { data: offers } = await auth.supabase
      .from("quote_offers")
      .select("id")
      .in("item_id", itemIds);
    const offerIds = (offers || []).map(offer => offer.id);
    if (!offerIds.length) return;

    const { data: emails } = await auth.supabase
      .from("email_queue")
      .select("id,event_type,subject,status,attempts,last_error,created_at,sent_at,offer_id")
      .in("offer_id", offerIds)
      .order("created_at", { ascending: false });
    if (!emails) return;

    history.innerHTML = emails.map(e => `<article style="padding:.75rem 0;border-bottom:1px solid #ddd;">
      <strong>${esc(e.subject || e.event_type)}</strong>
      <p>${esc(e.event_type.replaceAll("_", " "))} · ${esc(e.status || "queued")} · ${e.sent_at ? "Sent " + new Date(e.sent_at).toLocaleString("en-GB") : "Created " + new Date(e.created_at).toLocaleString("en-GB")}</p>
      ${e.last_error ? `<small>Error: ${esc(e.last_error)}</small>` : ""}
    </article>`).join("") || "<p>No email history for this quote yet.</p>";
    await addRetryControls();
  }

  const observer = new MutationObserver(() => {
    if (!running) addRetryControls();
  });
  observer.observe(history, { childList: true });
  setTimeout(addRetryControls, 500);
});
