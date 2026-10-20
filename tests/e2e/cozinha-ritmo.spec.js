const { test, expect } = require("@playwright/test");

test("a cozinha mostra metas calibradas e começa com pedidos disponíveis", async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto("/cozinha/#debug");
  await page.locator("#hName").fill("Chef");
  await page.locator("#btnCreate").click();
  await page.locator("#btnStart").click();
  await page.waitForFunction(() => window.__cozinha?.G.mesa?.fase === "jogo");
  const dados = await page.evaluate(() => {
    const { G, K } = window.__cozinha;
    return { pedidos: G.mesa.pedidos.length, meta: G.mesa.meta, calculada: K.metaDe(K.COZINHAS[G.coz], 1) };
  });
  expect(dados.pedidos).toBe(2);
  expect(dados.meta).toEqual(dados.calculada);
  expect(erros).toEqual([]);
  if (process.env.COZINHA_FOTO) await page.screenshot({ path: process.env.COZINHA_FOTO, fullPage: true });
});
