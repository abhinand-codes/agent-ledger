import { Link2, ShieldCheck, Workflow } from "lucide-react";

import { AgentLedger } from "@/components/agent-ledger";

const PILLARS = [
  {
    icon: Workflow,
    title: "Every step recorded",
    body: "Plan, reasoning, tool call, tool result, final answer — each one becomes a ledger entry the moment the agent commits it.",
  },
  {
    icon: Link2,
    title: "Chained with SHA-256",
    body: "Each entry's hash commits to its own contents and to the hash before it, back to GENESIS. Edit one byte and the link snaps.",
  },
  {
    icon: ShieldCheck,
    title: "Verified by you, not us",
    body: "Verification recomputes the whole chain in your browser from the exported JSON. You never have to take the server's word for it.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-6 sm:py-20">
      <header>
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-chain" />
          tamper-evident agent runs
        </span>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Agent Ledger
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
          An AI agent that cannot quietly rewrite its own history. Every step it
          takes is appended to a hash chain — so after the fact, anyone can prove
          whether the record is the real one.
        </p>

        <code className="mt-6 block overflow-x-auto rounded-xl border border-border/70 bg-card/50 px-4 py-3 font-mono text-[12px] leading-relaxed text-muted-foreground backdrop-blur-sm">
          hash = sha256(prevHash + JSON.stringify({"{"} stepId, timestamp, agent,
          action, input, output {"}"}))
        </code>
      </header>

      <div className="mt-12">
        <AgentLedger />
      </div>

      <section className="mt-20 grid gap-5 sm:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-xl border border-border/70 bg-card/40 p-4 backdrop-blur-sm"
          >
            <Icon className="size-4 text-chain" />
            <h3 className="mt-3 text-sm font-semibold">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
        ))}
      </section>

      <footer className="mt-16 border-t border-border/60 pt-6 text-[12px] text-muted-foreground">
        <p>
          Kimi K2 via OpenRouter · Tavily web search · Vercel AI SDK
          ToolLoopAgent · Next.js App Router
        </p>
        <p className="mt-1.5">
          The ledger proves the record of a run was not altered after the fact.
          It does not attest to the hardware the agent ran on — for that you
          would anchor these hashes externally.
        </p>
      </footer>
    </main>
  );
}
