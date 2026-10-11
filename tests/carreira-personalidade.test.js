// Personalidade dos jogadores: o jeito de cada um (público e estável), o líder e o pavio curto em campo e os eventos de cada tipo.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Motor = require("../public/carreira/motor.js");
const Personalidade = require("../public/carreira/personalidade.js");
const Eventos = require("../carreira-eventos.js");
const { PERSONALIDADES } = require("../carreira-personalidades.js");
const { novaCarreira, ajudas, timeDe, fecharRodada } = require("../carreira.js").paraTestes;

const clone = (o) => JSON.parse(JSON.stringify(o));
function jogar(save, n) {
  for (let i = 0; i < n; i++) {
    const [casa, fora] = save.calendario[save.rodada].find((m) => m.includes(save.clube));
    save.partida = { rodada: save.rodada, casa, fora, modo: 1, semente: `p:${save.rodada}`, decisoes: {} };
    fecharRodada(save, Motor.simularPartida({ casa: timeDe(save, casa), fora: timeDe(save, fora), semente: `p:${save.rodada}` }));
  }
}

test("o jeito de cada jogador é fixo, existe para todos e varia com a posição", () => {
  const cont = {};
  for (let i = 0; i < 3000; i++) { const j = { id: `j${i}`, pos: ["GOL", "ZAG", "MC", "ATA"][i % 4] }; const t = Personalidade.tipoDe(j); assert.equal(t, Personalidade.tipoDe({ ...j })); cont[t] = (cont[t] || 0) + 1; }
  assert.deepEqual(Object.keys(cont).sort(), [...Personalidade.IDS].sort());
  for (const n of Object.values(cont)) assert.ok(n > 150, "nenhum tipo some");
  const frac = (pos, tipo) => Array.from({ length: 2000 }, (_, i) => Personalidade.tipoDe({ id: `${pos}${i}`, pos })).filter((t) => t === tipo).length / 2000;
  assert.ok(frac("ATA", "vaidoso") > frac("GOL", "vaidoso") * 2, "atacante é mais vaidoso que goleiro");
  assert.ok(Personalidade.de({ id: "a", pos: "ATA" }).texto);
});

test("o líder segura o time com a moral baixa e o pavio curto é suspenso no 2º amarelo", () => {
  const lider = { id: "l", pos: "ZAG" }, outro = { id: "o", pos: "ZAG" };
  let l = null, o = null, p = null;
  for (let i = 0; !(l && o && p); i++) { const j = { id: `x${i}`, pos: "MC" }; const t = Personalidade.tipoDe(j); if (t === "lider") l = j; else if (t === "pavio") p = j; else o = j; }
  assert.equal(Personalidade.bonusDoLider([l, o], 40), 1);
  assert.equal(Personalidade.bonusDoLider([l, o], 70), 0, "com a moral alta ele não faz diferença");
  assert.equal(Personalidade.bonusDoLider([o, o], 40), 0);
  assert.equal(Personalidade.limiteDeAmarelos(p), 2);
  assert.equal(Personalidade.limiteDeAmarelos(o), 3);
});

test("cada evento de personalidade roda com todas as escolhas, sem texto quebrado nem números inválidos", () => {
  const base = novaCarreira("Teste", "flamengo", ""); jogar(base, 5); base.caixaEntrada = [];
  assert.ok(PERSONALIDADES.length >= 12);
  assert.equal(new Set(PERSONALIDADES.map((d) => d.id)).size, PERSONALIDADES.length);
  for (const d of PERSONALIDADES) {
    const tipo = d.alvo.slice(2); assert.ok(Personalidade.IDS.includes(tipo), d.id);
    for (const op of d.opcoes) {
      const save = clone(base), meu = ajudas.elencoDe(save, save.clube);
      const j = meu.find((p) => Personalidade.tipoDe(p) === tipo && !save.lesoes[p.id]); if (!j) continue;
      const e = Eventos.criarDoCatalogo(save, ajudas, Motor.sorteDe(`pers:${d.id}`), d, j);
      assert.ok(e.titulo && !/undefined|NaN/.test(e.titulo + e.texto), d.id);
      const res = Eventos.responder(save, { ...e, id: "x" }, op[0], ajudas);
      assert.ok(typeof res === "string" && res && !/undefined|NaN/.test(res), `${d.id}/${op[0]}: ${res}`);
      assert.ok(Number.isFinite(save.caixa) && save.moral >= 20 && save.moral <= 95, d.id);
    }
  }
});

test("numa temporada inteira os eventos de personalidade aparecem, miram o tipo certo e não se repetem", () => {
  const save = novaCarreira("Teste", "palmeiras", "");
  const vistos = [];
  for (let i = 0; i < 30; i++) {
    jogar(save, 1);
    for (const e of save.caixaEntrada) if (e.personalidade && !vistos.includes(e)) vistos.push(e);
    for (const e of save.caixaEntrada) if (!e.resolvido && e.opcoes) Eventos.responder(save, e, e.padrao, ajudas);
  }
  assert.ok(vistos.length >= 2, `só ${vistos.length} eventos de personalidade em 30 rodadas`);
  const defs = vistos.map((e) => e.def); assert.equal(new Set(defs).size, defs.length);
  for (const e of vistos) {
    const d = PERSONALIDADES.find((x) => x.id === e.def), j = ajudas.jogadorDe(save, e.dados.jogador);
    assert.equal(Personalidade.tipoDe(j), d.alvo.slice(2));
  }
});
