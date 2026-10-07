// Palavra Proibida: as cartas que já saíram ficam no banco e não voltam depois que o servidor reinicia.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

// uma sala de 4 (2 em cada time) e alguém assistindo, que vê a carta; começa e volta para a sala `vezes` vezes
async function cartasDeUmaNoite(url, vezes) {
  const dono = await conectar(url, "/proibida"), { code } = await pedir(dono, "create", { name: "Ana" });
  const outros = [];
  for (const name of ["Bia", "Caio", "Duda"]) { const s = await conectar(url, "/proibida"); await pedir(s, "join", { code, name }); outros.push(s); }
  const olho = await conectar(url, "/proibida"); await pedir(olho, "join", { code, watch: true });
  const vistas = [];
  for (let k = 0; k < vezes; k++) {
    await pedir(dono, "act", { type: "start" });
    const st = await esperarEstado(olho, (s) => s.phase === "jogando" && s.carta && !vistas.includes(s.carta[0]));
    vistas.push(st.carta[0]);
    await pedir(dono, "act", { type: "lobby" });
    await esperarEstado(olho, (s) => s.phase === "lobby");
  }
  for (const s of [dono, olho, ...outros]) s.close();
  return vistas;
}

test("proibida: as cartas que saíram não voltam depois que o servidor reinicia", async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "proibida-")), DB_PATH = path.join(pasta, "galera.db");
  let srv = await subirServidor({ DB_PATH });
  const antes = await cartasDeUmaNoite(srv.url, 6);
  await srv.parar();
  srv = await subirServidor({ DB_PATH }); // o servidor desligou e ligou de novo (como no Fly)
  const depois = await cartasDeUmaNoite(srv.url, 6);
  await srv.parar();
  assert.strictEqual(new Set(antes).size, 6);
  assert.deepStrictEqual(depois.filter((c) => antes.includes(c)), [], "nenhuma carta da primeira noite voltou");
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(DB_PATH);
  const saidas = db.prepare("SELECT carta FROM cartas_saidas WHERE jogo = 'proibida'").all().map((r) => r.carta);
  db.close();
  for (const c of [...antes, ...depois]) assert.ok(saidas.includes(c), `"${c}" ficou anotada no banco`);
  fs.rmSync(pasta, { recursive: true, force: true });
});
