import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(file){
  try{
    if(!fs.existsSync(file))return false;
    for(const raw of fs.readFileSync(file,'utf8').split(/\r?\n/)){
      const line=raw.trim();
      if(!line||line.startsWith('#'))continue;
      const i=line.indexOf('=');
      if(i<0)continue;
      const key=line.slice(0,i).trim();
      const value=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');
      if(!process.env[key])process.env[key]=value;
    }
    return true;
  }catch{return false}
}

const external=process.env.GEARCASHOUT_CONFIG_PATH||
  (process.platform==='win32'?'C:\\GearCashOut-Config\\.env':'/etc/gearcashout/.env');
loadEnvFile(external);
loadEnvFile(new URL('./.env',import.meta.url));

const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
for(const key of required)if(!process.env[key])throw new Error(key+' is required. Preferred location: '+external);

const cfg={
  agentId:process.env.AGENT_ID||'gear-local-agent-1',
  agentName:process.env.AGENT_NAME||'GearCashOut Local Research Agent',
  model:process.env.OLLAMA_MODEL||'gemma3:4b',
  ollamaUrl:(process.env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,''),
  pollMs:Math.max(2000,Number(process.env.SUPERVISOR_POLL_MS||5000))
};
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const log=(...x)=>console.log(new Date().toLocaleString('en-GB'),'[SUPERVISOR]',...x);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

let worker=null;
let stopping=false;
let shuttingDown=false;

function workerRunning(){
  return !!worker && worker.exitCode===null && !worker.killed;
}

async function heartbeat(status,last_error=null,extra={}){
  const metadata={control_online:true,worker_running:workerRunning(),...extra};
  const row={
    agent_id:cfg.agentId,
    agent_name:cfg.agentName,
    status,
    provider:'ollama',
    model:cfg.model,
    version:'1.5.0-supervisor',
    last_heartbeat_at:new Date().toISOString(),
    last_error,
    metadata,
    updated_at:new Date().toISOString()
  };
  const {error}=await sb.from('quote_catalog_ai_agents').upsert(row,{onConflict:'agent_id'});
  if(error)throw error;
}

async function emergencyStop(){
  try{
    const {data,error}=await sb.rpc('ai_research_emergency_stop');
    if(error)throw error;
    return data||null;
  }catch(e){
    log('Emergency database stop warning:',e.message||String(e));
    return null;
  }
}

function startWorker(){
  if(workerRunning())return false;
  stopping=false;
  const file=new URL('./agent.mjs',import.meta.url);
  const agentPath=fileURLToPath(file);
  const agentDir=fileURLToPath(new URL('.',import.meta.url));
  worker=spawn(process.execPath,[agentPath],{
    cwd:agentDir,
    stdio:'inherit',
    windowsHide:false
  });
  worker.on('exit',(code,signal)=>{
    log('Research worker exited.',{code,signal,stopping});
    worker=null;
    heartbeat('offline',null,{control_online:true,worker_running:false,last_worker_exit:{code,signal,stopping}}).catch(()=>{});
  });
  worker.on('error',err=>log('Worker process error:',err.message||String(err)));
  log('Research worker started. PID',worker.pid);
  return true;
}

async function stopWorker(){
  stopping=true;
  if(!workerRunning())return false;
  const child=worker;
  log('Stopping research worker PID',child.pid);
  try{child.kill('SIGTERM')}catch{}
  const deadline=Date.now()+5000;
  while(worker===child&&workerRunning()&&Date.now()<deadline)await sleep(100);
  if(worker===child&&workerRunning()){
    try{child.kill('SIGKILL')}catch{}
  }
  return true;
}

async function claimCommand(){
  const {data,error}=await sb.from('quote_catalog_ai_agent_commands')
    .select('*')
    .eq('agent_id',cfg.agentId)
    .eq('status','queued')
    .in('command',['check_status','check_ollama','start_worker','restart_worker','stop_worker'])
    .order('requested_at')
    .limit(1)
    .maybeSingle();
  if(error)throw error;
  if(!data)return null;
  const {data:claimed,error:claimError}=await sb.from('quote_catalog_ai_agent_commands')
    .update({status:'claimed',claimed_at:new Date().toISOString()})
    .eq('id',data.id).eq('status','queued')
    .select('*').maybeSingle();
  if(claimError)throw claimError;
  return claimed||null;
}

async function complete(id,result){
  await sb.from('quote_catalog_ai_agent_commands').update({
    status:'completed',completed_at:new Date().toISOString(),result
  }).eq('id',id);
}

async function fail(id,error){
  await sb.from('quote_catalog_ai_agent_commands').update({
    status:'failed',completed_at:new Date().toISOString(),error:String(error?.message||error).slice(0,1000)
  }).eq('id',id);
}

async function handleCommand(data){
  try{
    if(data.command==='check_status'){
      await complete(data.id,{control:'online',worker:workerRunning()?'running':'stopped',model:cfg.model});
      return;
    }
    if(data.command==='check_ollama'){
      const res=await fetch(cfg.ollamaUrl+'/api/tags');
      if(!res.ok)throw new Error('Ollama HTTP '+res.status);
      await complete(data.id,{ollama:'online',model:cfg.model});
      return;
    }
    if(data.command==='start_worker'){
      const started=startWorker();
      await heartbeat('starting',null,{control_online:true,worker_running:true});
      await complete(data.id,{control:'online',worker:started?'starting':'already_running'});
      return;
    }
    if(data.command==='restart_worker'){
      await stopWorker();
      startWorker();
      await heartbeat('starting',null,{control_online:true,worker_running:true,restarted:true});
      await complete(data.id,{control:'online',worker:'restarting'});
      return;
    }
    if(data.command==='stop_worker'){
      const queue=await emergencyStop();
      await stopWorker();
      await heartbeat('offline',null,{control_online:true,worker_running:false,remote_stop:true});
      await complete(data.id,{
        control:'online',
        worker:'stopped',
        queue,
        message:'Research worker stopped. The lightweight Research PC supervisor remains online so START can work remotely.'
      });
      return;
    }
  }catch(e){
    log('Command failed:',data.command,e.message||String(e));
    await fail(data.id,e);
  }
}

async function loop(){
  log('Research PC supervisor online. Control channel remains available while worker is stopped.');
  await heartbeat('offline',null,{control_online:true,worker_running:false});
  startWorker();
  while(!shuttingDown){
    try{
      const command=await claimCommand();
      if(command)await handleCommand(command);
      if(!workerRunning())await heartbeat('offline',null,{control_online:true,worker_running:false});
      else await heartbeat('online',null,{control_online:true,worker_running:true});
    }catch(e){
      log('Supervisor loop warning:',e.message||String(e));
      await heartbeat(workerRunning()?'online':'offline',String(e.message||e).slice(0,500),{control_online:true,worker_running:workerRunning()}).catch(()=>{});
    }
    await sleep(cfg.pollMs);
  }
}

for(const signal of ['SIGINT','SIGTERM']){
  process.on(signal,async()=>{
    shuttingDown=true;
    stopping=true;
    await stopWorker().catch(()=>{});
    await heartbeat('offline',null,{control_online:false,worker_running:false,supervisor_stopped:true}).catch(()=>{});
    process.exit(0);
  });
}

loop().catch(async e=>{
  log('Supervisor fatal error:',e.message||String(e));
  await heartbeat('offline',String(e.message||e).slice(0,500),{control_online:false,worker_running:false}).catch(()=>{});
  process.exit(1);
});
