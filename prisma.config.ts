import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 configuration.
// The datasource `url` and the seed command live here (not in schema.prisma).
// Migrations for driver adapters work automatically — no adapter block needed.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
