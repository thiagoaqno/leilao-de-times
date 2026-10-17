// Ginásio: a sala "só capturados" (config.pokemons). Cada um joga só com os três iniciais e os Pokémon que pegou na
// grama alta da Vila (bd.js, capturas). Sobe o canal /ginasio aqui mesmo, com o banco em memória, para pôr capturas.
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const http = require("http");
const { Server } = require("socket.io");
const { io: cliente } = require("socket.io-client");
const bd = require("../bd.js");
const { hashDe } = require("../vila-mato.js");

const ASH = "a".repeat(32), GARY = "b".repeat(32);
let servidor, url;
test.before(async () => {
  bd.abrir(":memory:");
  bd.guardarCaptura(hashDe(ASH), "Ash", "pikachu", "comum", false);
  bd.guardarCaptura(hashDe(ASH), "Ash", "eevee", "incomum", false);
  servidor = http.createServer();
  require("../ginasio.js")(new Server(servidor));
  await new Promise((ok) => servidor.listen(0, ok));
  url = `http://localhost:${servidor.address().port}/ginasio`;
});
test.after(() => { servidor.close(); bd.fechar(); });

const conectar = () => new Promise((ok) => { const s = cliente(url, { transports: ["websocket"], forceNew: true, reconnection: false }); s.on("state", (st) => { s.ultimo = st; }); s.once("connect", () => ok(s)); });
const pedir = (s, ev, d) => new Promise((ok) => s.emit(ev, d, ok));
const esperar = (ms = 60) => new Promise((ok) => setTimeout(ok, ms));
const timeDe = (s, nome) => s.ultimo.players.find((p) => p.name === nome).time;

test("só capturados: os iniciais valem para todos; o resto, só para quem pegou", async () => {
  const ash = await conectar(), gary = await conectar();
  assert.deepStrictEqual((await pedir(ash, "colecao", { codigo: ASH })).ids.sort(), ["bulbasaur", "charmander", "eevee", "pikachu", "squirtle"]);
  assert.deepStrictEqual((await pedir(gary, "colecao", { codigo: GARY })).ids.sort(), ["bulbasaur", "charmander", "squirtle"]);
  const sala = await pedir(ash, "create", { name: "Ash", treinador: ASH, time: ["pikachu", "eevee", "mewtwo"], config: { modo: "pokemon", pokemons: "todos" } });
  assert.ok(sala.ok);
  await esperar();
  assert.deepStrictEqual(timeDe(ash, "Ash"), ["pikachu", "eevee", "mewtwo"], "com tudo liberado, qualquer um");
  // o anfitrião liga a regra: quem tem bicho que não pegou volta para os iniciais
  assert.ok((await pedir(ash, "act", { type: "config", config: { pokemons: "capturados" } })).ok);
  await esperar();
  assert.strictEqual(ash.ultimo.config.pokemons, "capturados");
  assert.deepStrictEqual(timeDe(ash, "Ash"), ["bulbasaur", "charmander", "squirtle"]);
  assert.ok((await pedir(ash, "act", { type: "time", time: ["pikachu", "eevee", "squirtle"] })).ok, "o que pegou vale");
  const nao = await pedir(ash, "act", { type: "time", time: ["pikachu", "eevee", "mewtwo"] });
  assert.ok(!nao.ok && /Mewtwo/.test(nao.error) && /grama alta/.test(nao.error), nao.error);
  // quem entra com time que não tem fica com os iniciais (e não pode pôr o que não pegou)
  assert.ok((await pedir(gary, "join", { code: sala.code, name: "Gary", treinador: GARY, time: ["pikachu", "charmander", "squirtle"] })).ok);
  await esperar();
  assert.deepStrictEqual(timeDe(ash, "Gary"), ["bulbasaur", "charmander", "squirtle"]);
  assert.ok(!(await pedir(gary, "act", { type: "time", time: ["pikachu", "charmander", "squirtle"] })).ok);
  // Gary pega um Pikachu na grama: na hora já vale
  bd.guardarCaptura(hashDe(GARY), "Gary", "pikachu", "comum", false);
  assert.ok((await pedir(gary, "act", { type: "time", time: ["pikachu", "charmander", "squirtle"] })).ok);
  // desligando a regra, tudo liberado de novo
  assert.ok((await pedir(ash, "act", { type: "config", config: { pokemons: "todos" } })).ok);
  assert.ok((await pedir(gary, "act", { type: "time", time: ["mewtwo", "charmander", "squirtle"] })).ok);
  ash.close(); gary.close();
});

test("só capturados vale só no modo Pokémon, e sem código de treinador ficam os iniciais", async () => {
  const s = await conectar();
  const sala = await pedir(s, "create", { name: "Zé", config: { modo: "galeramon", pokemons: "capturados" } });
  assert.ok(sala.ok);
  await esperar();
  assert.strictEqual(s.ultimo.config.pokemons, "capturados");
  assert.ok((await pedir(s, "act", { type: "config", config: { modo: "pokemon" } })).ok);
  await esperar();
  assert.deepStrictEqual(timeDe(s, "Zé"), ["bulbasaur", "charmander", "squirtle"], "o time padrão não é todo inicial: volta para eles");
  assert.ok(!(await pedir(s, "act", { type: "time", time: ["pikachu", "charmander", "squirtle"] })).ok);
  s.close();
});
