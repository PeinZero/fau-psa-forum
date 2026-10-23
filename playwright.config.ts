import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

// Chromium only: mobile is a 390px viewport, not WebKit, so CI stays fast and browser-agnostic.
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    // GitHub's ubuntu runners ship Chrome, so CI skips downloading a browser.
    ...(process.env.CI ? { channel: "chrome" } : {}),
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Video needs a separate ffmpeg download; traces and screenshots cover failures without it.
    video: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    // CI builds first; locally, reuse the dev server already running instead of starting a second one.
    command: process.env.CI ? `npm run start -- -p ${PORT}` : "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
