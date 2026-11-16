/**
 * Agent Ledger — the hash chain.
 *
 * Every step an agent takes is appended as an entry whose hash commits to both
 * the entry's own contents and the hash of the entry before it:
 *
 *   hash = sha256(prevHash + JSON.stringify({ stepId, timestamp, agent, action, input, output }))
 *
 * The first entry's prevHash is the literal string "GENESIS". Changing any
 * field of any entry changes that entry's hash, which orphans every entry that
 * followed it. This module is isomorphic: the server builds the chain with it
 * and the browser re-derives the chain with the exact same code, which is what
 * makes client-side verification meaningful.
 */

export const GENESIS = "GENESIS";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type LedgerAction =
  | "plan"
  | "reasoning"
  | "tool_call"
  | "tool_result"
  | "final_answer"
  | "error";

/** The fields that are covered by the hash. */
export interface LedgerEntryBody {
  stepId: string;
  timestamp: string;
  agent: string;
  action: LedgerAction;
  input: JsonValue;
  output: JsonValue;
}

export interface LedgerEntry extends LedgerEntryBody {
  prevHash: string;
  hash: string;
}

export interface Ledger {
  runId: string;
  task: string;
  model: string;
  startedAt: string;
  finishedAt: string | null;
  entries: LedgerEntry[];
}

/**
 * Canonical serialization of the signed portion of an entry.
 *
 * The key order here is the contract — it must be byte-identical on the server
 * that writes the chain and in the browser that checks it, so the object is
 * built explicitly rather than spread from the entry.
 */
export function serializeBody(entry: LedgerEntryBody): string {
  return JSON.stringify({
    stepId: entry.stepId,
    timestamp: entry.timestamp,
    agent: entry.agent,
    action: entry.action,
    input: entry.input,
    output: entry.output,
  });
}

export async function sha256Hex(message: string): Promise<string> {
  const bytes = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function hashEntry(
  body: LedgerEntryBody,
  prevHash: string,
): Promise<string> {
  return sha256Hex(prevHash + serializeBody(body));
}

/** Append-only builder used server-side while an agent run is in flight. */
export class LedgerChain {
  private readonly entries: LedgerEntry[] = [];

  get length(): number {
    return this.entries.length;
  }

  get head(): string {
    return this.entries.at(-1)?.hash ?? GENESIS;
  }

  snapshot(): LedgerEntry[] {
    return [...this.entries];
  }

  async append(step: {
    agent: string;
    action: LedgerAction;
    input: JsonValue;
    output: JsonValue;
  }): Promise<LedgerEntry> {
    const prevHash = this.head;
    const body: LedgerEntryBody = {
      stepId: `step-${String(this.entries.length + 1).padStart(3, "0")}`,
      timestamp: new Date().toISOString(),
      agent: step.agent,
      action: step.action,
      input: step.input,
      output: step.output,
    };

    const entry: LedgerEntry = {
      ...body,
      prevHash,
      hash: await hashEntry(body, prevHash),
    };

    this.entries.push(entry);
    return entry;
  }
}

export type IssueKind = "hash_mismatch" | "link_mismatch";

export interface VerificationIssue {
  index: number;
  stepId: string;
  kind: IssueKind;
  /** What the chain says should be there. */
  expected: string;
  /** What the ledger actually carries. */
  actual: string;
}

export interface VerificationResult {
  valid: boolean;
  checkedAt: string;
  entriesChecked: number;
  issues: VerificationIssue[];
  /**
   * Index of the earliest broken entry. Everything at or after this index is
   * untrustworthy: the chain cannot vouch for entries that descend from a
   * broken link.
   */
  firstBrokenIndex: number | null;
}

/**
 * Recompute the whole chain and compare it against what the ledger claims.
 *
 * Two independent checks per entry:
 *  - `hash_mismatch`: the entry's own hash no longer matches its contents,
 *    i.e. a field was edited after the fact.
 *  - `link_mismatch`: the entry's prevHash does not point at the previous
 *    entry's hash, i.e. an entry was inserted, removed or reordered.
 */
export async function verifyChain(
  entries: LedgerEntry[],
): Promise<VerificationResult> {
  const issues: VerificationIssue[] = [];
  let expectedPrevHash = GENESIS;

  for (const [index, entry] of entries.entries()) {
    if (entry.prevHash !== expectedPrevHash) {
      issues.push({
        index,
        stepId: entry.stepId,
        kind: "link_mismatch",
        expected: expectedPrevHash,
        actual: entry.prevHash,
      });
    }

    const recomputed = await hashEntry(entry, entry.prevHash);
    if (recomputed !== entry.hash) {
      issues.push({
        index,
        stepId: entry.stepId,
        kind: "hash_mismatch",
        expected: recomputed,
        actual: entry.hash,
      });
    }

    expectedPrevHash = entry.hash;
  }

  return {
    valid: issues.length === 0,
    checkedAt: new Date().toISOString(),
    entriesChecked: entries.length,
    issues,
    firstBrokenIndex: issues.length > 0 ? Math.min(...issues.map((i) => i.index)) : null,
  };
}

export function shortHash(hash: string, length = 10): string {
  if (hash === GENESIS) return GENESIS;
  return hash.slice(0, length);
}
