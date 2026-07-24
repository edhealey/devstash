// Shared between the credentials `authorize` callback (which throws it) and the
// login form (which reads it off the signIn result). Lives in its own module so
// the client bundle doesn't have to import auth.ts, and with it Prisma/bcrypt.
export const EMAIL_NOT_VERIFIED_CODE = "email_not_verified";

// Same round trip, for when the sign-in attempt was rejected by the rate
// limiter before the password was ever checked.
export const RATE_LIMITED_CODE = "rate_limited";
