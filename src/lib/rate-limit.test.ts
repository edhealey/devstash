import { afterEach, describe, expect, it, vi } from "vitest";

import {
  RATE_LIMITS,
  getClientIp,
  rateLimitKey,
  rateLimitMessage,
  rateLimitResponse,
  retryAfterSeconds,
} from "@/lib/rate-limit";

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("https://devstash.test/api/auth/login", {
    method: "POST",
    headers,
  });
}

describe("RATE_LIMITS", () => {
  it("guards all five auth endpoints", () => {
    expect(Object.keys(RATE_LIMITS).sort()).toEqual([
      "forgotPassword",
      "login",
      "register",
      "resendVerification",
      "resetPassword",
    ]);
  });

  it("allows at least one attempt per limit", () => {
    for (const [name, { tokens }] of Object.entries(RATE_LIMITS)) {
      expect(tokens, name).toBeGreaterThan(0);
    }
  });
});

describe("getClientIp", () => {
  it("takes the first entry of an x-forwarded-for chain", () => {
    // The chain is client, then each proxy — the leftmost is the real client.
    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178",
    });

    expect(getClientIp(request)).toBe("203.0.113.5");
  });

  it("trims whitespace around the address", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "  203.0.113.5  " });
    expect(getClientIp(request)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = requestWithHeaders({ "x-real-ip": "198.51.100.7" });
    expect(getClientIp(request)).toBe("198.51.100.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is blank", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "   ",
      "x-real-ip": "198.51.100.7",
    });

    expect(getClientIp(request)).toBe("198.51.100.7");
  });

  it("returns a shared bucket rather than skipping when no IP header is set", () => {
    // Deliberate: an unidentifiable client is limited alongside every other
    // unidentifiable client, not waved through.
    expect(getClientIp(requestWithHeaders({}))).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip when both are present", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.5",
      "x-real-ip": "198.51.100.7",
    });

    expect(getClientIp(request)).toBe("203.0.113.5");
  });
});

describe("rateLimitKey", () => {
  it("joins the parts of a composite key", () => {
    expect(rateLimitKey("203.0.113.5", "user@example.com")).toBe(
      "203.0.113.5:user@example.com"
    );
  });

  it("keeps different emails from the same IP in separate buckets", () => {
    const ip = "203.0.113.5";

    expect(rateLimitKey(ip, "a@example.com")).not.toBe(
      rateLimitKey(ip, "b@example.com")
    );
  });
});

describe("retryAfterSeconds", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("converts a reset timestamp into whole seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    expect(retryAfterSeconds(Date.now() + 90_000)).toBe(90);
  });

  it("rounds a partial second up", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    expect(retryAfterSeconds(Date.now() + 1_500)).toBe(2);
  });

  it("floors at one second for a reset already in the past", () => {
    // Retry-After: 0 (or negative) would invite an immediate retry.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    expect(retryAfterSeconds(Date.now() - 60_000)).toBe(1);
    expect(retryAfterSeconds(Date.now())).toBe(1);
  });
});

describe("rateLimitMessage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function messageIn(ms: number): string {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    return rateLimitMessage(Date.now() + ms);
  }

  it("uses seconds under a minute", () => {
    expect(messageIn(30_000)).toBe(
      "Too many attempts. Please try again in 30 seconds."
    );
  });

  it("uses minutes at a minute or more", () => {
    expect(messageIn(12 * 60_000)).toBe(
      "Too many attempts. Please try again in 12 minutes."
    );
  });

  it("singularizes one second and one minute", () => {
    expect(messageIn(1_000)).toContain("in 1 second.");
    expect(messageIn(60_000)).toContain("in 1 minute.");
  });

  it("rounds partial minutes up, so the wait is never understated", () => {
    expect(messageIn(61_000)).toContain("in 2 minutes.");
  });
});

describe("rateLimitResponse", () => {
  it("returns a 429 in the project's { success, error } shape", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));
    const reset = Date.now() + 5 * 60_000;
    vi.useRealTimers();

    const response = rateLimitResponse({ success: false, remaining: 0, reset });

    expect(response.status).toBe(429);
    // The existing forms read `error` off the body — that contract is what lets
    // a 429 surface without any frontend change.
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: expect.stringContaining("Too many attempts."),
    });
  });

  it("sets Retry-After in seconds", () => {
    const reset = Date.now() + 5 * 60_000;
    const response = rateLimitResponse({ success: false, remaining: 0, reset });
    const retryAfter = Number(response.headers.get("Retry-After"));

    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(300);
  });
});

describe("checkRateLimit / resetRateLimit without Upstash configured", () => {
  it("fails open and never throws", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
    // The Redis client is memoized at module scope, so the env has to be
    // stubbed before the module's first use — hence the reset + fresh import.
    vi.resetModules();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { checkRateLimit, resetRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("login", "203.0.113.5:user@example.com");

    // A limiter outage must not lock anyone out of their own account.
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(Number.POSITIVE_INFINITY);
    await expect(
      resetRateLimit("login", "203.0.113.5:user@example.com")
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
