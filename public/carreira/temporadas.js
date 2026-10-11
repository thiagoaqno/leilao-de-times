// Carreira: a Estante desta carreira (a estante da galera, de todas as carreiras, fica no telão da Vila: public/index.html,
// GET /api/estante). A estante de cada técnico da sala, as temporadas anteriores (E.arquivo, guardado pelo servidor quando cada temporada
// acaba) e o mural dos técnicos. Mostra o ranking de técnicos (pontos acumulados), e, para cada temporada: os prêmios (artilheiro, maior goleada, melhor
// negócio), os campeões de cada competição (com "Rever a festa"), as tabelas, as chaves e os técnicos da temporada.
const TEMP = { i: null, comp: null };
const ordemComp = (id, c) => (c.tipo === "liga" ? 0 : 1) * 100 + (id === "brasileirao-2026" || id === "serieb-2026" ? 0 : 1) * 10 + Object.keys(NOMES_COMP_ORDEM).indexOf(id);
const NOMES_COMP_ORDEM = { "brasileirao-2026": 0, "serieb-2026": 0.5, "inglaterra-2026": 1, "espanha-2026": 2, "italia-2026": 3, "alemanha-2026": 4, "franca-2026": 5, champions: 6, libertadores: 7, copadobrasil: 8, sulamericana: 9, supermundial: 10, mundial: 11 };

// ---------- a estante ----------
// a cor de cada taça: a da competição (as ligas no ouro)
const COR_TACA = { libertadores: "#f2c14e", champions: "#d9e2ec", mundial: "#ffd86b", supermundial: "#9fd8ff", copadobrasil: "#7fdc95", sulamericana: "#ffae6b" };
const corTaca = (comp) => COR_TACA[comp] || "#e8be4f";
const NOME_CURTO = { libertadores: "Liberta", champions: "Champions", mundial: "Mundial", supermundial: "Super Mundial", copadobrasil: "Copa do BR", sulamericana: "Sul-Americana",
  "brasileirao-2026": "Brasileirão", "serieb-2026": "Série B", "inglaterra-2026": "Premier", "espanha-2026": "La Liga", "italia-2026": "Serie A", "alemanha-2026": "Bundesliga", "franca-2026": "Ligue 1" };
const tacaHTML = (comp, nome, n = 1) => `<span class="taca-est" style="--cor:${corTaca(comp)}" title="${h(nome)}${n > 1 ? ` · ${n} títulos` : ""}"><span class="taca-ic">${ic("taca")}</span>${n > 1 ? `<i>${n}×</i>` : ""}<small>${h(NOME_CURTO[comp] || nome)}</small></span>`;
// uma prateleira: as taças de um técnico (ou a mensagem de prateleira vazia)
const prateleiraHTML = (tacas) => `<div class="prateleira">${tacas.length ? tacas.map((t) => tacaHTML(t.competicao, t.nome, t.n)).join("") : `<span class="prateleira-vazia">Prateleira vazia por enquanto</span>`}</div>`;
// as taças de cada técnico desta carreira, a partir do arquivo das temporadas
function tacasDaCarreira(arquivo) {
  const por = new Map();
  for (const a of arquivo) for (const [id, c] of Object.entries(a.competicoes)) {
    const t = por.get(c.campeao); if (!t && !(a.tecnicos || []).some((x) => x.clube === c.campeao)) continue;
    const x = t || { clube: c.campeao, tacas: {} }; por.set(c.campeao, x);
    const k = x.tacas[id] || (x.tacas[id] = { competicao: id, nome: c.nome, n: 0 }); k.n++;
  }
  return por;
}
function rankingTecnicos(arquivo) {
  const por = new Map();
  for (const a of arquivo) for (const t of a.tecnicos || []) {
    const x = por.get(t.clube) || { clube: t.clube, tecnico: t.tecnico, pontos: 0, titulos: 0, vices: 0, temporadas: 0 };
    x.tecnico = t.tecnico; x.pontos += t.pontos; x.titulos += t.titulos.length; x.vices += t.vices.length; x.temporadas++;
    por.set(t.clube, x);
  }
  return [...por.values()].sort((a, b) => b.pontos - a.pontos || b.titulos - a.titulos || a.clube.localeCompare(b.clube));
}
function premiosHTML(a) {
  const p = a.premios || {}, cards = [];
  // o artilheiro é o da liga do seu clube (as competições não se misturam); arquivos antigos, sem a artilharia por competição, mostram o da temporada
  const liga = a.competicoes[ligaDoClubeCliente()], daLiga = !!(liga && liga.artilharia), art = daLiga ? liga.artilharia[0] : p.artilheiro;
  if (art) cards.push(`<div class="premio"><span class="premio-ic">${ic("chuteira")}</span><small>Artilheiro${daLiga ? ` · ${h(liga.nome)}` : ""}</small><b>${h(art.nome)}</b><span>${escudo(art.clube, 1)} ${art.gols} gols</span></div>`);
  if (p.goleada) cards.push(`<div class="premio"><span class="premio-ic">${ic("bola")}</span><small>Maior goleada</small><b>${escudo(p.goleada.casa, 1)} ${p.goleada.placar[0]} × ${p.goleada.placar[1]} ${escudo(p.goleada.fora, 1)}</b><span>${h(p.goleada.competicao)}</span></div>`);
  if (p.negocio) cards.push(`<div class="premio"><span class="premio-ic">${ic("maleta")}</span><small>Melhor negócio</small><b>${h(p.negocio.nome)}</b><span>${escudo(p.negocio.de, 1)} lucrou ${dinheiro(p.negocio.lucro)}</span></div>`);
  return cards.length ? `<div class="premios">${cards.join("")}</div>` : "";
}
function campeoesHTML(a) {
  const ids = Object.keys(a.competicoes).sort((x, y) => ordemComp(x, a.competicoes[x]) - ordemComp(y, a.competicoes[y]));
  return `<div class="campeoes-grade">${ids.map((id) => { const c = a.competicoes[id];
    return `<div class="campeao-card${c.campeao === E.clube ? " meu" : ""}">${escudo(c.campeao, 2)}<span><small>${h(c.nome)}</small><b>${h(nomeClube(c.campeao))}</b>${c.vice ? `<em>vice: ${h(nomeClube(c.vice))}</em>` : ""}</span>${c.festa ? `<button class="discreto" data-festa-arq="${id}" title="Rever a festa">${ic("taca")}</button>` : ""}</div>`; }).join("")}</div>`;
}
function tecnicosTemporadaHTML(a) {
  if (!a.tecnicos || !a.tecnicos.length) return "";
  return `<h3>Técnicos da temporada</h3><div class="tecnicos-temp">${[...a.tecnicos].sort((x, y) => y.pontos - x.pontos).map((t) => `<div class="tec-temp${t.clube === E.clube ? " meu" : ""}">${escudo(t.clube, 1)}<span><b>${h(t.tecnico)}</b><small>${h(nomeClube(t.clube))} · ${t.posicao ? `${t.posicao}º na liga` : ""}${t.titulos.length ? ` · ${h(t.titulos.join(", "))}` : ""}</small></span><strong>${t.pontos} pts</strong></div>`).join("")}</div>`;
}
function tabelaArquivoHTML(a, id) {
  const c = a.competicoes[id]; if (!c) return "";
  const rows = (tab) => tab.map((l) => ({ ...l, ultimos: [] }));
  const corpo = c.tipo === "liga" ? tabelaHTML(rows(c.tabela)) : `${(c.grupos || []).map((g) => `<section class="grupo-copa"><h3>Grupo ${g.id}</h3>${tabelaHTML(rows(g.tabela))}</section>`).join("")}${chaveHTML(c)}`;
  const artilharia = c.artilharia && c.artilharia.length ? `<h3>Artilharia · ${h(c.nome)}</h3><ol class="artilharia">${c.artilharia.map((x) => `<li class="${x.clube === E.clube ? "meu" : ""}">${fotoHTML(x.id)}<span>${h(x.nome)}<small>${h(nomeClube(x.clube))}</small></span><b>${x.gols}</b></li>`).join("")}</ol>` : "";
  return `<div class="abas-competicoes">${Object.keys(a.competicoes).sort((x, y) => ordemComp(x, a.competicoes[x]) - ordemComp(y, a.competicoes[y])).map((k) => `<button class="${k === id ? "ativa" : ""}" data-temp-comp="${k}">${h(a.competicoes[k].nome)}</button>`).join("")}</div>${corpo}${artilharia}`;
}
function telaTemporadas() {
  const corpo = $("temporadasCorpo"), arquivo = E.arquivo || [];
  if (!arquivo.length) { corpo.innerHTML = `<section class="quadro"><p class="suave">Quando a primeira temporada desta carreira acabar, os campeões, os prêmios, as tabelas e o ranking dos técnicos ficam guardados aqui, e as taças vão para a estante da galera, no telão da Vila.</p></section>`; return; }
  if (TEMP.i == null || !arquivo[TEMP.i]) TEMP.i = arquivo.length - 1;
  const a = arquivo[TEMP.i];
  if (!TEMP.comp || !a.competicoes[TEMP.comp]) TEMP.comp = Object.keys(a.competicoes).includes(ligaDoClubeCliente()) ? ligaDoClubeCliente() : Object.keys(a.competicoes)[0];
  const rank = rankingTecnicos(arquivo);
  const tacas = tacasDaCarreira(arquivo);
  corpo.innerHTML = `<section class="quadro"><h3>Nesta carreira</h3><p class="suave">Pontos: título de liga 10, vice 6, 3º 4; copas 5 (Libertadores, Champions e mundiais 8) e metade no vice.</p>
      <ol class="ranking-tecnicos">${rank.map((t, i) => `<li class="${t.clube === E.clube ? "meu" : ""}"><span class="pos-rank">${i + 1}º</span>${escudo(t.clube, 1)}<span><b>${h(t.tecnico)}</b><small>${h(nomeClube(t.clube))} · ${t.temporadas} temporada${t.temporadas === 1 ? "" : "s"}</small></span>${prateleiraHTML(Object.values((tacas.get(t.clube) || { tacas: {} }).tacas))}<span class="rank-tit">${ic("taca")} ${t.titulos}${t.vices ? ` <small>· ${t.vices} vice${t.vices === 1 ? "" : "s"}</small>` : ""}</span><strong>${t.pontos}</strong></li>`).join("")}</ol></section>
    <div class="abas-competicoes abas-temporadas">${arquivo.map((x, i) => `<button class="${i === TEMP.i ? "ativa" : ""}" data-temp-i="${i}">${x.ano}</button>`).join("")}</div>
    <section class="quadro"><h3>Temporada ${a.ano}</h3>${premiosHTML(a)}<h3>Campeões</h3>${campeoesHTML(a)}${tecnicosTemporadaHTML(a)}</section>
    <section class="quadro"><h3>Tabelas e chaves</h3>${tabelaArquivoHTML(a, TEMP.comp)}</section>`;
}
const ligaDoClubeCliente = () => E.liga || (CLUBES[E.clube] || {}).liga;
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-temp-i]"); if (t) { TEMP.i = +t.dataset.tempI; TEMP.comp = null; return telaTemporadas(); }
  const c = e.target.closest("[data-temp-comp]"); if (c) { TEMP.comp = c.dataset.tempComp; return telaTemporadas(); }
  const f = e.target.closest("[data-festa-arq]"); if (f) { const a = (E.arquivo || [])[TEMP.i]; if (a) Campeoes.reverArquivo(a, f.dataset.festaArq); }
});
