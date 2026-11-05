// Corrida: os recordes de volta de cada pista, para sempre (bd.js e GET /api/recordes-corrida).
const test = require("node:test");
const assert = require("node:assert");
const bd = require("../bd.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

process.env.CORRIDA_TV_MS = "0"; // sem a transmissão de TV antes das luzes: a largada vem logo
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


test("voltas dos bots: a migração 017 traz os traçados que já estavam guardados", () => {
  const db = bd.abrir();
  db.exec(`DELETE FROM migracoes WHERE nome = '017-corrida-voltas-piloto.sql'; DROP TABLE corrida_voltas_piloto;
    CREATE TABLE corrida_tracados (pista TEXT NOT NULL, chave TEXT NOT NULL, piloto TEXT NOT NULL, tempo REAL NOT NULL, carro TEXT NOT NULL, dados TEXT NOT NULL, feita_em INTEGER NOT NULL, PRIMARY KEY (pista, chave));
    INSERT INTO corrida_tracados VALUES ('rio', 'zeca', 'Zeca', 61.5, 'tanque', '[[0,1,2,0,0,0]]', 1);`);
  bd.migrar(db);
  assert.deepStrictEqual(bd.melhoresTracadosCorrida("rio").map((v) => [v.piloto, v.tempo, v.carro]), [["Zeca", 61.5, "tanque"]]);
  assert.strictEqual(bd.ritmoCorrida("rio").tempo, 61.5);
});

test("recordes: as voltas de antes (migração 013) ficam fora do quadro, e a primeira de F1 com robôs toma o lugar", () => {
  const db = bd.abrir();
  db.exec("DELETE FROM migracoes WHERE nome IN ('013-corrida-recordes.sql', '024-recordes-f1-robos.sql'); DROP TABLE corrida_recordes;");
  bd.salvarVoltaCorrida("monaco", 28.4, "drifteiro", "Zeca", Array.from({ length: 100 }, (_, i) => [i * 100, 0, 0, 0, 0, i]));
  bd.migrar(db);
  assert.strictEqual(bd.recordesCorrida().monaco, undefined, "a volta antiga não diz de onde veio: fora do quadro da Vila");
  assert.strictEqual(bd.registrarRecordeCorrida("monaco", 30.1, "equilibrado", "Zeca"), 1, "a de F1 entra, mesmo mais lenta que a antiga");
  assert.deepStrictEqual(bd.recordesCorrida().monaco.map((r) => [r.piloto, r.tempo, r.carro]), [["Zeca", 30.1, "equilibrado"]]);
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

test("corrida de verdade sem as regras de F1 e sem robôs: a volta conta, mas não entra no quadro da Vila", { timeout: 60000 }, async () => {
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
    await new Promise((ok) => setTimeout(ok, 500));
    assert.strictEqual(avisos.length, 0, "o quadro da Vila só leva volta de F1 com robôs (corrida.js)");
    const r = await fetch(srv.url + "/api/recordes-corrida").then((x) => x.json());
    assert.strictEqual(r.pistas.find((p) => p.id === "monaco").top.length, 0);
  } finally { a.close(); await srv.parar(); }
});
