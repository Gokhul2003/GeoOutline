// import { test, expect } from '@playwright/test';

// test('app loads and map container visible', async ({ page }) => {
//   await page.goto('http://localhost:5173');
//   await expect(page.locator('.leaflet-container')).toBeVisible();
// });

// test('zoom control changes zoom', async ({ page }) => {
//   await page.goto('http://localhost:5173');
//   const before = await page.evaluate(() => (window as any).__test_getMapZoom?.());
//   await page.click('button[title="Zoom in"], .controls-cluster button:first-child');
//   const after = await page.evaluate(() => (window as any).__test_getMapZoom?.());
//   expect(after).toBeGreaterThanOrEqual(before || 0);
// });

// test('draw polygon stores AOI', async ({ page }) => {
//   await page.goto('http://localhost:5173');
//   const polygonBtn = page.locator('.leaflet-draw-draw-polygon');
//   if (await polygonBtn.count() > 0) {
//     await polygonBtn.click();
//     await page.mouse.click(600, 300);
//     await page.mouse.click(650, 320);
//     await page.mouse.click(570, 360);
//     await page.keyboard.press('Escape');
//     const stored = await page.evaluate(() => localStorage.getItem('flowbit_aoi_features_v1'));
//     expect(stored).not.toBeNull();
//   } else {
//     test.skip(true, 'Leaflet draw UI not present in headless environment');
//   }
// });
