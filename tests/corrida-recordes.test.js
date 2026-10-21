// Corrida: os recordes de volta de cada pista, para sempre (bd.js e GET /api/recordes-corrida).
const test = require("node:test");
const assert = require("node:assert");
const bd = require("../bd.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

test.beforeEach(() => { bd.fechar(); bd.abrir(":memory:"); });
test.after(() => bd.fechar());

test("recordes: só os 5 mais rápidos ficam, cada piloto uma vez, com a melhor volta dele", () => {
  const tempos = [["Ana", 31.2], ["Bia", 30.8], ["Caio", 32.5], ["Duda", 33.1], ["Edu", 34.0]];
  assert.deepStrictEqual(tempos.map(([p, t]) => bd.registrarRecordeCorrida("interlagos", t, "equilibrado", p)), [1, 1, 3, 4, 5]);
  assert.strictEqual(bd.registrarRecordeCorrida("interlagos", 35, "tanque", "Fabi"), 0, "mais lento que o 5º: fica de fora");
  assert.strictEqual(bd.registrarRecordeCorrida("interlagos", 32.0, "foguete", "ana"), 0, "Ana mais lenta que o próprio recorde não muda nada");
  assert.strictEqual(bd.registrarRecordeCorrida("interlagos", 30.5, "foguete", "ANA"), 1, "o mesmo piloto (sem diferença de maiúsculas) melhora o próprio tempo");
  assert.strictEqual(bd.registrarRecordeCorrida("interlagos", 33.0, "formiga", "Gabi"), 4, "entra no meio e empurra o 5º para fora");
  const top = bd.recordesCorrida().interlagos;
  assert.deepStrictEqual(top.map((r) => [r.piloto, r.tempo]), [["ANA", 30.5], ["Bia", 30.8], ["Caio", 32.5], ["Gabi", 33.0], ["Duda", 33.1]]);
  assert.strictEqual(top[0].carro, "foguete");
  assert.strictEqual(bd.recordesCorrida().monaco, undefined, "cada pista tem o seu quadro");
});

test("traçados dos bots: guarda cinco pilotos diferentes e só melhora a própria volta", () => {
  const s = [[0, 1, 2, 0, 0, 0]];
  for (const [piloto, tempo] of [["Ana", 50], ["Bia", 51], ["Caio", 52], ["Duda", 53], ["Edu", 54]])
    assert.equal(bd.salvarVoltaCorrida("interlagos", tempo, "equilibrado", piloto, s), true);
  assert.equal(bd.salvarVoltaCorrida("interlagos", 55, "equilibrado", "Fabi", s), false);
  assert.equal(bd.salvarVoltaCorrida("interlagos", 49, "equilibrado", "ANA", s), true);
  assert.deepStrictEqual(bd.melhoresTracadosCorrida("interlagos").map((v) => [v.piloto, v.tempo]),
    [["ANA", 49], ["Bia", 51], ["Caio", 52], ["Duda", 53], ["Edu", 54]]);
});

test("recordes: a migração traz a melhor volta que já estava guardada", () => {
  const db = bd.abrir();
  db.exec("DELETE FROM migracoes WHERE nome = '013-corrida-recordes.sql'; DROP TABLE corrida_recordes;");
  bd.salvarVoltaCorrida("monaco", 28.4, "drifteiro", "Zeca", Array.from({ length: 100 }, (_, i) => [i * 100, 0, 0, 0, 0, i]));
  bd.migrar(db);
  assert.deepStrictEqual(bd.recordesCorrida().monaco.map((r) => [r.piloto, r.tempo, r.carro]), [["Zeca", 28.4, "drifteiro"]]);
});

test("GET /api/recordes-corrida: todas as pistas, com o quadro de cada uma", async () => {
  const srv = await subirServidor();
  try {
    const r = await fetch(srv.url + "/api/recordes-corrida").then((x) => x.json());
    const T = require("../public/corrida/pistas.js");
    assert.deepStrictEqual(r.pistas.map((p) => p.id), Object.keys(T.PISTAS));
    assert.ok(r.pistas.every((p) => typeof p.nome === "string" && Array.isArray(p.top)));
  } finally { await srv.parar(); }
});

test("corrida de verdade: a volta medida pelo servidor entra no quadro e a sala fica sabendo", { timeout: 60000 }, async () => {
  const srv = await subirServidor(), T = require("../public/corrida/pistas.js");
  const a = await conectar(srv.url, "/corrida");
  try {
    const avisos = []; a.on("recorde", (r) => avisos.push(r));
    await pedir(a, "create", { name: "Ana", config: { pista: "monaco", voltas: 3 } });
    await pedir(a, "act", { type: "start" });
    const st = await esperarEstado(a, (s) => s.phase === "race" && s.startAt);
    const setor = (s) => pedir(a, "act", { type: "sector", s });
    await new Promise((ok) => setTimeout(ok, st.startAt - st.now + 100)); // a largada
    const largada = Date.now();
    await setor(0); // a primeira passagem é a largada
    for (let s = 1; s < T.SECTORS; s++) await setor(s);
    await new Promise((ok) => setTimeout(ok, Math.max(0, largada + T.PISTAS.monaco.minLap * 1000 + 300 - Date.now()))); // uma volta mais lenta que o mínimo da pista
    await setor(0); // fechou a volta
    for (let i = 0; i < 50 && !avisos.length; i++) await new Promise((ok) => setTimeout(ok, 50));
    assert.strictEqual(avisos.length, 1);
    assert.deepStrictEqual([avisos[0].piloto, avisos[0].pos, avisos[0].pista], ["Ana", 1, "monaco"]);
    const r = await fetch(srv.url + "/api/recordes-corrida").then((x) => x.json());
    const top = r.pistas.find((p) => p.id === "monaco").top;
    assert.strictEqual(top.length, 1); assert.strictEqual(top[0].piloto, "Ana");
    assert.ok(top[0].tempo >= T.PISTAS.monaco.minLap && Math.abs(top[0].tempo - avisos[0].tempo) < 1e-9);
  } finally { a.close(); await srv.parar(); }
});
