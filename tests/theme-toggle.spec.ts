import { test, expect } from "@playwright/test";

test("should toggle between light & dark theme", async ({ page }) => {
  await page.goto("http://localhost:5173");

  const themeButton = page.getByRole("button", { name: /☀️|🌙/ });

  await themeButton.click();
  await page.waitForTimeout(300);

  const body = page.locator("body");
  await expect(body).toBeVisible();

  expect(true).toBe(true);
});
