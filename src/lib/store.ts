import type { Ledger } from "@/lib/ledger";

/**
 * In-memory ledger store for v1 — no database.
 *
 * Kept on `globalThis` so it survives Next.js module reloads in dev, and
 * capped so a long-lived serverless instance cannot grow without bound. Runs
 * are naturally ephemeral here: on Vercel a cold start starts an empty store,
 * which is fine because the full ledger is also returned to the client at the
 * end of every run.
 */
const MAX_RUNS = 50;

const globalStore = globalThis as unknown as {
  __agentLedgerRuns?: Map<string, Ledger>;
};

const runs: Map<string, Ledger> = (globalStore.__agentLedgerRuns ??= new Map());

export function saveRun(ledger: Ledger): void {
  runs.set(ledger.runId, ledger);
  while (runs.size > MAX_RUNS) {
    const oldest = runs.keys().next();
    if (oldest.done) break;
    runs.delete(oldest.value);
  }
}

export function getRun(runId: string): Ledger | undefined {
  return runs.get(runId);
}
