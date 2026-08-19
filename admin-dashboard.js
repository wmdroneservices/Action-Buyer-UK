document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const session = await auth.getSession();
  if (!session) { window.location.href = "login.html?return=admin.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { window.location.href = "account.html"; return; }

  document.getElementById("staff-welcome").textContent = `Signed in as ${session.user.email}`;
  document.getElementById("staff-sign-out").addEventListener("click", async () => {
    const button = document.getElementById("staff-sign-out");
    button.disabled = true;
    try { await auth.signOut(); } catch (error) { button.disabled = false; document.getElementById("staff-message").textContent = error?.message || "Could not sign out."; }
  });

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  const { data: valuations, error } = await auth.supabase.from("valuations")
    .select("id,quote_reference,status,manufacturer,model,package,quote_amount,submitted_at")
    .order("submitted_at", { ascending: false });
  if (error) { document.getElementById("dashboard-valuations").innerHTML = "<p>We couldn't load the staff queue.</p>"; return; }

  const ids = (valuations || []).map(v => v.id);
  const { data: items } = ids.length ? await auth.supabase.from("quote_items").select("id,valuation_id,item_name,item_status").in("valuation_id", ids) : { data: [] };
  const itemIds = (items || []).map(i => i.id);
  const { data: offers } = itemIds.length ? await auth.supabase.from("quote_offers").select("id,item_id,offer_type,amount,status").in("item_id", itemIds) : { data: [] };

  const rows = (valuations || []).slice(0, 10).map(v => {
    const item = (items || []).find(i => i.valuation_id === v.id);
    const itemOffers = (offers || []).filter(o => o.item_id === item?.id);
    const published = itemOffers.filter(o => ["published", "accepted", "refused"].includes(o.status));
    const status = published.length ? published[0].status : (v.status || "submitted");
    return `<article class="valuation-card"><div><span class="valuation-ref">${esc(v.quote_reference)}</span><p class="section-kicker">${esc(String(status).replaceAll("_", " "))}</p><h3>${esc(v.model || "Equipment submission")}</h3><p>${esc(v.manufacturer || "")}${v.package ? " — " + esc(v.package) : ""}</p></div><div class="valuation-meta"><strong>${v.quote_amount == null ? "Awaiting valuation" : money(v.quote_amount)}</strong><small>${v.submitted_at ? new Date(v.submitted_at).toLocaleString("en-GB") : ""}</small></div></article>`;
  }).join("");
  document.getElementById("dashboard-valuations").innerHTML = rows || "<p>No valuations have been submitted yet.</p>";

  const accepted = (offers || []).filter(o => o.status === "accepted");
  document.getElementById("dashboard-sales").innerHTML = accepted.length
    ? `<p><strong>${accepted.length}</strong> accepted offer${accepted.length === 1 ? "" : "s"} currently recorded.</p>`
    : "<p>No accepted offers yet.</p>";
});
