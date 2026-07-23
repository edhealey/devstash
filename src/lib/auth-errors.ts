// Shared between the credentials `authorize` callback (which throws it) and the
// login form (which reads it off the signIn result). Lives in its own module so
// the client bundle doesn't have to import auth.ts, and with it Prisma/bcrypt.
export const EMAIL_NOT_VERIFIED_CODE = "email_not_verified";
