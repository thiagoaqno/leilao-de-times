// Pelada no navegador, usando o gancho de testes (#debug → window.__pelada).
// O navegador de teste roda a poucos quadros por segundo: o jogo é empurrado com __pelada.avancar(seg).
const { test, expect } = require("@playwright/test");
const { io } = require("socket.io-client");

// o 3D é desenhado por software no navegador de teste: janela pequena desenha bem mais rápido
test.use({ viewport: { width: 480, height: 270 } });
test.setTimeout(240000);

test("contra bots: o passe de toque (J) chega no companheiro (jogador fixo, sem troca)", async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.addInitScript(() => {
    localStorage.setItem("pelada:botSize", "2");
    localStorage.setItem("pelada:botDif", JSON.stringify("facil"));
  });
  await page.goto("/pelada/#debug");
  await page.click("#btnBots");
  await page.waitForFunction(() => window.__pelada && __pelada.G.bm);
  // "Voltar pro jogo" pelo controle (sem prender o mouse) e a saída de bola
  await page.evaluate(() => { __pelada.jogar(); __pelada.avancar(2); });
  expect(await page.evaluate(() => __pelada.G.bm.phase)).toBe("live");
  // o lance: eu com a bola no pé, o colega 10 m à frente, os adversários fora do lance (caídos)
  const antes = await page.evaluate(() => {
    const { G, local } = __pelada, b = local.ball;
    for (const x of G.bots) if (x.team === "B") x.downT = 1e9;
    for (const k of G.keepers) k.z = 20;
    const mate = G.bots.find((x) => x.team === "A");
    Object.assign(G.me, { x: -12, z: 0, vx: 0, vz: 0 });
    Object.assign(mate, { x: -2, z: 0, vx: 0, vz: 0 });
    const yaw = Math.atan2(-(mate.x - G.me.x), -(mate.z - G.me.z));
    G.me.facing = yaw;
    Object.assign(b, { x: G.me.x - Math.sin(yaw) * 0.5, y: G.F.ballR, z: G.me.z - Math.cos(yaw) * 0.5, vx: 0, vy: 0, vz: 0, dono: "eu" });
    return { mate: mate.id, me: [G.me.x, G.me.z], alvo: [mate.x, mate.z] };
  });
  await page.keyboard.down("j");
  await page.evaluate(() => __pelada.avancar(0.05));
  await page.keyboard.up("j");
  // jogador fixo: eu continuo onde estava, e a bola chega no pé do companheiro
  let chegou = false;
  for (let i = 0; i < 40 && !chegou; i++) chegou = await page.evaluate((id) => { __pelada.avancar(0.1); const { G, local } = __pelada, bot = G.bots.find((x) => x.id === id); return local.ball.dono === id && Math.hypot(local.ball.x - bot.x, local.ball.z - bot.z) < 1.6; }, antes.mate);
  expect(chegou).toBe(true);
  expect(await page.evaluate(() => Math.hypot(__pelada.G.me.x + 12, __pelada.G.me.z))).toBeLessThan(1.5);
  expect(erros).toEqual([]);
});

test("online com 2 navegadores: o passe chega e o colega conduz", async ({ browser, baseURL }) => {
  const erros = [];
  const abrir = async () => { const ctx = await browser.newContext({ viewport: { width: 480, height: 270 } }); const p = await ctx.newPage(); p.on("pageerror", (e) => erros.push(String(e))); return p; };
  const a = await abrir(), b = await abrir();
  await a.goto("/pelada/#debug");
  await a.fill("#hName", "Ana");
  await a.click("#btnCreate");
  await expect(a.locator("#rCode")).toHaveText(/^[A-Z0-9]{5}$/);
  const code = await a.locator("#rCode").textContent();
  await b.goto(`/pelada/?sala=${code}#debug`);
  await b.fill("#hName", "Bia");
  await b.click("#btnJoin");
  await expect(b.locator("#lobby")).toBeVisible();
  // quem abre a sala já entra no Mandante; a Bia troca para lá
  await b.click("#joinA");
  await a.waitForFunction(() => __pelada.S.players.filter((x) => x.team === "A").length === 2);
  // um adversário só para ter os dois times (fica parado na saída de bola)
  const rival = io(baseURL + "/pelada", { transports: ["websocket"], forceNew: true });
  await new Promise((ok) => rival.emit("join", { code, name: "Caio" }, ok));
  await new Promise((ok) => rival.emit("act", { type: "team", team: "B" }, ok));
  try {
    await a.waitForFunction(() => __pelada.S.players.filter((x) => x.team).length === 3);
    await a.click("#btnStart");
    for (const p of [a, b]) await p.waitForFunction(() => __pelada.S.match && __pelada.S.match.phase === "live", null, { timeout: 20000 });
    // Ana colada na bola (no meio), virada para trás; Bia 9 m atrás, de frente para ela
    await a.evaluate(() => { __pelada.jogar(); Object.assign(__pelada.G.me, { x: 0.75, z: 0, vx: 0, vz: 0, facing: Math.PI / 2 }); });
    await b.evaluate(() => Object.assign(__pelada.G.me, { x: -9, z: 0, vx: 0, vz: 0, facing: -Math.PI / 2 }));
    for (let i = 0; i < 5; i++) for (const p of [a, b]) await p.evaluate(() => __pelada.avancar(0.1));
    await a.keyboard.down("j");
    await a.evaluate(() => __pelada.avancar(0.05));
    await a.keyboard.up("j");
    // a bola chega na Bia e fica no pé dela (o navegador dela passa a conduzir)
    let conduz = false;
    for (let i = 0; i < 60 && !conduz; i++) {
      await a.evaluate(() => __pelada.avancar(0.05));
      conduz = await b.evaluate(() => { __pelada.avancar(0.05); const { ballS, G } = __pelada, bl = ballS.mine || ballS.view; return !!ballS.mine && Math.hypot(bl.x - G.me.x, bl.z - G.me.z) < 1.6; });
    }
    expect(conduz).toBe(true);
    expect(erros).toEqual([]);
  } finally { rival.close(); }
});
