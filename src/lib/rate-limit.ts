/**
 * This app is public with no login, running on a free OpenRouter model (rate
 * limited, not billed) and a free Tavily plan (a fixed *monthly* search
 * quota — each run can use up to 3 searches, and once the quota is gone,
 * search fails for every visitor until it resets). A visible demo link with
 * no limit at all is one traffic spike away from being broken for everyone
 * who clicks it after the first burst, so this caps usage two ways: a short
 * per-IP window so one person can't eat the whole quota by spamming runs,
 * and a global daily ceiling that protects the monthly budget regardless of
 * how many different people show up.
 *
 * In-memory and scoped to one serverless instance, same tradeoff as
 * lib/store.ts — resets on cold start, doesn't coordinate across instances.
 * That's fine here: the goal is blunting a spike, not perfect enforcement.
 */

const PER_IP_LIMIT = 5;
const PER_IP_WINDOW_MS = 10 * 60 * 1000;
const DAILY_LIMIT = 60;

type RateLimitState = {
  perIp: Map<string, { count: number; windowStart: number }>;
  daily: { count: number; day: string };
};

const globalStore = globalThis as unknown as {
  __agentLedgerRateLimit?: RateLimitState;
};

const state: RateLimitState = (globalStore.__agentLedgerRateLimit ??= {
  perIp: new Map(),
  daily: { count: 0, day: "" },
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "ip"; retryAfterSeconds: number }
  | { allowed: false; reason: "global" };

export function checkRateLimit(ip: string): RateLimitResult {
  const day = today();
  if (state.daily.day !== day) {
    state.daily.day = day;
    state.daily.count = 0;
  }
  if (state.daily.count >= DAILY_LIMIT) {
    return { allowed: false, reason: "global" };
  }

  const now = Date.now();
  const entry = state.perIp.get(ip);

  if (!entry || now - entry.windowStart > PER_IP_WINDOW_MS) {
    state.perIp.set(ip, { count: 1, windowStart: now });
  } else if (entry.count >= PER_IP_LIMIT) {
    return {
      allowed: false,
      reason: "ip",
      retryAfterSeconds: Math.ceil(
        (entry.windowStart + PER_IP_WINDOW_MS - now) / 1000,
      ),
    };
  } else {
    entry.count += 1;
  }

  // Bound memory on a long-lived instance rather than growing forever.
  if (state.perIp.size > 500) {
    for (const [key, value] of state.perIp) {
      if (now - value.windowStart > PER_IP_WINDOW_MS) {
        state.perIp.delete(key);
      }
    }
  }

  state.daily.count += 1;
  return { allowed: true };
}

/** Best-effort client IP from the headers Vercel's edge sets. */
export function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
