// Single source of truth for whether new credentials accounts must verify their
// email before they can log in.
//
// Defaults to ON so production behavior is unchanged. Set
// EMAIL_VERIFICATION_ENABLED=false to disable the gate — useful while no domain
// is linked to Resend (its test sender only delivers to the account owner, so
// nobody else could complete verification).
//
// Read in the Node runtime only (register route + auth.ts authorize), never in
// the edge-safe auth.config.ts.
export function isEmailVerificationEnabled(): boolean {
  return process.env.EMAIL_VERIFICATION_ENABLED?.toLowerCase() !== "false";
}
