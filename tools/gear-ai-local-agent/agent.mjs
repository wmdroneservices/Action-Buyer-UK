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
  requestTimeoutMs:Math.max(5000,Number(process.env.REQUEST_TIMEOUT_MS||15000)),
  sourceProbeLimit:Math.max(3,Math.min(20,Number(process.env.SOURCE_PROBE_LIMIT||12))),
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
  // Catalogue fields often repeat the model at the start of package_name,
  // e.g. manufacturer="BetaFPV", model="Pavo30",
  // package_name="Pavo30 Brushless Whoop Quadcopter".
  const parts=[p.manufacturer,p.model,p.package_name]
    .filter(Boolean).map(x=>String(x).replace(/\s+/g,' ').trim()).filter(Boolean);

  const out=[];
  for(const part of parts){
    const lower=part.toLowerCase();
    // Remove an exact duplicate part.
    if(out.some(x=>x.toLowerCase()===lower))continue;

    // Remove a prefix that repeats the immediately preceding catalogue part.
    const prev=out[out.length-1];
    if(prev){
      const prevWords=prev.split(/\s+/);
      const words=part.split(/\s+/);
      let n=Math.min(prevWords.length,words.length);
      while(n>0 && prevWords.slice(-n).join(' ').toLowerCase()!==words.slice(0,n).join(' ').toLowerCase())n--;
      if(n>0)part=words.slice(n).join(' ').trim();
    }
    if(part)out.push(part);
  }

  return out.join(' ').replace(/\s+/g,' ').trim();
}

function productTerms(p){
  const raw=[p.manufacturer,p.model,p.package_name].filter(Boolean).join(' ');
  return [...new Set(String(raw).toLowerCase().match(/[a-z0-9]+/g)||[])].filter(x=>x.length>1);
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
  return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/\s+/g,' ')
    .trim();
}

function safeJson(value){try{return JSON.parse(value)}catch{return null}}
function flattenJsonLd(value,out=[]){if(!value)return out;if(Array.isArray(value)){for(const v of value)flattenJsonLd(v,out);return out}if(typeof value==='object'){out.push(value);if(value['@graph'])flattenJsonLd(value['@graph'],out)}return out}
function extractStructuredPageData(html,finalUrl){
  let canonical=finalUrl,title='',price=null,currency='',availability='',product=false;
  const cm=String(html).match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);if(cm){try{canonical=new URL(cm[1],finalUrl).href}catch{}}
  const og=String(html).match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i)||String(html).match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:title["']/i);
  const tt=String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);title=og?stripHtml(og[1]):(tt?stripHtml(tt[1]):'');
  const scripts=String(html).match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)||[];
  for(const script of scripts){const m=script.match(/>([\s\S]*?)<\/script>/i),parsed=m?safeJson(m[1].trim()):null;for(const node of flattenJsonLd(parsed)){const types=Array.isArray(node?.['@type'])?node['@type']:[node?.['@type']];if(!types.map(x=>String(x).toLowerCase()).includes('product'))continue;product=true;if(node.name&&!looksGenericTitle(node.name))title=String(node.name).trim();const offers=Array.isArray(node.offers)?node.offers[0]:node.offers;if(offers&&typeof offers==='object'){const p=Number(String(offers.price??offers.lowPrice??'').replace(/[^0-9.]/g,''));if(Number.isFinite(p)&&p>0)price=p;currency=String(offers.priceCurrency||currency||'').toUpperCase();availability=String(offers.availability||availability||'').split('/').pop()}}}
  const mp=String(html).match(/<meta[^>]+(?:property|name|itemprop)=["'](?:product:price:amount|price)["'][^>]+content=["']([^"']+)["']/i)||String(html).match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["'](?:product:price:amount|price)["']/i);
  if(price===null&&mp){const p=Number(String(mp[1]).replace(/[^0-9.]/g,''));if(Number.isFinite(p)&&p>0)price=p}
  return {url:canonical,title:stripHtml(title||''),price,currency,availability,product};
}
function isSuspiciousEvidenceUrl(value){try{const u=new URL(value),p=(u.pathname+' '+u.search).toLowerCase();return /skip[-_ ]?to[-_ ]?content|generate[-_ ]?help[-_ ]?code/.test(p)||/\/(account|cart|checkout|help|contact|about|policy|policies)\/?$/.test(u.pathname.toLowerCase())}catch{return true}}
function hasExactModelEvidence(product,title,text){const model=normaliseIdentityText(product?.model);if(!model)return false;const hay=normaliseIdentityText([title,text].filter(Boolean).join(' '));return hay.includes(model)}

function extractSearchLinks(html, baseUrl){
  const out=[],seen=new Set();
  const patterns=[
    /<a[^>]+class=["'][^"']*(?:result__a|result-link)[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  ];
  for(const re of patterns){
    let m;
    while((m=re.exec(html))){
      const raw=decodeDdgUrl(m[1])||(()=>{try{return new URL(m[1],baseUrl).href}catch{return null}})();
      if(!raw||!/^https?:\/\//i.test(raw))continue;
      const host=hostOf(raw);
      if(!host||isSearchHost(host))continue;
      const key=raw.split('#')[0];
      if(seen.has(key))continue;
      seen.add(key);
      const title=stripHtml(m[2]||'');
      if(title.length<2)continue;
      out.push({url:key,title,snippet:''});
      if(out.length>=20)return out;
    }
    if(out.length)break;
  }
  return out;
}

async function fetchText(url, timeoutMs=cfg.requestTimeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetch(url,{
      redirect:'follow',
      signal:controller.signal,
      headers:{
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language':'en-GB,en;q=0.9'
      }
    });
    if(!res.ok)throw new Error('HTTP '+res.status);
    const type=res.headers.get('content-type')||'';
    if(!type.includes('text/html'))throw new Error('Not HTML: '+type);
    return {url:res.url,html:await res.text()};
  }finally{clearTimeout(timer)}
}

async function searchDdg(query){
  // DDG often rate-limits automated requests. One short attempt is enough;
  // do not spend 30 seconds waiting on two endpoints.
  const url='https://html.duckduckgo.com/html/?q='+encodeURIComponent(query);
  try{
    const {html}=await fetchText(url,5000);
    return extractSearchLinks(html,url);
  }catch(e){
    log('DuckDuckGo search warning:',e.message);
    return [];
  }
}

async function searchBing(query){
  const url='https://www.bing.com/search?q='+encodeURIComponent(query)+'&cc=gb&setlang=en-GB';
  try{
    const {html}=await fetchText(url);
    const out=[],seen=new Set();
    const re=/<li[^>]+class=["'][^"']*b_algo[^"']*["'][^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/gi;
    let m;
    while((m=re.exec(html))){
      const href=m[1],host=hostOf(href);
      if(!host||isSearchHost(host)||seen.has(href))continue;
      seen.add(href);
      out.push({url:href,title:stripHtml(m[2]||''),snippet:''});
      if(out.length>=20)break;
    }
    return out;
  }catch(e){log('Bing search warning:',e.message);return []}
}

async function searchMojeek(query){
  const url='https://www.mojeek.com/search?q='+encodeURIComponent(query);
  try{
    const {html}=await fetchText(url);
    return extractSearchLinks(html,url);
  }catch(e){log('Mojeek search warning:',e.message);return []}
}

async function searchWeb(query){
  // Public engines are unreliable from an automated local worker. Query the
  // fallbacks concurrently and use whichever produces usable links.
  const results=await Promise.allSettled([
    searchDdg(query),
    searchBing(query),
    searchMojeek(query)
  ]);
  const merged=[],seen=new Set();
  for(const r of results){
    if(r.status!=='fulfilled')continue;
    for(const item of r.value||[]){
      if(!item.url||seen.has(item.url))continue;
      seen.add(item.url);
      merged.push(item);
    }
  }
  return merged.slice(0,20);
}

function scoreCandidateLink(url,title,terms){
  const hay=(String(url)+' '+String(title)).toLowerCase();
  return terms.reduce((n,t)=>n+(hay.includes(t)?1:0),0);
}

function extractSameDomainLinks(html,baseUrl,terms){
  const baseHost=hostOf(baseUrl),out=[],seen=new Set();
  const re=/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;
  while((m=re.exec(html))){
    let url;try{url=new URL(m[1],baseUrl).href}catch{continue}
    if(hostOf(url)!==baseHost||seen.has(url))continue;
    if(isSearchResultUrl(url)||isSuspiciousEvidenceUrl(url))continue;
    const title=stripHtml(m[2]||'');if(looksGenericTitle(title))continue;
    const score=scoreCandidateLink(url,title,terms);if(score<2)continue;
    seen.add(url);out.push({url,title,snippet:'Direct source product candidate'});
  }
  return out.sort((a,b)=>scoreCandidateLink(b.url,b.title,terms)-scoreCandidateLink(a.url,a.title,terms)).slice(0,8);
}

async function probeKnownSource(source,name,terms){
  if(!source.domain)return [];
  const domain=String(source.domain).replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/$/,'');
  const root='https://'+domain;
  const q=encodeURIComponent(name);
  const attempts=[
    root+'/search?q='+q,
    root+'/search?query='+q,
    root+'/search?s='+q,
    root+'/?s='+q,
    root+'/search?keyword='+q
  ];
  if(domain.includes('ebay.')){
    attempts.unshift(root+'/sch/i.html?_nkw='+q);
  }
  if(domain.includes('vinted.')){
    attempts.unshift(root+'/catalog?search_text='+q);
  }
  const out=[],seen=new Set();
  for(const url of attempts){
    try{
      const {url:finalUrl,html}=await fetchText(url);
      for(const r of extractSameDomainLinks(html,finalUrl,terms)){
        if(!seen.has(r.url)){seen.add(r.url);out.push(r)}
      }
      if(out.length>=5)break;
    }catch(e){
      // Individual site search patterns commonly 404 or block; try the next pattern quietly.
    }
  }
  return out.slice(0,5);
}

async function discoverFromKnownSources(product,sources,evidenceScope='all'){
  const name=productName(product),terms=productTerms(product);
  const priority=[...sources].filter(s=>s.enabled&&s.domain&&sourceFitsScope(s,evidenceScope)).sort((a,b)=>(a.priority||999)-(b.priority||999)).slice(0,cfg.sourceProbeLimit);
  const out=[];
  for(const source of priority){
    const found=await probeKnownSource(source,name,terms);
    if(found.length)log('Direct source probe',source.domain,'returned',found.length,'result(s)');
    for(const r of found)out.push({...r,query:'direct:'+source.domain,host:hostOf(r.url)});
  }
  return out;
}

function hostOf(url){try{return new URL(url).hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}}
function isSearchHost(host){
  return ['duckduckgo.com','bing.com','google.com','google.co.uk','yahoo.com','search.yahoo.com','mojeek.com'].some(d=>host===d||host.endsWith('.'+d));
}

function isSearchResultUrl(value){
  try{
    const u=new URL(value);
    const host=hostOf(value),path=u.pathname.toLowerCase(),q=u.search.toLowerCase();
    if(isSearchHost(host))return true;
    if(/\/(search|catalog|sch)\/?$/.test(path)&&q)return true;
    if(path.includes('/search/')||path.includes('/search?')||path.includes('/catalog'))return true;
    if(/[?&](q|s|query|search_text|keyword|_nkw)=/.test(q))return true;
    return false;
  }catch{return true}
}

function normaliseIdentityText(v){
  return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function looksGenericTitle(v){
  const x=normaliseIdentityText(v);
  if(!x||x.length<8)return true;
  return /^(skip to content|generate help code|search|home|shop|menu|page not found|continue shopping|cookie consent|privacy policy|accessibility|sign in|basket)(\b|$)/.test(x);
}
function evidenceMatchesProduct(product,candidate){
  const model=normaliseIdentityText(product?.model);
  const manufacturer=normaliseIdentityText(product?.manufacturer);
  const title=normaliseIdentityText(candidate?.discovered_title||candidate?._evidence_title);
  const text=normaliseIdentityText(candidate?._evidence_text);
  if(!model||(!title.includes(model)&&!text.includes(model)))return false;
  if(looksGenericTitle(candidate?.discovered_title||candidate?._evidence_title))return false;
  if(manufacturer&&text&&title&&!title.includes(manufacturer)&&!text.includes(manufacturer))return false;
  return true;
}

function sourceFitsScope(source,scope){
  if(scope==='all')return true;
  const kind=String(source?.source_kind||'').toLowerCase();
  const cc=String(source?.country_code||'').toUpperCase();
  const rs=String(source?.research_scope||'').toLowerCase();
  if(rs&&rs!==scope&&rs!=='all')return false;
  if(scope==='new_uk')return cc==='GB'&&['retailer','manufacturer'].includes(kind);
  if(scope==='used_uk')return cc==='GB'&&['marketplace','used_dealer','auction'].includes(kind);
  if(scope==='overseas')return cc&&cc!=='GB';
  return true;
}

async function getRunEvidenceScope(runId){
  const {data,error}=await sb.from('quote_catalog_ai_research_runs').select('evidence_scope').eq('id',runId).single();
  if(error)throw error;
  return ['all','new_uk','used_uk','overseas'].includes(data?.evidence_scope)?data.evidence_scope:'all';
}

async function collectEvidence(product,sources,evidenceScope='all'){
  const name=productName(product);
  if(!name)throw new Error('Catalogue product has no usable manufacturer/model name.');

  const terms=productTerms(product);
  const priority=[...sources].filter(s=>s.enabled&&sourceFitsScope(s,evidenceScope)).sort((a,b)=>(a.priority||999)-(b.priority||999)).slice(0,12);
  const coreQueries=evidenceScope==='new_uk'
    ? ['"'+name+'" UK price','"'+name+'" new UK retailer','"'+name+'" buy UK']
    : evidenceScope==='used_uk'
      ? ['"'+name+'" used UK','"'+name+'" eBay UK','"'+name+'" marketplace UK']
      : evidenceScope==='overseas'
        ? ['"'+name+'" price international','"'+name+'" overseas retailer','"'+name+'" buy']
        : ['"'+name+'" UK price','"'+name+'" used UK','"'+name+'" overseas price','"'+name+'" buy'];

  const seen=new Map();
  async function addResults(q){
    const results=await searchWeb(q);
    log('Search',q,'returned',results.length,'result(s)');
    for(const r of results){
      const host=hostOf(r.url);
      if(!host||seen.has(r.url))continue;
      seen.set(r.url,{...r,query:q,host});
    }
  }

  // First do broad searches only. Do not waste several minutes running every
  // site: query when the public engines are clearly blocked.
  for(const q of coreQueries){
    await addResults(q);
    // We only need a small pool before moving on to page collection.
    if(seen.size>=6)break;
  }

  // If broad search is weak, immediately switch to the approved source registry.
  if(seen.size<3){
    log('Broad search produced too few results; switching immediately to direct approved-source probes.');
    const direct=await discoverFromKnownSources(product,sources,evidenceScope);
    for(const r of direct){
      if(!seen.has(r.url))seen.set(r.url,r);
    }
  }else{
    // Only use a small number of targeted site searches when broad search is healthy.
    for(const s of priority.slice(0,4)){
      if(s.domain)await addResults('site:'+s.domain+' "'+name+'"');
    }
  }

  const ranked=[...seen.values()].sort((a,b)=>{
    const ap=priority.find(s=>String(s.domain||'').replace(/^www\./,'').toLowerCase()===a.host)?.priority??999;
    const bp=priority.find(s=>String(s.domain||'').replace(/^www\./,'').toLowerCase()===b.host)?.priority??999;
    return ap-bp;
  }).slice(0,cfg.maxResults);

  const pages=[];
  for(const r of ranked){
    if(isSearchResultUrl(r.url)||isSuspiciousEvidenceUrl(r.url))continue;
    try{
      const {url,html}=await fetchText(r.url);
      const meta=extractStructuredPageData(html,url);
      const finalUrl=meta.url||url;
      if(isSearchResultUrl(finalUrl)||isSuspiciousEvidenceUrl(finalUrl))continue;
      const text=stripHtml(html).slice(0,12000);
      const title=meta.title||r.title||'';
      if(looksGenericTitle(title))continue;
      if(!hasExactModelEvidence(product,title,text))continue;
      const source=priority.find(x=>String(x.domain||'').replace(/^www\./,'').toLowerCase()===hostOf(finalUrl));
      if(String(source?.source_kind||'').toLowerCase()!=='manufacturer'&&meta.price===null){
        log('Rejected page without verified market price:',hostOf(finalUrl),title);continue;
      }
      pages.push({...r,url:finalUrl,title,text,discovered_price:meta.price,discovered_currency:meta.currency||null,discovered_availability:meta.availability||null,structured_product:meta.product===true});
    }catch(e){log('Page fetch blocked/unavailable:',r.host,e.message)}
  }

  log('Collected',pages.length,'usable evidence item(s) from',ranked.length,'discovered result(s).');
  return pages;
}
const schema={
  type:'object',
  properties:{
    candidates:{type:'array',items:{type:'object',properties:{
      evidence_id:{type:'integer'},source_url:{type:'string'},source_name:{type:'string'},source_country_code:{type:'string'},
      source_kind:{type:'string'},discovered_title:{type:'string'},discovered_model_number:{type:'string'},
      price:{type:['number','null']},currency:{type:'string'},condition:{type:'string'},
      availability_status:{type:'string'},match_confidence:{type:'number'},evidence_category:{type:'string'},
      market_region:{type:'string'},package_match:{type:'string'},variant_match:{type:'string'},
      evidence_notes:{type:'string'}
    },required:['evidence_id','source_url','source_name','source_kind','discovered_title','price','currency','condition','availability_status','match_confidence','evidence_category','market_region','package_match','variant_match','evidence_notes']}},
    discovered_sources:{type:'array',items:{type:'object',properties:{
      source_url:{type:'string'},source_name:{type:'string'},source_country_code:{type:'string'},
      source_kind:{type:'string'},evidence_category:{type:'string'}
    },required:['source_url','source_name','source_kind','evidence_category']}}
  },
  required:['candidates','discovered_sources']
};

async function analyse(product,sources,pages,evidenceScope='all'){
  const known=sources.map(s=>({id:s.id,name:s.source_name,domain:s.domain,country:s.country_code,kind:s.source_kind,scope:s.research_scope}));
  const evidence=pages.map((p,i)=>({id:i+1,url:p.url,title:p.title,snippet:p.snippet,price:p.discovered_price??null,currency:p.discovered_currency??null,availability:p.discovered_availability??null,structured_product:p.structured_product===true,text:p.text}));
  const prompt=`You are the validation layer for a GearCashOut resale catalogue.

EXACT PRODUCT:
${JSON.stringify(product)}

KNOWN SOURCE REGISTRY:
${JSON.stringify(known)}

COLLECTED WEB EVIDENCE:
${JSON.stringify(evidence)}

RESEARCH MODE: ${evidenceScope}

Rules:
- Every candidate MUST include evidence_id matching the numbered COLLECTED WEB EVIDENCE item used. The worker will verify the URL against that evidence item.
- Use ONLY URLs and factual evidence in COLLECTED WEB EVIDENCE. Never invent a URL, title, price or availability. Prefer collected evidence title and price fields when present.
- Exact model/variant/package matching is mandatory.
- New UK retail = evidence_category new_uk and bucket 1.
- Used UK = evidence_category used_uk and bucket 2. IMPORTANT: UK marketplace listings belong here even when the listing says new.
- Overseas = evidence_category overseas and bucket 3.
- Manufacturer product information = official, separate from market price evidence.
- If RESEARCH MODE is new_uk, return only new_uk candidates.
- If RESEARCH MODE is used_uk, return only used_uk candidates; UK marketplace listings belong here even when labelled new.
- If RESEARCH MODE is overseas, return only overseas candidates.
- If RESEARCH MODE is all, return all valid categories.
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
  const parsed=JSON.parse(text);

  // Local models occasionally emit an enum value that is semantically clear
  // but not one of the strict database values. Normalise those values here
  // rather than failing the entire product and losing otherwise valid research.
  const validMatch=new Set(['exact','compatible','uncertain','mismatch']);
  const normaliseMatch=v=>{
    const s=String(v||'uncertain').trim().toLowerCase();
    if(validMatch.has(s))return s;
    if(['match','yes','true','matched','correct','same'].includes(s))return 'exact';
    if(['partial','compatible','close'].includes(s))return 'compatible';
    if(['no','false','different','incorrect','wrong'].includes(s))return 'mismatch';
    if(['likely','probable','possible','unknown','unclear','n/a','na'].includes(s))return 'uncertain';
    return 'uncertain';
  };
  const validCondition=new Set(['new','used','refurbished','unknown']);
  const validKind=new Set(['manufacturer','retailer','marketplace','used_dealer','auction','other']);
  const validCategory=new Set(['new_uk','used_uk','overseas','official']);
  const normaliseCategory=v=>{
    const s=String(v||'').trim().toLowerCase();
    if(validCategory.has(s))return s;
    if(s.includes('official')||s.includes('manufacturer'))return 'official';
    if(s.includes('used')||s.includes('marketplace')||s.includes('second'))return 'used_uk';
    if(s.includes('new')&&s.includes('uk'))return 'new_uk';
    return 'overseas';
  };
  const normaliseCondition=v=>validCondition.has(String(v||'').toLowerCase())?String(v).toLowerCase():'unknown';
  const normaliseKind=v=>validKind.has(String(v||'').toLowerCase())?String(v).toLowerCase():'other';

  parsed.candidates=Array.isArray(parsed.candidates)?parsed.candidates:[];
  parsed.discovered_sources=Array.isArray(parsed.discovered_sources)?parsed.discovered_sources:[];
  parsed.candidates=parsed.candidates.map(c=>({
    ...c,
    package_match:normaliseMatch(c.package_match),
    variant_match:normaliseMatch(c.variant_match),
    condition:normaliseCondition(c.condition),
    source_kind:normaliseKind(c.source_kind),
    evidence_category:normaliseCategory(c.evidence_category),
    market_region:String(c.market_region||'').toUpperCase()==='UK'||normaliseCategory(c.evidence_category)==='new_uk'||normaliseCategory(c.evidence_category)==='used_uk'?'UK':normaliseCategory(c.evidence_category)==='official'?'official':'overseas',
    match_confidence:Math.max(0,Math.min(1,Number(c.match_confidence||0)))
  }));
  return parsed;
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

async function submitCandidate(runId,productId,product,c,sourceMap){
  if(!c.source_url||!/^https?:\/\//i.test(c.source_url))return false;
  if(isSearchResultUrl(c.source_url)||isSuspiciousEvidenceUrl(c.source_url)){log('Rejected non-product URL:',c.source_url);return false;}
  if(looksGenericTitle(c.discovered_title)){log('Rejected generic listing title:',c.discovered_title);return false;}
  if(!evidenceMatchesProduct(product,c)){log('Rejected weak product match:',c.source_url);return false;}
  if(c.evidence_category!=='official'&&(!Number.isFinite(Number(c.price))||Number(c.price)<=0)){log('Rejected candidate without a usable price:',c.source_url);return false;}
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

    const evidenceScope=await getRunEvidenceScope(item.run_id);
    log('Research evidence scope:',evidenceScope);
    const pages=await collectEvidence(product,sources||[],evidenceScope);
    if(!pages.length)throw new Error('No usable web pages were collected for this product.');

    // Learn newly encountered websites immediately, even if Ollama later rejects their price evidence.
    const sourceMapBefore=new Map((sources||[]).map(s=>[String(s.domain||'').replace(/^www\./,'').toLowerCase(),s]));
    for(const page of pages){
      const host=hostOf(page.url);
      if(host&&!sourceMapBefore.has(host)){
        try{
          await registerSource({
            source_url:page.url,
            source_name:host,
            source_country_code:null,
            source_kind:'other',
            evidence_category:'discovered'
          });
          sourceMapBefore.set(host,{domain:host});
          log('Learned new source:',host);
        }catch(e){log('Source registry warning:',host,e.message)}
      }
    }

    const research=await analyse(product,sources||[],pages,evidenceScope);
    const sourceMap=new Map((sources||[]).map(s=>[String(s.domain||'').replace(/^www\./,'').toLowerCase(),s]));
    for(const s of research.discovered_sources||[]){
      if(s.source_url&&!sourceMap.has(hostOf(s.source_url))){
        try{await registerSource(s)}catch{}
      }
    }

    let submitted=0;
    const seenCandidateUrls=new Set();
    for(const raw of (research.candidates||[]).slice(0,25)){
      const evidenceId=Math.trunc(Number(raw.evidence_id));
      const page=pages[evidenceId-1];
      if(!page){log('Rejected candidate with invalid evidence_id:',raw.evidence_id);continue;}
      const c={...raw,
        source_url:page.url,
        _evidence_title:page.title,
        _evidence_text:page.text
      };
      const dedupeKey=String(c.source_url).split('#')[0];
      if(seenCandidateUrls.has(dedupeKey))continue;
      seenCandidateUrls.add(dedupeKey);
      if(await submitCandidate(item.run_id,item.catalog_product_id,product,c,sourceMap))submitted++;
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
    return true;
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
