const { test, expect } = require("@playwright/test");

for (const id of ["skyline-r33", "bmw-m4", "porsche-911", "porsche-718", "ferrari-sf90", "skyline-r34", "gallardo", "vw-phideon", "vw-polo", "vw-tcross"]) {
  test(`modelo ${id} carrega na corrida`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/corrida/drag/");
    await page.locator("#carSelect").selectOption(id);
    await expect(page.locator("#carStatus")).toHaveText("Modelo pronto", { timeout: 90000 });
    await page.locator("#start").click();
    await expect(page.locator("#hud")).toBeVisible();
    await page.waitForTimeout(700);
    await page.screenshot({ path: testInfo.outputPath(`${id}.png`) });
    expect(errors).toEqual([]);
  });
}
