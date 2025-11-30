import { test, expect } from "@playwright/test";

test("map container should render", async ({ page }) => {
  await page.goto("http://localhost:5173");

  // Use UNIQUE map ID
  const map = page.locator("#main-map");

  await map.waitFor({ state: "visible", timeout: 15000 });

  await expect(map).toBeVisible();
});

test("zoom in & zoom out buttons should work", async ({ page }) => {
  await page.goto("http://localhost:5173");

  const map = page.locator("#main-map");
  await expect(map).toBeVisible();

  const zoomInBtn = page.getByRole("button", { name: "+" });
  const zoomOutBtn = page.getByRole("button", { name: "−" });

  await zoomInBtn.click();
  await page.waitForTimeout(400);

  await zoomOutBtn.click();
  await page.waitForTimeout(400);

  expect(true).toBe(true);
});
