// Carreira: o som da partida (som-partida.js). A música de fundo para quando o jogo começa e volta na sede; o
// narrador emenda a fala, o clube e o jogador no gol; o botão Som troca entre tudo, só a torcida e sem som.
const { test, expect } = require("@playwright/test");
const semAvisos = (page) => page.addLocatorHandler(page.locator("dialog.popup-aviso[open]"), async (d) => { await d.locator("button.primario").first().click(); });

test.setTimeout(120000);

test("carreira: narrador, torcida e a música calada na partida", async ({ page }) => {
  const erros = [], sons = new Set();
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("response", (r) => { const m = r.url().match(/\/carreira\/som\/(.+\.mp3)$/); if (m && r.ok()) sons.add(m[1]); });
  semAvisos(page);
  await page.goto("/carreira/#debug");
  // a música: guarda as chamadas que a partida faz
  await page.evaluate(() => { window.__musica = []; for (const k of ["calar", "voltar"]) { const f = MusicaCarreira[k]; MusicaCarreira[k] = () => { __musica.push(k); f(); }; } });
  await page.fill("#cNome", "Som");
  await page.click('[data-clube="flamengo"]');
  await page.click("#btnCriar");
  await page.click("#btnAnotei");
  await page.evaluate(() => { modoEscolhido = 1; localStorage.removeItem("carreira:somPartida"); });
  await page.click("#btnJogar");
  await expect(page.locator("#partida")).toBeVisible();
  expect(await page.evaluate(() => __musica)).toContain("calar");
  // a torcida e o apito inicial
  await expect.poll(() => sons.has("torcida/ambiente-1.mp3"), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => SomPartida.historico.some((x) => /falas\/(inicio|classico|decisivo|final)-/.test(x))), { timeout: 15000 }).toBe(true);
  // um gol do Flamengo: o grito, o clube e o jogador
  const dito = await page.evaluate(() => {
    const t = __carreira.E.partida ? __carreira.E.partida.times[0].titulares : null;
    const autor = (t && t.find((id) => SOM_PARTIDA.jogadores[id])) || "flamengo-5";
    SomPartida.evento({ tipo: "gol", lado: 0, min: Math.floor(J.relogio), jogador: autor, como: "penalti", placar: [1, 0] });
    return { linha: SomPartida.historico.at(-1), nome: SOM_PARTIDA.jogadores[autor] };
  });
  expect(dito.linha).toMatch(/^falas\/gol-\d+\.mp3 \+ nomes\/clubes\/(flamengo|[a-z]+)\.mp3/);
  expect(dito.linha).toContain(dito.nome);
  expect(dito.linha).toContain("falas/gol_penalti-");
  await expect.poll(() => sons.has(dito.nome), { timeout: 10000 }).toBe(true);
  // o botão: só a torcida (o narrador cala), sem som, e de volta a tudo; a escolha fica guardada
  await expect(page.locator("#btnSom")).toHaveText("Som");
  await page.evaluate(() => $("btnSom").click());
  await expect(page.locator("#btnSom")).toHaveText("Torcida");
  const antes = await page.evaluate(() => SomPartida.historico.length);
  await page.evaluate(() => SomPartida.evento({ tipo: "defesa", lado: 0, min: Math.floor(J.relogio), jogador: "flamengo-5", goleiro: "palmeiras-1", como: "jogada" }));
  expect(await page.evaluate(() => SomPartida.historico.length)).toBe(antes);
  await page.evaluate(() => $("btnSom").click());
  await expect(page.locator("#btnSom")).toHaveText("Sem som");
  expect(await page.evaluate(() => localStorage.getItem("carreira:somPartida"))).toBe("mudo");
  await page.evaluate(() => $("btnSom").click());
  await expect(page.locator("#btnSom")).toHaveText("Som");
  // até o fim e de volta à sede: a música volta
  await page.evaluate(() => $("btnPular").click());
  await expect(page.locator("#btnVoltarSede")).toBeVisible({ timeout: 30000 });
  await page.click("#btnVoltarSede");
  expect(await page.evaluate(() => __musica.at(-1))).toBe("voltar");
  expect(erros).toEqual([]);
});
