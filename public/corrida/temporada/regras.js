// Temporada solo da F1: contas puras, usadas pelo servidor e pela sede.
(function (root) {
const Pilotos = root.F1Pilotos || require("../f1-pilotos-2026.js");
const Equipes = root.F1Equipes || require("../f1-equipes.js");
const Pecas = root.F1Pecas || require("../f1-pecas.js");
const PONTOS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
// Todas as pistas recriadas do jogo, na ordem do calendário real de 2026.
const CALENDARIO = [
  ["melbourne", "Austrália"], ["xangai", "China"], ["suzuka", "Japão"], ["bahrein", "Bahrein"], ["jeddah", "Arábia Saudita"], ["miami", "Miami"], ["montreal", "Canadá"], ["monaco", "Mônaco"],
  ["barcelona", "Barcelona"], ["redbullring", "Áustria"], ["silverstone", "Grã-Bretanha"], ["spa", "Bélgica"], ["hungaroring", "Hungria"], ["zandvoort", "Holanda"], ["monza", "Itália"], ["madri", "Madri"],
  ["baku", "Azerbaijão"], ["singapura", "Singapura"], ["austin", "Estados Unidos"], ["mexico", "Cidade do México"], ["interlagos", "São Paulo"], ["lasvegas", "Las Vegas"], ["catar", "Catar"], ["abudhabi", "Abu Dhabi"],
];
// As pistas do sorteio dos calendários de 4 e 8 GPs e da temporada completa: hoje, todas as do CALENDARIO (a chave é a mesma de `pistas.js`).
const PISTAS_TRABALHADAS = CALENDARIO.map(([pista]) => pista);
// mulberry32 sobre o hash do texto (a mesma família de f1-regras.js `sorteio`, sem depender dele aqui)
function gerador(semente) {
  let a = 2166136261; for (const c of String(semente)) { a ^= c.charCodeAt(0); a = Math.imul(a, 16777619); } a = (a >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function embaralhar(lista, r) {
  const v = lista.slice();
  for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
  return v;
}
// Sorteia `tamanho` GPs sem repetir pista, de PISTAS_TRABALHADAS; se o calendário for maior que a lista, completa com as demais
// do CALENDARIO. Depois põe na ordem do CALENDARIO. `anterior` (as pistas
// da temporada passada) faz o sorteio tentar outro conjunto, quando existe outro. Devolve a semente que valeu, para guardar no estado.
function sortearCalendario(tamanho, semente, anterior = []) {
  const n = Math.min(tamanho, CALENDARIO.length), antes = [...anterior].sort().join();
  const chaves = CALENDARIO.map(([pista]) => pista), boas = PISTAS_TRABALHADAS.filter((k) => chaves.includes(k));
  const resto = chaves.filter((k) => !boas.includes(k));
  let escolha, usada;
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    usada = `calendario:${semente}:${tentativa}`;
    const r = gerador(usada), ordem = [...embaralhar(boas, r), ...embaralhar(resto, r)];
    escolha = ordem.slice(0, n);
    if (escolha.slice().sort().join() !== antes) break;
  }
  return { semente: usada, calendario: CALENDARIO.filter(([pista]) => escolha.includes(pista)).map(([pista, nome]) => ({ pista, nome })) };
}
const ENGENHEIROS = {
  mecanico: [{ nome: "Equipe de base", custo: 0, reducao: 0 }, { nome: "Box experiente", custo: 8, reducao: 0.12 }, { nome: "Box de elite", custo: 18, reducao: 0.24 }],
  estrategista: [{ nome: "Equipe de base", custo: 0, reducao: 0 }, { nome: "Estrategista experiente", custo: 6, reducao: 0.08 }, { nome: "Estrategista de elite", custo: 14, reducao: 0.16 }],
};
const teto = 140;
const inteiro = (n) => Number.isInteger(n) && n >= 0;
const NIVEIS = ["facil", "medio", "dificil"];
function criar(nome, equipe, tamanho = 8, voltas = 3, semente = Date.now(), nivel = "medio") {
  if (!Pilotos.EQUIPES[equipe] || !Equipes.EQUIPES[equipe]) throw Error("Equipe inválida.");
  if (![4, 8, PISTAS_TRABALHADAS.length].includes(tamanho) || ![2, 3, 5, 10].includes(voltas)) throw Error("Formato inválido.");
  if (!NIVEIS.includes(nivel)) throw Error("Nível dos robôs inválido.");
  const titulares = Pilotos.PILOTOS.filter((p) => p.equipe === equipe);
  const sorteado = sortearCalendario(tamanho, semente);
  return { v: 1, nome: String(nome || "").trim().slice(0, 40), equipe, ano: 1, gp: 0, tamanho, voltas, nivel, semente,
    montagem: Object.fromEntries(Equipes.ORDEM.map((k) => [k, 0])), bonus: 0, caixa: 42, gasto: 0, patrocinio: 6,
    piloto2: titulares[0].id, engenheiros: { mecanico: 0, estrategista: 0 },
    resultados: [], calendario: sorteado.calendario, calendarioSemente: sorteado.semente };
}
// monta o carro: a carreira usa `d.montagem` (pontos livres); `d.pecas` segue aceito em saves antigos.
function aplicarMontagem(s, d) {
  const v = Pecas.resolver(s.equipe, d, s.bonus);
  if (!v.ok) throw Error(v.erro);
  s.montagem = v.montagem; s.pecas = v.pecas; // `pecas` é null quando veio do formato antigo
}
function conferirMontagem(s, m) {
  const v = Equipes.validar(s.equipe, m, s.bonus);
  if (!v.ok) throw Error(v.erro);
  return v.montagem;
}
function gastar(s, quantia) {
  if (!inteiro(quantia) || quantia > s.caixa) throw Error("Caixa insuficiente.");
  if (s.gasto + quantia > teto) throw Error(`Teto de gastos de ${teto} milhões atingido nesta temporada.`);
  s.caixa -= quantia; s.gasto += quantia;
}
function contratarPiloto(s, id) {
  if (s.gp >= s.tamanho) throw Error("A temporada terminou.");
  const p = Pilotos.PILOTOS.find((x) => x.id === id);
  if (!p || p.equipe === s.equipe && p.id === Pilotos.PILOTOS.filter((x) => x.equipe === s.equipe)[1].id) throw Error("Piloto indisponível.");
  if (s.piloto2 === id) return s;
  const custo = Math.max(5, Math.round((p.ritmo - 70) * 0.7));
  gastar(s, custo); s.piloto2 = id; return s;
}
function contratarEngenheiro(s, area, nivel) {
  const lista = ENGENHEIROS[area];
  if (!lista || ![0, 1, 2].includes(nivel)) throw Error("Engenheiro inválido.");
  if (nivel <= s.engenheiros[area]) throw Error("Escolha um nível superior.");
  gastar(s, lista[nivel].custo - lista[s.engenheiros[area]].custo);
  s.engenheiros[area] = nivel; return s;
}
function desenvolver(s) {
  if (s.bonus >= 4) throw Error("O carro atingiu o limite de desenvolvimento.");
  gastar(s, 12 + s.bonus * 6); s.bonus++; return s;
}
// Equipes controladas pelo jogo desenvolvem o carro durante a temporada. A semente original e o GP
// determinam os pontos: saves antigos funcionam e reabrir o mesmo GP nunca muda a montagem.
function desenvolvimentoRivais({ semente, ano = 1, gp = 0, tamanho = 8 }, equipesHumanas = []) {
  const humanos = new Set(equipesHumanas), montagens = {}, bonus = {};
  const base = Number(semente) - (ano - 1) * 937;
  const rodadas = Math.max(0, (ano - 1) * tamanho + gp);
  for (const [id, equipe] of Object.entries(Equipes.EQUIPES)) {
    if (humanos.has(id)) continue;
    const r = gerador(`desenvolvimento:${base}:${id}`), atraso = Math.floor(r() * tamanho);
    const pontos = Math.min(4, Math.floor((rodadas * 4 + atraso) / tamanho));
    const ordem = embaralhar(["motor", "aero", "chassi", "freios", "suspensao"], r);
    const m = { ...equipe.padrao };
    for (let i = 0; i < pontos; i++) { const k = ordem[i % ordem.length]; if (m[k] < Equipes.MAX_NIVEL) m[k]++; }
    montagens[id] = m; bonus[id] = pontos;
  }
  return { montagens, bonus };
}
function pilotosNoGrid(s) {
  const titulares = Pilotos.PILOTOS.filter((p) => p.equipe === s.equipe);
  const companheiro = Pilotos.PILOTOS.find((p) => p.id === s.piloto2);
  const removidos = new Set([titulares[1].id, companheiro.id]);
  const disponiveis = Pilotos.PILOTOS.filter((p) => !removidos.has(p.id) && p.equipe !== s.equipe);
  // Se o companheiro veio de outra equipe, o titular deslocado ocupa a vaga deixada por ele.
  const rivais = disponiveis.slice();
  if (companheiro.equipe !== s.equipe) {
    const deslocado = titulares.find((p) => p.id !== companheiro.id);
    if (deslocado) rivais.push({ ...deslocado, equipe: companheiro.equipe });
  }
  return [{ ...companheiro, equipe: s.equipe }, ...rivais].slice(0, 21);
}
// Metas dependem da força inicial da equipe, não do resultado que acabou de acontecer.
function metas(s) {
  const ordem = Object.keys(Equipes.EQUIPES).sort((a, b) => Equipes.EQUIPES[b].orcamento - Equipes.EQUIPES[a].orcamento || a.localeCompare(b));
  const faixa = ordem.indexOf(s.equipe);
  return { gp: faixa < 3 ? 6 : faixa < 7 ? 10 : 15, temporada: faixa < 3 ? 5 : faixa < 7 ? 10 : 15 };
}
function imersao(s) {
  const meta = metas(s), resultados = s.resultados || [];
  // Saves anteriores à caixa de mensagens recuperam uma confiança coerente a partir dos resultados já guardados.
  let confianca = 50;
  const duelos = new Map();
  for (const r of resultados) {
    const eu = r.linhas.find((x) => x.piloto === "voce"); if (!eu) continue;
    const alvo = r.objetivoGP || meta.gp, cumpriu = !eu.dnf && !eu.nc && eu.pos <= alvo;
    confianca = Math.max(0, Math.min(100, confianca + (cumpriu ? 6 : -4)));
    if (r.gp === s.tamanho - 1) {
      const pos = tabelas({ ...s, ano: r.ano }).pilotos.findIndex((p) => p.id === "voce") + 1;
      confianca = Math.max(0, Math.min(100, confianca + (pos <= (r.objetivoTemporada || meta.temporada) ? 10 : -8)));
    }
    if (r.ano !== s.ano) continue;
    for (const p of r.linhas) {
      if (p.piloto === "voce" || p.dnf || p.nc || eu.dnf || eu.nc || !Pilotos.PILOTOS.some((x) => x.id === p.piloto)) continue;
      const distancia = Math.abs(p.pos - eu.pos); if (distancia > 3) continue;
      const d = duelos.get(p.piloto) || { id: p.piloto, encontros: 0, venceu: 0, perdeu: 0, distancia: 0 };
      d.encontros++; d.distancia += distancia; if (eu.pos < p.pos) d.venceu++; else d.perdeu++; duelos.set(p.piloto, d);
    }
  }
  const rival = [...duelos.values()].sort((a, b) => b.encontros - a.encontros || a.distancia - b.distancia || a.id.localeCompare(b.id))[0] || null;
  const classificacao = tabelas(s).pilotos.findIndex((p) => p.id === "voce") + 1;
  return { meta, confianca, rival, classificacao };
}
function registrarResultado(s, linhas, analise = null) {
  if (s.gp >= s.tamanho) throw Error("A temporada terminou.");
  if (!Array.isArray(linhas) || ![20, 22].includes(linhas.length)) throw Error("Resultado incompleto.");
  const total = linhas.length; // aceita também GPs de 20 que já estavam em andamento
  const ids = new Set(linhas.map((r) => r.piloto));
  const posicoes = new Set(linhas.map((r) => r.pos));
  if (ids.size !== total || !ids.has("voce") || posicoes.size !== total || linhas.some((r) => !inteiro(r.pos) || r.pos < 1 || r.pos > total || r.pontos !== (r.dnf || r.nc ? 0 : (PONTOS[r.pos - 1] || 0) + (r.voltaRapida ? 1 : 0))) || linhas.filter((r) => r.voltaRapida).length > 1) throw Error("Resultado inválido.");
  const gp = s.calendario[s.gp];
  const objetivo = metas(s);
  const resultado = { ano: s.ano, gp: s.gp, pista: gp.pista, objetivoGP: objetivo.gp, objetivoTemporada: objetivo.temporada, linhas: linhas.map((r) => ({ piloto: r.piloto, equipe: r.equipe, pos: r.pos, pontos: r.pontos || 0, dnf: !!r.dnf, nc: !!r.nc, voltaRapida: !!r.voltaRapida })) };
  if (analise) resultado.analise = analise;
  s.resultados.push(resultado); s.gp++;
  const humano = resultado.linhas.find((r) => r.piloto === "voce");
  const premio = 4 + Math.round((humano.pontos || 0) * 0.4);
  const contratado = Pilotos.PILOTOS.find((p) => p.id === s.piloto2);
  const salarios = 3 + Math.round((contratado.ritmo - 70) / 8) + s.engenheiros.mecanico + s.engenheiros.estrategista;
  const bonus = pagarBonus(s, humano);
  s.caixa = Math.max(0, s.caixa + s.patrocinio + premio + bonus - salarios);
  resultado.financas = { patrocinio: s.patrocinio, premio, salarios, bonus };
  return { resultado, receita: s.patrocinio + premio + bonus - salarios };
}
function tabelas(s) {
  const pilotos = new Map(), equipes = new Map();
  for (const p of Pilotos.PILOTOS) pilotos.set(p.id, { id: p.id, nome: p.nome, equipe: p.equipe, pontos: 0, vitorias: 0, colocacoes: Array(22).fill(0) });
  if (pilotos.has(s.piloto2)) pilotos.get(s.piloto2).equipe = s.equipe;
  pilotos.set("voce", { id: "voce", nome: s.nome, equipe: s.equipe, pontos: 0, vitorias: 0, colocacoes: Array(22).fill(0) });
  for (const [id, eq] of Object.entries(Pilotos.EQUIPES)) equipes.set(id, { id, nome: eq.nome, pontos: 0, vitorias: 0, colocacoes: Array(22).fill(0) });
  for (const gp of s.resultados.filter((r) => r.ano === s.ano)) for (const r of gp.linhas) {
    const p = pilotos.get(r.piloto); if (!p) continue;
    p.equipe = r.equipe; p.pontos += r.pontos; p.vitorias += r.pos === 1 && !r.nc && !r.dnf ? 1 : 0;
    if (!r.dnf && !r.nc) p.colocacoes[r.pos - 1]++;
    const e = equipes.get(r.equipe); if (e) { e.pontos += r.pontos; e.vitorias += r.pos === 1 && !r.nc && !r.dnf ? 1 : 0; if (!r.dnf && !r.nc) e.colocacoes[r.pos - 1]++; }
  }
  const ordenar = (a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || a.colocacoes.reduce((d, _, i) => d || b.colocacoes[i] - a.colocacoes[i], 0)
    || Number(b.id === "voce" || b.id === s.equipe) - Number(a.id === "voce" || a.id === s.equipe) || a.nome.localeCompare(b.nome, "pt-BR");
  return { pilotos: [...pilotos.values()].sort(ordenar), equipes: [...equipes.values()].sort(ordenar) };
}
// ---------- o contrato, os objetivos e as propostas ----------
// A faixa da equipe (pelo orçamento) decide o tamanho das metas: 0 = equipe de ponta, 1 = do meio, 2 = de trás.
const ordemDeForca = () => Object.keys(Equipes.EQUIPES).sort((a, b) => Equipes.EQUIPES[b].orcamento - Equipes.EQUIPES[a].orcamento || a.localeCompare(b));
const faixaDe = (equipe) => { const i = ordemDeForca().indexOf(equipe); return i < 3 ? 0 : i < 7 ? 1 : 2; };
const BONUS_VITORIA = [1, 2, 3], VERBA_FAIXA = [8, 6, 5];
function garantirContrato(s) {
  if (!s.contrato) s.contrato = { inicio: s.ano, fim: s.ano, bonusVitoria: BONUS_VITORIA[faixaDe(s.equipe)] };
  return s.contrato;
}
function contrato(s) {
  const c = s.contrato || { inicio: s.ano, fim: s.ano, bonusVitoria: BONUS_VITORIA[faixaDe(s.equipe)] };
  return { ...c, verbaGP: s.patrocinio, restam: Math.max(0, (c.fim - s.ano) * s.tamanho + s.tamanho - s.gp) };
}
function numerosDoAno(s) {
  const n = { vitorias: 0, podios: 0, pontuou: 0, poles: 0, top5: 0, top10: 0 };
  for (const r of s.resultados) {
    if (r.ano !== s.ano) continue;
    const eu = r.linhas.find((x) => x.piloto === "voce"), g = r.analise?.pilotos?.voce?.g || 0;
    if (g === 1) n.poles++;
    if (g >= 1 && g <= 5) n.top5++;
    if (g >= 1 && g <= 10) n.top10++;
    if (!eu || eu.dnf || eu.nc) continue;
    if (eu.pos === 1) n.vitorias++;
    if (eu.pos <= 3) n.podios++;
    if (eu.pontos > 0) n.pontuou++;
  }
  return n;
}
// as metas de bônus da temporada: pagas no caixa uma vez, na hora em que se cumprem
function metasDeBonus(s, n = numerosDoAno(s)) {
  const f = faixaDe(s.equipe), q = (k) => Math.max(1, Math.ceil(s.tamanho * k)), umaOuVarias = (v, um, varias) => (v === 1 ? um : varias);
  if (f === 0) return [{ id: "largada", nome: `Conquistar ${q(0.25)} ${umaOuVarias(q(0.25), "pole", "poles")}`, atual: n.poles, alvo: q(0.25), premio: 3 }, { id: "chegada", nome: `Subir ao pódio em ${q(0.5)} corridas`, atual: n.podios, alvo: q(0.5), premio: 4 }];
  if (f === 1) return [{ id: "largada", nome: `Largar no top 5 em ${q(0.25)} ${umaOuVarias(q(0.25), "GP", "GPs")}`, atual: n.top5, alvo: q(0.25), premio: 3 }, { id: "chegada", nome: `Pontuar em ${q(0.5)} corridas`, atual: n.pontuou, alvo: q(0.5), premio: 4 }];
  return [{ id: "largada", nome: `Largar no top 10 em ${q(0.25)} ${umaOuVarias(q(0.25), "GP", "GPs")}`, atual: n.top10, alvo: q(0.25), premio: 3 }, { id: "chegada", nome: `Pontuar em ${q(0.25)} ${umaOuVarias(q(0.25), "corrida", "corridas")}`, atual: n.pontuou, alvo: q(0.25), premio: 4 }];
}
function pagarBonus(s, humano) {
  const c = garantirContrato(s), pagos = (s.bonusPagos ||= {}); let total = 0;
  if (humano && humano.pos === 1 && !humano.dnf && !humano.nc) total += c.bonusVitoria;
  for (const m of metasDeBonus(s)) { const k = `${s.ano}:${s.equipe}:${m.id}`; if (m.atual >= m.alvo && !pagos[k]) { pagos[k] = true; total += m.premio; } }
  return total;
}
function objetivos(s, tb = null) { // `tb`: as tabelas já prontas (na temporada em grupo, as da sala)
  const f = faixaDe(s.equipe), t = tb || tabelas(s), n = numerosDoAno(s), meta = metas(s), acabou = s.gp >= s.tamanho, q = (k) => Math.max(1, Math.ceil(s.tamanho * k));
  const pos = t.pilotos.findIndex((p) => p.id === "voce") + 1, posE = t.equipes.findIndex((e) => e.id === s.equipe) + 1, alvoE = [1, 5, 8][f];
  const estado = (ok) => (acabou ? (ok ? "cumprido" : "falhou") : ok ? "caminho" : "risco");
  const plural = (v, um, varias) => (v === 1 ? um : varias);
  const contagem = f === 0 ? { nome: `Conquistar ${q(0.25)} ${plural(q(0.25), "vitória", "vitórias")}`, atual: n.vitorias, alvo: q(0.25), nota: "Meta de vitórias" }
    : f === 1 ? { nome: `Subir ao pódio em ${q(0.125)} ${plural(q(0.125), "corrida", "corridas")}`, atual: n.podios, alvo: q(0.125), nota: "Meta de pódios" }
    : { nome: `Pontuar em ${q(0.25)} ${plural(q(0.25), "corrida", "corridas")}`, atual: n.pontuou, alvo: q(0.25), nota: "Meta de pontos" };
  const lider = t.equipes[0], segundo = t.equipes[1], minha = t.equipes[posE - 1];
  return {
    expectativa: { pilotos: meta.temporada, construtores: alvoE },
    pilotos: { nome: `Terminar entre os ${meta.temporada} primeiros`, sub: "Campeonato de pilotos", atual: pos, alvo: meta.temporada, estado: s.gp ? estado(pos <= meta.temporada) : "aberto" },
    contagem: { ...contagem, estado: contagem.atual >= contagem.alvo ? "cumprido" : acabou ? "falhou" : "aberto" },
    construtores: { nome: alvoE === 1 ? "Vencer o campeonato de construtores" : `Ficar entre os ${alvoE} primeiros construtores`, atual: posE, alvo: alvoE, estado: s.gp ? estado(posE <= alvoE) : "aberto", sub: !s.gp ? "A disputa começa no primeiro GP." : posE === 1 ? `${lider.nome} lidera por ${lider.pontos - (segundo?.pontos || 0)} pontos.` : `Faltam ${lider.pontos - minha.pontos} pontos para ${lider.nome}.` },
    bonus: metasDeBonus(s, n).map((m) => ({ ...m, pago: !!s.bonusPagos?.[`${s.ano}:${s.equipe}:${m.id}`] })),
  };
}
// como está a renovação: a confiança da diretoria decide
function perspectiva(s) {
  const c = imersao(s).confianca;
  return c >= 65 ? { nivel: "favoravel", rotulo: "Favorável", confianca: c } : c >= 40 ? { nivel: "neutra", rotulo: "Em aberto", confianca: c } : { nivel: "risco", rotulo: "Em risco", confianca: c };
}
function renovar(s, anos) {
  if (![1, 2].includes(anos)) throw Error("Prazo inválido.");
  const c = garantirContrato(s), p = perspectiva(s);
  if (c.fim > s.ano) throw Error("Seu contrato já cobre a próxima temporada.");
  if (p.confianca < 25) throw Error("A diretoria não quer conversar agora. Melhore os resultados primeiro.");
  c.fim = s.ano + anos;
  if (p.confianca >= 70) s.patrocinio = Math.min(12, s.patrocinio + 1); // boa fase: a verba por GP sobe na assinatura
  return s;
}
// As propostas abrem nas 2 últimas etapas e só valem depois do último GP: uma equipe mais forte (se a temporada foi boa), uma parecida e uma para liderar.
function propostas(s) {
  if (s.gp < s.tamanho - 2) return [];
  const ordem = ordemDeForca(), i = ordem.indexOf(s.equipe), pos = tabelas(s).pilotos.findIndex((p) => p.id === "voce") + 1;
  const passo = pos <= 5 ? 3 : pos <= 10 ? 2 : pos <= 15 ? 1 : 0;
  const alvos = [i - passo, i + 1, i + 3].map((k) => ordem[Math.max(0, Math.min(ordem.length - 1, k))]);
  return [...new Set(alvos)].filter((id) => id !== s.equipe).map((id) => ({ equipe: id, verbaGP: VERBA_FAIXA[faixaDe(id)], bonusVitoria: BONUS_VITORIA[faixaDe(id)], orcamento: Equipes.EQUIPES[id].orcamento }));
}
function aceitarProposta(s, id) {
  if (s.gp < s.tamanho) throw Error("Você assina com outra equipe só depois do último GP.");
  const p = propostas(s).find((x) => x.equipe === id);
  if (!p) throw Error("Esta equipe não fez proposta.");
  const titulares = Pilotos.PILOTOS.filter((x) => x.equipe === id);
  s.equipe = id; s.piloto2 = titulares[0].id; s.montagem = Object.fromEntries(Equipes.ORDEM.map((k) => [k, 0])); s.pecas = null; s.bonus = 0;
  s.patrocinio = p.verbaGP; s.contrato = { inicio: s.ano + 1, fim: s.ano + 1, bonusVitoria: p.bonusVitoria };
  return s;
}
function proximaTemporada(s) {
  if (s.gp !== s.tamanho) throw Error("Termine o calendário primeiro.");
  garantirContrato(s);
  if (s.contrato.fim <= s.ano) s.contrato.fim = s.ano + 1; // sem conversa, o contrato segue por mais um ano nos mesmos termos
  for (const r of s.resultados) if (r.ano < s.ano) delete r.analise; // o detalhe volta a volta só vale para o ano atual e o anterior (o save não cresce sem fim)
  s.ano++; s.gp = 0; s.gasto = 0; s.semente = Number(s.semente) + 937;
  const sorteado = sortearCalendario(s.tamanho, s.semente, s.calendario.map((g) => g.pista));
  s.calendario = sorteado.calendario; s.calendarioSemente = sorteado.semente; return s;
}
const api = { CALENDARIO, PISTAS_TRABALHADAS, sortearCalendario, PONTOS, ENGENHEIROS, teto, criar, conferirMontagem, aplicarMontagem, contratarPiloto, contratarEngenheiro, desenvolver, desenvolvimentoRivais, pilotosNoGrid, registrarResultado, tabelas, metas, imersao, proximaTemporada, contrato, objetivos, perspectiva, renovar, propostas, aceitarProposta, metasDeBonus };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1Temporada = api;
})(typeof window !== "undefined" ? window : globalThis);
