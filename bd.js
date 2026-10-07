// Banco de dados do site (SQLite pelo node:sqlite, que já vem no Node: sem dependência nativa).
// - Onde fica: DB_PATH (no Fly, /data/galera.db, num volume); sem DB_PATH, ./dados/galera.db; nos testes, ":memory:".
// - Migrações: os arquivos migracoes/NNN-nome.sql rodam em ordem, uma vez só, e ficam anotados na tabela "migracoes".
// - Guarda as carreiras de treinador (planos/carreira.md) e as cartas que já saíram nos jogos de baralho. Nada de ORM:
//   funções pequenas.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PASTA_MIGRACOES = path.join(__dirname, "migracoes");
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O e 1/I, que confundem ao digitar
let banco = null;

// o node:sqlite ainda avisa que é "experimental" no Node 22/24; o aviso não ajuda ninguém no log do servidor
function carregarSqlite() {
  const emitir = process.emitWarning;
  process.emitWarning = (aviso, ...resto) => { if (!String(aviso && aviso.message || aviso).includes("SQLite")) emitir.call(process, aviso, ...resto); };
  try { return require("node:sqlite"); } finally { process.emitWarning = emitir; }
}

function migrar(db) {
  db.exec("CREATE TABLE IF NOT EXISTS migracoes (nome TEXT PRIMARY KEY, rodada_em INTEGER NOT NULL)");
  const feitas = new Set(db.prepare("SELECT nome FROM migracoes").all().map((m) => m.nome));
  const arquivos = fs.existsSync(PASTA_MIGRACOES) ? fs.readdirSync(PASTA_MIGRACOES).filter((f) => /^\d{3}-.+\.sql$/.test(f)).sort() : [];
  const rodadas = [];
  for (const nome of arquivos) {
    if (feitas.has(nome)) continue;
    const sql = fs.readFileSync(path.join(PASTA_MIGRACOES, nome), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO migracoes (nome, rodada_em) VALUES (?, ?)").run(nome, Date.now());
      db.exec("COMMIT");
      rodadas.push(nome);
    } catch (e) { db.exec("ROLLBACK"); throw new Error(`migração ${nome} falhou: ${e.message}`); }
  }
  return rodadas;
}

function abrir(caminho = process.env.DB_PATH || path.join(__dirname, "dados", "galera.db")) {
  if (banco) return banco;
  const { DatabaseSync } = carregarSqlite();
  if (caminho !== ":memory:") fs.mkdirSync(path.dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  if (caminho !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrar(db);
  banco = db;
  return db;
}
function fechar() { if (banco) { banco.close(); banco = null; } }
const bd = () => banco || abrir();

// ---------- carreiras ----------
const hash = (txt) => crypto.createHash("sha256").update(String(txt)).digest("hex");
const novoToken = () => crypto.randomBytes(24).toString("hex");
function novoCodigoRecuperacao() {
  const b = crypto.randomBytes(12);
  return Array.from(b, (x) => LETRAS[x % LETRAS.length]).join("");
}
// o código de recuperação aceita espaço, traço e minúscula ("abcd-efgh-jklm")
const limparCodigo = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const tokenValido = (t) => typeof t === "string" && /^[a-f0-9]{32,64}$/.test(t);

function lerCarreira(linha) {
  if (!linha) return null;
  let dados = {};
  try { dados = JSON.parse(linha.dados); } catch {}
  return { id: Number(linha.id), nome: linha.nome, dados, criadaEm: Number(linha.criada_em), atualizadaEm: Number(linha.atualizada_em) };
}
// cria a carreira e devolve o token (fica no navegador) e o código de recuperação (para outro aparelho): os dois só
// aparecem aqui; o banco guarda só o hash
function criarCarreira(nome, dados = {}) {
  const token = novoToken(), recuperacao = novoCodigoRecuperacao(), agora = Date.now();
  const r = bd().prepare("INSERT INTO carreiras (token_hash, recuperacao_hash, nome, dados, criada_em, atualizada_em) VALUES (?, ?, ?, ?, ?, ?)")
    .run(hash(token), hash(recuperacao), String(nome).slice(0, 40), JSON.stringify(dados), agora, agora);
  return { id: Number(r.lastInsertRowid), token, recuperacao };
}
function carreiraPorToken(token) {
  if (!tokenValido(token)) return null;
  return lerCarreira(bd().prepare("SELECT * FROM carreiras WHERE token_hash = ?").get(hash(token)));
}
// entrar em outro aparelho: o código vale, e nasce um token novo para este navegador (o antigo deixa de valer)
function recuperarCarreira(codigo) {
  const c = limparCodigo(codigo);
  if (c.length !== 12) return null;
  const linha = bd().prepare("SELECT * FROM carreiras WHERE recuperacao_hash = ?").get(hash(c));
  if (!linha) return null;
  const token = novoToken();
  bd().prepare("UPDATE carreiras SET token_hash = ?, atualizada_em = ? WHERE id = ?").run(hash(token), Date.now(), linha.id);
  return { ...lerCarreira(linha), token };
}
function salvarCarreira(id, dados) {
  const r = bd().prepare("UPDATE carreiras SET dados = ?, atualizada_em = ? WHERE id = ?").run(JSON.stringify(dados), Date.now(), id);
  return r.changes > 0;
}
// mostrar o código de novo: o banco só tem o hash, então nasce um código novo (o antigo deixa de valer)
function novoCodigoDe(id) {
  const recuperacao = novoCodigoRecuperacao();
  const r = bd().prepare("UPDATE carreiras SET recuperacao_hash = ?, atualizada_em = ? WHERE id = ?").run(hash(recuperacao), Date.now(), id);
  return r.changes > 0 ? recuperacao : null;
}
// apagar a carreira de vez (o token e o código deixam de valer)
function excluirCarreira(id) {
  return bd().prepare("DELETE FROM carreiras WHERE id = ?").run(id).changes > 0;
}

// ---------- cartas que já saíram (o monte dura entre reinícios do servidor) ----------
const cartasSaidas = (jogo) => new Set(bd().prepare("SELECT carta FROM cartas_saidas WHERE jogo = ?").all(jogo).map((r) => r.carta));
const marcarCarta = (jogo, carta) => { bd().prepare("INSERT OR IGNORE INTO cartas_saidas (jogo, carta, saiu_em) VALUES (?, ?, ?)").run(jogo, carta, Date.now()); };
const zerarCartas = (jogo) => { bd().prepare("DELETE FROM cartas_saidas WHERE jogo = ?").run(jogo); };

module.exports = { abrir, fechar, migrar, criarCarreira, carreiraPorToken, recuperarCarreira, salvarCarreira, novoCodigoDe, excluirCarreira, limparCodigo, cartasSaidas, marcarCarta, zerarCartas };
