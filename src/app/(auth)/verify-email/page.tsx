import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";

export const dynamic = "force-dynamic";

// Every failed verification lands here, plus anyone who needs a fresh link.
const STATUS_COPY: Record<string, { title: string; message: string }> = {
  expired: {
    title: "That link has expired",
    message:
      "Verification links are valid for 24 hours. Enter your email and we'll send a new one.",
  },
  invalid: {
    title: "That link isn't valid",
    message:
      "It may have already been used. Enter your email and we'll send a new one.",
  },
  error: {
    title: "Something went wrong",
    message: "We couldn't verify that link. Enter your email to try again.",
  },
};

const DEFAULT_COPY = {
  title: "Verify your email",
  message:
    "Enter your email address and we'll send you a fresh verification link.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const copy = (status && STATUS_COPY[status]) || DEFAULT_COPY;

  return <ResendVerificationForm title={copy.title} message={copy.message} />;
}
