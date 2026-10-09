// Carreira em grupo: entrar no meio da carreira pelo código da sala, as regras de compra por janela (para os clubes
// brasileiros não ficarem "roubados"), os artilheiros só de quem joga contra humanos e a sala que dura 48 horas.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const G = require("../carreira.js").grupo;
const { novaCarreira } = require("../carreira.js").paraTestes;
const ligarCarreiraOnline = require("../carreira-online.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

const jogadoresDe = (liga) => require(`../public/carreira/base/${liga}-2026.js`).clubes.flatMap((c) => c.jogadores.map((j) => ({ ...j, clube: c.id })));
const TODOS = ["inglaterra", "espanha", "italia", "alemanha", "franca"].flatMap(jogadoresDe);
// um jogador de outro clube com a nota nessa faixa (sem repetir os que já saíram)
const usados = new Set();
const jogador = (min, max) => { const j = TODOS.find((x) => x.nota >= min && x.nota <= max && !usados.has(x.id)); assert.ok(j, `sem jogador de ${min} a ${max}`); usados.add(j.id); return j; };
const comprar = (save, clube, j) => G.concluirLeilao(save, { jogador: j.id, dono: j.clube, comprador: clube, valor: 1e6 });
const grupo = (clubes = ["flamengo"], opcoes = {}) => G.novaCarreiraGrupo(clubes.map((c, i) => ({ clube: c, nome: `T${i}` })), { temporadas: 2, aporte: 0, ...opcoes });
// joga as primeiras rodadas da turma na hora (só o resultado)
function jogarRodadas(save, n) {
  for (let i = 0; i < n; i++) {
    const p = G.proximaRodadaGrupo(save); if (!p) return;
    G.comecarRodadaGrupo(save);
    for (const j of p.jogos) G.jogarNaHora(save, j);
    G.fecharRodadaGrupo(save);
  }
}
const faixa = (ok) => ok.map((v, n) => (v ? n : null)).filter((n) => n != null);

// as janelas pela quantidade de jogos da liga já feitos (a do começo até a rodada 4, a do meio das rodadas 17 a 21)
const fake = (n) => Array.from({ length: n }, (_, i) => `brasileirao-2026:liga:${i}:x:y`);
const naRodada = (save, clube, n) => { save.humanos[clube].estado.jogosJogados = fake(n); };
const regra = (save, clube = "flamengo") => G.regraDeCompras(G.vistaDe(save, clube));

test("em cada janela: 3 jogadores de até 80, ou 2 de até 82, ou 1 de até 85", () => {
  const save = grupo(), r0 = regra(save);
  assert.strictEqual(r0.tipo, "inicio");
  assert.deepStrictEqual(faixa(r0.ok), Array.from({ length: 86 }, (_, n) => n), "de 0 a 85 entra; 86 ou mais, não");
  assert.deepStrictEqual(r0.ainda, ["3 jogadores de até 80", "2 jogadores de até 82", "1 jogador de até 85"]);
  // um de 83 a 85 fecha a janela
  const um = grupo(); comprar(um, "flamengo", jogador(83, 85));
  assert.ok(regra(um).ok.every((x) => !x), "depois do de 85 não leva mais ninguém");
  assert.match(G.erroDeCompra(um, "flamengo", jogador(60, 80).id), /não entra nessa conta/);
  // dois de até 82: o segundo pode ser de 81 ou 82; o terceiro, não
  const dois = grupo(); comprar(dois, "flamengo", jogador(81, 82));
  const aposUm = regra(dois);
  assert.ok(aposUm.ok[82] && aposUm.ok[60] && !aposUm.ok[83] && !aposUm.ok[85], "com um de 82, só falta mais um de até 82");
  assert.deepStrictEqual(aposUm.ainda, ["1 jogador de até 82"]);
  comprar(dois, "flamengo", jogador(70, 82));
  assert.ok(regra(dois).ok.every((x) => !x), "dois de até 82 e acabou");
  // três de até 80
  const tres = grupo(); comprar(tres, "flamengo", jogador(60, 80)); comprar(tres, "flamengo", jogador(60, 80));
  const r = regra(tres);
  assert.ok(r.ok[80] && !r.ok[81] && !r.ok[85], "com dois de até 80, ainda cabe mais um de até 80");
  assert.deepStrictEqual(r.ainda, ["1 jogador de até 80"]);
  comprar(tres, "flamengo", jogador(60, 80));
  assert.ok(regra(tres).ok.every((x) => !x), "três de até 80 e acabou");
  // um de até 80 e depois o de 85 não combinam: o de 85 é a opção inteira
  const misto = grupo(); comprar(misto, "flamengo", jogador(60, 80));
  assert.match(G.erroDeCompra(misto, "flamengo", jogador(83, 85).id), /não entra nessa conta/);
  assert.strictEqual(G.erroDeCompra(misto, "flamengo", jogador(81, 82).id), null, "um de 80 e um de 82 cabem nos 2 de até 82");
});

test("a opção usada numa janela não vale na janela seguinte (inclusive do meio para o começo da temporada seguinte)", () => {
  const save = grupo();
  comprar(save, "flamengo", jogador(83, 85)); // o começo: 1 de 85
  naRodada(save, "flamengo", 17); // a janela do meio
  const meio = regra(save);
  assert.strictEqual(meio.tipo, "meio");
  assert.strictEqual(meio.proibida, "85");
  assert.ok(!meio.ok[83] && !meio.ok[85] && meio.ok[82] && meio.ok[60], "no meio: 3 de até 80 ou 2 de até 82");
  assert.deepStrictEqual(meio.ainda, ["3 jogadores de até 80", "2 jogadores de até 82"]);
  assert.match(meio.texto, /não vale a de 1 jogador de até 85/);
  comprar(save, "flamengo", jogador(70, 78)); // um de até 80 sozinho gasta a opção mais baixa: a de 80
  // a temporada seguinte: o começo proíbe a opção usada no meio (a de 80), e o de 85 volta a valer
  save.temporada = 2; naRodada(save, "flamengo", 0);
  const comeco = regra(save);
  assert.strictEqual(comeco.tipo, "inicio");
  assert.strictEqual(comeco.proibida, "80");
  assert.ok(comeco.ok[85] && comeco.ok[82], "volta a valer o de 85");
  assert.deepStrictEqual(comeco.ainda, ["2 jogadores de até 82", "1 jogador de até 85"]);
  // quem não compra nada numa janela não proíbe nada na seguinte
  naRodada(save, "flamengo", 17);
  assert.strictEqual(regra(save).proibida, "", "o começo da temporada 2 ficou sem compra: o meio vale inteiro");
});

test("os campeões ganham prêmios na janela do começo: Libertadores 1 de até 85, Sul-Americana 1 de até 83, Brasileirão 1 de até 82", () => {
  const save = grupo(["flamengo", "palmeiras"]);
  // a temporada anterior (o arquivo): o Flamengo levou a Libertadores e o Brasileirão; o Palmeiras, a Sul-Americana
  save.arquivo = [{ temporada: 0, competicoes: { libertadores: { campeao: "flamengo" }, "brasileirao-2026": { campeao: "flamengo" }, sulamericana: { campeao: "palmeiras" } } }];
  const r = regra(save);
  assert.deepStrictEqual(r.premios.map((p) => [p.nome, p.max]), [["Libertadores", 85], ["Brasileirão", 82]]);
  assert.match(r.texto, /Prêmio de campeão nesta janela/);
  // a opção da janela (1 de 85) e os dois prêmios (85 e 82): três jogadores, em qualquer ordem
  comprar(save, "flamengo", jogador(78, 80)); comprar(save, "flamengo", jogador(81, 82));
  assert.strictEqual(G.erroDeCompra(save, "flamengo", jogador(83, 85).id), null, "o de 85 entra (na opção ou no prêmio)");
  comprar(save, "flamengo", jogador(83, 85));
  assert.strictEqual(G.erroDeCompra(save, "flamengo", jogador(60, 80).id), null, "ainda cabe: 2 de até 80 na opção e os prêmios com o 82 e o 85");
  comprar(save, "flamengo", jogador(60, 80));
  const quase = regra(save);
  assert.ok(quase.ok[80] && !quase.ok[81], "ainda cabe o terceiro de até 80 (os prêmios ficaram com o 85 e o 82)");
  comprar(save, "flamengo", jogador(60, 80));
  assert.ok(regra(save).ok.every((x) => !x), "opção e prêmios usados: 5 jogadores");
  const pal = G.regraDeCompras(G.vistaDe(save, "palmeiras"));
  assert.deepStrictEqual(pal.premios.map((p) => [p.nome, p.max]), [["Sul-Americana", 83]]);
  // o prêmio é só da janela do começo
  naRodada(save, "palmeiras", 17);
  assert.deepStrictEqual(G.regraDeCompras(G.vistaDe(save, "palmeiras")).premios, []);
  // quem usou o prêmio para o de 85 não gasta a opção da janela: nada fica proibido no meio
  const outro = grupo(); outro.arquivo = [{ temporada: 0, competicoes: { libertadores: { campeao: "flamengo" } } }];
  comprar(outro, "flamengo", jogador(83, 85));
  naRodada(outro, "flamengo", 17);
  assert.strictEqual(regra(outro).proibida, "", "o de 85 foi o prêmio");
});

test("o lance respeita a regra de quem dá o lance, e cada técnico tem a sua cota", () => {
  const save = grupo(["flamengo", "liverpool"]);
  comprar(save, "flamengo", jogador(83, 85));
  const leilao = { jogador: jogador(70, 80).id, dono: "arsenal", lances: [], minimo: 1e6, teto: null };
  assert.match(G.erroDoLance(save, "flamengo", leilao, 2e6), /não entra nessa conta/, "o Flamengo já usou a cota");
  assert.strictEqual(G.erroDoLance(save, "liverpool", leilao, 2e6), null, "o Liverpool ainda tem a dele");
  assert.match(G.infoLeilao(save, "flamengo", jogador(70, 80).id), /não entra nessa conta/, "nem abre um leilão que não pode levar");
  assert.match(G.infoLeilao(save, "liverpool", jogador(86, 99).id), /não entra nessa conta/, "ninguém leva jogador de 86 ou mais pelo leilão");
});

test("fora da janela a regra não vale e o leilão não abre", () => {
  const save = grupo();
  naRodada(save, "flamengo", 8); // janela fechada
  assert.strictEqual(regra(save).tipo, null);
  assert.match(G.infoLeilao(save, "flamengo", jogador(60, 80).id), /fechada/);
});

test("entrar no meio da carreira: assume o clube no ponto em que o mundo está, com o caixa dele e a entrada", () => {
  const save = grupo(["flamengo"], { aporte: 250e6 });
  jogarRodadas(save, 9); // passa da janela do começo (4 jogos de liga)
  const proxima = G.proximaRodadaGrupo(save), caixaDele = save.caixaIA.palmeiras;
  assert.ok(proxima && caixaDele > 0);
  assert.match(G.entrarNaCarreira(save, { clube: "flamengo", nome: "X" }), /já é de outro técnico/);
  assert.match(G.entrarNaCarreira(save, { clube: "naoexiste", nome: "X" }), /não existe/);
  assert.strictEqual(G.entrarNaCarreira(save, { clube: "palmeiras", nome: "Beto" }, { aporte: 250e6 }), null);
  assert.ok(!("palmeiras" in save.caixaIA), "o clube saiu da lista do computador");
  const v = G.vistaDe(save, "palmeiras"), e = G.estado(v);
  const dele = require("../public/carreira/temporada.js").jogosDoClube({ jogos: save.calendarioMundo }, "palmeiras");
  assert.deepStrictEqual(v.jogosJogados, dele.filter((j) => j.semana < proxima.semana).map((j) => j.id), "os jogos que o clube já fez contam como jogados");
  assert.strictEqual(v.rodada, v.jogosJogados.length);
  assert.strictEqual(v.caixa, caixaDele + 250e6, "o caixa é o que o clube tinha, mais o aporte da sala");
  assert.strictEqual(v.tecnico.nome, "Beto");
  // a janela está fechada, mas ele tem a janela de entrada (as mesmas opções)
  assert.strictEqual(e.janela.aberta, false);
  const r = G.regraDeCompras(v);
  assert.strictEqual(r.tipo, "entrada");
  assert.ok(r.ok[85] && !r.ok[86]);
  assert.deepStrictEqual(r.ainda, ["3 jogadores de até 80", "2 jogadores de até 82", "1 jogador de até 85"]);
  assert.strictEqual(G.infoLeilao(save, "palmeiras", jogador(60, 80).id).tipo, "cpu", "o leilão abre com a entrada");
  comprar(save, "palmeiras", jogador(83, 85));
  assert.ok(G.regraDeCompras(G.vistaDe(save, "palmeiras")).ok.every((x) => !x), "a entrada é uma janela só");
  // entrou antes do meio: a entrada acaba quando a janela do meio abre, e o de 85 usado na entrada fica proibido no meio
  assert.strictEqual(G.vistaDe(save, "palmeiras").entrada.antesDoMeio, true);
  naRodada(save, "palmeiras", 17);
  const meio = G.regraDeCompras(G.vistaDe(save, "palmeiras"));
  assert.strictEqual(meio.tipo, "meio"); assert.strictEqual(meio.proibida, "85");
  naRodada(save, "palmeiras", 22);
  assert.strictEqual(G.regraDeCompras(G.vistaDe(save, "palmeiras")).tipo, null, "depois do meio a entrada não volta");
  save.humanos.palmeiras.estado.jogosJogados = v.jogosJogados; // os jogos de verdade de volta
  // e entra na rodada seguinte
  const seguinte = G.proximaRodadaGrupo(save);
  assert.ok(seguinte.jogos.some((j) => j.casa === "palmeiras" || j.fora === "palmeiras") || seguinte.semana > proxima.semana, "o jogo dele entra na rodada da semana dele");
  jogarRodadas(save, 2);
  assert.ok(G.vistaDe(save, "palmeiras").jogosJogados.length >= v.jogosJogados.length);
});

test("entrar com a janela aberta (começo da temporada) vale a regra normal da janela, sem entrada", () => {
  const save = grupo(["flamengo"]);
  assert.strictEqual(G.entrarNaCarreira(save, { clube: "santos", nome: "Cris" }), null);
  const v = G.vistaDe(save, "santos");
  assert.strictEqual(v.entrada, null);
  assert.strictEqual(G.regraDeCompras(v).tipo, "inicio");
  assert.strictEqual(v.jogosJogados.length, 0);
});

test("jogos ao vivo: com o mata-mata e com o nome de quem fez o gol", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  assert.ok(G.paralelosDaSemana(save, 10).length > 0, "a semana das oitavas de ida da Copa do Brasil aparece");
  assert.ok(G.paralelosDaSemana(save, 1).every((x) => x.gols.every((g) => typeof g.jogador === "string")), "quem fez o gol vai junto");
});

test("a sala em grupo só expira depois de 48 horas", () => {
  assert.strictEqual(ligarCarreiraOnline.HORAS_PARADA, 48);
});

// ---------- pelo canal de verdade ----------
let srv;
test.before(async () => { srv = await subirServidor({ CARREIRA_VEL: "6", CARREIRA_DECISAO_MS: "1500", CARREIRA_LANCE_MS: "700", CARREIRA_ESPERA_MS: "0" }); });
test.after(async () => { await srv.parar(); });
const canal = () => conectar(srv.url, "/carreira-online");
const agir = (s, d) => pedir(s, "act", d);

test("outra pessoa entra pelo código com a carreira rolando e assume um clube livre (não com a rodada rolando)", async () => {
  const a = await canal(), b = await canal(), c = await canal(), espectador = await canal();
  const sala = await pedir(a, "create", { name: "Ana" });
  await pedir(b, "join", { code: sala.code, name: "Beto" });
  await agir(a, { type: "opcoes", aporte: 0 });
  await agir(a, { type: "clube", clube: "flamengo" }); await agir(b, { type: "clube", clube: "liverpool" });
  await agir(a, { type: "comecar" });
  await esperarEstado(a, (s) => s.fase === "carreira");
  // a rodada rolando: entrar na sala dá, mas escolher o clube espera a rodada acabar
  await pedir(a, "modo", { modo: 1 });
  await agir(a, { type: "rodada" });
  const entrou = await pedir(c, "join", { code: sala.code, name: "Caio" });
  assert.ok(entrou.id, "dá para entrar na sala com a carreira já começada");
  const st = await esperarEstado(a, (s) => s.players.length === 3);
  assert.ok(st.caixas && st.caixas.palmeiras > 0, "quem escolhe vê o caixa dos clubes livres");
  await assert.rejects(agir(c, { type: "clube", clube: "palmeiras" }), /rodada rolando/);
  await assert.rejects(agir(c, { type: "clube", clube: "flamengo" }), /já é do Ana/);
  await assert.rejects(agir(c, { type: "clube", clube: "naoexiste" }), /não está nas ligas/);
  await esperarEstado(a, (s) => !s.rodada && s.ultimaRodada && s.ultimaRodada.n === 1, 30000);
  // quem só assiste não mexe
  await pedir(espectador, "join", { code: sala.code, watch: true });
  await assert.rejects(agir(espectador, { type: "clube", clube: "palmeiras" }), /assiste/);
  // entre as rodadas: entra
  await agir(c, { type: "clube", clube: "palmeiras" });
  const depois = await esperarEstado(a, (s) => s.players.some((p) => p.name === "Caio" && p.clube === "palmeiras"));
  assert.strictEqual(depois.ocupados.palmeiras !== undefined, true);
  const meu = (await pedir(c, "entrar")).estado;
  assert.strictEqual(meu.clube, "palmeiras");
  assert.ok(meu.regraCompras && ["inicio", "meio", "entrada", null].includes(meu.regraCompras.tipo));
  await assert.rejects(agir(c, { type: "clube", clube: "santos" }), /já tem um clube/);
  // a próxima rodada já tem o jogo dele
  await pedir(c, "modo", { modo: 1 });
  await agir(a, { type: "rodada" });
  const andando = await esperarEstado(a, (s) => s.rodada && s.rodada.n === 2);
  assert.ok(andando.rodada.jogos.some((j) => j.casa === "palmeiras" || j.fora === "palmeiras"), "o novo técnico joga a rodada com a turma");
  await esperarEstado(a, (s) => !s.rodada && s.ultimaRodada && s.ultimaRodada.n === 2, 40000);
  for (const s of [a, b, c, espectador]) s.close();
});
