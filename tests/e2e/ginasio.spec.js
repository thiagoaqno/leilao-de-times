// Partidas reais, sem substituir o motor ou os pacotes do servidor.
const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { subirServidor } = require("../ajuda.js");
const fotos = process.env.GINASIO_FOTOS;

async function abrir(page, modo = "galeramon") {
  await page.goto("/ginasio/#debug");
  await expect(page.locator("#conexao")).toHaveText("Online");
  if (modo === "pokemon") await page.locator('[data-modo="pokemon"]').click();
  await page.locator("#hName").fill("Teste");
}
async function jogar(page) {
  await page.locator("#btnRobo").click();
  await page.waitForFunction(() => window.__ginasio?.S?.phase === "play" && window.__ginasio.N.snap?.tempo > 0.1);
  await expect(page.locator("#painel")).toBeHidden();
}
async function meuEstado(page) {
  return page.evaluate(() => { const g = window.__ginasio; return g.N.snap.entidades.find((e) => e.id === g.ME.id); });
}
async function conferirTela(page, nome) {
  const tela = await page.evaluate(() => {
    const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
    const pix = ctx.getImageData(0, 0, cv.width, cv.height).data, cores = new Set();
    for (let i = 0; i < pix.length; i += 4) cores.add(`${pix[i]},${pix[i + 1]},${pix[i + 2]}`);
    const g = window.__ginasio, imagens = [...g.imagens.values()].filter((i) => i.pronto).length;
    return { cores: cores.size, imagens, semSuavizar: !ctx.imageSmoothingEnabled, largura: document.documentElement.scrollWidth, tela: innerWidth };
  });
  expect(tela.cores).toBeGreaterThan(25); expect(tela.imagens).toBeGreaterThanOrEqual(2); expect(tela.semSuavizar).toBe(true);
  expect(tela.largura).toBeLessThanOrEqual(tela.tela);
  const botoes = await page.locator('body.jogando button:visible').evaluateAll((bs) => bs.map((b) => {
    const r = b.getBoundingClientRect(); return { nome: b.getAttribute("aria-label") || b.textContent, x: r.x, y: r.y, direita: r.right, baixo: r.bottom };
  }));
  const tamanho = page.viewportSize();
  for (const b of botoes) { expect(b.x, b.nome).toBeGreaterThanOrEqual(-1); expect(b.y, b.nome).toBeGreaterThanOrEqual(0); expect(b.direita, b.nome).toBeLessThanOrEqual(tamanho.width + 1); expect(b.baixo, b.nome).toBeLessThanOrEqual(tamanho.height + 1); }
  for (let i = 0; i < botoes.length; i++) for (let j = i + 1; j < botoes.length; j++) {
    const a = botoes[i], b = botoes[j];
    expect(Math.min(a.direita, b.direita) - Math.max(a.x, b.x) > 1 && Math.min(a.baixo, b.baixo) - Math.max(a.y, b.y) > 1, `${a.nome} / ${b.nome}`).toBe(false);
  }
  if (fotos && nome) { fs.mkdirSync(fotos, { recursive: true }); await page.screenshot({ path: path.join(fotos, `${nome}.png`) }); }
}

test("ginasio: computador 480x270 move, ataca, esquiva, troca e reconecta", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 270 });
  const erros = []; page.on("pageerror", (e) => erros.push(e.message));
  await abrir(page); await jogar(page);
  const antes = await meuEstado(page);
  await page.keyboard.down("d");
  await expect.poll(async () => (await meuEstado(page)).x).toBeGreaterThan(antes.x + 0.5);
  await page.keyboard.up("d");
  const cv = await page.locator("#cv").boundingBox();
  await page.mouse.click(cv.x + cv.width * 0.7, cv.y + cv.height * 0.5);
  await expect.poll(async () => (await meuEstado(page)).cds[0]).toBeGreaterThan(0);
  await page.mouse.click(cv.x + cv.width * 0.7, cv.y + cv.height * 0.5, { button: "right" });
  await expect.poll(async () => (await meuEstado(page)).cds[1]).toBeGreaterThan(0);
  await page.keyboard.press("q"); await expect.poll(async () => (await meuEstado(page)).cds[2]).toBeGreaterThan(0);
  await page.keyboard.press("e"); await expect.poll(async () => (await meuEstado(page)).cds[3]).toBeGreaterThan(0);
  await page.keyboard.press("Space"); await expect.poll(async () => (await meuEstado(page)).esquivaCd).toBeGreaterThan(0);
  await conferirTela(page, "ginasio-fase-3-computador");
  await page.keyboard.press("2"); await expect.poll(async () => (await meuEstado(page)).ativo).toBe(1);
  await expect(page.locator('#reservas [data-troca="1"]')).toHaveClass("ativo");
  const id = await page.evaluate(() => window.__ginasio.ME.id);
  await page.reload(); await page.waitForFunction(() => window.__ginasio?.N.previsto && window.__ginasio.S.phase === "play");
  expect(await page.evaluate(() => window.__ginasio.ME.id)).toBe(id); await expect(page.locator("#painel")).toBeHidden();
  await page.setViewportSize({ width: 375, height: 812 }); await conferirTela(page);
  await page.setViewportSize({ width: 480, height: 270 });
  await page.evaluate(() => { const g = window.__ginasio; document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" })); window.dispatchEvent(new Event("blur")); });
  expect(await page.evaluate(() => window.__ginasio.comandoAtual().dx)).toBe(0);
  await page.locator("#btnSala").click(); await expect(page.locator("#painel")).toBeVisible();
  await page.locator("#btnLeave").click(); await expect(page.locator("#inicio")).toBeVisible();
  expect(erros).toEqual([]);
});

test("ginasio: seletor dos 493 Pokemon e sprites carregados em partida", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const erros = []; page.on("pageerror", (e) => erros.push(e.message));
  await abrir(page, "pokemon");
  await page.locator('#meuTime [data-escolher="0"]').click();
  await expect(page.locator("#dexPagina")).toHaveText("1 / 21");
  await page.locator("#dexBusca").fill("Garchomp"); await page.locator('#dexLista [data-bicho="garchomp"]').click();
  await expect(page.locator("#meuTime")).toContainText("Garchomp");
  await page.locator('#meuTime [data-escolher="0"]').click();
  await page.locator("#dexBusca").fill("não existe"); await expect(page.locator("#dexVazio")).toBeVisible();
  await page.locator("#dexFechar").click();
  await jogar(page);
  await page.waitForFunction(() => {
    const g = window.__ginasio; return g.N.snap.entidades.every((e) => g.imagens.get(`pokemon:${e.forma}`)?.pronto);
  });
  expect((await meuEstado(page)).bicho).toBe("garchomp");
  await conferirTela(page, "ginasio-fase-3-pokemon"); expect(erros).toEqual([]);
});

for (const [nome, viewport] of [["celular", { width: 375, height: 812 }], ["paisagem", { width: 480, height: 270 }]]) {
  test(`ginasio: toque ${nome}, mira ao segurar, ataque ao soltar e troca`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
    const page = await context.newPage(), erros = []; page.on("pageerror", (e) => erros.push(e.message));
    try {
      await abrir(page); await jogar(page);
      await expect(page.locator("#toque")).toBeVisible(); await expect(page.locator("#toque .btns button")).toHaveCount(5);
      const antes = await meuEstado(page), stick = await page.locator("#toque .stick").boundingBox();
      const cdp = await context.newCDPSession(page);
      const dedo = { x: stick.x + stick.width * 0.85, y: stick.y + stick.height / 2, id: 1 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [dedo] });
      await expect.poll(async () => (await meuEstado(page)).x).toBeGreaterThan(antes.x + 0.5);
      const botao = await page.locator('#toque [data-habilidade="0"]').boundingBox();
      const ataque = { x: botao.x + botao.width / 2, y: botao.y + botao.height / 2, id: 2 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [dedo, ataque] });
      await expect.poll(() => page.evaluate(() => window.__ginasio.entrada.preparando)).toBe(0);
      expect(await page.evaluate(() => window.__ginasio.comandoAtual().mira.x)).toBeGreaterThan(0.9);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(async () => (await meuEstado(page)).cds[0]).toBeGreaterThan(0);
      await page.locator('#toque [data-habilidade="4"]').tap();
      await expect.poll(async () => (await meuEstado(page)).esquivaCd).toBeGreaterThan(0);
      expect(await page.evaluate(() => window.__ginasio.movimentoReduzido.matches)).toBe(true);
      await conferirTela(page, `ginasio-fase-3-${nome}`);
      await page.locator('#reservas [data-troca="1"]').tap();
      await expect.poll(async () => (await meuEstado(page)).ativo).toBe(1);
      const hp = (await meuEstado(page)).hp;
      await expect.poll(async () => (await meuEstado(page)).hp, { timeout: 30000 }).toBeLessThan(hp);
      expect(erros).toEqual([]);
    } finally { await context.close(); }
  });
}

test("ginasio: sala 2x2 com amigo, time salvo e espectador sem controles", async ({ page, browser }) => {
  const amigo = await browser.newContext(), visita = await browser.newContext();
  try {
    await abrir(page); await page.locator('[data-formato="2x2"]').click();
    await page.locator("#btnCreate").click(); await expect(page.locator("#rCode")).toBeVisible();
    const code = await page.locator("#rCode").textContent();
    const outro = await amigo.newPage();
    await outro.addInitScript(() => localStorage.setItem("galeramon_time", JSON.stringify(["saci", "pedrolho", "capivarao"])));
    await abrir(outro); await outro.locator("#hName").fill("Amigo"); await outro.locator("#hCode").fill(code); await outro.locator("#btnJoin").click();
    await expect(outro.locator("#sala")).toBeVisible(); await expect(outro.locator("#meuTime")).toContainText("Saci");
    await page.locator("#btnStart").click(); await page.waitForFunction(() => window.__ginasio?.N.snap?.entidades.length === 4);
    await expect(outro.locator("#painel")).toBeHidden();
    const espectador = await visita.newPage();
    await abrir(espectador); await espectador.locator("#hCode").fill(code); await espectador.locator("#btnWatch").click();
    await expect(espectador.locator("#observando")).toBeVisible(); await expect(espectador.locator("#hud")).toBeHidden();
    expect(await espectador.evaluate(() => window.__ginasio.ME.id)).toBeNull();
  } finally { await amigo.close(); await visita.close(); }
});

test("ginasio: resultado de partida real, revanche e retorno a sala", async ({ page }) => {
  const servidor = await subirServidor({ NODE_ENV: "test", GINASIO_TICK_MS: "1" });
  const erros = []; page.on("pageerror", (e) => erros.push(e.message));
  try {
    await page.goto(servidor.url + "/ginasio/#debug"); await expect(page.locator("#conexao")).toHaveText("Online");
    await jogar(page);
    await expect(page.locator("#resultado")).toBeVisible({ timeout: 60000 });
    await expect(page.locator(".resultado-lado")).toHaveCount(2);
    const inicio = await page.evaluate(() => window.__ginasio.S.match.start);
    await page.locator("#btnRevanche").click();
    await page.waitForFunction((anterior) => window.__ginasio.S.phase === "play" && window.__ginasio.S.match.start !== anterior, inicio);
    await expect(page.locator("#resultado")).toBeHidden();
    await expect(page.locator("#resultado")).toBeVisible({ timeout: 60000 });
    await page.locator("#btnLobby").click(); await expect(page.locator("#sala")).toBeVisible();
    expect(erros).toEqual([]);
  } finally { await servidor.parar(); }
});
