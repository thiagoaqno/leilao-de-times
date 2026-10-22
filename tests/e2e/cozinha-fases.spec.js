const { test, expect } = require("@playwright/test");
const path = require("node:path");

test("as cozinhas de novos caminhos e da casa cheia podem ser escolhidas e jogadas", async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.addInitScript(() => localStorage.setItem("cozinha:estrelas", JSON.stringify({
    "1-1": 1, "1-2": 1, "1-3": 1, "2-1": 1, "2-2": 1, "2-3": 1, "3-1": 1, "3-2": 1, "3-3": 1,
    "4-1": 1, "4-2": 1, "4-3": 1, "4-4": 1, "4-5": 1,
  })));
  for (const id of ["3-1", "3-2", "3-3", "4-1", "4-2", "4-3", "4-4", "4-5", "4-6"]) {
    await page.goto("/cozinha/#debug");
    await page.locator("#hName").fill("Chef");
    await page.locator("#btnCreate").click();
    await expect(page.locator("#lCoz .mundo")).toHaveCount(4);
    const fase = page.locator(`[data-coz="${id}"]`);
    await expect(fase).toBeEnabled();
    await fase.click();
    await expect.poll(() => page.evaluate(() => window.__cozinha.S?.config.cozinha)).toBe(id);
    await page.locator("#btnStart").click();
    await page.waitForFunction(() => window.__cozinha?.G.mesa?.fase === "jogo");
    await expect(page.locator("#hPed .ped")).toHaveCount(2);
    expect(await page.evaluate(() => window.__cozinha.G.coz)).toBe(id);
    if (process.env.COZINHA_FOTOS) await page.screenshot({ path: path.join(process.env.COZINHA_FOTOS, `cozinha-${id}.png`) });
  }
  expect(erros).toEqual([]);
});
