// Road to Champions no navegador: o momento do jogo (o protagonista decide no meio da partida), a tabela da fase de liga
// de 36 e o feed no jeito do Instagram, com as notícias dos outros protagonistas da sala.
const { test, expect } = require("@playwright/test");
const { io } = require("socket.io-client");

const pedir = (s, ev, d = {}) => new Promise((ok, erro) => s.emit(ev, d, (r) => (r && r.ok ? ok(r) : erro(new Error(ev + ": " + (r && r.error))))));
async function conectar(baseURL) {
  const s = io(baseURL + "/road-to-champions", { transports: ["websocket"], forceNew: true, reconnection: false });
  await new Promise((ok, erro) => { s.once("connect", ok); s.once("connect_error", erro); });
  return s;
}
async function entrar(page, { codigo, token }, aoVivo = false) {
  await page.goto("/jogador/#debug");
  await page.evaluate(([c, t, vivo]) => {
    localStorage.setItem("rtc:codigo", c); localStorage.setItem("rtc:token", t);
    if (!vivo) for (let r = 0; r < 4; r++) sessionStorage.setItem("rtc:aovivo:" + c + ":" + r, "1");
    sessionStorage.setItem("rtc:cena:" + c + ":0", "1"); // a entrevista da estreia já foi respondida pelo canal
  }, [codigo, token, aoVivo]);
  await page.reload();
}

test("o momento do jogo: o jogo ao vivo para no minuto, a decisão abre dentro da partida e o jogo segue depois", async ({ browser, baseURL }) => {
  test.setTimeout(240000);
  const A = await conectar(baseURL), B = await conectar(baseURL);
  const ctxA = await browser.newContext(), ctxB = await browser.newContext();
  try {
    const a = await pedir(A, "criar", { nome: "Thiago", avatar: "Vini", arquetipo: "resiliente" });
    const b = await pedir(B, "entrar", { nome: "Ana", avatar: "Erling", arquetipo: "maquina", codigo: a.codigo });
    await pedir(A, "iniciar");
    await pedir(A, "decidir", { opcao: 0, tatica: "equilibrado" });
    await pedir(B, "decidir", { opcao: 0, tatica: "equilibrado" });
    const pa = await ctxA.newPage(), pb = await ctxB.newPage();
    await entrar(pa, { codigo: a.codigo, token: a.token }, true);
    await entrar(pb, { codigo: a.codigo, token: b.token }, true);
    // a tabela da liga de 36 já aparece antes do primeiro jogo
    await pa.locator('.rtc-hub-aba[data-aba="tabela"]').click();
    await expect(pa.locator(".rtc-liga tbody tr:not(.pulo)")).toHaveCount(36);
    await pa.locator('.rtc-hub-aba[data-aba="central"]').click();
    await pedir(A, "avancar");
    // o jogo ao vivo abre na hora; a decisão ainda não (o jogo não chegou aos 25')
    for (const p of [pa, pb]) await expect(p.locator("#rtc-partida")).toBeVisible();
    await expect(pa.locator("#rtc-av-momento")).toBeHidden();
    await expect(pa.locator(".rtc-momento")).toHaveCount(0);
    // aos 25' o relógio para e cada um decide dentro da partida
    for (const p of [pa, pb]) {
      await expect(p.locator("#rtc-av-momento .rtc-mom-opcao").last()).toContainText("Manter o plano", { timeout: 40000 });
      await expect(p.locator("#rtc-av-relogio")).toHaveText("25' · parado");
    }
    const texto = await pa.locator("#rtc-av-momento .rtc-mom-opcao").first().locator("b").textContent();
    await pa.locator("#rtc-av-momento .rtc-mom-opcao").first().click();
    // A decidiu, mas a sala espera Erling: o relógio continua parado nos 25'
    await expect(pa.locator("#rtc-av-momento")).toContainText("Erling");
    await expect(pa.locator("#rtc-av-relogio")).toHaveText("25' · parado");
    await pb.locator("#rtc-av-momento .rtc-mom-opcao").last().click();
    // o jogo volta a andar e chega ao intervalo (o próximo momento)
    await expect(pa.locator("#rtc-av-relogio")).not.toHaveText("25' · parado");
    await expect(pa.locator("#rtc-av-momento")).toContainText("Intervalo", { timeout: 40000 });
    // os dois respondem até o fim (o "Ir para o fim" ao vivo só vai até o próximo momento)
    for (let k = 0; k < 40; k++) {
      for (const p of [pa, pb]) {
        const op = p.locator("#rtc-av-momento .rtc-mom-opcao").last();
        if (await op.isVisible().catch(() => false)) await op.click().catch(() => {});
        await p.locator('[data-acao-av="pular"]').click().catch(() => {});
      }
      const st = (await pedir(A, "retomar", { codigo: a.codigo, token: a.token })).estado;
      if (!st.jornada) break;
      await pa.waitForTimeout(500);
    }
    const st = (await pedir(A, "retomar", { codigo: a.codigo, token: a.token })).estado;
    expect(st.capitulo).toBe(1);
    expect(st.jornada).toBe(null);
    // a escolha está na narração do jogo e no feed
    const meu = st.jogos.find((j) => j.rodada === 0 && (j.casa === "real-madrid" || j.fora === "real-madrid"));
    const p = (await pedir(A, "partida", { id: meu.id })).partida;
    const frases = p.eventos.filter((e) => e.tipo === "momento").map((e) => e.texto);
    expect(frases.length).toBe(3);
    expect(frases[0].startsWith("Vini ")).toBe(true);
    expect(texto.length).toBeGreaterThan(5);
    // o feed: os posts de Erling aparecem para Vini, e o filtro mostra só os dele
    await pa.evaluate(() => { document.querySelector("#rtc-partida")?.remove(); });
    await pa.locator('.rtc-hub-aba[data-aba="diario"]').click();
    await expect(pa.locator(".rtc-ig-post").first()).toBeVisible();
    await expect(pa.locator(".rtc-ig-post", { hasText: "erling" }).first()).toBeVisible();
    const total = await pa.locator(".rtc-ig-post").count();
    await pa.locator(".rtc-ig-story", { hasText: "Erling" }).click();
    const soDele = await pa.locator(".rtc-ig-post").count();
    expect(soDele).toBeGreaterThan(0);
    expect(soDele).toBeLessThan(total);
    for (const h of await pa.locator(".rtc-ig-post header b").allTextContents()) expect(h.trim()).toBe("erling");
    // curtir é só deste navegador
    const coracao = pa.locator(".rtc-ig-post [data-curtir]").first();
    await coracao.click();
    await expect(pa.locator(".rtc-ig-post [data-curtir]").first()).toHaveAttribute("aria-pressed", "true");
  } finally { await ctxA.close(); await ctxB.close(); A.close(); B.close(); }
});

test("rodada sem entrevista: o pré-jogo muda só a estratégia e o anfitrião joga sem esperar", async ({ page, baseURL }) => {
  const A = await conectar(baseURL);
  try {
    const a = await pedir(A, "criar", { nome: "Thiago", avatar: "Kylian", arquetipo: "imprevisivel" });
    await pedir(A, "iniciar");
    await pedir(A, "decidir", { opcao: 0, tatica: "equilibrado" });
    await pedir(A, "avancar");
    for (let k = 0; k < 4; k++) await pedir(A, "momento", { opcao: "manter" }).catch(() => {});
    await entrar(page, { codigo: a.codigo, token: a.token });
    await expect(page.locator(".rtc-hub-status")).toContainText("RODADA 2/17");
    await page.locator('[data-acao="abrir-tatica"]').click();
    await page.locator('[data-tatica="recuar"]').click();
    await page.locator('[data-acao="salvar-tatica"]').click();
    await expect(page.locator(".rtc-cena")).toHaveCount(0);
    expect((await pedir(A, "retomar", { codigo: a.codigo, token: a.token })).estado.tatica).toBe("recuar");
    await expect(page.locator(".rtc-hub-jogar")).toContainText("Jogar: Rodada 2");
    await page.locator(".rtc-hub-jogar").click();
    // com o jogo ao vivo fechado, a decisão aparece na central quando o relógio chega nos 25'
    await expect(page.locator(".rtc-momento")).toBeVisible({ timeout: 40000 });
  } finally { A.close(); }
});
