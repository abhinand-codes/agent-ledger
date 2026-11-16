# Agent Ledger

**An AI agent that cannot quietly rewrite its own history.**

Every step the agent takes — its plan, its reasoning, each tool call, each tool
result, the final answer — is appended to a SHA-256 hash chain. Afterwards,
anyone holding the exported ledger can recompute the entire chain and prove
whether the record is the one the agent actually produced.

There is a "Simulate tampering" button that edits a single word of one step's
output and leaves every stored hash untouched. Verification catches it
immediately, and names the step.

---

## Why agent audit trails matter

Agents are being handed work where the output alone isn't enough: triaging
incidents, filing compliance reports, reconciling accounts, making
recommendations someone will be held responsible for. When one of those goes
wrong, the questions are all about process, not output:

- What did the agent actually look at before it concluded that?
- Did it really call that tool, with those arguments?
- Is this transcript the original, or has someone edited it since?

Most agent frameworks answer the first two with application logs — which are
mutable by anyone with write access to the log store, including the system that
produced them. That's fine for debugging and worthless as evidence. The EU AI
Act's record-keeping obligations for high-risk systems, SOC 2 change-management
controls, and any internal post-incident review all assume a record nobody can
retroactively revise.

A hash chain is the cheapest useful answer. It doesn't need a database, a
blockchain, or a trusted third party. It just makes editing the past *visible*.

---

## How the hash chain works

Each ledger entry is:

```ts
{
  stepId: "step-004",
  timestamp: "2026-11-16T11:48:02.141Z",
  agent: "web_search",
  action: "tool_result",
  input: { tool: "web_search", arguments: { query: "…" } },
  output: { answer: "…", results: [ … ] },
  prevHash: "9f2c…",   // hash of the entry before this one
  hash: "4ab1…"        // this entry's own hash
}
```

and its hash is:

```
hash = sha256(prevHash + JSON.stringify({ stepId, timestamp, agent, action, input, output }))
```

The first entry's `prevHash` is the literal string `"GENESIS"`.

Two properties follow:

1. **Edit any field of any entry** and that entry's `hash` no longer matches its
   contents (`hash_mismatch`).
2. **Insert, delete, or reorder entries** and some entry's `prevHash` stops
   pointing at the real previous entry (`link_mismatch`).

To forge a run convincingly you would have to recompute that entry's hash — but
the next entry commits to the old one, so you'd have to recompute that too, and
every entry after it, all the way to the head. Anyone who wrote down the final
hash when the run finished will still catch you.

The key design decision is that **verification is a different computation than
construction, run by a different party.** `src/lib/ledger.ts` is isomorphic: the
server builds the chain with it, and your browser re-derives the chain with the
exact same function from the JSON it received. You never take the server's word
for it. Export the JSON and check it with five lines of Node if you prefer:

```js
import crypto from "node:crypto";
const sha = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");
const body = ({ stepId, timestamp, agent, action, input, output }) =>
  JSON.stringify({ stepId, timestamp, agent, action, input, output });

let prev = "GENESIS";
for (const e of ledger.entries) {
  console.assert(e.prevHash === prev, `${e.stepId}: broken link`);
  console.assert(sha(e.prevHash + body(e)) === e.hash, `${e.stepId}: tampered`);
  prev = e.hash;
}
```

### What it does and does not prove

It proves the **record of a run was not altered after the fact** — which is
exactly the property logs lack.

It does not prove the agent ran on honest hardware, and it does not stop whoever
controls the server from fabricating a *whole* consistent chain from scratch.
Closing that gap means anchoring the head hash somewhere the author doesn't
control: signing it with a key the verifier trusts, publishing it to a
transparency log, or committing it to a third-party timestamp service. That's a
deliberate v1 boundary, not an oversight — the chain is the hard part, and
anchoring the head is ~20 lines on top of it.

---

## Stack

| Piece | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, framer-motion |
| Agent | Vercel AI SDK v7 — `ToolLoopAgent` |
| Model | OpenRouter, `moonshotai/kimi-k2:free` by default |
| Tool | Tavily web search (`@tavily/core`) |
| Storage | In-memory, server-side. No database. |

### Architecture

```
src/lib/ledger.ts        the hash chain — build, serialize, verify (isomorphic)
src/lib/agent.ts         ToolLoopAgent + the one tool (Tavily web_search)
src/lib/store.ts         in-memory ledger store, capped, keyed by runId
src/lib/tamper.ts        the demo forgery
src/app/api/run-agent/   POST streams NDJSON entries live; GET fetches by runId
src/components/          timeline, verify panel, raw JSON view
```

The agent loop is a single `ToolLoopAgent`. The API route consumes its
`fullStream` and translates each part into a ledger entry: text emitted before a
tool call becomes `reasoning`, text left over at the end becomes
`final_answer`. Entries are streamed to the browser as newline-delimited JSON so
the timeline fills in as the agent works, rather than appearing all at once when
it finishes.

If the run fails, the failure is itself a chained entry. An audit trail that
goes quiet when something goes wrong is not an audit trail.

---

## Run it locally

```bash
git clone https://github.com/abhinand-codes/agent-ledger.git
cd agent-ledger
npm install
cp .env.example .env.local   # then fill in the two keys
npm run dev                  # http://localhost:3000
```

You need:

- an **OpenRouter** API key — <https://openrouter.ai/keys>
- a **Tavily** API key — <https://app.tavily.com>

### A note on the model

The default is `moonshotai/kimi-k2:free`. OpenRouter retires free model variants
without notice, and at the time of writing that slug returns *"This model is
unavailable for free."* Set `OPENROUTER_MODEL` in `.env.local` to any
tool-calling model you have access to:

```bash
OPENROUTER_MODEL=moonshotai/kimi-k2              # paid, the same model
OPENROUTER_MODEL=nvidia/nemotron-3.5-super-vl:free   # free, verified working
```

List current free tool-capable models:

```bash
curl -s https://openrouter.ai/api/v1/models \
  | jq -r '.data[] | select(.id|endswith(":free")) | select(.supported_parameters|index("tools")) | .id'
```

---

## Deploying to Vercel

```bash
npx vercel
```

Then set `OPENROUTER_API_KEY`, `TAVILY_API_KEY` and (optionally)
`OPENROUTER_MODEL` in **Project Settings → Environment Variables**, and redeploy.
No other configuration is needed — the API route runs on the Node runtime with
`maxDuration = 60`, and the ledger store is in-process memory, so a cold start
simply begins with an empty store. That's acceptable here because every run's
complete ledger is also streamed to the client, which is the copy that gets
verified and exported.

---

## API

**`POST /api/run-agent`** — `{ "task": "…" }`

Responds with `application/x-ndjson`, one event per line:

```jsonc
{"type":"entry","entry":{ … }}   // one per ledger entry, streamed live
{"type":"error","message":"…"}   // the run failed (the failure is also an entry)
{"type":"done","ledger":{ … }}   // the complete ledger, always last
```

**`GET /api/run-agent?runId=…`** — the stored ledger for a completed run, or
404 if that run has aged out of the in-memory store.

---

## Try the demo in 30 seconds

1. Run any task that needs a lookup — *"Who is the current CEO of OpenAI?"*
2. Watch the timeline fill in, step by step, each card showing its hash fragment
   and the hash it links back to.
3. **Verify integrity** → green, chain intact.
4. **Simulate tampering** → one word of one step's output is rewritten; every
   hash is left exactly as it was.
5. Verification re-runs automatically → red, with the broken step named and the
   expected vs. found hash shown side by side. Everything downstream of the
   break is greyed out, because the chain can no longer vouch for it.
6. **Restore original ledger** → green again.
