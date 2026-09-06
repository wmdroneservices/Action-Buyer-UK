document.addEventListener("DOMContentLoaded", async () => {
  const auth=window.actionBuyerAuth; if(!auth)return;
  const session=await auth.getSession(); if(!session){location.href="login.html?return=admin-sales-dashboard.html";return;}
  const {data:staff}=await auth.supabase.from("staff_users").select("user_id,active,can_manage_staff").eq("user_id",session.user.id).maybeSingle();
  if(!staff?.active){location.href="account.html";return;}
  const isManager=staff.can_manage_staff===true;
  const message=document.getElementById("staff-message");
  const notice=(text,ok=true)=>{if(message){message.textContent=text;message.className="form-message "+(ok?"success":"error");}};
  document.getElementById("staff-welcome").textContent=`Signed in as ${session.user.email}`;
  document.getElementById("staff-sign-out").addEventListener("click",async()=>{const b=document.getElementById("staff-sign-out");b.disabled=true;try{await auth.signOut();}catch(e){b.disabled=false;notice(e?.message||"Could not sign out.",false);}});
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const actionFor=state=>window.AssetStateMachine?.getNextAction(state)||{label:"ACTION REQUIRED",detail:"Review this item and determine its next workflow step.",tone:"warning"};
  const toneStyle=tone=>({action:"border:2px solid #b06b00;background:#fff8e8",warning:"border:2px solid #b42318;background:#fff5f5",success:"border:2px solid #18794e;background:#f1fbf5",info:"border:1px solid #b8c4d1;background:#f7f9fb"}[tone]||"border:1px solid #b8c4d1;background:#f7f9fb");
  const inventoryStates=["Received","Inspection Required","Testing","Repair Required","Ready for Resale"];
  const salesStates=["Sent to Sales","Listed","Reserved","Sold","Sold - Awaiting Shipping","Sold - Shipped","Returned","Dispatched"];

  const searchForm=document.getElementById("sales-search-form");
  const searchField=document.getElementById("sales-search-field");
  const searchInput=document.getElementById("sales-search-input");
  const searchButton=document.getElementById("sales-search-button");
  const searchResults=document.getElementById("sales-search-results");

  const normaliseSearch=v=>String(v??"").toLowerCase().trim().replace(/\s+/g," ");
  const productName=a=>[a.manufacturer,a.model].filter(Boolean).join(" ").trim()||"Unnamed asset";

  function renderSalesSearch(rows,term){
    if(!searchResults)return;
    searchResults.hidden=false;
    if(!rows.length){
      searchResults.innerHTML='<div class="sales-search-empty">No stock matched <strong>'+esc(term)+'</strong>.</div>';
      return;
    }
    const shown=rows.slice(0,25);
    const extra=rows.length>shown.length?'<p class="sales-search-limit">Showing the first '+shown.length+' of '+rows.length+' matches. Refine the search to narrow the result.</p>':"";
    searchResults.innerHTML='<div class="sales-search-summary">'+rows.length+' match'+(rows.length===1?"":"es")+' found</div>'+
      shown.map(a=>'<article class="sales-search-result"><div><strong>'+esc(productName(a))+'</strong><span>SKU: '+esc(a.sku||"Not recorded")+' · Transaction: '+esc(a.transaction_number||"Not recorded")+' · Status: '+esc(a.status||"Unknown")+'</span></div><a class="btn btn-secondary" href="inventory-detail.html?id='+encodeURIComponent(a.id)+'">VIEW ITEM</a></article>').join("")+extra;
  }

  async function runSalesSearch(){
    const term=String(searchInput?.value||"").trim();
    if(!term){searchResults&&(searchResults.hidden=true);return;}
    const field=searchField?.value||"all";
    const needle=normaliseSearch(term);
    if(searchButton){searchButton.disabled=true;searchButton.textContent="SEARCHING...";}
    try{
      const {data,error}=await auth.supabase.from("inventory_assets")
        .select("id,status,manufacturer,model,asset_reference,transaction_number,sku")
        .order("status_changed_at",{ascending:false});
      if(error)throw error;
      const rows=(data||[]).filter(a=>{
        const sku=normaliseSearch(a.sku);
        const transaction=normaliseSearch(a.transaction_number);
        const product=normaliseSearch(productName(a));
        if(field==="sku")return sku.includes(needle);
        if(field==="transaction")return transaction.includes(needle);
        if(field==="product")return product.includes(needle);
        return sku.includes(needle)||transaction.includes(needle)||product.includes(needle);
      });
      renderSalesSearch(rows,term);
    }catch(e){
      if(searchResults){
        searchResults.hidden=false;
        searchResults.innerHTML='<div class="sales-search-empty">The stock search could not be completed. Please try again.</div>';
      }
      notice(e?.message||"Could not search stock.",false);
    }finally{
      if(searchButton){searchButton.disabled=false;searchButton.textContent="SEARCH";}
    }
  }

  if(searchForm)searchForm.addEventListener("submit",e=>{e.preventDefault();runSalesSearch();});

  function setStepNotice(id, html, tone="info"){
    const el=document.getElementById(id); if(!el)return;
    el.innerHTML=`<div style="margin-top:.75rem;padding:.9rem 1rem;${toneStyle(tone)}"><strong>${html}</strong></div>`;
  }

  async function loadManagementStock(){
    if(!isManager)return;
    const panel=document.getElementById("management-stock-attention");
    const summary=document.getElementById("management-stock-summary");
    const cards=document.getElementById("management-stock-cards");
    if(!panel||!summary||!cards)return;
    panel.hidden=false;
    try{
      const {data,error}=await auth.supabase.rpc("management_stock_strategy_report");
      if(error)throw error;
      const rows=data||[];
      const noListing=rows.filter(x=>x.strategy_band==="NO ACTIVE LISTING").length;
      const exitReview=rows.filter(x=>x.strategy_band==="AUCTION / EXIT REVIEW").length;
      const urgent=rows.filter(x=>x.strategy_band==="URGENT STRATEGY REVIEW").length;
      const priceReview=rows.filter(x=>["EXPAND OUTLETS / PRICE REVIEW","PRICE / PRESENTATION REVIEW"].includes(x.strategy_band)).length;
      const review=rows.filter(x=>x.strategy_band==="REVIEW").length;
      const attention=noListing+exitReview+urgent+priceReview+review;
      summary.textContent=rows.length
        ? attention+" stock item"+(attention===1?"":"s")+" currently require management review. This is advisory only and does not automatically change listings, prices or outlets."
        : "No live inventory currently requires a management stock strategy review.";
      const card=(label,count,tone,detail)=>'<div class="management-stock-card '+tone+'"><strong>'+count+'</strong><span>'+label+'</span><small>'+detail+'</small></div>';
      cards.innerHTML=[
        card("NO ACTIVE LISTING",noListing,"critical","SKU is in Sales but has no active listing"),
        card("120+ DAYS",exitReview,"critical","Auction or exit review"),
        card("90+ DAYS",urgent,"urgent","Urgent strategy review"),
        card("60+ DAYS",priceReview,"warning","Outlet, price or presentation review"),
        card("30+ DAYS",review,"review","Routine management review")
      ].join("");
    }catch(e){
      summary.textContent="Stock strategy summary could not be loaded.";
      cards.innerHTML="";
    }
  }

  async function load(){
    const {data:assets,error}=await auth.supabase.from("inventory_assets").select("id,status,manufacturer,model,asset_reference,transaction_number").in("status",[...inventoryStates,...salesStates]).order("status_changed_at",{ascending:true});
    if(error){notice("Could not load Sales Dashboard counts.",false);return;}
    const {data:customerReturns,error:returnError}=await auth.supabase
      .from("sales_customer_returns")
      .select("asset_id,status");
    if(returnError){notice("Could not load customer return status.",false);return;}
    const rows=assets||[];
    const customerReturnAssetIds=new Set((customerReturns||[]).map(r=>r.asset_id).filter(Boolean));
    const terminalCustomerReturnStatuses=new Set(["resolved","refused","closed","complete","completed","cancelled"]);
    const openCustomerReturns=(customerReturns||[]).filter(r=>!terminalCustomerReturnStatuses.has(String(r.status||"").trim().toLowerCase().replaceAll("_"," ").replaceAll("-"," "))).length;
    const count=s=>rows.filter(a=>a.status===s).length;
    // Repair Required is intentionally broken out as its own visible pipeline category.
    // Inventory means stock still progressing through inspection/testing/resale preparation.
    const repairs=count("Repair Required");
    const inventoryRows=rows.filter(a=>inventoryStates.includes(a.status)&&a.status!=="Repair Required");
    const inventoryCount=inventoryRows.length;
    const sent=count("Sent to Sales");
    const listed=count("Listed");
    const reserved=count("Reserved");
    const sold=count("Sold");
    const soldShipping=count("Sold - Awaiting Shipping");
    const soldShipped=count("Sold - Shipped");
    const returned=rows.filter(a=>a.status==="Returned"&&!customerReturnAssetIds.has(a.id)).length;
    const returnsRequiringAction=openCustomerReturns+returned;
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
    setPipelineCount("repair-count",repairs);
    setPipelineCount("sent-count",sent);
    setPipelineCount("listed-count",listed);
    setPipelineCount("reserved-count",reserved);
    setPipelineCount("sold-count",sold);
    setPipelineCount("returned-count",returnsRequiringAction);

    const {data:listings,error:le}=await auth.supabase.from("resale_listings").select("id,asset_id,status,sales_channel,listing_url");
    if(le){notice("Could not load sales listing counts.",false);return;}
    const listingRows=listings||[];
    const delistWarnings=listingRows.filter(x=>x.status==="Delist Required");
    const delistCount=delistWarnings.length;
    const urgent=document.getElementById("urgent-delist-actions");
    if(urgent){
      urgent.innerHTML=delistCount
        ? `<div style="border:3px solid #b42318;background:#fff1f1;border-radius:10px;padding:1rem 1.1rem;box-shadow:0 5px 16px rgba(180,35,24,.14)"><div style="font-size:.78rem;font-weight:900;letter-spacing:.12em;color:#b42318">URGENT SALES ACTION</div><div style="font-size:1.25rem;font-weight:900;color:#7f1d1d;margin:.25rem 0">${delistCount} MARKETPLACE LISTING${delistCount===1?"":"S"} MUST BE CLOSED</div><p style="margin:.25rem 0 .8rem;color:#5f1b18">A product has sold through another channel. Close the remaining marketplace listing${delistCount===1?"":"s"} immediately to prevent a duplicate sale.</p><a class="btn btn-primary" href="delist-actions.html" style="background:#b42318;border-color:#b42318;color:#fff;font-weight:900;box-shadow:0 4px 10px rgba(180,35,24,.25)">CLOSE OTHER MARKETPLACE LISTINGS NOW</a></div>`
        : "";
    }

    const inspection=count("Received");
    const testing=count("Inspection Required");
    const testingInProgress=count("Testing");
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

    const soldMessage=(soldShipping||soldShipped||sold)
      ? `${soldShipping ? soldShipping+" REQUIRING SHIPPING" : ""}${soldShipping && soldShipped ? " · " : ""}${soldShipped ? soldShipped+" SHIPPED / RETURN WINDOW" : ""}${sold ? ((soldShipping||soldShipped) ? " · " : "")+sold+" LEGACY SOLD" : ""}${delistCount ? ` — ${delistCount} MARKETPLACE LISTING${delistCount===1?"":"S"} REQUIRE CLOSURE` : ""}`
      : (delistCount ? `${delistCount} MARKETPLACE LISTING${delistCount===1?"":"S"} REQUIRE CLOSURE` : "NO POST-SALE ACTIONS CURRENTLY");
    setStepNotice("sold-step-notice", soldMessage, delistCount ? "warning" : (sold ? "action" : "success"));
    const soldLink=document.getElementById("open-sold-items");
    if(soldLink) soldLink.href=delistCount ? "delist-actions.html" : "sold-items.html";
    const returnsNotice=returnsRequiringAction ? `${returnsRequiringAction} ${returnsRequiringAction===1?"RETURN":"RETURNS"} REQUIRE REVIEW` : "NO RETURNS CURRENTLY REQUIRING ACTION";
    setStepNotice("returns-step-notice", returnsNotice, returnsRequiringAction ? "warning" : "success");

    const actionable=rows.filter(a=>["Received","Inspection Required","Testing","Repair Required","Ready for Resale","Sent to Sales","Sold","Sold - Awaiting Shipping","Sold - Shipped","Returned","Dispatched"].includes(a.status) && !(a.status==="Returned"&&customerReturnAssetIds.has(a.id)));
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
  await load();
  await loadManagementStock();
  setInterval(()=>{if(!document.hidden)load();},5000);
  setInterval(()=>{if(!document.hidden)loadManagementStock();},60000);
});
