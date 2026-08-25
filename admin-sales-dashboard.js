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
  const salesStates=["Sent to Sales","Listed","Reserved","Sold","Returned","Dispatched"];
  async function load(){
    const {data:assets,error}=await auth.supabase.from("inventory_assets").select("id,status,manufacturer,model,asset_reference,transaction_number").in("status",salesStates).order("status_changed_at",{ascending:true});
    if(error){notice("Could not load Sales Dashboard counts.",false);return;}
    const rows=assets||[];
    const count=s=>rows.filter(a=>a.status===s).length;
    document.getElementById("sent-count").textContent=count("Sent to Sales");
    document.getElementById("listed-count").textContent=count("Listed");
    document.getElementById("reserved-count").textContent=count("Reserved");
    document.getElementById("sold-count").textContent=count("Sold");
    document.getElementById("returned-count").textContent=count("Returned");
    const {data:listings,error:le}=await auth.supabase.from("resale_listings").select("id,status");
    if(le){notice("Could not load sales listing counts.",false);return;}
    document.getElementById("delist-count").textContent=(listings||[]).filter(x=>x.status==="Delist Required").length;

    const actionable=rows.filter(a=>["Sent to Sales","Sold","Returned","Dispatched"].includes(a.status));
    const summary=document.getElementById("sales-action-summary"), list=document.getElementById("sales-action-list");
    const grouped={};
    actionable.forEach(a=>{const action=actionFor(a.status);if(!grouped[action.label])grouped[action.label]={action,items:[]};grouped[action.label].items.push(a);});
    const groupEntries=Object.values(grouped);
    summary.innerHTML=groupEntries.length
      ? groupEntries.map(g=>`<div style="display:inline-block;margin:.25rem .75rem .25rem 0;padding:.7rem 1rem;${toneStyle(g.action.tone)}"><strong>${g.items.length}</strong> ${esc(g.action.label.toLowerCase())}</div>`).join("")
      : '<div class="form-message success"><strong>NO IMMEDIATE SALES ACTIONS</strong><br>There are no sales-stage products currently waiting for a staff action.</div>';
    if(!actionable.length){list.innerHTML="";return;}
    list.innerHTML=actionable.map(a=>{
      const action=actionFor(a.status);
      const name=[a.manufacturer,a.model].filter(Boolean).join(" ")||"Unnamed asset";
      return `<article class="valuation-card" style="margin-bottom:.75rem"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap"><div><p class="section-kicker">${esc(a.status)}</p><h3>${esc(name)}</h3><p>Asset: ${esc(a.asset_reference)} · Transaction: ${esc(a.transaction_number||"Not recorded")}</p></div><a class="btn btn-secondary" href="inventory-detail.html?id=${encodeURIComponent(a.id)}">VIEW ITEM</a></div><div style="margin-top:.75rem;padding:.9rem;${toneStyle(action.tone)}"><strong>${esc(action.label)}</strong><br><span>${esc(action.detail)}</span></div></article>`;
    }).join("");
  }
  await load();setInterval(()=>{if(!document.hidden)load();},5000);
});
