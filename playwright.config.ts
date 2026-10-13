import { defineConfig, devices } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";

/**
 * Testy E2E uruchamiają zbudowaną aplikację (next start) na porcie 3100 z osobną bazą `*_e2e`
 * (zmienne z .env.test, DATABASE_URL podmieniony na bazę e2e). Baza jest czyszczona i seedowana danymi demo.
 */
const env: Record<string, string> = {};
if (existsSync(".env.test")) {
  for (const line of readFileSync(".env.test", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m) env[m[1]!] = m[2]!;
  }
}
env.DATABASE_URL = (process.env.E2E_DATABASE_URL ?? env.DATABASE_URL ?? "").replace(/loyalty_test/, "loyalty_e2e");
env.APP_URL = "http://localhost:3100";
env.DEMO_MODE = "true";
env.SEED_DEMO = "true";
Object.assign(process.env, env);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3100",
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /customer|a11y/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } }, testMatch: /admin|a11y/ },
  ],
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 60_000,
    env,
  },
});
