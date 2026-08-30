/* GearCashOut: customer-side catalogue visibility guard. */
(function(){
  'use strict';
  function install(){
    const auth=window.actionBuyerAuth;
    const client=auth?.supabase;
    if(!client||client.__gcoCustomerVisibilityGuard)return false;
    const originalFrom=client.from.bind(client);
    client.from=function(table){
      const builder=originalFrom(table);
      if(table!=='quote_catalog_products')return builder;
      const originalSelect=builder.select.bind(builder);
      builder.select=function(){
        const query=originalSelect.apply(builder,arguments);
        return query.eq('customer_visible',true);
      };
      return builder;
    };
    client.__gcoCustomerVisibilityGuard=true;
    return true;
  }
  if(!install()) document.addEventListener('DOMContentLoaded',install,{once:true});
})();
