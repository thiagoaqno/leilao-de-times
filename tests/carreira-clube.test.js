// Carreira de Treinador: a gestão do clube (carreira-clube.js). Contratos e multas, a base com potencial escondido, as obras de
// estrutura, o capitão, os dilemas com consequência, a confiança da diretoria (ultimato e demissão), o legado do clube (hall da
// fama e camisa aposentada), a reputação do técnico e os confrontos entre os técnicos da sala.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Clube = require("../carreira-clube.js");
const R = require("../public/carreira/clube-regras.js");
const Carreira = require("../carreira.js");
const { novaCarreira, fecharRodada, proximoJogoMundo, simularMinha, sementeDoJogo, novaTemporada, estado, ajudas, completar } = Carreira.paraTestes;
const G = Carreira.grupo;

function jogarTemporada(save) {
  for (let jogo; (jogo = proximoJogoMundo(save));) {
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    fecharRodada(save, simularMinha(save));
  }
}
const nova = (clube = "palmeiras") => completar(novaCarreira("Teste", clube, "", 3));
const elenco = (v) => ajudas.elencoDe(v, v.clube);
const melhor = (v) => [...elenco(v)].sort((a, b) => ajudas.notaDe(v, b) - ajudas.notaDe(v, a))[0];
// o aviso criado por um dilema (sem passar pelo sorteio)
const dilema = (v, id) => { const def = Clube.DILEMAS.find((d) => d.id === id); return Clube.criarDilema(v, ajudas, def, () => 0.3); };

test("regras: a renovação cobra mais de quem é craque e menos de quem aceita contrato longo ou multa baixa", () => {
  const base = { salario: 1e6, nota: 80 };
  const t = (o) => R.termos({ ...base, ...o });
  assert.ok(t({ nota: 88 }).salario > t({ nota: 72 }).salario);
  assert.ok(t({ anos: 3 }).salario < t({ anos: 1 }).salario);
  assert.ok(t({ multa: "baixa" }).salario < t({ multa: "nenhuma" }).salario);
  assert.ok(t({ negociador: 3 }).luvas < t({ negociador: 0 }).luvas);
  assert.ok(t({ recusou: true }).salario > t({ recusou: false }).salario);
  assert.ok(t({}).salario >= base.salario, "ninguém renova ganhando menos");
});

test("regras: a janela com relógio e as faixas de confiança e reputação", () => {
  assert.strictEqual(R.restamNaJanela(0), 4);
  assert.strictEqual(R.restamNaJanela(3), 1);
  assert.strictEqual(R.restamNaJanela(4), null);
  assert.strictEqual(R.restamNaJanela(16), 5);
  assert.strictEqual(R.restamNaJanela(20), 1);
  assert.strictEqual(R.restamNaJanela(21), null);
  assert.strictEqual(R.nivelReputacao(85), "Lenda");
  assert.strictEqual(R.nivelReputacao(0), "Desconhecido");
  assert.match(R.nivelConfianca(10), /corda/);
  assert.deepStrictEqual(R.potVisivel(80, 3), [80, 80]);
  assert.deepStrictEqual(R.potVisivel(80, 1), [73, 87]);
  assert.strictEqual(R.potVisivel(80, 0), null);
});

test("contratos: todo o elenco tem contrato de 1 a 3 temporadas e quem chega assina por três", () => {
  const v = nova(), e = estado(v);
  assert.strictEqual(e.gestao.contratos.length, elenco(v).length);
  for (const k of e.gestao.contratos) assert.ok(k.anos >= 1 && k.anos <= 3, `anos ${k.anos}`);
  const j = Object.values(require("../public/carreira/base/inglaterra-2026.js").clubes[0].jogadores)[0];
  v.donos[j.id] = v.clube; Clube.contratar(v, ajudas, j.id);
  assert.strictEqual(v.gestao.contratos[j.id].fim, v.temporada + 2);
});

test("contratos: renovar custa luvas, sobe o salário, estica o prazo e registra a multa", () => {
  const v = nova(), j = melhor(v), antes = ajudas.salarioDe(v, j), caixa = v.caixa;
  v.gestao.contratos[j.id] = { fim: v.temporada, multa: 0 };
  const r = Clube.acao(v, ajudas, { acao: "renovar", jogador: j.id, anos: 2, multa: "alta" });
  assert.ok(r.mensagem, JSON.stringify(r));
  assert.ok(v.salarios[j.id] >= antes);
  assert.ok(v.caixa < caixa, "pagou as luvas");
  assert.strictEqual(v.gestao.contratos[j.id].fim, v.temporada + 2);
  assert.ok(v.gestao.contratos[j.id].multa > ajudas.valorAtual(v, j) * 3, "multa alta: mais de 3 vezes o valor");
  v.caixa = 0;
  assert.match(Clube.acao(v, ajudas, { acao: "renovar", jogador: j.id, anos: 1, multa: "baixa" }) , /esse|já vai|Faltam/i, "sem caixa ou contrato longo, não renova");
  v.gestao.contratos[j.id].fim = v.temporada; v.caixa = 0;
  assert.match(Clube.acao(v, ajudas, { acao: "renovar", jogador: j.id, anos: 1, multa: "baixa" }), /Faltam/);
});

test("contratos: na virada, quem acabou o contrato sai de graça e o aviso conta quem foi", () => {
  const v = nova("flamengo"), saindo = elenco(v).slice(0, 3);
  jogarTemporada(v);
  for (const j of elenco(v)) v.gestao.contratos[j.id] = { fim: 3, multa: 0 }; // só os três escolhidos acabam
  for (const j of saindo) v.gestao.contratos[j.id] = { fim: 1, multa: 0 };
  const manter = elenco(v)[5];
  novaTemporada(v);
  for (const j of saindo) assert.notStrictEqual(ajudas.donoDe(v, j.id), "flamengo", `${j.nome} devia ter saído`);
  assert.strictEqual(ajudas.donoDe(v, manter.id), "flamengo");
  assert.match(v.caixaEntrada.find((x) => x.tipo === "temporada").texto, /saíram de graça/);
  assert.ok(elenco(v).length >= 18);
});

test("multa rescisória: um clube grande paga a multa baixa de um craque, e o dinheiro entra no caixa", () => {
  let achou = false;
  for (let s = 0; s < 8 && !achou; s++) {
    const v = nova("palmeiras"); v.semente = `multa${s}`;
    const craque = melhor(v); v.bonusNota[craque.id] = 12; // nota alta: o clube grande cobiça
    v.gestao.contratos[craque.id] = { fim: v.temporada + 3, multa: 40e6, multaId: "baixa" };
    const caixa = v.caixa; v.temporada++;
    const texto = Clube.virada(v, ajudas);
    if (ajudas.donoDe(v, craque.id) !== "palmeiras") { achou = true; assert.ok(v.caixa >= caixa + 40e6 - 30e6, "recebeu a multa"); assert.match(texto, /pagou a multa/); }
  }
  assert.ok(achou, "em 8 tentativas algum clube tinha que pagar a multa de um craque");
});

test("base: a virada traz garotos com o potencial escondido, e só os olheiros mostram", () => {
  const v = nova(); jogarTemporada(v); novaTemporada(v);
  let e = estado(v);
  assert.ok(e.gestao.base.length >= 2, "garotos na base");
  for (const p of e.gestao.base) { assert.strictEqual(p.pot, null, "sem olheiros não se vê o potencial"); assert.ok(p.impressao); assert.ok(p.idade <= 18); }
  assert.ok(!JSON.stringify(e.gestao).includes('"pot":8') && !JSON.stringify(e.gestao).includes('"pot":7'), "o potencial exato não vai para o navegador");
  v.gestao.infra.olheiros = 3; e = estado(v);
  for (const p of e.gestao.base) assert.ok(p.pot && p.pot[0] === p.pot[1] && p.pot[0] >= p.nota, "com a rede completa vê o número exato");
});

test("base: promover leva o garoto ao elenco com contrato, e vender ou dispensar tira da base", () => {
  const v = nova(); v.gestao.infra.base = 1; jogarTemporada(v); novaTemporada(v);
  const [a, b, c] = v.gestao.prospectos.map((p) => p.id), tinha = elenco(v).length;
  assert.ok(Clube.acao(v, ajudas, { acao: "promover", jogador: a }).mensagem);
  assert.strictEqual(elenco(v).length, tinha + 1);
  assert.ok(v.jovens[a] && !("pot" in v.jovens[a]), "o potencial não vira dado do jogador");
  assert.strictEqual(v.gestao.contratos[a].fim, v.temporada + 2);
  const caixa = v.caixa;
  assert.ok(Clube.acao(v, ajudas, { acao: "vender-base", jogador: b }).mensagem);
  assert.ok(v.caixa > caixa);
  assert.ok(Clube.acao(v, ajudas, { acao: "dispensar-base", jogador: c }).mensagem);
  assert.match(Clube.acao(v, ajudas, { acao: "promover", jogador: b }), /não está mais/);
});

test("base: o nível da base e a habilidade de formador melhoram os garotos", () => {
  const v = nova();
  const media = (nivel, formador) => { let s = 0, n = 0; for (let i = 0; i < 12; i++) { v.gestao.infra.base = nivel; v.gestao.habilidades.formador = formador; v.gestao.prospectos = []; Clube.novosProspectos(v, ajudas, 2 + i); for (const p of v.gestao.prospectos) { s += p.pot; n++; } } return s / n; };
  assert.ok(media(3, 3) > media(0, 0) + 4, `${media(3, 3)} contra ${media(0, 0)}`);
});

test("estrutura: a obra é paga na hora, pronta na virada, e muda bilheteria, energia e lesões", () => {
  const v = nova(), caixa = v.caixa, custo = estado(v).gestao.custos[0];
  assert.ok(Clube.acao(v, ajudas, { acao: "obra", tipo: "medico" }).mensagem);
  assert.strictEqual(v.caixa, caixa - custo);
  assert.match(Clube.acao(v, ajudas, { acao: "obra", tipo: "estadio" }), /obra em andamento/);
  assert.strictEqual(Clube.fatorLesao(v, v.clube), 1, "ainda não ficou pronta");
  jogarTemporada(v); novaTemporada(v);
  assert.strictEqual(v.gestao.infra.medico, 1);
  assert.ok(Clube.fatorLesao(v, v.clube) < 1 && Clube.bonusRecupera(v) === 3);
  assert.ok(v.financas.some((f) => f.itens.some(([n]) => /Manutenção/.test(n))));
  v.gestao.infra.estadio = 2; assert.ok(Math.abs(Clube.fatorBilheteria(v) - 1.24) < 1e-9);
  v.caixa = 0; assert.match(Clube.acao(v, ajudas, { acao: "obra", tipo: "ct" }), /Faltam/);
  v.gestao.infra.ct = 3; v.caixa = 1e9; assert.match(Clube.acao(v, ajudas, { acao: "obra", tipo: "ct" }), /máximo/);
});

test("estrutura: o CT faz os jovens evoluírem mais na virada", () => {
  const pronta = nova("flamengo"); jogarTemporada(pronta);
  const json = JSON.stringify(pronta);
  const soma = (ct) => { const v = JSON.parse(json); v.gestao.infra.ct = ct; const antes = elenco(v).map((j) => j.id); novaTemporada(v); return antes.reduce((s, id) => s + (v.evolucao[id] || 0), 0); };
  assert.ok(soma(3) > soma(0), "com CT nível 3 o elenco soma mais evolução (jovens sobem, veteranos caem menos)");
});

test("capitão: só do elenco, segura a moral depois da derrota e a ausência pesa", () => {
  const v = nova(), cap = melhor(v);
  assert.match(Clube.acao(v, ajudas, { acao: "capitao", jogador: "ninguem" }), /não é do seu elenco/);
  assert.ok(Clube.acao(v, ajudas, { acao: "capitao", jogador: cap.id }).mensagem);
  const moral = (capitao) => { const x = nova(); x.moral = 60; if (capitao) x.gestao.capitao = melhor(x).id; Clube.aposJogo(x, ajudas, { nos: 0, eles: 1, emCasa: true, adv: null }); return x.moral; };
  assert.ok(moral(true) > moral(false), "o capitão recupera moral depois de perder");
  const x = nova(); x.moral = 60; x.gestao.capitao = melhor(x).id; x.lesoes[x.gestao.capitao] = 2; Clube.aposJogo(x, ajudas, { nos: 0, eles: 1, emCasa: true, adv: null });
  assert.ok(x.moral < 60, "sem o capitão em campo a derrota pesa");
});

test("dilemas: cada resposta muda o jogo e a conta chega depois, como aviso", () => {
  const v = nova(); jogarTemporada(v); novaTemporada(v);
  v.rodada = 3; v.moral = 60;
  const e = dilema(v, "patrocinio-polemico"); assert.ok(e && e.opcoes.length === 2 && !e.resolvido);
  v.caixaEntrada.unshift(e);
  const caixa = v.caixa, texto = Clube.responder(v, ajudas, e, "aceitar");
  assert.ok(v.caixa > caixa && /entraram no caixa/.test(texto));
  assert.strictEqual(v.gestao.depois.length, 1, "a consequência ficou agendada");
  const moral = v.moral;
  for (let i = 0; i < 7; i++) Clube.aposJogo(v, ajudas, { nos: 1, eles: 1, emCasa: false, adv: null });
  assert.strictEqual(v.gestao.depois.length, 1, "ainda falta um jogo");
  Clube.aposJogo(v, ajudas, { nos: 1, eles: 1, emCasa: false, adv: null });
  assert.strictEqual(v.gestao.depois.length, 0);
  assert.ok(v.moral <= moral - 4, `a torcida cobrou: ${moral} -> ${v.moral}`);
  assert.ok(v.caixaEntrada.some((x) => x.tipo === "clube-volta" && /torcida/.test(x.titulo)));
});

test("dilemas: a promessa ao reserva é conferida (cumprida dá evolução, quebrada custa moral e confiança)", () => {
  const v = nova(); jogarTemporada(v); novaTemporada(v); v.rodada = 5;
  const e = dilema(v, "reserva-pede-vaga");
  if (!e) return; // sem reserva bom o bastante nesse elenco
  const pid = e.dados.jogador, nota = v.bonusNota[pid] || 0;
  Clube.responder(v, ajudas, e, "prometer");
  const confianca = v.gestao.confianca;
  v.desempenho = { [pid]: [0, 0] };
  for (let i = 0; i < 6; i++) Clube.aposJogo(v, ajudas, { nos: 2, eles: 0, emCasa: true, adv: null });
  assert.ok(v.caixaEntrada.some((x) => /promessa/i.test(x.titulo)), "o aviso da promessa chegou");
  assert.ok(v.aVenda.includes(pid), "promessa quebrada: ele pediu para sair");
  assert.ok(v.gestao.confianca < confianca + 18, "a confiança não ganhou só com as vitórias");
  assert.strictEqual(v.bonusNota[pid] || 0, nota);
});

test("dilemas: a oferta irrecusável só aparece no último jogo da janela e vender entrega o dinheiro", () => {
  const v = nova("palmeiras");
  v.jogosJogados = []; v.rodada = 2;
  assert.strictEqual(dilema(v, "oferta-irrecusavel"), null, "faltam mais jogos para a janela fechar");
  v.jogosJogados = Array.from({ length: 3 }, (_, i) => `brasileirao-2026:liga:${i}:x:y`);
  const e = dilema(v, "oferta-irrecusavel"); assert.ok(e, "no último jogo da janela");
  v.caixaEntrada.unshift(e);
  const caixa = v.caixa, texto = Clube.responder(v, ajudas, e, "aceitar");
  assert.ok(v.caixa >= caixa + e.dados.valor * 0.99, texto);
  assert.notStrictEqual(ajudas.donoDe(v, e.dados.jogador), "palmeiras");
});

test("diretoria: a confiança cai com as derrotas, dá ultimato e a carreira solo termina em demissão", () => {
  const v = nova("palmeiras"); v.gestao.confianca = 40;
  let ultimato = false;
  for (let i = 0; i < 8 && !v.demitido; i++) { Clube.aposJogo(v, ajudas, { nos: 0, eles: 2, emCasa: i % 2 === 0, adv: null }); if (v.gestao.ultimato) ultimato = true; }
  assert.ok(ultimato, "houve ultimato");
  assert.ok(v.demitido, "sem pontos nos 4 jogos do ultimato, a diretoria demitiu");
  const e = estado(v); assert.ok(e.encerrada && e.demitido);
  assert.match(Clube.acao(v, ajudas, { acao: "capitao", jogador: melhor(v).id }), /demitido/);
  assert.ok(v.caixaEntrada.some((x) => /demitido/.test(x.titulo)));
});

test("diretoria: cumprir o ultimato devolve a confiança", () => {
  const v = nova("palmeiras"); v.gestao.confianca = 25;
  Clube.aposJogo(v, ajudas, { nos: 0, eles: 1, emCasa: true, adv: null });
  assert.ok(v.gestao.ultimato, "confiança baixa abre o ultimato");
  for (let i = 0; i < 4; i++) Clube.aposJogo(v, ajudas, { nos: 3, eles: 0, emCasa: true, adv: null });
  assert.strictEqual(v.gestao.ultimato, null);
  assert.ok(v.gestao.confianca > 40);
  assert.ok(!v.demitido);
});

test("legado: o jogador que marca a história entra no Hall da Fama, a camisa é aposentada e os recordes ficam", () => {
  const v = nova("palmeiras"), idolo = melhor(v);
  v.gols = { [idolo.id]: 22 }; v.desempenho = { [idolo.id]: [34, 240] };
  Clube.fechouTemporada(v, ajudas, { pos: 1, titulos: ["Brasileirão"], vices: [], cumpriuMeta: true });
  assert.ok(!v.gestao.legado.hall[idolo.id], "uma temporada boa não basta: o Hall da Fama é raro");
  v.temporada++; v.gols = { [idolo.id]: 22 }; v.desempenho = { [idolo.id]: [34, 240] };
  Clube.fechouTemporada(v, ajudas, { pos: 1, titulos: ["Brasileirão"], vices: [], cumpriuMeta: true });
  assert.ok(v.gestao.legado.hall[idolo.id], "duas temporadas de gols e título entram para a história");
  assert.ok(Object.keys(v.gestao.legado.hall).length <= 2, "no máximo dois por temporada");
  assert.strictEqual(v.gestao.legado.recordes.artilheiro.gols, 22);
  assert.strictEqual(v.gestao.legado.hall[idolo.id].titulos, 2);
  const e = estado(v);
  assert.ok(e.gestao.legado.hall.length >= 1);
  const caixa = v.caixa, moral = v.moral;
  assert.ok(Clube.acao(v, ajudas, { acao: "camisa", jogador: idolo.id }).mensagem);
  assert.ok(v.caixa > caixa && v.moral > moral);
  assert.strictEqual(v.gestao.legado.camisas.length, 1);
  assert.match(Clube.acao(v, ajudas, { acao: "camisa", jogador: idolo.id }), /já foi aposentada/);
  assert.match(Clube.acao(v, ajudas, { acao: "camisa", jogador: elenco(v).find((j) => j.id !== idolo.id).id }), /Hall da Fama/);
  assert.ok(v.gestao.legado.marcos.some((m) => m.tipo === "titulo") && v.gestao.legado.marcos.some((m) => m.tipo === "camisa"));
});

test("técnico: reputação e pontos sobem com a temporada, as habilidades custam 1 ponto e têm limite", () => {
  const v = nova("palmeiras"), pontos = v.gestao.pontos, rep = v.gestao.reputacao;
  Clube.fechouTemporada(v, ajudas, { pos: 1, titulos: ["Brasileirão"], vices: [], cumpriuMeta: true });
  assert.ok(v.gestao.reputacao >= rep + 14);
  assert.strictEqual(v.gestao.pontos, pontos + 3);
  for (let i = 0; i < 3; i++) assert.ok(Clube.acao(v, ajudas, { acao: "habilidade", id: "formador" }).mensagem);
  assert.match(Clube.acao(v, ajudas, { acao: "habilidade", id: "formador" }), /máximo/);
  v.gestao.pontos = 0; assert.match(Clube.acao(v, ajudas, { acao: "habilidade", id: "motivador" }), /não tem pontos/);
  v.gestao.reputacao = 60; v.gestao.pontos = 1;
  const antes = v.caixa; v.temporada++; Clube.virada(v, ajudas);
  assert.ok(v.caixa > antes - 5e6, "o prestígio rende patrocínio na virada");
});

test("técnico: com reputação alta aparece o convite de um clube grande, com duas saídas", () => {
  const v = nova("palmeiras"); v.gestao.reputacao = 55; v.rodada = 10;
  const e = dilema(v, "convite-clube-grande"); assert.ok(e);
  v.caixaEntrada.unshift(e);
  const confianca = v.gestao.confianca;
  Clube.responder(v, ajudas, e, "recusar");
  assert.ok(v.gestao.confianca > confianca && v.gestao.reputacao > 55);
  v.gestao.reputacao = 10; assert.strictEqual(dilema(v, "convite-clube-grande"), null, "sem fama não há convite");
});

test("rivais: o clássico da liga é sempre o mesmo e rende mais bilheteria, moral e confiança", () => {
  const v = nova("palmeiras"), rival = Clube.rivaisDe(v, ajudas)[0];
  assert.ok(rival && rival !== "palmeiras");
  assert.strictEqual(Clube.rivaisDe(nova("palmeiras"), ajudas)[0], rival, "sempre o mesmo rival");
  assert.ok(Clube.classicoCom(v, ajudas, rival));
  const moral = v.moral;
  Clube.aposJogo(v, ajudas, { nos: 2, eles: 0, emCasa: true, adv: rival });
  const sem = nova("palmeiras"); sem.moral = moral; Clube.aposJogo(sem, ajudas, { nos: 2, eles: 0, emCasa: true, adv: null });
  assert.ok(v.moral > sem.moral, "vencer o clássico anima mais");
  assert.ok(v.feed.some((p) => /CLÁSSICO/.test(p.texto)));
});

test("rivais na sala: o confronto direto fica registrado, com freguês, provocação no feed e placar dos dois lados", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 2 });
  const jogo = (casa, fora, placar, penaltis) => Clube.registrarConfronto(save, { casa, fora, competicao: "brasileirao-2026" }, { placar, ...(penaltis && { penaltis }) });
  jogo("flamengo", "palmeiras", [2, 0]); jogo("palmeiras", "flamengo", [0, 1]); jogo("flamengo", "palmeiras", [1, 1]); jogo("palmeiras", "flamengo", [1, 1], [4, 5]);
  const v = G.vistaDe(save, "flamengo");
  let r = Clube.estado(v, ajudas).rivais[0];
  assert.strictEqual(r.clube, "palmeiras");
  assert.strictEqual(r.tecnico, "Bia", "o nome do técnico, não o objeto");
  assert.deepStrictEqual([r.v, r.e, r.d], [3, 1, 0], "a decisão por pênaltis conta como vitória");
  assert.strictEqual(r.fregues, "voce");
  assert.strictEqual(r.ultimos.length, 4);
  const do_outro = Clube.estado(G.vistaDe(save, "palmeiras"), ajudas).rivais[0];
  assert.deepStrictEqual([do_outro.v, do_outro.e, do_outro.d], [0, 1, 3]);
  assert.strictEqual(do_outro.fregues, "ele");
  Clube.provocacao(v, ajudas, { adv: "palmeiras", nos: 1, eles: 0 });
  assert.ok(v.feed.some((p) => /freguês/.test(p.texto)), "a provocação cita o freguês");
});

test("sala: a gestão de cada técnico é só dele (contrato, obra e capitão não vazam para o outro)", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 2 });
  const a = G.vistaDe(save, "flamengo"); G.completar(a);
  assert.ok(Clube.acao(a, ajudas, { acao: "obra", tipo: "ct" }).mensagem);
  G.guardarVista(save, a);
  assert.strictEqual(G.vistaDe(save, "flamengo").gestao.obra.tipo, "ct");
  assert.strictEqual(G.vistaDe(save, "palmeiras").gestao.obra, null);
  assert.strictEqual(G.vistaDe(save, "palmeiras").gestaoDe("flamengo").obra.tipo, "ct", "o mundo enxerga a estrutura do outro (para as lesões e a evolução)");
});

test("sala: na virada cada técnico recebe a base e a estrutura dele, e a diretoria intervém no lugar de demitir", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 2 });
  const v = G.vistaDe(save, "flamengo"); G.completar(v);
  v.gestao.confianca = 2;
  const antes = elenco(v).length;
  Clube.aposJogo(v, ajudas, { nos: 0, eles: 3, emCasa: true, adv: null });
  assert.ok(!v.demitido, "na sala ninguém sai do jogo");
  assert.strictEqual(v.gestao.confianca, 40);
  assert.strictEqual(v.gestao.intervencoes, 1);
  assert.strictEqual(elenco(v).length, antes - 1, "a diretoria vendeu o jogador mais bem pago");
  assert.ok(v.caixaEntrada.some((x) => /interveio/.test(x.titulo)));
});

test("a carreira solo inteira roda com a gestão (duas temporadas) e o estado cabe em JSON", () => {
  const v = nova("palmeiras");
  jogarTemporada(v);
  assert.ok(v.gestao.legado.marcos.length >= 0);
  novaTemporada(v);
  jogarTemporada(v);
  const e = estado(v), json = JSON.stringify(e);
  assert.ok(json.length < 4e6, `estado grande demais: ${json.length}`);
  assert.ok(e.gestao.legado.historico.length >= 1);
  assert.ok(e.gestao.contratos.every((k) => typeof k.fim === "number"));
});

test("sala pelo canal de verdade: o técnico faz a obra e nomeia o capitão, e o estado traz a gestão dele", async () => {
  const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");
  const srv = await subirServidor({ CARREIRA_ESPERA_MS: "0" });
  try {
    const a = await conectar(srv.url, "/carreira-online");
    await pedir(a, "create", { name: "P0" });
    await pedir(a, "act", { type: "clube", clube: "flamengo" });
    await pedir(a, "act", { type: "opcoes", aporte: 0 });
    await pedir(a, "act", { type: "comecar" });
    await esperarEstado(a, (s) => s.fase === "carreira");
    const entrada = await pedir(a, "entrar", {});
    assert.ok(entrada.estado.gestao.contratos.length >= 18, "o estado da sala já traz a gestão");
    const r = await pedir(a, "clube", { acao: "obra", tipo: "ct" });
    assert.strictEqual(r.estado.gestao.obra.tipo, "ct");
    const craque = r.estado.gestao.candidatos[0].id;
    const c = await pedir(a, "clube", { acao: "capitao", jogador: craque });
    assert.strictEqual(c.estado.gestao.capitao, craque);
    await assert.rejects(pedir(a, "clube", { acao: "obra", tipo: "medico" }), /obra em andamento/);
    a.close();
  } finally { await srv.parar(); }
});

test("ações da tela Clube: nomes estranhos não passam (nem __proto__ nem constructor)", () => {
  const v = nova();
  for (const t of ["__proto__", "constructor", "toString", "nada"]) {
    assert.match(Clube.acao(v, ajudas, { acao: "obra", tipo: t }), /Escolha uma obra/);
    assert.match(Clube.acao(v, ajudas, { acao: "habilidade", id: t }), /Escolha uma habilidade/);
  }
  assert.match(Clube.acao(v, ajudas, { acao: "inventada" }), /desconhecida/);
  const j = melhor(v); v.gestao.contratos[j.id] = { fim: v.temporada, multa: 0 };
  assert.ok(Clube.acao(v, ajudas, { acao: "renovar", jogador: j.id, anos: 99, multa: "constructor" }).mensagem, "multa inválida vira sem multa e os anos ficam entre 1 e 3");
  assert.strictEqual(v.gestao.contratos[j.id].multa, 0);
  assert.ok(v.gestao.contratos[j.id].fim <= v.temporada + 3);
});
