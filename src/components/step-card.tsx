"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  ChevronRight,
  Globe,
  Link2Off,
  ListChecks,
  Sparkles,
  Terminal,
} from "lucide-react";

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
  { label: string; icon: typeof Brain }
> = {
  plan: { label: "plan", icon: ListChecks },
  reasoning: { label: "reasoning", icon: Brain },
  tool_call: { label: "tool call", icon: Terminal },
  tool_result: { label: "tool result", icon: Globe },
  final_answer: { label: "final answer", icon: Sparkles },
  error: { label: "error", icon: AlertTriangle },
};

/** Collapse a JSON value into one readable line for the row preview. */
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

/** "step-004" -> "004" — the line number a real ledger would print. */
function lineNumber(stepId: string): string {
  return stepId.replace(/^\D+/, "");
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
        layout: { duration: 0.22 },
      }}
      className={cn(
        "group grid grid-cols-[2.5rem_1fr] gap-x-3 px-1 py-4 transition-colors sm:grid-cols-[3rem_1fr] sm:gap-x-4",
        !isLast && "border-b border-border/70",
        isBroken && "link-snap bg-tampered/[0.07]",
        isDownstream && !isBroken && "opacity-55",
      )}
    >
      {/* The ruled line number — the one thing every ledger row starts with. */}
      <span
        className={cn(
          "pt-0.5 text-right font-display text-lg leading-none font-medium tabular-nums",
          isBroken ? "text-tampered" : "text-muted-foreground/50",
        )}
      >
        {lineNumber(entry.stepId)}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Icon
            className={cn(
              "size-3.5 shrink-0",
              isBroken ? "text-tampered" : "text-chain",
            )}
          />
          <span className="font-display text-[13px] font-medium">
            {meta.label}
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span className="font-mono text-xs text-muted-foreground">
            {entry.agent}
          </span>
          <time
            className="ml-auto font-mono text-[11px] text-muted-foreground/70"
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
          className="mt-2 w-full cursor-pointer text-left"
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

          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 transition-colors group-hover:text-muted-foreground">
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
          <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-border/70 bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {JSON.stringify(entry, null, 2)}
          </pre>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80">
          <span className="inline-flex items-center gap-1.5">
            {isBroken && <Link2Off className="size-3 text-tampered" />}
            prev
            <code className="hash-chip text-muted-foreground">
              {entry.prevHash === GENESIS ? GENESIS : shortHash(entry.prevHash)}
            </code>
          </span>
          <span className="inline-flex items-center gap-1.5">
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
            <span className="font-medium text-tampered">
              contents no longer match this hash
            </span>
          )}
          {!isBroken && isDownstream && (
            <span>descends from a broken link</span>
          )}
        </div>
      </div>
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
      <span className="mt-px w-6 shrink-0 font-mono text-[11px] text-muted-foreground/60">
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
