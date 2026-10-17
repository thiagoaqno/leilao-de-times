// Tênis de mesa no navegador, pelo gancho de testes (#debug → window.__pingpong). O navegador de teste roda a poucos
// quadros por segundo: no treino, o jogo é empurrado com __pingpong.avancar(seg), e a raquete vai pelo ponteiro de
// verdade (eventos de ponteiro na tela, segurando e arrastando como no Table Tennis Pro).
const { test, expect } = require("@playwright/test");

test.use({ viewport: { width: 480, height: 270 } });
test.setTimeout(120000);

// ajudas que rodam na página: arrastar a raquete até o ponto (x, z) da mesa
const AJUDA = `window.__ev = (tipo, x, z) => { const t = __pingpong, q = t.tela(x, z); document.getElementById("game").dispatchEvent(new PointerEvent(tipo, { clientX: q.x, clientY: q.y, bubbles: true, pointerId: 1 })); };`;

async function abrirTreino(page) {
  await page.goto("/pingpong/#debug");
  await page.click('[data-mode="amistoso"]');
  await page.click("#btnPractice");
  await page.waitForFunction(() => window.__pingpong && __pingpong.G.active);
  await page.evaluate(AJUDA);
}

test("treino contra o robô: saca arrastando, rebate arrastando e o placar anda", async ({ page }) => {
  const erros = []; page.on("pageerror", (e) => erros.push(String(e)));
  await abrirTreino(page);
  const fim = await page.evaluate(() => {
    const t = __pingpong, G = t.G, ev = __ev;
    let segurando = false;
    for (let i = 0; i < 1500 && G.est.phase === "jogo"; i++) {
      const b = G.bola;
      if (t.podeSacar(0)) { // o saque: segura atrás e arrasta para a frente
        ev("pointerdown", 0, 1.7); for (let k = 0; k < 6; k++) { ev("pointermove", 0, 1.7 - k * 0.12); t.avancar(1 / 60); }
        segurando = true;
      } else if (b && G.rally && G.rally.quem === 1) { // segura a raquete na linha da bola e empurra para a frente
        if (!segurando) { ev("pointerdown", b.p[0], 1.62); segurando = true; }
        ev("pointermove", b.p[0], 1.62 - (i % 6) * 0.03);
      }
      t.avancar(1 / 30);
    }
    if (segurando) ev("pointerup", 0, 1.6);
    const pontosAntes = G.est.placar.pts[0] + G.est.placar.pts[1];
    // agora segura a raquete longe da bola: o ponto acaba
    ev("pointerdown", 0, 1.6);
    for (let i = 0; i < 400 && G.est.placar.pts[0] + G.est.placar.pts[1] === pontosAntes; i++) {
      if (t.podeSacar(0)) { ev("pointerup", 0, 1.6); t.avancar(0.1); ev("pointerdown", 0, 1.7); for (let k = 0; k < 6; k++) { ev("pointermove", 0, 1.7 - k * 0.12); t.avancar(1 / 60); } }
      if (G.rally && G.rally.quem === 1 && G.bola) ev("pointermove", G.bola.p[0] >= 0 ? -1.4 : 1.4, 1.6);
      t.avancar(1 / 30);
    }
    return { batidas: G.batidas, pts: G.est.placar.pts, pontosAntes };
  });
  expect(fim.batidas).toBeGreaterThan(2);
  expect(fim.pts[0] + fim.pts[1]).toBeGreaterThan(fim.pontosAntes);
  expect(erros).toEqual([]);
});

test("solta o mouse: a raquete vai atrás da bola sozinha e devolve", async ({ page }) => {
  await abrirTreino(page);
  const r = await page.evaluate(() => {
    const t = __pingpong, G = t.G;
    G.est.placar.sacador = 1; G.est.prontoEm = 0;
    let batidas = 0;
    for (let i = 0; i < 600 && batidas === 0; i++) { t.avancar(1 / 30); batidas = G.batidas; }
    return { batidas, arrasta: G.arrasta };
  });
  expect(r.arrasta).toBe(false);
  expect(r.batidas).toBeGreaterThan(0);
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

test("arrastando, a raquete acompanha o ponteiro da borda até perto da rede; o toque saca", async ({ page }) => {
  await abrirTreino(page);
  const r = await page.evaluate(() => {
    const t = __pingpong, G = t.G, ev = __ev;
    G.est.placar.sacador = 0; G.est.prontoEm = 0;
    ev("pointerdown", 0, 1.6);
    const mover = (x, z) => { ev("pointermove", x, z); t.avancar(1 / 30); return [G.raq[0].x, G.raq[0].z]; };
    const longe = mover(0.5, 1.6);
    let perto = null; for (let k = 1; k <= 40; k++) perto = mover(0.5 - k * 0.025, 1.6 - k * 0.0325); // devagar, até perto da rede
    ev("pointerup", -0.5, 0.3);
    t.avancar(0.2);
    const semSaque = !G.rally; // arrastar devagar não saca
    ev("pointerdown", 0, 1.6); ev("pointerup", 0, 1.6); // um toque
    return { longe, perto, semSaque, sacou: !!(G.rally && G.rally.saque && G.rally.quem === 0) };
  });
  expect(r.longe[0]).toBeGreaterThan(0.4); expect(r.longe[1]).toBeGreaterThan(1.4);
  expect(r.perto[0]).toBeLessThan(-0.4); expect(r.perto[1]).toBeLessThan(0.45);
  expect(r.semSaque).toBe(true);
  expect(r.sacou).toBe(true);
});
