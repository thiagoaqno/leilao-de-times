// Futevôlei da Galera — o jogo no navegador: telas, o lugar em 3D (cenarios.js), os atletas (atleta.js, vestidos com as
// skins da Pelada pelo gancho de skin), a bola, os controles de dois botões (passar e atacar), sons e rede. As regras
// (bola, toques, placar e robôs) ficam em regras.js (window.Futevolei), as mesmas do servidor. No treino contra robôs a
// partida roda inteira aqui; online, eu mexo o meu jogador e mando a posição e a mira, e o servidor manda a bola e todo
// mundo 20 vezes por segundo (desenhados 100 ms "no passado").
import * as THREE from "three";
import { makePlayer, descartarJogador, configurarBonecos } from "/pelada/bonecos.js";
import { canvasTex } from "/pelada/tex.js";
import { Atleta } from "/futevolei/atleta.js";
import { montarCenario } from "/futevolei/cenarios.js";

const F = window.Futevolei, C = window.Campo, Q = F.Q, { $, h, store } = Comum;
const toast = Comum.criarToast(3000), socket = io("/futevolei"), relogio = Comum.relogio(), act = Comum.criarAct(socket, toast);
const KIT = { A: "canarinho", B: "celeste" }, COR = { A: "#f5c400", B: "#5b9bff" }, NOME = { A: "Amarelo", B: "Azul" };
const BOT_NOMES = ["Robozão", "Tchuco", "Parafuso"], BOT_SKINS = ["neymar", "cr7", "steve", "shrek", "naruto", "woody"];
const INTERP = 100;
const agoraTreino = () => Date.now() + (G.adiant || 0); // no treino, o relógio é o daqui (os testes podem adiantar)
let S = null, ME = null;
const urlCode = new URLSearchParams(location.search).get("sala");
const G = { active: false, offline: false, m: null, me: null, buf: [], atletas: new Map(), camPos: new THREE.Vector3(0, 10.5, 19), camOlhar: new THREE.Vector3(0, 0.6, -2), pausa: false, lastSend: 0, msgAte: 0, golpeAte: 0, cenario: null, torcida: [] };
const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ======================================================================
// 3D: renderizador, cena e câmera (o lugar é montado em cenarios.js na hora de jogar)
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(52, 1, 0.1, 1200);
configurarBonecos({ scene, limites: () => ({ L: Q.FX, W: Q.FZ, goalD: 0 }) });
function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener("resize", resize);
function lugar(tipo) {
  if (G.cenario && G.cenario.tipo === tipo) return;
  if (G.cenario) G.cenario.liberar();
  G.cenario = montarCenario(renderer, scene, tipo);
  montarTorcida();
}

// ---------- a bola (a de futevôlei: amarela, azul e verde em ondas), a sombra e as marcas ----------
const bolaTex = canvasTex(512, 256, (x, w, hh) => {
  const img = x.createImageData(w, hh), cores = [[245, 196, 0], [30, 91, 198], [46, 158, 79]];
  for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
    const v = j / hh * 5 + Math.sin(i / w * Math.PI * 4) * 0.55, f = v - Math.floor(v), c = f < 0.06 ? [30, 30, 30] : cores[Math.floor(v + 10) % 3], o = (j * w + i) * 4;
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
});
const bola = new THREE.Mesh(new THREE.SphereGeometry(Q.R, 32, 20), new THREE.MeshStandardMaterial({ map: bolaTex, roughness: 0.45 }));
bola.castShadow = true; scene.add(bola);
// a sombra logo embaixo da bola (é por ela que se acha a bola no futevôlei)
const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
sombra.rotation.x = -Math.PI / 2; scene.add(sombra);
// onde a bola vai cair (quando vem para o meu lado) e a mira do ataque (do outro lado)
const anel = (r0, r1, cor, op, seg = 32) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, seg), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return m; };
const marca = anel(0.25, 0.36, 0xffb84d, 0.75), mira3d = anel(0.35, 0.5, 0xffffff, 0.8, 4), meuAnel = anel(0.55, 0.68, 0x4fc3f7, 0.7);

// ---------- pegadas na areia (somem com o tempo) ----------
const PEGADAS = 260;
const pegadaTex = canvasTex(32, 64, (x, w, hh) => { x.clearRect(0, 0, w, hh); x.fillStyle = "rgba(60,40,15,0.55)"; x.beginPath(); x.ellipse(w / 2, hh * 0.62, w * 0.36, hh * 0.32, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(w / 2, hh * 0.2, w * 0.3, hh * 0.15, 0, 0, 7); x.fill(); });
const pegadas = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.13, 0.27), new THREE.MeshStandardMaterial({ map: pegadaTex, transparent: true, depthWrite: false, roughness: 1 }), PEGADAS);
pegadas.instanceMatrix.setUsage(THREE.DynamicDrawUsage); pegadas.frustumCulled = false; pegadas.renderOrder = 1; scene.add(pegadas);
const pegadaVida = new Float32Array(PEGADAS), pegadaPos = Array.from({ length: PEGADAS }, () => ({ x: 0, z: 0, yaw: 0 }));
let pegadaI = 0;
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function pisar(x, z, yaw, lado) {
  if (G.cenario && !G.cenario.naAreia(x, z)) return;
  const i = pegadaI++ % PEGADAS, d = lado > 0 ? 0.1 : -0.1;
  pegadaPos[i] = { x: x + Math.cos(yaw) * d, z: z - Math.sin(yaw) * d, yaw }; pegadaVida[i] = 1;
}
function atualizarPegadas(dt) {
  for (let i = 0; i < PEGADAS; i++) {
    pegadaVida[i] = Math.max(0, pegadaVida[i] - dt / 30);
    const p = pegadaPos[i], k = pegadaVida[i] > 0 ? Math.min(1, pegadaVida[i] * 5) : 0;
    _e.set(-Math.PI / 2, 0, p.yaw); _q.setFromEuler(_e); _s.set(k, k, k); _v.set(p.x, 0.012, p.z);
    pegadas.setMatrixAt(i, _m4.compose(_v, _q, _s));
  }
  pegadas.instanceMatrix.needsUpdate = true;
}

// ---------- areia voando (quando a bola cai, nos chutes baixos e nos pulos) ----------
const GRAOS = 360, graosGeo = new THREE.BufferGeometry(), graosPos = new Float32Array(GRAOS * 3), graosV = new Float32Array(GRAOS * 3), graosVida = new Float32Array(GRAOS);
graosGeo.setAttribute("position", new THREE.BufferAttribute(graosPos, 3));
const graos = new THREE.Points(graosGeo, new THREE.PointsMaterial({ color: 0xd9bf8c, size: 0.05, transparent: true, opacity: 0.9, depthWrite: false }));
graos.frustumCulled = false; scene.add(graos);
let graoI = 0;
function poeira(x, z, n = 40, forca = 1) {
  if (reduzido || (G.cenario && !G.cenario.naAreia(x, z))) return;
  for (let k = 0; k < n; k++) {
    const i = graoI++ % GRAOS, a = Math.random() * Math.PI * 2, v = (0.5 + Math.random() * 2) * forca;
    graosPos.set([x + Math.cos(a) * 0.1, 0.03, z + Math.sin(a) * 0.1], i * 3);
    graosV.set([Math.cos(a) * v, 1.5 + Math.random() * 2.5 * forca, Math.sin(a) * v], i * 3); graosVida[i] = 0.6 + Math.random() * 0.6;
  }
}
function atualizarGraos(dt) {
  for (let i = 0; i < GRAOS; i++) {
    if (graosVida[i] <= 0) { graosPos[i * 3 + 1] = -50; continue; }
    graosVida[i] -= dt; graosV[i * 3 + 1] -= 9.8 * dt;
    for (let k = 0; k < 3; k++) graosPos[i * 3 + k] += graosV[i * 3 + k] * dt;
    if (graosPos[i * 3 + 1] < 0.01) { graosPos[i * 3 + 1] = 0.01; graosV[i * 3] *= 0.5; graosV[i * 3 + 2] *= 0.5; graosV[i * 3 + 1] = 0; }
  }
  graosGeo.attributes.position.needsUpdate = true;
}

// ======================================================================
// Os atletas e o gancho de skin
// ======================================================================
// O "sistema de skins" é o bonecos.js: ele monta o visual (com a roupa de praia) e o entrega ao atleta, que só o
// pendura no próprio transform. Quem jogava com esse visual antes devolve o antigo para ser liberado.
function vestirSkin(atleta, j) {
  const visual = makePlayer(KIT[j.team], j.slot ? 7 : 10, j.nome || "", { skin: j.skin, praia: true });
  const antigo = atleta.vestir(visual);
  if (antigo) descartarJogador(antigo);
}
function criarAtleta(j) {
  const a = new Atleta({ id: j.id, team: j.team });
  vestirSkin(a, j);
  a.aoPisar = (x, z, lado) => pisar(x, z, a.yaw, lado);
  a.raiz.position.set(j.x || 0, 0, j.z || 0);
  scene.add(a.raiz);
  return a;
}
function soltarAtleta(a) { scene.remove(a.raiz); const v = a.despir(); if (v) descartarJogador(v); }
function limparAtletas() { for (const a of G.atletas.values()) soltarAtleta(a); G.atletas.clear(); }
function montarAtletas(lista) { limparAtletas(); for (const j of lista) G.atletas.set(j.id, criarAtleta(j)); }
// a torcida em volta da quadra: os mesmos bonecos e skins, sem nome nem marcador de time
function montarTorcida() {
  for (const t of G.torcida) soltarAtleta(t.a);
  G.torcida = [];
  const skins = Object.keys(C.SKINS), kits = Object.keys(C.KITS);
  for (const [i, l] of (G.cenario ? G.cenario.lugaresTorcida : []).entries()) {
    const a = new Atleta({ id: "torcida" + i, team: "A" }), v = makePlayer(kits[(i * 5) % kits.length], 0, "", { skin: skins[(i * 7 + 3) % skins.length], praia: true });
    for (const m of v.userData.marca || []) m.visible = false;
    a.vestir(v); a.yaw = a.frente = l.olha; a.raiz.position.set(l.x, l.y || 0, l.z); a.raiz.rotation.y = l.olha; scene.add(a.raiz);
    G.torcida.push({ a, l, fase: Math.random() * 7 });
  }
}
function torcidaVibra(chance = 0.6) { for (const t of G.torcida) if (Math.random() < chance) setTimeout(() => t.a.disparar("comemora"), Math.random() * 400); }

// ======================================================================
// Sons (sintetizados): o chute, o cabeceio, o peito, a areia, o apito, a torcida e o mar (ou o ginásio) ao fundo
// ======================================================================
const Som = (() => {
  let ac = null, vol = store.get("futevolei:vol") ?? 0.7, master = null, fundo = null;
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; };
  function tom(f0, f1, dur, ganho, tipo = "sine") { const c = ctx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02); }
  function ruido(dur, ganho, freq, q = 1) { const c = ctx(); if (!c) return; const n = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = n; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.value = ganho; s.connect(f).connect(g).connect(master); s.start(); }
  return {
    get vol() { return vol; }, setVol(v) { vol = v; store.set("futevolei:vol", v); if (master) master.gain.value = v; }, unlock: ctx,
    toque(golpe) {
      if (golpe === "cabeca") { tom(240, 90, 0.09, 0.5, "triangle"); ruido(0.05, 0.3, 900); }
      else if (golpe === "peito") { tom(130, 60, 0.12, 0.55); ruido(0.06, 0.25, 500); }
      else { const forte = ["shark", "bicicleta", "voleio", "saque"].includes(golpe); tom(forte ? 190 : 160, 55, 0.1, forte ? 0.75 : 0.55, "triangle"); ruido(0.06, forte ? 0.55 : 0.35, 1400); }
    },
    areia() { ruido(0.25, 0.6, 350, 0.6); tom(90, 40, 0.12, 0.3); },
    rede() { ruido(0.25, 0.4, 700); },
    apito() { tom(2300, 2250, 0.18, 0.12, "square"); setTimeout(() => tom(2300, 2250, 0.3, 0.12, "square"), 220); },
    torcida() { ruido(1.4, 0.4, 900, 0.5); },
    ooh() { tom(300, 170, 0.6, 0.14, "sawtooth"); },
    // o fundo: o mar batendo (praia) ou o burburinho da arena, em volta
    fundo(tipo) {
      this.semFundo(); const c = ctx(); if (!c) return;
      const n = c.createBuffer(1, c.sampleRate * 4, c.sampleRate), d = n.getChannelData(0); let ult = 0;
      for (let i = 0; i < d.length; i++) { ult = ult * 0.985 + (Math.random() * 2 - 1) * 0.015; d[i] = ult * 6; }
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      s.buffer = n; s.loop = true; f.type = "lowpass"; f.frequency.value = tipo === "arena" ? 900 : 500; g.gain.value = tipo === "arena" ? 0.08 : 0.12;
      lfo.frequency.value = tipo === "arena" ? 0.3 : 0.12; lg.gain.value = tipo === "arena" ? 0.02 : 0.08; lfo.connect(lg).connect(g.gain);
      s.connect(f).connect(g).connect(master); s.start(); lfo.start(); fundo = [s, lfo];
    },
    semFundo() { if (fundo) { for (const n of fundo) try { n.stop(); } catch {} fundo = null; } },
  };
})();
$("vol").value = Som.vol; $("volV").textContent = Math.round(Som.vol * 100) + "%";
$("vol").oninput = (e) => { Som.setVol(+e.target.value); $("volV").textContent = Math.round(Som.vol * 100) + "%"; };

// ======================================================================
// Telas: inicial (treino e entrar) e sala de espera
// ======================================================================
function show(id) { for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id); $("game").classList.toggle("hidden", id !== "game"); $("bar").classList.toggle("hidden", id === "game"); }
const seg = (el, ops, atual, attr, dis = "") => ($(el).innerHTML = ops.map(([v, t]) => `<button ${attr}="${v}" class="${String(atual) === String(v) ? "on" : ""}" ${dis}>${t}</button>`).join(""));
const skinBotoes = (atual) => Object.entries(C.SKINS).map(([k, s]) => `<button data-skin="${k}" class="${k === (atual || "padrao") ? "on" : ""}"><i>${s.emoji}</i>${h(s.name)}</button>`).join("");
const MODOS = [["1", "Duplas (2x2)"], ["0", "1x1"]], PONTOS = [[10, "10 pontos"], [15, "15 pontos"], [18, "18 pontos"]], DIFS = Object.entries(F.DIF).map(([k, d]) => [k, d.nome]);
const ARENAS = [["praia", "Praia"], ["arena", "Arena coberta"]];
function treinoCfg() { const t = store.get("futevolei:treino") || {}; return { duplas: t.duplas !== false, dif: t.dif || "medio", arena: t.arena || "praia", pontos: t.pontos || 15 }; }
function telaInicial() {
  const t = treinoCfg();
  seg("hModo", MODOS, t.duplas ? "1" : "0", "data-hmodo"); seg("hDif", DIFS, t.dif, "data-hdif"); seg("hArena", ARENAS, t.arena, "data-harena");
  $("hSkins").innerHTML = skinBotoes(store.get("galera:skin"));
}
function teclasAjuda() {
  return `<ul class="keys"><li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou setas: correr (e mirar o ataque: lado e curta/funda)</li>
    <li><kbd>J</kbd> ou clique: <b>passar</b> (para o parceiro; no 3º toque, bola de segurança por cima da rede)</li>
    <li><kbd>K</kbd> ou botão direito: <b>atacar</b> (manda para o outro lado)</li>
    <li>Aperte <b>antes</b> da bola chegar: o jogador corre um pouco sozinho até ela e toca. O golpe sai pela altura da bola: cabeceio, peito, pé de frente ou de lado, letra e pé para trás atrás do corpo, voleio de lado, bicicleta por cima e o <b>Shark Attack</b> no alto perto da rede. O pulo é sozinho.</li>
    <li>3 toques por time, ninguém toca duas vezes seguidas e a bola não pode cair na areia · <kbd>Esc</kbd> menu</li></ul>
    <p class="muted" style="font-size:13px;margin:8px 0 0">Controle: analógico corre e mira · A passa · B ou X ataca · Start pausa.</p>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const t = store.get("futevolei:treino") || {};
  if (b.dataset.hmodo) { t.duplas = b.dataset.hmodo === "1"; store.set("futevolei:treino", t); telaInicial(); }
  else if (b.dataset.hdif) { t.dif = b.dataset.hdif; store.set("futevolei:treino", t); telaInicial(); }
  else if (b.dataset.harena) { t.arena = b.dataset.harena; store.set("futevolei:treino", t); telaInicial(); }
  else if (b.dataset.skin) { store.set("galera:skin", b.dataset.skin); if (ME && ME.id && S) act("skin", { skin: b.dataset.skin }); telaInicial(); if (S) renderLobby(); }
  else if (b.dataset.cmodo && S) setCfg({ duplas: b.dataset.cmodo === "1" });
  else if (b.dataset.cpontos && S) setCfg({ pontos: +b.dataset.cpontos });
  else if (b.dataset.carena && S) setCfg({ arena: b.dataset.carena });
  else if (b.dataset.cdif && S) setCfg({ dif: b.dataset.cdif });
  else if (b.dataset.cbots && S) setCfg({ bots: b.dataset.cbots === "1" });
  else if (b.dataset.kick) act("kick", { id: b.dataset.kick });
});
function setCfg(c) { const cfg = { ...S.config, ...c }; store.set("futevolei:cfg", cfg); act("config", { config: cfg }); }
const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id, n = S.config.duplas ? 2 : 1, dis = isHost ? "" : "disabled";
  const linha = (p) => `<div class="pl ${ME && p.id === ME.id ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "★ " : ""}${h(p.name)} <span>${(C.SKINS[p.skin] || {}).emoji || ""}</span>${isHost && p.id !== ME.id ? `<button class="small ghost" data-kick="${p.id}" style="margin-left:auto">✕</button>` : ""}</div>`;
  for (const t of ["A", "B"]) {
    const lista = S.players.filter((p) => p.team === t), vagas = Math.max(0, n - lista.length);
    $("t" + t).innerHTML = lista.map(linha).join("") + Array.from({ length: vagas }, () => `<div class="pl muted" style="font-weight:500">${S.config.bots ? "robô (vaga livre)" : "vaga livre"}</div>`).join("");
    $("join" + t).classList.toggle("hidden", !mine || mine.team === t || lista.length >= n);
  }
  const fora = S.players.filter((p) => !p.team); $("tN").innerHTML = fora.length ? fora.map(linha).join("") : "Ninguém.";
  $("joinBench").classList.toggle("hidden", !mine || !mine.team);
  $("lSkins").innerHTML = skinBotoes(mine && mine.skin);
  seg("cModo", MODOS, S.config.duplas ? "1" : "0", "data-cmodo", dis); seg("cPontos", PONTOS, S.config.pontos, "data-cpontos", dis); seg("cArena", ARENAS, S.config.arena, "data-carena", dis);
  seg("cBots", [["1", "Completar com robôs"], ["0", "Só gente"]], S.config.bots ? "1" : "0", "data-cbots", dis); seg("cDif", DIFS, S.config.dif, "data-cdif", dis);
  $("keysBox").innerHTML = teclasAjuda();
  $("startBox").innerHTML = isHost ? `<button class="primary" id="btnStart" style="width:100%">Começar</button>` : `<p class="muted">Esperando o organizador começar…</p>`;
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
  if (r.id) store.set("futevolei:" + r.code, ME);
  history.replaceState(null, "", "/futevolei/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, skin: store.get("galera:skin"), config: store.get("futevolei:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("futevolei:" + code) || {};
  socket.emit("join", { code, name, skin: store.get("galera:skin"), id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("btnInvite").onclick = async () => { const link = location.origin + "/futevolei/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado!"); } catch { prompt("Copie o convite:", link); } };
function aoConectar() {
  relogio.sincronizar(socket);
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("futevolei:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
}
socket.on("connect", aoConectar);
if (socket.connected) aoConectar(); // o módulo pode ter carregado depois da conexão
setInterval(() => socket.connected && relogio.sincronizar(socket, 2), 15000);
socket.on("png", (ack) => typeof ack === "function" && ack());
socket.on("removido", () => { toast("O organizador tirou você da sala."); ME = null; S = null; history.replaceState(null, "", "/futevolei/"); $("roomTag").classList.add("hidden"); pararJogo(); show("home"); });
socket.on("state", (st) => {
  S = st;
  if (st.phase === "lobby") { if (G.active && !G.offline) pararJogo(); if (!G.active) { show("lobby"); renderLobby(); } return; }
  if (!G.active || G.offline || G.matchKey !== st.match.jogadores.map((j) => j.id).join()) comecarOnline();
  if (G.cenario && G.cenario.tipo === "arena") G.cenario.placar(st.match.placar.A, st.match.placar.B, `SET ATÉ ${st.match.cfg.pontos}`);
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
  const t = treinoCfg(), n = t.duplas ? 2 : 1, lista = [{ id: "eu", team: "A", slot: 0, bot: false, nome: store.get("galera:name") || "Você", skin: store.get("galera:skin") || "padrao" }];
  let k = 0;
  if (n === 2) lista.push({ id: "bot" + k, team: "A", slot: 1, bot: true, nome: BOT_NOMES[k], skin: BOT_SKINS[k++] });
  for (let i = 0; i < n; i++) lista.push({ id: "bot" + k, team: "B", slot: i, bot: true, nome: BOT_NOMES[k % 3], skin: BOT_SKINS[k++] });
  G.m = F.novaPartida(lista, { duplas: n === 2, pontos: t.pontos, dif: t.dif }, agoraTreino() + 1500);
  G.offline = true; G.myId = "eu"; G.me = G.m.jogadores[0]; G.myTeam = "A";
  lugar(t.arena); montarAtletas(G.m.jogadores); iniciar();
  if (G.cenario.tipo === "arena") G.cenario.placar(0, 0, `SET ATÉ ${t.pontos}`);
}
function comecarOnline() {
  if (G.active) pararJogo();
  G.offline = false; G.m = null; G.buf = []; G.matchKey = S.match.jogadores.map((j) => j.id).join();
  const eu = ME && S.match.jogadores.find((j) => j.id === ME.id);
  G.myId = eu ? eu.id : null; G.myTeam = eu ? eu.team : "A";
  G.me = eu ? { id: eu.id, team: eu.team, slot: eu.slot, x: 0, z: F.sinal(eu.team) * 5, vx: 0, vz: 0, armado: null, mira: { x: 0, z: 0 }, pronto: false } : null;
  lugar(S.config.arena); montarAtletas(S.match.jogadores); iniciar();
}
function iniciar() {
  show("game"); resize(); G.active = true; G.pausa = false; $("pause").classList.add("hidden"); $("over").classList.add("hidden");
  $("hHint").innerHTML = G.me ? "WASD corre e mira · <b>J</b> ou clique: passar · <b>K</b> ou botão direito: atacar<br>Aperte antes da bola chegar · Esc menu" : "Assistindo";
  if (window.Toque && Toque.isTouch()) Toque.setup({
    buttons: [{ icon: "⇄", label: "passar", code: "KeyJ" }, { icon: "⚡", label: "atacar", code: "KeyK", big: true }],
    top: [{ icon: "⏸", down: () => pausar(true) }],
  });
  if (window.Toque) Toque.show(!!G.me);
  Som.unlock(); Som.apito(); Som.fundo(G.cenario.tipo);
}
function pararJogo() {
  G.active = false; limparAtletas(); G.m = null; G.me = null; G.buf = []; G.matchKey = null; marca.visible = mira3d.visible = meuAnel.visible = false;
  if (window.Toque) Toque.show(false);
  Som.semFundo();
  $("over").classList.add("hidden"); $("pause").classList.add("hidden");
}
function sair() {
  if (G.offline) { pararJogo(); if (S && S.phase === "lobby") { show("lobby"); renderLobby(); } else show("home"); return; }
  if (!confirm("Sair da quadra?")) return;
  socket.disconnect(); ME = null; S = null; pararJogo(); history.replaceState(null, "", "/futevolei/"); $("roomTag").classList.add("hidden"); show("home"); socket.connect();
}
$("btnLeave").onclick = sair;
function pausar(on) { G.pausa = on; $("pause").classList.toggle("hidden", !on); if (window.Toque) Toque.show(!on && !!G.me); }
$("btnResume").onclick = () => { Som.unlock(); pausar(false); if (window.Toque && Toque.isTouch()) Toque.fullscreen(); };

// ======================================================================
// Controles: só dois botões (passar e atacar) e o direcional. Teclado, mouse, controle e toque.
// ======================================================================
const keys = new Set();
const TECLA = { KeyJ: "passe", KeyK: "ataque" };
addEventListener("keydown", (e) => {
  if (!G.active) return;
  if (e.code === "Escape") { pausar(!G.pausa); return; }
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  if (!e.repeat && TECLA[e.code] && !G.pausa) toque(TECLA[e.code]);
  keys.add(e.code);
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
canvas.addEventListener("mousedown", (e) => { if (!G.active || G.pausa) return; e.preventDefault(); toque(e.button === 2 ? "ataque" : "passe"); });
document.addEventListener("contextmenu", (e) => { if (G.active) e.preventDefault(); });
const PAD = { prev: [], lx: 0, ly: 0 };
function lerPad() {
  const gp = [...(navigator.getGamepads?.() || [])].find((g) => g && g.connected); if (!gp) { PAD.lx = PAD.ly = 0; return; }
  const dz = (v) => (Math.abs(v || 0) < 0.18 ? 0 : v); PAD.lx = dz(gp.axes[0]); PAD.ly = dz(gp.axes[1]);
  const mapa = { 0: "passe", 1: "ataque", 2: "ataque" };
  gp.buttons.forEach((b, i) => { const v = b.pressed, era = !!PAD.prev[i]; PAD.prev[i] = v; if (!v || era) return; if (i === 9) pausar(!G.pausa); else if (mapa[i] && !G.pausa) toque(mapa[i]); });
}
// direção da tela -> mundo: a câmera fica atrás do meu time (o time A olha para −z)
function entrada() {
  let f = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
  let r = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  if (PAD.lx || PAD.ly) { f = -PAD.ly; r = PAD.lx; }
  const s = F.sinal(G.myTeam || "A");
  return { dir: { x: s * r, z: -s * f }, mira: { x: s * r, z: f } }; // mira: lado no mundo (x) e funda (+) / curta (−)
}
// apertou passar ou atacar: no treino, direto nas regras; online, avisa o servidor (e já mostra aqui)
function toque(tipo) {
  const me = G.me; if (!me) return;
  Som.unlock();
  const { mira } = entrada(); me.mira = mira;
  if (G.offline) { F.armar(G.m, me, tipo, agoraTreino(), mira); return; }
  socket.emit("toque", { tipo, mx: mira.x, mz: mira.z });
  if (G.fase === "jogo") me.armado = { intencao: tipo, t0: relogio.agora() };
}
// o "ímã": com o toque armado e a bola vindo, o jogador vai sozinho até o ponto bom (o direcional ainda manda)
function ima(me, b, dir) {
  if (!me.armado || !b) return dir;
  const p = F.pontoDeToque(b, me, F.VEL, 2); if (!p) return dir;
  const s = F.sinal(me.team), dx = p.x - me.x, dz = p.z + s * 0.25 - me.z, d = Math.hypot(dx, dz);
  if (d < 0.1) return dir;
  const k = Math.min(1, d / 0.6), forca = Math.hypot(dir.x, dir.z) > 0.1 ? 0.45 : 1;
  return { x: dir.x * (1 - forca * 0.5) + (dx / d) * k * forca, z: dir.z * (1 - forca * 0.5) + (dz / d) * k * forca };
}

// ======================================================================
// Eventos do jogo (das regras no treino, ou do servidor): animações, sons e mensagens
// ======================================================================
const ESPECIAIS = { shark: "Shark Attack!", bicicleta: "Bicicleta!", letra: "De letra!", voleio: "Voleio!", calcanhar: "Pé para trás!" };
const MOTIVO = { "fora": "Fora!", "antena": "Na antena!", "shark": "Shark Attack!", "bicicleta": "Bicicleta!", "não passou": "Não passou", "caiu do seu lado": "Na rede", "na areia": "", "não segurou": "" };
function msg(grande, peq = "", ms = 1600, cor = "#fff") { const e = $("hMsg"); e.innerHTML = `<span style="color:${cor}">${h(grande)}</span>${peq ? `<small>${h(peq)}</small>` : ""}`; e.classList.remove("pop"); void e.offsetWidth; e.classList.add("pop"); G.msgAte = performance.now() + ms; }
function golpeNaTela(txt, grande) { const e = $("hGolpe"); e.textContent = txt; e.className = "hud on" + (grande ? " grande" : ""); G.golpeGrande = grande; G.golpeAte = performance.now() + (grande ? 1500 : 800); }
function posDe(id) { const a = G.atletas.get(id); return a ? a.raiz.position : null; }
function aoEvento(e) {
  if (e.tipo === "toque") {
    const a = G.atletas.get(e.id);
    if (a) a.disparar(e.golpe, { lado: e.lado, pulo: e.pulo, h: e.h, estilo: e.estilo });
    Som.toque(e.golpe);
    if (G.me && e.id === G.me.id) G.me.armado = null;
    const p = posDe(e.id);
    if (p && (e.pulo || e.golpe === "saque")) poeira(p.x, p.z, 26, 0.8);
    const grandeNaTela = G.golpeGrande && performance.now() < G.golpeAte; // o Shark/bicicleta fica na tela, não é coberto pelo toque seguinte
    if (e.golpe === "shark") { golpeNaTela(e.estilo === "bicicleta" ? "Shark Attack de bicicleta!" : "Shark Attack!", true); torcidaVibra(0.4); }
    else if (ESPECIAIS[e.golpe]) { if (!grandeNaTela) golpeNaTela(ESPECIAIS[e.golpe], e.golpe === "bicicleta"); if (e.golpe === "bicicleta") torcidaVibra(0.4); }
    else if (e.golpe !== "saque" && !grandeNaTela) golpeNaTela((F.GOLPES[e.golpe] || {}).nome || "", false);
    if (e.espirrou && !grandeNaTela) golpeNaTela("Espirrou!", false);
  }
  else if (e.tipo === "areia") { poeira(e.x, e.z, 70, 1.2); Som.areia(); }
  else if (e.tipo === "rede") Som.rede();
  else if (e.tipo === "ponto") {
    const meu = G.myTeam === e.time && G.me, motivo = MOTIVO[e.motivo];
    if (motivo) { $("hGolpe").classList.remove("on"); G.golpeAte = 0; } // a mensagem do ponto já diz o golpe
    msg(motivo || `Ponto do ${NOME[e.time]}`, motivo ? `ponto do ${NOME[e.time]}` : e.rally > 6 ? `que rally! (${e.rally} toques)` : "", 1600, COR[e.time]);
    if (meu || !G.me) Som.torcida(); else Som.ooh();
    torcidaVibra(0.5);
    for (const [id, a] of G.atletas) { const ganhou = a.team === e.time; setTimeout(() => a.disparar(ganhou ? "comemora" : "lamenta"), 350 + (id.length % 3) * 80); }
    if (G.cenario && G.cenario.tipo === "arena") { const cfg = G.offline ? G.m.cfg : S && S.match && S.match.cfg; G.cenario.placar(e.placar.A, e.placar.B, cfg ? `SET ATÉ ${cfg.pontos}` : ""); }
  }
  else if (e.tipo === "fim" && G.offline) mostrarFim(e.time);
}
function mostrarFim(time) {
  if (!$("over").classList.contains("hidden")) return;
  const ganhei = G.myTeam === time && G.me, isHost = ME && S && S.host === ME.id;
  $("overBox").innerHTML = `<h2>${G.me ? (ganhei ? "Você venceu!" : "Não foi dessa vez") : `Vitória do ${NOME[time]}`}</h2>
    <p class="muted" style="margin:0 0 10px">O time ${NOME[time]} levou o set.</p>
    <div class="row">${G.offline ? `<button class="primary" id="btnAgain">Jogar de novo</button>` : isHost ? `<button class="primary" id="btnAgain">Revanche</button><button id="btnToLobby">Voltar pra sala</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" id="btnOut" style="margin-left:auto">Sair</button></div>`;
  $("over").classList.remove("hidden");
  if (ganhei && !reduzido) Comum.confetti(["#f5c400", "#1e5bc6", "#ffffff", "#ffb84d"]);
  Som.apito();
  if ($("btnAgain")) $("btnAgain").onclick = () => (G.offline ? comecarTreino() : act("start"));
  if ($("btnToLobby")) $("btnToLobby").onclick = () => act("lobby");
  $("btnOut").onclick = () => { if (G.offline) { pararJogo(); show(S ? "lobby" : "home"); if (S) renderLobby(); } else sair(); };
}

// ======================================================================
// Laço principal
// ======================================================================
let ultimo = performance.now();
const _alvoCam = new THREE.Vector3(), _olhar = new THREE.Vector3(), _eixo = new THREE.Vector3();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function frame() {
  requestAnimationFrame(frame);
  const tp = performance.now(), dt = Math.min(0.05, (tp - ultimo) / 1000); ultimo = tp;
  if (!G.active) return;
  if (G.congelado) { renderer.render(scene, cam); return; } // #debug: a foto do quadro exato
  lerPad();
  const { mira } = entrada(), me = G.me;
  let { dir } = entrada();
  let estado, bolaV, jogadores;
  if (G.offline) {
    const m = G.m, agora = agoraTreino();
    if (!G.pausa) {
      if (me) { me.mira = mira; if (m.fase === "jogo" || m.fase === "saque") F.mover(me, m.fase === "jogo" ? ima(me, m.bola, dir) : dir, dt, m); else { me.vx = me.vz = 0; } }
      F.passo(m, dt, agora);
      for (const e of m.ev.splice(0)) aoEvento(e);
    }
    estado = F.estado(m); bolaV = m.bola; jogadores = m.jogadores;
  } else {
    if (!S || !S.match) return;
    estado = S.match;
    const amostra = interpolar(relogio.agora() - INTERP);
    if (!amostra) { renderer.render(scene, cam); return; }
    bolaV = amostra.b; jogadores = amostra.j;
    if (me) {
      const eu = jogadores.find((j) => j.id === me.id);
      if (G.fase !== G.faseAnt) { if (G.fase !== "jogo" && G.fase !== "saque") me.pronto = false; if (G.fase === "saque" && G.faseAnt !== "saque") me.pronto = false; G.faseAnt = G.fase; } // ponto novo: pego o lugar que o servidor mandou
      const fake = { sacador: S.match.sacador, fase: G.fase };
      if (me.pronto && !G.pausa && (G.fase === "jogo" || G.fase === "saque")) { me.mira = mira; F.mover(me, G.fase === "jogo" ? ima(me, { ...bolaV, viva: true }, dir) : dir, dt, fake); }
      else if (eu) { me.x = eu.x; me.z = eu.z; me.vx = me.vz = 0; me.pronto = G.fase === "saque" || G.fase === "jogo"; }
      if (me.armado && relogio.agora() - me.armado.t0 > F.ARMADO_MAX * 1000) me.armado = null;
      if (tp - G.lastSend > 33) { G.lastSend = tp; socket.volatile.emit("st", { x: me.x, z: me.z, vx: me.vx, vz: me.vz, mx: mira.x, mz: mira.z }); }
    }
  }
  if (G.cenario) G.cenario.atualizar(dt);
  // a bola girando, a sombra embaixo e onde ela vai cair (quando vem para o meu lado)
  bola.position.set(bolaV.x, bolaV.y, bolaV.z);
  const vb = Math.hypot(bolaV.vx || 0, bolaV.vz || 0);
  if (vb > 0.1) { _eixo.set(bolaV.vz, 0, -bolaV.vx).normalize(); bola.rotateOnWorldAxis(_eixo, (vb / Q.R) * dt * 0.5); }
  sombra.position.set(bolaV.x, 0.015, bolaV.z); sombra.scale.setScalar(1 + bolaV.y * 0.12); sombra.material.opacity = Math.max(0.08, 0.32 - bolaV.y * 0.03);
  marca.visible = false;
  if (estado.fase === "jogo" && G.myTeam && bolaV.y > 0.2) {
    const q = F.queda({ ...bolaV, efeito: bolaV.efeito || 0 }, 3);
    if (q && F.ladoDe(q.z) === G.myTeam) { marca.visible = true; marca.position.set(q.x, 0.02, q.z); marca.material.opacity = 0.45 + 0.35 * Math.abs(Math.sin(tp / 150)); }
  }
  // a mira do ataque (com o ataque armado, ou na minha vez de sacar)
  const sacando = me && estado.sacador === me.id && estado.fase === "saque";
  const golpeMira = me && (sacando ? "saque" : me.armado && me.armado.intencao === "ataque" ? "frente" : null);
  mira3d.visible = !!golpeMira;
  if (golpeMira) { const fake = { jogadores: jogadores.map((j) => ({ ...j, team: (G.atletas.get(j.id) || {}).team })) }; const a = F.alvoAtaque(fake, me, golpeMira, mira); mira3d.position.set(a.x, 0.03, a.z); mira3d.rotation.z += dt * 2; }
  // o meu anel: azul armado para passar, laranja para atacar
  meuAnel.visible = !!(me && me.armado);
  if (meuAnel.visible) { meuAnel.position.set(me.x, 0.025, me.z); meuAnel.material.color.set(me.armado.intencao === "ataque" ? 0xffb84d : 0x4fc3f7); meuAnel.scale.setScalar(1 + 0.08 * Math.sin(tp / 90)); }
  // os atletas: andam, olham para a bola (do lado deles) e animam
  for (const j of jogadores) {
    const a = G.atletas.get(j.id); if (!a) continue;
    const local = me && j.id === me.id && !G.offline ? me : j;
    a.pronto = !!local.armado || (estado.fase === "jogo" && F.ladoDe(bolaV.z) === a.team);
    const perto = F.ladoDe(bolaV.z) === a.team && Math.hypot(bolaV.x - local.x, bolaV.z - local.z) < 9;
    a.atualizar(local, perto ? bolaV : null, dt);
  }
  for (const t of G.torcida) { t.fase += dt; t.a.atualizar({ x: t.l.x, y: t.l.y || 0, z: t.l.z, vx: 0, vz: 0 }, { x: bolaV.x, z: bolaV.z }, dt); }
  atualizarPegadas(dt); atualizarGraos(dt);
  // câmera: alta, atrás do meu time, vendo a quadra inteira de cima (como numa transmissão). Ela anda junto com o
  // atleta: para os lados e para a frente e para trás (chega mais perto da rede quando ele sobe para atacar), e olha
  // para um ponto entre ele e a rede. Quem assiste vê de lado, seguindo a bola.
  const s = F.sinal(G.myTeam || "A");
  if (me) {
    const fundo = s * clamp(me.z * s, 0.5, Q.MZ + 1.6); // o z do atleta, do meu lado
    _alvoCam.set(me.x * 0.7, 10.5, fundo + s * 9.5);
    G.camPos.lerp(_alvoCam, Math.min(1, dt * 4)); cam.position.copy(G.camPos);
    _olhar.set(me.x * 0.55 + bolaV.x * 0.1, 0.6, fundo * 0.35 - s * 2.2);
    G.camOlhar.lerp(_olhar, Math.min(1, dt * 5)); cam.lookAt(G.camOlhar);
  } else { cam.position.lerp(_alvoCam.set(20, 11, bolaV.z * 0.35), Math.min(1, dt * 2)); cam.lookAt(0, 1.2, bolaV.z * 0.35); }
  hud(estado, me);
  renderer.render(scene, cam);
}
// online: posições e bola no instante t (entre dois pacotes)
function interpolar(t) {
  const q = G.buf; if (!q.length) return null;
  let i = q.length - 1; while (i > 0 && q[i - 1].t > t) i--;
  const B = q[i], A = q[Math.max(0, i - 1)], k = B.t === A.t ? 1 : Math.max(0, Math.min(1, (t - A.t) / (B.t - A.t)));
  const L = (a, b) => a + (b - a) * k;
  const j = B.j.map((e) => { const a = A.j.find((x) => x[0] === e[0]) || e; return { id: e[0], x: L(a[1], e[1]), z: L(a[2], e[2]), vx: e[3], vz: e[4], armado: e[5] ? { intencao: e[5] === 2 ? "ataque" : "passe" } : null }; });
  const b = { x: L(A.b[0], B.b[0]), y: L(A.b[1], B.b[1]), z: L(A.b[2], B.b[2]), vx: B.b[3], vy: B.b[4], vz: B.b[5], efeito: B.b[6] };
  return { j, b };
}
function hud(est, me) {
  const sw = (t) => `<i style="background:${COR[t]}"></i>`, sac = (t) => (est.sacaTime === t && est.fase === "saque" ? " · saque" : "");
  const pos = est.posse, toq = pos ? `<span class="toq">${[1, 2, 3].map((n) => `<i class="${n <= pos.toques ? "on" : ""}" style="${n <= pos.toques ? `background:${COR[pos.time]}` : ""}"></i>`).join("")}</span>` : `<span class="toq"><i></i><i></i><i></i></span>`;
  const html = `<div class="t">${sw("A")}Amarelo${sac("A")}</div><div class="g">${est.placar.A}</div><div class="p"><b>SET ATÉ ${est.cfg.pontos}</b>${toq}</div><div class="g">${est.placar.B}</div><div class="t">${sac("B")}Azul${sw("B")}</div>`;
  if ($("hTop")._h !== html) { $("hTop")._h = html; $("hTop").innerHTML = html; }
  const info = me ? (est.sacador === me.id && est.fase === "saque" ? "Seu saque: mire com o direcional e aperte passar ou atacar" : "") : "Assistindo";
  if ($("hInfo")._h !== info) { $("hInfo")._h = info; $("hInfo").textContent = info; }
  if (performance.now() > G.msgAte && $("hMsg").innerHTML) $("hMsg").innerHTML = "";
  if (performance.now() > G.golpeAte && $("hGolpe").classList.contains("on")) $("hGolpe").classList.remove("on");
  const arm = me && me.armado, cls = "hud " + (arm ? arm.intencao : "hidden"), txt = arm ? (arm.intencao === "ataque" ? "ATACAR" : "PASSAR") : "";
  if ($("hArm")._h !== cls + txt) { $("hArm")._h = cls + txt; $("hArm").className = cls; $("hArm").textContent = txt; }
}

telaInicial();
if (!urlCode) show("home");
requestAnimationFrame(frame);
if (location.hash === "#debug") window.__futevolei = { G, F, toque, keys, scene, cam, renderer, get S() { return S; }, congelar: (on = true) => (G.congelado = on),
  avancar: (seg) => { for (let i = 0; i < seg * 60; i++) { G.adiant = (G.adiant || 0) + 1000 / 60; const { dir } = entrada(); if (G.me && (G.m.fase === "jogo" || G.m.fase === "saque")) F.mover(G.me, G.m.fase === "jogo" ? ima(G.me, G.m.bola, dir) : dir, 1 / 60, G.m); F.passo(G.m, 1 / 60, agoraTreino()); for (const e of G.m.ev.splice(0)) aoEvento(e); } } };
