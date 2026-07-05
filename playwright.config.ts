import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * E2E con Playwright + Clerk (utente di test, nessuna email reale).
 * Richiede in .env: chiavi Clerk + E2E_CLERK_USER_EMAIL / E2E_CLERK_USER_PASSWORD.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global.setup.ts",
  timeout: 120_000, // il dev server compila le pagine al primo hit

  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
