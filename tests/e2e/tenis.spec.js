// Tênis no navegador, pelo gancho de testes (#debug → window.__tenis). O navegador de teste roda a poucos quadros
// por segundo: no treino, o jogo é empurrado com __tenis.avancar(seg).
const { test, expect } = require("@playwright/test");

test.use({ viewport: { width: 480, height: 270 } });
test.setTimeout(180000);
const vigiar = (page) => { const erros = []; page.on("pageerror", (e) => erros.push(String(e))); return erros; };

test("treino contra robô: saca, joga uns pontos e o placar anda", async ({ page }) => {
  const erros = vigiar(page);
  await page.goto("/tenis/#debug");
  await page.click("#btnPractice");
  await page.waitForFunction(() => window.__tenis && __tenis.G.m);
  const fim = await page.evaluate(() => {
    const t = __tenis, G = t.G; let minhas = 0, ult = G.me.giroT;
    for (let i = 0; i < 400 && !G.m.fim; i++) {
      const b = G.m.bola;
      if (G.m.fase === "saque" && G.m.sacador === "eu") { t.golpe("top"); t.avancar(0.4); t.golpe("top"); }
      if (G.m.fase === "jogo" && b.ultimo === "B" && !G.me.armado) t.golpe(["top", "slice", "lob", "curta"][i % 4]);
      t.keys.clear(); if (G.m.fase === "jogo" && b.ultimo === "B") { if (b.x > G.me.x + 0.4) t.keys.add("KeyD"); if (b.x < G.me.x - 0.4) t.keys.add("KeyA"); }
      t.avancar(0.1);
      if (G.me.giroT !== ult) { minhas++; ult = G.me.giroT; }
    }
    return { minhas, games: G.m.games, placar: G.m.placar };
  });
  expect(fim.minhas).toBeGreaterThan(2); // bateu na bola (saques e devoluções)
  expect(fim.games.A + fim.games.B + fim.placar.A + fim.placar.B).toBeGreaterThan(0);
  expect(erros).toEqual([]);
});

test("online: abre a sala, completa com robôs, começa e a bola anda", async ({ page }) => {
  const erros = vigiar(page);
  await page.goto("/tenis/#debug");
  await page.fill("#hName", "Ana");
  await page.click("#btnCreate");
  await expect(page.locator("#rCode")).toHaveText(/^[A-Z0-9]{5}$/);
  await page.click("[data-cmodo='1']"); // duplas
  await page.waitForFunction(() => __tenis.S && __tenis.S.config.duplas);
  await page.click("#btnStart");
  await page.waitForFunction(() => __tenis.S && __tenis.S.phase === "play" && __tenis.G.buf.length > 5, null, { timeout: 20000 });
  expect(await page.evaluate(() => __tenis.S.match.jogadores.length)).toBe(4);
  // aperta golpes por uns segundos (saque e devoluções) e confere que a bola se mexeu
  const z0 = await page.evaluate(() => __tenis.G.buf.at(-1).b[2]);
  for (let i = 0; i < 12; i++) { await page.keyboard.press("j"); await page.waitForTimeout(400); }
  const zs = await page.evaluate(() => __tenis.G.buf.map((s) => s.b[2]));
  expect(Math.max(...zs.map((z) => Math.abs(z - z0)))).toBeGreaterThan(1);
  expect(erros).toEqual([]);
});
