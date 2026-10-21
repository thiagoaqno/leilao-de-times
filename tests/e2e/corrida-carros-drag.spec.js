const { test, expect } = require("@playwright/test");

test("a garagem escolhe um carro do Drag e ele aparece na Corrida", async ({ page }, info) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.goto("/corrida/#debug");
  await page.locator("#hName").fill("Ana");
  await page.locator("#btnCreate").click();
  await expect(page.locator("#lobby")).toBeVisible();
  await page.locator('[data-aba="regras"]').first().click();
  await page.locator('[data-opt="carrosDrag"]').click();
  await expect(page.locator('[data-opt="carrosDrag"]')).toHaveClass(/on/);
  await page.locator('[data-aba="garagem"]').first().click();
  await expect(page.locator("[data-car-drag]")).toHaveCount(11);
  await page.locator('[data-car-drag="porsche-911"]').click();
  await expect(page.locator("#hubCarNome")).toContainText("Porsche 911");
  await page.locator('[data-aba="box"]').first().click();
  await page.locator("#btnStart").click();
  await expect.poll(() => page.evaluate(() => window.__corrida?.race?.kart?.kt?.g?.rotation.y), { timeout: 90000 }).toBe(Math.PI);
  await page.screenshot({ path: info.outputPath("corrida-porsche-911.png") });
  expect(erros).toEqual([]);
});
