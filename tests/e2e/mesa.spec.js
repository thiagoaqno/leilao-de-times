// Jogos de mesa no navegador: Dominó com 3 navegadores (uma mão inteira pela tela) e o Futebol de Botão.
const { test, expect } = require("@playwright/test");

// abre n navegadores na mesma mesa: o primeiro cria, os outros entram pelo código
async function mesa(browser, caminho, nomes, erros) {
  const pags = [];
  for (const nome of nomes) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    p.on("pageerror", (e) => erros.push(`${nome}: ${e}`));
    await p.goto(caminho);
    await p.fill("#hName", nome);
    if (!pags.length) await p.click("#btnCreate");
    else { await p.fill("#hCode", await pags[0].locator("#rCode").textContent()); await p.click("#btnJoin"); }
    await expect(p.locator("#rCode")).toHaveText(/^[A-Z0-9]{5}$/);
    pags.push(p);
  }
  return pags;
}

test("dominó com 3 navegadores: uma mão até o fim", async ({ browser }) => {
  const erros = [];
  const [a, b, c] = await mesa(browser, "/domino/", ["Ana", "Bia", "Caio"], erros);
  await a.click("[data-mode=individual]");
  await expect(a.locator("#btnStart")).toBeEnabled();
  await a.click("#btnStart");
  // cada um, na sua vez, toca numa pedra que brilha (escolhendo a ponta, se perguntar) ou compra
  const fim = async () => (await a.locator("#prompt").textContent()).match(/Fim da mão|Fim de jogo/);
  for (let volta = 0; volta < 400 && !(await fim()); volta++) {
    for (const p of [a, b, c]) {
      if (await p.locator("#aL").count()) { await p.click("#aL"); continue; }
      if (await p.locator("#aBuy").count()) { await p.click("#aBuy"); continue; }
      const ok = p.locator("#hand.turn .tile.ok");
      if (await ok.count()) await ok.first().click().catch(() => {});
    }
    await a.waitForTimeout(150);
  }
  expect(await fim()).toBeTruthy();
  expect(erros).toEqual([]);
});

test("botão: 7 tampinhas aparecem e a mira mostra só a seta de força", async ({ browser }) => {
  const erros = [];
  const [a, b] = await mesa(browser, "/botao/", ["Ana", "Bia"], erros);
  await a.selectOption("[data-sel=tampinhas]", "7");
  await a.waitForFunction(() => S.config.tampinhas === 7);
  await expect(a.locator("#btnStart")).toBeEnabled();
  await a.click("#btnStart");
  for (const p of [a, b]) await p.waitForFunction(() => S && S.phase === "playing" && S.g);
  expect(await a.evaluate(() => S.g.pieces.length)).toBe(15);
  expect(await a.evaluate(() => S.g.pieces.filter((p) => p.k === "btn").length)).toBe(14);
  // quem tem a vez mira: aperta numa tampinha sua e puxa. Conta quantas vezes a trajetória é calculada (B.trace)
  // e se a seta de força é desenhada (drawGuide com força)
  const vez = (await a.evaluate(() => typeof canAct === "function" && canAct())) ? a : b;
  await vez.waitForFunction(() => canAct() && sNow() >= S.g.busyUntil && !anim && tableImg && cv.getBoundingClientRect().width > 0);
  await vez.evaluate(() => {
    window.__teste = { trace: 0, seta: 0 };
    const trace = B.trace; B.trace = (...x) => { __teste.trace++; return trace(...x); };
    const guia = window.drawGuide; window.drawGuide = (c, pcs, A) => { if (A.p > 0) __teste.seta++; return guia(c, pcs, A); };
  });
  // a tampinha na tela (o inverso do toWorld da página)
  const naTela = () => vez.evaluate(() => {
    const g = S.g, p = g.pieces.find((q) => q.k === "btn" && q.t === g.turn), r = cv.getBoundingClientRect(), s = view.s, F = view.fr;
    let x = p.x, y = p.y; if (view.flip) { x = L - x; y = W - y; }
    const sx = view.rot ? (y + F) * s : (x + F) * s, sy = view.rot ? (L + F - x) * s : (y + F) * s;
    return { x: r.left + sx, y: r.top + sy };
  });
  let conta = null;
  for (let tenta = 0; tenta < 3 && !(conta && conta.p > 0); tenta++) { // o layout da mesa pode mudar logo depois do apito
    await vez.waitForTimeout(500);
    const alvo = await naTela();
    await vez.mouse.move(alvo.x, alvo.y);
    await vez.mouse.down();
    for (let k = 1; k <= 8; k++) { await vez.mouse.move(alvo.x - k * 8, alvo.y + k * 3); await vez.waitForTimeout(50); }
    await vez.waitForTimeout(300);
    conta = await vez.evaluate(() => ({ ...__teste, p: aim.p }));
    // solta fora da mesa com força zero (não chuta): volta para o ponto onde apertou
    await vez.mouse.move(alvo.x, alvo.y);
    await vez.mouse.up();
  }
  expect(conta.p).toBeGreaterThan(0);
  expect(conta.seta).toBeGreaterThan(0);
  expect(conta.trace).toBe(0);
  expect(erros).toEqual([]);
});
