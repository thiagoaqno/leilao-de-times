// Road to Champions: o formato novo da Champions (fase de liga de 36, playoff, oitavas, quartas e semis de ida e volta,
// final única) e os momentos do jogo (o protagonista decide como joga aos 25', no intervalo e aos 70').
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const bd = require("../bd.js");
bd.abrir();
const rtc = require("../road-to-champions.js");
const R = require("../public/jogador/road-regras.js");
const F = require("../public/jogador/road-formato.js");
const Motor = require("../public/carreira/motor.js");
const { ligaInicial, tabelaLiga, decidir, avancar, estado, momento, expirarMomentos, mudarTatica, salvar, recuperar } = rtc.paraTestes;

function campanha(codigo, arqs) {
  const jogadores = arqs.map((arq, i) => ({ id: "p" + i, segredo: "x", nome: "Amigo " + i, avatar: "Craque " + i,
    ...R.novoProtagonista(arq), relacoes: {}, escolhas: [], vitorias: 0 }));
  const s = { codigo, criadaEm: 0, fase: "lobby", dono: "p0", jogadores, equipes: [], jogos: [], capitulo: 0,
    entradas: [], resultados: [], campeao: null, epilogos: [], historico: [] };
  ligaInicial(s);
  return s;
}
// joga a rodada inteira: entrevista (se houver), avançar e os momentos (escolha(p, momento) ou "manter")
function rodada(s, escolha = () => "manter") {
  if (estado(s, s.jogadores[0]).entrevista) for (const p of s.jogadores) decidir(s, p, 0, "equilibrado");
  avancar(s);
  for (let k = 0; k < 20 && s.jornada; k++)
    for (const p of s.jogadores) {
      const m = estado(s, p).jornada?.momento;
      if (m && !m.respondido) momento(s, p, escolha(p, m));
    }
  assert.equal(s.jornada, undefined, "a rodada fechou");
}

test("fase de liga: 36 clubes, 8 jogos cada, 4 em casa, 2 de cada pote, 8 rodadas sem ninguém jogar duas vezes", () => {
  const s = campanha("LIGA1", ["romantico", "maquina"]);
  assert.equal(s.equipes.length, 36);
  assert.ok(s.equipes.find((t) => t.id === "arsenal").humano);
  const pote = Object.fromEntries(s.equipes.map((t) => [t.id, t.pote]));
  assert.deepEqual([1, 2, 3, 4].map((p) => s.equipes.filter((t) => t.pote === p).length), [9, 9, 9, 9]);
  for (const t of s.equipes) {
    const meus = s.jogos.filter((j) => j.casa === t.id || j.fora === t.id);
    assert.equal(meus.length, 8, t.id);
    assert.equal(meus.filter((j) => j.casa === t.id).length, 4, t.id);
    const adv = meus.map((j) => (j.casa === t.id ? j.fora : j.casa));
    assert.equal(new Set(adv).size, 8, t.id);
    for (let p = 1; p <= 4; p++) assert.equal(adv.filter((x) => pote[x] === p).length, 2, t.id + " pote " + p);
  }
  for (let r = 0; r < 8; r++) {
    const times = s.jogos.filter((j) => j.rodada === r).flatMap((j) => [j.casa, j.fora]);
    assert.equal(times.length, 36); assert.equal(new Set(times).size, 36);
  }
  // o mesmo sorteio para o mesmo código
  assert.deepEqual(campanha("LIGA1", ["romantico", "maquina"]).jogos, s.jogos);
  assert.notDeepEqual(campanha("LIGA2", ["romantico", "maquina"]).jogos, s.jogos);
});

test("mata-mata: 9º a 24º no playoff, 1º a 8º esperam nas oitavas; ida e volta pelo agregado; final única", () => {
  const s = campanha("MATA1", ["resiliente"]);
  for (let r = 0; r < 8; r++) rodada(s);
  const classif = s.classificacaoFinal;
  assert.equal(classif.length, 36);
  assert.deepEqual(classif, tabelaLiga(s).map((x) => x.clube));
  const po = s.jogos.filter((j) => j.etapa === "playoff");
  assert.equal(po.length, 16);
  const noPlayoff = new Set(po.flatMap((j) => [j.casa, j.fora]));
  assert.deepEqual([...noPlayoff].sort(), classif.slice(8, 24).sort());
  // 9º × 24º: ida na casa do 24º, volta na casa do 9º
  const po0 = po.filter((j) => j.chave === "po0");
  assert.deepEqual([po0[0].casa, po0[0].fora, po0[1].casa, po0[1].fora], [classif[23], classif[8], classif[8], classif[23]]);
  for (let r = 8; r < 16; r++) {
    rodada(s);
    // toda volta tem o agregado e quem passou, e o classificado é coerente com o agregado (ou com os pênaltis)
    for (const j of s.jogos.filter((x) => x.perna === 2 && x.resultado)) {
      const ida = s.jogos.find((x) => x.chave === j.chave && x.perna === 1).resultado;
      const ag = j.resultado.agregado;
      assert.equal(ag.casa, j.resultado.casa + (s.jogos.find((x) => x.chave === j.chave && x.perna === 1).casa === j.casa ? ida.casa : ida.fora));
      if (ag.casa !== ag.fora) assert.equal(j.resultado.classificado, ag.casa > ag.fora ? j.casa : j.fora);
      else assert.ok(j.resultado.penaltis, "empate no agregado vai para os pênaltis");
    }
  }
  const oit = s.jogos.filter((j) => j.etapa === "oitavas" && j.perna === 2);
  assert.equal(oit.length, 8);
  // os oito primeiros da liga jogam as voltas das oitavas em casa
  assert.deepEqual(oit.map((j) => j.casa).sort(), classif.slice(0, 8).sort());
  assert.equal(s.jogos.filter((j) => j.etapa === "quartas").length, 8);
  assert.equal(s.jogos.filter((j) => j.etapa === "semifinal").length, 4);
  const fin = s.jogos.filter((j) => j.etapa === "final");
  assert.equal(fin.length, 1);
  rodada(s);
  assert.equal(s.fase, "fim");
  assert.equal(s.campeao, fin[0].resultado.classificado);
  assert.ok([fin[0].casa, fin[0].fora].includes(s.campeao));
  // quem chega à final saiu das semis
  const semis = s.jogos.filter((j) => j.etapa === "semifinal" && j.perna === 2).map((j) => j.resultado.classificado);
  assert.deepEqual([fin[0].casa, fin[0].fora].sort(), semis.sort());
});

test("rodadas sem entrevista: a estratégia muda pelo pré-jogo e a rodada não espera ninguém", () => {
  const s = campanha("TAT01", ["imprevisivel", "enigma"]);
  const [imp, eni] = s.jogadores;
  assert.equal(estado(s, imp).entrevista, true);
  assert.throws(() => avancar(s), /Aguarde/);
  rodada(s);
  assert.equal(s.capitulo, 1);
  assert.equal(estado(s, imp).entrevista, false);
  assert.equal(estado(s, imp).evento, null);
  assert.throws(() => decidir(s, imp, 0, "equilibrado"), /Não há entrevista/);
  mudarTatica(s, eni, "recuar");
  assert.equal(estado(s, eni).tatica, "recuar");
  assert.throws(() => mudarTatica(s, eni, "x"), /válida/);
  avancar(s); // sem esperar decisão nenhuma
  assert.ok(s.jornada, "os jogos dos protagonistas param no primeiro momento");
  assert.throws(() => mudarTatica(s, eni, "pressionar"), /andamento/);
  assert.throws(() => avancar(s), /andamento/);
});

test("momentos: param aos 25', no intervalo e aos 70', só o jogo de quem tem protagonista, e as opções seguem o placar", () => {
  const s = campanha("MOM01", ["maquina"]);
  const [maq] = s.jogadores;
  decidir(s, maq, 0, "equilibrado");
  avancar(s);
  const pend = Object.values(s.jornada.pendentes);
  assert.equal(pend.length, 1, "só o jogo do protagonista espera; os outros 17 já acabaram");
  assert.equal(s.jogos.filter((j) => j.rodada === 0 && j.resultado).length, 17);
  const vistos = [];
  for (let k = 0; k < 5 && s.jornada; k++) {
    const m = estado(s, maq).jornada.momento;
    vistos.push(m.id === "intervalo" ? "intervalo" : m.min);
    const [meu, deles] = [m.placar[m.lado], m.placar[1 - m.lado]];
    const esperado = R.opcoesDoMomento(meu, deles).map((o) => o.id);
    assert.deepEqual(m.opcoes.map((o) => o.id), esperado);
    if (meu < deles) assert.ok(esperado.includes("cima") && !esperado.includes("marcar"));
    if (meu > deles) assert.ok(esperado.includes("marcar") && !esperado.includes("cima"));
    assert.throws(() => momento(s, maq, "nao-existe"), /válido/);
    momento(s, maq, esperado[0]);
  }
  assert.deepEqual(vistos, [25, "intervalo", 70]);
  assert.equal(s.jornada, undefined);
  assert.equal(s.capitulo, 1);
  // o post dos momentos no feed
  const post = s.historico.find((x) => x.tipo === "momento");
  assert.ok(post && post.autor === maq.avatar && /Aos 25'/.test(post.texto) && /no intervalo/.test(post.texto), post && post.texto);
});

test("momentos mudam o resultado: partir para cima abre o jogo, voltar para marcar fecha", () => {
  // o mesmo jogo (mesma semente) com escolhas diferentes, em 60 sementes: mais gols dos dois lados indo para cima
  let golsCima = 0, golsMarcar = 0, diferentes = 0;
  for (let k = 0; k < 60; k++) {
    const total = (id) => {
      const s = campanha("INF" + String(k).padStart(2, "0"), ["resiliente"]);
      decidir(s, s.jogadores[0], 0, "equilibrado");
      avancar(s);
      while (s.jornada) {
        const m = estado(s, s.jogadores[0]).jornada.momento;
        const prefer = id === "cima" ? ["cima", "pressionar", "ritmo"] : ["marcar", "contra", "manter"];
        momento(s, s.jogadores[0], prefer.find((x) => m.opcoes.some((o) => o.id === x)));
      }
      const c = s.jogadores[0].clube, j = s.jogos.find((x) => x.rodada === 0 && (x.casa === c || x.fora === c));
      return [j.resultado.casa + j.resultado.fora, j.resultado.casa + "x" + j.resultado.fora];
    };
    const [a, pa] = total("cima"), [b, pb] = total("marcar");
    golsCima += a; golsMarcar += b; if (pa !== pb) diferentes++;
  }
  assert.ok(diferentes >= 20, "a escolha muda o placar em boa parte dos jogos: " + diferentes + "/60");
  assert.ok(golsCima > golsMarcar, "cima " + golsCima + " × marcar " + golsMarcar);
});

test("momentos: protagonista contra protagonista decidem ao mesmo tempo, e quem não responde mantém o plano", () => {
  // procura um código em que os dois se enfrentam na primeira rodada
  let s = null;
  const A = R.PERSONAGENS.romantico.clube, B = R.PERSONAGENS.prodigio.clube;
  for (let k = 0; k < 80 && !s; k++) {
    const c = campanha("DUO" + String(k).padStart(2, "0"), ["romantico", "prodigio"]);
    if (c.jogos.some((j) => j.rodada === 0 && [j.casa, j.fora].sort().join() === [A, B].sort().join())) s = c;
  }
  if (!s) { // o sorteio não pôs os dois juntos na rodada 1: troca o adversário de uma rodada para testar o confronto
    s = campanha("DUO00", ["romantico", "prodigio"]);
    const j = s.jogos.find((x) => x.rodada === 0 && (x.casa === A || x.fora === A));
    const k = s.jogos.find((x) => x.rodada === 0 && (x.casa === B || x.fora === B));
    const outro = j.casa === A ? "fora" : "casa", lado = k.casa === B ? "casa" : "fora";
    [j[outro], k[lado]] = [k[lado], j[outro]];
  }
  const [rom, pro] = s.jogadores;
  for (const p of s.jogadores) decidir(s, p, 0, "equilibrado");
  avancar(s);
  const pend = Object.values(s.jornada.pendentes);
  assert.equal(pend.length, 1);
  assert.deepEqual(pend[0].lados.sort(), [0, 1]);
  const m1 = estado(s, rom).jornada.momento;
  momento(s, rom, m1.opcoes[0].id);
  // o jogo espera o outro: a resposta de um não anda o jogo nem aparece como escolha do outro
  assert.equal(Object.values(s.jornada.pendentes)[0].id, m1.id);
  assert.equal(estado(s, rom).jornada.momento.respondido, true);
  assert.equal(estado(s, pro).jornada.momento.respondido, false);
  assert.equal(estado(s, pro).jornada.momento.rival.respondido, true);
  assert.deepEqual(estado(s, rom).jornada.esperando, [pro.avatar]);
  assert.throws(() => momento(s, rom, m1.opcoes[0].id), /já decidiu/);
  // o prazo vence: o Prodígio mantém o plano e o jogo segue
  expirarMomentos(s, Date.now() + 10 * 60 * 1000);
  assert.notEqual(Object.values(s.jornada?.pendentes || {})[0]?.id, m1.id);
  while (s.jornada) expirarMomentos(s, Date.now() + 60 * 60 * 1000);
  const j = s.jogos.find((x) => x.rodada === 0 && x.casa === rom.clube || x.rodada === 0 && x.fora === rom.clube);
  const ev = s.partidas[j.id].eventos.filter((e) => e.tipo === "momento");
  assert.ok(ev.some((e) => e.texto.startsWith(pro.avatar + " manteve o plano")));
  assert.ok(ev.some((e) => e.texto.startsWith(rom.avatar)));
});

test("a rodada parada sobrevive ao banco: salva no meio do momento e continua depois", () => {
  const s = campanha("BANCO", ["enigma"]);
  decidir(s, s.jogadores[0], 0, "equilibrado");
  avancar(s);
  const m = estado(s, s.jogadores[0]).jornada.momento;
  salvar(s);
  const volta = recuperar("BANCO");
  assert.deepEqual(estado(volta, volta.jogadores[0]).jornada.momento.id, m.id);
  momento(volta, volta.jogadores[0], m.opcoes[0].id);
  while (volta.jornada) momento(volta, volta.jogadores[0], estado(volta, volta.jogadores[0]).jornada.momento.opcoes[0].id);
  assert.equal(volta.capitulo, 1);
});

test("motor: sem cfg.paradas tudo continua igual (a Carreira não muda)", () => {
  const base = require("../public/carreira/base/inglaterra-2026.js").clubes;
  const casa = { ...base[0], tatica: { estilo: "auto" } }, fora = { ...base[1], tatica: { estilo: "auto" } };
  // modo 2 do técnico: as paradas de sempre (o intervalo vem antes dos 70')
  const r = Motor.simularPartida({ casa, fora, semente: "x1", modo: 2, controla: 0 });
  assert.ok(r.parado && ["intervalo", "m70", "cansaco"].includes(r.parado.id) || /^gol|^vermelho/.test(r.parado.id), r.parado.id);
  // com paradas: só os minutos pedidos e o intervalo, e o robô segue trocando no lado do humano
  const P = { minutos: [25, 70], intervalo: true, robo: true };
  const a = Motor.simularPartida({ casa, fora, semente: "x1", modo: 2, controla: 0, paradas: P });
  assert.equal(a.parado.id, "m25");
  const fim = Motor.simularPartida({ casa, fora, semente: "x1", modo: 2, controla: 0, paradas: P, decisoes: { m25: {}, intervalo: {}, m70: {} } });
  assert.equal(fim.completo, true);
  // até o primeiro momento, o jogo com paradas é o mesmo do modo 1, lance por lance (a parada não gasta sorteio)
  for (let k = 0; k < 20; k++) {
    const sem = Motor.simularPartida({ casa, fora, semente: "eq" + k, modo: 1 });
    const com = Motor.simularPartida({ casa, fora, semente: "eq" + k, modo: 2, controla: k % 2, paradas: P, decisoes: { m25: {} } });
    assert.equal(com.parado.id, "intervalo");
    assert.deepEqual(com.eventos, sem.eventos.slice(0, com.eventos.length));
  }
});

test("jogo ao vivo: o relógio da sala para no momento, o jogo parado já tem os lances até ali e anda depois da resposta", () => {
  const { partidaDe, minutoAoVivo, tetoDe } = rtc.paraTestes;
  const s = campanha("VIVO1", ["maquina"]);
  const [maq] = s.jogadores;
  decidir(s, maq, 0, "equilibrado");
  avancar(s);
  // o relógio nasce antes dos jogos e trava no primeiro momento pendente
  assert.ok(s.aoVivo && s.aoVivo.base === 0);
  assert.equal(tetoDe(s), 25);
  assert.equal(minutoAoVivo(s, s.aoVivo.desde + 3600e3), 25, "o relógio não passa do momento");
  const pend = Object.values(s.jornada.pendentes)[0];
  const p = partidaDe(s, pend.jogo);
  assert.equal(p.parcial, true);
  assert.ok(p.eventos.length > 0 && p.eventos.every((e) => (e.min ?? 0) <= 25), "só os lances até o minuto parado");
  const versao = p.versao;
  momento(s, maq, "manter");
  assert.equal(tetoDe(s), 45, "agora espera o intervalo");
  assert.ok(partidaDe(s, pend.jogo).versao > versao, "a versão muda para o navegador buscar os lances novos");
  while (s.jornada) momento(s, maq, "manter");
  assert.equal(tetoDe(s), null);
  assert.equal(partidaDe(s, pend.jogo).parcial, false);
});

test("eliminado: com a sala toda fora o resto da Champions sai de uma vez", () => {
  const { eliminado, todosEliminados, simularAteFim } = rtc.paraTestes;
  const s = campanha("ELIM1", ["romantico"]);
  const [p] = s.jogadores;
  assert.throws(() => simularAteFim(s), /vivo/);
  for (let r = 0; r < 8; r++) rodada(s);
  assert.equal(s.classificacaoFinal.length, 36);
  const fora = s.classificacaoFinal[30], dentro = s.classificacaoFinal[0];
  assert.equal(eliminado(s, fora), true, "25º para baixo cai na fase de liga");
  assert.equal(eliminado(s, dentro), false);
  // o protagonista passa a ser de um clube que já caiu (o jeito de testar sem depender do sorteio dos jogos)
  p.clube = fora;
  assert.equal(todosEliminados(s), true);
  assert.equal(estado(s, p).todosEliminados, true);
  simularAteFim(s);
  assert.equal(s.fase, "fim");
  assert.ok(s.campeao && s.campeao !== fora);
  assert.ok(s.jogos.every((j) => j.resultado), "todos os jogos disputados");
});
