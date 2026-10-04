// Pingue-Pongue da Galera — o jogo no navegador: telas, mesa em 3D (Three.js), raquete no mouse, robô, sons e rede.
// As regras (voo da bola, juiz, raquetada, placar e o robô) ficam em regras.js (window.PingPong), as mesmas do
// servidor. A raquete fica onde o mouse aponta, num plano um pouco acima da mesa, do meu lado. Quando a bola (já
// quicada do meu lado) passa pela raquete, eu rebato; a velocidade da raquete nessa hora decide força e direção.
// Online, quem bate manda a batida e quem recebe decide o ponto (ver pingpong.js). No treino, tudo roda aqui.
import * as THREE from "three";
import { makePlayer, animate, descartarJogador, configurarBonecos } from "/pelada/bonecos.js";
import { canvasTex, M } from "/pelada/tex.js";

const P = window.PingPong, C = window.Campo, { MESA } = P, { $, h, store } = Comum;
const toast = Comum.criarToast(3000), socket = io("/pingpong"), relogio = Comum.relogio(), act = Comum.criarAct(socket, toast);
const COR = ["#2f80ed", "#e0322f"], KIT = ["celeste", "rubronegro"], NOME_LADO = ["azul", "vermelho"];
const DIFS = [["facil", "😌 Fácil"], ["medio", "🙂 Médio"], ["dificil", "😤 Difícil"]], BOT_SKINS = ["steve", "pikachu", "shrek", "naruto", "woody"];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
let S = null, ME = null, urlCode = new URLSearchParams(location.search).get("sala");
// G: a partida que está na tela. est: placar/fase (no online é o do servidor; no treino, montado aqui)
const G = { active: false, offline: false, pausa: false, lado: 0, eu: -1, est: null, bola: null, rally: null, julgou: false, raq: [null, null], corpos: [null, null], hist: [], tj: 0, batidas: 0, ultMsg: 0, ultEnvio: 0, bot: null, dif: "medio" };
const agora = () => (G.offline ? Date.now() + (G.adiant || 0) : relogio.agora()); // no treino, o relógio é o daqui (os testes adiantam)

// ======================================================================
// 3D: o ginásio, a mesa, a bola e as raquetes
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x10151c); scene.fog = new THREE.Fog(0x10151c, 12, 30);
const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 80);
configurarBonecos({ scene });
scene.add(new THREE.HemisphereLight(0xe8eef8, 0x3a2a1a, 1.1));
const luz = new THREE.SpotLight(0xfff4e0, 60, 14, 0.75, 0.45); luz.position.set(0, 6, 0); luz.target.position.set(0, 0, 0); luz.castShadow = true;
luz.shadow.mapSize.set(1024, 1024); luz.shadow.bias = -0.0005; scene.add(luz, luz.target);
function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener("resize", resize);

(function ginasio() {
  const add = (o) => (scene.add(o), o);
  // piso de taco, as placas azuis em volta da área de jogo e as paredes escuras
  const taco = canvasTex(256, 256, (x, w, hh, r) => { for (let j = 0; j < 8; j++) for (let i = 0; i < 2; i++) { x.fillStyle = `hsl(${28 + r() * 6},${45 + r() * 10}%,${36 + r() * 8}%)`; x.fillRect(i * 128 + (j % 2) * 64, j * 32, 128, 31); } }, true);
  taco.repeat.set(10, 10);
  const chao = add(new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: taco, roughness: 0.55 }))); chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true;
  const quadra = add(new THREE.Mesh(new THREE.PlaneGeometry(7, 12), M(0xa8452e, { roughness: 0.8 }))); quadra.rotation.x = -Math.PI / 2; quadra.position.y = 0.003; quadra.receiveShadow = true;
  const placa = canvasTex(256, 64, (x, w, hh) => { x.fillStyle = "#1d3f8c"; x.fillRect(0, 0, w, hh); x.fillStyle = "#fff"; x.font = "bold 28px Figtree, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("GALERA 🏓", w / 2, hh / 2); });
  const mPlaca = new THREE.MeshStandardMaterial({ map: placa });
  for (let i = -3; i <= 3; i++) for (const [x, z, ry] of [[i * 1.0, 6, 0], [i * 1.0, -6, Math.PI], [3.5, i * 1.7, -Math.PI / 2], [-3.5, i * 1.7, Math.PI / 2]]) {
    const p = add(new THREE.Mesh(new THREE.BoxGeometry(i === 0 && Math.abs(z) < 1 ? 0 : 0.98, 0.7, 0.03), mPlaca)); p.position.set(x, 0.35, z); p.rotation.y = ry;
  }
  for (const [x, z, ry] of [[0, -12, 0], [0, 12, Math.PI], [-12, 0, Math.PI / 2], [12, 0, -Math.PI / 2]]) { const w = add(new THREE.Mesh(new THREE.PlaneGeometry(24, 9), M(0x1b2430, { roughness: 0.9 }))); w.position.set(x, 4.5, z); w.rotation.y = ry; }
  // a mesa: tampo verde com as linhas brancas, pés e a rede com os postes
  const tampo = canvasTex(256, 460, (x, w, hh) => { x.fillStyle = "#1f5c48"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#f6f6f2"; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, hh - 6); x.lineWidth = 2; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, hh); x.stroke(); });
  const mesa = add(new THREE.Mesh(new THREE.BoxGeometry(MESA.W, 0.03, MESA.L), [M(0x173f32), M(0x173f32), new THREE.MeshStandardMaterial({ map: tampo, roughness: 0.45 }), M(0x173f32), M(0xf6f6f2), M(0xf6f6f2)]));
  mesa.position.y = MESA.H - 0.015; mesa.receiveShadow = mesa.castShadow = true;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const pe = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, MESA.H - 0.03, 0.05), M(0x22262c, { metalness: 0.5 }))); pe.position.set(sx * (MESA.W / 2 - 0.15), (MESA.H - 0.03) / 2, sz * (MESA.L / 2 - 0.3)); pe.castShadow = true; }
  const telaT = canvasTex(32, 32, (x, w) => { x.strokeStyle = "#e8e8e8"; x.lineWidth = 2; x.strokeRect(0, 0, w, w); }, true); telaT.repeat.set((MESA.W + 0.3) / 0.02, MESA.REDE / 0.02);
  const rede = add(new THREE.Mesh(new THREE.PlaneGeometry(MESA.W + 0.3, MESA.REDE), new THREE.MeshStandardMaterial({ map: telaT, alphaTest: 0.3, side: THREE.DoubleSide, color: 0x333333 })));
  rede.position.y = MESA.H + MESA.REDE / 2;
  const fita = add(new THREE.Mesh(new THREE.BoxGeometry(MESA.W + 0.3, 0.015, 0.008), M(0xf6f6f2))); fita.position.y = MESA.H + MESA.REDE;
  for (const s of [-1, 1]) { const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, MESA.REDE + 0.02, 0.03), M(0x22262c))); p.position.set(s * (MESA.W / 2 + 0.15), MESA.H + MESA.REDE / 2, 0); }
})();

const BOLA_R = 0.028; // um pouco maior que a de verdade (2 cm), para dar para ver
// a bola tem uma faixa branca, para dar para ver ela girando com o efeito
const bolaTex = canvasTex(64, 32, (x, w, hh) => { x.fillStyle = "#ff8a1f"; x.fillRect(0, 0, w, hh); x.fillStyle = "#fff3e0"; x.fillRect(0, hh * 0.42, w, hh * 0.16); x.fillRect(w * 0.47, 0, w * 0.06, hh); });
const bola = new THREE.Mesh(new THREE.SphereGeometry(BOLA_R, 16, 12), new THREE.MeshStandardMaterial({ map: bolaTex, roughness: 0.4, emissive: 0x3a1500 }));
bola.castShadow = true; scene.add(bola);
// rastro da bola com efeito: vermelho no top spin, azul na cortada, roxo no lateral (mais forte, mais visível)
const RASTRO = 14, rastroGeo = new THREE.BufferGeometry(); rastroGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(RASTRO * 3), 3));
const rastro = new THREE.Line(rastroGeo, new THREE.LineBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0, depthWrite: false })); rastro.frustumCulled = false; scene.add(rastro);
const pontosRastro = [];
const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.03, 14), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.4, depthWrite: false }));
sombra.rotation.x = -Math.PI / 2; scene.add(sombra);
// raquete: lâmina de madeira com borracha vermelha de um lado e preta do outro, e o cabo
function raquete() {
  const g = new THREE.Group(), lamina = new THREE.Group(); g.add(lamina);
  const disco = (cor, z) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.004, 24), M(cor, { roughness: 0.7 })); d.rotation.x = Math.PI / 2; d.position.z = z; d.castShadow = true; lamina.add(d); };
  disco(0xc62828, -0.004); disco(0x151515, 0.004);
  const madeira = new THREE.Mesh(new THREE.CylinderGeometry(0.081, 0.081, 0.005, 24), M(0xc89a5a)); madeira.rotation.x = Math.PI / 2; lamina.add(madeira);
  const cabo = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.022), M(0x8a5a2b)); cabo.position.y = -0.12; lamina.add(cabo);
  g.scale.setScalar(1.5); scene.add(g); return g;
}
const raqMesh = [raquete(), raquete()];
// o estado de cada raquete: posição na mesa (x, z), altura e o alvo que chega da rede
const novaRaq = (lado) => ({ x: 0, y: MESA.H + 0.18, z: P.S(lado) * (MESA.L / 2 + 0.35), vx: 0, vz: 0, alvo: null });

// ---------- bonecos (a skin de cada um) atrás da raquete ----------
function montarCorpos(lados) {
  for (const c of G.corpos) if (c) descartarJogador(c.model);
  G.corpos = lados.map((j, lado) => {
    if (!j || lado === G.eu) return null; // eu não me vejo (a câmera fica atrás de mim)
    const model = makePlayer(KIT[lado], 10, "", { skin: j.skin || "padrao" }); scene.add(model);
    for (const m of model.userData.marca || []) model.remove(m);
    model.rotation.y = lado ? Math.PI : 0; return { model, st: {}, x: 0 };
  });
}

// ======================================================================
// Sons (sintetizados)
// ======================================================================
const Som = (() => {
  let ac = null, vol = store.get("pingpong:vol") ?? 0.7, master = null;
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; };
  function tom(f0, f1, dur, ganho, tipo = "sine") { const c = ctx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02); }
  return {
    get vol() { return vol; }, setVol(v) { vol = v; store.set("pingpong:vol", v); if (master) master.gain.value = v; }, unlock: ctx,
    raquete() { tom(1400, 500, 0.05, 0.4, "triangle"); }, mesa() { tom(2100, 900, 0.035, 0.3, "triangle"); }, rede() { tom(300, 150, 0.08, 0.2, "square"); },
    ponto() { tom(660, 990, 0.18, 0.12); }, perdeu() { tom(330, 200, 0.25, 0.12, "sawtooth"); },
  };
})();

// ======================================================================
// Telas: inicial (treino e entrar) e sala de espera
// ======================================================================
function show(id) { for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id); $("game").classList.toggle("hidden", id !== "game"); $("bar").classList.toggle("hidden", id === "game"); }
const seg = (el, ops, atual, attr, dis = "") => ($(el).innerHTML = ops.map(([v, t]) => `<button ${attr}="${v}" class="${String(atual) === String(v) ? "on" : ""}" ${dis}>${t}</button>`).join(""));
const skinBotoes = (atual) => Object.entries(C.SKINS).map(([k, s]) => `<button data-skin="${k}" class="${k === (atual || "padrao") ? "on" : ""}"><i>${s.emoji}</i>${h(s.name)}</button>`).join("");
function telaInicial() { seg("hDif", DIFS, store.get("pingpong:dif") || "medio", "data-hdif"); $("hSkins").innerHTML = skinBotoes(store.get("galera:skin")); }
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.hdif) { store.set("pingpong:dif", b.dataset.hdif); telaInicial(); }
  else if (b.dataset.skin) { store.set("galera:skin", b.dataset.skin); if (ME && ME.id && S) act("skin", { skin: b.dataset.skin }); telaInicial(); if (S && S.phase === "lobby") renderLobby(); }
  else if (b.dataset.lado != null && S) act("lado", { lado: +b.dataset.lado });
  else if (b.dataset.cpontos && S) act("config", { config: { ...S.config, pontos: +b.dataset.cpontos } });
  else if (b.dataset.cgames && S) act("config", { config: { ...S.config, games: +b.dataset.cgames } });
});
const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
const jogador = (id) => S && S.players.find((p) => p.id === id);
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id, dis = isHost ? "" : "disabled";
  const linha = (p) => `<div class="pl ${ME && p.id === ME.id ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "👑 " : ""}${h(p.name)} <span>${(C.SKINS[p.skin] || {}).emoji || ""}</span></div>`;
  for (const l of [0, 1]) {
    const p = jogador(S.lados[l]);
    $("l" + l).innerHTML = p ? linha(p) : `<div class="pl muted" style="font-weight:500">vaga livre</div>`;
    document.querySelector(`[data-lado="${l}"]`).classList.toggle("hidden", !mine || !!p);
  }
  const fora = S.players.filter((p) => !S.lados.includes(p.id)); $("lN").innerHTML = fora.length ? fora.map(linha).join("") : "Ninguém.";
  document.querySelector('[data-lado="-1"]').classList.toggle("hidden", !mine || !S.lados.includes(mine.id));
  $("lSkins").innerHTML = skinBotoes(mine && mine.skin);
  seg("cPontos", [[11, "11 pontos"], [21, "21 pontos"]], S.config.pontos, "data-cpontos", dis);
  seg("cGames", [[1, "1 game"], [3, "3 games"]], S.config.games, "data-cgames", dis);
  $("startBox").innerHTML = isHost ? `<button class="primary" id="btnStart" style="width:100%">🏓 Começar</button>` : `<p class="muted">Esperando o organizador começar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}
$("btnPractice").onclick = () => comecarTreino();
$("btnPractice2").onclick = () => comecarTreino();

// ======================================================================
// Rede: entrar, criar, estado, batidas e raquetes
// ======================================================================
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("pingpong:" + r.code, ME);
  history.replaceState(null, "", "/pingpong/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, skin: store.get("galera:skin"), config: store.get("pingpong:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("pingpong:" + code) || {};
  socket.emit("join", { code, name, skin: store.get("galera:skin"), id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("btnInvite").onclick = async () => { const link = location.origin + "/pingpong/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado!"); } catch { prompt("Copie o convite:", link); } };
socket.on("connect", () => {
  relogio.sincronizar(socket);
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("pingpong:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
});
setInterval(() => socket.connected && relogio.sincronizar(socket, 2), 15000);
socket.on("state", (st) => {
  const antes = S; S = st;
  if (st.phase === "lobby") { if (G.active && !G.offline) pararJogo(); if (!G.active) { show("lobby"); renderLobby(); } return; }
  if (!G.active || G.offline || !antes || antes.phase === "lobby" || antes.lados.join() !== st.lados.join()) comecarOnline();
  G.est = st;
  if (st.ultimo && (!antes || !antes.ultimo || antes.ultimo.t !== st.ultimo.t)) aoPonto(st.ultimo);
  if (st.phase === "fim") mostrarFim(); else $("over").classList.add("hidden");
});
socket.on("bola", (d) => { if (G.active && !G.offline) receberBola(d); });
socket.on("raq", (d) => { if (G.active && !G.offline && d.lado !== G.eu && G.raq[d.lado]) G.raq[d.lado].alvo = d; });

// ======================================================================
// Começar e parar
// ======================================================================
function comecarTreino() {
  if (G.active) pararJogo();
  const dif = store.get("pingpong:dif") || "medio", skin = BOT_SKINS[Math.floor(Math.random() * BOT_SKINS.length)];
  Object.assign(G, { offline: true, eu: 0, lado: 0, dif, bot: { lado: 1, x: 0, z: -(MESA.L / 2 + 0.3), vx: 0, vz: 0, desvio: 0 } });
  G.nomes = [$("hName").value.trim() || "Você", "🤖 Robô"];
  G.est = { phase: "jogo", placar: P.novoPlacar({ pontos: 11, games: 1 }, Math.random() < 0.5 ? 0 : 1), prontoEm: agora() + 1500, ultimo: null };
  montarCorpos([{ skin: store.get("galera:skin") }, { skin }]);
  iniciar();
}
function comecarOnline() {
  if (G.active) pararJogo();
  const eu = ME && ME.id ? S.lados.indexOf(ME.id) : -1;
  Object.assign(G, { offline: false, eu, lado: eu >= 0 ? eu : 0, est: S, bot: null });
  G.nomes = S.lados.map((id) => (jogador(id) || {}).name || "?");
  montarCorpos(S.lados.map((id) => jogador(id) || null));
  iniciar();
}
function iniciar() {
  G.active = true; G.pausa = false; G.bola = null; G.rally = null; G.julgou = false; G.hist = [];
  G.raq = [novaRaq(0), novaRaq(1)];
  // a minha raquete fica meio transparente (ela está bem na frente da câmera)
  raqMesh.forEach((m, l) => m.traverse((o) => { if (o.material) { o.material.transparent = l === G.eu; o.material.opacity = l === G.eu ? 0.6 : 1; } }));
  show("game"); resize(); $("over").classList.add("hidden"); $("pause").classList.add("hidden");
  const s = P.S(G.lado); cam.position.set(0, MESA.H + 0.95, s * (MESA.L / 2 + 1.75)); cam.lookAt(0, MESA.H - 0.05, -s * 0.35);
  Som.unlock(); last = performance.now();
}
function pararJogo() { G.active = false; for (const c of G.corpos) if (c) descartarJogador(c.model); G.corpos = [null, null]; }
function sair() {
  pararJogo();
  if (G.offline || !S) { show("home"); telaInicial(); return; }
  show("lobby"); renderLobby();
}

// ======================================================================
// A bola: saque, batida, voo e o juiz
// ======================================================================
const estado = () => G.est || {};
const sacador = () => (estado().placar ? estado().placar.sacador : 0);
const podeSacar = (lado) => estado().phase === "jogo" && !G.rally && sacador() === lado && agora() >= (estado().prontoEm || 0);
function novaBatida(b, quem, saque) {
  G.bola = b; G.rally = { quem, saque, quiques: [] }; G.julgou = false; Som.raquete(); pontosRastro.length = 0;
  const nome = P.nomeEfeito(b.w); // o nome do efeito aparece embaixo, rapidinho
  if (nome) { const e = $("hEfeito"); e.textContent = "🌀 " + nome; e.classList.remove("pop"); void e.offsetWidth; e.classList.add("pop"); G.efeitoAte = performance.now() + 900; }
}
// eu bato (ou saco): calcula aqui e manda para o outro
function euBato(b, saque) {
  novaBatida(b, G.eu, saque); if (!saque) G.batidas++;
  if (!G.offline) socket.emit("bola", { p: b.p, v: b.v, saque, t: agora(), w: b.w || null });
}
function receberBola(d) {
  const b = { p: d.p.slice(), v: d.v.slice(), viva: true, w: d.w ? d.w.slice() : null };
  novaBatida(b, d.quem, d.saque);
  voarJulgando(Math.max(0, Math.min(0.5, (agora() - d.t) / 1000))); // a bola já andou o tempo que o pacote levou
}
// anda a bola e passa os eventos pelo juiz; quem julga é quem recebe (no treino, sempre aqui)
function voarJulgando(dt) {
  const b = G.bola; if (!b || !b.viva) return;
  for (const e of P.voar(b, dt)) {
    if (e.tipo === "quique") Som.mesa(); else if (e.tipo === "rede") Som.rede();
    if (!G.rally || G.julgou) continue;
    const r = P.julgar(G.rally, e);
    if (r) {
      G.julgou = true;
      const juiz = G.offline || G.eu === 1 - G.rally.quem;
      if (juiz) marcarPonto(r.vence, r.motivo);
    }
  }
}
function marcarPonto(vence, motivo) {
  if (!G.offline) return socket.emit("ponto", { vence, motivo });
  const est = G.est, r = P.marcar(est.placar, vence);
  G.rally = null;
  est.ultimo = { lado: vence, motivo, nome: G.nomes[vence], t: agora() };
  est.prontoEm = agora() + (r.fimGame ? 2600 : 1300);
  if (r.fim) est.phase = "fim";
  aoPonto(est.ultimo);
  if (r.fim) mostrarFim();
}
function aoPonto(u) {
  G.rally = null;
  const meu = u.lado === G.eu;
  if (G.eu >= 0) (meu ? Som.ponto : Som.perdeu)();
  msg(meu ? "Ponto seu!" : G.eu >= 0 ? "Ponto do outro lado" : `Ponto de ${h(u.nome)}`, u.motivo || "");
}
function msg(t, sub = "", ms = 1300) { const m = $("hMsg"); m.innerHTML = `${t}${sub ? `<small>${h(sub)}</small>` : ""}`; m.classList.remove("pop"); void m.offsetWidth; m.classList.add("pop"); G.ultMsg = performance.now() + ms; }
function mostrarFim() {
  const pl = estado().placar; if (!pl || pl.vencedor == null) return;
  const ganhei = pl.vencedor === G.eu, nome = G.nomes[pl.vencedor] || "?";
  if (ganhei) Comum.confetti();
  const isHost = !G.offline && ME && S && S.host === ME.id;
  $("overBox").innerHTML = `<h2>${ganhei ? "🏆 Você venceu!" : `🏓 ${h(nome)} venceu`}</h2>
    <p class="muted">Placar: ${pl.games[0] > 0 || pl.games[1] > 0 ? `games ${pl.games[0]} x ${pl.games[1]}` : `${pl.pts[0]} x ${pl.pts[1]}`}</p>
    <div class="row" style="margin-top:14px">${G.offline ? `<button class="primary" id="bDeNovo">Jogar de novo</button>` : isHost ? `<button class="primary" id="bDeNovo">Voltar para a sala</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" id="bSair">Sair</button></div>`;
  $("over").classList.remove("hidden");
  $("bSair").onclick = () => { $("over").classList.add("hidden"); if (!G.offline && S) act("lado", { lado: -1 }); sair(); };
  if ($("bDeNovo")) $("bDeNovo").onclick = () => { $("over").classList.add("hidden"); if (G.offline) comecarTreino(); else act("lobby"); };
}

// ======================================================================
// Controles: o mouse (ou o dedo) leva a raquete; clique saca
// ======================================================================
const ray = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(MESA.H + 0.18)), ponto = new THREE.Vector3(), ndc = new THREE.Vector2(0, -0.3);
$("game").addEventListener("pointermove", (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });
$("game").addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, .overlay")) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (!G.active || G.pausa || G.eu < 0 || !podeSacar(G.eu)) return;
  const r = G.raq[G.eu], ax = clamp(r.vx / 2.5, -1, 1);
  euBato(P.sacar(G.eu, r.x, ax), true);
});
addEventListener("keydown", (e) => { if (e.key === "Escape" && G.active) pausar(!G.pausa); });
$("hSair").onclick = () => pausar(true);
$("btnResume").onclick = () => pausar(false);
$("btnLeave").onclick = () => { pausar(false); if (!G.offline && S) act("lado", { lado: -1 }); sair(); };
$("vol").value = Som.vol; $("volV").textContent = Math.round(Som.vol * 100) + "%";
$("vol").oninput = (e) => { Som.setVol(+e.target.value); $("volV").textContent = Math.round(Som.vol * 100) + "%"; };
function pausar(on) { G.pausa = on && G.offline; $("pause").classList.toggle("hidden", !on); } // online o jogo não para: só abre o menu

// a minha raquete: onde o mouse aponta, presa ao meu lado da mesa; a altura acompanha a bola quando ela vem
function moverMinhaRaq(dt) {
  const r = G.raq[G.eu], s = P.S(G.eu);
  ray.setFromCamera(ndc, cam);
  if (ray.ray.intersectPlane(plano, ponto)) { r.x = clamp(ponto.x, -1.4, 1.4); r.z = s * clamp(s * ponto.z, MESA.L / 2 - 0.1, MESA.L / 2 + 1.1); }
  const b = G.bola, vem = b && b.viva && G.rally && G.rally.quem !== G.eu && Math.abs(b.p[2] - r.z) < 1.2;
  r.y = lerp(r.y, vem ? clamp(b.p[1], MESA.H + 0.03, MESA.H + 0.7) : MESA.H + 0.18, 1 - Math.exp(-dt * 14));
  // velocidade: média dos últimos ~80 ms
  const t = G.tj * 1000; G.hist.push({ t, x: r.x, z: r.z }); while (G.hist.length > 2 && t - G.hist[0].t > 80) G.hist.shift();
  const h0 = G.hist[0], d = Math.max(0.016, (t - h0.t) / 1000); r.vx = (r.x - h0.x) / d; r.vz = (r.z - h0.z) / d;
}
// a bola passou pela minha raquete (do jeito certo)? então eu rebato
function tentarRebater(lado, raq, bAntes, rAntesZ, batida) {
  const b = G.bola, s = P.S(lado);
  if (!b || !b.viva || !P.podeRebater(G.rally, lado)) return false;
  const antes = (bAntes - rAntesZ) * s, depois = (b.p[2] - raq.z) * s;
  if (!(antes < 0.02 && depois >= -0.02) || Math.abs(b.p[0] - raq.x) > 0.3 || b.p[1] > MESA.H + 0.8) return false;
  b.p[2] = raq.z - s * 0.01;
  P.rebater(b, batida || raq, lado);
  return true;
}

// ======================================================================
// Laço do jogo
// ======================================================================
let last = performance.now();
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (!G.active) return;
  if (!G.pausa) passo(dt);
  desenhar(dt);
  renderer.render(scene, cam);
}
requestAnimationFrame(loop);

function passo(dt) {
  G.tj += dt; // relógio do jogo (a velocidade da raquete é medida nele)
  const b = G.bola, bz = b ? b.p[2] : 0, rz = [G.raq[0].z, G.raq[1].z];
  if (G.eu >= 0) moverMinhaRaq(dt);
  if (G.bot) {
    P.robo(G.bot, b, G.rally, dt, G.dif);
    Object.assign(G.raq[1], { x: G.bot.x, z: G.bot.z, vx: G.bot.vx });
    G.raq[1].y = lerp(G.raq[1].y, b && G.rally && G.rally.quem === 0 ? clamp(b.p[1], MESA.H + 0.03, MESA.H + 0.7) : MESA.H + 0.18, 1 - Math.exp(-dt * 10));
    if (podeSacar(1) && agora() > estado().prontoEm + 700) novaBatida(P.sacar(1, G.bot.x, (Math.random() - 0.5) * 1.6), 1, true);
  }
  // a raquete do outro (online): vai até onde ele mandou
  for (const l of [0, 1]) { const r = G.raq[l]; if (l !== G.eu && r.alvo) { const k = 1 - Math.exp(-dt * 18); r.x = lerp(r.x, r.alvo.x, k); r.y = lerp(r.y, r.alvo.y, k); r.z = lerp(r.z, r.alvo.z, k); } }
  if (b && b.viva) {
    voarJulgando(dt);
    if (G.eu >= 0 && G.rally && tentarRebater(G.eu, G.raq[G.eu], bz, rz[G.eu])) euBato(G.bola, false);
    else if (G.bot && G.rally && tentarRebater(1, G.raq[1], bz, rz[1], P.batidaRobo(G.bot, G.bola, G.dif))) novaBatida(G.bola, 1, false);
  }
  // mando a minha raquete ~30 vezes por segundo
  if (!G.offline && G.eu >= 0 && agora() - G.ultEnvio > 33) { G.ultEnvio = agora(); const r = G.raq[G.eu]; socket.volatile.emit("raq", { x: +r.x.toFixed(3), y: +r.y.toFixed(3), z: +r.z.toFixed(3) }); }
}

const _v = new THREE.Vector3();
function desenhar(dt) {
  const est = estado(), b = G.bola;
  // bola: voando, ou parada na mão de quem vai sacar
  if (b && (b.viva || G.rally)) bola.position.set(b.p[0], b.p[1], b.p[2]);
  // o efeito: a bola gira (top spin para a frente, cortada para trás, lateral de lado) e deixa o rastro colorido
  const w = b && b.viva && b.w, sz = b ? Math.sign(b.v[2]) || 1 : 1;
  if (w) { bola.rotation.x -= sz * w[1] * dt * 45; bola.rotation.y += w[0] * dt * 45; }
  if (b && b.viva) { pontosRastro.unshift(bola.position.clone()); if (pontosRastro.length > RASTRO) pontosRastro.pop(); }
  const forca = w ? Math.max(Math.abs(w[0]), Math.abs(w[1])) : 0, pos = rastroGeo.attributes.position;
  for (let i = 0; i < RASTRO; i++) { const q = pontosRastro[Math.min(i, pontosRastro.length - 1)] || bola.position; pos.setXYZ(i, q.x, q.y, q.z); }
  pos.needsUpdate = true;
  rastro.material.opacity = forca > 0.3 ? Math.min(0.8, forca) : 0;
  if (w) rastro.material.color.set(w[1] > 0.3 ? 0xff3a2a : w[1] < -0.3 ? 0x3aa0ff : 0xb05aff);
  if (performance.now() > (G.efeitoAte || 0)) $("hEfeito").textContent = "";
  else if (est.phase === "jogo" && !G.rally) { const l = sacador(), r = G.raq[l]; bola.position.set(clamp(r.x, -0.6, 0.6) * 0.7, MESA.H + 0.25 + Math.abs(Math.sin(performance.now() / 300)) * 0.08, P.S(l) * (MESA.L / 2 + 0.15)); }
  const naMesa = Math.abs(bola.position.x) <= MESA.W / 2 && Math.abs(bola.position.z) <= MESA.L / 2;
  sombra.position.set(bola.position.x, naMesa ? MESA.H + 0.002 : 0.004, bola.position.z);
  sombra.scale.setScalar(1 + Math.max(0, bola.position.y - (naMesa ? MESA.H : 0)) * 1.5);
  // raquetes (viradas para a rede, inclinadas com o movimento) e os bonecos atrás delas
  for (const l of [0, 1]) {
    const r = G.raq[l], m = raqMesh[l], s = P.S(l), tem = G.offline || (est.lados && est.lados[l]);
    m.visible = !!tem; if (!tem) continue;
    m.position.set(r.x, r.y, r.z); m.rotation.set(-0.25 * s, l ? Math.PI : 0, clamp(-r.vx * 0.08, -0.6, 0.6));
    const c = G.corpos[l];
    if (c) {
      const x0 = c.model.position.x, alvoX = r.x - s * 0.32; c.model.position.set(alvoX, 0, r.z + s * 0.38);
      animate(c.model, Math.abs(alvoX - x0) / Math.max(dt, 1e-3), dt, c.st);
      const u = c.model.userData; if (u.arms) { u.arms[1].rotation.x = 1.1; u.elbows[1].rotation.x = 0.6; }
    }
  }
  // placar e dicas
  const pl = est.placar, nomes = G.nomes || ["?", "?"];
  if (pl) {
    const lado = (l) => `<div class="t"><i style="background:${COR[l]}"></i>${h(nomes[l])}${pl.sacador === l ? " <b>🏓</b>" : ""}</div>`;
    const games = pl.config.games > 1 ? `<div class="s">${pl.games[0]} – ${pl.games[1]}</div>` : "";
    $("hTop").innerHTML = `${lado(0)}<div class="g">${pl.pts[0]}</div>${games}<div class="g">${pl.pts[1]}</div>${lado(1)}`;
  }
  let dica = "";
  if (est.phase === "jogo" && !G.rally && agora() >= (est.prontoEm || 0)) dica = sacador() === G.eu ? "Clique para sacar (mexa o mouse para o lado para mirar)" : `Saque de ${h(nomes[sacador()])}`;
  $("hHint").innerHTML = dica;
  if (performance.now() > G.ultMsg) $("hMsg").innerHTML = "";
}

telaInicial();
// para os testes automáticos (#debug): o estado do jogo
if (location.hash === "#debug") window.__pingpong = {
  G, P, podeSacar, avancar: (s) => { for (let t = 0; t < s; t += 1 / 60) { passo(1 / 60); G.adiant = (G.adiant || 0) + 1000 / 60; } },
  // onde o mouse tem que estar para a raquete ficar no ponto (x, z) da mesa
  tela: (x, z) => { const v = new THREE.Vector3(x, MESA.H + 0.18, z).project(cam); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; },
};
