// Carreira: a mesa de botão na partida (os 22 jogadores viram botões nas cores dos clubes e andam com os lances).
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), path = require("node:path"), fotos = process.env.CARREIRA_FOTOS;
const fotografar = async (page, nome) => { if (!fotos) return; fs.mkdirSync(fotos, { recursive: true }); await page.screenshot({ path: path.join(fotos, `${nome}.png`) }); };
const semAvisos = (page) => page.addLocatorHandler(page.locator("dialog.popup-aviso[open]"), async (d) => { await d.locator("button.primario").first().click(); });

test.setTimeout(120000);

for (const tela of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
  test(`carreira ${tela.width}: a mesa de botão acompanha a partida`, async ({ page }) => {
    const erros = []; page.on("pageerror", (e) => erros.push(String(e))); semAvisos(page);
    await page.setViewportSize(tela);
    await page.goto("/carreira/#debug");
    await page.fill("#cNome", "Mesa");
    await page.click('[data-clube="flamengo"]');
    await page.click("#btnCriar");
    await page.click("#btnAnotei");
    await page.evaluate(() => { modoEscolhido = 2; });
    await page.click("#btnJogar");
    await expect(page.locator("#partida")).toBeVisible();
    // 11 botões de cada lado e a bola
    await expect(page.locator("#mesa .bt")).toHaveCount(22);
    await expect(page.locator("#mesa .bt-bola")).toHaveCount(1);
    await page.click('[data-vel="3"]');
    await page.waitForTimeout(2500);
    await fotografar(page, `mesa-${tela.width}-jogo`);
    // um lance de gol do motor: o botão vai até a área e o letreiro aparece
    await page.evaluate(() => {
      const t = __carreira.E.partida.times[0].titulares;
      Mesa.evento({ tipo: "gol", lado: 0, min: 12, jogador: t[9], assist: t[8], como: "jogada", placar: [1, 0] });
    });
    await expect(page.locator("#mesa .m-gol")).toBeVisible({ timeout: 5000 });
    await fotografar(page, `mesa-${tela.width}-gol`);
    // desligar esconde a mesa
    await page.evaluate(() => $("btnMesa").click()); // a parada tática pode estar aberta por cima
    await expect(page.locator("#mesaCaixa")).toBeHidden();
    await page.evaluate(() => $("btnMesa").click()); // a parada tática pode estar aberta por cima
    await expect(page.locator("#mesaCaixa")).toBeVisible();
    // pular até a parada: nada quebra e a mesa segue com 22 (menos expulsos)
    await page.evaluate(() => $("btnPular").click());
    await expect(page.locator("#decisao[open], #fimJogo:not(.hidden)")).toBeVisible({ timeout: 20000 });
    expect(await page.locator("#mesa .bt").count()).toBeGreaterThanOrEqual(18);
    expect(erros).toEqual([]);
  });
}
