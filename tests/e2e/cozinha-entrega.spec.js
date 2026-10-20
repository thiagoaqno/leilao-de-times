const { test, expect } = require("@playwright/test");

// Uma sopa de cebola inteira só com o teclado: anda até cada bancada (pelo mesmo caminho do planejador, K.rota),
// pega, pica segurando F, põe na panela, serve e entrega. O teste sem tela desenha devagar (o cozinheiro anda pouco por
// segundo), então nada aqui depende de pressa: o prato fica esperando num balcão perto do fogão, e a panela pronta
// sai do fogo antes de servir (fora do fogo ela não queima). Também confere o nome do item na mão.
const SETAS = { x: ["ArrowLeft", "ArrowRight"], z: ["ArrowUp", "ArrowDown"] };

// a bancada de destino: "tipo" ou "tipo:qual" (fogao:cheio = o fogão com comida; balcao:perto = o balcão vazio
// alcançável mais perto do primeiro fogão)
function acharBancada(sel) {
  const { G, K } = window.__cozinha, [tipo, qual] = sel.split(":"), L = (x) => G.mesa.lugares[x.i][0];
  const livre = (x) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => !K.solido(G.mapa, x.c + dc, x.r + dr));
  if (qual === "cheio") return G.mapa.tiles.find((x) => x.tipo === tipo && L(x)?.c?.length > 0);
  if (qual === "perto") {
    const f = G.mapa.tiles.find((x) => x.tipo === "fogao"), d = (x) => Math.abs(x.c - f.c) + Math.abs(x.r - f.r);
    return G.mapa.tiles.filter((x) => x.tipo === tipo && livre(x) && (!L(x) || L(x).k === "prato")).sort((a, b) => d(a) - d(b))[0];
  }
  return G.mapa.tiles.find((x) => x.tipo === tipo);
}
// para onde andar agora: dois pontos à frente no caminho (anda sem parar a cada casa), ou a própria bancada quando já
// está do lado dela
async function direcao(page, sel) {
  return page.evaluate(([sel, achar]) => {
    const t = new Function("return " + achar)()(sel), { G, K } = window.__cozinha, me = G.me, T = K.TILE;
    const a = K.alvo(G.mapa, me); if (a && a.i === t.i) return { pronto: true };
    const rota = K.rota(G.mapa, [me.x, me.z], t);
    const [px, pz] = rota.length > 1 ? rota[Math.min(2, rota.length - 1)] : [(t.c + 0.5) * T, (t.r + 0.5) * T];
    return { dx: px - me.x, dz: pz - me.z };
  }, [sel, acharBancada.toString()]);
}
async function irAte(page, sel) {
  const segurando = new Set();
  const segurar = async (quero) => {
    for (const k of segurando) if (!quero.has(k)) { await page.keyboard.up(k); segurando.delete(k); }
    for (const k of quero) if (!segurando.has(k)) { await page.keyboard.down(k); segurando.add(k); }
  };
  for (let i = 0; i < 600; i++) {
    const d = await direcao(page, sel);
    if (d.pronto) { await segurar(new Set()); await page.waitForTimeout(150); return; } // parado: o servidor recebe a mesma posição
    const quero = new Set();
    if (Math.abs(d.dx) > 0.25) quero.add(SETAS.x[d.dx > 0 ? 1 : 0]);
    if (Math.abs(d.dz) > 0.25) quero.add(SETAS.z[d.dz > 0 ? 1 : 0]);
    if (!quero.size) quero.add(Math.abs(d.dx) > Math.abs(d.dz) ? SETAS.x[d.dx > 0 ? 1 : 0] : SETAS.z[d.dz > 0 ? 1 : 0]);
    await segurar(quero);
    await page.waitForTimeout(40);
  }
  await segurar(new Set());
  throw new Error("não chegou em " + sel);
}
const mao = (page) => page.evaluate(() => { const { G, K } = window.__cozinha; return K.nomeItem(G.mesa.maos[G.myId]); });

test("pega, pica, cozinha, serve e entrega uma sopa só com o teclado", async ({ page }) => {
  test.setTimeout(300000);
  const erros = []; page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto("/cozinha/#debug");
  await page.locator("#hName").fill("Chef");
  await page.locator("#btnCreate").click();
  await expect(page.locator("#lobby")).toBeVisible();
  await page.locator("#btnStart").click();
  await page.waitForFunction(() => window.__cozinha?.G.mesa?.fase === "jogo", null, { timeout: 20000 });

  // o prato vai antes para um balcão perto do fogão
  await irAte(page, "escorredor"); await page.keyboard.press("Space");
  await expect.poll(() => mao(page)).toBe("Prato");
  await irAte(page, "balcao:perto"); await page.keyboard.press("Space");
  await expect.poll(() => mao(page)).toBe("");

  // cada cebola que a receita pede (no Overcooked, a sopa leva 3): da caixa para a tábua, picada, e na panela
  const cebolas = await page.evaluate(() => window.__cozinha.K.RECEITAS.sopa_cebola.itens.filter((k) => k.startsWith("cebola:")).length);
  for (let n = 0; n < cebolas; n++) {
    await irAte(page, "caixa"); await page.keyboard.press("Space");
    await expect.poll(() => mao(page)).toBe("Cebola");
    // o nome do item aparece em cima do cozinheiro
    expect(await page.evaluate(() => !!window.__cozinha.G.corpos.get(window.__cozinha.G.myId).rotulo)).toBe(true);
    await irAte(page, "tabua"); await page.keyboard.press("Space");
    await expect.poll(() => mao(page)).toBe("");
    await page.keyboard.down("KeyF");
    await expect.poll(() => page.evaluate(() => { const { G } = window.__cozinha, t = G.mapa.tiles.find((x) => x.tipo === "tabua"); return G.mesa.lugares[t.i][0]?.e; }), { timeout: 15000 }).toBe("picado");
    await page.keyboard.up("KeyF");
    await page.keyboard.press("Space");
    await expect.poll(() => mao(page)).toBe("Cebola picada");
    await irAte(page, n ? "fogao:cheio" : "fogao"); await page.keyboard.press("Space");
    await expect.poll(() => mao(page)).toBe("");
  }
  // espera a sopa na frente do fogão e tira a panela do fogo
  await expect.poll(() => page.evaluate(() => { const { G, K } = window.__cozinha; return G.mapa.tiles.some((x) => x.tipo === "fogao" && K.pronto(G.mesa.lugares[x.i][0])); }), { timeout: 30000 }).toBe(true);
  await irAte(page, "fogao:cheio"); await page.keyboard.press("Space");
  await expect.poll(() => mao(page)).toBe("Panela");
  // a sopa vai para o prato que estava esperando; a panela volta para o fogão e o prato vai para a entrega
  await irAte(page, "balcao:perto"); await page.keyboard.press("Space");
  await expect.poll(() => page.evaluate(() => { const { G, K } = window.__cozinha; return G.mesa.lugares.some(([o]) => o?.k === "prato" && K.nomeItem(o) === "Sopa de cebola"); })).toBe(true);
  await irAte(page, "fogao"); await page.keyboard.press("Space");
  await expect.poll(() => mao(page)).toBe("");
  await irAte(page, "balcao:perto"); await page.keyboard.press("Space");
  await expect.poll(() => mao(page)).toBe("Sopa de cebola");
  await irAte(page, "entrega"); await page.keyboard.press("Space");
  await expect.poll(() => page.evaluate(() => window.__cozinha.G.mesa.entregues)).toBe(1);
  expect(await page.evaluate(() => window.__cozinha.G.mesa.pontos)).toBeGreaterThan(0);
  expect(erros).toEqual([]);
  if (process.env.COZINHA_FOTO) await page.screenshot({ path: process.env.COZINHA_FOTO, fullPage: true });
});

test("o prato montando mostra o que tem e o que ainda falta da receita mais perto", async ({ page }) => {
  const erros = []; page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto("/cozinha/#debug");
  await page.locator("#hName").fill("Chef");
  await page.locator("#btnCreate").click();
  await expect(page.locator("#lobby")).toBeVisible();
  await page.evaluate(() => new Promise((r) => window.__cozinha.socket.emit("act", { type: "config", config: { cozinha: "1-3", robos: false } }, r)));
  await page.locator("#btnStart").click();
  await page.waitForFunction(() => window.__cozinha?.G.mesa?.fase === "jogo", null, { timeout: 20000 });
  // um prato só com pão no balcão: faltam a carne frita (hambúrguer); o cardápio não tem lanche só de pão
  const n = await page.evaluate(() => {
    const { G, socket } = window.__cozinha, ms = JSON.parse(JSON.stringify(G.mesa)), t = G.mapa.tiles.find((x) => x.tipo === "balcao" && !ms.lugares[x.i][0]);
    ms.lugares[t.i][0] = { k: "prato", c: [{ t: "pao", e: "cru" }] }; ms.v++;
    socket.listeners("mesa").forEach((f) => f(ms));
    const b = G.lugares[t.i].obj.children.find((c) => c.userData.bolinhas);
    return b ? b.children.map((s) => s.userData.falta) : null;
  });
  expect(n).toEqual([false, true]); // o pão que já está (cheio) e a carne frita que falta (tracejada)
  expect(erros).toEqual([]);
});
