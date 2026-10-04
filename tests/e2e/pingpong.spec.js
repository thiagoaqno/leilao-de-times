// Pingue-pongue no navegador, pelo gancho de testes (#debug → window.__pingpong). O navegador de teste roda a poucos
// quadros por segundo: no treino, o jogo é empurrado com __pingpong.avancar(seg), e a raquete vai pelo mouse de verdade
// (eventos de ponteiro na tela, no ponto onde a bola vai passar).
const { test, expect } = require("@playwright/test");

test.use({ viewport: { width: 480, height: 270 } });
test.setTimeout(120000);

test("treino contra o robô: saca pelo clique, rebate com o mouse e o placar anda", async ({ page }) => {
  const erros = []; page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto("/pingpong/#debug");
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
    return { batidas: G.batidas, pts: G.est.placar.pts };
  });
  expect(fim.batidas).toBeGreaterThan(2);
  expect(fim.pts[0] + fim.pts[1]).toBeGreaterThan(2);
  expect(erros).toEqual([]);
});
