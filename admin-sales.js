document.addEventListener("DOMContentLoaded", async () => {
  const box = document.getElementById("sales-list"), msg = document.getElementById("admin-sales-message"), auth = window.actionBuyerAuth;
  if (!auth) return;
  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=admin-sales.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = "<p>You do not have permission to access sales.</p>"; return; }

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const notice = (t, ok = true) => { msg.textContent = t; msg.className = "form-message " + (ok ? "success" : "error"); };
  const setting = { inboundLabel: "", inboundQr: "", returnLabel: "", returnQr: "" };

  async function loadSettings() {
    const { data } = await auth.supabase.from("shipping_settings").select("inbound_label_url,inbound_qr_code_url,return_label_url,return_qr_code_url").eq("id", true).maybeSingle();
    if (!data) return;
    setting.inboundLabel = data.inbound_label_url || ""; setting.inboundQr = data.inbound_qr_code_url || "";
    setting.returnLabel = data.return_label_url || ""; setting.returnQr = data.return_qr_code_url || "";
    document.getElementById("setting-inbound-label").value = setting.inboundLabel;
    document.getElementById("setting-inbound-qr").value = setting.inboundQr;
    document.getElementById("setting-return-label").value = setting.returnLabel;
    document.getElementById("setting-return-qr").value = setting.returnQr;
  }

  document.getElementById("save-shipping-settings")?.addEventListener("click", async () => {
    const button = document.getElementById("save-shipping-settings");
    const status = document.getElementById("shipping-settings-message");
    button.disabled = true;
    const payload = {
      id: true,
      inbound_label_url: document.getElementById("setting-inbound-label").value.trim() || null,
      inbound_qr_code_url: document.getElementById("setting-inbound-qr").value.trim() || null,
      return_label_url: document.getElementById("setting-return-label").value.trim() || null,
      return_qr_code_url: document.getElementById("setting-return-qr").value.trim() || null,
      updated_by: session.user.id,
      updated_at: new Date().toISOString()
    };
    const { error } = await auth.supabase.from("shipping_settings").upsert(payload, { onConflict: "id" });
    button.disabled = false;
    status.textContent = error ? (error.message || "Could not save shipping settings.") : "Shipping settings saved.";
    status.className = "form-message " + (error ? "error" : "success");
    if (!error) await loadSettings();
  });

  async function emailShipment(shipmentId) {
    try {
      const { data, error } = await auth.supabase.functions.invoke("send-shipping-email", { body: { shipment_id: shipmentId } });
      if (error || data?.error) return { ok: false, message: data?.error || error?.message || "Email could not be sent." };
      return { ok: true };
    } catch (error) { return { ok: false, message: error?.message || "Email could not be sent." }; }
  }

  async function load() {
    const { data: sales, error } = await auth.supabase.from("sales").select("id,sale_reference,status,total_amount,user_id,created_at,accepted_at").order("created_at", { ascending: false });
    if (error) { box.innerHTML = "<p>Could not load sales.</p>"; return; }
    if (!sales?.length) { box.innerHTML = "<p>No accepted sales yet.</p>"; return; }
    const ids = sales.map(s => s.id);
    const { data: items } = await auth.supabase.from("sale_items").select("id,sale_id,quote_item_id,accepted_offer_id,amount").in("sale_id", ids);
    const qids = (items || []).map(i => i.quote_item_id);
    const { data: qitems } = qids.length ? await auth.supabase.from("quote_items").select("id,model,manufacturer,item_name,valuation_id").in("id", qids) : { data: [] };
    const { data: shipments } = await auth.supabase.from("shipments").select("id,sale_id,shipment_type,status,carrier,tracking_number,parcel_count,label_count,label_urls,qr_code_urls,quote_item_ids,notes,shipped_at,delivered_at,created_at").in("sale_id", ids).order("created_at", { ascending: false });

    box.innerHTML = sales.map(s => {
      const si = (items || []).filter(i => i.sale_id === s.id), sh = (shipments || []).filter(x => x.sale_id === s.id);
      const canReceive = ["collecting_items", "ready_for_shipping", "shipping"].includes(s.status);
      return `<article class="valuation-card"><div><a class="valuation-ref" href="admin-sale.html?id=${encodeURIComponent(s.id)}" style="text-decoration:underline;">${esc(s.sale_reference)}</a><p class="section-kicker">${esc(s.status.replaceAll("_", " "))}</p><h3>${money(s.total_amount)}</h3><p>${si.map(i => { const q = (qitems || []).find(x => x.id === i.quote_item_id); return esc(q?.model || q?.item_name || "Item") + " — " + money(i.amount); }).join("<br>")}</p><a class="btn btn-primary" href="admin-sale.html?id=${encodeURIComponent(s.id)}">VIEW FULL SALE</a></div><div class="valuation-meta"><h4>Shipments</h4>${sh.length ? sh.map(x => `<p><strong>${esc(x.shipment_type === "inbound" ? "CUSTOMER → US" : "US → CUSTOMER")}</strong> — ${esc(x.status)} — ${esc(x.label_count)} label(s), ${esc(x.parcel_count)} parcel(s)${x.tracking_number ? ` — ${esc(x.tracking_number)}` : ""}${x.shipped_at ? ` — Posted ${new Date(x.shipped_at).toLocaleDateString("en-GB")}` : ""}</p>`).join("") : "<p>No shipment created yet.</p>"}${canReceive ? `<button class="btn btn-primary mark-received" data-sale="${esc(s.id)}" type="button">ITEM RECEIVED</button>` : (["received", "inspection", "payment_due", "paid", "completed"].includes(s.status) ? `<p class="status-badge">ITEM RECEIVED</p>` : "")}<div class="navigation-buttons"><button class="btn btn-primary new-shipment" data-sale="${s.id}" data-type="inbound">CUSTOMER → US</button><button class="btn btn-secondary new-shipment" data-sale="${s.id}" data-type="return">US → CUSTOMER</button></div><div class="shipment-form" id="shipment-${s.id}" hidden><label>Labels <select class="label-count"><option value="1">1 label</option><option value="2">2 labels</option><option value="3">3 labels</option><option value="4">4 labels</option><option value="5">5 labels</option></select></label><label>Parcels <input class="parcel-count" type="number" min="1" value="1"></label><label>Carrier <input class="carrier" type="text"></label><label>Tracking number <input class="tracking" type="text"></label><label>Date posted <input class="posted-date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Label URL(s), one per line <textarea class="label-urls" rows="3"></textarea></label><label>QR code URL(s), one per line <textarea class="qr-urls" rows="3"></textarea></label><label>Notes <textarea class="notes" rows="2"></textarea></label><button class="btn btn-primary save-shipment" data-sale="${s.id}">SAVE SHIPMENT &amp; EMAIL CUSTOMER</button></div></div></article>`;
    }).join("");

    box.querySelectorAll(".mark-received").forEach(b => b.onclick = async () => {
      if (!confirm("Confirm that the customer's item(s) have been received? This will update the sale and email the customer.")) return;
      b.disabled = true;
      const { data, error } = await auth.supabase.functions.invoke("mark-item-received", { body: { sale_id: b.dataset.sale } });
      if (error || data?.error) { b.disabled = false; notice(data?.error || error?.message || "Could not mark item received.", false); return; }
      notice(data?.email_sent ? "Item marked received and customer email sent." : "Item marked received; customer email was not sent.", !data?.email_error); await load();
    });

    box.querySelectorAll(".new-shipment").forEach(b => b.onclick = () => {
      const f = document.getElementById("shipment-" + b.dataset.sale); f.hidden = false; f.dataset.type = b.dataset.type;
      const inbound = b.dataset.type === "inbound";
      f.querySelector(".label-urls").value = inbound ? setting.inboundLabel : setting.returnLabel;
      f.querySelector(".qr-urls").value = inbound ? setting.inboundQr : setting.returnQr;
    });

    box.querySelectorAll(".save-shipment").forEach(b => b.onclick = async () => {
      const f = document.getElementById("shipment-" + b.dataset.sale), sale = sales.find(x => x.id === b.dataset.sale), type = f.dataset.type;
      const labelCount = Number(f.querySelector(".label-count").value), parcelCount = Number(f.querySelector(".parcel-count").value);
      const urls = f.querySelector(".label-urls").value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      const qrUrls = f.querySelector(".qr-urls").value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      const quoteItemIds = (items || []).filter(i => i.sale_id === sale.id).map(i => i.quote_item_id);
      if (labelCount < 1 || parcelCount < 1) { notice("Labels and parcels must be at least 1.", false); return; }
      b.disabled = true;
      const postedDate = f.querySelector(".posted-date").value;
      const shippedAt = postedDate ? new Date(postedDate + "T12:00:00").toISOString() : null;
      const { data: shipment, error } = await auth.supabase.from("shipments").insert({ sale_id: sale.id, user_id: sale.user_id, shipment_type: type, status: "label_created", carrier: f.querySelector(".carrier").value.trim() || null, tracking_number: f.querySelector(".tracking").value.trim() || null, shipped_at: shippedAt, parcel_count: parcelCount, label_count: labelCount, label_urls: urls, qr_code_urls: qrUrls, quote_item_ids: quoteItemIds, notes: f.querySelector(".notes").value.trim() || null }).select("id").single();
      b.disabled = false;
      if (error) { notice(error.message || "Shipment could not be saved.", false); return; }
      const email = await emailShipment(shipment.id);
      notice(email.ok ? "Shipment saved and customer emailed with the label / QR code." : `Shipment saved, but customer email could not be sent: ${email.message}`, email.ok);
      await load();
    });
  }

  await loadSettings();
  await load();
});
