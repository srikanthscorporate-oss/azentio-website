import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3100" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Responsive checks also run in Safari's engine. (Playwright's Firefox build fails to start on this machine.)
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testMatch: /responsive/ },
  ],
});
