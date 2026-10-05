// Entrar e sair das salas em todos os jogos: criar, entrar, nome repetido, código errado, só assistir, reconectar
// (id + token) e o formato das respostas e do "state". As respostas de cada canal ficam congeladas em
// salas-esperado.json (gravado antes da refatoração): se uma mensagem ou campo mudar, o teste acusa.
// Para regravar de propósito: GRAVAR=1 node --test tests/salas.test.js
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { subirServidor, conectar } = require("./ajuda.js");

const CANAIS = ["/domino", "/ludo", "/uno", "/truco", "/sinuca", "/botao", "/batalha", "/corrida", "/tiro", "/pelada", "/banco", "/tenis", "/rumi", "/proibida", "/pingpong", "/festa"];
const ARQ = path.join(__dirname, "salas-esperado.json");
const chamar = (s, ev, d) => new Promise((ok) => { const t = setTimeout(() => ok("sem resposta"), 3000); s.emit(ev, d, (r) => { clearTimeout(t); ok(r); }); });
const quieto = () => new Promise((ok) => setTimeout(ok, 150));

let srv;
test.before(async () => { srv = await subirServidor(); });
test.after(async () => { await srv.parar(); });

async function roteiro(canal) {
  const a = await conectar(srv.url, canal), b = await conectar(srv.url, canal), w = await conectar(srv.url, canal);
  const o = {}, ids = [];
  // resume uma resposta de create/join: troca os ids por apelidos (j0 = quem criou) e tira código e token (sorteados)
  const resumo = (r) => {
    if (!r || typeof r !== "object" || !r.ok) return r;
    const x = { ...r };
    if ("code" in x) { assert.match(x.code, /^[A-HJ-NP-Z2-9]{5}$/); x.code = "CODE"; }
    if (x.id) { if (!ids.includes(x.id)) ids.push(x.id); x.id = "j" + ids.indexOf(x.id); }
    if (x.token) { assert.match(x.token, /^[0-9a-f]+$/); x.token = "TOKEN"; }
    return x;
  };
  o.semNome = await chamar(a, "create", { name: "  " });
  const cria = await chamar(a, "create", { name: "  Fulano   de   Tal  " });
  o.cria = resumo(cria);
  const code = cria.code;
  o.actSemSala = await chamar(w, "act", { type: "xyz" });
  o.codigoErrado = await chamar(b, "join", { code: "ZZZZZ", name: "B" });
  o.entraSemNome = await chamar(b, "join", { code, name: "" });
  o.nomeRepetido = await chamar(b, "join", { code: code.toLowerCase(), name: "fulano de" });
  o.entra = resumo(await chamar(b, "join", { code: " " + code.toLowerCase() + " ", name: "Beltrano" }));
  o.assiste = resumo(await chamar(w, "join", { code, watch: true }));
  o.volta = resumo(await chamar(w, "join", { code, id: cria.id, token: cria.token }));
  o.tokenErrado = resumo(await chamar(w, "join", { code, id: cria.id, token: "x", name: "Ciclano" }));
  o.acaoDesconhecida = await chamar(a, "act", { type: "xyz" });
  await quieto();
  const st = a.ultimo || {};
  o.camposDoEstado = Object.keys(st).sort();
  o.nomes = (st.players || []).map((p) => p.name);
  o.online = (st.players || []).map((p) => p.online);
  // quem cai fica na sala, offline
  b.close();
  await quieto();
  o.onlineDepoisDeCair = ((a.ultimo || {}).players || []).map((p) => p.online);
  a.close(); w.close();
  return o;
}

test("salas: criar, entrar, assistir e reconectar respondem igual em todos os jogos", async () => {
  const atual = {};
  for (const c of CANAIS) atual[c] = await roteiro(c);
  if (process.env.GRAVAR) { fs.writeFileSync(ARQ, JSON.stringify(atual, null, 2) + "\n"); return; }
  const esperado = JSON.parse(fs.readFileSync(ARQ, "utf8"));
  for (const c of CANAIS) assert.deepStrictEqual(atual[c], esperado[c], `canal ${c}`);
});
