// Carreira de Treinador: o painel "ao vivo" da partida (#aoVivo, à direita da narração). Mostra as informações do jogo
// (campeonato, rodada ou fase, a classificação dos dois, o jogo de ida e o agregado) e os resultados dos outros jogos da
// mesma semana andando no mesmo relógio da partida: o servidor manda os gols de cada jogo com o minuto (paralelos) e aqui
// o placar de cada um sobe quando o relógio passa por eles. Sem fila: o gol aparece na hora, no placar do jogo e na lista
// dos últimos gols. Na carreira em grupo, os jogos dos outros técnicos entram primeiro, com o relógio deles. Só lê o
// estado (E) e o relógio da partida (J, de partida.js); nada aqui vai para o servidor.
const AV = { chave: "", linhas: [], gols: [], aberto: false };

// o jogo do campeonato dito em palavras: "Rodada 5 de 38", "Grupo B · Rodada 3 de 6", "Oitavas de final · jogo de ida"
function rotuloDoJogo(jg, comp) {
  if (!jg || !comp) return { curto: "", longo: "" };
  if (comp.tipo === "liga") return { curto: `Rodada ${jg.rodada + 1}`, longo: `Rodada ${jg.rodada + 1} de ${(comp.tabela.length - 1) * 2}` };
  if (String(jg.fase).startsWith("grupo-")) {
    const g = jg.fase.slice(6);
    return { curto: `Grupo ${g} · Rodada ${jg.rodada + 1}`, longo: `Fase de grupos · Grupo ${g} · Rodada ${jg.rodada + 1} de ${comp.rodadasGrupo || 6}` };
  }
  const fase = NOME_FASE[jg.fase] || jg.fase, perna = jg.perna ? ` · jogo de ${jg.perna}` : "";
  return { curto: `${fase}${perna}`, longo: `${fase}${perna}` };
}
const jogoDoClube = () => (E.meus || []).find((x) => x.id === J.jogoId) || null;
const compDoJogo = () => (E.competicoes && E.competicoes[J.competicao]) || null;
// "Brasileirão Série A · Rodada 5 de 38 · Maracanã · jogo à noite": a linha de cima da partida
function linhaDoJogo() {
  const comp = compDoJogo(), jg = jogoDoClube(), local = `${h(CLUBES[J.casa].estadio)} · ${textoDoClima(J.clima)}`;
  if (!comp || !jg) return `${J.grupo ? "Rodada da turma" : `Rodada ${J.rodada + 1}`} · ${local}`;
  return `${h(comp.nome)} · ${h(rotuloDoJogo(jg, comp).longo)} · ${local}`;
}
// o placar de agora do meu jogo (os gols que o relógio já passou)
function placarAgora() {
  let g = [0, 0];
  for (let k = 0; k < J.i; k++) if (J.eventos[k].tipo === "gol") g = J.eventos[k].placar;
  return g;
}
// a classificação ANTES do jogo: quando a partida acaba na hora (só o resultado), o estado já traz a tabela com ela
// dentro. Desfaz o jogo nos dois clubes para o painel não entregar o resultado.
function tabelaAntesDoJogo(tab) {
  const u = E.ultimo;
  if (!tab || E.partida || !u || u.jogoId !== J.jogoId || !u.placar) return tab;
  const t = tab.map((l) => ({ ...l }));
  const desfaz = (id, pro, contra) => {
    const l = t.find((x) => x.id === id); if (!l) return;
    l.j--; l.gp -= pro; l.gc -= contra; l.sg = l.gp - l.gc;
    if (pro > contra) { l.v--; l.p -= 3; } else if (pro === contra) { l.e--; l.p--; } else l.d--;
  };
  desfaz(u.casa, u.placar[0], u.placar[1]); desfaz(u.fora, u.placar[1], u.placar[0]);
  return t.sort((a, b) => b.p - a.p || b.v - a.v || b.sg - a.sg || b.gp - a.gp || a.id.localeCompare(b.id));
}
const tabelaDaCompeticao = (comp, jg) => {
  if (comp.tipo === "liga") return tabelaAntesDoJogo(comp.tabela);
  const grupo = String(jg.fase).startsWith("grupo-") && (comp.grupos || []).find((g) => g.id === jg.fase.slice(6));
  return grupo ? tabelaAntesDoJogo(grupo.tabela) : null;
};
// os dois clubes na classificação (antes do jogo) e, na volta, o jogo de ida
function detalhesDoJogo() {
  const comp = compDoJogo(), jg = jogoDoClube(), itens = [];
  if (!comp || !jg) return { itens, ida: null };
  const tab = tabelaDaCompeticao(comp, jg);
  if (tab) {
    const linha = (id) => { const k = tab.findIndex((l) => l.id === id); return k < 0 ? "" : `<li>${escudo(id, 1)}<b>${h(CLUBES[id].curto)}</b> ${k + 1}º · ${tab[k].p} pt${tab[k].p === 1 ? "" : "s"}${tab[k].j ? ` · ${tab[k].j} jogo${tab[k].j === 1 ? "" : "s"}` : ""}</li>`; };
    itens.push(linha(J.casa), linha(J.fora));
  }
  const ida = jg.perna === "volta" ? (comp.jogos || []).find((x) => x.fase === jg.fase && x.rodada === jg.rodada && x.perna === "ida" && x.placar) : null;
  if (ida) itens.push(`<li class="av-ida"><b>Ida</b> ${h(CLUBES[ida.casa].curto)} ${ida.placar[0]} × ${ida.placar[1]} ${h(CLUBES[ida.fora].curto)}</li>`);
  return { itens: itens.filter(Boolean), ida };
}

// ---------- os outros jogos ----------
const paralelosDoJogo = () => (J.grupo && E.rodadaGrupo ? E.rodadaGrupo.paralelos : (E.partida && E.partida.paralelos) || J.paralelos) || [];
// o minuto de um jogo da turma pelo relógio que o servidor mandou (como o do meu jogo)
function minutoDaTurma(o) {
  const r = o.relogio; if (!r) return 0;
  return Math.min(r.limite, r.minuto + (r.rodando ? Math.max(0, agoraServidor() - Math.max(r.t, E.rodadaGrupo.inicio)) / 1000 * r.vel : 0));
}
const golsAte = (gols, min) => gols.filter((g) => tempoDe(g) <= min + 1e-9);
const contar = (gols) => gols.reduce((p, g) => { p[g.lado]++; return p; }, [0, 0]);

function montarAoVivo(chave) {
  AV.chave = chave; AV.linhas = []; AV.gols = [];
  const turma = J.grupo && E.rodadaGrupo ? (E.rodadaGrupo.outros || []).map((o) => ({ ...o, turma: true, placar: null })) : [];
  const paralelos = paralelosDoJogo(), mesma = paralelos.filter((x) => x.competicao === J.competicao), resto = paralelos.filter((x) => x.competicao !== J.competicao);
  const secoes = [];
  if (turma.length) secoes.push({ titulo: "Jogos da turma", itens: turma, aberta: true });
  if (mesma.length) {
    const comp = compDoJogo() || (E.competicoes && E.competicoes[mesma[0].competicao]);
    secoes.push({ titulo: `${comp ? comp.nome : "Mesmo campeonato"} · ${rotuloDoJogo(mesma[0], comp).curto}`, itens: mesma, aberta: true });
  }
  const porComp = new Map();
  for (const x of resto) { if (!porComp.has(x.competicao)) porComp.set(x.competicao, []); porComp.get(x.competicao).push(x); }
  const outras = [...porComp.entries()].map(([id, itens]) => { const comp = E.competicoes && E.competicoes[id]; return { titulo: `${comp ? comp.nome : id} · ${rotuloDoJogo(itens[0], comp).curto}`, itens }; });
  const html = (s) => `<h4>${h(s.titulo)}</h4><ul class="av-lista">${s.itens.map((x) => `<li class="av-jogo" data-id="${h(x.id)}" ${x.turma ? 'data-turma="1"' : ""}><span class="av-time casa"><b>${h(CLUBES[x.casa].curto)}</b>${escudo(x.casa, 1)}</span><span class="av-placar">0 × 0</span><span class="av-time fora">${escudo(x.fora, 1)}<b>${h(CLUBES[x.fora].curto)}</b></span><small class="av-min"></small></li>`).join("")}</ul>`;
  $("avJogos").innerHTML = secoes.map((s) => `<section>${html(s)}</section>`).join("")
    + (outras.length ? `<details class="av-outros"${AV.aberto ? " open" : ""}><summary>Outros campeonatos · ${resto.length} jogo${resto.length === 1 ? "" : "s"}</summary>${outras.map((s) => `<section>${html(s)}</section>`).join("")}</details>` : "")
    + (!secoes.length && !outras.length ? `<p class="suave">Sem outros jogos nesta semana.</p>` : "");
  const d = $("avJogos").querySelector(".av-outros"); if (d) d.addEventListener("toggle", () => { AV.aberto = d.open; });
  const fontes = new Map([...turma, ...paralelos].map((x) => [x.id, x]));
  for (const li of $("avJogos").querySelectorAll(".av-jogo")) {
    const x = fontes.get(li.dataset.id);
    AV.linhas.push({ x, li, placar: li.querySelector(".av-placar"), min: li.querySelector(".av-min"), vistos: 0, txt: "", minTxt: "", fim: false });
  }
  $("avGols").innerHTML = "";
  const comp = compDoJogo(), { itens } = detalhesDoJogo();
  $("avInfo").innerHTML = `<span class="sobre">${comp ? h(comp.nome) : "Partida"}</span><b>${h(jogoDoClube() ? rotuloDoJogo(jogoDoClube(), comp).longo : J.grupo ? "Rodada da turma" : `Rodada ${J.rodada + 1}`)}</b>
    <small>${ic("estadio")} ${h(CLUBES[J.casa].estadio)} · ${textoDoClima(J.clima)}</small>${itens.length ? `<ul class="av-class">${itens.join("")}</ul>` : ""}<p class="av-agregado hidden"></p>`;
  $("pLocal").innerHTML = `${ic("estadio")} ${linhaDoJogo()}`;
}

// cada quadro: o placar de cada jogo pelo relógio, o gol que acabou de sair e o agregado do meu jogo
function atualizarAoVivo() {
  const el = $("aoVivo"); if (!el || telaAtual !== "partida" || !J.casa) return;
  const chave = `${J.jogoId || J.rodada}|${J.casa}|${J.fora}|${paralelosDoJogo().length}|${J.grupo && E.rodadaGrupo ? (E.rodadaGrupo.outros || []).map((o) => o.id).join(",") : ""}`;
  if (chave !== AV.chave) montarAoVivo(chave);
  const acabou = J.completo && J.i >= J.eventos.length, relogio = J.relogio;
  const turmaAgora = (J.grupo && E.rodadaGrupo && E.rodadaGrupo.outros) || [];
  for (const l of AV.linhas) {
    // o jogo de outro técnico: o dado mais novo que o servidor mandou (o relógio e os gols dele mudam a cada pulso)
    const x = l.x.turma ? { ...l.x, ...(turmaAgora.find((o) => o.id === l.x.id) || {}) } : l.x, fim = x.turma ? !!x.fim : acabou || relogio >= 95, min = x.turma ? minutoDaTurma(x) : relogio;
    const gols = fim ? x.gols || [] : golsAte(x.gols || [], min), [a, b] = fim && x.placar ? x.placar : contar(gols);
    const txt = `${a} × ${b}`, minTxt = fim ? "Fim" : min < 0.5 ? "" : min > 45 && min < 46 ? "Int" : `${Math.floor(min)}'`;
    if (txt !== l.txt) {
      if (l.txt !== "") { l.li.classList.remove("gol"); void l.li.offsetWidth; l.li.classList.add("gol"); }
      l.placar.textContent = l.txt = txt;
    }
    if (minTxt !== l.minTxt) { l.min.textContent = l.minTxt = minTxt; l.li.classList.toggle("fim", fim); }
    // os gols que o relógio acabou de passar entram na lista dos últimos (mais novo em cima, sem fila)
    if (gols.length > l.vistos) {
      const todos = [...(x.gols || [])].sort((p, q) => tempoDe(p) - tempoDe(q)), corre = [0, 0];
      todos.forEach((g, k) => { corre[g.lado]++; if (k >= l.vistos && k < gols.length) AV.gols.unshift({ g, casa: x.casa, fora: x.fora, placar: [...corre] }); });
      l.vistos = gols.length;
      if (AV.gols.length > 5) AV.gols.length = 5;
      desenharUltimosGols();
    }
  }
  // o jogo de volta: o agregado ao vivo
  const { ida } = detalhesDoJogo(), ag = el.querySelector(".av-agregado");
  if (ag) {
    ag.classList.toggle("hidden", !ida);
    if (ida) { const p = placarAgora(), txt = `Agregado: ${h(CLUBES[J.casa].curto)} ${p[0] + ida.placar[1]} × ${p[1] + ida.placar[0]} ${h(CLUBES[J.fora].curto)}`; if (ag.dataset.t !== txt) { ag.dataset.t = txt; ag.innerHTML = txt; } }
  }
}
function desenharUltimosGols() {
  $("avGols").innerHTML = AV.gols.length ? `<h4>Últimos gols</h4><ul class="av-gols">${AV.gols.map(({ g, casa, fora, placar }) => {
    const clube = g.lado === 0 ? casa : fora;
    return `<li><span class="min">${minutoTexto(g)}</span>${ic("bola")}<span><b>${h(CLUBES[clube].curto)}</b> ${h(sobrenome(nomeJogador(g.jogador)))}<small>${h(CLUBES[casa].curto)} ${placar[0]} × ${placar[1]} ${h(CLUBES[fora].curto)}</small></span></li>`;
  }).join("")}</ul>` : "";
}
