import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiting for the auth endpoints — brute force and credential stuffing on
// the login/reset paths, and abuse of the three endpoints that send email.
//
// Everything here fails OPEN: if Upstash isn't configured or is unreachable, the
// request is allowed through. A limiter outage must not lock people out of their
// own accounts.

// Named limits, keyed to the endpoint they guard. Windows use the Upstash
// duration syntax.
export const RATE_LIMITS = {
  login: { tokens: 5, window: "15 m" },
  register: { tokens: 3, window: "1 h" },
  forgotPassword: { tokens: 3, window: "1 h" },
  resetPassword: { tokens: 5, window: "15 m" },
  resendVerification: { tokens: 3, window: "15 m" },
} as const satisfies Record<string, { tokens: number; window: Duration }>;

export type RateLimitName = keyof typeof RATE_LIMITS;

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1];

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Epoch ms at which the window resets. */
  reset: number;
}

const ALLOWED: RateLimitResult = {
  success: true,
  remaining: Number.POSITIVE_INFINITY,
  reset: 0,
};

// Ceiling on how long a limiter check may add to an auth request. Upstash sits
// on the critical path of every sign-in, so a slow Redis has to be abandoned
// rather than waited out.
const LIMITER_TIMEOUT_MS = 1000;

let redis: Redis | null | undefined;

// Built on first use rather than at module load, so importing this file is safe
// regardless of env. `undefined` means "not resolved yet", `null` means
// "resolved, and there's no Upstash configured".
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // The client's default is 5 retries with exponential backoff — around 12
  // seconds of sleeping before it gives up. That's the wrong trade here: if
  // Redis is down we want to fail open immediately, not stall every login.
  redis =
    url && token
      ? new Redis({ url, token, retry: { retries: 1, backoff: () => 100 } })
      : null;
  if (!redis) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is disabled."
    );
  }

  return redis;
}

const limiters = new Map<RateLimitName, Ratelimit>();

function getLimiter(name: RateLimitName): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;

  let limiter = limiters.get(name);
  if (!limiter) {
    const { tokens, window } = RATE_LIMITS[name];
    limiter = new Ratelimit({
      redis: client,
      // Sliding window avoids the burst-at-the-boundary problem a fixed window
      // has: no doubling up by spending a full quota either side of the reset.
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `ratelimit:${name}`,
      analytics: false,
    });
    limiters.set(name, limiter);
  }

  return limiter;
}

/**
 * Best-effort client IP. Behind Vercel `x-forwarded-for` is a comma-separated
 * chain with the real client first. Falls back to a constant so a request with
 * no usable IP still gets limited (as a shared bucket) rather than skipped.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    if (first?.trim()) return first.trim();
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Composes the parts of a rate limit key, e.g. IP + email. */
export function rateLimitKey(...parts: string[]): string {
  return parts.join(":");
}

/**
 * Consumes one token for `key` against the named limit. Returns whether the
 * request may proceed, plus how many attempts are left and when the window
 * resets. Allows the request if the limiter is unavailable.
 */
export async function checkRateLimit(
  name: RateLimitName,
  key: string
): Promise<RateLimitResult> {
  const limiter = getLimiter(name);
  if (!limiter) return ALLOWED;

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    // Whichever settles first wins. Losing the race counts as unavailable, so
    // a hung Redis allows the request just like a failed one — the retry cap
    // above bounds the failure case, this bounds the slow case.
    const result = await Promise.race([
      limiter.limit(key),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), LIMITER_TIMEOUT_MS);
      }),
    ]);

    if (!result) {
      console.error(`[rate-limit] ${name} check timed out, allowing request.`);
      return ALLOWED;
    }

    const { success, remaining, reset } = result;
    return { success, remaining, reset };
  } catch (error) {
    console.error(`[rate-limit] ${name} check failed, allowing request:`, error);
    return ALLOWED;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Clears the consumed tokens for `key`. Used after a successful login so a
 * legitimate user's earlier failed attempts don't count against them.
 */
export async function resetRateLimit(
  name: RateLimitName,
  key: string
): Promise<void> {
  const limiter = getLimiter(name);
  if (!limiter) return;

  try {
    await limiter.resetUsedTokens(key);
  } catch (error) {
    console.error(`[rate-limit] ${name} reset failed:`, error);
  }
}

/** Whole minutes until the window resets, floored at 1. */
export function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

/** "Too many attempts. Please try again in 12 minutes." */
export function rateLimitMessage(reset: number): string {
  const seconds = retryAfterSeconds(reset);
  const minutes = Math.ceil(seconds / 60);
  const wait =
    seconds < 60
      ? `${seconds} second${seconds === 1 ? "" : "s"}`
      : `${minutes} minute${minutes === 1 ? "" : "s"}`;

  return `Too many attempts. Please try again in ${wait}.`;
}

/**
 * The 429 every limited route returns. Matches the project's
 * `{ success, data|error }` shape so existing forms surface it unchanged.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { success: false, error: rateLimitMessage(result.reset) },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds(result.reset)) },
    }
  );
}
