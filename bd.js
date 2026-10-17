// Banco de dados do site (SQLite pelo node:sqlite, que já vem no Node: sem dependência nativa).
// - Onde fica: DB_PATH (no Fly, /data/galera.db, num volume); sem DB_PATH, ./dados/galera.db; nos testes, ":memory:".
// - Migrações: os arquivos migracoes/NNN-nome.sql rodam em ordem, uma vez só, e ficam anotados na tabela "migracoes".
// - Guarda as carreiras de treinador (planos/carreira.md), as salas da carreira em grupo e as cartas que já saíram
//   nos jogos de baralho. Nada de ORM: funções pequenas.
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

// Times Pokémon dos personagens do Ginásio. O código base é o padrão; o banco guarda só edições.
const timesPokemonGinasio = () => bd().prepare("SELECT treinador, time_json, ator, atualizado_em FROM ginasio_times_pokemon").all();
function salvarTimePokemonGinasio(treinador, time, ator) {
  bd().prepare(`INSERT INTO ginasio_times_pokemon (treinador, time_json, ator, atualizado_em) VALUES (?, ?, ?, ?)
    ON CONFLICT(treinador) DO UPDATE SET time_json=excluded.time_json, ator=excluded.ator, atualizado_em=excluded.atualizado_em`)
    .run(treinador, JSON.stringify(time), ator, Date.now());
}
const reporTimePokemonGinasio = (treinador) => bd().prepare("DELETE FROM ginasio_times_pokemon WHERE treinador = ?").run(treinador);

// Fotos recortadas da Carreira. URL nula guarda uma busca sem resultado para não repetir a cada visita.
function fotoJogador(id) {
  return bd().prepare("SELECT url, consultado_em FROM fotos_jogadores WHERE jogador = ?").get(id) || null;
}
function guardarFotoJogador(id, url) {
  bd().prepare("INSERT INTO fotos_jogadores (jogador, url, consultado_em) VALUES (?, ?, ?) ON CONFLICT(jogador) DO UPDATE SET url = excluded.url, consultado_em = excluded.consultado_em")
    .run(id, url, Date.now());
}

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

// ---------- a moderação das carreiras solo (admin-carreira.js) ----------
// a lista sem abrir o save inteiro de cada uma: só os campos que o painel mostra, tirados do JSON pelo próprio SQLite
const listarCarreiras = (limite = 300) => bd().prepare(`SELECT id, nome, criada_em, atualizada_em,
    json_extract(dados, '$.clube') AS clube, json_extract(dados, '$.temporada') AS temporada, json_extract(dados, '$.temporadasMax') AS temporadas_max,
    json_extract(dados, '$.rodada') AS rodada, json_extract(dados, '$.v') AS v, json_type(dados, '$.partida') = 'object' AS partida,
    json_type(dados, '$.jogador') = 'object' AS jogador, json_extract(dados, '$.demitido') AS demitido
  FROM carreiras ORDER BY atualizada_em DESC LIMIT ?`).all(limite).map((l) => ({ id: Number(l.id), nome: l.nome, clube: l.clube, temporada: Number(l.temporada) || 1,
  temporadasMax: Number(l.temporadas_max) || null, rodada: Number(l.rodada) || 0, v: Number(l.v) || 0, partida: !!l.partida, jogador: !!l.jogador, demitido: !!l.demitido,
  criadaEm: Number(l.criada_em), atualizadaEm: Number(l.atualizada_em) }));
const carreiraPorId = (id) => lerCarreira(bd().prepare("SELECT * FROM carreiras WHERE id = ?").get(Number(id)));
// a edição e o registro dela juntos (o código no registro é "solo:<id>")
function salvarEdicaoCarreira(id, dados, ator, edicao) {
  const db = bd(), agora = Date.now();
  db.exec("BEGIN");
  try {
    if (dados) {
      const r = db.prepare("UPDATE carreiras SET dados = ?, atualizada_em = ? WHERE id = ?").run(JSON.stringify(dados), agora, id);
      if (!r.changes) throw new Error("Carreira não encontrada no banco.");
    }
    db.prepare("INSERT INTO moderacao_carreira (codigo, ator, tipo, clube, jogador, antes, depois, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(`solo:${id}`, String(ator), edicao.tipo, edicao.clube || "", edicao.jogador || null, JSON.stringify(edicao.antes ?? null), JSON.stringify(edicao.depois ?? null), agora);
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
// as últimas edições da moderação (de uma sala, ou de uma carreira solo com "solo:<id>")
const historicoModeracao = (codigo, limite = 20) => bd().prepare("SELECT ator, tipo, clube, jogador, antes, depois, criado_em FROM moderacao_carreira WHERE codigo = ? ORDER BY id DESC LIMIT ?")
  .all(String(codigo), limite).map((l) => { const ler = (t) => { try { return JSON.parse(t); } catch { return null; } };
    return { ator: l.ator, tipo: l.tipo, clube: l.clube, jogador: l.jogador, antes: ler(l.antes), depois: ler(l.depois), em: Number(l.criado_em) }; });

// ---------- as salas da carreira em grupo (carreira-online.js) ----------
function salvarSalaCarreira(codigo, dados) {
  const agora = Date.now();
  bd().prepare("INSERT INTO carreiras_online (codigo, dados, criada_em, atualizada_em) VALUES (?, ?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET dados = excluded.dados, atualizada_em = excluded.atualizada_em")
    .run(codigo, JSON.stringify(dados), agora, agora);
}
// todas as salas guardadas (o servidor carrega ao subir): [{ codigo, dados, atualizadaEm }]
const salasCarreira = () => bd().prepare("SELECT * FROM carreiras_online").all().map((l) => {
  let dados = null; try { dados = JSON.parse(l.dados); } catch {}
  return { codigo: l.codigo, dados, atualizadaEm: Number(l.atualizada_em) };
}).filter((s) => s.dados);
const apagarSalaCarreira = (codigo) => bd().prepare("DELETE FROM carreiras_online WHERE codigo = ?").run(codigo).changes > 0;
function salvarEdicaoModeracao(codigo, dados, ator, edicao) {
  const db = bd(), agora = Date.now();
  db.exec("BEGIN");
  try {
    const r = db.prepare("UPDATE carreiras_online SET dados = ?, atualizada_em = ? WHERE codigo = ?").run(JSON.stringify(dados), agora, codigo);
    if (!r.changes) throw new Error("Sala não encontrada no banco.");
    db.prepare("INSERT INTO moderacao_carreira (codigo, ator, tipo, clube, jogador, antes, depois, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(codigo, String(ator), edicao.tipo, edicao.clube, edicao.jogador, JSON.stringify(edicao.antes), JSON.stringify(edicao.depois), agora);
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}

// ---------- cartas que já saíram (o monte dura entre reinícios do servidor) ----------
const cartasSaidas = (jogo) => new Set(bd().prepare("SELECT carta FROM cartas_saidas WHERE jogo = ?").all(jogo).map((r) => r.carta));
const marcarCarta = (jogo, carta) => { bd().prepare("INSERT OR IGNORE INTO cartas_saidas (jogo, carta, saiu_em) VALUES (?, ?, ?)").run(jogo, carta, Date.now()); };
const zerarCartas = (jogo) => { bd().prepare("DELETE FROM cartas_saidas WHERE jogo = ?").run(jogo); };

// ---------- a estante de troféus (todas as carreiras) ----------
// o nome do técnico vira a chave do ranking: minúsculas, sem acento e sem espaço sobrando ("João " e "joao" são o mesmo)
const chaveTecnico = (nome) => String(nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
// guarda as conquistas de uma temporada (a mesma conquista não entra duas vezes)
function guardarConquistas(lista) {
  const ins = bd().prepare(`INSERT OR IGNORE INTO estante (carreira, modo, tecnico, chave, clube, competicao, nome, colocacao, pontos, ano, temporada, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  let novas = 0;
  for (const c of lista) {
    const chave = chaveTecnico(c.tecnico); if (!chave) continue;
    novas += ins.run(String(c.carreira), c.modo === "grupo" ? "grupo" : "solo", String(c.tecnico).slice(0, 24), chave, String(c.clube), String(c.competicao), String(c.nome), c.colocacao === 1 ? 1 : 2,
      Math.max(0, Math.round(c.pontos || 0)), c.ano | 0, c.temporada | 0, c.criadoEm || Date.now()).changes;
  }
  return novas;
}
// a estante inteira (só carreiras em grupo; solo e Rumo ao Estrelato ficam guardados mas não entram): o ranking dos técnicos (pontos, títulos, vices, as taças de cada competição e o clube mais vitorioso) e as
// últimas conquistas
function estante({ limite = 50, recentes = 24 } = {}) {
  const linhas = bd().prepare("SELECT * FROM estante WHERE modo = 'grupo' ORDER BY criado_em ASC, id ASC").all();
  const por = new Map();
  for (const l of linhas) {
    const t = por.get(l.chave) || { tecnico: l.tecnico, chave: l.chave, pontos: 0, titulos: 0, vices: 0, tacas: {}, clubes: {}, carreiras: new Set(), ultimo: 0 };
    t.tecnico = l.tecnico; t.pontos += l.pontos; t.carreiras.add(l.carreira); t.ultimo = Math.max(t.ultimo, l.criado_em);
    if (l.colocacao === 1) {
      t.titulos++;
      const x = t.tacas[l.competicao] || (t.tacas[l.competicao] = { competicao: l.competicao, nome: l.nome, n: 0 }); x.n++;
      t.clubes[l.clube] = (t.clubes[l.clube] || 0) + 1;
    } else t.vices++;
    por.set(l.chave, t);
  }
  const ranking = [...por.values()].map(({ carreiras, clubes, ...t }) => ({ ...t, carreiras: carreiras.size, clube: Object.entries(clubes).sort((a, b) => b[1] - a[1])[0]?.[0] || null, tacas: Object.values(t.tacas).sort((a, b) => b.n - a.n) }))
    .sort((a, b) => b.pontos - a.pontos || b.titulos - a.titulos || a.ultimo - b.ultimo).slice(0, limite);
  const ultimas = linhas.filter((l) => l.colocacao === 1).slice(-recentes).reverse()
    .map((l) => ({ tecnico: l.tecnico, clube: l.clube, competicao: l.competicao, nome: l.nome, ano: l.ano, modo: l.modo, em: l.criado_em }));
  return { ranking, ultimas, total: linhas.filter((l) => l.colocacao === 1).length };
}

// Os Pokémon da grama alta da Vila (vila-mato.js): cada linha de "capturas" é um indivíduo com nível e experiência.
// O treinador chega aqui já como hash. A Pokédex ("pokedex") guarda toda espécie que o treinador já teve.
function registrarNaPokedex(treinador, bicho) {
  bd().prepare("INSERT OR IGNORE INTO pokedex (treinador, bicho, primeiro_em) VALUES (?, ?, ?)").run(treinador, bicho, Date.now());
}
function guardarCaptura(treinador, nome, bicho, raridade, brilhante, nivel = 5, origem = "captura") {
  const r = bd().prepare("INSERT INTO capturas (treinador, nome, bicho, raridade, brilhante, capturado_em, nivel, xp, origem) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)")
    .run(treinador, nome, bicho, raridade, brilhante ? 1 : 0, Date.now(), nivel, origem);
  registrarNaPokedex(treinador, bicho);
  return Number(r.lastInsertRowid);
}
// os três iniciais entram uma vez por treinador (no nível 5), como Pokémon de verdade: sobem de nível e evoluem
function garantirIniciais(treinador, nome, iniciais) {
  const tem = bd().prepare("SELECT COUNT(*) AS n FROM capturas WHERE treinador = ? AND origem = 'inicial'").get(treinador);
  if (Number(tem.n)) return false;
  for (const [bicho, raridade] of iniciais) guardarCaptura(treinador, nome || "", bicho, raridade, false, 5, "inicial");
  return true;
}
const individuo = (c) => ({ id: Number(c.id), bicho: c.bicho, raridade: c.raridade, brilhante: !!c.brilhante, nivel: Number(c.nivel), xp: Number(c.xp), origem: c.origem, capturado_em: Number(c.capturado_em) });
// os Pokémon do treinador, um por linha (do nível mais alto para o mais baixo)
function pokemonsDe(treinador) {
  return bd().prepare("SELECT id, bicho, raridade, brilhante, nivel, xp, origem, capturado_em FROM capturas WHERE treinador = ? ORDER BY nivel DESC, xp DESC, id")
    .all(treinador).map(individuo);
}
// sobe o nível, a experiência e (na evolução) a espécie de um Pokémon do treinador
function atualizarPokemon(treinador, id, { bicho, nivel, xp }) {
  bd().prepare("UPDATE capturas SET bicho = ?, nivel = ?, xp = ? WHERE id = ? AND treinador = ?").run(bicho, nivel, xp, id, treinador);
  registrarNaPokedex(treinador, bicho);
}
// a Pokédex: as espécies que o treinador já teve
function pokedexDe(treinador) {
  return bd().prepare("SELECT bicho FROM pokedex WHERE treinador = ? ORDER BY primeiro_em").all(treinador).map((r) => r.bicho);
}
// a coleção para a Pokédex da Vila: uma linha por espécie que tem agora, com quantos, o melhor nível e se já veio brilhante
function capturasDe(treinador) {
  return bd().prepare(`SELECT bicho, raridade, COUNT(*) AS vezes, MAX(brilhante) AS brilhante, MIN(capturado_em) AS primeira, MAX(nivel) AS nivel, MAX(origem = 'inicial') AS inicial
    FROM capturas WHERE treinador = ? GROUP BY bicho ORDER BY primeira`).all(treinador)
    .map((c) => ({ bicho: c.bicho, raridade: c.raridade, vezes: Number(c.vezes), brilhante: !!c.brilhante, primeira: Number(c.primeira), nivel: Number(c.nivel), inicial: !!c.inicial }));
}
// os maiores colecionadores (espécies na Pokédex), pelo nome mais recente de cada treinador; os iniciais não contam
function rankingCapturas(limite = 10) {
  return bd().prepare(`SELECT (SELECT nome FROM capturas d WHERE d.treinador = c.treinador ORDER BY capturado_em DESC LIMIT 1) AS nome,
    (SELECT COUNT(*) FROM pokedex x WHERE x.treinador = c.treinador) AS especies, COUNT(*) AS total
    FROM capturas c WHERE origem = 'captura' GROUP BY treinador ORDER BY especies DESC, total DESC LIMIT ?`).all(limite)
    .map((r) => ({ nome: r.nome, especies: Number(r.especies), total: Number(r.total) }));
}

// ---------- o painel da Pokédex (admin-pokemon.js, /admin/pokedex) ----------
// os treinadores com Pokémon: o nome mais recente, quantos tem, as espécies da Pokédex, o maior nível e a última captura
function treinadoresPokemon(busca = "", limite = 300) {
  const termo = String(busca || "").trim().toLowerCase();
  return bd().prepare(`SELECT treinador, (SELECT nome FROM capturas d WHERE d.treinador = c.treinador AND nome <> '' ORDER BY capturado_em DESC LIMIT 1) AS nome,
    COUNT(*) AS total, SUM(origem = 'captura') AS capturas, MAX(nivel) AS maior, MAX(capturado_em) AS ultima,
    (SELECT COUNT(*) FROM pokedex x WHERE x.treinador = c.treinador) AS especies
    FROM capturas c GROUP BY treinador ORDER BY ultima DESC LIMIT ?`).all(limite)
    .map((r) => ({ treinador: r.treinador, nome: r.nome || "", total: Number(r.total), capturas: Number(r.capturas || 0), maior: Number(r.maior), ultima: Number(r.ultima), especies: Number(r.especies) }))
    .filter((r) => !termo || r.nome.toLowerCase().includes(termo) || r.treinador.startsWith(termo));
}
const capturaPorId = (treinador, id) => { const c = bd().prepare("SELECT id, bicho, raridade, brilhante, nivel, xp, origem, capturado_em FROM capturas WHERE id = ? AND treinador = ?").get(id, treinador); return c ? individuo(c) : null; };
const nomeDoTreinador = (treinador) => (bd().prepare("SELECT nome FROM capturas WHERE treinador = ? AND nome <> '' ORDER BY capturado_em DESC LIMIT 1").get(treinador) || {}).nome || "";
// uma alteração do painel e o registro dela, juntos (ou nenhuma das duas)
function moderarPokemon(treinador, ator, tipo, captura, antes, depois, alterar) {
  const db = bd();
  db.exec("BEGIN");
  try {
    alterar(db);
    db.prepare("INSERT INTO moderacao_pokemon (treinador, ator, tipo, captura, antes, depois, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(treinador, String(ator), tipo, captura ?? null, JSON.stringify(antes ?? null), JSON.stringify(depois ?? null), Date.now());
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
function editarCapturaAdmin(treinador, id, campos, ator) {
  const antes = capturaPorId(treinador, id); if (!antes) return null;
  const depois = { ...antes, ...campos };
  moderarPokemon(treinador, ator, "editar", id, antes, depois, (db) => {
    db.prepare("UPDATE capturas SET bicho = ?, raridade = ?, nivel = ?, xp = ?, brilhante = ? WHERE id = ? AND treinador = ?").run(depois.bicho, depois.raridade, depois.nivel, depois.xp, depois.brilhante ? 1 : 0, id, treinador);
    db.prepare("INSERT OR IGNORE INTO pokedex (treinador, bicho, primeiro_em) VALUES (?, ?, ?)").run(treinador, depois.bicho, Date.now());
  });
  return capturaPorId(treinador, id);
}
function darPokemonAdmin(treinador, { bicho, raridade, nivel, brilhante }, ator) {
  let id = null;
  moderarPokemon(treinador, ator, "dar", null, null, { bicho, nivel, brilhante: !!brilhante }, (db) => {
    id = Number(db.prepare("INSERT INTO capturas (treinador, nome, bicho, raridade, brilhante, capturado_em, nivel, xp, origem) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'captura')")
      .run(treinador, nomeDoTreinador(treinador), bicho, raridade, brilhante ? 1 : 0, Date.now(), nivel).lastInsertRowid);
    db.prepare("INSERT OR IGNORE INTO pokedex (treinador, bicho, primeiro_em) VALUES (?, ?, ?)").run(treinador, bicho, Date.now());
  });
  return capturaPorId(treinador, id);
}
function tirarPokemonAdmin(treinador, id, ator) {
  const antes = capturaPorId(treinador, id); if (!antes) return false;
  moderarPokemon(treinador, ator, "tirar", id, antes, null, (db) => db.prepare("DELETE FROM capturas WHERE id = ? AND treinador = ?").run(id, treinador));
  return true;
}
// todos os Pokémon do treinador num nível (a experiência do nível volta a zero)
function nivelDeTodosAdmin(treinador, nivel, ator) {
  const antes = pokemonsDe(treinador).map((p) => ({ id: p.id, nivel: p.nivel }));
  if (!antes.length) return 0;
  moderarPokemon(treinador, ator, "nivel-todos", null, antes, { nivel }, (db) => db.prepare("UPDATE capturas SET nivel = ?, xp = 0 WHERE treinador = ?").run(nivel, treinador));
  return antes.length;
}
const historicoPokemon = (treinador, limite = 20) => bd().prepare("SELECT ator, tipo, captura, antes, depois, criado_em FROM moderacao_pokemon WHERE treinador = ? ORDER BY id DESC LIMIT ?").all(treinador, limite)
  .map((r) => ({ ator: r.ator, tipo: r.tipo, captura: r.captura, antes: JSON.parse(r.antes || "null"), depois: JSON.parse(r.depois || "null"), em: Number(r.criado_em) }));

module.exports = { treinadoresPokemon, capturaPorId, nomeDoTreinador, editarCapturaAdmin, darPokemonAdmin, tirarPokemonAdmin, nivelDeTodosAdmin, historicoPokemon, guardarCaptura, registrarNaPokedex, garantirIniciais, pokemonsDe, atualizarPokemon, pokedexDe, capturasDe, rankingCapturas, abrir, fechar, migrar, timesPokemonGinasio, salvarTimePokemonGinasio, reporTimePokemonGinasio, fotoJogador, guardarFotoJogador, criarCarreira, carreiraPorToken, recuperarCarreira, salvarCarreira, novoCodigoDe, excluirCarreira, salvarSalaCarreira, salvarEdicaoModeracao, listarCarreiras, carreiraPorId, salvarEdicaoCarreira, historicoModeracao, salasCarreira, apagarSalaCarreira, limparCodigo, cartasSaidas, marcarCarta, zerarCartas, chaveTecnico, guardarConquistas, estante };
