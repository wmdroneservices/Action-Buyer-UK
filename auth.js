const SUPABASE_URL="https://npdpopaoazbpmwsgyosp.supabase.co";const SUPABASE_PUBLISHABLE_KEY="sb_publishable_Plc9kcyye1asKxTJOmGdhQ_dP_LX59o";const{createClient}=supabase;const supabaseClient=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
function setAuthMarker(s){try{if(s)localStorage.setItem("gearCashOutAuthenticated","true");else localStorage.removeItem("gearCashOutAuthenticated")}catch(_){} }
function selectedText(s){return s&&s.selectedIndex>=0?s.options[s.selectedIndex].textContent.trim():""}function checked(n){const e=document.querySelector('input[name="'+n+'"]:checked');return e?e.value:""}
function captureQuoteBeforeAuth(){const c=document.getElementById("gear-category"),m=document.getElementById("gear-manufacturer"),mo=document.getElementById("dji-model"),p=document.getElementById("package-select"),t=document.getElementById("quote-result-title"),pt=document.querySelector("#quote-summary .quote-price")?.textContent||"",x=pt.replace(/,/g,"").match(/£\s*([0-9]+(?:\.[0-9]+)?)/);const contents={};document.querySelectorAll(".package-content-select,.generic-content-select").forEach(e=>contents[e.dataset.contentId||e.id]=e.value);const r={category:c?.value||"",categoryName:selectedText(c),manufacturer:m?.value||"",manufacturerName:selectedText(m),model:mo?.value||"",modelName:selectedText(mo),package:p?.value||"",packageName:selectedText(p),condition:checked("condition"),flightHours:document.getElementById("flight-hours")?.value||"",flightHoursRange:checked("flightHoursRange"),unbound:checked("unbound"),damage:checked("damage"),damageDescription:document.getElementById("damage-description")?.value||"",packageContents:contents,droneSerial:document.getElementById("drone-serial-number")?.value||"",controllerSerial:document.getElementById("controller-serial-number")?.value||"",legalRight:checked("legalRight"),quoteAmount:x?Number(x[1]):null,manualValuation:/manual valuation|manual validation/i.test(t?.textContent||""),photosProvided:!!document.getElementById("photo-uploads")?.files?.length,created:new Date().toISOString()};try{localStorage.setItem("gearCashOutQuoteResume",JSON.stringify(r));localStorage.setItem("actionBuyerReturnAfterAuth","quote.html");sessionStorage.setItem("actionBuyerAuthRequiredForQuote","true")}catch(_){} }
window.actionBuyerAuth={supabase:supabaseClient,async getSession(){const{data,error}=await supabaseClient.auth.getSession();if(error)console.error(error);const s=data?.session||null;setAuthMarker(s);if(s){const{data:p}=await supabaseClient.from("profiles").select("account_status").eq("id",s.user.id).maybeSingle();if(p?.account_status==="closed"){await supabaseClient.auth.signOut();setAuthMarker(null);location.href="login.html?account=closed";return null;}}return s},async signOut(){const{error}=await supabaseClient.auth.signOut();if(error)throw error;setAuthMarker(null);try{localStorage.removeItem("gearCashOutAuthenticated")}catch(_){}location.href="login.html"},async updateAccountNavigation(){const isStaffPage=/\/admin(?:[-_][^/]+)?\.html$/i.test(location.pathname)||/\/admin\//i.test(location.pathname);const ls=document.querySelectorAll("[data-account-link]");const s=await this.getSession();let isStaff=false;if(s){const{data:staff,error}=await supabaseClient.from("staff_users").select("user_id").eq("user_id",s.user.id).maybeSingle();if(error)console.error(error);isStaff=!!staff;}ls.forEach(l=>{if(isStaffPage&&isStaff){l.closest("li")?.remove();return;}if(isStaff){l.textContent="Staff Dashboard";l.href="admin.html";}else{l.textContent=s?"My Account":"Register / Login";l.href=s?"account.html":"login.html";}})},ensureAccountNavigation(){const isStaffPage=/\/admin(?:[-_][^/]+)?\.html$/i.test(location.pathname)||/\/admin\//i.test(location.pathname);if(isStaffPage)return;document.querySelectorAll(".nav-list,.footer-nav").forEach(n=>{if(n.querySelector("[data-account-link]"))return;const i=document.createElement("li");i.innerHTML='<a href="login.html" data-account-link>Register / Login</a>';n.appendChild(i)})},async getProfile(){const s=await this.getSession();if(!s)return null;const{data,error}=await supabaseClient.from("profiles").select("full_name,phone,address_line1,address_line2,city,county,postcode,account_status,closed_at").eq("id",s.user.id).maybeSingle();if(error)console.error(error);return data||null},async prefillQuoteCustomerDetails(){const p=await this.getProfile();if(!p)return;const f={"full-name":p.full_name,"phone-number":p.phone,"address-line-1":p.address_line1,"address-line-2":p.address_line2,city:p.city,county:p.county,postcode:p.postcode};Object.entries(f).forEach(([id,v])=>{const e=document.getElementById(id);if(e&&v&&!e.value)e.value=v});const e=document.getElementById("email-address"),s=await this.getSession();if(e&&s?.user?.email&&!e.value)e.value=s.user.email;const fs=document.querySelector('#quote-form .wizard-step[data-step="13"] fieldset');document.querySelectorAll('#quote-form .wizard-step[data-step="13"] input').forEach(e=>e.required=false);if(fs)fs.hidden=true},async saveQuoteCustomerDetails(){const s=await this.getSession();if(!s)return;const v=id=>document.getElementById(id)?.value.trim()||"",r={id:s.user.id,full_name:v("full-name"),phone:v("phone-number"),address_line1:v("address-line-1"),address_line2:v("address-line-2"),city:v("city"),county:v("county"),postcode:v("postcode"),updated_at:new Date().toISOString()};const p=await this.getProfile();if(p){Object.keys(r).forEach(k=>{if(!r[k]&&p[k])r[k]=p[k]})}const{error}=await supabaseClient.from("profiles").upsert(r,{onConflict:"id"});if(error)console.error(error)}};
document.addEventListener("DOMContentLoaded",()=>{actionBuyerAuth.ensureAccountNavigation();actionBuyerAuth.updateAccountNavigation();const form=document.getElementById("quote-form");if(!form)return;form.addEventListener("click",async e=>{const b=e.target.closest("button"),step=b?.closest(".wizard-step");if(!b||!step)return;const n=Number(step.dataset.step);if(n===12&&(b.id==="continue-with-quote"||b.id==="quote-result-action"||b.classList.contains("btn-accept")||/continue with this quote|accept instant quote/i.test(b.textContent||""))){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const s=await actionBuyerAuth.getSession();if(!s){captureQuoteBeforeAuth();location.href="login.html?return=quote.html";return}await actionBuyerAuth.prefillQuoteCustomerDetails();const target=form.querySelector('.wizard-step[data-step="13"]');if(target){form.querySelectorAll(".wizard-step").forEach(x=>x.hidden=x!==target);}return}if(n===13&&b.classList.contains("btn-next"))setTimeout(()=>actionBuyerAuth.saveQuoteCustomerDetails(),500)},true)});
supabaseClient.auth.onAuthStateChange((_e,s)=>{setAuthMarker(s);actionBuyerAuth.updateAccountNavigation()});window.captureGearCashOutQuoteBeforeAuth=captureQuoteBeforeAuth;

/* Quote result authentication gate and battery-count compatibility. */
(function(){
  function isQuoteAction(el){if(!el)return false;const step=el.closest?.('.wizard-step[data-step="12"]');if(!step)return false;const text=(el.textContent||'').replace(/\s+/g,' ').trim();return el.id==='quote-result-action'||el.id==='continue-with-quote'||el.classList?.contains('btn-accept')||/continue with this quote|accept instant quote/i.test(text);}
  function preserveQuote(){const c=document.getElementById('gear-category'),m=document.getElementById('gear-manufacturer'),mo=document.getElementById('dji-model'),p=document.getElementById('package-select'),t=document.getElementById('quote-result-title'),price=document.querySelector('#quote-summary .quote-price');const contents={};document.querySelectorAll('.package-content-select,.generic-content-select').forEach(e=>contents[e.dataset.contentId||e.id]=e.value);const batteries=Array.from(document.querySelectorAll('.battery-entry')).map(row=>({type:row.querySelector('.battery-type')?.value||'',cycles:Number(row.querySelector('.battery-cycles')?.value||0)}));const match=String(price?.textContent||'').replace(/,/g,'').match(/£\s*([0-9]+(?:\.[0-9]+)?)/);const r={category:c?.value||'',categoryName:selectedText(c),manufacturer:m?.value||'',manufacturerName:selectedText(m),model:mo?.value||'',modelName:selectedText(mo),package:p?.value||'',packageName:selectedText(p),condition:checked('condition'),flightHours:document.getElementById('flight-hours')?.value||'',flightHoursRange:checked('flightHoursRange'),batteries,unbound:checked('unbound'),damage:checked('damage'),damageDescription:document.getElementById('damage-description')?.value||'',packageContents:contents,droneSerial:document.getElementById('drone-serial-number')?.value||'',controllerSerial:document.getElementById('controller-serial-number')?.value||'',legalRight:checked('legalRight'),quoteAmount:match?Number(match[1]):null,manualValuation:/manual valuation|manual validation/i.test(t?.textContent||''),photosProvided:!!document.getElementById('photo-uploads')?.files?.length,created:new Date().toISOString()};try{localStorage.setItem('gearCashOutQuoteResume',JSON.stringify(r));localStorage.setItem('actionBuyerReturnAfterAuth','quote.html');sessionStorage.setItem('actionBuyerAuthRequiredForQuote','true');}catch(_){} }
  async function gate(e){const target=e.target?.closest?.('button,a');if(!isQuoteAction(target))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const s=await actionBuyerAuth.getSession();if(!s){preserveQuote();window.location.href='login.html?return=quote.html';return;}await actionBuyerAuth.prefillQuoteCustomerDetails();const form=document.getElementById('quote-form'),step=form?.querySelector('.wizard-step[data-step="13"]');if(step)form.querySelectorAll('.wizard-step').forEach(x=>x.hidden=x!==step);}
  document.addEventListener('click',gate,true);
  function normaliseBatterySelect(){const select=document.getElementById('package-battery-count');if(!select)return;const current=select.value;const options=Array.from(select.options);const alreadyEight=options.length===9&&options.every((o,i)=>o.value===String(i)&&o.textContent===String(i));if(!alreadyEight){select.innerHTML='';for(let i=0;i<=8;i++)select.add(new Option(String(i),String(i)));}if(current!==''&&Number.isInteger(Number(current))&&Number(current)>=0&&Number(current)<=8)select.value=current;else if(window.gearExpectedPackageBatteries)select.value=String(Math.min(8,Math.max(0,Number(window.gearExpectedPackageBatteries())||0)));const label=select.closest('label');if(label&&label.firstChild)label.firstChild.textContent='Number of package batteries being supplied (up to 8)';}
  document.addEventListener('DOMContentLoaded',()=>{const form=document.getElementById('quote-form');if(!form)return;const observer=new MutationObserver(()=>{normaliseBatterySelect();});observer.observe(form,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});form.addEventListener('change',e=>{if(e.target?.id==='package-select')setTimeout(normaliseBatterySelect,50);},true);setTimeout(normaliseBatterySelect,100);setTimeout(normaliseBatterySelect,500);setTimeout(normaliseBatterySelect,1200);});
})();

/* Keep the account link correct on every page, including pages restored from cache/back-forward navigation. */
(function(){
  function sync(){
    if(!window.actionBuyerAuth||typeof window.actionBuyerAuth.updateAccountNavigation!=="function")return;
    window.actionBuyerAuth.ensureAccountNavigation();
    window.actionBuyerAuth.updateAccountNavigation();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",sync,{once:true});else sync();
  window.addEventListener("pageshow",sync);
  window.addEventListener("focus",sync);
  document.addEventListener("visibilitychange",function(){if(!document.hidden)sync()});
  window.setTimeout(sync,300);
  window.setTimeout(sync,1200);
})();


/* Enforce staff login hours on staff pages, including sessions that remain open past the permitted end time. */
(function(){
  const isStaffPage=/\/admin(?:[-_][^/]+)?\.html$/i.test(location.pathname)||/\/admin\//i.test(location.pathname);
  if(!isStaffPage)return;
  let checking=false;
  function londonTime(){
    const parts=Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value||"00";
    return get("hour")+":"+get("minute");
  }
  function withinHours(start,end,now=londonTime()){
    if(!start||!end)return true;
    if(start<end)return now>=start&&now<end;
    return now>=start||now<end;
  }
  async function enforce(){
    if(checking)return;checking=true;
    try{
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session?.user?.id)return;
      const {data:staff}=await supabaseClient.from("staff_users").select("active,work_start_time,work_end_time").eq("user_id",session.user.id).maybeSingle();
      if(!staff)return;
      if(!staff.active||!withinHours(staff.work_start_time,staff.work_end_time)){
        await supabaseClient.auth.signOut();
        setAuthMarker(null);
        location.href="staff-login.html?restricted=hours";
      }
    }catch(_){}finally{checking=false;}
  }
  enforce();
  window.setInterval(enforce,60000);
  window.addEventListener("focus",enforce);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)enforce();});
})();


/* Staff activity auditing: page access, UI actions and form submissions.
   Operational database changes are additionally captured by database triggers. */
(function(){
  const isStaffPage=/\/admin(?:[-_][^/]+)?\.html$/i.test(location.pathname)||/\/admin\//i.test(location.pathname);
  if(!isStaffPage)return;
  let activeStaff=false;
  let lastActionKey="";
  let lastActionAt=0;

  async function initialise(){
    try{
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session?.user?.id)return;
      const {data:staff}=await supabaseClient.from("staff_users").select("user_id,active").eq("user_id",session.user.id).maybeSingle();
      activeStaff=!!staff?.active;
      if(activeStaff){
        await log("page_view","navigation",null,null,{title:document.title},location.pathname.split("/").pop()||"admin.html");
      }
    }catch(_){}
  }

  async function log(action,category,entityTable,entityId,details,page){
    if(!activeStaff)return;
    try{
      await supabaseClient.rpc("log_staff_activity",{
        p_action_type:String(action||"activity").slice(0,120),
        p_action_category:String(category||"activity").slice(0,80),
        p_entity_table:entityTable||null,
        p_entity_id:entityId||null,
        p_details:details||{},
        p_page:page||location.pathname.split("/").pop()||""
      });
    }catch(_){}
  }

  function textLabel(el){
    return String(
      el.getAttribute("aria-label")||
      el.getAttribute("title")||
      el.textContent||
      el.value||
      el.id||
      el.tagName
    ).replace(/\s+/g," ").trim().slice(0,120);
  }

  document.addEventListener("click",e=>{
    const el=e.target?.closest?.("button,a");
    if(!el||!activeStaff)return;
    const key=el.tagName+"|"+(el.href||el.id||textLabel(el));
    const now=Date.now();
    if(key===lastActionKey&&now-lastActionAt<800)return;
    lastActionKey=key;lastActionAt=now;
    log(
      "ui_click",
      "interface",
      null,
      null,
      {element:el.tagName.toLowerCase(),label:textLabel(el),target:el.getAttribute("href")||null},
      location.pathname.split("/").pop()||""
    );
  },true);

  document.addEventListener("submit",e=>{
    if(!activeStaff)return;
    const form=e.target;
    if(!(form instanceof HTMLFormElement))return;
    log(
      "form_submit",
      "interface",
      null,
      null,
      {form_id:form.id||null,form_name:form.getAttribute("name")||null},
      location.pathname.split("/").pop()||""
    );
  },true);

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialise,{once:true});
  else initialise();
})();
