// Pingue-pongue no navegador, pelo gancho de testes (#debug → window.__pingpong). O navegador de teste roda a poucos
// quadros por segundo: no treino, o jogo é empurrado com __pingpong.avancar(seg), e a raquete vai pelo mouse de verdade
// (eventos de ponteiro na tela, no ponto onde a bola vai passar).
const { test, expect } = require("@playwright/test");

test.use({ viewport: { width: 480, height: 270 } });
test.setTimeout(120000);

test("treino contra o robô: saca pelo clique, rebate com o mouse e o placar anda", async ({ page }) => {
  const erros = []; page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto("/pingpong/#debug");
  await page.click('[data-mode="amistoso"]');
  await page.click("#btnPractice");
  await page.waitForFunction(() => window.__pingpong && __pingpong.G.active);
  const fim = await page.evaluate(() => {
    const t = __pingpong, G = t.G, jogo = document.getElementById("game");
    const mouse = (tipo, x, z) => { const p = t.tela(x, z); jogo.dispatchEvent(new PointerEvent(tipo, { clientX: p.x, clientY: p.y, bubbles: true })); };
    for (let i = 0; i < 1500 && G.est.phase === "jogo"; i++) {
      const b = G.bola;
      if (t.podeSacar(0)) mouse("pointerdown", 0.1, 1.6);
      else if (b && G.rally && G.rally.quem === 1) mouse("pointermove", b.p[0], 1.62 - (i % 6) * 0.03); // vai até a bola e empurra para a frente
      t.avancar(1 / 30);
    }
    const pontosAntes = G.est.placar.pts[0] + G.est.placar.pts[1];
    for (let i = 0; i < 400 && G.est.placar.pts[0] + G.est.placar.pts[1] === pontosAntes; i++) {
      if (G.rally && G.rally.quem === 1 && G.bola) mouse("pointermove", G.bola.p[0] >= 0 ? -1.4 : 1.4, 1.6);
      t.avancar(1 / 30);
    }
    return { batidas: G.batidas, pts: G.est.placar.pts, pontosAntes };
  });
  expect(fim.batidas).toBeGreaterThan(2);
  expect(fim.pts[0] + fim.pts[1]).toBeGreaterThan(fim.pontosAntes);
  expect(erros).toEqual([]);
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

test("raquete acompanha o mouse da borda até perto da rede", async ({ page }) => {
  await page.goto("/pingpong/#debug");
  await page.click('[data-mode="amistoso"]');
  await page.click("#btnPractice");
  await page.waitForFunction(() => window.__pingpong && __pingpong.G.active);
  const posicoes = await page.evaluate(() => {
    const t = __pingpong, jogo = document.getElementById("game");
    const mover = (z) => {
      const p = t.tela(0, z);
      jogo.dispatchEvent(new PointerEvent("pointermove", { clientX: p.x, clientY: p.y, bubbles: true }));
      t.avancar(1 / 30);
      return t.G.raq[0].z;
    };
    return [mover(1.6), mover(0.25)];
  });
  expect(posicoes[0]).toBeGreaterThan(1.4);
  expect(posicoes[1]).toBeLessThan(0.4);
});

test("o saque: a bola sobe da mão e a raquete bate na descida; a raquete troca de forehand para backhand", async ({ page }) => {
  await page.goto("/pingpong/#debug");
  await page.click('[data-mode="amistoso"]');
  await page.click("#btnPractice");
  await page.waitForFunction(() => window.__pingpong && __pingpong.G.active);
  const r = await page.evaluate(() => {
    const t = __pingpong, G = t.G, jogo = document.getElementById("game");
    const mouse = (tipo, x, z) => { const p = t.tela(x, z); jogo.dispatchEvent(new PointerEvent(tipo, { clientX: p.x, clientY: p.y, bubbles: true })); };
    G.est.placar.sacador = 0; G.est.prontoEm = 0;
    mouse("pointerdown", 0, 1.6);
    const subiu = !!G.lance && !G.rally;
    t.avancar(0.25); const noAr = !!G.lance && !G.rally;
    t.avancar(0.4); const sacou = !G.lance && G.rally && G.rally.saque && G.rally.quem === 0;
    // forehand à direita do corpo, backhand quando a raquete cruza para a esquerda
    mouse("pointermove", 0.6, 1.6); for (let i = 0; i < 40; i++) { t.avancar(1 / 30); t.quadro(1 / 30); }
    const fh = G.raq[0].fh;
    mouse("pointermove", -0.9, 1.6); for (let i = 0; i < 40; i++) { t.avancar(1 / 30); t.quadro(1 / 30); }
    return { subiu, noAr, sacou, fh, bh: !G.raq[0].fh };
  });
  expect(r).toEqual({ subiu: true, noAr: true, sacou: true, fh: true, bh: true });
});
