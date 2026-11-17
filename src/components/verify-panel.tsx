"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  FlaskConical,
  Loader2,
  RotateCcw,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shortHash, type VerificationResult } from "@/lib/ledger";

interface VerifyPanelProps {
  entryCount: number;
  verification: VerificationResult | null;
  verifying: boolean;
  tampered: { stepId: string; description: string } | null;
  canTamper: boolean;
  onVerify: () => void;
  onTamper: () => void;
  onRestore: () => void;
  onDownload: () => void;
}

export function VerifyPanel({
  entryCount,
  verification,
  verifying,
  tampered,
  canTamper,
  onVerify,
  onTamper,
  onRestore,
  onDownload,
}: VerifyPanelProps) {
  return (
    <section className="ledger-surface rounded-2xl border border-border/80 bg-card/60 p-5 backdrop-blur-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-medium">Verify the chain</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Verification runs entirely in your browser: it recomputes every
            SHA-256 link from the ledger you were handed and compares the result
            against the hashes the server stored.
          </p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {entryCount} entries
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Button onClick={onVerify} disabled={verifying || entryCount === 0}>
          {verifying ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          Verify integrity
        </Button>

        {tampered ? (
          <Button variant="secondary" onClick={onRestore}>
            <RotateCcw className="size-4" />
            Restore original ledger
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={onTamper}
            disabled={!canTamper}
            className="border-tampered/40 bg-tampered/10 text-tampered hover:bg-tampered/20"
          >
            <FlaskConical className="size-4" />
            Simulate tampering
          </Button>
        )}

        <Button variant="ghost" onClick={onDownload} disabled={entryCount === 0}>
          <Download className="size-4" />
          Download ledger JSON
        </Button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tampered && (
          <motion.p
            key="tamper-note"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden text-sm text-tampered"
          >
            <span className="mt-4 block">{tampered.description}</span>
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {verification && (
          <motion.div
            key={verification.checkedAt}
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "mt-5 rounded-xl border p-4",
              verification.valid
                ? "border-verified/40 bg-verified/[0.08]"
                : "border-tampered/45 bg-tampered/[0.08]",
            )}
          >
            <div className="flex items-center gap-2.5">
              {verification.valid ? (
                <ShieldCheck className="size-5 shrink-0 text-verified" />
              ) : (
                <ShieldX className="size-5 shrink-0 text-tampered" />
              )}
              <p
                className={cn(
                  "text-base font-semibold",
                  verification.valid ? "text-verified" : "text-tampered",
                )}
              >
                {verification.valid
                  ? "✓ Verified — chain intact"
                  : "✗ Tampered — chain broken"}
              </p>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {verification.valid ? (
                <>
                  Recomputed all {verification.entriesChecked} links from
                  GENESIS. Every hash matches its contents and every entry
                  points at the one before it.
                </>
              ) : (
                <>
                  {verification.issues.length} broken link
                  {verification.issues.length === 1 ? "" : "s"} across{" "}
                  {verification.entriesChecked} entries. Nothing from{" "}
                  <span className="font-mono">
                    {verification.issues[0]?.stepId}
                  </span>{" "}
                  onward can be trusted.
                </>
              )}
            </p>

            {verification.issues.length > 0 && (
              <ul className="mt-3 space-y-2.5">
                {verification.issues.map((issue) => (
                  <li
                    key={`${issue.stepId}-${issue.kind}`}
                    className="rounded-lg border border-tampered/25 bg-background/50 p-3 text-[12px]"
                  >
                    <p className="font-medium text-tampered">
                      <span className="font-mono">{issue.stepId}</span> ·{" "}
                      {issue.kind === "hash_mismatch"
                        ? "stored hash does not match the entry's contents"
                        : "prevHash does not point at the previous entry"}
                    </p>
                    <dl className="mt-1.5 grid gap-1 font-mono text-[11px] text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-3">
                      <dt>expected</dt>
                      <dd className="truncate text-verified/80">
                        {shortHash(issue.expected, 24)}
                      </dd>
                      <dt>found</dt>
                      <dd className="truncate text-tampered/90">
                        {shortHash(issue.actual, 24)}
                      </dd>
                    </dl>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              checked {new Date(verification.checkedAt).toLocaleTimeString()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
