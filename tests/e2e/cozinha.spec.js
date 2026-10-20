const { test, expect } = require("@playwright/test");

test("a cozinha abre com as bancadas e responde ao teclado", async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto("/cozinha/#debug");
  await page.locator("#hName").fill("Chef");
  await page.locator("#btnCreate").click();
  await expect(page.locator("#lobby")).toBeVisible();
  await page.locator("#btnStart").click();
  await expect(page.locator("#game")).toBeVisible();
  await page.waitForFunction(() => window.__cozinha?.G.mesa?.fase === "jogo");
  await expect(page.locator("#hPed .ped")).toHaveCount(2);
  const inicio = await page.evaluate(() => window.__cozinha.G.me.z);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(350);
  await page.keyboard.up("ArrowDown");
  await expect.poll(() => page.evaluate(() => window.__cozinha.G.me.z)).toBeGreaterThan(inicio + 0.1);
  expect(erros).toEqual([]);
  if (process.env.COZINHA_FOTO) await page.screenshot({ path: process.env.COZINHA_FOTO, fullPage: true });
});
