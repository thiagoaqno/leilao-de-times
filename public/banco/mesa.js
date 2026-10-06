// Banco da Galera — o tabuleiro, a visão inclinada e as peças em pé (parte 2 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- tabuleiro ----------
// Linha, coluna e lado de cada casa. S = casas por lado (10 no normal, 13 no grande).
function gridPos(i) {
  const S = T.SIDE, L = S + 1;
  if (i === 0) return [L, L, "bottom"];
  if (i < S) return [L, L - i, "bottom"];
  if (i === S) return [L, 1, "bottom"];
  if (i < 2 * S) return [L - (i - S), 1, "left"];
  if (i === 2 * S) return [1, 1, "top"];
  if (i < 3 * S) return [1, 1 + (i - 2 * S), "top"];
  if (i === 3 * S) return [1, L, "top"];
  return [1 + (i - 3 * S), L, "right"];
}
const CORNER_ICON = { go: ic("dir"), jail: ic("viatura"), free: ic("guardasol"), gojail: ic("policial") };
const CORNER_LABEL = { go: "INÍCIO", jail: "PRISÃO", free: "FÉRIAS", gojail: "VÁ PARA A PRISÃO" };
function buildBoard() {
  const b = $("board"); if (b.dataset.built) return; b.dataset.built = 1;
  const grid = `1.55fr repeat(${T.SIDE - 1},1fr) 1.55fr`;
  b.style.gridTemplateColumns = grid; b.style.gridTemplateRows = grid;
  b.classList.toggle("big", T.SIDE > 10);
  let html = "";
  BOARD.forEach((s, i) => {
    const [r, c, side] = gridPos(i), corner = i % T.SIDE === 0;
    let inner;
    if (corner) inner = `<div class="body"><div class="ic">${CORNER_ICON[s.type]}</div><div class="cd">${CORNER_LABEL[s.type]}</div>${i === 0 ? `<div class="pr">+${short(200)}</div>` : ""}</div>`;
    else if (s.type === "prop") inner = `<div class="band"></div><div class="body"><div class="pill" style="--g:${GROUPS[s.group].color};--gi:${GROUPS[s.group].ink}">${h(s.name)}</div><div class="pr">${short(s.price)}</div></div>`;
    else {
      const icone = s.type === "air" ? ic("aviao") : s.type === "util" ? Icones.iconizar(s.icon) : s.type === "card" ? ic("interrogacao") : s.type === "tax" ? ic("recibo") : "";
      inner = `<div class="body"><div class="ic">${icone}</div><div class="nm2">${h(s.name)}</div>${s.price ? `<div class="pr">${short(s.price)}</div>` : s.amount ? `<div class="pr">${short(s.amount)}</div>` : ""}</div>`;
    }
    html += `<div class="sq ${corner ? "corner" : "s-" + side} t-${s.type}" id="sq${i}" data-i="${i}" style="grid-row:${r};grid-column:${c}" title="${h(s.name)}">${inner}</div>`;
  });
  html += `<div class="center" id="center" style="grid-column:2/${T.SIDE + 1};grid-row:2/${T.SIDE + 1}"><div class="logo">Banco da<span>Galera</span></div><div class="cofre" id="cofre" title="O banco"><div class="cofre-pilha"><i></i><i></i><i></i><i></i><i></i></div><span>Banco</span></div><div class="piles"><div class="pile cards" id="pileCard"><b>?</b><small id="pileCardN">Sorte ou Revés</small></div><div class="pile deeds" id="pileDeed"><div class="dback"><span class="orn tl">❖</span><span class="orn tr">❖</span><span class="orn bl">❖</span><span class="orn br">❖</span><div class="seal"><b>BG</b></div></div><small id="pileDeedN"></small></div></div><div class="pot" id="pot"></div></div>`;
  b.innerHTML = html;
  if (b.dataset.listen) { layout(); return; } // ouvintes só na primeira vez
  b.dataset.listen = 1;
  b.addEventListener("click", (e) => {
    const sq = e.target.closest(".sq"); if (!sq) return;
    const i = +sq.dataset.i, c = S && S.choice;
    // carta de poder: tocar na casa destacada escolhe o alvo
    if (c && ME && c.player === ME.id && c.step === 1 && c.options.includes(i)) return act("choose", { value: i });
    if (BOARD[i].price) openModal({ kind: "prop", i });
  });
  new ResizeObserver(() => layout()).observe($("bwrap"));
  if (document.fonts) document.fonts.ready.then(() => layout());
}

// ---------- visão inclinada ou de cima ----------
function setView(flat) {
  document.body.classList.toggle("flat", flat);
  $("btnView").innerHTML = flat ? `${ic("camera")}<span class="lg">Visão inclinada</span>` : `${ic("baixo")}<span class="lg">Visão de cima</span>`;
  $("btnView").title = flat ? "Visão inclinada" : "Visão de cima";
  store.set("banco:vista", flat ? "cima" : "inclinada");
  // acompanha a animação da câmera
  const t0 = performance.now();
  (function f() { layout(); if (performance.now() - t0 < 800) requestAnimationFrame(f); })();
}
$("btnView").onclick = () => setView(!document.body.classList.contains("flat"));
setView(store.get("banco:vista") !== "inclinada");

// ---------- peças em pé ----------
// Peões, casas, hotéis e dados ficam numa camada por cima do tabuleiro inclinado. A posição de
// cada um sai da projeção da casa na tela, então acompanham qualquer inclinação ou tamanho.
function proj(el, wr) {
  const r = el.getBoundingClientRect();
  return { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2, r, sc: r.width / (el.offsetWidth || 1) };
}
const pieceEls = {}, bldEls = {}, hopping = {}, demolidaEm = {};
let bldReady = false;
// Casa ou hotel voando entre o banco (no meio do tabuleiro) e a cidade: construir traz do banco, vender devolve.
// "de" e "para" são pontos da tela (o pé da casa); sc é o tamanho dela no tabuleiro.
const semMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function voaCasa(svg, de, para, sc, delay, volta) {
  const el = document.createElement("div");
  el.className = "casaVoa"; el.innerHTML = svg; $("fly").appendChild(el);
  const lift = Math.min(130, 50 + Math.hypot(para.x - de.x, para.y - de.y) * 0.25);
  const at = (x, y, s, r) => `translate(${x}px, ${y}px) translate(-50%, -100%) rotate(${r}deg) scale(${s})`;
  const mx = (de.x + para.x) / 2, my = (de.y + para.y) / 2 - lift;
  const quadros = [
    { transform: at(de.x, de.y, sc * (volta ? 1 : 0.4), 0), opacity: volta ? 1 : 0 },
    { transform: at(de.x + (para.x - de.x) * 0.12, de.y - 30, sc * 1.5, -8), opacity: 1, offset: 0.25 },
    { transform: at(mx, my, sc * 1.6, 6), opacity: 1, offset: 0.6 },
    { transform: at(para.x, para.y, sc * (volta ? 0.4 : 1), 0), opacity: volta ? 0 : 1 },
  ];
  return el.animate(quadros, { duration: 950, delay, easing: "cubic-bezier(.37,0,.25,1)", fill: "both" }).finished.then(() => el.remove(), () => el.remove());
}
// casa: parede da frente, parede do lado mais escura, telhado de duas águas, chaminé, porta e janela acesa
const HOUSE_SVG = `<svg width="22" height="25" viewBox="0 0 24 27"><g stroke="#0b2e19" stroke-width=".7" stroke-linejoin="round">
<path d="M15 12 L22 8.6 V19.6 L15 23 Z" fill="#23864a"/><rect x="2" y="12" width="13" height="11" fill="#3fc27a"/>
<path d="M17.4 4.2 h2.2 v4.4 l-2.2 1.1 Z" fill="#8e3a2c"/>
<path d="M1 12.6 L8.5 4.6 L16 12.6 Z" fill="#e0533f"/><path d="M8.5 4.6 L15.6 1.2 L23 8.9 L16 12.6 Z" fill="#a8362a"/></g>
<rect x="6.8" y="16.4" width="3.4" height="6.6" rx=".5" fill="#6b3e1f"/><rect x="3.4" y="14" width="2.6" height="2.6" fill="#ffe8a3"/><rect x="11.2" y="14" width="2.6" height="2.6" fill="#ffe8a3"/>
<path d="M17.2 14.2 l3 -1.5 v2.6 l-3 1.5 Z" fill="#ffe8a3" opacity=".8"/></svg>`;
// hotel: prédio alto com janelas acesas, lateral mais escura e placa "H" dourada
const HOTEL_SVG = `<svg width="34" height="42" viewBox="0 0 34 42"><g stroke="#4d0c08" stroke-width=".8" stroke-linejoin="round">
<path d="M22 13 L31 8.6 V36.6 L22 41 Z" fill="#a8261d"/><rect x="2" y="13" width="20" height="28" fill="#e74c3c"/>
<path d="M2 13 L11 8.6 H31 L22 13 Z" fill="#7d1c15"/></g>
${[0, 1, 2, 3, 4].map((r) => [4.5, 10.5, 16.5].map((x) => `<rect x="${x}" y="${16 + r * 4.6}" width="3.2" height="2.8" fill="${(r + x) % 3 ? "#ffe39a" : "#fff6cf"}"/>`).join("") + `<path d="M24 ${17.5 + r * 4.6} l5 -2.4 v2.6 l-5 2.4 Z" fill="#ffd66b" opacity=".75"/>`).join("")}
<rect x="9.4" y="35.5" width="5.2" height="5.5" fill="#4d0c08"/>
<circle cx="17" cy="5.6" r="5" fill="#f2c14e" stroke="#7a5200" stroke-width=".9"/><text x="17" y="8.6" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="8" fill="#5a3d00">H</text></svg>`;

function layout() {
  if (!S || S.phase === "lobby" || !$("board").dataset.built) return;
  const wrap = $("bwrap"), wr = wrap.getBoundingClientRect(), board = $("board");
  if (!board.offsetWidth) return;
  const unit = board.offsetWidth / (T.SIDE + 2.1); // largura de uma casa comum, sem inclinação
  // a borda da frente do tabuleiro inclinado passa do espaço dele: reserva o que falta embaixo
  const scene = document.querySelector(".scene"), pb = parseFloat(scene.style.paddingBottom) || 10;
  const need = Math.max(10, Math.ceil(document.querySelector(".plane").getBoundingClientRect().bottom - (scene.getBoundingClientRect().bottom - pb) + 10));
  if (Math.abs(need - pb) > 2) scene.style.paddingBottom = need + "px";
  const c = proj($("center"), wr);
  wrap.style.setProperty("--u", (board.offsetWidth / 100) * c.sc + "px");
  const hud = $("hud"); hud.style.left = c.x + "px"; hud.style.top = c.y + c.r.height * 0.16 + "px";
  // destaque no meio do tabuleiro; a carta sai de cima da pilha
  const sp = $("spot");
  if (!sp.classList.contains("hidden")) {
    sp.style.left = c.x + "px"; sp.style.top = c.y + "px";
    sp.style.width = Math.round(Math.min(440, Math.max(250, board.offsetWidth * 0.6))) + "px";
    const pc = proj($("pileCard"), wr);
    sp.style.setProperty("--fx", pc.x - c.x + "px"); sp.style.setProperty("--fy", pc.y - c.y + "px");
  }

  // peões
  const by = {}, alive = new Set();
  for (const p of S.players) if (!p.bankrupt) { const k = disp[p.id] ?? p.pos; (by[k] = by[k] || []).push(p); }
  for (const [i, list] of Object.entries(by)) {
    const a = proj($("sq" + i).querySelector(".body"), wr);
    const s = (unit / 50) * a.sc;
    list.forEach((p, k) => {
      let el = pieceEls[p.id];
      if (!el) { el = document.createElement("div"); el.innerHTML = `<div class="gnd"></div><div class="fig"></div>`; $("pieces").appendChild(el); pieceEls[p.id] = el; }
      alive.add(p.id);
      const x = a.x + (k - (list.length - 1) / 2) * 20 * s * (list.length > 3 ? 0.8 : 1);
      const y = a.y + a.r.height * 0.22 + (k % 2 ? -5 : 3) * s;
      el.className = `piece ${ME && p.id === ME.id ? "me" : ""} ${p.inJail && +i === T.JAIL && !walking[p.id] ? "jailed" : ""} ${hopping[p.id] ? "hop" : ""} ${flyUntil[p.id] > Date.now() ? "fly" : ""} ${chegouAte[p.id] > Date.now() ? "chegou" : ""}`;
      el.style.left = x + "px"; el.style.top = y + "px"; el.style.zIndex = Math.round(y);
      el.style.setProperty("--s", s.toFixed(3)); el.style.setProperty("--c", p.color);
      el.title = p.name;
      const fig = el.querySelector(".fig"), chave = p.pawn + p.color; if (fig.dataset.p !== chave) { fig.dataset.p = chave; fig.innerHTML = Peoes.svg(p.color, p.pawn, { tam: 40 }); }
    });
  }
  for (const id of Object.keys(pieceEls)) if (!alive.has(id)) { pieceEls[id].remove(); delete pieceEls[id]; }

  // casas e hotéis em cima da faixa de cor de cada cidade
  const want = new Set(), chegam = [], banco = spotEl($("dice"));
  for (const [i, pr] of Object.entries(S.props)) {
    if (!pr.houses) continue;
    const band = $("sq" + i).querySelector(".band"); if (!band) continue;
    const b = proj(band, wr), hotel = pr.houses === 5, n = hotel ? 1 : pr.houses;
    const across = band.offsetWidth >= band.offsetHeight; // faixa deitada (linhas de cima e de baixo)
    const s = (unit / (hotel ? 44 : 52)) * c.sc; // mesma escala para todas: nenhuma casa ou hotel maior que outro
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = across ? b.r.left - wr.left + b.r.width * (0.1 + 0.8 * t) : b.x;
      const y = across ? b.y + b.r.height * 0.3 : b.r.top - wr.top + b.r.height * (0.12 + 0.8 * t);
      const key = `${i}-${k}-${hotel ? "h" : "c"}`;
      want.add(key);
      let el = bldEls[key];
      let novo = false;
      if (!el) { novo = true; el = document.createElement("div"); el.className = "bld" + (bldReady ? " new" : ""); el.innerHTML = hotel ? HOTEL_SVG : HOUSE_SVG; $("pieces").appendChild(el); bldEls[key] = el; }
      el.style.left = x + "px"; el.style.top = y + "px"; el.style.zIndex = Math.round(y) - 1;
      el.style.setProperty("--s", s.toFixed(3));
      // construiu: a casa vem voando do banco e só aparece no lugar quando chega
      if (novo && bldReady && !semMovimento() && !document.hidden) { el.className = "bld esperando"; chegam.push({ el, svg: hotel ? HOTEL_SVG : HOUSE_SVG, para: { x: wr.left + x, y: wr.top + y }, s }); }
    }
  }
  let saem = 0;
  for (const key of Object.keys(bldEls)) if (!want.has(key)) {
    // vendeu (ou trocou 4 casas por um hotel): volta voando para o banco. Demolida não volta.
    const el = bldEls[key], sq = +key.split("-")[0], svg = el.querySelector("svg");
    if (bldReady && !semMovimento() && !document.hidden && svg && !(Date.now() - (demolidaEm[sq] || 0) < 3000)) {
      const r = svg.getBoundingClientRect();
      voaCasa(el.innerHTML, { x: r.left + r.width / 2, y: r.bottom }, banco, +el.style.getPropertyValue("--s") || 1, saem++ * 90, true);
    }
    el.remove(); delete bldEls[key];
  }
  // as que chegam saem depois das que voltam (no hotel: as 4 casas voltam e o hotel vem)
  chegam.forEach((c, k) => voaCasa(c.svg, banco, c.para, c.s, (saem ? 450 : 0) + k * 130, false).then(() => { c.el.classList.remove("esperando"); c.el.classList.add("pousou"); Sound.play("knock"); }));
  bldReady = true;
}

// peões andando casa por casa (depois que os dados param)
const disp = {}, walking = {}, flyUntil = {}, chegouAte = {};
let lastMove = null;
function syncTokens(delay) {
  const m = S.move;
  if (m && m.seq !== lastMove) {
    const from = disp[m.player];
    if (m.jail && lastMove !== null) { flyUntil[m.player] = Date.now() + 1000; setTimeout(layout, 1050); Sound.play("siren"); setTimeout(() => chegou(m.player, T.JAIL), 1100); }
    else if (lastMove !== null && from != null && from !== m.to) {
      walking[m.player] = true;
      setTimeout(() => walk(m.player, from, m.to, m.steps < 0 ? -1 : 1, m.ms || 170), Math.max(0, rollingUntil - Date.now()));
    }
    lastMove = m.seq;
  }
  for (const p of S.players) if (!walking[p.id]) disp[p.id] = p.pos;
  layout();
}
function walk(pid, from, to, dir, ms) {
  const N = BOARD.length, n = dir > 0 ? (to - from + N) % N : (from - to + N) % N;
  disp[pid] = from;
  if (!n) { walking[pid] = false; return layout(); }
  let k = 0;
  (function step() {
    disp[pid] = (disp[pid] + dir + N) % N; k++;
    hopping[pid] = true; layout(); Sound.play("step");
    setTimeout(() => { hopping[pid] = false; }, ms - 30);
    if (k < n) setTimeout(step, ms);
    else setTimeout(() => { walking[pid] = false; disp[pid] = P(pid)?.pos ?? to; layout(); chegou(pid, disp[pid]); }, 200);
  })();
}

// o peão parou numa casa: o pulinho de chegada, a onda e, se for o meu, o cartão da casa
function chegou(pid, i) {
  const p = P(pid); if (!p) return;
  chegouAte[pid] = Date.now() + 460; layout(); setTimeout(layout, 480); // o quique de chegada (a classe fica enquanto durar)
  ondaNaCasa(i, p.color);
  if (ME && pid === ME.id) setTimeout(() => mostrarCasa(i), 180);
}
// quem era o dono de cada casa no último desenho (para o carimbo de compra)
const donoVisto = {};
let donosProntos = false;
function renderBoard() {
  buildBoard();
  for (let i = 0; i < BOARD.length; i++) {
    const s = BOARD[i]; if (!s.price) continue;
    const el = $("sq" + i), pr = S.props[i], owner = pr && P(pr.owner);
    el.classList.toggle("owned", !!owner);
    const antes = donoVisto[i]; donoVisto[i] = owner ? owner.id : null;
    if (donosProntos && owner && antes !== owner.id) { el.classList.remove("carimbo"); void el.offsetWidth; el.classList.add("carimbo"); } // comprou (ou trocou de dono): carimbo
    if (owner) { el.style.setProperty("--oc", owner.color); el.dataset.pawn = owner.pawn; } else delete el.dataset.pawn;
    el.classList.toggle("shield", !!(pr && pr.shield));
    el.classList.toggle("pick", !!(S.choice && S.choice.step === 1 && S.choice.options.includes(i)));
    el.classList.toggle("mort", !!(pr && pr.mortgaged));
    el.classList.toggle("hot", S.buyOffer === i || (S.auction && S.auction.prop === i));
  }
  donosProntos = true;
  const free = T.OWNABLE.filter((i) => !S.props[i]).length;
  $("pileDeedN").textContent = free ? `${free} à venda` : "tudo vendido";
  $("pileDeed").classList.toggle("empty", !free);
  $("pileCardN").textContent = `Sorte ou Revés · ${S.deckCount}`;
  const rolled = renderCenter();
  syncTokens(rolled);
}

// Dados de verdade: um cubo com as 6 faces (CSS 3D). Jogados, caem do alto em cima do tabuleiro girando, quicam duas
// vezes e param com o resultado virado para cima, cada um meio torto. O giro final de cada dado fica guardado para o
// desenho parado bater com o fim da queda.
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const FACE_GIRO = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] }; // [rotateX, rotateY] que põe a face n para cima
const QUEDA_MS = 1250;
const dadoGiro = [-6, 9];
const sorteia = (a, b) => a + Math.random() * (b - a), sinal = () => (Math.random() < 0.5 ? -1 : 1);
const faceHTML = (v) => `<div class="f f${v}">${Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[v].includes(k) ? "on" : ""}"></i>`).join("")}</div>`;
const FACES = [1, 2, 3, 4, 5, 6].map(faceHTML).join("");
function dieHTML(n, k, cai) {
  const [fx, fy] = FACE_GIRO[n] || [0, 0];
  let st = `--fx:${fx}deg;--fy:${fy}deg;--fz:${dadoGiro[k]}deg`;
  if (cai) st += `;--tx:${sinal() * 360 * (2 + Math.round(Math.random()))}deg;--ty:${sinal() * 360 * (1 + Math.round(Math.random()))}deg;--tz:${sorteia(-200, 200).toFixed(0)}deg`
    + `;--sx:calc(var(--u) * ${((k ? 1 : -1) * sorteia(10, 18)).toFixed(1)});--sy:calc(var(--u) * ${(-sorteia(12, 20)).toFixed(1)})`;
  return `<div class="die3d${cai ? " cai" : ""}${k ? " k1" : ""}" style="${st}"><div class="sombra"></div><div class="cubo">${FACES}</div></div>`;
}
let lastRollT = 0, lastCard = null, rollingUntil = 0, dadosVistos = "";
// Devolve true quando os dados acabaram de ser jogados (para o peão esperar eles pararem).
function renderCenter() {
  const cur = P(S.turn), d = S.dice || [1, 1];
  let status = "";
  if (S.phase === "ended") status = `${ic("taca", "ouro")} ${h(P(S.winner)?.name || "")} venceu!`;
  else if (cur) status = `Vez de <span style="color:${cur.color}">${peao(cur.pawn)}</span> ${h(cur.name)} · rodada ${S.round}${S.deadline && S.deadline.who === cur.id ? ` · <span class="clock" data-clock="turn"></span>` : ""}`;
  $("status").innerHTML = status;
  $("evchip").classList.toggle("hidden", !(S.event && S.phase === "playing"));
  if (S.event) $("evchip").textContent = `${S.event.icon} ${S.event.name}`;
  $("pot").textContent = S.config.freeParking ? `🏖️ Pote das Férias: ${money(S.jackpot)}` : "";
  // dados: quando sai um lance novo no histórico, caem no tabuleiro já com o resultado (que o servidor mandou junto)
  const r = [...S.log].reverse().find((l) => l.text.startsWith("🎲 ") && !l.text.startsWith("🎲 Começou"));
  let rolled = false;
  if (r && r.t > lastRollT) { rolled = !!lastRollT; lastRollT = r.t; }
  if (rolled && !document.hidden) {
    rollingUntil = Date.now() + QUEDA_MS + 80;
    dadoGiro[0] = sorteia(-16, 16); dadoGiro[1] = sorteia(-16, 16);
    $("dice").innerHTML = dieHTML(d[0], 0, true) + dieHTML(d[1], 1, true); dadosVistos = "";
    Sound.play("dice");
    for (const at of [0.4, 0.68]) setTimeout(() => Sound.play("knock"), QUEDA_MS * at); // as batidas no tabuleiro
    setTimeout(() => {
      if (d[0] === d[1]) { const b = $("dice").getBoundingClientRect(); popAt({ x: b.left + b.width / 2, y: b.top }, "Dupla!", "dupla"); }
    }, QUEDA_MS);
    setTimeout(renderCenter, QUEDA_MS + 120);
  } else if (Date.now() >= rollingUntil) {
    const k = d.join() + dadoGiro.join(); // parados: só redesenha se mudou
    if (k !== dadosVistos) { dadosVistos = k; $("dice").innerHTML = dieHTML(d[0], 0) + dieHTML(d[1], 1); }
  }
  return rolled;
}
