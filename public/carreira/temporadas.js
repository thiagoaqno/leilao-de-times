// Carreira: a Estante desta carreira (a estante da galera, de todas as carreiras, fica no telão da Vila: public/index.html,
// GET /api/estante). A estante por clube desta carreira, as temporadas anteriores (E.arquivo, guardado pelo servidor quando cada temporada
// acaba) e o mural dos técnicos. Mostra o ranking de técnicos (pontos acumulados), e, para cada temporada: os prêmios (artilheiro, maior goleada, melhor
// negócio), os campeões de cada competição (com "Rever a festa"), as tabelas, as chaves e os técnicos da temporada.
const TEMP = { i: null, comp: null, clube: null, busca: "", todos: false };
const ordemComp = (id, c) => (c.tipo === "liga" ? 0 : 1) * 100 + (id === "brasileirao-2026" || id === "serieb-2026" ? 0 : 1) * 10 + Object.keys(NOMES_COMP_ORDEM).indexOf(id);
const NOMES_COMP_ORDEM = { "brasileirao-2026": 0, "serieb-2026": 0.5, "inglaterra-2026": 1, "espanha-2026": 2, "italia-2026": 3, "alemanha-2026": 4, "franca-2026": 5, champions: 6, libertadores: 7, copadobrasil: 8, sulamericana: 9, supermundial: 10, mundial: 11 };

// ---------- a estante dos clubes ----------
const COR_TACA = { libertadores: "#f2c14e", champions: "#d9e2ec", mundial: "#ffd86b", supermundial: "#9fd8ff", copadobrasil: "#7fdc95", sulamericana: "#ffae6b" };
const corTaca = (comp) => COR_TACA[comp] || "#e8be4f";
const NOME_CURTO = { libertadores: "Liberta", champions: "Champions", mundial: "Mundial", supermundial: "Super Mundial", copadobrasil: "Copa do BR", sulamericana: "Sul-Americana",
  "brasileirao-2026": "Brasileirão", "serieb-2026": "Série B", "inglaterra-2026": "Premier", "espanha-2026": "La Liga", "italia-2026": "Serie A", "alemanha-2026": "Bundesliga", "franca-2026": "Ligue 1" };
function arteTaca(id) {
  const mundial = id === "mundial" || id === "supermundial" || id === "copadomundo";
  const orelhuda = id === "champions" || id === "libertadores";
  const liga = id.includes("-2026");
  const corpo = mundial
    ? `<circle cx="48" cy="37" r="24"/><path d="M25 37h46M48 13c-17 12-17 36 0 48m0-48c17 12 17 36 0 48M30 21c12 8 24 8 36 0M30 53c12-8 24-8 36 0" fill="none" stroke="var(--fundo-taca)" stroke-width="3"/>`
    : liga
      ? `<path d="M17 22h62l-6 15c-4 12-14 20-25 20s-21-8-25-20z"/><path d="M17 26C3 22 8 47 27 48M79 26c14-4 9 21-10 22" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>`
      : `<path d="M29 17h38l-4 37c-4 13-26 13-30 0z"/><path d="M29 23C6 9 9 58 35 53M67 23c23-14 20 35-6 30" fill="none" stroke="currentColor" stroke-width="${orelhuda ? 8 : 6}" stroke-linecap="round"/>`;
  return `<svg class="trofeu-silhueta" viewBox="0 0 96 108" aria-hidden="true" fill="currentColor">${corpo}<path d="M44 61h8v20H44zM34 80h28v7H34zM26 88h44v9H26z"/><path d="M22 99h52" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
}
function clubesDaEstante(por) {
  return [...new Set([...Object.keys(CLUBES), ...por.keys()])].sort((a, b) => (por.get(b)?.total || 0) - (por.get(a)?.total || 0) || nomeClube(a).localeCompare(nomeClube(b), "pt-BR"));
}
function listaClubesHTML(clubes, por) {
  const busca = TEMP.busca.trim().toLocaleLowerCase("pt-BR");
  const visiveis = clubes.filter((id) => (TEMP.todos || busca || por.has(id) || id === E.clube) && (!busca || nomeClube(id).toLocaleLowerCase("pt-BR").includes(busca)));
  return visiveis.length ? visiveis.map((id) => `<button class="estante-clube${id === TEMP.clube ? " ativo" : ""}" data-estante-clube="${h(id)}" aria-pressed="${id === TEMP.clube}">${escudo(id, 1)}<span>${h(nomeClube(id))}</span><b>${por.get(id)?.total || 0}</b></button>`).join("") : `<p class="suave">Nenhum clube encontrado.</p>`;
}
function estanteClubesHTML(por) {
  const clubes = clubesDaEstante(por);
  if (!TEMP.clube || !clubes.includes(TEMP.clube)) TEMP.clube = E.clube || clubes[0];
  const registro = por.get(TEMP.clube), tacas = registro ? [...registro.tacas.values()].sort((a, b) => ordemComp(a.competicao, { tipo: a.competicao.includes("-2026") ? "liga" : "copa" }) - ordemComp(b.competicao, { tipo: b.competicao.includes("-2026") ? "liga" : "copa" })) : [];
  return `<section class="quadro estante-clubes"><div class="estante-cabecalho"><div><small class="estante-kicker">MEMÓRIA DA CARREIRA</small><h3>Estante dos clubes</h3><p class="suave">Cada taça representa um título conquistado nesta carreira, inclusive pelos clubes do computador.</p></div><span class="estante-contador">${[...por.values()].reduce((n, x) => n + x.total, 0)} títulos</span></div>
    <div class="estante-layout"><div class="estante-seletor"><label for="estanteBusca">Buscar clube</label><input id="estanteBusca" type="search" placeholder="Nome do clube" value="${h(TEMP.busca)}" autocomplete="off"><div id="estanteClubes" class="estante-lista">${listaClubesHTML(clubes, por)}</div><button class="discreto estante-todos" data-estante-todos="1">${TEMP.todos ? "Mostrar só campeões" : "Ver todos os clubes"}</button></div>
    <div class="estante-vitrine"><div class="estante-vitrine-topo">${escudo(TEMP.clube, 2)}<span><small>ESTANTE DE</small><h4>${h(nomeClube(TEMP.clube))}</h4></span><strong>${registro?.total || 0} <small>${registro?.total === 1 ? "taça" : "taças"}</small></strong></div>
    <div class="estante-prateleira">${tacas.length ? tacas.map((t) => `<div class="trofeu-est" style="--cor:${corTaca(t.competicao)}" title="${h(t.nome)} · ${t.anos.map(h).join(", ")}"><div class="trofeu-arte">${arteTaca(t.competicao)}<img class="trofeu-foto" src="/api/carreira/trofeu/${encodeURIComponent(t.competicao)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">${t.anos.length > 1 ? `<b class="trofeu-qtd">${t.anos.length}×</b>` : ""}</div><b>${h(NOME_CURTO[t.competicao] || t.nome)}</b><small>${t.anos.join(" · ")}</small></div>`).join("") : `<div class="estante-vazia">${ic("taca")}<span>Este clube ainda não conquistou uma taça nesta carreira.</span></div>`}</div>${tacas.length ? `<p class="estante-fonte">Imagens das taças: <a href="https://www.thesportsdb.com/" target="_blank" rel="noopener noreferrer">TheSportsDB</a>. Onde não há foto, aparece a ilustração da competição.</p>` : ""}</div></div></section>`;
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
  const por = EstanteCarreira.conquistas(arquivo, E.competicoes, E.temporada);
  if (!arquivo.length) { corpo.innerHTML = `${estanteClubesHTML(por)}<section class="quadro"><p class="suave">Os campeões, os prêmios, as tabelas e o ranking dos técnicos de cada temporada ficam aqui depois que ela terminar.</p></section>`; return; }
  if (TEMP.i == null || !arquivo[TEMP.i]) TEMP.i = arquivo.length - 1;
  const a = arquivo[TEMP.i];
  if (!TEMP.comp || !a.competicoes[TEMP.comp]) TEMP.comp = Object.keys(a.competicoes).includes(ligaDoClubeCliente()) ? ligaDoClubeCliente() : Object.keys(a.competicoes)[0];
  const rank = rankingTecnicos(arquivo);
  corpo.innerHTML = `${estanteClubesHTML(por)}<section class="quadro"><h3>Ranking dos técnicos</h3><p class="suave">Pontos: título de liga 10, vice 6, 3º 4; copas 5 (Libertadores, Champions e mundiais 8) e metade no vice.</p>
      <ol class="ranking-tecnicos">${rank.map((t, i) => `<li class="${t.clube === E.clube ? "meu" : ""}"><span class="pos-rank">${i + 1}º</span>${escudo(t.clube, 1)}<span><b>${h(t.tecnico)}</b><small>${h(nomeClube(t.clube))} · ${t.temporadas} temporada${t.temporadas === 1 ? "" : "s"}</small></span><span class="rank-tit">${ic("taca")} ${t.titulos}${t.vices ? ` <small>· ${t.vices} vice${t.vices === 1 ? "" : "s"}</small>` : ""}</span><strong>${t.pontos}</strong></li>`).join("")}</ol></section>
    <div class="abas-competicoes abas-temporadas">${arquivo.map((x, i) => `<button class="${i === TEMP.i ? "ativa" : ""}" data-temp-i="${i}">${x.ano}</button>`).join("")}</div>
    <section class="quadro"><h3>Temporada ${a.ano}</h3>${premiosHTML(a)}<h3>Campeões</h3>${campeoesHTML(a)}${tecnicosTemporadaHTML(a)}</section>
    <section class="quadro"><h3>Tabelas e chaves</h3>${tabelaArquivoHTML(a, TEMP.comp)}</section>`;
}
const ligaDoClubeCliente = () => E.liga || (CLUBES[E.clube] || {}).liga;
document.addEventListener("click", (e) => {
  const clube = e.target.closest("[data-estante-clube]"); if (clube) { TEMP.clube = clube.dataset.estanteClube; return telaTemporadas(); }
  const todos = e.target.closest("[data-estante-todos]"); if (todos) { TEMP.todos = !TEMP.todos; return telaTemporadas(); }
  const t = e.target.closest("[data-temp-i]"); if (t) { TEMP.i = +t.dataset.tempI; TEMP.comp = null; return telaTemporadas(); }
  const c = e.target.closest("[data-temp-comp]"); if (c) { TEMP.comp = c.dataset.tempComp; return telaTemporadas(); }
  const f = e.target.closest("[data-festa-arq]"); if (f) { const a = (E.arquivo || [])[TEMP.i]; if (a) Campeoes.reverArquivo(a, f.dataset.festaArq); }
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "estanteBusca") return;
  TEMP.busca = e.target.value;
  $("estanteClubes").innerHTML = listaClubesHTML(clubesDaEstante(EstanteCarreira.conquistas(E.arquivo || [], E.competicoes, E.temporada)), EstanteCarreira.conquistas(E.arquivo || [], E.competicoes, E.temporada));
});
