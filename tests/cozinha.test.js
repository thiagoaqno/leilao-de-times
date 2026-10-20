// Cozinha da Galera: o motor (juntar, cozinhar, queimar, pedidos, estrelas), a conferência de toda cozinha do
// catálogo (dá para fazer todas as receitas dela?) e uma sopa inteira pelo servidor.
const test = require("node:test");
const assert = require("node:assert");
const K = require("../public/cozinha/regras.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

const T = K.TILE;
const ing = (t, e = "cru") => ({ k: "ing", t, e, p: 0 });
const passar = (m, s) => { for (let i = 0; i < Math.round(s * 60); i++) K.passo(m, 1 / 60); };
// põe o cozinheiro de frente para a casa (c, r), em pé numa casa de chão vizinha
function deFrente(m, j, c, r) {
  for (const [dc, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const cc = c + dc, rr = r + dr;
    if (K.solido(m.mapa, cc, rr)) continue;
    j.x = (cc + 0.5) * T; j.z = (rr + 0.5) * T; j.d = Math.atan2(dc, dr);
    const a = K.alvo(m.mapa, j); if (a && a.c === c && a.r === r) return a;
  }
  throw new Error(`não dá para ficar de frente para ${c},${r}`);
}
const achar = (m, tipo, f = () => true) => m.mapa.tiles.find((t) => t.tipo === tipo && f(t));

test("toda cozinha do catálogo dá para jogar: lugares no chão, bancadas alcançáveis e todas as receitas possíveis", () => {
  for (const [id, coz] of Object.entries(K.COZINHAS)) {
    const mapa = K.montarMapa(coz);
    assert.ok(mapa.inicio.length >= 4, id);
    // o chão que se alcança a partir do primeiro lugar
    const ini = mapa.inicio.map(([x, z]) => [Math.floor(x / T), Math.floor(z / T)]), visto = new Set([ini[0].join()]), fila = [ini[0]];
    while (fila.length) { const [c, r] = fila.shift(); for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = [c + dc, r + dr]; if (!K.solido(mapa, ...k) && !visto.has(k.join())) { visto.add(k.join()); fila.push(k); } } }
    for (const [c, r] of ini) assert.ok(visto.has(c + "," + r), `${id}: lugar ${c},${r} fora do chão alcançável`);
    const alcanca = (t) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => visto.has(t.c + dc + "," + (t.r + dr)));
    for (const t of mapa.tiles) if (!["parede", "vazio", "balcao"].includes(t.tipo)) assert.ok(alcanca(t), `${id}: ${t.tipo} em ${t.c},${t.r} não se alcança`);
    // cada receita: os ingredientes nas caixas e os processos com a sua bancada
    const caixas = new Set(mapa.tiles.filter((t) => t.tipo === "caixa").map((t) => t.ing)), recs = new Set(mapa.tiles.filter((t) => t.rec).map((t) => t.rec));
    for (const r of coz.receitas) for (const k of K.RECEITAS[r].itens) {
      const [t, e] = k.split(":");
      assert.ok(caixas.has(t), `${id}: falta a caixa de ${t} (${r})`);
      const passos = K.INGREDIENTES[t].passos.slice(0, K.estadosDe(t).indexOf(e));
      assert.ok(K.estadosDe(t).includes(e), `${id}: ${t} nunca fica ${e}`);
      for (const p of passos) {
        if (p === "picar") assert.ok(mapa.tiles.some((x) => x.tipo === "tabua"), `${id}: falta tábua`);
        else assert.ok(recs.has(K.PROCESSOS[p].onde), `${id}: falta ${K.PROCESSOS[p].onde} para ${p}`);
      }
    }
    for (const tipo of ["entrega", "escorredor"]) assert.ok(mapa.tiles.some((t) => t.tipo === tipo), `${id}: falta ${tipo}`);
    if (mapa.tiles.some((t) => t.tipo === "retorno")) assert.ok(mapa.tiles.some((t) => t.tipo === "pia"), `${id}: tem prato sujo e não tem pia`);
  }
});

test("juntar: só entra na panela o que está picado, o prato só aceita o que é de alguma receita", () => {
  const card = ["sopa_cebola", "hamburguer_alface"];
  const pan = K.novoRec("panela");
  assert.strictEqual(K.juntar(ing("cebola"), pan, card), null, "cebola inteira não vai na panela");
  for (let i = 0; i < 3; i++) assert.ok(K.juntar(ing("cebola", "picado"), pan, card));
  assert.strictEqual(K.juntar(ing("cebola", "picado"), pan, card), null, "a panela leva 3");
  const prato = K.novoPrato();
  assert.strictEqual(K.juntar(prato, pan, card), null, "sopa crua não vai para o prato");
  pan.p = K.tempoRec(pan); for (const i of pan.c) i.e = "cozido";
  const r = K.juntar(prato, pan, card); // com o prato na mão, encostando na panela pronta
  assert.ok(r && r.mao === prato && r.alvo === pan);
  assert.strictEqual(prato.c.length, 3); assert.strictEqual(pan.c.length, 0);
  assert.strictEqual(K.receitaDe(prato.c, card), "sopa_cebola");
  // o lanche monta em qualquer ordem; o que não é de receita nenhuma não entra
  const lanche = K.novoPrato();
  assert.strictEqual(K.juntar(ing("tomate", "picado"), lanche, card), null);
  assert.ok(K.juntar(ing("alface", "picado"), lanche, card));
  assert.ok(K.juntar(lanche, ing("pao"), card), "com o prato na mão, encostando no pão do balcão");
  assert.strictEqual(K.receitaDe(lanche.c, card), null);
  assert.ok(K.juntar(ing("carne", "frito"), lanche, card));
  assert.strictEqual(K.receitaDe(lanche.c, card), "hamburguer_alface");
});

test("uma sopa de cebola inteira, da caixa à entrega, e o prato sujo que volta para a pia", () => {
  const m = K.novaPartida("1-1", [{ id: "a", nome: "Ana" }], { rng: () => 0 }), j = m.jogadores[0];
  passar(m, K.TEMPOS.conta + 0.1);
  assert.strictEqual(m.fase, "jogo"); assert.strictEqual(m.pedidos.length, 2);
  const caixa = achar(m, "caixa"), tabua = achar(m, "tabua"), fogao = achar(m, "fogao"), esc = achar(m, "escorredor"), ent = achar(m, "entrega"), ret = achar(m, "retorno"), pia = achar(m, "pia");
  for (let k = 0; k < 3; k++) {
    deFrente(m, j, caixa.c, caixa.r); assert.ok(K.interagir(m, j)); assert.strictEqual(K.nomeItem(j.mao), "Cebola");
    deFrente(m, j, tabua.c, tabua.r); assert.ok(K.interagir(m, j)); assert.ok(K.usar(m, j));
    passar(m, K.INGREDIENTES.cebola.picar + 0.05);
    assert.strictEqual(m.estado[tabua.i].item.e, "picado"); assert.strictEqual(j.trab, null);
    assert.ok(K.interagir(m, j)); assert.strictEqual(K.nomeItem(j.mao), "Cebola picada");
    deFrente(m, j, fogao.c, fogao.r); assert.ok(K.interagir(m, j)); assert.strictEqual(j.mao, null);
  }
  passar(m, K.RECIPIENTES.panela.tempo * 3 + 0.1);
  assert.ok(K.pronto(m.estado[fogao.i].item));
  deFrente(m, j, esc.c, esc.r); assert.ok(K.interagir(m, j)); assert.strictEqual(m.estado[esc.i].n, 2);
  deFrente(m, j, fogao.c, fogao.r); assert.ok(K.interagir(m, j)); assert.strictEqual(K.nomeItem(j.mao), "Sopa de cebola");
  deFrente(m, j, ent.c, ent.r); assert.ok(K.interagir(m, j));
  assert.ok(m.pontos > K.RECEITAS.sopa_cebola.pontos, "com gorjeta"); assert.strictEqual(m.entregues, 1);
  passar(m, K.TEMPOS.voltaPrato + 0.1);
  assert.deepStrictEqual(m.estado[ret.i].item, { k: "sujos", n: 1 });
  deFrente(m, j, ret.c, ret.r); assert.ok(K.interagir(m, j));
  deFrente(m, j, pia.c, pia.r); assert.ok(K.interagir(m, j)); assert.ok(K.usar(m, j));
  passar(m, K.TEMPOS.lavar + 0.05);
  assert.strictEqual(m.estado[pia.i].n, 0); assert.strictEqual(m.estado[esc.i].n, 3);
});

test("ingrediente novo na panela já pronta: ela volta a cozinhar e nada sai cru", () => {
  const card = ["sopa_cebola"], pan = K.novoRec("panela"), R = K.RECIPIENTES.panela;
  K.juntar(ing("cebola", "picado"), pan, card);
  pan.p = R.tempo + 3; pan.c[0].e = "cozido"; // pronta há 3 s
  assert.ok(K.pronto(pan));
  K.juntar(ing("cebola", "picado"), pan, card);
  assert.ok(!K.pronto(pan), "a cebola nova ainda está crua");
  assert.strictEqual(pan.p, R.tempo, "o tempo volta para onde a primeira ficou pronta");
});

test("a panela esquecida no fogo apita e queima; o lixo esvazia", () => {
  const m = K.novaPartida("1-1", [{ id: "a", nome: "Ana" }], { rng: () => 0 }), j = m.jogadores[0];
  passar(m, K.TEMPOS.conta + 0.1);
  const fogao = achar(m, "fogao"), lixo = achar(m, "lixo"), pan = m.estado[fogao.i].item, R = K.RECIPIENTES.panela;
  pan.c.push({ t: "cebola", e: "picado" });
  passar(m, R.tempo + 0.05); assert.ok(K.pronto(pan));
  m.ev = []; passar(m, R.queima * K.TEMPOS.alerta); assert.ok(m.ev.some((e) => e.tipo === "alerta"));
  passar(m, R.queima); assert.ok(pan.q); assert.strictEqual(pan.c[0].e, "queimado"); assert.ok(!K.pronto(pan));
  deFrente(m, j, fogao.c, fogao.r); assert.ok(K.interagir(m, j)); assert.strictEqual(j.mao, pan);
  deFrente(m, j, lixo.c, lixo.r); assert.ok(K.interagir(m, j)); assert.strictEqual(pan.c.length, 0); assert.ok(!pan.q);
});

test("pedido que vence dá multa; o fim conta as estrelas pela meta de quem está jogando", () => {
  const m = K.novaPartida("1-1", [{ id: "a", nome: "Ana" }, { id: "b", nome: "Bia" }], { rng: () => 0 });
  passar(m, K.TEMPOS.conta + 0.1); m.pontos = 15;
  passar(m, K.RECEITAS.sopa_cebola.tempo + 0.1);
  assert.ok(m.perdidos >= 2); assert.strictEqual(m.pontos, 0, "a multa não deixa negativo");
  assert.deepStrictEqual(m.meta, K.metaDe(K.COZINHAS["1-1"], 2));
  assert.ok(K.metaDe(K.COZINHAS["1-1"], 1)[0] < m.meta[0], "sozinho a meta é menor");
  m.pedidos = []; m.proxPedido = Infinity; m.pontos = m.meta[1] + 1; m.t = K.COZINHAS["1-1"].tempo - 0.1; passar(m, 0.2);
  assert.strictEqual(m.fase, "fim"); assert.strictEqual(m.estrelas, 2);
});

test("a fila repõe pedidos após entregas e o combo sobe só na ordem", () => {
  const m = K.novaPartida("1-1", [{ id: "a", nome: "Ana" }], { rng: () => 0 });
  passar(m, K.TEMPOS.conta + 0.1);
  const j = m.jogadores[0], ent = achar(m, "entrega");
  const servir = () => { j.mao = K.novoPrato(); j.mao.c = K.RECEITAS.sopa_cebola.itens.map((v) => ({ t: v.split(":")[0], e: "cozido" })); deFrente(m, j, ent.c, ent.r); return K.interagir(m, j); };
  assert.ok(servir()); assert.strictEqual(m.combo, 1); assert.strictEqual(m.pedidos.length, 1);
  passar(m, 1.2); assert.strictEqual(m.pedidos.length, 2, "a fila foi reposta em até 3 s");
  assert.ok(servir()); assert.strictEqual(m.combo, 2);
  m.pedidos.unshift({ id: ++m.seqPedido, r: "sopa_tomate", ini: m.t, ate: m.t + 75 });
  assert.ok(servir()); assert.strictEqual(m.combo, 0, "servir fora da ordem zera o combo");
});

test("as metas vêm do planejador com distância real e terceira estrela acima de 80% do ótimo", () => {
  for (const [id, coz] of Object.entries(K.COZINHAS)) for (let n = 1; n <= 4; n++) {
    const perfeito = K.simularPerfeito(coz, n), meta = K.metaDe(coz, n);
    assert.ok(perfeito.pratos > 0, `${id}/${n}: nenhum prato possível`);
    assert.ok(perfeito.duracoes.every((d) => d > 0 && Number.isFinite(d)), `${id}/${n}: rota impossível`);
    assert.ok(meta[2] <= perfeito.pontos && meta[2] >= perfeito.pontos * 0.8, `${id}/${n}: terceira estrela fora da faixa`);
    assert.ok(meta[0] < meta[1] && meta[1] < meta[2]);
  }
});

test("o cozinheiro não atravessa bancada e o impulso tem recarga", () => {
  const m = K.novaPartida("1-1", [{ id: "a", nome: "Ana" }]), j = m.jogadores[0];
  for (let i = 0; i < 240; i++) K.mover(m.mapa, j, { x: 0, z: -1 }, 1 / 60); // para cima, contra a fileira de bancadas
  assert.ok(j.z >= T + K.RAIO - 1e-6, "parou encostado na bancada");
  const x0 = j.x; K.mover(m.mapa, j, { x: 1, z: 0, dash: true }, 1 / 60); assert.ok(j.dashT > 0);
  for (let i = 0; i < 10; i++) K.mover(m.mapa, j, { x: 1, z: 0 }, 1 / 60);
  assert.ok(j.x - x0 > 1.5, "o impulso anda mais que o passo");
  K.mover(m.mapa, j, { x: 1, z: 0, dash: true }, 1 / 60); assert.ok(j.dashT <= 0, "na recarga não sai outro impulso");
});

test("o cozinheiro deixado na tábua termina de picar enquanto o outro é controlado", () => {
  const m = K.novaPartida("1-1", [{ id: "a" }, { id: "b" }], { rng: () => 0 });
  passar(m, K.TEMPOS.conta + 0.1);
  const tab = achar(m, "tabua"), j = m.jogadores[0];
  m.estado[tab.i].item = ing("cebola"); deFrente(m, j, tab.c, tab.r);
  assert.ok(K.usar(m, j));
  passar(m, K.INGREDIENTES.cebola.picar + 0.1);
  assert.strictEqual(m.estado[tab.i].item.e, "picado");
});

test("servidor: sozinho recebe dois cozinheiros e Q troca o controle", async () => {
  const srv = await subirServidor(); const a = await conectar(srv.url, "/cozinha");
  try {
    const r = await pedir(a, "create", { name: "Ana" });
    await pedir(a, "act", { type: "start" });
    const antes = await esperarEstado(a, (s) => s.phase === "play" && s.match?.jogadores.length === 2);
    assert.strictEqual(antes.match.controles[r.id], r.id);
    await pedir(a, "act", { type: "trocar" });
    const depois = await esperarEstado(a, (s) => s.match?.controles[r.id] !== r.id);
    assert.ok(depois.match.jogadores.some((j) => j.id === depois.match.controles[r.id]));
  } finally { a.close(); await srv.parar(); }
});

test("com cozinheiros extras ligados, as vagas livres entram no ciclo de troca", async () => {
  const srv = await subirServidor(); const a = await conectar(srv.url, "/cozinha");
  try {
    const r = await pedir(a, "create", { name: "Ana", config: { robos: true } });
    await pedir(a, "act", { type: "start" });
    const st = await esperarEstado(a, (s) => s.phase === "play" && s.match?.jogadores.length === 4);
    assert.strictEqual(st.match.grupos[r.id].length, 4);
    for (let k = 0; k < 4; k++) await pedir(a, "act", { type: "trocar" });
    const fim = await esperarEstado(a, (s) => s.match?.controles[r.id] === r.id);
    assert.strictEqual(fim.match.controles[r.id], r.id);
  } finally { a.close(); await srv.parar(); }
});

test("servidor: abre a cozinha, pega, pica e entrega uma sopa (tempo acelerado)", async () => {
  const srv = await subirServidor({ COZINHA_VEL: "4" });
  const a = await conectar(srv.url, "/cozinha");
  try {
    let mesa = null; a.on("mesa", (ms) => { mesa = ms; });
    const esperarMesa = (cond, ms = 8000) => new Promise((ok, erro) => { const t0 = Date.now(), pilha = new Error().stack; const f = () => (mesa && cond(mesa) ? ok(mesa) : Date.now() - t0 > ms ? erro(new Error("mesa não chegou: " + JSON.stringify(mesa && { maos: mesa.maos, fase: mesa.fase }) + pilha)) : setTimeout(f, 20)); f(); });
    const r = await pedir(a, "create", { name: "Ana", config: { cozinha: "1-1" } });
    await esperarEstado(a, (s) => s.players.length === 1 && s.players[0].chef);
    await pedir(a, "act", { type: "start" });
    const st = await esperarEstado(a, (s) => s.phase === "play" && s.match);
    assert.strictEqual(st.match.coz, "1-1");
    await esperarMesa((ms) => ms.fase === "jogo" && ms.pedidos.length === 2);
    // anda pelo servidor como o navegador anda: a posição (com a frente) antes de cada ação
    const m = K.novaPartida("1-1", [{ id: r.id }]), j = { ...m.jogadores[0] };
    const ir = (tipo) => { const t = achar(m, tipo); deFrente(m, j, t.c, t.r); return t; };
    const acao = async (ev, cond) => { a.emit("st", { x: j.x, z: j.z, vx: 0, vz: 0, d: j.d }); await new Promise((ok) => setTimeout(ok, 60)); a.emit(ev, { x: j.x, z: j.z, vx: 0, vz: 0, d: j.d }); return esperarMesa(cond); };
    // anda devagar até lá (o servidor não aceita teletransporte)
    const andar = async (tipo) => { const alvo = { ...j }; const t = achar(m, tipo); deFrente(m, alvo, t.c, t.r); const passos = 12; const x0 = j.x, z0 = j.z; for (let k = 1; k <= passos; k++) { a.emit("st", { x: x0 + (alvo.x - x0) * k / passos, z: z0 + (alvo.z - z0) * k / passos, vx: 0, vz: 0, d: alvo.d }); await new Promise((ok) => setTimeout(ok, 35)); } Object.assign(j, { x: alvo.x, z: alvo.z, d: alvo.d }); return t; };
    for (let k = 0; k < 3; k++) {
      await andar("caixa"); await acao("pegar", (ms) => ms.maos[r.id] && ms.maos[r.id].t === "cebola");
      const tab = await andar("tabua"); await acao("pegar", (ms) => !ms.maos[r.id]);
      await acao("usar", (ms) => ms.lugares[tab.i][0] && ms.lugares[tab.i][0].e === "picado");
      await acao("pegar", (ms) => ms.maos[r.id] && ms.maos[r.id].e === "picado");
      const fog = await andar("fogao"); await acao("pegar", (ms) => !ms.maos[r.id] && ms.lugares[fog.i][0].c.length === k + 1);
    }
    const fog = achar(m, "fogao");
    await esperarMesa((ms) => K.pronto(ms.lugares[fog.i][0]));
    await andar("escorredor"); await acao("pegar", (ms) => ms.maos[r.id] && ms.maos[r.id].k === "prato");
    await andar("fogao"); await acao("pegar", (ms) => ms.maos[r.id] && ms.maos[r.id].c.length === 3);
    await andar("entrega"); const fim = await acao("pegar", (ms) => ms.entregues === 1);
    assert.ok(fim.pontos >= K.RECEITAS.sopa_cebola.pontos);
  } finally { a.close(); await srv.parar(); }
});
