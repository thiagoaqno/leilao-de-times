// Carreira de Treinador: a memória do clube (carreira-memoria.js). As escolhas deixam rastro (perfil, relações, laços,
// diário), os ecos só aparecem quando o passado pede e cada eco, com cada escolha, roda sem quebrar.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Motor = require("../public/carreira/motor.js");
const Eventos = require("../carreira-eventos.js");
const Memoria = require("../carreira-memoria.js");
const { novaCarreira, ajudas, timeDe, fecharRodada } = require("../carreira.js").paraTestes;

const clone = (o) => JSON.parse(JSON.stringify(o));
function carreiraNoMeio(rodadas = 6) {
  const save = novaCarreira("Teste", "flamengo", "");
  for (let i = 0; i < rodadas; i++) {
    const [casa, fora] = save.calendario[save.rodada].find((m) => m.includes(save.clube));
    save.partida = { rodada: save.rodada, casa, fora, modo: 1, semente: `m:${i}`, decisoes: {} };
    fecharRodada(save, Motor.simularPartida({ casa: timeDe(save, casa), fora: timeDe(save, fora), semente: `m:${i}` }));
  }
  save.caixaEntrada = [];
  delete save.memoria; save.eventosVistos = {}; // a semente da carreira é sorteada: começa a memória do zero
  return save;
}
const def = (id) => Eventos.CATALOGO.find((d) => d.id === id);
const responder = (save, d, j, opcao) => {
  const e = { id: `t-${d.id}-${opcao}`, rodada: save.rodada, ...Eventos.criarDoCatalogo(save, ajudas, Motor.sorteDe("x"), d, j) };
  return Eventos.responder(save, e, opcao, ajudas);
};

test("memória: a escolha dura deixa mágoa no jogador, firmeza no perfil e uma linha no diário", () => {
  const save = carreiraNoMeio();
  const j = ajudas.elencoDe(save, save.clube)[0];
  const texto = responder(save, def("noitada"), j, "afastar");
  const m = Memoria.de(save);
  assert.ok(m.perfil.firmeza >= 1, "afastar conta como pulso firme");
  assert.strictEqual(m.laco[j.id].r, 1);
  assert.ok(m.diario.at(-1).texto.includes("Flagra na balada"));
  assert.ok(typeof texto === "string");
  responder(save, def("briga-treino"), j, "punir");
  assert.strictEqual(m.laco[j.id].r, 2, "duas decisões contra o mesmo jogador viram mágoa forte");
  const est = Memoria.estado(save, ajudas);
  assert.ok(est.lacos.some((l) => l.pid === j.id && l.magoa === 2));
});

test("memória: a mágoa volta como eco com o mesmo jogador e a lembrança da decisão", () => {
  const save = carreiraNoMeio();
  const j = ajudas.elencoDe(save, save.clube)[0];
  Memoria.de(save).laco[j.id] = { g: 0, r: 2, por: "Flagra na balada", nome: j.nome };
  let eco = null;
  for (let k = 0; k < 40 && !eco; k++) {
    const s = clone(save); s.semente = `eco-${k}`;
    eco = Eventos.gerarEventos(s, ajudas).find((e) => e.def === "eco-magoa");
  }
  assert.ok(eco, "o eco da mágoa aparece");
  assert.strictEqual(eco.dados.jogador, j.id);
  assert.ok(eco.lembranca.includes("Flagra na balada"));
});

test("memória: sem passado não há eco de laço, e os ecos respeitam o intervalo de 3 rodadas", () => {
  const save = carreiraNoMeio();
  for (let k = 0; k < 30; k++) {
    const s = clone(save); s.semente = `vazio-${k}`;
    assert.ok(!Eventos.gerarEventos(s, ajudas).some((e) => e.def === "eco-magoa" || e.def === "eco-gratidao"));
  }
  const s = clone(save); Memoria.de(s).rel.torcida = 10; Memoria.de(s).ultimoEco = s.rodada - 1;
  assert.ok(!Eventos.gerarEventos(s, ajudas).some((e) => e.eco), "eco recente segura o próximo");
});

test("memória: todo eco, com toda escolha, roda e devolve texto", () => {
  const base = carreiraNoMeio();
  const j = ajudas.elencoDe(base, base.clube)[0];
  for (const d of Memoria.ECOS) for (const [op] of d.opcoes) {
    const save = clone(base), m = Memoria.de(save);
    m.laco[j.id] = { g: 3, r: 3, por: "Briga no treino", porG: "Aniversário", nome: j.nome };
    m.marcas = { classicos: 3, idolo: { nome: "Fulano", temporada: save.temporada, rodada: 0, valor: 1e7 }, ultimoTitulo: save.temporada - 1, ultimaQueda: save.temporada - 1 };
    const e = { id: `t-${d.id}`, rodada: save.rodada, ...Eventos.criarDoCatalogo(save, ajudas, Motor.sorteDe("y"), d, d.alvo ? j : null) };
    assert.ok(e.titulo && e.lembranca, d.id);
    const texto = Eventos.responder(save, e, op, ajudas);
    assert.ok(texto && texto.length > 5, `${d.id}/${op}`);
  }
});

test("memória: resultados mexem nas relações e a torcida mexe na bilheteria", () => {
  const save = carreiraNoMeio(2);
  const antes = Memoria.de(save).rel.torcida;
  Memoria.aposJogo(save, ajudas, { nos: 3, eles: 0, emCasa: true, classico: true });
  assert.ok(Memoria.de(save).rel.torcida > antes);
  assert.strictEqual(Memoria.de(save).marcas.classicos, 1);
  Memoria.de(save).rel.torcida = 100; const alto = Memoria.fatorTorcida(save);
  Memoria.de(save).rel.torcida = 0; const baixo = Memoria.fatorTorcida(save);
  assert.ok(alto > 1.1 && baixo < 0.9);
  Memoria.fimDeTemporada(save, { pos: 1, titulos: ["Brasileirão"] });
  assert.strictEqual(Memoria.de(save).marcas.ultimoTitulo, save.temporada);
});

test("eventos: o pós-jogo do calendário mundial leva os eventos novos da caixa de entrada", () => {
  const save = novaCarreira("Teste", "flamengo", "");
  let achou = false;
  for (let i = 0; i < 12 && !achou; i++) {
    const [casa, fora] = save.calendario[save.rodada].find((m) => m.includes(save.clube));
    save.partida = { rodada: save.rodada, casa, fora, modo: 1, semente: `pj:${i}`, decisoes: {} };
    fecharRodada(save, Motor.simularPartida({ casa: timeDe(save, casa), fora: timeDe(save, fora), semente: `pj:${i}` }));
    const ids = new Set([...save.posJogo.eventos, ...save.posJogo.avisos]);
    achou = save.caixaEntrada.some((e) => e.def && ids.has(e.id));
    for (const id of save.posJogo.eventos) assert.ok(save.caixaEntrada.find((e) => e.id === id && !e.resolvido));
  }
  assert.ok(achou, "em 12 rodadas, algum evento do catálogo aparece no pós-jogo");
});
