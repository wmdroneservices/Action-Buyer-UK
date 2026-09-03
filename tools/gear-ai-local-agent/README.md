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

## 3. Configure the agent

Copy:

```
.env.example
```

to:

```
.env
```

Enter the Supabase **service role key** in the local `.env` file.

Never put this key into GitHub or the website.

## 4. Start it

Double-click:

```
start.bat
```

or run:

```powershell
npm install
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
