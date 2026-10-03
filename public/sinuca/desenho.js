// Sinuca da Galera — o desenho a cada quadro e o placar (parte 4 de 5 do script da página; os arquivos rodam em ordem, pelo
// index.html, e dividem as mesmas variáveis globais, como quando era um <script> só).
// ---------- desenho a cada quadro ----------
function frame() {
  requestAnimationFrame(frame);
  if (!S || !S.g || $("game").classList.contains("hidden") || !tableImg) return;
  const c = g2;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(tableImg, 0, 0);
  worldTf(c);
  const st = shown(), g = st.g;
  // sons e fim da animação
  if (anim) {
    const t = (sNow() - anim.shot.at) / 1000;
    while (anim.ei < anim.events.length && anim.events[anim.ei].t <= t) { const ev = anim.events[anim.ei++]; Sound.play(ev.k, ev.v); }
    if (t > anim.shot.dur + 0.25) { finishAnim(); return; }
  }
  const balls = currentBalls();
  // cabeceira destacada na bola na mão da saída
  const mine = myTurn();
  if (st.phase === "playing" && g.ballInHand && g.kitchen && !anim) { c.fillStyle = mine ? "#ffffff12" : "#ffffff08"; c.fillRect(0, 0, Fi.HEAD_X, W); }
  // caçapa marcada para a 8
  const onE = st.phase === "playing" && g.onEight[g.turn] && !anim;
  const pk = mine ? aim.pk : remote && remote.who === g.shooter ? remote.pk : -1;
  if (onE) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 220);
    Fi.POCKETS.forEach((p, i) => {
      c.beginPath(); c.arc(p.x, p.y, 30, 0, 7);
      if (i === pk) { c.strokeStyle = `rgba(233,185,73,${0.6 + 0.4 * pulse})`; c.lineWidth = 4; c.stroke(); }
      else if (mine) { c.strokeStyle = "#ffffff30"; c.lineWidth = 2; c.setLineDash([5, 6]); c.stroke(); c.setLineDash([]); }
    });
  }
  // atualiza a rotação das bolas pelo deslocamento
  for (const b of balls) {
    const lp = lastPos.get(b.n);
    if (lp) { const dx = b.x - lp.x, dy = b.y - lp.y; if (dx * dx + dy * dy > 2500) ori.set(b.n, ident()), sprites.delete(b.n); else if (dx || dy) rotateBall(b.n, dx, dy); }
    lastPos.set(b.n, { x: b.x, y: b.y });
  }
  // mira e taco (antes das bolas ficaria por baixo; o taco vai por cima)
  const FOLLOW = 0.28; // segundos de acompanhamento depois do contato
  const showCue = st.phase === "playing" || (anim && sNow() < anim.shot.at + FOLLOW * 1000);
  let cp = null, A = null;
  if (showCue) {
    const now = sNow();
    if (anim && now < anim.shot.at + FOLLOW * 1000) {
      const sk = anim.stroke, a = Math.atan2(anim.shot.dy, anim.shot.dx);
      cp = anim.start.find((b) => b.n === 0);
      if (now < anim.shot.at) { const k = Math.min(1, Math.max(0, (now - sk.t0) / sk.dur)); A = { a, p: sk.p * (1 - ease(k)) }; }
      else { const f = (now - anim.shot.at) / 1000; A = { a, p: -Math.min(1, f / 0.05) * (0.06 + 0.14 * sk.p), alpha: 1 - f / FOLLOW }; }
    } else if (!anim && stroke) { // soltei e a resposta do servidor ainda não chegou: o golpe já começa
      const k = Math.min(1, (now - stroke.t0) / STROKE_MS(stroke.p));
      cp = { x: stroke.cx, y: stroke.cy }; A = { a: stroke.a, p: stroke.p * (1 - ease(k)) };
    } else if (!anim && mine) { cp = cuePos(); A = aim; }
    else if (!anim && remote && remote.who === g.shooter && now >= g.busyUntil) { cp = cuePos(); A = remote; }
  }
  // sombras
  const sh = shadowSprite(), so = view.rot ? [-3, 3] : [3, 4];
  for (const b of balls) { const sc = b.scale || 1; c.globalAlpha = b.alpha ?? 1; c.drawImage(sh, b.x - R * 1.25 * sc + so[0], b.y - R * 1.25 * sc + so[1], 2.5 * R * sc, 2.5 * R * sc); }
  c.globalAlpha = 1;
  // guia
  if (A && cp && !anim && !stroke) drawGuide(c, g, cp, A, mine);
  // bolas
  const cueDragged = g.ballInHand && !anim && st.phase === "playing";
  for (const b of balls) {
    if (b.n === 0 && cueDragged) continue;
    drawBall(c, b.n, b.x, b.y, b.scale || 1, b.alpha ?? 1);
  }
  if (cueDragged && cp == null && st.phase === "playing") cp = cuePos();
  if (cueDragged) {
    const p = cp || cuePos(), ok = !mine || aim.cueOk;
    drawBall(c, 0, p.x, p.y);
    c.beginPath(); c.arc(p.x, p.y, R + 5 + Math.sin(performance.now() / 200) * 1.5, 0, 7);
    c.strokeStyle = ok ? "#ffffffaa" : "#ff5a5a"; c.lineWidth = 2; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]);
    if (mine && !ptr && !A?.p) { c.font = "700 13px Figtree"; c.textAlign = "center"; c.fillStyle = "#fff"; c.fillText("✋", p.x, p.y - R - 12); }
  }
  if (A && cp) drawCue(c, cp, A);
}
requestAnimationFrame(frame);

function drawGuide(c, g, cp, A, mine) {
  const dx = Math.cos(A.a), dy = Math.sin(A.a);
  const tr = Fi.trace(g.balls.filter((b) => b.n !== 0), cp.x, cp.y, dx, dy);
  if (mine && g.onEight[g.turn] && !aim.pkManual) suggestPocket(tr);
  const legal = legalFor(g, g.turn);
  const bad = tr.ball && !g.isBreak && !legal(tr.ball.n);
  c.save();
  c.lineCap = "round";
  c.strokeStyle = mine ? "#ffffffd0" : "#ffffff90"; c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(cp.x + dx * R, cp.y + dy * R); c.lineTo(tr.x - dx * (tr.ball ? R : 0), tr.y - dy * (tr.ball ? R : 0)); c.stroke();
  if (tr.ball) {
    c.beginPath(); c.arc(tr.x, tr.y, R, 0, 7); c.strokeStyle = bad ? "#ff6b6b" : "#ffffffd0"; c.lineWidth = 1.8; c.stroke();
    if (bad) { c.beginPath(); c.moveTo(tr.x - 6, tr.y - 6); c.lineTo(tr.x + 6, tr.y + 6); c.moveTo(tr.x + 6, tr.y - 6); c.lineTo(tr.x - 6, tr.y + 6); c.stroke(); }
    else {
      const k = Math.max(0.15, tr.obj.k), ol = 14 + 56 * k; // curta: só dá a direção, a pontaria é com você
      c.strokeStyle = "#ffffffc0"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(tr.ball.x, tr.ball.y); c.lineTo(tr.ball.x + tr.obj.dx * ol, tr.ball.y + tr.obj.dy * ol); c.stroke();
      if (tr.cue.k > 0.05) { const cl = 10 + 40 * tr.cue.k; c.strokeStyle = "#ffffff70"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(tr.x, tr.y); c.lineTo(tr.x + tr.cue.dx * cl, tr.y + tr.cue.dy * cl); c.stroke(); }
    }
  } else {
    c.beginPath(); c.arc(tr.x, tr.y, R, 0, 7); c.strokeStyle = "#ffffff80"; c.stroke();
    c.strokeStyle = "#ffffff55"; c.setLineDash([5, 6]); c.beginPath(); c.moveTo(tr.x, tr.y); c.lineTo(tr.x + tr.bounce.dx * 60, tr.y + tr.bounce.dy * 60); c.stroke(); c.setLineDash([]);
  }
  c.restore();
}
function drawCue(c, cp, A) {
  const p = A.p || 0, tense = p > 0.6 && !anim && !stroke ? (Math.random() - 0.5) * (p - 0.6) * 5 : 0;
  const gap = R + 3 + p * 90 + tense;
  c.save();
  if (A.alpha != null) c.globalAlpha = Math.max(0, Math.min(1, A.alpha));
  c.translate(cp.x, cp.y); c.rotate(A.a + Math.PI);
  // sombra do taco
  c.save(); c.translate(view.rot ? -4 : 6, view.rot ? 6 : 8); c.fillStyle = "#0005";
  c.beginPath(); c.moveTo(gap, -2.5); c.lineTo(gap + 600, -6); c.lineTo(gap + 600, 6); c.lineTo(gap, 2.5); c.fill(); c.restore();
  const seg = (x0, x1, w0, w1, fill) => { c.beginPath(); c.moveTo(x0, -w0); c.lineTo(x1, -w1); c.lineTo(x1, w1); c.lineTo(x0, w0); c.closePath(); c.fillStyle = fill; c.fill(); };
  const grad = (y0, y1, stops) => { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  seg(gap, gap + 4, 2.4, 2.5, "#3b7de0");                                                        // ponta com giz
  seg(gap + 4, gap + 16, 2.5, 2.7, grad(-3, 3, [[0, "#fffaf0"], [0.5, "#e8dcc2"], [1, "#b9ad93"]])); // anel
  seg(gap + 16, gap + 330, 2.7, 4.3, grad(-4, 4, [[0, "#f6dfb0"], [0.45, "#e0bd82"], [1, "#9c7440"]])); // madeira clara
  seg(gap + 330, gap + 340, 4.3, 4.4, "#111");
  seg(gap + 340, gap + 470, 4.4, 5.3, grad(-5, 5, [[0, "#8a3b1c"], [0.45, "#5b2210"], [1, "#2a0e05"]])); // cabo
  seg(gap + 470, gap + 580, 5.3, 5.9, grad(-6, 6, [[0, "#333"], [0.4, "#161616"], [1, "#050505"]]));  // empunhadura
  seg(gap + 580, gap + 600, 5.9, 6, "#111");
  c.fillStyle = "#e9b949"; for (const x of [gap + 360, gap + 380, gap + 400]) { c.beginPath(); c.moveTo(x, -4.6); c.lineTo(x + 8, 0); c.lineTo(x, 4.6); c.lineTo(x - 8, 0); c.fill(); }
  c.restore();
}

// ---------- placar em cima da mesa ----------
function sideOf(st, id) { return st.match ? st.match.sides.findIndex((s) => s.includes(id)) : -1; }
const miniCache = new Map();
function miniBall(n) {
  if (miniCache.has(n)) return miniCache.get(n);
  const oc = document.createElement("canvas"); oc.width = oc.height = 34; const c = oc.getContext("2d");
  const col = colorOf(n), g = c.createRadialGradient(12, 11, 2, 17, 17, 17);
  const stripe = n > 8;
  c.save(); c.beginPath(); c.arc(17, 17, 16, 0, 7); c.clip();
  c.fillStyle = stripe ? "#f4f1e8" : col; c.fillRect(0, 0, 34, 34);
  if (stripe) { c.fillStyle = col; c.fillRect(0, 9, 34, 16); }
  c.fillStyle = "#fff"; c.beginPath(); c.arc(17, 17, 7.5, 0, 7); c.fill();
  c.fillStyle = "#111"; c.font = "800 10px Figtree"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(n, 17, 17.5);
  g.addColorStop(0, "#ffffff55"); g.addColorStop(0.5, "#0000"); g.addColorStop(1, "#0006"); c.fillStyle = g; c.fillRect(0, 0, 34, 34);
  c.restore();
  const url = oc.toDataURL(); miniCache.set(n, url); return url;
}
function renderHud() {
  const st = shown(), m = st.match; if (!m || !st.g) { $("hud").innerHTML = ""; return; }
  const g = st.g, t = st.tour;
  const ring = (id) => st.deadline && st.deadline.who === id && st.phase === "playing" ? `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="none" stroke="#e9b949" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" class="tring" data-id="${id}"/></svg>` : "";
  const sideHTML = (k) => {
    const ids = m.sides[k], grp = g.groups[k], onTurn = st.phase === "playing" && g.turn === k;
    const tc = t.kind === "duplas" ? (P(ids[0])?.team ? "var(--tB)" : "var(--tA)") : "transparent";
    const balls = grp ? (grp === "lisas" ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15]) : [];
    const onTable = new Set(g.balls.map((b) => b.n));
    const grpHTML = grp ? balls.map((n) => `<img src="${miniBall(n)}" alt="${n}" class="${onTable.has(n) ? "" : "gone"}" width="17" height="17" style="width:17px;height:17px;${onTable.has(n) ? "" : "opacity:.18"}">`).join("") + (g.onEight[k] ? `<img src="${miniBall(8)}" alt="8" width="17" height="17" style="width:17px;height:17px">` : "")
      : `<span>${g.isBreak ? "saída" : "mesa aberta"}</span>`;
    return `<div class="side ${k ? "right" : ""} ${onTurn ? "turn" : ""}"><div class="tagteam" style="background:${tc}"></div>
      <div class="avs">${ids.map((id) => { const p = P(id) || {}; return `<div class="pv ${onTurn && g.shooter === id ? "shoot" : ""} ${p.online ? "" : "off"}" id="av-${id}" title="${h(p.name)}">${p.pawn || "?"}${ring(id)}</div>`; }).join("")}</div>
      <div class="info"><div class="nm">${ids.map((id) => `<span class="${onTurn && g.shooter === id ? "cur" : ""}">${h(P(id)?.name)}</span>`).join(" & ")}</div>
      <div class="grp">${grpHTML}${grp ? "" : ""}</div></div></div>`;
  };
  const cfg = S.config, rei = t.kind === "rei";
  const sub = rei ? `Rei da mesa · ${cfg.target} vitória${cfg.target > 1 ? "s" : ""}` : `${m.label ? m.label + " · " : ""}${cfg.target > 1 ? `melhor de ${2 * cfg.target - 1}` : "partida única"}`;
  const score = rei ? [P(m.sides[0][0])?.wins || 0, P(m.sides[1][0])?.wins || 0] : m.score;
  $("hud").innerHTML = `${sideHTML(0)}<div class="mid"><div class="sc num">${score[0]}<span>×</span>${score[1]}</div><small>${h(sub)}</small><small>Partida ${m.rackNo}</small></div>${sideHTML(1)}`;
}
function renderStatus() {
  const st = shown(), el = $("status"); if (!st.g) return;
  const g = st.g, mine = myTurn(), who = P(g.shooter);
  el.className = "status";
  let txt = "";
  if (st.phase !== "playing") txt = st.phase === "ended" ? "Fim de jogo!" : "Fim da partida.";
  else if (anim) txt = "…";
  else if (mine) {
    el.classList.add("mine");
    if (g.isBreak) txt = "Sua saída! Arraste a branca na cabeceira (se quiser), mire no triângulo e puxe o taco com força.";
    else if (g.ballInHand) txt = "Bola na mão: arraste a branca para onde quiser, mire e puxe o taco.";
    else if (g.onEight[g.turn]) txt = "Agora é a 8! Toque na caçapa em que ela vai cair, mire e bata.";
    else txt = `Sua vez${g.groups[g.turn] ? ` (${g.groups[g.turn]})` : ""}: arraste na mesa para mirar e puxe o taco para bater.`;
  } else txt = who ? `Vez de ${who.pawn} ${h(who.name)}${g.ballInHand ? " (bola na mão)" : ""}${g.onEight[g.turn] ? " · está na 8!" : ""}` : "";
  el.innerHTML = txt;
  $("power").classList.toggle("off", !mine); $("fine").classList.toggle("off", !mine);
}
function renderSide() {
  const st = S, t = st.tour; if (!t) return;
  let html = "", title = "Placar";
  if (t.kind === "rei") {
    title = "👑 Fila do rei da mesa";
    const cur = st.match ? st.match.sides.flat() : [];
    html = `<div class="rank">${t.queue.map((id, i) => { const p = P(id) || {}; return `<div class="it ${cur.includes(id) ? "cur" : ""}"><span class="muted num" style="width:18px">${i + 1}</span><span class="av">${p.pawn}</span><b>${h(p.name)}${i === 0 && t.streak > 1 ? ` <small class="muted">🔥 ${t.streak} seguidas</small>` : ""}${cur.includes(id) ? ` <small class="muted">· na mesa</small>` : ""}</b><span class="w num">${p.wins || 0}</span></div>`; }).join("")}</div><p class="hint">Número dourado = vitórias. Chegou em ${S.config.target}, é campeão.</p>`;
  } else if (t.kind === "mata") {
    title = "🏆 Chave";
    const names = ["", "", ""]; const rounds = t.rounds;
    const total = Math.log2(rounds[0].length * 2);
    const cols = [];
    for (let r = 0; r < total; r++) {
      const list = rounds[r] || Array.from({ length: rounds[0].length / 2 ** r }, () => ({ a: null, b: null, w: null }));
      const left = list.length, nm = left === 1 ? "Final" : left === 2 ? "Semifinal" : "Quartas";
      cols.push(`<div class="col"><h4>${nm}</h4>${list.map((x, i) => { const now = r === t.r && i === t.m && st.phase !== "ended"; const line = (id) => id ? `<div class="${x.w ? (x.w === id ? "win" : "lose") : ""}">${P(id)?.pawn || ""} ${h(P(id)?.name)}</div>` : `<div class="muted">a definir</div>`; return `<div class="mt ${now ? "now" : ""}">${line(x.a)}${line(x.b)}</div>`; }).join("")}</div>`);
    }
    html = `<div class="bracket">${cols.join("")}</div>`;
  } else {
    const m = st.match;
    html = m ? `<div class="rank">${[0, 1].map((k) => `<div class="it"><b>${m.sides[k].map((id) => `${P(id)?.pawn} ${h(P(id)?.name)}`).join(" & ")}</b><span class="w num">${m.score[k]}</span></div>`).join("")}</div><p class="hint">${S.config.target > 1 ? `Quem ganhar ${S.config.target} partidas leva.` : "Partida única."}</p>` : "";
  }
  $("sideTitle").textContent = title;
  $("sideBox").innerHTML = html;
  $("log").innerHTML = st.log.slice().reverse().map((l) => `<div>${h(l.text)}</div>`).join("");
  const m = me(), isHost = m && S.host === m.id;
  if (isHost && !$("btnLobby")) { const b = document.createElement("button"); b.className = "small ghost"; b.id = "btnLobby"; b.textContent = "Encerrar e voltar para a sala"; b.style.marginTop = "12px"; b.onclick = () => { if (confirm("Encerrar o jogo e voltar para a sala de espera?")) act("restart"); }; $("sideBox").parentElement.appendChild(b); }
}
let overlayKey = null;
function renderOverlay() {
  const st = shown(), el = $("overlay");
  if (!st || (st.phase !== "rackEnd" && st.phase !== "ended")) { el.innerHTML = ""; overlayKey = null; return; }
  const m = me(), isHost = m && S.host === m.id;
  const key = st.phase + (st.result ? st.result.rackNo : "") + (st.match ? st.match.label : "");
  if (st.phase === "ended") {
    const ids = st.champion.ids;
    el.innerHTML = `<div class="overlay"><div class="box"><div class="big">${ids.length > 1 ? "CAMPEÕES!" : "CAMPEÃO!"}</div><div class="who">👑 ${ids.map((id) => P(id)?.pawn).join(" ")}</div><p style="font-size:22px;font-weight:800">${ids.map((id) => h(P(id)?.name)).join(" & ")}</p>${st.result ? `<p class="muted">${h(st.result.reason)}</p>` : ""}
      <div class="row" style="justify-content:center;margin-top:14px">${isHost ? `<button class="primary" id="bAgain">Jogar de novo</button>` : `<span class="muted">Esperando o organizador…</span>`}<button onclick="location.href='/'">🏠 Voltar ao lobby</button></div></div></div>`;
    if ($("bAgain")) $("bAgain").onclick = () => act("restart");
    if (overlayKey !== key) { confetti(); Sound.play("win"); }
  } else {
    const r = st.result, ids = r.winners;
    const rei = st.tour.kind === "rei";
    el.innerHTML = `<div class="overlay"><div class="box"><div class="big">${ids.map((id) => h(P(id)?.name)).join(" & ")} ${ids.length > 1 ? "VENCERAM" : "VENCEU"}</div><div class="who">${ids.map((id) => P(id)?.pawn).join(" ")}</div><p>${h(r.reason)}</p>
      ${rei ? "" : `<div class="sc num">${r.score[0]} × ${r.score[1]}</div>`}
      <div class="row" style="justify-content:center;margin-top:10px"><span class="muted" id="nextIn"></span>${isHost ? `<button class="primary" id="bNext">Próxima agora</button>` : ""}</div></div></div>`;
    if ($("bNext")) $("bNext").onclick = () => act("next");
    if (overlayKey !== key) Sound.play("win");
  }
  overlayKey = key;
}
const confetti = () => Comum.confetti(["#e9b949", "#f5c518", "#d6262b", "#1f4fd1", "#11804a", "#f07c1c", "#fff"]);
function bannerShow(text, cls = "") {
  const b = document.createElement("div"); b.className = "banner " + cls; b.textContent = text;
  $("bannerBox").innerHTML = ""; $("bannerBox").appendChild(b); setTimeout(() => b.remove(), 1900);
}
// mensagem da última tacada (depois que as bolas param)
function showNote() {
  const st = shown(); if (!st || !st.g || !st.g.note || anim) return;
  const n = st.g.note, key = `${st.match.rackNo}:${n.id}`;
  if (key === lastNote) return;
  const first = lastNote === null; lastNote = key;
  if (first) return;
  const el = $("status");
  if (n.foul) { el.className = "status foul"; bannerShow("FALTA!", "foul"); Sound.play("foul"); }
  el.innerHTML = n.msgs.map(h).join(" ");
  clearTimeout(showNote.t);
  showNote.t = setTimeout(() => renderStatus(), 4200);
}

// relógio: anel de tempo e contagem para a próxima partida
setInterval(() => {
  if (!S) return;
  if (anim && sNow() > anim.shot.at + anim.shot.dur * 1000 + 400) finishAnim(); // aba em segundo plano não anima
  showNote();
  const st = shown();
  if (st.deadline) {
    const left = Math.max(0, st.deadline.at - sNow()), frac = Math.min(1, left / st.deadline.total);
    document.querySelectorAll(".tring").forEach((r) => { r.style.strokeDashoffset = String(100 - frac * 100); r.style.stroke = frac < 0.25 ? "#ff6b6b" : "#e9b949"; });
  }
  if (S.nextAt && $("nextIn")) $("nextIn").textContent = `Próxima em ${Math.max(0, Math.ceil((S.nextAt - sNow()) / 1000))} s`;
}, 200);
