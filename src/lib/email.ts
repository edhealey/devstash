import { Resend } from "resend";

// Resend transport. The API key lives in RESEND_API_KEY; EMAIL_FROM lets us
// swap the sender without a code change once a domain is verified. Until then
// we use Resend's built-in test sender, which can only deliver to the address
// that owns the Resend account.
const DEFAULT_FROM = "DevStash <onboarding@resend.dev>";

let client: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  client ??= new Resend(apiKey);
  return client;
}

interface VerificationEmailParams {
  to: string;
  name: string | null;
  verifyUrl: string;
}

// Sends the verification email. Returns whether it went out — callers treat a
// failure as recoverable (the user can request a new link) rather than fatal.
export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
}: VerificationEmailParams): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.error("[email] RESEND_API_KEY is not set; skipping send.");
    return false;
  }

  const greeting = name ? `Hi ${name},` : "Hi,";

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
      to,
      subject: "Verify your DevStash email",
      text: `${greeting}\n\nConfirm your email address to finish setting up your DevStash account:\n\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create a DevStash account, you can ignore this email.`,
      html: verificationEmailHtml(greeting, verifyUrl),
    });

    if (error) {
      console.error("[email] Resend rejected the verification email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[email] Failed to send verification email:", error);
    return false;
  }
}

interface PasswordResetEmailParams {
  to: string;
  name: string | null;
  resetUrl: string;
}

// Sends the password-reset email. Like the verification send, a failure is
// recoverable — the caller stays non-committal and the user can request another
// link — so this returns a boolean rather than throwing.
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: PasswordResetEmailParams): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.error("[email] RESEND_API_KEY is not set; skipping send.");
    return false;
  }

  const greeting = name ? `Hi ${name},` : "Hi,";

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
      to,
      subject: "Reset your DevStash password",
      text: `${greeting}\n\nWe received a request to reset your DevStash password. Use the link below to choose a new one:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request a password reset, you can ignore this email — your password won't change.`,
      html: passwordResetEmailHtml(greeting, resetUrl),
    });

    if (error) {
      console.error("[email] Resend rejected the password-reset email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[email] Failed to send password-reset email:", error);
    return false;
  }
}

// Email clients don't support stylesheets or modern CSS, so the markup below
// uses inline styles by necessity — this is the one place in the app that does.
function verificationEmailHtml(greeting: string, verifyUrl: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#fafafa;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background-color:#141414;border:1px solid #262626;border-radius:12px;">
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">Verify your email</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#a3a3a3;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#a3a3a3;">
            Confirm your email address to finish setting up your DevStash account.
          </p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background-color:#fafafa;color:#0a0a0a;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
            Verify email
          </a>
          <p style="margin:24px 0 0;font-size:12px;line-height:20px;color:#737373;">
            This link expires in 24 hours. If the button doesn't work, paste this into your browser:<br />
            <span style="color:#a3a3a3;word-break:break-all;">${verifyUrl}</span>
          </p>
          <p style="margin:16px 0 0;font-size:12px;line-height:20px;color:#737373;">
            If you didn't create a DevStash account, you can ignore this email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Same inline-style necessity as the verification email above.
function passwordResetEmailHtml(greeting: string, resetUrl: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#fafafa;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background-color:#141414;border:1px solid #262626;border-radius:12px;">
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">Reset your password</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#a3a3a3;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#a3a3a3;">
            We received a request to reset your DevStash password. Click below to choose a new one.
          </p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background-color:#fafafa;color:#0a0a0a;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
            Reset password
          </a>
          <p style="margin:24px 0 0;font-size:12px;line-height:20px;color:#737373;">
            This link expires in 1 hour. If the button doesn't work, paste this into your browser:<br />
            <span style="color:#a3a3a3;word-break:break-all;">${resetUrl}</span>
          </p>
          <p style="margin:16px 0 0;font-size:12px;line-height:20px;color:#737373;">
            If you didn't request a password reset, you can ignore this email — your password won't change.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
