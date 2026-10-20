const { test, expect } = require("@playwright/test");

test("cozinha em pé mostra controles sem pedir para girar o celular", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  try {
    await page.goto("/cozinha/#debug");
    await page.locator("#hName").fill("Chef");
    await page.locator("#btnCreate").click();
    await expect(page.locator("#lobby")).toBeVisible();
    await page.locator("#btnStart").click();
    await page.waitForFunction(() => window.__cozinha?.G.mesa?.fase === "jogo");
    await expect(page.locator("#toque")).toBeVisible();
    await expect(page.locator("#toque .turn")).toBeHidden();
    await expect(page.locator("#toque .top button")).toHaveCount(2);
    await expect(page.locator("#toque .top")).toContainText("chão");
    const botoes = await page.locator("#toque .btns button").all();
    expect(botoes).toHaveLength(4);
    const posicoes = await Promise.all(botoes.map((b) => b.boundingBox()));
    expect(Math.max(...posicoes.map((p) => p.y)) - Math.min(...posicoes.map((p) => p.y))).toBeLessThan(12);
    expect(erros).toEqual([]);
    if (process.env.COZINHA_FOTO) await page.screenshot({ path: process.env.COZINHA_FOTO, fullPage: true });
  } finally { await context.close(); }
});
