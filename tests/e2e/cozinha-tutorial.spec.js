const { test, expect } = require("@playwright/test");

test("receitas, metas e orientação aparecem no começo da cozinha", async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto("/cozinha/#debug");
  await page.locator("#hName").fill("Chef");
  await page.locator("#btnCreate").click();
  await expect(page.locator("#lobby")).toBeVisible();
  await page.locator("#btnStart").click();
  await expect(page.locator("#receitas")).toBeVisible();
  await expect(page.locator("#receitasBox .ficha")).toHaveCount(1);
  await expect(page.locator("#receitasBox .ficha .ingredientes img")).toHaveCount(3); // a sopa leva 3 cebolas, como no Overcooked
  await expect(page.locator("#receitasBox")).toContainText("Caixa → Picar → Cozinhar → Prato → Entrega");
  await page.waitForFunction(() => window.__cozinha?.G.mesa?.fase === "jogo");
  await expect(page.locator("#receitas")).toBeHidden();
  await expect(page.locator("#hMetas .marca")).toHaveCount(3);
  await expect(page.locator("#guia")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#receitasPausa .ficha")).toHaveCount(1);
  expect(erros).toEqual([]);
  if (process.env.COZINHA_FOTO) await page.screenshot({ path: process.env.COZINHA_FOTO, fullPage: true });
});
