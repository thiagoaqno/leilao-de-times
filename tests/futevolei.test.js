// Futevôlei: as regras (o golpe que sai pela posição da bola, os 3 toques, o placar, os robôs) e uma partida pelo
// servidor com clientes Socket.io (robôs completando, o meu toque armado, a Noite recebendo o resultado).
const test = require("node:test");
const assert = require("node:assert");
const F = require("../public/futevolei/regras.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

const rngFixo = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };
const jogadores = (duplas) => [{ id: "a0", team: "A", slot: 0, bot: true }, { id: "b0", team: "B", slot: 0, bot: true },
  ...(duplas ? [{ id: "a1", team: "A", slot: 1, bot: true }, { id: "b1", team: "B", slot: 1, bot: true }] : [])];
const bolaEm = (x, y, z, extra = {}) => ({ x, y, z, vx: 0, vy: -1, vz: 0, efeito: 0, viva: true, ultimo: null, por: null, time: null, toques: 0, tToque: -1e9, ...extra });

test("futevolei: o golpe sai pela altura e pelo lugar da bola (e o Shark Attack é com o pé, no alto perto da rede)", () => {
  const j = { team: "A", x: 0, z: 5 }; // olha para a rede (−z): "na frente" é z menor
  const g = (x, y, z, int = "passe") => F.golpeDe(j, bolaEm(x, y, z), int);
  assert.strictEqual(g(0, 1.8, 4.6), "cabeca");
  assert.strictEqual(g(0, 1.3, 4.6), "peito");
  assert.strictEqual(g(0, 0.4, 4.6), "frente");
  assert.strictEqual(g(0.7, 0.4, 4.8), "lado");
  assert.strictEqual(g(0.1, 0.5, 5.5), "calcanhar"); // atrás do corpo
  assert.strictEqual(g(0.7, 0.5, 5.5), "letra");     // atrás e de lado
  assert.strictEqual(g(0.6, 0.8, 4.8, "ataque"), "voleio");
  assert.strictEqual(g(0.6, 0.8, 4.8, "passe"), "lado"); // voleio, bicicleta e shark só atacando
  assert.strictEqual(g(0, 1.8, 5.4, "ataque"), "bicicleta");
  const rede = { team: "A", x: 0, z: 1.5 };
  assert.strictEqual(F.golpeDe(rede, bolaEm(0, 2.7, 1.3), "ataque"), "shark");
  assert.strictEqual(F.golpeDe(rede, bolaEm(0, 2.7, 1.3), "passe"), "cabeca");
  assert.ok(F.GOLPES.shark.ataque && !F.GOLPES.cabeca.ataque);
});

test("futevolei: no máximo 3 toques por time, ninguém toca duas vezes seguidas em duplas, e a bola subindo alto espera", () => {
  const m = F.novaPartida(jogadores(true), { duplas: true, pontos: 15 }, 0);
  m.fase = "jogo"; m.t = 10000;
  const a0 = m.jogadores.find((j) => j.id === "a0"), a1 = m.jogadores.find((j) => j.id === "a1");
  Object.assign(a0, { x: 0, z: 4 }); Object.assign(a1, { x: 2, z: 4 });
  m.bola = bolaEm(0.3, 1.2, 4);
  assert.ok(F.alcanca(m, a0));
  F.tocar(m, a0, "passe", null, rngFixo(3));
  assert.strictEqual(m.bola.toques, 1);
  m.t += 1000; Object.assign(m.bola, { x: 0.2, y: 1.2, z: 4, vy: -1 });
  assert.ok(!F.alcanca(m, a0), "o mesmo jogador não toca duas vezes seguidas");
  m.bola.toques = 3; m.bola.por = "b0"; Object.assign(a1, { x: 0, z: 4 });
  assert.ok(!F.alcanca(m, a1), "4º toque não vale");
  m.bola.toques = 1; Object.assign(m.bola, { y: 2.2, vy: 4 });
  assert.ok(!F.alcanca(m, a1), "bola subindo no alto: espera descer");
});

test("futevolei: o passe vai para o parceiro sem passar a rede; o ataque passa por cima da rede", () => {
  const m = F.novaPartida(jogadores(true), { duplas: true, pontos: 15 }, 0);
  m.fase = "jogo"; m.t = 5000;
  const a0 = m.jogadores.find((j) => j.id === "a0"), a1 = m.jogadores.find((j) => j.id === "a1");
  Object.assign(a0, { x: -2, z: 6 }); Object.assign(a1, { x: 2, z: 5 });
  m.bola = bolaEm(-2, 1.0, 5.8);
  F.tocar(m, a0, "passe", null, rngFixo(7));
  const q = F.queda(m.bola);
  assert.ok(q && q.z > 0, "o passe cai do nosso lado");
  assert.ok(Math.hypot(q.x - a1.x, q.z - a1.z) < 3.5, `o passe chega perto do parceiro (${q.x.toFixed(1)}, ${q.z.toFixed(1)})`);
  for (const golpe of ["frente", "cabeca", "shark", "bicicleta"]) {
    const c = { x: 0, y: golpe === "shark" ? 2.6 : 1.0, z: golpe === "shark" ? 1.4 : 6 };
    const T = F.GOLPES[golpe].T[1], v = F.lancar(c, { x: 1, y: F.Q.R, z: -6 }, T, F.GOLPES[golpe].efeito, true);
    const f = F.voar(c, v, v.efeito, T * 3);
    assert.ok(f.minRede > F.Q.REDE, `${golpe} passa por cima da rede`);
  }
});

test("futevolei: a bola na areia — dentro, perde o lado em que caiu; fora, perde quem tocou por último; placar com 2 de vantagem", () => {
  const m = F.novaPartida(jogadores(false), { duplas: false, pontos: 10 }, 0);
  const cai = (x, z, ultimo) => { m.fase = "jogo"; m.bola = bolaEm(x, 0.14, z, { vy: -5, ultimo, time: ultimo, toques: 1 }); m.t += 3000; F.passo(m, 1 / 60, m.t); return m.ev.splice(0).find((e) => e.tipo === "ponto"); };
  assert.strictEqual(cai(1, -4, "A").time, "A");             // o ataque do A caiu dentro do lado do B
  assert.strictEqual(cai(1, 4, "B").time, "B");
  assert.strictEqual(cai(7, -4, "A").time, "B");             // fora: perde quem tocou
  m.placar = { A: 9, B: 9 }; cai(1, -4, "A");
  assert.ok(!m.fim, "10 x 9 ainda não acabou");
  cai(1, -4, "A");
  assert.ok(m.fim && m.vencedor === "A", "11 x 9 acaba");
});

test("futevolei: robô contra robô joga partidas inteiras, com trocas de bola e golpes variados", () => {
  for (const duplas of [true, false]) {
    const m = F.novaPartida(jogadores(duplas), { duplas, pontos: 10, dif: "medio" }, 0), rnd = rngFixo(duplas ? 11 : 5);
    let t = 0, toques = 0, pontos = 0; const golpes = new Set();
    for (let i = 0; i < 60 * 60 * 20 && !m.fim; i++) { t += 1000 / 60; F.passo(m, 1 / 60, t, rnd); for (const e of m.ev.splice(0)) { if (e.tipo === "toque") { toques++; golpes.add(e.golpe); } if (e.tipo === "ponto") pontos++; } }
    assert.ok(m.fim, "a partida acaba");
    assert.ok(toques / pontos > 3, `trocas de bola (${(toques / pontos).toFixed(1)} toques por ponto)`);
    assert.ok(golpes.has("saque") && golpes.has("cabeca") && golpes.size >= 4, [...golpes].join());
  }
});

test("futevolei: partida pelo servidor — robôs completam, o meu toque arma o saque e o organizador volta para a sala", async () => {
  const srv = await subirServidor();
  const a = await conectar(srv.url, "/futevolei");
  try {
    await pedir(a, "create", { name: "Ana", config: { duplas: true, pontos: 10, dif: "facil" } });
    let st = await esperarEstado(a, (s) => s.players.length === 1);
    assert.strictEqual(st.players[0].team, "A");
    await pedir(a, "act", { type: "start" });
    st = await esperarEstado(a, (s) => s.phase === "play" && s.match);
    assert.strictEqual(st.match.jogadores.length, 4);
    assert.strictEqual(st.match.jogadores.filter((j) => j.bot).length, 3);
    // os pacotes chegam (bola e jogadores) e o toque armado do humano aparece no pacote
    const snap = await new Promise((ok) => a.once("snap", ok));
    assert.ok(Array.isArray(snap.b) && snap.j.length === 4);
    await new Promise((ok) => setTimeout(ok, 1700));
    const toques = [];
    a.on("ev", (lista) => toques.push(...lista));
    a.emit("toque", { tipo: "passe", mx: 0, mz: 0 }); // sou eu que saco: o primeiro toque é o saque
    await new Promise((ok) => setTimeout(ok, 2200)); // apertou antes da hora: o saque sai assim que puder
    assert.ok(toques.some((e) => e.tipo === "toque" && e.golpe === "saque"), "o saque saiu");
    await pedir(a, "act", { type: "lobby" });
    await esperarEstado(a, (s) => s.phase === "lobby");
  } finally { a.close(); await srv.parar(); }
});
