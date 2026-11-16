import {
  AGENT_NAME,
  MAX_STEPS,
  MODEL_ID,
  ORCHESTRATOR_NAME,
  TOOL_AGENT_NAME,
  createResearchAgent,
} from "@/lib/agent";
import {
  LedgerChain,
  type JsonValue,
  type Ledger,
  type LedgerAction,
} from "@/lib/ledger";
import type { RunEvent } from "@/lib/protocol";
import { getRun, saveRun } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TASK_LENGTH = 500;

/** Force any value through JSON so only plain, hashable data enters the chain. */
function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(request: Request): Promise<Response> {
  const runId = new URL(request.url).searchParams.get("runId");
  if (!runId) {
    return Response.json(
      { error: "Add ?runId=<id> to look up a stored run." },
      { status: 400 },
    );
  }

  const ledger = getRun(runId);
  if (!ledger) {
    return Response.json(
      {
        error: `No run found for "${runId}". Runs are kept in memory, so they don't survive a server restart or a new deployment.`,
      },
      { status: 404 },
    );
  }

  return Response.json(ledger);
}

export async function POST(request: Request): Promise<Response> {
  let task: string;
  try {
    const body = (await request.json()) as { task?: unknown };
    task = typeof body.task === "string" ? body.task.trim() : "";
  } catch {
    return Response.json(
      { error: "That request wasn't valid JSON — the body must be { \"task\": string }." },
      { status: 400 },
    );
  }

  if (!task) {
    return Response.json(
      { error: "Give the agent something to do first — the task can't be empty." },
      { status: 400 },
    );
  }
  if (task.length > MAX_TASK_LENGTH) {
    return Response.json(
      {
        error: `That task is ${task.length} characters — keep it under ${MAX_TASK_LENGTH} so the agent stays focused on one thing.`,
      },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const chain = new LedgerChain();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: RunEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      const record = async (step: {
        agent: string;
        action: LedgerAction;
        input: unknown;
        output: unknown;
      }) => {
        const entry = await chain.append({
          agent: step.agent,
          action: step.action,
          input: toJson(step.input),
          output: toJson(step.output),
        });
        emit({ type: "entry", entry });
      };

      try {
        await record({
          agent: ORCHESTRATOR_NAME,
          action: "plan",
          input: { task },
          output: {
            objective: task,
            model: MODEL_ID,
            tools: ["web_search"],
            maxSteps: MAX_STEPS,
          },
        });

        const agent = createResearchAgent();
        const result = await agent.stream({ prompt: task });

        let stepNumber = 1;
        let narration = "";
        let thinking = "";

        // Text the model produces before a tool call is its reasoning for that
        // call; text left over when the run finishes is the final answer.
        const flushNarration = async (action: "reasoning" | "final_answer") => {
          const text = narration.trim();
          narration = "";
          if (!text) return false;
          await record({
            agent: AGENT_NAME,
            action,
            input: { step: stepNumber },
            output: { text },
          });
          return true;
        };

        const flushThinking = async () => {
          const text = thinking.trim();
          thinking = "";
          if (!text) return;
          await record({
            agent: AGENT_NAME,
            action: "reasoning",
            input: { step: stepNumber, channel: "model_reasoning" },
            output: { text },
          });
        };

        for await (const part of result.fullStream) {
          switch (part.type) {
            case "text-delta":
              narration += part.text;
              break;

            case "reasoning-delta":
              thinking += part.text;
              break;

            case "start-step":
              stepNumber += 1;
              break;

            case "tool-call":
              await flushThinking();
              await flushNarration("reasoning");
              await record({
                agent: AGENT_NAME,
                action: "tool_call",
                input: { tool: part.toolName, arguments: part.input },
                output: { toolCallId: part.toolCallId, status: "dispatched" },
              });
              break;

            case "tool-result":
              await record({
                agent: TOOL_AGENT_NAME,
                action: "tool_result",
                input: { tool: part.toolName, arguments: part.input },
                output: part.output,
              });
              break;

            case "tool-error":
              await record({
                agent: TOOL_AGENT_NAME,
                action: "error",
                input: { tool: part.toolName, arguments: part.input },
                output: { message: errorMessage(part.error) },
              });
              break;

            case "error":
              await record({
                agent: AGENT_NAME,
                action: "error",
                input: { step: stepNumber },
                output: { message: errorMessage(part.error) },
              });
              break;

            default:
              break;
          }
        }

        await flushThinking();
        const answered = await flushNarration("final_answer");

        // The loop can end because the model finished, or because it burned
        // through its step budget mid-investigation. The ledger has to say
        // which — an audit trail that silently ends is worse than useless.
        if (!answered) {
          await record({
            agent: ORCHESTRATOR_NAME,
            action: "error",
            input: { task, maxSteps: MAX_STEPS },
            output: {
              message: `Run ended after ${MAX_STEPS} steps without a final answer (finishReason: ${await result.finishReason}).`,
            },
          });
        }
      } catch (error) {
        // The run failed, but the ledger still has to be a faithful record of
        // what happened — so the failure is itself a chained entry.
        await record({
          agent: ORCHESTRATOR_NAME,
          action: "error",
          input: { task },
          output: { message: errorMessage(error) },
        });
        emit({ type: "error", message: errorMessage(error) });
      }

      const ledger: Ledger = {
        runId,
        task,
        model: MODEL_ID,
        startedAt,
        finishedAt: new Date().toISOString(),
        entries: chain.snapshot(),
      };

      saveRun(ledger);
      emit({ type: "done", ledger });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
