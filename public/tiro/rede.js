// Tiro da Galera — rede: entrar/criar sala, o estado que vem do servidor, o pacote "snap" e os tiros dos outros.
import { E, AR, WP, $, store, clamp, lerp, TEAM, INTERP, toast, socket, relogio, sNow, myP, P, G, now } from "./estado.js";
import { show, renderLobby } from "./menus.js";
import { Sound, hearing } from "./sons.js";
import { scene } from "./cena.js";
import { makePlayer } from "./bonecos.js";
import { tracer, impact, blood, addRag } from "./efeitos.js";
import { newMe, startGame, stopGame } from "./jogo.js";
import { pushFeed, flashMsg, hitMarker, hurt, showOver } from "./hud.js";
import { setPrimary, setVM } from "./controles.js";

// ======================================================================
// Rede
// ======================================================================
// acerta o relógio com o do servidor (fica com a medida de menor ping, que é a mais precisa)
const syncClock = (n) => relogio.sincronizar(socket, n);
socket.on("png", (ack) => typeof ack === "function" && ack());

// ---------- entrar / criar ----------
$("hName").value = store.get("galera:name") || "";
if (E.urlCode) $("hCode").value = E.urlCode.toUpperCase();
if (matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches) $("mobileWarn").classList.remove("hidden");
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  E.ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("tiro:" + r.code, E.ME);
  history.replaceState(null, "", "/tiro/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, config: store.get("tiro:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("tiro:" + code) || {};
  socket.emit("join", { code, name, id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + "/tiro/?sala=" + E.ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  syncClock();
  const code = E.urlCode ? E.urlCode.toUpperCase() : null, saved = code && store.get("tiro:" + code);
  if (E.ME) socket.emit("join", { code: E.ME.code, watch: !E.ME.id, id: E.ME.id, token: E.ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
}
socket.on("connect", autoJoin);
setInterval(() => socket.connected && syncClock(2), 15000);
socket.on("kicked", () => { toast("O organizador tirou você da sala."); E.urlCode = null; E.ME = null; E.S = null; history.replaceState(null, "", "/tiro/"); $("roomTag").classList.add("hidden"); stopGame(); show("home"); });
// ---------- estado vindo do servidor ----------
socket.on("state", (st) => {
  const old = E.S; E.S = st;
  if (st.phase === "lobby") {
    if (G.active && G.mode === "online") stopGame();
    if (!G.active) { show("lobby"); renderLobby(); }
    return;
  }
  if (!G.active || G.mode === "treino") startGame("online");
  else syncFromState(old, st);
});
export function syncFromState(old, st) {
  if (!st || !G.active || G.mode !== "online") return;
  const mine = myP(), r = st.round;
  // bonecos dos outros
  const ids = new Set();
  for (const p of st.players) {
    if (!p.team || (E.ME && p.id === E.ME.id)) continue;
    ids.add(p.id);
    let rm = G.remotes.get(p.id);
    if (!rm || rm.team !== p.team) {
      if (rm) scene.remove(rm.model);
      const mate = mine && mine.team === p.team;
      rm = { id: p.id, team: p.team, name: p.name, model: makePlayer(p.team, p.name, mate), buf: [], x: 0, y: 0, z: 0, yaw: 0, pitch: 0, w: p.w, speed: 0, stepT: 0, g: 1, wk: 0 };
      scene.add(rm.model); G.remotes.set(p.id, rm);
    }
    rm.alive = p.alive; rm.w = rm.w || p.w;
    if (p.spawn && (!old || !old.round || !r || old.round.n !== r.n)) { rm.buf = [{ t: sNow() - 500, x: p.spawn[0], y: p.spawn[1], z: p.spawn[2], yaw: p.spawn[3], pitch: 0, w: p.w }]; }
  }
  for (const [id, rm] of G.remotes) if (!ids.has(id)) { scene.remove(rm.model); G.remotes.delete(id); }
  // rodada nova: volto para a base, vida cheia
  const key = r ? `${r.n}` : null;
  if (r && key !== G.roundKey) {
    G.roundKey = key;
    if (mine && mine.team && mine.spawn) { G.me = newMe(mine.spawn, mine.w); G.me.alive = mine.alive; setVM(mine.w); }
    else if (G.me) G.me.alive = false;
    flashMsg(`Rodada ${r.n}`, mine && mine.team ? "Principal: AK-47 ou AWP (1 troca) · 2 Deagle · 3 faca" : "Assistindo", 2500);
    Sound.round();
  }
  if (mine && G.me) {
    if (G.me.alive && !mine.alive) die();
    G.me.hp = mine.hp;
    if (mine.w !== G.me.prim && r && r.phase === "freeze") setPrimary(mine.w, false);
  }
  if (r && r.phase === "end" && (!old || !old.round || old.round.phase !== "end" || old.round.n !== r.n)) {
    const good = mine && mine.team && r.winner === mine.team;
    flashMsg(r.winner ? `Time ${TEAM[r.winner]} venceu a rodada` : "Rodada empatada", r.reason === "tempo" ? "Acabou o tempo" : "", 3500, r.winner ? (r.winner === "A" ? "#8dbbff" : "#ffb27a") : "#fff");
    if (mine && mine.team) Sound.win(good);
  }
  // abates novos: mostra no canto
  const seen = new Set((old && old.kills || []).map((k) => k.t + k.by + k.to));
  for (const k of st.kills) if (!seen.has(k.t + k.by + k.to)) pushFeed(k);
  if (st.phase === "over") showOver(); else $("over").classList.add("hidden");
}
function die() {
  const me = G.me; me.alive = false; me.scope = 0;
  const k = E.S && [...E.S.kills].reverse().find((x) => E.ME && x.to === E.ME.id);
  const killer = k && P(k.by);
  flashMsg("Você morreu", killer ? `${killer.name} te pegou de ${WP[k.w].name}${k.head ? ", na cabeça" : ""}` : "", 3000, "#ff6b6b");
  G.specIdx = 0;
}

// ---------- tiros, acertos e recargas dos outros ----------
// pacote do servidor (20x por segundo) com todo mundo: [n, x, y, z, yaw, pitch, arma, mira, chão + 2*andando devagar]
socket.on("snap", (d) => {
  if (!E.S) return;
  for (const e of d.p) {
    const p = E.S.players.find((x) => x.n === e[0]); if (!p) continue;
    const rm = G.remotes.get(p.id); if (!rm) continue;
    const s = { t: d.t, x: e[1], y: e[2], z: e[3], yaw: e[4], pitch: e[5], w: ["ak", "awp", "deagle", "faca"][e[6]] || "ak", sc: e[7], g: e[8] & 1, wk: (e[8] >> 1) & 1 };
    rm.buf.push(s); if (rm.buf.length > 40) rm.buf.shift();
    rm.w = s.w; rm.sc = s.sc; rm.g = s.g; rm.wk = s.wk;
  }
});
socket.on("shot", (d) => {
  if (!G.active || G.mode !== "online") return;
  const rm = G.remotes.get(d.id);
  const from = rm ? muzzleOfRemote(rm) : d.o;
  if (d.w !== "faca") { tracer(from, d.e, d.w); if (!d.hit) impact(d.e, d.n); }
  if (rm) { rm.flash = now() + 0.05; rm.kick = 1; }
  const [k, pan] = hearing(d.o); Sound.shot(d.w, k, pan);
});
socket.on("hit", (d) => {
  if (!G.active || G.mode !== "online") return;
  blood(d.p);
  const vic = G.remotes.get(d.to), sh = E.ME && d.by === E.ME.id ? G.me : G.remotes.get(d.by);
  if (vic && sh) { const dx = vic.x - sh.x, dz = vic.z - sh.z, l = Math.hypot(dx, dz) || 1; vic.lastHit = { dir: { x: dx / l, z: dz / l }, head: d.part === "head", t: now() }; }
  if (E.ME && d.by === E.ME.id) { hitMarker(d.hp <= 0); Sound.hit(d.part === "head"); if (d.hp <= 0) setTimeout(() => Sound.kill(), 90); }
  if (E.ME && d.to === E.ME.id) { G.me.hp = d.hp; hurt(); }
});
socket.on("reload", (d) => { const rm = G.remotes.get(d.id); if (rm) { rm.reloadAt = now(); const [k, pan] = hearing([rm.x, rm.y + 1, rm.z]); if (k > 0.2) Sound.dry(); } });
function muzzleOfRemote(rm) { const d = AR.dirOf(rm.yaw, rm.pitch); return [rm.x + d[0] * 0.8 + Math.cos(rm.yaw) * 0.12, rm.y + 1.32 + d[1] * 0.8, rm.z + d[2] * 0.8 - Math.sin(rm.yaw) * 0.12]; }
export function updateRemotes(dt, t) {
  const rt = sNow() - INTERP;
  for (const rm of G.remotes.values()) {
    if (G.mode === "online") {
      const b = rm.buf;
      if (b.length) {
        let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--;
        const B = b[i], A = b[Math.max(0, i - 1)], k = B.t === A.t ? 1 : clamp((rt - A.t) / (B.t - A.t), 0, 1);
        const nx = lerp(A.x, B.x, k), nz = lerp(A.z, B.z, k);
        rm.speed = Math.hypot(nx - rm.x, nz - rm.z) / Math.max(dt, 1e-3); rm.vx = (nx - rm.x) / Math.max(dt, 1e-3); rm.vz = (nz - rm.z) / Math.max(dt, 1e-3);
        rm.x = nx; rm.y = lerp(A.y, B.y, k); rm.z = nz;
        let dy = B.yaw - A.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); rm.yaw = A.yaw + dy * k; rm.pitch = lerp(A.pitch, B.pitch, k);
        while (b.length > 2 && b[1].t < rt - 200) b.shift();
      }
    }
    const m = rm.model, u = m.userData;
    // acabou de morrer: o corpo cai de verdade, empurrado na direção do tiro
    if (rm.wasAlive && !rm.alive) { const h = rm.lastHit && now() - rm.lastHit.t < 1.5 ? rm.lastHit : null; addRag(m, rm.x, rm.y, rm.z, rm.yaw, { x: clamp(rm.vx || 0, -8, 8), y: 0, z: clamp(rm.vz || 0, -8, 8) }, h && h.dir, h && h.head); }
    rm.wasAlive = rm.alive;
    m.visible = !!rm.alive && !(G.spec === rm);
    m.position.set(rm.x, rm.y, rm.z); m.rotation.y = rm.yaw;
    u.head.rotation.x = rm.pitch * 0.6; u.upper.rotation.x = rm.pitch;
    for (const k of Object.keys(u.guns)) u.guns[k].visible = k === (rm.w || "ak");
    const moving = rm.speed > 0.6 && rm.g !== 0;
    rm.anim = (rm.anim || 0) + dt * (moving ? rm.speed * 1.9 : 0);
    const sw = moving ? Math.sin(rm.anim) * 0.6 : 0;
    u.legs[0].rotation.x = lerp(u.legs[0].rotation.x, sw, 0.3); u.legs[1].rotation.x = lerp(u.legs[1].rotation.x, -sw, 0.3);
    u.gunGroup.position.z = -0.35 + (rm.kick || 0) * 0.06; rm.kick = (rm.kick || 0) * Math.exp(-dt * 12);
    // passos dos outros: dá para ouvir alguém chegando (andando devagar com Shift não faz barulho)
    if (rm.alive && moving && rm.speed > 3 && !rm.wk && G.mode === "online") { rm.stepT -= dt; if (rm.stepT <= 0) { rm.stepT = 0.36; const [k, pan] = hearing([rm.x, rm.y, rm.z]); Sound.step(k * 1.2, pan); } }
  }
}
