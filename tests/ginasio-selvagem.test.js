// Ginásio: a luta com o Pokémon selvagem da grama alta (ginasio.js: criarSelvagem, act "pokebola", a experiência no
// fim). Sobe o canal /ginasio aqui mesmo, com o banco em memória, e a sorte do Math.random na mão.
process.env.DB_PATH = ":memory:";
process.env.NODE_ENV = "test"; // a cena da Pokébola passa 20 vezes mais rápido
const test = require("node:test");
const assert = require("node:assert");
const http = require("http");
const { Server } = require("socket.io");
const { io: cliente } = require("socket.io-client");
const bd = require("../bd.js");
const Niveis = require("../public/galeramon/niveis.js");
const { hashDe } = require("../vila-mato.js");

const ASH = "c".repeat(32), T = hashDe(ASH);
let servidor, url, ginasio;
const aleatorio = Math.random;
test.before(async () => {
  bd.abrir(":memory:");
  servidor = http.createServer();
  ginasio = require("../ginasio.js")(new Server(servidor));
  await new Promise((ok) => servidor.listen(0, ok));
  url = `http://localhost:${servidor.address().port}/ginasio`;
});
test.after(() => { Math.random = aleatorio; servidor.close(); bd.fechar(); });

const conectar = () => new Promise((ok) => { const s = cliente(url, { transports: ["websocket"], forceNew: true, reconnection: false }); s.on("state", (st) => { s.ultimo = st; }); s.once("connect", () => ok(s)); });
const pedir = (s, ev, d) => new Promise((ok) => s.emit(ev, d, ok));
const esperar = (s, cond, ms = 15000) => new Promise((ok, erro) => {
  if (s.ultimo && cond(s.ultimo)) return ok(s.ultimo);
  const t = setTimeout(() => erro(new Error("tempo esgotado")), ms);
  const f = (st) => { if (cond(st)) { clearTimeout(t); s.off("state", f); ok(st); } };
  s.on("state", f);
});
const encontro = (bicho, nivel) => { const max = Niveis.atributos(bicho, nivel).hp; return { bicho, nivel, raridade: "comum", brilhante: false, hp: max, max }; };

test("selvagem: a luta abre com o meu time (os de nível mais alto), o selvagem sozinho e ninguém mais do lado de lá", async () => {
  const lugar = ginasio.criarSelvagem({ nome: "Ash", treinador: T, time: ["mewtwo", "mew", "lugia"], encontro: encontro("pidgey", 6) });
  assert.ok(lugar.code && lugar.token);
  const s = await conectar();
  assert.ok((await pedir(s, "join", { code: lugar.code, id: lugar.id, token: lugar.token, treinador: ASH })).ok);
  const st = await esperar(s, (x) => x.players.length);
  assert.deepStrictEqual(st.selvagem, { bicho: "pidgey", nivel: 6, raridade: "comum", brilhante: false, usado: false });
  assert.deepStrictEqual(st.players[0].time.slice().sort(), ["bulbasaur", "charmander", "squirtle"], "não tem os lendários: os iniciais");
  assert.strictEqual(st.config.pokemons, "capturados");
  assert.ok(!(await pedir(s, "act", { type: "config", config: { pokemons: "todos" } })).ok, "não muda de regra");
  const outro = await conectar();
  assert.ok((await pedir(outro, "join", { code: lugar.code, name: "Gary" })).ok);
  assert.strictEqual((await esperar(s, (x) => x.players.length === 2)).players.find((p) => p.name === "Gary").lado, null, "quem chega assiste");
  assert.ok(!(await pedir(s, "act", { type: "pokebola" })).ok, "antes de começar, nada de Pokébola");
  s.close(); outro.close();
});

test("selvagem: a Pokébola pausa a luta, pega, guarda no banco e dá experiência a quem lutou", async () => {
  const lugar = ginasio.criarSelvagem({ nome: "Ash", treinador: T, time: ["charmander", "squirtle", "bulbasaur"], encontro: encontro("pidgey", 8) });
  const s = await conectar(), eventos = [];
  s.on("ev", (l) => eventos.push(...l));
  await pedir(s, "join", { code: lugar.code, id: lugar.id, token: lugar.token, treinador: ASH });
  assert.ok((await pedir(s, "act", { type: "start" })).ok);
  const jogo = await esperar(s, (x) => x.phase === "play");
  await new Promise((ok) => setTimeout(ok, Math.max(0, jogo.match.start - Date.now()) + 50));
  const antes = bd.pokemonsDe(T).find((p) => p.bicho === "charmander");
  Math.random = () => 0; // a bola pega
  const r = await pedir(s, "act", { type: "pokebola" });
  Math.random = aleatorio;
  assert.ok(r.ok, r.error);
  const bola = eventos.find((e) => e.tipo === "pokebola");
  assert.ok(bola && bola.pegou && bola.balancos === 3 && bola.chance > 0 && bola.dur > 0);
  const fim = await esperar(s, (x) => x.phase === "over");
  const sel = fim.results.selvagem;
  assert.strictEqual(sel.capturado, true);
  assert.ok(sel.xp.length >= 1, "quem estava em campo ganhou experiência");
  assert.strictEqual(sel.xp[0].bicho, "charmander");
  assert.ok(sel.xp[0].ganho > 0);
  const depois = bd.pokemonsDe(T).find((p) => p.id === antes.id);
  assert.ok(depois.nivel > antes.nivel || depois.xp > antes.xp, "o banco guardou a experiência");
  const pidgey = bd.pokemonsDe(T).find((p) => p.bicho === "pidgey");
  assert.ok(pidgey && pidgey.nivel === 8 && pidgey.origem === "captura", "o capturado vem com o nível do encontro");
  assert.ok(!(await pedir(s, "act", { type: "start" })).ok, "a mesma luta não recomeça");
  s.close();
});

test("selvagem: escapou, a luta continua; a chance aparece no evento e a próxima bola espera", async () => {
  const lugar = ginasio.criarSelvagem({ nome: "Ash", treinador: T, time: [], encontro: encontro("rattata", 5) });
  const s = await conectar(), eventos = [];
  s.on("ev", (l) => eventos.push(...l));
  await pedir(s, "join", { code: lugar.code, id: lugar.id, token: lugar.token, treinador: ASH });
  await pedir(s, "act", { type: "start" });
  const jogo = await esperar(s, (x) => x.phase === "play");
  await new Promise((ok) => setTimeout(ok, Math.max(0, jogo.match.start - Date.now()) + 50));
  Math.random = () => 0.999; // a bola não pega
  assert.ok((await pedir(s, "act", { type: "pokebola" })).ok);
  Math.random = aleatorio;
  const bola = eventos.find((e) => e.tipo === "pokebola");
  assert.ok(bola && !bola.pegou && bola.balancos === 0);
  assert.ok(!(await pedir(s, "act", { type: "pokebola" })).ok, "uma de cada vez");
  await new Promise((ok) => setTimeout(ok, bola.dur + 100));
  assert.strictEqual(s.ultimo.phase, "play", "a luta segue");
  s.close();
});
