import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests cover server actions and utilities only — no components. Nothing
// renders, so there is no jsdom environment and no React plugin here; adding a
// component test would mean adding both, deliberately, rather than by accident.
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // `.ts` only. Component tests would need `.tsx` plus a DOM environment, so
    // the scope of this suite is enforced by config, not just by convention.
    include: ["src/**/*.test.ts"],
    // Nothing in a unit test may reach the database or the network.
    exclude: ["node_modules/**", ".next/**", "src/generated/**"],
    // No test may leak state into the next one: mock call history is cleared,
    // spies are restored, and any `vi.stubEnv` / `vi.stubGlobal` is undone.
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
  resolve: {
    // Mirrors the `@/*` -> `./src/*` mapping in tsconfig.json.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
