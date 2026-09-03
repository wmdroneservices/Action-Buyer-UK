document.addEventListener("DOMContentLoaded",async()=>{
  const auth=window.actionBuyerAuth;
  const message=document.getElementById("activity-message");
  const title=document.getElementById("activity-title");
  const subtitle=document.getElementById("activity-subtitle");
  const summary=document.getElementById("activity-summary");
  const list=document.getElementById("activity-list");
  const range=document.getElementById("activity-range");
  const staffId=new URLSearchParams(location.search).get("staff");
  let rows=[];

  const notice=(t,ok=false)=>{message.textContent=t||"";message.className="form-message "+(t?(ok?"success":"error"):"");};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const londonDate=d=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(d));
  const londonNow=()=>londonDate(new Date());
  const fmt=d=>new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",dateStyle:"medium",timeStyle:"medium"}).format(new Date(d));
  const filterRows=()=>{
    const mode=range.value;
    if(mode==="all")return rows;
    const today=londonNow();
    if(mode==="today")return rows.filter(r=>londonDate(r.created_at)===today);
    const cutoff=Date.now()-7*24*60*60*1000;
    return rows.filter(r=>new Date(r.created_at).getTime()>=cutoff);
  };
  const detailText=d=>{
    if(!d||typeof d!=="object")return "";
    const bits=[];
    if(d.reference)bits.push("Reference: "+d.reference);
    if(d.operation)bits.push("Operation: "+d.operation);
    if(d.label)bits.push(d.label);
    if(d.target)bits.push(d.target);
    if(d.form_id)bits.push("Form: "+d.form_id);
    if(d.title)bits.push(d.title);
    return bits.join(" · ");
  };
  function render(){
    const visible=filterRows();
    const recordChanges=visible.filter(r=>r.action_category==="record_change").length;
    const parcelWork=visible.filter(r=>["shipments","shipment_parcels"].includes(r.entity_table)).length;
    summary.innerHTML=
      '<div style="min-width:180px;padding:1rem 1.15rem;border:1px solid #2f7d5a;background:#edf8f1;color:#1f6b49"><strong style="display:block;font-size:1.55rem;line-height:1">'+visible.length+'</strong><span style="font-weight:700;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em">Logged actions</span></div>'+
      '<div style="min-width:180px;padding:1rem 1.15rem;border:1px solid #173a63;background:#eef4fb;color:#173a63"><strong style="display:block;font-size:1.55rem;line-height:1">'+recordChanges+'</strong><span style="font-weight:700;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em">Record changes</span></div>'+
      '<div style="min-width:180px;padding:1rem 1.15rem;border:1px solid #8a5a16;background:#fff7e8;color:#8a5a16"><strong style="display:block;font-size:1.55rem;line-height:1">'+parcelWork+'</strong><span style="font-weight:700;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em">Parcel actions</span></div>';
    if(!visible.length){list.innerHTML="<p>No activity recorded for this period.</p>";return;}
    list.innerHTML=visible.map(r=>{
      const details=detailText(r.details);
      const entity=[r.entity_table,r.entity_id].filter(Boolean).join(" · ");
      return '<article class="valuation-card" style="display:block;margin-top:.8rem">'+
        '<div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap">'+
        '<div><strong style="color:#102f4f">'+esc(r.action_type.replace(/_/g," ").toUpperCase())+'</strong>'+
        '<p style="margin:.35rem 0 0">'+esc(details||entity||"Staff activity")+'</p></div>'+
        '<div style="color:#5f6b78;font-size:.9rem">'+esc(fmt(r.created_at))+'</div></div>'+
        (entity?'<p style="margin:.55rem 0 0;font-size:.82rem;color:#6b7280">Record: '+esc(entity)+'</p>':"")+
      '</article>';
    }).join("");
  }

  const session=await auth.getSession();
  if(!session){location.href="staff-login.html";return;}
  const {data:me}=await auth.supabase.from("staff_users").select("can_manage_staff,active").eq("user_id",session.user.id).maybeSingle();
  if(!me?.active||!me?.can_manage_staff){location.href="admin.html";return;}

  try{
    const {data,error}=await auth.supabase.rpc("staff_activity_list",{p_staff_user_id:staffId||null,p_limit:1000});
    if(error)throw error;
    rows=data||[];
    const first=rows[0];
    if(first){
      title.textContent="Activity Log — "+(first.staff_name||first.staff_username||"Staff member");
      subtitle.textContent="View logins, page access, staff actions and recorded operational changes.";
    }else if(staffId){
      subtitle.textContent="No activity has been recorded for this staff account yet.";
    }else{
      subtitle.textContent="Management overview of staff activity.";
    }
    render();
  }catch(e){
    notice(e.message||"Could not load staff activity.");
    list.innerHTML="";
  }
  range.addEventListener("change",render);
});