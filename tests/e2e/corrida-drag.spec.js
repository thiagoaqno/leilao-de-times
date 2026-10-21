const { test, expect } = require("@playwright/test");

test("drag abre, troca marcha e muda de faixa", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/corrida/drag/");
  await expect(page.locator(".track")).toHaveCount(3);
  await expect(page.locator("#carSelect option")).toHaveCount(6);
  await expect(page.locator("#carStatus")).toHaveText("Modelo pronto");
  await page.screenshot({ path: testInfo.outputPath("corrida-drag-menu.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("corrida-drag-mobile.png") });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("button", { name: /estrada do sol/i }).click();
  await page.getByRole("button", { name: /largar nesta pista/i }).click();
  await expect(page.locator("#hud")).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-phase", "race", { timeout: 20000 });
  await page.keyboard.down("w");
  await expect(page.locator("#speed")).not.toHaveText("000");
  await page.keyboard.press("ShiftLeft");
  await expect(page.locator("#gear")).toHaveText("2");
  await page.waitForTimeout(500);
  await page.keyboard.press("ControlLeft");
  await expect(page.locator("#gear")).toHaveText("1");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#lane")).toContainText("DIREITA");
  await page.keyboard.up("w");
  const tracks = await (await page.request.get("/api/corrida/drag/musicas")).json();
  if (tracks.length) {
    await expect(page.locator("#song")).toContainText("♪");
    await expect.poll(() => page.locator("#musicAudio").evaluate((a) => a.paused)).toBe(false);
  } else await expect(page.locator("#song")).toBeEmpty(); // pasta vazia não impede a corrida
  await page.screenshot({ path: testInfo.outputPath("corrida-drag.png") });
  expect(errors).toEqual([]);
});

test("segurar W sem trocar marcha explode o motor e encerra a corrida", async ({ page }) => {
  await page.goto("/corrida/drag/");
  await expect(page.locator("#carStatus")).toHaveText("Modelo pronto");
  await page.locator("#start").click();
  await expect(page.locator("body")).toHaveAttribute("data-phase", "race", { timeout: 20000 });
  await page.keyboard.down("w");
  await expect(page.locator("body")).toHaveAttribute("data-phase", "finish", { timeout: 60000 });
  await expect(page.locator("#result")).toHaveText("MOTOR EXPLODIU");
  await page.keyboard.up("w");
});
