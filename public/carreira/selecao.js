// Carreira de Treinador: a Copa do Mundo no navegador (carreira-copa.js no servidor). De 2 em 2 temporadas o futebol de clubes
// para no meio do ano e as 48 seleções jogam a Copa. O técnico recebe UMA proposta, pela campanha da temporada anterior: o
// painel da Sede (#cartaoSelecao) mostra a proposta (aceitar ou recusar) e, depois, a seleção dele. A tela Seleção (#selecao)
// tem a convocação (o "mercado" da seleção: só os jogadores daquele país), a escalação e o grupo da Copa; no Mercado, o modo
// "Seleção" mostra a mesma lista. As partidas usam a tela da partida de sempre (partida.js: meuTime, J.selecao).
let abaSelecao = "convocacao", posSelecao = "todas", buscaSelecao = "";
const minhaSel = () => (E && E.selecao && E.selecao.status === "aceita" && E.selecao.convocados ? E.selecao : null);
const nomeSel = () => (E && E.selecao ? E.selecao.nome : "");
async function agirSelecao(dados) {
  const r = await pedir("selecao", dados);
  if (!r.ok) { toast(r.error); return false; }
  receber(r.estado);
  return true;
}
// a linha de um jogador na convocação: o rosto, o nome, a posição, a nota, o clube (o da carreira ou o de verdade) e o botão
function linhaSel(pid, convocado, fechada) {
  const j = JOGADORES[pid]; if (!j) return "";
  const s = E.selecao, clube = (s.clubes || {})[pid] || (JOGADORES[pid].origem && donoDe(pid)) || null, foraTxt = (s.fora || {})[pid];
  const onde = clube && CLUBES[clube] ? `${escudo(clube, 1)} ${h(nomeClube(clube))}` : j.clubeReal ? h(j.clubeReal) : j.ficticio ? "Sem clube na base" : "";
  const energia = (s.energia || {})[pid];
  return `<li class="sel-linha${convocado ? " convocado" : ""}" data-sel="${h(pid)}">
    ${fotoHTML(pid)}<span class="sel-nome"><b>${h(j.nome)}</b><small>${onde}${foraTxt ? ` · <em class="neg">${foraTxt === "lesao" ? "lesionado" : "suspenso"}</em>` : ""}${convocado && energia != null && energia < 100 ? ` · energia ${energia}%` : ""}</small></span>
    <span class="sel-pos">${h(j.pos)}</span><span class="sel-nota ${faixa(notaDe(j))}">${notaDe(j)}</span>
    ${fechada ? "" : convocado ? `<button class="secundario mini" data-tirar="${h(pid)}">Tirar</button>` : `<button class="primario mini" data-convocar="${h(pid)}">Convocar</button>`}</li>`;
}
// o "mercado" da seleção: só os jogadores do país, com filtro de posição e busca
function listaDoMercadoDaSelecao() {
  const s = minhaSel(); if (!s) return "";
  const conv = new Set(s.convocados), norm = (x) => String(x).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const lista = s.pool.filter((pid) => JOGADORES[pid] && !conv.has(pid) && (posSelecao === "todas" || GRUPO_TELA[JOGADORES[pid].pos] === posSelecao) && (!buscaSelecao || norm(JOGADORES[pid].nome).includes(norm(buscaSelecao))));
  return `<div class="sel-filtros"><input type="search" id="selBusca" placeholder="Buscar em ${h(s.nome)}" value="${h(buscaSelecao)}" aria-label="Buscar jogador"><div class="segmentos">${POS_FILTRO.map(([v, t]) => `<button data-possel="${v}" aria-pressed="${v === posSelecao}">${t}</button>`).join("")}</div></div>
    <ul class="sel-lista">${lista.map((pid) => linhaSel(pid, false, s.fechada)).join("") || `<li class="suave vazio">Ninguém com esse filtro.</li>`}</ul>`;
}
function contagemSel(s) {
  const gols = s.convocados.filter((pid) => JOGADORES[pid] && JOGADORES[pid].pos === "GOL").length;
  const ok = s.convocados.length >= s.minimo && gols >= s.goleiros;
  return `<p class="sel-conta ${ok ? "ok" : "falta"}">${ic(ok ? "aperto" : "alerta")} <b>${s.convocados.length}/${s.limite}</b> convocados · ${gols} goleiro${gols === 1 ? "" : "s"}${ok ? "" : ` · precisa de ${s.minimo} nomes e ${s.goleiros} goleiros (falta completar: na estreia, a lista se completa sozinha)`}</p>`;
}
// a escalação da seleção: a formação, o estilo e a mentalidade; os titulares saem da escalação automática (na partida, as paradas
// táticas mexem como no clube)
function escalacaoSel(s) {
  const esc = s.escalacao, time = meuTimeSel(), campo = Motor.escalacaoDetalhada(time), jog = Object.fromEntries(time.jogadores.map((j) => [j.id, j]));
  const esquema = Taticas.baseDe(esc.formacao);
  return `<div class="controle"><span class="rotulo">Formação</span><div class="segmentos largos">${Taticas.ESQUEMAS.map((f) => `<button data-formsel="${f}" aria-pressed="${f === esquema}">${f}</button>`).join("")}</div>
      <span class="rotulo sub">Variação</span><div class="segmentos largos">${Taticas.variacoesDe(esquema).map((f) => `<button data-formsel="${f}" aria-pressed="${f === esc.formacao}">${h(Taticas.ROTULO_FORMACAO[f] || f)}</button>`).join("")}</div></div>
    <div class="controle"><span class="rotulo">Mentalidade</span><div class="segmentos">${MENTALIDADE.map((t, i) => `<button data-mentsel="${i - 2}" aria-pressed="${esc.tatica.mentalidade === i - 2}">${t}</button>`).join("")}</div></div>
    <div class="controle"><span class="rotulo">Estilo de jogo</span><div class="segmentos largos">${Taticas.NOMES_ESTILOS.map((e) => `<button data-estsel="${e}" aria-pressed="${esc.tatica.estilo === e}">${h(Taticas.ESTILOS[e].nome)}</button>`).join("")}</div></div>
    <h3>Os 11 que vão a campo</h3><ol class="sel-onze">${campo.map((v) => { const j = v.id && jog[v.id]; return `<li><span class="sel-pos">${h(v.fino || v.pos || "")}</span>${j ? `<b>${h(j.nome)}</b><span class="sel-nota ${faixa(j.nota)}">${j.nota}</span>` : `<em class="suave">vaga aberta</em>`}</li>`; }).join("")}</ol>
    <p class="suave">Os titulares saem da escalação automática com os convocados disponíveis. Na partida, as paradas táticas mexem no time como no clube.</p>`;
}
const meuTimeSel = () => { const s = minhaSel(); return { id: s.id, jogadores: s.convocados.filter((pid) => JOGADORES[pid] && !(s.fora || {})[pid]).map((pid) => ({ ...JOGADORES[pid], nota: notaDe(JOGADORES[pid]) })), formacao: s.escalacao.formacao, tatica: s.escalacao.tatica, energia: s.energia || {} }; };
// o grupo da Copa e a chave: o que já aconteceu (o estado só manda o que está visível)
function grupoSel(s) {
  const comp = E.competicoes && E.competicoes.copadomundo; if (!comp) return `<p class="suave">A Copa ainda não tem jogos.</p>`;
  const g = comp.grupos.find((x) => x.clubes.includes(s.id));
  const meus = (E.meus || []).filter((j) => j.competicao === "copadomundo");
  return `${g ? `<h3>Grupo ${h(g.id)}</h3><table class="mini-tabela"><thead><tr><th colspan="3">Seleção</th><th>J</th><th>SG</th><th>Pts</th></tr></thead><tbody>${g.tabela.map((l, i) => `<tr class="${l.id === s.id ? "meu" : ""}" data-time="${l.id}"><td class="pos ${i < 2 ? "libertadores" : i === 2 ? "sulamericana" : ""}">${i + 1}</td><td>${escudo(l.id, 1)}</td><td class="nome">${h(nomeClube(l.id))}</td><td>${l.j}</td><td>${l.sg}</td><td><b>${l.p}</b></td></tr>`).join("")}</tbody></table>
    <p class="suave">Os 2 primeiros de cada grupo e os 8 melhores terceiros vão aos 16 avos de final.</p>` : ""}
    <h3>Jogos da seleção</h3><ul class="sel-jogos">${meus.map((j) => `<li>${escudo(j.casa, 1)} ${h(nomeClube(j.casa))} <b>${j.placar ? `${j.placar[0]} × ${j.placar[1]}` : "×"}</b> ${h(nomeClube(j.fora))} ${escudo(j.fora, 1)} <small>${h(NOME_FASE[j.fase] || String(j.fase).replace("grupo-", "Grupo "))} · S${j.semana}</small></li>`).join("") || `<li class="suave">Os jogos aparecem quando a Copa define os confrontos.</li>`}</ul>`;
}
function telaSelecao() {
  const corpo = $("selecaoCorpo"); if (!corpo || !E) return;
  const s = E.selecao, copa = E.copa;
  if (!copa || !s) { corpo.innerHTML = `<div class="quadro"><p class="suave">${copa ? `${h(copa.nome)} na pausa do meio da temporada (semana ${copa.semana}). Você não recebeu proposta de seleção nesta edição.` : "A Copa do Mundo acontece de 2 em 2 temporadas (na 2ª, na 4ª...), numa pausa no meio da temporada. No começo da temporada da Copa chega a proposta de uma seleção, pela campanha da temporada anterior."}</p></div>`; return; }
  const cab = `<header class="quadro sel-cab" style="--sel:${CLUBES[s.id].cores[0]};--sel2:${CLUBES[s.id].cores[1]}">${escudo(s.id, 5)}<div><span class="sobre">${h(copa.nome)}${copa.sede ? ` · ${h(copa.sede)}` : ""}</span><h2>${h(s.nome)}</h2>
    <p>${s.status === "pendente" ? "Proposta esperando a sua resposta." : s.status === "recusada" ? "Você recusou a proposta." : s.campanha ? `${h(s.campanha.lugar)} · ${s.campanha.v}V ${s.campanha.e}E ${s.campanha.d}D, ${s.campanha.gp} gols marcados` : `A estreia é na semana ${copa.semana}: o clube para enquanto a seleção joga.`}</p></div></header>`;
  if (s.status !== "aceita") { corpo.innerHTML = cab + `<div class="quadro">${propostaHTML(s)}</div>`; ligarProposta(corpo); return; }
  const abas = [["convocacao", "Convocação"], ["escalacao", "Escalação"], ["grupo", "Copa"]];
  const conteudo = abaSelecao === "escalacao" ? escalacaoSel(s) : abaSelecao === "grupo" ? grupoSel(s)
    : `${contagemSel(s)}${s.fechada ? `<p class="aviso fechada">${ic("cadeado")} A Copa começou: a lista está fechada.</p>` : `<div class="sel-acoes"><button class="secundario" data-selacao="auto">Convocação automática</button><button class="discreto" data-selacao="limpar">Limpar a lista</button></div>`}
      <div class="duas sel-duas"><section><h3>Convocados</h3><ul class="sel-lista">${[...s.convocados].sort((a, b) => ordemPos(a) - ordemPos(b) || notaDe(JOGADORES[b] || {}) - notaDe(JOGADORES[a] || {})).map((pid) => linhaSel(pid, true, s.fechada)).join("") || `<li class="suave vazio">Ninguém convocado ainda.</li>`}</ul></section>
      <section><h3>Mercado da seleção <small class="suave">só jogadores de ${h(s.nome)}</small></h3>${listaDoMercadoDaSelecao()}</section></div>`;
  corpo.innerHTML = cab + `<div class="segmentos grande sel-abas" role="group" aria-label="Partes da seleção">${abas.map(([k, t]) => `<button data-abasel="${k}" aria-pressed="${k === abaSelecao}">${t}</button>`).join("")}</div><div class="quadro sel-conteudo">${conteudo}</div>`;
  ligarSelecao(corpo);
}
const ORDEM_POS = ["GOL", "ZAG", "LD", "LE", "VOL", "MC", "MEI", "PE", "PD", "ATA"];
const ordemPos = (pid) => ORDEM_POS.indexOf((JOGADORES[pid] || {}).pos);
function ligarSelecao(raiz) {
  raiz.onclick = async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.abasel) { abaSelecao = b.dataset.abasel; return telaSelecao(); }
    if (b.dataset.possel) { posSelecao = b.dataset.possel; return redesenharSelecao(); }
    if (b.dataset.convocar) return agirSelecao({ acao: "convocar", jogador: b.dataset.convocar });
    if (b.dataset.tirar) return agirSelecao({ acao: "tirar", jogador: b.dataset.tirar });
    if (b.dataset.selacao === "limpar" && !confirm("Tirar todos da lista?")) return;
    if (b.dataset.selacao) return agirSelecao({ acao: b.dataset.selacao });
    const s = minhaSel(); if (!s) return;
    if (b.dataset.formsel) return agirSelecao({ acao: "escalacao", formacao: b.dataset.formsel });
    if (b.dataset.mentsel) return agirSelecao({ acao: "escalacao", tatica: { ...s.escalacao.tatica, mentalidade: +b.dataset.mentsel } });
    if (b.dataset.estsel) return agirSelecao({ acao: "escalacao", tatica: { ...s.escalacao.tatica, estilo: b.dataset.estsel } });
  };
  const busca = raiz.querySelector("#selBusca");
  if (busca) busca.oninput = () => { buscaSelecao = busca.value; redesenharSelecao(true); };
}
// redesenha a lista sem perder o foco da busca
function redesenharSelecao(foco) {
  if (telaAtual === "mercado") telaMercado(); else telaSelecao();
  if (foco) { const b = document.getElementById("selBusca"); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }
}
// a proposta: quem chama, por quê, e os dois botões (sem resposta, você assume quando a Copa chegar)
function propostaHTML(s) {
  if (s.status === "recusada") return `<p>Você recusou a proposta de ${h(s.nome)}. A Copa acontece na pausa do meio da temporada, sem você no banco.</p>`;
  return `<p class="sel-motivo">${h(s.motivo || "")}</p><p>Você continua no clube: a seleção joga na pausa do meio da temporada (a Copa do Mundo para o futebol de clubes). A convocação é o mercado da seleção: só jogadores de ${h(s.nome)}.</p>
    <div class="sel-acoes"><button class="primario" data-proposta="aceitar">Aceitar ${h(s.nome)}</button><button class="secundario" data-proposta="recusar">Recusar</button></div>
    <p class="suave">Sem resposta até a pausa, você assume a seleção com a convocação automática.</p>`;
}
function ligarProposta(raiz) {
  for (const b of raiz.querySelectorAll("[data-proposta]")) b.onclick = async () => {
    if (b.dataset.proposta === "recusar" && !confirm(`Recusar a seleção de ${nomeSel()}? Não chega outra proposta nesta Copa.`)) return;
    b.disabled = true;
    if (await agirSelecao({ acao: b.dataset.proposta }) && b.dataset.proposta === "aceitar") toast(`Você é o técnico da seleção: ${nomeSel()}.`);
    b.disabled = false;
  };
}
// o painel da Sede: a proposta ou a seleção, com o atalho para a tela
function selecaoNaSede() {
  const box = $("cartaoSelecao"), tile = $("tileSelecao"); if (!box) return;
  const s = E.selecao, copa = E.copa;
  box.classList.toggle("hidden", !copa);
  if (tile) { tile.classList.toggle("hidden", !(copa && s)); tile.hidden = !(copa && s); }
  if (!copa) { box.innerHTML = ""; return; }
  if (tile && s) $("dadoSelecao").innerHTML = `<b>${escudo(s.id, 1)}</b><small>${s.status === "aceita" ? `${(s.convocados || []).length}/${s.limite || 26} convocados` : s.status === "pendente" ? "proposta" : "recusada"}</small>`;
  if (!s) { box.innerHTML = `<h3>${ic("taca")} ${h(copa.nome)}</h3><p class="suave">A Copa para o futebol de clubes na semana ${copa.semana}${copa.sede ? ` (${h(copa.sede)})` : ""}. Os jogos da seleção não são seus nesta edição.</p>`; return; }
  box.style.cssText = `--sel:${CLUBES[s.id].cores[0]};--sel2:${CLUBES[s.id].cores[1]}`;
  const topo = `<div class="sel-topo">${escudo(s.id, 3)}<div><span class="sobre">${h(copa.nome)}${copa.sede ? ` · ${h(copa.sede)}` : ""}</span><h3>${s.status === "pendente" ? `Proposta: ${h(s.nome)}` : s.status === "aceita" ? `Técnico de ${h(s.nome)}` : `${h(s.nome)} (recusada)`}</h3></div></div>`;
  if (s.status === "pendente") { box.innerHTML = topo + propostaHTML(s); ligarProposta(box); return; }
  if (s.status === "recusada") { box.innerHTML = topo + `<p class="suave">A Copa acontece na pausa da semana ${copa.semana}.</p>`; return; }
  box.innerHTML = topo + `<p>${s.campanha ? `${h(s.campanha.lugar)} · ${s.campanha.v}V ${s.campanha.e}E ${s.campanha.d}D` : s.fechada ? "A Copa começou." : `Estreia na semana ${copa.semana}. Convocação aberta até lá.`}</p>${s.fechada ? "" : contagemSel(s)}
    <button class="primario largo" data-ir="selecao">${s.fechada ? "Ver a seleção" : "Convocar e escalar"}</button>`;
}
