"use client";

import { useState } from "react";
import { ChevronRight, Copy, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Ledger } from "@/lib/ledger";

export function LedgerJson({
  ledger,
  tamperedStepId,
}: {
  ledger: Ledger;
  tamperedStepId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(ledger, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-5 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex cursor-pointer items-center gap-2 text-sm font-medium"
        >
          <ChevronRight
            className={cn("size-4 transition-transform", open && "rotate-90")}
          />
          Ledger JSON
          <span className="font-mono text-[11px] font-normal text-muted-foreground">
            {ledger.entries.length} entries
          </span>
        </button>

        {tamperedStepId && (
          <span className="rounded-md border border-tampered/35 bg-tampered/10 px-1.5 py-0.5 font-mono text-[11px] text-tampered">
            edited: {tamperedStepId}
          </span>
        )}

        <button
          type="button"
          onClick={copy}
          className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border/70 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3 text-verified" />
          ) : (
            <Copy className="size-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {open && (
        <pre className="max-h-[28rem] overflow-auto border-t border-border/60 p-5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {json}
        </pre>
      )}
    </section>
  );
}
