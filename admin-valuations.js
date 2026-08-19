document.addEventListener("DOMContentLoaded", async () => {
  const box = document.getElementById("manual-valuations");
  const message = document.getElementById("admin-message");
  const session = await window.actionBuyerAuth.getSession();
  if (!session) {
    window.location.href = "login.html?return=admin-valuations.html";
    return;
  }

  const { data: staff, error: staffError } = await window.actionBuyerAuth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (staffError || !staff) {
    box.innerHTML = "<p>You do not have permission to access valuation review.</p>";
    return;
  }

  async function load() {
    box.innerHTML = "<p>Loading valuations...</p>";
    const { data, error } = await window.actionBuyerAuth.supabase
      .from("valuations")
      .select("id,quote_reference,status,manufacturer,model,package,condition,quote_amount,submitted_at,updated_at,quote_data")
      .order("submitted_at", { ascending: false });

    if (error) {
      box.innerHTML = "<p>We couldn't load valuations.</p>";
      console.error(error);
      return;
    }

    if (!data?.length) {
      box.innerHTML = "<p>No valuations have been submitted yet.</p>";
      return;
    }

    box.innerHTML = data.map((v) => {
      const manual = v.status === "manual_review" || v.quote_data?.manualValuation === true;
      const amount = v.quote_amount == null ? "" : Number(v.quote_amount).toFixed(2);
      const status = manual && v.quote_amount != null ? "valued — manual" : String(v.status || "submitted").replaceAll("_", " ");
      return `<article class="valuation-card admin-valuation-card">
        <div>
          <span class="valuation-ref">${escapeHtml(v.quote_reference)}</span>
          <h3>${escapeHtml(v.model || "Equipment submission")}</h3>
          <p>${escapeHtml(v.manufacturer || "")} ${v.package ? "— " + escapeHtml(v.package) : ""}</p>
          <small>Submitted ${new Date(v.submitted_at).toLocaleString("en-GB")}</small>
        </div>
        <div class="valuation-meta">
          <span class="status-badge">${escapeHtml(status)}</span>
          ${manual && v.status === "manual_review" ? `<label>Confirmed purchase price (£)<input class="manual-price" type="number" min="0" step="0.01" value="${amount}" data-id="${v.id}"></label><button class="btn btn-primary save-manual" data-id="${v.id}" type="button">SET VALUATION</button>` : `<strong>£${Number(v.quote_amount || 0).toFixed(2)}</strong>`}
        </div>
      </article>`;
    }).join("");

    box.querySelectorAll(".save-manual").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.id;
        const input = box.querySelector(`.manual-price[data-id="${id}"]`);
        const price = Number(input?.value);
        if (!Number.isFinite(price) || price < 0) {
          message.textContent = "Enter a valid purchase price.";
          message.className = "form-message error";
          return;
        }
        const valuation = data.find((item) => item.id === id);
        const quoteData = { ...(valuation?.quote_data || {}), manualValuation: true, manualValuationConfirmedAt: new Date().toISOString() };
        button.disabled = true;
        const { error } = await window.actionBuyerAuth.supabase
          .from("valuations")
          .update({ quote_amount: price, status: "valued", quote_data: quoteData, updated_at: new Date().toISOString() })
          .eq("id", id);
        button.disabled = false;
        if (error) {
          message.textContent = "The valuation could not be updated.";
          message.className = "form-message error";
          console.error(error);
          return;
        }
        message.textContent = "Manual valuation updated successfully.";
        message.className = "form-message success";
        await load();
      });
    });
  }

  await load();
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
