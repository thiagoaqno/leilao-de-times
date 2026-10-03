// Tênis da Galera — o jogo no navegador: telas, quadra em 3D (Three.js), jogadores (os bonecos e skins da Pelada),
// controles, sons e rede. As regras (bola, golpes, placar e robôs) ficam em regras.js (window.Tenis), as mesmas do
// servidor. No treino contra robôs a partida roda inteira aqui; online, eu mexo o meu jogador e mando a posição e a
// mira, e o servidor manda a bola e todo mundo 20 vezes por segundo (desenhados 100 ms "no passado").
import * as THREE from "three";
import { makePlayer, animate, descartarJogador, configurarBonecos } from "/pelada/bonecos.js";
import { canvasTex, M, rng } from "/pelada/tex.js";

const T = window.Tenis, C = window.Campo, Q = T.Q, { $, h, store } = Comum;
const toast = Comum.criarToast(3000), socket = io("/tenis"), relogio = Comum.relogio(), act = Comum.criarAct(socket, toast);
const KIT = { A: "celeste", B: "laranja" }, COR = { A: "#2f80ed", B: "#f07c1c" }, NOME = { A: "Azul", B: "Laranja" };
const BOT_NOMES = ["Robozão", "Tchuco", "Parafuso"], BOT_SKINS = ["steve", "pikachu", "shrek", "naruto", "woody", "aranha"];
const INTERP = 100;
const agoraTreino = () => Date.now() + (G.adiant || 0); // no treino, o relógio é o daqui (os testes podem adiantar)
let S = null, ME = null, urlCode = new URLSearchParams(location.search).get("sala");
const G = { active: false, offline: false, m: null, me: null, buf: [], corpos: new Map(), camPos: new THREE.Vector3(0, 6, 20), pausa: false, lastSend: 0, msgAte: 0, ultBatida: {} };

// ======================================================================
// 3D: renderizador, cena, luz e céu
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xbcd6ea, 70, 220);
const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
configurarBonecos({ scene, limites: () => ({ L: Q.FX, W: Q.FZ, goalD: 0 }) });
scene.add(new THREE.HemisphereLight(0xdcecff, 0x3a5a3a, 1.35));
const sol = new THREE.DirectionalLight(0xfff2dc, 2.4); sol.position.set(-14, 30, 10); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.03;
Object.assign(sol.shadow.camera, { left: -22, right: 22, top: 26, bottom: -26, near: 1, far: 90 }); scene.add(sol, sol.target);
{ // céu: degradê azul
  const g = new THREE.SphereGeometry(400, 32, 16), col = [], pos = g.attributes.position, top = new THREE.Color(0x2f6fbf), low = new THREE.Color(0xd8ecff);
  for (let i = 0; i < pos.count; i++) { const y = Math.max(0, pos.getY(i) / 400); const c = low.clone().lerp(top, Math.min(1, y * 2)); col.push(c.r, c.g, c.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener("resize", resize);

// ---------- a quadra ----------
(function quadra() {
  const add = (o) => (scene.add(o), o);
  const grama = add(new THREE.Mesh(new THREE.PlaneGeometry(160, 160), M(0x2f7a4f, { roughness: 1 }))); grama.rotation.x = -Math.PI / 2; grama.position.y = -0.02; grama.receiveShadow = true;
  // piso: área em volta (azul escuro) e a quadra (azul), com as linhas de giz desenhadas num canvas
  const AW = Q.FX + 1, AL = Q.FZ + 1, PX = 40;
  const piso = canvasTex(Math.round(2 * AW * PX), Math.round(2 * AL * PX), (x, w, hh, r) => {
    x.fillStyle = "#24547f"; x.fillRect(0, 0, w, hh);
    const X = (v) => (v + AW) * PX, Z = (v) => (v + AL) * PX;
    x.fillStyle = "#3474ad"; x.fillRect(X(-Q.WD - 1.2), Z(-Q.L - 2.5), (2 * Q.WD + 2.4) * PX, (2 * Q.L + 5) * PX);
    for (let i = 0; i < w * hh / 60; i++) { x.fillStyle = r() < 0.5 ? "#00000010" : "#ffffff0c"; x.fillRect(r() * w, r() * hh, 2, 2); }
    x.strokeStyle = "#f4f7fa"; x.lineWidth = 0.06 * PX;
    const linha = (x0, z0, x1, z1) => { x.beginPath(); x.moveTo(X(x0), Z(z0)); x.lineTo(X(x1), Z(z1)); x.stroke(); };
    for (const s of [-1, 1]) {
      linha(-Q.WD, s * Q.L, Q.WD, s * Q.L);                     // linha de fundo
      linha(s * Q.WD, -Q.L, s * Q.WD, Q.L); linha(s * Q.WS, -Q.L, s * Q.WS, Q.L); // laterais (duplas e simples)
      linha(-Q.WS, s * Q.SERV, Q.WS, s * Q.SERV);               // linha de saque
      linha(0, s * Q.L, 0, s * (Q.L - 0.15));                   // marca do meio
    }
    linha(0, -Q.SERV, 0, Q.SERV);                               // linha central de saque
  });
  const chao = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * AW, 2 * AL), new THREE.MeshStandardMaterial({ map: piso, roughness: 0.8 })));
  chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true;
  // rede: tela, faixa branca em cima, postes e a cinta do meio
  const largura = 2 * (Q.WD + 0.9);
  const tela = canvasTex(64, 64, (x, w) => { x.strokeStyle = "#1c1c1c"; x.lineWidth = 3; x.strokeRect(0, 0, w, w); }, true); tela.repeat.set(largura / 0.08, Q.REDE / 0.08);
  const rede = add(new THREE.Mesh(new THREE.PlaneGeometry(largura, Q.REDE), new THREE.MeshStandardMaterial({ map: tela, alphaTest: 0.3, side: THREE.DoubleSide, color: 0x222222 })));
  rede.position.y = Q.REDE / 2; rede.castShadow = true;
  const fita = add(new THREE.Mesh(new THREE.BoxGeometry(largura, 0.07, 0.03), M(0xf4f4f4))); fita.position.y = Q.REDE;
  const cinta = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, Q.REDE, 0.03), M(0xf4f4f4))); cinta.position.y = Q.REDE / 2;
  for (const s of [-1, 1]) { const p = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, Q.REDE_POSTE, 10), M(0x2a3a2a, { metalness: 0.5 }))); p.position.set(s * (largura / 2), Q.REDE_POSTE / 2, 0); p.castShadow = true; }
  // alambrado verde em volta (com propaganda) e a arquibancada de um lado
  const lona = canvasTex(1024, 64, (x, w, hh) => { x.fillStyle = "#1f5a3a"; x.fillRect(0, 0, w, hh); x.fillStyle = "#d7f23c"; x.font = "bold 34px Figtree, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; for (let i = 0; i < 2; i++) x.fillText("TÊNIS DA GALERA 🎾", w / 4 + i * w / 2, hh / 2 + 2); }, true);
  const muro = (len, x0, z0, rot) => { const t = lona.clone(); t.repeat.set(len / 16, 1); t.needsUpdate = true; const m = add(new THREE.Mesh(new THREE.BoxGeometry(len, 1.6, 0.1), [M(0x1f5a3a), M(0x1f5a3a), M(0x1f5a3a), M(0x1f5a3a), new THREE.MeshStandardMaterial({ map: t }), new THREE.MeshStandardMaterial({ map: t })])); m.position.set(x0, 0.8, z0); m.rotation.y = rot; };
  muro(2 * AW, 0, -AL, 0); muro(2 * AW, 0, AL, 0); muro(2 * AL, -AW, 0, Math.PI / 2); muro(2 * AL, AW, 0, Math.PI / 2);
  const r = rng(11), torcida = canvasTex(512, 64, (x, w, hh, rr) => { x.fillStyle = "#6d6f72"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 260; i++) { const cx = rr() * w, cy = 18 + rr() * 34; x.fillStyle = ["#c62828", "#1565c0", "#f9a825", "#2e7d32", "#fafafa", "#212121"][Math.floor(rr() * 6)]; x.fillRect(cx - 4, cy, 8, 14); x.fillStyle = ["#f1c27d", "#c68642", "#8d5524", "#e0ac69"][Math.floor(rr() * 4)]; x.beginPath(); x.arc(cx, cy - 3, 4, 0, 7); x.fill(); } }, true);
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
    const t = torcida.clone(); t.repeat.set(3, 1); t.offset.x = r(); t.needsUpdate = true;
    const d = add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 2 * AL + 6), [s < 0 ? new THREE.MeshStandardMaterial({ map: t }) : M(0x777a7e), s < 0 ? M(0x777a7e) : new THREE.MeshStandardMaterial({ map: t }), M(0x8a8d90), M(0x777a7e), M(0x777a7e), M(0x777a7e)]));
    d.position.set(s * (AW + 1.5 + i), 0.55 + i * 0.5, 0); d.castShadow = d.receiveShadow = true;
  }
  // cadeira do juiz
  const cad = add(new THREE.Group()); cad.position.set(largura / 2 + 1, 0, 0);
  for (const [w, hh, d, y] of [[0.1, 2, 0.1, 1], [0.7, 0.1, 0.7, 2], [0.7, 0.6, 0.1, 2.35]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), M(0x1f5a3a)); m.position.y = y; cad.add(m); }
})();

// ---------- bola, sombra e marca de onde ela vai quicar ----------
const bolaTex = canvasTex(128, 64, (x, w, hh) => { x.fillStyle = "#d7f23c"; x.fillRect(0, 0, w, hh); x.strokeStyle = "#f6f9e8"; x.lineWidth = 4; x.beginPath(); for (let i = 0; i <= w; i += 2) { const y = hh / 2 + Math.sin((i / w) * Math.PI * 4) * hh * 0.3; i ? x.lineTo(i, y) : x.moveTo(i, y); } x.stroke(); });
const bola = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ map: bolaTex, roughness: 0.7, emissive: 0x2a3300 }));
bola.castShadow = true; scene.add(bola);
const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
sombra.rotation.x = -Math.PI / 2; scene.add(sombra);
// mira: com o golpe armado, uma marca branca no chão do outro lado mostra para onde a bola vai (sem o erro)
const mira3d = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }));
mira3d.rotation.x = -Math.PI / 2; mira3d.visible = false; scene.add(mira3d);
const marca = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 28), new THREE.MeshBasicMaterial({ color: 0xd7f23c, transparent: true, opacity: 0.7, depthWrite: false }));
marca.rotation.x = -Math.PI / 2; marca.visible = false; scene.add(marca);

// ---------- jogadores: os bonecos da Pelada com uma raquete na mão direita ----------
function raquete() {
  const g = new THREE.Group(), cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.3, 8), M(0x222222)); cabo.position.y = -0.15; g.add(cabo);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 8, 24), M(0xe8e8e8, { metalness: 0.4, roughness: 0.3 })); aro.position.y = -0.43; g.add(aro);
  const cordas = new THREE.Mesh(new THREE.CircleGeometry(0.125, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); cordas.position.y = -0.43; g.add(cordas);
  return g;
}
function criarCorpo(j) {
  const model = makePlayer(KIT[j.team], j.slot ? 7 : 10, j.nome || "", { skin: j.skin });
  const u = model.userData, mao = u.elbows && u.elbows[1];
  const rq = raquete(); if (mao) { rq.position.y = -0.3; rq.rotation.x = 0.9; mao.add(rq); } else { rq.position.set(0.35, 1.0, -0.1); model.add(rq); }
  scene.add(model);
  return { id: j.id, team: j.team, model, st: {}, x: j.x || 0, z: j.z || 0, vx: 0, vz: 0, yaw: j.team === "A" ? 0 : Math.PI, giroT: -9 };
}
function limparCorpos() { for (const c of G.corpos.values()) descartarJogador(c.model); G.corpos.clear(); }
function montarCorpos(lista) { limparCorpos(); for (const j of lista) G.corpos.set(j.id, criarCorpo(j)); }

// ======================================================================
// Sons (sintetizados)
// ======================================================================
const Som = (() => {
  let ac = null, vol = store.get("tenis:vol") ?? 0.7, master = null;
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; };
  function tom(f0, f1, dur, ganho, tipo = "sine") { const c = ctx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02); }
  function ruido(dur, ganho, freq) { const c = ctx(); if (!c) return; const n = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = n; f.type = "bandpass"; f.frequency.value = freq; g.gain.value = ganho; s.connect(f).connect(g).connect(master); s.start(); }
  return {
    get vol() { return vol; }, setVol(v) { vol = v; store.set("tenis:vol", v); if (master) master.gain.value = v; }, unlock: ctx,
    batida(forca = 0.5) { tom(520 + forca * 260, 180, 0.07, 0.35 + forca * 0.25, "triangle"); ruido(0.05, 0.4, 2400); },
    quique() { tom(300, 120, 0.06, 0.25, "triangle"); },
    rede() { ruido(0.2, 0.5, 600); },
    lanca() { tom(400, 700, 0.12, 0.08); },
    apito() { tom(2100, 2050, 0.25, 0.12, "square"); },
    torcida() { ruido(1.2, 0.35, 900); },
    ooh() { tom(300, 180, 0.5, 0.15, "sawtooth"); },
  };
})();
$("vol").value = Som.vol; $("volV").textContent = Math.round(Som.vol * 100) + "%";
$("vol").oninput = (e) => { Som.setVol(+e.target.value); $("volV").textContent = Math.round(Som.vol * 100) + "%"; };

// ======================================================================
// Telas: inicial (treino e entrar), sala de espera
// ======================================================================
function show(id) { for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id); $("game").classList.toggle("hidden", id !== "game"); $("bar").classList.toggle("hidden", id === "game"); }
const seg = (el, ops, atual, attr, dis = "") => ($(el).innerHTML = ops.map(([v, t]) => `<button ${attr}="${v}" class="${String(atual) === String(v) ? "on" : ""}" ${dis}>${t}</button>`).join(""));
const skinBotoes = (atual) => Object.entries(C.SKINS).map(([k, s]) => `<button data-skin="${k}" class="${k === (atual || "padrao") ? "on" : ""}"><i>${s.emoji}</i>${h(s.name)}</button>`).join("");
const MODOS = [["0", "🎾 Simples (1x1)"], ["1", "👥 Duplas (2x2)"]], GAMES = [[2, "2 games"], [3, "3 games"], [4, "4 games"], [6, "6 games"]], DIFS = Object.entries(T.DIF).map(([k, d]) => [k, d.nome]);
function telaInicial() {
  const t = store.get("tenis:treino") || {};
  seg("hModo", MODOS, t.duplas ? "1" : "0", "data-hmodo"); seg("hDif", DIFS, t.dif || "medio", "data-hdif"); seg("hGames", GAMES, t.games || 3, "data-hgames");
  $("hSkins").innerHTML = skinBotoes(store.get("tenis:skin"));
}
function teclasAjuda() {
  return `<ul class="keys"><li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> correr (e mirar na hora da batida: lado e curta/funda)</li>
    <li><kbd>J</kbd> ou clique: top spin · <kbd>K</kbd> ou botão direito: cortada · <kbd>L</kbd> balão · <kbd>U</kbd> curtinha</li>
    <li>Aperte <b>antes</b> da bola chegar: o jogador bate sozinho. Quanto antes, mais forte (e mais devagar ele anda)</li>
    <li>Bola alta perto de você: vira <b>smash</b> sozinho</li>
    <li>Saque: aperte uma vez para jogar a bola para cima e de novo lá no alto (mais alto, mais forte)</li>
    <li><kbd>Esc</kbd> menu</li></ul>
    <p class="muted" style="font-size:13px;margin:8px 0 0">🎮 Controle: analógico corre e mira · A top spin · B cortada · Y balão · X curtinha · Start pausa.</p>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const t = store.get("tenis:treino") || {};
  if (b.dataset.hmodo) { t.duplas = b.dataset.hmodo === "1"; store.set("tenis:treino", t); telaInicial(); }
  else if (b.dataset.hdif) { t.dif = b.dataset.hdif; store.set("tenis:treino", t); telaInicial(); }
  else if (b.dataset.hgames) { t.games = +b.dataset.hgames; store.set("tenis:treino", t); telaInicial(); }
  else if (b.dataset.skin) { store.set("tenis:skin", b.dataset.skin); if (ME && ME.id && S) act("skin", { skin: b.dataset.skin }); telaInicial(); if (S) renderLobby(); }
  else if (b.dataset.cmodo && S) setCfg({ duplas: b.dataset.cmodo === "1" });
  else if (b.dataset.cgames && S) setCfg({ games: +b.dataset.cgames });
  else if (b.dataset.cdif && S) setCfg({ dif: b.dataset.cdif });
  else if (b.dataset.cbots && S) setCfg({ bots: b.dataset.cbots === "1" });
  else if (b.dataset.kick) act("kick", { id: b.dataset.kick });
});
function setCfg(c) { const cfg = { ...S.config, ...c }; store.set("tenis:cfg", cfg); act("config", { config: cfg }); }
const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id, n = S.config.duplas ? 2 : 1, dis = isHost ? "" : "disabled";
  const linha = (p) => `<div class="pl ${ME && p.id === ME.id ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "👑 " : ""}${h(p.name)} <span>${(C.SKINS[p.skin] || {}).emoji || ""}</span>${isHost && p.id !== ME.id ? `<button class="small ghost" data-kick="${p.id}" style="margin-left:auto">✕</button>` : ""}</div>`;
  for (const t of ["A", "B"]) {
    const lista = S.players.filter((p) => p.team === t), vagas = Math.max(0, n - lista.length);
    $("t" + t).innerHTML = lista.map(linha).join("") + Array.from({ length: vagas }, () => `<div class="pl muted" style="font-weight:500">${S.config.bots ? "🤖 robô (vaga livre)" : "vaga livre"}</div>`).join("");
    $("join" + t).classList.toggle("hidden", !mine || mine.team === t || lista.length >= n);
  }
  const fora = S.players.filter((p) => !p.team); $("tN").innerHTML = fora.length ? fora.map(linha).join("") : "Ninguém.";
  $("joinBench").classList.toggle("hidden", !mine || !mine.team);
  $("lSkins").innerHTML = skinBotoes(mine && mine.skin);
  seg("cModo", MODOS, S.config.duplas ? "1" : "0", "data-cmodo", dis); seg("cGames", GAMES, S.config.games, "data-cgames", dis);
  seg("cBots", [["1", "🤖 Completar com robôs"], ["0", "👥 Só gente"]], S.config.bots ? "1" : "0", "data-cbots", dis); seg("cDif", DIFS, S.config.dif, "data-cdif", dis);
  $("keysBox").innerHTML = teclasAjuda();
  $("startBox").innerHTML = isHost ? `<button class="primary" id="btnStart" style="width:100%">🎾 Começar</button>` : `<p class="muted">Esperando o organizador começar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}
$("joinA").onclick = () => act("team", { team: "A" });
$("joinB").onclick = () => act("team", { team: "B" });
$("joinBench").onclick = () => act("team", { team: null });
$("btnPractice").onclick = () => comecarTreino();
$("btnPractice2").onclick = () => comecarTreino();
$("pauseKeys").innerHTML = teclasAjuda();

// ======================================================================
// Rede: entrar, criar, estado e pacotes
// ======================================================================
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
if (window.Toque && Toque.isTouch()) $("mobileWarn").classList.remove("hidden");
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("tenis:" + r.code, ME);
  history.replaceState(null, "", "/tenis/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, skin: store.get("tenis:skin"), config: store.get("tenis:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("tenis:" + code) || {};
  socket.emit("join", { code, name, skin: store.get("tenis:skin"), id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("btnInvite").onclick = async () => { const link = location.origin + "/tenis/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado!"); } catch { prompt("Copie o convite:", link); } };
socket.on("connect", () => {
  relogio.sincronizar(socket);
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("tenis:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
});
setInterval(() => socket.connected && relogio.sincronizar(socket, 2), 15000);
socket.on("png", (ack) => typeof ack === "function" && ack());
socket.on("removido", () => { toast("O organizador tirou você da sala."); ME = null; S = null; history.replaceState(null, "", "/tenis/"); $("roomTag").classList.add("hidden"); pararJogo(); show("home"); });
socket.on("state", (st) => {
  S = st;
  if (st.phase === "lobby") { if (G.active && !G.offline) pararJogo(); if (!G.active) { show("lobby"); renderLobby(); } return; }
  if (!G.active || G.offline || G.matchKey !== st.match.jogadores.map((j) => j.id).join()) comecarOnline();
  if (st.phase === "over") mostrarFim(st.match.vencedor);
  else $("over").classList.add("hidden");
});
socket.on("snap", (d) => { if (!G.active || G.offline) return; G.buf.push(d); if (G.buf.length > 40) G.buf.shift(); G.fase = d.f; });
socket.on("ev", (lista) => { if (G.active && !G.offline) for (const e of lista) aoEvento(e); });

// ======================================================================
// Começar e parar
// ======================================================================
function comecarTreino() {
  if (G.active) pararJogo();
  const t = store.get("tenis:treino") || {}, n = t.duplas ? 2 : 1, lista = [{ id: "eu", team: "A", slot: 0, bot: false, nome: "", skin: store.get("tenis:skin") || "padrao" }];
  let k = 0;
  if (n === 2) lista.push({ id: "bot" + k, team: "A", slot: 1, bot: true, nome: "🤖 " + BOT_NOMES[k], skin: BOT_SKINS[k++] });
  for (let i = 0; i < n; i++) lista.push({ id: "bot" + k, team: "B", slot: i, bot: true, nome: "🤖 " + BOT_NOMES[k % 3], skin: BOT_SKINS[k++] });
  G.m = T.novaPartida(lista, { duplas: n === 2, games: t.games || 3, dif: t.dif || "medio" }, agoraTreino() + 1500);
  G.offline = true; G.myId = "eu"; G.me = G.m.jogadores[0]; G.myTeam = "A";
  montarCorpos(G.m.jogadores); iniciar();
}
function comecarOnline() {
  if (G.active) pararJogo();
  G.offline = false; G.m = null; G.buf = []; G.matchKey = S.match.jogadores.map((j) => j.id).join();
  const eu = ME && S.match.jogadores.find((j) => j.id === ME.id);
  G.myId = eu ? eu.id : null; G.myTeam = eu ? eu.team : "A";
  G.me = eu ? { id: eu.id, team: eu.team, slot: eu.slot, x: 0, z: T.sinal(eu.team) * Q.L, vx: 0, vz: 0, armado: null, mira: { x: 0, z: 0 }, pronto: false } : null;
  montarCorpos(S.match.jogadores); iniciar();
}
function iniciar() {
  show("game"); resize(); G.active = true; G.pausa = false; $("pause").classList.add("hidden"); $("over").classList.add("hidden");
  $("hHint").innerHTML = G.me ? "WASD corre · J top · K cortada · L balão · U curtinha<br>Aperte antes da bola chegar · saque: aperte 2x · Esc menu" : "Assistindo";
  if (window.Toque && Toque.isTouch()) Toque.setup({
    buttons: [{ icon: "🪶", label: "curtinha", code: "KeyU" }, { icon: "🌙", label: "balão", code: "KeyL" }, { icon: "🔪", label: "cortada", code: "KeyK" }, { icon: "🌀", label: "top", code: "KeyJ", big: true }],
    top: [{ icon: "⏸", down: () => pausar(true) }],
  });
  if (window.Toque) Toque.show(!!G.me);
  Som.unlock(); Som.apito();
}
function pararJogo() {
  G.active = false; limparCorpos(); G.m = null; G.me = null; G.buf = []; G.matchKey = null; marca.visible = false;
  if (window.Toque) Toque.show(false);
  $("over").classList.add("hidden"); $("pause").classList.add("hidden");
}
function sair() {
  if (G.offline) { pararJogo(); if (S && S.phase === "lobby") { show("lobby"); renderLobby(); } else show("home"); return; }
  if (!confirm("Sair da quadra?")) return;
  socket.disconnect(); ME = null; S = null; pararJogo(); history.replaceState(null, "", "/tenis/"); $("roomTag").classList.add("hidden"); show("home"); socket.connect();
}
$("btnLeave").onclick = sair;
function pausar(on) { G.pausa = on; $("pause").classList.toggle("hidden", !on); if (window.Toque) Toque.show(!on && !!G.me); }
$("btnResume").onclick = () => { Som.unlock(); pausar(false); if (window.Toque && Toque.isTouch()) Toque.fullscreen(); };

// ======================================================================
// Controles: teclado, mouse, controle e toque (os botões da tela apertam as mesmas teclas)
// ======================================================================
const keys = new Set();
const GOLPE_TECLA = { KeyJ: "top", KeyK: "slice", KeyL: "lob", KeyU: "curta", Space: "top" };
addEventListener("keydown", (e) => {
  if (!G.active) return;
  if (e.code === "Escape") { pausar(!G.pausa); return; }
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  if (!e.repeat && GOLPE_TECLA[e.code] && !G.pausa) golpe(GOLPE_TECLA[e.code]);
  keys.add(e.code);
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
canvas.addEventListener("mousedown", (e) => { if (!G.active || G.pausa) return; e.preventDefault(); golpe(e.button === 2 ? "slice" : e.button === 1 ? "lob" : "top"); });
document.addEventListener("contextmenu", (e) => { if (G.active) e.preventDefault(); });
const PAD = { prev: [], lx: 0, ly: 0 };
function lerPad() {
  const gp = [...(navigator.getGamepads?.() || [])].find((g) => g && g.connected); if (!gp) { PAD.lx = PAD.ly = 0; return; }
  const dz = (v) => (Math.abs(v || 0) < 0.18 ? 0 : v); PAD.lx = dz(gp.axes[0]); PAD.ly = dz(gp.axes[1]);
  const mapa = { 0: "top", 1: "slice", 3: "lob", 2: "curta" };
  gp.buttons.forEach((b, i) => { const v = b.pressed, era = !!PAD.prev[i]; PAD.prev[i] = v; if (!v || era) return; if (i === 9) pausar(!G.pausa); else if (mapa[i] && !G.pausa) golpe(mapa[i]); });
}
// direção da tela -> mundo: a câmera fica atrás do meu time (time A olha para −z)
function entrada() {
  let f = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
  let r = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  if (PAD.lx || PAD.ly) { f = -PAD.ly; r = PAD.lx; }
  const s = T.sinal(G.myTeam || "A");
  return { dir: { x: s * r, z: -s * f }, mira: { x: s * r, z: f } }; // mira: lado no mundo (x) e funda (+) / curta (−)
}
// apertou um golpe: no treino, direto nas regras; online, avisa o servidor (e já mostra a barra de força aqui)
function golpe(tipo) {
  const me = G.me; if (!me) return;
  Som.unlock();
  const { mira } = entrada(); me.mira = mira;
  if (G.offline) {
    const m = G.m, agora = agoraTreino();
    if (m.sacador === me.id && (m.fase === "saque" || m.fase === "lancado")) T.sacar(m, me, agora); else T.armar(m, me, tipo, agora);
    return;
  }
  socket.emit("golpe", { tipo, mx: mira.x, mz: mira.z });
  if (!S || !S.match || S.match.sacador !== me.id || G.fase === "jogo") me.armado = { tipo, t0: relogio.agora() };
}

// ======================================================================
// Eventos do jogo (vêm das regras no treino, ou do servidor): sons, animação da batida e mensagens
// ======================================================================
const MOTIVO = { "fora": "Fora!", "não devolveu": "", "dois quiques": "", "ace": "ACE!", "dupla falta": "Dupla falta", "rede": "Na rede", "do próprio lado": "Na rede" };
function msg(grande, peq = "", ms = 1600, cor = "#fff") { const e = $("hMsg"); e.innerHTML = `<span style="color:${cor}">${h(grande)}</span>${peq ? `<small>${h(peq)}</small>` : ""}`; e.classList.remove("pop"); void e.offsetWidth; e.classList.add("pop"); G.msgAte = performance.now() + ms; }
function aoEvento(e) {
  if (e.tipo === "batida") { const c = G.corpos.get(e.id); if (c) c.giroT = performance.now(); Som.batida(e.forca); if (G.me && e.id === G.me.id) G.me.armado = null; if (e.golpe === "smash") msg("SMASH!", "", 900, "#d7f23c"); }
  else if (e.tipo === "quique") Som.quique();
  else if (e.tipo === "rede") Som.rede();
  else if (e.tipo === "lanca") Som.lanca();
  else if (e.tipo === "falta") { msg("Falta", "segundo saque", 1300); Som.ooh(); }
  else if (e.tipo === "ponto") {
    const meu = G.myTeam === e.time && G.me;
    msg(MOTIVO[e.motivo] || `Ponto do ${NOME[e.time]}`, MOTIVO[e.motivo] ? `ponto do ${NOME[e.time]}` : e.rally > 6 ? `que troca de bola! (${e.rally})` : "", 1600, COR[e.time]);
    if (meu) Som.torcida(); else if (G.me) Som.ooh(); else Som.torcida();
  }
  else if (e.tipo === "game") { setTimeout(() => msg(`Game ${NOME[e.time]}!`, `${e.games.A} x ${e.games.B}`, 1600, COR[e.time]), 900); Som.apito(); }
  else if (e.tipo === "fim" && G.offline) mostrarFim(e.time);
}
function mostrarFim(time) {
  if (!$("over").classList.contains("hidden")) return;
  const ganhei = G.myTeam === time && G.me, isHost = ME && S && S.host === ME.id;
  $("overBox").innerHTML = `<h2>${G.me ? (ganhei ? "🏆 Você venceu!" : "😓 Não foi dessa vez") : `🏆 Vitória do ${NOME[time]}`}</h2>
    <p class="muted" style="margin:0 0 10px">Time ${NOME[time]} levou o set.</p>
    <div class="row">${G.offline ? `<button class="primary" id="btnAgain">Jogar de novo</button>` : isHost ? `<button class="primary" id="btnAgain">Revanche</button><button id="btnToLobby">Voltar pra sala</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" id="btnOut" style="margin-left:auto">Sair</button></div>`;
  $("over").classList.remove("hidden");
  if (ganhei) Comum.confetti(["#d7f23c", "#2f80ed", "#ffffff", "#f07c1c"]);
  if ($("btnAgain")) $("btnAgain").onclick = () => (G.offline ? comecarTreino() : act("start"));
  if ($("btnToLobby")) $("btnToLobby").onclick = () => act("lobby");
  $("btnOut").onclick = () => { if (G.offline) { pararJogo(); show(S ? "lobby" : "home"); if (S) renderLobby(); } else sair(); };
}

// ======================================================================
// Laço principal
// ======================================================================
let ultimo = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const tp = performance.now(), dt = Math.min(0.05, (tp - ultimo) / 1000); ultimo = tp;
  if (!G.active) return;
  lerPad();
  const { dir, mira } = entrada(), me = G.me;
  let estado, bolaV, jogadores;
  if (G.offline) {
    const m = G.m, agora = agoraTreino();
    if (!G.pausa) {
      if (me) { me.mira = mira; if (m.fase === "jogo") T.mover(me, dir, dt); else if (m.fase === "saque") T.mover(me, dir, dt, true, m); else { me.vx = me.vz = 0; } }
      T.passo(m, dt, agora);
      for (const e of m.ev.splice(0)) aoEvento(e);
    }
    estado = T.estado(m); bolaV = m.bola; jogadores = m.jogadores;
  } else {
    if (!S || !S.match) return;
    estado = S.match;
    const amostra = interpolar(relogio.agora() - INTERP);
    if (!amostra) { renderer.render(scene, cam); return; }
    bolaV = amostra.b; jogadores = amostra.j;
    if (me) {
      const eu = jogadores.find((j) => j.id === me.id);
      if (G.fase !== G.faseAnt) { if (G.fase !== "jogo") me.pronto = false; G.faseAnt = G.fase; } // ponto novo: pego o lugar que o servidor mandou
      const fake = { sacador: S.match.sacador, sacX: me.sacX, fase: G.fase };
      if (me.pronto && !G.pausa && G.fase === "jogo") { me.mira = mira; T.mover(me, dir, dt); }
      else if (me.pronto && !G.pausa && G.fase === "saque") { me.mira = mira; T.mover(me, dir, dt, true, fake); } // no saque: só para os lados
      else if (eu) { me.x = eu.x; me.z = eu.z; me.vx = me.vz = 0; me.pronto = G.fase === "saque" || G.fase === "jogo"; if (me.pronto) me.sacX = eu.x; }
      if (me.armado && relogio.agora() - me.armado.t0 > T.ARMADO_MAX * 1000) me.armado = null; // não bateu a tempo: volta a andar
      if (tp - G.lastSend > 33) { G.lastSend = tp; socket.volatile.emit("st", { x: me.x, z: me.z, vx: me.vx, vz: me.vz, mx: mira.x, mz: mira.z }); }
    }
  }
  // bola, sombra e a marca de onde ela vai quicar (quando vem para o meu lado)
  bola.position.set(bolaV.x, bolaV.y, bolaV.z); bola.rotation.x += dt * 20;
  sombra.position.set(bolaV.x, 0.01, bolaV.z);
  const vindo = G.myTeam && T.ladoDe(bolaV.vz > 0 ? 1 : -1) === G.myTeam && (estado.fase === "jogo") && bolaV.y > 0.12;
  marca.visible = false;
  if (vindo) { const c = { ...bolaV, viva: true }; for (let k = 0; k < 180 && c.y > Q.R + 0.001; k++) { T.passoBola(c, 1 / 60); if (c.y <= Q.R + 0.001) break; } if (c.y <= Q.R + 0.01) { marca.visible = true; marca.position.set(c.x, 0.015, c.z); } }
  // mira (golpe armado ou a minha vez de sacar)
  const sacando = me && estado.sacador === me.id && (estado.fase === "saque" || estado.fase === "lancado");
  const tipoMira = me && (me.armado ? me.armado.tipo : sacando ? "saque" : null);
  mira3d.visible = !!tipoMira;
  if (tipoMira) { const a = T.alvoGolpe(estado.cfg.duplas, G.offline ? G.m.sacX : me.sacX, me, tipoMira, mira); mira3d.position.set(a.x, 0.02, a.z); mira3d.rotation.z += dt * 2; }
  // jogadores
  for (const j of jogadores) {
    const c = G.corpos.get(j.id); if (!c) continue;
    const local = me && j.id === me.id && !G.offline ? me : j;
    const vel = Math.hypot(local.vx || 0, local.vz || 0);
    c.model.position.set(local.x, 0, local.z);
    // vira para a bola (do lado dele) ou para a rede
    const s = T.sinal(c.team), bx = bolaV.x - local.x, bz = bolaV.z - local.z, alvo = T.ladoDe(bolaV.z) === c.team && Math.abs(bz) < 8 ? Math.atan2(-bx, -bz) : s > 0 ? 0 : Math.PI;
    c.yaw += Math.atan2(Math.sin(alvo - c.yaw), Math.cos(alvo - c.yaw)) * Math.min(1, dt * 8);
    c.model.rotation.y = c.yaw;
    animate(c.model, vel, dt, c.st, vel > 5 ? 1 : 0);
    // a batida: o braço da raquete vai de trás para a frente em 0,3 s, com o tronco girando junto
    const u = c.model.userData, k = (tp - c.giroT) / 300;
    if (u.arms && k >= 0 && k <= 1) { const a = Math.sin(k * Math.PI); u.arms[1].rotation.x = -0.6 + k * 2.4; u.arms[1].rotation.z = 0.6 * a; c.model.rotation.y += (k - 0.5) * 1.2 * a; }
    else if (u.arms && j.armado) { u.arms[1].rotation.x = -0.9; u.arms[1].rotation.z = 0.5; } // armado: raquete para trás
  }
  // câmera: atrás do meu time, alto (como nas transmissões); quem assiste vê de lado
  const s = T.sinal(G.myTeam || "A");
  if (me) { G.camPos.lerp(new THREE.Vector3(me.x * 0.55, 6.2, s * (Q.L + 8.5)), Math.min(1, dt * 3)); cam.position.copy(G.camPos); cam.lookAt(me.x * 0.3, 0.4, -s * 3.5); }
  else { cam.position.lerp(new THREE.Vector3(18, 11, bolaV.z * 0.3), Math.min(1, dt * 2)); cam.lookAt(0, 0.5, bolaV.z * 0.3); }
  hud(estado, me);
  renderer.render(scene, cam);
}
// online: posições e bola no instante t (entre dois pacotes)
function interpolar(t) {
  const q = G.buf; if (!q.length) return null;
  let i = q.length - 1; while (i > 0 && q[i - 1].t > t) i--;
  const B = q[i], A = q[Math.max(0, i - 1)], k = B.t === A.t ? 1 : Math.max(0, Math.min(1, (t - A.t) / (B.t - A.t)));
  const L = (a, b) => a + (b - a) * k;
  const j = B.j.map((e) => { const a = A.j.find((x) => x[0] === e[0]) || e; return { id: e[0], x: L(a[1], e[1]), z: L(a[2], e[2]), vx: e[3], vz: e[4], armado: !!e[5] }; });
  const b = { x: L(A.b[0], B.b[0]), y: L(A.b[1], B.b[1]), z: L(A.b[2], B.b[2]), vx: B.b[3], vy: B.b[4], vz: B.b[5], g: B.b[6], e: 0.7, kh: 0.9 };
  return { j, b };
}
function hud(est, me) {
  const sw = (t) => `<i style="background:${COR[t]}"></i>`, sac = (t) => (est.sacaTime === t ? " 🎾" : "");
  const txt = est.tie ? `TIE-BREAK ${est.placar.A} x ${est.placar.B}` : est.texto.replace("Vantagem A", "Vant. Azul").replace("Vantagem B", "Vant. Laranja");
  const html = `<div class="t">${sw("A")}Azul${sac("A")}</div><div class="g">${est.games.A}</div><div class="p">${h(txt)}</div><div class="g">${est.games.B}</div><div class="t">${sac("B")}Laranja${sw("B")}</div>`;
  if ($("hTop")._h !== html) { $("hTop")._h = html; $("hTop").innerHTML = html; }
  const info = me ? (est.sacador === me.id && (est.fase === "saque" || est.fase === "lancado") ? "Seu saque: aperte J (ou clique) para jogar a bola e de novo lá no alto" : "") : "Assistindo";
  if ($("hInfo")._h !== info) { $("hInfo")._h = info; $("hInfo").textContent = info; }
  if (performance.now() > G.msgAte && $("hMsg").innerHTML) $("hMsg").innerHTML = "";
  const arm = me && me.armado, agora = G.offline ? agoraTreino() : relogio.agora();
  $("hPow").classList.toggle("hidden", !arm); $("hPowL").classList.toggle("hidden", !arm);
  if (arm) { const p = Math.min(1, (agora - arm.t0) / (T.CARGA_T * 1000)); $("hPow").firstElementChild.style.width = Math.round(p * 100) + "%"; $("hPowL").textContent = (T.GOLPES[arm.tipo] || {}).nome + (p >= 1 ? " · CHEIO" : ""); }
}

telaInicial();
if (!urlCode) show("home");
requestAnimationFrame(frame);
if (location.hash === "#debug") window.__tenis = { G, T, golpe, keys, get S() { return S; }, avancar: (seg) => { for (let i = 0; i < seg * 60; i++) { G.adiant = (G.adiant || 0) + 1000 / 60; const { dir } = entrada(); if (G.me && G.m.fase === "jogo") T.mover(G.me, dir, 1 / 60); T.passo(G.m, 1 / 60, agoraTreino()); for (const e of G.m.ev.splice(0)) aoEvento(e); } } };
