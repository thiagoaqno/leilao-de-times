// Lobby da Vila: as salas abertas de vários jogos aparecem na lista do canal /lobby e somem quando todo mundo sai.
const test = require("node:test");
const assert = require("node:assert");
const { io: cliente } = require("socket.io-client");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

let srv;
test.before(async () => { srv = await subirServidor(); });
test.after(async () => { await srv.parar(); });

const esperarLista = (s, cond, ms = 6000) => new Promise((ok, erro) => {
  const t = setTimeout(() => erro(new Error("Tempo esgotado esperando a lista de salas")), ms);
  const f = (l) => { if (cond(l)) { clearTimeout(t); s.off("salas", f); ok(l); } };
  s.on("salas", f);
});

test("a lista mostra as salas de jogos diferentes e atualiza ao vivo", async () => {
  const lob = cliente(srv.url + "/lobby", { transports: ["websocket"], forceNew: true });
  await new Promise((ok) => lob.once("connect", ok));
  const uno = await conectar(srv.url, "/uno");
  const a = esperarLista(lob, (l) => l.some((x) => x.jogo === "uno"));
  const r = await pedir(uno, "create", { name: "Ana" });
  const lista = await a;
  const sala = lista.find((x) => x.code === r.code);
  assert.equal(sala.estado, "aberta");
  assert.deepEqual(sala.jogadores.map((j) => j.nome), ["Ana"]);
  assert.equal(sala.url, `/uno/?mesa=${r.code}&entrar=1`);
  // um segundo jogador entra: a lista se atualiza
  const uno2 = await conectar(srv.url, "/uno");
  const b = esperarLista(lob, (l) => (l.find((x) => x.code === r.code) || { jogadores: [] }).jogadores.length === 2);
  await pedir(uno2, "join", { code: r.code, name: "Beto" });
  await b;
  // sala de outro jogo (canal diferente) aparece junto
  const dig = await conectar(srv.url, "/digita");
  const c = esperarLista(lob, (l) => l.some((x) => x.jogo === "digita"));
  await pedir(dig, "create", { name: "Caio" });
  const l3 = await c;
  assert.ok(l3.some((x) => x.jogo === "uno") && l3.some((x) => x.jogo === "digita"));
  // todo mundo sai: a sala some
  const d = esperarLista(lob, (l) => !l.some((x) => x.code === r.code));
  uno.disconnect(); uno2.disconnect();
  await d;
  dig.disconnect(); lob.disconnect();
});
