document.addEventListener("DOMContentLoaded", async () => {
  const auth=window.actionBuyerAuth; if(!auth)return;
  const session=await auth.getSession(); if(!session){location.href="login.html?return=admin-sales-dashboard.html";return;}
  const {data:staff}=await auth.supabase.from("staff_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(!staff){location.href="account.html";return;}
  const message=document.getElementById("staff-message");
  const notice=(text,ok=true)=>{if(message){message.textContent=text;message.className="form-message "+(ok?"success":"error");}};
  document.getElementById("staff-welcome").textContent=`Signed in as ${session.user.email}`;
  document.getElementById("staff-sign-out").addEventListener("click",async()=>{const b=document.getElementById("staff-sign-out");b.disabled=true;try{await auth.signOut();}catch(e){b.disabled=false;notice(e?.message||"Could not sign out.",false);}});
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const actionFor=state=>window.AssetStateMachine?.getNextAction(state)||{label:"ACTION REQUIRED",detail:"Review this item and determine its next workflow step.",tone:"warning"};
  const toneStyle=tone=>({action:"border:2px solid #b06b00;background:#fff8e8",warning:"border:2px solid #b42318;background:#fff5f5",success:"border:2px solid #18794e;background:#f1fbf5",info:"border:1px solid #b8c4d1;background:#f7f9fb"}[tone]||"border:1px solid #b8c4d1;background:#f7f9fb");
  const inventoryStates=["Received","Inspection Required","Testing","Repair Required","Ready for Resale"];
  const salesStates=["Sent to Sales","Listed","Reserved","Sold","Returned","Dispatched"];

  function setStepNotice(id, html, tone="info"){
    const el=document.getElementById(id); if(!el)return;
    el.innerHTML=`<div style="margin-top:.75rem;padding:.9rem 1rem;${toneStyle(tone)}"><strong>${html}</strong></div>`;
  }

  async function load(){
    const {data:assets,error}=await auth.supabase.from("inventory_assets").select("id,status,manufacturer,model,asset_reference,transaction_number").in("status",[...inventoryStates,...salesStates]).order("status_changed_at",{ascending:true});
    if(error){notice("Could not load Sales Dashboard counts.",false);return;}
    const rows=assets||[];
    const count=s=>rows.filter(a=>a.status===s).length;
    const inventoryRows=rows.filter(a=>inventoryStates.includes(a.status));
    const inventoryCount=inventoryRows.length;
    const sent=count("Sent to Sales");
    const listed=count("Listed");
    const reserved=count("Reserved");
    const sold=count("Sold");
    const returned=count("Returned");
    // Use the same pipeline state styling as Purchasing: green when clear,
    // orange when a stage has work waiting.
    const setPipelineCount=(id,value)=>{
      const n=Number(value)||0;
      const el=document.getElementById(id);
      if(el) el.textContent=n;
      const card=document.querySelector('[data-count-for="'+id+'"]');
      if(card){
        card.classList.toggle("has-action",n>0);
        card.classList.toggle("is-clear",n===0);
      }
    };
    setPipelineCount("inventory-count",inventoryCount);
    setPipelineCount("sent-count",sent);
    setPipelineCount("listed-count",listed);
    setPipelineCount("reserved-count",reserved);
    setPipelineCount("sold-count",sold);
    setPipelineCount("returned-count",returned);

    const {data:listings,error:le}=await auth.supabase.from("resale_listings").select("id,asset_id,status,sales_channel,listing_url");
    if(le){notice("Could not load sales listing counts.",false);return;}
    const listingRows=listings||[];
    const delistWarnings=listingRows.filter(x=>x.status==="Delist Required");
    const delistCount=delistWarnings.length;
    const urgent=document.getElementById("urgent-delist-actions");
    if(urgent){
      urgent.innerHTML=delistCount
        ? `<div style="border:3px solid #b42318;background:#fff1f1;border-radius:10px;padding:1rem 1.1rem;box-shadow:0 5px 16px rgba(180,35,24,.14)"><div style="font-size:.78rem;font-weight:900;letter-spacing:.12em;color:#b42318">URGENT SALES ACTION</div><div style="font-size:1.25rem;font-weight:900;color:#7f1d1d;margin:.25rem 0">${delistCount} MARKETPLACE LISTING${delistCount===1?"":"S"} MUST BE CLOSED</div><p style="margin:.25rem 0 .8rem;color:#5f1b18">A product has sold through another channel. Close the remaining marketplace listing${delistCount===1?"":"s"} immediately to prevent a duplicate sale.</p><a class="btn btn-primary" href="sold-items.html#delist-actions" style="background:#b42318;border-color:#b42318;color:#fff;font-weight:900;box-shadow:0 4px 10px rgba(180,35,24,.25)">CLOSE OTHER MARKETPLACE LISTINGS NOW</a></div>`
        : "";
    }

    const inspection=count("Received");
    const testing=count("Inspection Required");
    const testingInProgress=count("Testing");
    const repairs=count("Repair Required");
    const readyToSend=count("Ready for Resale");

    const inventoryParts=[];
    if(inspection) inventoryParts.push(`${inspection} READY FOR INSPECTION`);
    if(testing) inventoryParts.push(`${testing} READY FOR TESTING`);
    if(testingInProgress) inventoryParts.push(`${testingInProgress} TESTING IN PROGRESS`);
    if(repairs) inventoryParts.push(`${repairs} REPAIR REQUIRED`);
    if(readyToSend) inventoryParts.push(`${readyToSend} READY TO SEND TO PRE-SALE`);
    setStepNotice("inventory-step-notice", inventoryParts.length ? inventoryParts.join(" &nbsp;·&nbsp; ") : "NO INVENTORY ACTIONS CURRENTLY REQUIRED", inventoryParts.length ? (repairs ? "warning" : "action") : "success");

    setStepNotice("presale-step-notice", sent ? `${sent} ${sent===1?"PRODUCT":"PRODUCTS"} READY TO LIST FOR SALE — OPEN PRE-SALE` : "NO PRODUCTS CURRENTLY READY TO LIST", sent ? "action" : "success");

    const activeTotal=listed+reserved;
    const activeParts=[];
    if(listed) activeParts.push(`${listed} LISTED`);
    if(reserved) activeParts.push(`${reserved} RESERVED`);
    setStepNotice("active-step-notice", activeParts.length ? activeParts.join(" &nbsp;·&nbsp; ") : "NO ACTIVE LISTINGS CURRENTLY", activeTotal ? "info" : "success");

    const soldMessage=sold
      ? `${sold} ${sold===1?"SOLD PRODUCT":"SOLD PRODUCTS"}${delistCount ? ` — ${delistCount} MARKETPLACE LISTING${delistCount===1?"":"S"} REQUIRE CLOSURE` : " — CHECK DISPATCH / COMPLETION ACTIONS"}`
      : (delistCount ? `${delistCount} MARKETPLACE LISTING${delistCount===1?"":"S"} REQUIRE CLOSURE` : "NO SOLD PRODUCTS CURRENTLY");
    setStepNotice("sold-step-notice", soldMessage, delistCount ? "warning" : (sold ? "action" : "success"));
    const soldLink=document.getElementById("open-sold-items");
    if(soldLink) soldLink.href=delistCount ? "sold-items.html#delist-actions" : "sold-items.html";
    const returnsNotice=returned ? `${returned} ${returned===1?"RETURN":"RETURNS"} REQUIRE REVIEW` : "NO RETURNS CURRENTLY REQUIRING ACTION";
    setStepNotice("returns-step-notice", returnsNotice, returned ? "warning" : "success");

    const actionable=rows.filter(a=>["Received","Inspection Required","Testing","Repair Required","Ready for Resale","Sent to Sales","Sold","Returned","Dispatched"].includes(a.status));
    const summary=document.getElementById("sales-action-summary"), list=document.getElementById("sales-action-list");
    if(!summary||!list)return;
    const grouped={};
    actionable.forEach(a=>{const action=actionFor(a.status);if(!grouped[action.label])grouped[action.label]={action,items:[]};grouped[action.label].items.push(a);});
    const groupEntries=Object.values(grouped);
    summary.innerHTML=groupEntries.length
      ? groupEntries.map(g=>`<div style="display:inline-block;margin:.25rem .75rem .25rem 0;padding:.7rem 1rem;${toneStyle(g.action.tone)}"><strong>${g.items.length}</strong> ${esc(g.action.label.toLowerCase())}</div>`).join("")
      : '<div class="form-message success"><strong>NO IMMEDIATE SALES ACTIONS</strong><br>There are no products currently waiting for a staff action.</div>';
    if(!actionable.length){list.innerHTML="";return;}
    list.innerHTML=actionable.map(a=>{
      const action=actionFor(a.status);
      const name=[a.manufacturer,a.model].filter(Boolean).join(" ")||"Unnamed asset";
      return `<article class="valuation-card" style="margin-bottom:.75rem"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap"><div><p class="section-kicker">${esc(a.status)}</p><h3>${esc(name)}</h3><p>Asset: ${esc(a.asset_reference)} · Transaction: ${esc(a.transaction_number||"Not recorded")}</p></div><a class="btn btn-secondary" href="inventory-detail.html?id=${encodeURIComponent(a.id)}">VIEW ITEM</a></div><div style="margin-top:.75rem;padding:.9rem;${toneStyle(action.tone)}"><strong>${esc(action.label)}</strong><br><span>${esc(action.detail)}</span></div></article>`;
    }).join("");
  }
  await load();setInterval(()=>{if(!document.hidden)load();},5000);
});
