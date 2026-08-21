/* Resilient quote-review renderer. Keeps offer data visible if the main review script encounters a bad legacy field. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(init, 900);
  });

  async function init() {
    const auth = window.actionBuyerAuth;
    const valuationId = new URLSearchParams(location.search).get("id");
    const box = document.getElementById("offer-controls");
    if (!auth || !valuationId || !box) return;

    const text = (box.textContent || "").trim().toLowerCase();
    if (!text.includes("loading")) return;

    const session = await auth.getSession();
    if (!session) return;

    const esc = v => String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
    const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n) || 0);
    const pretty = v => String(v ?? "").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, m => m.toUpperCase());

    const { data: items, error: itemsError } = await auth.supabase
      .from("quote_items")
      .select("id,item_name,manufacturer,model,package,item_status,item_position")
      .eq("valuation_id", valuationId)
      .order("item_position", { ascending: true });

    if (itemsError || !items?.length) {
      box.innerHTML = `<div class="notice"><strong>No quote items could be loaded.</strong><p>${esc(itemsError?.message || "No individual quote items are linked to this valuation.")}</p></div>`;
      return;
    }

    const ids = items.map(i => i.id);
    const { data: offers } = await auth.supabase
      .from("quote_offers")
      .select("id,item_id,offer_type,amount,status,responded_at,created_at")
      .in("item_id", ids)
      .order("created_at", { ascending: false });

    const current = (itemId, type) => (offers || []).find(o =>
      o.item_id === itemId && o.offer_type === type && !["superseded", "withdrawn"].includes(o.status)
    );

    const effectiveOffer = item => current(item.id, "final") || current(item.id, "manual");
    const total = items.reduce((sum, item) => {
      const offer = effectiveOffer(item);
      return sum + (offer && Number.isFinite(Number(offer.amount)) ? Number(offer.amount) : 0);
    }, 0);

    const title = document.getElementById("quote-title");
    if (title) title.textContent = items.length === 1
      ? (items[0].item_name || items[0].model || "Equipment submission")
      : `${items.length}-ITEM QUOTE`;

    const totalHtml = `<div id="resilient-quote-total" class="quote-basket-total" style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid #102f4f;margin:0 0 1rem;font-size:1.2rem"><strong>${items.length === 1 ? "Quote amount" : "Current combined offer total"}</strong><strong>${money(total)}</strong></div>`;

    const cards = items.map(item => {
      const manual = current(item.id, "manual");
      const final = current(item.id, "final");
      const offer = final || manual;
      const status = offer?.status || item.item_status || "pending";
      const amount = offer?.amount;
      const canRefuse = !["accepted", "refused", "closed"].includes(item.item_status);
      const label = final ? "Final inspection offer" : manual ? "Manual offer" : "Offer";
      return `<article class="valuation-card" style="margin-bottom:1rem"><div style="width:100%">
        <span class="valuation-ref">ITEM</span>
        <h3>${esc(item.item_name || item.model || "Equipment")}</h3>
        <p>${esc([item.manufacturer, item.model, item.package].filter(Boolean).join(" — "))}</p>
        <p><strong>Current offer:</strong> ${amount == null ? "Not published" : money(amount)}</p>
        <p><strong>Status:</strong> ${esc(pretty(status))}${offer?.responded_at ? ` · Responded ${new Date(offer.responded_at).toLocaleString("en-GB")}` : ""}</p>
        <details style="margin-top:.75rem"><summary>Offer controls</summary>
          <div style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(120px,180px) auto;gap:.5rem;align-items:end;margin-top:.75rem">
            <strong>Manual offer</strong>
            <input class="resilient-price" data-item="${esc(item.id)}" data-type="manual" type="number" min="0" step="0.01" value="${manual?.amount ?? ""}" placeholder="Price">
            <button class="btn btn-primary resilient-publish" data-item="${esc(item.id)}" data-type="manual" type="button">${manual ? "UPDATE" : "PUBLISH"}</button>
          </div>
          <div style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(120px,180px) auto;gap:.5rem;align-items:end;margin-top:.75rem">
            <strong>Final inspection offer</strong>
            <input class="resilient-price" data-item="${esc(item.id)}" data-type="final" type="number" min="0" step="0.01" value="${final?.amount ?? ""}" placeholder="Price">
            <button class="btn btn-primary resilient-publish" data-item="${esc(item.id)}" data-type="final" type="button">${final ? "UPDATE" : "PUBLISH"}</button>
          </div>
        </details>
        ${canRefuse ? `<button class="btn btn-secondary resilient-refuse" data-item="${esc(item.id)}" type="button" style="margin-top:.75rem">REFUSE ITEM</button>` : ""}
      </div></article>`;
    }).join("");

    box.innerHTML = totalHtml + cards;

    box.querySelectorAll(".resilient-publish").forEach(button => {
      button.addEventListener("click", async () => {
        const itemId = button.dataset.item;
        const type = button.dataset.type;
        const input = box.querySelector(`.resilient-price[data-item="${itemId}"][data-type="${type}"]`);
        const amount = Number(input?.value);
        if (!Number.isFinite(amount) || amount < 0) return;
        button.disabled = true;
        const { error } = await auth.supabase.rpc("publish_quote_offer", {
          p_item_id: itemId,
          p_offer_type: type,
          p_amount: amount,
          p_internal_notes: type === "final" ? "Final physical inspection offer" : null,
          p_customer_message: type === "final"
            ? "This is your final offer following our inspection. Please accept or refuse it in your account."
            : "We have reviewed your submission and made a manual offer."
        });
        if (error) alert(error.message || "The offer could not be published.");
        else location.reload();
      });
    });

    box.querySelectorAll(".resilient-refuse").forEach(button => {
      button.addEventListener("click", async () => {
        const reason = prompt("Optional internal reason for refusing this item:", "");
        if (reason === null) return;
        if (!confirm("Refuse this item? Other items in this quote will remain available.")) return;
        button.disabled = true;
        const { error } = await auth.supabase.rpc("staff_refuse_quote_item", {
          p_item_id: button.dataset.item,
          p_internal_reason: reason.trim() || null
        });
        if (error) alert(error.message || "The item could not be refused.");
        else location.reload();
      });
    });
  }
})();
