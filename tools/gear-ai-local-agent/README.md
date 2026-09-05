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

# Optional: official Google discovery.
# Preferred current integration: Google Web Search Service.
# This requires an API key, designated partner client ID and the end-user/public IP.
GOOGLE_SEARCH_API_KEY=...
GOOGLE_WEB_SEARCH_CLIENT_ID=...
GOOGLE_SEARCH_USER_IP=...

# Compatibility mode for an existing Google Programmable Search engine.
# Use this instead when you already have a valid existing CSE ID.
GOOGLE_CSE_ID=...

# Set false to disable Google completely.
GOOGLE_SEARCH_ENABLED=true
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
2. Searches the wider web through Google's current Web Search Service when configured, with compatibility support for an existing Google Programmable Search engine, alongside Bing, DuckDuckGo and Mojeek fallbacks.
3. Explicitly searches Amazon UK for every New UK research pass using indexed discovery queries.
4. If Amazon blocks direct automated page retrieval, preserves an exact-model Amazon UK search discovery for manual review only; no price is invented and nothing is automatically accepted.
5. Automatically cools down providers that return blocking/rate-limit responses so repeated failures do not hold up the catalogue.
6. Directly probes approved GearCashOut sources for each requested market/condition.
7. Collects result URLs and page excerpts.
8. Sends only collected evidence to the local Ollama model.
9. Requires structured JSON output.
10. Rejects mismatched variants and weak matches.
11. Submits findings to the existing manual review queue.
12. Registers genuinely new domains in the Source Registry.

No finding is automatically applied to live evidence.

## Amazon UK Only — hard restriction

When the dashboard source filter is set to **Amazon UK Only**, the worker now treats that as a hard source boundary:

- only Amazon UK discovery queries are issued;
- general UK retailer, used-marketplace and overseas queries are not run;
- approved-source/direct probes are disabled;
- a result must resolve to the actual `amazon.co.uk` domain before it can enter the evidence pool;
- a future fallback through the source registry is also blocked unless the source itself is Amazon UK.

This mode can still produce **zero findings**. That is a valid result when Amazon has no usable indexed exact-model listing or blocks retrieval.

## Relevance hardening

Before a search result is collected for evidence, the worker now requires:

1. the exact catalogue model to be identifiable;
2. the manufacturer to be identifiable when the catalogue product has one;
3. the result not to look like an error/help/navigation page;
4. the result not to be an accessory or spare part for a main product, unless the catalogue product itself is an accessory;
5. manufacturer bundles such as recognised combo/kit packages to remain eligible.

This deliberately prefers a smaller number of strong candidates over unrelated models, accessories and weak keyword matches.

## Evidence buckets

- **1** New UK retail.
- **2** Used UK, including UK marketplace listings even if advertised as new.
- **3** Overseas.
- Official manufacturer information remains separate.

## Important

The local agent only works while this PC is switched on and the agent is running. Queued jobs remain in Supabase until the agent processes them.


## Google search setup

The agent now supports two official Google discovery modes:

1. **Google Web Search Service — preferred current integration.** Google documents this for programmatic partners and requires an API key, a designated client ID and the end-user IP address.
2. **Existing Google Programmable Search — compatibility mode.** If you already have a valid existing search engine ID, the agent can use `GOOGLE_CSE_ID`.

If neither Google configuration is present, the agent continues automatically with Bing, DuckDuckGo, Mojeek and the GearCashOut approved-source registry. A blocked provider is cooled down temporarily rather than repeatedly slowing every catalogue product.


## Research PC launcher location

The established Windows installation deliberately keeps the launcher/configuration outside the extracted repository:

`C:\\GearCashOut-Config\\Start-GearCashOut-AI.ps1`

That launcher must explicitly start npm from the extracted agent folder:

`C:\\gearcashout\\Action-Buyer-UK-main\\tools\\gear-ai-local-agent`

Do not run `npm start` from `C:\\GearCashOut-Config`; that folder contains configuration, not `package.json`.

If the extracted repository is moved, set `GEARCASHOUT_AGENT_DIR` to the new `tools\\gear-ai-local-agent` folder.


## Remote start/stop architecture

`supervisor.mjs` is the persistent Research PC control channel. It starts `agent.mjs` as a child process.

Do not treat the research worker and the supervisor as the same process:

- **START RESEARCH PC WORKER** starts `agent.mjs` through the still-running supervisor.
- **STOP ALL RESEARCH & WORKER** stops research and `agent.mjs`, but deliberately leaves `supervisor.mjs` alive.
- This is what makes a later remote START possible.
- If the dashboard shows **OFFLINE** rather than **READY**, the supervisor/Research PC itself is unavailable and Windows startup or the desktop launcher is required.
