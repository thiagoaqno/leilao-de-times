// Carreira de Treinador no navegador: começa a carreira, mexe na prancheta, abre o mercado e a ficha, e joga uma
// rodada inteira no modo "só o resultado".
const { test, expect } = require("@playwright/test");

test.setTimeout(120000);
const vigiar = (page) => { const erros = []; page.on("pageerror", (e) => erros.push(String(e))); return erros; };

for (const tela of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
  test(`carreira ${tela.width}x${tela.height}: prancheta, mercado e uma rodada`, async ({ page }) => {
    const erros = vigiar(page);
    await page.setViewportSize(tela);
    await page.goto("/carreira/#debug");
    await page.fill("#cNome", "Teste");
    await page.click('[data-clube="flamengo"]');
    await page.click("#btnCriar");
    await page.click("#btnAnotei");
    await expect(page.locator("#sede")).toBeVisible();
    // a prancheta: 11 no campo, troca dois de lugar e a escalação vira "sua"
    await page.click('#sede [data-ir="elenco"]');
    await expect(page.locator("#eCampo .peca")).toHaveCount(11);
    const nomes = () => page.locator("#eCampo .peca small").allTextContents();
    const antes = await nomes();
    await page.locator("#eCampo .peca").nth(9).click();
    await page.locator("#eCampo .peca").nth(10).click();
    await expect.poll(nomes).toEqual([...antes.slice(0, 9), antes[10], antes[9]]);
    expect(await page.evaluate(() => __carreira.E.escalacao.fixo)).toBe(true);
    // a formação nova reorganiza os mesmos 11
    await page.click('#elenco [data-formacao="4-4-2"]');
    await expect.poll(() => page.evaluate(() => __carreira.E.escalacao.formacao)).toBe("4-4-2");
    // o mercado e a ficha com a proposta
    await page.click('#elenco [data-ir="sede"]');
    await page.click('#sede [data-ir="mercado"]');
    await expect(page.locator("#mLista .figurinha").first()).toBeVisible();
    await page.locator("#mLista .figurinha").first().click();
    await expect(page.locator("#ficha #fProposta")).toBeVisible();
    await page.click("#fichaFechar");
    // uma rodada no modo "só o resultado", pulando até o fim
    await page.click('#mercado [data-ir="sede"]');
    await page.click("#btnJogar");
    await expect(page.locator("#partida")).toBeVisible();
    await page.click("#btnPular");
    await expect(page.locator("#fimJogo")).toBeVisible({ timeout: 20000 });
    await page.click("#btnVoltarSede");
    expect(await page.evaluate(() => __carreira.E.rodada)).toBe(1);
    await expect(page.locator("#cartaoUltimo .confronto")).toBeVisible();
    expect(erros).toEqual([]);
  });
}
