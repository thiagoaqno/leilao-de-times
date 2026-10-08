// Carreira de Treinador no navegador: começa a carreira, mexe na prancheta, abre o mercado e a ficha, e joga uma
// rodada inteira no modo "só o resultado".
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), path = require("node:path"), fotos = process.env.CARREIRA_FOTOS;
const fotografar = async (page, nome) => { if (!fotos) return; fs.mkdirSync(fotos, { recursive: true }); await page.screenshot({ path: path.join(fotos, `${nome}.png`) }); };

test.setTimeout(120000);
const vigiar = (page) => { const erros = []; page.on("pageerror", (e) => erros.push(String(e))); return erros; };

test("carreira: a prancheta mostra evolução e perda por posição", async ({ page }) => {
  const erros = vigiar(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/carreira/#debug");
  await page.fill("#cNome", "Rendimento");
  await page.click('[data-clube="flamengo"]');
  await page.click("#btnCriar");
  await page.click("#btnAnotei");
  await page.click('#sede [data-ir="elenco"]');

  const ids = await page.locator("#eCampo .peca").evaluateAll((pecas) => pecas.slice(0, 2).map((p) => p.dataset.jogador));
  await page.evaluate(([subiu, caiu]) => {
    __carreira.E.bonusNota[subiu] = 2;
    __carreira.E.bonusNota[caiu] = -1;
    __carreira.mostrarTela("elenco");
  }, ids);
  await expect(page.locator(`#eCampo [data-jogador="${ids[0]}"] .delta-nota.permanente`)).toContainText("+2");
  await expect(page.locator(`#eCampo [data-jogador="${ids[1]}"] .delta-nota.permanente`)).toContainText("-1");

  const defensor = page.locator("#eCampo .peca").nth(1), atacante = page.locator("#eCampo .peca").nth(9);
  const [idDefensor, idAtacante] = await Promise.all([defensor.getAttribute("data-jogador"), atacante.getAttribute("data-jogador")]);
  await defensor.click();
  await atacante.click();
  for (const id of [idDefensor, idAtacante]) {
    const peca = page.locator(`#eCampo [data-jogador="${id}"]`);
    await expect(peca).toHaveClass(/improvisado/);
    await expect(peca.locator(".nota-em-campo em")).toContainText("→");
    const notas = await peca.evaluate((p) => [Number(p.dataset.nota), Number(p.dataset.rendimento)]);
    expect(notas[1]).toBeLessThan(notas[0]);
  }
  await expect(page.locator("#eForca")).toContainText("rendimento nas posições");
  await page.evaluate(([subiu, caiu]) => {
    __carreira.E.bonusNota[subiu] = 2;
    __carreira.E.bonusNota[caiu] = -1;
    __carreira.mostrarTela("elenco");
  }, [idDefensor, idAtacante]);
  if (fotos) await page.waitForTimeout(250);
  await fotografar(page, "carreira-rendimento-posicao");
  expect(erros).toEqual([]);
});

for (const tela of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
  test(`carreira ${tela.width}x${tela.height}: prancheta, mercado e uma rodada`, async ({ page }) => {
    const erros = vigiar(page);
    await page.setViewportSize(tela);
    await page.goto("/carreira/#debug");
    await expect(page.locator('[data-clube="liverpool"]')).toHaveCount(1);
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
    await expect(page.locator(".fala-jogador").first()).toBeVisible();
    if (fotos) await page.waitForTimeout(250);
    await fotografar(page, `carreira-formacao-${tela.width}`);
    expect(await page.evaluate(() => __carreira.E.escalacao.fixo)).toBe(true);
    // a formação nova reorganiza os mesmos 11
    await page.click('#elenco [data-formacao="4-4-2"]');
    await expect.poll(() => page.evaluate(() => __carreira.E.escalacao.formacao)).toBe("4-4-2");
    // o mercado e a ficha com a proposta
    await page.click('#elenco [data-ir="sede"]');
    await page.click('#sede [data-ir="mercado"]');
    await expect(page.locator("#mLista .figurinha").first()).toBeVisible();
    await page.click("#mOlheiro");
    await expect(page.locator(".dica-olheiro").first()).toBeVisible();
    if (fotos) await page.waitForTimeout(300);
    await fotografar(page, `carreira-olheiro-${tela.width}`);
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
    // o pós-jogo abre com o placar e o dinheiro da rodada
    await expect(page.locator("#posJogo .pj-placar")).toBeVisible();
    await expect(page.locator("#posJogo .pj-dinheiro .extrato li").first()).toBeVisible();
    await page.click("#pjContinuar");
    await expect(page.locator("#cartaoUltimo .confronto")).toBeVisible();
    // as notícias: o feed com a arte de cada post
    await page.click('#sede [data-ir="feed"]');
    await expect(page.locator("#fLista .post").first()).toBeVisible();
    await expect(page.locator("#fLista .post .arte img").first()).toHaveAttribute("src", /^data:image\/png/);
    await page.click('#feed [data-ir="sede"]');
    // as competições ficam dentro da tabela, e o calendário mistura liga e copa
    await page.click('#sede [data-ir="tabela"]');
    await expect(page.locator('#tTabela [data-competicao="libertadores"]')).toBeVisible();
    await page.click('#tTabela [data-competicao="libertadores"]');
    await expect(page.locator("#tTabela .grupo-copa")).toHaveCount(8);
    await page.click('#tabela [data-ir="sede"]');
    await page.click('#sede [data-ir="calendario"]');
    await expect(page.locator("#cLista")).toContainText("Libertadores");
    await page.click('#calendario [data-ir="sede"]');
    // uma partida com decisões táticas: na parada, o estádio do mandante e a troca começando pelo banco
    await page.evaluate(() => { modoEscolhido = 2; });
    await page.click("#btnJogar");
    await page.click("#btnPular");
    await expect(page.locator("#decisao[open] .tatica-jogo")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("#dEstadio canvas")).toBeVisible();
    await page.locator("#dCorpo [data-reserva]").first().click();
    await expect(page.locator("#dCorpo [data-reserva].sel")).toHaveCount(1);
    await page.locator("#dCorpo .gramado .peca").nth(5).click();
    await expect(page.locator("#dCorpo .trocas-feitas")).toBeVisible();
    await page.click("#dVoltar");
    await expect(page.locator("#decisao")).not.toHaveAttribute("open", "");
    expect(erros).toEqual([]);
  });
}

// o contrato de temporadas, o código de recuperação de novo, sair com o código na tela, voltar por ele e excluir
test("carreira: temporadas do contrato, código de recuperação, sair e excluir", async ({ page }) => {
  const erros = vigiar(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/carreira/#debug");
  await page.fill("#cNome", "Codigo");
  await page.click('[data-clube="santos"]');
  await page.click('#cTemporadas [data-temporadas="3"]');
  await page.click("#btnCriar");
  await expect(page.locator("#dlgCodigo")).toBeVisible({ timeout: 30000 });
  const codigo = await page.locator("#codigoGrande").textContent();
  await page.click("#btnAnotei");
  expect(await page.evaluate(() => __carreira.E.temporadasMax)).toBe(3);
  await expect(page.locator("#cabecalho")).toContainText("1 de 3");
  // na sede, o mesmo código aparece de novo
  await page.click("#btnVerCodigo");
  await expect(page.locator("#codigoGrande")).toHaveText(codigo);
  await page.click("#btnAnotei");
  // sair mostra o código antes, e ele leva de volta
  await page.click("#btnSairCarreira");
  await expect(page.locator("#codigoTitulo")).toContainText("Antes de sair");
  await page.click("#btnAnotei");
  await expect(page.locator("#inicio")).toBeVisible();
  await page.fill("#cCodigo", codigo);
  await page.click("#btnRecuperar");
  await expect(page.locator("#sede")).toBeVisible();
  // excluir pede a palavra e apaga de vez
  await page.click("#btnExcluirCarreira");
  await expect(page.locator("#btnExcluirSim")).toBeDisabled();
  await page.fill("#exConfirma", "excluir");
  await page.click("#btnExcluirSim");
  await expect(page.locator("#inicio")).toBeVisible();
  await page.fill("#cCodigo", codigo);
  await page.click("#btnRecuperar");
  await expect(page.locator("#erroCodigo")).toContainText("não encontrado");
  expect(erros).toEqual([]);
});

// a carreira em grupo: duas pessoas na mesma sala, cada uma num clube, e o hub de cada uma depois do começo
test("carreira em grupo: sala, clubes e o hub de cada um", async ({ browser }) => {
  const [ca, cb] = [await browser.newContext(), await browser.newContext()];
  const a = await ca.newPage(), b = await cb.newPage();
  const erros = [...vigiar(a), ...vigiar(b)];
  await a.setViewportSize({ width: 1440, height: 900 });
  await a.goto("/carreira/?grupo=1#debug");
  await a.fill("#hName", "Ana");
  await a.click("#btnCreate");
  await expect(a.locator("#gCodigo")).toHaveText(/^[A-Z2-9]{5}$/);
  const codigo = await a.locator("#gCodigo").textContent();
  await expect(a).toHaveURL(new RegExp(`sala=${codigo}`));
  await b.goto(`/carreira/?sala=${codigo}#debug`);
  await b.fill("#hName", "Bia");
  await b.click("#btnJoin");
  await expect(a.locator("#gPessoas li")).toHaveCount(2);
  // o anfitrião mexe nas regras; quem entrou só vê
  await expect(b.locator('#gOpcoes [data-opcao-sala="temporadas"]').first()).toBeDisabled();
  await a.click('#gOpcoes [data-opcao-sala="aporte"][data-valor="500000000"]');
  await a.click('[data-clube-sala="flamengo"]');
  await expect(b.locator('[data-clube-sala="flamengo"]')).toBeDisabled();
  await b.click('[data-clube-sala="liverpool"]');
  await expect(a.locator("#btnComecar")).toBeEnabled();
  await a.click("#btnComecar");
  // cada um no hub do seu clube
  await expect(a.locator("#sede")).toBeVisible({ timeout: 30000 });
  await expect(b.locator("#sede")).toBeVisible({ timeout: 30000 });
  await expect(a.locator("#cabecalho h1")).toHaveText("Flamengo");
  await expect(b.locator("#cabecalho h1")).toHaveText("Liverpool");
  await expect(a.locator(".hub-tiles .tile")).toHaveCount(4);
  await expect(a.locator("#cartaoFeed .manchete")).toBeVisible();
  // só o anfitrião começa a rodada
  await expect(b.locator("#btnJogar")).toBeDisabled();
  await expect(a.locator("#btnJogar")).toBeEnabled();
  // recarregou: volta sozinho para o clube dele
  await b.reload();
  await expect(b.locator("#cabecalho h1")).toHaveText("Liverpool", { timeout: 30000 });
  // a rodada ao vivo: os dois vão para a partida juntos e ela vai até o fim pelo relógio do servidor
  await a.click("#btnJogar");
  await expect(a.locator("#partida")).toBeVisible({ timeout: 30000 });
  await expect(b.locator("#partida")).toBeVisible({ timeout: 30000 });
  await expect(a.locator(".faixa-jogo .controles")).toBeHidden();
  await expect(a.locator("#fimJogo")).toBeVisible({ timeout: 60000 });
  await expect(b.locator("#fimJogo")).toBeVisible({ timeout: 60000 });
  await a.click("#btnVoltarSede");
  await expect(a.locator("#sede")).toBeVisible();
  // o leilão: Ana abre o de um jogador do Santos, Bia dá o lance e leva
  await a.evaluate(() => __carreira.abrirFicha("santos-5"));
  await a.click("#fLeilao");
  await expect(b.locator("#leilaoBox")).toBeVisible({ timeout: 15000 });
  await fotografar(b, "carreira-leilao");
  await b.click("#lLance");
  await expect(b.locator(".transferencia-fx")).toBeVisible({ timeout: 40000 });
  if (fotos) await b.waitForTimeout(750);
  await fotografar(b, "carreira-transferencia");
  await expect(b.locator("#leilaoBox")).toBeHidden({ timeout: 40000 });
  await expect.poll(() => b.evaluate(() => __carreira.E.elenco.includes("santos-5")), { timeout: 15000 }).toBe(true);
  expect(erros).toEqual([]);
  await ca.close(); await cb.close();
});
