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

  function urgency(date){
    const when=date?new Date(date).getTime():Date.now();
    const days=Math.max(0,Math.floor((Date.now()-when)/DAY));
    if(days>=6)return {tone:"red",label:"PRIORITY",age:days+" days waiting"};
    if(days>=3)return {tone:"amber",label:"OVERDUE",age:days+" days waiting"};
    return {tone:"green",label:"CURRENT",age:days===0?"Raised today":days===1?"Waiting 1 day":"Waiting "+days+" days"};
  }

  function addTask(tasks,{title,detail,href,when,category,reference}){
    tasks.push({title,detail,href,when,category:category||"WORKFLOW",reference:reference||"",...urgency(when)});
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
        db.from("inventory_assets").select("id,asset_reference,manufacturer,model,status,created_at,updated_at,status_changed_at,transaction_number"),
        db.from("resale_listings").select("id,asset_id,listing_reference,listing_title,status,created_at,updated_at"),
        db.from("customer_return_requests").select("id,return_reference,status,created_at,updated_at,accepted_at,item_received_at,return_authorised_at")
      ]);

      const [valuations,sales,shipments,purchaseReturns,assets,listings,customerReturns]=results.map(r=>r.data||[]);
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
          addTask(tasks,{category:"PURCHASING",title:"Send and record customer payment",detail:(s.sale_reference||"Purchase")+" · Bank details confirmed",href:"admin-sale.html?id="+encodeURIComponent(s.id),when,reference:s.sale_reference});
        }else if(["received","inspection"].includes(status)){
          addTask(tasks,{category:"PURCHASING",title:"Inspect received item",detail:(s.sale_reference||"Purchase")+" is ready for receipt and inspection.",href:"admin-sale.html?id="+encodeURIComponent(s.id),when,reference:s.sale_reference});
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
          "Repair Required":["Arrange or complete repair",name+" requires repair before it can progress.","INVENTORY"],
          "Ready for Resale":["Send item to pre-sale",name+" is ready to move into the sales workflow.","INVENTORY"],
          "Sent to Sales":["Prepare and list for sale",name+" is ready for the pre-sale / listing process.","SALES"],
          "Sold":["Dispatch sold item",name+" has sold and needs dispatch / completion.","SALES"],
          "Returned":["Review returned item",name+" has been returned and needs assessment.","SALES"],
          "Dispatched":["Confirm delivery and completion",name+" has been dispatched and should be followed through.","SALES"]
        };
        if(map[status]){
          const [title,detail,category]=map[status];
          addTask(tasks,{category,title,detail,href,when,reference:a.asset_reference});
        }
      });

      listings.forEach(l=>{
        if(String(l.status||"").toLowerCase()==="delist required"){
          addTask(tasks,{category:"SALES",title:"Close duplicate marketplace listing",detail:(l.listing_title||l.listing_reference||"Marketplace listing")+" must be closed to prevent a duplicate sale.",href:"sold-items.html#delist-actions",when:l.updated_at||l.created_at,reference:l.listing_reference});
        }
      });

      customerReturns.forEach(r=>{
        const status=String(r.status||"").toLowerCase();
        if(!["closed","complete","completed","cancelled"].includes(status)){
          let title="Review customer return";
          let detail=(r.return_reference||"Customer return")+" requires staff action.";
          if(["new","requested","open"].includes(status)){title="Review customer return request";detail=(r.return_reference||"Customer return")+" needs a decision and next action.";}
          else if(["accepted","authorised","authorized"].includes(status)){title="Arrange customer return";detail=(r.return_reference||"Customer return")+" has been authorised and needs return handling.";}
          else if(["item_received","received"].includes(status)){title="Inspect returned item";detail=(r.return_reference||"Customer return")+" has been received and needs assessment.";}
          addTask(tasks,{category:"CUSTOMER RETURNS",title,detail,href:"returns.html",when:r.updated_at||r.created_at,reference:r.return_reference});
        }
      });

      tasks.sort((a,b)=>{
        const rank={red:0,amber:1,green:2};
        return rank[a.tone]-rank[b.tone]||new Date(a.when||0)-new Date(b.when||0);
      });

      const counts={green:tasks.filter(t=>t.tone==="green").length,amber:tasks.filter(t=>t.tone==="amber").length,red:tasks.filter(t=>t.tone==="red").length};
      summary.innerHTML=tasks.length
        ? '<div class="task-summary-card task-summary-green"><strong>'+counts.green+'</strong><span>Current</span></div><div class="task-summary-card task-summary-amber"><strong>'+counts.amber+'</strong><span>Overdue</span></div><div class="task-summary-card task-summary-red"><strong>'+counts.red+'</strong><span>Priority</span></div>'
        : '<div class="live-task-clear"><strong>NO LIVE TASKS CURRENTLY REQUIRE STAFF ACTION</strong><span>The workflow is clear at the moment.</span></div>';

      list.innerHTML=tasks.length?tasks.map(t=>'<a class="live-task-item task-'+t.tone+'" href="'+esc(t.href)+'"><div class="live-task-status"><span>'+esc(t.category)+'</span><strong>'+esc(t.label)+'</strong></div><div class="live-task-main"><h3>'+esc(t.title)+'</h3><p>'+esc(t.detail)+'</p></div><div class="live-task-age">'+esc(t.age)+'</div><div class="live-task-arrow">VIEW</div></a>').join(""):"";
      updated.textContent="Live workflow check: "+new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    }catch(e){
      list.innerHTML='<div class="form-message error">Could not load the live task list. Please refresh the dashboard.</div>';
    }finally{loading=false;}
  }

  load();
  setInterval(()=>{if(!document.hidden)load();},30000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)load();});
});