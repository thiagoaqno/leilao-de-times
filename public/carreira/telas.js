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
  $("cabecalho").innerHTML = `<div class="hub-clube">${escudo(E.clube, 4)}
    <div class="cab-nome"><span class="sobre">Técnico ${h(E.tecnico.nome)} · ${h(Temporada.NOMES[c.liga] || "Temporada")} ${E.ano}${E.temporadasMax ? ` · temporada ${E.temporada} de ${E.temporadasMax}` : ""}</span><h1>${h(c.nome)}</h1>
      <span class="forma" aria-label="Últimos resultados">${forma.map((r) => `<i class="res ${r}">${r}</i>`).join("") || "<small>A temporada ainda não começou</small>"}</span></div></div>
    <dl class="cab-numeros">
      <div><dt>Posição</dt><dd>${E.rodada > 0 ? pos + "º" : "—"}</dd></div>
      <div><dt>Jogo</dt><dd>${E.fim ? "Fim" : `${E.rodada + 1}<i>/${E.total}</i>`}</dd></div>
      <div><dt>Caixa</dt><dd class="${E.caixa < 0 ? "neg" : ""}">${dinheiro(E.caixa)}</dd></div>
      <div class="moral"><dt>Moral · ${humor(E.moral)}</dt><dd><span class="medidor"><i style="--v:${E.moral}%"></i></span></dd></div>
    </dl>`;
  telaJogo(pos);
  telaTiles(pos);
  telaEntrada();
  feedNaSede();
  // o último jogo
  const u = E.ultimo;
  $("cartaoUltimo").innerHTML = u ? `<h3>Último jogo</h3><div class="confronto pequeno"><div>${escudo(u.casa, 2)}<b>${h(nomeClube(u.casa))}</b></div><span class="x">${u.placar[0]} × ${u.placar[1]}</span><div>${escudo(u.fora, 2)}<b>${h(nomeClube(u.fora))}</b></div></div>
    <ul class="gols">${u.eventos.filter((e) => e.tipo === "gol").map((e) => `<li class="${(e.lado === 0 ? u.casa : u.fora) === E.clube ? "nosso" : ""}">${ic("bola")} ${h(nomeJogador(e.jogador))} <span>${e.min}'${e.acr ? "+" + e.acr : ""}</span></li>`).join("") || "<li class='suave'>Sem gols.</li>"}</ul>`
    : `<h3>Último jogo</h3><p class="suave">A estreia é na rodada 1.</p>`;
  // a tabela resumida: o seu lugar e os vizinhos
  const ini = Math.max(0, Math.min(E.tabela.length - 5, pos - 3));
  $("cartaoTabela").innerHTML = `<div class="linha-titulo"><h3>Tabela</h3><button class="link" data-ir="tabela">Ver tudo</button></div><table class="mini-tabela">${E.tabela.slice(ini, ini + 5).map((l, i) => `<tr class="${l.id === E.clube ? "meu" : ""}"><td class="pos ${Temporada.zona(ini + i + 1)}">${ini + i + 1}</td><td>${escudo(l.id, 1)}</td><td class="nome">${h(nomeClube(l.id))}</td><td><b>${l.p}</b></td></tr>`).join("")}</table>`;
  // o dinheiro: caixa, folha e o extrato da última rodada
  const f = E.financas[0];
  $("cartaoFinancas").innerHTML = `<h3>Finanças</h3><div class="numeros-fin"><div><small>Caixa</small><b>${dinheiro(E.caixa)}</b></div><div><small>Folha por mês</small><b>${dinheiro(E.folha)}</b></div></div>
    ${f ? `<ul class="extrato">${f.itens.slice(-6).map(([n, v]) => `<li><span>${h(n)}</span><b class="${v < 0 ? "neg" : "positivo"}">${v > 0 ? "+" : ""}${dinheiro(v)}</b></li>`).join("")}</ul>` : `<p class="suave">O extrato aparece depois do primeiro jogo.</p>`}`;
  // o histórico fica no resumo final quando a carreira acabou
  $("cartaoHistorico").classList.toggle("hidden", !E.historico.length || E.encerrada);
  $("cartaoHistorico").innerHTML = `<h3>Histórico</h3>${E.historico.map((x) => `<p class="hist"><b>${x.ano}</b> ${x.posicao}º lugar, ${x.pontos} pts.${x.titulos && x.titulos.length ? ` Títulos: ${h(x.titulos.join(", "))}.` : ` Campeão: ${h(nomeClube(x.campeao))}.`}${x.artilheiro ? ` Artilheiro: ${h(nomeJogador(x.artilheiro.id))} (${x.artilheiro.gols})` : ""}</p>`).join("")}`;
}
// os blocos da gestão: o número de agora de cada um (a força do time, o caixa, a posição, o próximo compromisso)
function telaTiles(pos) {
  const elenco = elencoDe(E.clube), notas = elenco.filter((j) => !fora(j.id)).map(notaDe).sort((a, b) => b - a).slice(0, 11);
  const forca = notas.length ? Math.round(notas.reduce((s, n) => s + n, 0) / notas.length) : 0, desfalques = elenco.filter((j) => fora(j.id)).length;
  $("tileElenco").innerHTML = `<b>${forca}</b><small>força · ${h(E.escalacao.formacao)}${desfalques ? ` · ${desfalques} fora` : ""}</small>`;
  $("atalhoJanela").textContent = E.janela.aberta ? "Janela aberta: contratar e vender" : E.janela.proxima != null ? `Janela abre no jogo ${E.janela.proxima + 1}` : "Janela fechada";
  $("tileMercado").innerHTML = `<b>${dinheiro(E.caixa)}</b><small>${elenco.length} no elenco</small>`;
  $("tileMercado").closest(".tile").classList.toggle("aberta", !!E.janela.aberta);
  $("tileTabela").innerHTML = `<b>${E.rodada > 0 ? pos + "º" : "—"}</b><small>${E.rodada > 0 ? `${E.tabela[pos - 1].p} ponto${E.tabela[pos - 1].p === 1 ? "" : "s"}` : "sem jogos ainda"}</small>`;
  const prox = E.proximoJogo, comp = prox && E.competicoes && E.competicoes[prox.competicao];
  $("tileCalendario").innerHTML = prox ? `<b>${escudo(prox.casa === E.clube ? prox.fora : prox.casa, 1)}</b><small>${h(comp ? comp.nome : "Liga")}</small>` : `<b>—</b><small>fim da temporada</small>`;
}
// o fim da carreira (a última temporada acabou): os títulos, o artilheiro de cada ano, o melhor negócio e a força do
// elenco temporada a temporada. Não tem "nova temporada".
function resumoCarreira() {
  const hist = E.historico, titulos = hist.flatMap((x) => (x.titulos || []).map((t) => [x.ano, t]));
  const negocio = hist.map((x) => x.negocio && { ...x.negocio, ano: x.ano }).filter(Boolean).sort((a, b) => b.lucro - a.lucro)[0];
  const forcas = hist.map((x) => x.forca).filter((f) => f != null), menor = Math.min(...forcas) - 2, maior = Math.max(...forcas);
  return `<div class="fim-carreira"><span class="sobre">Fim da carreira · ${hist.length} temporada${hist.length > 1 ? "s" : ""} no ${h(meuClube().nome)}</span>
    <div class="tacas">${titulos.length ? titulos.map(([ano, t]) => `<div class="taca-ganha">${ic("taca")}<b>${h(t)}</b><small>${ano}</small></div>`).join("") : `<p class="suave">Nenhum título desta vez. A torcida lembra da raça.</p>`}</div>
    <table class="resumo-anos"><thead><tr><th>Ano</th><th>Liga</th><th>Artilheiro do time</th><th>Força</th></tr></thead><tbody>${hist.map((x) => `<tr>
      <td><b>${x.ano}</b></td><td>${x.posicao}º${x.liga ? ` <small>${h(x.liga)}</small>` : ""}</td>
      <td>${x.artilheiro ? `${h(sobrenome(nomeJogador(x.artilheiro.id)))} <small>${x.artilheiro.gols} gols</small>` : "—"}</td>
      <td>${x.forca != null ? `<span class="barra-forca"><i style="--v:${Math.round((x.forca - menor) / Math.max(1, maior - menor) * 100)}%"></i></span><b>${x.forca}</b>` : "—"}</td></tr>`).join("")}</tbody></table>
    <p class="negocio">${ic("maleta")} ${negocio ? `Melhor negócio: ${h(nomeJogador(negocio.jogador))} vendido ao ${h(nomeClube(negocio.para))} em ${negocio.ano}, com lucro de <b class="positivo">${dinheiro(negocio.lucro)}</b>.` : "Nenhuma venda com lucro na carreira."}</p>
    <p class="suave">A carreira terminou. Para jogar de novo, saia ou exclua esta carreira e assine com um clube novo.</p></div>`;
}
function telaJogo(pos) {
  if (E.encerrada) { $("cartaoJogo").innerHTML = resumoCarreira(); return; }
  if (E.fim) {
    const campeao = E.tabela[0], meu = E.tabela[pos - 1];
    $("cartaoJogo").innerHTML = `<div class="fim-temporada"><span class="sobre">Fim da temporada ${E.ano}</span>
      <div class="podio">${escudo(campeao.id, 4)}<div><b>${h(nomeClube(campeao.id))}</b><small>Campeão · ${campeao.p} pontos</small></div></div>
      <p class="posicao-final"><b>${pos}º</b> lugar para o ${h(meuClube().nome)} (${meu.p} pontos). ${h(fraseFinal(pos))}</p>
      <p class="suave">Na virada, o elenco evolui: os jovens tendem a subir, os veteranos a cair, e alguns se aposentam. A base manda reforços.</p>
      <button id="btnNovaTemporada" class="primario largo">Começar a temporada ${E.ano + 1} (${E.temporada + 1} de ${E.temporadasMax})</button></div>`;
    if (EM_GRUPO) { $("btnNovaTemporada").onclick = () => agirGrupo({ type: "novaTemporada" }); if (!E.anfitriao) { $("btnNovaTemporada").disabled = true; $("btnNovaTemporada").textContent = "Esperando o anfitrião começar a temporada"; } return; }
    $("btnNovaTemporada").onclick = async () => { $("btnNovaTemporada").disabled = true; const r = await pedir("novaTemporada"); if (!r.ok) { $("btnNovaTemporada").disabled = false; return toast(r.error); } receber(r.estado); toast(`Temporada ${E.ano}: bola rolando.`); };
    return;
  }
  const [casa, visitante] = E.proximo;
  if (modoEscolhido == null) modoEscolhido = E.modo;
  const desfalques = E.elenco.filter((pid) => fora(pid));
  const pendentes = E.caixaEntrada.filter((e) => !e.resolvido).length;
  const prox = E.proximoJogo, comp = prox && E.competicoes && E.competicoes[prox.competicao];
  const onde = `${comp ? h(comp.nome) : `Rodada ${E.rodada + 1}`}${prox && prox.fase && prox.fase !== "liga" ? ` · ${h(prox.fase.replace("grupo-", "grupo "))}` : ""} · ${casa === E.clube ? "em casa" : "fora"}`;
  $("cartaoJogo").innerHTML = `<span class="sobre">${E.partida ? "Partida em andamento" : `Próxima partida · ${onde}`}</span>
    <div class="confronto"><div style="${coresClube(casa)}">${escudo(casa, 4)}<b>${h(nomeClube(casa))}</b><small>${posicaoDe(casa) && E.rodada ? posicaoDe(casa) + "º" : ""}</small></div><span class="x">×</span><div style="${coresClube(visitante)}">${escudo(visitante, 4)}<b>${h(nomeClube(visitante))}</b><small>${posicaoDe(visitante) && E.rodada ? posicaoDe(visitante) + "º" : ""}</small></div></div>
    <p class="estadio">${ic("estadio")} ${h(CLUBES[casa].estadio)}</p>
    ${desfalques.length ? `<p class="desfalques">${ic("alerta")} Desfalques: ${desfalques.map((pid) => `${h(sobrenome(nomeJogador(pid)))} (${fora(pid) === "lesao" ? "lesão" : "suspenso"})`).join(", ")}</p>` : ""}
    ${E.partida ? "" : `<div class="modos" role="group" aria-label="Como jogar">${MODOS.map(([m, t, d]) => `<button data-modo="${m}" aria-pressed="${m === modoEscolhido}" title="${h(d)}"><b>${t}</b><small>${d}</small></button>`).join("")}</div>`}
    ${pendentes && !E.partida ? `<p class="pendente">${ic("sino")} ${pendentes} aviso${pendentes > 1 ? "s" : ""} esperando resposta. Se jogar agora, vale a opção padrão.</p>` : ""}
    <button id="btnJogar" class="primario largo cta"><span>${E.partida ? "Voltar para a partida" : "Jogar a próxima partida"}</span>${ic("apito")}</button>`;
  for (const b of $("cartaoJogo").querySelectorAll("[data-modo]")) b.onclick = () => { modoEscolhido = +b.dataset.modo; pedir("modo", { modo: modoEscolhido }); for (const x of $("cartaoJogo").querySelectorAll("[data-modo]")) x.setAttribute("aria-pressed", String(+x.dataset.modo === modoEscolhido)); };
  $("btnJogar").onclick = jogar;
  // na carreira em grupo, a rodada é de todos ao mesmo tempo: quem começa é o anfitrião (grupo.js)
  if (EM_GRUPO) botaoRodadaGrupo();
}
// a caixa de entrada, ao lado: uma central de avisos curtos. O que pede resposta fica aberto, com as opções; o resto é
// uma linha (o título) que abre o texto ao tocar.
function telaEntrada() {
  const lista = [...E.caixaEntrada].sort((a, b) => (a.resolvido === b.resolvido ? 0 : a.resolvido ? 1 : -1)).slice(0, 10);
  const novos = lista.filter((e) => !e.resolvido).length;
  const item = (e) => e.resolvido
    ? `<li class="lido ${e.tipo}"><details><summary><span class="ic-evento">${ic(e.icone || "sino")}</span><b>${h(e.titulo)}</b><small class="rod">J${e.rodada + 1}</small></summary><p>${h(e.texto)}</p>${e.resultado ? `<p class="resultado">${h(e.resultado)}</p>` : ""}</details></li>`
    : `<li class="novo ${e.tipo}"><div class="aviso-topo"><span class="ic-evento">${ic(e.icone || "sino")}</span><b>${h(e.titulo)}</b><small class="rod">J${e.rodada + 1}</small></div><p>${h(e.texto)}</p>
      ${e.tipo === "disputa" ? `<div class="opcoes-evento"><button data-disputa="${e.id}">${ic("martelo")} Abrir a disputa</button></div>`
        : `<div class="opcoes-evento">${e.opcoes.map((o) => `<button data-evento="${e.id}" data-opcao="${o.id}" class="${o.id === e.padrao ? "" : "secundario"}">${h(o.nome)}</button>`).join("")}</div>`}</li>`;
  $("cartaoEntrada").innerHTML = `<div class="linha-titulo"><h3>Caixa de entrada</h3>${novos ? `<span class="selo">${novos} nova${novos > 1 ? "s" : ""}</span>` : ""}</div>${efeitosHTML()}
    ${lista.length ? `<ul class="entrada">${lista.map(item).join("")}</ul>` : `<p class="suave">Nada por enquanto.</p>`}`;
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
let competicaoTabela = null;
const tabelaHTML = (tab) => `<table class="tabela-cheia"><thead><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Últimos</th></tr></thead><tbody>${tab.map((l, i) =>
  `<tr class="${l.id === E.clube ? "meu" : ""}"><td class="pos ${Temporada.zona(i + 1, tab.length)}">${i + 1}</td><td class="nome">${escudo(l.id, 1)}<span>${h(nomeClube(l.id))}</span></td><td><b>${l.p}</b></td><td>${l.j}</td><td>${l.v}</td><td>${l.e}</td><td>${l.d}</td><td>${l.gp}</td><td>${l.gc}</td><td>${l.sg}</td><td><span class="ultimos">${l.ultimos.map((r) => `<i class="res ${r}" title="${r}"></i>`).join("")}</span></td></tr>`).join("")}</tbody></table>`;
function telaTabela() {
  $("tituloTabela").textContent = `Competições ${E.ano}`;
  if (E.competicoes) {
    const ids = Object.keys(E.competicoes); if (!competicaoTabela || !E.competicoes[competicaoTabela]) competicaoTabela = Object.keys(E.tabelas || {})[0] || ids[0];
    const c = E.competicoes[competicaoTabela], abas = ids.map((id) => `<button class="${id === competicaoTabela ? "ativa" : ""}" data-competicao="${id}">${h(E.competicoes[id].nome)}</button>`).join("");
    const corpo = c.tipo === "liga" ? tabelaHTML(c.tabela) : `${c.grupos.map((g) => `<section class="grupo-copa"><h3>Grupo ${g.id}</h3>${tabelaHTML(g.tabela)}</section>`).join("")}<div class="campeao-copa">${c.campeao ? `${ic("taca")} Campeão: ${escudo(c.campeao, 1)} ${h(nomeClube(c.campeao))}` : `Fase atual: ${h(c.fase)}`}</div>`;
    $("tTabela").innerHTML = `<div class="abas-competicoes">${abas}</div>${corpo}`;
    $("tTabela").querySelectorAll("[data-competicao]").forEach((b) => b.onclick = () => { competicaoTabela = b.dataset.competicao; telaTabela(); });
  } else $("tTabela").innerHTML = tabelaHTML(E.tabela);
  $("tArtilharia").innerHTML = E.artilharia.length ? `<ol class="artilharia">${E.artilharia.map((a) => `<li class="${donoDe(a.id) === E.clube ? "meu" : ""}"><img class="pix" src="${retrato(a.id)}" alt=""><span>${h(nomeJogador(a.id))}<small>${h(nomeClube(donoDe(a.id)))}</small></span><b>${a.gols}</b></li>`).join("")}</ol>` : `<p class="suave">Ninguém marcou ainda.</p>`;
  $("tituloRodada").textContent = E.rodadaAnterior ? `Rodada ${E.rodada}` : "Última rodada";
  $("tRodada").innerHTML = E.rodadaAnterior ? E.rodadaAnterior.map(([c, f, a, b]) => linhaJogo(c, f, [a, b])).join("") : `<p class="suave">Nenhuma rodada jogada.</p>`;
}
const linhaJogo = (c, f, p) => `<div class="jogo-linha ${c === E.clube || f === E.clube ? "meu" : ""}"><span class="c">${h(nomeClube(c))}${escudo(c, 1)}</span><span class="r">${placarTxt(p)}</span><span class="f">${escudo(f, 1)}${h(nomeClube(f))}</span></div>`;
function telaCalendario() {
  $("cLista").innerHTML = `<ol class="linha-tempo">${E.meus.map((j) => {
    const r = resultadoMeu(j), adv = j.casa === E.clube ? j.fora : j.casa, janela = Mercado.janelaAberta(j.rodada);
    const atual = E.proximoJogo && j.id === E.proximoJogo.id;
    return `<li class="${atual ? "proxima" : ""} ${j.placar ? "jogado" : ""}"><span class="rd">${j.competicao ? `${h(E.competicoes[j.competicao].nome)}<small>${h(j.fase)} · S${j.semana}</small>` : `R${j.rodada + 1}`}${janela ? `<i title="Janela aberta">${ic("maleta")}</i>` : ""}</span>${escudo(adv, 2)}<span class="adv">${j.casa === E.clube ? "×" : "@"} ${h(nomeClube(adv))}</span><span class="r">${placarTxt(j.placar)}</span><span class="res ${r}">${r}</span></li>`;
  }).join("")}</ol>`;
  $("cLista").querySelector(".proxima")?.scrollIntoView({ block: "center" });
}
