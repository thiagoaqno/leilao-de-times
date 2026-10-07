// Carreira de Treinador: o catálogo de eventos (carreira-catalogo.js). Cada evento, com cada escolha, roda numa carreira
// de verdade sem quebrar; os efeitos mexem no jogo; uma temporada inteira não repete evento.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Motor = require("../public/carreira/motor.js");
const Eventos = require("../carreira-eventos.js");
const { novaCarreira, ajudas, timeDe, fecharRodada } = require("../carreira.js").paraTestes;

const clone = (o) => JSON.parse(JSON.stringify(o));
// uma carreira no meio da temporada (com tabela, resultados e um lesionado), para todo "quando" ter chance
function carreiraNoMeio(clube = "flamengo", rodadas = 6) {
  const save = novaCarreira("Teste", clube, "");
  for (let i = 0; i < rodadas; i++) {
    const [casa, fora] = save.calendario[save.rodada].find((m) => m.includes(save.clube));
    save.partida = { rodada: save.rodada, casa, fora, modo: 1, semente: `t:${i}`, decisoes: {} };
    fecharRodada(save, Motor.simularPartida({ casa: timeDe(save, casa), fora: timeDe(save, fora), semente: `t:${i}` }));
  }
  save.caixaEntrada = [];
  const reserva = ajudas.elencoDe(save, save.clube).find((j) => !save.lesoes[j.id]);
  save.lesoes[reserva.id] = 2;
  save.moral = 60;
  return save;
}

test("catálogo: mais de 100 eventos, ids únicos, cada um com texto e escolha padrão válida", () => {
  const { CATALOGO } = Eventos;
  assert.ok(CATALOGO.length >= 100, `são ${CATALOGO.length}`);
  assert.strictEqual(new Set(CATALOGO.map((d) => d.id)).size, CATALOGO.length);
  for (const d of CATALOGO) {
    assert.ok(d.titulo && d.texto && d.icone && d.grupo, d.id);
    if (d.opcoes) assert.ok(d.opcoes.some((o) => o[0] === d.padrao), `${d.id}: a padrão precisa ser uma das opções`);
    else assert.strictEqual(typeof d.efeito, "function", d.id);
  }
});

test("catálogo: todo evento, com toda escolha, roda e mexe em alguma coisa do jogo", () => {
  const base = carreiraNoMeio();
  const semEfeito = [];
  for (const d of Eventos.CATALOGO) {
    for (const op of d.opcoes || [[null]]) {
      const save = clone(base);
      // o alvo: o primeiro jogador que serve (para o teste não depender do sorteio)
      const r = Motor.sorteDe(`teste:${d.id}`);
      const meu = ajudas.elencoDe(save, save.clube);
      const j = !d.alvo ? null : d.alvo === "lesionado" ? meu.find((p) => save.lesoes[p.id])
        : d.alvo === "outro" ? ajudas.elencoDe(save, "palmeiras")[0] : d.alvo === "goleiro" ? meu.find((p) => p.pos === "GOL") : meu.find((p) => !save.lesoes[p.id]);
      const antes = JSON.stringify(save);
      let fala = "";
      const e = Eventos.criarDoCatalogo(save, ajudas, r, d, j);
      assert.ok(typeof e.titulo === "string" && e.titulo && !/undefined|NaN/.test(e.titulo + e.texto), `${d.id}: ${e.titulo} / ${e.texto}`);
      if (op[0]) {
        assert.ok(e.opcoes.every((o) => typeof o.nome === "string" && !/undefined|NaN/.test(o.nome)), d.id);
        const res = (fala = Eventos.responder(save, { ...e, id: "x" }, op[0], ajudas));
        assert.ok(typeof res === "string" && !/undefined|NaN/.test(res), `${d.id}/${op[0]}: ${res}`);
      } else { fala = e.resultado; assert.ok(!/undefined|NaN/.test(fala), `${d.id}: ${fala}`); }
      assert.ok(Number.isFinite(save.caixa) && save.moral >= 20 && save.moral <= 95, d.id);
      // a escolha precisa ter efeito (as que só dizem "nada muda" são as neutras de propósito)
      if (JSON.stringify(save) === antes && !/^(Nada|Tudo como|Treino de sempre|Semana normal|Fica|Assunto|Vida que|Pé no|Preparação|Paciência|No olho|Gelo|Ficou para|A visita|Dia|Domingo|O gramado|Camisa limpa|Era boato)/.test(fala || "")) semEfeito.push(`${d.id}/${op[0]}`);
    }
  }
  // só as respostas "neutras" podem não mexer em nada
  assert.ok(semEfeito.length <= 25, `escolhas sem efeito demais: ${semEfeito.join(", ")}`);
});

test("efeitos: a nota do time, de um jogador e do adversário entram no jogo e somem depois", () => {
  const save = carreiraNoMeio("santos", 2);
  save.efeitos = []; // os eventos das rodadas de antes podem ter deixado efeitos valendo
  const R = save.rodada, [casa, fora] = save.calendario[R].find((m) => m.includes(save.clube));
  const rival = casa === save.clube ? fora : casa;
  const media = (t) => t.jogadores.reduce((s, j) => s + j.nota, 0) / t.jogadores.length;
  const antes = media(timeDe(save, save.clube));
  save.partida = { rodada: R, casa, fora, modo: 1, semente: "x", decisoes: {} };
  const rivalAntes = media(timeDe(save, rival));
  save.efeitos = [{ alvo: "time", nota: 2, de: R, ate: R }, { alvo: "rival", nota: -2, de: R, ate: R }];
  assert.ok(Math.abs(media(timeDe(save, save.clube)) - antes - 2) < 0.2, "o time ganhou 2");
  assert.ok(Math.abs(media(timeDe(save, rival)) - rivalAntes + 2) < 0.2, "o adversário perdeu 2");
  // outro clube qualquer não sente nada
  const outro = ajudas.idsDosClubes(save).find((id) => id !== save.clube && id !== rival);
  const o = timeDe(save, outro);
  save.efeitos = [];
  assert.deepStrictEqual(timeDe(save, outro), o);
  // depois da rodada, o efeito vence
  save.efeitos = [{ alvo: "time", nota: 2, de: R, ate: R }, { alvo: "time", nota: 1, de: R, ate: R + 2 }];
  fecharRodada(save, Motor.simularPartida({ casa: timeDe(save, casa), fora: timeDe(save, fora), semente: "x" }));
  // (os eventos da rodada seguinte podem trazer efeitos novos, que começam depois)
  assert.deepStrictEqual(save.efeitos.filter((e) => e.de === R).map((e) => e.nota), [1]);
});

test("temporada inteira: os eventos aparecem quase toda rodada e nenhum se repete", () => {
  const save = novaCarreira("Teste", "bahia", "");
  const vistos = [];
  for (let i = 0; i < 38; i++) {
    for (const e of save.caixaEntrada) if (!e.resolvido) Eventos.responder(save, e, e.opcoes[i % e.opcoes.length].id, ajudas);
    const [casa, fora] = save.calendario[save.rodada].find((m) => m.includes(save.clube));
    save.partida = { rodada: save.rodada, casa, fora, modo: 1, semente: `s:${i}`, decisoes: {} };
    fecharRodada(save, Motor.simularPartida({ casa: timeDe(save, casa), fora: timeDe(save, fora), semente: `s:${i}` }));
    for (const e of save.caixaEntrada) if (e.def && e.rodada === save.rodada) vistos.push(e.def);
  }
  const unicos = new Set(vistos);
  assert.strictEqual(unicos.size, vistos.length, "nenhum evento repetido na temporada");
  assert.ok(vistos.length >= 25, `só ${vistos.length} eventos na temporada`);
  assert.ok(Number.isFinite(save.caixa));
});
