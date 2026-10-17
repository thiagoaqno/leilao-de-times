// Tênis de mesa no navegador, pelo gancho de testes (#debug → window.__pingpong). O navegador de teste roda a poucos
// quadros por segundo: no treino, o jogo é empurrado com __pingpong.avancar(seg), e a raquete vai pelo mouse de verdade
// (só movendo, sem clicar, como no Table Tennis Pro).
const { test, expect } = require("@playwright/test");

test.use({ viewport: { width: 480, height: 270 } });
test.setTimeout(120000);

// ajuda que roda na página: o mouse no ponto (x, z) da mesa
const AJUDA = `window.__mv = (x, z) => { const q = __pingpong.tela(x, z); document.getElementById("game").dispatchEvent(new PointerEvent("pointermove", { clientX: q.x, clientY: q.y, bubbles: true })); };`;

async function abrirTreino(page) {
  await page.goto("/pingpong/#debug");
  await page.click('[data-mode="amistoso"]');
  await page.click("#btnPractice");
  await page.waitForFunction(() => window.__pingpong && __pingpong.G.active);
  await page.evaluate(AJUDA);
}

test("treino contra o robô: saca passando a raquete pela bola, rebate só mexendo o mouse e o placar anda", async ({ page }) => {
  const erros = []; page.on("pageerror", (e) => erros.push(String(e)));
  await abrirTreino(page);
  const fim = await page.evaluate(() => {
    const t = __pingpong, G = t.G, mv = __mv;
    for (let i = 0; i < 3000 && G.est.phase === "jogo" && G.batidas < 4; i++) {
      const b = G.bola;
      if (t.podeSacar(0)) mv(G.raq[0].x, 1.3 - (i % 12) * 0.07); // passa a raquete pela bola, para a frente
      else if (b && G.rally && G.rally.quem === 1) { // fica no caminho da bola e empurra na hora
        const pv = t.P.prever(b, G.rally, 0, G.raq[0].z) || { x: b.p[0] }, tc = G.raq[0].tc;
        mv(pv.x, tc > 0 && tc < 0.12 ? 1.45 - (0.12 - tc) * 2 : 1.55);
      }
      t.avancar(1 / 60);
    }
    const pontosAntes = G.est.placar.pts[0] + G.est.placar.pts[1];
    // agora deixa a raquete longe da bola: o ponto acaba
    for (let i = 0; i < 1200 && G.est.placar.pts[0] + G.est.placar.pts[1] === pontosAntes; i++) {
      if (t.podeSacar(0)) mv(G.raq[0].x, 1.3 - (i % 12) * 0.07);
      else if (G.rally && G.rally.quem === 1 && G.bola) mv(G.bola.p[0] >= 0 ? -1.3 : 1.3, 1.6);
      t.avancar(1 / 60);
    }
    return { batidas: G.batidas, pts: G.est.placar.pts, pontosAntes };
  });
  expect(fim.batidas).toBeGreaterThan(2);
  expect(fim.pts[0] + fim.pts[1]).toBeGreaterThan(fim.pontosAntes);
  expect(erros).toEqual([]);
});

test("a raquete não anda nem bate sozinha: parada longe da bola, o robô faz o ponto", async ({ page }) => {
  await abrirTreino(page);
  const r = await page.evaluate(() => {
    const t = __pingpong, G = t.G;
    __mv(1.2, 1.6);
    G.est.placar.sacador = 1; G.est.prontoEm = 0;
    const x0 = (t.avancar(0.1), G.raq[0].x);
    for (let i = 0; i < 600 && G.est.placar.pts[1] === 0; i++) t.avancar(1 / 30);
    return { x0, x1: G.raq[0].x, batidas: G.batidas, pts: G.est.placar.pts };
  });
  expect(r.x1).toBeCloseTo(r.x0, 5);
  expect(r.batidas).toBe(0);
  expect(r.pts[1]).toBe(1);
});

test("torneio guarda país e etapa, e o menu online continua acessível", async ({ page }) => {
  await page.goto("/pingpong/");
  await page.click('[data-mode="torneio"]');
  await page.click('[data-country="jp"]');
  await page.evaluate(() => localStorage.setItem("pingpong:campanha:torneio:jp", JSON.stringify(2)));
  await page.reload();
  await page.click('[data-mode="torneio"]');
  await expect(page.locator("#soloPreview")).toContainText("Japão");
  await expect(page.locator("#soloProgress .done")).toHaveCount(2);
  await page.click('[data-mode="online"]');
  await expect(page.locator("#btnCreate")).toBeVisible();
  await expect(page.locator("#btnJoin")).toBeVisible();
  await page.goto("/pingpong/?sala=ABCDE");
  await expect(page.locator("#hCode")).toHaveValue("ABCDE");
  await expect(page.locator("#btnJoin")).toBeVisible();
});

test("sem clicar, a raquete acompanha o mouse da borda até perto da rede; o clique também saca", async ({ page }) => {
  await abrirTreino(page);
  const r = await page.evaluate(() => {
    const t = __pingpong, G = t.G;
    G.est.placar.sacador = 0; G.est.prontoEm = Date.now() + 1e9; // ainda não pode sacar
    const mover = (x, z) => { __mv(x, z); t.avancar(1 / 30); return [G.raq[0].x, G.raq[0].z]; };
    const longe = mover(0.5, 1.6), perto = mover(-0.5, 0.3);
    G.est.prontoEm = 0;
    const q = t.tela(0, 1.6); document.getElementById("game").dispatchEvent(new PointerEvent("pointerdown", { clientX: q.x, clientY: q.y, bubbles: true, pointerType: "mouse" }));
    return { longe, perto, sacou: !!(G.rally && G.rally.saque && G.rally.quem === 0) };
  });
  expect(r.longe[0]).toBeGreaterThan(0.4); expect(r.longe[1]).toBeGreaterThan(1.4);
  expect(r.perto[0]).toBeLessThan(-0.4); expect(r.perto[1]).toBeLessThan(0.45);
  expect(r.sacou).toBe(true);
});
