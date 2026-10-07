// Carreira de Treinador (parte 2 de 3): as telas de menu. A sede (próximo jogo, último jogo, tabela resumida, fim de
// temporada e histórico), o elenco com a tática, a tabela com a artilharia e o calendário.
const MODOS = [
  [1, "Só o resultado", "A partida corre sozinha; você acompanha a narração."],
  [2, "Com decisões táticas", "O jogo para no intervalo e nos momentos-chave para você mexer no time."],
  [3, "Jogar os lances decisivos", "Também escolhe nos ataques, nas faltas e nos pênaltis."],
];
const MENTALIDADE = ["Retranca", "Defensiva", "Equilibrada", "Ofensiva", "Tudo ao ataque"];
const NIVEL = ["Baixa", "Média", "Alta"];
const ORDEM_POS = ["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PE", "PD", "ATA"];
const NOME_POS = { GOL: "Goleiros", ZAG: "Zagueiros", LD: "Laterais", LE: "Laterais", VOL: "Volantes", MC: "Meio-campistas", MEI: "Meias", PE: "Pontas", PD: "Pontas", ATA: "Atacantes" };
let modoEscolhido = null, rascunho = null;

function desenharTela(id) {
  if (!E) return;
  if (id === "sede") telaSede();
  else if (id === "elenco") telaElenco();
  else if (id === "tabela") telaTabela();
  else if (id === "calendario") telaCalendario();
}
const posicaoDe = (id) => E.tabela.findIndex((l) => l.id === id) + 1;
const placarDe = (j, p) => (p ? `${p[0]} × ${p[1]}` : "×");
const resultadoMeu = (j) => { if (!j.placar) return ""; const [a, b] = j.casa === E.clube ? j.placar : [j.placar[1], j.placar[0]]; return a > b ? "V" : a === b ? "E" : "D"; };

function telaSede() {
  const c = meuClube(), pos = posicaoDe(E.clube);
  $("cabecalho").innerHTML = `${escudo(E.clube)}<div><h1>${h(c.nome)}</h1><span class="info">Técnico ${h(E.tecnico.nome)} · Temporada ${E.ano}${E.temporada > 1 ? ` (${E.temporada}ª)` : ""}${E.rodada > 0 ? ` · ${pos}º lugar` : ""}</span></div><span class="rodada">${E.fim ? "FIM" : `RODADA ${E.rodada + 1}/${E.total}`}</span>`;
  // o próximo jogo (ou a partida em andamento, ou o fim da temporada)
  if (E.fim) {
    const campeao = E.tabela[0], meu = E.tabela[pos - 1];
    $("cartaoJogo").innerHTML = `<h2>Fim da temporada ${E.ano}</h2><div class="confronto"><div>${escudo(campeao.id)}<b>${h(nomeClube(campeao.id))}</b><small class="suave">Campeão, ${campeao.p} pontos</small></div><span class="x">🏆</span><div>${escudo(E.clube)}<b>${pos}º lugar</b><small class="suave">${meu.p} pontos</small></div></div><p class="suave">${h(fraseFinal(pos))}</p><button id="btnNovaTemporada" class="primario largo">Começar a temporada ${E.ano + 1}</button>`;
    $("btnNovaTemporada").onclick = async () => { const r = await pedir("novaTemporada"); if (!r.ok) return toast(r.error); receber(r.estado); toast(`Temporada ${E.ano}: tudo zerado, bola rolando.`); };
  } else {
    const [casa, fora] = E.proximo;
    if (modoEscolhido == null) modoEscolhido = E.modo;
    $("cartaoJogo").innerHTML = `<h2>${E.partida ? "Partida em andamento" : "Próximo jogo"}</h2>
      <div class="confronto"><div>${escudo(casa)}<b>${h(nomeClube(casa))}</b></div><span class="x">×</span><div>${escudo(fora)}<b>${h(nomeClube(fora))}</b></div></div>
      <p class="suave">Rodada ${E.rodada + 1} · ${h(CLUBES[casa].estadio)}${casa === E.clube ? " (em casa)" : " (fora)"}</p>
      ${E.partida ? "" : `<div class="modos" role="group" aria-label="Como jogar">${MODOS.map(([m, t, d]) => `<button data-modo="${m}" aria-pressed="${m === modoEscolhido}">${t}<small>${d}</small></button>`).join("")}</div>`}
      <button id="btnJogar" class="primario largo">${E.partida ? "Voltar para a partida" : "Ir para o jogo"}</button>`;
    for (const b of $("cartaoJogo").querySelectorAll("[data-modo]")) b.onclick = () => { modoEscolhido = +b.dataset.modo; pedir("modo", { modo: modoEscolhido }); telaSede(); };
    $("btnJogar").onclick = jogar;
  }
  // o último jogo
  const u = E.ultimo;
  $("cartaoUltimo").innerHTML = u ? `<h2>Último jogo</h2><div class="confronto"><div>${escudo(u.casa)}<b>${h(nomeClube(u.casa))}</b></div><span class="x">${u.placar[0]} × ${u.placar[1]}</span><div>${escudo(u.fora)}<b>${h(nomeClube(u.fora))}</b></div></div>
    <p class="suave">${u.eventos.filter((e) => e.tipo === "gol").map((e) => `${h(nomeJogador(e.jogador))} ${e.min}'${e.acr ? "+" + e.acr : ""}`).join(" · ") || "Sem gols."}</p>`
    : `<h2>Último jogo</h2><p class="suave">A temporada ainda não começou. O primeiro jogo é o da rodada 1.</p>`;
  // a tabela resumida: o seu lugar e os vizinhos
  const ini = Math.max(0, Math.min(E.tabela.length - 5, pos - 3));
  $("cartaoTabela").innerHTML = `<h2>Tabela</h2><table class="mini-tabela">${E.tabela.slice(ini, ini + 5).map((l, i) => `<tr class="${l.id === E.clube ? "meu" : ""}"><td class="pos ${Temporada.zona(ini + i + 1)}">${ini + i + 1}</td><td>${escudo(l.id)}</td><td>${h(nomeClube(l.id))}</td><td><b>${l.p}</b> pts</td></tr>`).join("")}</table>`;
  $("cartaoHistorico").classList.toggle("hidden", !E.historico.length);
  $("cartaoHistorico").innerHTML = `<h2>Histórico</h2>${E.historico.map((x) => `<p class="suave"><b>${x.ano}</b>: ${x.posicao}º lugar, ${x.pontos} pontos. Campeão: ${h(nomeClube(x.campeao))}${x.artilheiro ? `. Artilheiro: ${h(nomeJogador(x.artilheiro.id))} (${x.artilheiro.gols})` : ""}.</p>`).join("")}`;
}
function fraseFinal(pos) {
  if (pos === 1) return "CAMPEÃO! A torcida invadiu a Vila.";
  if (pos <= 6) return "Vaga na Libertadores. Temporada de respeito.";
  if (pos <= 12) return "Vaga na Sul-Americana. Dá para sonhar mais alto.";
  if (pos > 16) return "Rebaixado. A diretoria quer conversar... (por enquanto, a liga continua a mesma).";
  return "Meio de tabela. Nem festa, nem drama.";
}
async function jogar() {
  $("btnJogar").disabled = true;
  const r = await pedir("jogar", { modo: modoEscolhido ?? E.modo });
  $("btnJogar").disabled = false;
  if (!r.ok) return toast(r.error);
  const rodada = E.rodada;
  receber(r.estado);
  abrirPartida(rodada);
}

// ---------- elenco e tática ----------
function telaElenco() {
  const c = meuClube(), esc = E.escalacao;
  rascunho = rascunho || { formacao: esc.formacao, tatica: { ...esc.tatica }, titulares: esc.titulares ? [...esc.titulares] : null };
  $("eFormacao").innerHTML = Object.keys(Escalacao.FORMATIONS.futebol).map((f) => `<option ${f === rascunho.formacao ? "selected" : ""}>${f}</option>`).join("");
  $("eMentalidade").innerHTML = MENTALIDADE.map((t, i) => `<option value="${i - 2}" ${i - 2 === rascunho.tatica.mentalidade ? "selected" : ""}>${t}</option>`).join("");
  $("ePressao").innerHTML = NIVEL.map((t, i) => `<option value="${i}" ${i === rascunho.tatica.pressao ? "selected" : ""}>${t}</option>`).join("");
  $("eLinha").innerHTML = NIVEL.map((t, i) => `<option value="${i}" ${i === rascunho.tatica.linha ? "selected" : ""}>${t}</option>`).join("");
  $("eAuto").checked = !rascunho.titulares;
  const tit = new Set(rascunho.titulares || autoTitulares());
  const grupos = ORDEM_POS.reduce((acc, p) => { const n = NOME_POS[p]; (acc[n] = acc[n] || []).push(...c.jogadores.filter((j) => j.pos === p)); return acc; }, {});
  $("eLista").innerHTML = Object.entries(grupos).map(([nome, js]) => `<h4>${nome}</h4>` + js.map((j) =>
    `<button class="jogador ${tit.has(j.id) ? "titular" : ""}" data-jogador="${j.id}" aria-pressed="${tit.has(j.id)}"><span class="pos">${j.pos}</span><span>${h(j.nome)}<br><small>${j.idade} anos</small></span><span class="atr">RIT ${j.atr.rit} FIN ${j.atr.fin} PAS ${j.atr.pas} DEF ${j.atr.def}</span><span class="nota">${j.nota}</span></button>`).join("")).join("");
  $("eConta").textContent = rascunho.titulares ? `${rascunho.titulares.length} de 11 titulares escolhidos. Toque num jogador para pôr ou tirar do time.` : "Os titulares marcados são os que a escalação automática escolheria agora. Toque num jogador para escalar do seu jeito.";
}
// quem o motor escalaria sozinho (a mesma conta da partida)
const autoTitulares = () => Motor.escalacaoAutomatica({ jogadores: meuClube().jogadores, formacao: rascunho.formacao });
$("eFormacao").onchange = () => { rascunho.formacao = $("eFormacao").value; telaElenco(); };
for (const [id, k] of [["eMentalidade", "mentalidade"], ["ePressao", "pressao"], ["eLinha", "linha"]]) $(id).onchange = () => { rascunho.tatica[k] = +$(id).value; };
$("eAuto").onchange = () => { rascunho.titulares = $("eAuto").checked ? null : autoTitulares(); telaElenco(); };
$("eLista").addEventListener("click", (e) => {
  const b = e.target.closest("[data-jogador]"); if (!b) return;
  if (!rascunho.titulares) rascunho.titulares = autoTitulares();
  const id = b.dataset.jogador, i = rascunho.titulares.indexOf(id);
  if (i >= 0) rascunho.titulares.splice(i, 1);
  else if (rascunho.titulares.length < 11) rascunho.titulares.push(id);
  else return toast("Já são 11. Tire alguém antes.");
  telaElenco();
});
$("btnSalvarEscalacao").onclick = async () => {
  const r = await pedir("escalacao", rascunho);
  $("erroEscalacao").textContent = r.ok ? "" : r.error;
  if (!r.ok) return;
  rascunho = null; receber(r.estado); toast("Escalação salva.");
};

// ---------- tabela, artilharia e calendário ----------
function telaTabela() {
  $("tituloTabela").textContent = `Tabela · ${BASE.nome} ${E.ano}`;
  $("tTabela").innerHTML = `<table class="tabela-cheia"><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Últimos</th></tr>${E.tabela.map((l, i) =>
    `<tr class="${l.id === E.clube ? "meu" : ""}"><td class="pos ${Temporada.zona(i + 1)}">${i + 1}</td><td class="nome">${escudo(l.id)}${h(nomeClube(l.id))}</td><td><b>${l.p}</b></td><td>${l.j}</td><td>${l.v}</td><td>${l.e}</td><td>${l.d}</td><td>${l.gp}</td><td>${l.gc}</td><td>${l.sg}</td><td><span class="ultimos">${l.ultimos.map((r) => `<i class="${r}" title="${r}"></i>`).join("")}</span></td></tr>`).join("")}</table>`;
  $("tArtilharia").innerHTML = E.artilharia.length ? `<table class="mini-tabela">${E.artilharia.map((a, i) => `<tr class="${JOGADORES[a.id]?.clube === E.clube ? "meu" : ""}"><td class="pos">${i + 1}</td><td>${escudo(JOGADORES[a.id]?.clube)}</td><td>${h(nomeJogador(a.id))}</td><td><b>${a.gols}</b></td></tr>`).join("")}</table>` : `<p class="suave">Ninguém marcou ainda.</p>`;
  $("tituloRodada").textContent = E.rodadaAnterior ? `Rodada ${E.rodada}` : "Última rodada";
  $("tRodada").innerHTML = E.rodadaAnterior ? linhasDeJogos(E.rodadaAnterior.map(([c, f, a, b]) => ({ casa: c, fora: f, placar: [a, b] }))) : `<p class="suave">Nenhuma rodada jogada.</p>`;
}
function linhasDeJogos(jogos) {
  return jogos.map((j) => `<div class="jogo-linha ${j.casa === E.clube || j.fora === E.clube ? "meu" : ""}"><span class="c"><span class="n">${h(nomeClube(j.casa))}</span>${escudo(j.casa)}</span><span class="r">${placarDe(j, j.placar)}</span><span class="f">${escudo(j.fora)}<span class="n">${h(nomeClube(j.fora))}</span></span></div>`).join("");
}
function telaCalendario() {
  $("cLista").innerHTML = E.meus.map((j) => {
    const r = resultadoMeu(j);
    return `<div class="cal-linha ${j.rodada === E.rodada ? "proxima" : ""}"><span class="rd">R${j.rodada + 1}</span><span class="c" style="display:flex;gap:6px;align-items:center;justify-content:flex-end">${h(nomeClube(j.casa))}${escudo(j.casa)}</span><span class="r" style="font:750 14px ui-monospace,monospace">${placarDe(j, j.placar)}</span><span style="display:flex;gap:6px;align-items:center">${escudo(j.fora)}${h(nomeClube(j.fora))}</span><span class="res ${r}">${r}</span></div>`;
  }).join("");
  $("cLista").querySelector(".proxima")?.scrollIntoView({ block: "center" });
}
