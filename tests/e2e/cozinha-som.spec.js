const { test, expect } = require("@playwright/test");

test("efeitos e música têm controles independentes na pausa", async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto("/cozinha/#debug");
  await page.locator("#hName").fill("Chef");
  await page.locator("#btnCreate").click();
  await page.locator("#btnStart").click();
  await page.waitForFunction(() => window.__cozinha?.G.mesa?.fase === "jogo");
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause")).toBeVisible();
  if (process.env.COZINHA_FOTO) await page.screenshot({ path: process.env.COZINHA_FOTO, fullPage: true });
  await page.locator("#btnMus").click();
  await expect(page.locator("#mus")).toHaveValue("0");
  await expect(page.locator("#vol")).toHaveValue("0.7");
  await page.locator("#btnFx").click();
  await expect(page.locator("#vol")).toHaveValue("0");
  await page.locator("#btnMus").click();
  await expect(page.locator("#mus")).toHaveValue("0.35");
  await page.reload();
  await expect(page.locator("#mus")).toHaveValue("0.35");
  await expect(page.locator("#vol")).toHaveValue("0");
  expect(erros).toEqual([]);
});
