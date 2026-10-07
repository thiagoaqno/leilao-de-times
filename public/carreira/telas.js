// Carreira de Treinador (parte 3): as telas de menu. A sede (o próximo jogo, a caixa de entrada com os eventos, o último
// jogo, a tabela resumida, o dinheiro, os atalhos, o fim de temporada e o histórico), a tabela e o calendário.
const MODOS = [
  [1, "Só o resultado", "A partida corre sozinha; você acompanha."],
  [2, "Com decisões táticas", "Para no intervalo e nos momentos-chave."],
  [3, "Jogar os lances decisivos", "Você escolhe nos ataques, faltas e pênaltis."],
];
const MENTALIDADE = ["Retranca", "Defensiva", "Equilibrada", "Ofensiva", "Ataque total"];
const NIVEL = ["Baixa", "Média", "Alta"];
let modoEscolhido = null;

function desenharTela(id) {
  if (!E) return;
  if (id === "sede") telaSede();
  else if (id === "elenco") telaElenco();
  else if (id === "mercado") telaMercado();
  else if (id === "tabela") telaTabela();
  else if (id === "calendario") telaCalendario();
  else if (id === "feed") telaFeed();
}
const posicaoDe = (id) => E.tabela.findIndex((l) => l.id === id) + 1;
const placarTxt = (p) => (p ? `${p[0]} × ${p[1]}` : "×");
const resultadoMeu = (j) => { if (!j.placar) return ""; const [a, b] = j.casa === E.clube ? j.placar : [j.placar[1], j.placar[0]]; return a > b ? "V" : a === b ? "E" : "D"; };
const humor = (m) => (m >= 80 ? "Embalado" : m >= 65 ? "Confiante" : m >= 50 ? "Normal" : m >= 35 ? "Cabisbaixo" : "Em crise");

function telaSede() {
  const c = meuClube(), pos = posicaoDe(E.clube), forma = E.meus.filter((j) => j.placar).slice(-5).map(resultadoMeu);
  $("cabecalho").innerHTML = `${escudo(E.clube, 4)}
    <div class="cab-nome"><span class="sobre">Técnico ${h(E.tecnico.nome)} · Temporada ${E.ano}</span><h1>${h(c.nome)}</h1>
      <span class="forma">${forma.map((r) => `<i class="res ${r}">${r}</i>`).join("") || "<small>A temporada ainda não começou</small>"}</span></div>
    <div class="cab-numeros">
      <div><small>Posição</small><b>${E.rodada > 0 ? pos + "º" : "—"}</b></div>
      <div><small>Rodada</small><b>${E.fim ? "Fim" : `${E.rodada + 1}<i>/${E.total}</i>`}</b></div>
      <div><small>Caixa</small><b class="${E.caixa < 0 ? "neg" : ""}">${dinheiro(E.caixa)}</b></div>
      <div class="moral"><small>Moral · ${humor(E.moral)}</small><span class="medidor"><i style="--v:${E.moral}%"></i></span></div>
    </div>`;
  telaJogo(pos);
  telaEntrada();
  feedNaSede();
  // o último jogo
  const u = E.ultimo;
  $("cartaoUltimo").innerHTML = u ? `<h3>Último jogo</h3><div class="confronto pequeno"><div>${escudo(u.casa, 2)}<b>${h(nomeClube(u.casa))}</b></div><span class="x">${u.placar[0]} × ${u.placar[1]}</span><div>${escudo(u.fora, 2)}<b>${h(nomeClube(u.fora))}</b></div></div>
    <ul class="gols">${u.eventos.filter((e) => e.tipo === "gol").map((e) => `<li class="${(e.lado === 0 ? u.casa : u.fora) === E.clube ? "nosso" : ""}">${ic("bola")} ${h(nomeJogador(e.jogador))} <span>${e.min}'${e.acr ? "+" + e.acr : ""}</span></li>`).join("") || "<li class='suave'>Sem gols.</li>"}</ul>`
    : `<h3>Último jogo</h3><p class="suave">A estreia é na rodada 1.</p>`;
  // a tabela resumida: o seu lugar e os vizinhos
  const ini = Math.max(0, Math.min(E.tabela.length - 5, pos - 3));
  $("cartaoTabela").innerHTML = `<h3>Tabela</h3><table class="mini-tabela">${E.tabela.slice(ini, ini + 5).map((l, i) => `<tr class="${l.id === E.clube ? "meu" : ""}"><td class="pos ${Temporada.zona(ini + i + 1)}">${ini + i + 1}</td><td>${escudo(l.id, 1)}</td><td class="nome">${h(nomeClube(l.id))}</td><td><b>${l.p}</b></td></tr>`).join("")}</table>`;
  // o dinheiro: caixa, folha e o extrato da última rodada
  const f = E.financas[0];
  $("cartaoFinancas").innerHTML = `<h3>Finanças</h3><div class="numeros-fin"><div><small>Caixa</small><b>${dinheiro(E.caixa)}</b></div><div><small>Folha por mês</small><b>${dinheiro(E.folha)}</b></div></div>
    ${f ? `<ul class="extrato">${f.itens.slice(-6).map(([n, v]) => `<li><span>${h(n)}</span><b class="${v < 0 ? "neg" : "positivo"}">${v > 0 ? "+" : ""}${dinheiro(v)}</b></li>`).join("")}</ul>` : `<p class="suave">O extrato aparece depois do primeiro jogo.</p>`}`;
  $("atalhoJanela").textContent = E.janela.aberta ? "Janela aberta" : E.janela.proxima != null ? `Janela abre na rodada ${E.janela.proxima + 1}` : "Janela fechada";
  $("cartaoHistorico").classList.toggle("hidden", !E.historico.length);
  $("cartaoHistorico").innerHTML = `<h3>Histórico</h3>${E.historico.map((x) => `<p class="hist"><b>${x.ano}</b> ${x.posicao}º lugar, ${x.pontos} pts. Campeão: ${h(nomeClube(x.campeao))}${x.artilheiro ? `. Artilheiro: ${h(nomeJogador(x.artilheiro.id))} (${x.artilheiro.gols})` : ""}.</p>`).join("")}`;
}
function telaJogo(pos) {
  if (E.fim) {
    const campeao = E.tabela[0], meu = E.tabela[pos - 1];
    $("cartaoJogo").innerHTML = `<div class="fim-temporada"><span class="sobre">Fim da temporada ${E.ano}</span>
      <div class="podio">${escudo(campeao.id, 4)}<div><b>${h(nomeClube(campeao.id))}</b><small>Campeão · ${campeao.p} pontos</small></div></div>
      <p class="posicao-final"><b>${pos}º</b> lugar para o ${h(meuClube().nome)} (${meu.p} pontos). ${h(fraseFinal(pos))}</p>
      <button id="btnNovaTemporada" class="primario largo">Começar a temporada ${E.ano + 1}</button></div>`;
    $("btnNovaTemporada").onclick = async () => { const r = await pedir("novaTemporada"); if (!r.ok) return toast(r.error); receber(r.estado); toast(`Temporada ${E.ano}: bola rolando.`); };
    return;
  }
  const [casa, visitante] = E.proximo;
  if (modoEscolhido == null) modoEscolhido = E.modo;
  const desfalques = E.elenco.filter((pid) => fora(pid));
  const pendentes = E.caixaEntrada.filter((e) => !e.resolvido).length;
  $("cartaoJogo").innerHTML = `<span class="sobre">${E.partida ? "Partida em andamento" : `Rodada ${E.rodada + 1} · ${casa === E.clube ? "em casa" : "fora"}`}</span>
    <div class="confronto"><div style="${coresClube(casa)}">${escudo(casa, 4)}<b>${h(nomeClube(casa))}</b><small>${posicaoDe(casa) && E.rodada ? posicaoDe(casa) + "º" : ""}</small></div><span class="x">×</span><div style="${coresClube(visitante)}">${escudo(visitante, 4)}<b>${h(nomeClube(visitante))}</b><small>${posicaoDe(visitante) && E.rodada ? posicaoDe(visitante) + "º" : ""}</small></div></div>
    <p class="estadio">${ic("estadio")} ${h(CLUBES[casa].estadio)}</p>
    ${desfalques.length ? `<p class="desfalques">${ic("alerta")} Desfalques: ${desfalques.map((pid) => `${h(sobrenome(nomeJogador(pid)))} (${fora(pid) === "lesao" ? "lesão" : "suspenso"})`).join(", ")}</p>` : ""}
    ${E.partida ? "" : `<div class="modos" role="group" aria-label="Como jogar">${MODOS.map(([m, t, d]) => `<button data-modo="${m}" aria-pressed="${m === modoEscolhido}"><b>${t}</b><small>${d}</small></button>`).join("")}</div>`}
    ${pendentes && !E.partida ? `<p class="pendente">${ic("sino")} ${pendentes} aviso${pendentes > 1 ? "s" : ""} esperando resposta. Se jogar agora, vale a opção padrão.</p>` : ""}
    <button id="btnJogar" class="primario largo">${E.partida ? "Voltar para a partida" : "Ir para o jogo"}</button>`;
  for (const b of $("cartaoJogo").querySelectorAll("[data-modo]")) b.onclick = () => { modoEscolhido = +b.dataset.modo; pedir("modo", { modo: modoEscolhido }); for (const x of $("cartaoJogo").querySelectorAll("[data-modo]")) x.setAttribute("aria-pressed", String(+x.dataset.modo === modoEscolhido)); };
  $("btnJogar").onclick = jogar;
}
// a caixa de entrada: os eventos entre as rodadas (os que pedem resposta primeiro)
function telaEntrada() {
  const lista = [...E.caixaEntrada].sort((a, b) => (a.resolvido === b.resolvido ? 0 : a.resolvido ? 1 : -1)).slice(0, 8);
  $("cartaoEntrada").innerHTML = `<h3>Caixa de entrada</h3>${efeitosHTML()}${lista.length ? `<ul class="entrada">${lista.map((e) => `<li class="${e.resolvido ? "lido" : "novo"} ${e.tipo}">
    <span class="ic-evento">${ic(e.icone || "sino")}</span><div><b>${h(e.titulo)}</b><p>${h(e.texto)}</p>
    ${e.resolvido ? (e.resultado ? `<p class="resultado">${h(e.resultado)}</p>` : "") : e.tipo === "disputa" ? `<div class="opcoes-evento"><button data-disputa="${e.id}">${ic("martelo")} Abrir a disputa</button></div>`
      : `<div class="opcoes-evento">${e.opcoes.map((o) => `<button data-evento="${e.id}" data-opcao="${o.id}" class="${o.id === e.padrao ? "" : "secundario"}">${h(o.nome)}</button>`).join("")}</div>`}</div>
    <small class="rod">R${e.rodada + 1}</small></li>`).join("")}</ul>` : `<p class="suave">Nada por enquanto.</p>`}`;
  for (const b of $("cartaoEntrada").querySelectorAll("[data-disputa]")) b.onclick = () => abrirDisputa(b.dataset.disputa);
  for (const b of $("cartaoEntrada").querySelectorAll("[data-evento]")) b.onclick = async () => {
    b.disabled = true;
    const r = await pedir("evento", { id: b.dataset.evento, opcao: b.dataset.opcao });
    if (!r.ok) { b.disabled = false; return toast(r.error); }
    receber(r.estado); if (r.mensagem) toast(r.mensagem);
  };
}
// o que os eventos deixaram valendo: o time, os jogadores e o próximo adversário, com quantos jogos faltam
function efeitosHTML() {
  const juntos = new Map();
  for (const e of E.efeitos || []) {
    const k = `${e.alvo}|${e.de}|${e.ate}`, j = juntos.get(k);
    if (j) j.nota += e.nota; else juntos.set(k, { ...e });
  }
  const lista = [...juntos.values()].filter((e) => e.nota).sort((a, b) => a.de - b.de);
  if (!lista.length) return "";
  const quem = (a) => (a === "time" ? "Time" : a === "rival" ? "Próximo adversário" : sobrenome(nomeJogador(a)));
  const quando = (e) => (e.de > E.rodada ? `a partir da rodada ${e.de + 1}` : e.ate > E.rodada ? `${e.ate - E.rodada + 1} jogos` : "próximo jogo");
  return `<ul class="efeitos">${lista.map((e) => {
    const bom = e.alvo === "rival" ? e.nota < 0 : e.nota > 0;
    return `<li class="${bom ? "bom" : "ruim"}">${ic(bom ? "sobe" : "baixo")}<b>${h(quem(e.alvo))} ${e.nota > 0 ? "+" : ""}${e.nota}</b><small>${quando(e)}</small></li>`;
  }).join("")}</ul>`;
}
function fraseFinal(pos) {
  if (pos === 1) return "CAMPEÃO! A torcida invadiu a Vila.";
  if (pos <= 6) return "Vaga na Libertadores. Temporada de respeito.";
  if (pos <= 12) return "Vaga na Sul-Americana. Dá para sonhar mais alto.";
  if (pos > 16) return "Rebaixado. A diretoria quer conversar...";
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

// ---------- tabela e calendário ----------
function telaTabela() {
  $("tituloTabela").textContent = `${BASE.nome} ${E.ano}`;
  $("tTabela").innerHTML = `<table class="tabela-cheia"><thead><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Últimos</th></tr></thead><tbody>${E.tabela.map((l, i) =>
    `<tr class="${l.id === E.clube ? "meu" : ""}"><td class="pos ${Temporada.zona(i + 1)}">${i + 1}</td><td class="nome">${escudo(l.id, 1)}<span>${h(nomeClube(l.id))}</span></td><td><b>${l.p}</b></td><td>${l.j}</td><td>${l.v}</td><td>${l.e}</td><td>${l.d}</td><td>${l.gp}</td><td>${l.gc}</td><td>${l.sg}</td><td><span class="ultimos">${l.ultimos.map((r) => `<i class="res ${r}" title="${r}"></i>`).join("")}</span></td></tr>`).join("")}</tbody></table>`;
  $("tArtilharia").innerHTML = E.artilharia.length ? `<ol class="artilharia">${E.artilharia.map((a) => `<li class="${donoDe(a.id) === E.clube ? "meu" : ""}"><img class="pix" src="${retrato(a.id)}" alt=""><span>${h(nomeJogador(a.id))}<small>${h(nomeClube(donoDe(a.id)))}</small></span><b>${a.gols}</b></li>`).join("")}</ol>` : `<p class="suave">Ninguém marcou ainda.</p>`;
  $("tituloRodada").textContent = E.rodadaAnterior ? `Rodada ${E.rodada}` : "Última rodada";
  $("tRodada").innerHTML = E.rodadaAnterior ? E.rodadaAnterior.map(([c, f, a, b]) => linhaJogo(c, f, [a, b])).join("") : `<p class="suave">Nenhuma rodada jogada.</p>`;
}
const linhaJogo = (c, f, p) => `<div class="jogo-linha ${c === E.clube || f === E.clube ? "meu" : ""}"><span class="c">${h(nomeClube(c))}${escudo(c, 1)}</span><span class="r">${placarTxt(p)}</span><span class="f">${escudo(f, 1)}${h(nomeClube(f))}</span></div>`;
function telaCalendario() {
  $("cLista").innerHTML = `<ol class="linha-tempo">${E.meus.map((j) => {
    const r = resultadoMeu(j), adv = j.casa === E.clube ? j.fora : j.casa, janela = Mercado.janelaAberta(j.rodada);
    return `<li class="${j.rodada === E.rodada ? "proxima" : ""} ${j.rodada < E.rodada ? "jogado" : ""}"><span class="rd">R${j.rodada + 1}${janela ? `<i title="Janela aberta">${ic("maleta")}</i>` : ""}</span>${escudo(adv, 2)}<span class="adv">${j.casa === E.clube ? "×" : "@"} ${h(nomeClube(adv))}</span><span class="r">${placarTxt(j.placar)}</span><span class="res ${r}">${r}</span></li>`;
  }).join("")}</ol>`;
  $("cLista").querySelector(".proxima")?.scrollIntoView({ block: "center" });
}
