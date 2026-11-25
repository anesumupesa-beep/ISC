import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const baseURL = process.env.ISC_BASE_URL || "http://localhost:3000";
const student = "tests/.auth/student.json";

export default defineConfig({
  testDir: "./tests",
  // Tests share one database and three accounts, so run them one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { viewport: { width: 1440, height: 1000 }, storageState: student },
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        storageState: student,
      },
    },
  ],
  webServer: process.env.ISC_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm start",
        url: baseURL,
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
      },
});
