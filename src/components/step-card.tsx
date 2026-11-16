"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  ChevronRight,
  Globe,
  Link2,
  Link2Off,
  ListChecks,
  Sparkles,
  Terminal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GENESIS,
  shortHash,
  type JsonValue,
  type LedgerAction,
  type LedgerEntry,
} from "@/lib/ledger";

const ACTION_META: Record<
  LedgerAction,
  { label: string; icon: typeof Brain; className: string }
> = {
  plan: {
    label: "plan",
    icon: ListChecks,
    className: "text-violet-300 bg-violet-500/12 border-violet-400/25",
  },
  reasoning: {
    label: "reasoning",
    icon: Brain,
    className: "text-sky-300 bg-sky-500/12 border-sky-400/25",
  },
  tool_call: {
    label: "tool call",
    icon: Terminal,
    className: "text-amber-300 bg-amber-500/12 border-amber-400/25",
  },
  tool_result: {
    label: "tool result",
    icon: Globe,
    className: "text-cyan-300 bg-cyan-500/12 border-cyan-400/25",
  },
  final_answer: {
    label: "final answer",
    icon: Sparkles,
    className: "text-emerald-300 bg-emerald-500/12 border-emerald-400/25",
  },
  error: {
    label: "error",
    icon: AlertTriangle,
    className: "text-rose-300 bg-rose-500/12 border-rose-400/25",
  },
};

/** Collapse a JSON value into one readable line for the card preview. */
function summarize(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return `${value.length} item(s)`;

  const record = value as Record<string, JsonValue>;

  if (typeof record.text === "string") return record.text;
  if (typeof record.message === "string") return record.message;
  if (typeof record.objective === "string") return record.objective;

  if (typeof record.tool === "string") {
    const args = record.arguments;
    const query =
      args && typeof args === "object" && !Array.isArray(args)
        ? (args as Record<string, JsonValue>).query
        : undefined;
    return typeof query === "string"
      ? `${record.tool}("${query}")`
      : record.tool;
  }

  if (Array.isArray(record.results)) {
    const answer = typeof record.answer === "string" ? record.answer : null;
    const count = `${record.results.length} source(s)`;
    return answer ? `${count} · ${answer}` : count;
  }

  return Object.entries(record)
    .map(([key, entryValue]) =>
      typeof entryValue === "object" && entryValue !== null
        ? `${key}: …`
        : `${key}: ${String(entryValue)}`,
    )
    .join("  ·  ");
}

interface StepCardProps {
  entry: LedgerEntry;
  isLast: boolean;
  /** This entry's own hash no longer matches its contents. */
  isBroken?: boolean;
  /** This entry sits after a break, so the chain cannot vouch for it. */
  isDownstream?: boolean;
}

export function StepCard({
  entry,
  isLast,
  isBroken = false,
  isDownstream = false,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[entry.action] ?? ACTION_META.reasoning;
  const Icon = meta.icon;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1],
        layout: { duration: 0.25 },
      }}
      className="relative pl-12 sm:pl-14"
    >
      {/* Rail + node */}
      {!isLast && (
        <span
          aria-hidden
          className={cn(
            "chain-rail absolute top-9 bottom-0 left-[15.5px] w-px sm:left-[19.5px]",
            isBroken && "opacity-30",
          )}
        />
      )}
      <span
        aria-hidden
        className={cn(
          "absolute top-2 left-0 flex size-8 items-center justify-center rounded-full border bg-card text-[10px] font-medium sm:size-10",
          isBroken
            ? "border-tampered/60 text-tampered shadow-[0_0_0_4px_color-mix(in_oklch,var(--tampered)_14%,transparent)]"
            : "border-border text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>

      <div
        className={cn(
          "group rounded-xl border bg-card/70 backdrop-blur-sm transition-colors",
          isBroken
            ? "border-tampered/55 bg-tampered/[0.06]"
            : "border-border/80 hover:border-border",
          isDownstream && !isBroken && "opacity-60",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-4 pt-3.5 sm:px-5">
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {entry.stepId}
          </span>
          <Badge
            variant="outline"
            className={cn("gap-1 px-1.5 py-0 text-[11px] font-medium", meta.className)}
          >
            {meta.label}
          </Badge>
          <span className="font-mono text-xs text-foreground/80">
            {entry.agent}
          </span>
          <time
            className="ml-auto font-mono text-[11px] text-muted-foreground"
            dateTime={entry.timestamp}
          >
            {new Date(entry.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </time>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="w-full cursor-pointer px-4 pt-2.5 pb-3 text-left sm:px-5"
          aria-expanded={expanded}
        >
          <div className="space-y-1.5">
            <Field label="in" value={summarize(entry.input)} clamped={!expanded} />
            <Field
              label="out"
              value={summarize(entry.output)}
              clamped={!expanded}
              emphasis
            />
          </div>

          <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors group-hover:text-foreground/70">
            <ChevronRight
              className={cn(
                "size-3 transition-transform",
                expanded && "rotate-90",
              )}
            />
            {expanded ? "Hide raw entry" : "Show raw entry"}
          </span>
        </button>

        {expanded && (
          <pre className="mx-4 mb-3 max-h-72 overflow-auto rounded-lg border border-border/70 bg-background/70 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground sm:mx-5">
            {JSON.stringify(entry, null, 2)}
          </pre>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/60 px-4 py-2.5 sm:px-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {isBroken ? (
              <Link2Off className="size-3 text-tampered" />
            ) : (
              <Link2 className="size-3 text-chain" />
            )}
            prev
            <code className="hash-chip text-muted-foreground">
              {entry.prevHash === GENESIS ? GENESIS : shortHash(entry.prevHash)}
            </code>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            hash
            <code
              className={cn(
                "hash-chip",
                isBroken ? "text-tampered" : "text-chain",
              )}
            >
              {shortHash(entry.hash)}
            </code>
          </span>
          {isBroken && (
            <span className="ml-auto text-[11px] font-medium text-tampered">
              contents no longer match this hash
            </span>
          )}
          {!isBroken && isDownstream && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              descends from a broken link
            </span>
          )}
        </div>
      </div>

      <span className="block h-4" aria-hidden />
    </motion.li>
  );
}

function Field({
  label,
  value,
  clamped,
  emphasis = false,
}: {
  label: string;
  value: string;
  clamped: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex gap-2.5 text-sm">
      <span className="mt-px w-6 shrink-0 font-mono text-[11px] text-muted-foreground/70">
        {label}
      </span>
      <p
        className={cn(
          "min-w-0 break-words",
          clamped && "line-clamp-2",
          emphasis ? "text-foreground/90" : "text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
