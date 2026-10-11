// Modo Jogador (Rumo ao Estrelato): a mesma carreira de treinador (o mesmo mundo, calendário, motor e banco), mas você
// controla UM jogador. O treinador é o computador: a confiança dele decide se você começa jogando, a nota de cada jogo
// faz o jogador crescer, e o treino aponta o que melhora. Canal /jogador, a carreira salva em bd.js como as outras.
// O jogador é um "jovem" da carreira (save.jovens.eu, dono = o clube): por isso a virada de temporada (idade, evolução,
// aposentadoria) e a escalação automática já funcionam sem mexer. O resto fica em save.jogador.
const bd = require("./bd.js");
const C = require("./carreira.js").jogador;
const { Motor, Evolucao } = C;
const ID = "eu";
const POSICOES = ["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PE", "PD", "ATA"];
const NACOES = ["Brasil", "Argentina", "Portugal", "Inglaterra", "Espanha", "França", "Itália", "Alemanha"];
// o que cada atributo é no jogo (a ordem de Evolucao.criarJovem: rit, fin, pas, dri, def, fis, gol)
const ATRIBUTOS = ["rit", "fin", "pas", "dri", "def", "fis", "gol"];
// a diferença de cada atributo para a nota, por posição (a mesma de Evolucao.criarJovem)
const PERFIL = {
  GOL: [-25, -40, -12, -25, -20, -5, 3], ZAG: [-8, -20, -8, -14, 5, 4, -50], LD: [4, -14, -2, -4, 0, -2, -50], LE: [4, -14, -2, -4, 0, -2, -50],
  VOL: [-6, -12, 0, -6, 4, 3, -50], MC: [-2, -4, 5, 2, -4, 0, -50], MEI: [0, 2, 6, 5, -18, -6, -50], PE: [8, 0, -2, 6, -24, -6, -50], PD: [8, 0, -2, 6, -24, -6, -50], ATA: [3, 6, -6, 2, -26, 3, -50],
};
// o treino da semana: em quais atributos a evolução cai
const FOCOS = {
  equilibrado: { nome: "Equilibrado", atr: null },
  tecnica: { nome: "Técnica", atr: ["pas", "dri"] },
  fisico: { nome: "Físico", atr: ["fis", "rit"] },
  ataque: { nome: "Finalização", atr: ["fin"] },
  defesa: { nome: "Marcação", atr: ["def"] },
  goleiro: { nome: "Goleiro", atr: ["gol"] },
};
const focosDe = (pos) => Object.keys(FOCOS).filter((f) => (pos === "GOL" ? ["equilibrado", "fisico", "goleiro"].includes(f) : f !== "goleiro"));
const NOMES_ATR = { rit: "Ritmo", fin: "Finalização", pas: "Passe", dri: "Drible", def: "Defesa", fis: "Físico", gol: "Goleiro" };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inteiro = (v, a, b, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? clamp(n, a, b) : d; };
const limparNome = (n) => String(n || "").replace(/\s+/g, " ").trim().slice(0, 24);
const ok = (cb, extra = {}) => typeof cb === "function" && cb({ ok: true, ...extra });
const falha = (cb, error) => typeof cb === "function" && cb({ ok: false, error });
const arred = (v) => Math.round(v * 10) / 10;

// ---------- o jogador ----------
// a nota do começo pela idade: quem entra mais velho já chega mais pronto
const notaInicial = (idade) => Math.round(58 + (idade - 17) * 1.6);
function criarJogador({ nome, pos, nat, idade, pe, semente }) {
  const nota = notaInicial(idade), r = Motor.sorteDe(`atr:${semente}`);
  const a = PERFIL[pos].map((v) => clamp(Math.round(nota + v + (r() - 0.5) * 6), 20, 95));
  return { id: ID, nome, pos, nat, idade, desde: 1, nota, est: false, base: true, pe, eu: true, atr: Object.fromEntries(ATRIBUTOS.map((k, i) => [k, a[i]])) };
}
// o teto do jogador (escondido): quanto ele pode chegar. No navegador só aparecem as estrelas
const tetoDe = (semente) => 78 + Math.floor(Motor.sorteDe(`teto:${semente}`)() * 15);
const estrelas = (teto) => clamp(Math.round((teto - 72) / 4), 1, 5);
const xpPara = (nota, teto) => 110 + 30 * Math.max(0, nota - (teto - 10));

// ---------- os objetivos da temporada ----------
function objetivosDe(save) {
  const j = save.jogador, total = Math.max(1, save.calendario.length), pos = j.pos;
  // o que se espera de quem tem esta confiança: o titular joga mais da metade, o reserva uns jogos
  const jogos = Math.max(3, Math.round(total * (j.confianca >= 62 ? 0.55 : j.confianca >= 40 ? 0.4 : 0.25)));
  const lista = [
    { id: "jogos", titulo: "Entrar em campo", alvo: jogos, medida: "jogos", texto: (a) => `Jogar ${a} partidas` },
    { id: "nota", titulo: "Regularidade", alvo: 6.6, medida: "nota", texto: (a) => `Nota média ${String(a).replace(".", ",")} ou mais` },
  ];
  if (pos === "GOL") lista.push({ id: "cs", titulo: "Muralha", alvo: Math.max(2, Math.round(jogos * 0.3)), medida: "jogos sem sofrer gol", texto: (a) => `${a} jogos sem sofrer gol` });
  else {
    const porJogo = { ATA: 0.3, PE: 0.2, PD: 0.2, MEI: 0.15, MC: 0.08, VOL: 0.05, LD: 0.05, LE: 0.05, ZAG: 0.05 }[pos];
    lista.push({ id: "gols", titulo: pos === "ATA" ? "Artilheiro" : "Decisivo", alvo: Math.max(1, Math.round(porJogo * jogos)), medida: "gols", texto: (a) => `Marcar ${a} gol${a > 1 ? "s" : ""}` });
  }
  return lista.map(({ texto, ...o }) => ({ ...o, texto: texto(o.alvo), cumprido: false, feito: false }));
}
const progressoDe = (t, o) => (o.id === "jogos" ? t.jogos : o.id === "nota" ? (t.jogos >= 5 ? arred(t.soma / t.jogos) : 0) : o.id === "gols" ? t.gols : t.cs);
const tempVazia = () => ({ jogos: 0, titular: 0, gols: 0, assist: 0, soma: 0, cs: 0, melhor: 0 });

// ---------- a confiança do treinador ----------
const ajusteDe = (conf) => clamp(Math.round((conf - 50) / 8), -4, 6);
// nas copas o treinador rodava o elenco: quem está no banco ganha uma chance a mais (e isso evita a espiral de nunca jogar)
function prepararAjuste(save) {
  const j = save.jogador, prox = C.proximoJogoMundo(save), comp = prox && save.competicoes[prox.competicao];
  j.ajuste = ajusteDe(j.confianca) + (comp && comp.tipo !== "liga" && !prox.mataMata ? 3 : 0);
}
function papelDe(save) {
  const j = save.jogador;
  prepararAjuste(save);
  if (save.lesoes[ID]) return "lesionado";
  if (save.suspensos[ID]) return "suspenso";
  return C.titularesDe(save, save.clube).includes(ID) ? "titular" : "banco";
}
function falaDoTreinador(conf, papel) {
  if (papel === "lesionado") return "Cuide da recuperação. A vaga espera, mas não para sempre.";
  if (papel === "suspenso") return "Cartão é descuido. Volte pronto para a próxima.";
  if (conf >= 80) return "Você é peça-chave. O time joga com você.";
  if (conf >= 62) return papel === "titular" ? "Está merecendo a vaga. Continue assim." : "Fique pronto: você está no meu radar para o time titular.";
  if (conf >= 40) return papel === "titular" ? "A vaga é sua por enquanto, mas tem concorrência." : "Treine forte. Quando chamar, quero ver serviço.";
  if (conf >= 22) return "Preciso ver mais. Por enquanto, você começa no banco.";
  return "No momento, você não está nos meus planos.";
}

// ---------- evolução ----------
// 1 nível = +1 na nota e +1 num atributo do treino
function subirNivel(save, quantos) {
  const j = save.jogador, e = save.jovens[ID], foco = FOCOS[j.foco] || FOCOS.equilibrado, sobe = [];
  const principais = ATRIBUTOS.map((k, i) => [k, PERFIL[j.pos][i]]).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
  for (let i = 0; i < quantos; i++) {
    if (C.notaDe(save, e) >= Math.min(95, j.teto)) break;
    const lista = foco.atr || principais, k = lista[(j.niveis + i) % lista.length];
    e.atr[k] = Math.min(95, e.atr[k] + 1);
    save.bonusNota[ID] = (save.bonusNota[ID] || 0) + 1;
    sobe.push(k);
  }
  j.niveis += sobe.length;
  return sobe;
}

function diario(save, texto) {
  const j = save.jogador;
  j.diario.unshift({ temporada: save.temporada, rodada: save.rodada, texto });
  j.diario.length = Math.min(j.diario.length, 30);
}

// depois do jogo: nota, confiança, treino, evolução e o relatório
function aposJogo(save, antes) {
  const j = save.jogador, e = save.jovens[ID], ult = save.ultimo;
  const d = save.desempenho[ID] || [0, 0], jogou = d[0] > antes.jogos;
  const nota = jogou ? arred(d[1] - antes.soma) : null;
  const eventos = (ult && ult.eventos) || [];
  const gols = eventos.filter((x) => x.tipo === "gol" && x.jogador === ID).length, assist = eventos.filter((x) => x.tipo === "gol" && x.assist === ID).length;
  const amarelo = eventos.some((x) => x.tipo === "amarelo" && x.jogador === ID), vermelho = eventos.some((x) => x.tipo === "vermelho" && x.jogador === ID);
  const lesionou = eventos.some((x) => x.tipo === "lesao" && x.jogador === ID);
  const emCasa = ult.casa === save.clube, contra = emCasa ? ult.placar[1] : ult.placar[0], pro = emCasa ? ult.placar[0] : ult.placar[1];
  const titular = antes.papel === "titular", cs = jogou && contra === 0 ? 1 : 0;
  const t = j.temp, confAntes = j.confianca;
  // o treino da semana: uma nota (de 4 a 9) que sobe com o nível do jogador e o ritmo de evolução; treino bom convence o treinador
  const rt = Motor.sorteDe(`treino:${save.semente}:${save.temporada}:${save.rodada}`);
  const treino = arred(clamp(6 + (C.notaDe(save, e) - 60) / 12 + (rt() - 0.45) * 2.6, 4, 9));
  let delta = treino >= 8 ? 4 : treino >= 7 ? 2 : treino < 5.5 ? -1 : 0, xp = 3 + (j.foco === "equilibrado" ? 0 : 1);
  const linhas = [];
  if (jogou) {
    t.jogos++; t.soma = arred(t.soma + nota); t.gols += gols; t.assist += assist; t.cs += cs; if (titular) t.titular++; t.melhor = Math.max(t.melhor, nota);
    delta += (nota - 6.4) * 7 + (titular ? 2 : 0) + gols * 3 + assist * 1.5 - (vermelho ? 8 : 0);
    xp += Math.max(0, (nota - 5.5) * 5) + gols * 4 + assist * 2;
    j.forma.unshift(nota); j.forma.length = Math.min(j.forma.length, 5);
    j.carreira.jogos++; j.carreira.gols += gols; j.carreira.assist += assist;
    if (j.carreira.jogos === 1) diario(save, "Estreia como profissional!");
    if (gols && !j.carreira.golsAntes) diario(save, "Primeiro gol como profissional!");
    if (titular && !j.foiTitular) { j.foiTitular = true; diario(save, "Primeira vez entre os titulares."); }
    if (nota >= 8.5) diario(save, `Atuação de gala: nota ${String(nota).replace(".", ",")}.`);
    j.carreira.golsAntes = j.carreira.golsAntes || j.carreira.gols > 0;
  }
  j.confianca = clamp(Math.round(confAntes + delta), jogou || antes.papel !== "banco" ? 5 : 22, 100); // quem só treina não cai abaixo de 22: o treinador ainda vê
  j.ajuste = ajusteDe(j.confianca);
  if (lesionou) diario(save, "Lesão no jogo: vai desfalcar o time.");
  // o treino/evolução
  j.xp += Math.round(xp);
  let niveis = 0;
  while (j.xp >= xpPara(C.notaDe(save, e), j.teto) && C.notaDe(save, e) < Math.min(95, j.teto)) { j.xp -= xpPara(C.notaDe(save, e), j.teto); niveis++; if (niveis >= 3) break; const s = subirNivel(save, 1); if (!s.length) break; linhas.push(s[0]); }
  if (niveis) diario(save, `Evoluiu: nota geral ${C.notaDe(save, e)} (${linhas.map((k) => `+1 ${NOMES_ATR[k]}`).join(", ")}).`);
  j.relatorio = { temporada: save.temporada, rotulo: rotuloDe(save, ult), casa: ult.casa, fora: ult.fora, placar: ult.placar, penaltis: ult.penaltis || null, jogou, titular, papel: antes.papel, nota, gols, assist, cs,
    treino, amarelo, vermelho, lesionou, confianca: [confAntes, j.confianca], xp: Math.round(xp), niveis: linhas, pro, contra };
  save.demitido = undefined; // quem é demitido é o treinador do clube: aqui não existe carreira de técnico
}
function rotuloDe(save, ult) {
  const comp = save.competicoes && save.competicoes[ult.competicao];
  if (!comp) return "";
  const jogo = comp.jogos.find((x) => x.id === ult.jogoId) || {};
  if (comp.tipo === "liga") return `${comp.nome} · rodada ${(jogo.rodada || 0) + 1}`;
  const FASES = { preliminar: "fase preliminar", oitavas: "oitavas", quartas: "quartas", semifinal: "semifinal", final: "final" };
  return `${comp.nome} · ${String(jogo.fase || "").startsWith("grupo-") ? "fase de grupos" : FASES[jogo.fase] || jogo.fase || ""}`;
}

// ---------- o fim da temporada ----------
function fecharTemporada(save) {
  const j = save.jogador, e = save.jovens[ID], t = j.temp, media = t.jogos ? arred(t.soma / t.jogos) : null;
  let bonus = 0;
  const objetivos = j.objetivos.map((o) => { const p = progressoDe(t, o), cumprido = p >= o.alvo; if (cumprido) bonus++; return { ...o, progresso: p, cumprido, feito: true }; });
  j.xp += bonus * 100;
  j.confianca = clamp(Math.round(j.confianca + bonus * 4), 5, 100);
  j.historico.push({ temporada: save.temporada, ano: save.ano, clube: save.clube, idade: Evolucao.idadeNa(e, save.temporada), nota: C.notaDe(save, e), jogos: t.jogos, titular: t.titular, gols: t.gols, assist: t.assist, media, cs: t.cs, objetivos: objetivos.map((o) => [o.texto, o.cumprido]) });
  diario(save, `Fim da temporada ${save.ano}: ${t.jogos} jogos, ${t.gols} gols, ${bonus} de ${objetivos.length} objetivos cumpridos.`);
  return bonus;
}
function proximaTemporada(save) {
  const e = save.jovens[ID], j = save.jogador;
  const erro = C.novaTemporada(save);
  if (erro) return erro;
  j.confianca = Math.round(j.confianca * 0.6 + 20); // férias: o treinador esquece um pouco
  j.ajuste = ajusteDe(j.confianca);
  j.temp = tempVazia(); j.objetivos = objetivosDe(save); j.relatorio = null; j.forma = [];
  // quem acabou de virar a temporada pode ter ganho nota pela evolução natural
  const nota = C.notaDe(save, e);
  diario(save, `Começa a temporada ${save.ano}: ${Evolucao.idadeNa(e, save.temporada)} anos, nota ${nota}.`);
  return null;
}

// ---------- o que o navegador recebe ----------
function visao(save) {
  const j = save.jogador, e = save.jovens[ID], clube = C.clubeDe(save, save.clube), papel = papelDe(save), t = j.temp;
  const acabou = C.temporadaAcabou(save), fim = acabou && save.temporada >= save.temporadasMax;
  const prox = acabou ? null : C.proximoJogoMundo(save), comp = prox && save.competicoes[prox.competicao];
  const nota = C.notaDe(save, e);
  const rivais = C.elencoDe(save, save.clube).filter((x) => x.id !== ID && x.pos === j.pos).sort((a, b) => C.notaDe(save, b) - C.notaDe(save, a)).slice(0, 3).map((x) => ({ nome: x.nome, nota: C.notaDe(save, x), idade: Evolucao.idadeNa(x, save.temporada) }));
  return {
    eu: { nome: j.nome, pos: j.pos, nat: j.nat, pe: j.pe, idade: Evolucao.idadeNa(e, save.temporada), nota, atr: e.atr, estrelas: estrelas(j.teto), niveis: j.niveis },
    clube: { id: clube.id, nome: clube.nome, cidade: clube.cidade, liga: C.ligaDoClube(clube.id, save) },
    temporada: save.temporada, ano: save.ano, temporadasMax: save.temporadasMax, rodada: save.rodada, totalJogos: save.calendario.length,
    confianca: j.confianca, papel, fala: falaDoTreinador(j.confianca, papel), lesao: save.lesoes[ID] || 0, suspenso: save.suspensos[ID] || 0,
    foco: j.foco, focos: focosDe(j.pos).map((f) => [f, FOCOS[f].nome]), xp: j.xp, xpPara: xpPara(nota, j.teto), noTeto: nota >= Math.min(95, j.teto),
    forma: j.forma, rivais,
    proximo: prox ? { competicao: comp.nome, tipo: comp.tipo, fase: prox.fase, casa: prox.casa, fora: prox.fora, rotulo: comp.tipo === "liga" ? `Rodada ${(prox.rodada || 0) + 1}` : String(prox.fase).startsWith("grupo-") ? "Fase de grupos" : prox.fase } : null,
    relatorio: j.relatorio, temp: { ...t, media: t.jogos ? arred(t.soma / t.jogos) : null },
    objetivos: j.objetivos.map((o) => ({ ...o, progresso: progressoDe(t, o) })),
    carreira: j.carreira, historico: j.historico, diario: j.diario.slice(0, 12),
    acabou, fim,
  };
}

module.exports = function ligarJogador(io) {
  const nsp = io.of("/jogador");
  nsp.on("connection", (socket) => {
    let token = null, criadas = 0;
    function comJogador(cb, acao) {
      const c = token && bd.carreiraPorToken(token);
      if (!c || !c.dados.jogador) return falha(cb, "Carreira não encontrada. Entre de novo.");
      const save = c.dados;
      if (C.antiga(save)) return falha(cb, C.ANTIGA);
      C.completar(save);
      const r = acao(save);
      if (typeof r === "string") return falha(cb, r);
      bd.salvarCarreira(c.id, save);
      ok(cb, { ...(r || {}), estado: visao(save) });
    }
    function abrir(c, cb, extra = {}) {
      if (!c || !c.dados.jogador) return falha(cb, "Carreira de jogador não encontrada.");
      if (C.antiga(c.dados)) return falha(cb, C.ANTIGA);
      C.completar(c.dados);
      token = c.token;
      ok(cb, { token: c.token, estado: visao(c.dados), ...extra });
    }
    socket.on("criar", (d = {}, cb) => {
      const nome = limparNome(d.nome), base = C.BASES[C.BASE_PADRAO];
      if (!nome) return falha(cb, "Coloque o nome do jogador.");
      if (!POSICOES.includes(d.pos)) return falha(cb, "Escolha a posição.");
      if (!base.clubes.some((c) => c.id === d.clube)) return falha(cb, "Escolha um clube.");
      if (++criadas > 5) return falha(cb, "Calma: já foram várias carreiras criadas daqui.");
      const idade = inteiro(d.idade, 17, 23, 18), nat = NACOES.includes(d.nat) ? d.nat : "Brasil", pe = d.pe === "E" ? "E" : "D";
      try {
        const save = C.novaCarreira(nome, d.clube, "", inteiro(d.temporadas, 1, 5, 3), 0);
        const eu = criarJogador({ nome, pos: d.pos, nat, idade, pe, semente: save.semente });
        save.jovens[ID] = eu; save.donos[ID] = d.clube;
        save.jogador = { id: ID, nome, pos: d.pos, nat, pe, teto: tetoDe(save.semente), confianca: 45, ajuste: ajusteDe(45), foco: "equilibrado", xp: 0, niveis: 0, forma: [], relatorio: null, temp: tempVazia(), objetivos: [],
          carreira: { jogos: 0, gols: 0, assist: 0 }, historico: [], diario: [] };
        save.jogador.objetivos = objetivosDe(save);
        diario(save, `Assinou o primeiro contrato profissional com o ${C.clubeDe(save, d.clube).nome}.`);
        const c = bd.criarCarreira(nome, save);
        token = c.token;
        ok(cb, { token: c.token, recuperacao: c.recuperacao, estado: visao(save) });
      } catch (e) { console.warn("Modo jogador:", e); falha(cb, "O banco de dados não respondeu. Tente de novo daqui a pouco."); }
    });
    socket.on("entrar", (d = {}, cb) => { let c = null; try { c = bd.carreiraPorToken(d.token); } catch {} abrir(c, cb); });
    socket.on("recuperar", (d = {}, cb) => { let c = null; try { c = bd.recuperarCarreira(d.codigo); } catch {} if (!c) return falha(cb, "Código não encontrado. Confira as 12 letras."); abrir(c, cb); });
    socket.on("foco", (d = {}, cb) => comJogador(cb, (save) => {
      if (!focosDe(save.jogador.pos).includes(d.foco)) return "Esse treino não serve para a sua posição.";
      save.jogador.foco = d.foco;
    }));
    socket.on("jogar", (d, cb) => comJogador(cb, (save) => {
      if (C.temporadaAcabou(save)) return "A temporada acabou.";
      const antes = { papel: papelDe(save), jogos: (save.desempenho[ID] || [0, 0])[0], soma: (save.desempenho[ID] || [0, 0])[1] };
      const erro = C.jogarProximo(save, { modo: 1 });
      if (erro) return erro;
      aposJogo(save, antes);
      if (C.temporadaAcabou(save)) fecharTemporada(save); // o balanço do ano já fica no histórico, mesmo no fim da carreira
    }));
    socket.on("proxima", (d, cb) => comJogador(cb, (save) => {
      if (!C.temporadaAcabou(save)) return "A temporada ainda não acabou.";
      if (save.temporada >= save.temporadasMax) return "A carreira terminou.";
      return proximaTemporada(save);
    }));
    socket.on("codigo", (d, cb) => {
      const c = token && bd.carreiraPorToken(token);
      if (!c) return falha(cb, "Carreira não encontrada. Entre de novo.");
      const recuperacao = bd.novoCodigoDe(c.id);
      return recuperacao ? ok(cb, { recuperacao }) : falha(cb, "O banco de dados não respondeu. Tente de novo.");
    });
    socket.on("excluir", (d, cb) => {
      const c = token && bd.carreiraPorToken(token);
      if (!c) return falha(cb, "Carreira não encontrada. Entre de novo.");
      bd.excluirCarreira(c.id); token = null;
      ok(cb);
    });
    socket.on("sair", (d, cb) => { token = null; ok(cb); });
  });
};
module.exports.paraTestes = { criarJogador, objetivosDe, ajusteDe, xpPara, visao, aposJogo, fecharTemporada, POSICOES };
