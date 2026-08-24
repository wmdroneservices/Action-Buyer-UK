document.addEventListener("DOMContentLoaded", async () => {
  const box = document.getElementById("sales-list"), msg = document.getElementById("admin-sales-message"), auth = window.actionBuyerAuth;
  if (!box || !auth) return;
  const session = await auth.getSession();
  if (!session) { location.href = "login.html?return=admin-sales.html"; return; }
  const { data: staff } = await auth.supabase.from("staff_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff) { box.innerHTML = "<p>You do not have permission to access sales.</p>"; return; }

  const params = new URLSearchParams(location.search);
  const archiveView = params.get("archive") === "1";
  const returnedView = params.get("returned") === "1";
  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(n || 0));
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const notice = (t, ok = true) => { msg.textContent = t; msg.className = "form-message " + (ok ? "success" : "error"); };
  const setting = { inboundLabel: "", inboundQr: "", returnLabel: "", returnQr: "" };
  const viewTitle = () => returnedView ? "Returned Items" : archiveView ? "Sales Archive" : "Sales & Shipping";

  async function loadSettings() {
    const { data } = await auth.supabase.from("shipping_settings").select("inbound_label_url,inbound_qr_code_url,return_label_url,return_qr_code_url").eq("id", true).maybeSingle();
    if (!data) return;
    setting.inboundLabel = data.inbound_label_url || ""; setting.inboundQr = data.inbound_qr_code_url || "";
    setting.returnLabel = data.return_label_url || ""; setting.returnQr = data.return_qr_code_url || "";
    const values = { "setting-inbound-label": setting.inboundLabel, "setting-inbound-qr": setting.inboundQr, "setting-return-label": setting.returnLabel, "setting-return-qr": setting.returnQr };
    Object.entries(values).forEach(([id,value]) => { const el=document.getElementById(id); if(el) el.value=value; });
  }

  document.getElementById("save-shipping-settings")?.addEventListener("click", async () => {
    const button=document.getElementById("save-shipping-settings"), status=document.getElementById("shipping-settings-message"); button.disabled=true;
    const payload={id:true,inbound_label_url:document.getElementById("setting-inbound-label").value.trim()||null,inbound_qr_code_url:document.getElementById("setting-inbound-qr").value.trim()||null,return_label_url:document.getElementById("setting-return-label").value.trim()||null,return_qr_code_url:document.getElementById("setting-return-qr").value.trim()||null,updated_by:session.user.id,updated_at:new Date().toISOString()};
    const {error}=await auth.supabase.from("shipping_settings").upsert(payload,{onConflict:"id"}); button.disabled=false; status.textContent=error?(error.message||"Could not save shipping settings."):"Shipping settings saved."; status.className="form-message "+(error?"error":"success"); if(!error) await loadSettings();
  });

  async function emailShipment(shipmentId) { try { const {data,error}=await auth.supabase.functions.invoke("send-shipping-email",{body:{shipment_id:shipmentId}}); if(error||data?.error)return{ok:false,message:data?.error||error?.message||"Email could not be sent."}; return{ok:true}; } catch(error){return{ok:false,message:error?.message||"Email could not be sent."};} }

  async function saleAction(action,saleId,reference,folder) {
    if(action==="delete"){
      if(!confirm(`PERMANENTLY DELETE sale ${reference}? This removes the sale and linked sale records. This cannot be undone.`))return;
      const {error}=await auth.supabase.rpc("staff_delete_sale",{p_sale_id:saleId}); if(error){notice(error.message||"The sale could not be deleted.",false);return;} notice(`Sale ${reference} has been permanently deleted.`);
    } else if(action==="archive"){
      const label=folder==="returned"?"Returned Items":"Sales Archive";
      if(!confirm(`Move sale ${reference} to ${label}? It will disappear from the active Sales & Shipping list but remain available in ${label}.`))return;
      const {error}=await auth.supabase.rpc("staff_archive_sale",{p_sale_id:saleId,p_folder:folder}); if(error){notice(error.message||"The sale could not be archived.",false);return;} notice(`Sale ${reference} moved to ${label}.`);
    } else if(action==="restore"){
      if(!confirm(`Restore sale ${reference} to active Sales & Shipping?`))return;
      const {error}=await auth.supabase.rpc("staff_restore_sale",{p_sale_id:saleId}); if(error){notice(error.message||"The sale could not be restored.",false);return;} notice(`Sale ${reference} restored to active Sales & Shipping.`);
    }
    await load();
  }

  async function load() {
    const query=auth.supabase.from("sales").select("id,sale_reference,status,total_amount,user_id,created_at,accepted_at,bank_details_confirmed_at,archived_at,archive_folder").order(archiveView||returnedView?"archived_at":"created_at",{ascending:false});
    if(archiveView||returnedView)query.not("archived_at","is",null);else query.is("archived_at",null);
    if(returnedView)query.eq("archive_folder","returned");else if(archiveView)query.eq("archive_folder","sales");
    const {data:sales,error}=await query;
    if(error){box.innerHTML="<p>Could not load sales.</p>";return;}
    if(!sales?.length){box.innerHTML=`<div class="empty-account"><h3>${esc(viewTitle())}</h3><p>${returnedView?"No returned sales have been filed yet.":archiveView?"No completed sales have been archived yet.":"No active sales yet."}</p></div>`;return;}
    const ids=sales.map(s=>s.id);
    const {data:items}=await auth.supabase.from("sale_items").select("id,sale_id,quote_item_id,accepted_offer_id,amount").in("sale_id",ids);
    const qids=(items||[]).map(i=>i.quote_item_id);
    const {data:qitems}=qids.length?await auth.supabase.from("quote_items").select("id,model,manufacturer,item_name,valuation_id").in("id",qids):{data:[]};
    const {data:shipments}=await auth.supabase.from("shipments").select("id,sale_id,shipment_type,status,carrier,tracking_number,parcel_count,label_count,label_urls,qr_code_urls,quote_item_ids,notes,shipped_at,delivered_at,created_at").in("sale_id",ids).order("created_at",{ascending:false});

    const paymentDueSales=!archiveView&&!returnedView?sales.filter(s=>{const received=["received","inspection","payment_due"].includes(String(s.status||""));const unpaid=!["paid","completed","cancelled"].includes(String(s.status||""));return received&&unpaid&&(String(s.status||"")==="payment_due"||Boolean(s.bank_details_confirmed_at));}):[];
    const paymentDueBanner=paymentDueSales.length?`<div class="payment-due-alert" style="margin-bottom:1.25rem;padding:14px 16px;border-left:5px solid #c94b2c;background:#fff3ee;color:#8f321f;font-weight:700;border-radius:4px;">ACTION REQUIRED: ${paymentDueSales.length===1?"1 customer has accepted their offer and is due payment.":`${paymentDueSales.length} customers have accepted their offers and are due payment.`}</div>`:"";

    box.innerHTML=paymentDueBanner+sales.map(s=>{
      const si=(items||[]).filter(i=>i.sale_id===s.id),sh=(shipments||[]).filter(x=>x.sale_id===s.id);
      const canReceive=!archiveView&&!returnedView&&["collecting_items","ready_for_shipping","shipping"].includes(s.status);
      const inboundShipment=sh.find(x=>x.shipment_type==="inbound");
      const labelRequired=!archiveView&&!returnedView&&Boolean(s.bank_details_confirmed_at)&&!inboundShipment&&!["paid","completed","cancelled"].includes(s.status);
      const shippingAction=labelRequired?`<div class="shipping-next-step" style="margin:12px 0;padding:10px 12px;border-left:4px solid #c94b2c;background:#fff7f3;font-weight:700;color:#8f321f;">NEXT STEP: CREATE CUSTOMER → US SHIPPING LABEL</div>`:"";
      const saleReceived=["received","inspection","payment_due"].includes(String(s.status||""));
      const unpaid=!["paid","completed","cancelled"].includes(String(s.status||""));
      const paymentDue=!archiveView&&!returnedView&&saleReceived&&unpaid&&(String(s.status||"")==="payment_due"||Boolean(s.bank_details_confirmed_at));
      const paymentAction=paymentDue?`<div class="payment-due-alert" style="margin:12px 0;padding:10px 12px;border-left:4px solid #c94b2c;background:#fff3ee;font-weight:700;color:#8f321f;">PAYMENT DUE: CUSTOMER HAS ACCEPTED THE OFFER — PAY ${money(s.total_amount)}</div>`:"";
      const actions=archiveView||returnedView?`<button class="btn btn-secondary sale-action" data-action="restore" data-id="${esc(s.id)}" data-reference="${esc(s.sale_reference)}">RESTORE</button><button class="btn quote-delete sale-action" data-action="delete" data-id="${esc(s.id)}" data-reference="${esc(s.sale_reference)}">DELETE</button>`:`<button class="btn btn-secondary sale-action" data-action="archive" data-folder="sales" data-id="${esc(s.id)}" data-reference="${esc(s.sale_reference)}">ARCHIVE SALE</button><button class="btn btn-secondary sale-action" data-action="archive" data-folder="returned" data-id="${esc(s.id)}" data-reference="${esc(s.sale_reference)}">MOVE TO RETURNED</button><button class="btn quote-delete sale-action" data-action="delete" data-id="${esc(s.id)}" data-reference="${esc(s.sale_reference)}">DELETE</button>`;
      const shipmentHtml=sh.length?sh.map(x=>`<p><strong>${esc(x.shipment_type==="inbound"?"CUSTOMER → US":"US → CUSTOMER")}</strong> — ${esc(x.status)} — ${esc(x.label_count)} label(s), ${esc(x.parcel_count)} parcel(s)${x.tracking_number?` — ${esc(x.tracking_number)}`:""}${x.shipped_at?` — Posted ${new Date(x.shipped_at).toLocaleDateString("en-GB")}`:""}</p>`).join(""):"<p>No shipment created yet.</p>";
      const shipmentControls=archiveView||returnedView?"":`${canReceive?`<button class="btn btn-primary mark-received" data-sale="${esc(s.id)}" type="button">ITEM RECEIVED</button>`:(["received","inspection","payment_due","paid","completed"].includes(s.status)?`<p class="status-badge">ITEM RECEIVED</p>`:"")}<div class="navigation-buttons"><button class="btn btn-primary new-shipment" data-sale="${esc(s.id)}" data-type="inbound">CUSTOMER → US</button><button class="btn btn-secondary new-shipment" data-sale="${esc(s.id)}" data-type="return">US → CUSTOMER</button></div><div class="shipment-form" id="shipment-${esc(s.id)}" hidden><label>Labels <select class="label-count"><option value="1">1 label</option><option value="2">2 labels</option><option value="3">3 labels</option><option value="4">4 labels</option><option value="5">5 labels</option></select></label><label>Parcels <input class="parcel-count" type="number" min="1" value="1"></label><label>Carrier <input class="carrier" type="text"></label><label>Tracking number <input class="tracking" type="text"></label><label>Date posted <input class="posted-date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Label URL(s), one per line <textarea class="label-urls" rows="3"></textarea></label><label>QR code URL(s), one per line <textarea class="qr-urls" rows="3"></textarea></label><label>Notes <textarea class="notes" rows="2"></textarea></label><button class="btn btn-primary save-shipment" data-sale="${esc(s.id)}">SAVE SHIPMENT &amp; EMAIL CUSTOMER</button></div>`;
      return `<article class="valuation-card"><div><a class="valuation-ref" href="admin-sale.html?id=${encodeURIComponent(s.id)}" style="text-decoration:underline;">${esc(s.sale_reference)}</a><p class="section-kicker">${esc(String(s.status||"").replaceAll("_"," "))}${s.archive_folder?` · ${esc(s.archive_folder==="returned"?"RETURNED":"SALES ARCHIVE")}`:""}</p><h3>${money(s.total_amount)}</h3><p>${si.map(i=>{const q=(qitems||[]).find(x=>x.id===i.quote_item_id);return esc(q?.model||q?.item_name||"Item")+" — "+money(i.amount);}).join("<br>")}</p><a class="btn btn-primary" href="admin-sale.html?id=${encodeURIComponent(s.id)}">VIEW FULL SALE</a></div><div class="valuation-meta"><h4>Shipments</h4>${shippingAction}${paymentAction}${shipmentHtml}${shipmentControls}<div style="display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;margin-top:1rem;">${actions}</div></div></article>`;
    }).join("");

    box.querySelectorAll(".sale-action").forEach(b=>b.onclick=()=>saleAction(b.dataset.action,b.dataset.id,b.dataset.reference,b.dataset.folder));
    if(archiveView||returnedView)return;
    box.querySelectorAll(".mark-received").forEach(b=>b.onclick=async()=>{if(!confirm("Confirm that the customer's item(s) have been received? This will update the sale and email the customer."))return;b.disabled=true;const{data,error}=await auth.supabase.functions.invoke("mark-item-received",{body:{sale_id:b.dataset.sale}});if(error||data?.error){b.disabled=false;notice(data?.error||error?.message||"Could not mark item received.",false);return;}notice(data?.email_sent?"Item marked received and customer email sent.":"Item marked received; customer email was not sent.",!data?.email_error);await load();});
    box.querySelectorAll(".new-shipment").forEach(b=>b.onclick=()=>{const f=document.getElementById("shipment-"+b.dataset.sale);f.hidden=false;f.dataset.type=b.dataset.type;const inbound=b.dataset.type==="inbound";f.querySelector(".label-urls").value=inbound?setting.inboundLabel:setting.returnLabel;f.querySelector(".qr-urls").value=inbound?setting.inboundQr:setting.returnQr;});
box.querySelectorAll(".save-shipment").forEach(b=>b.onclick=async()=>{

  const f = document.getElementById("shipment-" + b.dataset.sale);
  const sale = sales.find(x => x.id === b.dataset.sale);
  const type = f.dataset.type;

  const labelCount = Number(f.querySelector(".label-count").value);
  const parcelCount = Number(f.querySelector(".parcel-count").value);

  const urls = f.querySelector(".label-urls").value
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  const qrUrls = f.querySelector(".qr-urls").value
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  const quoteItemIds = (items || [])
    .filter(i => i.sale_id === sale.id)
    .map(i => i.quote_item_id);

  if (labelCount < 1 || parcelCount < 1) {
    notice("Labels and parcels must be at least 1.", false);
    return;
  }

  b.disabled = true;

  const postedDate = f.querySelector(".posted-date").value;

  const shippedAt = type === "return"
    ? null
    : (postedDate ? new Date(postedDate + "T12:00:00").toISOString() : null);

  const shipmentData = {
    sale_id: sale.id,
    user_id: sale.user_id,
    shipment_type: type,
    status: "label_created",
    carrier: f.querySelector(".carrier").value.trim() || null,
    tracking_number: f.querySelector(".tracking").value.trim() || null,
    shipped_at: shippedAt,
    parcel_count: parcelCount,
    label_count: labelCount,
    label_urls: urls,
    qr_code_urls: qrUrls,
    quote_item_ids: quoteItemIds,
    notes: f.querySelector(".notes").value.trim() || null
  };

  const { data: existingShipment } = await auth.supabase
    .from("shipments")
    .select("id")
    .eq("sale_id", sale.id)
    .eq("shipment_type", type)
    .maybeSingle();

  let shipment;
  let error;

  if (existingShipment) {

    ({ data: shipment, error } = await auth.supabase
      .from("shipments")
      .update(shipmentData)
      .eq("id", existingShipment.id)
      .select("id")
      .single());

  } else {

    ({ data: shipment, error } = await auth.supabase
      .from("shipments")
      .insert(shipmentData)
      .select("id")
      .single());

  }

  b.disabled = false;

  if (error) {
    notice(error.message || "Shipment could not be saved.", false);
    return;
  }

  const email = await emailShipment(shipment.id);

  notice(
    email.ok
      ? "Shipment saved and customer emailed with the label / QR code."
      : `Shipment saved, but customer email could not be sent: ${email.message}`,
    email.ok
  );

  await load();

});  }

  const nav=document.getElementById("sales-view-nav");
  if(nav)nav.innerHTML=`<a class="btn ${!archiveView&&!returnedView?"btn-primary":"btn-secondary"}" href="admin-sales.html">ACTIVE SALES</a><a class="btn ${archiveView?"btn-primary":"btn-secondary"}" href="admin-sales.html?archive=1">SALES ARCHIVE</a><a class="btn ${returnedView?"btn-primary":"btn-secondary"}" href="admin-sales.html?returned=1">RETURNED</a><button class="btn btn-secondary" id="refresh-sales" type="button">REFRESH</button>`;
  document.getElementById("refresh-sales")?.addEventListener("click",load);
  document.title=viewTitle()+" | GearCashOut";
  await loadSettings(); await load();
});
