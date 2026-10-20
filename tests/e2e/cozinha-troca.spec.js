const { test, expect } = require("@playwright/test");

test("Q troca o cozinheiro controlado na partida solo", async ({ page }) => {
  const erros = []; page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto("/cozinha/#debug");
  await page.locator("#hName").fill("Chef");
  await page.locator("#btnCreate").click();
  await expect(page.locator("#lRobos")).toContainText("Cozinheiros extras");
  await page.locator("#btnStart").click();
  await page.waitForFunction(() => window.__cozinha?.G.mesa?.fase === "jogo");
  const antes = await page.evaluate(() => ({ id: window.__cozinha.G.myId, n: window.__cozinha.G.corpos.size }));
  expect(antes.n).toBe(2);
  await page.keyboard.press("q");
  await expect.poll(() => page.evaluate(() => window.__cozinha.G.myId)).not.toBe(antes.id);
  expect(erros).toEqual([]);
  if (process.env.COZINHA_FOTO) await page.screenshot({ path: process.env.COZINHA_FOTO, fullPage: true });
});
