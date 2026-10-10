// Carreira de Treinador: os clássicos de verdade (public/carreira/rivais.js), o peso de cada jogo (final, semifinal, jogo do
// título, clássico e o duelo entre técnicos da sala) e a estante de troféus da galera (bd.estante, guardada pela temporada).
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Rivais = require("../public/carreira/rivais.js");
const Clube = require("../carreira-clube.js");
const bd = require("../bd.js");
const Carreira = require("../carreira.js");
const { novaCarreira, completar, ajudas } = Carreira.paraTestes;
const G = Carreira.grupo;

const LIGAS = ["brasileirao", "serieb", "argentina", "inglaterra", "espanha", "italia", "alemanha", "franca", "sulamericanos"];
const IDS = new Set(LIGAS.flatMap((l) => require(`../public/carreira/base/${l}-2026.js`).clubes.map((c) => c.id)));

test("clássicos: todo clube da tabela existe na base e cada dupla aparece uma vez", () => {
  const duplas = new Set();
  for (const [a, b, nome, peso] of Rivais.CLASSICOS) {
    assert.ok(IDS.has(a) && IDS.has(b), `${nome}: ${a} × ${b}`);
    assert.ok(peso >= 1 && peso <= 3);
    const k = [a, b].sort().join("|"); assert.ok(!duplas.has(k), `repetido: ${k}`); duplas.add(k);
  }
  assert.strictEqual(Rivais.classico("fluminense", "flamengo").nome, "Fla-Flu", "vale nos dois sentidos");
  assert.strictEqual(Rivais.classico("gremio", "internacional").nome, "Gre-Nal");
  assert.strictEqual(Rivais.classico("flamengo", "palmeiras"), null);
  assert.deepStrictEqual(Rivais.rivaisReais("flamengo").map((r) => r.id).slice(0, 2).sort(), ["fluminense", "vasco"], "os maiores primeiro");
});

test("rivais: o clube pega os clássicos de verdade; sem nenhum na tabela, o rival de tamanho parecido da liga", () => {
  const v = completar(novaCarreira("Teste", "flamengo", "", 1));
  const rivais = Clube.rivaisDe(v, ajudas);
  for (const id of ["fluminense", "vasco", "botafogo"]) assert.ok(rivais.includes(id), id);
  assert.ok(Clube.classicoCom(v, ajudas, "fluminense"));
  assert.ok(!Clube.classicoCom(v, ajudas, "palmeiras"));
  const semClassico = completar(novaCarreira("Teste", "mirassol", "", 1));
  const r = Clube.rivaisDe(semClassico, ajudas);
  assert.strictEqual(r.length, 1, "um rival de reserva");
  assert.strictEqual(Clube.classicosDe(semClassico, ajudas)[0].nome, "Clássico");
});

test("rivais na sala: todo jogo entre técnicos é clássico, mesmo sem rivalidade de verdade", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "mirassol", nome: "Bia" }], { temporadas: 1 });
  const v = G.vistaDe(save, "flamengo");
  assert.ok(Clube.classicoCom(v, ajudas, "mirassol"));
  assert.strictEqual(Clube.nomeDoClassico(v, "mirassol"), "Clássico da turma");
  assert.strictEqual(Clube.nomeDoClassico(v, "fluminense"), "Fla-Flu");
});

test("peso do jogo: final, semifinal, jogo do título, clássico e duelo da turma", () => {
  const p = (j, o) => Rivais.pesoDoJogo({ nomeComp: "Libertadores", ...j }, o);
  assert.strictEqual(p({ casa: "flamengo", fora: "palmeiras" }), null, "jogo comum");
  assert.deepStrictEqual(pick(p({ casa: "flamengo", fora: "fluminense" })), { tema: "classico", nome: "Fla-Flu", selos: [] });
  assert.deepStrictEqual(pick(p({ casa: "flamengo", fora: "palmeiras" }, { humanos: ["flamengo", "palmeiras"] })), { tema: "classico", nome: "Clássico da turma", selos: [] });
  assert.deepStrictEqual(pick(p({ casa: "flamengo", fora: "fluminense", fase: "final" }, { humanos: ["flamengo", "fluminense"] })), { tema: "final", nome: "Libertadores", selos: ["Clássico da turma", "Fla-Flu"] });
  assert.strictEqual(p({ casa: "flamengo", fora: "palmeiras", fase: "semifinal" }).tema, "decisivo");
  assert.strictEqual(p({ casa: "flamengo", fora: "palmeiras" }, { titulo: true }).titulo, "Jogo do título");
});
const pick = (x) => ({ tema: x.tema, nome: x.nome, selos: x.selos });

test("jogo do título: só na reta final e com o clube brigando pelo topo", () => {
  const tab = [{ id: "a", p: 70 }, { id: "b", p: 68 }, { id: "c", p: 60 }];
  assert.ok(Rivais.decideTitulo(tab, "a", 3), "líder com o 2º colado");
  assert.ok(Rivais.decideTitulo(tab, "b", 2), "a 2 pontos do líder");
  assert.ok(!Rivais.decideTitulo(tab, "c", 3), "longe do líder");
  assert.ok(!Rivais.decideTitulo(tab, "a", 6), "ainda falta muito");
  assert.ok(!Rivais.decideTitulo([{ id: "a", p: 70 }, { id: "b", p: 60 }], "a", 2), "o título já está decidido");
});

test("estante: guarda cada conquista uma vez e monta o ranking pelo nome do técnico (sem diferenciar acento e maiúscula)", () => {
  bd.fechar(); bd.abrir(":memory:");
  const c = (o) => ({ carreira: "x1", modo: "solo", tecnico: "João", clube: "flamengo", competicao: "libertadores", nome: "Libertadores", colocacao: 1, pontos: 8, ano: 2026, temporada: 1, ...o });
  assert.strictEqual(bd.guardarConquistas([c(), c()]), 1, "a mesma conquista não entra duas vezes");
  bd.guardarConquistas([c({ carreira: "x2", tecnico: "joao ", competicao: "brasileirao-2026", nome: "Brasileirão", pontos: 10 }), c({ carreira: "x3", modo: "grupo", tecnico: "Bia", clube: "palmeiras", colocacao: 2, pontos: 4 })]);
  const e = bd.estante();
  assert.strictEqual(e.ranking[0].chave, "joao");
  assert.strictEqual(e.ranking[0].pontos, 18);
  assert.strictEqual(e.ranking[0].titulos, 2);
  assert.strictEqual(e.ranking[0].carreiras, 2);
  assert.strictEqual(e.ranking[0].clube, "flamengo");
  assert.strictEqual(e.ranking[1].vices, 1);
  assert.strictEqual(e.total, 2);
  assert.strictEqual(e.ultimas[0].competicao, "brasileirao-2026", "a mais nova primeiro");
});

test("estante: a temporada que acaba manda os títulos e os vices do técnico para a estante", () => {
  bd.fechar(); bd.abrir(":memory:");
  const { proximoJogoMundo, simularMinha, sementeDoJogo, fecharRodada } = Carreira.paraTestes;
  const save = completar(novaCarreira("Zé Estante", "flamengo", "", 2));
  for (let jogo; (jogo = proximoJogoMundo(save));) {
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    fecharRodada(save, simularMinha(save));
  }
  completar(save);
  const a = save.arquivo.at(-1); assert.ok(a, "a temporada foi arquivada");
  const minhas = Object.values(a.competicoes).filter((c) => c.campeao === "flamengo" || c.vice === "flamengo").length;
  const linhas = bd.abrir().prepare("SELECT * FROM estante WHERE carreira = ?").all(save.semente);
  assert.strictEqual(linhas.length, minhas);
  for (const l of linhas) assert.strictEqual(l.chave, "ze estante");
});
