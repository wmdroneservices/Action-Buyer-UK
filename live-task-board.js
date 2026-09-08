/* Unified live task board: actionable work across Purchasing, Inventory and Sales. */
document.addEventListener("DOMContentLoaded", () => {
  const board=document.getElementById("live-task-board");
  const list=document.getElementById("live-task-list");
  const summary=document.getElementById("live-task-summary");
  const updated=document.getElementById("live-task-updated");
  const auth=window.actionBuyerAuth;
  if(!board||!list||!summary||!auth)return;

  const DAY=86400000;
  let loading=false;

  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const itemName=row=>[row.manufacturer,row.model].filter(Boolean).join(" ")||row.item_name||row.asset_reference||row.quote_reference||row.sale_reference||"Workflow item";

  function urgency(date,priority="auto"){
    const when=date?new Date(date).getTime():Date.now();
    const days=Math.max(0,Math.floor((Date.now()-when)/DAY));
    const forced={
      critical:{tone:"red",label:"CRITICAL",rank:0},
      priority:{tone:"red",label:"PRIORITY",rank:1},
      overdue:{tone:"amber",label:"OVERDUE",rank:2},
      current:{tone:"green",label:"CURRENT",rank:3}
    }[priority];
    if(forced)return {...forced,age:days===0?"Raised today":days===1?"Waiting 1 day":days+" days waiting"};
    if(days>=6)return {tone:"red",label:"PRIORITY",rank:1,age:days+" days waiting"};
    if(days>=3)return {tone:"amber",label:"OVERDUE",rank:2,age:days+" days waiting"};
    return {tone:"green",label:"CURRENT",rank:3,age:days===0?"Raised today":days===1?"Waiting 1 day":"Waiting "+days+" days"};
  }

  function addTask(tasks,{title,detail,href,when,category,reference,priority="auto",key}){
    tasks.push({title,detail,href,when,category:category||"WORKFLOW",reference:reference||"",key:key||[category,title,reference,href].join("|"),...urgency(when,priority)});
  }

  async function load(){
    if(loading)return;
    loading=true;
    try{
      const db=auth.supabase;
      const results=await Promise.all([
        db.from("valuations").select("id,quote_reference,status,manufacturer,model,submitted_at,updated_at"),
        db.from("sales").select("id,sale_reference,status,total_amount,bank_details_confirmed_at,created_at,updated_at"),
        db.from("shipments").select("id,sale_id,shipment_type,status,created_at,updated_at,shipped_at,delivered_at"),
        db.from("purchase_return_cases").select("id,status,created_at,updated_at,arranged_at,dispatched_at,delivered_at,closed_at"),
        db.from("inventory_assets").select("id,asset_reference,source_sale_id,manufacturer,model,status,created_at,updated_at,status_changed_at,transaction_number"),
        db.from("resale_listings").select("id,asset_id,listing_reference,listing_title,status,created_at,updated_at"),
        db.from("sales_customer_returns").select("id,return_reference,status,asset_id,created_at,updated_at,item_received_at")
      ]);

      const [valuations,sales,shipments,purchaseReturns,assets,listings,customerReturns]=results.map(r=>r.data||[]);
      const customerReturnAssetIds=new Set(customerReturns
        .map(r=>r.asset_id)
        .filter(Boolean));
      // One physical item must produce one actionable inspection task. Once receipt
      // has created the linked inventory asset, the Product Workbench is the
      // authoritative inspection entry point; do not duplicate it as a sale task.
      const inspectionAssetSaleIds=new Set(assets
        .filter(a=>a.source_sale_id && ["Received","Inspection Required","Testing","Repair Required"].includes(String(a.status||"")))
        .map(a=>a.source_sale_id));
      const tasks=[];

      valuations.forEach(v=>{
        const status=String(v.status||"").toLowerCase();
        if(["submitted","pending","pending_review","under_review","staff_review","awaiting_review"].includes(status)){
          addTask(tasks,{category:"PURCHASING",title:"Review valuation",detail:itemName(v)+(v.quote_reference?" · "+v.quote_reference:""),href:"admin-valuations.html",when:v.updated_at||v.submitted_at,reference:v.quote_reference});
        }
      });

      const inboundBySale=new Map();
      shipments.filter(s=>String(s.shipment_type||"").toLowerCase()==="inbound").forEach(s=>{
        const existing=inboundBySale.get(s.sale_id);
        if(!existing||new Date(s.updated_at||s.created_at||0)>new Date(existing.updated_at||existing.created_at||0))inboundBySale.set(s.sale_id,s);
      });

      sales.forEach(s=>{
        const status=String(s.status||"").toLowerCase();
        const inbound=inboundBySale.get(s.id);
        const when=s.updated_at||s.created_at;
        if(status==="payment_due"&&s.bank_details_confirmed_at){
          addTask(tasks,{category:"PURCHASING",title:"Send and record customer payment",detail:(s.sale_reference||"Purchase")+" · Bank details confirmed",href:"admin-sale.html?id="+encodeURIComponent(s.id),when,reference:s.sale_reference,priority:"priority"});
        }else if(["received","inspection"].includes(status)){
          if(!inspectionAssetSaleIds.has(s.id)){
            addTask(tasks,{category:"PURCHASING",title:"Inspect received item",detail:(s.sale_reference||"Purchase")+" is ready for receipt and inspection.",href:"admin-sale.html?id="+encodeURIComponent(s.id),when,reference:s.sale_reference});
          }
        }else if(["collecting_items","ready_for_shipping","shipping"].includes(status)&&!inbound){
          addTask(tasks,{category:"PURCHASING",title:"Create and send inbound shipping label",detail:(s.sale_reference||"Purchase")+" has progressed and needs the customer shipping label.",href:"admin-sale.html?id="+encodeURIComponent(s.id),when,reference:s.sale_reference});
        }else if(inbound&&String(inbound.status||"").toLowerCase()==="delivered"&&!["received","inspection","payment_due","paid","completed","cancelled"].includes(status)){
          addTask(tasks,{category:"PURCHASING",title:"Receive delivered item",detail:(s.sale_reference||"Purchase")+" has been delivered to GearCashOut.",href:"admin-sale.html?id="+encodeURIComponent(s.id),when:inbound.delivered_at||inbound.updated_at||when,reference:s.sale_reference});
        }
      });

      purchaseReturns.forEach(r=>{
        const status=String(r.status||"").toLowerCase();
        if(!["closed","complete","completed"].includes(status)){
          let title="Review purchase return";
          let detail="Refused valuation return requires attention.";
          if(["return_required","required","new","open"].includes(status)){title="Arrange refused valuation return";detail="Create the return shipment and record the tracking details.";}
          else if(["arranged","label_created","ready_to_send"].includes(status)){title="Dispatch customer return";detail="The return is arranged and needs to be sent to the customer.";}
          else if(["dispatched","in_transit"].includes(status)){title="Check return delivery";detail="The customer return is in transit and should be followed through to delivery.";}
          addTask(tasks,{category:"PURCHASE RETURNS",title,detail,href:"purchase-returns.html",when:r.updated_at||r.created_at,reference:"Purchase return"});
        }
      });

      assets.forEach(a=>{
        const status=String(a.status||"");
        const when=a.status_changed_at||a.updated_at||a.created_at;
        const name=itemName(a);
        const href="inventory-detail.html?id="+encodeURIComponent(a.id);
        const map={
          "Received":["Inspect item",name+" has been received and needs inspection.","INVENTORY"],
          "Inspection Required":["Complete inspection",name+" is waiting for inspection.","INVENTORY"],
          "Testing":["Complete testing",name+" is currently in testing and needs the result recorded.","INVENTORY"],
          "Repair Required":["Arrange or complete repair",name+" requires repair before it can progress.","INVENTORY","priority"],
          "Ready for Resale":["Send item to pre-sale",name+" is ready to move into the sales workflow.","INVENTORY"],
          "Sent to Sales":["Prepare and list for sale",name+" is ready for the pre-sale / listing process.","SALES"],
          "Sold":["Move legacy sold item into shipping",name+" is a legacy sold record and needs the current shipping workflow.","SALES"],
          "Sold - Awaiting Shipping":["Arrange shipping",name+" has sold and requires carrier/tracking and collection.","SALES"],
          "Sold - Shipped":["Monitor delivery / return window",name+" is shipped and must remain in post-sale monitoring until the return window ends.","SALES"],
          "Returned":customerReturnAssetIds.has(a.id)?null:["Review returned item",name+" has been returned and needs assessment.","SALES"],
          "Dispatched":["Confirm delivery and completion",name+" has been dispatched and should be followed through.","SALES"]
        };
        if(map[status]){
          const [title,detail,category,priority="auto"]=map[status];
          addTask(tasks,{category,title,detail,href,when,reference:a.asset_reference,priority});
        }
      });

      listings.forEach(l=>{
        if(String(l.status||"").toLowerCase()==="delist required"){
          addTask(tasks,{category:"SALES",title:"Close duplicate marketplace listing",detail:(l.listing_title||l.listing_reference||"Marketplace listing")+" must be closed to prevent a duplicate sale.",href:"delist-actions.html",when:l.updated_at||l.created_at,reference:l.listing_reference,priority:"critical"});
        }
      });

      customerReturns.forEach(r=>{
        const status=String(r.status||"").trim().toLowerCase().replaceAll("_"," ").replaceAll("-"," ");
        if(!["resolved","refused","closed","complete","completed","cancelled"].includes(status)){
          let title="Review customer return";
          let detail=(r.return_reference||"Customer return")+" requires staff action.";
          if(["requested","new","open"].includes(status)){title="Review customer return request";detail=(r.return_reference||"Customer return")+" needs a decision and next action.";}
          else if(["approved","accepted","authorised","authorized"].includes(status)){title="Arrange customer return";detail=(r.return_reference||"Customer return")+" has been authorised and needs return handling.";}
          else if(["label created"].includes(status)){title="Arrange return collection";detail=(r.return_reference||"Customer return")+" has a return label and needs collection confirmed.";}
          else if(["collected"].includes(status)){title="Receive returned item";detail=(r.return_reference||"Customer return")+" is in return transit and needs receipt confirmed.";}
          else if(["item received","received"].includes(status)){title="Complete returned item assessment";detail=(r.return_reference||"Customer return")+" has been received and now needs assessment, item disposition and customer financial/replacement resolution.";}
          addTask(tasks,{category:"CUSTOMER RETURNS",title,detail,href:"sales-customer-returns.html",when:r.updated_at||r.item_received_at||r.created_at,reference:r.return_reference});
        }
      });

      // Collapse accidental duplicates while keeping separate genuinely different actions.
      const unique=new Map();
      tasks.forEach(t=>{
        const existing=unique.get(t.key);
        if(!existing||t.rank<existing.rank)unique.set(t.key,t);
      });
      const liveTasks=[...unique.values()].sort((a,b)=>a.rank-b.rank||new Date(a.when||0)-new Date(b.when||0));

      // The Purchasing Dashboard is a handoff boundary: once an asset reaches
      // Sent to Sales it belongs to the sales workflow and must no longer be
      // presented there as purchasing work. Keep inventory preparation visible
      // because Ready for Resale is the action that precedes that handoff.
      const pageName=(location.pathname.split("/").pop()||"").toLowerCase();
      const pageCategoryScopes={
        "admin-purchasing.html":new Set(["PURCHASING","PURCHASE RETURNS","INVENTORY"]),
        "admin-sales-dashboard.html":new Set(["SALES","CUSTOMER RETURNS"])
      };
      const categoryScope=pageCategoryScopes[pageName]||null;
      const pageTasks=categoryScope
        ? liveTasks.filter(t=>categoryScope.has(t.category))
        : liveTasks;

      const counts={
        current:pageTasks.filter(t=>t.label==="CURRENT").length,
        overdue:pageTasks.filter(t=>t.label==="OVERDUE").length,
        priority:pageTasks.filter(t=>t.label==="PRIORITY").length,
        critical:pageTasks.filter(t=>t.label==="CRITICAL").length
      };
      const categories=[...new Set(pageTasks.map(t=>t.category))].sort();
      const focus=pageTasks[0];

      let activeFilter="ALL";
      const renderList=()=>{
        const visible=activeFilter==="ALL"?pageTasks:pageTasks.filter(t=>t.category===activeFilter);
        const filterButtons=['ALL',...categories].map(category=>{
          const count=category==="ALL"?pageTasks.length:pageTasks.filter(t=>t.category===category).length;
          const active=category===activeFilter?' is-active':'';
          return '<button type="button" class="live-task-filter'+active+'" data-task-filter="'+esc(category)+'">'+esc(category)+' <strong>'+count+'</strong></button>';
        }).join("");
        const filters='<div class="live-task-filters" aria-label="Filter live tasks">'+filterButtons+'</div>';
        list.innerHTML=filters+(visible.length?visible.map(t=>'<a class="live-task-item task-'+t.tone+(t.label==="CRITICAL"?' task-critical':'')+'" href="'+esc(t.href)+'"><div class="live-task-status"><span>'+esc(t.category)+'</span><strong>'+esc(t.label)+'</strong></div><div class="live-task-main"><h3>'+esc(t.title)+'</h3><p>'+esc(t.detail)+'</p></div><div class="live-task-age">'+esc(t.age)+'</div><div class="live-task-arrow">VIEW</div></a>').join(""):'<div class="live-task-clear"><strong>NO TASKS IN THIS WORK AREA</strong><span>Choose another filter to see the remaining live workflow.</span></div>');
        list.querySelectorAll("[data-task-filter]").forEach(button=>button.addEventListener("click",()=>{
          activeFilter=button.dataset.taskFilter||"ALL";
          renderList();
        }));
      };

      summary.innerHTML=pageTasks.length
        ? '<div class="task-summary-card task-summary-green"><strong>'+counts.current+'</strong><span>Current</span></div><div class="task-summary-card task-summary-amber"><strong>'+counts.overdue+'</strong><span>Overdue</span></div><div class="task-summary-card task-summary-red"><strong>'+counts.priority+'</strong><span>Priority</span></div><div class="task-summary-card task-summary-critical"><strong>'+counts.critical+'</strong><span>Critical</span></div>'+(focus?'<a class="live-task-focus task-'+focus.tone+'" href="'+esc(focus.href)+'"><span>FOCUS NEXT</span><strong>'+esc(focus.title)+'</strong><small>'+esc(focus.detail)+'</small><b>OPEN</b></a>':'')
        : '<div class="live-task-clear"><strong>NO LIVE TASKS CURRENTLY REQUIRE STAFF ACTION</strong><span>The workflow is clear at the moment.</span></div>';

      renderList();
      updated.textContent="Live workflow check: "+new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    }catch(e){
      list.innerHTML='<div class="form-message error">Could not load the live task list. Please refresh the dashboard.</div>';
    }finally{loading=false;}
  }

  load();
  setInterval(()=>{if(!document.hidden)load();},30000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)load();});
});