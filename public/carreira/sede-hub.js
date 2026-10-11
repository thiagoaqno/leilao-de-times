// Carreira de Treinador: a sede no jeito da central de carreira dos jogos de futebol. As abas (Central, Meu time e
// Temporada: cada painel diz em quais aparece, data-na-aba), a faixa "Avançar" com os próximos compromissos (o dia do
// jogo em destaque, com as cores do jogo grande de rivais.js) e o painel "Desenvolvimento do jogador", que passa pelos
// jogadores do elenco (os que mais evoluíram primeiro). telaSede (telas.js) chama tudo daqui; os dados são os do estado.
const ABAS_SEDE = ["central", "time", "temporada"];
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
for (const b of document.querySelectorAll("#abasSede [data-aba]")) b.onclick = () => mostrarAbaSede(b.dataset.aba);
$("abasSede").addEventListener("keydown", (e) => { // as setas andam entre as abas
  const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) return;
  const i = (ABAS_SEDE.indexOf(abaSede) + k + ABAS_SEDE.length) % ABAS_SEDE.length;
  mostrarAbaSede(ABAS_SEDE[i]); $("abasSede").querySelector(`[data-aba="${abaSede}"]`).focus();
});
mostrarAbaSede(abaSede);

// a faixa do calendário, na prévia do jogo: o último jogo e os próximos, um por quadradinho (como os dias do calendário); o próximo em laranja
const curtoDe = (id) => (CLUBES[id] && CLUBES[id].curto) || nomeClube(id).slice(0, 3).toUpperCase();
function faixaAvancarHTML() {
  const jogos = [...E.meus].sort((a, b) => (a.semana ?? a.rodada) - (b.semana ?? b.rodada));
  const prox = E.proximoJogo ? jogos.findIndex((j) => j.id === E.proximoJogo.id) : jogos.findIndex((j) => !j.placar);
  const ini = prox < 0 ? Math.max(0, jogos.length - 6) : Math.max(0, prox - 1), lista = jogos.slice(ini, ini + 6);
  const nomeComp = (j) => { const c = j.competicao && E.competicoes && E.competicoes[j.competicao]; return c ? c.nome : "Liga"; };
  const cel = (j) => {
    const adv = j.casa === E.clube ? j.fora : j.casa, r = resultadoMeu(j), atual = prox >= 0 && j === jogos[prox], peso = atual ? pesoDe(j) : null;
    return `<li class="av-dia ${atual ? "hoje" : ""} ${j.placar ? "jogado" : ""}" ${peso ? `data-peso="${peso.tema}"` : ""} title="${h(nomeComp(j))}: ${j.casa === E.clube ? "em casa" : "fora"} contra ${h(nomeClube(adv))}">
      <span class="av-quando">${j.semana != null ? `Sem. ${j.semana}` : `R${j.rodada + 1}`}<small>${h(nomeComp(j))}</small></span>
      <span class="av-adv">${escudo(adv, 2)}<b>${h(curtoDe(adv))}</b><i>${j.casa === E.clube ? "casa" : "fora"}</i></span>
      ${j.placar ? `<span class="av-res ${r}">${j.casa === E.clube ? placarTxt(j.placar) : placarTxt([j.placar[1], j.placar[0]])}</span>` : atual ? `<span class="av-res prox">${ic("apito")}</span>` : ""}</li>`;
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
      <span class="dev-foto"><img class="pix" src="${retrato(pid)}" alt=""></span>
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
