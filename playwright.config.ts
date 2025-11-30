// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    timeout: 40_000,
    reuseExistingServer: true
  },

  use: {
    
    browserName: "chromium",
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      slowMo: 1000
    }
  }
});
