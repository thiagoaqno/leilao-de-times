// Corrida: as equipes de F1 de 2026 com o orçamento em pontos e a montagem do carro (public/corrida/f1-equipes.js), a conferência
// do servidor e os robôs correndo com o carro da própria equipe.
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../public/corrida/f1-equipes.js");
const Pilotos = require("../public/corrida/f1-pilotos-2026.js");
const T = require("../public/corrida/pistas.js");
const Robos = require("../corrida-robos.js");
const bd = require("../bd.js");

const montagem = (motor, aero, chassi, freios, suspensao, confiab) => ({ motor, aero, chassi, freios, suspensao, confiab });
// toda montagem de 6 peças (níveis de 0 a MAX_NIVEL) cuja soma é `soma`
function* montagens(soma) {
  const n = E.MAX_NIVEL;
  for (let a = 0; a <= n; a++) for (let b = 0; b <= n; b++) for (let c = 0; c <= n; c++) for (let d = 0; d <= n; d++) for (let e = 0; e <= n; e++) {
    const f = soma - a - b - c - d - e;
    if (f >= 0 && f <= n) yield montagem(a, b, c, d, e, f);
  }
}

test("as 11 equipes: orçamento de 15 a 20 pontos pela força, e a montagem padrão gasta o orçamento inteiro", () => {
  assert.deepEqual(Object.keys(E.EQUIPES).sort(), Object.keys(Pilotos.EQUIPES).sort());
  const ordem = Object.keys(E.EQUIPES), orc = ordem.map((id) => E.EQUIPES[id].orcamento);
  assert.equal(Math.max(...orc), 20); assert.equal(Math.min(...orc), 15);
  for (let i = 1; i < orc.length; i++) assert.ok(orc[i] <= orc[i - 1], "as equipes vêm das mais fortes para as mais fracas");
  for (const id of ordem) {
    const q = E.EQUIPES[id], v = E.validar(id, q.padrao);
    assert.ok(v.ok, `${id}: ${v.erro}`);
    assert.equal(E.custoDaMontagem(q.padrao), q.orcamento, `${id} gasta o orçamento todo`);
    assert.ok(Pilotos.EQUIPES[id] && q.nota);
  }
  // as de ponta têm mais pontos que as do fim
  assert.ok(E.EQUIPES.mclaren.orcamento > E.EQUIPES.audi.orcamento && E.EQUIPES.haas.orcamento > E.EQUIPES.cadillac.orcamento - 1);
});

test("o orçamento não estoura: o servidor-regra recusa montagem inválida e aceita as válidas", () => {
  const ok = montagem(4, 4, 3, 3, 3, 3); // 20
  assert.ok(E.validar("mclaren", ok).ok);
  assert.ok(E.validar("mclaren", montagem(0, 0, 0, 0, 0, 0)).ok, "gastar menos que o orçamento pode");
  assert.equal(E.validar("mclaren", { ...ok, motor: 5 }).ok, false, "21 de 20 pontos");
  assert.equal(E.validar("cadillac", ok).ok, false, "20 pontos numa equipe de 15");
  assert.equal(E.validar("mclaren", montagem(9, 0, 0, 0, 0, 0)).ok, false, "nível acima do máximo");
  assert.equal(E.validar("mclaren", montagem(-1, 4, 4, 4, 4, 4)).ok, false, "nível negativo para esconder custo");
  assert.equal(E.validar("mclaren", montagem(1.5, 4, 4, 4, 4, 4)).ok, false, "meio ponto");
  assert.equal(E.validar("mclaren", montagem("4", 4, 3, 3, 3, 3)).ok, false, "texto no lugar de número");
  assert.equal(E.validar("mclaren", montagem(NaN, 4, 3, 3, 3, 3)).ok, false);
  assert.equal(E.validar("mclaren", montagem(Infinity, 0, 0, 0, 0, 0)).ok, false);
  assert.equal(E.validar("mclaren", { motor: 4, aero: 4, chassi: 3, freios: 3, suspensao: 3 }).ok, false, "falta uma peça");
  assert.equal(E.validar("mclaren", { ...ok, turbo: 5 }).ok, false, "peça que não existe");
  for (const ruim of [null, undefined, 7, "x", [4, 4, 3, 3, 3, 3]]) assert.equal(E.validar("mclaren", ruim).ok, false);
  assert.equal(E.validar("ninguem", ok).ok, false, "equipe inválida");
  // nenhuma montagem aceita passa do orçamento (todas as de 0 a 20 pontos numa equipe de 20)
  let aceitas = 0;
  for (const soma of [19, 20, 21]) for (const m of montagens(soma)) { const v = E.validar("mclaren", m); if (v.ok) { aceitas++; assert.ok(E.custoDaMontagem(v.montagem) <= 20); } else assert.equal(soma, 21); }
  assert.ok(aceitas > 1000);
  // a cópia devolvida é limpa (não guarda o que o navegador mandou além das seis peças)
  assert.deepEqual(Object.keys(E.validar("mclaren", ok).montagem), E.ORDEM);
});

test("cada peça muda o spec no sentido certo", () => {
  const base = montagem(4, 4, 4, 4, 4, 4), s0 = E.specDaMontagem(base), mais = (k) => E.specDaMontagem({ ...base, [k]: 5 });
  const m = mais("motor"); assert.ok(m.vmax > s0.vmax && m.acc > s0.acc && m.quebra === s0.quebra, "motor: mais velocidade e aceleração (a quebra é só da confiabilidade)");
  const a = mais("aero"); assert.ok(a.grip > s0.grip && a.turn > s0.turn && a.drs > s0.drs, "aerodinâmica: mais aderência, volante e DRS");
  assert.ok(a.vmax < s0.vmax && a.acc <= s0.acc, "...e menos velocidade final e aceleração");
  const c = mais("chassi"); assert.ok(c.acc > s0.acc && c.brake > s0.brake, "chassi leve: mais aceleração e freio");
  assert.ok(c.wall < s0.wall && c.offMax < s0.offMax, "...e menos resistência");
  const f = mais("freios"); assert.ok(f.brake > s0.brake);
  const s = mais("suspensao"); assert.ok(s.offMax > s0.offMax && s.desgaste < s0.desgaste && s.scrub < s0.scrub && s.kin > s0.kin && s.grip > s0.grip, "suspensão: zebras, desgaste do pneu e escorregão");
  const r = mais("confiab"); assert.ok(r.quebra < s0.quebra, "confiabilidade: quebra menos");
  for (const k of E.ORDEM) { // peça nenhuma é de graça: cada uma só mexe nos números dela
    const t = mais(k); assert.notEqual(JSON.stringify(t), JSON.stringify(s0), k);
  }
});

test("todo número de toda montagem possível fica entre o pior e o melhor dos cinco carros de antes", () => {
  const n = E.MAX_NIVEL;
  for (let motor = 0; motor <= n; motor++) for (let aero = 0; aero <= n; aero++) for (let chassi = 0; chassi <= n; chassi += 2) for (let suspensao = 0; suspensao <= n; suspensao += 2) for (let freios = 0; freios <= n; freios += 4) {
    const s = E.specDaMontagem(montagem(motor, aero, chassi, freios, suspensao, 2));
    for (const [k, [a, b]] of Object.entries(E.LIMITES)) assert.ok(s[k] >= a && s[k] <= b, `${k}=${s[k]} fora de ${a}..${b}`);
    assert.ok(s.quebra > 0 && s.quebra < 0.4 && s.desgaste > 0.5 && s.drs > 0.5);
  }
  // e os limites são mesmo os dos cinco carros
  for (const k of Object.keys(E.LIMITES)) {
    const v = Object.values(T.CARROS).map((c) => c[k]);
    assert.ok(E.LIMITES[k][0] <= Math.min(...v) + 1e-9 && E.LIMITES[k][1] >= Math.max(...v) - 1e-9, `${k}: os limites cobrem os cinco carros`);
  }
  for (const id of Object.keys(E.EQUIPES)) assert.match(E.specDaEquipe(id).chave, /^\d-\d-\d-\d-\d-\d$/);
});

test("com o mesmo orçamento, nenhuma montagem é melhor em tudo que outra", () => {
  const todas = [...montagens(9)].map((m) => ({ m, v: E.eixos(E.specDaMontagem(m)) }));
  assert.ok(todas.length > 1500);
  const domina = (a, b) => a.every((x, i) => x >= b[i] - 1e-9) && a.some((x, i) => x > b[i] + 1e-9);
  let pares = 0;
  for (let i = 0; i < todas.length; i++) for (let j = 0; j < todas.length; j++) if (i !== j) { pares++; assert.ok(!domina(todas[i].v, todas[j].v), `${JSON.stringify(todas[i].m)} domina ${JSON.stringify(todas[j].m)}`); }
  assert.ok(pares > 3e6);
  // as de 20 pontos, uma amostra: uma troca de um ponto entre duas peças nunca melhora tudo
  const vinte = [...montagens(20)];
  for (let i = 0; i < vinte.length; i += 7) for (const de of E.ORDEM) for (const para of E.ORDEM) {
    if (de === para || vinte[i][de] === 0 || vinte[i][para] === E.MAX_NIVEL) continue;
    const b = { ...vinte[i], [de]: vinte[i][de] - 1, [para]: vinte[i][para] + 1 };
    assert.ok(!domina(E.eixos(E.specDaMontagem(b)), E.eixos(E.specDaMontagem(vinte[i]))), `${de}->${para}`);
  }
});

test("um carro de reta e um de curva: a reta ganha em Monza, a curva ganha em Mônaco e empata em Barcelona; nenhuma montagem manda em todas as pistas", () => {
  const volta = (m, pista) => Robos.tempoDaVolta(Robos.perfil(pista, E.specDaMontagem(m), 0), 0.9);
  const reta = montagem(8, 0, 3, 3, 2, 4), curva = montagem(1, 8, 3, 3, 3, 2); // 20 pontos os dois
  assert.equal(E.custoDaMontagem(reta), 20); assert.equal(E.custoDaMontagem(curva), 20);
  assert.ok(volta(reta, "monza") < volta(curva, "monza") * 0.95, "Monza é de reta");
  assert.ok(volta(curva, "monaco") < volta(reta, "monaco") * 0.995, "Mônaco é de curva");
  // (com a linha de menor curvatura e a curvatura suavizada, as curvas de Barcelona ficam abertas demais para a aderência decidir: empate, até 1%)
  assert.ok(volta(curva, "barcelona") < volta(reta, "barcelona") * 1.01, "Barcelona empata");
  // procurando entre as montagens de 20 pontos com chassi e freios em 3, quem é melhor em Monza não é o melhor em Mônaco
  const melhor = { monza: [Infinity, null], monaco: [Infinity, null] };
  for (const m of montagens(20)) if (m.chassi === 3 && m.freios === 3) for (const pista of ["monza", "monaco"]) { const t = volta(m, pista); if (t < melhor[pista][0]) melhor[pista] = [t, m]; }
  assert.notDeepEqual(melhor.monza[1], melhor.monaco[1], "o melhor de Monza não é o melhor de Mônaco");
  assert.ok(melhor.monza[1].motor - melhor.monza[1].aero > melhor.monaco[1].motor - melhor.monaco[1].aero, "Monza pede mais motor e menos asa do que Mônaco");
  assert.ok(volta(melhor.monza[1], "monaco") > melhor.monaco[0] * 1.0001, "e o melhor de Monza perde tempo em Mônaco");
  assert.ok(volta(melhor.monaco[1], "monza") > melhor.monza[0] * 1.0001, "e o melhor de Mônaco perde tempo em Monza");
});

test("a equipe forte anda mais que a do fim com o carro padrão, mas sem passar de uns 6% na volta", () => {
  for (const pista of ["monaco", "monza", "interlagos"]) {
    const t = (id) => Robos.tempoDaVolta(Robos.perfil(pista, E.specDaEquipe(id), 0), 0.9);
    const tops = ["mclaren", "ferrari", "mercedes", "red-bull"].map(t), fundo = ["audi", "alpine", "cadillac"].map(t);
    assert.ok(Math.min(...tops) < Math.min(...fundo), pista);
    assert.ok(Math.max(...fundo) / Math.min(...tops) < 1.06, `${pista}: a diferença cabe nos pilotos`);
  }
  // o carro de cada equipe é diferente (a Red Bull não anda como a Haas): uma é de curva, outra de reta
  assert.equal(E.specDaEquipe("red-bull").estilo, "curva"); assert.equal(E.specDaEquipe("haas").estilo, "reta");
  assert.ok(E.specDaEquipe("haas").vmax > E.specDaEquipe("red-bull").vmax && E.specDaEquipe("red-bull").grip > E.specDaEquipe("haas").grip);
  assert.equal(E.specDaEquipe("ferrari").name, "Ferrari");
});

test("a ficha do carro dá notas de 1 a 10 e as extremidades aparecem", () => {
  for (const m of [montagem(8, 0, 0, 0, 0, 0), montagem(0, 8, 0, 0, 0, 0), montagem(0, 0, 8, 8, 0, 4)]) for (const f of E.ficha(E.specDaMontagem(m))) assert.ok(f.nota >= 1 && f.nota <= 10 && Number.isInteger(f.nota), f.id);
  const nota = (m, id) => E.ficha(E.specDaMontagem(m)).find((f) => f.id === id).nota;
  assert.ok(nota(montagem(8, 0, 0, 0, 0, 0), "reta") > nota(montagem(0, 8, 0, 0, 0, 0), "reta"));
  assert.ok(nota(montagem(0, 8, 0, 0, 0, 0), "curva") > nota(montagem(8, 0, 0, 0, 0, 0), "curva"));
  assert.ok(nota(montagem(0, 0, 0, 0, 0, 8), "confiab") > nota(montagem(8, 0, 0, 0, 0, 0), "confiab"));
});

test("os robôs correm com o carro da equipe: o da Red Bull anda diferente do da Haas, e a montagem do chefe vale para os robôs da equipe", () => {
  const sala = (extra = {}) => ({ config: { pista: "monaco", regras: "f1", voltas: 3, robos: 19, nivel: "medio" }, semente: 11, order: ["h"], players: { h: { id: "h", name: "Ana", sockets: new Set(), color: "#fff", equipe: "mclaren" } }, ...extra });
  const a = sala(); Robos.preparar(a, ["#e63946"], () => "x");
  const bots = a.order.map((id) => a.players[id]).filter((p) => p.bot);
  const porEquipe = (r, eq) => r.order.map((id) => r.players[id]).filter((p) => p.bot && p.equipe === eq);
  for (const b of bots) assert.deepEqual(b.spec, E.specDaEquipe(b.equipe), `${b.name}: o carro padrão da ${b.equipe}`);
  const rb = bots.find((p) => p.equipe === "red-bull"), haas = bots.find((p) => p.equipe === "haas");
  if (rb && haas) assert.notDeepEqual(rb.spec, haas.spec);
  assert.ok(new Set(bots.map((p) => p.spec.chave)).size >= 8, "as equipes têm carros diferentes");
  // um humano na McLaren: só sobra um titular dela para robô, e a montagem dele vale para o carro do robô
  assert.equal(porEquipe(a, "mclaren").length, 1, "o humano ocupa um dos dois carros da McLaren");
  const b = sala({ montagens: { mclaren: montagem(8, 0, 4, 4, 0, 4) } }); Robos.preparar(b, ["#e63946"], () => "x");
  const mcl = porEquipe(b, "mclaren")[0];
  assert.equal(mcl.spec.chave, "8-0-4-4-0-4"); assert.ok(mcl.spec.vmax > E.specDaEquipe("mclaren").vmax);
  // dois humanos na mesma equipe: nenhum robô dela
  const c = sala({ order: ["h", "g"], players: { h: { id: "h", name: "Ana", sockets: new Set(), equipe: "haas" }, g: { id: "g", name: "Gui", sockets: new Set(), equipe: "haas" } } });
  Robos.preparar(c, ["#e63946"], () => "x");
  assert.equal(porEquipe(c, "haas").length, 0); assert.equal(c.order.length, 20);
  // o perfil do robô aceita o spec e o guarda por montagem
  const p1 = Robos.perfil("monaco", rb ? rb.spec : E.specDaEquipe("red-bull"), 0), p2 = Robos.perfil("monaco", E.specDaEquipe("red-bull"), 0);
  assert.equal(p1, p2); assert.equal(p1.c.vmax, E.specDaEquipe("red-bull").vmax);
});

test("a falha mecânica: a chance é a do carro, sai da semente e cai em 15% a 85% da corrida", () => {
  const F1 = require("../public/corrida/f1-regras.js");
  const taxa = (m) => { const spec = E.specDaMontagem(m); let n = 0, fracoes = [];
    for (let k = 0; k < 4000; k++) { const f = E.sortearFalha(F1.sorteio(`quebra:${k}:x`), spec); if (f != null) { n++; fracoes.push(f); } }
    assert.ok(fracoes.every((f) => f >= 0.15 && f <= 0.85));
    return { real: n / 4000, spec: spec.quebra }; };
  for (const m of [montagem(8, 0, 3, 3, 2, 0), montagem(4, 4, 3, 3, 3, 3), montagem(0, 4, 4, 4, 4, 8)]) { const t = taxa(m); assert.ok(Math.abs(t.real - t.spec) < 0.025, `${JSON.stringify(m)}: sorteado ${t.real}, do carro ${t.spec}`); }
  assert.ok(E.specDaMontagem(montagem(8, 0, 3, 3, 2, 0)).quebra > E.specDaMontagem(montagem(0, 4, 4, 4, 4, 8)).quebra * 3, "sem confiabilidade quebra bem mais do que com ela no máximo");
  assert.ok(E.specDaMontagem(montagem(8, 0, 0, 0, 0, 0)).quebra <= 0.01, "mesmo o pior caso não passa de 1%");
  const mesma = () => E.sortearFalha(F1.sorteio("quebra:7:robo-1"), E.specDaMontagem(montagem(8, 0, 3, 3, 2, 0)));
  assert.equal(mesma(), mesma(), "a mesma semente dá a mesma falha");
});

// ---------- a sala do servidor, sem rede ----------
function salaDeMentira() {
  const estados = {};
  const nsp = { handlers: {}, on(e, f) { this.handlers[e] = f; }, to(codigo) { return { emit(ev, d) { if (ev === "state") estados[codigo] = JSON.parse(JSON.stringify(d)); }, volatile: { emit() {} } }; }, sockets: new Map() };
  require("../corrida.js")({ of: () => nsp });
  let n = 0;
  const socket = () => {
    const h = {}, s = { id: "s" + ++n, data: {}, h, on(e, f) { h[e] = f; }, emit() {}, join() {}, leave() {}, to() { return { emit() {}, volatile: { emit() {} } }; } };
    nsp.handlers.connection(s); return s;
  };
  const chamar = (s, ev, dados) => new Promise((ok) => s.h[ev](dados, ok));
  return { socket, chamar, estado: (codigo) => estados[codigo] };
}

test("sala: a equipe e a montagem passam pelo servidor, que recusa o que não cabe", async () => {
  bd.fechar(); bd.abrir(":memory:");
  const { socket, chamar, estado } = salaDeMentira(), ana = socket(), beto = socket(), caio = socket();
  const criou = await chamar(ana, "create", { name: "Ana", config: { pista: "monza", voltas: 2, regras: "galera" } });
  const act = (s, dados) => chamar(s, "act", dados), cod = criou.code;
  await chamar(beto, "join", { code: cod, name: "Beto" }); await chamar(caio, "join", { code: cod, name: "Caio" });
  // sem as regras de F1 não tem equipe nem montagem
  assert.equal((await act(ana, { type: "equipe", id: "mclaren" })).ok, false);
  assert.equal((await act(ana, { type: "montagem", montagem: montagem(4, 4, 3, 3, 3, 3) })).ok, false);
  await act(ana, { type: "config", config: { pista: "monza", voltas: 2, regras: "f1", classificacao: "pular" } });
  // equipes inválidas, e a montagem sem equipe
  assert.equal((await act(ana, { type: "equipe", id: "toro-rosso" })).ok, false);
  assert.equal((await act(ana, { type: "equipe", id: { $ne: 1 } })).ok, false);
  assert.match((await act(ana, { type: "montagem", montagem: montagem(4, 4, 3, 3, 3, 3) })).error, /equipe/i);
  // a Ana entra na Ferrari e vira a chefe; o Beto entra na mesma (dois amigos dividem a equipe); o Caio não cabe
  assert.equal((await act(ana, { type: "equipe", id: "ferrari" })).ok, true);
  assert.equal((await act(beto, { type: "equipe", id: "ferrari" })).ok, true);
  const cheia = await act(caio, { type: "equipe", id: "ferrari" });
  assert.equal(cheia.ok, false); assert.match(cheia.error, /dois carros/);
  let st = estado(cod);
  assert.equal(st.players.find((p) => p.name === "Ana").equipe, "ferrari"); assert.equal(st.players.find((p) => p.name === "Beto").equipe, "ferrari");
  assert.equal(st.players.find((p) => p.name === "Ana").mods.pintura, Pilotos.EQUIPES.ferrari.pintura, "a pintura da equipe");
  assert.equal(st.chefes.ferrari, st.players.find((p) => p.name === "Ana").id);
  // só a chefe monta; o orçamento da Ferrari é 19
  assert.match((await act(beto, { type: "montagem", montagem: montagem(8, 0, 3, 3, 2, 3) })).error, /chefe/);
  const passou = await act(ana, { type: "montagem", montagem: montagem(8, 0, 3, 3, 2, 4) }); // 20 pontos
  assert.equal(passou.ok, false); assert.match(passou.error, /orçamento/);
  for (const ruim of [montagem(9, 0, 0, 0, 0, 0), montagem(-5, 12, 3, 3, 3, 3), { motor: 8 }, { ...montagem(8, 0, 3, 3, 2, 3), extra: 1 }, "reta", [8, 0, 3, 3, 2, 3]]) assert.equal((await act(ana, { type: "montagem", montagem: ruim })).ok, false, JSON.stringify(ruim));
  assert.equal(estado(cod).montagens?.ferrari, undefined, "nada do que foi recusado fica guardado");
  const boa = await act(ana, { type: "montagem", montagem: montagem(8, 0, 3, 3, 2, 3) }); // 19
  assert.equal(boa.ok, true);
  st = estado(cod); assert.deepEqual(st.montagens.ferrari, montagem(8, 0, 3, 3, 2, 3));
  // o que vem de fora é copiado: peças a mais não passam
  assert.deepEqual(Object.keys(st.montagens.ferrari), E.ORDEM);
  // a montagem volta para a padrão, e some quando a equipe fica sem humanos
  await act(ana, { type: "montagem", montagem: null }); assert.equal(estado(cod).montagens?.ferrari, undefined);
  await act(ana, { type: "montagem", montagem: montagem(8, 0, 3, 3, 2, 3) });
  await act(ana, { type: "equipe", id: null }); // a Ana sai: o Beto vira o chefe
  st = estado(cod); assert.equal(st.chefes.ferrari, st.players.find((p) => p.name === "Beto").id);
  assert.deepEqual(st.montagens.ferrari, montagem(8, 0, 3, 3, 2, 3), "a equipe guarda o carro enquanto tem alguém");
  await act(beto, { type: "equipe", id: "haas" });
  assert.equal(estado(cod).montagens?.ferrari, undefined, "sem humanos, a montagem some");
  // depois da largada não dá mais para mexer
  assert.equal((await act(ana, { type: "start" })).ok, true);
  assert.equal((await act(beto, { type: "montagem", montagem: montagem(1, 1, 1, 1, 1, 1) })).ok, false);
  assert.equal((await act(beto, { type: "equipe", id: "audi" })).ok, false);
  await act(ana, { type: "lobby" }); // desliga os relógios da corrida
  bd.fechar();
});

test("sala: as peças (modo carreira) viram a montagem no servidor, que confere o custo", async () => {
  const P = require("../public/corrida/f1-pecas.js");
  bd.fechar(); bd.abrir(":memory:");
  const { socket, chamar, estado } = salaDeMentira(), ana = socket();
  const criou = await chamar(ana, "create", { name: "Ana", config: { pista: "monza", voltas: 2, regras: "f1" } });
  const act = (s, dados) => chamar(s, "act", dados), cod = criou.code;
  assert.equal((await act(ana, { type: "equipe", id: "ferrari" })).ok, true);
  const caro = Object.fromEntries(P.CATEGORIAS.map((c) => [c.id, c.pecas[c.pecas.length - 1].id]));
  assert.match((await act(ana, { type: "montagem", pecas: caro })).error, /orçamento/);
  assert.equal((await act(ana, { type: "montagem", pecas: { ...P.pecasPadrao(), unidade: "x" } })).ok, false);
  const boa = await act(ana, { type: "montagem", pecas: P.pecasPadrao() });
  assert.equal(boa.ok, true);
  assert.deepEqual(estado(cod).montagens.ferrari, { motor: 3, aero: 3, chassi: 3, freios: 3, suspensao: 3, confiab: 3 });
  assert.deepEqual(estado(cod).pecasEq.ferrari, P.pecasPadrao());
  assert.equal((await act(ana, { type: "montagem", montagem: montagem(8, 0, 3, 3, 2, 3) })).ok, true, "o formato antigo continua valendo");
  assert.equal(estado(cod).pecasEq.ferrari, undefined);
  assert.equal((await act(ana, { type: "montagem", montagem: null })).ok, true);
  assert.equal(estado(cod).montagens?.ferrari, undefined);
});
