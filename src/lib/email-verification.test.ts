import { describe, expect, it, vi } from "vitest";

import { isEmailVerificationEnabled } from "@/lib/email-verification";

// `unstubEnvs` in vitest.config.ts restores process.env after each test, so
// these stubs can't leak into the rest of the suite.
describe("isEmailVerificationEnabled", () => {
  it("defaults to enabled when the variable is unset", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", undefined);
    expect(isEmailVerificationEnabled()).toBe(true);
  });

  it("is disabled only by the literal string 'false'", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "false");
    expect(isEmailVerificationEnabled()).toBe(false);
  });

  it("ignores the case of 'false'", () => {
    for (const value of ["FALSE", "False", "fAlSe"]) {
      vi.stubEnv("EMAIL_VERIFICATION_ENABLED", value);
      expect(isEmailVerificationEnabled()).toBe(false);
    }
  });

  it("stays enabled for any other value, including falsy-looking ones", () => {
    // Fail safe: a typo'd or unexpected value must not silently drop the
    // verification gate.
    for (const value of ["true", "0", "no", "off", "", " false", "disabled"]) {
      vi.stubEnv("EMAIL_VERIFICATION_ENABLED", value);
      expect(isEmailVerificationEnabled()).toBe(true);
    }
  });

  it("re-reads the variable on every call rather than caching it", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "false");
    expect(isEmailVerificationEnabled()).toBe(false);

    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "true");
    expect(isEmailVerificationEnabled()).toBe(true);
  });
});
