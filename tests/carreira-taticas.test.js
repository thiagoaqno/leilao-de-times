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

test("as formações (12 esquemas e suas variações) têm 11 vagas, o gol em primeiro e as 6 antigas mantêm a conta de defesa, meio e ataque", () => {
  assert.strictEqual(Taticas.ESQUEMAS.length, 12);
  assert.ok(Taticas.NOMES_FORMACOES.length >= 20);
  assert.deepStrictEqual(Taticas.variacoesDe("4-3-3"), ["4-3-3", "4-3-3 M", "4-3-3 V", "4-3-3 C", "4-3-3 F"], "o 4-3-3 tem 1 volante + 2 meias, 2 volantes + 1 meia, 3 meio-campistas e falso 9");
  assert.ok(Taticas.ESQUEMAS.every((e) => Taticas.FORMACOES[e]), "todo esquema tem a variação padrão com o mesmo nome");
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

test("o meio-campista (MC) rende em qualquer vaga do meio e conta nos lances, de um lado e do outro", () => {
  for (const vaga of ["VOL", "MC", "MEI"]) assert.ok(Taticas.afinidade("MC", vaga) >= 0.96, `MC como ${vaga}`);
  assert.strictEqual(Taticas.afinidade("MC", "MC"), 1);
  assert.ok(Taticas.afinidade("MC", "ZAG") < Taticas.afinidade("MC", "VOL"), "MC na zaga rende menos do que de volante");
  assert.ok(Taticas.afinidade("MEI", "F9") > Taticas.afinidade("MC", "F9") && Taticas.afinidade("ATA", "F9") > 0.95, "o falso 9 é de meia ou de centroavante");
  // um time só de MC no meio ainda joga e as opções dos lances usam o passe e a defesa deles
  const t = time("m", { formacao: "4-3-3 C" });
  const det = Motor.escalacaoDetalhada(t);
  assert.strictEqual(det.filter((v) => v.fino === "MC").length, 3);
  assert.ok(Motor.simularPartida({ casa: t, fora: time("b"), semente: "mc", modo: 3, controla: 0 }).eventos.length > 0);
});

test("equilíbrio dos estilos: com o perfil certo ajudam um pouco, com o perfil errado atrapalham, e nenhum quebra o jogo", () => {
  const PERFIL = { tikitaka: ["pas"], gegenpressing: ["rit", "fis"], posicional: ["pas", "def"], funcional: ["dri", "pas"], catenaccio: ["def", "fis", "gol"], contra: ["rit", "fin"] };
  const elenco = (estilo, v) => time("a", { atr: Object.fromEntries(PERFIL[estilo].map((a) => [a, v])), tatica: { estilo } });
  const ppj = (casa, fora) => { let p = 0; const N = 700; for (let k = 0; k < N; k++) for (const [c, f, inv] of [[casa, fora, false], [fora, casa, true]]) { const r = Motor.simularPartida({ casa: c, fora: f, semente: `eq${k}` }), [a, b] = inv ? [r.placar[1], r.placar[0]] : r.placar; p += a > b ? 3 : a === b ? 1 : 0; } return p / (2 * N); };
  const oponente = time("o");
  for (const estilo of Object.keys(PERFIL)) {
    const base = (v) => ppj({ ...elenco(estilo, v), tatica: { estilo: "equilibrado" } }, oponente);
    const ideal = ppj(elenco(estilo, 88), oponente) - base(88), ruim = ppj(elenco(estilo, 56), oponente) - base(56);
    assert.ok(ideal > ruim + 0.06, `${estilo}: ideal (${ideal.toFixed(3)}) bem acima do perfil errado (${ruim.toFixed(3)})`);
    assert.ok(ideal < 0.3, `${estilo}: o bônus não passa de 0,3 ponto por jogo (${ideal.toFixed(3)})`);
    assert.ok(ruim < 0.03, `${estilo}: sem o perfil, não ganha nada (${ruim.toFixed(3)})`);
  }
});

test("o cansaço vem do jogo anterior: quem chega cansado rende menos, e o motor devolve a energia do fim do jogo", () => {
  const fresco = time("a"), cansado = { ...time("a"), energia: Object.fromEntries(POSICOES.map((_, i) => [`a${i}`, 40])) };
  const r = Motor.simularPartida({ casa: cansado, fora: time("b"), semente: "e0" });
  assert.ok(r.energia.a1 < 40 + 1 && r.energia.a1 >= 20 && r.energia.b1 < 100, "o fim do jogo gasta mais energia");
  assert.ok(Object.keys(r.energia).length === 28, "a energia de todos os jogadores dos dois times");
  const ppj = (casa) => { let p = 0; for (let k = 0; k < 800; k++) for (const inv of [false, true]) { const x = Motor.simularPartida({ casa: inv ? time("b") : casa, fora: inv ? casa : time("b"), semente: `c${k}` }), [g, s] = inv ? [x.placar[1], x.placar[0]] : x.placar; p += g > s ? 3 : g === s ? 1 : 0; } return p / 1600; };
  assert.ok(ppj(fresco) > ppj(cansado) + 0.12, "o time cansado rende bem menos");
});

test("na carreira, repetir os mesmos 11 derruba a energia e o banco descansa; as férias devolvem tudo", () => {
  const Temporada = require("../public/carreira/temporada.js");
  const { proximoJogoMundo, simularMinha, fecharRodada, estado, sementeDoJogo } = require("../carreira.js").paraTestes;
  const save = novaCarreira("Teste", "flamengo", "x");
  const rodar = () => {
    const jogo = proximoJogoMundo(save);
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, agregado: [0, 0], casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    const r = simularMinha(save); assert.ok(r.completo); fecharRodada(save, r);
  };
  const titulares = () => { const d = require("../public/carreira/motor.js").escalacaoDetalhada(require("../carreira.js").paraTestes.timeDe(save, save.clube)); return d.map((v) => v.id).filter(Boolean); };
  save.escalacao.titulares = titulares(); save.escalacao.fixo = true; // sempre os mesmos 11
  const onze = [...save.escalacao.titulares];
  assert.strictEqual(estado(save).energia[onze[0]], 100, "no começo todo mundo está com 100");
  for (let i = 0; i < 8; i++) rodar();
  const e = estado(save).energia, media = (ids) => ids.reduce((s, id) => s + e[id], 0) / ids.length;
  const banco = Object.keys(e).filter((id) => !onze.includes(id));
  assert.ok(media(onze) < 80, `os titulares cansam depois de 8 jogos seguidos (${media(onze).toFixed(0)}%)`);
  assert.ok(media(banco) > media(onze) + 10, "o banco está bem mais descansado");
  assert.ok(Math.min(...onze.map((id) => e[id])) >= 20, "o piso é 20%");
});

test("o cansaço tira de 0 a 3 pontos da nota", () => {
  const p = Taticas.penalidadeEnergia;
  assert.deepStrictEqual([100, 85, 84, 70, 69, 50, 49, 20].map(p), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test("o campinho desenha a variação: volante recuado, meia avançado, falso 9 atrás e alas na linha", () => {
  const pos = (nome) => { const s = Taticas.spots(nome), v = Taticas.vagasDe(nome); return v.map((x, i) => ({ ...x, ...s[i] })); };
  const v433 = pos("4-3-3"), vol = v433.find((x) => x.fino === "VOL"), mcs = v433.filter((x) => x.fino === "MC");
  assert.strictEqual(vol.x, 50, "o único volante fica no meio");
  assert.ok(vol.y > mcs[0].y && mcs[0].x < 50 && mcs[1].x > 50, "volante mais recuado, os dois meio-campistas nas pontas do triângulo");
  const v433v = pos("4-3-3 V"), volantes = v433v.filter((x) => x.fino === "VOL"), mei = v433v.find((x) => x.fino === "MEI");
  assert.ok(volantes.every((x) => x.y > mei.y), "2 volantes + 1 meia: o meia joga mais à frente");
  assert.strictEqual(mei.x, 50, "o meia fica no meio, os volantes dos lados");
  const lados = pos("4-3-3").filter((x) => x.fino === "LE" || x.fino === "LD" || x.fino === "PE" || x.fino === "PD");
  assert.ok(lados.every((x) => x.x <= 14 || x.x >= 86), "laterais e pontas colados na linha");
  const f9 = pos("4-3-3 F").find((x) => x.fino === "F9"), ata = pos("4-3-3").find((x) => x.fino === "ATA");
  assert.ok(f9.y > ata.y, "o falso 9 joga mais atrás do que o centroavante");
  for (const nome of Taticas.NOMES_FORMACOES) { const s = Taticas.spots(nome); assert.ok(s.every((p) => p.x >= 8 && p.x <= 92 && p.y >= 5 && p.y <= 95), nome); }
  const alas = pos("3-5-2").filter((x) => x.fino === "LE" || x.fino === "LD");
  assert.ok(alas.every((x) => x.x <= 14 || x.x >= 86), "os alas do 3-5-2 na linha lateral");
});

test("depois de uma expulsão dá para pôr outro jogador na vaga aberta (do campo ou do banco)", () => {
  const cfg = { casa: time("a"), fora: time("b"), modo: 2, controla: 0 };
  // procura um jogo em que o seu time leva um vermelho e para na parada do vermelho
  let achou = null;
  for (let k = 0; k < 4000 && !achou; k++) {
    const decisoes = {};
    for (let v = 0; v < 12; v++) {
      const r = Motor.simularPartida({ ...cfg, semente: `v${k}`, decisoes });
      if (r.completo) break;
      if (r.parado.motivo === "vermelho") { achou = { semente: `v${k}`, decisoes: { ...decisoes }, p: r.parado }; break; }
      decisoes[r.parado.id] = Motor.decisaoAutomatica(r.parado);
    }
  }
  assert.ok(achou, "algum jogo com expulsão do seu time");
  const { p } = achou, vazias = p.campo.map((v, i) => (v.id ? -1 : i)).filter((i) => i >= 0);
  assert.strictEqual(vazias.length, 1, "uma vaga aberta");
  const vaga = vazias[0], alvo = p.campo[vaga], doCampo = p.campo.find((v, i) => v.id && i > 0 && i !== vaga);
  const base = { tatica: p.tatica, formacao: p.formacao, subs: [], trocas: [] };
  const seguir = (d) => { const decisoes = { ...achou.decisoes, [p.id]: d }; let r; for (let v = 0; v < 12; v++) { r = Motor.simularPartida({ ...cfg, semente: achou.semente, decisoes }); if (r.completo || !r.parado) return r; decisoes[r.parado.id] = r.parado.id === p.id ? d : Motor.decisaoAutomatica(r.parado); } return r; };
  // do campo: um jogador muda de lugar para a vaga aberta e a vaga dele fica aberta no lugar
  const r1 = seguir({ ...base, ocupar: [["m", doCampo.id, vaga]] });
  const ev1 = r1.eventos.find((e) => e.tipo === "reposicao");
  assert.ok(ev1 && ev1.jogador === doCampo.id && ev1.fino === alvo.fino, "o jogador foi para a vaga da zaga");
  // do banco: um reserva entra na vaga aberta e gasta uma substituição
  const reserva = p.banco.find((b) => b.pos !== "GK");
  const r2 = seguir({ ...base, ocupar: [["e", reserva.id, vaga]] });
  const ev2 = r2.eventos.find((e) => e.tipo === "entrada");
  assert.ok(ev2 && ev2.jogador === reserva.id && ev2.fino === alvo.fino, "o reserva entrou na vaga aberta");
  // pedir uma vaga que já tem dono não faz nada
  const r3 = seguir({ ...base, ocupar: [["m", doCampo.id, p.campo.findIndex((v, i) => v.id && i > 0 && v.id !== doCampo.id)]] });
  assert.ok(!r3.eventos.some((e) => e.tipo === "reposicao"), "vaga ocupada não vira posição nova");
  // sem substituições sobrando, o reserva não entra
  const r4 = seguir({ ...base, subs: [], ocupar: [["e", reserva.id, vaga], ["e", p.banco.filter((b) => b.pos !== "GK")[1].id, vaga]] });
  assert.strictEqual(r4.eventos.filter((e) => e.tipo === "entrada").length, 1, "a segunda tentativa na mesma vaga é ignorada");
});

test("improvisar dentro da mesma linha custa pouco: 1 ou 2 pontos; mudar de linha custa mais", () => {
  const p = Taticas.pontosDeEncaixe;
  assert.deepStrictEqual([["PE", "PD"], ["PD", "PE"], ["LE", "LD"], ["LD", "LE"]].map(([a, b]) => p(a, b)), [1, 1, 1, 1], "ponta e lateral do outro lado: 1 ponto");
  assert.deepStrictEqual([["PD", "ATA"], ["ATA", "PE"], ["ATA", "F9"]].map(([a, b]) => p(a, b)), [2, 2, 1], "ponta e centroavante: 1 ou 2 pontos");
  assert.deepStrictEqual([["VOL", "MC"], ["MC", "MEI"], ["MEI", "MC"], ["VOL", "MEI"]].map(([a, b]) => p(a, b)), [1, 1, 1, 2], "volante, meio e meia: 1 ou 2 pontos");
  assert.ok(p("LD", "ZAG") >= 4 && p("MC", "ZAG") >= 4 && p("ATA", "ZAG") > p("MC", "ZAG"), "mudar de linha custa 4 pontos ou mais");
  // numa nota 80, 1 ponto = menos de 1,5% e 2 pontos = menos de 3%
  assert.ok(80 * (1 - Taticas.afinidade("PE", "PD")) < 1.1 && 80 * (1 - Taticas.afinidade("ATA", "PD")) < 2.1);
  assert.strictEqual(Taticas.afinidade("ATA", "GOL"), 0.5);
});
