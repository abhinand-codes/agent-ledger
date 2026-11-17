import { ShieldCheck, Workflow } from "lucide-react";

import { AgentLedger } from "@/components/agent-ledger";
import { ThemeToggle } from "@/components/theme-toggle";

const PILLARS = [
  {
    icon: Workflow,
    title: "Every step recorded",
    body: "Plan, reasoning, tool call, tool result, final answer — each one becomes a ledger entry the moment the agent commits it.",
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
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-chain" />
            tamper-evident agent runs
          </span>
          <ThemeToggle />
        </div>

        <h1 className="mt-5 font-display text-[2.75rem] leading-[1.05] font-medium text-balance sm:text-6xl">
          Agent <em className="font-normal italic">Ledger</em>
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
          An AI agent that cannot quietly rewrite its own history. Every step it
          takes is appended to a hash chain — so after the fact, anyone can prove
          whether the record is the real one.
        </p>
      </header>

      <div className="mt-12">
        <AgentLedger />
      </div>

      <section className="mt-16 flex flex-col divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/20 sm:flex-row sm:divide-x sm:divide-y-0">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex-1 p-4">
            <div className="flex items-center gap-2">
              <Icon className="size-3.5 shrink-0 text-chain" />
              <h3 className="font-display text-sm font-medium">{title}</h3>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
        ))}
      </section>

      <footer className="mt-16 border-t border-border/60 pt-6 text-[12px] leading-relaxed text-muted-foreground">
        <p>
          Any OpenRouter model (swap it with one env var) · Tavily web search
          · Vercel AI SDK ToolLoopAgent · Next.js App Router
        </p>
      </footer>
    </main>
  );
}
