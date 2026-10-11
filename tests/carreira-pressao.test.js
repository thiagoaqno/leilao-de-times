// Pressão em volta do time: a coletiva depois do jogo, a torcida cobrando, o clima do estádio e a viagem com recepção no feed.
const test = require("node:test");
const assert = require("node:assert");
const Pressao = require("../carreira-pressao.js");
const Memoria = require("../carreira-memoria.js");
const Feed = require("../carreira-feed.js");
const Motor = require("../public/carreira/motor.js");

const ajudas = { clubeDe: (s, id) => s.clubes[id], proximoJogoMundo: (s) => s.proximo };
const novoSave = (extra = {}) => ({ semente: "x", temporada: 1, rodada: 6, clube: "a", clubes: { a: { id: "a", nome: "Alfa", cidade: "São Paulo", pais: "Brasil", tamanho: 4, estadio: "Arena Alfa" },
  b: { id: "b", nome: "Beta", cidade: "Belém", pais: "Brasil", tamanho: 5, estadio: "Estádio Beta" }, c: { id: "c", nome: "Gama", cidade: "Santos", pais: "Brasil", tamanho: 2, estadio: "Vila Gama" },
  d: { id: "d", nome: "Delta", cidade: "Buenos Aires", pais: "Argentina", tamanho: 4, estadio: "Monumental" } }, feed: [], memoria: null, gestao: { confianca: 60 }, moral: 60, ...extra });
const x = (save, extra = {}) => ({ save, m: Memoria.de(save), vitorias: 0, derrotas: 0, T: 4, ...extra });

test("a goleada sofrida abre a coletiva, e só logo depois do jogo", () => {
  const save = novoSave(); Memoria.de(save);
  Memoria.aposJogo(save, { mudarMoral() {}, clubeDe: ajudas.clubeDe }, { nos: 0, eles: 4, emCasa: true, classico: false, adv: "b" });
  const d = Pressao.escolher(save, x(save), Memoria.de(save), () => 0);
  assert.equal(d.id, "coletiva-goleada");
  save.rodada = 9; // três rodadas depois: a pergunta já passou
  assert.equal(Pressao.escolher(save, x(save), Memoria.de(save), () => 0), null);
});

test("a torcida em baixa e duas derrotas pedem reunião; cada coletiva vale um ponto de imprensa ou mais", () => {
  const save = novoSave(); const m = Memoria.de(save); m.rel.torcida = 30;
  Memoria.aposJogo(save, { mudarMoral() {}, clubeDe: ajudas.clubeDe }, { nos: 0, eles: 1, emCasa: true, classico: false, adv: "c" });
  const d = Pressao.escolher(save, x(save, { derrotas: 2 }), m, () => 0);
  assert.ok(Pressao.TORCIDA.includes(d), "a cobrança da torcida vem antes da coletiva de rotina");
  for (const def of Pressao.TODAS) { assert.ok(def.opcoes.length >= 2 && def.padrao && def.opcoes.some((o) => o[0] === def.padrao), def.id); }
});

test("o clima do estádio: torcida cheia ajuda em casa, rival grande pressiona fora e a sua torcida segura", () => {
  const save = novoSave(); const m = Memoria.de(save);
  m.rel.torcida = 80; assert.equal(Pressao.climaDoJogo(save, ajudas, "a", "c").nota, 1);
  m.rel.torcida = 20; assert.equal(Pressao.climaDoJogo(save, ajudas, "a", "c").nota, -1);
  assert.equal(Pressao.climaDoJogo(save, ajudas, "b", "a").nota, -1, "fora contra clube grande, com a torcida baixa");
  m.rel.torcida = 75; assert.equal(Pressao.climaDoJogo(save, ajudas, "b", "a").nota, 0, "a torcida viaja junto");
  assert.equal(Pressao.climaDoJogo(save, ajudas, "c", "a").nota, 0, "clube pequeno não esquenta");
});

test("a viagem vira notícia: distância, modo e recepção", () => {
  assert.ok(Feed.distanciaKm("São Paulo", "Belém") > 2000);
  assert.equal(Feed.viagemDe({ pais: "Brasil", cidade: "São Paulo" }, { pais: "Brasil", cidade: "Santos" }).modo, "onibus");
  assert.equal(Feed.viagemDe({ pais: "Brasil", cidade: "São Paulo" }, { pais: "Brasil", cidade: "Belém" }).modo, "aviao");
  assert.equal(Feed.viagemDe({ pais: "Brasil", cidade: "São Paulo" }, { pais: "Argentina", cidade: "Buenos Aires" }).modo, "internacional");
  const save = novoSave({ proximo: { id: "j1", casa: "b", fora: "a" } });
  Memoria.de(save).rel.torcida = 50;
  Feed.viagem(save, ajudas);
  const tipos = save.feed.map((f) => f.tipo).sort();
  assert.deepEqual(tipos, ["recepcao", "viagem"]);
  assert.ok(save.feed.find((f) => f.tipo === "recepcao").texto.includes("Beta"));
  // em casa não há viagem, e a torcida animada recebe o ônibus
  const casa = novoSave({ proximo: { id: "j2", casa: "a", fora: "c" } }); Memoria.de(casa).rel.torcida = 80;
  Feed.viagem(casa, ajudas);
  assert.deepEqual(casa.feed.map((f) => f.tipo), ["recepcao"]);
});

test("o clima de casa entra na nota do time em campo", () => {
  const jogadores = Array.from({ length: 16 }, (_, i) => ({ id: `j${i}`, nome: `j${i}`, pos: ["GOL", "ZAG", "ZAG", "LE", "LD", "VOL", "MC", "MC", "PE", "PD", "ATA", "GOL", "ZAG", "MC", "ATA", "LE"][i], nota: 75 }));
  const sobe = jogadores.map((j) => ({ ...j, nota: j.nota + 1 }));
  let a = 0, b = 0;
  for (let i = 0; i < 150; i++) {
    const r = Motor.simularPartida({ casa: { id: "a", jogadores: sobe }, fora: { id: "b", jogadores }, semente: `clima${i}`, modo: 1 });
    a += r.placar[0] - r.placar[1];
    const q = Motor.simularPartida({ casa: { id: "a", jogadores }, fora: { id: "b", jogadores }, semente: `clima${i}`, modo: 1 });
    b += q.placar[0] - q.placar[1];
  }
  assert.ok(a > b, `com +1 de nota ${a}, sem ${b}`);
});
