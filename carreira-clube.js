// Carreira de Treinador: a gestão do clube e o que ela deixa para o futuro. Contratos e multas, a base com o potencial escondido,
// a estrutura (estádio, CT, departamento médico, olheiros), o vestiário (capitão e dilemas com consequência lá na frente), a
// carreira do técnico (reputação e habilidades), a rivalidade entre os amigos, o legado do clube (hall da fama, camisa
// aposentada, recordes) e os momentos de tensão (confiança da diretoria, ultimato, oferta irrecusável, janela com relógio).
// Tudo mora em `v.gestao`, que é do clube (CAMPOS_CLUBE em carreira.js); só os confrontos entre os técnicos são de todos
// (`save.confrontos`). As contas puras ficam em public/carreira/clube-regras.js, para o navegador mostrar o mesmo preço.
// `v` é o save da carreira solo ou a visão de um clube da sala; `c` são as ajudas do carreira.js (elencoDe, clubeDe...).
const Motor = require("./public/carreira/motor.js");
const Mercado = require("./public/carreira/mercado.js");
const Evolucao = require("./public/carreira/evolucao.js");
const Regras = require("./public/carreira/clube-regras.js");
const Feed = require("./carreira-feed.js");

const { dinheiro } = Mercado;
const { clamp } = Regras;
const sorteio = (r, lista) => lista[Math.floor(r() * lista.length)];
const hash = (s) => Math.floor(Motor.sorteDe(s)() * 1e6);
const arred = (v, passo = 1e5) => Math.round(v / passo) * passo;

// ---------- o que cada clube guarda ----------
function padrao() {
  return {
    contratos: {}, recusou: {}, // { pid: { fim: última temporada, multa: valor, multaId } }
    infra: { estadio: 0, ct: 0, medico: 0, olheiros: 0, base: 0 }, obra: null,
    prospectos: [], blindados: {}, // a base: os garotos que ainda não subiram (com o potencial escondido)
    capitao: null,
    confianca: 70, ultimato: null, recentes: [], jogos: 0, intervencoes: 0,
    reputacao: 10, pontos: 1, habilidades: {},
    depois: [], visto: {}, // as consequências que chegam depois e os dilemas já vistos na temporada
    vales: [], bloqueados: {}, // o vale de campeão (um jogador de até 87 de graça) e os jogadores que chegaram por ele (não podem ser vendidos na temporada)
    legado: { acumulado: {}, hall: {}, camisas: [], marcos: [], recordes: {} },
  };
}
function gestaoDe(v) {
  const base = padrao(), g = v.gestao || (v.gestao = base);
  for (const [k, val] of Object.entries(base)) if (g[k] === undefined) g[k] = val;
  for (const k of ["infra", "legado"]) for (const [k2, val] of Object.entries(base[k])) if (g[k][k2] === undefined) g[k][k2] = val;
  return g;
}
// a gestão de qualquer clube humano (a visão da sala enxerga os outros pela ajuda gestaoDe)
function gestaoDoClube(v, id) {
  if (!id) return null;
  if (typeof v.gestaoDe === "function") return v.gestaoDe(id);
  if (v.humanos && v.humanos[id]) return (v.humanos[id].estado && v.humanos[id].estado.gestao) || null; // o save da sala inteiro
  return id === v.clube ? v.gestao || null : null;
}
const tamanhoDe = (v, c) => (c.clubeDe(v, v.clube) || {}).tamanho || 3;
const marco = (v, tipo, texto) => { const g = gestaoDe(v); g.legado.marcos.push({ ano: v.ano, temporada: v.temporada, tipo, texto }); if (g.legado.marcos.length > 60) g.legado.marcos.shift(); };
const cpuClubes = (v, c) => (v.caixaIA ? Object.keys(v.caixaIA) : c.idsDosClubes(v).filter((id) => id !== v.clube));
const ehGrupo = (v) => typeof v.humanoDe === "function";

// os campos que dependem de quem está no elenco: contratos que faltam, o capitão que saiu
function garantir(v, c) {
  const g = gestaoDe(v), elenco = c.elencoDe(v, v.clube), nos = new Set(elenco.map((j) => j.id));
  for (const j of elenco) if (!g.contratos[j.id]) g.contratos[j.id] = { fim: v.temporada + (hash(`contrato:${v.semente}:${j.id}`) % 3), multa: 0 };
  for (const pid of Object.keys(g.contratos)) if (!nos.has(pid)) { delete g.contratos[pid]; delete g.recusou[pid]; }
  if (g.capitao && !nos.has(g.capitao)) g.capitao = null;
  return g;
}
const anosDe = (v, k) => Math.max(0, k.fim - v.temporada + 1);
// o jogador que acabou de chegar assina três temporadas
function contratar(v, c, pid) { gestaoDe(v).contratos[pid] = { fim: v.temporada + 2, multa: 0 }; }

// ---------- os contratos ----------
function termosDe(v, c, pid, anos, multaId) {
  const g = gestaoDe(v), j = c.jogadorDe(v, pid);
  return Regras.termos({ salario: c.salarioDe(v, j), nota: c.notaDe(v, j), anos, multa: multaId, negociador: g.habilidades.negociador || 0, moral: v.moral, recusou: !!g.recusou[pid] });
}
const multaDe = (v, c, pid, multaId) => (Regras.MULTAS[multaId].mult ? arred(c.valorAtual(v, c.jogadorDe(v, pid)) * Regras.MULTAS[multaId].mult) : 0);
// renova (ou devolve o erro em texto)
function aplicarRenovacao(v, c, pid, anos, multaId) {
  const g = garantir(v, c), j = c.jogadorDe(v, pid);
  if (!j || c.donoDe(v, pid) !== v.clube) return { erro: "Esse jogador não é do seu elenco." };
  if (!Object.hasOwn(Regras.MULTAS, multaId)) multaId = "nenhuma";
  anos = clamp(Math.round(Number(anos)) || 0, 1, 3);
  const k = g.contratos[pid];
  if (k.fim - v.temporada >= 3) return { erro: "O contrato dele já vai longe." };
  const t = termosDe(v, c, pid, anos, multaId);
  if (v.caixa < t.luvas) return { erro: `Faltam ${dinheiro(t.luvas - v.caixa)} para pagar as luvas.` };
  c.movimentar(v, `Luvas de ${j.nome}`, -t.luvas);
  v.salarios[pid] = t.salario;
  k.fim = Math.min(v.temporada + 3, Math.max(k.fim, v.temporada) + anos);
  k.multaId = multaId; k.multa = multaDe(v, c, pid, multaId);
  delete g.recusou[pid];
  return { texto: `${j.nome} renovou por ${anos} ano${anos > 1 ? "s" : ""} (até a temporada ${k.fim}), com salário de ${dinheiro(t.salario)} por mês e luvas de ${dinheiro(t.luvas)}. ${Regras.MULTAS[multaId].nome}.` };
}
// o jogador sai do clube (livre, multa paga ou venda): limpa o que era dele no clube
function tirarDoClube(v, c, pid, para) {
  const g = gestaoDe(v);
  v.donos[pid] = para;
  for (const lista of [v.salarios, v.pedidos, v.compras, v.valores]) delete lista[pid];
  v.aVenda = v.aVenda.filter((x) => x !== pid);
  delete g.contratos[pid]; delete g.recusou[pid];
  if (g.capitao === pid) g.capitao = null;
}
function paraOndeVai(v, c, pid, minTamanho = 1) {
  const r = Motor.sorteDe(`destino:${v.semente}:${v.temporada}:${pid}`);
  const lista = cpuClubes(v, c).filter((id) => (c.clubeDe(v, id) || {}).tamanho >= minTamanho);
  return sorteio(r, lista.length ? lista : cpuClubes(v, c));
}

// ---------- a base ----------
function novosProspectos(v, c, temporada) {
  const g = gestaoDe(v), clube = c.clubeDe(v, v.clube), nivel = g.infra.base, formador = g.habilidades.formador || 0;
  const n = 2 + nivel, lista = [];
  const elenco = c.elencoDe(v, v.clube);
  for (let i = 0; i < n; i++) {
    const r = Motor.sorteDe(`prospecto:${v.semente}:${v.clube}:${temporada}:${i}`);
    const pos = Evolucao.posicaoCarente(elenco.concat(lista), `${v.semente}:${v.clube}:${temporada}:p${i}`);
    const j = Evolucao.criarJovem({ clube, temporada, n: 20 + i, pos, semente: v.semente });
    const nota = clamp(j.nota - 4 + nivel * 2 + formador, 48, 74);
    const joia = r() < 0.12 + nivel * 0.04;
    const pot = clamp(nota + 6 + Math.floor(r() * 14) + nivel * 2 + formador + (joia ? 8 : 0), nota + 2, 93);
    lista.push({ ...j, nota, idade: 16 + Math.floor(r() * 2), pot, desde: temporada });
  }
  g.prospectos.push(...lista);
  // a base tem lugar para poucos: sai quem tem menos potencial
  g.prospectos.sort((a, b) => b.pot - a.pot);
  const fora = g.prospectos.splice(Regras.BASE_MAX);
  return { novos: lista.filter((p) => !fora.includes(p)), fora };
}
function crescerProspectos(v, c) {
  const g = gestaoDe(v), formador = g.habilidades.formador || 0, saiu = [], levados = [];
  for (const p of g.prospectos) {
    p.idade++;
    const r = Motor.sorteDe(`cresce:${v.semente}:${v.temporada}:${p.id}`);
    if (p.idade <= Regras.IDADE_BASE_MAX) p.nota = Math.min(p.pot, p.nota + Math.max(1, Math.round((p.pot - p.nota) * 0.3 + 1 + formador * 0.7 + (r() - 0.5))));
  }
  for (const p of [...g.prospectos]) {
    const levado = p.idade >= 19 && p.pot >= 80 && !g.blindados[p.id] && Motor.sorteDe(`levado:${v.semente}:${v.temporada}:${p.id}`)() < 0.35;
    if (p.idade > Regras.IDADE_BASE_MAX || levado) {
      g.prospectos = g.prospectos.filter((x) => x !== p);
      const indeniza = arred(Mercado.valorDe({ nota: Math.round((p.nota + p.pot) / 2), base: true }) * (levado ? 0.3 : 0.15));
      if (indeniza > 0) c.movimentar(v, levado ? `Indenização da base: ${p.nome}` : `Venda da base: ${p.nome}`, indeniza);
      (levado ? levados : saiu).push({ nome: p.nome, pot: p.pot, valor: indeniza });
    }
  }
  g.blindados = {};
  return { saiu, levados };
}
function promover(v, c, pid) {
  const g = gestaoDe(v), i = g.prospectos.findIndex((p) => p.id === pid);
  if (i < 0) return "Esse garoto não está mais na base.";
  if (c.elencoDe(v, v.clube).length >= Mercado.ELENCO_MAX) return `O elenco já está cheio (${Mercado.ELENCO_MAX}). Venda alguém primeiro.`;
  const { pot, ...jogador } = g.prospectos[i];
  g.prospectos.splice(i, 1);
  (v.jovens || (v.jovens = {}))[jogador.id] = { ...jogador, base: true };
  v.donos[jogador.id] = v.clube;
  g.contratos[jogador.id] = { fim: v.temporada + 2, multa: 0 };
  if (pot >= 82) marco(v, "base", `${jogador.nome} sobe da base com cara de craque (${jogador.pos}, ${jogador.nota}).`);
  Feed.postar(v, { tipo: "base", perfil: v.clube, humor: "bom", arte: { cena: "treino", clube: v.clube, jogador: jogador.id }, texto: `Da base para o profissional: ${jogador.nome} (${jogador.pos}, ${jogador.nota}) é promovido ao time principal.` });
  return { texto: `${jogador.nome} subiu para o profissional (${jogador.pos}, nota ${jogador.nota}).` };
}
function valorProspecto(p) { return arred(Mercado.valorDe({ nota: Math.round((p.nota * 2 + p.pot) / 3), base: true })); }

// ---------- os dilemas: uma decisão hoje, a conta lá na frente ----------
// cada dilema: quando(x) diz se pode acontecer, criar(x) devolve o aviso e responder(x, opcao, dados) o que acontece.
// `x.depois(jogos, efeito)` agenda uma consequência para daqui a N jogos (ela volta como aviso na caixa de entrada).
function contextoDe(v, c, sorte, e = null) {
  const g = gestaoDe(v), T = tamanhoDe(v, c), elenco = c.elencoDe(v, v.clube);
  const titulares = new Set(c.titularesDe(v, v.clube));
  const x = {
    v, c, g, T, sorte, elenco, titulares, din: dinheiro, clube: c.clubeDe(v, v.clube).nome,
    j: (pid) => c.jogadorDe(v, pid),
    moral: (n) => c.mudarMoral(v, n),
    caixa: (nome, valor) => { if (valor) c.movimentar(v, nome, Math.round(valor)); },
    confianca: (n) => { g.confianca = clamp(g.confianca + n, 0, 100); },
    reputacao: (n) => { g.reputacao = clamp(g.reputacao + n, 0, 100); },
    efeito: (alvo, nota, jogos) => (v.efeitos || (v.efeitos = [])).push({ alvo, nota, de: v.rodada, ate: v.rodada + Math.max(1, jogos) - 1 }),
    listar: (pid) => { if (!v.aVenda.includes(pid)) v.aVenda.push(pid); },
    depois: (jogos, ef) => g.depois.push({ jogos: g.jogos + jogos, temporada: v.temporada, ...ef }),
    jogosDe: (pid) => ((v.desempenho || {})[pid] || [0])[0],
    sorte: (p) => sorte() < p,
  };
  return x;
}
const titularesNomes = (x, ids) => ids.map((id) => x.j(id).nome).join(", ");

const DILEMAS = [
  { id: "panelinha", icone: "alerta",
    quando: (x) => !!x.grupo,
    prepara: (x) => {
      const pais = x.c.clubeDe(x.v, x.v.clube).pais || "Brasil", cont = {};
      for (const j of x.elenco) if (j.nat && j.nat !== pais) (cont[j.nat] ||= []).push(j.id);
      const [nat, ids] = Object.entries(cont).sort((a, b) => b[1].length - a[1].length)[0] || [];
      x.grupo = ids && ids.length >= 4 ? { nat, ids } : null;
    },
    criar: (x) => ({ titulo: `A panelinha de ${x.grupo.nat}`, texto: `${x.grupo.ids.length} jogadores de ${x.grupo.nat} (${titularesNomes(x, x.grupo.ids.slice(0, 4))}) só andam juntos. O resto do elenco já percebeu.`,
      dados: { ids: x.grupo.ids, nat: x.grupo.nat }, opcoes: [["churrasco", "Churrasco de integração (R$ 0,3 mi × porte)"], ["ignorar", "Deixar como está"], ["separar", "Dispersar o grupo (o mais velho vai à venda)"]], padrao: "ignorar" }),
    responder: (x, op, d) => {
      if (op === "churrasco") { x.caixa("Churrasco de integração", -3e5 * x.T); x.moral(3); x.depois(6, { titulo: "O churrasco colou", texto: `A turma de ${d.nat} virou parte do grupo: o vestiário está unido.`, ef: { moral: 4 } }); return "O grupo se misturou. Os efeitos aparecem nas próximas semanas."; }
      if (op === "separar") {
        const velho = d.ids.map((id) => x.j(id)).filter(Boolean).sort((a, b) => Evolucao.idadeNa(b, x.v.temporada) - Evolucao.idadeNa(a, x.v.temporada))[0];
        if (velho) x.listar(velho.id);
        x.moral(-2); x.depois(4, { titulo: "O grupo se acertou", texto: "Sem a panelinha, o vestiário voltou a conversar.", ef: { moral: 3 } });
        return velho ? `${velho.nome} foi para a lista de venda. O clima esfria.` : "O grupo se dispersou.";
      }
      x.moral(-1);
      x.depois(5, { titulo: "A panelinha rachou o vestiário", texto: `Os estrangeiros viraram um bloco à parte e o resto do grupo não aguentou: briga no treino.`, ef: { moral: -6, confianca: -3 } });
      return "Você deixou como está. Isso costuma voltar.";
    } },
  { id: "reserva-pede-vaga", icone: "cartas",
    quando: (x) => !!x.alvo,
    prepara: (x) => { x.alvo = x.elenco.filter((j) => !x.titulares.has(j.id) && x.c.notaDe(x.v, j) >= 70 && Evolucao.idadeNa(j, x.v.temporada) <= 25 && !x.c.lesionado(x.v, j.id)).sort((a, b) => x.c.notaDe(x.v, b) - x.c.notaDe(x.v, a))[0] || null; },
    criar: (x) => ({ titulo: `${x.alvo.nome} quer jogar`, texto: `${x.alvo.nome} (${x.alvo.pos}, ${x.c.notaDe(x.v, x.alvo)}) está no banco e o empresário já ligou. Ele pede uma promessa de minutos.`,
      dados: { jogador: x.alvo.id, base: x.jogosDe(x.alvo.id) }, opcoes: [["prometer", "Prometer 3 jogos nas próximas 6 rodadas"], ["esperar", "Dizer que ele precisa esperar"], ["vender", "Pôr à venda"]], padrao: "esperar" }),
    responder: (x, op, d) => {
      const j = x.j(d.jogador);
      if (op === "vender") { x.listar(d.jogador); x.moral(-1); return `${j.nome} foi para a lista de venda.`; }
      if (op === "prometer") { x.depois(6, { titulo: `A promessa a ${j.nome}`, checar: { pid: d.jogador, base: d.base, min: 3 },
        ok: { texto: `Você cumpriu: ${j.nome} jogou e agradece. O vestiário viu que a palavra vale.`, ef: { moral: 3, evoluir: [d.jogador, 1] } },
        falha: { texto: `Você prometeu minutos a ${j.nome} e não cumpriu. Ele perdeu a confiança em você.`, ef: { moral: -5, confianca: -3, listar: d.jogador } } }); return "Promessa feita. Daqui a 6 jogos alguém vai conferir se você cumpriu."; }
      x.depois(6, { titulo: `${j.nome} estagnou`, checar: { pid: d.jogador, base: d.base, min: 2 },
        ok: { texto: `${j.nome} ganhou alguns minutos mesmo assim e segue na batalha.`, ef: { moral: 1 } },
        falha: { texto: `Sem jogar, ${j.nome} parou no tempo e quer sair.`, ef: { evoluir: [d.jogador, -1], listar: d.jogador } } });
      return "Ele engoliu a seco. Veremos como isso se comporta.";
    } },
  { id: "patrocinio-polemico", icone: "maleta",
    quando: (x) => x.v.rodada >= 2,
    criar: (x) => ({ titulo: "Patrocínio polêmico", texto: `Uma casa de apostas oferece ${dinheiro(Math.round(x.T * 1.8e6))} para estampar a camisa. A torcida organizada já avisou que odeia a ideia.`,
      dados: { valor: Math.round(x.T * 1.8e6) }, opcoes: [["aceitar", "Aceitar o dinheiro"], ["recusar", "Recusar e manter a camisa limpa"]], padrao: "recusar" }),
    responder: (x, op, d) => {
      if (op === "aceitar") { x.caixa("Patrocínio polêmico", d.valor); x.depois(8, { titulo: "A torcida não perdoou o patrocínio", texto: "A camisa nova virou piada nas arquibancadas: protesto e vaias.", ef: { moral: -5, reputacao: -3 } }); return `${dinheiro(d.valor)} entraram no caixa. A conta da torcida vem depois.`; }
      x.reputacao(2); x.moral(1); x.confianca(-2); return "Camisa limpa. A torcida gostou; a diretoria, nem tanto.";
    } },
  { id: "racha-capitao", icone: "explosao",
    quando: (x) => !!x.par,
    prepara: (x) => {
      const cap = x.g.capitao && x.j(x.g.capitao); if (!cap) return;
      const astro = x.elenco.filter((j) => j.id !== cap.id && x.titulares.has(j.id) && x.c.notaDe(x.v, j) >= x.c.notaDe(x.v, cap) + 4).sort((a, b) => x.c.notaDe(x.v, b) - x.c.notaDe(x.v, a))[0];
      x.par = astro ? { cap, astro } : null;
    },
    criar: (x) => ({ titulo: `${x.par.cap.nome} contra ${x.par.astro.nome}`, texto: `O capitão ${x.par.cap.nome} reclamou da vaidade de ${x.par.astro.nome} no vestiário. Os dois querem que você tome um lado.`,
      dados: { cap: x.par.cap.id, astro: x.par.astro.id }, opcoes: [["capitao", "Apoiar o capitão"], ["astro", "Apoiar o craque"], ["mediar", "Chamar os dois para conversar"]], padrao: "mediar" }),
    responder: (x, op, d) => {
      const cap = x.j(d.cap), astro = x.j(d.astro);
      if (op === "capitao") { x.moral(2); x.efeito(d.astro, -2, 3); x.depois(6, { titulo: "O craque ainda está de cara feia", texto: `${astro.nome} cumpriu o castigo, mas o vestiário respeita mais a braçadeira.`, ef: { moral: 2 } }); return `${cap.nome} saiu fortalecido; ${astro.nome} vai render menos por 3 jogos.`; }
      if (op === "astro") { x.moral(-1); x.efeito(d.astro, 2, 3); x.depois(5, { titulo: "O capitão perdeu a voz", texto: `${cap.nome} se calou e o grupo ficou sem líder no vestiário.`, ef: { moral: -4 } }); return `${astro.nome} ganhou moral (+2 por 3 jogos), mas o capitão engoliu.`; }
      if (x.sorte(0.6)) { x.moral(2); return "A conversa deu certo: os dois apertaram as mãos."; }
      x.moral(-1); return "Conversaram, mas ficou um clima estranho.";
    } },
  { id: "convite-clube-grande", icone: "coroa",
    quando: (x) => x.g.reputacao >= 40 && x.v.rodada >= 8 && !x.g.visto.conviteTemporada,
    criar: (x) => { const gr = x.clubeGrande(); return { titulo: `${gr.nome} quer você`, texto: `O ${gr.nome} procurou o seu empresário: querem você como técnico na próxima temporada. A notícia vazou e a diretoria exige uma posição.`,
      dados: { clube: gr.nome }, opcoes: [["recusar", "Recusar publicamente e ficar"], ["negociar", "Usar o convite para pedir mais verba"]], padrao: "recusar" }; },
    responder: (x, op, d) => {
      if (op === "recusar") { x.reputacao(3); x.confianca(10); x.moral(2); return `Você disse não ao ${d.clube} e a diretoria abraçou o projeto. Confiança lá em cima.`; }
      if (x.sorte(0.6)) { const verba = Math.round(x.T * 2e6); x.caixa("Verba extra da diretoria", verba); x.confianca(5); x.reputacao(2); return `A diretoria cedeu: ${dinheiro(verba)} a mais para reforçar o time.`; }
      x.confianca(-12); x.moral(-3); return "A diretoria entendeu como chantagem. A confiança em você caiu.";
    } },
  { id: "renovacao-pedida", icone: "moeda",
    quando: (x) => !!x.alvo && x.v.rodada >= 6,
    prepara: (x) => { x.alvo = x.elenco.filter((j) => x.titulares.has(j.id) && x.g.contratos[j.id] && x.g.contratos[j.id].fim <= x.v.temporada && x.c.notaDe(x.v, j) >= 72).sort((a, b) => x.c.notaDe(x.v, b) - x.c.notaDe(x.v, a))[0] || null; },
    criar: (x) => ({ titulo: `${x.alvo.nome} cobra a renovação`, texto: `O contrato de ${x.alvo.nome} acaba nesta temporada. Ele avisou que, sem renovar agora, vai embora de graça no fim do ano.`,
      dados: { jogador: x.alvo.id }, opcoes: [["renovar", "Renovar por 2 anos (multa baixa)"], ["esperar", "Deixar para depois"], ["vender", "Pôr à venda"]], padrao: "esperar" }),
    responder: (x, op, d) => {
      const j = x.j(d.jogador); if (!j || x.c.donoDe(x.v, d.jogador) !== x.v.clube) return "O jogador já não está no seu elenco.";
      if (op === "renovar") { const r = aplicarRenovacao(x.v, x.c, d.jogador, 2, "baixa"); return r.erro ? `Não deu: ${r.erro}` : r.texto; }
      if (op === "vender") { x.listar(d.jogador); return `${j.nome} foi para a lista de venda.`; }
      x.g.recusou[d.jogador] = true; x.moral(-2);
      return `${j.nome} ficou irritado: renovar vai custar mais caro daqui para a frente.`;
    } },
  { id: "oferta-irrecusavel", icone: "maleta",
    quando: (x) => !!x.alvo && x.restam === 1,
    prepara: (x) => { x.alvo = x.elenco.filter((j) => x.c.donoDe(x.v, j.id) === x.v.clube && x.g.capitao !== j.id && x.c.notaDe(x.v, j) >= 74).sort((a, b) => x.c.valorAtual(x.v, b) - x.c.valorAtual(x.v, a))[0] || null; },
    criar: (x) => { const gr = x.clubeGrande(), valor = arred(x.c.valorAtual(x.v, x.alvo) * 1.55); return { titulo: `Último dia: ${dinheiro(valor)} por ${x.alvo.nome}`, texto: `O ${gr.nome} faz uma oferta irrecusável por ${x.alvo.nome} e só vale até a janela fechar (depois do próximo jogo). ${x.alvo.nome} quer saber a sua decisão.`,
      dados: { jogador: x.alvo.id, comprador: gr.id, valor }, opcoes: [["aceitar", `Vender por ${dinheiro(valor)}`], ["recusar", "Segurar o jogador"]], padrao: "recusar" }; },
    responder: (x, op, d) => {
      const j = x.j(d.jogador); if (!j || x.c.donoDe(x.v, d.jogador) !== x.v.clube) return "O jogador já não está no seu elenco.";
      if (op === "aceitar") {
        if (x.elenco.length <= Mercado.ELENCO_MIN) return "O elenco ficaria pequeno demais: a venda não saiu.";
        x.confianca(4); return x.c.vender(x.v, d.jogador, d.comprador, d.valor);
      }
      x.efeito(d.jogador, -2, 3); x.moral(1); x.reputacao(1);
      return `${j.nome} ficou chateado por não sair (rende menos por 3 jogos), mas o grupo viu que você segura o craque.`;
    } },
  { id: "base-joia", icone: "olho",
    quando: (x) => !!x.alvo,
    prepara: (x) => { x.alvo = x.g.prospectos.filter((p) => p.pot >= 80 && p.idade >= 18).sort((a, b) => b.pot - a.pot)[0] || null; },
    criar: (x) => ({ titulo: `Cobiçam ${x.alvo.nome}`, texto: `Um clube rico sondou ${x.alvo.nome} (${x.alvo.pos}, ${x.alvo.idade} anos), a joia da sua base. Sem contrato profissional, ele pode sair no fim do ano.`,
      dados: { jogador: x.alvo.id, custo: Math.round(x.T * 5e5) }, opcoes: [["promover", "Subir agora para o time principal"], ["segurar", `Blindar na base (${dinheiro(Math.round(x.T * 5e5))})`], ["deixar", "Deixar o clube levar (com indenização)"]], padrao: "segurar" }),
    responder: (x, op, d) => {
      const p = x.g.prospectos.find((q) => q.id === d.jogador); if (!p) return "O garoto já não está na base.";
      if (op === "promover") { const r = promover(x.v, x.c, d.jogador); return typeof r === "string" ? r : r.texto; }
      if (op === "segurar") { x.caixa(`Blindagem de ${p.nome}`, -d.custo); x.g.blindados[p.id] = true; x.confianca(1); return `${p.nome} assinou o pré-contrato: nenhum clube leva ele este ano.`; }
      const v = valorProspecto(p); x.g.prospectos = x.g.prospectos.filter((q) => q !== p); x.caixa(`Venda da base: ${p.nome}`, v); return `${p.nome} foi embora. A indenização foi de ${dinheiro(v)}.`;
    } },
];
const POR_ID = Object.fromEntries(DILEMAS.map((d) => [d.id, d]));

// o aviso novo na caixa de entrada (o dilema que o sorteio escolheu)
function criarDilema(v, c, def, r) {
  const x = contextoDe(v, c, r);
  x.restam = Regras.restamNaJanela(c.rodadaDaJanela(v));
  x.clubeGrande = () => { const lista = c.idsDosClubes(v).filter((id) => id !== v.clube && c.clubeDe(v, id).tamanho >= 4); const id = sorteio(r, lista.length ? lista : cpuClubes(v, c)); return { id, nome: c.clubeDe(v, id).nome }; };
  x.grupo = x.alvo = x.par = null;
  if (def.prepara) def.prepara(x);
  if (!def.quando(x)) return null;
  const e = def.criar(x);
  return { id: `${v.temporada}-${v.rodada}-clube-${def.id}`, rodada: v.rodada, tipo: "clube", def: def.id, icone: def.icone, titulo: e.titulo, texto: e.texto, dados: e.dados,
    opcoes: e.opcoes.map(([id, nome]) => ({ id, nome })), padrao: e.padrao, resolvido: false };
}
// a resposta (ou a padrão): devolve o texto do que aconteceu
function responder(v, c, e, opcao) {
  const def = POR_ID[e.def]; if (!def) return (e.resultado = "");
  const x = contextoDe(v, c, Motor.sorteDe(`clube-resposta:${v.semente}:${e.id}:${opcao}`));
  x.restam = null; x.clubeGrande = () => ({ id: (e.dados || {}).comprador, nome: "clube grande" });
  garantir(v, c);
  return (e.resultado = def.responder(x, opcao, e.dados || {}) || "");
}

// ---------- o que chega depois ----------
function aplicarEfeito(v, c, ef) {
  const x = contextoDe(v, c, Motor.sorteDe(`efeito:${v.semente}:${v.temporada}:${v.rodada}`));
  if (ef.moral) x.moral(ef.moral);
  if (ef.confianca) x.confianca(ef.confianca);
  if (ef.reputacao) x.reputacao(ef.reputacao);
  if (ef.caixa) x.caixa(ef.caixa[0], ef.caixa[1]);
  if (ef.evoluir) { const [pid, n] = ef.evoluir; if (c.donoDe(v, pid) === v.clube) v.bonusNota[pid] = (v.bonusNota[pid] || 0) + n; }
  if (ef.listar && c.donoDe(v, ef.listar) === v.clube) x.listar(ef.listar);
}
function chegouDepois(v, c) {
  const g = gestaoDe(v), vencidos = g.depois.filter((d) => d.jogos <= g.jogos);
  if (!vencidos.length) return;
  g.depois = g.depois.filter((d) => d.jogos > g.jogos);
  for (const d of vencidos) {
    let ef = d.ef, texto = d.texto;
    if (d.checar) { const jogou = ((v.desempenho || {})[d.checar.pid] || [0])[0] - (d.temporada === v.temporada ? d.checar.base : 0); const lado = jogou >= d.checar.min ? d.ok : d.falha; ef = lado.ef; texto = lado.texto; }
    aplicarEfeito(v, c, ef || {});
    const sinal = ef && ((ef.moral || 0) + (ef.confianca || 0) + (ef.reputacao || 0) >= 0);
    c.avisar(v, { tipo: "clube-volta", icone: sinal ? "palmas" : "alerta", titulo: d.titulo, texto: `${texto} (consequência de uma decisão sua)` });
  }
}

// ---------- a confiança da diretoria, o capitão e os momentos de tensão ----------
function demitir(v, c) {
  const g = gestaoDe(v);
  if (!ehGrupo(v)) { v.demitido = { ano: v.ano, temporada: v.temporada, rodada: v.rodada }; marco(v, "demissao", `${v.tecnico.nome} é demitido da temporada ${v.temporada}.`); return `A diretoria perdeu a paciência: você foi demitido.`; }
  // na sala ninguém sai do jogo: a diretoria intervém, vende o jogador mais bem pago (o capitão fica) e a pressão recomeça mais baixa
  g.intervencoes++;
  const alvo = c.elencoDe(v, v.clube).filter((j) => g.capitao !== j.id).sort((a, b) => c.salarioDe(v, b) - c.salarioDe(v, a))[0];
  let texto = "A diretoria interveio: a confiança acabou.";
  if (alvo && c.elencoDe(v, v.clube).length > Mercado.ELENCO_MIN) { const para = paraOndeVai(v, c, alvo.id); texto = `${texto} ${c.vender(v, alvo.id, para, Math.round(c.valorAtual(v, alvo) * 0.9 / 1e5) * 1e5)}`; }
  g.confianca = 40; g.ultimato = null; g.reputacao = clamp(g.reputacao - 8, 0, 100); c.mudarMoral(v, -10);
  marco(v, "intervencao", "A diretoria interveio e vendeu um jogador sem consultar o técnico.");
  return texto;
}
function pontosDe(lista) { return lista.reduce((s, r) => s + (r === "V" ? 3 : r === "E" ? 1 : 0), 0); }

// depois do jogo: as contas da confiança, do capitão, do clássico e o que chega depois; devolve os avisos que pedem resposta
function aposJogo(v, c, { nos, eles, emCasa, adv }) {
  if (v.demitido) return [];
  const g = garantir(v, c), res = nos > eles ? "V" : nos === eles ? "E" : "D", novos = [];
  g.jogos++; g.recentes.push(res); if (g.recentes.length > 8) g.recentes.shift();
  // a confiança: a diretoria olha o resultado (derrota feia pesa mais) e cobra menos de quem tem o elenco mais fraco (a meta da temporada)
  const peso = ({ titulo: 1.15, continental: 1, meio: 0.8, rebaixamento: 0.55 })[(v.meta || {}).nivel] || 1;
  g.confianca = clamp(g.confianca + (res === "V" ? 3 : res === "E" ? (emCasa ? -1 : 0) : -Math.round((eles - nos >= 3 ? 7 : 4) * peso)), 0, 100);
  // o capitão segura o vestiário (e a falta dele pesa)
  const cap = g.capitao && c.jogadorDe(v, g.capitao);
  if (cap) {
    const presente = !c.lesionado(v, cap.id) && !v.suspensos[cap.id], lid = Regras.lideranca({ idade: Evolucao.idadeNa(cap, v.temporada), nota: c.notaDe(v, cap), anosClube: 1 });
    if (res === "D") c.mudarMoral(v, presente ? (lid >= 6 ? 3 : 2) : -2);
    else if (res === "V") c.mudarMoral(v, presente ? 1 : 0);
  }
  if (res === "D") c.mudarMoral(v, g.habilidades.motivador || 0);
  // o clássico (o rival da liga ou outro técnico da sala)
  if (adv && classicoCom(v, c, adv)) {
    const bonus = res === "V" ? 3 : res === "D" ? -3 : 0;
    c.mudarMoral(v, bonus);
    if (res === "D") g.confianca = clamp(g.confianca - 2, 0, 100);
    if (res === "V") { g.confianca = clamp(g.confianca + 2, 0, 100); g.reputacao = clamp(g.reputacao + 0.5, 0, 100); }
    if (res !== "E") Feed.postar(v, { tipo: res === "V" ? "vitoria" : "derrota", perfil: res === "V" ? v.clube : adv, humor: res === "V" ? "bom" : "ruim", arte: { cena: res === "V" ? "festa" : "derrota", clube: res === "V" ? v.clube : adv, casa: emCasa ? v.clube : adv, fora: emCasa ? adv : v.clube, placar: emCasa ? [nos, eles] : [eles, nos] },
      texto: res === "V" ? `CLÁSSICO! O ${c.clubeDe(v, v.clube).nome} vence o ${c.clubeDe(v, adv).nome} por ${nos} × ${eles} e a torcida faz a festa.` : `Clássico amargo: o ${c.clubeDe(v, v.clube).nome} perde para o ${c.clubeDe(v, adv).nome} por ${nos} × ${eles}.` });
  }
  const gm = (g.legado.recordes.goleada);
  if (nos - eles >= 3 && (!gm || nos - eles > gm.saldo)) g.legado.recordes.goleada = { saldo: nos - eles, placar: [nos, eles], adv, ano: v.ano, emCasa };
  chegouDepois(v, c);
  // o ultimato: confiança baixa dá um prazo de 4 jogos para 5 pontos
  if (g.ultimato && g.jogos >= g.ultimato.ate) {
    const pontos = pontosDe(g.recentes.slice(-4));
    if (pontos >= g.ultimato.min) {
      g.confianca = clamp(g.confianca + 25, 0, 100); c.mudarMoral(v, 5); g.ultimato = null;
      c.avisar(v, { tipo: "diretoria", icone: "palmas", titulo: "Ultimato cumprido", texto: `${pontos} pontos nos últimos 4 jogos. A diretoria recuou: a confiança voltou.` });
    } else { const texto = demitir(v, c); g.ultimato = null; c.avisar(v, { tipo: "diretoria", icone: "alerta", titulo: ehGrupo(v) ? "A diretoria interveio" : "Você foi demitido", texto: `Só ${pontos} pontos nos 4 jogos do ultimato. ${texto}` }); }
  } else if (!g.ultimato && g.confianca < 30 && !v.demitido) {
    g.ultimato = { ate: g.jogos + 4, min: 5 };
    c.avisar(v, { tipo: "diretoria", icone: "alerta", titulo: "Ultimato da diretoria", texto: "A confiança acabou: a diretoria dá 4 jogos para você somar pelo menos 5 pontos (uma vitória e um empate). Sem isso, " + (ehGrupo(v) ? "ela intervém no elenco." : "você é demitido.") });
  }
  if (g.confianca <= 0 && !v.demitido) { const texto = demitir(v, c); c.avisar(v, { tipo: "diretoria", icone: "alerta", titulo: ehGrupo(v) ? "A diretoria interveio" : "Você foi demitido", texto }); }
  // um dilema por rodada, no máximo (e só de vez em quando); os que têm hora marcada saem sempre
  if (!v.demitido && v.partida == null) {
    const r = Motor.sorteDe(`dilema:${v.semente}:${v.temporada}:${v.rodada}:${v.clube}`), restam = Regras.restamNaJanela(c.rodadaDaJanela(v));
    const prioridade = restam === 1 && !g.visto[`irrecusavel${v.temporada}-${Math.floor(c.rodadaDaJanela(v) / 8)}`] ? "oferta-irrecusavel" : null;
    const livres = DILEMAS.filter((d) => g.visto[d.id] !== v.temporada && d.id !== "oferta-irrecusavel" && !(g.depois.length >= 3));
    const pendente = v.caixaEntrada.some((e) => e.tipo === "clube" && !e.resolvido); // um dilema de cada vez
    const tentar = prioridade ? [POR_ID[prioridade]] : pendente ? [] : r() < 0.2 ? livres.sort(() => r() - 0.5) : [];
    for (const def of tentar) {
      const e = criarDilema(v, c, def, r); if (!e) continue;
      g.visto[def.id] = v.temporada; if (prioridade) g.visto[`irrecusavel${v.temporada}-${Math.floor(c.rodadaDaJanela(v) / 8)}`] = true;
      if (def.id === "convite-clube-grande") g.visto.conviteTemporada = v.temporada;
      novos.push(e); break;
    }
  }
  return novos;
}
const classicoCom = (v, c, adv) => rivaisDe(v, c).includes(adv);

// ---------- os rivais ----------
// o rival de cada técnico: os outros técnicos da sala e o clube da sua liga mais parecido (do mesmo país, de tamanho parecido)
function rivalDaLiga(v, c, clube = v.clube) {
  const meu = c.clubeDe(v, clube), liga = c.ligaDoClube(clube);
  const lista = c.idsDosClubes(v).filter((id) => id !== clube && c.ligaDoClube(id) === liga && Math.abs((c.clubeDe(v, id).tamanho || 0) - (meu.tamanho || 0)) <= 1);
  const base = lista.length ? lista : c.idsDosClubes(v).filter((id) => id !== clube && c.ligaDoClube(id) === liga);
  return base.length ? [...base].sort((a, b) => hash(`rival:${clube}:${a}`) - hash(`rival:${clube}:${b}`))[0] : null;
}
function rivaisDe(v, c) {
  const lista = v.humanosLista ? v.humanosLista().map((h) => h.clube).filter((id) => id !== v.clube) : [];
  const cpu = rivalDaLiga(v, c);
  if (cpu && !lista.includes(cpu)) lista.push(cpu);
  return lista;
}
// o placar de cada dupla de técnicos (global da sala)
const chaveDupla = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
function registrarConfronto(save, j, r) {
  if (!save.confrontos) save.confrontos = {};
  const [a, b] = j.casa < j.fora ? [j.casa, j.fora] : [j.fora, j.casa], k = chaveDupla(j.casa, j.fora);
  const o = save.confrontos[k] || (save.confrontos[k] = { a, b, va: 0, vb: 0, e: 0, ga: 0, gb: 0, ultimos: [] });
  const [gc, gf] = r.placar, pen = r.penaltis;
  const venceuCasa = gc > gf || (gc === gf && pen && pen[0] > pen[1]), venceuFora = gf > gc || (gc === gf && pen && pen[1] > pen[0]);
  const ganha = (id) => (id === a ? o.va++ : o.vb++);
  if (venceuCasa) ganha(j.casa); else if (venceuFora) ganha(j.fora); else o.e++;
  o.ga += j.casa === a ? gc : gf; o.gb += j.casa === a ? gf : gc;
  o.ultimos.unshift({ temporada: save.temporada, competicao: j.competicao || "", casa: j.casa, fora: j.fora, placar: [gc, gf], ...(pen && { penaltis: [...pen] }) });
  o.ultimos.length = Math.min(o.ultimos.length, 6);
}
// a provocação automática: o vencedor do duelo entre técnicos da sala faz um post
function provocacao(v, c, { adv, nos, eles }) {
  if (!ehGrupo(v) || !v.humanoDe(adv) || nos === eles) return;
  const o = (v.confrontos || {})[chaveDupla(v.clube, adv)]; if (!o) return;
  const venci = nos > eles, meus = v.clube === o.a ? o.va : o.vb, deles = v.clube === o.a ? o.vb : o.va;
  const eu = c.clubeDe(v, v.clube).nome, ele = c.clubeDe(v, adv).nome;
  const frases = venci ? [`${eu} ${nos} × ${eles} ${ele}. Manda o resumo pro grupo, ${ele}.`, `Placar no confronto direto: ${meus} × ${deles}. Quem manda aqui?`, `O ${eu} passou por cima do ${ele} (${nos} × ${eles}).`]
    : [`O ${ele} venceu o ${eu} por ${eles} × ${nos}. Respeita o ${ele}!`, `Confronto direto agora é ${deles} × ${meus} para o ${ele}.`, `${ele} ${eles} × ${nos} ${eu}. Foi só o começo.`];
  const r = Motor.sorteDe(`prov:${v.semente}:${v.temporada}:${v.rodada}:${v.clube}`);
  const g = gestaoDe(v);
  const fregues = meus >= 3 && meus >= deles + 2;
  Feed.postar(v, { tipo: venci ? "vitoria" : "derrota", perfil: venci ? v.clube : adv, humor: venci ? "bom" : "ruim", arte: { cena: venci ? "festa" : "derrota", clube: venci ? v.clube : adv, casa: v.clube, fora: adv, placar: [nos, eles] },
    texto: `${sorteio(r, frases)}${fregues ? ` (${ele} virou freguês: ${meus} vitórias a ${deles})` : ""}` });
  if (fregues && !g.legado.marcos.some((m) => m.tipo === "fregues" && m.texto.includes(ele))) marco(v, "fregues", `O ${ele} virou freguês do ${eu}.`);
}
function confrontosDe(v, c) {
  if (!ehGrupo(v)) return [];
  return v.humanosLista().filter((h) => h.clube !== v.clube).map((h) => {
    const o = (v.confrontos || {})[chaveDupla(v.clube, h.clube)] || { a: v.clube, b: h.clube, va: 0, vb: 0, e: 0, ga: 0, gb: 0, ultimos: [] };
    const eu = v.clube === o.a;
    const meus = eu ? o.va : o.vb, deles = eu ? o.vb : o.va;
    return { clube: h.clube, tecnico: (h.tecnico && h.tecnico.nome) || (typeof h.tecnico === "string" ? h.tecnico : h.clube), jogos: meus + deles + o.e, v: meus, d: deles, e: o.e, gols: [eu ? o.ga : o.gb, eu ? o.gb : o.ga],
      fregues: meus >= 3 && meus >= deles + 2 ? "voce" : deles >= 3 && deles >= meus + 2 ? "ele" : null,
      ultimos: o.ultimos.map((u) => ({ ...u })) };
  });
}

// ---------- o legado ----------
function fechouTemporada(v, c, { pos, titulos, vices, cumpriuMeta, posMeta }) {
  const g = garantir(v, c), L = g.legado, T = v.temporada;
  // os números de cada jogador do elenco na temporada; o Hall da Fama é raro: pelo menos 60 pontos (gol vale 1, 3 jogos valem 1, título vale 8) em duas
  // temporadas ou mais (85 numa só) e no máximo dois novos por temporada
  const candidatos = [];
  for (const j of c.elencoDe(v, v.clube)) {
    const a = L.acumulado[j.id] || (L.acumulado[j.id] = { nome: j.nome, pos: j.pos, jogos: 0, gols: 0, titulos: 0, temporadas: 0, desde: T });
    a.jogos += ((v.desempenho || {})[j.id] || [0])[0]; a.gols += (v.gols || {})[j.id] || 0; a.titulos += titulos.length ? 1 : 0; a.temporadas++; a.nome = j.nome; a.pos = j.pos; a.nota = c.notaDe(v, j);
    const pontos = a.gols + a.jogos / 3 + a.titulos * 8;
    if (!L.hall[j.id] && ((pontos >= 60 && a.temporadas >= 2) || pontos >= 85)) candidatos.push([pontos, j, a]);
  }
  for (const [, j, a] of candidatos.sort((x, y) => y[0] - x[0]).slice(0, 2)) {
    L.hall[j.id] = { nome: j.nome, pos: j.pos, ano: v.ano, jogos: a.jogos, gols: a.gols, titulos: a.titulos, temporadas: a.temporadas };
    marco(v, "hall", `${j.nome} entra para o Hall da Fama do clube (${a.gols} gols, ${a.titulos} título${a.titulos === 1 ? "" : "s"}).`);
    Feed.postar(v, { tipo: "hall", perfil: v.clube, humor: "bom", arte: { cena: "trofeu", clube: v.clube, jogador: j.id }, texto: `${j.nome} entra para o Hall da Fama do ${c.clubeDe(v, v.clube).nome}: ${a.jogos} jogos, ${a.gols} gols e ${a.titulos} título${a.titulos === 1 ? "" : "s"}. Já pode ter a camisa aposentada!` });
    c.avisar(v, { tipo: "hall", icone: "taca", titulo: `${j.nome} no Hall da Fama`, texto: `Pelos serviços prestados ao clube. Você pode aposentar a camisa dele na tela Clube, em Legado.` });
  }
  // os recordes do clube
  const R = L.recordes, [art] = Object.entries(v.gols || {}).filter(([pid]) => c.donoDe(v, pid) === v.clube).sort((a, b) => b[1] - a[1]);
  if (art && (!R.artilheiro || art[1] > R.artilheiro.gols)) { R.artilheiro = { pid: art[0], nome: (c.jogadorDe(v, art[0]) || {}).nome || art[0], gols: art[1], ano: v.ano }; marco(v, "recorde", `${R.artilheiro.nome} bate o recorde de gols numa temporada: ${art[1]}.`); }
  if (pos && (!R.melhorPosicao || pos < R.melhorPosicao.pos)) R.melhorPosicao = { pos, ano: v.ano };
  const vendas = (v.transferencias || []).filter((t) => t.de === v.clube && (t.temporada || T) === T).sort((a, b) => b.valor - a.valor)[0];
  if (vendas && (!R.maiorVenda || vendas.valor > R.maiorVenda.valor)) R.maiorVenda = { nome: (c.jogadorDe(v, vendas.jogador) || {}).nome || vendas.jogador, valor: vendas.valor, ano: v.ano };
  const compras = (v.transferencias || []).filter((t) => t.para === v.clube && (t.temporada || T) === T).sort((a, b) => b.valor - a.valor)[0];
  if (compras && (!R.maiorCompra || compras.valor > R.maiorCompra.valor)) R.maiorCompra = { nome: (c.jogadorDe(v, compras.jogador) || {}).nome || compras.jogador, valor: compras.valor, ano: v.ano };
  for (const t of titulos) marco(v, "titulo", `Campeão: ${t} (${v.ano}).`);
  R.titulos = (R.titulos || 0) + titulos.length;
  // a carreira do técnico: reputação, pontos de habilidade e a confiança da diretoria
  g.reputacao = clamp(g.reputacao + (cumpriuMeta === true ? 6 : cumpriuMeta === false ? -4 : 0) + titulos.length * 8 + (pos <= 3 ? 3 : 0), 0, 100);
  g.pontos += 2 + titulos.length;
  g.confianca = clamp(g.confianca + (cumpriuMeta === true ? 15 : cumpriuMeta === false ? -15 : 0) + titulos.length * 10, 0, 100);
  // o vale de campeão: quem ganhou algum campeonato (um só vale por temporada, não importa quantos títulos) leva de graça um jogador de até 87 na temporada seguinte
  if (titulos.length) { g.vales.push({ ate: T + 1, max: VALE_MAX, motivo: titulos.join(", ") }); c.avisar(v, { tipo: "vale", icone: "taca", titulo: "Vale de campeão", texto: `Pelo título (${titulos.join(", ")}), a diretoria libera um jogador de até ${VALE_MAX} de nota, de graça, na próxima janela. Escolha no mercado: o jogador não pode ser vendido nem trocado na temporada em que chega.` }); marco(v, "vale", `Título (${titulos.join(", ")}) rende o vale de campeão.`); }
  g.legado.temporadasFeitas = (g.legado.temporadasFeitas || 0) + 1;
  g.ultimato = null;
}
function aposentarCamisa(v, c, pid) {
  const g = gestaoDe(v), h = g.legado.hall[pid];
  if (!h) return "Só quem está no Hall da Fama pode ter a camisa aposentada.";
  if (g.legado.camisas.some((x) => x.pid === pid)) return "Essa camisa já foi aposentada.";
  const usados = new Set(g.legado.camisas.map((x) => x.numero));
  let numero = 2 + (hash(`camisa:${pid}`) % 29); while (usados.has(numero)) numero = numero >= 30 ? 2 : numero + 1;
  g.legado.camisas.push({ pid, nome: h.nome, numero, ano: v.ano });
  c.mudarMoral(v, 4); g.confianca = clamp(g.confianca + 3, 0, 100);
  c.movimentar(v, `Camisa histórica de ${h.nome}`, Math.round(0.4e6 * tamanhoDe(v, c)));
  marco(v, "camisa", `A camisa ${numero} de ${h.nome} é aposentada.`);
  Feed.postar(v, { tipo: "hall", perfil: v.clube, humor: "bom", arte: { cena: "trofeu", clube: v.clube, jogador: pid }, texto: `HISTÓRICO! O ${c.clubeDe(v, v.clube).nome} aposenta a camisa ${numero} em homenagem a ${h.nome}. Ninguém mais vai vestir.` });
  return { texto: `A camisa ${numero} de ${h.nome} foi aposentada. A torcida chorou: moral lá em cima e a loja vendeu tudo.` };
}

// ---------- a virada de temporada de um clube humano ----------
// poaching por multa, contratos que acabam, obra pronta, patrocínio pela fama e a base nova. Devolve o texto para o aviso da temporada.
function virada(v, c) {
  const g = garantir(v, c), partes = [], T = v.temporada; // v.temporada já é a nova
  // o clube que paga a multa leva o jogador (só vale com multa e jogador bom)
  for (const j of c.elencoDe(v, v.clube)) {
    const k = g.contratos[j.id]; if (!k || !k.multa || k.fim < T - 1) continue;
    const nota = c.notaDe(v, j), chance = clamp((nota - 74) * 0.05 * (k.multaId === "baixa" ? 2.2 : 0.8), 0, 0.6);
    if (chance > 0 && Motor.sorteDe(`multa:${v.semente}:${T}:${j.id}`)() < chance && c.elencoDe(v, v.clube).length > Mercado.ELENCO_MIN) {
      const para = paraOndeVai(v, c, j.id, 4), valor = k.multa;
      tirarDoClube(v, c, j.id, para); c.movimentar(v, `Multa rescisória: ${j.nome}`, valor);
      partes.push(`${(c.clubeDe(v, para) || {}).nome} pagou a multa de ${dinheiro(valor)} por ${j.nome}.`);
      Feed.postar(v, { tipo: "venda", perfil: "galeranews", galeranews: true, humor: "mercado", arte: { cena: "aperto", jogador: j.id, de: v.clube, para, valor }, texto: `${j.nome} deixa o ${c.clubeDe(v, v.clube).nome}: o ${(c.clubeDe(v, para) || {}).nome} pagou a multa de ${dinheiro(valor)}.` });
    }
  }
  // os contratos que acabaram: o jogador sai de graça (se o elenco ficaria pequeno demais, o melhor renova de ofício)
  const acabaram = c.elencoDe(v, v.clube).filter((j) => g.contratos[j.id] && g.contratos[j.id].fim < T).sort((a, b) => c.notaDe(v, b) - c.notaDe(v, a));
  let restante = c.elencoDe(v, v.clube).length - acabaram.length;
  const livres = [];
  acabaram.forEach((j) => {
    if (restante < Mercado.ELENCO_MIN) { restante++; g.contratos[j.id] = { fim: T, multa: 0 }; v.salarios[j.id] = Math.round(c.salarioDe(v, j) * 1.1 / 5e3) * 5e3; partes.push(`${j.nome} renovou de ofício por mais um ano (o elenco ficaria curto).`); return; }
    const para = paraOndeVai(v, c, j.id); tirarDoClube(v, c, j.id, para); livres.push(j.nome);
    if (c.notaDe(v, j) >= 76) Feed.postar(v, { tipo: "venda", perfil: "galeranews", galeranews: true, humor: "ruim", arte: { cena: "aperto", jogador: j.id, de: v.clube, para, valor: 0 }, texto: `${j.nome} termina o contrato e sai de graça do ${c.clubeDe(v, v.clube).nome} rumo ao ${(c.clubeDe(v, para) || {}).nome}.` });
  });
  if (livres.length) partes.push(`Contrato acabou e saíram de graça: ${livres.slice(0, 4).join(", ")}${livres.length > 4 ? ` e mais ${livres.length - 4}` : ""}.`);
  // a obra que ficou pronta e a manutenção
  if (g.obra) { g.infra[g.obra.tipo] = g.obra.para; const nome = Regras.INFRA[g.obra.tipo].nome; partes.push(`Obra pronta: ${nome} nível ${g.obra.para}.`); marco(v, "obra", `${nome} chega ao nível ${g.obra.para}.`); g.obra = null; }
  const manut = Regras.manutencao(g.infra, tamanhoDe(v, c));
  if (manut) c.movimentar(v, "Manutenção da estrutura", -manut);
  // o prestígio do técnico atrai patrocínio
  const patrocinio = arred(g.reputacao * 0.05e6 * tamanhoDe(v, c));
  if (patrocinio >= 1e5) { c.movimentar(v, "Patrocínios pelo prestígio do técnico", patrocinio); partes.push(`Patrocínios pelo seu prestígio: ${dinheiro(patrocinio)}.`); }
  // a base: os garotos crescem, alguns saem e chegam os novos
  const { saiu, levados } = crescerProspectos(v, c), { novos } = novosProspectos(v, c, T);
  if (levados.length) partes.push(`Um clube levou da base: ${levados.map((l) => l.nome).join(", ")}.`);
  if (novos.length) partes.push(`Chegaram à base: ${novos.length} garoto${novos.length > 1 ? "s" : ""}.`);
  g.visto = {}; g.depois = g.depois.filter((d) => d.temporada >= T - 1);
  g.vales = g.vales.filter((x) => x.ate >= T); // o vale não usado vence no fim da temporada seguinte ao título
  for (const pid of Object.keys(g.bloqueados)) if (g.bloqueados[pid] < T) delete g.bloqueados[pid];
  // o capitão perdeu a braçadeira junto com o contrato? (garantir já limpou)
  return partes.join(" ");
}

// ---------- as ações da tela Clube ----------
function acao(v, c, d) {
  if (v.partida) return "Termine a partida primeiro.";
  if (v.demitido) return "Você foi demitido.";
  const g = garantir(v, c), tipo = String(d.acao || "");
  if (tipo === "renovar") { const r = aplicarRenovacao(v, c, String(d.jogador || ""), d.anos, String(d.multa || "nenhuma")); return r.erro || { mensagem: r.texto }; }
  if (tipo === "obra") {
    const t = String(d.tipo || ""), nivel = Object.hasOwn(g.infra, t) ? g.infra[t] : 0;
    if (!Object.hasOwn(Regras.INFRA, t)) return "Escolha uma obra.";
    if (g.obra) return "Já tem uma obra em andamento: ela fica pronta na virada de temporada.";
    if (nivel >= Regras.INFRA_MAX) return "Essa estrutura já está no máximo.";
    const custo = Regras.custoObra(nivel + 1, tamanhoDe(v, c));
    if (v.caixa < custo) return `Faltam ${dinheiro(custo - v.caixa)} para a obra.`;
    c.movimentar(v, `Obra: ${Regras.INFRA[t].nome} (nível ${nivel + 1})`, -custo); g.obra = { tipo: t, para: nivel + 1, temporada: v.temporada };
    return { mensagem: `${Regras.INFRA[t].nome}: obra de nível ${nivel + 1} começou (${dinheiro(custo)}). Fica pronta na virada de temporada.` };
  }
  if (tipo === "promover") { const r = promover(v, c, String(d.jogador || "")); return typeof r === "string" ? r : { mensagem: r.texto }; }
  if (tipo === "vender-base" || tipo === "dispensar-base") {
    const p = g.prospectos.find((q) => q.id === String(d.jogador || "")); if (!p) return "Esse garoto não está mais na base.";
    g.prospectos = g.prospectos.filter((q) => q !== p);
    if (tipo === "vender-base") { const val = valorProspecto(p); c.movimentar(v, `Venda da base: ${p.nome}`, val); return { mensagem: `${p.nome} foi vendido por ${dinheiro(val)}.` }; }
    return { mensagem: `${p.nome} foi liberado da base.` };
  }
  if (tipo === "capitao") {
    const pid = String(d.jogador || ""); if (!c.elencoDe(v, v.clube).some((j) => j.id === pid)) return "Esse jogador não é do seu elenco.";
    g.capitao = pid; const j = c.jogadorDe(v, pid);
    return { mensagem: `${j.nome} é o novo capitão. Ele segura o vestiário depois das derrotas.` };
  }
  if (tipo === "habilidade") {
    const id = String(d.id || ""), h = Object.hasOwn(Regras.HABILIDADES, id) ? Regras.HABILIDADES[id] : null; if (!h) return "Escolha uma habilidade.";
    if ((g.habilidades[id] || 0) >= Regras.HAB_MAX) return "Essa habilidade já está no máximo.";
    if (g.pontos < 1) return "Você não tem pontos de habilidade. Eles chegam no fim de cada temporada.";
    g.pontos--; g.habilidades[id] = (g.habilidades[id] || 0) + 1;
    return { mensagem: `${h.nome} nível ${g.habilidades[id]}: ${h.texto(g.habilidades[id])}.` };
  }
  if (tipo === "vale") return c.usarVale(v, String(d.jogador || ""));
  if (tipo === "camisa") { const r = aposentarCamisa(v, c, String(d.jogador || "")); return typeof r === "string" ? r : { mensagem: r.texto }; }
  return "Ação desconhecida.";
}

// ---------- o que a tela mostra ----------
function estado(v, c) {
  const g = garantir(v, c), T = tamanhoDe(v, c), olh = g.infra.olheiros, elenco = c.elencoDe(v, v.clube);
  const rodadaLiga = c.rodadaDaJanela(v), restam = Regras.restamNaJanela(rodadaLiga);
  const contratos = elenco.map((j) => {
    const k = g.contratos[j.id] || { fim: v.temporada, multa: 0 };
    return { id: j.id, fim: k.fim, anos: anosDe(v, k), multa: k.multa || 0, multaId: k.multaId || "nenhuma", recusou: !!g.recusou[j.id] };
  });
  const alertas = [];
  const acabando = contratos.filter((k) => k.anos <= 1 && c.notaDe(v, c.jogadorDe(v, k.id)) >= 70).length;
  if (acabando) alertas.push({ tipo: "contratos", texto: `${acabando} jogador${acabando > 1 ? "es" : ""} bom${acabando > 1 ? "s" : ""} com contrato acabando nesta temporada.` });
  if (restam != null && restam <= 2) alertas.push({ tipo: "janela", texto: restam === 1 ? "ÚLTIMO JOGO com a janela aberta: depois dele, só na próxima." : `A janela fecha em ${restam} jogos.` });
  if (g.ultimato) alertas.push({ tipo: "ultimato", texto: `Ultimato: ${Math.max(0, g.ultimato.ate - g.jogos)} jogo${g.ultimato.ate - g.jogos === 1 ? "" : "s"} para somar ${g.ultimato.min} pontos.` });
  if (g.pontos > 0) alertas.push({ tipo: "pontos", texto: `${g.pontos} ponto${g.pontos > 1 ? "s" : ""} de habilidade para gastar.` });
  const hall = Object.entries(g.legado.hall).map(([pid, h]) => ({ pid, ...h, camisa: (g.legado.camisas.find((x) => x.pid === pid) || {}).numero || null }));
  return {
    confianca: Math.round(g.confianca), reputacao: Math.round(g.reputacao), pontos: g.pontos, habilidades: g.habilidades,
    ultimato: g.ultimato && (() => { const restam = Math.max(0, g.ultimato.ate - g.jogos), feitos = 4 - restam; return { restam, min: g.ultimato.min, pontos: feitos > 0 ? pontosDe(g.recentes.slice(-feitos)) : 0 }; })(),
    recentes: g.recentes.slice(-5), alertas,
    janela: { restam, ultimoJogo: restam === 1 },
    contratos, infra: g.infra, obra: g.obra, custos: [1, 2, 3].map((n) => Regras.custoObra(n, T)), manutencao: Regras.manutencao(g.infra, T),
    capitao: g.capitao, candidatos: [...elenco].sort((a, b) => c.notaDe(v, b) - c.notaDe(v, a)).slice(0, 12).map((j) => ({ id: j.id, lider: Regras.lideranca({ idade: Evolucao.idadeNa(j, v.temporada), nota: c.notaDe(v, j), anosClube: (g.legado.acumulado[j.id] || {}).temporadas || 0 }) })),
    base: g.prospectos.map((p) => ({ id: p.id, nome: p.nome, pos: p.pos, idade: p.idade, nota: p.nota, nat: p.nat, pot: Regras.potVisivel(p.pot, olh), impressao: Regras.impressao(p.pot), valor: valorProspecto(p), blindado: !!g.blindados[p.id], atr: p.atr })),
    vales: g.vales.filter((x) => x.ate >= v.temporada).map((x) => ({ max: x.max, ate: x.ate, motivo: x.motivo })), bloqueados: Object.keys(g.bloqueados).filter((pid) => g.bloqueados[pid] >= v.temporada),
    futuro: g.depois.length, // quantas consequências estão a caminho (sem contar o que são)
    legado: { hall, camisas: g.legado.camisas, marcos: g.legado.marcos.slice(-30), recordes: g.legado.recordes, historico: v.historico || [] },
    rivais: confrontosDe(v, c), rivalLiga: rivalDaLiga(v, c),
    demitido: v.demitido || null,
  };
}

// os ajustes que o resto do carreira.js pergunta
const VALE_MAX = 87;
// o jogador que chegou pelo vale de campeão não é vendido, trocado nem leiloado na temporada em que chega (senão virava dinheiro de graça)
const semVenda = (v, clube, pid) => { const g = gestaoDoClube(v, clube); return !!(g && g.bloqueados && g.bloqueados[pid] >= v.temporada); };
const infraDe = (v, id) => { const g = gestaoDoClube(v, id); return g ? g.infra : null; };
const habilidadeDe = (v, id, h) => { const g = gestaoDoClube(v, id); return g ? g.habilidades[h] || 0 : 0; };
const fatorBilheteria = (v) => Regras.fatorBilheteria(infraDe(v, v.clube));
const bonusRecupera = (v) => Regras.bonusRecupera(infraDe(v, v.clube), habilidadeDe(v, v.clube, "preparador"));
const fatorLesao = (v, id) => Regras.fatorLesao(infraDe(v, id));

module.exports = { VALE_MAX, semVenda, padrao, gestaoDe, garantir, contratar, acao, estado, aposJogo, responder, virada, fechouTemporada, registrarConfronto, provocacao, rivaisDe, classicoCom,
  fatorBilheteria, bonusRecupera, fatorLesao, infraDe, habilidadeDe, gestaoDoClube, novosProspectos, criarDilema, DILEMAS, Regras, demitir };
