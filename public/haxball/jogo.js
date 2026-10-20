(() => {
  const $ = (id) => document.getElementById(id), H = window.Haxball;
  const socket = io("/haxball");
  const sessionKey = "haxball:sala";
  let room = null, me = null, frame = null, frameAt = 0, touch = { x: 0, y: 0 }, kickQueued = false;
  const held = new Set(), params = new URLSearchParams(location.search);
  const canvas = $("field"), ctx = canvas.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let lastFxSeq = 0, liveFx = [];
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
  function enter(watch = false) { const code = $("code").value.trim().toUpperCase(); request("join", { code, name: saveName(), watch }, remember); }
  $("join").onclick = () => enter(); $("watch").onclick = () => enter(true);
  $("code").onkeydown = (e) => { if (e.key === "Enter") enter(); };
  $("copy").onclick = async () => { try { await navigator.clipboard.writeText(location.href); $("copy").textContent = "Convite copiado!"; setTimeout(() => $("copy").textContent = "Copiar convite", 2000); } catch { say("roomError", "Copie o endereço da página para convidar."); } };
  $("leave").onclick = () => { sessionStorage.removeItem(sessionKey); location.href = "/haxball/"; };
  function act(type, extra = {}) { request("act", { type, ...extra }); }
  $("blueJoin").onclick = () => act("team", { team: 0 });
  $("redJoin").onclick = () => act("team", { team: 1 });
  $("start").onclick = () => act("start");
  $("backLobby").onclick = () => act("lobby");
  function sendConfig() { act("config", { config: { size: $("roomSize").value, minutes: $("roomMinutes").value, goals: $("roomGoals").value } }); }
  for (const id of ["roomSize", "roomMinutes", "roomGoals"]) $(id).onchange = sendConfig;
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
    if (!data) { frame = null; liveFx = []; lastFxSeq = 0; return; }
    if (data.fxSeq < lastFxSeq) { lastFxSeq = 0; liveFx = []; }
    for (const e of data.fx || []) if (e.seq > lastFxSeq) liveFx.push({ ...e, at: now });
    lastFxSeq = data.fxSeq || 0;
    if (liveFx.length > 28) liveFx = liveFx.slice(-28);
    frame = data; frameAt = now;
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
      const label = document.createElement("span"); label.textContent = `${p.name}${p.id === room.host ? " ★" : ""}${p.id === me ? " (você)" : ""}`; row.append(label);
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
    $("roomSize").value = room.config.size; $("roomMinutes").value = room.config.minutes; $("roomGoals").value = room.config.goals;
    $("settings").hidden = !host || playing;
    $("blueJoin").hidden = !myPlayer || playing; $("redJoin").hidden = !myPlayer || playing;
    $("blueJoin").disabled = myPlayer?.team === 0 || blue.length >= room.config.size;
    $("redJoin").disabled = myPlayer?.team === 1 || red.length >= room.config.size;
    $("start").hidden = !host || playing;
    $("start").textContent = room.phase === "over" ? "Revanche" : "Começar partida";
    $("start").disabled = blue.length !== room.config.size || red.length !== room.config.size;
    $("backLobby").hidden = !host || room.phase === "lobby";
    $("hint").textContent = playing ? "A bola está rolando. Entre no próximo jogo se chegou agora." : `Para começar, complete os dois times com ${room.config.size} jogador(es).`;
    $("game").hidden = !room.match;
    $("role").textContent = myPlayer?.team === 0 ? "Você joga pelo azul" : myPlayer?.team === 1 ? "Você joga pelo vermelho" : "Você está assistindo";
    $("touch").hidden = !playing || myPlayer?.team === null || !myPlayer;
    updateScore();
  }
  function updateScore() {
    if (!frame) return;
    $("scoreA").textContent = frame.score[0]; $("scoreB").textContent = frame.score[1];
    const sec = Math.max(0, Math.ceil(frame.remaining));
    $("timer").textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  }
  const moves = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };
  addEventListener("keydown", (e) => {
    if (e.target.matches("input,select,textarea")) return;
    if (moves[e.code] || e.code === "Space") { e.preventDefault(); held.add(e.code); if (e.code === "Space" && !e.repeat) kickQueued = true; }
  });
  addEventListener("keyup", (e) => held.delete(e.code));
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
  function drawEffects(now) {
    liveFx = liveFx.filter((e) => now - e.at < (e.kind === "goal" ? 680 : 300));
    for (const e of liveFx) {
      const duration = e.kind === "goal" ? 680 : e.kind === "kick" ? 300 : 230;
      const t = Math.min(1, (now - e.at) / duration), fade = 1 - t;
      const color = e.team === 0 ? "#a9deff" : e.team === 1 ? "#ffc0c4" : "#f7ffe8";
      ctx.save();
      if (e.kind === "goal") {
        ctx.fillStyle = e.team === 0 ? `rgba(77,168,250,${(fade * 0.33).toFixed(3)})` : `rgba(251,94,105,${(fade * 0.33).toFixed(3)})`;
        ctx.fillRect(e.x < H.W / 2 ? 12 : H.RIGHT, H.GOAL_TOP, H.LEFT - 12, H.GOAL_BOTTOM - H.GOAL_TOP);
      }
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
    }
  }
  // Campo inteiro é desenhado no canvas. As posições chegam do servidor 20 vezes por segundo.
  function draw() {
    requestAnimationFrame(draw);
    if (!frame || $("game").hidden) return;
    const now = performance.now(), extrapolate = Math.min(0.045, (now - frameAt) / 1000);
    ctx.fillStyle = "#246c46"; ctx.fillRect(0, 0, H.W, H.H);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? "#ffffff08" : "#00000006"; ctx.fillRect(H.LEFT + i * (H.RIGHT - H.LEFT) / 12, H.TOP, (H.RIGHT - H.LEFT) / 12, H.BOTTOM - H.TOP); }
    ctx.strokeStyle = "#e8ffecaa"; ctx.lineWidth = 3;
    ctx.strokeRect(H.LEFT, H.TOP, H.RIGHT - H.LEFT, H.BOTTOM - H.TOP);
    ctx.beginPath(); ctx.moveTo(H.W / 2, H.TOP); ctx.lineTo(H.W / 2, H.BOTTOM); ctx.stroke();
    ctx.beginPath(); ctx.arc(H.W / 2, H.H / 2, 72, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(H.LEFT, H.H / 2 - 122, 130, 244); ctx.strokeRect(H.RIGHT - 130, H.H / 2 - 122, 130, 244);
    ctx.fillStyle = "#163931"; ctx.fillRect(12, H.GOAL_TOP, H.LEFT - 12, H.GOAL_BOTTOM - H.GOAL_TOP); ctx.fillRect(H.RIGHT, H.GOAL_TOP, H.W - H.RIGHT - 12, H.GOAL_BOTTOM - H.GOAL_TOP);
    ctx.strokeStyle = "#e8ffec"; ctx.lineWidth = 4; ctx.strokeRect(12, H.GOAL_TOP, H.LEFT - 12, H.GOAL_BOTTOM - H.GOAL_TOP); ctx.strokeRect(H.RIGHT, H.GOAL_TOP, H.W - H.RIGHT - 12, H.GOAL_BOTTOM - H.GOAL_TOP);
    for (const p of frame.discs) {
      const x = p.x + p.vx * extrapolate, y = p.y + p.vy * extrapolate;
      ctx.shadowColor = "#0008"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.beginPath(); ctx.arc(x, y, H.PR, 0, Math.PI * 2); ctx.fillStyle = p.team === 0 ? "#4da8fa" : "#fb5e69"; ctx.fill();
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = p.id === me ? "#ecff9d" : "#ffffffbb"; ctx.lineWidth = p.id === me ? 4 : 2; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "center"; ctx.fillText(p.name, x, y - 27);
    }
    const b = frame.ball, bx = b.x + b.vx * extrapolate, by = b.y + b.vy * extrapolate;
    const ballSpeed = Math.hypot(b.vx, b.vy);
    if (!reducedMotion.matches && ballSpeed > 260 && frame.phase === "play") {
      ctx.save(); ctx.fillStyle = "#e7fff2";
      for (let i = 4; i >= 1; i--) {
        ctx.globalAlpha = (1 - i / 5) * Math.min(0.35, ballSpeed / 1500);
        ctx.beginPath(); ctx.arc(bx - b.vx * i * 0.014, by - b.vy * i * 0.014, H.BR * (1 - i * 0.13), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(bx, by, H.BR, 0, Math.PI * 2); ctx.fillStyle = "#fffefa"; ctx.fill(); ctx.strokeStyle = "#25363b"; ctx.lineWidth = 3; ctx.stroke();
    drawEffects(now);
    const msg = frame.phase === "ready" ? frame.lastEvent : frame.phase === "over" ? frame.lastEvent : "";
    $("banner").textContent = msg; $("banner").classList.toggle("visible", !!msg);
  }
  draw();
})();
