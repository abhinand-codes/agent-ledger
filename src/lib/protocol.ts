import type { Ledger, LedgerEntry } from "@/lib/ledger";

/**
 * Wire format for POST /api/run-agent.
 *
 * The response body is newline-delimited JSON: one `RunEvent` per line, so the
 * browser can render each ledger entry the moment the agent commits it.
 */
export type RunEvent =
  | { type: "entry"; entry: LedgerEntry }
  | { type: "done"; ledger: Ledger }
  | { type: "error"; message: string };

export interface RunRequest {
  task: string;
}
