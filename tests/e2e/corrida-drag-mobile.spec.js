const { test, expect } = require("@playwright/test");

test("drag no celular acelera enquanto GÁS é segurado", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.goto("/corrida/drag/");
    await expect(page.locator("#carStatus")).toHaveText("Modelo pronto");
    await page.locator("#start").click();
    await expect(page.locator("body")).toHaveAttribute("data-phase", "race", { timeout: 60000 });
    const gas = page.locator('[data-action="gas"]');
    await expect(gas).toBeVisible();
    const box = await gas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(page.locator("#speed")).not.toHaveText("000");
    await page.screenshot({ path: testInfo.outputPath("drag-mobile-corrida.png") });
    await page.mouse.up();
  } finally { await context.close(); }
});
