// Ajudantes dos testes: sobe o servidor de verdade (node server.js) numa porta livre e conecta clientes do Socket.io.
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const { io } = require("socket.io-client");

function portaLivre() {
  return new Promise((ok, erro) => {
    const s = net.createServer();
    s.unref();
    s.on("error", erro);
    s.listen(0, () => { const { port } = s.address(); s.close(() => ok(port)); });
  });
}

// Sobe o servidor e espera ele dizer que está rodando. env: variáveis extras (ex.: DOMINO_PASS_MS).
async function subirServidor(env = {}) {
  const porta = await portaLivre();
  const proc = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, ...env, PORT: String(porta) }, stdio: ["ignore", "pipe", "pipe"] });
  let saida = "";
  await new Promise((ok, erro) => {
    const t = setTimeout(() => erro(new Error("O servidor não subiu:\n" + saida)), 15000);
    proc.stdout.on("data", (d) => { saida += d; if (saida.includes("rodando")) { clearTimeout(t); ok(); } });
    proc.stderr.on("data", (d) => { saida += d; });
    proc.on("exit", (c) => { clearTimeout(t); erro(new Error(`O servidor saiu (${c}):\n${saida}`)); });
  });
  return { url: `http://localhost:${porta}`, porta, parar: () => new Promise((ok) => { proc.once("exit", ok); proc.kill(); }) };
}

// Cliente de um canal ("/domino", "/pelada"…). Guarda o último "state" recebido.
function conectar(url, canal) {
  const s = io(url + canal, { transports: ["websocket"], forceNew: true, reconnection: false });
  s.ultimo = null;
  s.on("state", (st) => { s.ultimo = st; });
  return new Promise((ok, erro) => { s.once("connect", () => ok(s)); s.once("connect_error", erro); });
}

// emit com resposta {ok, error}: falha vira exceção
function pedir(s, evento, dados) {
  return new Promise((ok, erro) => s.emit(evento, dados, (r) => (r && r.ok ? ok(r) : erro(new Error(`${evento}: ${r && r.error}`)))));
}

// espera um "state" que satisfaça a condição (olha o último que já chegou também)
function esperarEstado(s, cond, ms = 20000) {
  return new Promise((ok, erro) => {
    if (s.ultimo && cond(s.ultimo)) return ok(s.ultimo);
    const t = setTimeout(() => { s.off("state", f); erro(new Error("Tempo esgotado esperando o estado")); }, ms);
    const f = (st) => { if (cond(st)) { clearTimeout(t); s.off("state", f); ok(st); } };
    s.on("state", f);
  });
}

module.exports = { subirServidor, conectar, pedir, esperarEstado };
