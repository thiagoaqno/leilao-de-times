// Testes de servidor: sobe o server.js de verdade e joga com clientes do Socket.io (sem navegador).
const test = require("node:test");
const assert = require("node:assert");
const R = require("../public/domino/regras.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

let srv;
test.before(async () => { srv = await subirServidor({ DOMINO_PASS_MS: "60" }); });
test.after(async () => { await srv.parar(); });

// Abre uma mesa com n jogadores; devolve os sockets (o primeiro é o organizador) com .id de cada um.
async function mesa(canal, n, config, extra = {}) {
  const host = await conectar(srv.url, canal);
  const r = await pedir(host, "create", { name: "J1", config, ...extra });
  host.pid = r.id; host.token = r.token;
  const todos = [host];
  for (let i = 2; i <= n; i++) {
    const s = await conectar(srv.url, canal);
    s.pid = (await pedir(s, "join", { code: r.code, name: "J" + i, ...extra })).id;
    todos.push(s);
  }
  return { code: r.code, host, todos, fechar: () => todos.forEach((s) => s.close()) };
}

// ---------- Dominó ----------
// Cada cliente joga sozinho: na sua vez, a pedra obrigatória, ou a primeira que encaixa, ou compra do monte.
// Sem pedra e sem compra, o servidor passa a vez sozinho.
function jogadorAutomatico(s) {
  let ocupado = false;
  const joga = async (st) => {
    const h = st.hand;
    if (ocupado || st.phase !== "playing" || !h || h.turn !== s.pid) return;
    const mao = st.myHand || [];
    const pedra = h.mustOpen != null ? mao.find((t) => t.id === h.mustOpen) : mao.find((t) => R.sides(t, h.ends).length);
    if (!pedra && !(h.compra && h.dorme > 0)) return; // o servidor passa sozinho
    ocupado = true;
    try {
      if (pedra) await pedir(s, "act", { type: "play", id: pedra.id, side: R.sides(pedra, h.ends)[0] });
      else await pedir(s, "act", { type: "buy" });
    } catch { /* estado velho: o próximo "state" corrige */ }
    ocupado = false;
    if (s.ultimo !== st) joga(s.ultimo); // o "state" novo pode ter chegado enquanto esperava a resposta
  };
  s.on("state", joga);
}

const CASOS = [
  ["dupla", 4, { mode: "dupla" }],
  ["cada um por si, 2 com compra", 2, { mode: "individual", compra: true }],
  ["cada um por si, 3 sem compra", 3, { mode: "individual", compra: false }],
  ["cada um por si, 4", 4, { mode: "individual" }],
  ["burrinho com 2", 2, { mode: "burrinho" }],
  ["burrinho com 6", 6, { mode: "burrinho" }],
];
for (const [nome, n, config] of CASOS) {
  test(`dominó: ${nome} — uma mão inteira até alguém bater ou fechar`, async () => {
    const m = await mesa("/domino", n, { ...config, timer: 20 });
    try {
      const lobby = await esperarEstado(m.host, (st) => st.players.length === n);
      assert.strictEqual(lobby.phase, "lobby");
      m.todos.forEach(jogadorAutomatico);
      await pedir(m.host, "act", { type: "start" });
      const fim = await esperarEstado(m.host, (st) => st.phase === "handEnd" || st.phase === "ended", 60000);
      const res = fim.hand.result;
      assert.ok(res, "a mão tem resultado");
      assert.ok(["Batida", "Carroça", "Lá-e-lô", "Cruzada", "Fechado"].includes(res.kind), `resultado ${res.kind}`);
      // no fim todo mundo vê as pedras de todo mundo
      assert.strictEqual(Object.keys(fim.hand.reveal).length, n);
      if (res.kind !== "Fechado") assert.ok(Object.values(fim.hand.reveal).some((mao) => mao.length === 0), "alguém bateu");
      assert.strictEqual(fim.score.length, config.mode === "dupla" ? 2 : n);
    } finally { m.fechar(); }
  });
}

test("dominó: código errado, nome repetido, mesa cheia e só assistir", async () => {
  const m = await mesa("/domino", 6, { mode: "burrinho" });
  try {
    const s = await conectar(srv.url, "/domino");
    await assert.rejects(pedir(s, "join", { code: "ZZZZZ", name: "X" }), /Mesa não encontrada/);
    await assert.rejects(pedir(s, "join", { code: m.code, name: "j2" }), /A mesa já tem 6 jogadores/);
    const v = await pedir(s, "join", { code: m.code, watch: true });
    assert.strictEqual(v.id, null);
    s.close();
    // reconexão: com o token certo volta a ser o mesmo jogador; com o errado, é gente nova (e a mesa está cheia)
    const host2 = await conectar(srv.url, "/domino");
    await assert.rejects(pedir(host2, "join", { code: m.code, id: m.host.pid, token: "errado", name: "Outro" }), /A mesa já tem 6/);
    const r = await pedir(host2, "join", { code: m.code.toLowerCase(), id: m.host.pid, token: m.host.token });
    assert.strictEqual(r.id, m.host.pid);
    host2.close();
  } finally { m.fechar(); }
});

// ---------- Botão ----------
test("botão: 7 tampinhas por time geram 15 peças", async () => {
  const m = await mesa("/botao", 2, { tampinhas: 7 });
  try {
    await esperarEstado(m.host, (st) => st.players.length === 2 && st.players.every((p) => p.team != null));
    await pedir(m.host, "act", { type: "start" });
    const st = await esperarEstado(m.host, (st) => st.g && st.g.pieces);
    assert.strictEqual(st.config.tampinhas, 7);
    assert.strictEqual(st.g.pieces.length, 15);
    assert.strictEqual(st.g.pieces.filter((p) => p.k === "ball").length, 1);
  } finally { m.fechar(); }
});

// ---------- Pelada ----------
test("pelada: com bots e 1 humano, começa 5x5 e os bots mexem a bola", async () => {
  const m = await mesa("/pelada", 1, { bots: true, size: 5, troca: false });
  try {
    const s = m.host;
    await pedir(s, "act", { type: "team", team: "A" });
    await pedir(s, "act", { type: "start" });
    const st = await esperarEstado(s, (st) => st.phase === "play");
    assert.strictEqual(st.players.length, 10);
    assert.strictEqual(st.players.filter((p) => p.bot).length, 9);
    assert.deepStrictEqual(["A", "B"].map((t) => st.players.filter((p) => p.team === t).length), [5, 5]);
    // o humano fica parado no lugar da saída; em ~20 s os bots tiram a bola do meio
    const me = st.players.find((p) => !p.bot);
    const parado = setInterval(() => me.spawn && s.emit("st", { x: me.spawn[0], y: 0, z: me.spawn[2], vx: 0, vy: 0, vz: 0, yaw: me.spawn[3], pitch: 0, f: 0 }), 100);
    const andou = await new Promise((ok) => {
      const t = setTimeout(() => ok(0), 25000);
      s.on("snap", (sn) => { const d = Math.hypot(sn.b[0], sn.b[2]); if (d > 3) { clearTimeout(t); ok(d); } });
    });
    clearInterval(parado);
    assert.ok(andou > 3, "a bola saiu do meio");
  } finally { m.fechar(); }
});

// ---------- Vila e Leilão (as salas deles são diferentes; só o básico) ----------
test("vila: chega com nome de até 8 letras, recebe id e token, e outra aba com o mesmo token assume o jogador", async () => {
  const a = await conectar(srv.url, "/vila");
  const me = new Promise((ok) => a.once("me", ok));
  a.emit("hello", { name: "  Fulano   de   Tal  ", look: 2 });
  const r = await me;
  assert.match(r.id, /^[0-9a-f]{12}$/);
  assert.match(r.token, /^[0-9a-f]{32}$/);
  const b = await conectar(srv.url, "/vila");
  const visto = new Promise((ok) => b.once("all", ok));
  b.emit("hello", { name: "Beltrano" });
  assert.deepStrictEqual((await visto).map((p) => p.name), ["Fulano d"]);
  const a2 = await conectar(srv.url, "/vila");
  const volta = new Promise((ok) => a2.once("me", ok));
  a2.emit("hello", { name: "Fulano", token: r.token });
  assert.strictEqual((await volta).id, r.id);
  [a, a2, b].forEach((s) => s.close());
});

test("leilão: cria sala, código errado, entra pelo código em minúscula e reconecta pelo token", async () => {
  const host = await conectar(srv.url, "");
  const sala = await pedir(host, "create", { players: "A\nB\nC\nD", perTeam: 2, coins: 10 });
  assert.match(sala.code, /^[A-HJ-NP-Z2-9]{5}$/);
  const c = await conectar(srv.url, "");
  await assert.rejects(pedir(c, "join", { code: "ZZZZZ", name: "X" }), /Sala não encontrada/);
  const cap = await pedir(c, "join", { code: ` ${sala.code.toLowerCase()} `, name: "Capitão" });
  assert.ok(cap.capId && cap.capToken);
  await assert.rejects(pedir(c, "join", { code: sala.code, name: "capitão" }), /Já existe alguém com esse nome/);
  const c2 = await conectar(srv.url, "");
  assert.strictEqual((await pedir(c2, "join", { code: sala.code, capToken: cap.capToken })).capId, cap.capId);
  [host, c, c2].forEach((s) => s.close());
});
