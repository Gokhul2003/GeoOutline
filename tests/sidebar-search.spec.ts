import { test, expect } from "@playwright/test";

test("search bar should accept input", async ({ page }) => {
  await page.goto("http://localhost:5173");

  const input = page.getByPlaceholder("Search Germany (city, state...)");

  await input.fill("Berlin");
  await expect(input).toHaveValue("Berlin");
});
