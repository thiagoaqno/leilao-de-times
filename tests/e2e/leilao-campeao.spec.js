// Leilão: a festa do campeão (public/leilao/campeao.js). Uma sala de verdade vai até o fim do campeonato: a festa abre
// sozinha uma vez, passa pelas cenas (placar final, gols, campanha, artilharia e a foto do elenco), não abre de novo
// ao redesenhar nem ao recarregar, e o botão "Rever a festa" abre outra vez. Com "menos movimento", abre na foto.
const { test, expect } = require("@playwright/test");
const { io } = require("socket.io-client");

const NOMES = ["Neymar", "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappé", "Erling Haaland", "Vinícius Júnior", "Kevin De Bruyne", "Luka Modrić",
  "Mohamed Salah", "Harry Kane", "Rodri", "Virgil van Dijk", "Alisson", "Thibaut Courtois", "Jude Bellingham", "Pedri", "Ronaldinho Gaúcho", "Zinedine Zidane",
  "Pelé", "Diego Maradona", "Romário", "Ronaldo Fenômeno", "Kaká", "Rivaldo", "Gianluigi Buffon", "Manuel Neuer"];

// abre a sala pela página (o organizador joga), põe mais 2 times pelo socket, faz o leilão inteiro e simula
async function campeonato(page, baseURL) {
  await page.goto("/leilao/#debug");
  await page.waitForFunction(() => typeof socket !== "undefined" && socket.connected);
  const sala = await page.evaluate((nomes) => new Promise((ok) => socket.emit("create", { players: nomes.join("\n"), perTeam: 5, coins: 60, skips: 0, minBid: 1, hostPlays: true, hostName: "Ana", terms: { prompt: "futsal" } }, (r) => {
    store.set("lt_sess_" + r.code, { hostToken: r.hostToken, capToken: r.capToken }); enter(r.code, r.capId, true); ok(r);
  })), NOMES);
  expect(sala.ok).toBe(true);
  const outros = [];
  for (const nome of ["Bia", "Caio"]) {
    const s = io(baseURL, { transports: ["websocket"], forceNew: true });
    await new Promise((ok) => s.once("connect", ok));
    await new Promise((ok) => s.emit("join", { code: sala.code, name: nome }, ok));
    outros.push(s);
  }
  const host = (action, extra = {}) => page.evaluate(([a, e]) => new Promise((ok) => socket.emit("host", { action: a, ...e }, ok)), [action, extra]);
  expect((await host("start")).ok).toBe(true);
  for (let i = 0; i < 100 && (await page.evaluate(() => S.phase)) !== "done"; i++) await host((await page.evaluate(() => S.phase)) === "bidding" ? "reveal" : "spin");
  expect(await page.evaluate(() => S.phase)).toBe("done");
  expect((await host("simFootball", { sport: "futsal", format: "league", penaltis: false, force: true })).ok).toBe(true);
  return { outros, host };
}

test("leilão: a festa do campeão abre uma vez no fim do campeonato, com as cenas e a foto do elenco", async ({ page, baseURL }) => {
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  const { outros, host } = await campeonato(page, baseURL);
  try {
    // ainda revelando: nada de festa
    await host("revealNext");
    await page.waitForTimeout(1200);
    await expect(page.locator("dialog.festa")).toHaveCount(0);
    // revelou tudo: a festa abre sozinha, com o placar da final
    await host("revealAll");
    const festa = page.locator("dialog.festa[open]");
    await expect(festa).toBeVisible();
    const info = await page.evaluate(() => { const F = __festa.FESTA.F; return { cenas: __festa.FESTA.cenas.map((c) => c.id), elenco: F.elenco.length, final: !!F.final, campeao: F.sum.campeao, id: F.sum.id, venceu: F.final[F.final.vencedor].id }; });
    expect(info.final).toBe(true);
    expect(info.venceu).toBe(info.id);
    expect(info.cenas[0]).toBe("fim");
    expect(info.cenas.at(-1)).toBe("foto");
    expect(info.cenas).toContain("campanha");
    await expect(festa.locator(".fsCarimbo")).toContainText("Fim de jogo");
    await expect(festa.locator(".fsPlacar")).toBeVisible();
    // o vídeo anda sozinho: a primeira cena passa
    await expect.poll(() => page.evaluate(() => __festa.FESTA.i), { timeout: 45000 }).toBeGreaterThan(0);
    // pula para a foto: a faixa dos campeões, o elenco inteiro com nome e o botão de baixar
    await festa.locator(".fsPular").click();
    await expect(festa.locator(".fsFaixa")).toContainText("Campeões");
    await expect(festa.locator(".fsFaixa")).toContainText(info.campeao);
    await expect(festa.locator(".fsJog")).toHaveCount(info.elenco);
    await expect(festa.locator(".fsBaixar")).toBeVisible();
    // o telão desenhou de verdade (muitas cores)
    const cores = await page.evaluate(() => { const d = document.querySelector("dialog.festa canvas").getContext("2d").getImageData(0, 0, 160, 90).data, s = new Set(); for (let i = 0; i < d.length; i += 4) s.add(d[i] + "," + d[i + 1] + "," + d[i + 2]); return s.size; });
    expect(cores).toBeGreaterThan(20);
    // fecha: não abre de novo ao redesenhar nem ao recarregar a página
    await festa.locator(".fsFechar").click();
    await expect(page.locator("dialog.festa")).toHaveCount(0);
    await page.evaluate(() => render());
    await page.waitForTimeout(1500);
    await expect(page.locator("dialog.festa")).toHaveCount(0);
    await page.reload();
    await page.waitForFunction(() => typeof S !== "undefined" && S && S.reveal && S.reveal.summary);
    await page.waitForTimeout(1500);
    await expect(page.locator("dialog.festa")).toHaveCount(0);
    // "Rever a festa do título" abre outra vez, do começo
    await page.locator("button", { hasText: "Rever a festa" }).click();
    await expect(page.locator("dialog.festa[open]")).toBeVisible();
    await expect(page.locator("dialog.festa .fsSeg").first()).toHaveClass(/on/); // do começo (depois de recarregar, sem o #debug)
    expect(erros).toEqual([]);
  } finally { for (const s of outros) s.close(); }
});

test("leilão: com menos movimento, a festa abre direto na foto, parada", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  const { outros, host } = await campeonato(page, baseURL);
  try {
    await host("revealAll");
    const festa = page.locator("dialog.festa[open]");
    await expect(festa).toBeVisible();
    await expect(festa.locator(".fsFaixa")).toContainText("Campeões");
    expect(await page.evaluate(() => __festa.FESTA.i)).toBe(await page.evaluate(() => __festa.FESTA.cenas.length - 1));
    expect(await page.evaluate(() => __festa.FESTA.raf)).toBe(0); // nada animando
    await expect(festa.locator(".fsRever")).toBeHidden();
    expect(erros).toEqual([]);
  } finally { for (const s of outros) s.close(); await ctx.close(); }
});
