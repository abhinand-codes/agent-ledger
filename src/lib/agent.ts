import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { tavily } from "@tavily/core";
import { z } from "zod";

/**
 * OpenRouter model slug. Override with OPENROUTER_MODEL — OpenRouter retires
 * and renames free variants often, and the agent needs a tool-calling model.
 */
export const MODEL_ID =
  process.env.OPENROUTER_MODEL?.trim() || "moonshotai/kimi-k2:free";
export const AGENT_NAME = "research-agent";
export const TOOL_AGENT_NAME = "web_search";
export const ORCHESTRATOR_NAME = "orchestrator";
export const MAX_STEPS = 8;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

/**
 * The agent's single tool: Tavily web search.
 *
 * The result is deliberately trimmed to a small, stable shape — it is written
 * verbatim into the ledger, and an audit trail is only useful if a human can
 * read the evidence the agent actually acted on.
 */
export function createWebSearchTool() {
  const client = tavily({ apiKey: requireEnv("TAVILY_API_KEY") });

  return tool({
    description:
      "Search the live web for current information. Use this for anything " +
      "time-sensitive, factual, or that you cannot answer with confidence " +
      "from memory alone.",
    inputSchema: z.object({
      query: z.string().min(1).describe("A focused search query."),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(3)
        .describe("How many results to return (1-5)."),
    }),
    execute: async ({ query, maxResults }) => {
      const response = await client.search(query, {
        maxResults,
        searchDepth: "basic",
        includeAnswer: true,
      });

      return {
        query: response.query,
        answer: response.answer ? truncate(response.answer, 600) : null,
        results: response.results.slice(0, maxResults).map((result) => ({
          title: result.title,
          url: result.url,
          snippet: truncate(result.content, 400),
          score: result.score,
        })),
      };
    },
  });
}

const INSTRUCTIONS = [
  "You are a research agent whose every action is written to a tamper-evident audit ledger.",
  "",
  "Work like this:",
  "1. Before calling a tool, state in one or two sentences what you are about to check and why.",
  "2. Use the web_search tool for anything current, factual, or uncertain. Prefer searching over guessing.",
  `3. You may take at most ${MAX_STEPS} steps. Search at most three times, then answer.`,
  "4. Finish with a direct, specific answer to the task, and cite the URLs you relied on.",
  "",
  "Be concise. Never invent sources or URLs — cite only what the search results actually returned.",
].join("\n");

export function createResearchAgent() {
  const openrouter = createOpenRouter({
    apiKey: requireEnv("OPENROUTER_API_KEY"),
  });

  return new ToolLoopAgent({
    id: AGENT_NAME,
    model: openrouter.chat(MODEL_ID),
    instructions: INSTRUCTIONS,
    tools: { web_search: createWebSearchTool() },
    stopWhen: stepCountIs(MAX_STEPS),
    temperature: 0.2,
  });
}
