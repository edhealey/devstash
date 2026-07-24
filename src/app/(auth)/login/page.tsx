import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

// Only accept relative same-origin callback paths to avoid open redirects.
//
// Prefix matching is not enough here: the URL parser treats `\` as `/` for HTTP
// URLs, so `/\evil.com` passes a `startsWith("/") && !startsWith("//")` check
// but resolves to `http://evil.com/` once the browser navigates. Parsing
// against a sentinel origin and keeping only the path normalizes those escapes
// away — anything absolute, protocol-relative, or backslash-smuggled lands on a
// different origin and is rejected.
const SENTINEL_ORIGIN = "http://internal.invalid";

function safeCallbackUrl(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "/dashboard";
  }

  try {
    const url = new URL(value, SENTINEL_ORIGIN);
    if (url.origin !== SENTINEL_ORIGIN) {
      return "/dashboard";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string;
    verified?: string;
    reset?: string;
  }>;
}) {
  const { callbackUrl, error, verified, reset } = await searchParams;

  return (
    <LoginForm
      callbackUrl={safeCallbackUrl(callbackUrl)}
      initialError={error}
      verified={verified === "1"}
      reset={reset === "1"}
    />
  );
}
