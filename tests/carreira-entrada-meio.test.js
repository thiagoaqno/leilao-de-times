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

test("começo da temporada: 1 de 90+, ou 2 de até 87, ou 3 de até 83", () => {
  const save = grupo(), v = () => G.vistaDe(save, "flamengo");
  const r0 = G.regraDeCompras(v());
  assert.strictEqual(r0.tipo, "inicio");
  assert.ok(r0.ok[90] && r0.ok[95] && r0.ok[87] && r0.ok[83] && r0.ok[60], "90+ ou até 87 entram na conta");
  assert.ok(!r0.ok[88] && !r0.ok[89], "88 e 89 não cabem em nenhum pacote do começo");
  // um de 90+ fecha a cota
  const astro = jogador(90, 99);
  assert.strictEqual(G.erroDeCompra(save, "flamengo", astro.id), null);
  comprar(save, "flamengo", astro);
  const depois = G.regraDeCompras(v());
  assert.deepStrictEqual(depois.usadas, [astro.nota]);
  assert.ok(depois.ok.every((x) => !x), "depois do 90+ não leva mais ninguém");
  assert.match(G.erroDeCompra(save, "flamengo", jogador(70, 80).id), /não entra nessa conta/);
});

test("começo da temporada: dois de até 87 fecham; três de até 83 cabem; o 90+ depois de um menor não cabe", () => {
  const dois = grupo(), um = jogador(84, 87), dois2 = jogador(60, 87);
  comprar(dois, "flamengo", um); comprar(dois, "flamengo", dois2);
  assert.ok(G.regraDeCompras(G.vistaDe(dois, "flamengo")).ok.every((x) => !x), "dois de até 87 e acabou");
  const tres = grupo(), a = jogador(60, 83), b = jogador(60, 83), c = jogador(60, 83);
  comprar(tres, "flamengo", a); comprar(tres, "flamengo", b);
  const r = G.regraDeCompras(G.vistaDe(tres, "flamengo"));
  assert.ok(r.ok[83] && r.ok[60] && !r.ok[84] && !r.ok[90], "com dois de até 83, só falta mais um de até 83");
  assert.deepStrictEqual(r.ainda, ["1 jogador de até 83"]);
  assert.strictEqual(G.erroDeCompra(tres, "flamengo", c.id), null);
  comprar(tres, "flamengo", c);
  assert.ok(G.regraDeCompras(G.vistaDe(tres, "flamengo")).ok.every((x) => !x), "três de até 83 e acabou");
  const misto = grupo(), pequeno = jogador(60, 83);
  comprar(misto, "flamengo", pequeno);
  assert.match(G.erroDeCompra(misto, "flamengo", jogador(90, 99).id), /não entra nessa conta/, "um de 90+ depois de um menor não cabe: o 90+ é o pacote inteiro");
});

test("o lance respeita a regra de quem dá o lance, e cada técnico tem a sua cota", () => {
  const save = grupo(["flamengo", "liverpool"]), astro = jogador(90, 99);
  comprar(save, "flamengo", astro);
  const leilao = { jogador: jogador(70, 80).id, dono: "arsenal", lances: [], minimo: 1e6, teto: null };
  assert.match(G.erroDoLance(save, "flamengo", leilao, 2e6), /não entra nessa conta/, "o Flamengo já usou a cota");
  assert.strictEqual(G.erroDoLance(save, "liverpool", leilao, 2e6), null, "o Liverpool ainda tem a dele");
  assert.match(G.infoLeilao(save, "flamengo", jogador(70, 80).id), /não entra nessa conta/, "nem abre um leilão que não pode levar");
});

test("meio da temporada: 1 jogador de até 88; fora da janela a regra não vale e o leilão não abre", () => {
  const save = grupo(), fake = (n) => Array.from({ length: n }, (_, i) => `brasileirao-2026:liga:${i}:x:y`);
  save.humanos.flamengo.estado.jogosJogados = fake(17); // 17 jogos da liga: a janela do meio (rodadas 17 a 21)
  const r = G.regraDeCompras(G.vistaDe(save, "flamengo"));
  assert.strictEqual(r.tipo, "meio");
  assert.ok(r.ok[88] && r.ok[60] && !r.ok[89] && !r.ok[90]);
  comprar(save, "flamengo", jogador(85, 88));
  assert.ok(G.regraDeCompras(G.vistaDe(save, "flamengo")).ok.every((x) => !x), "só um jogador no meio da temporada");
  save.humanos.flamengo.estado.jogosJogados = fake(8); // janela fechada
  assert.strictEqual(G.regraDeCompras(G.vistaDe(save, "flamengo")).tipo, null);
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
  // a janela está fechada, mas ele tem a entrada: 1 jogador de até 88
  assert.strictEqual(e.janela.aberta, false);
  const r = G.regraDeCompras(v);
  assert.strictEqual(r.tipo, "entrada");
  assert.ok(r.ok[88] && !r.ok[89]);
  assert.strictEqual(G.infoLeilao(save, "palmeiras", jogador(60, 80).id).tipo, "cpu", "o leilão abre com a entrada");
  comprar(save, "palmeiras", jogador(80, 88));
  assert.ok(G.regraDeCompras(G.vistaDe(save, "palmeiras")).ok.every((x) => !x), "a entrada é uma só");
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

test("artilharia: só entram gols de jogos com humano (os jogos só do computador não contam)", () => {
  const save = grupo(["flamengo", "liverpool"]);
  jogarRodadas(save, 3);
  const jogados = Object.keys(save.resultadosFixos).flatMap((id) => id.split(":").slice(-2)); // casa e fora de cada jogo de humano
  const v = G.vistaDe(save, "flamengo"), clubes = new Set(jogados);
  const artilheiros = Object.keys(save.gols);
  assert.ok(artilheiros.length > 0);
  for (const pid of artilheiros) assert.ok(clubes.has(G.donoDe(v, pid)), `${pid} marcou sem jogar contra (ou por) um humano`);
  assert.ok(G.estado(v).artilharia.every((a) => clubes.has(G.donoDe(v, a.id))));
});

test("jogos ao vivo: sem mata-mata (as chaves não aparecem) e sem o nome de quem fez o gol", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  const semana10 = G.paralelosDaSemana(save, 10); // a semana das oitavas de ida da Copa do Brasil: só mata-mata
  assert.deepStrictEqual(semana10, [], "só jogos de mata-mata: nada aparece");
  const semana8 = G.paralelosDaSemana(save, 8); // fase de grupos
  assert.ok(semana8.length > 0 && semana8.every((x) => !save.calendarioMundo.find((j) => j.id === x.id).mataMata));
  const semana1 = G.paralelosDaSemana(save, 1);
  assert.ok(semana1.every((x) => x.gols.every((g) => g.jogador === undefined)), "o artilheiro da máquina não vai para a tela");
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
