// A temporada de F1 com os amigos: as regras da sala (puras) e o servidor de verdade (sala, GP ao vivo, mercado, reconexão e reinício).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { Server } = require("socket.io");
const { io: cliente } = require("socket.io-client");
process.env.CORRIDA_ASSUME_MS = "60"; // a sala de F1 lê isto ao ligar
process.env.CORRIDA_ESPERA_GRUPO_MS = "60000";
const bd = require("../bd.js");
const G = require("../public/corrida/temporada/grupo-regras.js");
const Quali = require("../corrida-f1-classificacao.js");
const attachCorrida = require("../corrida.js");
const attachGrupo = require("../corrida-temporada-grupo.js");

const chamar = (socket, evento, dados = {}) => new Promise((resolve) => socket.emit(evento, dados, resolve));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperarAte(cond, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await cond(); if (v) return v; await dormir(25); } throw Error("Tempo esgotado"); }

async function subir(arquivo) {
  bd.abrir(arquivo || ":memory:");
  const servidor = http.createServer(), io = new Server(servidor);
  const corrida = attachCorrida(io), grupo = attachGrupo(io, corrida);
  await new Promise((resolve) => servidor.listen(0, resolve));
  const url = `http://localhost:${servidor.address().port}`, abertos = [];
  async function ligar(canal = "/corrida-temporada-grupo") {
    const s = cliente(url + canal, { transports: ["websocket"], forceNew: true, reconnection: false });
    s.gp = null; s.estado = null;
    s.on("gp", (a) => { s.gp = a; }); s.on("estado", (e) => { s.estado = e; });
    await new Promise((resolve, erro) => { s.once("connect", resolve); s.once("connect_error", erro); });
    abertos.push(s); return s;
  }
  return { url, io, corrida, grupo, ligar, async parar() { for (const s of abertos) s.disconnect(); await new Promise((r) => io.close(r)); bd.fechar(); } };
}

test("regras: dois na mesma equipe, mercado disputado, versão da montagem e histórico", () => {
  const sala = G.criarSala("ABCDE", { id: "a", nome: "Ana", tokenHash: "x" });
  for (const [id, nome] of [["b", "Beto"], ["c", "Caio"], ["d", "Duda"]]) G.entrar(sala, { id, nome, tokenHash: id });
  assert.throws(() => G.entrar(sala, { id: "z", nome: "ana", tokenHash: "z" }), /nome/);
  G.escolherEquipe(sala, "a", "cadillac"); G.escolherEquipe(sala, "b", "cadillac");
  assert.throws(() => G.escolherEquipe(sala, "c", "cadillac"), /dois carros/);
  G.escolherEquipe(sala, "c", "ferrari"); G.escolherEquipe(sala, "d", "williams");
  assert.throws(() => G.iniciar(sala, "b"), /anfitrião/);
  G.definirOpcoes(sala, "a", { tamanho: 4, voltas: 2 });
  G.iniciar(sala, "a", 77);
  assert.throws(() => G.escolherEquipe(sala, "c", "haas"), /fechadas/);
  assert.equal(sala.pessoas.a.carro, 0); assert.equal(sala.pessoas.b.carro, 1);
  // os dois titulares da Cadillac saem do grid; a Ferrari fica com Leclerc de companheiro e Hamilton livre
  assert.equal(sala.contratos.perez, null); assert.equal(sala.contratos.bottas, null);
  assert.equal(sala.contratos.leclerc, "ferrari"); assert.equal(sala.contratos.hamilton, null);
  const grid = G.gridDoGP(sala);
  assert.equal(grid.humanos.length + grid.robos.length, 20);
  assert.equal(grid.robos.some((p) => p.equipe === "cadillac"), false);
  // a equipe dividida mexe no mesmo carro: quem fez fica no histórico e a versão avisa de pedido velho
  const v0 = sala.equipes.cadillac.versao, m = { ...sala.equipes.cadillac.montagem };
  G.montar(sala, "a", { ...m, motor: m.motor - 1, freios: m.freios + 1 }, v0);
  assert.throws(() => G.montar(sala, "b", { ...m, aero: m.aero + 1 }, v0), /mudou/);
  assert.equal(sala.equipes.cadillac.historico.at(-1).quem, "Ana");
  G.desenvolver(sala, "b");
  assert.equal(sala.equipes.cadillac.historico.at(-1).quem, "Beto");
  assert.equal(sala.equipes.cadillac.bonus, 1);
  assert.throws(() => G.contratarPiloto(sala, "a", "verstappen"), /dois pilotos humanos/);
  // mercado: o piloto e o engenheiro só vão para uma equipe
  G.contratarPiloto(sala, "c", "verstappen");
  assert.equal(sala.contratos.leclerc, null, "o antigo companheiro volta ao mercado");
  assert.throws(() => G.contratarPiloto(sala, "d", "verstappen"), /não vai para duas equipes/);
  assert.throws(() => G.contratarPiloto(sala, "d", "inexistente"), /indisponível/);
  G.contratarEngenheiro(sala, "c", "mecanico", 1);
  assert.throws(() => G.contratarEngenheiro(sala, "d", "mecanico", 1), /já trabalha/);
  G.contratarEngenheiro(sala, "d", "mecanico", 2);
});

test("regras: o resultado fecha as tabelas, só uma vez por GP, e o campeão sai no fim", () => {
  const sala = G.criarSala("ABCDE", { id: "a", nome: "Ana", tokenHash: "x" });
  G.entrar(sala, { id: "b", nome: "Beto", tokenHash: "y" });
  G.escolherEquipe(sala, "a", "mclaren"); G.escolherEquipe(sala, "b", "mclaren");
  G.definirOpcoes(sala, "a", { tamanho: 4 }); G.iniciar(sala, "a", 5);
  const PONTOS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  const linhaDe = (gp) => {
    const g = G.gridDoGP(sala), ids = G.idsEsperados(sala);
    const eq = (id) => (id.startsWith("h:") ? "mclaren" : g.robos.find((p) => p.id === id).equipe);
    return ids.map((id, i) => { const pos = ((i + gp) % ids.length) + 1; return { piloto: id, equipe: eq(id), pos, pontos: PONTOS[pos - 1] || 0 }; });
  };
  for (let gp = 0; gp < 4; gp++) {
    const caixa = sala.equipes.mclaren.caixa;
    G.registrarResultado(sala, linhaDe(gp));
    assert.equal(sala.gp, gp + 1);
    assert.notEqual(sala.equipes.mclaren.caixa, caixa);
  }
  assert.throws(() => G.registrarResultado(sala, linhaDe(0)), /terminou/);
  const t = G.tabelas(sala);
  assert.equal(sala.campeoes.length, 1); assert.equal(sala.campeoes[0].piloto, t.pilotos[0].id);
  assert.equal(t.equipes.find((e) => e.id === "mclaren").pontos, t.pilotos.filter((p) => p.equipe === "mclaren").reduce((s, p) => s + p.pontos, 0));
  assert.throws(() => G.proximaTemporada(sala, "b"), /anfitrião/);
  G.proximaTemporada(sala, "a");
  assert.equal(sala.ano, 2); assert.equal(sala.gp, 0); assert.equal(G.tabelas(sala).pilotos[0].pontos, 0);
  assert.throws(() => G.registrarResultado(sala, linhaDe(0).slice(1)), /incompleto/);
});

test("servidor: sala, equipes (inclusive a mesma), mercado disputado, GP ao vivo e as mesmas tabelas para todos", { timeout: 60000 }, async () => {
  const srv = await subir();
  try {
    const [a, b, c, d] = await Promise.all([srv.ligar(), srv.ligar(), srv.ligar(), srv.ligar()]);
    const criada = await chamar(a, "criar", { nome: "Ana" });
    assert.equal(criada.ok, true, criada.error);
    const codigo = criada.codigo;
    for (const [s, nome] of [[b, "Beto"], [c, "Caio"], [d, "Duda"]]) assert.equal((await chamar(s, "entrar", { codigo, nome })).ok, true);
    assert.equal((await chamar(await srv.ligar(), "entrar", { codigo, nome: "ana" })).ok, false, "nome repetido");
    assert.equal((await chamar(a, "equipe", { id: "cadillac" })).ok, true);
    assert.equal((await chamar(b, "equipe", { id: "cadillac" })).ok, true, "dois amigos na mesma equipe");
    const terceiro = await chamar(c, "equipe", { id: "cadillac" });
    assert.equal(terceiro.ok, false); assert.match(terceiro.error, /dois carros/);
    assert.equal((await chamar(c, "equipe", { id: "ferrari" })).ok, true);
    assert.equal((await chamar(d, "equipe", { id: "williams" })).ok, true);
    assert.equal((await chamar(b, "opcoes", { tamanho: 4 })).ok, false, "só o anfitrião muda o calendário");
    assert.equal((await chamar(a, "opcoes", { tamanho: 4, voltas: 2, nivel: "facil" })).ok, true);
    assert.equal((await chamar(b, "iniciar")).ok, false, "só o anfitrião começa");
    const comecou = await chamar(a, "iniciar");
    assert.equal(comecou.ok, true, comecou.error);
    assert.equal(comecou.estado.fase, "temporada"); assert.equal(comecou.estado.calendario.length, 4);
    // o mercado é disputado
    assert.equal((await chamar(c, "piloto", { id: "verstappen" })).ok, true);
    const repetido = await chamar(d, "piloto", { id: "verstappen" });
    assert.equal(repetido.ok, false); assert.match(repetido.error, /duas equipes/);
    assert.equal((await chamar(c, "engenheiro", { area: "mecanico", nivel: 2 })).ok, true);
    const eng = await chamar(d, "engenheiro", { area: "mecanico", nivel: 2 });
    assert.equal(eng.ok, false); assert.match(eng.error, /já trabalha/);
    // a equipe dividida: os dois veem a mesma equipe, com o histórico
    const montagem = { ...comecou.estado.equipes.cadillac.montagem };
    const vA = (await chamar(a, "estado")).estado.equipes.cadillac.versao;
    const feito = await chamar(a, "montagem", { montagem: { ...montagem, motor: montagem.motor - 1, aero: montagem.aero + 1 }, versao: vA });
    assert.equal(feito.ok, true, feito.error);
    assert.equal((await chamar(b, "montagem", { montagem, versao: vA })).ok, false, "pedido velho da equipe é recusado");
    await esperarAte(() => b.estado && b.estado.equipes.cadillac.historico.length === 1);
    assert.equal(b.estado.equipes.cadillac.historico[0].quem, "Ana");
    // o GP: só o anfitrião abre
    assert.equal((await chamar(b, "iniciarGP")).ok, false);
    const gp = await chamar(a, "iniciarGP");
    assert.equal(gp.ok, true, gp.error);
    await esperarAte(() => [a, b, c, d].every((s) => s.gp));
    assert.equal(a.gp.code, b.gp.code);
    assert.equal((await chamar(a, "montagem", { montagem })).ok, false, "com o GP aberto a gestão fecha");
    assert.equal((await chamar(a, "iniciarGP")).ok, true);
    assert.equal(a.gp.code, b.gp.code, "não abre dois GPs");
    // os quatro entram na sala de F1
    const pistas = [];
    for (const s of [a, b, c, d]) { const p = await srv.ligar("/corrida"); pistas.push(p); const r = await chamar(p, "join", s.gp); assert.equal(r.ok, true, r.error); }
    const espectador = await srv.ligar("/corrida");
    assert.equal((await chamar(espectador, "join", { code: a.gp.code, watch: true })).ok, false, "sem o acesso da sala, nada de assistir");
    const sala = await esperarAte(() => { const r = srv.corrida.internos.sala(a.gp.code); return r && r.phase === "quali" && r; });
    assert.equal(sala.order.length, 20);
    const todos = sala.order.map((id) => sala.players[id]);
    assert.equal(todos.filter((p) => !p.bot).length, 4);
    assert.deepEqual(todos.filter((p) => !p.bot && p.equipe === "cadillac").map((p) => p.name).sort(), ["Ana", "Beto"]);
    assert.equal(todos.filter((p) => p.bot && p.equipe === "cadillac").length, 0);
    assert.equal(todos.filter((p) => p.equipe === "ferrari").map((p) => (p.bot ? p.piloto.id : "humano")).sort().join(), "humano,verstappen");
    assert.equal(sala.montagens.cadillac.motor, montagem.motor - 1, "a montagem da equipe dividida vale para os dois carros");
    // a bandeirada: o resultado entra na temporada de todos de uma vez, uma vez só
    Quali.cancelar(sala);
    sala.phase = "race";
    sala.order.forEach((id, i) => Object.assign(sala.players[id], { laps: sala.config.voltas, finish: 100 + i, dnf: false }));
    sala.finishOrder = sala.order.slice();
    srv.corrida.internos.endRace(sala);
    srv.corrida.internos.endRace(sala);
    await esperarAte(() => a.estado && a.estado.resultados.length === 1 && !a.estado.gpAberto);
    await esperarAte(() => [b, c, d].every((s) => s.estado && s.estado.resultados.length === 1 && !s.estado.gpAberto));
    for (const s of [b, c, d]) { assert.deepEqual(s.estado.tabelas, a.estado.tabelas); assert.deepEqual(s.estado.resultados, a.estado.resultados); }
    assert.equal(a.estado.resultados[0].linhas.length, 20);
    assert.equal(a.estado.gp, 1); assert.equal(a.estado.acesso, null);
    const t = a.estado.tabelas;
    assert.equal(t.equipes.find((e) => e.id === "cadillac").pontos, t.pilotos.filter((p) => p.equipe === "cadillac").reduce((s, p) => s + p.pontos, 0));
    assert.equal(a.estado.gpAberto, false);
    for (const p of pistas) p.disconnect();
    espectador.disconnect();
  } finally { await srv.parar(); }
});

test("servidor: reconexão com o token, token errado e o servidor reiniciando sem perder a temporada", { timeout: 60000 }, async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "temporada-grupo-")), arquivo = path.join(pasta, "galera.db");
  let srv = await subir(arquivo);
  try {
    const a = await srv.ligar(), b = await srv.ligar();
    const ana = await chamar(a, "criar", { nome: "Ana" }), codigo = ana.codigo;
    const beto = await chamar(b, "entrar", { codigo, nome: "Beto" });
    await chamar(a, "equipe", { id: "mclaren" }); await chamar(b, "equipe", { id: "mclaren" });
    await chamar(a, "opcoes", { tamanho: 4 });
    assert.equal((await chamar(a, "iniciar")).ok, true);
    assert.equal((await chamar(b, "desenvolver")).ok, true);
    // cai e volta com o token; com o token errado não entra no lugar dos outros
    a.disconnect();
    const a2 = await srv.ligar();
    const errado = await chamar(a2, "entrar", { codigo, id: ana.id, token: "errado" });
    assert.equal(errado.ok, false);
    const volta = await chamar(a2, "entrar", { codigo, id: ana.id, token: ana.token });
    assert.equal(volta.ok, true, volta.error);
    assert.equal(volta.estado.eu, ana.id); assert.equal(volta.estado.equipes.mclaren.bonus, 1);
    assert.equal(volta.estado.pessoas.find((p) => p.id === beto.id).online, true);
    assert.equal(JSON.stringify(volta.estado).includes("tokenHash"), false, "o hash não sai do servidor");
    assert.equal(JSON.stringify(bd.salasTemporadaCorrida()).includes(ana.token), false, "só o hash do token vai para o banco");
    await srv.parar();
    // o servidor reinicia: a sala volta do banco
    srv = await subir(arquivo);
    const c = await srv.ligar();
    const denovo = await chamar(c, "entrar", { codigo, id: beto.id, token: beto.token });
    assert.equal(denovo.ok, true, denovo.error);
    assert.equal(denovo.estado.fase, "temporada"); assert.equal(denovo.estado.equipes.mclaren.bonus, 1);
    assert.equal(denovo.estado.equipes.mclaren.historico[0].quem, "Beto");
    assert.equal(denovo.estado.host, ana.id);
    assert.equal((await chamar(c, "iniciarGP")).ok, false, "só o anfitrião abre o GP, mesmo depois do reinício");
    assert.equal((await chamar(c, "passarCargo", { id: beto.id })).ok, false);
  } finally { await srv.parar(); fs.rmSync(pasta, { recursive: true, force: true }); }
});

test("servidor: quem cai no meio do GP tem o carro levado por um robô e o retoma ao voltar", { timeout: 60000 }, async () => {
  const srv = await subir();
  let sala = null;
  try {
    const a = await srv.ligar(), b = await srv.ligar();
    const ana = await chamar(a, "criar", { nome: "Ana" });
    await chamar(b, "entrar", { codigo: ana.codigo, nome: "Beto" });
    await chamar(a, "equipe", { id: "haas" }); await chamar(b, "equipe", { id: "alpine" });
    await chamar(a, "opcoes", { tamanho: 4, voltas: 2 }); await chamar(a, "iniciar");
    await chamar(a, "iniciarGP");
    await esperarAte(() => a.gp && b.gp);
    const pa = await srv.ligar("/corrida"), pb = await srv.ligar("/corrida");
    assert.equal((await chamar(pa, "join", a.gp)).ok, true); assert.equal((await chamar(pb, "join", b.gp)).ok, true);
    sala = await esperarAte(() => { const r = srv.corrida.internos.sala(a.gp.code); return r && r.phase === "quali" && r; });
    srv.corrida.internos.startRace(sala, null);
    sala.startAt = Date.now(); sala.luzes = null;
    const eu = sala.players[a.gp.id];
    pa.disconnect();
    await esperarAte(() => eu.assumido === true);
    assert.equal(eu.bot, true);
    const antes = eu.sim.c.tick;
    await esperarAte(() => eu.sim.c.tick > antes + 20);
    assert.equal(!!sala.players[b.gp.id].bot, false, "o outro amigo segue no próprio carro");
    // a pessoa volta e retoma o carro de onde ele está
    const pa2 = await srv.ligar("/corrida");
    const volta = await chamar(pa2, "join", a.gp);
    assert.equal(volta.ok, true, volta.error);
    assert.equal(eu.assumido, false); assert.equal(eu.bot, false); assert.equal(eu.ia, undefined);
    assert.equal(eu.pessoa, ana.id);
  } finally { if (sala) { Quali.cancelar(sala); srv.corrida.internos.endRace(sala); } await srv.parar(); }
});

test("regras: sair da temporada devolve o carro a um robô", () => {
  const sala = G.criarSala("ABCDE", { id: "a", nome: "Ana", tokenHash: "x" });
  for (const [id, nome] of [["b", "Beto"], ["c", "Caio"]]) G.entrar(sala, { id, nome, tokenHash: id });
  G.escolherEquipe(sala, "a", "cadillac"); G.escolherEquipe(sala, "b", "cadillac"); G.escolherEquipe(sala, "c", "ferrari");
  G.iniciar(sala, "a", 9);
  assert.equal(sala.contratos.perez, null);
  // dividiam a Cadillac: Beto fica com o carro 1 e o outro carro volta para um titular real
  assert.equal(G.dispensar(sala, "a"), "saiu");
  assert.equal(sala.pessoas.a, undefined); assert.equal(sala.host, "b");
  assert.equal(sala.pessoas.b.carro, 0);
  assert.equal(sala.equipes.cadillac.companheiro, "perez"); assert.equal(sala.contratos.perez, "cadillac");
  assert.equal(G.gridDoGP(sala).humanos.length, 2);
  // sozinho na Ferrari: ao sair, a equipe inteira volta aos robôs (os dois carros)
  assert.equal(G.dispensar(sala, "c"), "saiu");
  assert.equal(sala.equipes.ferrari, undefined);
  assert.equal(sala.contratos.leclerc, "ferrari"); assert.equal(sala.contratos.hamilton, "ferrari");
  const grid = G.gridDoGP(sala);
  assert.equal(grid.humanos.length, 1); assert.equal(grid.humanos.length + grid.robos.length, 20);
  assert.equal(grid.robos.filter((p) => p.equipe === "ferrari").length, 2);
  // o último com carro sai: a sala acaba
  assert.equal(G.dispensar(sala, "b"), "encerrada");
});

test("servidor: sair da temporada devolve o carro ao robô e o anfitrião encerra a sala (some do banco)", { timeout: 60000 }, async () => {
  const srv = await subir();
  try {
    const [a, b, c] = await Promise.all([srv.ligar(), srv.ligar(), srv.ligar()]);
    const ana = await chamar(a, "criar", { nome: "Ana" }), codigo = ana.codigo;
    assert.equal((await chamar(b, "entrar", { codigo, nome: "Beto" })).ok, true);
    assert.equal((await chamar(c, "entrar", { codigo, nome: "Caio" })).ok, true);
    await chamar(a, "equipe", { id: "cadillac" }); await chamar(b, "equipe", { id: "cadillac" }); await chamar(c, "equipe", { id: "ferrari" });
    await chamar(a, "opcoes", { tamanho: 4, voltas: 2 });
    assert.equal((await chamar(a, "iniciar")).ok, true);
    // Beto sai: o outro carro da Cadillac volta para um robô e a sala continua para os outros
    const saiu = await chamar(b, "sairDaTemporada"); assert.equal(saiu.ok, true, saiu.error);
    const vista = await chamar(a, "estado");
    assert.equal(vista.estado.pessoas.some((p) => p.nome === "Beto"), false);
    assert.equal(vista.estado.equipes.cadillac.companheiro, "perez");
    assert.equal((await chamar(b, "estado")).ok, false, "quem saiu não está mais na sala");
    // só o anfitrião encerra
    const naoHost = await chamar(c, "encerrar"); assert.equal(naoHost.ok, false); assert.match(naoHost.error, /anfitrião/);
    assert.equal(bd.salasTemporadaCorrida().some((s) => s.codigo === codigo), true);
    // GP aberto: não encerra
    assert.equal((await chamar(a, "iniciarGP")).ok, true);
    const aberto = await chamar(a, "encerrar"); assert.equal(aberto.ok, false); assert.match(aberto.error, /GP está aberto/);
    assert.equal((await chamar(c, "sairDaTemporada")).ok, false, "também não sai com o GP aberto");
    const sala = srv.corrida.salaGP(srv.grupo.ativos.get(codigo).code);
    Quali.cancelar(sala); sala.phase = "results"; // o GP acabou (a sala da Corrida já está na tela de resultado)
    let aviso = null; c.on("encerrada", (d) => { aviso = d; });
    const fim = await chamar(a, "encerrar"); assert.equal(fim.ok, true, fim.error);
    await esperarAte(() => aviso);
    assert.match(aviso.motivo, /encerrou/);
    assert.equal(bd.salasTemporadaCorrida().some((s) => s.codigo === codigo), false, "a sala sumiu do banco");
    assert.equal(srv.grupo.salas.has(codigo), false);
    assert.equal((await chamar(await srv.ligar(), "entrar", { codigo, nome: "Dani" })).ok, false);
  } finally { await srv.parar(); }
});
