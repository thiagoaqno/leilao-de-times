// Caminhada e convites pela interface, usando as salas reais do servidor.
const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const fotos = process.env.GINASIO_FOTOS;

async function abrirVila(page, nome, time) {
  await page.addInitScript(({ nome, time }) => {
    localStorage.setItem("galera:name", JSON.stringify(nome));
    if (!localStorage.getItem("vila_spawn")) localStorage.setItem("vila_spawn", JSON.stringify("tenis"));
    if (time) localStorage.setItem("pokemon_time", JSON.stringify(time));
  }, { nome, time });
  await page.goto("/#debug");
  await page.waitForFunction(() => window.__vila?.myId);
}
async function ponto(page, alvo) {
  return page.evaluate((alvo) => {
    const v = window.__vila, c = v.camera;
    const p = alvo === "ginasio" ? v.GAMES.find((g) => g.id === alvo) : [...v.others.values()].find((o) => o.name === alvo);
    const x = alvo === "ginasio" ? p.x + p.w / 2 : p.fx + .5;
    const y = alvo === "ginasio" ? p.y + .6 : p.fy + .5;
    return { x: (x * c.tile - c.x) * c.scale, y: (y * c.tile - c.y) * c.scale };
  }, alvo);
}
async function foto(page, nome) {
  if (!fotos) return;
  fs.mkdirSync(fotos, { recursive: true });
  await page.screenshot({ path: path.join(fotos, `${nome}.png`) });
}
function pessoaNaLista(page, nome) {
  return page.locator(".blist > div").filter({ has: page.getByText(nome, { exact: true }) }).getByRole("button", { name: "Desafiar", exact: true });
}
async function conferirModal(page) {
  const tela = await page.locator("#popBox").evaluate((box) => {
    const r = box.getBoundingClientRect();
    return { x: r.x, y: r.y, direita: r.right, baixo: r.bottom, largura: box.scrollWidth, interna: box.clientWidth, vw: innerWidth, vh: innerHeight };
  });
  expect(tela.x).toBeGreaterThanOrEqual(0); expect(tela.y).toBeGreaterThanOrEqual(0);
  expect(tela.direita).toBeLessThanOrEqual(tela.vw); expect(tela.baixo).toBeLessThanOrEqual(tela.vh);
  expect(tela.largura).toBeLessThanOrEqual(tela.interna);
  const botoes = await page.locator("#popBox button").evaluateAll((bs) => bs.map((b) => {
    const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom, texto: b.textContent, cabe: b.scrollWidth <= b.clientWidth };
  }));
  for (const b of botoes) expect(b.cabe, b.texto).toBe(true);
  for (let i = 0; i < botoes.length; i++) for (let j = i + 1; j < botoes.length; j++) {
    const a = botoes[i], b = botoes[j];
    expect(Math.min(a.r, b.r) - Math.max(a.x, b.x) > 1 && Math.min(a.b, b.b) - Math.max(a.y, b.y) > 1, `${a.texto} / ${b.texto}`).toBe(false);
  }
}

for (const celular of [false, true]) {
  test(`vila/ginasio: caminha ate a porta, entra e retorna ${celular ? "no celular" : "no computador"}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: celular ? { width: 375, height: 812 } : { width: 1280, height: 800 }, hasTouch: celular, isMobile: celular });
    const page = await context.newPage(), erros = []; page.on("pageerror", (e) => erros.push(e.message));
    page.setDefaultTimeout(20000);
    try {
      await abrirVila(page, "Passeio");
      const mapa = await page.evaluate(() => {
        const v = window.__vila, g = v.GAMES.find((g) => g.id === "ginasio"), [x, y] = g.mats[0];
        return { caminho: v.bfs(v.player.x, v.player.y, x, y), porta: v.walkable(x, y), predio: v.walkable(g.x, g.y), capacho: v.ground[y][x] };
      });
      expect(mapa.caminho.length).toBeGreaterThan(7); expect(mapa.porta).toBe(true); expect(mapa.predio).toBe(false); expect(mapa.capacho).toBe("m");
      await page.locator("#bMenu").click(); await expect(page.locator('#menuList [data-id="ginasio"]')).toHaveAttribute("href", "/ginasio/");
      await page.locator("#menuX").click();
      if (celular) {
        const x = await page.evaluate(() => window.__vila.player.x);
        const seta = await page.locator('#dpad [data-d="right"]').boundingBox(), cdp = await context.newCDPSession(page);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: seta.x + seta.width / 2, y: seta.y + seta.height / 2, id: 1 }] });
        await expect.poll(() => page.evaluate(() => window.__vila.player.x)).toBeGreaterThan(x);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForFunction(() => !window.__vila.here && !window.__vila.player.moving);
      }
      const p = await ponto(page, "ginasio");
      if (celular) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
      await page.waitForFunction(() => window.__vila.here?.id === "ginasio" && !window.__vila.player.moving);
      await expect(page.locator("#dlg")).toContainText("Ginásio");
      await expect(page.locator("#dlg")).toHaveCSS("opacity", "1");
      const cores = await page.locator("#cv").evaluate((cv) => {
        const v = window.__vila, c = v.camera, g = v.GAMES.find((g) => g.id === "ginasio");
        const pix = cv.getContext("2d").getImageData(Math.round((g.x * 16 - c.x) * c.scale * devicePixelRatio), Math.round((g.y * 16 - c.y) * c.scale * devicePixelRatio), 100, 50).data;
        return new Set(Array.from({ length: pix.length / 4 }, (_, i) => `${pix[i * 4]},${pix[i * 4 + 1]},${pix[i * 4 + 2]}`)).size;
      });
      expect(cores).toBeGreaterThan(5);
      await foto(page, `ginasio-fase-4-${celular ? "celular" : "vila"}`);
      if (celular) await page.locator("#dlg button").tap(); else await page.locator("#dlg button").press("Space");
      await expect(page).toHaveURL(/\/ginasio\/$/); await expect(page.locator("#inicio")).toBeVisible();
      await page.locator('a[href="/"]').first().click();
      await expect(page.locator("#dlg")).toContainText("Ginásio");
      expect(erros).toEqual([]);
    } finally { await context.close(); }
  });
}

test("vila/ginasio: sprite e botao Batalha convidam, recusa no toque e aceite entram na mesma sala", async ({ browser }) => {
  const ca = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cb = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const a = await ca.newPage(), b = await cb.newPage(), erros = [];
  for (const p of [a, b]) p.on("pageerror", (e) => erros.push(e.message));
  try {
    await abrirVila(a, "Thiago", ["charizard", "blastoise", "venusaur"]);
    await abrirVila(b, "Amiga", ["pikachu", "eevee", "garchomp"]);
    const inicial = await a.evaluate(() => window.__vila.player.x);
    await a.keyboard.down("d");
    await expect.poll(() => a.evaluate(() => window.__vila.player.x)).toBeGreaterThanOrEqual(inicial + 2);
    await a.keyboard.up("d");
    await a.waitForFunction(() => !window.__vila.player.moving && [...window.__vila.others.values()].some((o) => o.name === "Amiga"));
    const p = await ponto(a, "Amiga"); await a.mouse.click(p.x, p.y);
    await expect(a.locator("#popBox h2")).toHaveText("Amiga");
    await expect(a.locator('[data-jogo="turnos"]')).toHaveAttribute("aria-pressed", "true");
    await a.locator('[data-jogo="ginasio"]').click(); await a.locator('[data-modo="pokemon"]').click();
    await expect(a.locator("#desafioEnviar")).toHaveText("Desafiar no Ginásio (tempo real)");
    await conferirModal(a); await foto(a, "ginasio-fase-4-desafio");
    await a.locator("#desafioEnviar").click();
    await expect(b.locator("#popBox")).toContainText("Ginásio · tempo real · Pokémon");
    await conferirModal(b); await foto(b, "ginasio-fase-4-convite");
    await b.locator("#invNo").tap(); await expect(b.locator("#pop")).toBeHidden();
    await expect(a.locator("#toasts")).toContainText("recusou");
    await b.locator("#bTeam").tap(); await pessoaNaLista(b, "Thiago").tap();
    await b.locator('[data-jogo="ginasio"]').tap(); await b.locator('[data-modo="pokemon"]').tap();
    await conferirModal(b); await b.setViewportSize({ width: 480, height: 270 }); await conferirModal(b);
    await b.setViewportSize({ width: 375, height: 812 }); await b.locator("#popX").tap();
    await a.locator("#bTeam").click(); await pessoaNaLista(a, "Amiga").click();
    await a.locator('[data-jogo="ginasio"]').click(); await a.locator('[data-modo="pokemon"]').click(); await a.locator("#desafioEnviar").click();
    await b.locator("#invYes").tap();
    for (const pg of [a, b]) { await expect(pg).toHaveURL(/\/ginasio\/\?sala=[A-Z2-9]{5}/); await expect(pg.locator("#sala")).toBeVisible(); }
    const code = new URL(a.url()).searchParams.get("sala");
    expect(new URL(b.url()).searchParams.get("sala")).toBe(code);
    const st = await a.evaluate(() => ({ sala: window.__ginasio.S, eu: window.__ginasio.ME }));
    expect(st.sala.config).toEqual({ modo: "pokemon", formato: "1x1", bots: false });
    expect(st.sala.players.map((p) => [p.name, p.lado, p.time])).toEqual([["Thiago", 0, ["charizard", "blastoise", "venusaur"]], ["Amiga", 1, ["pikachu", "eevee", "garchomp"]]]);
    const idB = await b.evaluate(() => window.__ginasio.ME.id); expect(idB).not.toBe(st.eu.id);
    expect(a.url()).not.toContain(st.eu.token);
    await b.reload(); await expect(b.locator("#sala")).toBeVisible(); expect(await b.evaluate(() => window.__ginasio.ME.id)).toBe(idB);
    await a.locator("#btnStart").click();
    for (const pg of [a, b]) await pg.waitForFunction(() => window.__ginasio?.N.snap?.tempo > .1);
    expect(await a.evaluate(() => window.__ginasio.S.match.jogadores.every((p) => !p.bot))).toBe(true);
    await foto(a, "ginasio-fase-4-amigos"); expect(erros).toEqual([]);
  } finally { await ca.close(); await cb.close(); }
});

test("vila/ginasio: a opcao padrao continua na batalha por turnos", async ({ browser }) => {
  const ca = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cb = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const a = await ca.newPage(), b = await cb.newPage();
  try {
    await abrirVila(a, "Turnos1"); await abrirVila(b, "Turnos2");
    await a.waitForFunction(() => [...window.__vila.others.values()].some((o) => o.name === "Turnos2"));
    await a.locator("#bTeam").click(); await pessoaNaLista(a, "Turnos2").click();
    await expect(a.locator('[data-jogo="turnos"]')).toHaveAttribute("aria-pressed", "true");
    await a.locator("#desafioEnviar").click(); await expect(b.locator("#popBox")).toContainText("Batalha de Galeramon");
    await b.locator("#invYes").tap();
    await expect(a.locator("#bctl .bmoves")).toBeVisible(); await expect(b.locator("#bctl .bmoves")).toBeVisible();
    expect(a.url()).toContain("/#debug"); expect(b.url()).toContain("/#debug");
    a.once("dialog", (d) => d.accept()); await a.locator("#bFf").click();
    await b.locator("#bClose").tap(); await expect(b.locator("#bt")).toBeHidden();
    await a.locator("#bClose").click(); await expect(a.locator("#bt")).toBeHidden();
  } finally { await ca.close(); await cb.close(); }
});
