// Futebol de Botão da Galera — o desenho a cada quadro, placar e controles (parte 4 de 5 do script da página; os arquivos rodam em ordem, pelo
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
  if (anim) {
    const t = (sNow() - anim.shot.at) / 1000;
    while (anim.ei < anim.events.length && anim.events[anim.ei].t <= t) { const ev = anim.events[anim.ei++]; Sound.play(ev.k, ev.v); }
    if (t > anim.shot.dur + 0.25) { finishAnim(); return; }
  }
  const kits = kitsOn(), mine = canAct(), idle = st.phase === "playing" && !anim && sNow() >= g.busyUntil;
  const pieces = anim ? currentPieces() : piecesWithPlaces(currentPieces());
  // goleiros (parados durante a jogada, na posição que cada time deixou)
  const keepers = anim ? anim.shot.keepers : g.keepers;
  drawGoalTags(c, kits);
  if (keepers) for (const t of [0, 1]) drawKeeper(c, t, keepers[t], kits[t], { mine: t === mySide() && canMoveKeeper(), drag: keeperDrag && keeperDrag.side === t });
  // bola parada: até onde dá para arrumar a tampinha
  if (idle && g.setPiece && mine && placing) { c.strokeStyle = "#f2c14eaa"; c.lineWidth = px(2); c.setLineDash([px(6), px(6)]); c.beginPath(); c.arc(pieces[0].x, pieces[0].y, B.PLACE_R, 0, 7); c.stroke(); c.setLineDash([]); }
  // mira: a minha, ou a ao vivo de quem está jogando
  const arrows = [];
  if (idle) {
    if (mine && !stroke) arrows.push({ ...aim, mine: true });
    else if (remote && remote.who === g.shooter && pieces[remote.i]) arrows.push(remote);
  }
  const sel = new Map(arrows.map((A) => [A.i, A]));
  // a palheta voltando (do ponto puxado até o disparo)
  const pull = new Map();
  if (anim && sNow() < anim.shot.at) { const k = Math.min(1, Math.max(0, (sNow() - anim.stroke.t0) / anim.stroke.dur)); anim.shot.flicks.forEach((f, j) => pull.set(f.i, { a: Math.atan2(f.dy, f.dx), p: anim.stroke.p[j] * (1 - k * k) })); }
  else if (!anim && stroke) { const k = Math.min(1, (sNow() - stroke.t0) / STROKE_MS); pull.set(stroke.i, { a: stroke.a, p: stroke.p * (1 - k * k) }); }
  for (const A of arrows) if (pieces[A.i]) drawGuide(c, pieces, A);
  pieces.forEach((p, i) => {
    if (p.k === "ball") return;
    let { x, y } = p;
    const pl = pull.get(i); if (pl) { x -= Math.cos(pl.a) * pl.p * 10; y -= Math.sin(pl.a) * pl.p * 10; }
    const A = sel.get(i);
    drawButton(c, { ...p, x, y }, kits[p.t], { sel: !!A, mine: mine && p.t === g.turn && !A });
  });
  drawBall(c, pieces[0].x, pieces[0].y);
}
requestAnimationFrame(frame);

// de quem é cada gol: a rede ganha a cor do time que defende e uma plaquinha ("SEU GOL" / "ATAQUE"; quem assiste vê o nome)
function drawGoalTags(c, kits) {
  const me = mySide();
  for (const t of [0, 1]) {
    const kit = kits[t]; if (!kit) continue;
    const gx = t ? L : -B.GD;
    c.save(); c.globalAlpha = 0.45; c.fillStyle = kit.face.c[0]; c.fillRect(gx, B.G0, B.GD, B.GW);
    c.globalAlpha = 0.9; c.strokeStyle = kit.rim; c.lineWidth = px(3); c.strokeRect(gx + px(2), B.G0 + px(2), B.GD - px(4), B.GW - px(4)); c.restore();
    const label = me < 0 ? kit.name.toUpperCase() : me === t ? "🧤 SEU GOL" : "⚽ ATAQUE";
    c.save(); c.translate(gx + B.GD / 2, B.MID_Y);
    const rot = (view.rot ? Math.PI / 2 : t ? Math.PI / 2 : -Math.PI / 2) + (view.flip ? Math.PI : 0); // ao longo do gol (no celular em pé, deitado e legível)
    c.rotate(rot);
    c.font = `800 ${Math.min(17, px(12))}px Figtree, system-ui, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = px(4); c.strokeStyle = "#000c"; c.strokeText(label, 0, 0); c.fillStyle = me >= 0 && me !== t ? "#f2c14e" : "#ffffff"; c.fillText(label, 0, 0);
    c.restore();
  }
}
function drawGuide(c, pieces, A) {
  // padrão: só a seta de força (a mira é no olho). Com a "mira com trajetória" ligada na mesa, também a linha
  // tracejada até a primeira peça e, se for a bola, a linha amarela para onde ela vai
  const p = pieces[A.i], dx = Math.cos(A.a), dy = Math.sin(A.a);
  const pw = A.p || 0;
  c.save(); c.lineCap = "round";
  if (S && S.config && S.config.trajetoria) {
    const tr = B.trace(pieces, A.i, dx, dy, view.open);
    c.strokeStyle = A.mine ? "#ffffffc0" : "#ffffff80"; c.lineWidth = px(1.8); c.setLineDash([px(6), px(6)]);
    c.beginPath(); c.moveTo(p.x + dx * RB, p.y + dy * RB); c.lineTo(tr.x, tr.y); c.stroke(); c.setLineDash([]);
    if (tr.hit) {
      const isBall = tr.hit.k === "ball", foe = tr.hit.k === "btn" && tr.hit.t !== p.t;
      c.strokeStyle = foe ? "#ff6b6b" : "#ffffffc0"; c.lineWidth = px(1.8);
      c.beginPath(); c.arc(tr.x, tr.y, RB, 0, 7); c.stroke();
      if (isBall) { const ol = 18 + 60 * Math.max(0.15, tr.obj.k); c.strokeStyle = "#f2c14e"; c.lineWidth = px(3); c.beginPath(); c.moveTo(tr.hit.x, tr.hit.y); c.lineTo(tr.hit.x + tr.obj.dx * ol, tr.hit.y + tr.obj.dy * ol); c.stroke(); }
    }
  }
  // seta de força saindo da tampinha
  if (pw > 0) {
    const len = RB + px(8) + pw * Math.max(120, px(70)), ex = p.x + dx * len, ey = p.y + dy * len;
    const col = A.super ? "#ff8a3d" : pw > 0.85 ? "#ff5a3d" : pw > 0.5 ? "#ffb13d" : "#ffe07a";
    c.strokeStyle = "#000a"; c.lineWidth = px(8); c.beginPath(); c.moveTo(p.x + dx * (RB + 4), p.y + dy * (RB + 4)); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = col; c.lineWidth = px(A.super ? 7 : 5); c.beginPath(); c.moveTo(p.x + dx * (RB + 4), p.y + dy * (RB + 4)); c.lineTo(ex, ey); c.stroke();
    const ah = px(9); c.fillStyle = col; c.beginPath(); c.moveTo(ex + dx * ah * 1.4, ey + dy * ah * 1.4); c.lineTo(ex - dy * ah, ey + dx * ah); c.lineTo(ex + dy * ah, ey - dx * ah); c.closePath(); c.fill();
    c.save(); c.translate(ex + dx * px(26), ey + dy * px(26)); c.rotate(textRot());
    const label = (A.super ? "⚡" : "") + Math.round(pw * 100) + "%";
    c.font = `800 ${px(14)}px Figtree, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#000a"; c.fillText(label, 1, 1); c.fillStyle = "#fff"; c.fillText(label, 0, 0);
    c.restore();
  }
  c.restore();
}

// ---------- placar, status e controles ----------
const fmtClock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const barHTML = (n) => `<span class="bar" title="Super palhetada: ${n} de ${BAR_MAX} passes">${Array.from({ length: BAR_MAX }, (_, k) => `<i class="${k < n ? "on" : ""}"></i>`).join("")}</span>`;
function renderHud() {
  const st = shown(), m = st.match; if (!m || !st.g) { $("hud").innerHTML = ""; return; }
  const g = st.g, t = st.tour, kits = m.kits.map(kitOf);
  const ring = (id) => st.deadline && st.deadline.who === id && st.phase === "playing" ? `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="none" stroke="#f2c14e" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" class="tring"/></svg>` : "";
  const sideHTML = (k) => {
    const ids = m.sides[k], onTurn = st.phase === "playing" && g.turn === k, kit = kits[k];
    const cur = (id) => onTurn && g.shooter === id;
    return `<div class="side ${k === (view.flip ? 0 : 1) ? "right" : ""} ${onTurn ? "turn" : ""}"><div class="stripe" style="background:linear-gradient(90deg,${kit.face.c[0]} 0 50%,${kit.rim} 50%)"></div>
      <div class="avs">${ids.map((id) => { const p = P(id) || {}; return `<div class="pv ${cur(id) ? "shoot" : ""} ${p.online ? "" : "off"}" id="av-${id}" title="${h(p.name)}">${p.pawn || "?"}${ring(id)}</div>`; }).join("")}</div>
      <div class="info"><div class="nm">${ids.map((id) => `<span class="${cur(id) ? "cur" : ""}">${h(P(id)?.name)}</span>`).join(" & ")}</div>
      <div class="sub">${h(kit.name)}${(st.config.tampinhas || 5) === 5 ? ` · ${h(m.forms[k])}` : ` · ${st.config.tampinhas} tampinhas`}${st.config.superTiro ? barHTML(g.bar[k]) : ""}</div></div></div>`;
  };
  const cfg = S.config, rei = t.kind === "rei";
  const sub = rei ? `Rei do campo · ${cfg.target} vitória${cfg.target > 1 ? "s" : ""}` : `${m.label ? m.label + " · " : ""}${cfg.target > 1 ? `melhor de ${2 * cfg.target - 1} (${m.score[0]}×${m.score[1]})` : "jogo único"}`;
  // na ordem da tela: à esquerda (ou embaixo, no celular em pé) fica quem defende aquele gol
  const [a, b] = view.flip ? [1, 0] : [0, 1];
  $("hud").innerHTML = `${sideHTML(a)}<div class="mid"><div class="sc num">${g.goals[a]}<span>×</span>${g.goals[b]}</div><div class="clock ${g.golden ? "gold" : ""}" id="gclock">${g.golden ? "GOL DE OURO" : g.endsAt ? fmtClock(g.endsAt - sNow()) : `até ${cfg.goals}`}</div><small>${h(sub)}</small></div>${sideHTML(b)}`;
}
function renderStatus() {
  const st = shown(), el = $("status"); if (!st.g) return;
  const g = st.g, mine = canAct(), max = g.max || st.config.toques, left = max - g.toques;
  el.className = "status";
  let txt = "";
  const what = g.restart ? `${g.restart}! ${g.setPiece && canAct() ? "Arraste uma tampinha sua até perto da bola. " : ""}` : "";
  if (st.phase !== "playing") txt = st.phase === "ended" ? "Fim de papo!" : "Fim de jogo.";
  else if (anim) txt = "…";
  else if (mine) {
    el.classList.add("mine");
    const nx = g.next && g.next !== ME.id && left > 1 ? P(g.next) : null;
    txt = `${what}${g.toques ? `Toque ${g.toques + 1} de ${max}` : "Sua vez"}: toque numa tampinha sua, puxe para trás e solte.${nx ? ` Depois, ${h(nx.name)} toca.` : left === 1 ? " É o último toque do time." : ""}${max === 1 && max < st.config.toques ? " Começo de jogo: só 1 toque por time." : ""}${g.setPiece ? " Dá para arrumar a tampinha perto da bola." : ""}`;
  } else {
    txt = `${g.restart ? g.restart + " · " : ""}Vez de ${P(g.shooter)?.pawn || ""} ${h(P(g.shooter)?.name)}${canMoveKeeper() ? " · mexa o goleiro do seu time" : ""}${max === 1 && max < st.config.toques ? " · saída: só 1 toque" : ""}`;
  }
  el.innerHTML = txt;
  $("toques").innerHTML = st.phase === "playing" ? `Toques ${Array.from({ length: max }, (_, k) => `<i class="${k < g.toques ? "used" : ""}"></i>`).join("")}` : "";
}
// botões da jogada: arrumar a tampinha (bola parada) e super palhetada
function renderCtrls() {
  const el = $("ctrls"), st = shown();
  if (!st || !st.g || st.phase !== "playing" || !canAct()) { el.innerHTML = ""; return; }
  const g = st.g, out = [];
  if (g.setPiece) out.push(`<button class="small ${placing ? "on" : ""}" id="cPlace" title="Arraste a sua tampinha para perto da bola">${placing ? "✋ Arrumando… (toque para mirar)" : "✋ Arrumar tampinha"}</button>`);
  if (st.config.superTiro && g.bar[g.turn] >= BAR_MAX) out.push(`<button class="small super ${aim.super ? "on" : ""}" id="cSuper">⚡ Super palhetada${aim.super ? " (ligada)" : ""}</button>`);
  el.innerHTML = out.join("");
  if ($("cPlace")) $("cPlace").onclick = () => { placing = !placing; renderCtrls(); };
  if ($("cSuper")) $("cSuper").onclick = () => { aim.super = !aim.super; if (aim.super) Sound.play("power"); renderCtrls(); };
}
function renderSide() {
  const st = S, t = st.tour; if (!t) return;
  let html = "", title = "Placar";
  if (t.kind === "rei") {
    title = "👑 Fila do rei do campo";
    const cur = st.match ? st.match.sides.flat() : [];
    html = `<div class="rank">${t.queue.map((id, i) => { const p = P(id) || {}; return `<div class="it ${cur.includes(id) ? "cur" : ""}"><span class="muted num" style="width:18px">${i + 1}</span><span class="av">${p.pawn}</span><b>${h(p.name)}${i === 0 && t.streak > 1 ? ` <small class="muted">🔥 ${t.streak} seguidas</small>` : ""}${cur.includes(id) ? ` <small class="muted">· em campo</small>` : ""}</b><span class="w num">${p.wins || 0}</span></div>`; }).join("")}</div><p class="hint muted">Número dourado = vitórias. Chegou em ${S.config.target}, é campeão.</p>`;
  } else if (t.kind === "mata") {
    title = "🏆 Chave";
    const rounds = t.rounds, total = Math.log2(rounds[0].length * 2), cols = [];
    for (let r = 0; r < total; r++) {
      const list = rounds[r] || Array.from({ length: rounds[0].length / 2 ** r }, () => ({ a: null, b: null, w: null }));
      const nm = list.length === 1 ? "Final" : list.length === 2 ? "Semifinal" : "Quartas";
      cols.push(`<div class="col"><h4>${nm}</h4>${list.map((x, i) => { const now = r === t.r && i === t.m && st.phase !== "ended"; const line = (id) => id ? `<div class="${x.w ? (x.w === id ? "win" : "lose") : ""}">${P(id)?.pawn || ""} ${h(P(id)?.name)}</div>` : `<div class="muted">a definir</div>`; return `<div class="mt ${now ? "now" : ""}">${line(x.a)}${line(x.b)}</div>`; }).join("")}</div>`);
    }
    html = `<div class="bracket">${cols.join("")}</div>`;
  } else {
    const m = st.match;
    html = m ? `<div class="rank">${[0, 1].map((k) => `<div class="it"><b>${m.sides[k].map((id) => `${P(id)?.pawn} ${h(P(id)?.name)}`).join(" & ")}</b><span class="w num">${m.score[k]}</span></div>`).join("")}</div><p class="hint muted">${S.config.target > 1 ? `Quem ganhar ${S.config.target} jogos leva.` : "Jogo único."}</p>` : "";
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
  if (!st || (st.phase !== "gameEnd" && st.phase !== "ended")) { el.innerHTML = ""; overlayKey = null; return; }
  const m = me(), isHost = m && S.host === m.id;
  const key = st.phase + (st.result ? st.result.gameNo : "") + (st.match ? st.match.label + st.match.sides.join() : "");
  if (st.phase === "ended") {
    const ids = st.champion.ids;
    el.innerHTML = `<div class="overlay"><div class="box"><div class="big">${ids.length > 1 ? "CAMPEÕES!" : "CAMPEÃO!"}</div><div class="who">🏆 ${ids.map((id) => P(id)?.pawn).join(" ")}</div><p style="font-size:22px;font-weight:800">${ids.map((id) => h(P(id)?.name)).join(" & ")}</p>${st.result ? `<p class="muted">${h(st.result.reason)}</p>` : ""}
      <div class="row" style="justify-content:center;margin-top:14px">${isHost ? `<button class="primary" id="bAgain">Jogar de novo</button>` : `<span class="muted">Esperando o organizador…</span>`}<button onclick="location.href='/'">🏠 Voltar para a vila</button></div></div></div>`;
    if ($("bAgain")) $("bAgain").onclick = () => act("restart");
    if (overlayKey !== key) { confetti(); Sound.play("win"); }
  } else {
    const r = st.result, ids = r.winners, rei = st.tour.kind === "rei";
    el.innerHTML = `<div class="overlay"><div class="box"><div class="big">${ids.map((id) => h(P(id)?.name)).join(" & ")} ${ids.length > 1 ? "VENCERAM" : "VENCEU"}</div><div class="who">${ids.map((id) => P(id)?.pawn).join(" ")}</div><div class="sc num">${view.flip ? `${r.goals[1]} × ${r.goals[0]}` : `${r.goals[0]} × ${r.goals[1]}`}</div><p>${h(r.reason)}</p>
      ${rei || S.config.target === 1 ? "" : `<p class="muted">Série: ${r.score[0]} × ${r.score[1]}</p>`}
      <div class="row" style="justify-content:center;margin-top:10px"><span class="muted" id="nextIn"></span>${isHost ? `<button class="primary" id="bNext">Próximo agora</button>` : ""}</div></div></div>`;
    if ($("bNext")) $("bNext").onclick = () => act("next");
    if (overlayKey !== key) Sound.play("win");
  }
  overlayKey = key;
}
const confetti = () => Comum.confetti(["#f2c14e", "#c8102e", "#0b6b34", "#1e5bc6", "#f4f1e6", "#f07c1c"]);
function bannerShow(text, cls = "") {
  const b = document.createElement("div"); b.className = "banner " + cls; b.textContent = text;
  $("bannerBox").innerHTML = ""; $("bannerBox").appendChild(b); setTimeout(() => b.remove(), 2000);
}
// mensagem da última jogada (depois que as peças param)
function showNote() {
  const st = shown(); if (!st || !st.g || !st.g.note || anim) return;
  const n = st.g.note, key = `${st.match.gameNo}:${n.id}`;
  if (key === lastNote) return;
  const first = lastNote === null; lastNote = key;
  if (first) return;
  const el = $("status");
  const over = st.phase !== "playing"; // no gol da vitória, a tela de fim já fala por si
  if (n.banner && !over) bannerShow(n.banner, n.goal != null ? "goal" : "gold");
  if (n.foul) { el.className = "status foul"; if (!n.banner) bannerShow(n.foul === "tempo" ? "TEMPO!" : "FALTA!", "foul"); Sound.play("foul"); }
  if (n.goal != null) { const sc = toScreen(...(n.goal === 0 ? [L, B.MID_Y] : [0, B.MID_Y])); burst(sc.x, sc.y); }
  el.innerHTML = n.msgs.map(h).join(" ");
  clearTimeout(showNote.t);
  showNote.t = setTimeout(() => renderStatus(), 4200);
}
function burst(x, y) {
  for (let i = 0; i < 10; i++) { const f = document.createElement("div"); f.className = "floaty"; f.textContent = ["⚽", "🎉", "🔥", "👏"][i % 4]; f.style.left = x + (Math.random() - 0.5) * 140 + "px"; f.style.top = y + (Math.random() - 0.5) * 100 + "px"; f.style.animationDelay = Math.random() * 0.4 + "s"; document.body.appendChild(f); setTimeout(() => f.remove(), 2200); }
}

// relógio: anel de tempo, cronômetro do jogo e contagem para o próximo
setInterval(() => {
  if (!S) return;
  if (anim && sNow() > anim.shot.at + anim.shot.dur * 1000 + 400) finishAnim(); // aba em segundo plano não anima
  showNote();
  const st = shown();
  if (st.deadline) {
    const left = Math.max(0, st.deadline.at - sNow()), frac = Math.min(1, left / st.deadline.total);
    document.querySelectorAll(".tring").forEach((r) => { r.style.strokeDashoffset = String(100 - frac * 100); r.style.stroke = frac < 0.25 ? "#ff6b6b" : "#f2c14e"; });
  }
  if (st.g && st.g.endsAt && !st.g.golden && $("gclock")) $("gclock").textContent = fmtClock(st.g.endsAt - sNow());
  if (S.nextAt && $("nextIn")) $("nextIn").textContent = `Próximo em ${Math.max(0, Math.ceil((S.nextAt - sNow()) / 1000))} s`;
}, 250);
