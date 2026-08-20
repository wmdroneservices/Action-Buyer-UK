document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const session = await auth.getSession();
  if (!session) return;

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) return;

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;

  const archiveButton = document.getElementById("archive-quote");
  const deleteButton = document.getElementById("delete-quote");
  const message = document.getElementById("admin-message");
  const setMessage = (text, ok = true) => { message.textContent = text; message.className = "form-message " + (ok ? "success" : "error"); };

  const { data: valuation, error } = await auth.supabase.from("valuations").select("id,quote_reference,archived_at").eq("id", id).maybeSingle();
  if (error || !valuation) return;

  const refresh = () => {
    const archived = !!valuation.archived_at;
    if (archiveButton) {
      archiveButton.textContent = archived ? "RESTORE" : "ARCHIVE";
      archiveButton.classList.toggle("btn-secondary", true);
      archiveButton.dataset.action = archived ? "restore" : "archive";
    }
  };

  if (archiveButton) archiveButton.onclick = async () => {
    const archived = !!valuation.archived_at;
    const action = archived ? "restore" : "archive";
    if (!confirm(`${action === "archive" ? "Archive" : "Restore"} quote ${valuation.quote_reference}?`)) return;
    archiveButton.disabled = true;
    const { error: actionError } = await auth.supabase.rpc(archived ? "staff_restore_valuation" : "staff_archive_valuation", { p_valuation_id: id });
    archiveButton.disabled = false;
    if (actionError) { setMessage(actionError.message || "The quote could not be updated.", false); return; }
    if (archived) {
      window.location.href = "admin-valuations.html";
      return;
    }
    valuation.archived_at = new Date().toISOString();
    setMessage(`Quote ${valuation.quote_reference} has been archived.`);
    refresh();
  };

  if (deleteButton) deleteButton.onclick = async () => {
    if (!confirm(`PERMANENTLY DELETE quote ${valuation.quote_reference}? This removes the quote and its linked items, offers and offer history. This cannot be undone.`)) return;
    deleteButton.disabled = true;
    const { error: deleteError } = await auth.supabase.rpc("staff_delete_valuation", { p_valuation_id: id });
    if (deleteError) { deleteButton.disabled = false; setMessage(deleteError.message || "The quote could not be deleted.", false); return; }
    window.location.href = "admin-valuations.html";
  };

  refresh();
});

/* Staff can refuse an individual item without refusing the whole submission. */
document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) return;

  const message = document.getElementById("admin-message");
  const setMessage = (text, ok = true) => {
    if (!message) return;
    message.textContent = text;
    message.className = "form-message " + (ok ? "success" : "error");
  };

  async function notify(offerId) {
    try {
      await auth.supabase.functions.invoke("send-quote-email-v2", {
        body: { offer_id: offerId, event_type: "offer_refused" }
      });
    } catch (_) {}
  }

  function addRefuseButtons() {
    document.querySelectorAll("#offer-controls .valuation-card").forEach(card => {
      if (card.querySelector(".refuse-item-button")) return;

      const publishButton = card.querySelector(".publish-offer[data-item]");
      if (!publishButton) return;
      const itemId = publishButton.dataset.item;
      if (!itemId) return;

      const text = card.textContent.toLowerCase();
      const isRefused = text.includes("item status:") && text.includes("refused");
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.5rem;";

      if (isRefused) {
        wrap.innerHTML = '<span class="status-badge">ITEM REFUSED</span>';
      } else {
        wrap.innerHTML = '<button class="btn btn-secondary refuse-item-button" type="button">REFUSE ITEM</button>';
        wrap.querySelector("button").addEventListener("click", async (event) => {
          const button = event.currentTarget;
          const reason = prompt("Optional internal reason for refusing this item (not sent to the customer):", "");
          if (reason === null) return;
          if (!confirm("Refuse this item and send the customer a polite refusal?")) return;

          button.disabled = true;
          const { data, error } = await auth.supabase.rpc("staff_refuse_quote_item", {
            p_item_id: itemId,
            p_internal_reason: reason.trim() || null
          });
          if (error) {
            button.disabled = false;
            setMessage(error.message || "The item could not be refused.", false);
            return;
          }
          if (data?.offer_id) await notify(data.offer_id);
          setMessage("Item refused. The customer has been notified politely.");
          setTimeout(() => window.location.reload(), 500);
        });
      }

      const controls = publishButton.closest("div[style*='display:grid']");
      (controls?.parentElement || card).appendChild(wrap);
    });
  }

  const box = document.getElementById("offer-controls");
  if (!box) return;
  const observer = new MutationObserver(addRefuseButtons);
  observer.observe(box, { childList: true, subtree: true });
  addRefuseButtons();
});
