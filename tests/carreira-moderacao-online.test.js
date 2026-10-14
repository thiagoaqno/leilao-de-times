const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

test("edição do GitHub atualiza a sala conectada e continua salva após reinício", async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "moderacao-carreira-"));
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const chave = { ...publicKey.export({ format: "jwk" }), kid: "teste", alg: "RS256", use: "sig" };
  let token;
  const jwks = http.createServer((req, res) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(req.url.startsWith("/identity") ? { value: token } : { keys: [chave] })); });
  await new Promise((ok) => jwks.listen(0, "127.0.0.1", ok));
  const env = { DB_PATH: path.join(pasta, "galera.db"), NODE_ENV: "test", MODERACAO_TEST_JWKS_URL: `http://127.0.0.1:${jwks.address().port}` };
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = Buffer.from(JSON.stringify({ alg: "RS256", kid: "teste", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({ iss: "https://token.actions.githubusercontent.com", aud: "leilao-de-times-moderacao",
    repository_id: "1400392364", repository: "thiagoaqno/leilao-de-times", actor_id: "266817963", actor: "thiagoaqno",
    event_name: "workflow_dispatch", ref: "refs/heads/main", workflow_ref: "thiagoaqno/leilao-de-times/.github/workflows/moderar-carreira.yml@refs/heads/main",
    iat: agora, nbf: agora - 1, exp: agora + 300 })).toString("base64url");
  const assinatura = crypto.sign("RSA-SHA256", Buffer.from(`${cabecalho}.${claims}`), privateKey).toString("base64url");
  token = `${cabecalho}.${claims}.${assinatura}`;
  let srv, socket;
  try {
    srv = await subirServidor(env);
    socket = await conectar(srv.url, "/carreira-online");
    const sala = await pedir(socket, "create", { name: "Ana" });
    await pedir(socket, "act", { type: "clube", clube: "flamengo" });
    await pedir(socket, "act", { type: "comecar" });
    const url = `${srv.url}/api/moderacao/carreira`;
    const dados = { tipo: "caixa", sala: sala.code, clube: "flamengo", valor: 987654321, ator: "thiagoaqno" };
    const errado = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
    assert.equal(errado.status, 401);
    const outroClaims = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(claims, "base64url").toString("utf8")), actor_id: "123" })).toString("base64url");
    const outroToken = `${cabecalho}.${outroClaims}.${crypto.sign("RSA-SHA256", Buffer.from(`${cabecalho}.${outroClaims}`), privateKey).toString("base64url")}`;
    const outro = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${outroToken}`, "Content-Type": "application/json" }, body: JSON.stringify(dados) });
    assert.equal(outro.status, 401);
    const script = path.join(__dirname, "..", ".github", "scripts", "moderar-carreira.mjs");
    const saida = await new Promise((resolve) => {
      const p = spawn(process.execPath, [script], { env: { ...process.env, MODERACAO_URL: srv.url,
        ACTIONS_ID_TOKEN_REQUEST_URL: `http://127.0.0.1:${jwks.address().port}/identity`, ACTIONS_ID_TOKEN_REQUEST_TOKEN: "teste",
        MOD_ACAO: "caixa", MOD_SALA: sala.code, MOD_CLUBE: "flamengo", MOD_VALOR: "987654321", MOD_ATOR: "thiagoaqno" } });
      let texto = ""; p.stdout.on("data", (d) => { texto += d; }); p.stderr.on("data", (d) => { texto += d; });
      p.on("exit", (codigo) => resolve({ codigo, texto }));
    });
    assert.equal(saida.codigo, 0, saida.texto);
    const replay = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(dados) });
    assert.equal(replay.status, 401);
    assert.equal((await pedir(socket, "entrar")).estado.caixa, 987654321);
    socket.close(); socket = null;
    await srv.parar(); srv = null;
    srv = await subirServidor(env);
    socket = await conectar(srv.url, "/carreira-online");
    await pedir(socket, "join", { code: sala.code, id: sala.id, token: sala.token });
    assert.equal((await pedir(socket, "entrar")).estado.caixa, 987654321);
  } finally {
    socket?.close();
    if (srv) await srv.parar();
    jwks.close();
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});
