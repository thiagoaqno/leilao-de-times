// Leilão da Galera — o campeonato ao vivo (carregado depois das outras partes do script da página; divide as mesmas
// variáveis globais: S, me, socket, $, esc, toast, clockSkew, renderReveal).
// Cada parte revelada que tem jogos toca como um placar de TV: o relógio corre, os gols entram no minuto certo com a
// carta de quem marcou, a prorrogação e os pênaltis aparecem cobrança por cobrança. Depois, a tabela da rodada se
// mexe (quem subiu, quem caiu) e só então aparece o texto da narração. Todo mundo vê junto: o tempo de cada parte
// conta a partir da hora em que o organizador revelou (no relógio do servidor).
// Os tempos de cada pedaço do jogo ficam em ritmo.js (o servidor usa a mesma conta).
const { RITMO: VIVO, duracaoJogo, duracaoParte } = Ritmo;
const agoraServidor = () => Date.now() + (typeof clockSkew === "number" ? clockSkew : 0);
// até quando tem jogo rolando (o organizador espera para revelar a próxima)
let vivoAte = 0;

// ---------- a carta do jogador que marcou ----------
const sobrenome = (n) => { const p = String(n).trim().split(/s+/); return p.length > 1 && p[p.length - 1].length > 2 ? p[p.length - 1] : p[0]; };
// a mesma carta do leilão (carta.js), com a faixa do gol embaixo; sai do lado do time que marcou
function cartaGol(g, time, hat) {
  return `<div class="cartaGol lado${g.lado}${hat ? " hat" : ""}" aria-hidden="true">${cartaHTML(g.nome)}
    <div class="cgFaixa">${hat ? ic("cartola") + "Hat-trick" : ic("bola") + "Gol"} · ${g.min}'</div></div>`;
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
    </div>
    <div class="jvFase">1º tempo</div>
    <div class="jvLances"><div class="la"></div><div class="lb"></div></div>
    <div class="jvPens hidden"><div class="pa"></div><div class="pb"></div></div>
    <div class="jvPalp"></div>
  </div>`;
}
// o jogo no instante t (ms desde o apito): minuto, fase, gols que já saíram e cobranças já batidas
function momento(j, t) {
  const fimReg = VIVO.REG, fimExtra = fimReg + (j.extra ? VIVO.PRORR : 0);
  let min, fase, cob = 0;
  if (t < fimReg) { min = (t / VIVO.REG) * j.mins; fase = min < j.mins / 2 ? "1º tempo" : "2º tempo"; }
  else if (t < fimExtra) { min = j.mins + ((t - fimReg) / VIVO.PRORR) * j.extra; fase = "Prorrogação"; }
  else if (j.pens && t < duracaoJogo(j)) { min = j.mins + j.extra; fase = "Pênaltis"; cob = Math.max(0, Math.floor((t - fimExtra - VIVO.PEN0) / VIVO.PEN) + 1); }
  else { min = j.mins + j.extra; fase = "Fim de jogo"; cob = j.pens ? j.pens.cob.length : 0; }
  const gols = j.gols.filter((g) => g.min <= min);
  return { min, fase, gols, cob, fim: fase === "Fim de jogo" };
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
    // a lista de gols de cada lado, e a carta de quem marcou nos que acabaram de sair
    const lista = (lado) => m.gols.filter((g) => g.lado === lado).map((g) => `<div>${ic("bola")}${esc(sobrenome(g.nome))} ${g.min > j.mins ? `${g.min}' (prorr.)` : `${g.min}'`}</div>`).join("");
    q(".la").innerHTML = lista("A"); q(".lb").innerHTML = lista("B");
    if (anima) for (const g of m.gols.slice(vistos)) {
      const hat = m.gols.filter((x) => x.nome === g.nome && x.lado === g.lado && x.min <= g.min).length === 3;
      fila(el, cartaGol(g, g.lado === "A" ? j.A.nome : j.B.nome, hat));
      const placar = q(g.lado === "A" ? ".ga" : ".gb"); placar.classList.remove("pulou"); void placar.offsetWidth; placar.classList.add("pulou");
    }
    el.dataset.gols = m.gols.length;
  }
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
  }
}
// as cartas de um jogo entram uma de cada vez; com fila (muitos gols seguidos), cada uma fica menos tempo,
// e as que sobrarem depois do apito final não entram
function fila(el, html) {
  el._pend = (el._pend || 0) + 1;
  el._fila = (el._fila || Promise.resolve()).then(() => new Promise((ok) => {
    el._pend--;
    if (!el.isConnected || el.classList.contains("acabou")) return ok();
    const ms = el._pend ? 950 : 1900;
    const box = document.createElement("div"); box.innerHTML = html; const c = box.firstElementChild;
    c.style.animationDuration = ms + "ms";
    el.appendChild(c); setTimeout(() => { c.remove(); ok(); }, ms);
  }));
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
// el: a parte (vazia); live: { jogos, tabela? }; inicio: hora do servidor em que foi revelada (0 = já terminada)
function montarAoVivo(el, live, inicio, mdHtml) {
  // o título da parte (o primeiro título do texto) vai em cima do placar
  const tmp = document.createElement("div"); tmp.innerHTML = mdHtml;
  const tit = tmp.firstElementChild && /^H[1-3]$/.test(tmp.firstElementChild.tagName) ? tmp.firstElementChild : null;
  if (tit) tit.remove();
  el.innerHTML = `${tit ? tit.outerHTML : ""}<div class="vivo"><div class="jogosVivo">${live.jogos.map(jogoHTML).join("")}</div><div class="tabVivo hidden"></div></div><div class="revmd hidden">${tmp.innerHTML}</div>`;
  const total = duracaoParte(live), jogosEl = [...el.querySelectorAll(".jogoVivo")];
  const terminou = () => {
    live.jogos.forEach((j, k) => desenhaJogo(jogosEl[k], j, momento(j, Infinity), false));
    if (live.tabela) desenhaTabela(el.querySelector(".tabVivo"), live.tabela, false);
    el.querySelector(".revmd").classList.remove("hidden");
  };
  // o jogo toca para todo mundo, inclusive quem pediu "menos movimento" no aparelho (ex.: iPad com Reduzir Movimento):
  // o relógio e os gols são o conteúdo, não enfeite. Para essas pessoas, só somem os efeitos (a carta girando, o placar
  // pulando), pelo CSS. Antes, elas iam direto para o resultado final, antes de todo mundo.
  if (!inicio || agoraServidor() - inicio >= total) return terminou();
  vivoAte = Math.max(vivoAte, inicio + total);
  let tabFeita = false;
  (function quadro() {
    if (!el.isConnected) return;
    const t = agoraServidor() - inicio;
    live.jogos.forEach((j, k) => desenhaJogo(jogosEl[k], j, momento(j, t), true));
    const fimJogos = Math.max(...live.jogos.map(duracaoJogo)) + VIVO.FIM;
    if (live.tabela && !tabFeita && t >= fimJogos) { tabFeita = true; desenhaTabela(el.querySelector(".tabVivo"), live.tabela, true); }
    if (t >= total) { el.querySelector(".revmd").classList.remove("hidden"); if (typeof renderReveal === "function") renderReveal(); return; }
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
  const pts = {}, agora = agoraServidor();
  r.lives.forEach((live, i) => {
    if (!live) return;
    const acabou = !r.quando[i] || agora - r.quando[i] >= duracaoParte(live);
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
