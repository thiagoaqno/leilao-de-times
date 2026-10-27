// Temporada F1 em grupo: as contas puras da sala (servidor e sede usam as mesmas). Segue a solo (regras.js), mas com várias
// equipes humanas na mesma temporada:
// - cada amigo escolhe uma das 11 equipes; DOIS podem dividir a mesma (um em cada carro, com o mesmo carro e o mesmo caixa);
//   as equipes sem humano ficam com os robôs (os pilotos reais de 2026);
// - quem confirma gastos: QUALQUER UM dos dois da equipe. O servidor aplica um pedido de cada vez, na ordem em que chegam,
//   e cada gasto fica no histórico da equipe com o nome de quem fez; a montagem leva a `versao` da equipe, e quem mexeu
//   em cima de uma versão velha é avisado em vez de desfazer o que o companheiro acabou de fazer;
// - o mercado é disputado: um piloto ou engenheiro só trabalha para UMA equipe (quem pegou primeiro fica com ele);
// - o grid tem 20 carros: os humanos e os pilotos reais que sobram (o corte fixo do ano sai da semente).
(function (root) {
const Pilotos = root.F1Pilotos || require("../f1-pilotos-2026.js");
const Equipes = root.F1Equipes || require("../f1-equipes.js");
const Pecas = root.F1Pecas || require("../f1-pecas.js");
const Solo = root.F1Temporada || require("./regras.js");

const MAX_PESSOAS = 8, GRID = 20, CAIXA_INICIAL = 42, PATROCINIO = 6, HISTORICO_MAX = 30;
const OPCOES_PADRAO = { tamanho: 8, voltas: 3, nivel: "medio" };
const TAMANHOS = [4, 8], VOLTAS = [2, 3, 5], NIVEIS = ["facil", "medio", "dificil"];
const nomeDaEquipe = (id) => (Pilotos.EQUIPES[id] || {}).nome || id;
const custoDoPiloto = (p) => Math.max(5, Math.round((p.ritmo - 70) * 0.7));
const inteiro = (n) => Number.isInteger(n) && n >= 0;

function criarSala(codigo, anfitriao) {
  return { v: 1, codigo, host: anfitriao.id, fase: "sala", opcoes: { ...OPCOES_PADRAO }, pessoas: { [anfitriao.id]: pessoaNova(anfitriao) }, ordem: [anfitriao.id], criadaEm: Date.now(), t: Date.now() };
}
const pessoaNova = ({ id, nome, tokenHash }) => ({ id, nome, tokenHash, equipe: null, carro: null });
const humanosDa = (sala, equipe) => sala.ordem.filter((id) => sala.pessoas[id] && sala.pessoas[id].equipe === equipe);
const equipeDa = (sala, pid) => {
  const p = sala.pessoas[pid];
  if (!p || !p.equipe || !sala.equipes || !sala.equipes[p.equipe]) throw Error("Você não está numa equipe. Quem não tem carro só acompanha.");
  return p.equipe;
};

function entrar(sala, pessoa) {
  if (sala.ordem.length >= MAX_PESSOAS) throw Error(`A sala já tem ${MAX_PESSOAS} pessoas.`);
  if (!pessoa.nome) throw Error("Escreva seu nome.");
  if (Object.values(sala.pessoas).some((p) => p.nome.toLowerCase() === pessoa.nome.toLowerCase())) throw Error("Já tem alguém com esse nome na sala.");
  sala.pessoas[pessoa.id] = pessoaNova(pessoa); sala.ordem.push(pessoa.id);
  return sala;
}
// antes da temporada: sair tira a pessoa da sala (o cargo de anfitrião passa para o próximo); depois, a pessoa fica como ausente
function sair(sala, pid) {
  if (sala.fase !== "sala") return false;
  delete sala.pessoas[pid]; sala.ordem = sala.ordem.filter((id) => id !== pid);
  if (sala.host === pid && sala.ordem.length) sala.host = sala.ordem[0];
  return true;
}
// depois que a temporada começou: a pessoa deixa a sala de vez e o carro dela volta para um robô (como quem é dispensado).
// Sozinha na equipe, a equipe inteira volta aos robôs; com um amigo, o amigo fica com o carro 1 e o outro carro vai para um piloto real livre.
// Devolve "encerrada" se não sobrou ninguém com carro (a sala acaba).
function dispensar(sala, pid) {
  const p = sala.pessoas[pid];
  if (!p) throw Error("Pessoa inválida.");
  if (sala.fase === "sala") { sair(sala, pid); return sala.ordem.length ? "saiu" : "encerrada"; }
  const eq = p.equipe;
  delete sala.pessoas[pid]; sala.ordem = sala.ordem.filter((id) => id !== pid);
  if (!sala.ordem.some((id) => sala.pessoas[id].equipe)) return "encerrada";
  if (sala.host === pid) sala.host = sala.ordem.find((id) => sala.pessoas[id].equipe) || sala.ordem[0];
  if (eq && sala.equipes[eq]) {
    const restam = humanosDa(sala, eq), titulares = Pilotos.PILOTOS.filter((x) => x.equipe === eq);
    if (!restam.length) {
      delete sala.equipes[eq]; // a equipe volta aos robôs: os dois carros, com o que ela já contratou
      let tem = Pilotos.PILOTOS.filter((x) => sala.contratos[x.id] === eq).length;
      for (const t of titulares) if (tem < 2 && sala.contratos[t.id] == null) { sala.contratos[t.id] = eq; tem++; }
    } else {
      sala.pessoas[restam[0]].carro = 0;
      const t = sala.equipes[eq];
      if (!t.companheiro) {
        const livre = titulares.find((x) => sala.contratos[x.id] == null);
        if (livre) { sala.contratos[livre.id] = eq; t.companheiro = livre.id; }
      }
      anotar(sala, restam[0], t, `ficou sozinho(a) na equipe: ${p.nome} saiu e o outro carro voltou para um robô`);
    }
  }
  return "saiu";
}
function passarCargo(sala, de, para) {
  if (sala.host !== de) throw Error("Só o anfitrião passa o cargo.");
  if (!sala.pessoas[para]) throw Error("Pessoa inválida.");
  sala.host = para; return sala;
}
function escolherEquipe(sala, pid, equipe) {
  if (sala.fase !== "sala") throw Error("A temporada já começou: as equipes estão fechadas.");
  const p = sala.pessoas[pid]; if (!p) throw Error("Pessoa inválida.");
  if (equipe == null || equipe === "") { p.equipe = null; return sala; }
  if (!Pilotos.EQUIPES[equipe] || !Equipes.EQUIPES[equipe]) throw Error("Equipe inválida.");
  if (p.equipe !== equipe && humanosDa(sala, equipe).length >= 2) throw Error(`A ${nomeDaEquipe(equipe)} já tem os dois carros ocupados.`);
  p.equipe = equipe; return sala;
}
function definirOpcoes(sala, pid, d = {}) {
  if (sala.host !== pid) throw Error("Só o anfitrião muda o calendário e os robôs.");
  if (sala.fase !== "sala") throw Error("O formato já foi fechado: a temporada começou.");
  const o = sala.opcoes;
  if (d.tamanho != null) { if (!TAMANHOS.includes(Number(d.tamanho))) throw Error("Calendário inválido."); o.tamanho = Number(d.tamanho); }
  if (d.voltas != null) { if (!VOLTAS.includes(Number(d.voltas))) throw Error("Número de voltas inválido."); o.voltas = Number(d.voltas); }
  if (d.nivel != null) { if (!NIVEIS.includes(d.nivel)) throw Error("Nível dos robôs inválido."); o.nivel = d.nivel; }
  return sala;
}

function equipeNova(equipe) {
  return { montagem: Equipes.montagemPadrao(equipe), bonus: 0, caixa: CAIXA_INICIAL, gasto: 0, patrocinio: PATROCINIO, engenheiros: { mecanico: 0, estrategista: 0 }, companheiro: null, versao: 0, historico: [] };
}
// O anfitrião fecha a sala. Cada equipe com humano ganha caixa, montagem e engenheiros; com UM humano, o outro carro é de
// um piloto real contratado (o primeiro titular, no começo) e o segundo titular vai para o mercado; com DOIS, os dois
// titulares reais vão para o mercado. `contratos` diz de quem é cada piloto real (null: livre no mercado).
function iniciar(sala, pid, semente = Date.now()) {
  if (sala.host !== pid) throw Error("Só o anfitrião começa a temporada.");
  if (sala.fase !== "sala") throw Error("A temporada já começou.");
  const comEquipe = sala.ordem.filter((id) => sala.pessoas[id].equipe);
  if (!comEquipe.length) throw Error("Pelo menos uma pessoa precisa escolher uma equipe.");
  const o = sala.opcoes, cal = Solo.CALENDARIO;
  sala.calendario = (o.tamanho === 4 ? [cal[0], cal[2], cal[5], cal[7]] : cal).map(([pista, nome]) => ({ pista, nome }));
  sala.fase = "temporada"; sala.ano = 1; sala.gp = 0; sala.semente = semente; sala.resultados = []; sala.campeoes = []; sala.equipes = {}; sala.contratos = {};
  for (const id of comEquipe) { const p = sala.pessoas[id]; p.carro = humanosDa(sala, p.equipe).indexOf(id); if (!sala.equipes[p.equipe]) sala.equipes[p.equipe] = equipeNova(p.equipe); }
  for (const p of Pilotos.PILOTOS) {
    const hs = humanosDa(sala, p.equipe).length, titulares = Pilotos.PILOTOS.filter((x) => x.equipe === p.equipe);
    if (!hs) sala.contratos[p.id] = p.equipe;
    else if (hs === 1 && p.id === titulares[0].id) { sala.contratos[p.id] = p.equipe; sala.equipes[p.equipe].companheiro = p.id; }
    else sala.contratos[p.id] = null;
  }
  return sala;
}

// ---------- a gestão da equipe (qualquer um dos dois confirma; tudo vai para o histórico) ----------
function ativa(sala) { if (sala.fase !== "temporada") throw Error("A temporada ainda não começou."); if (sala.gp >= sala.opcoes.tamanho) throw Error("A temporada terminou."); }
function anotar(sala, pid, t, texto, valor = 0) {
  t.versao++; t.historico.push({ quem: sala.pessoas[pid].nome, texto, valor, em: Date.now() });
  if (t.historico.length > HISTORICO_MAX) t.historico.splice(0, t.historico.length - HISTORICO_MAX);
}
function gastar(t, quantia) {
  if (!inteiro(quantia) || quantia > t.caixa) throw Error("Caixa insuficiente.");
  if (t.gasto + quantia > Solo.teto) throw Error(`Teto de gastos de ${Solo.teto} milhões atingido nesta temporada.`);
  t.caixa -= quantia; t.gasto += quantia;
}
function montar(sala, pid, montagem, versao) {
  ativa(sala);
  const eq = equipeDa(sala, pid), t = sala.equipes[eq];
  if (versao != null && versao !== t.versao) throw Error("Sua equipe mudou enquanto você mexia. Confira a tela e tente de novo.");
  const v = Pecas.resolver(eq, montagem && montagem.pecas !== undefined ? montagem : { montagem }, t.bonus); // `montagem` pode ser { pecas } ou os níveis (formato antigo)
  if (!v.ok) throw Error(v.erro);
  if (ORDEM_IGUAL(v.montagem, t.montagem)) { if (v.pecas && JSON.stringify(v.pecas) !== JSON.stringify(t.pecas)) { t.pecas = v.pecas; anotar(sala, pid, t, "trocou as peças do carro"); } return sala; }
  const mudou = Equipes.ORDEM.filter((k) => v.montagem[k] !== t.montagem[k]).map((k) => `${Equipes.PECAS[k].nome} ${t.montagem[k]}→${v.montagem[k]}`).join(", ");
  t.montagem = v.montagem; t.pecas = v.pecas; anotar(sala, pid, t, `montou o carro (${mudou})`);
  return sala;
}
const ORDEM_IGUAL = (a, b) => Equipes.ORDEM.every((k) => a[k] === b[k]);
function desenvolver(sala, pid) {
  ativa(sala);
  const eq = equipeDa(sala, pid), t = sala.equipes[eq];
  if (t.bonus >= 4) throw Error("O carro atingiu o limite de desenvolvimento.");
  const custo = 12 + t.bonus * 6; gastar(t, custo); t.bonus++;
  anotar(sala, pid, t, `desenvolveu o carro (+1 ponto, ${t.bonus}/4)`, custo);
  return sala;
}
// o piloto real é de uma equipe só: quem já corre por outra equipe humana não sai; os das equipes de robô e os livres podem ser contratados
function contratarPiloto(sala, pid, id) {
  ativa(sala);
  const eq = equipeDa(sala, pid), t = sala.equipes[eq];
  if (humanosDa(sala, eq).length > 1) throw Error("Com dois pilotos humanos a equipe não tem vaga para um contratado.");
  const p = Pilotos.PILOTOS.find((x) => x.id === id);
  if (!p) throw Error("Piloto indisponível.");
  if (t.companheiro === id) return sala;
  const dono = sala.contratos[id];
  if (dono && sala.equipes[dono]) throw Error(`${p.nome} já corre pela ${nomeDaEquipe(dono)}: um piloto não vai para duas equipes.`);
  const custo = custoDoPiloto(p); gastar(t, custo);
  if (t.companheiro) sala.contratos[t.companheiro] = null; // o antigo volta para o mercado
  sala.contratos[id] = eq; t.companheiro = id;
  anotar(sala, pid, t, `contratou ${p.nome}`, custo);
  return sala;
}
function contratarEngenheiro(sala, pid, area, nivel) {
  ativa(sala);
  const eq = equipeDa(sala, pid), t = sala.equipes[eq], lista = Solo.ENGENHEIROS[area];
  if (!lista || ![0, 1, 2].includes(nivel)) throw Error("Engenheiro inválido.");
  if (nivel <= t.engenheiros[area]) throw Error("Escolha um nível superior.");
  const dono = Object.keys(sala.equipes).find((e) => e !== eq && sala.equipes[e].engenheiros[area] === nivel);
  if (dono) throw Error(`${lista[nivel].nome} já trabalha para a ${nomeDaEquipe(dono)}.`);
  const custo = lista[nivel].custo - lista[t.engenheiros[area]].custo; gastar(t, custo);
  t.engenheiros[area] = nivel;
  anotar(sala, pid, t, `contratou ${lista[nivel].nome} (${area === "mecanico" ? "mecânicos" : "estrategista"})`, custo);
  return sala;
}
// quem está livre ou disponível, para a tela do mercado
function mercado(sala) {
  return Pilotos.PILOTOS.map((p) => ({ id: p.id, dono: sala.contratos[p.id] || null, custo: custoDoPiloto(p) }));
}

// ---------- o grid e o resultado ----------
const chave = (texto) => { let h = 2166136261; for (const c of String(texto)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// Os 20 carros do GP: os humanos (`h:<id>`) e os pilotos reais contratados. Passando de 20, saem pilotos de equipes de robô
// (nunca os contratados por humanos), sempre os mesmos durante o ano (sorteio fixo pela semente).
function gridDoGP(sala) {
  const humanos = sala.ordem.map((id) => sala.pessoas[id]).filter((p) => p.equipe).map((p) => ({ pid: p.id, nome: p.nome, equipe: p.equipe }));
  const vagas = GRID - humanos.length;
  let robos = Pilotos.PILOTOS.filter((p) => sala.contratos[p.id]).map((p) => ({ ...p, equipe: sala.contratos[p.id] }));
  if (robos.length > vagas) {
    const cortaveis = robos.filter((p) => !sala.equipes[p.equipe]).sort((a, b) => chave(`${sala.semente}:${a.id}`) - chave(`${sala.semente}:${b.id}`));
    const fora = new Set(cortaveis.slice(0, robos.length - vagas).map((p) => p.id));
    robos = robos.filter((p) => !fora.has(p.id));
  }
  return { humanos, robos };
}
const idDoHumano = (pid) => `h:${pid}`;
function idsEsperados(sala) { const g = gridDoGP(sala); return [...g.humanos.map((h) => idDoHumano(h.pid)), ...g.robos.map((p) => p.id)]; }
function registrarResultado(sala, linhas) {
  ativa(sala);
  const esperados = idsEsperados(sala), n = esperados.length;
  if (!Array.isArray(linhas) || linhas.length !== n) throw Error("Resultado incompleto.");
  const ids = new Set(linhas.map((r) => r.piloto)), posicoes = new Set(linhas.map((r) => r.pos));
  if (ids.size !== n || !esperados.every((id) => ids.has(id)) || posicoes.size !== n
    || linhas.some((r) => !inteiro(r.pos) || r.pos < 1 || r.pos > n || r.pontos !== (r.dnf || r.nc ? 0 : Solo.PONTOS[r.pos - 1] || 0))) throw Error("Resultado inválido.");
  const gp = sala.calendario[sala.gp];
  const resultado = { ano: sala.ano, gp: sala.gp, pista: gp.pista, linhas: linhas.map((r) => ({ piloto: r.piloto, equipe: r.equipe, pos: r.pos, pontos: r.pontos || 0, dnf: !!r.dnf, nc: !!r.nc })), financas: {} };
  sala.resultados.push(resultado); sala.gp++;
  for (const [eq, t] of Object.entries(sala.equipes)) {
    const pontos = resultado.linhas.filter((r) => r.equipe === eq).reduce((s, r) => s + r.pontos, 0), premio = 4 + Math.round(pontos * 0.4);
    const comp = t.companheiro && Pilotos.PILOTOS.find((p) => p.id === t.companheiro);
    const salarios = 3 + (comp ? Math.round((comp.ritmo - 70) / 8) : 0) + t.engenheiros.mecanico + t.engenheiros.estrategista;
    t.caixa = Math.max(0, t.caixa + t.patrocinio + premio - salarios);
    resultado.financas[eq] = { patrocinio: t.patrocinio, premio, salarios };
  }
  if (sala.gp >= sala.opcoes.tamanho) {
    const tab = tabelas(sala);
    sala.campeoes.push({ ano: sala.ano, piloto: tab.pilotos[0].id, pilotoNome: tab.pilotos[0].nome, equipe: tab.equipes[0].id, equipeNome: tab.equipes[0].nome });
  }
  return resultado;
}
function tabelas(sala) {
  const pilotos = new Map(), equipes = new Map(), vazio = (o) => ({ ...o, pontos: 0, vitorias: 0, podios: 0, colocacoes: Array(GRID).fill(0) });
  for (const p of Pilotos.PILOTOS) pilotos.set(p.id, vazio({ id: p.id, nome: p.nome, equipe: sala.contratos && sala.contratos[p.id] || p.equipe, humano: false }));
  for (const id of sala.ordem) { const p = sala.pessoas[id]; if (p && p.equipe) pilotos.set(idDoHumano(id), vazio({ id: idDoHumano(id), nome: p.nome, equipe: p.equipe, humano: true, pessoa: id })); }
  for (const [id, eq] of Object.entries(Pilotos.EQUIPES)) equipes.set(id, vazio({ id, nome: eq.nome, humana: !!(sala.equipes && sala.equipes[id]) }));
  for (const gp of (sala.resultados || []).filter((r) => r.ano === sala.ano)) for (const r of gp.linhas) {
    const lugar = !r.dnf && !r.nc;
    for (const [mapa, chaveDoMapa] of [[pilotos, r.piloto], [equipes, r.equipe]]) {
      const x = mapa.get(chaveDoMapa); if (!x) continue;
      x.pontos += r.pontos; if (lugar && r.pos === 1) x.vitorias++; if (lugar && r.pos <= 3) x.podios++; if (lugar) x.colocacoes[r.pos - 1]++;
      if (mapa === pilotos) x.equipe = r.equipe;
    }
  }
  const ordenar = (a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || a.colocacoes.reduce((d, _, i) => d || b.colocacoes[i] - a.colocacoes[i], 0) || a.nome.localeCompare(b.nome, "pt-BR");
  return { pilotos: [...pilotos.values()].sort(ordenar), equipes: [...equipes.values()].sort(ordenar) };
}
function proximaTemporada(sala, pid) {
  if (sala.host !== pid) throw Error("Só o anfitrião abre a próxima temporada.");
  if (sala.fase !== "temporada" || sala.gp !== sala.opcoes.tamanho) throw Error("Termine o calendário primeiro.");
  sala.ano++; sala.gp = 0; sala.semente = Number(sala.semente) + 937;
  for (const t of Object.values(sala.equipes)) { t.gasto = 0; t.versao++; }
  return sala;
}

// o que cada pessoa recebe: tudo menos o hash do token
function vista(sala, pid, presente = () => false) {
  const { pessoas, ordem, equipes, ...resto } = sala;
  return { ...resto, eu: pid, minhaEquipe: pessoas[pid] ? pessoas[pid].equipe : null,
    pessoas: ordem.map((id) => ({ id, nome: pessoas[id].nome, equipe: pessoas[id].equipe, carro: pessoas[id].carro, online: !!presente(id), host: sala.host === id })),
    equipes: equipes || {}, tabelas: sala.fase === "temporada" ? tabelas(sala) : null, mercado: sala.fase === "temporada" ? mercado(sala) : [] };
}

const api = { MAX_PESSOAS, GRID, OPCOES_PADRAO, TAMANHOS, VOLTAS, NIVEIS, criarSala, entrar, sair, dispensar, passarCargo, escolherEquipe, definirOpcoes, iniciar, montar, desenvolver, contratarPiloto, contratarEngenheiro, mercado,
  gridDoGP, idDoHumano, idsEsperados, registrarResultado, tabelas, proximaTemporada, vista, humanosDa, custoDoPiloto, nomeDaEquipe };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1TemporadaGrupo = api;
})(typeof window !== "undefined" ? window : globalThis);
