import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(){
  const path=new URL('./.env',import.meta.url);
  try{
    const text=fs.readFileSync(path,'utf8');
    for(const raw of text.split(/\r?\n/)){
      const line=raw.trim();
      if(!line||line.startsWith('#'))continue;
      const i=line.indexOf('=');
      if(i<0)continue;
      const k=line.slice(0,i).trim(),v=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');
      if(!process.env[k])process.env[k]=v;
    }
  }catch{}
}
loadEnv();

const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
for(const key of required)if(!process.env[key])throw new Error(key+' is required in .env');

const cfg={
  supabaseUrl:process.env.SUPABASE_URL,
  serviceKey:process.env.SUPABASE_SERVICE_ROLE_KEY,
  ollamaUrl:(process.env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,''),
  model:process.env.OLLAMA_MODEL||'gemma3:4b',
  pollSeconds:Math.max(5,Number(process.env.POLL_SECONDS||15)),
  maxResults:Math.max(5,Math.min(30,Number(process.env.MAX_RESULTS_PER_PRODUCT||20))),
  agentId:process.env.AGENT_ID||'gear-local-agent-1',
  agentName:process.env.AGENT_NAME||'GearCashOut Local Research Agent'
};

const sb=createClient(cfg.supabaseUrl,cfg.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=(...x)=>console.log(new Date().toLocaleString('en-GB'),...x);

async function heartbeat(status='online',last_error=null,metadata={}){
  const row={
    agent_id:cfg.agentId,
    agent_name:cfg.agentName,
    status,
    provider:'ollama',
    model:cfg.model,
    version:'1.0.0',
    last_heartbeat_at:new Date().toISOString(),
    last_started_at:status==='starting'?new Date().toISOString():undefined,
    last_error,
    metadata,
    updated_at:new Date().toISOString()
  };
  Object.keys(row).forEach(k=>row[k]===undefined&&delete row[k]);
  const {error}=await sb.from('quote_catalog_ai_agents').upsert(row,{onConflict:'agent_id'});
  if(error)throw error;
}

async function ensureOllama(){
  const res=await fetch(cfg.ollamaUrl+'/api/tags');
  if(!res.ok)throw new Error('Ollama is not reachable at '+cfg.ollamaUrl);
  const data=await res.json();
  const names=(data.models||[]).map(m=>m.name);
  if(!names.includes(cfg.model)&&!names.some(n=>n.split(':')[0]===cfg.model.split(':')[0])){
    throw new Error('Ollama model '+cfg.model+' is not installed. Run: ollama pull '+cfg.model);
  }
}

function productName(p){
  return [p.manufacturer,p.model,p.package_name].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
}

function decodeDdgUrl(href){
  try{
    if(href.startsWith('//'))href='https:'+href;
    if(href.startsWith('/l/?')){
      const u=new URL('https://duckduckgo.com'+href);
      return u.searchParams.get('uddg')||href;
    }
    const u=new URL(href,'https://duckduckgo.com');
    if(u.hostname.includes('duckduckgo.com')&&u.searchParams.get('uddg'))return u.searchParams.get('uddg');
    return u.href;
  }catch{return null}
}

function stripHtml(html){
  return html.replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/\s+/g,' ')
    .trim();
}

async function searchDdg(query){
  const url='https://html.duckduckgo.com/html/?q='+encodeURIComponent(query);
  const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 GearCashOut research agent'}});
  if(!res.ok)throw new Error('Search request failed: '+res.status);
  const html=await res.text();
  const out=[];
  const re=/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,300}?(?:result__snippet[^>]*>([\s\S]*?)<\/a>|result__snippet[^>]*>([\s\S]*?)<\/div>)/gi;
  let m;
  while((m=re.exec(html))){
    const url=decodeDdgUrl(m[1]);
    if(url&&/^https?:\/\//i.test(url))out.push({url,title:stripHtml(m[2]),snippet:stripHtml(m[3]||m[4]||'')});
  }
  if(!out.length){
    const a=/<a[^>]+href="([^"]+)"[^>]*>([^<]{3,200})<\/a>/gi;
    while((m=a.exec(html))){
      const url=decodeDdgUrl(m[1]);
      if(url&&/^https?:\/\//i.test(url)&&!url.includes('duckduckgo.com'))out.push({url,title:stripHtml(m[2]),snippet:''});
    }
  }
  return out.slice(0,15);
}

function hostOf(url){try{return new URL(url).hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}}

async function collectEvidence(product,sources){
  const name=productName(product);
  const priority=[...sources].filter(s=>s.enabled).sort((a,b)=>(a.priority||999)-(b.priority||999)).slice(0,10);
  const queries=[
    '"'+name+'" price',
    '"'+name+'" UK',
    '"'+name+'" used'
  ];
  for(const s of priority){
    if(s.domain)queries.push('site:'+s.domain+' "'+name+'"');
  }

  const seen=new Map();
  for(const q of queries){
    try{
      for(const r of await searchDdg(q)){
        const host=hostOf(r.url);
        if(!host||seen.has(r.url))continue;
        seen.set(r.url,{...r,query:q,host});
      }
    }catch(e){log('Search warning:',e.message)}
  }

  const ranked=[...seen.values()].sort((a,b)=>{
    const ak=priority.some(s=>hostOf('https://'+s.domain)===a.host)?0:1;
    const bk=priority.some(s=>hostOf('https://'+s.domain)===b.host)?0:1;
    return ak-bk;
  }).slice(0,cfg.maxResults);

  const pages=[];
  for(const r of ranked){
    try{
      const res=await fetch(r.url,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 GearCashOut research agent'}});
      if(!res.ok)continue;
      const type=res.headers.get('content-type')||'';
      if(!type.includes('text/html'))continue;
      const html=await res.text();
      const text=stripHtml(html).slice(0,7000);
      if(text.length<120)continue;
      pages.push({...r,url:res.url,text});
    }catch{}
  }
  return pages;
}

const schema={
  type:'object',
  properties:{
    candidates:{type:'array',items:{type:'object',properties:{
      source_url:{type:'string'},source_name:{type:'string'},source_country_code:{type:'string'},
      source_kind:{type:'string'},discovered_title:{type:'string'},discovered_model_number:{type:'string'},
      price:{type:['number','null']},currency:{type:'string'},condition:{type:'string'},
      availability_status:{type:'string'},match_confidence:{type:'number'},evidence_category:{type:'string'},
      market_region:{type:'string'},package_match:{type:'string'},variant_match:{type:'string'},
      evidence_notes:{type:'string'}
    },required:['source_url','source_name','source_kind','discovered_title','price','currency','condition','availability_status','match_confidence','evidence_category','market_region','package_match','variant_match','evidence_notes']}},
    discovered_sources:{type:'array',items:{type:'object',properties:{
      source_url:{type:'string'},source_name:{type:'string'},source_country_code:{type:'string'},
      source_kind:{type:'string'},evidence_category:{type:'string'}
    },required:['source_url','source_name','source_kind','evidence_category']}}
  },
  required:['candidates','discovered_sources']
};

async function analyse(product,sources,pages){
  const known=sources.map(s=>({id:s.id,name:s.source_name,domain:s.domain,country:s.country_code,kind:s.source_kind,scope:s.research_scope}));
  const evidence=pages.map((p,i)=>({id:i+1,url:p.url,title:p.title,snippet:p.snippet,text:p.text}));
  const prompt=`You are the validation layer for a GearCashOut resale catalogue.

EXACT PRODUCT:
${JSON.stringify(product)}

KNOWN SOURCE REGISTRY:
${JSON.stringify(known)}

COLLECTED WEB EVIDENCE:
${JSON.stringify(evidence)}

Rules:
- Use ONLY URLs and factual evidence in COLLECTED WEB EVIDENCE. Never invent a URL, price or availability.
- Exact model/variant/package matching is mandatory.
- New UK retail = evidence_category new_uk and bucket 1.
- Used UK = evidence_category used_uk and bucket 2. IMPORTANT: UK marketplace listings belong here even when the listing says new.
- Overseas = evidence_category overseas and bucket 3.
- Manufacturer product information = official, separate from market price evidence.
- Do not mix generations, storage capacities, body-only products, kits, controllers or bundles.
- Reject mismatches by omitting them.
- Minimum confidence 0.60.
- For new domains not present in KNOWN SOURCE REGISTRY, include them in discovered_sources.
- condition must be new, used, refurbished or unknown.
- source_kind must be manufacturer, retailer, marketplace, used_dealer, auction or other.
Return JSON only matching the schema.`;

  const res=await fetch(cfg.ollamaUrl+'/api/chat',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:cfg.model,
      messages:[{role:'user',content:prompt}],
      format:schema,
      stream:false,
      options:{temperature:0}
    })
  });
  if(!res.ok)throw new Error('Ollama analysis failed: '+res.status+' '+(await res.text()).slice(0,500));
  const data=await res.json();
  const text=data.message?.content;
  if(!text)throw new Error('Ollama returned no structured content');
  return JSON.parse(text);
}

function classifyFromSource(s){
  const cc=String(s.country_code||'').toUpperCase();
  const kind=String(s.source_kind||'other');
  if(kind==='manufacturer')return {evidence_category:'official',market_region:'official'};
  if(cc==='GB'&&kind==='retailer')return {evidence_category:'new_uk',market_region:'UK'};
  if(cc==='GB'&&['marketplace','used_dealer','auction'].includes(kind))return {evidence_category:'used_uk',market_region:'UK'};
  return {evidence_category:'overseas',market_region:'overseas'};
}

async function registerSource(c){
  const {data,error}=await sb.rpc('ai_research_register_discovered_source',{
    p_source_url:c.source_url,
    p_source_name:c.source_name||null,
    p_country_code:c.source_country_code||null,
    p_source_kind:c.source_kind||'other',
    p_research_scope:c.evidence_category||null,
    p_notes:'Automatically discovered by the local Ollama research agent.'
  });
  if(error)throw error;
  return data;
}

async function submitCandidate(runId,productId,c,sourceMap){
  if(!c.source_url||!/^https?:\/\//i.test(c.source_url))return false;
  if(c.package_match==='mismatch'||c.variant_match==='mismatch'||Number(c.match_confidence||0)<0.6)return false;

  let sourceId;
  const host=hostOf(c.source_url);
  const known=sourceMap.get(host);
  if(known)sourceId=known.id;
  else sourceId=await registerSource(c);

  const source=known||null;
  const cls=source?classifyFromSource(source):{evidence_category:c.evidence_category||'overseas',market_region:c.market_region||'overseas'};

  const {error}=await sb.rpc('ai_research_submit_candidate',{
    p_run_id:runId,
    p_catalog_product_id:productId,
    p_source_id:sourceId,
    p_source_url:c.source_url,
    p_discovered_title:c.discovered_title||null,
    p_discovered_model_number:c.discovered_model_number||null,
    p_identifier_type:null,p_identifier_value:null,
    p_price:c.price??null,
    p_currency:c.currency||'GBP',
    p_price_type:c.evidence_category||cls.evidence_category,
    p_condition:c.condition||'unknown',
    p_availability_status:c.availability_status||'unknown',
    p_match_confidence:Number(c.match_confidence||0),
    p_match_method:'Local Ollama + collected web evidence',
    p_evidence_category:c.evidence_category||cls.evidence_category,
    p_market_region:c.market_region||cls.market_region,
    p_source_country_code:c.source_country_code||source?.country_code||null,
    p_source_kind:c.source_kind||source?.source_kind||'other',
    p_package_match:c.package_match||'uncertain',
    p_variant_match:c.variant_match||'uncertain',
    p_evidence_notes:c.evidence_notes||null
  });
  if(error)throw error;
  return true;
}

async function finishRunIfComplete(runId){
  const {data:rows,error}=await sb.from('quote_catalog_ai_queue').select('status').eq('run_id',runId);
  if(error)throw error;
  const total=rows.length;
  const done=rows.filter(r=>['completed','failed'].includes(r.status)).length;
  if(done<total)return;
  const errors=rows.filter(r=>r.status==='failed').length;
  await sb.from('quote_catalog_ai_research_runs').update({
    status:errors?'completed_with_errors':'completed',
    products_checked:total,
    errors_count:errors,
    finished_at:new Date().toISOString()
  }).eq('id',runId);
}

async function processOne(){
  const {data:claim,error:claimError}=await sb.rpc('ai_research_claim_next_queue_item');
  if(claimError)throw claimError;
  const item=Array.isArray(claim)?claim[0]:claim;
  if(!item)return false;

  log('Claimed product',item.catalog_product_id);
  try{
    await heartbeat('working',null,{run_id:item.run_id,product_id:item.catalog_product_id});
    const [{data:product,error:pErr},{data:sources,error:sErr}]=await Promise.all([
      sb.from('quote_catalog_products').select('*').eq('id',item.catalog_product_id).single(),
      sb.from('quote_catalog_ai_sources').select('*').eq('enabled',true).order('priority')
    ]);
    if(pErr)throw pErr;if(sErr)throw sErr;

    const pages=await collectEvidence(product,sources||[]);
    if(!pages.length)throw new Error('No usable web pages were collected for this product.');

    const research=await analyse(product,sources||[],pages);
    const sourceMap=new Map((sources||[]).map(s=>[String(s.domain||'').replace(/^www\./,'').toLowerCase(),s]));
    for(const s of research.discovered_sources||[]){
      if(s.source_url&&!sourceMap.has(hostOf(s.source_url))){
        try{await registerSource(s)}catch{}
      }
    }

    let submitted=0;
    for(const c of (research.candidates||[]).slice(0,25)){
      if(await submitCandidate(item.run_id,item.catalog_product_id,c,sourceMap))submitted++;
    }

    const {error:doneError}=await sb.rpc('ai_research_complete_queue_item',{
      p_queue_id:item.queue_id,p_success:true,p_error:null
    });
    if(doneError)throw doneError;

    const {data:runRow}=await sb.from('quote_catalog_ai_research_runs').select('candidates_found,flagged_for_review').eq('id',item.run_id).single();
    await sb.from('quote_catalog_ai_research_runs')
      .update({
        candidates_found:Number(runRow?.candidates_found||0)+submitted,
        flagged_for_review:Number(runRow?.flagged_for_review||0)+submitted
      })
      .eq('id',item.run_id);

    await finishRunIfComplete(item.run_id);
    log('Completed product:',submitted,'findings');
    return true;
  }catch(e){
    const message=(e?.message||String(e)).slice(0,1000);
    log('Product failed:',message);
    await sb.rpc('ai_research_complete_queue_item',{p_queue_id:item.queue_id,p_success:false,p_error:message});
    await finishRunIfComplete(item.run_id).catch(()=>{});
    throw e;
  }finally{
    await heartbeat('online',null,{}).catch(()=>{});
  }
}

async function main(){
  log('Starting',cfg.agentName,'with',cfg.model);
  await heartbeat('starting',null,{ollama_url:cfg.ollamaUrl});
  await ensureOllama();
  await heartbeat('online',null,{ollama_url:cfg.ollamaUrl});
  log('Ready. Polling every',cfg.pollSeconds,'seconds.');

  setInterval(()=>heartbeat('online',null,{}).catch(e=>log('Heartbeat error',e.message)),30000);

  while(true){
    try{
      const did=await processOne();
      if(!did)await sleep(cfg.pollSeconds*1000);
    }catch(e){
      await heartbeat('error',e.message||String(e),{}).catch(()=>{});
      await sleep(cfg.pollSeconds*1000);
      await heartbeat('online',null,{}).catch(()=>{});
    }
  }
}

main().catch(async e=>{
  console.error(e);
  try{await heartbeat('error',e.message||String(e),{})}catch{}
  process.exit(1);
});
