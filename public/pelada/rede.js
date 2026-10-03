// Pelada da Galera — rede: entrar/criar sala, o estado que vem do servidor e os eventos do jogo (pacote "snap"
// 20x por segundo, chute, gol, carrinho...). Os outros jogadores aparecem 100 ms "no passado", interpolados.
import { E, C, $, h, store, clamp, lerp, angLerp, SIDES, FL, INTERP, FIXO, BASE, toast, socket, relogio, sNow, myP, P, PN, G, now, ballS, isCar, myKit, mySkin, PAD } from "./estado.js";
import { show, renderLobby } from "./menus.js";
import { SKINS_CONFIG, makePlayer, mudarSkinJogador, descartarJogador, animate, makeCar, animateCar, poseCar, addRag } from "./bonecos.js";
import { Sound, hearing } from "./sons.js";
import { scene } from "./cena.js";
import { pads, ensureArena } from "./arenas.js";
import { newMe, startGame, stopGame, rebuildMyModel, camTroca, focoCam } from "./jogo.js";
import { predictBall } from "./bola.js";
import { flashMsg, pushFeed, showOver } from "./hud.js";
import { DEKE_T, boomFx, auraItens, comecarSuper } from "./strikers.js";

// ======================================================================
// Rede
// ======================================================================
const syncClock = (n) => relogio.sincronizar(socket, n);
socket.on("png", (ack) => typeof ack === "function" && ack());

$("hName").value = store.get("galera:name") || "";
if (E.urlCode) $("hCode").value = E.urlCode.toUpperCase();
if (matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches) $("mobileWarn").classList.remove("hidden");
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  E.ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("pelada:" + r.code, E.ME);
  history.replaceState(null, "", BASE + "?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, skin: store.get("pelada:skin"), config: { ...(store.get("pelada:cfg") || {}), mode: FIXO } }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("pelada:" + code) || {};
  socket.emit("join", { code, name, skin: store.get("pelada:skin"), id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + BASE + "?sala=" + E.ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function autoJoin() {
  syncClock();
  const code = E.urlCode ? E.urlCode.toUpperCase() : null, saved = code && store.get("pelada:" + code);
  if (E.ME) socket.emit("join", { code: E.ME.code, watch: !E.ME.id, id: E.ME.id, token: E.ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
}
socket.on("connect", autoJoin);
setInterval(() => socket.connected && syncClock(2), 15000);
socket.on("removido", () => { toast("O organizador tirou você da sala."); E.urlCode = null; E.ME = null; E.S = null; history.replaceState(null, "", BASE); $("roomTag").classList.add("hidden"); stopGame(); show("home"); });
// ---------- estado vindo do servidor ----------
socket.on("state", (st) => {
  // entrou pelo código numa sala da outra casa (pelada x rocket): vai para a página certa
  if (st.config.mode !== FIXO) { location.replace((st.config.mode === "carros" ? "/rocket/" : "/pelada/") + "?sala=" + st.code); return; }
  const old = E.S; E.S = st;
  if (st.phase === "lobby") {
    if (G.active && G.mode === "online") stopGame();
    if (!G.active) { show("lobby"); renderLobby(); }
    return;
  }
  if (!G.active || G.mode === "treino" || G.game !== st.config.mode) startGame("online", st.config.mode);
  else syncFromState(old, st);
});
export function syncFromState(old, st) {
  if (!st || !G.active || G.mode !== "online") return;
  ensureArena(G.game);
  const mine = myP(), m = st.match;
  if (mine && (mine.tq || 0) !== (G.trocaSeq || 0) && !(mine.tq < (G.trocaSeq || 0))) G.trocaSeq = mine.tq; // voltei para a sala (recarreguei): pego a contagem de trocas
  const ids = new Set();
  for (const p of st.players) {
    if (!p.team || (E.ME && p.id === E.ME.id)) continue;
    ids.add(p.id);
    let rm = G.remotes.get(p.id);
    const key = `${G.game}|${p.team}|${st.kits[p.team]}|${p.num}|${p.gk}|${p.car}`;
    if (!rm || rm.key !== key) {
      if (rm) descartarJogador(rm.model);
      const model = isCar() ? makeCar(p.car, st.kits[p.team], p.name) : makePlayer(st.kits[p.team], p.num, p.name, { gk: p.gk, skin: p.skin });
      rm = { id: p.id, n: p.n, key, team: p.team, name: p.name, model, buf: [], x: 0, y: 0, z: 0, yaw: 0, pitch: 0, f: 0, speed: 0, st: {} };
      scene.add(rm.model); G.remotes.set(p.id, rm);
    }
    rm.n = p.n; rm.ping = p.ping ?? 80; // o ping dele: quanto atrasada chega a posição (para o corpo a corpo)
    if (!isCar() && rm.model.userData.skin !== (C.SKINS[p.skin] ? p.skin : "padrao")) mudarSkinJogador(rm, p.skin); // trocou a skin: troca na hora
    if (p.spawn && m && (!old || !old.match || old.match.kickoff !== m.kickoff)) rm.buf = [{ t: sNow() - 500, x: p.spawn[0], y: 0, z: p.spawn[2], yaw: p.spawn[3], pitch: 0, f: 0, vx: 0, vz: 0 }];
  }
  for (const [id, rm] of G.remotes) if (!ids.has(id)) { descartarJogador(rm.model); G.remotes.delete(id); }
  const car = (mine && mine.car) || "godzilla";
  if (G.meKey !== `${G.game}|${myKit()}|${mine && mine.gk}|${car}|${mine && mine.num}` || (!!G.meModel !== !!(mine && mine.team))) rebuildMyModel();
  else if (G.meModel && !isCar() && G.meModel.userData.skin !== mySkin()) mudarSkinJogador(G.meModel, mySkin());
  if (m && `${m.kickoff}` !== G.kickoffKey) {
    G.kickoffKey = `${m.kickoff}`;
    if (mine && mine.team && mine.spawn) { const boost = G.me.boost; Object.assign(G.me, newMe(mine.spawn)); G.me.boost = Math.max(34, boost); G.camYaw = mine.spawn[3]; G.camPitch = 0.05; G.camCarYaw = mine.spawn[3]; }
    ballS.snap = null; ballS.mine = null; Object.assign(ballS.view, C.newBall(G.F)); ballS.off = { x: 0, y: 0, z: 0 };
    for (const pd of pads) pd.until = 0;
    if (m.kickoff > 1) flashMsg("Saída de bola", "", 2000);
  }
  if (m && old && old.match && old.match.phase === "ready" && m.phase === "live") Sound.start();
  if (st.phase === "over" && old && old.phase !== "over") Sound.end();
  if (st.phase === "over") showOver(); else $("over").classList.add("hidden");
}

// ---------- Strikers online: efeitos de item, item ganho e explosão ----------
socket.on("efeito", (d) => {
  if (!G.active || G.mode !== "online") return;
  if (E.ME && d.id === E.ME.id) { G.me[d.tipo + "T"] = d.ms / 1000; flashMsg("", `${C.ITENS[d.tipo].emoji} ${C.ITENS[d.tipo].nome}!`, 800, "#ffe14a"); Sound.item(); }
});
socket.on("ganhou", (d) => {
  if (!G.active || G.mode !== "online") return;
  if (E.ME && d.id === E.ME.id) { flashMsg("", `${C.ITENS[d.tipo].emoji} ${C.ITENS[d.tipo].nome}! (${d.motivo}) · ${PAD.on ? "↑" : "G"} para usar`, 1600, "#ffe14a"); Sound.item(); }
  else { const p = P(d.id); if (p) pushFeed(`🎁 ${h(p.name)} ganhou ${C.ITENS[d.tipo].emoji}`); }
});
// amistoso com bots: troquei de corpo com um bot (LB/T ou passe para ele). Vou para onde ele estava.
socket.on("trocou", (d) => {
  if (!G.active || G.mode !== "online" || !G.me) return;
  G.trocaSeq = d.tq;
  camTroca(focoCam(G.me));
  Object.assign(G.me, { x: d.x, y: d.y, z: d.z, vx: d.vx, vz: d.vz, facing: d.yaw, yaw: d.yaw });
  if (ballS.mine) { ballS.snap = { ...ballS.mine, t: sNow(), dono: d.bot }; ballS.mine = null; } // a bola que eu conduzia fica com o bot
  E.charge = null; flashMsg("", "🔁 Trocou de jogador", 700);
});
socket.on("boom", (d) => { if (G.active && G.mode === "online") boomFx(d.x, d.z); });
// ---------- pacote do servidor (20x por segundo): bola e todo mundo ----------
socket.on("snap", (d) => {
  if (!G.active || G.mode !== "online") return;
  for (const e of d.p) {
    const p = PN(e[0]); if (!p) continue;
    const rm = G.remotes.get(p.id); if (!rm) continue;
    rm.buf.push({ t: d.t, x: e[1], y: e[2], z: e[3], vx: e[4], vy: e[5], vz: e[6], yaw: e[7], pitch: e[8], f: e[9], o: Array.isArray(e[10]) ? e[10] : null });
    if (rm.buf.length > 30) rm.buf.shift();
  }
  // itens andando (Strikers): guarda com a hora, e o desenho anda com eles até o próximo pacote
  G.itensRede = (d.it || []).map(([id, k, x, z, vx, vz, t]) => ({ id, tipo: C.ITEM_LISTA[k], x, z, vx, vz, t, at: performance.now() }));
  const [x, y, z, vx, vy, vz, hit, hn, sp, wx = 0, wy = 0, wz = 0, dn = -1] = d.b;
  if (hit > 2) { const [k, pan] = hearing([x, y, z]); Sound.bounce(hit, k, pan, isCar()); }
  const holder = hn >= 0 && PN(hn) ? PN(hn).id : null;
  if (performance.now() < ballS.ignoreUntil && !holder) return; // acabei de chutar: espero o chute voltar do servidor
  const before = { ...ballS.view };
  const donoId = dn >= 0 && PN(dn) ? PN(dn).id : null; // quem está conduzindo (eu viro "eu", como no myBody)
  ballS.snap = { t: d.t, x, y, z, vx, vy, vz, sp: sp || 0, wx, wy, wz, holder, dono: E.ME && donoId === E.ME.id ? "eu" : donoId };
  (ballS.buf ||= []).push({ t: d.t, x, y, z, vx, vz }); if (ballS.buf.length > 30) ballS.buf.shift(); // para desenhar no relógio de quem conduz
  // bola no meu pé: o servidor diz que sou eu quem conduz, então a bola passa a ser simulada aqui (como o meu jogador)
  // e vai junto nos meus pacotes. Se o servidor disser duas vezes seguidas que não sou mais eu (roubo, carrinho), ele manda.
  if (ballS.mine) {
    if (E.ME && donoId === E.ME.id && !holder) { ballS.naoDono = 0; return; }
    if (++ballS.naoDono < 2 || performance.now() - ballS.mineT < 300) return;
    ballS.mine = null; // devolve para o servidor (a diferença é corrigida aos poucos, logo abaixo)
  } else if (E.ME && donoId === E.ME.id && !holder && !isCar() && G.meModel && G.me.downT <= 0) {
    ballS.mine = { ...ballS.view, sp: 0, wx: 0, wy: 0, wz: 0, holder: null, dono: "eu" }; ballS.mineT = performance.now(); ballS.naoDono = 0; return;
  }
  const pred = predictBall();
  if (ballS.modo === "outro" && donoId && !holder) return; // outro conduzindo: a bola é interpolada (updateBall), sem correção aqui
  if (pred && !holder) { ballS.off = { x: before.x - pred.x, y: before.y - pred.y, z: before.z - pred.z }; if (Math.hypot(ballS.off.x, ballS.off.y, ballS.off.z) > 4) ballS.off = { x: 0, y: 0, z: 0 }; }
  else ballS.off = { x: 0, y: 0, z: 0 };
});
socket.on("kicked", (d) => {
  if (!G.active || G.mode !== "online") return;
  const rm = G.remotes.get(d.id);
  if (rm) { rm.st.kickT = now(); const [k, pan] = hearing([rm.x, 0.5, rm.z]); Sound.kick(d.power, k, pan); }
  if (E.ME && d.id === E.ME.id) ballS.ignoreUntil = 0;
});
socket.on("pegou", () => { if (G.active) Sound.catch(); });
socket.on("caiu", (d) => {
  if (!G.active || G.mode !== "online") return;
  Sound.fall();
  // o derrubado vira boneco de pano por um instante (empurrado na direção do carrinho) e depois levanta
  const vic = E.ME && d.id === E.ME.id ? { model: G.meModel, x: G.me.x, y: G.me.y, z: G.me.z, yaw: G.me.facing, vx: G.me.vx, vz: G.me.vz } : G.remotes.get(d.id);
  const tk = E.ME && d.by === E.ME.id ? G.me : G.remotes.get(d.by); // quem deu o carrinho
  if (vic && vic.model && !isCar() && !(vic.model === G.meModel && G.view === "primeira")) {
    const dx = tk ? vic.x - tk.x : 0, dz = tk ? vic.z - tk.z : 1, l = Math.hypot(dx, dz) || 1, k = SKINS_CONFIG[vic.model.userData.skin]?.queda?.push || 1;
    addRag(vic.model, vic.x, vic.y || 0, vic.z, vic.yaw ?? vic.model.rotation.y, { x: vic.vx || 0, y: 0, z: vic.vz || 0 }, { x: (dx / l) * 3.5 * k, y: 2.2 * k, z: (dz / l) * 3.5 * k }, 1.15);
  }
  if (E.ME && d.id === E.ME.id) { G.me.downT = 1.4; E.charge = null; }
  const by = P(d.by), to = P(d.id);
  if (by && to) pushFeed(`🦵 ${h(by.name)} derrubou ${h(to.name)}`);
});
socket.on("super", (d) => { // Super Chute de alguém: todo mundo vê a mesma animação (o servidor soma os gols no fim)
  if (!G.active || G.mode !== "online") return;
  if (E.ME && d.by === E.ME.id) { ballS.mine = null; G.superBarra = null; }
  comecarSuper(d, null);
});
socket.on("goal", (d) => {
  if (!G.active || G.mode !== "online") return;
  const by = P(d.by), as = P(d.assist), kit = E.S.kits[d.side];
  if (d.sup) { pushFeed(`⚡ ${by ? h(by.name) : SIDES[d.side]}: Super Chute, +${d.qtd}`); return; } // a animação já comemorou
  Sound.net(); Sound.cheer();
  flashMsg("GOOOL!", by ? (d.own ? `Gol contra de ${by.name}` : `${by.name}${as ? ` (passe de ${as.name})` : ""} · ${SIDES[d.side]}`) : SIDES[d.side], 3800, C.kitColor(kit), true);
  pushFeed(`⚽ ${by ? h(by.name) + (d.own ? " (contra)" : "") : SIDES[d.side]}${as ? ` <span style="opacity:.75">· ${h(as.name)}</span>` : ""}`);
});
export function updateRemotes(dt) {
  const rt = sNow() - INTERP;
  for (const rm of G.remotes.values()) {
    const b = rm.buf;
    if (b.length) {
      let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--;
      const B = b[i], A = b[Math.max(0, i - 1)], k = B.t === A.t ? 1 : clamp((rt - A.t) / (B.t - A.t), 0, 1);
      const nx = lerp(A.x, B.x, k), nz = lerp(A.z, B.z, k);
      rm.speed = Math.hypot(nx - rm.x, nz - rm.z) / Math.max(dt, 1e-3);
      rm.x = nx; rm.y = lerp(A.y, B.y, k); rm.z = nz; rm.vx = B.vx; rm.vz = B.vz;
      const ny = angLerp(A.yaw, B.yaw, k); rm.st.steer = clamp(angLerp(0, ny - rm.yaw, 1) / Math.max(dt, 1e-3) / -2, -1, 1); rm.yaw = ny;
      rm.pitch = lerp(A.pitch || 0, B.pitch || 0, k); rm.f = B.f | 0;
      rm.o = A.o && B.o ? A.o.map((v, j) => lerp(v, B.o[j], k)) : B.o || null; // orientação (parede/teto), misturada e normalizada no poseCar
      while (b.length > 2 && b[1].t < rt - 200) b.shift();
      // onde ele está AGORA: o último pacote andado para a frente (o tempo desde o pacote + metade do ping dele,
      // que é o quanto a posição demorou para chegar no servidor). É contra essa posição que eu colido.
      const U = b[b.length - 1], ahead = clamp((sNow() - U.t + (rm.ping || 80) / 2) / 1000, 0, 0.3);
      rm.px = U.x + (U.vx || 0) * ahead; rm.pz = U.z + (U.vz || 0) * ahead; rm.pvx = U.vx || 0; rm.pvz = U.vz || 0;
    }
    // perto de mim, o boneco é desenhado na posição de agora (o que eu vejo é o que colide); longe, a interpolada (lisa)
    const perto = G.me && rm.px != null && !isCar() ? clamp((3 - Math.hypot(rm.x - G.me.x, rm.z - G.me.z)) / 1.5, 0, 1) : 0;
    rm.k = lerp(rm.k || 0, perto, Math.min(1, dt * 6));
    if (G.F.strikers) auraItens({ x: rm.x, z: rm.z, estrelaT: rm.f & FL.estrela ? 1 : 0, cogumeloT: rm.f & FL.cogumelo ? 1 : 0 }, dt); // brilho de quem está com estrela/cogumelo
    rm.giro = rm.f & FL.deke ? Math.min(Math.PI * 2, (rm.giro || 0) + (dt / DEKE_T) * Math.PI * 2) : 0; // o giro do drible dele
    rm.model.position.set(lerp(rm.x, rm.px ?? rm.x, rm.k), rm.y, lerp(rm.z, rm.pz ?? rm.z, rm.k)); rm.model.rotation.y = rm.yaw + rm.giro;
    if (isCar()) poseCar(rm.model, rm.model.position.x, rm.y, rm.model.position.z, rm.yaw, rm.o);
    if (isCar()) animateCar(rm.model, rm.st, dt, rm.speed, rm.f, rm.o ? 0 : rm.pitch);
    else { rm.st.holding = ballS.snap && ballS.snap.holder === rm.id; rm.st.segura = !!(rm.f & FL.grab); animate(rm.model, rm.speed, dt, rm.st, rm.f); }
  }
}
