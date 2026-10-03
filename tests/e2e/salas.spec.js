// Em cada jogo de sala: dois navegadores entram (um cria, o outro entra pelo código), o organizador começa e o jogo
// roda um pouco. Nenhum erro de JavaScript pode aparecer (pega o render da sala, do jogo, os avisos e o relógio).
const { test, expect } = require("@playwright/test");
const { io } = require("socket.io-client");

// os jogos em 3D são desenhados por software no navegador de teste: janela pequena
const TELA = (jogo) => (["corrida", "tiro", "batalha"].includes(jogo) ? { width: 480, height: 270 } : { width: 800, height: 500 });

test.setTimeout(300000); // dois navegadores desenhando 3D por software ao mesmo tempo é lento
const JOGOS = ["banco", "uno", "truco", "sinuca", "ludo", "botao", "domino", "corrida", "tiro", "batalha"];

const TRES_D = ["corrida", "tiro", "batalha"];
for (const jogo of JOGOS) {
  test(`${jogo}: dois entram, começa e roda sem erro`, async ({ browser, baseURL }) => {
    const erros = [], pags = [];
    // nos jogos em 3D o segundo jogador é um cliente sem tela (dois mundos 3D desenhados por software derrubam o navegador de teste)
    const nomes = TRES_D.includes(jogo) ? ["Ana"] : ["Ana", "Bia"];
    for (const nome of nomes) {
      const p = await (await browser.newContext({ viewport: TELA(jogo) })).newPage();
      p.on("pageerror", (e) => erros.push(`${nome}: ${e}`));
      await p.goto(`/${jogo}/`);
      await p.fill("#hName", nome);
      if (!pags.length) await p.click("#btnCreate");
      else { await p.fill("#hCode", await pags[0].locator("#rCode").textContent()); await p.click("#btnJoin"); }
      await expect(p.locator("#rCode")).toHaveText(/^[A-Z0-9]{5}$/);
      pags.push(p);
    }
    const [a] = pags;
    let bia = null;
    if (TRES_D.includes(jogo)) {
      bia = io(baseURL + "/" + jogo, { transports: ["websocket"], forceNew: true });
      const code = await a.locator("#rCode").textContent();
      const r = await new Promise((ok) => bia.emit("join", { code, name: "Bia" }, ok));
      expect(r.ok).toBe(true);
    }
    try {
      if (jogo === "domino" || jogo === "sinuca") await a.click("[data-mode=individual]");
      await expect(a.locator("#btnStart")).toBeEnabled({ timeout: 10000 });
      await a.click("#btnStart");
      await a.waitForTimeout(4000);
      for (const p of pags) await p.mouse.click(TELA(jogo).width / 2, TELA(jogo).height / 2).catch(() => {});
      await a.waitForTimeout(1500);
      expect(erros).toEqual([]);
    } finally { if (bia) bia.close(); }
  });
}

test("leilão: cria a sala e outra pessoa abre o convite", async ({ browser }) => {
  const erros = [];
  const a = await (await browser.newContext()).newPage();
  a.on("pageerror", (e) => erros.push(String(e)));
  await a.goto("/leilao/");
  await a.waitForTimeout(1000);
  // cria pelo socket da própria página (a tela inicial tem muitos campos) e entra como organizador
  const sala = await a.evaluate(() => new Promise((ok) => socket.emit("create", { players: "A\nB\nC\nD", perTeam: 2, coins: 10 }, ok)));
  expect(sala.ok).toBe(true);
  const b = await (await browser.newContext()).newPage();
  b.on("pageerror", (e) => erros.push(String(e)));
  await b.goto(`/leilao/?sala=${sala.code}`);
  await b.waitForTimeout(1500);
  expect(erros).toEqual([]);
});

test("tiro: o treino abre com os alvos andando", async ({ page }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|WebSocket connection to/.test(m.text())) erros.push(m.text()); });
  await page.setViewportSize({ width: 480, height: 270 });
  await page.goto("/tiro/#debug");
  await page.click("#btnPractice");
  await page.waitForFunction(() => window.__tiro && __tiro.G.active && __tiro.G.bots.length > 0);
  const x0 = await page.evaluate(() => __tiro.G.bots.map((b) => b.x + b.z).join());
  await page.waitForFunction((x) => __tiro.G.bots.map((b) => b.x + b.z).join() !== x, x0, { timeout: 30000 });
  expect(erros).toEqual([]);
});
