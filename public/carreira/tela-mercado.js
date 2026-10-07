// Carreira de Treinador (parte 5): o mercado. Contratar (os jogadores dos outros clubes, com filtros), o seu elenco
// (pôr à venda, vender) e as movimentações da temporada. A proposta em si fica na ficha do jogador (cartas.js).
let modoMercado = "comprar", mostrar = 24, posMercado = "todas";
const POS_FILTRO = [["todas", "Todas"], ["GOL", "GOL"], ["DEF", "DEF"], ["MEI", "MEI"], ["ATA", "ATA"]];
const precoMax = () => { const v = +$("mPreco").value; return v >= 100 ? Infinity : Math.round(Math.pow(v / 100, 2.2) * 1.2e8 / 1e5) * 1e5; };

// o olheiro: as posições mais fracas do time e 2 ou 3 nomes que cabem no caixa, com o porquê (carreira.js, olheiro)
$("mOlheiro").onclick = async () => {
  $("mOlheiro").disabled = true;
  const r = await pedir("olheiro");
  $("mOlheiro").disabled = false;
  if (!r.ok) return toast(r.error);
  $("mOlheiroLista").innerHTML = r.sugestoes.length ? r.sugestoes.map((s) => `<div class="dica-olheiro">${figurinha(s.jogador)}<p>${h(s.motivo)}</p></div>`).join("")
    : `<p class="suave">O olheiro não achou ninguém que melhore o time e caiba no caixa.</p>`;
};
function telaMercado() {
  $("mCaixa").innerHTML = `${ic("moeda")} ${dinheiro(E.caixa)}`;
  $("mJanela").innerHTML = E.janela.aberta ? `${ic("maleta")} Janela aberta${E.rodada < 4 ? " até a rodada 4" : " até a rodada 21"}. Folha atual: ${dinheiro(E.folha)} por mês.`
    : `${ic("cadeado")} Janela fechada${E.janela.proxima != null ? `: abre na rodada ${E.janela.proxima + 1}` : " até a próxima temporada"}. Dá para olhar e pôr jogadores na lista de venda.`;
  $("mJanela").classList.toggle("fechada", !E.janela.aberta);
  for (const b of $("mModo").children) b.setAttribute("aria-pressed", String(b.dataset.modo === modoMercado));
  $("mFiltros").classList.toggle("hidden", modoMercado !== "comprar");
  $("mPos").innerHTML = POS_FILTRO.map(([v, t]) => `<button data-posm="${v}" aria-pressed="${v === posMercado}">${t}</button>`).join("");
  $("mNotaTxt").textContent = $("mNota").value;
  $("mPrecoTxt").textContent = precoMax() === Infinity ? "qualquer valor" : dinheiro(precoMax());
  if (modoMercado === "comprar") listaCompra();
  else if (modoMercado === "vender") listaVenda();
  else listaNoticias();
}
function listaCompra() {
  const busca = $("mBusca").value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), notaMin = +$("mNota").value, max = precoMax(), cabe = $("mCabe").checked;
  const lista = Object.values(JOGADORES).filter((j) => {
    if (donoDe(j.id) === E.clube || !CLUBES[donoDe(j.id)]) return false; // os aposentados não têm clube
    const n = notaDe(j), v = valorAtual(j.id) * (E.indicacoes[j.id] ? 0.85 : 1);
    if (n < notaMin || v > max || (cabe && v > E.caixa)) return false;
    if (posMercado !== "todas" && GRUPO_TELA[j.pos] !== posMercado) return false;
    return !busca || j.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(busca);
  }).sort((a, b) => (E.indicacoes[b.id] ? 1 : 0) - (E.indicacoes[a.id] ? 1 : 0) || notaDe(b) - notaDe(a));
  $("mLista").innerHTML = lista.length ? lista.slice(0, mostrar).map((j) => figurinha(j.id)).join("") : `<p class="suave vazio">Ninguém com esses filtros.</p>`;
  $("mMais").classList.toggle("hidden", lista.length <= mostrar);
}
function listaVenda() {
  const ordem = ["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PE", "PD", "ATA"];
  const meus = [...E.elenco].sort((a, b) => (E.aVenda.includes(b) ? 1 : 0) - (E.aVenda.includes(a) ? 1 : 0) || ordem.indexOf(JOGADORES[a].pos) - ordem.indexOf(JOGADORES[b].pos));
  $("mLista").innerHTML = `<p class="suave cheio">${E.elenco.length} jogadores (mínimo ${Mercado.ELENCO_MIN}, máximo ${Mercado.ELENCO_MAX}). Toque num jogador para pôr à venda ou vender.</p>` + meus.map((pid) => figurinha(pid)).join("");
  $("mMais").classList.add("hidden");
}
// as movimentações: os posts de mercado do feed (com a arte) e, embaixo, a lista de todas as transferências
function listaNoticias() {
  const posts = (E.feed || []).filter((p) => ["contratacao", "venda", "disputa"].includes(p.tipo));
  $("mLista").innerHTML = (posts.length ? `<div class="feed">${posts.map((p) => postHTML(p)).join("")}</div><h3 class="sub-lista">Todas as movimentações</h3>` : "") + (E.transferencias.length ? `<ul class="movimentos">${E.transferencias.map((t) => `<li class="${t.de === E.clube || t.para === E.clube ? "meu" : ""}">
    <img class="pix" src="${retrato(t.jogador)}" alt=""><span><b>${h(nomeJogador(t.jogador))}</b><small>${escudo(t.de, 1)} ${h(nomeClube(t.de))} → ${escudo(t.para, 1)} ${h(nomeClube(t.para))}</small></span><b>${dinheiro(t.valor)}</b><small class="rod">R${t.rodada + 1}</small></li>`).join("")}</ul>`
    : `<p class="suave vazio">Nenhuma transferência ainda nesta carreira.</p>`);
  $("mMais").classList.add("hidden");
}
$("mModo").addEventListener("click", (e) => { const b = e.target.closest("[data-modo]"); if (!b) return; modoMercado = b.dataset.modo; mostrar = 24; telaMercado(); });
$("mPos").addEventListener("click", (e) => { const b = e.target.closest("[data-posm]"); if (!b) return; posMercado = b.dataset.posm; mostrar = 24; telaMercado(); });
for (const id of ["mBusca", "mNota", "mPreco", "mCabe"]) $(id).addEventListener("input", () => { mostrar = 24; telaMercado(); });
$("mMais").onclick = () => { mostrar += 24; telaMercado(); };
