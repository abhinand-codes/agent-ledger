import { ShieldCheck, Workflow } from "lucide-react";

import { AgentLedger } from "@/components/agent-ledger";
import { Logo } from "@/components/logo";
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
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-16">
      <header>
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <ThemeToggle />
        </div>

        {/* A letterhead rule, not a floating pill badge. */}
        <div className="mt-6 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono tracking-[0.14em] uppercase">
            Tamper-evident agent runs
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <h1 className="mt-7 text-center font-display text-[2.5rem] leading-[1.08] font-medium text-balance sm:text-[3.25rem]">
          An AI agent that cannot <em className="italic">quietly</em> rewrite
          its own history.
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-center text-base text-pretty text-muted-foreground">
          Every step it takes is appended to a hash chain — so after the
          fact, anyone can prove whether the record is the real one.
        </p>
      </header>

      <div className="mt-10">
        <AgentLedger />
      </div>

      <section className="mt-14 border-t border-b border-border/70">
        {PILLARS.map(({ icon: Icon, title, body }, index) => (
          <div
            key={title}
            className={
              index > 0
                ? "flex gap-3 border-t border-border/70 py-4"
                : "flex gap-3 py-4"
            }
          >
            <Icon className="mt-0.5 size-4 shrink-0 text-chain" />
            <div>
              <h3 className="font-display text-sm font-medium">{title}</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          </div>
        ))}
      </section>

      <footer className="mt-10 text-center text-[11px] leading-relaxed text-muted-foreground">
        <p>
          Any OpenRouter model (swap it with one env var) · Tavily web search
          · Vercel AI SDK ToolLoopAgent · Next.js App Router
        </p>
      </footer>
    </main>
  );
}
