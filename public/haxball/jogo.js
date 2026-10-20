(() => {
  const $ = (id) => document.getElementById(id), H = window.Haxball;
  const socket = io("/haxball");
  const sessionKey = "haxball:sala";
  let room = null, me = null, frame = null, frameAt = 0, touch = { x: 0, y: 0 }, kickQueued = false;
  const held = new Set(), params = new URLSearchParams(location.search);
  const canvas = $("field"), ctx = canvas.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let lastFxSeq = 0, liveFx = [];
  const chutes = new Map(); // id -> quando chutou (para o anel em volta do disco)
  $("name").value = localStorage.getItem("haxball:nome") || "";
  $("code").value = (params.get("sala") || "").toUpperCase().slice(0, 5);
  const say = (id, message) => { $(id).textContent = message || ""; };
  function request(event, data, done) {
    if (!socket.connected) return say(room ? "roomError" : "entryError", "Sem conexão com o servidor.");
    socket.timeout(5000).emit(event, data, (err, reply) => {
      if (err || !reply?.ok) return say(room ? "roomError" : "entryError", reply?.error || "A conexão demorou. Tente de novo.");
      say(room ? "roomError" : "entryError", ""); if (done) done(reply);
    });
  }
  function remember(r) {
    me = r.id;
    if (r.token) sessionStorage.setItem(sessionKey, JSON.stringify({ code: r.code, id: r.id, token: r.token }));
    history.replaceState(null, "", "/haxball/?sala=" + encodeURIComponent(r.code));
    if (room?.code === r.code) renderRoom();
  }
  function saveName() { const name = $("name").value.trim(); if (name) localStorage.setItem("haxball:nome", name); return name; }
  $("create").onclick = () => { const name = saveName(); request("create", { name, config: { size: $("size").value, minutes: $("minutes").value, goals: $("goals").value } }, remember); };
  // treino: cria a sala, completa os dois times com robôs e começa (o tamanho e o tempo vêm do formulário)
  $("treino").onclick = () => { const name = saveName(); request("create", { name, config: { size: $("size").value, minutes: $("minutes").value, goals: $("goals").value } }, (r) => { remember(r); request("act", { type: "completar" }, () => request("act", { type: "start" })); }); };
  function enter(watch = false) { const code = $("code").value.trim().toUpperCase(); request("join", { code, name: saveName(), watch }, remember); }
  $("join").onclick = () => enter(); $("watch").onclick = () => enter(true);
  $("code").onkeydown = (e) => { if (e.key === "Enter") enter(); };
  $("copy").onclick = async () => { try { await navigator.clipboard.writeText(location.href); $("copy").textContent = "Convite copiado!"; setTimeout(() => $("copy").textContent = "Copiar convite", 2000); } catch { say("roomError", "Copie o endereço da página para convidar."); } };
  $("leave").onclick = () => { sessionStorage.removeItem(sessionKey); location.href = "/haxball/"; };
  function act(type, extra = {}) { request("act", { type, ...extra }); }
  $("blueJoin").onclick = () => act("team", { team: 0 });
  $("redJoin").onclick = () => act("team", { team: 1 });
  $("blueBot").onclick = () => act("bot", { team: 0 });
  $("redBot").onclick = () => act("bot", { team: 1 });
  $("fillBots").onclick = () => act("completar");
  $("start").onclick = () => act("start");
  $("backLobby").onclick = () => act("lobby");
  function sendConfig() { act("config", { config: { size: $("roomSize").value, minutes: $("roomMinutes").value, goals: $("roomGoals").value, nivel: $("roomNivel").value } }); }
  for (const id of ["roomSize", "roomMinutes", "roomGoals", "roomNivel"]) $(id).onchange = sendConfig;
  socket.on("connect", () => {
    say("connection", "● Online");
    const raw = sessionStorage.getItem(sessionKey);
    if (raw) { try { const saved = JSON.parse(raw); request("join", saved, remember); return; } catch { sessionStorage.removeItem(sessionKey); } }
    if (params.has("sala")) $("code").focus();
  });
  socket.on("disconnect", () => { say("connection", "● Reconectando…"); held.clear(); touch = { x: 0, y: 0 }; });
  socket.on("removed", () => { sessionStorage.removeItem(sessionKey); me = null; say("roomError", "Você foi removido da sala."); });
  function receiveFrame(data) {
    const now = performance.now();
    if (!data) { frame = null; liveFx = []; lastFxSeq = 0; historico.length = 0; return; }
    if (data.fxSeq < lastFxSeq) { lastFxSeq = 0; liveFx = []; }
    for (const e of data.fx || []) if (e.seq > lastFxSeq) { liveFx.push({ ...e, at: now }); if (e.kind === "kick") chutes.set(e.id, now); }
    lastFxSeq = data.fxSeq || 0;
    if (liveFx.length > 28) liveFx = liveFx.slice(-28);
    frame = data; frameAt = now;
    historico.push({ t: now, frame: data }); if (historico.length > 5) historico.shift();
  }
  socket.on("frame", (data) => { receiveFrame(data); updateScore(); });
  socket.on("state", (data) => {
    room = data;
    if (!frame && data.match) lastFxSeq = data.match.fxSeq || 0; // quem entra no meio não vê efeitos antigos
    receiveFrame(data.match); renderRoom();
  });
  function renderPlayers(target, players, host) {
    target.replaceChildren();
    if (!players.length) { const p = document.createElement("p"); p.textContent = "Aguardando jogador…"; p.style.color = "#749d93"; target.append(p); }
    for (const p of players) {
      const row = document.createElement("div"); row.className = "player" + (p.online ? "" : " offline");
      const label = document.createElement("span"); label.textContent = `${p.name}${p.bot ? " · robô" : ""}${p.id === room.host ? " ★" : ""}${p.id === me ? " (você)" : ""}`; row.append(label);
      if (p.bot) row.classList.add("robo");
      if (host && p.id !== me && room.phase !== "play") {
        const kick = document.createElement("button"); kick.textContent = "×"; kick.title = `Remover ${p.name}`; kick.onclick = () => act("kick", { id: p.id }); row.append(kick);
      }
      target.append(row);
    }
  }
  function renderRoom() {
    if (!room) return;
    $("entrance").hidden = true; $("room").hidden = false; $("roomCode").textContent = room.code;
    const host = me === room.host, playing = room.phase === "play", myPlayer = room.players.find((p) => p.id === me);
    const blue = room.players.filter((p) => p.team === 0), red = room.players.filter((p) => p.team === 1);
    renderPlayers($("bluePlayers"), blue, host); renderPlayers($("redPlayers"), red, host);
    const bench = room.players.filter((p) => p.team === null);
    $("bench").textContent = bench.length ? "Fora do campo: " + bench.map((p) => p.name).join(", ") : "";
    $("format").textContent = `${room.config.size}x${room.config.size} · ${room.config.minutes} min · até ${room.config.goals} gols`;
    $("roomSize").value = room.config.size; $("roomMinutes").value = room.config.minutes; $("roomGoals").value = room.config.goals; $("roomNivel").value = room.config.nivel || "medio";
    $("blueBot").hidden = $("redBot").hidden = $("fillBots").hidden = !host || playing;
    $("blueBot").disabled = blue.length >= room.config.size; $("redBot").disabled = red.length >= room.config.size; $("fillBots").disabled = blue.length >= room.config.size && red.length >= room.config.size;
    $("settings").hidden = !host || playing;
    $("blueJoin").hidden = !myPlayer || playing; $("redJoin").hidden = !myPlayer || playing;
    $("blueJoin").disabled = myPlayer?.team === 0 || blue.length >= room.config.size;
    $("redJoin").disabled = myPlayer?.team === 1 || red.length >= room.config.size;
    $("start").hidden = !host || playing;
    $("start").textContent = room.phase === "over" ? "Revanche" : "Começar partida";
    $("start").disabled = blue.length !== room.config.size || red.length !== room.config.size;
    $("backLobby").hidden = !host || room.phase === "lobby";
    $("hint").textContent = playing ? "A bola está rolando. Entre no próximo jogo se chegou agora." : `Para começar, complete os dois times com ${room.config.size} jogador(es). Faltou gente? Ponha robôs.`;
    $("game").hidden = !room.match;
    $("role").textContent = myPlayer?.team === 0 ? "Você joga pelo azul" : myPlayer?.team === 1 ? "Você joga pelo vermelho" : "Você está assistindo";
    $("touch").hidden = !playing || myPlayer?.team === null || !myPlayer;
    updateScore();
  }
  function updateScore() {
    if (!frame) return;
    for (const [id, v] of [["scoreA", frame.score[0]], ["scoreB", frame.score[1]]]) { const el = $(id); if (el.textContent !== String(v)) { const subiu = Number(el.textContent) < v; el.textContent = v; if (subiu) { el.classList.remove("marcou"); void el.offsetWidth; el.classList.add("marcou"); } } } // o placar pula no gol
    const sec = Math.max(0, Math.ceil(frame.remaining));
    $("timer").textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  }
  const moves = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };
  addEventListener("keydown", (e) => {
    if (e.target.matches("input,select,textarea")) return;
    if (moves[e.code] || e.code === "Space") { e.preventDefault(); held.add(e.code); if (e.code === "Space") { segurandoChute = true; if (!e.repeat) kickQueued = true; } }
  });
  addEventListener("keyup", (e) => { held.delete(e.code); if (e.code === "Space") segurandoChute = false; });
  addEventListener("blur", () => { held.clear(); touch = { x: 0, y: 0 }; });
  setInterval(() => {
    if (!room || room.phase !== "play" || !room.players.some((p) => p.id === me && p.team !== null)) return;
    let x = touch.x, y = touch.y;
    for (const code of held) if (moves[code]) { x += moves[code][0]; y += moves[code][1]; }
    const mag = Math.max(1, Math.hypot(x, y));
    (kickQueued ? socket : socket.volatile).emit("input", { x: x / mag, y: y / mag, kick: kickQueued });
    kickQueued = false;
  }, 1000 / 30);
  const stick = $("stick"), nub = $("nub");
  function steer(e) {
    const r = stick.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
    const scale = Math.max(1, Math.hypot(dx, dy) / 40);
    touch = { x: dx / 40 / scale, y: dy / 40 / scale };
    nub.style.transform = `translate(${touch.x * 34}px,${touch.y * 34}px)`;
  }
  stick.onpointerdown = (e) => { stick.setPointerCapture(e.pointerId); steer(e); };
  stick.onpointermove = (e) => { if (stick.hasPointerCapture(e.pointerId)) steer(e); };
  const release = () => { touch = { x: 0, y: 0 }; nub.style.transform = ""; };
  stick.onpointerup = release; stick.onpointercancel = release;
  $("kick").onpointerdown = (e) => { e.preventDefault(); kickQueued = true; };
  // ---------- desenho ----------
  // O campo e a arquibancada são desenhados uma vez numa tela escondida (fundo); a cada quadro só entram os discos, a
  // bola e os efeitos. As posições chegam 20 vezes por segundo: o desenho fica 70 ms atrás e mistura os dois últimos
  // pacotes (anda liso, sem tremer). Tela nítida em monitor de alta densidade (devicePixelRatio).
  const AZUL = ["#7cc4ff", "#2f8fef", "#1659a8"], VERM = ["#ff9aa2", "#f04a57", "#a51f2c"];
  let fundo = null, dpr = 1, tremor = 0, gol = null, confete = [], bolaGiro = 0, ultimaBola = null, segurandoChute = false;
  const historico = []; // [{ t, frame }]
  function ajustarTela() {
    const novo = Math.min(2, window.devicePixelRatio || 1);
    if (novo === dpr && canvas.width === H.W * dpr) return;
    dpr = novo; canvas.width = H.W * dpr; canvas.height = H.H * dpr; fundo = null;
  }
  function montarFundo() {
    const c = document.createElement("canvas"); c.width = H.W * dpr; c.height = H.H * dpr; const x = c.getContext("2d"); x.scale(dpr, dpr);
    // arquibancada em volta: degraus escuros com a torcida em pontinhos coloridos
    x.fillStyle = "#0d2a22"; x.fillRect(0, 0, H.W, H.H);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = 2; y < H.H; y += 7) for (let xx = 2; xx < H.W; xx += 7) {
      if (xx > H.LEFT - 6 && xx < H.RIGHT + 6 && y > H.TOP - 6 && y < H.BOTTOM + 6) continue;
      const lado = xx < H.W / 2 ? AZUL : VERM, r = rnd();
      x.fillStyle = r < 0.45 ? lado[r < 0.2 ? 0 : 1] : r < 0.7 ? "#f2e6d0" : r < 0.85 ? "#ffd23f" : "#20453a";
      x.fillRect(xx, y, 4, 4);
    }
    // gramado com as faixas do cortador e um pouco de textura
    const gx = H.LEFT - 8, gy = H.TOP - 8, gw = H.RIGHT - H.LEFT + 16, gh = H.BOTTOM - H.TOP + 16;
    x.fillStyle = "#2f8a4c"; x.fillRect(gx, gy, gw, gh);
    for (let i = 0; i < 14; i++) { x.fillStyle = i % 2 ? "#2a7f45" : "#33934f"; x.fillRect(H.LEFT + (i * (H.RIGHT - H.LEFT)) / 14, H.TOP, (H.RIGHT - H.LEFT) / 14 + 1, H.BOTTOM - H.TOP); }
    for (let i = 0; i < 2600; i++) { x.fillStyle = rnd() < 0.5 ? "#ffffff0a" : "#0000000d"; x.fillRect(H.LEFT + rnd() * (H.RIGHT - H.LEFT), H.TOP + rnd() * (H.BOTTOM - H.TOP), 2, 2); }
    // linhas
    x.strokeStyle = "#f4fff6e6"; x.lineWidth = 3; x.shadowColor = "#ffffff55"; x.shadowBlur = 4;
    // os cantos chanfrados: a mureta em diagonal (a bola quica nela) e o contorno do campo acompanhando
    const C = H.CH, cantos = [[H.LEFT, H.TOP, 1, 1], [H.RIGHT, H.TOP, -1, 1], [H.RIGHT, H.BOTTOM, -1, -1], [H.LEFT, H.BOTTOM, 1, -1]];
    x.save(); x.shadowBlur = 0;
    for (const [cx, cy, sx, sy] of cantos) {
      x.beginPath(); x.moveTo(cx - sx * 8, cy - sy * 8); x.lineTo(cx + sx * (C + 8), cy - sy * 8); x.lineTo(cx + sx * C, cy); x.lineTo(cx, cy + sy * C); x.lineTo(cx - sx * 8, cy + sy * (C + 8)); x.closePath();
      x.fillStyle = "#16392c"; x.fill();
      for (let k = 6; k < C; k += 10) { x.beginPath(); x.moveTo(cx + sx * k, cy - sy * 4); x.lineTo(cx - sx * 4, cy + sy * k); x.strokeStyle = "#ffffff14"; x.lineWidth = 3; x.stroke(); }
    }
    x.restore();
    x.beginPath();
    cantos.forEach(([cx, cy, sx, sy], i) => { const a = i % 2 ? [cx + sx * C, cy] : [cx, cy + sy * C], b = i % 2 ? [cx, cy + sy * C] : [cx + sx * C, cy]; if (i) x.lineTo(...a); else x.moveTo(...a); x.lineTo(...b); });
    x.closePath(); x.stroke();
    x.beginPath(); x.moveTo(H.W / 2, H.TOP); x.lineTo(H.W / 2, H.BOTTOM); x.stroke();
    x.beginPath(); x.arc(H.W / 2, H.H / 2, 72, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(H.W / 2, H.H / 2, 4, 0, Math.PI * 2); x.fillStyle = "#f4fff6"; x.fill();
    for (const [lx, s] of [[H.LEFT, 1], [H.RIGHT, -1]]) {
      x.strokeRect(s > 0 ? lx : lx - 130, H.H / 2 - 122, 130, 244);
      x.beginPath(); x.arc(lx, H.H / 2, 150, s > 0 ? -0.62 : Math.PI - 0.62 + 0, s > 0 ? 0.62 : Math.PI + 0.62); x.stroke();
    }
    x.shadowBlur = 0;
    fundo = c;
  }
  // o gol: fundo escuro, a rede quadriculada (que estufa quando a bola entra) e as traves redondas
  function desenharGol(lado, agora) {
    const esq = lado < 0, x0 = esq ? 12 : H.RIGHT, w = H.LEFT - 12, y0 = H.GOAL_TOP, h = H.GOAL_BOTTOM - H.GOAL_TOP;
    const estufa = gol && gol.lado === lado ? Math.max(0, 1 - (agora - gol.t) / 700) * 10 : 0;
    ctx.save(); ctx.fillStyle = "#123326"; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = "#e8fff2"; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    for (let i = 0; i <= w; i += 7) { ctx.beginPath(); const xx = x0 + i + (esq ? -estufa : estufa) * Math.sin((i / w) * Math.PI) * 0.3; ctx.moveTo(xx, y0); ctx.lineTo(xx, y0 + h); ctx.stroke(); }
    for (let j = 0; j <= h; j += 7) { ctx.beginPath(); const b = Math.sin((j / h) * Math.PI) * estufa; ctx.moveTo(x0 + (esq ? -b : 0), y0 + j); ctx.lineTo(x0 + w + (esq ? 0 : b), y0 + j); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = "#f4fff6"; ctx.lineWidth = 3; ctx.strokeRect(x0, y0, w, h);
    const tx = esq ? H.LEFT : H.RIGHT;
    for (const ty of [H.GOAL_TOP, H.GOAL_BOTTOM]) { ctx.beginPath(); ctx.arc(tx, ty, 7, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.shadowColor = "#0007"; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.strokeStyle = esq ? AZUL[2] : VERM[2]; ctx.stroke(); }
    ctx.restore();
  }
  // um disco: sombra, corpo com relevo, borda (mais grossa no meu), a letra do nome e a plaquinha com o nome
  function desenharDisco(p, x, y, agora) {
    const cor = p.team === 0 ? AZUL : VERM, eu = p.id === me;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x + 3, y + 6, H.PR, H.PR * 0.75, 0, 0, Math.PI * 2); ctx.fillStyle = "#0000004a"; ctx.fill();
    const g = ctx.createRadialGradient(x - 6, y - 7, 2, x, y, H.PR); g.addColorStop(0, cor[0]); g.addColorStop(0.55, cor[1]); g.addColorStop(1, cor[2]);
    ctx.beginPath(); ctx.arc(x, y, H.PR, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = eu ? 4 : 2.5; ctx.strokeStyle = eu ? "#ecff9d" : "#ffffffd0"; ctx.stroke();
    // anel do chute: aparece no chute (e no meu disco enquanto seguro o espaço, como no Haxball)
    const chuteHa = agora - (chutes.get(p.id) || -1e9);
    if ((eu && segurandoChute) || chuteHa < 160) { ctx.beginPath(); ctx.arc(x, y, H.PR + 5, 0, Math.PI * 2); ctx.strokeStyle = "#ffffffcc"; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = "#ffffffee"; ctx.font = "800 15px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText((p.name || "?").slice(0, 1).toUpperCase(), x, y + 1);
    // nome numa plaquinha
    ctx.font = "700 12px system-ui"; const nome = p.name + (p.bot ? " · CPU" : ""), w = ctx.measureText(nome).width + 12;
    ctx.fillStyle = "#06150fb0"; ctx.beginPath(); ctx.roundRect(x - w / 2, y - H.PR - 22, w, 16, 8); ctx.fill();
    ctx.fillStyle = eu ? "#ecff9d" : "#fff"; ctx.fillText(nome, x, y - H.PR - 14);
    ctx.restore();
  }
  // a bola: sombra, branca com os gomos pretos girando conforme ela anda
  function desenharBola(bx, by, b) {
    if (ultimaBola) bolaGiro += Math.hypot(bx - ultimaBola.x, by - ultimaBola.y) / H.BR; ultimaBola = { x: bx, y: by };
    ctx.save();
    ctx.beginPath(); ctx.ellipse(bx + 2, by + 5, H.BR, H.BR * 0.7, 0, 0, Math.PI * 2); ctx.fillStyle = "#0000005a"; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, H.BR, 0, Math.PI * 2); const g = ctx.createRadialGradient(bx - 3, by - 4, 1, bx, by, H.BR); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#d8dde0"); ctx.fillStyle = g; ctx.fill();
    ctx.clip(); ctx.fillStyle = "#1d2a2e"; const ang = Math.atan2(b.vy, b.vx);
    for (let k = 0; k < 5; k++) { const a = bolaGiro + (k * Math.PI * 2) / 5, ox = Math.cos(a) * H.BR * 0.75, px = bx + ox * Math.cos(ang), py = by + ox * Math.sin(ang) + Math.sin(a + k) * 3; ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(bx, by, H.BR, 0, Math.PI * 2); ctx.strokeStyle = "#25363b"; ctx.lineWidth = 2; ctx.stroke();
  }
  function drawEffects(now) {
    liveFx = liveFx.filter((e) => now - e.at < (e.kind === "goal" ? 680 : 300));
    for (const e of liveFx) {
      const duration = e.kind === "goal" ? 680 : e.kind === "kick" ? 300 : 230;
      const t = Math.min(1, (now - e.at) / duration), fade = 1 - t;
      const color = e.team === 0 ? "#a9deff" : e.team === 1 ? "#ffc0c4" : "#f7ffe8";
      ctx.save();
      if (!reducedMotion.matches) {
        const max = e.kind === "goal" ? 88 : e.kind === "kick" ? 42 : 24;
        ctx.globalAlpha = fade * (e.kind === "touch" ? 0.55 : 0.9);
        ctx.strokeStyle = color; ctx.lineWidth = e.kind === "goal" ? 5 : 3;
        ctx.beginPath(); ctx.arc(e.x, e.y, 12 + max * (1 - (1 - t) * (1 - t)), 0, Math.PI * 2); ctx.stroke();
        if (e.kind === "kick" || e.kind === "goal") {
          const count = e.kind === "goal" ? 12 : 7;
          for (let i = 0; i < count; i++) {
            const angle = i * Math.PI * 2 / count + e.seq * 0.7, inner = 17 + t * max * 0.45, outer = inner + (e.kind === "goal" ? 18 : 11) * fade;
            ctx.beginPath(); ctx.moveTo(e.x + Math.cos(angle) * inner, e.y + Math.sin(angle) * inner);
            ctx.lineTo(e.x + Math.cos(angle) * outer, e.y + Math.sin(angle) * outer); ctx.stroke();
          }
        }
      } else {
        ctx.globalAlpha = fade * 0.55; ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.kind === "goal" ? 24 : 15, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      if (e.kind === "goal" && !e.comemorado) { e.comemorado = true; comemorar(e, now); }
    }
  }
  // gol: tremida, confete na cor do time, a rede estufa e o "GOL!" grande
  function comemorar(e, now) {
    gol = { t: now, lado: e.x < H.W / 2 ? -1 : 1, team: e.team };
    if (reducedMotion.matches) return;
    tremor = 1;
    const cor = e.team === 0 ? AZUL : VERM;
    for (let i = 0; i < 90; i++) { const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260; confete.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 1.4 + Math.random() * 0.6, c: [cor[0], cor[1], "#ffd23f", "#ffffff"][i % 4], g: Math.random() * 6 }); }
  }
  function desenharGolGrande(now) {
    if (!gol) return; const t = (now - gol.t) / 1000; if (t > 1.8) return;
    const e = t < 0.25 ? t / 0.25 : 1, s = 0.6 + e * 0.5 + Math.sin(t * 12) * 0.02 * (1 - Math.min(1, t)), a = t > 1.4 ? (1.8 - t) / 0.4 : 1;
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(H.W / 2, H.H / 2 - 30); ctx.scale(s, s);
    ctx.font = "900 110px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 14; ctx.strokeStyle = "#06150f"; ctx.strokeText("GOL!", 0, 0);
    ctx.fillStyle = gol.team === 0 ? AZUL[0] : VERM[0]; ctx.fillText("GOL!", 0, 0);
    ctx.restore();
  }
  function passoConfete(dt) {
    for (const c of confete) { c.vy += 420 * dt; c.vx *= 0.99; c.x += c.vx * dt; c.y += c.vy * dt; c.t -= dt; c.g += dt * 8; }
    confete = confete.filter((c) => c.t > 0 && c.y < H.H + 20);
    for (const c of confete) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.g); ctx.globalAlpha = Math.min(1, c.t * 2); ctx.fillStyle = c.c; ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
  }
  // posição de um disco/bola no instante t, misturando os dois pacotes em volta dele
  function interpolado(t) {
    if (historico.length < 2) return null;
    let a = historico[0], b = historico[1];
    for (let i = 0; i < historico.length - 1; i++) if (historico[i + 1].t >= t) { a = historico[i]; b = historico[i + 1]; break; } else { a = historico[i]; b = historico[i + 1]; }
    const k = Math.max(0, Math.min(1.25, (t - a.t) / Math.max(1, b.t - a.t))); // passa um pouco do último: estica pela velocidade
    return { a: a.frame, b: b.frame, k };
  }
  const mistura = (pa, pb, k) => ({ x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k });
  let antes = performance.now();
  function draw() {
    requestAnimationFrame(draw);
    if (!frame || $("game").hidden) return;
    ajustarTela(); if (!fundo) montarFundo();
    const now = performance.now(), dt = Math.min(0.05, (now - antes) / 1000); antes = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tremor = Math.max(0, tremor - dt * 2.2);
    if (tremor > 0) ctx.translate((Math.random() - 0.5) * 9 * tremor, (Math.random() - 0.5) * 9 * tremor);
    ctx.drawImage(fundo, 0, 0, H.W, H.H);
    desenharGol(-1, now); desenharGol(1, now);
    const mix = interpolado(now - 70);
    const posDe = (p) => { if (!mix) return { x: p.x, y: p.y }; const pa = mix.a.discs.find((d) => d.id === p.id), pb = mix.b.discs.find((d) => d.id === p.id); return pa && pb ? mistura(pa, pb, mix.k) : { x: p.x, y: p.y }; };
    const b = frame.ball, bp = mix ? mistura(mix.a.ball, mix.b.ball, mix.k) : { x: b.x, y: b.y };
    const ballSpeed = Math.hypot(b.vx, b.vy);
    if (!reducedMotion.matches && ballSpeed > 260 && frame.phase === "play") {
      ctx.save(); ctx.fillStyle = "#e7fff2";
      for (let i = 4; i >= 1; i--) { ctx.globalAlpha = (1 - i / 5) * Math.min(0.35, ballSpeed / 1500); ctx.beginPath(); ctx.arc(bp.x - b.vx * i * 0.014, bp.y - b.vy * i * 0.014, H.BR * (1 - i * 0.13), 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    for (const p of frame.discs) { const q = posDe(p); desenharDisco(p, q.x, q.y, now); }
    desenharBola(bp.x, bp.y, b);
    drawEffects(now);
    passoConfete(dt);
    desenharGolGrande(now);
    const msg = frame.phase === "ready" ? frame.lastEvent : frame.phase === "over" ? frame.lastEvent : "";
    $("banner").textContent = msg; $("banner").classList.toggle("visible", !!msg);
  }
  draw();
})();
