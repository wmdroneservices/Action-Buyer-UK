import { createClient } from '@supabase/supabase-js';

// Deep Source Audit aware queue entrypoint. Deployed Supabase version 9.
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
async function auth(req:Request){
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const h=req.headers.get('Authorization')||'';
  const client=createClient(url,anon,{global:{headers:{Authorization:h}}});
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)throw Object.assign(new Error('Authentication required'),{status:401});
  const admin=createClient(url,service);
  const {data:staff}=await admin.from('staff_users').select('active').eq('user_id',user.id).maybeSingle();
  if(!staff?.active)throw Object.assign(new Error('Active staff access required'),{status:403});
  return admin;
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return out({error:'POST required'},405);
  let admin:any;try{admin=await auth(req)}catch(e:any){return out({error:e.message||String(e)},e.status||500)}
  try{
    const body=await req.json().catch(()=>({}));
    const requestedLimit=Number(body.limit);
    const manufacturer=String(body.manufacturer||'').trim()||null,model=String(body.model||'').trim()||null,category=String(body.category||'').trim()||null,productType=String(body.product_type||'').trim()||null;
    const requestedScope=String(body.evidence_scope||'all'),deepSourceUrl=String(body.deep_source_url||'').trim()||null,deepSource=requestedScope==='deep_source'||!!deepSourceUrl;
    const limit=deepSource&&Number.isFinite(requestedLimit)&&requestedLimit===0
      ?0
      :Math.max(1,Math.min(deepSource?500:25,Number.isFinite(requestedLimit)?requestedLimit:5));
    let runId:any,scope:string;
    if(deepSource){
      if(!deepSourceUrl||!/^https?:\/\//i.test(deepSourceUrl))throw new Error('A valid Deep Source landing page URL is required.');
      if(limit===0&&!manufacturer&&!model&&!category&&!productType)throw new Error('ALL matching products requires at least one product filter. Select a manufacturer to audit a whole manufacturer safely.');
      scope=[manufacturer&&'manufacturer='+manufacturer,model&&'model='+model,category&&'category='+category,productType&&'type='+productType,'deep_source='+deepSourceUrl].filter(Boolean).join(', ');
      const {data,error}=await admin.rpc('ai_research_create_deep_source_run',{p_limit:limit,p_notes:'Deep Source Audit: '+scope,p_manufacturer:manufacturer,p_model:model,p_category:category,p_product_type:productType,p_deep_source_url:deepSourceUrl});
      if(error)throw error;runId=data;
    }else{
      const evidenceScope=['all','new_uk','used_uk','overseas','amazon_uk'].includes(requestedScope)?requestedScope:'all';
      scope=[manufacturer&&'manufacturer='+manufacturer,model&&'model='+model,category&&'category='+category,productType&&'type='+productType,'evidence='+evidenceScope].filter(Boolean).join(', ')||'next available products';
      const {data,error}=await admin.rpc('ai_research_create_run_filtered',{p_limit:limit,p_notes:'Local Ollama AI research: '+scope,p_manufacturer:manufacturer,p_model:model,p_category:category,p_product_type:productType,p_evidence_scope:evidenceScope});
      if(error)throw error;runId=data;
    }
    const {count:queueCount,error:countError}=await admin.from('quote_catalog_ai_queue').select('id',{count:'exact',head:true}).eq('run_id',runId);
    if(countError)throw countError;
    const productsQueued=queueCount??0;

    // A zero-row run is terminal, not "queued". Leaving it queued created the
    // stale DEEP AUDIT RUNNING · 0/0 dashboard state with nothing to cancel.
    if(productsQueued===0){
      await admin.from('quote_catalog_ai_research_runs')
        .update({status:'completed',finished_at:new Date().toISOString()})
        .eq('id',runId);
      return out({
        run_id:runId,
        status:'no_matching_products',
        products_queued:0,
        scope,
        deep_source:deepSource,
        message:'No active catalogue products matched the selected Deep Source filters. Nothing was queued.'
      });
    }

    await admin.from('quote_catalog_ai_research_runs').update({status:'queued'}).eq('id',runId);
    return out({run_id:runId,status:'queued_for_local_agent',products_queued:productsQueued,scope,deep_source:deepSource,message:productsQueued+' product(s) queued. The local Ollama research agent will '+(deepSource?'crawl the Deep Source landing/category/subcategory path and return exact product pages only.':'collect web evidence and send findings to manual review.')});
  }catch(e:any){return out({error:e.message||String(e)},500)}
});