// Pelada e Rocket em todos os modos (o "teste de 5 minutos" depois de mexer no jogo): treino a pé, faltas, contra
// bots no futsal e no Strikers (com itens), treino de carro e o Rocket online. Cada modo roda alguns segundos de
// jogo (__pelada.avancar) apertando teclas, e qualquer erro de JavaScript derruba o teste. O laço do jogo engole
// erros com console.error, então o console também é conferido.
const { test, expect } = require("@playwright/test");

test.use({ viewport: { width: 480, height: 270 } }); // o 3D é por software no navegador de teste: janela pequena
test.setTimeout(240000);

function vigiar(page) {
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|WebSocket connection to/.test(m.text())) erros.push(m.text()); });
  return erros;
}
// aperta e solta uma tecla com o jogo andando um pouco entre as duas
async function tecla(page, k, seg = 0.1) { await page.keyboard.down(k); await page.evaluate((s) => __pelada.avancar(s), seg); await page.keyboard.up(k); }
async function abrir(page, url, opcoes = {}) {
  await page.addInitScript((o) => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, JSON.stringify(v)); }, opcoes);
  await page.goto(url);
  await page.waitForFunction(() => window.__pelada);
}

test("treino a pé: anda, chuta, passa, troca a câmera e faz gol", async ({ page }) => {
  const erros = vigiar(page);
  await abrir(page, "/pelada/#debug", { "pelada:estilo": "futsal", "pelada:skin": "neymar" });
  await page.click("#btnPractice");
  await page.evaluate(() => __pelada.jogar());
  await tecla(page, "w", 0.5); await tecla(page, "d", 0.3);
  // bola no pé, de frente para o gol: chute
  await page.evaluate(() => { const { G, local } = __pelada; Object.assign(G.me, { x: G.F.L - 9, z: 0, facing: -Math.PI / 2 }); Object.assign(local.ball, { x: G.F.L - 8.5, y: G.F.ballR, z: 0, vx: 0, vy: 0, vz: 0 }); });
  await tecla(page, "k", 0.4);
  await page.evaluate(() => __pelada.avancar(2));
  expect(await page.evaluate(() => __pelada.G.tKicks)).toBeGreaterThan(0);
  for (const k of ["c", "c", "c", "j", "l", "u", "Space", "ShiftLeft"]) await tecla(page, k, 0.2);
  for (let i = 0; i < 3; i++) await page.evaluate(() => __pelada.avancar(1));
  expect(erros).toEqual([]);
});

test("faltas: bate a falta e a próxima aparece", async ({ page }) => {
  const erros = vigiar(page);
  await abrir(page, "/pelada/#debug");
  await page.click("#btnFalta");
  await page.evaluate(() => __pelada.jogar());
  expect(await page.evaluate(() => __pelada.G.falta.n)).toBe(1);
  // o batedor começa 1,6 m atrás da bola: chega perto e chuta
  await page.evaluate(() => { const { G, local } = __pelada, b = local.ball; G.me.x += (b.x - G.me.x) * 0.5; G.me.z += (b.z - G.me.z) * 0.5; });
  await tecla(page, "k", 0.5);
  for (let i = 0; i < 6; i++) await page.evaluate(() => __pelada.avancar(1));
  expect(await page.evaluate(() => __pelada.G.falta.n)).toBe(2);
  expect(erros).toEqual([]);
});

for (const estilo of ["futsal", "strikers"]) {
  test(`contra bots no ${estilo}: os bots jogam, dá para trocar de jogador, dar carrinho e (no Strikers) usar item`, async ({ page }) => {
    const erros = vigiar(page);
    await abrir(page, "/pelada/#debug", { "pelada:estilo": estilo, "pelada:botSize": 3, "pelada:botDif": "dificil" });
    await page.click("#btnBots");
    await page.evaluate(() => { __pelada.jogar(); __pelada.avancar(2); });
    expect(await page.evaluate(() => __pelada.G.bm.phase)).toBe("live");
    const bola0 = await page.evaluate(() => ({ x: __pelada.local.ball.x, z: __pelada.local.ball.z }));
    for (let i = 0; i < 6; i++) await page.evaluate(() => __pelada.avancar(1));
    await tecla(page, "t", 0.1); // troca de jogador
    await page.mouse.wheel(0, 100); // carrinho (sem a bola)
    if (estilo === "strikers") { await page.evaluate(() => { __pelada.G.me.itens = ["casco", "cogumelo"]; }); await tecla(page, "g", 0.2); await tecla(page, "g", 0.2); }
    for (let i = 0; i < 6; i++) await page.evaluate(() => __pelada.avancar(1));
    const fim = await page.evaluate(() => ({ x: __pelada.local.ball.x, z: __pelada.local.ball.z, left: __pelada.G.bm.left }));
    expect(Math.hypot(fim.x - bola0.x, fim.z - bola0.z) + Math.abs(fim.x)).toBeGreaterThan(0.5); // a bola andou
    expect(fim.left).toBeLessThan(4 * 60000);
    expect(erros).toEqual([]);
  });
}

test("Rocket: treino de carro acelera, pula, usa turbo e as câmeras", async ({ page }) => {
  const erros = vigiar(page);
  await abrir(page, "/rocket/#debug");
  await page.click("#btnPracticeCar");
  await page.evaluate(() => __pelada.jogar());
  const x0 = await page.evaluate(() => __pelada.G.me.x);
  await page.keyboard.down("w"); await page.keyboard.down("ShiftLeft");
  await page.evaluate(() => __pelada.avancar(1.5));
  await page.keyboard.up("ShiftLeft"); await page.keyboard.up("w");
  expect(Math.abs((await page.evaluate(() => __pelada.G.me.x)) - x0)).toBeGreaterThan(3);
  for (const k of ["Space", "Space", "c", "v", "q"]) await tecla(page, k, 0.3);
  await page.evaluate(() => __pelada.avancar(2));
  expect(erros).toEqual([]);
});

test("Rocket online: abre a sala, começa e os carros se veem", async ({ browser }) => {
  const erros = [];
  const pags = [];
  for (const nome of ["Ana", "Bia"]) {
    const p = await (await browser.newContext({ viewport: { width: 480, height: 270 } })).newPage();
    p.on("pageerror", (e) => erros.push(String(e)));
    pags.push(p);
  }
  const [a, b] = pags;
  await a.goto("/rocket/#debug"); await a.fill("#hName", "Ana"); await a.click("#btnCreate");
  await expect(a.locator("#rCode")).toHaveText(/^[A-Z0-9]{5}$/);
  const code = await a.locator("#rCode").textContent();
  await b.goto(`/rocket/?sala=${code}#debug`); await b.fill("#hName", "Bia"); await b.click("#btnJoin");
  await a.waitForFunction(() => __pelada.S.players.filter((x) => x.team).length === 2);
  await a.click("#btnStart");
  for (const p of [a, b]) await p.waitForFunction(() => __pelada.S.match && __pelada.S.match.phase === "live", null, { timeout: 20000 });
  await b.evaluate(() => __pelada.jogar());
  for (const p of [a, b]) await p.evaluate(() => __pelada.avancar(0.3));
  const antes = await a.evaluate(() => { const r = [...__pelada.G.remotes.values()][0]; return { x: r.x, z: r.z }; });
  await b.keyboard.down("w");
  for (let i = 0; i < 10; i++) for (const p of [a, b]) await p.evaluate(() => __pelada.avancar(0.1));
  await b.keyboard.up("w");
  for (const p of [a, b]) await p.evaluate(() => __pelada.avancar(0.3));
  // a Ana vê o carro da Bia (interpolado) andando
  const depois = await a.evaluate(() => { const r = [...__pelada.G.remotes.values()][0]; return { x: r.x, z: r.z }; });
  expect(Math.hypot(depois.x - antes.x, depois.z - antes.z)).toBeGreaterThan(1);
  expect(erros).toEqual([]);
});
