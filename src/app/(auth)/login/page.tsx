import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

// Only accept relative same-origin callback paths to avoid open redirects.
function safeCallbackUrl(value: string | string[] | undefined) {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
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
