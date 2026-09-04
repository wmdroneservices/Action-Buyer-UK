# GearCashOut Local AI Research Agent

This worker runs on your own Windows PC.

Architecture:

Website -> Supabase research queue -> this local agent -> web collection -> local Ollama -> Supabase manual review queue.

The agent does **not** expose Ollama to the internet and does not require a tunnel.

## 1. Install Ollama

Install Ollama for Windows, then pull the recommended starting model:

```powershell
ollama pull gemma3:4b
```

The agent uses Ollama's local API at `http://127.0.0.1:11434`.

## 2. Install Node.js

Install a current Node.js LTS release if Node is not already installed.

Check:

```powershell
node --version
npm --version
```

## 3. Permanent configuration — recommended

Your real secrets should live **outside the GitHub repository** so downloading, extracting or replacing the repository cannot overwrite or delete them.

Create this permanent folder:

```
C:\GearCashOut-Config\
```

Put your real configuration file here:

```
C:\GearCashOut-Config\.env
```

Example contents:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
POLL_SECONDS=15
```

The agent automatically loads the permanent external file first:

```
C:\GearCashOut-Config\.env
```

A repository-local:

```
tools\gear-ai-local-agent\.env
```

is only a backwards-compatible fallback. It **cannot overwrite values already loaded from the permanent configuration**.

Never put the service role key into GitHub or the website.

### Optional custom location

If you ever move the configuration file, set this Windows environment variable:

```powershell
$env:GEARCASHOUT_CONFIG_PATH="D:\MySecureConfig\.env"
```

The default remains:

```
C:\GearCashOut-Config\.env
```

## 4. Start or restart after a PC reboot

From the agent folder:

```powershell
npm install
npm start
```

### Why `npm install` may be needed after downloading a new repository

`node_modules` is not normally included in a GitHub repository ZIP. After extracting a fresh repository, run:

```powershell
npm install
```

This downloads the packages required by the agent, including `@supabase/supabase-js`.

You do **not** normally need to run `npm install` merely because the PC was restarted, provided you are still using the same repository folder and its `node_modules` folder is intact.

Then start the worker:

```powershell
npm start
```

The agent writes a heartbeat to Supabase and then waits for queued research jobs.

## How research works

For each queued catalogue product the agent:

1. Builds an exact product search query.
2. Searches the wider web and prioritises domains in the GearCashOut Source Registry.
3. Collects result URLs and page excerpts.
4. Sends only collected evidence to the local Ollama model.
5. Requires structured JSON output.
6. Rejects mismatched variants and weak matches.
7. Submits valid findings to the existing manual review queue.
8. Registers genuinely new domains in the Source Registry.

No finding is automatically applied to live evidence.

## Evidence buckets

- **1** New UK retail.
- **2** Used UK, including UK marketplace listings even if advertised as new.
- **3** Overseas.
- Official manufacturer information remains separate.

## Important

The local agent only works while this PC is switched on and the agent is running. Queued jobs remain in Supabase until the agent processes them.
