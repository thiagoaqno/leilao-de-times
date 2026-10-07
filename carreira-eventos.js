// Carreira de Treinador: os eventos entre as rodadas (a "caixa de entrada" do técnico). Proposta por um jogador seu,
// pedido de aumento, lesão no treino, patrocínio, torcida, joia da base, entrevista, noitada, dica do olheiro e as
// transferências entre os outros clubes. Tudo sorteado com a semente da carreira e a rodada: recarregar não muda nada.
// Os que pedem resposta ficam esperando; se você jogar sem responder, vale a opção padrão.
const Motor = require("./public/carreira/motor.js");
const Mercado = require("./public/carreira/mercado.js");

const { dinheiro } = Mercado;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sorteio = (r, lista) => lista[Math.floor(r() * lista.length)];

// c: as ajudas do servidor (elencoDe, clubeDe, idsDosClubes, nomeDe, notaDe, titularesDe, mudarMoral)
function gerarEventos(save, c) {
  const r = Motor.sorteDe(`eventos:${save.semente}:${save.temporada}:${save.rodada}`), novos = [];
  const meu = c.elencoDe(save, save.clube), meuClube = c.clubeDe(save, save.clube);
  const id = (tipo) => `${save.temporada}-${save.rodada}-${tipo}-${novos.length}`;
  const outroClube = (filtro = () => true) => sorteio(r, c.idsDosClubes(save).filter((x) => x !== save.clube && filtro(c.clubeDe(save, x))));
  const add = (e) => novos.push({ id: id(e.tipo), rodada: save.rodada, resolvido: !e.opcoes, ...e });

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
  const dado = r(), segundo = r();
  const tipos = [];
  if (dado < 0.7) tipos.push(sorteio(r, ["aumento", "lesao", "patrocinio", "joia", "entrevista", "noitada", "olheiro", "ia", "ia"]));
  if (segundo < 0.25) tipos.push(sorteio(r, ["entrevista", "olheiro", "ia", "joia"]));
  // a torcida reage às sequências
  const ultimos = c.ultimosResultados(save, 3);
  if (ultimos.length === 3 && ultimos.every((x) => x === "D")) tipos.push("protesto");
  if (ultimos.length === 3 && ultimos.every((x) => x === "V")) tipos.push("festa");

  for (const tipo of [...new Set(tipos)]) {
    if (tipo === "aumento") {
      const j = sorteio(r, meu.filter((x) => titulares.has(x.id))); if (!j) continue;
      const atual = c.salarioDe(save, j), novo = Math.round(atual * 1.25 / 5e3) * 5e3;
      add({ tipo, icone: "moeda", titulo: `${j.nome} quer aumento`, texto: `Ele pede ${dinheiro(novo)} por mês (hoje ganha ${dinheiro(atual)}). Recusar deixa o vestiário chateado.`,
        dados: { jogador: j.id, novo }, opcoes: [{ id: "aceitar", nome: "Dar o aumento" }, { id: "recusar", nome: "Recusar" }], padrao: "recusar" });
    } else if (tipo === "lesao") {
      const j = sorteio(r, meu.filter((x) => !save.lesoes[x.id])); if (!j) continue;
      const rodadas = 1 + Math.floor(r() * 3);
      save.lesoes[j.id] = Math.max(save.lesoes[j.id] || 0, rodadas);
      add({ tipo, icone: "alerta", titulo: "Lesão no treino", texto: `${j.nome} sentiu a coxa e fica fora por ${rodadas} rodada${rodadas > 1 ? "s" : ""}.` });
    } else if (tipo === "patrocinio") {
      const fixo = Math.round(meuClube.tamanho * (0.6 + r() * 0.6) * 1e6 / 1e5) * 1e5, porVitoria = Math.round(fixo / 6 / 1e4) * 1e4;
      add({ tipo, icone: "aperto", titulo: "Proposta de patrocínio", texto: "Uma marca quer estampar a manga da camisa até o fim da temporada.",
        dados: { fixo, porVitoria }, opcoes: [{ id: "fixo", nome: `${dinheiro(fixo)} agora` }, { id: "vitoria", nome: `${dinheiro(porVitoria)} por vitória` }], padrao: "fixo" });
    } else if (tipo === "joia") {
      const reservas = meu.filter((x) => !titulares.has(x.id) && c.notaDe(save, x) < 80);
      const j = sorteio(r, reservas); if (!j) continue;
      const ganho = 2 + Math.floor(r() * 2);
      save.bonusNota[j.id] = (save.bonusNota[j.id] || 0) + ganho;
      add({ tipo, icone: "estrela", titulo: "Destaque nos treinos", texto: `${j.nome} está voando no CT: a nota subiu ${ganho} (agora ${c.notaDe(save, j)}).` });
    } else if (tipo === "entrevista") {
      add({ tipo, icone: "microfone", titulo: "Entrevista coletiva", texto: "Os repórteres querem saber o que você acha do momento do time.",
        opcoes: [{ id: "elogiar", nome: "Elogiar o elenco" }, { id: "provocar", nome: "Provocar o próximo adversário" }, { id: "neutro", nome: "Resposta pronta, sem polêmica" }], padrao: "neutro" });
    } else if (tipo === "noitada") {
      const j = sorteio(r, meu); if (!j) continue;
      add({ tipo, icone: "drink", titulo: "Flagra na balada", texto: `${j.nome} apareceu nas redes numa festa na véspera do treino.`,
        dados: { jogador: j.id }, opcoes: [{ id: "multar", nome: "Multar" }, { id: "afastar", nome: "Afastar por uma rodada" }, { id: "passar", nome: "Deixar passar" }], padrao: "multar" });
    } else if (tipo === "olheiro") {
      const candidatos = c.idsDosClubes(save).filter((x) => x !== save.clube).flatMap((cl) => c.elencoDe(save, cl)).filter((j) => c.notaDe(save, j) >= 70 && !j.base);
      const j = sorteio(r, candidatos); if (!j) continue;
      save.indicacoes[j.id] = { desconto: 0.85, ate: save.rodada + 4 };
      add({ tipo, icone: "olho", titulo: "Dica do olheiro", texto: `${j.nome} (${c.notaDe(save, j)}) está insatisfeito no ${c.clubeDe(save, c.donoDe(save, j.id)).nome}. Dá para levar 15% mais barato pelas próximas rodadas.`,
        dados: { jogador: j.id } });
    } else if (tipo === "ia" && Mercado.janelaAberta(save.rodada)) {
      // os outros clubes também negociam: um bom reserva de um clube grande vai para um menor (ou o contrário)
      const de = outroClube(), para = outroClube((cl) => cl.id !== de);
      const j = sorteio(r, c.elencoDe(save, de).filter((x) => c.elencoDe(save, de).length > Mercado.ELENCO_MIN + 6 && !x.base)); if (!j || !para) continue;
      const valor = Math.round(Mercado.valorDe(c.comNota(save, j)) * (0.9 + r() * 0.4) / 1e5) * 1e5;
      save.donos[j.id] = para;
      save.transferencias.unshift({ rodada: save.rodada, jogador: j.id, de, para, valor });
      add({ tipo, icone: "troca", titulo: "Mercado da bola", texto: `${j.nome} troca o ${c.clubeDe(save, de).nome} pelo ${c.clubeDe(save, para).nome} por ${dinheiro(valor)}.` });
    } else if (tipo === "protesto") {
      c.mudarMoral(save, -5);
      add({ tipo, icone: "alerta", titulo: "Protesto no CT", texto: "Três derrotas seguidas: a torcida foi ao CT cobrar o elenco. A moral caiu." });
    } else if (tipo === "festa") {
      const extra = meuClube.tamanho * 3e5;
      c.mudarMoral(save, 4); c.movimentar(save, "Bilheteria extra (festa da torcida)", extra);
      add({ tipo, icone: "palmas", titulo: "A torcida abraçou o time", texto: `Três vitórias seguidas: estádio lotado e ${dinheiro(extra)} a mais na bilheteria.` });
    }
  }
  return novos;
}

// aplica a resposta de um evento (ou a padrão). Devolve o texto do que aconteceu.
function responder(save, e, opcao, c) {
  const d = e.dados || {}, j = d.jogador ? c.jogadorDe(save, d.jogador) : null;
  e.resolvido = true; e.resposta = opcao;
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

module.exports = { gerarEventos, responder };
