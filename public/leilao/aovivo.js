// Leilão da Galera — o campeonato ao vivo (carregado depois das outras partes do script da página; divide as mesmas
// variáveis globais: S, me, socket, $, esc, toast, clockSkew, renderReveal).
// Cada parte revelada que tem jogos toca como um placar de TV: o relógio corre, os gols entram no minuto certo com a
// carta de quem marcou (gols quase juntos: as cartas lado a lado) e o replay do lance em pixel-art (lances.js), um
// telão embaixo do outro; a prorrogação e os pênaltis aparecem cobrança por cobrança. Depois, a tabela da rodada se
// mexe (quem subiu, quem caiu) e só então aparece o texto da narração. Todo mundo vê junto: o tempo de cada parte
// conta a partir da hora em que o organizador revelou (no relógio do servidor).
// Os tempos de cada pedaço do jogo ficam em ritmo.js (o servidor usa a mesma conta).
const { RITMO: VIVO, duracaoJogo, duracaoParte } = Ritmo;
const agoraServidor = () => Date.now() + (typeof clockSkew === "number" ? clockSkew : 0);
// até quando tem jogo rolando (o organizador espera para revelar a próxima)
let vivoAte = 0;

// ---------- a carta do jogador que marcou ----------
// o sobrenome ("Messi"), com a partícula junto ("van Basten", "Di Stéfano"); quem é conhecido pelo primeiro nome fica
// com ele ("Vinícius Júnior" vira "Vinícius", "Ronaldinho Gaúcho" vira "Ronaldinho")
const PARTICULA = /^(van|von|der|den|de|di|da|do|dos|das|del|della|la|le|ter|mac)$/i;
const APELIDO = /^(júnior|junior|jr\.?|filho|neto|gaúcho|fenômeno|pernambucano|paulista|baiano|carioca|mineiro)$/i;
function sobrenome(n) {
  const p = String(n).trim().split(/\s+/);
  if (p.length > 1 && APELIDO.test(p[p.length - 1])) p.pop();
  if (p.length < 2) return p[0];
  let k = p.length - 1;
  while (k > 0 && PARTICULA.test(p[k - 1])) k--;
  return p[k].length > 2 || k < p.length - 1 ? p.slice(k).join(" ") : p[0];
}
// a mesma carta do leilão (carta.js), com a faixa do gol embaixo
function cartaGol(g, hat) {
  return `<div class="cartaGol lado${g.lado}${hat ? " hat" : ""}">${cartaHTML(g.nome)}
    <div class="cgFaixa">${hat ? ic("cartola") + "Hat-trick" : ic("bola") + "Gol"} · ${g.min}'</div></div>`;
}
// a carta entra na hora, do lado do time que marcou; com outra ainda na tela (gols quase juntos), entra ao lado dela,
// e a fila vai para o meio (com três ou mais, as cartas ficam menores)
function cartaNaFila(el, g, hat) {
  const fila = el.querySelector(".cgFila"), box = document.createElement("div");
  box.innerHTML = cartaGol(g, hat);
  const c = box.firstElementChild;
  fila.appendChild(c); arrumaFila(fila);
  setTimeout(() => { c.remove(); arrumaFila(fila); }, 1900);
}
function arrumaFila(fila) {
  const cartas = [...fila.children];
  fila.classList.toggle("so-A", cartas.length === 1 && cartas[0].classList.contains("ladoA"));
  fila.classList.toggle("so-B", cartas.length === 1 && cartas[0].classList.contains("ladoB"));
  fila.classList.toggle("muitas", cartas.length >= 3);
}

// ---------- os replays dos gols (lances.js) ----------
// cada gol ganha o seu telão em pixel-art, um embaixo do outro (o mais novo em cima, logo abaixo do placar): toca na
// hora do gol e depois fica parado na comemoração (um toque toca de novo). Quem chega depois vê todos parados.
function replayDoGol(el, j, g, hat, toca) {
  const r = Lances.criar(g, j, { nome: sobrenome(g.nome), hat, auto: toca, cobranca: g.penalti ? { ...g.penalti, gol: true } : null }), item = document.createElement("div");
  r.dataset.g = j.gols.indexOf(g);
  item.className = "rpItem"; item.appendChild(r);
  el.querySelector(".jvReplays").prepend(item);
}
// o gol da vitória: o do vencedor que deixou o placar a favor de vez (nos pênaltis, nenhum)
function golDaVitoria(j) {
  if (!j.vencedor || j.pens) return null;
  const dele = j.gols.filter((g) => g.lado === j.vencedor);
  return dele[j.gols.length - dele.length] || null;
}

// ---------- o placar de um jogo ----------
function jogoHTML(j) {
  const meu = (t) => (me.capId && t.id === me.capId ? " meu" : "");
  return `<div class="jogoVivo" data-j="${j.id}">
    ${j.titulo ? `<div class="jvTit">${esc(j.titulo)}</div>` : ""}
    <div class="jvPlacar">
      <span class="jvTime a${meu(j.A)}">${esc(j.A.nome)}</span>
      <b class="jvGol ga">0</b><span class="jvRel">0'</span><b class="jvGol gb">0</b>
      <span class="jvTime b${meu(j.B)}">${esc(j.B.nome)}</span>
      <div class="cgFila" aria-hidden="true"></div>
    </div>
    <div class="jvFase">1º tempo</div>
    <div class="jvLances"><div class="la"></div><div class="lb"></div></div>
    <div class="jvPens hidden"><div class="pa"></div><div class="pb"></div></div>
    <div class="jvPalp"></div>
    <div class="jvReplays"></div>
  </div>`;
}
// o jogo no instante t (ms desde o apito): minuto, fase, gols que já saíram e cobranças já batidas
// (com um pênalti para a galera decidir, o jogo espera parado nele)
function momento(j, t) {
  const fimReg = VIVO.REG, fimExtra = fimReg + (j.extra ? VIVO.PRORR : 0), tp = Ritmo.tempoPendente(j), disputa = j.pendente && j.pendente.tipo === "disputa";
  if (tp !== null) t = Math.min(t, tp);
  let min, fase, cob = 0;
  if (t < fimReg) { min = (t / VIVO.REG) * j.mins; fase = min < j.mins / 2 ? "1º tempo" : "2º tempo"; }
  else if (t < fimExtra) { min = j.mins + ((t - fimReg) / VIVO.PRORR) * j.extra; fase = "Prorrogação"; }
  else if (j.pens && (disputa || t < duracaoJogo(j))) { min = j.mins + j.extra; fase = "Pênaltis"; cob = Math.min(j.pens.cob.length, Math.max(0, Math.floor((t - fimExtra - VIVO.PEN0) / VIVO.PEN) + 1)); }
  else { min = j.mins + j.extra; fase = "Fim de jogo"; cob = j.pens ? j.pens.cob.length : 0; }
  const gols = j.gols.filter((g) => g.min <= min), perdidos = (j.penaltis || []).filter((p) => !p.gol && p.min <= min);
  return { min, fase, gols, perdidos, cob, fim: fase === "Fim de jogo" };
}
// desenha o jogo no momento m; com "anima", os gols que acabaram de sair ganham a carta de quem marcou
function desenhaJogo(el, j, m, anima) {
  const ga = m.gols.filter((g) => g.lado === "A").length, gb = m.gols.length - ga;
  const q = (s) => el.querySelector(s);
  const vistos = +(el.dataset.gols || 0);
  q(".ga").textContent = ga; q(".gb").textContent = gb;
  q(".jvRel").textContent = m.fim ? "Fim" : m.fase === "Pênaltis" ? "Pên." : `${Math.min(Math.floor(m.min) + 1, j.mins + j.extra)}'`;
  q(".jvFase").textContent = m.fase;
  el.classList.toggle("acabou", m.fim);
  el.style.setProperty("--p", Math.min(1, m.min / (j.mins + j.extra || 1)).toFixed(3)); // a barrinha do tempo de jogo
  if (m.gols.length !== vistos) {
    // a lista de gols de cada lado e, nos que acabaram de sair, o replay e a carta de quem marcou
    const lista = (lado) => m.gols.filter((g) => g.lado === lado).map((g) => `<div>${ic("bola")}${esc(sobrenome(g.nome))} ${g.min > j.mins ? `${g.min}' (prorr.)` : `${g.min}'`}${g.penalti ? " (pên.)" : ""}</div>`).join("");
    q(".la").innerHTML = lista("A"); q(".lb").innerHTML = lista("B");
    for (const g of m.gols.slice(vistos)) {
      const hat = m.gols.filter((x) => x.nome === g.nome && x.lado === g.lado && x.min <= g.min).length === 3;
      replayDoGol(el, j, g, hat, anima && !g.penalti); // o pênalti já passou no duelo: o replay entra parado
      if (!anima) continue;
      cartaNaFila(el, g, hat);
      const placar = q(g.lado === "A" ? ".ga" : ".gb"); placar.classList.remove("pulou"); void placar.offsetWidth; placar.classList.add("pulou");
    }
    el.dataset.gols = m.gols.length;
  }
  // o pênalti perdido (defendido ou para fora) também vira um telão na lista
  for (const p of m.perdidos.slice(+(el.dataset.perdidos || 0))) {
    const r = Lances.criar({ min: p.min, lado: p.lado, nome: p.nome }, j, { nome: sobrenome(p.nome), auto: false, cobranca: p }), item = document.createElement("div");
    item.className = "rpItem"; item.appendChild(r); q(".jvReplays").prepend(item);
  }
  el.dataset.perdidos = m.perdidos.length;
  if (j.pens && m.cob) {
    q(".jvPens").classList.remove("hidden");
    const batidas = j.pens.cob.slice(0, m.cob), pts = (lado) => batidas.filter((c) => c.lado === lado);
    const bolas = (lado) => pts(lado).map((c) => `<i class="${c.ok ? "ok" : "erro"}" title="${esc(c.nome)}"></i>`).join("");
    q(".pa").innerHTML = bolas("A"); q(".pb").innerHTML = bolas("B");
    q(".jvFase").textContent = `Pênaltis: ${pts("A").filter((c) => c.ok).length} x ${pts("B").filter((c) => c.ok).length}`;
  }
  if (m.fim) {
    q(".jvTime.a").classList.toggle("venceu", j.vencedor === "A");
    q(".jvTime.b").classList.toggle("venceu", j.vencedor === "B");
    if (j.pens) q(".jvFase").textContent = `Fim: ${j.pens.a} x ${j.pens.b} nos pênaltis`;
    else if (j.extra) q(".jvFase").textContent = "Fim, na prorrogação";
    q(".jvPalp").innerHTML = acertaramHTML(j);
    if (!el.dataset.fim) { // no apito final, o replay do gol da vitória ganha a etiqueta dourada
      el.dataset.fim = "1";
      const v = golDaVitoria(j), r = v && el.querySelector(`.telao[data-g="${j.gols.indexOf(v)}"]`);
      if (r) { r.classList.add("vitoria"); r.querySelector(".lcTag span").textContent = "Gol da vitória"; }
    }
  }
}
// o resultado de um jogo para o palpite: A, B ou E (empate; no mata-mata sempre tem vencedor)
const certoDe = (j) => (j.mataMata ? j.vencedor : j.gA > j.gB ? "A" : j.gB > j.gA ? "B" : "E");
// quem acertou o palpite desse jogo
function acertaramHTML(j) {
  const p = (S.reveal && S.reveal.palpites && S.reveal.palpites[j.id]) || {};
  const certo = certoDe(j);
  const nomes = Object.entries(p).filter(([, e]) => e === certo).map(([id]) => capById(id)).filter(Boolean).map((c) => esc(c.name));
  if (!Object.keys(p).length) return "";
  return nomes.length ? `${ic("alvo")}<span>Acertou o palpite: <b>${nomes.join(", ")}</b></span>` : `${ic("alvo")}<span>Ninguém acertou o palpite</span>`;
}

// ---------- a tabela da rodada, mexendo ----------
function desenhaTabela(box, tab, anima) {
  const antes = new Map(tab.antes.map((t, k) => [t.id, { k, p: t.p }])), H = 34;
  box.innerHTML = `<div class="tvCab"><span>#</span><span>Time</span><span>Pts</span><span>J</span><span>SG</span></div>` + tab.depois.map((t, k) => {
    const a = antes.get(t.id) || { k, p: 0 }, sobe = a.k - k, ganhou = t.p - a.p, sg = t.gp - t.gc;
    return `<div class="tvLin${me.capId && t.id === me.capId ? " meu" : ""}" data-de="${(a.k - k) * H}"><span>${k + 1}</span><span>${esc(t.nome)} ${sobe > 0 ? `<i class="sobe">▲${sobe}</i>` : sobe < 0 ? `<i class="cai">▼${-sobe}</i>` : ""}</span><span><b>${t.p}</b>${ganhou ? `<small>+${ganhou}</small>` : ""}</span><span>${t.j}</span><span>${sg > 0 ? "+" : ""}${sg}</span></div>`;
  }).join("");
  box.classList.remove("hidden");
  if (!anima) return;
  // cada linha começa onde estava antes da rodada e desliza até a posição nova
  const linhas = [...box.querySelectorAll(".tvLin")];
  linhas.forEach((l) => { l.style.transition = "none"; l.style.transform = `translateY(${l.dataset.de}px)`; });
  void box.offsetWidth;
  setTimeout(() => linhas.forEach((l, k) => { l.style.transition = `transform .9s cubic-bezier(.3,.9,.3,1) ${k * 40}ms`; l.style.transform = ""; }), 350);
}

// ---------- uma parte com jogos ----------
// o relógio da parte i: desde que foi revelada, sem o tempo parado nos duelos de pênalti
const tempoDaParte = (r, i) => agoraServidor() - r.quando[i] - Ritmo.pausado(r.pausas && r.pausas[i], agoraServidor());
const temPendente = (live) => live.jogos.some((j) => j.pendente);
// el: a parte (vazia); i: o número da parte. Os jogos são lidos de S.reveal a cada quadro: depois de cada pênalti
// decidido pela galera, o servidor manda o jogo de novo (com o gol, a prorrogação ou a próxima cobrança).
function montarAoVivo(el, i) {
  const r0 = S.reveal, live0 = r0.lives[i];
  el.innerHTML = `${live0.cab ? `<h2>${Icones.iconizar(esc(live0.cab))}</h2>` : ""}<div class="vivo"><div class="jogosVivo">${live0.jogos.map(jogoHTML).join("")}</div><div class="tabVivo hidden"></div></div><div class="revmd hidden"></div>`;
  const jogosEl = [...el.querySelectorAll(".jogoVivo")];
  // o texto da parte (sem o título, que já está em cima do placar)
  const mostraTexto = () => {
    const md = (S.reveal.sections || [])[i], box = el.querySelector(".revmd"), tmp = document.createElement("div");
    tmp.innerHTML = md ? mdToHtml(md) : "";
    if (tmp.firstElementChild && /^H[1-3]$/.test(tmp.firstElementChild.tagName)) tmp.firstElementChild.remove();
    box.innerHTML = tmp.innerHTML; box.classList.remove("hidden");
  };
  const terminou = (live) => {
    live.jogos.forEach((j, k) => desenhaJogo(jogosEl[k], j, momento(j, Infinity), false));
    if (live.tabela) desenhaTabela(el.querySelector(".tabVivo"), live.tabela, false);
    mostraTexto();
  };
  // o jogo toca para todo mundo, inclusive quem pediu "menos movimento" no aparelho (ex.: iPad com Reduzir Movimento):
  // o relógio e os gols são o conteúdo, não enfeite. Para essas pessoas, só somem os efeitos (a carta girando, o placar
  // pulando), pelo CSS. Antes, elas iam direto para o resultado final, antes de todo mundo.
  if (!r0.quando[i] || (!temPendente(live0) && tempoDaParte(r0, i) >= duracaoParte(live0))) return terminou(live0);
  let tabFeita = false;
  (function quadro() {
    if (!el.isConnected) return;
    const r = S.reveal, live = r && r.lives && r.lives[i];
    if (!live) return;
    const t = tempoDaParte(r, i), pendente = temPendente(live);
    live.jogos.forEach((j, k) => desenhaJogo(jogosEl[k], j, momento(j, t), true));
    const fimJogos = Math.max(...live.jogos.map(duracaoJogo)) + VIVO.FIM;
    if (live.tabela && !tabFeita && !pendente && t >= fimJogos) { tabFeita = true; desenhaTabela(el.querySelector(".tabVivo"), live.tabela, true); }
    if (!pendente && t >= duracaoParte(live)) { mostraTexto(); if (typeof renderReveal === "function") renderReveal(); return; }
    vivoAte = Math.max(vivoAte, agoraServidor() + 1500); // ainda rolando: a próxima parte espera
    setTimeout(quadro, 60); // relógio comum (não requestAnimationFrame): segue andando com a aba em segundo plano
  })();
}

// ---------- palpites e bolão ----------
function renderPalpites() {
  const r = S.reveal || {}, box = $("palpBox"); if (!box) return;
  const prox = r.lives ? r.proximos || [] : [], bolao = contaBolao(r);
  if (!prox.length && !bolao.length && !(vivoAte > agoraServidor())) { box.innerHTML = ""; return; }
  const p = r.palpites || {}, eu = me.capId;
  const nomes = (jid, e) => Object.entries(p[jid] || {}).filter(([, x]) => x === e).map(([id]) => capById(id)).filter(Boolean).map((c) => esc(c.name));
  const botao = (j, e, txt) => {
    const meu = eu && (p[j.id] || {})[eu] === e, quem = nomes(j.id, e);
    return `<button class="pbt${meu ? " on" : ""}" ${eu ? "" : "disabled"} onclick="palpitar('${j.id}','${e}')"><span>${esc(txt)}</span>${quem.length ? `<small>${quem.join(", ")}</small>` : ""}</button>`;
  };
  let h = "";
  if (!prox.length && vivoAte > agoraServidor() && r.shown < r.total) h += `<div class="palp espera">${ic("alvo")}Os palpites da próxima parte abrem quando estes jogos terminarem.</div>`;
  if (prox.length) h += `<div class="palp"><h3>${ic("alvo")}Palpites da próxima parte</h3><p class="hint">${eu ? "Quem você acha que ganha? Acertou, ganha 1 ponto no bolão. Fecha quando o organizador revelar." : "Os participantes palpitam quem ganha cada jogo antes de revelar."}</p>`
    + prox.map((j) => `<div class="pj">${j.titulo ? `<div class="pjt">${esc(j.titulo)}</div>` : ""}<div class="pbts">${botao(j, "A", j.A.nome)}${j.mataMata ? "" : botao(j, "E", "Empate")}${botao(j, "B", j.B.nome)}</div></div>`).join("") + `</div>`;
  if (bolao.length) {
    const acabou = r.shown >= r.total && vivoAte <= agoraServidor(), top = bolao[0].pts, reis = acabou && top > 0 ? bolao.filter((b) => b.pts === top) : [];
    h += `<div class="bolao"><h3>${ic("coroa")}Bolão</h3>${bolao.map((b, k) => `<div class="bl${reis.includes(b) ? " rei" : ""}${b.id === eu ? " meu" : ""}"><span>${k + 1}º</span><span>${esc(b.nome)}${reis.includes(b) ? ` ${ic("coroa")} rei do bolão` : ""}</span><b>${b.pts} pt${b.pts === 1 ? "" : "s"}</b></div>`).join("")}</div>`;
  }
  box.innerHTML = h;
}
// o bolão: 1 ponto por palpite certo, contando só os jogos que já terminaram na tela
function contaBolao(r) {
  if (!r.lives) return [];
  const pts = {};
  r.lives.forEach((live, i) => {
    if (!live) return;
    const acabou = !r.quando[i] || (!temPendente(live) && tempoDaParte(r, i) >= duracaoParte(live));
    for (const j of live.jogos) for (const [id, e] of Object.entries((r.palpites || {})[j.id] || {})) {
      pts[id] = (pts[id] || 0) + (acabou && e === certoDe(j) ? 1 : 0);
    }
  });
  for (const j of r.proximos || []) for (const id of Object.keys((r.palpites || {})[j.id] || {})) pts[id] = pts[id] || 0;
  return Object.entries(pts).map(([id, p]) => ({ id, nome: (capById(id) || {}).name || "?", pts: p })).sort((a, b) => b.pts - a.pts);
}
function palpitar(jogo, escolha) {
  socket.emit("palpite", { jogo, escolha }, (r) => { if (r && !r.ok) toast(r.error); });
}

// ---------- o duelo de pênalti ----------
// Aparece por cima da página para todo mundo enquanto o servidor tem um duelo aberto (S.reveal.duelo). O dono do time
// que bate escolhe o canto; o do outro time, para onde o goleiro pula (o gol visto de quem bate). Os outros assistem.
// Com o resultado, toca o replay com a bola e o goleiro indo para os cantos escolhidos.
let dueloChave = "", minhaZona = null;
const ZONA_CURTA = { ea: "Esquerda alto", ma: "Meio alto", da: "Direita alto", eb: "Esquerda baixo", mb: "Meio baixo", db: "Direita baixo" };
function renderDuelo() {
  const r = S && S.reveal, d = r && r.duelo;
  let box = $("duelo");
  if (!d) { if (box) box.remove(); dueloChave = ""; minhaZona = null; return; }
  const chave = `${d.id}|${d.escolheu.chute}|${d.escolheu.pulo}|${d.resultado ? 1 : 0}`;
  if (chave === dueloChave && box) return;
  if (!dueloChave.startsWith(d.id + "|")) minhaZona = null;
  dueloChave = chave;
  if (!box) { box = document.createElement("div"); box.id = "duelo"; box.className = "duelo"; document.body.appendChild(box); }
  const j = ((r.lives[d.parte] || {}).jogos || []).find((x) => x.id === d.jogo) || { A: { nome: "" }, B: { nome: "" }, mins: 40, extra: 0, id: d.jogo };
  const cap = (id) => (capById(id) || {}).name || "?", eu = me.capId;
  const papel = eu && eu === d.bate ? "chute" : eu && eu === d.defende ? "pulo" : null, escolhi = papel && (d.escolheu[papel] || minhaZona);
  const titulo = d.tipo === "disputa" ? `Disputa de pênaltis · ${d.cob + 1}ª cobrança` : `Pênalti · ${d.min}'`;
  const time = (lado) => esc(lado === "A" ? j.A.nome : j.B.nome);
  const status = (quem, foi) => `<span class="${foi ? "ok" : ""}">${foi ? ic("ok") : ic("relogio")}${esc(cap(quem))}</span>`;
  let corpo;
  if (d.resultado) {
    const res = d.resultado.fora ? "fora" : d.resultado.gol ? "gol" : "defesa";
    corpo = `<div class="dlTelao"></div><b class="dlRes ${res}">${{ gol: "Gol!", defesa: "Defendeu!", fora: "Pra fora!" }[res]}</b>
      <p class="dlCantos">${ic("bola")}${ZONA_CURTA[d.resultado.chute]} · ${ic("luva")}${ZONA_CURTA[d.resultado.pulo]}</p>`;
  } else {
    const instr = papel === "chute" ? "Você bate! Escolha o canto." : papel === "pulo" ? "Você está no gol! Para onde o goleiro pula?" : `${esc(cap(d.bate))} escolhe onde bater; ${esc(cap(d.defende))}, para onde o goleiro pula.`;
    const falta = Math.max(0, d.prazo - agoraServidor()), dur = d.tipo === "disputa" ? Ritmo.DUELO.DISPUTA : Ritmo.DUELO.JOGO;
    corpo = `<p class="dlInstr">${escolhi ? "Escolhido! Esperando o outro lado…" : instr}</p>
      <div class="dlGol">${Ritmo.ZONAS.map((z) => `<button type="button" data-z="${z}" class="${escolhi === z ? "on" : ""}" ${papel && !escolhi ? "" : "disabled"} aria-label="${ZONA_CURTA[z]}">${escolhi === z ? ic(papel === "pulo" ? "luva" : "bola") : ""}</button>`).join("")}</div>
      <p class="dlVisto">o gol visto de quem bate</p>
      <div class="dlTempo"><i style="animation-duration:${dur}ms;animation-delay:${falta - dur}ms"></i></div>
      <p class="dlStatus">${status(d.bate, d.escolheu.chute)}${status(d.defende, d.escolheu.pulo)}</p>`;
  }
  box.innerHTML = `<div class="dlCard"><div class="dlTopo">${ic("apito")}${titulo}</div>
    <p class="dlQuem"><b>${esc(d.batedor)}</b> <small>(${time(d.lado)})</small> × <b>${esc(d.goleiro)}</b> <small>(${time(d.lado === "A" ? "B" : "A")})</small></p>${corpo}</div>`;
  box.querySelectorAll(".dlGol button:not(:disabled)").forEach((b) => (b.onclick = () => {
    minhaZona = b.dataset.z; dueloChave = ""; renderDuelo();
    socket.emit("penalti", { zona: b.dataset.z }, (x) => { if (x && !x.ok) { toast(x.error); minhaZona = null; dueloChave = ""; renderDuelo(); } });
  }));
  if (d.resultado) {
    const g = { min: d.min || j.mins + j.extra, lado: d.lado, nome: d.batedor };
    box.querySelector(".dlTelao").appendChild(Lances.criar(g, j, { nome: sobrenome(d.batedor), auto: true, cobranca: { ...d.resultado, goleiro: d.goleiro } }));
  }
}
