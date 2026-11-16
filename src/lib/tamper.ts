import type { JsonValue, LedgerEntry } from "@/lib/ledger";

export interface TamperResult {
  entries: LedgerEntry[];
  stepId: string;
  /** Human-readable account of exactly what was changed. */
  description: string;
}

const FORGED_CLAIM =
  "All sources independently confirmed the agent's preferred conclusion.";

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Edit one string inside an entry's output, leaving every other byte — and
 * every stored hash — untouched. This is the whole point of the demo: the
 * forgery is invisible to the eye and obvious to the chain.
 */
function forgeOutput(
  output: JsonValue,
): { output: JsonValue; field: string } | null {
  if (!isRecord(output)) return null;

  if (typeof output.text === "string") {
    return {
      output: { ...output, text: `${output.text} ${FORGED_CLAIM}` },
      field: "output.text",
    };
  }

  if (typeof output.answer === "string") {
    return { output: { ...output, answer: FORGED_CLAIM }, field: "output.answer" };
  }

  if (Array.isArray(output.results) && output.results.length > 0) {
    const [first, ...rest] = output.results;
    if (isRecord(first) && typeof first.snippet === "string") {
      return {
        output: {
          ...output,
          results: [{ ...first, snippet: FORGED_CLAIM }, ...rest],
        },
        field: "output.results[0].snippet",
      };
    }
  }

  if (typeof output.message === "string") {
    return {
      output: { ...output, message: FORGED_CLAIM },
      field: "output.message",
    };
  }

  return null;
}

/** Prefer the step whose forgery would matter most: evidence, then conclusions. */
function pickTarget(entries: LedgerEntry[]): number {
  const byAction = (action: LedgerEntry["action"]) =>
    entries.findIndex((entry) => entry.action === action);

  for (const action of ["tool_result", "final_answer", "reasoning"] as const) {
    const index = byAction(action);
    if (index !== -1) return index;
  }

  return entries.length > 1 ? 1 : 0;
}

export function simulateTampering(entries: LedgerEntry[]): TamperResult | null {
  if (entries.length === 0) return null;

  const index = pickTarget(entries);
  const target = entries[index];
  const forged = forgeOutput(target.output);

  if (!forged) return null;

  const next = [...entries];
  // prevHash and hash are copied over untouched — exactly what a forger would
  // do, hoping nobody recomputes the chain.
  next[index] = { ...target, output: forged.output };

  return {
    entries: next,
    stepId: target.stepId,
    description: `Rewrote ${forged.field} on ${target.stepId} (${target.action}) and left its stored hash untouched.`,
  };
}
