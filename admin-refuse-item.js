document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) return;

  const { data: staff } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
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

  function addButtons() {
    document.querySelectorAll("#offer-controls .valuation-card").forEach(card => {
      if (card.querySelector(".refuse-item-button")) return;

      const publishButton = card.querySelector(".publish-offer[data-item]");
      if (!publishButton) return;

      const itemId = publishButton.dataset.item;
      if (!itemId) return;

      const statusText = card.textContent.toLowerCase();
      const isRefused = statusText.includes("item status:") && statusText.includes("refused");

      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.5rem;";

      if (isRefused) {
        wrap.innerHTML = '<span class="status-badge">ITEM REFUSED</span>';
      } else {
        wrap.innerHTML = '<button class="btn btn-secondary refuse-item-button" type="button">REFUSE ITEM</button>';
        const button = wrap.querySelector("button");
        button.addEventListener("click", async () => {
          const reason = prompt(
            "Optional internal reason for refusing this item (not sent to the customer):",
            ""
          );
          if (reason === null) return;

          if (!confirm("Refuse this item and notify the customer politely?")) return;

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

      const controls = card.querySelector(".publish-offer")?.closest("div[style*='display:grid']");
      (controls?.parentElement || card.querySelector("div[style*='width:100%']") || card).appendChild(wrap);
    });
  }

  const box = document.getElementById("offer-controls");
  if (!box) return;
  const observer = new MutationObserver(addButtons);
  observer.observe(box, { childList: true, subtree: true });
  addButtons();
});
