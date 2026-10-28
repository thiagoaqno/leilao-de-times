const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bd = require("../bd.js");
const R = require("../public/corrida/temporada/regras.js");
const E = require("../public/corrida/f1-equipes.js");
const Pilotos = require("../public/corrida/f1-pilotos-2026.js");
const { subirServidor, conectar, esperarEstado } = require("./ajuda.js");
const http = require("node:http");
const { Server } = require("socket.io");
const { io: cliente } = require("socket.io-client");
const attachTemporada = require("../corrida-temporada.js");

process.env.CORRIDA_TV_MS = "0"; // sem a transmissão de TV antes das luzes: a largada vem logo
const chamar = (socket, evento, dados = {}) => new Promise((resolve) => socket.emit(evento, dados, resolve));

function resultado(s, gp) {
  const grid = R.pilotosNoGrid(s);
  const minha = gp % 2 ? 4 : 1, posicoes = Array.from({ length: 20 }, (_, i) => i + 1).filter((n) => n !== minha);
  return [{ piloto: "voce", equipe: s.equipe, pos: minha, pontos: R.PONTOS[minha - 1] },
    ...grid.map((p, i) => ({ piloto: p.id, equipe: p.equipe, pos: posicoes[i], pontos: R.PONTOS[posicoes[i] - 1] || 0 }))];
}

test("mini temporada de quatro GPs: grid, tabelas, finanças e continuidade", () => {
  const s = R.criar("Thiago", "cadillac", 4, 2, 170);
  assert.deepEqual(s.calendario.map((x) => x.pista), ["melbourne", "monaco", "monza", "interlagos"]);
  const ids = R.pilotosNoGrid(s).map((p) => p.id);
  assert.equal(ids.length, 19); assert.equal(new Set(ids).size, 19);
  assert.equal(R.pilotosNoGrid(s)[0].equipe, "cadillac");
  const caixaInicial = s.caixa;
  for (let gp = 0; gp < 4; gp++) R.registrarResultado(s, resultado(s, gp));
  assert.equal(s.gp, 4); assert.equal(s.resultados.length, 4);
  assert.equal(R.tabelas(s).pilotos.find((p) => p.id === "voce").pontos, 74);
  assert.equal(R.tabelas(s).equipes.find((e) => e.id === "cadillac").pontos >= 74, true);
  assert.ok(s.caixa > caixaInicial);
  assert.throws(() => R.registrarResultado(s, resultado(s, 4)), /terminou/);
  const caixa = s.caixa;
  R.proximaTemporada(s);
  assert.equal(s.ano, 2); assert.equal(s.gp, 0); assert.equal(s.caixa, caixa);
  assert.equal(R.tabelas(s).pilotos.find((p) => p.id === "voce").pontos, 0);
});

test("mercado, desenvolvimento e teto de gastos são validados no servidor", () => {
  const s = R.criar("Thiago", "cadillac", 4, 3, 1);
  assert.equal(E.custoDaMontagem(s.montagem), 0, "carreira nova começa com todos os pontos livres");
  s.montagem = E.montagemPadrao(s.equipe);
  assert.throws(() => R.conferirMontagem(s, { ...s.montagem, motor: s.montagem.motor + 1 }), /orçamento/);
  R.desenvolver(s);
  const nova = R.conferirMontagem(s, { ...s.montagem, motor: s.montagem.motor + 1 });
  assert.equal(E.custoDaMontagem(nova), E.EQUIPES.cadillac.orcamento + 1);
  s.montagem = nova;
  R.contratarPiloto(s, "verstappen");
  assert.equal(R.pilotosNoGrid(s)[0].equipe, "cadillac");
  assert.equal(R.pilotosNoGrid(s)[0].id, "verstappen");
  assert.equal(R.pilotosNoGrid(s).length, 19);
  R.contratarEngenheiro(s, "mecanico", 1);
  assert.equal(s.engenheiros.mecanico, 1);
  assert.throws(() => R.contratarPiloto(s, "inexistente"), /indisponível/);
  s.caixa = 200; s.gasto = 139;
  assert.throws(() => R.desenvolver(s), /Teto de gastos/);
  assert.equal(s.bonus, 1);
  for (const p of R.pilotosNoGrid(s)) assert.ok(Pilotos.PILOTOS.some((x) => x.id === p.id));
});

test("save F1 resiste a reinício; token e recuperação são substituídos com segurança", () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "corrida-temporada-"));
  const arquivo = path.join(pasta, "galera.db");
  try {
    bd.abrir(arquivo);
    const s = R.criar("Thiago", "ferrari", 4, 2, 18);
    const novo = bd.criarTemporadaCorrida("Thiago", s);
    assert.ok(bd.temporadaCorridaPorToken(novo.token));
    const outro = bd.recuperarTemporadaCorrida(novo.recuperacao);
    assert.equal(bd.temporadaCorridaPorToken(novo.token), null);
    assert.equal(outro.dados.equipe, "ferrari");
    R.registrarResultado(outro.dados, resultado(outro.dados, 0));
    assert.ok(bd.salvarTemporadaCorrida(outro.id, outro.dados, 0));
    assert.equal(bd.salvarTemporadaCorrida(outro.id, outro.dados, 0), false, "GP duplicado não avança");
    bd.fechar(); bd.abrir(arquivo);
    assert.equal(bd.temporadaCorridaPorToken(outro.token).dados.gp, 1);
    const codigo = bd.novoCodigoTemporadaCorrida(outro.id);
    assert.equal(bd.recuperarTemporadaCorrida(novo.recuperacao), null);
    assert.ok(bd.recuperarTemporadaCorrida(codigo));
  } finally { bd.fechar(); fs.rmSync(pasta, { recursive: true, force: true }); }
});

test("sede abre GP privado, fixa companheiro e exige acesso da temporada", { timeout: 30000 }, async () => {
  const servidor = await subirServidor(), sede = await conectar(servidor.url, "/corrida-temporada");
  let pista, intruso;
  try {
    const criado = await chamar(sede, "criar", { nome: "Thiago", equipe: "cadillac", tamanho: 4, voltas: 2 });
    assert.equal(criado.ok, true, criado.erro);
    assert.equal(criado.dados.gp, 0);
    const errado = await chamar(sede, "montagem", { montagem: Object.fromEntries(E.ORDEM.map((k) => [k, 8])) });
    assert.equal(errado.ok, false);
    const acesso = await chamar(sede, "iniciarGP");
    assert.equal(acesso.ok, true, acesso.erro);
    const repetido = await chamar(sede, "iniciarGP");
    assert.deepEqual(repetido.acesso, acesso.acesso, "não abre dois GPs para o mesmo save");
    pista = await conectar(servidor.url, "/corrida");
    const entrou = await chamar(pista, "join", acesso.acesso);
    assert.equal(entrou.ok, true, entrou.error);
    const estado = await esperarEstado(pista, (s) => s.phase === "quali" && s.players.length === 20);
    assert.equal(estado.temporada, true);
    assert.equal(estado.config.pista, "melbourne");
    assert.equal(estado.players.filter((p) => p.bot && p.equipe === "cadillac").length, 1);
    intruso = await conectar(servidor.url, "/corrida");
    assert.equal((await chamar(intruso, "join", { code: acesso.acesso.code, watch: true })).ok, false);
    const proibido = await chamar(pista, "act", { type: "end" });
    assert.equal(proibido.ok, false);
    const reaberto = await chamar(sede, "abrir", { token: criado.token });
    assert.equal(reaberto.ok, true); assert.equal(reaberto.dados.gp, 0, "o GP só avança ao terminar");
  } finally { sede.disconnect(); pista?.disconnect(); intruso?.disconnect(); await servidor.parar(); }
});

test("quatro bandeiradas avançam exatamente quatro GPs pelo canal da sede", { timeout: 15000 }, async () => {
  bd.abrir(":memory:");
  const servidor = http.createServer(), io = new Server(servidor);
  const abertas = [];
  attachTemporada(io, { abrirGP(s, callback) { abertas.push({ s, callback }); return { code: `GP${abertas.length}`, id: "h", token: "acesso" }; }, salaGP() { return { phase: "race" }; } });
  await new Promise((resolve) => servidor.listen(0, resolve));
  const socket = cliente(`http://localhost:${servidor.address().port}/corrida-temporada`, { transports: ["websocket"], forceNew: true });
  await new Promise((resolve) => socket.once("connect", resolve));
  let outro;
  try {
    const criado = await chamar(socket, "criar", { nome: "Thiago", equipe: "cadillac", tamanho: 4, voltas: 2 });
    assert.ok(criado.ok);
    for (let gp = 0; gp < 4; gp++) {
      const inicio = await chamar(socket, "iniciarGP"); assert.ok(inicio.ok);
      const atual = abertas.at(-1), linhas = resultado(atual.s, gp);
      const room = { players: {}, resultado: [] };
      room.resultado = linhas.map((r, i) => {
        const id = i ? `r${i}` : "h";
        roomSet(id, r);
        return { id, pos: r.pos, pontos: r.pontos, dnf: false, nc: false };
      });
      function roomSet(id, r) { room.players[id] = id === "h" ? { bot: false, equipe: r.equipe } : { bot: true, piloto: { id: r.piloto }, equipe: r.equipe }; }
      atual.callback(room);
      atual.callback(room);
      const salvo = await chamar(socket, "abrir", { token: criado.token });
      assert.equal(salvo.dados.gp, gp + 1);
      assert.equal(salvo.dados.resultados.length, gp + 1);
    }
    const final = await chamar(socket, "abrir", { token: criado.token });
    assert.equal(final.tabelas.pilotos.find((p) => p.id === "voce").pontos, 74);
    outro = cliente(`http://localhost:${servidor.address().port}/corrida-temporada`, { transports: ["websocket"], forceNew: true });
    await new Promise((resolve) => outro.once("connect", resolve));
    const recuperado = await chamar(outro, "recuperar", { codigo: criado.recuperacao });
    assert.ok(recuperado.ok);
    let atualizacoesAntigas = 0;
    socket.on("estado", () => atualizacoesAntigas++);
    assert.equal((await chamar(socket, "proximaTemporada")).ok, false, "token antigo perde acesso");
    assert.ok((await chamar(outro, "proximaTemporada")).ok);
    assert.equal(atualizacoesAntigas, 0, "socket antigo não recebe o novo save ou acesso do GP");
  } finally { socket.disconnect(); outro?.disconnect(); await new Promise((resolve) => io.close(resolve)); bd.fechar(); }
});

test("excluir a carreira: token errado é recusado, o certo apaga e o código de recuperação para de valer; GP aberto recusa", { timeout: 30000 }, async () => {
  const servidor = await subirServidor(), sede = await conectar(servidor.url, "/corrida-temporada");
  let outra, nova;
  try {
    const criado = await chamar(sede, "criar", { nome: "Thiago", equipe: "cadillac", tamanho: 4, voltas: 2 });
    assert.equal(criado.ok, true, criado.erro);
    outra = await conectar(servidor.url, "/corrida-temporada");
    const errado = await chamar(outra, "excluir", { token: "errado" });
    assert.equal(errado.ok, false);
    assert.equal((await chamar(sede, "abrir", { token: criado.token })).ok, true, "o save continua lá");
    // GP aberto: recusa com mensagem clara e o save continua
    const gp = await chamar(sede, "iniciarGP"); assert.equal(gp.ok, true, gp.erro);
    const recusado = await chamar(sede, "excluir", { token: criado.token });
    assert.equal(recusado.ok, false); assert.match(recusado.erro, /GP está aberto/);
    assert.equal((await chamar(outra, "abrir", { token: criado.token })).ok, true);
    // o GP some (a sala é fechada pelo servidor ao terminar); aqui usamos outra temporada sem GP aberto
    nova = await conectar(servidor.url, "/corrida-temporada");
    const segunda = await chamar(nova, "criar", { nome: "Maria", equipe: "ferrari", tamanho: 4, voltas: 2 });
    const rec = segunda.recuperacao;
    const apagou = await chamar(nova, "excluir", { token: segunda.token });
    assert.equal(apagou.ok, true, apagou.erro);
    assert.equal((await chamar(nova, "abrir", { token: segunda.token })).ok, false, "o token deixou de valer");
    assert.equal((await chamar(nova, "recuperar", { codigo: rec })).ok, false, "o código de recuperação deixou de valer");
    assert.equal((await chamar(nova, "montagem", { montagem: segunda.dados.montagem })).ok, false, "o socket não aponta mais para o save");
  } finally { sede.disconnect(); outra?.disconnect(); nova?.disconnect(); await servidor.parar(); }
});

test("excluir no banco apaga a linha do save", () => {
  bd.abrir(":memory:");
  try {
    const c = bd.criarTemporadaCorrida("Ana", R.criar("Ana", "cadillac", 4, 2, 5));
    assert.ok(bd.temporadaCorridaPorToken(c.token));
    assert.equal(bd.excluirTemporadaCorrida(c.id), true);
    assert.equal(bd.temporadaCorridaPorId(c.id), null);
    assert.equal(bd.temporadaCorridaPorToken(c.token), null);
    assert.equal(bd.recuperarTemporadaCorrida(c.recuperacao), null);
    assert.equal(bd.excluirTemporadaCorrida(c.id), false);
  } finally { bd.fechar(); }
});

test("a dificuldade dos robôs vai no save, com médio como padrão", () => {
  assert.equal(R.criar("Ana", "mclaren", 8, 3, 1).nivel, "medio");
  assert.equal(R.criar("Ana", "mclaren", 8, 3, 1, "dificil").nivel, "dificil");
  assert.throws(() => R.criar("Ana", "mclaren", 8, 3, 1, "absurdo"), /Nível/);
});
