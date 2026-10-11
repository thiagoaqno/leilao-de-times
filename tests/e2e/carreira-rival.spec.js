// A aba Rival da Sede: a leitura do próximo adversário saiu da prévia do jogo e mora numa aba própria.
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), path = require("node:path"), fotos = process.env.CARREIRA_FOTOS;
const fotografar = async (page, nome) => { if (!fotos) return; fs.mkdirSync(fotos, { recursive: true }); await page.screenshot({ path: path.join(fotos, `${nome}.png`) }); };

test.setTimeout(120000);
test("carreira: a leitura do rival fica na aba Rival e não na prévia", async ({ page }) => {
  const erros = []; page.on("pageerror", (e) => erros.push(String(e)));
  page.addLocatorHandler(page.locator("dialog.popup-aviso[open]"), async (d) => { await d.locator("button.primario").first().click(); });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/carreira/#debug");
  await page.fill("#cNome", "Rival");
  await page.click('[data-clube="flamengo"]');
  await page.click("#btnCriar");
  await page.click("#btnAnotei");
  await expect(page.locator("#cartaoJogo .leitura-rival")).toHaveCount(0);
  await fotografar(page, "rival-central");
  await page.click('#abasSede [data-aba="rival"]');
  await expect(page.locator("#cartaoRival .leitura-rival")).toBeVisible();
  await expect(page.locator("#cartaoRival .rival-topo")).toBeVisible();
  await expect(page.locator("#cartaoJogo")).toBeHidden();
  await fotografar(page, "rival-aba");
  expect(erros).toEqual([]);
});
