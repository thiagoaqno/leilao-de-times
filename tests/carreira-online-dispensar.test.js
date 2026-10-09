// Carreira em grupo pelo canal de verdade: quem sai da sala joga no automático (sem segurar a rodada) e o anfitrião
// pode dispensar alguém, passando o clube para o computador.
const test = require("node:test");
const assert = require("node:assert");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

let srv;
test.before(async () => { srv = await subirServidor({ CARREIRA_VEL: "30", CARREIRA_DECISAO_MS: "20000", CARREIRA_LANCE_MS: "700", CARREIRA_ESPERA_MS: "0", CARREIRA_AUSENTE_MS: "400" }); });
test.after(async () => { await srv.parar(); });

const canal = () => conectar(srv.url, "/carreira-online");
const agir = (s, d) => pedir(s, "act", d);
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const aviso = (s, nome, ms = 5000) => new Promise((ok, erro) => { const t = setTimeout(() => erro(new Error(`sem o evento ${nome}`)), ms); s.once(nome, (v) => { clearTimeout(t); ok(v); }); });
async function sala(clubes, comecar = true) {
  const ss = [];
  for (let i = 0; i < clubes.length; i++) ss.push(await canal());
  const c = await pedir(ss[0], "create", { name: "P0" }), creds = [c];
  for (let i = 1; i < clubes.length; i++) creds.push(await pedir(ss[i], "join", { code: c.code, name: `P${i}` }));
  for (let i = 0; i < clubes.length; i++) await agir(ss[i], { type: "clube", clube: clubes[i] });
  if (comecar) { await agir(ss[0], { type: "opcoes", aporte: 0 }); await agir(ss[0], { type: "comecar" }); await esperarEstado(ss[0], (s) => s.fase === "carreira"); }
  return { ss, creds, code: c.code };
}

test("quem saiu da sala não segura a rodada: o jogo dele anda no automático", async () => {
  const { ss: [a, b] } = await sala(["flamengo", "liverpool"]);
  await pedir(b, "modo", { modo: 3 }); // com o modo 3 ele pararia a cada lance, 20 s cada um
  await pedir(a, "modo", { modo: 1 });
  b.close();
  await esperar_ausente(a);
  const t0 = Date.now();
  await agir(a, { type: "rodada" });
  const fim = await esperarEstado(a, (s) => !s.rodada && s.ultimaRodada && s.ultimaRodada.n === 1, 15000);
  assert.ok(Date.now() - t0 < 15000, "a rodada acabou sem esperar as decisões de quem saiu");
  assert.strictEqual(fim.ultimaRodada.jogos.length, 2);
  assert.ok(fim.ultimaRodada.jogos.every((j) => Array.isArray(j.placar)));
  assert.strictEqual(fim.players.find((p) => p.name === "P1").online, false);
  a.close();
});
const esperar_ausente = async (a) => { await esperarEstado(a, (s) => s.players.some((p) => !p.online)); await espera(700); };

test("o anfitrião dispensa alguém na sala de espera; os outros não podem", async () => {
  const { ss: [a, b], creds: [ca, cb] } = await sala(["flamengo", "palmeiras"], false);
  await assert.rejects(agir(b, { type: "dispensar", pessoa: ca.id }), /anfitrião/);
  await assert.rejects(agir(a, { type: "dispensar", pessoa: ca.id }), /anfitrião/);
  await assert.rejects(agir(a, { type: "dispensar", pessoa: "naoexiste" }), /não está mais/);
  const avisou = aviso(b, "dispensado");
  const r = await agir(a, { type: "dispensar", pessoa: cb.id });
  assert.strictEqual(r.dispensado, "P1");
  await avisou;
  const st = await esperarEstado(a, (s) => s.players.length === 1);
  assert.ok(!st.ocupados.palmeiras, "o clube ficou livre");
  // quem foi dispensado não mexe mais na sala
  await assert.rejects(agir(b, { type: "clube", clube: "palmeiras" }), /sala|assiste/);
  a.close(); b.close();
});

test("dispensar no meio da carreira devolve o clube ao computador e a rodada segue com os que ficaram", async () => {
  const { ss: [a, b], creds: [, cb] } = await sala(["flamengo", "liverpool"]);
  const avisou = aviso(b, "dispensado");
  await agir(a, { type: "dispensar", pessoa: cb.id });
  await avisou;
  const st = await esperarEstado(a, (s) => s.players.length === 1);
  assert.ok(!st.ocupados.liverpool);
  await assert.rejects(pedir(b, "entrar"), /sala/, "quem saiu não tem mais clube na carreira");
  await pedir(a, "modo", { modo: 1 });
  await agir(a, { type: "rodada" });
  const andando = await esperarEstado(a, (s) => s.rodada && s.rodada.n === 1);
  assert.strictEqual(andando.rodada.jogos.length, 1, "só o jogo de quem ficou");
  const fim = await esperarEstado(a, (s) => !s.rodada && s.ultimaRodada && s.ultimaRodada.n === 1, 30000);
  assert.ok(fim.ultimaRodada.jogos.every((j) => Array.isArray(j.placar)));
  a.close(); b.close();
});

test("dispensar com a bola rolando: o jogo dele anda no automático e ele sai no fim da rodada", async () => {
  const { ss: [a, b], creds: [, cb] } = await sala(["flamengo", "liverpool"]);
  await pedir(b, "modo", { modo: 3 }); await pedir(a, "modo", { modo: 1 });
  await agir(a, { type: "rodada" });
  await esperarEstado(a, (s) => s.rodada && s.rodada.n === 1);
  const r = await agir(a, { type: "dispensar", pessoa: cb.id });
  assert.strictEqual(r.noFimDaRodada, true, "o clube só passa para o computador quando a rodada acabar");
  await assert.rejects(pedir(b, "decidir", { id: "x", resposta: {} }), /dispensou/);
  const fim = await esperarEstado(a, (s) => !s.rodada && s.ultimaRodada && s.ultimaRodada.n === 1 && s.players.length === 1, 20000);
  assert.strictEqual(fim.ultimaRodada.jogos.length, 2, "o jogo dele foi jogado até o fim");
  assert.ok(!fim.ocupados.liverpool);
  a.close(); b.close();
});
