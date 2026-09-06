document.addEventListener("DOMContentLoaded",async()=>{
 const auth=window.actionBuyerAuth;
 const session=await auth.getSession();if(!session){location.href="staff-login.html";return;}
 const {data:staff,error:staffError}=await auth.supabase.from("staff_users").select("active,can_manage_staff").eq("user_id",session.user.id).maybeSingle();
 if(staffError||!staff?.active||!staff?.can_manage_staff){location.href="admin.html";return;}
 const rows=document.getElementById("strategy-rows"),summary=document.getElementById("strategy-summary"),message=document.getElementById("strategy-message");
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=v=>v==null?"—":"£"+Number(v).toFixed(2);
 const actionLabel=x=>x.active_listing_count===0&&["Sent to Sales","Listed","Reserved"].includes(x.asset_status)?"CREATE / RESTORE LISTING":"OPEN SALES WORKBENCH";
 try{
  const {data,error}=await auth.supabase.rpc("management_stock_strategy_report");
  if(error)throw error;
  const all=data||[],attention=all.filter(x=>x.strategy_band!=="NORMAL");
  summary.textContent=all.length?all.length+" live stock item(s); "+attention.length+" currently require review. Coverage compares each SKU with the central active Outlet Registry.":"No live inventory currently requires strategy review.";
  rows.innerHTML=all.map(x=>`<tr>
   <td>${esc(x.sku||"—")}</td>
   <td><strong>${esc([x.manufacturer,x.model].filter(Boolean).join(" ")||"Unknown item")}</strong><br><small>${esc(x.package_name||"")}</small><br><small>${money(x.purchase_price)}</small></td>
   <td>${esc(x.asset_status)}</td><td><strong>${esc(x.days_in_stock)}</strong></td>
   <td>${esc(x.active_listing_count)}<br><small>${esc(x.outlet_names||"None")}</small></td>
   <td>${esc(x.missing_outlet_count)} of ${esc(x.available_outlet_count)}<br><small>${esc(x.missing_outlet_names||"None")}</small></td>
   <td><strong>${esc(x.strategy_band)}</strong></td><td>${esc(x.recommendation)}</td>
   <td><a class="btn btn-secondary" href="listing-readiness.html?id=${encodeURIComponent(x.asset_id)}">${esc(actionLabel(x))}</a></td>
  </tr>`).join("")||'<tr><td colspan="10">No live inventory.</td></tr>';
 }catch(e){message.textContent=e.message||"Could not load stock strategy.";message.className="form-message error";rows.innerHTML='<tr><td colspan="10">Unable to load strategy report.</td></tr>';}
});