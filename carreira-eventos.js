// Carreira de Treinador: os eventos entre as rodadas (a "caixa de entrada" do técnico). As propostas pelos seus
// jogadores, as transferências entre os outros clubes, a torcida reagindo às sequências e os eventos do catálogo
// (carreira-catalogo.js). Tudo sorteado com a semente da carreira e a rodada: recarregar não muda nada.
// Os que pedem resposta ficam esperando; se você jogar sem responder, vale a opção padrão.
// Os efeitos que duram algumas rodadas ficam em save.efeitos: { alvo: "time" | "rival" | id do jogador, nota, de, ate }
// (de e ate são rodadas); o carreira.js soma a nota nos jogos desse intervalo.
const Motor = require("./public/carreira/motor.js");
const Mercado = require("./public/carreira/mercado.js");
const Temporada = require("./public/carreira/temporada.js");
const { CATALOGO } = require("./carreira-catalogo.js");
const POR_ID = Object.fromEntries(CATALOGO.map((d) => [d.id, d]));

const { dinheiro } = Mercado;
const sorteio = (r, lista) => lista[Math.floor(r() * lista.length)];

// as posições de cada alvo do catálogo
const GRUPOS = { ataque: ["ATA", "PE", "PD"], meio: ["VOL", "MC", "MEI"], defesa: ["ZAG", "LD", "LE"], goleiro: ["GOL"] };
// o jogador que o evento atinge (ou null se ninguém serve)
function alvoDe(save, c, r, alvo) {
  if (!alvo) return null;
  const meu = c.elencoDe(save, save.clube), livre = (j) => !save.lesoes[j.id] && !save.suspensos[j.id];
  const titulares = new Set(c.titularesDe(save, save.clube)), tit = meu.filter((j) => titulares.has(j.id));
  let lista;
  if (alvo === "titular") lista = tit;
  else if (alvo === "reserva") lista = meu.filter((j) => !titulares.has(j.id) && livre(j));
  else if (alvo === "craque") lista = [...tit].sort((a, b) => c.notaDe(save, b) - c.notaDe(save, a)).slice(0, 3);
  else if (GRUPOS[alvo]) lista = tit.filter((j) => GRUPOS[alvo].includes(j.pos));
  else if (alvo === "estrangeiro") lista = meu.filter((j) => j.nat && j.nat !== "Brasil" && livre(j));
  else if (alvo === "lesionado") lista = meu.filter((j) => save.lesoes[j.id]);
  else if (alvo === "outro") lista = c.idsDosClubes(save).filter((x) => x !== save.clube).flatMap((cl) => c.elencoDe(save, cl)).filter((j) => c.notaDe(save, j) >= 70 && !j.base && !save.indicacoes[j.id]);
  else lista = meu.filter(livre);
  return lista.length ? sorteio(r, lista) : null;
}

// as ajudas do catálogo (ver o começo de carreira-catalogo.js). sorte: o sorteio; j: o alvo; v: os valores da criação
function contexto(save, c, sorte, j = null, v = {}) {
  const clube = c.clubeDe(save, save.clube), R = save.rodada;
  const jogo = save.calendario[R] && save.calendario[R].find((m) => m.includes(save.clube));
  const advId = jogo ? (jogo[0] === save.clube ? jogo[1] : jogo[0]) : null;
  const ult = c.ultimosResultados(save, 3);
  const pos = R > 0 ? Temporada.tabela(c.idsDosClubes(save), save.resultados).findIndex((l) => l.id === save.clube) + 1 : 0;
  const efeito = (alvo, nota, rodadas, atraso) => {
    if (!nota) return;
    const de = R + (atraso || 0);
    (save.efeitos || (save.efeitos = [])).push({ alvo, nota, de, ate: de + Math.max(1, rodadas) - 1 });
  };
  const meu = () => !!j && c.donoDe(save, j.id) === save.clube;
  return {
    save, j, v, r: sorte, din: dinheiro, T: clube.tamanho, clube: clube.nome,
    n: j ? j.nome : "", clubeDoAlvo: j ? c.clubeDe(save, c.donoDe(save, j.id)).nome : "",
    salarioAtual: j ? c.salarioDe(save, j) : 0, valorAlvo: j ? Mercado.valorDe(c.comNota(save, j)) : 0,
    adv: advId ? c.clubeDe(save, advId).nome : null, advTamanho: advId ? c.clubeDe(save, advId).tamanho : 0,
    casa: !!jogo && jogo[0] === save.clube, janela: Mercado.janelaAberta(R), posicao: pos,
    vitorias: ult.filter((u) => u === "V").length, derrotas: ult.filter((u) => u === "D").length,
    caixaAtual: save.caixa, folha: c.elencoDe(save, save.clube).reduce((s, p) => s + c.salarioDe(save, p), 0),
    sorte: (p) => sorte() < p,
    nomeClube: (id) => (c.clubeDe(save, id) || {}).nome || "um clube grande",
    clubeGrande: () => sorteio(sorte, c.idsDosClubes(save).filter((id) => id !== save.clube && c.clubeDe(save, id).tamanho >= 4)),
    moral: (n) => c.mudarMoral(save, n),
    caixa: (nome, valor) => { if (valor) c.movimentar(save, nome, Math.round(valor)); },
    time: (n, rodadas, _, atraso) => efeito("time", n, rodadas, atraso),
    rival: (n) => efeito("rival", n, 1, 0),
    jogador: (n, rodadas, pid, atraso) => { if (meu()) efeito(pid || j.id, n, rodadas, atraso); },
    evoluir: (n) => { if (j) save.bonusNota[j.id] = (save.bonusNota[j.id] || 0) + n; },
    evoluirReserva: (n) => {
      const titulares = new Set(c.titularesDe(save, save.clube)), res = c.elencoDe(save, save.clube).filter((p) => !titulares.has(p.id));
      const p = res.length ? sorteio(sorte, res) : null; if (p) save.bonusNota[p.id] = (save.bonusNota[p.id] || 0) + n;
    },
    lesao: (n) => { if (meu()) save.lesoes[j.id] = Math.max(save.lesoes[j.id] || 0, n); },
    suspender: (n) => { if (meu()) save.suspensos[j.id] = Math.max(save.suspensos[j.id] || 0, n); },
    curar: () => { if (j) delete save.lesoes[j.id]; },
    curarTodos: (n) => { for (const p of c.elencoDe(save, save.clube)) if (save.lesoes[p.id] && (save.lesoes[p.id] -= n) <= 0) delete save.lesoes[p.id]; },
    salario: (f) => { if (meu()) save.salarios[j.id] = Math.round(c.salarioDe(save, j) * f / 5e3) * 5e3; },
    listar: () => { if (meu() && !save.aVenda.includes(j.id)) save.aVenda.push(j.id); },
    indicar: (pid) => { save.indicacoes[pid] = { desconto: 0.85, ate: R + 4 }; },
    venderFora: (valor) => {
      if (!meu()) return "O jogador já não está no seu elenco.";
      if (!v.comprador) return "O clube desistiu da proposta.";
      if (c.elencoDe(save, save.clube).length <= Mercado.ELENCO_MIN) return "O elenco ficaria pequeno demais: a venda não saiu.";
      return c.vender(save, j.id, v.comprador, valor);
    },
  };
}
const texto = (t, x) => (typeof t === "function" ? t(x) : t);
// um evento do catálogo virando aviso na caixa de entrada (os sem escolha já acontecem aqui)
function criarDoCatalogo(save, c, r, d, j) {
  const v = d.valores ? d.valores(contexto(save, c, r, j)) : {};
  if (d.id === "empresario") v.comprador = contexto(save, c, r, j).clubeGrande();
  const x = contexto(save, c, r, j, v);
  const e = { tipo: "cat", def: d.id, grupo: d.grupo, icone: d.icone, titulo: texto(d.titulo, x), texto: texto(d.texto, x), dados: { jogador: j ? j.id : null, v } };
  if (d.opcoes) {
    e.opcoes = d.opcoes.map(([id, nome]) => ({ id, nome: texto(nome, x) }));
    e.padrao = d.padrao;
  } else e.resultado = d.efeito(x) || "";
  return e;
}

// c: as ajudas do servidor (elencoDe, clubeDe, idsDosClubes, nomeDe, notaDe, titularesDe, mudarMoral)
function gerarEventos(save, c) {
  const r = Motor.sorteDe(`eventos:${save.semente}:${save.temporada}:${save.rodada}`), novos = [];
  const meu = c.elencoDe(save, save.clube), meuClube = c.clubeDe(save, save.clube);
  const id = (e) => `${save.temporada}-${save.rodada}-${e.def || e.tipo}-${novos.length}`;
  const outroClube = (filtro = () => true) => sorteio(r, c.idsDosClubes(save).filter((x) => x !== save.clube && filtro(c.clubeDe(save, x))));
  const add = (e) => novos.push({ id: id(e), rodada: save.rodada, resolvido: !e.opcoes, ...e });

  // propostas pelos seus jogadores: quem está à venda atrai mais; às vezes chega uma por um titular
  const titulares = new Set(c.titularesDe(save, save.clube));
  const alvos = [...save.aVenda.filter((pid) => meu.some((j) => j.id === pid) && r() < 0.45),
    ...(r() < 0.18 ? [sorteio(r, meu.filter((j) => titulares.has(j.id)))?.id] : [])].filter(Boolean);
  if (Mercado.janelaAberta(save.rodada)) for (const pid of [...new Set(alvos)].slice(0, 2)) {
    const j = c.jogadorDe(save, pid); if (!j) continue;
    const comprador = outroClube((cl) => cl.tamanho >= Math.max(1, meuClube.tamanho - 2)), cl = c.clubeDe(save, comprador);
    const valor = Math.round(Mercado.valorDe(c.comNota(save, j)) * (save.aVenda.includes(pid) ? 0.85 + r() * 0.35 : 1.1 + r() * 0.35) / 1e5) * 1e5;
    add({ tipo: "proposta", icone: "maleta", titulo: `Proposta do ${cl.nome}`, texto: `O ${cl.nome} oferece ${dinheiro(valor)} por ${j.nome} (vale ${dinheiro(Mercado.valorDe(c.comNota(save, j)))}).`,
      dados: { jogador: pid, comprador, valor }, opcoes: [{ id: "aceitar", nome: `Vender por ${dinheiro(valor)}` }, { id: "mais", nome: "Pedir 15% a mais" }, { id: "recusar", nome: "Recusar" }], padrao: "recusar" });
  }
  // os eventos do catálogo (carreira-catalogo.js): um quase toda rodada, às vezes dois, sem repetir na temporada
  const x = contexto(save, c, r);
  const vistos = save.eventosVistos || (save.eventosVistos = {});
  const quantos = (r() < 0.8 ? 1 : 0) + (r() < 0.35 ? 1 : 0);
  for (let i = 0; i < quantos; i++) {
    const possiveis = CATALOGO.filter((d) => vistos[d.id] !== save.temporada && !novos.some((n) => n.def === d.id) && (!d.quando || d.quando(x)));
    for (let tentativa = 0; tentativa < 6 && possiveis.length; tentativa++) {
      const d = possiveis.splice(Math.floor(r() * possiveis.length), 1)[0];
      const j = alvoDe(save, c, r, d.alvo); if (d.alvo && !j) continue;
      vistos[d.id] = save.temporada;
      add(criarDoCatalogo(save, c, r, d, j));
      break;
    }
  }
  // os outros clubes também negociam
  if (Mercado.janelaAberta(save.rodada) && r() < 0.4) {
    const de = outroClube(), para = outroClube((cl) => cl.id !== de);
    const elencoDe = c.elencoDe(save, de);
    const j = elencoDe.length > Mercado.ELENCO_MIN + 6 ? sorteio(r, elencoDe.filter((x) => !x.base)) : null;
    if (j && para) {
      const valor = Math.round(Mercado.valorDe(c.comNota(save, j)) * (0.9 + r() * 0.4) / 1e5) * 1e5;
      save.donos[j.id] = para;
      save.transferencias.unshift({ rodada: save.rodada, jogador: j.id, de, para, valor });
      add({ tipo: "ia", icone: "troca", titulo: "Mercado da bola", texto: `${j.nome} troca o ${c.clubeDe(save, de).nome} pelo ${c.clubeDe(save, para).nome} por ${dinheiro(valor)}.` });
    }
  }
  // a torcida reage às sequências
  const ultimos = c.ultimosResultados(save, 3);
  if (ultimos.length === 3 && ultimos.every((x) => x === "D")) {
    c.mudarMoral(save, -5);
    add({ tipo: "protesto", icone: "alerta", titulo: "Protesto no CT", texto: "Três derrotas seguidas: a torcida foi ao CT cobrar o elenco. A moral caiu." });
  }
  if (ultimos.length === 3 && ultimos.every((x) => x === "V")) {
    const extra = meuClube.tamanho * 3e5;
    c.mudarMoral(save, 4); c.movimentar(save, "Bilheteria extra (festa da torcida)", extra);
    add({ tipo: "festa", icone: "palmas", titulo: "A torcida abraçou o time", texto: `Três vitórias seguidas: estádio lotado e ${dinheiro(extra)} a mais na bilheteria.` });
  }
  return novos;
}

// aplica a resposta de um evento (ou a padrão). Devolve o texto do que aconteceu.
function responder(save, e, opcao, c) {
  const d = e.dados || {}, j = d.jogador ? c.jogadorDe(save, d.jogador) : null;
  e.resolvido = true; e.resposta = opcao;
  const def = e.def && POR_ID[e.def];
  if (def) {
    const op = def.opcoes.find((o) => o[0] === opcao) || def.opcoes.find((o) => o[0] === def.padrao);
    const x = contexto(save, c, Motor.sorteDe(`resposta:${save.semente}:${e.id}:${op[0]}`), j, d.v || {});
    return (e.resultado = op[2](x) || "");
  }
  if (e.tipo === "proposta") {
    if (!j || c.donoDe(save, j.id) !== save.clube) return (e.resultado = "O jogador já não está no seu elenco.");
    if (opcao === "mais") {
      const r = Motor.sorteDe(`mais:${save.semente}:${e.id}`);
      if (r() < 0.5) return (e.resultado = c.vender(save, j.id, d.comprador, Math.round(d.valor * 1.15 / 1e5) * 1e5));
      return (e.resultado = `O ${c.clubeDe(save, d.comprador).nome} não subiu a oferta e desistiu.`);
    }
    if (opcao === "aceitar") return (e.resultado = c.vender(save, j.id, d.comprador, d.valor));
    return (e.resultado = "Proposta recusada.");
  }
  if (e.tipo === "aumento") {
    if (opcao === "aceitar" && j) { save.salarios[j.id] = d.novo; c.mudarMoral(save, 3); return (e.resultado = `${j.nome} renovou animado. A moral subiu.`); }
    c.mudarMoral(save, -4); return (e.resultado = "O vestiário não gostou da recusa. A moral caiu.");
  }
  if (e.tipo === "patrocinio") {
    if (opcao === "vitoria") { save.bonusVitoria = d.porVitoria; return (e.resultado = `Cada vitória rende ${dinheiro(d.porVitoria)} até o fim da temporada.`); }
    c.movimentar(save, "Patrocínio", d.fixo); return (e.resultado = `${dinheiro(d.fixo)} entraram no caixa.`);
  }
  if (e.tipo === "entrevista") {
    if (opcao === "elogiar") { c.mudarMoral(save, 4); return (e.resultado = "O elenco gostou do carinho. A moral subiu."); }
    if (opcao === "provocar") { c.mudarMoral(save, 6); save.provocado = { rodada: save.rodada, nota: 2 }; return (e.resultado = "O seu time comprou a briga (moral lá em cima), mas o adversário vem mordido no próximo jogo."); }
    return (e.resultado = "Nada de manchete.");
  }
  if (e.tipo === "noitada") {
    if (!j) return (e.resultado = "");
    if (opcao === "afastar") { save.suspensos[j.id] = Math.max(save.suspensos[j.id] || 0, 1); c.mudarMoral(save, 1); return (e.resultado = `${j.nome} fica fora da próxima rodada.`); }
    if (opcao === "passar") { c.mudarMoral(save, -2); return (e.resultado = "O grupo achou injusto com quem treinou. A moral caiu um pouco."); }
    const multa = Math.round(c.salarioDe(save, j) * 0.3 / 1e3) * 1e3;
    c.movimentar(save, `Multa de ${j.nome}`, multa); c.mudarMoral(save, -1);
    return (e.resultado = `Multa de ${dinheiro(multa)} para ${j.nome}.`);
  }
  return (e.resultado = "");
}

module.exports = { gerarEventos, responder, criarDoCatalogo, CATALOGO };
