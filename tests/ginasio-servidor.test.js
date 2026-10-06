// O servidor real recebe os comandos de clientes Socket.io e decide a batalha.
const test = require("node:test");
const assert = require("node:assert/strict");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");
const G = require("../public/ginasio/regras.js");
const Galeramon = require("../public/galeramon/dados.js");
const PokeDex = require("../public/galeramon/pokemon.js");

let srv;
test.before(async () => { srv = await subirServidor({ NODE_ENV: "test", GINASIO_TICK_MS: "1" }); });
test.after(async () => { await srv.parar(); });

function esperarEvento(s, evento, cond = () => true, ms = 10000) {
  return new Promise((ok, erro) => {
    const t = setTimeout(() => { s.off(evento, receber); erro(new Error(`Tempo esgotado: ${evento}`)); }, ms);
    function receber(d) { if (cond(d)) { clearTimeout(t); s.off(evento, receber); ok(d); } }
    s.on(evento, receber);
  });
}

async function abrir(t, config = {}, quantidade = 2, times = []) {
  const mesa = { todos: [], host: null, code: null };
  t.after(async () => {
    if (mesa.host?.connected) await pedir(mesa.host, "act", { type: "lobby" });
    mesa.todos.forEach((s) => s.close());
  });
  mesa.conectar = async (canal = "/ginasio") => {
    const s = await conectar(srv.url, canal);
    mesa.todos.push(s);
    s.on("png", (cb) => cb());
    return s;
  };
  for (let i = 0; i < quantidade; i++) {
    const s = await mesa.conectar();
    const dados = { name: `Pessoa${i + 1}`, ...(times[i] && { time: times[i] }) };
    const r = i === 0 ? await pedir(s, "create", { ...dados, config }) : await pedir(s, "join", { ...dados, code: mesa.code });
    s.pid = r.id; s.token = r.token;
    if (i === 0) { mesa.host = s; mesa.code = r.code; }
  }
  return mesa;
}

const envio = (seq, extra = {}) => ({ seq, dx: 0, dy: 0, mira: { x: 1, y: 0 }, ...extra });

test("ginásio/servidor: lobby, permissões, lados e times separados por modo", async (t) => {
  const m = await abrir(t, { formato: "2x2", bots: false }, 3);
  const [a, b, c] = m.todos;
  let st = await esperarEstado(a, (s) => s.players.length === 3);
  assert.deepEqual(st.players.map((p) => p.lado), [0, 1, 0]);
  assert.equal(JSON.stringify(st).includes(a.token), false, "o token nunca aparece no estado público");
  await assert.rejects(pedir(b, "create", { name: { toString: null } }), /seu nome/);
  await assert.rejects(pedir(b, "join", { code: { toString: null }, name: "Pessoa2" }), /Sala não encontrada/);
  await assert.rejects(pedir(b, "act", { type: "config", config: { bots: true } }), /Só o organizador/);
  await assert.rejects(pedir(b, "act", { type: "start" }), /Só o organizador/);
  await assert.rejects(pedir(a, "act", { type: "start" }), /Faltam jogadores/);
  await assert.rejects(pedir(b, "act", { type: "lado", lado: 0 }), /cheio/);
  await assert.rejects(pedir(a, "act", { type: "time", time: ["saci", "saci", "sirizao"] }), /3 bichos diferentes/);
  await assert.rejects(pedir(a, "act", { type: "time", time: ["__proto__", "saci", "sirizao"] }), /3 bichos diferentes/);
  await assert.rejects(pedir(a, "act", { type: "time", time: ["charizard", "blastoise", "venusaur"] }), /desse modo/);
  const galera = ["saci", "sirizao", "pasteletrico"], pokemon = ["mewtwo", "kyogre", "dialga"];
  await pedir(a, "act", { type: "time", time: galera });
  await pedir(a, "act", { type: "config", config: { modo: "pokemon" } });
  st = await esperarEstado(a, (s) => s.config.modo === "pokemon");
  assert.deepEqual(st.players[0].time, PokeDex.DEFAULT_TEAM);
  await pedir(a, "act", { type: "time", time: pokemon });
  await pedir(a, "act", { type: "config", config: { modo: "galeramon", formato: "1x1" } });
  st = await esperarEstado(a, (s) => s.config.formato === "1x1");
  assert.deepEqual(st.players[0].time, galera);
  assert.equal(st.players.find((p) => p.id === c.pid).lado, null, "o segundo jogador sai do lado ao reduzir para 1x1");
  await pedir(a, "act", { type: "config", config: { modo: "pokemon" } });
  st = await esperarEstado(a, (s) => s.config.modo === "pokemon");
  assert.deepEqual(st.players[0].time, pokemon);
  await pedir(a, "act", { type: "start" });
  st = await esperarEstado(a, (s) => s.phase === "play");
  assert.equal(st.match.jogadores.length, 2);
  assert.ok(st.match.jogadores.every((p) => !p.bot));
  assert.equal(st.match.duracao, G.TEMPO_MAX);
  await assert.rejects(pedir(a, "act", { type: "time", time: pokemon }), /fora do jogo/);
  await assert.rejects(pedir(a, "act", { type: "config", config: { modo: "galeramon" } }), /fora do jogo/);
  await assert.rejects(pedir(b, "act", { type: "lado", lado: null }), /fora do jogo/);
});

test("ginásio/servidor: comandos têm sequência, limite de movimento e ações de um único uso", async (t) => {
  const m = await abrir(t, { bots: false });
  const [a, b] = m.todos;
  const eventos = [];
  a.on("ev", (lista) => eventos.push(...lista));
  await pedir(a, "act", { type: "start" });
  const inicial = await esperarEvento(a, "snap", (s) => s.tempo > 0);
  const eu = inicial.entidades.find((e) => e.id === a.pid), outro = inicial.entidades.find((e) => e.id === b.pid);
  a.emit("cmd", envio(0, { dx: 10000, mira: { x: 0, y: 1 }, golpe: 1, id: b.pid, hp: 999999, x: 999999 }));
  let sn = await esperarEvento(a, "snap", (s) => s.seq === 0);
  let depois = sn.entidades.find((e) => e.id === a.pid);
  assert.ok(depois.x > eu.x, "o motor andou com o comando");
  assert.ok(depois.x - eu.x <= 4.5 * sn.tempo + 0.001, "o cliente não aumenta a velocidade");
  assert.deepEqual(depois.mira, { x: 0, y: 1 });
  assert.equal(depois.hp, eu.hp, "o cliente não decide a vida");
  assert.deepEqual(sn.entidades.find((e) => e.id === b.pid).mira, outro.mira, "o id enviado não controla o adversário");
  a.emit("cmd", envio(0, { golpe: 1 }));
  a.emit("cmd", envio(-1, { golpe: 1 }));
  a.emit("cmd", envio(1, { dx: NaN }));
  a.emit("cmd", envio(1, { mira: { x: Infinity, y: 0 } }));
  a.emit("cmd", envio(1, { golpe: 4 }));
  a.emit("cmd", envio(1, { troca: 3 }));
  a.emit("cmd", envio(1, { alvo: { x: null, y: 0 } }));
  a.emit("cmd", null);
  a.emit("cmd", [envio(1)]);
  sn = await esperarEvento(a, "snap", (s) => s.tempo > inicial.tempo + 8);
  assert.equal(sn.seq, 0, "pacotes inválidos ou repetidos não são confirmados");
  assert.equal(eventos.filter((e) => e.tipo === "golpe" && e.id === a.pid).length, 1, "o ataque não repete quando a recarga acaba");
  const area = eventos.find((e) => e.tipo === "area");
  assert.ok(area && area.aviso === 0.7 && area.elemento === "Fogo", "o aviso nasce com posição, elemento e duração");
  assert.ok(eventos.some((e) => e.tipo === "explosao" && e.id === area.id));
  a.emit("cmd", envio(1));
  sn = await esperarEvento(a, "snap", (s) => s.seq === 1);
  depois = sn.entidades.find((e) => e.id === a.pid);
  assert.ok([depois.x, depois.y, depois.hp, ...depois.cds].every(Number.isFinite));
  assert.ok(Math.abs(depois.x) <= G.ARENA.w / 2 && Math.abs(depois.y) <= G.ARENA.h / 2);
});

test("ginásio/servidor: reconecta no meio da batalha e reinicia a sequência do cliente", async (t) => {
  const m = await abrir(t, { bots: false });
  const [a, b] = m.todos;
  await pedir(a, "act", { type: "start" });
  await esperarEvento(a, "snap", (s) => s.tempo > 0);
  a.emit("cmd", envio(100));
  const anterior = await esperarEvento(a, "snap", (s) => s.seq === 100);
  a.close();
  await esperarEstado(b, (s) => !s.players.find((p) => p.id === a.pid).online);
  const volta = await m.conectar();
  const r = await pedir(volta, "join", { code: m.code, id: a.pid, token: a.token });
  m.host = volta;
  assert.equal(r.id, a.pid); assert.equal(r.token, a.token);
  const st = await esperarEstado(volta, (s) => s.phase === "play" && s.players[0].online);
  assert.equal(st.players.length, 2);
  assert.equal(st.match.jogadores.length, 2);
  assert.deepEqual(st.match.jogadores[0].time, Galeramon.DEFAULT_TEAM);
  volta.emit("cmd", envio(0, { mira: { x: -1, y: 0 } }));
  const sn = await esperarEvento(volta, "snap", (s) => s.seq === 0);
  assert.ok(sn.tempo > anterior.tempo, "a partida continuou");
  assert.deepEqual(sn.entidades.find((e) => e.id === a.pid).mira, { x: -1, y: 0 });
});

test("ginásio/servidor: quem assiste não manda comandos, e um removido sai da sala", async (t) => {
  const m = await abrir(t, { formato: "2x2" });
  const [a, b] = m.todos;
  const w = await m.conectar();
  await pedir(w, "join", { code: m.code, watch: true });
  await assert.rejects(pedir(w, "act", { type: "time", time: Galeramon.DEFAULT_TEAM }), /fora do jogo/);
  await assert.rejects(pedir(w, "act", { type: "lobby" }), /Só o organizador/);
  await assert.rejects(pedir(a, "act", { type: "kick", id: "__proto__" }), /inválido/);
  await assert.rejects(pedir(a, "act", { type: "kick", id: { toString: null } }), /inválido/);
  const removido = esperarEvento(b, "removido");
  await pedir(a, "act", { type: "kick", id: b.pid });
  await removido;
  await assert.rejects(pedir(b, "act", { type: "start" }), /não está numa sala/);
  await pedir(a, "act", { type: "start" });
  const st = await esperarEstado(w, (s) => s.phase === "play");
  assert.equal(st.match.jogadores.filter((p) => p.bot).length, 3);
  w.emit("cmd", envio(0, { id: a.pid, golpe: 0 }));
  const sn = await esperarEvento(w, "snap", (s) => s.tempo > 0);
  assert.equal(sn.seq, -1);
  assert.equal(sn.entidades.find((e) => e.id === a.pid).cds[0], 0);
});

test("ginásio/servidor: dois clientes e robôs jogam até o fim e pontuam na Noite", { timeout: 60000 }, async (t) => {
  const time = ["mewtwo", "kyogre", "dialga"];
  const m = await abrir(t, { modo: "pokemon", formato: "2x2" }, 2, [time, time]);
  const [a, b] = m.todos;
  await pedir(b, "act", { type: "lado", lado: 0 });
  const n = await m.conectar("/noite");
  let ultimo = null;
  n.on("noite", (s) => { ultimo = s; });
  await pedir(n, "sala", { jogo: "ginasio", sala: m.code, nome: "Pessoa1" });
  await pedir(a, "act", { type: "start" });
  const st = await esperarEstado(a, (s) => s.phase === "play");
  assert.equal(st.match.jogadores.length, 4);
  assert.equal(st.match.jogadores.filter((p) => p.bot).length, 2);
  const lados = [0, 1].map((lado) => st.match.jogadores.filter((p) => p.lado === lado));
  const sombra = G.criarPartida({ modo: "pokemon", formato: "2x2", seed: "clientes" }, lados);
  sombra.rng = () => 0; // os clientes apertam assim que um golpe fica disponivel
  let seq = 0, danos = 0, desmaios = 0;
  a.on("ev", (lista) => {
    danos += lista.filter((e) => e.tipo === "dano").length;
    desmaios += lista.filter((e) => e.tipo === "desmaiou").length;
  });
  const jogar = (sn) => {
    for (const e of sombra.entidades) {
      const dado = sn.entidades.find((p) => p.id === e.id);
      e.jogador.ativo = dado.ativo;
      e.bicho = e.jogador.time[dado.ativo];
      for (let i = 0; i < dado.time.length; i++) e.jogador.time[i].hp = dado.time[i].hp;
      Object.assign(e, { x: dado.x, y: dado.y, campo: dado.campo, esquivaCd: dado.esquivaCd });
      e.bicho.cds = dado.cds; e.bicho.st = dado.st; e.jogador.trocaCd = dado.trocaCd;
    }
    for (const s of [a, b]) {
      const e = sombra.entidades.find((p) => p.id === s.pid), c = G.pensarRobo(sombra, e);
      s.emit("cmd", envio(seq++, { ...c, dx: c.dx || 0, dy: c.dy || 0, mira: c.mira || e.mira }));
    }
  };
  a.on("snap", jogar);
  t.after(() => a.off("snap", jogar));
  const resultado = await esperarEstado(a, (s) => s.phase === "over", 50000);
  a.off("snap", jogar);
  assert.ok(danos > 0 && desmaios > 0, "houve ataques, dano e nocautes calculados pelo servidor");
  assert.equal(resultado.match.fim, true);
  assert.ok(resultado.results.tempo <= G.TEMPO_MAX + 0.1);
  assert.equal(resultado.results.vencedor, 0, "os clientes venceram os times basicos dos robôs");
  const noite = ultimo?.partidas.length ? ultimo : await esperarEvento(n, "noite", (s) => s.partidas.length > 0);
  assert.equal(noite.jogos.ginasio, "Ginásio");
  assert.equal(noite.partidas[0].jogo, "ginasio");
  assert.deepEqual(noite.partidas[0].ganhadores.sort(), ["Pessoa1", "Pessoa2"]);
  assert.equal(noite.ranking.filter((p) => p.v === 1).length, 2, "os robôs não entram no ranking");
  await pedir(a, "act", { type: "lobby" });
  const lobby = await esperarEstado(a, (s) => s.phase === "lobby");
  assert.equal(lobby.match, null); assert.equal(lobby.results, null);
  assert.deepEqual(lobby.players[0].time, time);
});
