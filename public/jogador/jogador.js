// Modo Jogador (Rumo ao Estrelato): a página. O servidor (jogador.js, canal /jogador) manda o estado; aqui só se desenha
// e se mandam os comandos: criar, foco (o treino), jogar e proxima (a temporada seguinte).
const { $, h, store } = Comum;
const socket = io("/jogador"), avisar = Comum.criarToast();
const toast = (msg) => avisar(msg);
const POS_NOME = { GOL: "Goleiro", ZAG: "Zagueiro", LD: "Lateral-direito", LE: "Lateral-esquerdo", VOL: "Volante", MC: "Meio-campista", MEI: "Meia", PE: "Ponta-esquerda", PD: "Ponta-direita", ATA: "Atacante" };
const NACOES = ["Brasil", "Argentina", "Portugal", "Inglaterra", "Espanha", "França", "Itália", "Alemanha"];
const ATR = [["rit", "RIT"], ["fin", "FIN"], ["pas", "PAS"], ["dri", "DRI"], ["def", "DEF"], ["fis", "FIS"]];
const LIGAS_JOGAVEIS = new Set(["brasileirao-2026", "serieb-2026", "inglaterra-2026", "espanha-2026", "italia-2026", "alemanha-2026", "franca-2026"]);
const BASE = { clubes: MundoCarreira.ligas.flatMap((l) => window.BasesCarreira[l.id].clubes.map((c) => ({ ...c, ligaId: l.id }))) };
const CLUBES = Object.fromEntries(BASE.clubes.map((c) => [c.id, c]));
let E = null, RESULTADO = null, escolha = { pos: "ATA", pe: "D", idade: 18, nat: "Brasil", temporadas: 3, nota: 68, modo: "classico", clube: null };

const pedir = (evento, dados = {}) => new Promise((res) => socket.emit(evento, dados, (r) => res(r || { ok: false, error: "Sem conexão." })));
const faixa = (n) => (n >= 90 ? "elite" : n >= 85 ? "ouro" : n >= 80 ? "prata" : "bronze");
const num1 = (v) => String(v).replace(".", ",");

// ---------- a cor do clube ----------
const luz = (hx) => { const n = parseInt(String(hx).slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgbDe = (hx) => { const n = parseInt(hx.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const misturar = (a, b, p) => { const [x, y] = [rgbDe(a), rgbDe(b)]; return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * p).toString(16).padStart(2, "0")).join(""); };
const colorida = (hx) => { const c = rgbDe(hx); return Math.max(...c) - Math.min(...c) > 60; };
function temaClube(id) {
  const c = CLUBES[id]; if (!c) return "";
  const base = c.cores.find(colorida);
  let acento = "#ffffff";
  if (base) { acento = base; for (let p = 0.1; contraste(acento, "#0c1824") < 3.2 && p <= 0.7; p += 0.1) acento = misturar(base, "#ffffff", p); }
  const tinta = contraste(acento, "#ffffff") >= contraste(acento, "#111111") ? "#ffffff" : "#111111";
  return `--acento:${acento};--acento2:${c.cores.find((x) => x !== base) || "#ffffff"};--acento-tinta:${tinta};--clube:${c.cores[0]};--clube2:${c.cores[1] || c.cores[0]}`;
}
const escudoDaApi = (id) => (window.ESCUDOS_API && Object.hasOwn(window.ESCUDOS_API, id) ? `/api/escudo/${encodeURIComponent(id)}` : null);
function escudo(id, escala = 2) {
  const c = CLUBES[id]; if (!c) return "";
  const api = escudoDaApi(id);
  const img = api ? `<img class="escudo-img" src="${h(api)}" alt="" loading="lazy" decoding="async" onload="this.parentNode.classList.add('img-ok')" onerror="this.remove()">` : "";
  return `<span class="escudo" style="--e:${escala}" title="${h(c.nome)}"><span class="escudo-svg">${Escudos.svg(c)}</span>${img}</span>`;
}

// ---------- criar ----------
const segmentos = (id, itens, atual, quando) => {
  $(id).innerHTML = itens.map(([v, t]) => `<button type="button" data-v="${h(v)}" aria-pressed="${String(v) === String(atual)}">${h(t)}</button>`).join("");
  $(id).onclick = (e) => { const b = e.target.closest("button"); if (!b) return; quando(b.dataset.v); segmentos(id, itens, b.dataset.v, quando); };
};
// a concorrência na posição: quantos do clube estão acima de você (e o quanto) para dizer se dá para jogar
function concorrencia(c) {
  const mine = escolha.nota, notas = c.jogadores.filter((j) => j.pos === escolha.pos).map((j) => j.nota).sort((a, b) => b - a);
  const vagas = escolha.pos === "GOL" ? 1 : ({ ZAG: 2, MC: 2, VOL: 1, MEI: 1, PE: 1, PD: 1, ATA: 1, LD: 1, LE: 1 }[escolha.pos] || 1);
  const corte = notas[vagas - 1] || 55, falta = corte - mine;
  return { corte, falta, nivel: falta <= 0 ? "alta" : falta <= 4 ? "boa" : falta <= 8 ? "média" : "baixa" };
}
function telaInicio() {
  E = null; document.body.style.cssText = ""; document.body.dataset.tela = "inicio";
  mostrar("inicio");
  segmentos("jPos", Object.keys(POS_NOME).map((p) => [p, p]), escolha.pos, (v) => { escolha.pos = v; desenharClubes(); });
  segmentos("jPe", [["D", "Direita"], ["E", "Esquerda"]], escolha.pe, (v) => { escolha.pe = v; });
  segmentos("jIdade", [17, 18, 19, 20, 21, 22, 23].map((i) => [i, `${i}`]), escolha.idade, (v) => { escolha.idade = Number(v); });
  segmentos("jNota", [65, 66, 67, 68, 69, 70].map((n) => [n, `${n}`]), escolha.nota, (v) => { escolha.nota = Number(v); dicaNota(); desenharClubes(); });
  desenharModos();
  segmentos("jNat", NACOES.map((n) => [n, n]), escolha.nat, (v) => { escolha.nat = v; });
  segmentos("jTemporadas", [1, 2, 3, 5, 8, 10, 15].map((t) => [t, `${t}`]), escolha.temporadas, (v) => { escolha.temporadas = Number(v); });
  dicaNota(); desenharClubes();
}
function dicaNota() { $("jNotaDica").textContent = `Você escolhe de 65 a 70. Quanto mais baixa, mais você tem a crescer (e mais tempo no banco); quanto mais alta, mais cedo você ganha uma chance.`; }
const MODOS = [["classico", "Clássico", "A carreira de jogador, com eventos de vez em quando: entrevistas, convites, lesões escondidas. Você decide e a vida segue."],
  ["historia", "História do Estrelato", "Cada temporada abre com um capítulo. Suas escolhas moldam o personagem (disciplina, carisma, ambição...), mudam o que acontece depois e escrevem o epílogo da carreira."]];
function desenharModos() {
  $("jModo").innerHTML = MODOS.map(([v, t, d]) => `<button type="button" class="j-modo" data-v="${v}" aria-pressed="${v === escolha.modo}"><b>${t}</b><small>${d}</small></button>`).join("");
  $("jModo").onclick = (e) => { const b = e.target.closest(".j-modo"); if (!b) return; escolha.modo = b.dataset.v; desenharModos(); };
}
function desenharClubes() {
  const lista = BASE.clubes.filter((c) => LIGAS_JOGAVEIS.has(c.ligaId)).map((c) => ({ c, k: concorrencia(c) })).sort((a, b) => a.k.falta - b.k.falta);
  const NOME_LIGA = Object.fromEntries(MundoCarreira.ligas.map((l) => [l.id, l.nome]));
  $("clubes").innerHTML = lista.map(({ c, k }) => `<button type="button" class="clube" data-clube="${c.id}" style="--clube:${c.cores[0]};--clube2:${c.cores[1] || c.cores[0]}" aria-pressed="${c.id === escolha.clube}">${escudo(c.id, 3)}<span class="clube-info"><b>${h(c.nome)}</b><small>${h(NOME_LIGA[c.ligaId] || "")}</small><small class="chance ${k.nivel}">Chance de jogar: ${k.nivel} · titular ${k.corte}</small></span></button>`).join("");
  $("clubes").onclick = (e) => { const b = e.target.closest(".clube"); if (!b) return; escolha.clube = b.dataset.clube; document.body.style.cssText = temaClube(escolha.clube); desenharClubes(); };
}
$("btnCriar").onclick = async () => {
  $("erroCriar").textContent = "";
  const r = await pedir("criar", { nome: $("jNome").value, ...escolha });
  if (!r.ok) { $("erroCriar").textContent = r.error; return; }
  store.set("jogador:token", r.token); store.set("jogador:codigo", r.recuperacao);
  receber(r.estado);
  toast(`Código de recuperação: ${r.recuperacao}. Guarde-o.`);
};
$("btnRecuperar").onclick = async () => {
  const r = await pedir("recuperar", { codigo: $("jCodigo").value });
  if (!r.ok) { $("erroCodigo").textContent = r.error; return; }
  store.set("jogador:token", r.token); receber(r.estado);
};

// ---------- a carreira ----------
function mostrar(tela) { for (const id of ["inicio", "sede"]) $(id).classList.toggle("hidden", id !== tela); }
function receber(e) {
  E = e;
  document.body.style.cssText = temaClube(e.clube.id); document.body.dataset.tela = "sede";
  mostrar("sede"); desenhar();
}
const PAPEL = { titular: ["Titular", "ok"], banco: ["No banco", "banco"], lesionado: ["Lesionado", "mal"], suspenso: ["Suspenso", "mal"] };
function cartaHTML(e) {
  const eu = e.eu;
  return `<div class="carta ${faixa(eu.nota)}"><div class="carta-topo"><b class="carta-nota">${eu.nota}</b><span class="carta-pos">${eu.pos}</span>${escudo(e.clube.id, 2)}</div>
    <div class="carta-nome">${h(eu.nome)}</div><div class="carta-meta">${eu.idade} anos · ${h(eu.nat)} · pé ${eu.pe === "D" ? "direito" : "esquerdo"}</div>
    <div class="carta-atr">${ATR.filter(([k]) => eu.pos === "GOL" ? false : true).map(([k, t]) => `<span><b>${eu.atr[k]}</b>${t}</span>`).join("") || `<span><b>${eu.atr.gol}</b>GOL</span><span><b>${eu.atr.fis}</b>FIS</span><span><b>${eu.atr.pas}</b>PAS</span>`}</div>
    <div class="carta-estrelas" title="Potencial">${"★".repeat(eu.estrelas)}${"☆".repeat(5 - eu.estrelas)}</div></div>`;
}
function desenhar() {
  const e = E, [papelTxt, papelCls] = PAPEL[e.papel] || PAPEL.banco;
  $("jCarta").innerHTML = cartaHTML(e);
  $("jClube").innerHTML = `${escudo(e.clube.id, 3)}<div><b>${h(e.clube.nome)}</b><small>Temporada ${e.temporada} de ${e.temporadasMax} · ${e.ano}</small></div>`;
  $("jPapel").innerHTML = `<span class="selo ${papelCls}">${papelTxt}</span>${e.lesao ? `<span class="selo mal">Fora por ${e.lesao} jogo${e.lesao > 1 ? "s" : ""}</span>` : ""}${e.suspenso ? `<span class="selo mal">Suspenso</span>` : ""}<span class="suave">${e.rodada} de ${e.totalJogos} jogos do time</span>`;
  $("jConfTxt").textContent = `${e.confianca}/100`; $("jConfBarra").style.width = `${e.confianca}%`;
  $("jFala").textContent = `“${e.fala}”`;
  $("jXpTxt").textContent = e.noTeto ? "No teto do potencial" : `${e.xp}/${e.xpPara}`; $("jXpBarra").style.width = `${e.noTeto ? 100 : Math.min(100, e.xp / e.xpPara * 100)}%`;
  desenharJogo(); desenharHistoria(); desenharContrato(); desenharTrofeus(); desenharTreino(); desenharUltimo(); desenharObjetivos(); desenharTemp(); desenharRivais(); desenharDiario();
}
function desenharJogo() {
  const e = E, p = e.proximo;
  if (RESULTADO) { desenharResultado(); return; }
  if (e.evento) { desenharEvento(); return; }
  if (e.fim) {
    const tot = e.carreira, melhor = [...e.historico].sort((a, b) => b.nota - a.nota)[0];
    const titulo = e.eu.nota >= 90 ? "Lenda do futebol" : e.eu.nota >= 85 ? "Craque mundial" : e.eu.nota >= 80 ? "Estrela da liga" : e.eu.nota >= 72 ? "Jogador de elite nacional" : "Profissional de carreira honesta";
    $("jJogo").innerHTML = `<h3>Fim da carreira</h3><h2>${titulo}</h2><p class="suave">${tot.jogos} jogos, ${tot.gols} gols e ${tot.assist} assistências em ${e.historico.length} temporada${e.historico.length > 1 ? "s" : ""}. Nota final ${e.eu.nota}${melhor ? ` (pico aos ${melhor.idade} anos)` : ""}.</p>${epilogoHTML()}${balancoHTML()}<button id="btnNovo" class="primario cta">Começar outra carreira</button>`;
    $("btnNovo").onclick = sair; return;
  }
  if (e.acabou) { desenharFimDeTemporada(); return; }
  const mando = p.casa === e.clube.id ? "em casa" : "fora";
  const adv = p.casa === e.clube.id ? p.fora : p.casa;
  const chance = e.papel === "titular" ? "Você começa jogando." : e.papel === "banco" ? "Você começa no banco: a vaga aparece se o treino e a nota convencerem." : "Você não joga este jogo.";
  $("jJogo").innerHTML = `<h3>${h(p.competicao)} · ${h(p.rotulo)}</h3><div class="j-confronto">${escudo(e.clube.id, 3)}<span class="x">${mando === "em casa" ? "×" : "@"}</span>${escudo(adv, 3)}</div>
    <h2>${h(CLUBES[e.clube.id].nome)} ${mando === "em casa" ? "×" : "visita"} ${h(CLUBES[adv] ? CLUBES[adv].nome : adv)}</h2><p class="suave">${chance}</p>
    <button id="btnJogar" class="primario cta">Jogar a próxima partida</button>`;
  $("btnJogar").onclick = jogar;
}
// ---------- eventos com decisão ----------
function desenharEvento() {
  const ev = E.evento;
  $("jJogo").innerHTML = `<h3>${ev.inicio ? "Novo capítulo" : "Aconteceu"}</h3><h2>${h(ev.titulo)}</h2><p class="j-historia">${h(ev.texto)}</p>
    <div class="j-opcoes j-escolhas">${ev.escolhas.map((x, i) => `<button type="button" class="j-opcao" data-escolha="${i}"><span><b>${h(x.texto)}</b>${x.dica ? `<small>${h(x.dica)}</small>` : ""}</span></button>`).join("")}</div>
    <p class="suave">O jogo espera a sua decisão.</p>`;
  $("jJogo").onclick = async (ev2) => {
    const b = ev2.target.closest("[data-escolha]"); if (!b) return;
    for (const x of $("jJogo").querySelectorAll("button")) x.disabled = true;
    const r = await pedir("evento", { escolha: Number(b.dataset.escolha) });
    if (!r.ok) { toast(r.error); for (const x of $("jJogo").querySelectorAll("button")) x.disabled = false; return; }
    RESULTADO = r.resultado; $("jJogo").onclick = null; receber(r.estado);
  };
}
function desenharResultado() {
  const r = RESULTADO;
  $("jJogo").innerHTML = `<h3>${h(r.titulo)}</h3><p class="j-escolheu">Você: ${h(r.escolha)}</p><h2>${r.sorte === true ? "Deu certo" : r.sorte === false ? "Deu errado" : "E então…"}</h2><p class="j-historia">${h(r.texto)}</p>
    ${r.chips.length ? `<div class="j-chips">${r.chips.map((c) => `<span class="${c.bom ? "bom" : "mau"}">${h(c.texto)}</span>`).join("")}</div>` : ""}
    <button id="btnSegue" class="primario cta">Continuar</button>`;
  $("btnSegue").onclick = () => { RESULTADO = null; desenhar(); };
}
function desenharHistoria() {
  const e = E, painel = $("jHistoria");
  if (!e.perfil && !e.livro.length) { painel.classList.add("hidden"); return; }
  painel.classList.remove("hidden");
  const barras = e.perfil ? `<div class="j-tracos">${e.perfil.map((t) => `<div><div class="j-rotulo"><span>${h(t.nome)}</span><b>${t.valor}</b></div><div class="barra fina"><i style="width:${t.valor * 10}%"></i></div></div>`).join("")}</div>
    ${e.pacto ? `<p class="suave">Meta do ano: <b>${e.pacto === "ousada" ? "ousada (cumprir os 3 objetivos)" : "segura"}</b>.</p>` : ""}` : "";
  painel.innerHTML = `<h3>${e.perfil ? "Seu personagem" : "Decisões recentes"}</h3>${barras}
    ${e.livro.length ? `<ul class="j-livro">${e.livro.slice(0, 5).map((l) => `<li><small>T${l.temporada}</small><span><b>${h(l.titulo)}</b> ${h(l.escolha)}</span></li>`).join("")}</ul>` : `<p class="suave">As escolhas que você fizer aparecem aqui.</p>`}`;
}
function epilogoHTML() {
  const p = E.epilogo; if (!p) return "";
  return `<div class="j-epilogo"><h3>Epílogo</h3><h2>${h(p.titulo)}</h2><ul>${p.linhas.map((l) => `<li>${h(l)}</li>`).join("")}</ul></div>`;
}
const nomeClube = (id) => (CLUBES[id] ? CLUBES[id].nome : id);
const { dinheiro } = Mercado;
function balancoHTML() {
  const b = E.balanco; if (!b) return "";
  const linhas = [
    ...b.objetivos.map((o) => `<li class="${o.cumprido ? "feito" : ""}"><span>${o.cumprido ? "✓" : "✗"}</span>${h(o.texto)} <small>(${num1(o.progresso)}/${num1(o.alvo)})</small></li>`),
    ...b.premios.map((p) => `<li class="premio"><span>🏆</span><b>${h(p.nome)}</b> <small>${h(p.texto)}</small></li>`),
    b.selecao && b.selecao.convocado ? `<li class="premio"><span>🌍</span><b>Seleção (${h(E.nacao)})</b> <small>${b.selecao.torneio ? `${h(b.selecao.torneio)}: ${h(b.selecao.fase)} · ` : ""}${b.selecao.jogos} jogos, ${b.selecao.gols} gols</small></li>` : `<li><span>—</span>Não foi convocado para a seleção <small>(precisa de pontuação ${b.selecao ? b.selecao.limiar : "?"}, você fez ${b.selecao ? b.selecao.score : "?"})</small></li>`,
  ];
  return `<ul class="j-balanco">${linhas.join("")}</ul>`;
}
const PAPEL_TXT = { titular: "Titular garantido", "rodízio": "Rodízio", reserva: "Reserva de luxo" };
function opcaoMercado(o, tipo, escolhida) {
  const clube = nomeClube(o.clube), emp = o.tipo === "emprestimo";
  const titulo = tipo === "renovar" ? `Renovar com o ${clube}` : emp ? `Empréstimo ao ${clube}` : `Transferência para o ${clube}`;
  const detalhe = tipo === "renovar" ? `${o.anos} anos` : emp ? `1 temporada, volta ao clube de origem` : `${o.anos} anos`;
  return `<button type="button" class="j-opcao ${escolhida ? "marcada" : ""}" data-tipo="${tipo}" data-id="${h(o.id)}">${escudo(o.clube, 2)}<span><b>${titulo}</b><small>${detalhe} · ${dinheiro(o.salario)}/mês${o.papel ? ` · <i class="papel-${o.papel}">${PAPEL_TXT[o.papel]}</i> (titular: nota ${o.corte})` : ""}</small></span></button>`;
}
function desenharFimDeTemporada() {
  const e = E, m = e.mercado, esc = m && m.escolha;
  const ficar = m && !m.precisaEscolher ? `<button type="button" class="j-opcao ${!esc ? "marcada" : ""}" data-tipo="ficar">${escudo(m.noEmprestimo ? m.pai : e.clube.id, 2)}<span><b>${m.noEmprestimo ? `Voltar ao ${h(nomeClube(m.pai))}` : `Ficar no ${h(nomeClube(e.clube.id))}`}</b><small>Seguir com o contrato atual</small></span></button>` : "";
  const podeSeguir = !m || !m.precisaEscolher || esc;
  $("jJogo").innerHTML = `<h3>Temporada ${e.temporada} encerrada</h3><h2>Balanço do ano</h2>${balancoHTML()}
    ${m ? `<h3 class="j-sub">Seu futuro${m.precisaEscolher ? " · o contrato acabou" : ""}</h3><div class="j-opcoes">${ficar}${m.renovacao.map((r) => opcaoMercado(r, "renovar", esc && esc.id === r.id)).join("")}${m.ofertas.map((o) => opcaoMercado(o, "oferta", esc && esc.id === o.id)).join("")}</div>
    <p class="suave">Empréstimo é a saída para quem está preso no banco de um clube grande. Um empresário melhor traz mais propostas e salários maiores.</p>` : ""}
    <button id="btnProxima" class="primario cta" ${podeSeguir ? "" : "disabled"}>${podeSeguir ? `Começar a temporada ${e.temporada + 1}` : "Escolha o seu futuro"}</button>`;
  $("jJogo").onclick = async (ev) => {
    const b = ev.target.closest(".j-opcao"); if (!b) return;
    const r = await pedir("decidir", { tipo: b.dataset.tipo, id: b.dataset.id }); if (!r.ok) return toast(r.error);
    E = r.estado; desenharFimDeTemporada();
  };
  $("btnProxima").onclick = async () => { const r = await pedir("proxima"); if (!r.ok) return toast(r.error); $("jJogo").onclick = null; receber(r.estado); };
}
function desenharContrato() {
  const e = E, c = e.contrato, emp = e.empresario;
  $("jContrato").innerHTML = `<h3>Contrato e carreira</h3><div class="j-numeros j-tres"><span><b>${c ? dinheiro(c.salario) : "—"}</b>por mês</span><span><b>${c ? c.anos : "—"}</b>${c && c.anos === 1 ? "ano" : "anos"} de contrato</span><span><b>${dinheiro(e.patrimonio)}</b>patrimônio</span></div>
    ${e.emprestimo ? `<p class="suave">Emprestado: o contrato é do ${h(nomeClube(e.emprestimo.de))}.</p>` : ""}
    <div class="j-rotulo"><span>Fama</span><b>${e.fama}/100</b></div><div class="barra fina"><i style="width:${e.fama}%"></i></div>
    <h3 class="j-sub">Empresário</h3><div class="segmentos largos" role="group" aria-label="Empresário">${emp.niveis.map((n) => `<button type="button" data-emp="${n.nivel}" aria-pressed="${n.nivel === emp.nivel}" ${n.liberado ? "" : "disabled"} title="${n.liberado ? "" : `Precisa de fama ${n.fama}`}">${h(n.nome)}</button>`).join("")}</div>
    <p class="suave">${emp.nivel ? `Fica com ${Math.round(emp.comissao * 100)}% do salário e traz salários ${Math.round(emp.salario * 100)}% maiores e ${emp.extras} proposta${emp.extras > 1 ? "s" : ""} a mais.` : "Sem empresário você recebe poucas propostas. A fama destrava os melhores."}</p>`;
  $("jContrato").onclick = async (ev) => { const b = ev.target.closest("[data-emp]"); if (!b || b.disabled) return; const r = await pedir("empresario", { nivel: b.dataset.emp }); if (!r.ok) return toast(r.error); E = r.estado; desenharContrato(); desenharDiario(); };
}
function desenharTrofeus() {
  const e = E, s = e.selecao;
  $("jTrofeus").innerHTML = `<h3>Troféus e seleção</h3>${e.premios.length ? `<ul class="j-balanco">${e.premios.slice().reverse().map((p) => `<li class="premio"><span>🏆</span><b>${h(p.nome)}</b> <small>${p.ano} · ${h(nomeClube(p.clube))}</small></li>`).join("")}</ul>` : `<p class="suave">Nenhum prêmio ainda. Eles saem no fim da temporada: seleção do campeonato, revelação, artilheiro, títulos e a Bola de Ouro.</p>`}
    <div class="j-numeros j-tres"><span><b>${s ? s.jogos : 0}</b>jogos pela seleção</span><span><b>${s ? s.gols : 0}</b>gols</span><span><b>${s ? s.titulos : 0}</b>títulos</span></div>
    <p class="suave">Seleção: ${h(e.nacao)}. A convocação vem com nota alta, boa média e fama; em ano par tem Copa do Mundo ou Eurocopa e Copa América.</p>`;
}
async function jogar() {
  const b = $("btnJogar"); b.disabled = true;
  const r = await pedir("jogar");
  if (!r.ok) { b.disabled = false; return toast(r.error); }
  receber(r.estado);
  const rel = r.estado.relatorio;
  if (rel && rel.gols && !matchMedia("(prefers-reduced-motion: reduce)").matches) Comum.confetti([CLUBES[r.estado.clube.id].cores[0], CLUBES[r.estado.clube.id].cores[1] || "#fff", "#ffb21e"]);
  document.querySelector("#jUltimo").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function corNota(n) { return n >= 8 ? "otima" : n >= 7 ? "boa" : n >= 6 ? "media" : "ruim"; }
function desenharTreino() {
  const e = E;
  $("jTreino").innerHTML = `<h3>Treino da semana</h3><div class="segmentos largos" role="group" aria-label="Foco do treino">${e.focos.map(([f, nome]) => `<button type="button" data-foco="${f}" aria-pressed="${f === e.foco}">${h(nome)}</button>`).join("")}</div>
    <p class="suave">Cada jogo rende treino. O foco escolhe qual atributo sobe quando você evolui. Treino bom (nota 7 ou mais) convence o treinador, mesmo no banco.</p>`;
  $("jTreino").onclick = async (ev) => { const b = ev.target.closest("[data-foco]"); if (!b) return; const r = await pedir("foco", { foco: b.dataset.foco }); if (!r.ok) return toast(r.error); E = r.estado; desenharTreino(); };
}
function desenharUltimo() {
  const r = E.relatorio;
  if (!r) { $("jUltimo").innerHTML = `<h3>Último jogo</h3><p class="suave">Sua estreia está logo ali. Jogue a primeira partida para ver como foi.</p>`; return; }
  const placar = `${h(CLUBES[r.casa] ? CLUBES[r.casa].nome : r.casa)} ${r.placar[0]} × ${r.placar[1]} ${h(CLUBES[r.fora] ? CLUBES[r.fora].nome : r.fora)}`;
  const dc = r.confianca[1] - r.confianca[0];
  const lances = [r.gols && `${r.gols} gol${r.gols > 1 ? "s" : ""}`, r.assist && `${r.assist} assistência${r.assist > 1 ? "s" : ""}`, r.cs && "sem sofrer gol", r.amarelo && "cartão amarelo", r.vermelho && "expulso", r.lesionou && "se lesionou"].filter(Boolean);
  $("jUltimo").innerHTML = `<h3>Último jogo · ${h(r.rotulo)}</h3><p class="j-placar">${placar}</p>
    <div class="j-nota-linha">${r.jogou ? `<div class="j-nota ${corNota(r.nota)}"><b>${num1(r.nota)}</b><small>nota</small></div>` : `<div class="j-nota nada"><b>—</b><small>não jogou</small></div>`}
      <ul class="j-lista"><li>${r.jogou ? (r.titular ? "Começou jogando" : "Entrou do banco") : "Ficou no banco o jogo todo"}</li>${lances.map((l) => `<li>${l}</li>`).join("")}<li>Treino: <b>${num1(r.treino)}</b></li>
      <li>Confiança ${dc >= 0 ? "+" : ""}${dc} (${r.confianca[1]})</li>${r.niveis.length ? `<li class="positivo">Evoluiu: ${r.niveis.map((k) => "+1 " + ({ rit: "Ritmo", fin: "Finalização", pas: "Passe", dri: "Drible", def: "Defesa", fis: "Físico", gol: "Goleiro" })[k]).join(", ")}</li>` : ""}</ul></div>`;
}
function desenharObjetivos() {
  $("jObjetivos").innerHTML = `<h3>Objetivos da temporada</h3>${E.objetivos.map((o) => {
    const pct = Math.min(100, (o.progresso / o.alvo) * 100), feito = o.progresso >= o.alvo;
    return `<div class="j-obj ${feito ? "feito" : ""}"><div class="j-rotulo"><span>${h(o.texto)}</span><b>${feito ? "✓" : `${num1(o.progresso)}/${num1(o.alvo)}`}</b></div><div class="barra fina"><i style="width:${pct}%"></i></div></div>`;
  }).join("")}<p class="suave">Cada objetivo cumprido rende um bônus de evolução e confiança no fim do ano.</p>`;
}
function desenharTemp() {
  const t = E.temp, g = E.eu.pos === "GOL";
  $("jTemp").innerHTML = `<h3>Temporada ${E.temporada}</h3><div class="j-numeros"><span><b>${t.jogos}</b>jogos</span><span><b>${t.titular}</b>titular</span><span><b>${g ? t.cs : t.gols}</b>${g ? "s/ sofrer" : "gols"}</span><span><b>${t.assist}</b>assist.</span><span><b>${t.media == null ? "—" : num1(t.media)}</b>nota média</span></div>
    <div class="j-forma"><span class="suave">Últimas notas</span>${E.forma.length ? E.forma.map((n) => `<i class="${corNota(n)}">${num1(n)}</i>`).join("") : `<span class="suave">—</span>`}</div>`;
}
function desenharRivais() {
  $("jRivais").innerHTML = `<h3>Concorrência na posição</h3>${E.rivais.length ? `<ul class="j-rivais"><li class="eu"><b>${E.eu.nota}</b><span>${h(E.eu.nome)} (você)</span></li>${E.rivais.map((r) => `<li><b>${r.nota}</b><span>${h(r.nome)} · ${r.idade} anos</span></li>`).join("")}</ul>` : `<p class="suave">Ninguém na sua posição: a vaga é sua.</p>`}`;
}
function desenharDiario() {
  const hist = E.historico.map((t) => `<tr><td>${t.ano}</td><td>${h(CLUBES[t.clube] ? CLUBES[t.clube].nome : t.clube)}</td><td>${t.idade}</td><td>${t.nota}</td><td>${t.jogos}</td><td>${t.gols}</td><td>${t.assist}</td><td>${t.media == null ? "—" : num1(t.media)}</td><td>${t.objetivos.filter((o) => o[1]).length}/${t.objetivos.length}</td></tr>`).join("");
  $("jDiario").innerHTML = `<h3>Diário da carreira</h3><div class="j-duas"><ul class="j-diario">${E.diario.length ? E.diario.map((d) => `<li><small>T${d.temporada}</small>${h(d.texto)}</li>`).join("") : "<li>Tudo por escrever.</li>"}</ul>
    ${hist ? `<div class="j-hist"><table><thead><tr><th>Ano</th><th>Clube</th><th>Idade</th><th>Nota</th><th>J</th><th>G</th><th>A</th><th>Média</th><th>Obj.</th></tr></thead><tbody>${hist}</tbody></table></div>` : ""}</div>`;
}
async function sair() { await pedir("sair"); store.set("jogador:token", null); telaInicio(); }
$("btnSair").onclick = sair;
$("btnCodigo").onclick = async () => { const r = await pedir("codigo"); if (r.ok) { store.set("jogador:codigo", r.recuperacao); toast(`Novo código: ${r.recuperacao}. O antigo parou de valer.`); } else toast(r.error); };
$("btnExcluir").onclick = async () => { if (!confirm("Excluir esta carreira de vez?")) return; const r = await pedir("excluir"); if (!r.ok) return toast(r.error); store.set("jogador:token", null); telaInicio(); };

// ---------- conexão ----------
async function aoConectar() {
  $("conexao").textContent = "Conectado";
  const token = store.get("jogador:token");
  if (token) { const r = await pedir("entrar", { token }); if (r.ok) return receber(r.estado); store.set("jogador:token", null); }
  telaInicio();
}
socket.on("connect", aoConectar);
socket.on("disconnect", () => { $("conexao").textContent = "Reconectando…"; });
if (socket.connected) aoConectar();
