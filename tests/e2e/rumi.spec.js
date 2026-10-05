// Rumi no navegador: mexer no rascunho da mesa não pode fazer combinação nenhuma "teleportar".
// Uma pessoa joga contra 3 robôs (compra na própria vez até a mesa ter várias combinações) e outra assiste.
const { test, expect } = require("@playwright/test");

// onde está cada combinação da mesa: [id da 1ª peça, x, y, largura]
const posicoes = (p) => p.$$eval("#mesa .grupo", (gs) => gs.map((g) => { const r = g.getBoundingClientRect(); return [g.querySelector(".peca").dataset.id, Math.round(r.left), Math.round(r.top), Math.round(r.width)]; }));

test("rumi: escolher peças e tocar nas combinações não muda o lugar de nada (nem para quem assiste)", async ({ browser }) => {
  const erros = [];
  const nova = async (nome) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } }); // mesa larga: várias combinações por linha
    const p = await ctx.newPage(); p.on("pageerror", (e) => erros.push(`${nome}: ${e}`)); return p;
  };
  const a = await nova("Ana");
  await a.goto("/rumi/#debug");
  await a.evaluate(() => localStorage.setItem("rumi:cfg", JSON.stringify({ robos: 3 })));
  await a.fill("#hName", "Ana");
  await a.click("#btnCreate");
  await expect(a.locator("#rCode")).toHaveText(/^[A-Z0-9]{5}$/);
  const codigo = await a.locator("#rCode").textContent();
  await a.evaluate(() => window.__rumi.act("start"));
  // quem assiste
  const b = await nova("Bia");
  await b.goto("/rumi/");
  await b.fill("#hCode", codigo);
  await b.click("#btnWatch");

  // compra na própria vez até a mesa ter pelo menos 5 combinações (os robôs vão baixando) e ser a vez da Ana
  await a.waitForFunction(() => {
    const R = window.__rumi; if (!R.S || R.S.phase !== "jogando") return false;
    if (R.RAS && R.S.rodada.mesa.length >= 5) return true;
    if (R.RAS && !window.__comprando) { window.__comprando = true; R.act("comprar").then(() => (window.__comprando = false)); }
    return false;
  }, null, { timeout: 100000, polling: 300 });

  const mesa0 = await posicoes(a), viu0 = await posicoes(b);
  expect(mesa0.length).toBeGreaterThanOrEqual(5);
  const grupo = (i) => a.locator("#mesa .grupo").nth(i);

  // 1) escolher uma peça (e depois outra, de outra combinação): nada muda de lugar
  await grupo(1).locator(".peca").first().click();
  expect(await posicoes(a)).toEqual(mesa0);
  await grupo(3).locator(".peca").first().click();
  expect(await posicoes(a)).toEqual(mesa0);
  // quem assiste vê as peças sendo pegas, mas também sem nada sair do lugar
  await b.waitForTimeout(600);
  expect(await posicoes(b)).toEqual(viu0);

  // 2) desescolher: continua igual
  await grupo(3).locator(".peca").first().click();
  await grupo(1).locator(".peca").first().click();
  expect(await posicoes(a)).toEqual(mesa0);

  // 3) escolher a combinação inteira e tocar nela mesma: fica onde está (antes ia para o fim da mesa)
  const pecas = grupo(2).locator(".peca"), n = await pecas.count();
  for (let k = 0; k < n; k++) await pecas.nth(k).click();
  await grupo(2).click({ position: { x: 3, y: 3 } });
  expect(await posicoes(a)).toEqual(mesa0);

  // 4) mexer de verdade (tirar uma peça de uma combinação para uma nova) e desfazer: a mesa volta igual
  await grupo(0).locator(".peca").first().click();
  await a.click("[data-novo]");
  expect((await posicoes(a)).length).toBe(mesa0.length + 1);
  await a.click("#btnDesfaz");
  expect(await posicoes(a)).toEqual(mesa0);

  // 5) jogada inválida mandada direto: o servidor recusa e a mesa de verdade não muda
  const recusou = await a.evaluate(async () => {
    const R = window.__rumi, mesa = R.S.rodada.mesa.map((g) => g.map((t) => t.id));
    const ruim = [...mesa.slice(1), [mesa[0][0]], mesa[0].slice(1)].filter((g) => g.length); // separa a 1ª combinação: fica inválida
    const ok = await R.act("jogar", { mesa: ruim });
    return !ok && JSON.stringify(R.S.rodada.mesa.map((g) => g.map((t) => t.id))) === JSON.stringify(mesa);
  });
  expect(recusou).toBeTruthy();
  expect(erros).toEqual([]);
});
