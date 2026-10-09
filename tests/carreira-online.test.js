// Carreira em grupo: a sala do canal /carreira-online (carreira-online.js) com o servidor de verdade.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

// o banco num arquivo, para reiniciar o servidor e ver a sala continuar
const PASTA = fs.mkdtempSync(path.join(os.tmpdir(), "carreira-online-"));
const DB = path.join(PASTA, "galera.db");
let srv;
test.before(async () => { srv = await subirServidor({ DB_PATH: DB }); });
test.after(async () => { await srv.parar(); try { fs.rmSync(PASTA, { recursive: true, force: true }); } catch {} });

const canal = () => conectar(srv.url, "/carreira-online");
const agir = (s, d) => pedir(s, "act", d);

test("carreira em grupo: criar, entrar, opções do anfitrião e escolher clube sem repetir", async () => {
  const a = await canal(), b = await canal();
  const sala = await pedir(a, "create", { name: "Thiago" });
  const entra = await pedir(b, "join", { code: sala.code, name: "Kizzy" });
  let st = await esperarEstado(a, (s) => s.players.length === 2);
  assert.strictEqual(st.host, sala.id);
  assert.deepStrictEqual(st.opcoes, { temporadas: 2, aporte: 1e9, ligas: "mundo", ritmo: "normal", caixaIgual: 0 });
  assert.ok(st.clubes.includes("liverpool") && st.clubes.includes("flamengo"));
  // só o anfitrião mexe nas regras, e fora do permitido não vale
  await assert.rejects(agir(b, { type: "opcoes", temporadas: 4 }), /anfitrião/);
  await agir(a, { type: "opcoes", temporadas: 9, aporte: 123, caixaIgual: 42 });
  await agir(a, { type: "opcoes", temporadas: 3, aporte: 500e6, ligas: "brasil" });
  st = await esperarEstado(a, (s) => s.opcoes.temporadas === 3);
  assert.deepStrictEqual(st.opcoes, { temporadas: 3, aporte: 500e6, ligas: "brasil", ritmo: "normal", caixaIgual: 0 });
  assert.ok(!st.clubes.includes("liverpool"), "só o Brasileirão");
  // cada um no seu clube: dois humanos nunca no mesmo
  await assert.rejects(agir(a, { type: "clube", clube: "liverpool" }), /ligas/);
  await agir(a, { type: "clube", clube: "flamengo" });
  await assert.rejects(agir(b, { type: "clube", clube: "flamengo" }), /já é do Thiago/);
  await assert.rejects(agir(a, { type: "comecar" }), /Falta escolher o clube: Kizzy/);
  await agir(b, { type: "clube", clube: "palmeiras" });
  await assert.rejects(agir(b, { type: "comecar" }), /anfitrião/);
  st = await esperarEstado(b, (s) => s.ocupados.palmeiras === entra.id);
  assert.strictEqual(st.ocupados.flamengo, sala.id);
  a.close(); b.close();
});

test("carreira em grupo: começa um mundo só, com o aporte no caixa de cada um, e a sala volta pelo token", async () => {
  const a = await canal(), b = await canal();
  const sala = await pedir(a, "create", { name: "Ana" });
  const eb = await pedir(b, "join", { code: sala.code, name: "Bia" });
  await agir(a, { type: "opcoes", aporte: 250e6 });
  await agir(a, { type: "clube", clube: "santos" });
  await agir(b, { type: "clube", clube: "liverpool" });
  const chegou = new Promise((ok) => b.once("carreira", ok));
  await agir(a, { type: "comecar" });
  await esperarEstado(a, (s) => s.fase === "carreira");
  // cada um vê a sede do seu clube, no mesmo mundo
  const ea = (await pedir(a, "entrar")).estado, eb2 = await chegou;
  assert.strictEqual(ea.clube, "santos");
  assert.strictEqual(eb2.clube, "liverpool");
  assert.strictEqual(ea.temporadasMax, 2);
  assert.deepStrictEqual(Object.keys(ea.competicoes).sort(), Object.keys(eb2.competicoes).sort());
  assert.ok(ea.financas.flatMap((f) => f.itens).some(([n, v]) => n === "Aporte do investidor" && v === 250e6));
  assert.ok(ea.caixaEntrada.some((e) => e.tipo === "aporte"));
  assert.ok(eb2.caixa > ea.caixa, "o Liverpool tem mais dinheiro que o Santos");
  // a escalação é de cada um
  const e = await pedir(a, "escalacao", { formacao: "4-4-2" });
  assert.strictEqual(e.estado.escalacao.formacao, "4-4-2");
  assert.notStrictEqual((await pedir(b, "entrar")).estado.escalacao.formacao, "4-4-2", "a do outro não muda");
  // depois do começo, ninguém novo entra como técnico (só assiste), e a rodada é do anfitrião
  const c = await canal();
  await assert.rejects(pedir(c, "join", { code: sala.code, name: "Caio" }), /já começou/);
  await pedir(c, "join", { code: sala.code, watch: true });
  await assert.rejects(pedir(a, "jogar", {}), /anfitrião/);
  // fechou a aba: volta pelo id e token, no mesmo clube
  b.close();
  const b2 = await canal();
  await assert.rejects(pedir(b2, "join", { code: sala.code, id: eb.id, token: "errado" }), /nome/);
  await pedir(b2, "join", { code: sala.code, id: eb.id, token: eb.token });
  assert.strictEqual((await pedir(b2, "entrar")).estado.clube, "liverpool");
  a.close(); b2.close(); c.close();
});

test("carreira em grupo: o servidor reinicia e a sala continua (no banco, só o hash do token)", async () => {
  const a = await canal();
  const sala = await pedir(a, "create", { name: "Rafa" });
  await agir(a, { type: "clube", clube: "gremio" });
  await agir(a, { type: "comecar" });
  await esperarEstado(a, (s) => s.fase === "carreira");
  await pedir(a, "escalacao", { formacao: "3-5-2" });
  a.close();
  await srv.parar();
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(DB), linha = db.prepare("SELECT dados FROM carreiras_online WHERE codigo = ?").get(sala.code);
  db.close();
  assert.ok(linha && !linha.dados.includes(sala.token), "o token não vai para o banco");
  srv = await subirServidor({ DB_PATH: DB });
  const b = await canal();
  await pedir(b, "join", { code: sala.code, id: sala.id, token: sala.token });
  const st = await esperarEstado(b, (s) => s.fase === "carreira");
  assert.strictEqual(st.players[0].clube, "gremio");
  const e = (await pedir(b, "entrar")).estado;
  assert.strictEqual(e.clube, "gremio");
  assert.strictEqual(e.escalacao.formacao, "3-5-2");
  b.close();
});
