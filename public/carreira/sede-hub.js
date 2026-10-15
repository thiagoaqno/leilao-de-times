// Carreira de Treinador: a sede no jeito da central de carreira dos jogos de futebol. As abas (Central, Meu time, Rival e
// Temporada: cada painel diz em quais aparece, data-na-aba), a faixa "Avançar" com os próximos compromissos (o dia do
// jogo em destaque, com as cores do jogo grande de rivais.js) e o painel "Desenvolvimento do jogador", que passa pelos
// jogadores do elenco (os que mais evoluíram primeiro). telaSede (telas.js) chama tudo daqui; os dados são os do estado.
const ABAS_SEDE = ["central", "time", "rival", "temporada"];
let abaSede = ABAS_SEDE.includes(store.get("carreira:aba")) ? store.get("carreira:aba") : "central";
let devSede = 0; // o jogador do painel de desenvolvimento (a posição na lista)

function mostrarAbaSede(aba) {
  abaSede = ABAS_SEDE.includes(aba) ? aba : "central";
  try { store.set("carreira:aba", abaSede); } catch {}
  $("sede").dataset.aba = abaSede;
  for (const b of document.querySelectorAll("#abasSede [data-aba]")) {
    const ativa = b.dataset.aba === abaSede;
    b.setAttribute("aria-selected", String(ativa)); b.tabIndex = ativa ? 0 : -1;
  }
}
// a troca desliza para o lado (zoom.js); sem ele, troca na hora
const irParaAba = (aba, dir) => (typeof Zoom !== "undefined" ? Zoom.aba(aba, dir) : mostrarAbaSede(aba));
for (const b of document.querySelectorAll("#abasSede [data-aba]")) b.onclick = () => irParaAba(b.dataset.aba);
$("abasSede").addEventListener("keydown", (e) => { // as setas andam entre as abas
  const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) return;
  const i = (ABAS_SEDE.indexOf(abaSede) + k + ABAS_SEDE.length) % ABAS_SEDE.length;
  irParaAba(ABAS_SEDE[i], k); $("abasSede").querySelector(`[data-aba="${ABAS_SEDE[i]}"]`).focus();
});
mostrarAbaSede(abaSede);

// a leitura do próximo adversário, na prévia do jogo: como ele joga, quem é o perigo e o que a SUA formação rende contra ele (os
// confrontos de taticas.js). Os botões trocam a formação na hora; o resto da tática (estilo, pressão) continua na prancheta.
const sinalPct = (n) => (n > 0 ? `+${n}%` : `${n}%`);
function leituraRivalHTML() {
  const r = E.rival; if (!r) return "";
  const est = Taticas.ESTILOS[r.estilo], c = r.confronto, esc = E.escalacao;
  const saldo = c.criar - c.sofrer, classe = saldo > 1 ? "bom" : saldo < -1 ? "ruim" : "";
  const razoes = [...c.razoes.map((x) => [x.texto, x.valor]), ...c.deles.map((x) => [`${x.texto} (a favor dele)`, -x.valor])].filter(([, v]) => v);
  const craques = r.destaques.map((pid) => h(sobrenome(nomeJogador(pid)))).join(", ");
  const melhores = r.melhores.filter((m) => m.formacao !== esc.formacao && m.saldo > saldo).slice(0, 3);
  return `<div class="leitura-rival ${classe}"><span class="sobre">${ic("olho") || ""}Leitura do rival</span>
    <p><b>${h(nomeClube(r.clube))}</b> joga de <b>${h(Taticas.baseDe(r.formacao))}</b>${est && r.estilo !== "equilibrado" ? ` com <b>${h(est.nome)}</b>` : ""} · força ${r.forca} <small>(a sua ${r.minhaForca})</small>${craques ? ` · perigo: ${craques}` : ""}</p>
    <p class="lr-saldo">Com o seu ${h(Taticas.baseDe(esc.formacao))}: <b>${sinalPct(c.criar)}</b> nos seus lances, <b>${sinalPct(c.sofrer)}</b> nos dele.</p>
    ${razoes.length ? `<ul>${razoes.map(([t, v]) => `<li class="${v > 0 ? "bom" : "ruim"}">${h(t)} <small>${v > 0 ? "▲" : "▼"}</small></li>`).join("")}</ul>` : ""}
    ${melhores.length ? `<div class="lr-resp"><small>Respostas melhores:</small>${melhores.map((m) => `<button data-usar-formacao="${h(m.formacao)}" title="${h(Taticas.ROTULO_FORMACAO[m.formacao])}">${h(m.formacao)} <b>${sinalPct(m.saldo)}</b></button>`).join("")}</div>` : `<p class="suave">Sua formação já é uma boa resposta a ele.</p>`}</div>`;
}
// a aba Rival da Sede: o próximo adversário com a leitura inteira (antes ficava na prévia do jogo, que ficou carregada)
function rivalNaSede() {
  const el = $("cartaoRival"), r = E.rival;
  if (!r || E.encerrada || E.fim) { el.innerHTML = `<h3>Rival</h3><p class="suave">${E.fim ? "A temporada acabou: o próximo rival aparece quando ela começar." : "Sem jogo à vista."}</p>`; return; }
  const [casa, fora] = E.proximo || [E.clube, r.clube];
  el.innerHTML = `<div class="rival-topo"><div style="${coresClube(r.clube)}" data-time="${r.clube}" title="Ver o elenco">${escudo(r.clube, 4)}</div>
      <div><span class="sobre">Próximo adversário${E.partida ? " (jogo em andamento)" : ""}</span><h3 class="fx-titulo">${h(nomeClube(r.clube))}</h3>
      <p class="suave">${CLUBES[casa] && CLUBES[casa].selecao ? `Copa do Mundo · campo neutro` : `${casa === E.clube ? "Em casa" : "Fora de casa"} · ${h(CLUBES[casa].estadio)}`}</p></div></div>
    ${leituraRivalHTML()}
    <p class="suave">A formação e o estilo dele contra os seus mudam os lances do jogo. Escolha a resposta aqui, ajuste os detalhes na prancheta.</p>`;
  ligarLeituraRival(el);
}
function ligarLeituraRival(raiz) {
  for (const b of raiz.querySelectorAll("[data-usar-formacao]")) b.onclick = async () => {
    b.disabled = true;
    // o jogo da seleção (Copa do Mundo): a formação vai para a escalação da seleção
    const daCopa = E.proximo && CLUBES[E.proximo[0]] && CLUBES[E.proximo[0]].selecao;
    const r = await pedir(daCopa ? "selecao" : "escalacao", daCopa ? { acao: "escalacao", formacao: b.dataset.usarFormacao } : { formacao: b.dataset.usarFormacao });
    if (!r.ok) { b.disabled = false; return toast(r.error); }
    receber(r.estado); toast(`Formação: ${b.dataset.usarFormacao}. Confira o elenco na prancheta.`);
  };
}

// a faixa do calendário, na prévia do jogo: o último jogo e os próximos, um por quadradinho (como os dias do calendário); o próximo em laranja
const curtoDe = (id) => (CLUBES[id] && CLUBES[id].curto) || nomeClube(id).slice(0, 3).toUpperCase();
function faixaAvancarHTML() {
  const jogos = [...E.meus].sort((a, b) => (a.semana ?? a.rodada) - (b.semana ?? b.rodada));
  const prox = E.proximoJogo ? jogos.findIndex((j) => j.id === E.proximoJogo.id) : jogos.findIndex((j) => !j.placar);
  const ini = prox < 0 ? Math.max(0, jogos.length - 6) : Math.max(0, prox - 1), lista = jogos.slice(ini, ini + 6);
  const nomeComp = (j) => { const c = j.competicao && E.competicoes && E.competicoes[j.competicao]; return c ? c.nome : "Liga"; };
  const cel = (j) => {
    const adv = souEu(j.casa) ? j.fora : j.casa, r = resultadoMeu(j), atual = prox >= 0 && j === jogos[prox], peso = atual ? pesoDe(j) : null;
    return `<li class="av-dia ${atual ? "hoje" : ""} ${j.placar ? "jogado" : ""}" ${peso ? `data-peso="${peso.tema}"` : ""} title="${h(nomeComp(j))}: ${souEu(j.casa) ? "em casa" : "fora"} contra ${h(nomeClube(adv))}">
      <span class="av-quando">${j.semana != null ? `Sem. ${j.semana}` : `R${j.rodada + 1}`}<small>${h(nomeComp(j))}</small></span>
      <span class="av-adv">${escudo(adv, 2)}<b>${h(curtoDe(adv))}</b><i>${CLUBES[j.casa] && CLUBES[j.casa].selecao ? "Copa" : j.casa === E.clube ? "casa" : "fora"}</i></span>
      ${j.placar ? `<span class="av-res ${r}">${souEu(j.casa) ? placarTxt(j.placar) : placarTxt([j.placar[1], j.placar[0]])}</span>` : atual ? `<span class="av-res prox">${ic("apito")}</span>` : ""}</li>`;
  };
  return lista.length ? `<div class="av-topo"><small>Calendário</small><small class="av-ano">Temporada ${E.ano}</small></div>
    <ol class="av-faixa" aria-label="Próximos compromissos">${lista.map(cel).join("")}</ol>` : "";
}

// o painel "Desenvolvimento do jogador": a foto, a nota com a evolução da carreira, a idade, o valor e os seis atributos
function listaDesenvolvimento() {
  return elencoDe(E.clube).sort((a, b) => mudancaNotaDe(b.id) - mudancaNotaDe(a.id) || notaDe(b) - notaDe(a)).map((j) => j.id);
}
function desenvolvimentoNaSede() {
  const box = $("cartaoDesenvolvimento"); if (!box) return;
  const lista = listaDesenvolvimento();
  if (!lista.length) { box.innerHTML = ""; return; }
  devSede = ((devSede % lista.length) + lista.length) % lista.length;
  const pid = lista[devSede], j = JOGADORES[pid], nota = notaDe(j), delta = mudancaNotaDe(pid), energia = energiaDe(pid);
  const gols = (E.artilharia || []).find((a) => a.id === pid), bonus = delta;
  const atr = EIXOS_RADAR.map(([k, nome]) => {
    const base = k === "def" && j.pos === "GOL" ? j.atr.gol : j.atr[k];
    return [k === "def" && j.pos === "GOL" ? "Goleiro" : nome, Math.max(20, Math.min(99, base + bonus))];
  });
  box.innerHTML = `<div class="dev-topo"><h3 class="fx-titulo">Desenvolvimento do jogador</h3>
      <span class="dev-nav"><button class="dev-seta" data-dev="-1" aria-label="Jogador anterior">‹</button><small>${devSede + 1} de ${lista.length}</small><button class="dev-seta" data-dev="1" aria-label="Próximo jogador">›</button></span></div>
    <button class="dev-corpo" data-ficha="${pid}" aria-label="Abrir a ficha de ${h(j.nome)}">
      <span class="dev-foto">${fotoHTML(pid)}</span>
      <span class="dev-nome"><b>${h(sobrenome(j.nome))}</b>
        <span class="dev-nota"><strong>${nota}</strong>${delta ? `<em class="${delta > 0 ? "sobe" : "cai"}">${ic(delta > 0 ? "sobe" : "baixo")}${Math.abs(delta)}</em>` : ""}<i>geral</i><span class="dev-pos">${marcaPos(j.pos)}${h(j.pos)}</span></span></span>
      <span class="dev-info"><small>${Evolucao.idadeNa(j, E.temporada)} anos${gols ? ` · ${gols.gols} gol${gols.gols > 1 ? "s" : ""}` : ""}</small><small>Valor estimado</small><b>${dinheiro(valorAtual(pid))}</b>
        ${delta ? `<em class="dev-carreira ${delta > 0 ? "sobe" : "cai"}">${delta > 0 ? "+" : ""}${delta} na carreira</em>` : `<em class="dev-carreira">${h(POS_NOME[j.pos] || j.pos)}</em>`}</span>
    </button>
    <div class="dev-barra" title="Energia ${energia}%"><span>Energia</span><i style="--v:${energia}%"></i><b>${energia}%</b></div>
    <dl class="dev-atributos">${atr.map(([nome, v]) => `<div><dt>${h(nome)}</dt><dd>${v}${bonus ? `<small class="${bonus > 0 ? "sobe" : "cai"}">${bonus > 0 ? "+" : ""}${bonus}</small>` : ""}</dd></div>`).join("")}</dl>`;
  for (const b of box.querySelectorAll("[data-dev]")) b.onclick = () => { devSede += +b.dataset.dev; desenvolvimentoNaSede(); box.querySelector(`[data-dev="${b.dataset.dev}"]`).focus(); };
  box.querySelector("[data-ficha]").onclick = () => abrirFicha(pid);
}

// o painel Artilharia (aba Temporada): os artilheiros de uma competição por vez, escolhida nas abinhas (as do seu clube primeiro;
// começa na liga). Cada competição tem a sua lista (estado().artilharias); sem o calendário mundial, só a lista da liga.
let compArtilharia = null;
function artilhariaNaSede() {
  const box = $("cartaoArtilharia"); if (!box) return;
  const todas = E.artilharias || {}, minhas = new Set([E.liga, ...E.meus.map((j) => j.competicao)].filter(Boolean));
  const ids = E.competicoes ? Object.keys(E.competicoes).filter((id) => minhas.has(id) || todas[id]).sort((a, b) => minhas.has(b) - minhas.has(a)) : [];
  if (!ids.includes(compArtilharia)) compArtilharia = ids.includes(E.liga) ? E.liga : ids[0] || null;
  const lista = compArtilharia ? todas[compArtilharia] || [] : E.artilharia;
  box.innerHTML = `<div class="linha-titulo"><h3>Artilharia</h3><button class="link" data-ir="tabela">Ver tabela</button></div>
    ${ids.length > 1 ? `<div class="abas-competicoes" role="group" aria-label="Competição">${ids.map((id) => `<button class="${id === compArtilharia ? "ativa" : ""}" data-art-comp="${id}" aria-pressed="${id === compArtilharia}">${h(E.competicoes[id].nome)}</button>`).join("")}</div>` : ""}
    ${artilhariaHTML(lista, compArtilharia)}`;
  box.querySelector("[data-ir]").addEventListener("click", () => { if (compArtilharia) competicaoTabela = compArtilharia; }); // a Tabela abre na mesma competição
  for (const b of box.querySelectorAll("[data-art-comp]")) b.onclick = () => { compArtilharia = b.dataset.artComp; artilhariaNaSede(); box.querySelector(`[data-art-comp="${compArtilharia}"]`).focus(); };
}
