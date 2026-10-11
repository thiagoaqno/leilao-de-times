// O mercado de técnicos na Sede: as propostas, os clubes para se candidatar e o aviso no começo da temporada.
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), path = require("node:path"), fotos = process.env.CARREIRA_FOTOS;
const fotografar = async (page, nome) => { if (!fotos) return; fs.mkdirSync(fotos, { recursive: true }); await page.screenshot({ path: path.join(fotos, `${nome}.png`) }); };

test.setTimeout(120000);
test("carreira: a aba Temporada mostra as propostas e as candidaturas do mercado de técnicos", async ({ page }) => {
  const erros = []; page.on("pageerror", (e) => erros.push(String(e)));
  page.addLocatorHandler(page.locator("dialog.popup-aviso[open]"), async (d) => { await d.locator("button.primario").first().click(); });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/carreira/#debug");
  await page.fill("#cNome", "Mercado");
  await page.click('[data-clube="flamengo"]');
  await page.click("#btnCriar");
  await page.click("#btnAnotei");
  await expect(page.locator("#cartaoVagas")).toBeHidden();
  await page.evaluate(() => {
    const o = (id, nome, liga, forca, delta, proj) => ({ id, nome, liga: "x", ligaNome: liga, forca, delta, tamanho: 4, caixa: 150e6, projeto: proj, rank: 3 });
    __carreira.E.vagas = { momento: "comeco", escolha: null,
      ofertas: [o("palmeiras", "Palmeiras", "Brasileirão", 81, 2, "Brigar pelo título"), o("tottenham", "Tottenham", "Premier League", 79, 0, "Campanha de meio de tabela")],
      candidatos: [{ ...o("santos", "Santos", "Brasileirão", 75, -4, "Vaga continental"), chance: 0.9 }, { ...o("arsenal", "Arsenal", "Premier League", 88, 9, "Brigar pelo título"), chance: 0.12 }, { ...o("bahia", "Bahia", "Brasileirão", 72, -7, "Meio de tabela"), chance: 0.5, tentou: true }] };
    telaSede();
  });
  await page.click('#abasSede [data-aba="temporada"]');
  await expect(page.locator("#cartaoVagas .vaga")).toHaveCount(5);
  await expect(page.locator("#cartaoVagas [data-candidatar]")).toHaveCount(3);
  await expect(page.locator("#cartaoVagas")).toContainText("Assumir agora");
  await page.waitForFunction(() => !Zoom.ocupado()); await page.waitForTimeout(900);
  await fotografar(page, "mercado-tecnicos");
  expect(erros).toEqual([]);
});
