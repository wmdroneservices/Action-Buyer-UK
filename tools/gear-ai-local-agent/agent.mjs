import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(file){
  try{
    if(!fs.existsSync(file))return false;
    const text=fs.readFileSync(file,'utf8');
    for(const raw of text.split(/\r?\n/)){
      const line=raw.trim();
      if(!line||line.startsWith('#'))continue;
      const i=line.indexOf('=');
      if(i<0)continue;
      const k=line.slice(0,i).trim(),v=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');
      // Earlier files win. The permanent external configuration is loaded first,
      // so a repository-local .env can never silently overwrite your real keys.
      if(!process.env[k])process.env[k]=v;
    }
    return true;
  }catch{return false}
}

function loadEnv(){
  const external=process.env.GEARCASHOUT_CONFIG_PATH||
    (process.platform==='win32'?'C:\\GearCashOut-Config\\.env':'/etc/gearcashout/.env');
  const local=new URL('./.env',import.meta.url);
  const loaded=[];
  if(loadEnvFile(external))loaded.push(external);
  if(loadEnvFile(local))loaded.push('repository .env');
  return {external,loaded};
}

const envConfig=loadEnv();

const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
for(const key of required)if(!process.env[key]){
  throw new Error(key+' is required. Preferred location: '+envConfig.external);
}

const cfg={
  supabaseUrl:process.env.SUPABASE_URL,
  serviceKey:process.env.SUPABASE_SERVICE_ROLE_KEY,
  ollamaUrl:(process.env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,''),
  model:process.env.OLLAMA_MODEL||'gemma3:4b',
  pollSeconds:Math.max(5,Number(process.env.POLL_SECONDS||15)),
  maxResults:Math.max(5,Math.min(30,Number(process.env.MAX_RESULTS_PER_PRODUCT||20))),
  requestTimeoutMs:Math.max(5000,Number(process.env.REQUEST_TIMEOUT_MS||15000)),
  sourceProbeLimit:Math.max(3,Math.min(20,Number(process.env.SOURCE_PROBE_LIMIT||12))),
  googleSearchEnabled:process.env.GOOGLE_SEARCH_ENABLED!=='false',
  googleSearchApiKey:String(process.env.GOOGLE_SEARCH_API_KEY||process.env.GOOGLE_API_KEY||'').trim(),
  googleWebSearchClientId:String(process.env.GOOGLE_WEB_SEARCH_CLIENT_ID||'').trim(),
  googleSearchUserIp:String(process.env.GOOGLE_SEARCH_USER_IP||'').trim(),
  googleCseId:String(process.env.GOOGLE_CSE_ID||'').trim(),
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
    version:'1.4.0',
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

async function processRemoteCommand(){
  const {data,error}=await sb.from('quote_catalog_ai_agent_commands')
    .select('*').eq('agent_id',cfg.agentId).eq('status','queued').order('requested_at').limit(1).maybeSingle();
  if(error)throw error;
  if(!data)return false;
  await sb.from('quote_catalog_ai_agent_commands').update({status:'claimed',claimed_at:new Date().toISOString()}).eq('id',data.id).eq('status','queued');
  try{
    if(data.command==='check_status'){
      await sb.from('quote_catalog_ai_agent_commands').update({status:'completed',completed_at:new Date().toISOString(),result:{worker:'running',model:cfg.model,agent:cfg.agentName}}).eq('id',data.id);
      return true;
    }
    if(data.command==='check_ollama'){
      await ensureOllama();
      await sb.from('quote_catalog_ai_agent_commands').update({status:'completed',completed_at:new Date().toISOString(),result:{ollama:'online',model:cfg.model}}).eq('id',data.id);
      return true;
    }
    if(data.command==='stop_worker'){
      await sb.from('quote_catalog_ai_agent_commands').update({status:'completed',completed_at:new Date().toISOString(),result:{worker:'stopping'}}).eq('id',data.id);
      log('Remote dashboard requested worker stop.');
      setTimeout(()=>process.exit(0),500);
      return true;
    }
    if(data.command==='restart_worker'){
      await sb.from('quote_catalog_ai_agent_commands').update({status:'failed',completed_at:new Date().toISOString(),error:'Automatic process restart is not available in this installation. Stop and start the worker from the dashboard after installing the restart helper.'}).eq('id',data.id);
      return true;
    }
  }catch(e){
    await sb.from('quote_catalog_ai_agent_commands').update({status:'failed',completed_at:new Date().toISOString(),error:(e.message||String(e)).slice(0,1000)}).eq('id',data.id);
    return true;
  }
  return false;
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
  // Build one clean search identity. Catalogue package_name often repeats the
  // model or the complete manufacturer + model, so remove those prefixes before
  // constructing the query.
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const manufacturer=clean(p.manufacturer);
  const model=clean(p.model);
  let packageName=clean(p.package_name);

  const full=clean([manufacturer,model].filter(Boolean).join(' '));
  const startsWithCI=(value,prefix)=>prefix&&value.toLowerCase().startsWith(prefix.toLowerCase());

  if(packageName){
    if(full&&packageName.toLowerCase()===full.toLowerCase()) packageName='';
    else if(startsWithCI(packageName,full)){
      packageName=clean(packageName.slice(full.length));
    }else if(startsWithCI(packageName,model)){
      packageName=clean(packageName.slice(model.length));
    }
  }

  return clean([manufacturer,model,packageName].filter(Boolean).join(' '));
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
  let canonical=finalUrl,currency='',availability='',product=false;
  const source=String(html||'');
  const cm=source.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if(cm){try{canonical=new URL(cm[1],finalUrl).href}catch{}}

  const og=source.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i)||source.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:title["']/i);
  const tt=source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle=stripHtml(og?og[1]:(tt?tt[1]:''));

  // Some Shopify pages contain JSON-LD for related/recommended products as well
  // as the actual page product. Never simply use the last Product object: that
  // can attach another product's £price/title to the current page URL.
  const scripts=source.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)||[];
  const products=[];
  for(const script of scripts){
    const m=script.match(/>([\s\S]*?)<\/script>/i),parsed=m?safeJson(m[1].trim()):null;
    for(const node of flattenJsonLd(parsed)){
      const types=Array.isArray(node?.['@type'])?node['@type']:[node?.['@type']];
      if(!types.map(x=>String(x).toLowerCase()).includes('product'))continue;
      const name=stripHtml(node.name||'');
      const offers=Array.isArray(node.offers)?node.offers[0]:node.offers;
      let price=null,cur='',avail='';
      if(offers&&typeof offers==='object'){
        const raw=offers.price??offers.lowPrice??'';
        const p=Number(String(raw).replace(/[^0-9.]/g,''));
        if(Number.isFinite(p)&&p>0)price=p;
        cur=String(offers.priceCurrency||'').toUpperCase();
        avail=String(offers.availability||'').split('/').pop();
      }
      products.push({name,price,currency:cur,availability:avail});
    }
  }

  const words=v=>new Set(normaliseIdentityText(v).split(/\s+/).filter(x=>x.length>1&&!['used','new','product','camera','flash','unit'].includes(x)));
  const pageWords=words(pageTitle+' '+decodeURIComponent(new URL(canonical).pathname));
  const scoreProduct=p=>{
    const pw=words(p.name);
    let overlap=0;for(const w of pw)if(pageWords.has(w))overlap++;
    const pageNorm=normaliseIdentityText(pageTitle);
    const nameNorm=normaliseIdentityText(p.name);
    if(pageNorm&&nameNorm&&(pageNorm.includes(nameNorm)||nameNorm.includes(pageNorm)))overlap+=8;
    return overlap;
  };
  const selected=products.map(p=>({...p,_score:scoreProduct(p)})).sort((a,b)=>b._score-a._score)[0]||null;

  // Only trust structured Product data when it clearly describes this page.
  const selectedMatches=selected&&selected._score>=2;
  let title=pageTitle;
  let price=selectedMatches?selected.price:null;
  currency=selectedMatches?selected.currency:'';
  availability=selectedMatches?selected.availability:'';
  product=!!selectedMatches;

  // If the primary page title is missing/generic, a strongly matching Product name
  // is safer than leaving the title blank.
  if((!title||looksGenericTitle(title))&&selectedMatches&&selected.name)title=selected.name;

  // Metadata price is a fallback only; it must not replace a verified price from
  // the matching Product JSON-LD.
  const mp=source.match(/<meta[^>]+(?:property|name|itemprop)=["'](?:product:price:amount|price)["'][^>]+content=["']([^"']+)["']/i)||source.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["'](?:product:price:amount|price)["']/i);
  if(price===null&&mp){
    const p=Number(String(mp[1]).replace(/[^0-9.]/g,''));
    if(Number.isFinite(p)&&p>0)price=p;
  }

  // Common retailer pages expose the displayed selling price as plain text.
  // Use it only as a last fallback and only from a short context around labels
  // such as "Our Price", avoiding unrelated navigation/recommendation prices.
  if(price===null){
    const visible=stripHtml(source);
    const pm=visible.match(/(?:our\s*price|price)\s*[:\-]?\s*(?:£|GBP\s*)([0-9]{1,6}(?:[,.][0-9]{2})?)/i);
    if(pm){
      const p=Number(String(pm[1]).replace(/,/g,''));
      if(Number.isFinite(p)&&p>0){price=p;currency='GBP';}
    }
  }

  return {url:canonical,title:stripHtml(title||''),price,currency,availability,product};
}
function isSuspiciousEvidenceUrl(value){try{const u=new URL(value),p=(u.pathname+' '+u.search).toLowerCase();return /skip[-_ ]?to[-_ ]?content|generate[-_ ]?help[-_ ]?code/.test(p)||/\/(account|cart|checkout|help|contact|about|policy|policies)\/?$/.test(u.pathname.toLowerCase())}catch{return true}}
function hasExactModelEvidence(product,title,text,url=''){const model=normaliseIdentityText(product?.model);if(!model)return false;if(pageLooksLikeError(text,title))return false;const hay=normaliseIdentityText([title,text,url].filter(Boolean).join(' '));return hay.includes(model)}

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
      out.push({url:key,title,snippet:'',provider:'web'});
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

let lastOpeningSourceCheckAt=0;
const OPENING_SOURCE_CHECK_MS=10*60*1000;

async function monitorOpeningSoonSources(force=false){
  if(!force&&Date.now()-lastOpeningSourceCheckAt<OPENING_SOURCE_CHECK_MS)return;
  lastOpeningSourceCheckAt=Date.now();

  const {data:rows,error}=await sb.from('quote_catalog_ai_sources')
    .select('id,source_name,domain,homepage_url,enabled,site_status,monitor_for_opening,opened_at')
    .eq('monitor_for_opening',true);
  if(error){
    log('Opening-source monitor warning:',error.message);
    return;
  }

  for(const source of rows||[]){
    const url=source.homepage_url||('https://'+String(source.domain||'').replace(/^www\\./,'')+'/');
    if(!/^https?:\\/\\//i.test(url))continue;
    try{
      const {html}=await fetchText(url,8000);
      const text=stripHtml(html).toLowerCase();
      const openingSoon=/\\bopening\\s+soon\\b/.test(text)||/be\\s+the\\s+first\\s+to\\s+know\\s+when\\s+we\\s+launch/.test(text);
      const liveStore=/\\b(add to cart|buy now|in stock|shop now|checkout)\\b/.test(text);

      if(openingSoon&&!liveStore){
        await sb.from('quote_catalog_ai_sources').update({
          enabled:false,
          site_status:'opening_soon',
          opening_soon_detected_at:new Date().toISOString(),
          last_status_checked_at:new Date().toISOString(),
          status_note:'Still displaying a public "Opening soon" storefront.'
        }).eq('id',source.id);
        log('Opening-source monitor:',source.domain,'still opening soon.');
        continue;
      }

      // A monitored storefront is considered live only after the opening screen
      // has disappeared and normal store signals are visible. The first_live date
      // is preserved permanently once recorded.
      if(!openingSoon&&liveStore){
        const now=new Date().toISOString();
        await sb.from('quote_catalog_ai_sources').update({
          enabled:true,
          site_status:'live',
          opened_at:source.opened_at||now,
          last_status_checked_at:now,
          status_note:'Live storefront detected automatically by the GearCashOut research worker.'
        }).eq('id',source.id);
        log('Opening-source monitor:',source.domain,'is LIVE. Research source enabled; opened_at recorded.');
        continue;
      }

      await sb.from('quote_catalog_ai_sources').update({
        site_status:'unknown',
        last_status_checked_at:new Date().toISOString(),
        status_note:'Store status could not yet be classified automatically; monitoring will continue.'
      }).eq('id',source.id);
      log('Opening-source monitor:',source.domain,'status currently unknown; continuing to monitor.');
    }catch(e){
      await sb.from('quote_catalog_ai_sources').update({
        last_status_checked_at:new Date().toISOString(),
        status_note:'Status check failed: '+String(e.message||e).slice(0,300)
      }).eq('id',source.id);
      log('Opening-source monitor warning:',source.domain,e.message);
    }
  }
}

const searchCooldownUntil=new Map();
const searchConfigNotice=new Set();

function searchEngineAvailable(name){
  return (searchCooldownUntil.get(name)||0)<=Date.now();
}
function coolSearchEngine(name,message){
  const wait=10*60*1000;
  searchCooldownUntil.set(name,Date.now()+wait);
  if(!searchConfigNotice.has(name+':cooldown')){
    searchConfigNotice.add(name+':cooldown');
    log(name,'temporarily cooling down for 10 minutes:',message);
  }
}
function noteSearchUnavailable(name,message){
  const key=name+':unavailable';
  if(!searchConfigNotice.has(key)){
    searchConfigNotice.add(key);
    log(name,'not configured:',message);
  }
}

async function searchGoogle(query){
  if(!cfg.googleSearchEnabled)return [];
  if(!cfg.googleSearchApiKey){
    noteSearchUnavailable('Google search','set GOOGLE_SEARCH_API_KEY to enable an official Google API integration.');
    return [];
  }
  if(!searchEngineAvailable('Google'))return [];

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.min(cfg.requestTimeoutMs,8000));
  try{
    let res,mode='';

    // Current Google Web Search Service integration. This requires a designated
    // partner client ID and an end-user IP address, so use it automatically when
    // those credentials are configured.
    if(cfg.googleWebSearchClientId&&cfg.googleSearchUserIp){
      mode='web-search-service';
      const params=new URLSearchParams({
        'clientContext.clientId':cfg.googleWebSearchClientId,
        'userContext.ipAddress':cfg.googleSearchUserIp,
        'userContext.regionCode':'GB',
        'searchQuery.query':query,
        'searchQuery.languageCode':'en',
        'searchQuery.restrictRegionCode':'GB',
        'searchQuery.safeSearch':'ON',
        'pageSize':'10'
      });
      res=await fetch('https://websearchservice.googleapis.com/v1:search?'+params.toString(),{
        signal:controller.signal,
        headers:{Accept:'application/json','X-Goog-Api-Key':cfg.googleSearchApiKey}
      });
    }else if(cfg.googleCseId){
      // Compatibility mode for an existing Google Programmable Search engine.
      mode='programmable-search';
      const params=new URLSearchParams({
        key:cfg.googleSearchApiKey,
        cx:cfg.googleCseId,
        q:query,
        num:'10',
        gl:'uk',
        hl:'en'
      });
      res=await fetch('https://www.googleapis.com/customsearch/v1?'+params.toString(),{
        signal:controller.signal,
        headers:{Accept:'application/json'}
      });
    }else{
      noteSearchUnavailable('Google search','configure GOOGLE_WEB_SEARCH_CLIENT_ID + GOOGLE_SEARCH_USER_IP, or an existing GOOGLE_CSE_ID for compatibility mode.');
      return [];
    }

    if(!res.ok){
      const detail=(await res.text()).slice(0,180);
      if(res.status===403||res.status===429)coolSearchEngine('Google','HTTP '+res.status+' '+detail);
      throw new Error(mode+' HTTP '+res.status);
    }

    const data=await res.json();
    const items=mode==='web-search-service'?(data.searchResults||[]):(data.items||[]);
    return items.map(item=>({
      url:item.displayUrl||item.link,
      title:stripHtml(item.title||''),
      snippet:stripHtml(item.snippet||''),
      provider:'google'
    })).filter(item=>item.url&&/^https?:\/\//i.test(item.url));
  }catch(e){
    if(!/HTTP (403|429)/.test(String(e.message||'')))log('Google search warning:',e.message);
    return [];
  }finally{
    clearTimeout(timer);
  }
}

async function searchDdg(query){
  // DDG often rate-limits automated requests. One short attempt is enough;
  // do not spend 30 seconds waiting on two endpoints.
  if(!searchEngineAvailable('DuckDuckGo'))return [];
  const url='https://html.duckduckgo.com/html/?q='+encodeURIComponent(query);
  try{
    const {html}=await fetchText(url,5000);
    return extractSearchLinks(html,url);
  }catch(e){
    if(/HTTP (403|429)/.test(String(e.message||'')))coolSearchEngine('DuckDuckGo',e.message);
    else log('DuckDuckGo search warning:',e.message);
    return [];
  }
}

async function searchBing(query){
  if(!searchEngineAvailable('Bing'))return [];
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
      out.push({url:href,title:stripHtml(m[2]||''),snippet:'',provider:'bing'});
      if(out.length>=20)break;
    }
    return out;
  }catch(e){
    if(/HTTP (403|429)/.test(String(e.message||'')))coolSearchEngine('Bing',e.message);
    else log('Bing search warning:',e.message);
    return [];
  }
}

async function searchMojeek(query){
  if(!searchEngineAvailable('Mojeek'))return [];
  const url='https://www.mojeek.com/search?q='+encodeURIComponent(query);
  try{
    const {html}=await fetchText(url);
    return extractSearchLinks(html,url);
  }catch(e){
    if(/HTTP (403|429)/.test(String(e.message||'')))coolSearchEngine('Mojeek',e.message);
    else log('Mojeek search warning:',e.message);
    return [];
  }
}

async function searchWeb(query){
  // Google Programmable Search is the primary discovery layer when configured.
  // DuckDuckGo, Bing and Mojeek run alongside it so one blocked provider never
  // stops the product research workflow.
  const results=await Promise.allSettled([
    searchGoogle(query),
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
      const {url:finalUrl,html}=await fetchText(url,Math.min(cfg.requestTimeoutMs,5000));
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
  const eligible=[...sources]
    .filter(s=>s.enabled&&s.domain&&sourceFitsScope(s,evidenceScope))
    .sort((a,b)=>(a.priority||999)-(b.priority||999));

  // "All markets" must not spend the entire probe budget on the first few
  // manufacturers. Deliberately cover new UK, used UK and overseas sources so
  // the worker can find the separate comparison prices the review workflow needs.
  const bucketFor=s=>{
    const explicit=String(s.research_scope||'').toLowerCase();
    if(['new_uk','used_uk','overseas','official'].includes(explicit))return explicit;
    const kind=String(s.source_kind||'other').toLowerCase();
    const cc=String(s.country_code||'').toUpperCase();
    if(kind==='manufacturer')return 'official';
    if(cc==='GB'&&kind==='retailer')return 'new_uk';
    if(cc==='GB'&&['marketplace','used_dealer','auction'].includes(kind))return 'used_uk';
    return 'overseas';
  };

  let priority=[];
  if(evidenceScope==='all'){
    const groups=new Map(['new_uk','used_uk','overseas','official'].map(k=>[k,eligible.filter(s=>bucketFor(s)===k)]));
    let index=0;
    while(priority.length<cfg.sourceProbeLimit){
      let added=false;
      for(const key of ['new_uk','used_uk','overseas','official']){
        const list=groups.get(key)||[];
        if(index<list.length){priority.push(list[index]);added=true;}
        if(priority.length>=cfg.sourceProbeLimit)break;
      }
      if(!added)break;
      index++;
    }
  }else{
    priority=eligible.slice(0,cfg.sourceProbeLimit);
  }

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
  return /^(skip to content|generate help code|search|home|shop|menu|page not found|continue shopping|cookie consent|privacy policy|accessibility|sign in|basket|404|not found)(\\b|$)/.test(x);
}
function pageLooksLikeError(text,title){
  const x=normaliseIdentityText([title,text].filter(Boolean).join(' '));
  return /\\b(page not found|404 not found|error 404|access denied|robot check|captcha)\\b/.test(x);
}
function productIdentityScore(product,title,text,url=''){
  const hay=normaliseIdentityText([title,text,url].filter(Boolean).join(' '));
  const manufacturer=normaliseIdentityText(product?.manufacturer);
  const model=normaliseIdentityText(product?.model);
  const pkg=normaliseIdentityText(product?.package_name);
  let score=0;
  if(manufacturer&&hay.includes(manufacturer))score+=3;
  if(model&&hay.includes(model))score+=6;
  if(pkg&&pkg.length>=6&&hay.includes(pkg))score+=4;
  return score;
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

function normalizeIdentity(value=''){
  return String(value).toLowerCase()
    .replace(/\b(the|camera|drone|digital|professional|standard package)\b/g,' ')
    .replace(/[^a-z0-9]+/g,' ')
    .trim().replace(/\s+/g,' ');
}

async function checkCatalogueDuplicate(candidate={}){
  // Research findings are never allowed to auto-create catalogue products.
  // This check only helps classify findings for manual review.
  const manufacturer=normalizeIdentity(candidate.manufacturer||'');
  const model=normalizeIdentity(candidate.model||candidate.discovered_model_number||'');
  const title=normalizeIdentity(candidate.title||candidate.discovered_title||'');

  const {data:products,error}=await sb.from('quote_catalog_products')
    .select('id,manufacturer,model,package_key,package_name,main_category,product_type,active')
    .limit(5000);
  if(error)throw error;

  const scored=(products||[]).map(p=>{
    const pm=normalizeIdentity(p.manufacturer);
    const pmodel=normalizeIdentity(p.model);
    const pname=normalizeIdentity([p.manufacturer,p.model,p.package_name].filter(Boolean).join(' '));
    let score=0;
    if(manufacturer&&pm===manufacturer)score+=0.25;
    if(model&&pmodel===model)score+=0.60;
    if(title&&pname&&title===pname)score+=0.75;
    if(model&&pmodel&& (model.includes(pmodel)||pmodel.includes(model)))score=Math.max(score,0.85);
    return {...p,duplicate_score:Math.min(score,1)};
  }).filter(p=>p.duplicate_score>=0.75)
    .sort((a,b)=>b.duplicate_score-a.duplicate_score);

  return {is_duplicate:scored.length>0,matches:scored.slice(0,5)};
}

async function getSharedSources(scope='all'){
  // Supabase project memory is the shared source brain used by the page AI,
  // this local worker and assistant-driven research.
  const {data,error}=await sb.rpc('gearcashout_shared_research_sources',{p_scope:scope});
  if(error){log('Shared source memory warning:',error.message);return [];}
  return (data||[]).map(s=>({...s,enabled:s.enabled!==false}));
}

async function learnSharedSource(sourceUrl, sourceName, sourceKind='other', scope='discovered', notes=null){
  if(!sourceUrl||!/^https?:\/\//i.test(sourceUrl))return;
  const {error}=await sb.rpc('gearcashout_learn_research_source',{
    p_source_url:sourceUrl,
    p_source_name:sourceName||null,
    p_source_kind:sourceKind||'other',
    p_scope:scope||'discovered',
    p_notes:notes||'Discovered and validated by the local GearCashOut research worker.'
  });
  if(error)log('Shared source learning warning:',error.message);
}

async function getRunEvidenceScope(runId){
  const {data,error}=await sb.from('quote_catalog_ai_research_runs').select('evidence_scope').eq('id',runId).single();
  if(error)throw error;
  return ['all','new_uk','used_uk','overseas'].includes(data?.evidence_scope)?data.evidence_scope:'all';
}

async function recordRawDiscoveries(context={},discoveries=[]){
  if(!context.runId||!context.productId||!discoveries.length)return;
  const rows=discoveries.filter(r=>r?.url).map(r=>({
    run_id:context.runId,
    catalog_product_id:context.productId,
    queue_id:context.queueId||null,
    evidence_scope:r.scope_hint||context.evidenceScope||'all',
    source_url:String(r.url).split('#')[0],
    host:hostOf(r.url)||null,
    discovered_title:r.title||null,
    source_provider:r.provider||r.query||'direct',
    discovery_status:'found',
    reason:null,
    updated_at:new Date().toISOString()
  }));
  if(!rows.length)return;
  const {error}=await sb.from('quote_catalog_ai_discoveries')
    .upsert(rows,{onConflict:'run_id,source_url'});
  if(error)log('Raw discovery log warning:',error.message);
}


async function collectEvidence(product,sources,evidenceScope='all',context={}){
  const name=productName(product);
  if(!name)throw new Error('Catalogue product has no usable manufacturer/model name.');

  // In ALL mode we deliberately research each market independently. A healthy
  // new-retail search must never stop the worker before it has looked for used
  // UK and overseas evidence for the same exact product.
  const scopes=evidenceScope==='all'?['new_uk','used_uk','overseas']:[evidenceScope];
  const seen=new Map();

  const queriesFor=scope=>scope==='new_uk'
    ? ['"'+name+'" UK price','"'+name+'" new UK retailer','"'+name+'" buy UK']
    : scope==='used_uk'
      ? ['"'+name+'" used UK','"'+name+'" second hand UK','"'+name+'" eBay UK']
      : ['"'+name+'" price international','"'+name+'" overseas retailer','"'+name+'" international buy'];

  async function addResults(q,scope){
    const results=await searchWeb(q);
    log('Search',q,'returned',results.length,'result(s)');
    for(const r of results){
      const host=hostOf(r.url);
      if(!host)continue;
      const key=String(r.url).split('#')[0];
      if(!seen.has(key))seen.set(key,{...r,url:key,query:q,host,scope_hint:scope});
    }
    return results.length;
  }

  for(const scope of scopes){
    const priority=[...sources]
      .filter(s=>s.enabled&&sourceFitsScope(s,scope))
      .sort((a,b)=>(a.priority||999)-(b.priority||999))
      .slice(0,Math.max(4,Math.ceil(cfg.sourceProbeLimit/2)));

    let foundForScope=0;
    for(const q of queriesFor(scope)){
      foundForScope+=await addResults(q,scope);
      // Keep searching this scope long enough to obtain market diversity.
      if(foundForScope>=8)break;
    }

    // Always give the approved registry a chance in each requested market.
    // Search engines often return new retail pages while missing used dealers.
    const direct=await discoverFromKnownSources(product,priority,scope);
    if(direct.length)log('Approved-source fallback',scope,'returned',direct.length,'result(s)');
    for(const r of direct){
      const key=String(r.url).split('#')[0];
      if(!seen.has(key))seen.set(key,{...r,url:key,host:hostOf(r.url),scope_hint:scope});
    }
  }

  const sourceFor=host=>[...sources]
    .filter(s=>String(s.domain||'').replace(/^www\\./,'').toLowerCase()===host)
    .sort((a,b)=>(a.priority||999)-(b.priority||999))[0]||null;

  // Preserve market diversity when trimming the discovery pool.
  const byScope=new Map(scopes.map(s=>[s,[]]));
  for(const r of seen.values()){
    const bucket=byScope.has(r.scope_hint)?r.scope_hint:scopes[0];
    byScope.get(bucket).push(r);
  }
  for(const list of byScope.values())list.sort((a,b)=>{
    const ap=sourceFor(a.host)?.priority??999,bp=sourceFor(b.host)?.priority??999;
    return ap-bp;
  });

  const ranked=[];
  const perScope=Math.max(3,Math.floor(cfg.maxResults/scopes.length));
  for(const scope of scopes)ranked.push(...(byScope.get(scope)||[]).slice(0,perScope));
  if(ranked.length<cfg.maxResults){
    const used=new Set(ranked.map(r=>r.url));
    for(const r of [...seen.values()]){
      if(ranked.length>=cfg.maxResults)break;
      if(!used.has(r.url)){ranked.push(r);used.add(r.url);}
    }
  }

  // Persist every discovered result before validation. The dashboard can therefore
  // show what the worker actually found even when a page is later rejected as
  // blocked, irrelevant, or lacking a verified market price.
  await recordRawDiscoveries({...context,evidenceScope},ranked);

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
      if(looksGenericTitle(title)||pageLooksLikeError(text,title))continue;
      if(!hasExactModelEvidence(product,title,text,finalUrl))continue;
      if(!meta.product&&productIdentityScore(product,title,text,finalUrl)<6)continue;
      const source=sourceFor(hostOf(finalUrl));
      if(String(source?.source_kind||'').toLowerCase()!=='manufacturer'&&meta.price===null){
        log('Rejected page without verified market price:',hostOf(finalUrl),title);continue;
      }
      pages.push({...r,url:finalUrl,title,text,
        discovered_price:meta.price,
        discovered_currency:meta.currency||null,
        discovered_availability:meta.availability||null,
        structured_product:meta.product===true
      });
    }catch(e){log('Page fetch blocked/unavailable:',r.host,e.message)}
  }

  const counts={};
  for(const p of pages)counts[p.scope_hint]=(counts[p.scope_hint]||0)+1;
  log('Collected',pages.length,'usable evidence item(s):',JSON.stringify(counts));
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
- Multiple prices for the same exact product are expected and desirable. NEVER merge new and used evidence into one candidate.
- Return separate candidates for separate exact listings/pages, even where they are from the same retailer.
- Example: a NEW Canon listing at £249 and a USED Canon listing at £60 are two separate findings, each with its own exact title, condition, price and exact URL.
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
  if(!evidenceMatchesProduct(product,c)||productIdentityScore(product,c._evidence_title,c._evidence_text,c.source_url)<6){log('Rejected weak product match:',c.source_url);return false;}
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
  if(!item){
    const {data:auto,error:autoError}=await sb.rpc('ai_research_enqueue_next_continuous');
    if(autoError)throw autoError;
    if(auto?.enqueued){
      log('Continuous research queued next product:',auto.product_name||auto.product_id,'·',auto.mode);
      return true;
    }
    return false;
  }

  log('Claimed product',item.catalog_product_id);
  try{
    await heartbeat('working',null,{run_id:item.run_id,product_id:item.catalog_product_id});
    const [{data:product,error:pErr},{data:legacySources,error:sErr}]=await Promise.all([
      sb.from('quote_catalog_products').select('*').eq('id',item.catalog_product_id).single(),
      sb.from('quote_catalog_ai_sources').select('*').eq('enabled',true).order('priority')
    ]);
    if(pErr)throw pErr;if(sErr)throw sErr;

    const evidenceScope=await getRunEvidenceScope(item.run_id);
    log('Research evidence scope:',evidenceScope);

    // Dynamic source loading: project memory is primary. The legacy AI-source
    // table remains a compatibility fallback while the page backend is migrated.
    const [sharedAll,sharedScoped]=await Promise.all([
      getSharedSources('all'),
      evidenceScope==='all'?Promise.resolve([]):getSharedSources(evidenceScope)
    ]);
    const sourceByDomain=new Map();
    for(const s of [...(legacySources||[]),...(sharedAll||[]),...(sharedScoped||[])]){
      const domain=String(s.domain||'').replace(/^www\./,'').toLowerCase();
      if(!domain)continue;
      const existing=sourceByDomain.get(domain);
      if(!existing || (s.priority||999)<(existing.priority||999))sourceByDomain.set(domain,{...existing,...s,enabled:s.enabled!==false});
    }
    const sources=[...sourceByDomain.values()];
    log('Loaded',sources.length,'dynamic research source(s) from shared memory + compatibility registry.');

    const pages=await collectEvidence(product,sources,evidenceScope,{
      runId:item.run_id,
      productId:item.catalog_product_id,
      queueId:item.queue_id,
      evidenceScope
    });
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
          await learnSharedSource(page.url,host,'other',page.scope_hint||'discovered',
            'Automatically discovered by the local worker while researching '+productName(product)+'.');
          sourceMapBefore.set(host,{domain:host});
          log('Learned new source into shared memory:',host);
        }catch(e){log('Source registry warning:',host,e.message)}
      }
    }

    // Re-read the registry after automatic source learning so subsequent candidates
    // use a real source_id rather than a host-only placeholder.
    const {data:latestSources,error:latestSourcesError}=await sb.from('quote_catalog_ai_sources').select('*').eq('enabled',true).order('priority');
    if(latestSourcesError)throw latestSourcesError;
    const research=await analyse(product,latestSources||sources||[],pages,evidenceScope);
    const sourceMap=new Map((latestSources||[]).map(s=>[String(s.domain||'').replace(/^www\\./,'').toLowerCase(),s]));
    for(const s of research.discovered_sources||[]){
      if(s.source_url&&!sourceMap.has(hostOf(s.source_url))){
        try{
          await registerSource(s);
          await learnSharedSource(
            s.source_url,
            s.source_name||hostOf(s.source_url),
            s.source_kind||'other',
            s.evidence_category||'discovered',
            'Source identified by Ollama from validated collected research evidence for '+productName(product)+'.'
          );
        }catch{}
      }
    }

    let submitted=0;
    const seenCandidateUrls=new Set();
    for(const raw of (research.candidates||[]).slice(0,25)){
      const evidenceId=Math.trunc(Number(raw.evidence_id));
      const page=pages[evidenceId-1];
      if(!page){log('Rejected candidate with invalid evidence_id:',raw.evidence_id);continue;}
      const knownSource=sourceMap.get(hostOf(page.url));
      const sourceClass=knownSource?classifyFromSource(knownSource):null;
      // The model may classify the evidence, but the actual listing facts are always
      // copied from the page we collected. This prevents "Unknown product", invented
      // titles, wrong links and missing comparison prices in the review queue.
      const c={...raw,
        source_url:page.url,
        discovered_title:page.title||raw.discovered_title||null,
        price:page.discovered_price??raw.price??null,
        currency:page.discovered_currency||raw.currency||'GBP',
        availability_status:page.discovered_availability||raw.availability_status||'unknown',
        source_name:knownSource?.source_name||hostOf(page.url)||raw.source_name||null,
        source_country_code:knownSource?.country_code||raw.source_country_code||null,
        source_kind:knownSource?.source_kind||raw.source_kind||'other',
        evidence_category:sourceClass?.evidence_category||raw.evidence_category,
        market_region:sourceClass?.market_region||raw.market_region,
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
  if(envConfig.loaded.length)log('Configuration loaded from:',envConfig.loaded.join(' + '));
  else log('No configuration file found. Preferred location:',envConfig.external);
  await heartbeat('starting',null,{ollama_url:cfg.ollamaUrl});
  await ensureOllama();
  await heartbeat('online',null,{ollama_url:cfg.ollamaUrl});
  log('Ready. Polling every',cfg.pollSeconds,'seconds.');

  setInterval(()=>heartbeat('online',null,{}).catch(e=>log('Heartbeat error',e.message)),30000);
  setInterval(()=>processRemoteCommand().catch(e=>log('Remote command error',e.message)),3000);

  while(true){
    try{
      await monitorOpeningSoonSources();
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
