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

test("vila: quem está de carro ou dentro de um estádio chega assim para os outros (estádio desconhecido vira a rua)", async () => {
  const a = await conectar(srv.url, "/vila");
  const me = new Promise((ok) => a.once("me", ok));
  a.emit("hello", { name: "Motora", x: 250, y: 107, z: "", car: true });
  await me;
  const b = await conectar(srv.url, "/vila");
  const visto = new Promise((ok) => b.once("all", ok));
  b.emit("hello", { name: "Torcedor" });
  const outro = (await visto).find((p) => p.name === "Motora");
  assert.strictEqual(outro.car, true);
  assert.strictEqual(outro.x, 250, "o mapa grande aceita posições fora da vila");
  const andou = new Promise((ok) => b.once("move", ok));
  a.emit("move", { x: 24, y: 29, dir: "up", z: "morumbis", car: false });
  const m = await andou;
  assert.strictEqual(m.z, "morumbis"); assert.strictEqual(m.car, false);
  const andou2 = new Promise((ok) => b.once("move", ok));
  a.emit("move", { x: 24, y: 28, dir: "up", z: "maracana" });
  assert.strictEqual((await andou2).z, "");
  [a, b].forEach((s) => s.close());
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

// ---------- Tênis ----------
test("tênis: duplas com 1 humano e 3 robôs; o humano arma golpes e os pontos acontecem", async () => {
  const m = await mesa("/tenis", 1, { duplas: true, games: 2, dif: "facil", bots: true });
  try {
    const s = m.host;
    await pedir(s, "act", { type: "team", team: "A" });
    await pedir(s, "act", { type: "start" });
    const st = await esperarEstado(s, (st) => st.phase === "play");
    assert.strictEqual(st.match.jogadores.length, 4);
    assert.strictEqual(st.match.jogadores.filter((j) => j.bot).length, 3);
    // o humano fica no lugar dele e aperta o golpe de vez em quando (também saca quando é a vez)
    let eu = null;
    s.on("snap", (sn) => { const j = sn.j.find((x) => x[0] === st.match.jogadores.find((y) => !y.bot).id); if (j) eu = j; });
    const loop = setInterval(() => { if (eu) s.emit("st", { x: eu[1], z: eu[2], vx: 0, vz: 0, mx: 0, mz: 0 }); s.emit("golpe", { tipo: "top", mx: 0, mz: 0 }); }, 300);
    const pontos = await new Promise((ok) => {
      let n = 0; const t = setTimeout(() => ok(n), 40000);
      s.on("ev", (lista) => { n += lista.filter((e) => e.tipo === "ponto").length; if (n >= 2) { clearTimeout(t); ok(n); } });
    });
    clearInterval(loop);
    assert.ok(pontos >= 2, `pontos: ${pontos}`);
  } finally { m.fechar(); }
});

// ---------- Pingue-pongue ----------
// Quem bate manda a batida e o servidor repassa; o ponto só vale se vier de quem está recebendo.
test("pingpong: dois na mesa, o saque chega no outro e só quem recebe marca o ponto", async () => {
  const P = require("../public/pingpong/regras.js");
  const m = await mesa("/pingpong", 2, { pontos: 11, games: 1 });
  try {
    const [a, b] = m.todos;
    let st = await esperarEstado(a, (s) => s.lados[0] === a.pid && s.lados[1] === b.pid);
    await pedir(a, "act", { type: "start" });
    st = await esperarEstado(a, (s) => s.phase === "jogo");
    const lados = [a, b], sac = lados[st.placar.sacador], rec = lados[1 - st.placar.sacador];
    await new Promise((ok) => setTimeout(ok, Math.max(0, st.prontoEm - st.now) + 50));
    const chegou = new Promise((ok) => rec.once("bola", ok));
    const bola = P.sacar(st.placar.sacador, 0, 0);
    sac.emit("bola", { p: bola.p, v: bola.v, saque: true, t: Date.now(), w: [0.5, 9] }); // efeito: o servidor limita
    const d = await chegou;
    assert.strictEqual(d.quem, st.placar.sacador); assert.strictEqual(d.saque, true); assert.deepStrictEqual(d.w, [0.5, 1.2]);
    sac.emit("ponto", { vence: st.placar.sacador, motivo: "trapaça" }); // quem sacou não decide
    rec.emit("ponto", { vence: st.placar.sacador, motivo: "não devolveu" });
    const depois = await esperarEstado(a, (s) => s.ultimo && s.ultimo.motivo === "não devolveu");
    assert.deepStrictEqual(depois.placar.pts[st.placar.sacador], 1);
    assert.strictEqual(depois.placar.pts[0] + depois.placar.pts[1], 1);
  } finally { m.fechar(); }
});

// ---------- Rumi ----------
// Na vez de alguém, os outros veem a mesa mexendo ao vivo (o rascunho), antes de confirmar.
test("rumi: quem está na vez mexe e os outros recebem o rascunho ao vivo (com as peças da mesa que ele pegou)", async () => {
  const m = await mesa("/rumi", 2, { robos: 0 });
  try {
    const [a, b] = m.todos;
    await pedir(a, "act", { type: "start" });
    const st = await esperarEstado(a, (s) => s.phase === "jogando");
    const vez = st.rodada.vez === a.pid ? a : b, outro = vez === a ? b : a;
    const meu = await esperarEstado(vez, (s) => s.minhaMao && s.rodada);
    const ids = meu.minhaMao.slice(0, 3).map((t) => t.id);
    const chegou = new Promise((ok) => outro.once("rascunho", ok));
    vez.emit("rascunho", { mesa: [ids], pegando: [ids[0], 99999] });
    const d = await chegou;
    assert.strictEqual(d.quem, vez.pid);
    assert.deepStrictEqual(d.mesa[0].map((t) => t.id), ids);
    assert.deepStrictEqual(d.pegando, [ids[0]]); // só o que está na mesa do rascunho
    outro.emit("rascunho", { mesa: [] }); // quem não está na vez não mexe
    await new Promise((ok) => setTimeout(ok, 200));
  } finally { m.fechar(); }
});

// ---------- Palavra Proibida ----------
// Entre uma vez e outra: intervalo com as cartas da vez, o "não valeu" e a próxima só começa quando quem explica quer.
test("proibida: intervalo entre as vezes — mostra as cartas, o outro time anula um ponto e quem explica começa a vez", async () => {
  const m = await mesa("/proibida", 4, { tempo: 60, meta: 30 });
  try {
    const t = m.todos;
    await pedir(t[0], "act", { type: "team", team: "A" }); await pedir(t[1], "act", { type: "team", team: "A" });
    await pedir(t[2], "act", { type: "team", team: "B" }); await pedir(t[3], "act", { type: "team", team: "B" });
    await pedir(t[0], "act", { type: "start" });
    const st = await esperarEstado(t[0], (s) => s.phase === "jogando" && s.vez);
    const quem = t.find((s) => s.pid === st.vez.quem), fiscal = t.find((s) => s.pid !== st.vez.quem && s !== quem && (st.players.find((p) => p.id === s.pid).team !== st.vez.time));
    const parceiro = t.find((s) => s !== quem && st.players.find((p) => p.id === s.pid).team === st.vez.time);
    await pedir(quem, "act", { type: "acertou" }); await pedir(quem, "act", { type: "acertou" });
    await pedir(quem, "act", { type: "passar" });
    const iv = (await esperarEstado(t[0], (s) => s.intervalo)).intervalo;
    assert.strictEqual(iv.time, st.vez.time); assert.strictEqual(iv.cartas.length, 3);
    assert.deepStrictEqual(iv.cartas.map((c) => c.res), ["acertou", "acertou", "passou"]);
    assert.ok(iv.cartas.every((c) => c.carta.length === 6), "todo mundo vê as palavras das cartas da vez");
    await assert.rejects(pedir(parceiro, "act", { type: "naoValeu", i: 0 })); // quem jogou não confere os próprios pontos
    await pedir(fiscal, "act", { type: "naoValeu", i: 0 });
    const depois = await esperarEstado(t[0], (s) => s.intervalo && s.intervalo.cartas[0].anulada);
    assert.strictEqual(depois.placar[st.vez.time], 1);
    // a próxima vez não começa sozinha: só quando quem vai explicar aperta
    const prox = t.find((s) => s.pid === iv.proxQuem), outro = t.find((s) => s.pid !== iv.proxQuem && s !== t[0]);
    await new Promise((ok) => setTimeout(ok, 300));
    assert.ok((await esperarEstado(t[0], (s) => true)).intervalo, "ainda no intervalo");
    await assert.rejects(pedir(outro, "act", { type: "comecar" }));
    await pedir(prox, "act", { type: "comecar" });
    const nova = await esperarEstado(t[0], (s) => s.vez && !s.intervalo);
    assert.strictEqual(nova.vez.quem, iv.proxQuem); assert.notStrictEqual(nova.vez.time, st.vez.time);
  } finally { m.fechar(); }
});

test("proibida: as cartas não se repetem de uma partida para a outra (o monte continua)", async () => {
  // 2 partidas de 120 cartas cada (passando a vez rapidinho): embaralhando tudo de novo a cada partida, quase certo
  // que alguma voltaria
  const m = await mesa("/proibida", 4, { tempo: 60, meta: 30 });
  try {
    const t = m.todos, vistas = [];
    await pedir(t[0], "act", { type: "team", team: "A" }); await pedir(t[1], "act", { type: "team", team: "A" });
    await pedir(t[2], "act", { type: "team", team: "B" }); await pedir(t[3], "act", { type: "team", team: "B" });
    for (let partida = 0; partida < 2; partida++) {
      await pedir(t[0], "act", { type: "start" });
      for (let i = 0; i < 120; i++) {
        const st = await esperarEstado(t[0], (s) => s.phase === "jogando" && s.vez && !s.intervalo);
        await pedir(t.find((s) => s.pid === st.vez.quem), "act", { type: "passar" });
        const iv = (await esperarEstado(t[0], (s) => s.intervalo)).intervalo;
        vistas.push(iv.cartas[0].carta[0]);
        await pedir(t[0], "act", { type: "comecar" });
      }
      await pedir(t[0], "act", { type: "lobby" });
      await esperarEstado(t[0], (s) => s.phase === "lobby");
    }
    assert.strictEqual(vistas.length, 240);
    assert.strictEqual(new Set(vistas).size, vistas.length, "nenhuma carta repetida nas duas partidas");
  } finally { m.fechar(); }
});

// ---------- Noite da Galera ----------
// A noite junta as salas: quem está na mesma sala cai na mesma noite; "chamar" leva todo mundo para a sala nova de
// outro jogo; e o fim de uma partida soma no placar da noite.
test("noite: mesma noite para a sala, chamar para outro jogo leva a galera e a vitória entra no placar", async () => {
  const pp = await mesa("/pingpong", 2, { pontos: 11, games: 1 });
  const na = await conectar(srv.url, "/noite"), nb = await conectar(srv.url, "/noite");
  try {
    const [a, b] = pp.todos; // J1 e J2
    const ra = await pedir(na, "sala", { jogo: "pingpong", sala: pp.code, nome: "J1" });
    const rb = await pedir(nb, "sala", { jogo: "pingpong", sala: pp.code, nome: "J2" });
    assert.strictEqual(ra.id, rb.id, "os dois na mesma noite");
    // uma partida de pingue-pongue até 11: quem recebe diz que o sacador fez o ponto
    const P = require("../public/pingpong/regras.js");
    const resultado = new Promise((ok) => nb.once("resultado", ok));
    await pedir(a, "act", { type: "start" });
    await esperarEstado(a, (s) => s.phase === "jogo");
    for (let i = 0; i < 40; i++) {
      const st = await esperarEstado(a, (s) => s.phase === "fim" || s.phase === "jogo");
      if (st.phase === "fim") break;
      const sac = st.placar.sacador, lados = [a, b], bola = P.sacar(sac, 0, 0);
      await new Promise((ok) => setTimeout(ok, Math.max(0, st.prontoEm - Date.now()) + 30));
      const quem = st.lados.indexOf(a.pid) === sac ? a : b, rec = quem === a ? b : a;
      quem.emit("bola", { p: bola.p, v: bola.v, saque: true, t: Date.now() });
      await new Promise((ok) => setTimeout(ok, 40));
      rec.emit("ponto", { vence: st.lados.indexOf(a.pid), motivo: "teste" }); // J1 ganha todos
      await esperarEstado(a, (s) => s.phase === "fim" || (s.ultimo && (!st.ultimo || s.ultimo.t !== st.ultimo.t)));
    }
    const r = await resultado;
    assert.deepStrictEqual(r.ganhadores, ["J1"]);
    const noite = await new Promise((ok) => { nb.once("noite", ok); nb.emit("sala", { jogo: "pingpong", sala: pp.code, nome: "J2" }); });
    assert.deepStrictEqual(noite.ranking.map((x) => [x.nome, x.v, x.d]), [["J1", 1, 0], ["J2", 0, 1]]);
    assert.ok(noite.ranking[0].titulos.some((t) => t.includes("Campeão")));
    // J1 chama para o Truco: J2 fica sabendo; J1 abre a sala do Truco e J2 recebe o destino
    const chamado = new Promise((ok) => nb.once("chamado", ok));
    await pedir(na, "chamar", { jogo: "truco" });
    assert.strictEqual((await chamado).quem, "J1");
    const destino = new Promise((ok) => nb.once("destino", ok));
    await pedir(na, "sala", { jogo: "truco", sala: "TRUCO", nome: "J1", noite: ra.id });
    const d = await destino;
    assert.deepStrictEqual([d.jogo, d.sala, d.noite], ["truco", "TRUCO", ra.id]);
  } finally { pp.fechar(); na.close(); nb.close(); }
});
