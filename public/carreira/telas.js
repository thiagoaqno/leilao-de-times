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
  else if (id === "trocas") telaTrocas();
  else if (id === "temporadas") telaTemporadas();
  else if (id === "clube") telaClube();
}
const posicaoDe = (id) => E.tabela.findIndex((l) => l.id === id) + 1;
const placarTxt = (p) => (p ? `${p[0]} × ${p[1]}` : "×");
const resultadoMeu = (j) => { if (!j.placar) return ""; const decisivo = j.penaltis || j.placar, [a, b] = j.casa === E.clube ? decisivo : [decisivo[1], decisivo[0]]; return a > b ? "V" : a === b ? "E" : "D"; };
const linhaPenaltis = (p) => p ? `<small class="placar-penaltis">Pên. ${p[0]} × ${p[1]}</small>` : "";
const humor = (m) => (m >= 80 ? "Embalado" : m >= 65 ? "Confiante" : m >= 50 ? "Normal" : m >= 35 ? "Cabisbaixo" : "Em crise");

function telaSede() {
  const c = meuClube(), pos = posicaoDe(E.clube), forma = E.meus.filter((j) => j.placar).slice(-5).map(resultadoMeu);
  $("cabecalho").innerHTML = `<div class="hub-clube">${escudo(E.clube, 4)}
    <div class="cab-nome"><span class="sobre">Técnico ${h(E.tecnico.nome)} · ${h(Temporada.NOMES[c.liga] || "Temporada")} ${E.ano}${E.temporadasMax ? ` · temporada ${E.temporada} de ${E.temporadasMax}` : ""}</span><h1>${h(c.nome)}</h1>
      <span class="forma" aria-label="Últimos resultados">${forma.map((r) => `<i class="res ${r}">${r}</i>`).join("") || "<small>A temporada ainda não começou</small>"}</span></div></div>
    <dl class="cab-numeros">
      <div><dt>Posição</dt><dd>${E.rodada > 0 ? pos + "º" : "—"}</dd></div>
      ${E.meta ? `<div class="meta" title="${h(E.meta.texto)}"><dt>Meta da diretoria</dt><dd class="${E.rodada > 0 && pos <= E.meta.alvo ? "ok" : E.rodada > 0 ? "atras" : ""}">${E.meta.alvo}º<i> ou melhor</i></dd></div>` : ""}
      <div><dt>Rodada</dt><dd>${E.fim ? "Fim" : `${(E.rodadaLiga ?? E.rodada) + 1}<i>/${E.meus.filter((j) => !j.competicao || j.competicao === c.liga).length || E.total}</i>`}</dd></div>
      <div><dt>Caixa</dt><dd class="${E.caixa < 0 ? "neg" : ""}">${dinheiro(E.caixa)}</dd></div>
      <div class="moral"><dt>Moral · ${humor(E.moral)}</dt><dd><span class="medidor"><i style="--v:${E.moral}%"></i></span></dd></div>
      <div class="moral diretoria ${E.gestao.confianca < 35 ? "perigo" : ""}"><dt>Diretoria · ${gestaoSede().nivel}</dt><dd><span class="medidor"><i style="--v:${E.gestao.confianca}%"></i></span></dd></div>
    </dl>
    ${gestaoSede().alertas ? `<ul class="alertas-clube">${gestaoSede().alertas}</ul>` : ""}`;
  telaJogo(pos);
  telaTiles(pos);
  telaEntrada();
  feedNaSede();
  painelTime();
  // o último jogo
  const u = E.ultimo;
  $("cartaoUltimo").innerHTML = u ? `<h3>Último jogo</h3><div class="confronto pequeno"><div>${escudo(u.casa, 2)}<b>${h(nomeClube(u.casa))}</b></div><span class="x">${u.placar[0]} × ${u.placar[1]}${linhaPenaltis(u.penaltis)}</span><div>${escudo(u.fora, 2)}<b>${h(nomeClube(u.fora))}</b></div></div>
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
  $("cartaoHistorico").innerHTML = `<h3>Histórico</h3>${E.historico.map((x) => `<p class="hist"><b>${x.ano}</b> ${x.posicao}º lugar, ${x.pontos} pts.${x.titulos && x.titulos.length ? ` Títulos: ${h(x.titulos.join(", "))}.` : ` Campeão: ${h(nomeClube(x.campeao))}.`}${x.artilheiro ? ` Artilheiro: ${h(nomeJogador(x.artilheiro.id))} (${x.artilheiro.gols})` : ""}${x.meta ? ` Meta da diretoria (${x.meta.alvo}º): <b class="${x.meta.cumprida ? "positivo" : "neg"}">${x.meta.cumprida ? "cumprida" : "não cumprida"}</b>.` : ""}</p>`).join("")}`;
}
// os blocos da gestão: o número de agora de cada um (a força do time, o caixa, a posição, o próximo compromisso)
function telaTiles(pos) {
  const elenco = elencoDe(E.clube), notas = elenco.filter((j) => !fora(j.id)).map(notaDe).sort((a, b) => b - a).slice(0, 11);
  const forca = notas.length ? Math.round(notas.reduce((s, n) => s + n, 0) / notas.length) : 0, desfalques = elenco.filter((j) => fora(j.id)).length;
  $("tileElenco").innerHTML = `<b>${forca}</b><small>força · ${h(E.escalacao.formacao)}${desfalques ? ` · ${desfalques} fora` : ""}</small>`;
  $("atalhoJanela").textContent = E.janela.aberta ? "Janela aberta: contratar e vender" : E.janela.proxima != null ? `Janela abre no jogo ${E.janela.proxima + 1}` : "Janela fechada";
  $("tileMercado").innerHTML = `<b>${dinheiro(E.caixa)}</b><small>${elenco.length} no elenco</small>`;
  $("tileMercado").closest(".tile").classList.toggle("aberta", !!E.janela.aberta);
  const restam = E.gestao.janela.restam;
  if (restam != null && E.janela.aberta) $("atalhoJanela").textContent = restam === 1 ? "ÚLTIMO JOGO com a janela aberta" : `Janela aberta: fecha em ${restam} jogos`;
  $("tileMercado").closest(".tile").classList.toggle("urgente", restam != null && restam <= 2 && !!E.janela.aberta);
  const noUltimoAno = E.gestao.contratos.filter((k) => k.anos <= 1).length;
  $("dadoClube").innerHTML = `<b>${E.gestao.confianca}%</b><small>diretoria${noUltimoAno ? ` · ${noUltimoAno} contrato${noUltimoAno > 1 ? "s" : ""} no fim` : ""}</small>`;
  $("tileTabela").innerHTML = `<b>${E.rodada > 0 ? pos + "º" : "—"}</b><small>${E.rodada > 0 ? `${E.tabela[pos - 1].p} ponto${E.tabela[pos - 1].p === 1 ? "" : "s"}` : "sem jogos ainda"}</small>`;
  const prox = E.proximoJogo, comp = prox && E.competicoes && E.competicoes[prox.competicao];
  $("tileCalendario").innerHTML = prox ? `<b>${escudo(prox.casa === E.clube ? prox.fora : prox.casa, 1)}</b><small>${h(comp ? comp.nome : "Liga")}</small>` : `<b>—</b><small>fim da temporada</small>`;
}
// a diretoria perdeu a paciência: a carreira solo acaba aqui, com o que ficou da passagem pelo clube
function resumoDemissao() {
  const d = E.demitido, hist = E.historico, titulos = hist.reduce((s, x) => s + (x.titulos || []).length, 0);
  return `<div class="fim-carreira demissao"><span class="sobre">Demitido · temporada ${d.temporada}, rodada ${d.rodada + 1}</span><h2>A diretoria do ${h(meuClube().nome)} agradece os serviços</h2>
    <p>Depois da sequência de resultados e do ultimato sem resposta, a confiança acabou. Você passou ${hist.length} temporada${hist.length === 1 ? "" : "s"} completa${hist.length === 1 ? "" : "s"} no clube${titulos ? ` e deixou ${titulos} título${titulos > 1 ? "s" : ""}` : ""}. Reputação final: ${E.gestao.reputacao} (${ClubeRegras.nivelReputacao(E.gestao.reputacao)}).</p>
    <p class="suave">Dá para ver o legado do clube na tela Clube e começar outra carreira pelo botão lá embaixo.</p><button class="primario" data-ir="clube">Ver o legado do clube</button></div>`;
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
  if (E.demitido) { $("cartaoJogo").innerHTML = resumoDemissao(); return; }
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
  if (window.Popups && !(await Popups.confirmarAntesDoJogo())) return; // o aviso de antes do jogo: titulares cansados, improvisados...
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
// os nomes das fases do mata-mata
const NOME_FASE = { preliminar: "Fase preliminar", oitavas: "Oitavas de final", quartas: "Quartas de final", semifinal: "Semifinais", final: "Final" };
// a chave do mata-mata de uma copa, fase por fase (a coluna de cada fase só aparece quando a anterior acabou): cada confronto
// com os clubes, o resultado de cada jogo (ida e volta), o agregado, os pênaltis e quem passou
function confrontoCopaHTML(t) {
  const [a, b] = t.clubes, jogoDePenaltis = t.jogos.find((j) => j.penaltis);
  const linha = (id) => {
    const placares = t.jogos.map((j) => (j.placar ? (j.casa === id ? j.placar[0] : j.placar[1]) : "·"));
    const total = t.agregado ? t.agregado[id === a ? 0 : 1] : "";
    const pen = jogoDePenaltis ? (jogoDePenaltis.casa === id ? jogoDePenaltis.penaltis[0] : jogoDePenaltis.penaltis[1]) : null;
    return `<div class="cc-time ${t.vencedor === id ? "passou" : t.vencedor ? "caiu" : ""}">${escudo(id, 1)}<b>${h(CLUBES[id].curto)}</b><span class="cc-pernas">${t.jogos.length > 1 ? placares.join(" · ") : ""}</span><strong>${total}${pen != null && t.vencedor ? ` <small>(${pen})</small>` : ""}</strong></div>`;
  };
  return `<div class="confronto-copa${a === E.clube || b === E.clube ? " meu" : ""}">${linha(a)}${linha(b)}</div>`;
}
function chaveHTML(c) {
  if (!c.chave || !c.chave.length) return "";
  return `<section class="chave"><h3>Mata-mata</h3><div class="chave-fases">${c.chave.map((f) => `<div class="chave-fase"><h4>${h(NOME_FASE[f.nome] || f.nome)}</h4>${f.confrontos.map(confrontoCopaHTML).join("")}</div>`).join("")}</div></section>`;
}
function telaTabela() {
  $("tituloTabela").textContent = `Competições ${E.ano}`;
  if (E.competicoes) {
    const ids = Object.keys(E.competicoes); if (!competicaoTabela || !E.competicoes[competicaoTabela]) competicaoTabela = Object.keys(E.tabelas || {})[0] || ids[0];
    const c = E.competicoes[competicaoTabela], abas = ids.map((id) => `<button class="${id === competicaoTabela ? "ativa" : ""}" data-competicao="${id}">${h(E.competicoes[id].nome)}</button>`).join("");
    const corpo = c.tipo === "liga" ? tabelaHTML(c.tabela) : `${c.grupos.map((g) => `<section class="grupo-copa"><h3>Grupo ${g.id}</h3>${tabelaHTML(g.tabela)}</section>`).join("")}${chaveHTML(c)}${c.campeao ? `<div class="campeao-copa">${ic("taca")} Campeão: ${escudo(c.campeao, 1)} ${h(nomeClube(c.campeao))}</div>` : ""}`;
    const revFesta = c.festa ? `<button class="discreto festa-btn" data-rever-festa="${competicaoTabela}">${ic("taca")} Rever a festa do campeão</button>` : "";
    $("tTabela").innerHTML = `<div class="abas-competicoes">${abas}</div>${corpo}${revFesta}`;
    $("tTabela").querySelectorAll("[data-rever-festa]").forEach((b) => b.onclick = () => Campeoes.rever(b.dataset.reverFesta));
    $("tTabela").querySelectorAll("[data-competicao]").forEach((b) => b.onclick = () => { competicaoTabela = b.dataset.competicao; telaTabela(); });
  } else $("tTabela").innerHTML = tabelaHTML(E.tabela);
  $("tArtilharia").innerHTML = E.artilharia.length ? `<ol class="artilharia">${E.artilharia.map((a) => `<li class="${donoDe(a.id) === E.clube ? "meu" : ""}"><img class="pix" src="${retrato(a.id)}" alt=""><span>${h(nomeJogador(a.id))}<small>${h(nomeClube(donoDe(a.id)))}</small></span><b>${a.gols}</b></li>`).join("")}</ol>` : `<p class="suave">Ninguém marcou ainda.</p>`;
  $("tituloRodada").textContent = E.rodadaAnterior ? `Rodada ${E.rodada}` : "Última rodada";
  $("tRodada").innerHTML = E.rodadaAnterior ? E.rodadaAnterior.map(([c, f, a, b]) => linhaJogo(c, f, [a, b])).join("") : `<p class="suave">Nenhuma rodada jogada.</p>`;
}
const linhaJogo = (c, f, p) => `<div class="jogo-linha ${c === E.clube || f === E.clube ? "meu" : ""}"><span class="c">${h(nomeClube(c))}${escudo(c, 1)}</span><span class="r">${placarTxt(p)}</span><span class="f">${escudo(f, 1)}${h(nomeClube(f))}</span></div>`;
// o nome de cada fase do mata-mata e dos grupos
const nomeFase = (f) => (String(f).startsWith("grupo-") ? `Grupo ${String(f).slice(6)}` : String(f) === "liga" ? "" : NOME_FASE[f] || f);
function linhaTba(t) {
  const c = E.competicoes[t.competicao], perna = t.pernas > 1 ? ` · ${t.perna === 1 ? "ida" : "volta"}` : "";
  return `<li class="tba"><span class="rd">${h(c ? c.nome : t.competicao)}<small>${h(nomeFase(t.fase))}${perna} · S${t.semana}</small></span><span class="escudo-tba" aria-hidden="true">?</span><span class="adv">A definir <b class="selo-tba">TBA</b></span><span class="r"></span><span class="res"></span></li>`;
}
function telaCalendario() {
  const jogos = E.meus.map((j) => ({ semana: j.semana ?? -1, j })).concat((E.tba || []).map((t) => ({ semana: t.semana, t })));
  jogos.sort((a, b) => a.semana - b.semana);
  $("cLista").innerHTML = `<ol class="linha-tempo">${jogos.map((x) => { if (x.t) return linhaTba(x.t); const j = x.j;
    const r = resultadoMeu(j), adv = j.casa === E.clube ? j.fora : j.casa, janela = Mercado.janelaAberta(j.rodada);
    const atual = E.proximoJogo && j.id === E.proximoJogo.id;
    return `<li class="${atual ? "proxima" : ""} ${j.placar ? "jogado" : ""}"><span class="rd">${j.competicao ? `${h(E.competicoes[j.competicao].nome)}<small>${h([nomeFase(j.fase), `S${j.semana}`].filter(Boolean).join(" · "))}</small>` : `R${j.rodada + 1}`}${janela ? `<i title="Janela aberta">${ic("maleta")}</i>` : ""}</span>${escudo(adv, 2)}<span class="adv">${j.casa === E.clube ? "×" : "@"} ${h(nomeClube(adv))}</span><span class="r">${placarTxt(j.placar)}${linhaPenaltis(j.penaltis)}</span><span class="res ${r}">${r}</span></li>`;
  }).join("")}</ol>`;
  $("cLista").querySelector(".proxima")?.scrollIntoView({ block: "center" });
}
