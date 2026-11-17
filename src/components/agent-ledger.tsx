"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Square } from "lucide-react";
import { toast } from "sonner";

import { HashScramble } from "@/components/hash-scramble";
import { LedgerJson } from "@/components/ledger-json";
import { StepCard } from "@/components/step-card";
import { VerifyPanel } from "@/components/verify-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  verifyChain,
  type Ledger,
  type LedgerEntry,
  type VerificationResult,
} from "@/lib/ledger";
import type { RunEvent } from "@/lib/protocol";
import { simulateTampering } from "@/lib/tamper";

type Status = "idle" | "running" | "done" | "error";

const EXAMPLE_TASKS = [
  "What did Anthropic ship most recently, and when?",
  "Compare the latest Next.js release to the one before it.",
  "Who won the most recent Formula 1 race, and by how much?",
];

export function AgentLedger() {
  const [task, setTask] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [pristine, setPristine] = useState<LedgerEntry[]>([]);
  const [meta, setMeta] = useState<Omit<Ledger, "entries"> | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(
    null,
  );
  const [verifying, setVerifying] = useState(false);
  const [tampered, setTampered] = useState<{
    stepId: string;
    description: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ghostIndex, setGhostIndex] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const running = status === "running";

  // The placeholder rotates through real example tasks every few seconds —
  // not decoration, it doubles as a live menu: Tab accepts whichever one is
  // showing. Stops the moment there's real text to protect, or a run to watch.
  useEffect(() => {
    if (task || running) return;
    const id = setInterval(() => {
      setGhostIndex((index) => (index + 1) % EXAMPLE_TASKS.length);
    }, 3000);
    return () => clearInterval(id);
  }, [task, running]);

  const ledger: Ledger | null = useMemo(
    () => (meta ? { ...meta, entries } : null),
    [meta, entries],
  );

  const brokenIndices = useMemo(
    () => new Set(verification?.issues.map((issue) => issue.index) ?? []),
    [verification],
  );

  const runAgent = useCallback(
    async (nextTask: string) => {
      const trimmed = nextTask.trim();
      if (!trimmed || running) return;

      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("running");
      setEntries([]);
      setPristine([]);
      setMeta(null);
      setVerification(null);
      setTampered(null);
      setError(null);

      try {
        const response = await fetch("/api/run-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: trimmed }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          // The API always replies with { error: "a full sentence" } — read
          // that instead of showing the raw JSON body as if it were prose.
          const raw = await response.text();
          let detail = raw;
          try {
            const parsed = JSON.parse(raw) as { error?: unknown };
            if (typeof parsed.error === "string" && parsed.error) {
              detail = parsed.error;
            }
          } catch {
            // Not JSON — fall back to the raw text below.
          }
          throw new Error(
            detail.slice(0, 300) || `Request failed (${response.status})`,
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalCount: number | null = null;
        let midRunError: string | null = null;

        const handle = (line: string) => {
          if (!line.trim()) return;
          const event = JSON.parse(line) as RunEvent;

          if (event.type === "entry") {
            setEntries((current) => [...current, event.entry]);
          } else if (event.type === "done") {
            const { entries: finalEntries, ...ledgerMeta } = event.ledger;
            setEntries(finalEntries);
            setPristine(finalEntries);
            setMeta(ledgerMeta);
            finalCount = finalEntries.length;
          } else if (event.type === "error") {
            setError(event.message);
            midRunError = event.message;
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          lines.forEach(handle);
        }
        handle(buffer);

        setStatus((current) => (current === "running" ? "done" : current));

        if (midRunError) {
          toast.error("The agent couldn't finish", { description: midRunError });
        } else if (finalCount) {
          toast.success("Run complete", {
            description: `${finalCount} step${finalCount === 1 ? "" : "s"} chained to the ledger.`,
          });
        }
      } catch (caught) {
        if (controller.signal.aborted) {
          setStatus("done");
          return;
        }
        const message = caught instanceof Error ? caught.message : String(caught);
        setError(message);
        setStatus("error");
        toast.error("The run couldn't reach the server", {
          description: message,
        });
      } finally {
        abortRef.current = null;
      }
    },
    [running],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("done");
  }, []);

  const verify = useCallback(async () => {
    setVerifying(true);
    try {
      setVerification(await verifyChain(entries));
    } finally {
      setVerifying(false);
    }
  }, [entries]);

  const tamper = useCallback(async () => {
    const result = simulateTampering(entries);
    if (!result) return;

    setEntries(result.entries);
    setTampered({ stepId: result.stepId, description: result.description });
    setVerifying(true);
    try {
      setVerification(await verifyChain(result.entries));
    } finally {
      setVerifying(false);
    }
    toast("Tampering simulated", {
      description: `${result.stepId} was mutated without updating its stored hash.`,
      icon: "🧪",
    });
  }, [entries]);

  const restore = useCallback(async () => {
    setEntries(pristine);
    setTampered(null);
    setVerifying(true);
    try {
      setVerification(await verifyChain(pristine));
    } finally {
      setVerifying(false);
    }
    toast.success("Original ledger restored");
  }, [pristine]);

  const download = useCallback(() => {
    const payload: Ledger = ledger ?? {
      runId: "unsaved",
      task,
      model: "unknown",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      entries,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `agent-ledger-${payload.runId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded", {
      description: `agent-ledger-${payload.runId}.json · ${payload.entries.length} entries.`,
    });
  }, [ledger, entries, task]);

  return (
    <div className="space-y-8">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void runAgent(task);
        }}
        className="ledger-surface rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-sm sm:p-5"
      >
        <label htmlFor="task" className="sr-only">
          Task for the agent
        </label>
        <div className="relative">
          {!task && !running && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 px-1 py-2 text-base"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={ghostIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.55 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="block text-muted-foreground"
                >
                  {EXAMPLE_TASKS[ghostIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
          <Textarea
            id="task"
            value={task}
            onChange={(event) => setTask(event.target.value)}
            onKeyDown={(event) => {
              // Tab accepts whatever example is currently showing — the
              // rotating placeholder is a live suggestion, not just text.
              if (event.key === "Tab" && !task && !running) {
                event.preventDefault();
                setTask(EXAMPLE_TASKS[ghostIndex]);
                return;
              }
              // Enter sends, like every chat input people already know.
              // Shift+Enter still breaks the line for a multi-part task.
              if (event.key !== "Enter" || event.shiftKey) return;
              event.preventDefault();
              void runAgent(task);
            }}
            placeholder=""
            rows={3}
            maxLength={500}
            disabled={running}
            className="relative resize-none border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            ↵ to send · ⇧↵ new line · ⇥ to use suggestion
          </span>
          <div className="ml-auto flex gap-2">
            {running && (
              <Button type="button" variant="ghost" onClick={stop}>
                <Square className="size-3.5" />
                Stop
              </Button>
            )}
            <Button
              type="submit"
              disabled={running || !task.trim()}
              className="run-button"
            >
              {running ? <HashScramble /> : <ArrowUp className="size-4" />}
              {running ? "Running" : "Run agent"}
            </Button>
          </div>
        </div>

        {status === "idle" && entries.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_TASKS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setTask(example);
                  void runAgent(example);
                }}
                className="cursor-pointer rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground transition-[color,border-color,transform] duration-150 hover:border-chain/50 hover:text-foreground active:scale-95"
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </form>

      {error && (
        <div className="rounded-xl border border-tampered/45 bg-tampered/[0.08] p-4 text-sm text-tampered">
          {error}
        </div>
      )}

      {entries.length > 0 && (
        <section>
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-medium">Audit trail</h2>
            <span className="font-mono text-[11px] text-muted-foreground">
              {running ? "streaming…" : `${entries.length} chained entries`}
            </span>
          </div>

          <ul className="relative">
            <AnimatePresence initial={false}>
              {entries.map((entry, index) => (
                <StepCard
                  key={entry.stepId}
                  entry={entry}
                  isLast={index === entries.length - 1 && !running}
                  isBroken={brokenIndices.has(index)}
                  isDownstream={
                    verification?.firstBrokenIndex != null &&
                    index > verification.firstBrokenIndex
                  }
                />
              ))}
            </AnimatePresence>
          </ul>

          {running && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5 pl-12 text-sm text-muted-foreground sm:pl-14"
            >
              <span className="live-dot size-2 rounded-full bg-chain" />
              agent is working…
            </motion.div>
          )}
        </section>
      )}

      {entries.length > 0 && !running && (
        <>
          <VerifyPanel
            entryCount={entries.length}
            verification={verification}
            verifying={verifying}
            tampered={tampered}
            canTamper={entries.length > 0}
            onVerify={() => void verify()}
            onTamper={() => void tamper()}
            onRestore={() => void restore()}
            onDownload={download}
          />
          {ledger && (
            <LedgerJson
              ledger={ledger}
              tamperedStepId={tampered?.stepId ?? null}
            />
          )}
        </>
      )}
    </div>
  );
}
