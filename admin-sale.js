document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const box = document.getElementById("sale-details");
  const message = document.getElementById("admin-sale-message");
  const saleId = new URLSearchParams(window.location.search).get("id");

  if (!auth) return;
  const session = await auth.getSession();
  if (!session) {
    location.href = "login.html?return=" + encodeURIComponent(location.pathname + location.search);
    return;
  }

  const { data: staff } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!staff) {
    box.innerHTML = "<p>You do not have permission to access sale records.</p>";
    return;
  }

  if (!saleId) {
    box.innerHTML = "<p>No sale was specified.</p>";
    return;
  }

  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
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
  const date = v => v ? new Date(v).toLocaleDateString("en-GB") : "—";
  const dateTime = v => v ? new Date(v).toLocaleString("en-GB") : "—";
  const safeUrl = v => /^https?:\/\//i.test(String(v || "")) ? String(v) : "";
  const linkButtons = (values, label) => (Array.isArray(values) ? values : [])
    .map((url, i) => {
      const safe = safeUrl(url);
      return safe ? `<a class="btn btn-secondary" href="${esc(safe)}" target="_blank" rel="noopener">${esc(label)} ${i + 1}</a>` : "";
    }).join(" ");

  const first = (obj, keys, fallback = "") => {
    for (const key of keys) {
      const value = obj?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return fallback;
  };

  const displayValue = value => {
    if (value === undefined || value === null || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  function field(label, value) {
    return `<div><strong>${esc(label)}</strong><p>${esc(displayValue(value))}</p></div>`;
  }

  function photoHtml(photos) {
    const urls = (Array.isArray(photos) ? photos : [])
      .filter(p => typeof p === "string" || p?.url || p?.path)
      .map(p => typeof p === "string" ? p : (p.url || p.path));
    return urls.length
      ? `<div class="admin-photo-grid">${urls.map((url, i) => `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="Customer photograph ${i + 1}" loading="lazy"></a>`).join("")}</div>`
      : "<p>No photographs stored against this quote.</p>";
  }

  function milestone(done, title, text) {
    return `<div style="display:grid;grid-template-columns:28px 1fr;gap:.75rem;align-items:start;margin:.75rem 0;">
      <span class="status-badge" style="padding:.35rem .45rem;text-align:center;">${done ? "✓" : "•"}</span>
      <div><strong>${esc(title)}</strong><p style="margin:.2rem 0 0;">${esc(text)}</p></div>
    </div>`;
  }

  function getBank(sale) {
    const nested = sale.bank_details || sale.bankDetails || sale.payment_details || sale.paymentDetails || {};
    return {
      accountName: first(sale, ["bank_account_name", "account_name", "account_holder_name", "bank_name_on_account"], first(nested, ["account_name", "accountName", "account_holder_name"])),
      sortCode: first(sale, ["bank_sort_code", "sort_code", "sortCode"], first(nested, ["sort_code", "sortCode"])),
      accountNumber: first(sale, ["bank_account_number", "account_number", "accountNumber"], first(nested, ["account_number", "accountNumber"])),
      status: first(sale, ["payment_status", "bank_details_status", "bankDetailsStatus"], first(nested, ["status"]))
    };
  }

  function getPayment(sale) {
    const nested = sale.payment || sale.payment_details || sale.paymentDetails || {};
    return {
      status: first(sale, ["payment_status", "paymentStatus"], first(nested, ["status"])),
      reference: first(sale, ["payment_reference", "paymentReference", "bank_payment_reference"], first(nested, ["reference", "payment_reference"])),
      sentAt: first(sale, ["payment_sent_at", "paymentSentAt", "paid_at", "payment_date"], first(nested, ["sent_at", "sentAt", "paid_at", "payment_date"])),
      notes: first(sale, ["payment_notes", "paymentNotes"], first(nested, ["notes"]))
    };
  }

  async function markPaymentSent() {
    if (!confirm("Confirm that the payment has been sent to the customer's bank account? This will update the customer's order to Payment received.")) return;
    const reference = prompt("Optional bank payment reference:", "") || null;
    const now = new Date().toISOString();
    const { error } = await auth.supabase.from("sales").update({
      status: "paid",
      payment_status: "paid",
      payment_sent_at: now,
      payment_reference: reference,
      updated_at: now
    }).eq("id", saleId);
    if (error) {
      message.textContent = error.message || "Payment could not be recorded.";
      message.className = "form-message error";
      return;
    }
    message.textContent = "Payment marked as sent. The customer's order now shows Payment received.";
    message.className = "form-message success";
    await load();
  }

  async function markReturnShipped() {
    if (!confirm("Confirm that the item has been shipped back to the customer? This will update the customer's order to Return shipped.")) return;
    const now = new Date().toISOString();
    const returnShipment = await auth.supabase.from("shipments")
      .select("id,status,shipped_at")
      .eq("sale_id", saleId)
      .eq("shipment_type", "return")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (returnShipment.error) {
      message.textContent = returnShipment.error.message || "Could not find the return shipment.";
      message.className = "form-message error";
      return;
    }
    if (!returnShipment.data) {
      message.textContent = "Create the US → CUSTOMER return shipment first, then mark it as shipped.";
      message.className = "form-message error";
      return;
    }

    const { error: shipmentError } = await auth.supabase.from("shipments").update({
      status: "in_transit",
      shipped_at: returnShipment.data.shipped_at || now
    }).eq("id", returnShipment.data.id);
    if (shipmentError) {
      message.textContent = shipmentError.message || "Return shipment could not be updated.";
      message.className = "form-message error";
      return;
    }

    const { error } = await auth.supabase.from("sales").update({
      status: "return_shipped",
      updated_at: now
    }).eq("id", saleId);
    if (error) {
      message.textContent = error.message || "Return status could not be recorded.";
      message.className = "form-message error";
      return;
    }
    message.textContent = "Return marked as shipped. The customer's order now shows Return shipped.";
    message.className = "form-message success";
    await load();
  }

  async function load() {
    const { data: sale, error: saleError } = await auth.supabase
      .from("sales")
      .select("*")
      .eq("id", saleId)
      .maybeSingle();

    if (saleError || !sale) {
      box.innerHTML = `<p>We couldn't load this sale.</p><small>${esc(saleError?.message || "Sale not found")}</small>`;
      return;
    }

    const { data: saleItems } = await auth.supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", saleId)
      .order("created_at", { ascending: true });

    const quoteItemIds = (saleItems || []).map(i => i.quote_item_id).filter(Boolean);
    const { data: quoteItems } = quoteItemIds.length
      ? await auth.supabase.from("quote_items").select("*").in("id", quoteItemIds).order("created_at", { ascending: true })
      : { data: [] };

    const valuationIds = [...new Set((quoteItems || []).map(i => i.valuation_id).filter(Boolean))];
    const { data: valuations } = valuationIds.length
      ? await auth.supabase.from("valuations").select("*").in("id", valuationIds)
      : { data: [] };

    const itemIds = (quoteItems || []).map(i => i.id).filter(Boolean);
    const { data: offers } = itemIds.length
      ? await auth.supabase.from("quote_offers").select("*").in("item_id", itemIds).order("created_at", { ascending: false })
      : { data: [] };

    const { data: shipments } = await auth.supabase
      .from("shipments")
      .select("*")
      .eq("sale_id", saleId)
      .order("created_at", { ascending: false });

    const valuationById = new Map((valuations || []).map(v => [v.id, v]));
    const saleItemByQuoteId = new Map((saleItems || []).map(i => [i.quote_item_id, i]));
    const offerList = offers || [];
    const inbound = (shipments || []).filter(s => s.shipment_type === "inbound");
    const returns = (shipments || []).filter(s => s.shipment_type === "return");
    const latestInbound = inbound[0];
    const received = ["received", "inspection", "payment_due", "paid", "completed", "return_shipped"].includes(sale.status) || inbound.some(s => s.delivered_at || s.status === "delivered");
    const posted = inbound.some(s => s.shipped_at || ["in_transit", "delivered"].includes(s.status));
    const labelReady = inbound.some(s => s.status && s.status !== "awaiting_label" || (Array.isArray(s.label_urls) && s.label_urls.length));
    const bank = getBank(sale);
    const payment = getPayment(sale);
    const bankReceived = !!(bank.accountName || bank.sortCode || bank.accountNumber) || ["bank_details_received", "payment_processing", "paid", "completed"].includes(String(payment.status || ""));
    const paymentSent = ["paid", "payment_sent", "completed"].includes(String(payment.status || "")) || !!payment.sentAt;
    const returnSent = sale.status === "return_shipped" || returns.some(s => s.shipped_at || ["in_transit", "delivered"].includes(s.status));

    const primaryValuation = valuations?.[0];
    const primaryQuote = primaryValuation?.quote_data || {};
    const customerName = first(primaryValuation, ["quote_data"], {})?.fullName || first(sale, ["customer_name", "name"], "Customer");
    const customerEmail = primaryQuote.email || first(sale, ["customer_email", "email"], "");
    const customerPhone = primaryQuote.phone || first(sale, ["customer_phone", "phone"], "");
    const customerAddress = [primaryQuote.addressLine1, primaryQuote.addressLine2, primaryQuote.city, primaryQuote.county, primaryQuote.postcode].filter(Boolean).join(", ");

    document.getElementById("sale-title").textContent = sale.sale_reference || "Sale details";
    document.getElementById("sale-subtitle").textContent = `${pretty(sale.status || "sale")} · ${money(sale.total_amount)}`;

    const customerCard = `<section class="account-panel"><div class="section-heading"><p class="section-kicker">CUSTOMER</p><h2>${esc(customerName)}</h2><p>Customer and contact information carried forward from the original quote.</p></div><div class="valuation-card"><div style="width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;">${field("Email", customerEmail)}${field("Phone", customerPhone)}${field("Return address", customerAddress || primaryQuote.returnAddress || "No address recorded")}${field("Sale reference", sale.sale_reference)}${field("Sale created", dateTime(sale.created_at))}${field("Accepted", dateTime(sale.accepted_at || sale.updated_at))}</div></div></section>`;

    const timeline = `<section class="account-panel"><div class="section-heading"><p class="section-kicker">SALE PROGRESS</p><h2>Complete process</h2><p>This is the continuation of the original quote, from accepted offer through shipping, inspection, payment or return.</p></div>${milestone(true, "1. Offer accepted", dateTime(sale.accepted_at || sale.created_at))}${milestone(true, "2. Data confirmed", "The accepted quote and customer information are now part of this sale record.")}${milestone(labelReady, "3. Postage label ready", labelReady ? "A customer-to-GearCashOut label has been created and is attached below." : "Waiting for the postage label.")}${milestone(posted, "4. Item sent", posted ? `Customer shipment ${latestInbound?.tracking_number ? "tracking: " + latestInbound.tracking_number : "has been marked as posted"}.` : "Waiting for the customer to send the item.")}${milestone(received, "5. Item received", received ? "The item has been received by GearCashOut." : "Waiting for the item to arrive.")}${milestone(["inspection", "payment_due", "paid", "completed", "return_shipped"].includes(sale.status), "6. Inspection", ["inspection", "payment_due", "paid", "completed", "return_shipped"].includes(sale.status) ? "The received item is at or beyond inspection stage." : "Inspection will follow receipt.")}${milestone(["payment_due", "paid", "completed"].includes(sale.status), "7. Ready for payment", ["payment_due", "paid", "completed"].includes(sale.status) ? "The sale has reached the payment stage." : "Payment is not yet due.")}${milestone(bankReceived, "8. Customer bank details", bankReceived ? "Bank details have been supplied or recorded." : "Waiting for the customer's bank details.")}${milestone(paymentSent, "9. Payment sent", paymentSent ? `Payment recorded${payment.sentAt ? " on " + dateTime(payment.sentAt) : ""}${payment.reference ? " · Reference " + payment.reference : ""}.` : "Payment has not yet been recorded as sent.")}${milestone(returnSent, "10. Return sent to customer", returnSent ? "A GearCashOut → customer return shipment has been posted." : "No return shipment has been posted.")}${milestone(["paid", "completed", "return_shipped"].includes(sale.status), "11. Completed", ["paid", "completed", "return_shipped"].includes(sale.status) ? "Sale outcome recorded." : "Sale remains open.")}</section>`;

    const bankCard = `<section class="account-panel"><div class="section-heading"><p class="section-kicker">PAYMENT DETAILS</p><h2>Bank details &amp; payment</h2><p>Staff-only payment information recorded against this sale.</p></div><div class="valuation-card"><div style="width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;">${field("Bank detail status", bank.status || "Awaiting bank details")}${field("Account name", bank.accountName)}${field("Sort code", bank.sortCode)}${field("Account number", bank.accountNumber)}${field("Payment status", payment.status || "Not paid")}${field("Payment reference", payment.reference)}${field("Payment sent", payment.sentAt ? dateTime(payment.sentAt) : "Not recorded")}${field("Payment notes", payment.notes)}</div></div></section>`;

    const shippingCard = `<section class="account-panel"><div class="section-heading"><p class="section-kicker">SHIPPING</p><h2>Shipping &amp; tracking</h2><p>Customer-to-GearCashOut shipping, labels and any GearCashOut return shipment are all kept on this sale.</p></div>${(shipments || []).length ? (shipments || []).map(s => `<article class="valuation-card" style="margin-bottom:1rem;"><div style="width:100%;"><span class="valuation-ref">${esc(s.shipment_type === "inbound" ? "CUSTOMER → GEARCASHOUT" : "GEARCASHOUT → CUSTOMER")}</span><h3>${esc(pretty(s.status || "shipment"))}</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;">${field("Carrier", s.carrier)}${field("Tracking number", s.tracking_number)}${field("Posted", dateTime(s.shipped_at))}${field("Delivered", dateTime(s.delivered_at))}${field("Labels", s.label_count)}${field("Parcels", s.parcel_count)}${field("Created", dateTime(s.created_at))}</div><p style="margin-top:1rem;">${esc(s.notes || "")}</p><div class="navigation-buttons">${linkButtons(s.label_urls, s.shipment_type === "return" ? "RETURN LABEL" : "POSTAL LABEL")} ${linkButtons(s.qr_code_urls, "QR CODE")}</div></div></article>`).join("") : "<p>No shipment has been created yet.</p>"}</section>`;

    const quoteSections = (quoteItems || []).map(item => {
      const valuation = valuationById.get(item.valuation_id);
      const q = valuation?.quote_data || {};
      const saleItem = saleItemByQuoteId.get(item.id);
      const itemOffers = offerList.filter(o => o.item_id === item.id);
      const acceptedOffer = itemOffers.find(o => o.id === saleItem?.accepted_offer_id) || itemOffers.find(o => o.status === "accepted");
      const contents = q.packageContents && typeof q.packageContents === "object" ? Object.entries(q.packageContents).map(([k,v]) => `<li><strong>${esc(pretty(k))}:</strong> ${esc(displayValue(v))}</li>`).join("") : "<li>No package contents recorded.</li>";
      const batteries = Array.isArray(q.batteries) ? q.batteries.map((b,i) => `<li><strong>Battery ${i + 1}:</strong> ${esc(b.type || "Unknown")} · ${esc(b.cycles ?? "—")} cycles</li>`).join("") : "<li>No battery information recorded.</li>";
      const extras = Array.isArray(q.additionalAccessories) && q.additionalAccessories.length ? q.additionalAccessories.map(a => `<li>${esc(typeof a === "string" ? a : JSON.stringify(a))}</li>`).join("") : "<li>None recorded.</li>";
      return `<section class="account-panel"><div class="section-heading"><p class="section-kicker">ORIGINAL QUOTE · ${esc(valuation?.quote_reference || "")}</p><h2>${esc(q.modelName || item.model || item.item_name || "Equipment")}</h2><p>The original submission is preserved here so the sale page contains the same information as the quote review.</p></div><div class="valuation-card"><div style="width:100%;"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem;">${field("Manufacturer", valuation?.manufacturer || q.manufacturerName || item.manufacturer)}${field("Model", valuation?.model || q.modelName || item.model)}${field("Package", valuation?.package || q.packageName || item.package)}${field("Condition", valuation?.condition || q.condition)}${field("Flight time", q.flightHours || q.flightHoursRange)}${field("Damage", q.damage ? `${q.damage}${q.damageDescription ? " · " + q.damageDescription : ""}` : "—")}${field("Unbound", q.unbound)}${field("Legal right to sell", q.legalRight)}${field("Drone serial", q.droneSerial)}${field("Controller serial", q.controllerSerial)}${field("Offer amount", saleItem?.amount ?? acceptedOffer?.amount)}${field("Item status", item.item_status)}</div><hr><h3>Package contents</h3><ul>${contents}</ul><h3>Batteries</h3><ul>${batteries}</ul><h3>Additional accessories</h3><ul>${extras}</ul><h3>Photographs</h3>${photoHtml(q.photos)}</div></div><div class="valuation-card" style="margin-top:1rem;"><div style="width:100%;"><h3>Offer history</h3>${itemOffers.length ? itemOffers.map(o => `<p><strong>${esc(pretty(o.offer_type))}</strong>: ${money(o.amount)} — ${esc(pretty(o.status))}${o.responded_at ? " · Responded " + dateTime(o.responded_at) : ""}${o.customer_message ? " · " + esc(o.customer_message) : ""}</p>`).join("") : "<p>No offer history found.</p>"}<div class="navigation-buttons"><a class="btn btn-secondary" href="admin-quote.html?id=${encodeURIComponent(valuation?.id || "")}">VIEW ORIGINAL QUOTE</a></div></div></div></section>`;
    }).join("");

    const outcome = `<section class="account-panel"><div class="section-heading"><p class="section-kicker">FINAL OUTCOME</p><h2>Payment or return</h2><p>Use one of these actions when the sale reaches its final outcome. The customer's order is updated immediately.</p></div><div class="valuation-card"><div style="width:100%;display:grid;gap:1rem;">${paymentSent ? `<p><strong>Payment sent to bank account:</strong> ${esc(payment.reference || "Payment recorded")} ${payment.sentAt ? "· " + dateTime(payment.sentAt) : ""}</p>` : `<p><strong>Payment:</strong> Not yet recorded as sent.</p><button id="mark-payment-sent" class="btn btn-primary" type="button">PAYMENT SENT TO BANK ACCOUNT</button>`}${returnSent ? `<p><strong>Return shipped to customer:</strong> ${esc(returns.find(s => s.shipped_at || ["in_transit","delivered"].includes(s.status))?.tracking_number || "Return shipment posted")}</p>` : `<p><strong>Return:</strong> No return shipment marked as shipped.</p>${returns.length ? `<button id="mark-return-shipped" class="btn btn-secondary" type="button">RETURN SHIPPED TO CUSTOMER</button>` : "<p>Create the US → CUSTOMER return shipment above first.</p>"}`}</div></div></section>`;

    box.innerHTML = customerCard + timeline + quoteSections + shippingCard + bankCard + outcome;
    document.getElementById("mark-payment-sent")?.addEventListener("click", markPaymentSent);
    document.getElementById("mark-return-shipped")?.addEventListener("click", markReturnShipped);
  }

  await load();
});
