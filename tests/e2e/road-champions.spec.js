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
async function entrar(page, { codigo, token }) {
  await page.goto("/jogador/#debug");
  await page.evaluate(([c, t]) => {
    localStorage.setItem("rtc:codigo", c); localStorage.setItem("rtc:token", t);
    for (let r = 0; r < 4; r++) sessionStorage.setItem("rtc:aovivo:" + c + ":" + r, "1");
    sessionStorage.setItem("rtc:cena:" + c + ":0", "1"); // a entrevista da estreia já foi respondida pelo canal
  }, [codigo, token]);
  await page.reload();
}

test("o momento do jogo: o painel abre no meio da partida, a escolha vai ao servidor e entra na narração e no feed", async ({ browser, baseURL }) => {
  const A = await conectar(baseURL), B = await conectar(baseURL);
  const ctxA = await browser.newContext(), ctxB = await browser.newContext();
  try {
    const a = await pedir(A, "criar", { nome: "Thiago", avatar: "Vini", arquetipo: "resiliente" });
    const b = await pedir(B, "entrar", { nome: "Ana", avatar: "Erling", arquetipo: "maquina", codigo: a.codigo });
    await pedir(A, "iniciar");
    await pedir(A, "decidir", { opcao: 0, tatica: "equilibrado" });
    await pedir(B, "decidir", { opcao: 0, tatica: "equilibrado" });
    const pa = await ctxA.newPage(), pb = await ctxB.newPage();
    await entrar(pa, { codigo: a.codigo, token: a.token });
    await entrar(pb, { codigo: a.codigo, token: b.token });
    // a tabela da liga de 36 já aparece antes do primeiro jogo
    await pa.locator('.rtc-hub-aba[data-aba="tabela"]').click();
    await expect(pa.locator(".rtc-liga tbody tr:not(.pulo)")).toHaveCount(36);
    await pa.locator('.rtc-hub-aba[data-aba="central"]').click();
    await pedir(A, "avancar");
    // cada um vê o próprio jogo parado aos 25'
    for (const [p, quem] of [[pa, "Vini"], [pb, "Erling"]]) {
      await expect(p.locator(".rtc-momento")).toBeVisible();
      await expect(p.locator("#rtc-mom-titulo")).toContainText(quem);
      await expect(p.locator(".rtc-mom-placar i")).toHaveText("25'");
      await expect(p.locator(".rtc-mom-opcao").last()).toContainText("Manter o plano");
    }
    // a escolha de A: o jogo dele segue até o intervalo; o de B continua esperando aos 25'
    const texto = await pa.locator(".rtc-mom-opcao").first().locator("b").textContent();
    await pa.locator(".rtc-mom-opcao").first().click();
    await expect(pa.locator(".rtc-mom-placar i")).toHaveText("Intervalo");
    await expect(pb.locator(".rtc-mom-placar i")).toHaveText("25'");
    await expect(pa.locator(".rtc-mom-sala")).toContainText("Erling");
    // os dois respondem até o fim
    for (let k = 0; k < 8; k++) {
      for (const p of [pa, pb]) {
        const op = p.locator(".rtc-mom-opcao").last();
        if (await op.isVisible().catch(() => false)) await op.click().catch(() => {});
      }
      if (!(await pa.locator(".rtc-momento").isVisible()) && !(await pb.locator(".rtc-momento").isVisible())) break;
      await pa.waitForTimeout(300);
    }
    await expect(pa.locator(".rtc-momento")).toHaveCount(0);
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
    await expect(page.locator(".rtc-momento")).toBeVisible();
  } finally { A.close(); }
});
