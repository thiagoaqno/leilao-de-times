// Road to Champions: o tocador das cenas dubladas no navegador (road-dublagem.js), com os MP3 de verdade servidos pelo
// servidor. A campanha é montada pelo canal (Socket.io) até o capítulo 1, o dos eventos exclusivos dublados; a página
// entra com o token e a cena abre sozinha. RoadDublagem.diagnostico() diz o que está tocando e baixando.
const { test, expect } = require("@playwright/test");
const { io } = require("socket.io-client");

const pedir = (s, ev, d = {}) => new Promise((ok, erro) => s.emit(ev, d, (r) => (r && r.ok ? ok(r) : erro(new Error(ev + ": " + (r && r.error))))));
async function conectar(baseURL) {
  const s = io(baseURL + "/road-to-champions", { transports: ["websocket"], forceNew: true, reconnection: false });
  await new Promise((ok, erro) => { s.once("connect", ok); s.once("connect_error", erro); });
  return s;
}
// uma sala com estes protagonistas, já no capítulo 1 (cada um decidiu o capítulo 0 e o anfitrião jogou a jornada)
async function salaNoCapitulo1(baseURL, arqs) {
  const sockets = [], entradas = [];
  for (const [i, arq] of arqs.entries()) {
    const s = await conectar(baseURL);
    const r = i === 0 ? await pedir(s, "criar", { nome: "Amigo " + i, avatar: "Craque " + i, arquetipo: arq })
      : await pedir(s, "entrar", { nome: "Amigo " + i, avatar: "Craque " + i, arquetipo: arq, codigo: entradas[0].codigo });
    sockets.push(s); entradas.push({ codigo: r.codigo, token: r.token, avatar: "Craque " + i });
  }
  await pedir(sockets[0], "iniciar");
  for (const s of sockets) await pedir(s, "decidir", { opcao: 0, tatica: "equilibrado" });
  await pedir(sockets[0], "avancar");
  return { sockets, entradas, fechar: () => sockets.forEach((s) => s.close()) };
}
// abre a página como esse jogador (sem o jogo ao vivo da jornada 1 por cima) e espera a cena dublada
async function abrirCena(page, { codigo, token }) {
  await page.goto("/jogador/#debug");
  await page.evaluate(([c, t]) => {
    localStorage.setItem("rtc:codigo", c); localStorage.setItem("rtc:token", t);
    sessionStorage.setItem("rtc:aovivo:" + c + ":0", "1");
  }, [codigo, token]);
  await page.reload();
  await expect(page.locator(".rtc-voz")).toBeVisible();
  const play = page.locator('[data-voz="comecar"]');
  if (await play.isVisible()) await play.click(); // sem toque na página, o navegador pede o ▶
}
const diag = (page) => page.evaluate(() => RoadDublagem.diagnostico());
const tocandoAlgo = async (page, re) => expect.poll(async () => (await diag(page)).tocando.some((u) => re.test(u)), { timeout: 15000 }).toBe(true);

test("cena do banco: em ordem, uma voz por vez, para na escolha e toca só o ramo escolhido", async ({ page, baseURL }) => {
  const sala = await salaNoCapitulo1(baseURL, ["resiliente"]);
  try {
    await abrirCena(page, sala.entradas[0]);
    await expect(page.locator("#rtc-voz-titulo")).toHaveText("O banco de Ventura");
    await expect(page.locator(".rtc-voz-arte")).toHaveAttribute("src", "/jogador/popups/rtc-popup-banco.webp");
    await tocandoAlgo(page, /RES_VENTURA_001\.mp3$/);
    await expect(page.locator(".rtc-voz-quem")).toHaveText("Ventura");
    await expect(page.locator(".rtc-voz-legenda")).toHaveText("Senta. Quero conversar sobre domingo.");
    // o protagonista: o nome que o jogador deu, só legenda (sem voz fixa)
    await expect(page.locator(".rtc-voz-quem")).toHaveText("Craque 0", { timeout: 15000 });
    await expect(page.locator(".rtc-voz-legenda")).toHaveText("Eu vou jogar?");
    expect((await diag(page)).tocando).toEqual([]);
    // nunca duas vozes ao mesmo tempo, e a escolha só aparece no fim da introdução
    for (let i = 0; i < 40 && (await diag(page)).fase !== "escolha"; i++) {
      const d = await diag(page);
      expect(d.tocando.length).toBeLessThanOrEqual(1);
      await expect(page.locator(".rtc-voz-escolha")).toBeHidden();
      await page.waitForTimeout(700);
    }
    await expect(page.locator(".rtc-voz-escolha")).toBeVisible();
    await page.waitForTimeout(1500);
    expect((await diag(page)).tocando).toEqual([]); // parada esperando a decisão
    const intro = (await diag(page)).registro.map((x) => x.fala);
    expect(intro).toEqual(["RTC_A2_E03_RES_VENTURA_001", "RTC_A2_E03_RES_VENTURA_002", "RTC_A2_E03_RES_VENTURA_003", "RTC_A2_E03_RES_NANDO_001"]);
    expect((await diag(page)).registro.every((x) => x.tipo === "fim")).toBe(true);
    await page.locator(".rtc-voz-opcao", { hasText: "Aceitar e responder no treino" }).click();
    await tocandoAlgo(page, /RES_NANDO_002_B\.mp3$/);
    await expect(page.locator(".rtc-voz")).toBeHidden({ timeout: 15000 });
    const tocou = (await diag(page)).registro.map((x) => x.fala).slice(intro.length);
    expect(tocou).toEqual(["RTC_A2_E03_RES_NANDO_002_B"]); // nada dos ramos A e C
    // a resposta da cena vira a da entrevista: o pré-jogo vem travado nela e o servidor recebe as duas
    await expect(page.locator(".rtc-cena-resposta")).toContainText("Aceitar e responder no treino");
    await page.locator('[data-acao="decidir"]').click();
    await expect(page.locator(".rtc-cena")).toHaveCount(0);
    const st = (await pedir(sala.sockets[0], "retomar", sala.entradas[0])).estado;
    expect(st.voz.narrativa.res_reacao_banco).toBe("B");
    expect(st.jogadores[0].escolhas.at(-1)).toMatchObject({ eventoId: "banco", voz: "B" });
  } finally { sala.fechar(); }
});

test("pular fala corta o áudio na hora; pular cena vai até a escolha (que não se pula)", async ({ page, baseURL }) => {
  const sala = await salaNoCapitulo1(baseURL, ["imprevisivel"]);
  try {
    await abrirCena(page, sala.entradas[0]);
    await tocandoAlgo(page, /IMP_LEO_001\.mp3$/);
    await page.locator('[data-voz="fala"]').click();
    const d = await diag(page);
    expect(d.tocando.some((u) => /LEO_001/.test(u))).toBe(false);
    expect(d.baixando.some((u) => /LEO_001/.test(u))).toBe(false); // o download também foi cancelado
    await expect(page.locator(".rtc-voz-legenda")).toHaveText("Eu tava estudando estratégia.");
    expect(d.registro.at(-1)).toEqual({ tipo: "pulou", fala: "RTC_A1_E04_IMP_LEO_001" });
    await page.locator('[data-voz="cena"]').click();
    await expect(page.locator(".rtc-voz-escolha")).toBeVisible();
    expect((await diag(page)).tocando).toEqual([]);
    expect((await diag(page)).baixando).toEqual([]); // o pré-carregamento da próxima fala também
    await expect(page.locator('[data-voz="cena"]')).toBeHidden();
    // Esc na escolha não pula a decisão
    await page.keyboard.press("Escape");
    await expect(page.locator(".rtc-voz-escolha")).toBeVisible();
    // depois da escolha, pular cena encerra o ramo e cai no pré-jogo
    await page.locator(".rtc-voz-opcao", { hasText: "Assumir o atraso" }).click();
    await tocandoAlgo(page, /IMP_DUVAL_003_B\.mp3$/);
    await page.locator('[data-voz="cena"]').click();
    await expect(page.locator(".rtc-voz")).toBeHidden();
    expect((await diag(page)).tocando).toEqual([]);
    await expect(page.locator(".rtc-cena-resposta")).toContainText("Assumir o atraso");
  } finally { sala.fechar(); }
});

test("trocar de cena e parar não deixam áudio antigo tocando nem baixando", async ({ page, baseURL }) => {
  const sala = await salaNoCapitulo1(baseURL, ["resiliente"]);
  try {
    await abrirCena(page, sala.entradas[0]);
    await tocandoAlgo(page, /RES_VENTURA_001\.mp3$/);
    // outra cena por cima (como quando o capítulo muda): a anterior para na hora
    await page.evaluate(() => RoadDublagem.tocar({ tipo: "evento", id: "coletiva", opcoes: [], ctx: {}, protagonista: "Teste" }));
    await tocandoAlgo(page, /ENI_HELENA_001\.mp3$/);
    const d = await diag(page);
    expect(d.cena).toBe("RTC_A2_E05");
    expect(d.tocando.length).toBe(1);
    expect([...d.tocando, ...d.baixando].some((u) => /RES_/.test(u))).toBe(false);
    await page.evaluate(() => RoadDublagem.parar());
    const fim = await diag(page);
    expect(fim).toMatchObject({ aberta: false, tocando: [], baixando: [] });
    await expect(page.locator(".rtc-voz")).toBeHidden();
    // o pré-carregamento é de uma fala só: nunca a cena inteira
    await page.evaluate(() => RoadDublagem.tocar({ tipo: "evento", id: "protocolo", opcoes: [], ctx: {}, protagonista: "Teste" }));
    await tocandoAlgo(page, /MAQ_LAURA_001\.mp3$/);
    expect((await diag(page)).baixando.length).toBeLessThanOrEqual(2);
    // o callback toca só a variante que o servidor mandou, sem escolha
    await page.evaluate(() => RoadDublagem.tocar({ tipo: "callback", id: "pergunta-inconveniente", ramo: "B", ctx: { rom_festa: "breve", resultado_ultimo_jogo: "derrota" }, protagonista: "Teste" }));
    await tocandoAlgo(page, /ROM_REP_001_B\.mp3$/);
    await expect(page.locator(".rtc-voz-quem")).toHaveText("Repórter pós-jogo");
    await expect(page.locator(".rtc-voz")).toBeHidden({ timeout: 15000 });
    const reg = (await diag(page)).registro.filter((x) => /ROM_REP/.test(x.fala));
    expect(reg).toEqual([{ tipo: "fim", fala: "RTC_A3_E07_ROM_REP_001_B" }]);
  } finally { sala.fechar(); }
});

test("MP3 que falha ou não chega não trava a cena: segue com a legenda", async ({ page, baseURL }) => {
  const sala = await salaNoCapitulo1(baseURL, ["resiliente"]);
  try {
    await page.route("**/RTC_A2_E03_RES_VENTURA_001.mp3", (r) => r.abort());
    await page.route("**/RTC_A2_E03_RES_VENTURA_002.mp3", (r) => r.fulfill({ status: 404, body: "" }));
    await page.route("**/RTC_A2_E03_RES_VENTURA_003.mp3", () => {}); // conexão que nunca responde
    await abrirCena(page, sala.entradas[0]);
    // sem áudio, a fala aparece em legenda pelo tempo de leitura
    await expect(page.locator(".rtc-voz-legenda")).toHaveText("Senta. Quero conversar sobre domingo.");
    await expect(page.locator(".rtc-voz-escolha")).toBeVisible({ timeout: 45000 });
    const falhas = (await diag(page)).registro.filter((x) => x.tipo === "falha");
    expect(falhas.map((x) => x.fala)).toEqual(["RTC_A2_E03_RES_VENTURA_001", "RTC_A2_E03_RES_VENTURA_002", "RTC_A2_E03_RES_VENTURA_003"]);
    expect(falhas.at(-1).motivo).toBe("lento");
    // a fala que carregou tocou normalmente
    expect((await diag(page)).registro).toContainEqual({ tipo: "fim", fala: "RTC_A2_E03_RES_NANDO_001" });
  } finally { sala.fechar(); }
});

test("dois jogadores na mesma sala: cada um ouve a própria cena, e pular ou desligar a voz não mexe no outro", async ({ browser, baseURL }) => {
  const sala = await salaNoCapitulo1(baseURL, ["resiliente", "enigma"]);
  const ctxA = await browser.newContext(), ctxB = await browser.newContext();
  try {
    const a = await ctxA.newPage(), b = await ctxB.newPage();
    await abrirCena(a, sala.entradas[0]);
    await abrirCena(b, sala.entradas[1]);
    await tocandoAlgo(a, /RES_/);
    await tocandoAlgo(b, /ENI_/);
    expect((await diag(a)).cena).toBe("RTC_A2_E03");
    expect((await diag(b)).cena).toBe("RTC_A2_E05");
    let estados = 0;
    sala.sockets[1].on("estado", () => estados++);
    // A pula a cena e desliga a voz
    await a.locator('[data-voz="cena"]').click();
    await a.locator('[data-voz="som"]').click();
    await expect(a.locator(".rtc-voz-escolha")).toBeVisible();
    // B continua: a mesma cena, a fala andando, a voz ligada
    const t0 = await b.evaluate(() => [...document.querySelectorAll("audio")].length);
    expect(t0).toBe(0); // os <audio> não ficam no DOM
    const antes = (await diag(b)).registro.length;
    await expect.poll(async () => (await diag(b)).registro.length, { timeout: 20000 }).toBeGreaterThan(antes);
    const db = await diag(b);
    expect(db.aberta).toBe(true);
    expect(db.cena).toBe("RTC_A2_E05");
    expect(db.registro.every((x) => x.tipo === "fim")).toBe(true);
    expect(await b.evaluate(() => RoadDublagem.prefs.voz)).toBe(true);
    // e nada disso passou pelo servidor: nenhum estado novo para a sala
    expect(estados).toBe(0);
    const st = (await pedir(sala.sockets[0], "retomar", sala.entradas[0])).estado;
    expect(st.prontos).toBe(0);
    expect(st.capitulo).toBe(1);
  } finally { await ctxA.close(); await ctxB.close(); sala.fechar(); }
});

test("prelúdio do Prodígio: a escolha vai ao servidor antes do ramo tocar", async ({ page, baseURL }) => {
  const s = await conectar(baseURL);
  try {
    const r = await pedir(s, "criar", { nome: "Amigo", avatar: "Lamine", arquetipo: "prodigio" });
    await pedir(s, "iniciar");
    await page.goto("/jogador/#debug");
    await page.evaluate(([c, t]) => { localStorage.setItem("rtc:codigo", c); localStorage.setItem("rtc:token", t); }, [r.codigo, r.token]);
    await page.reload();
    await expect(page.locator("#rtc-voz-titulo")).toHaveText("Primeira noite");
    const play = page.locator('[data-voz="comecar"]');
    if (await play.isVisible()) await play.click();
    await expect(page.locator(".rtc-voz-quem")).toHaveText("Lamine");
    await page.locator('[data-voz="cena"]').click();
    await page.locator(".rtc-voz-opcao", { hasText: "Ficar em casa" }).click();
    await tocandoAlgo(page, /PRO_BIA_003_B\.mp3$/);
    const st = (await pedir(s, "retomar", { codigo: r.codigo, token: r.token })).estado;
    expect(st.voz.narrativa.pro_festa_marca).toBe(false);
    expect(st.voz.preludio).toBe(null);
    await page.locator('[data-voz="cena"]').click();
    // depois do prelúdio, a entrevista do capítulo (sem dublagem) abre normalmente
    await expect(page.locator(".rtc-cena h2")).toHaveText("A resposta inesperada");
  } finally { s.close(); }
});
