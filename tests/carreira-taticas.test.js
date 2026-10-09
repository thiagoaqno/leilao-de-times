// Carreira de Treinador: posições finas (lateral não é zagueiro), formações novas e estilos de jogo (tiki-taka, gegenpressing...).
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Taticas = require("../public/carreira/taticas.js");
const Motor = require("../public/carreira/motor.js");
const G = require("../carreira.js").grupo;
const { novaCarreira } = require("../carreira.js").paraTestes;

const POSICOES = ["GOL", "ZAG", "ZAG", "LD", "LE", "VOL", "MC", "MC", "MEI", "PE", "PD", "ATA", "ATA", "ZAG"];
function time(id, { atr = {}, nota = 74, formacao = "4-3-3", tatica } = {}) {
  return { id, nome: id, formacao, tatica, jogadores: POSICOES.map((pos, i) => ({ id: `${id}${i}`, nome: `${id} ${i}`, pos, nota, atr: { fin: 70, pas: 70, dri: 70, def: 70, fis: 70, rit: 70, gol: 70, ...atr } })) };
}

test("o encaixe diferencia lateral de zagueiro e ponta de centroavante, e continua 1 na posição de origem", () => {
  for (const p of ["GOL", "ZAG", "LE", "LD", "VOL", "MC", "MEI", "PE", "PD", "ATA"]) assert.strictEqual(Taticas.afinidade(p, p), 1, p);
  assert.ok(Taticas.afinidade("LD", "ZAG") < 1 && Taticas.afinidade("ZAG", "LE") < 1, "lateral na zaga e zagueiro na lateral rendem menos");
  assert.ok(Taticas.afinidade("PD", "ATA") < 1 && Taticas.afinidade("ATA", "PD") < 1, "ponta de centroavante e o contrário rendem menos");
  assert.ok(Taticas.afinidade("LD", "LE") < 1, "lado trocado");
  assert.ok(Taticas.afinidade("LD", "LE") > Taticas.afinidade("LD", "ATA"), "mais longe, menos rendimento");
  assert.ok(Taticas.afinidade("PD", "ATA") > Taticas.afinidade("ZAG", "ATA"), "ponta de centroavante rende mais do que zagueiro de centroavante");
  assert.strictEqual(Taticas.afinidade("ATA", "GOL"), 0.5);
  assert.strictEqual(Taticas.afinidade("GOL", "ZAG"), 0.5);
  assert.strictEqual(Taticas.afinidade("LAT", "LE"), 1, "a sigla antiga LAT vale como lateral");
  // o motor usa o mesmo encaixe: o mesmo lateral rende menos de zagueiro do que de lateral
  const lat = { id: "x", nome: "x", pos: "LD", nota: 80 };
  assert.ok(Motor.valorNa(lat, "DEF", "ZAG") < Motor.valorNa(lat, "DEF", "LD"));
});

test("as 13 formações têm 11 vagas, o gol em primeiro e as 6 antigas mantêm a conta de defesa, meio e ataque", () => {
  assert.strictEqual(Taticas.NOMES_FORMACOES.length, 13);
  for (const nome of Taticas.NOMES_FORMACOES) {
    const v = Taticas.vagasDe(nome), s = Taticas.spots(nome);
    assert.strictEqual(v.length, 11, nome); assert.strictEqual(s.length, 11, nome);
    assert.strictEqual(v[0].g, "GK"); assert.strictEqual(v.filter((x) => x.g === "GK").length, 1, nome);
    assert.ok(s.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100), nome);
    assert.strictEqual(Motor.vagasDe(nome).length, 11);
    // o motor escala o time inteiro em qualquer formação
    const det = Motor.escalacaoDetalhada(time("a", { formacao: nome }));
    assert.strictEqual(det.length, 11); assert.ok(det.every((x) => x.id && x.fino), nome);
    assert.ok(Motor.simularPartida({ casa: time("a", { formacao: nome }), fora: time("b"), semente: nome }).completo, nome);
  }
  const conta = (n) => ["DEF", "MID", "ATT"].map((g) => Taticas.vagasDe(n).filter((x) => x.g === g).length).join("-");
  assert.deepStrictEqual(["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "3-4-3", "5-3-2"].map(conta), ["4-3-3", "4-4-2", "3-5-2", "4-5-1", "3-4-3", "5-3-2"]);
  assert.strictEqual(conta("5-4-1"), "5-4-1"); assert.strictEqual(conta("2-3-5"), "2-3-5"); assert.strictEqual(conta("4-2-4"), "4-2-4");
});

test("em campo, cada jogador vai para a vaga em que rende mais e o improviso mostra o encaixe", () => {
  // sem PD no elenco, o ATA que sobra vai para a ponta; o lateral-direito escalado de zagueiro rende menos
  const t = time("a", { formacao: "4-3-3" });
  t.jogadores = t.jogadores.filter((j) => j.pos !== "PD");
  const det = Motor.escalacaoDetalhada(t);
  const pd = det.find((v) => v.fino === "PD"), j = t.jogadores.find((x) => x.id === pd.id);
  assert.ok(j && Taticas.afinidade(j.pos, "PD") < 1 && Taticas.afinidade(j.pos, "PD") >= 0.9, "improvisado na ponta, com perda pequena");
  const fixa = { ...t, titulares: det.map((v) => v.id), fixo: true };
  assert.deepStrictEqual(Motor.escalacaoDetalhada(fixa).map((v) => v.id), det.map((v) => v.id), "a escalação fixa vale");
});

test("cada estilo tem perfil, bônus e custo; o encaixe do elenco decide o bônus", () => {
  assert.deepStrictEqual(Taticas.efeitos({ mentalidade: 0, pressao: 1, linha: 1 }), { criar: 0, sofrer: 0, seuFinalizar: 0, rivalFinalizar: 0, cansaco: 0, faltas: 0 }, "o neutro não muda nada");
  const ofensiva = Taticas.efeitos({ mentalidade: 1, pressao: 1, linha: 1 }), retranca = Taticas.efeitos({ mentalidade: -1, pressao: 1, linha: 1 });
  assert.strictEqual(ofensiva.criar, 12); assert.strictEqual(ofensiva.sofrer, 8); assert.strictEqual(retranca.criar, -12); assert.strictEqual(retranca.sofrer, -8);
  assert.ok(Taticas.efeitos({ mentalidade: 0, pressao: 2, linha: 1 }).cansaco > 0 && Taticas.efeitos({ mentalidade: 0, pressao: 2, linha: 1 }).sofrer < 0, "pressão alta cansa e segura o rival");
  assert.ok(Taticas.efeitos({ mentalidade: 0, pressao: 1, linha: 2 }).rivalFinalizar > 0, "linha alta deixa o rival converter mais");
  assert.deepStrictEqual(Taticas.NOMES_ESTILOS, ["equilibrado", "tikitaka", "gegenpressing", "posicional", "funcional", "catenaccio", "contra"]);
  const bom = [...Array(11)].map(() => ({ grp: "MID", atr: { pas: 85, dri: 80, rit: 80, fis: 80, fin: 80, def: 80, gol: 80 } })), fraco = bom.map((p) => ({ ...p, atr: { ...p.atr, pas: 56 } }));
  assert.ok(Taticas.encaixe("tikitaka", bom) > Taticas.encaixe("tikitaka", fraco));
  const ef = (est, jog) => Taticas.efeitos({ mentalidade: 0, pressao: 1, linha: 1 }, Taticas.fatores(est, Taticas.encaixe(est, jog)));
  assert.ok(ef("tikitaka", bom).criar > ef("tikitaka", fraco).criar, "o mesmo estilo rende mais com o perfil certo");
  assert.ok(ef("catenaccio", bom).criar < 0 && ef("catenaccio", bom).sofrer < 0, "a retranca cria menos e cede menos");
  assert.ok(ef("gegenpressing", bom).cansaco > 0, "o gegenpressing cansa");
  assert.strictEqual(Taticas.estiloIdeal(bom.map((p) => ({ ...p, atr: { ...p.atr, pas: 56, dri: 56, rit: 56, fis: 56, fin: 56, def: 56, gol: 56 } }))), "equilibrado", "sem perfil, o computador joga equilibrado");
});

test("no jogo, o estilo muda as chances: tiki-taka cria mais, retranca cede menos", () => {
  const casa = (tatica) => time("a", { atr: { pas: 86, def: 80, fis: 80 }, tatica }), fora = time("b");
  const lances = (estilo) => { let a = 0, b = 0; for (let k = 0; k < 600; k++) { const r = Motor.simularPartida({ casa: casa({ estilo }), fora, semente: `s${k}` }); a += r.estatisticas[0].lances; b += r.estatisticas[1].lances; } return [a / 600, b / 600]; };
  const base = lances("equilibrado"), tiki = lances("tikitaka"), retranca = lances("catenaccio");
  assert.ok(tiki[0] > base[0] * 1.05, "tiki-taka cria mais lances");
  assert.ok(retranca[1] < base[1] * 0.93 && retranca[0] < base[0], "a retranca cede menos e cria menos");
});

test("o servidor guarda o estilo e a formação nova da escalação, e rejeita o que não existe", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  assert.strictEqual(G.limparEscalacao(save, { formacao: "3-2-4-1", tatica: { mentalidade: 1, pressao: 2, linha: 0, estilo: "gegenpressing" } }), null);
  assert.strictEqual(save.escalacao.formacao, "3-2-4-1");
  assert.deepStrictEqual(save.escalacao.tatica, { mentalidade: 1, pressao: 2, linha: 0, estilo: "gegenpressing" });
  G.limparEscalacao(save, { formacao: "9-9-9", tatica: { estilo: "inventado" } });
  assert.strictEqual(save.escalacao.formacao, "3-2-4-1", "formação inexistente não troca");
  assert.strictEqual(save.escalacao.tatica.estilo, "equilibrado", "estilo inexistente vira equilibrado");
});
