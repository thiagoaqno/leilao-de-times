// Carreira em grupo pelo canal de verdade (com os tempos acelerados): a rodada ao vivo (recarregar no meio volta no
// mesmo ponto) e o mercado disputado (o leilão com três amigos, o martelo do dono e o olheiro).
const test = require("node:test");
const assert = require("node:assert");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

let srv;
test.before(async () => { srv = await subirServidor({ CARREIRA_VEL: "30", CARREIRA_DECISAO_MS: "8000", CARREIRA_LANCE_MS: "700", CARREIRA_ESPERA_MS: "0" }); });
test.after(async () => { await srv.parar(); });

const canal = () => conectar(srv.url, "/carreira-online");
const agir = (s, d) => pedir(s, "act", d);
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
// uma sala começada, com um clube para cada um
async function sala(clubes, opcoes = {}) {
  const ss = [];
  for (let i = 0; i < clubes.length; i++) ss.push(await canal());
  const c = await pedir(ss[0], "create", { name: "P0" }), creds = [c];
  for (let i = 1; i < clubes.length; i++) creds.push(await pedir(ss[i], "join", { code: c.code, name: `P${i}` }));
  if (Object.keys(opcoes).length) await agir(ss[0], { type: "opcoes", ...opcoes });
  for (let i = 0; i < clubes.length; i++) await agir(ss[i], { type: "clube", clube: clubes[i] });
  await agir(ss[0], { type: "comecar" });
  await esperarEstado(ss[0], (s) => s.fase === "carreira");
  return { ss, creds, code: c.code };
}
// o próximo evento "rodada" que satisfaz a condição
const esperarRodada = (s, cond, ms = 20000) => new Promise((ok, erro) => {
  const t = setTimeout(() => { s.off("rodada", f); erro(new Error("tempo esgotado esperando a rodada")); }, ms);
  const f = (v) => { if (v && cond(v)) { clearTimeout(t); s.off("rodada", f); ok(v); } };
  s.on("rodada", f);
});

test("rodada ao vivo: só o anfitrião começa, a parada espera a decisão e recarregar volta no mesmo ponto", async () => {
  const { ss: [a, b], creds: [ca], code } = await sala(["flamengo", "liverpool"]);
  await pedir(a, "modo", { modo: 2 });
  await assert.rejects(agir(b, { type: "rodada" }), /anfitrião/);
  await agir(a, { type: "rodada" });
  const st = await esperarEstado(b, (s) => s.rodada && s.rodada.n === 1);
  assert.strictEqual(st.rodada.jogos.length, 2, "os dois humanos jogam, cada um no seu jogo");
  await assert.rejects(agir(b, { type: "velocidade", velocidade: 3 }), /anfitrião/);
  const viu3x = esperarRodada(b, (x) => x.meu && x.velocidade === 3);
  await agir(a, { type: "velocidade", velocidade: 3 });
  assert.strictEqual((await esperarEstado(b, (s) => s.rodada && s.rodada.velocidade === 3)).rodada.velocidade, 3);
  assert.strictEqual((await viu3x).meu.relogio.multiplicador, 3, "o ritmo 3× chegou ao jogo do outro técnico");
  await agir(a, { type: "velocidade", velocidade: 1 });
  // o jogo do Flamengo para no intervalo esperando a decisão
  const v = await esperarRodada(a, (x) => x.meu && x.meu.parado && !x.meu.parado.esperando);
  assert.strictEqual(v.meu.parado.tipo, "tatica");
  // fechou a aba e voltou: o mesmo ponto, a mesma narração
  a.close();
  const a2 = await canal();
  await pedir(a2, "join", { code, id: ca.id, token: ca.token });
  const e = (await pedir(a2, "entrar")).estado;
  assert.strictEqual(e.rodadaGrupo.meu.parado.id, v.meu.parado.id);
  assert.deepStrictEqual(e.rodadaGrupo.meu.eventos, v.meu.eventos);
  // o mercado espera o fim da rodada
  await assert.rejects(agir(b, { type: "leilao", jogador: "santos-1" }), /bola rolando/);
  await pedir(a2, "decidir", { id: v.meu.parado.id, resposta: {} });
  const fim = await esperarEstado(b, (s) => !s.rodada && s.ultimaRodada && s.ultimaRodada.n === 1, 60000);
  assert.ok(fim.ultimaRodada.jogos.every((j) => Array.isArray(j.placar)));
  const ea = (await pedir(a2, "entrar")).estado, eb = (await pedir(b, "entrar")).estado;
  assert.strictEqual(ea.rodada, 1); assert.strictEqual(eb.rodada, 1);
  assert.ok(ea.posJogo && eb.posJogo, "o pós-jogo abre para cada um");
  a2.close(); b.close();
});

test("dinheiro igual: a sala começa com o mesmo caixa para todos", async () => {
  const { ss: [a, b] } = await sala(["flamengo", "mirassol"], { aporte: 0, caixaIgual: 100e6 });
  const ea = (await pedir(a, "entrar")).estado, eb = (await pedir(b, "entrar")).estado;
  assert.strictEqual(ea.caixa, 100e6);
  assert.strictEqual(eb.caixa, 100e6);
  assert.strictEqual(ea.situacao, "equilibrado");
  assert.strictEqual(eb.situacao, "equilibrado");
  a.close(); b.close();
});

test("leilão: o relógio reinicia a cada lance, o maior leva e o caixa fecha certo", async () => {
  const { ss: [a, b, c] } = await sala(["flamengo", "palmeiras", "liverpool"], { aporte: 0 });
  const alvo = "santos-5";
  await agir(a, { type: "leilao", jogador: alvo });
  let st = await esperarEstado(b, (s) => s.leilao && s.leilao.jogador === alvo);
  await assert.rejects(agir(c, { type: "leilao", jogador: "santos-6" }), /um por vez/);
  const minimo = st.leilao.minimo;
  await assert.rejects(agir(b, { type: "lance", valor: minimo - 1e6 }), /mínimo/);
  await assert.rejects(agir(b, { type: "lance", valor: 5e9 }), /caixa não tem/);
  await agir(b, { type: "lance", valor: minimo });
  st = await esperarEstado(c, (s) => s.leilao && s.leilao.lances.length === 1);
  const fim1 = st.leilao.fim;
  await assert.rejects(agir(c, { type: "lance", valor: minimo + 1e5 }), /Cubra/);
  await espera(200);
  const valor = minimo + st.leilao.passo;
  await agir(c, { type: "lance", valor });
  st = await esperarEstado(a, (s) => s.leilao && s.leilao.lances.length === 2);
  assert.ok(st.leilao.fim > fim1, "o lance novo reiniciou o relógio");
  const caixaAntes = (await pedir(c, "entrar")).estado.caixa;
  st = await esperarEstado(a, (s) => !s.leilao && s.ultimoLeilao && s.ultimoLeilao.jogador === alvo, 10000);
  assert.strictEqual(st.ultimoLeilao.resultado, "vendido");
  assert.strictEqual(st.ultimoLeilao.para, "liverpool");
  assert.strictEqual(st.ultimoLeilao.valor, valor);
  const ec = (await pedir(c, "entrar")).estado;
  assert.strictEqual(caixaAntes - ec.caixa, valor, "pagou o lance");
  assert.ok(ec.elenco.includes(alvo), "levou o jogador");
  assert.ok(ec.salarios[alvo] > 0);
  a.close(); b.close(); c.close();
});

test("leilão: o jogador de um amigo só sai quando o dono bate o martelo; o olheiro sugere o que cabe no caixa", async () => {
  const { ss: [a, b] } = await sala(["flamengo", "palmeiras"]);
  const ea = (await pedir(a, "entrar")).estado, alvo = ea.elenco[ea.elenco.length - 1];
  await agir(b, { type: "leilao", jogador: alvo });
  let st = await esperarEstado(a, (s) => s.leilao && s.leilao.tipo === "humano");
  await assert.rejects(agir(a, { type: "lance", valor: st.leilao.minimo }), /é seu/);
  await agir(b, { type: "lance", valor: st.leilao.minimo });
  await assert.rejects(agir(b, { type: "martelo" }), /dono/);
  st = await esperarEstado(a, (s) => s.leilao && s.leilao.estado === "martelo", 10000);
  const caixaA = (await pedir(a, "entrar")).estado.caixa;
  await agir(a, { type: "martelo" });
  st = await esperarEstado(b, (s) => s.ultimoLeilao && s.ultimoLeilao.jogador === alvo);
  assert.strictEqual(st.ultimoLeilao.para, "palmeiras");
  const ea2 = (await pedir(a, "entrar")).estado, eb = (await pedir(b, "entrar")).estado;
  assert.strictEqual(ea2.caixa - caixaA, st.ultimoLeilao.valor, "o dono recebeu");
  assert.ok(eb.elenco.includes(alvo) && !ea2.elenco.includes(alvo));
  // o dono pode recusar e ficar com o jogador
  const outro = ea2.elenco[ea2.elenco.length - 1];
  await agir(b, { type: "leilao", jogador: outro });
  await agir(b, { type: "lance", valor: (await esperarEstado(a, (s) => s.leilao && s.leilao.jogador === outro)).leilao.minimo });
  await agir(a, { type: "recusar" });
  st = await esperarEstado(b, (s) => s.ultimoLeilao && s.ultimoLeilao.jogador === outro);
  assert.strictEqual(st.ultimoLeilao.resultado, "recusado");
  assert.ok((await pedir(a, "entrar")).estado.elenco.includes(outro), "ficou com ele");
  // o olheiro
  const { sugestoes, estado } = await pedir(a, "olheiro");
  assert.ok(sugestoes.length >= 2 && sugestoes.length <= 3);
  for (const s of sugestoes) {
    assert.ok(s.preco <= estado.caixa, "cabe no caixa");
    assert.ok(s.notaNova > s.notaAtual, "melhora a posição");
    assert.ok(!estado.elenco.includes(s.jogador));
    assert.match(s.motivo, /rende/);
  }
  a.close(); b.close();
});
