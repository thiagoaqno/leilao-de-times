// Dados quebrados não derrubam o servidor: para cada canal (achado no código, io.of("/canal")) e cada evento que ele
// escuta (socket.on("evento")), manda null, números, textos, listas e um "callback" que não é função. Antes, um único
// emit("create", null) jogava um erro fora de qualquer try e o processo inteiro caía, com as salas de todos os jogos.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { io } = require("socket.io-client");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

const RAIZ = path.join(__dirname, "..");
const RESERVADOS = new Set(["connect", "connect_error", "disconnect", "disconnecting", "newListener", "removeListener"]);
// os canais e os eventos de cada módulo da raiz que o server.js carrega
function canais() {
  const servidor = fs.readFileSync(path.join(RAIZ, "server.js"), "utf8");
  const modulos = ["server.js", ...[...servidor.matchAll(/require\("\.\/([\w-]+\.js)"\)/g)].map((m) => m[1])];
  const mapa = new Map();
  for (const arq of new Set(modulos)) {
    const fonte = fs.readFileSync(path.join(RAIZ, arq), "utf8");
    const nomes = [...fonte.matchAll(/\bio\.of\("(\/[\w-]*)"\)/g)].map((m) => m[1]);
    if (arq === "server.js") nomes.push("/"); // o Leilão mora no canal padrão
    const eventos = [...new Set([...fonte.matchAll(/socket\.on\("([\w:-]+)"/g)].map((m) => m[1]))].filter((e) => !RESERVADOS.has(e));
    for (const n of nomes) mapa.set(n, new Set([...(mapa.get(n) || []), ...eventos]));
  }
  return mapa;
}
const LIXO = [[null], [null, 5], [5], ["x", null], [[]], [undefined, "não é função"], [{ code: null, type: null }], [{}, 7], [true, {}]];

test("dados quebrados em qualquer evento de qualquer canal não derrubam o servidor", { timeout: 120000 }, async () => {
  const srv = await subirServidor();
  try {
    const lista = canais();
    assert.ok(lista.size >= 20, "achou os canais dos jogos: " + [...lista.keys()].join(" "));
    let enviados = 0;
    for (const [canal, eventos] of lista) {
      const s = io(srv.url + canal, { transports: ["websocket"], forceNew: true, reconnection: false });
      await new Promise((ok, erro) => {
        const t = setTimeout(() => erro(new Error(`não conectou em ${canal}: o servidor caiu?`)), 5000);
        s.once("connect", () => { clearTimeout(t); ok(); });
        s.once("connect_error", (e) => { clearTimeout(t); erro(new Error(`${canal}: ${e.message} (o servidor caiu?)`)); });
      });
      for (const ev of eventos) for (const args of LIXO) { s.emit(ev, ...args); enviados++; }
      await new Promise((r) => setTimeout(r, 150));
      s.close();
    }
    assert.ok(enviados > 500, "mandou " + enviados);
    await new Promise((r) => setTimeout(r, 500));
    // o servidor continua de pé e atende normalmente
    const uno = await conectar(srv.url, "/uno");
    const r = await pedir(uno, "create", { name: "Ana" });
    assert.ok(r.code);
    uno.close();
  } finally { await srv.parar(); }
});
