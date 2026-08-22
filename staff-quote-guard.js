/* Staff guard plus a compatibility shim for the catalogue RPC. */
(function installCatalogueRpcCompatibility(){
  function install(){
    const auth=window.actionBuyerAuth;
    const client=auth?.supabase;
    if(!client || client.__gcoCatalogueRpcCompat) return;
    const originalRpc=client.rpc.bind(client);
    client.rpc=function(fn,args){
      if(fn!=="lookup_quote_catalog_price") return originalRpc(fn,args);
      const a=args||{};
      const condition=String(a.p_condition||"");
      const missing=!!a.p_missing_items;
      const damaged=!!a.p_damaged || condition==="damaged" || condition==="not-working";
      if(missing || damaged){
        return Promise.resolve({data:{route:"manual",reason:missing?"missing_items":"condition_requires_manual",price:null},error:null});
      }
      return client.from("quote_catalog_products")
        .select("id,package_name,factory_sealed_price,opened_unused_price,excellent_price,good_price,fair_price")
        .eq("active",true)
        .eq("category",a.p_category)
        .eq("manufacturer",a.p_manufacturer)
        .eq("model",a.p_model)
        .eq("package_key",a.p_package_key||"standard")
        .maybeSingle()
        .then(({data,error})=>{
          if(error) return {data:null,error};
          if(!data) return {data:{route:"manual",reason:"product_not_found",price:null},error:null};
          const prices={"factory-sealed":data.factory_sealed_price,"opened-unused":data.opened_unused_price,excellent:data.excellent_price,good:data.good_price,fair:data.fair_price};
          const price=prices[condition];
          if(price===null || price===undefined || price==="") return {data:{route:"manual",reason:"product_not_priced",price:null,product_id:data.id,package_name:data.package_name},error:null};
          return {data:{route:"automatic",reason:"database_price",price:Number(price),product_id:data.id,package_name:data.package_name},error:null};
        });
    };
    client.__gcoCatalogueRpcCompat=true;
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
  window.setTimeout(install,0);
})();

document.addEventListener("DOMContentLoaded", async () => {
  const auth = window.actionBuyerAuth;
  const form = document.getElementById("quote-form");
  if (!auth || !form) return;

  const session = await auth.getSession();
  if (!session) return;

  const { data: staff, error } = await auth.supabase
    .from("staff_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !staff) return;

  const notice = document.createElement("div");
  notice.className = "notice";
  notice.style.marginBottom = "1rem";
  notice.innerHTML = "<strong>Staff account detected.</strong><p>This staff login cannot be used to submit a customer valuation. Sign out and use a separate customer account for testing customer submissions.</p><a class=\"btn btn-primary\" href=\"admin.html\">RETURN TO STAFF DASHBOARD</a>";
  form.parentNode.insertBefore(notice, form);
  form.hidden = true;

  document.addEventListener("click", event => {
    const button = event.target?.closest?.("#quote-form button");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);
});
