// Tênis de Mesa da Galera — o jogo no navegador: telas, a mesa em 3D (Three.js), as raquetes, o robô, os sons e a
// rede. As regras (o voo da bola, o juiz, a raquetada, o placar e o robô) ficam em regras.js (window.PingPong), as
// mesmas do servidor.
// É o Table Tennis Pro: a câmera fica atrás da mesa, no alto, e vira um pouco atrás da minha raquete; as duas
// raquetes flutuam (sem jogador). Segurando o mouse (ou o dedo), arrasto a raquete pelo meu lado da mesa; a altura vai
// sozinha atrás da bola, e ela bate quando a bola (já quicada do meu lado) chega nela. O arrasto nessa hora decide o
// golpe: para a frente é força, para o lado é mira. Soltou, a raquete vai atrás da bola sozinha. O saque: a bola fica
// parada na frente da raquete e eu arrasto a raquete para a frente passando por ela (ou dou um toque).
// Online, quem bate manda a batida e quem recebe decide o ponto (ver pingpong.js). No treino, tudo roda aqui.
import * as THREE from "three";
import { canvasTex, M } from "/pelada/tex.js";

const P = window.PingPong, { MESA } = P, { $, h, store } = Comum;
const toast = Comum.criarToast(3000), socket = io("/pingpong"), relogio = Comum.relogio(), act = Comum.criarAct(socket, toast);
const DIFS = [["facil", "😌 Fácil"], ["medio", "🙂 Médio"], ["dificil", "😤 Difícil"]];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
// a raquete alcança a bola até ALCANCE para o lado e ALTURA para cima ou para baixo; o ponteiro anda num plano a
// PLANO_Y; solta, a raquete vai atrás da bola a AUTO m/s
const ALCANCE = 0.26, ALTURA = 0.34, PLANO_Y = MESA.H + 0.15, REPOUSO_Y = MESA.H + 0.2, AUTO = 3.2;
let S = null, ME = null, urlCode = new URLSearchParams(location.search).get("sala");
// G: a partida que está na tela. est: placar/fase (no online é o do servidor; no treino, montado aqui)
const G = { active: false, offline: false, pausa: false, lado: 0, eu: -1, est: null, bola: null, rally: null, julgou: false, raq: [null, null], hist: [], tj: 0, batidas: 0, ultMsg: 0, ultEnvio: 0, bot: null, dif: "medio", arrasta: false };
const agora = () => (G.offline ? Date.now() + (G.adiant || 0) : relogio.agora()); // no treino, o relógio é o daqui (os testes adiantam)

// ======================================================================
// 3D: o ginásio, a mesa, a bola e as raquetes
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9775c);
const cam = new THREE.PerspectiveCamera(35, 1, 0.05, 60);
// o ponteiro é lido por uma câmera parada no lugar de sempre (a de verdade vira atrás da raquete; se o ponteiro fosse
// lido por ela, a raquete andaria sozinha quando a câmera anda)
const camRef = new THREE.PerspectiveCamera(35, 1, 0.05, 60);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8704f, 1.6));
const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(1.5, 7, 3); sol.castShadow = true;
Object.assign(sol.shadow.camera, { left: -3, right: 3, top: 4, bottom: -4, near: 1, far: 14 }); sol.shadow.mapSize.set(1024, 1024); sol.shadow.bias = -0.0005;
scene.add(sol);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight;
  cam.fov = cam.aspect < 1 ? 62 : cam.aspect < 1.4 ? 45 : 35; // em pé no celular, mais aberta para caber a mesa
  cam.updateProjectionMatrix(); camRef.aspect = cam.aspect; camRef.fov = cam.fov; camRef.updateProjectionMatrix();
}
addEventListener("resize", resize);

(function ginasio() {
  const add = (o) => (scene.add(o), o);
  // o chão coral
  const pisoT = canvasTex(256, 256, (x, w, hh, r) => { x.fillStyle = "#ec7a5e"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "120,40,20" : "255,220,200"},${0.04 + r() * 0.05})`; x.fillRect(r() * w, r() * hh, 2, 2); } }, true);
  pisoT.repeat.set(10, 10);
  const chao = add(new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: pisoT, roughness: 0.9 }))); chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true;
  // as paredes azuis acolchoadas em volta, com as estrelas e o 40 (a bola de 40 mm)
  const desenhoParede = (x, w, hh) => {
    const g = x.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, "#1f5be0"); g.addColorStop(1, "#0f3cb0"); x.fillStyle = g; x.fillRect(0, 0, w, hh);
    x.fillStyle = "#ffffff55"; x.font = "bold 90px Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("40", w / 2, hh * 0.58);
    x.font = "bold 40px Arial"; for (const [dx, dy] of [[-70, -62], [-25, -78], [25, -78], [70, -62]]) x.fillText("★", w / 2 + dx, hh * 0.58 + dy);
    x.fillStyle = "#0a2a80"; x.fillRect(0, 0, 8, hh); x.fillRect(w - 8, 0, 8, hh);
  };
  const parede = (larg, x, z, ry) => {
    const t = canvasTex(512, 256, desenhoParede, true); t.repeat.set(larg / 2.4, 1);
    const m = add(new THREE.Mesh(new THREE.BoxGeometry(larg, 1.2, 0.3), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }))); m.position.set(x, 0.6, z); m.rotation.y = ry; m.receiveShadow = true;
  };
  parede(9, 0, -5, 0); parede(12, -4.5, 0.5, Math.PI / 2); parede(12, 4.5, 0.5, -Math.PI / 2);
  // a mesa: azul com as bordas brancas e a linha do meio
  const tampoT = canvasTex(512, 920, (x, w, hh) => {
    x.fillStyle = "#4f6fc6"; x.fillRect(0, 0, w, hh); const lw = 14;
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, lw); x.fillRect(0, hh - lw, w, lw); x.fillRect(0, 0, lw, hh); x.fillRect(w - lw, 0, lw, hh); x.fillRect(w / 2 - 4, 0, 8, hh);
  });
  tampoT.anisotropy = 8;
  const azul = M(0x3d5bb0), branco = M(0xffffff);
  const tampo = add(new THREE.Mesh(new THREE.BoxGeometry(MESA.W, 0.04, MESA.L), [azul, azul, new THREE.MeshStandardMaterial({ map: tampoT, roughness: 0.55 }), azul, branco, branco]));
  tampo.position.y = MESA.H - 0.02; tampo.receiveShadow = tampo.castShadow = true;
  // os pés pretos, inclinados, com as barras
  const preto = M(0x111111, { roughness: 0.5 });
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) { const pe = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, MESA.H - 0.04, 0.07), preto)); pe.position.set(sx * (MESA.W / 2 - 0.12), (MESA.H - 0.04) / 2, sz * (MESA.L / 2 - 0.25)); pe.rotation.x = sz * 0.12; pe.castShadow = true; }
    const barra = add(new THREE.Mesh(new THREE.BoxGeometry(MESA.W - 0.24, 0.05, 0.05), preto)); barra.position.set(0, 0.2, sz * (MESA.L / 2 - 0.3));
  }
  const meio = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, MESA.L - 0.6), preto)); meio.position.set(0, 0.2, 0);
  // a rede: malha preta, a fita branca em cima e os postes
  const telaT = canvasTex(32, 32, (x, w) => { x.strokeStyle = "#111"; x.lineWidth = 3; x.strokeRect(0, 0, w, w); }, true); telaT.repeat.set((MESA.W + 2 * MESA.POSTE) / 0.012, MESA.REDE / 0.012);
  const rede = add(new THREE.Mesh(new THREE.PlaneGeometry(MESA.W + 2 * MESA.POSTE, MESA.REDE - 0.012), new THREE.MeshBasicMaterial({ map: telaT, alphaTest: 0.3, side: THREE.DoubleSide, transparent: true })));
  rede.position.y = MESA.H + (MESA.REDE - 0.012) / 2;
  const fita = add(new THREE.Mesh(new THREE.BoxGeometry(MESA.W + 2 * MESA.POSTE, 0.014, 0.006), M(0xf6f6f2))); fita.position.y = MESA.H + MESA.REDE - 0.007;
  for (const s of [-1, 1]) { const p = add(new THREE.Mesh(new THREE.BoxGeometry(0.025, MESA.REDE + 0.03, 0.03), preto)); p.position.set(s * (MESA.W / 2 + MESA.POSTE), MESA.H + MESA.REDE / 2, 0); }
})();

// ---------- a bola: amarela, um pouco maior que a de verdade para dar para ver ----------
const bola = new THREE.Mesh(new THREE.SphereGeometry(0.034, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf6ea1c, roughness: 0.35, emissive: 0x3a3500 }));
scene.add(bola);
const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
sombra.rotation.x = -Math.PI / 2; scene.add(sombra);

// ---------- a raquete flutuando: borracha vermelha dos dois lados, borda escura e o cabo de madeira ----------
// No grupo: o centro da lâmina na origem, o cabo para −y e a borracha virada para ±z.
function raquete() {
  const g = new THREE.Group();
  const lam = (cor, z, r, alt) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, alt, 32), M(cor, { roughness: 0.75 })); d.rotation.x = Math.PI / 2; d.position.z = z; d.scale.z = 1.07; d.castShadow = true; g.add(d); return d; };
  lam(0x3a2414, 0, 0.078, 0.008); lam(0xf01f1f, 0.0045, 0.076, 0.002); lam(0xf01f1f, -0.0045, 0.076, 0.002);
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.1, 10), M(0xc8924f, { roughness: 0.6 })); cabo.position.y = -0.125; cabo.castShadow = true; g.add(cabo);
  const ponta = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 10), M(0x444444)); ponta.position.y = -0.18; g.add(ponta);
  g.scale.setScalar(1.25); scene.add(g); return g;
}
const raqMesh = [raquete(), raquete()];
// o estado de cada raquete: onde está (x, z no chão do meu lado; y sozinha), a velocidade (o arrasto) e o golpe
const novaRaq = (lado) => ({ x: 0, y: REPOUSO_Y, z: P.S(lado) * (MESA.L / 2 + 0.3), vx: 0, vz: 0, yAlvo: REPOUSO_Y, tc: -1, preverEm: 0, golpe: null, alvo: null });

// ======================================================================
// Sons (sintetizados: o toque seco da bola na raquete e na mesa)
// ======================================================================
const Som = (() => {
  let ac = null, vol = store.get("pingpong:vol") ?? 0.7, master = null, ruido = null;
  const ctx = () => {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination); const n = ac.sampleRate * 0.2; ruido = ac.createBuffer(1, n, ac.sampleRate); const d = ruido.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } catch { return null; } }
    if (ac.state === "suspended") ac.resume(); return ac;
  };
  function tom(f0, f1, dur, ganho, tipo = "sine") { const c = ctx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02); }
  function toque(freq, q, dur, ganho) { const c = ctx(); if (!c) return; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; s.buffer = ruido; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02); }
  return {
    get vol() { return vol; }, setVol(v) { vol = v; store.set("pingpong:vol", v); if (master) master.gain.value = v; }, unlock: ctx,
    raquete() { toque(1700, 4, 0.05, 0.8); tom(900, 600, 0.04, 0.25, "triangle"); },
    mesa() { toque(3200, 7, 0.04, 0.45); tom(2300, 1500, 0.03, 0.12, "triangle"); },
    chao() { toque(1800, 5, 0.05, 0.22); }, rede() { toque(400, 1.5, 0.12, 0.35); },
    ponto() { tom(660, 990, 0.18, 0.12); }, perdeu() { tom(330, 200, 0.25, 0.12, "sawtooth"); },
  };
})();

// ======================================================================
// Telas: inicial (amistoso, torneio, mundial e com amigos) e sala de espera
// ======================================================================
function show(id) { for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id); $("game").classList.toggle("hidden", id !== "game"); $("bar").classList.toggle("hidden", id === "game"); }
const seg = (el, ops, atual, attr, dis = "") => ($(el).innerHTML = ops.map(([v, t]) => `<button ${attr}="${v}" class="${String(atual) === String(v) ? "on" : ""}" ${dis}>${t}</button>`).join(""));
const PAISES = [["br", "🇧🇷", "Brasil"], ["ar", "🇦🇷", "Argentina"], ["us", "🇺🇸", "Estados Unidos"], ["ca", "🇨🇦", "Canadá"], ["jp", "🇯🇵", "Japão"], ["cn", "🇨🇳", "China"], ["kr", "🇰🇷", "Coreia do Sul"], ["in", "🇮🇳", "Índia"], ["de", "🇩🇪", "Alemanha"], ["fr", "🇫🇷", "França"], ["gb", "🇬🇧", "Reino Unido"], ["se", "🇸🇪", "Suécia"], ["es", "🇪🇸", "Espanha"], ["it", "🇮🇹", "Itália"], ["au", "🇦🇺", "Austrália"], ["ng", "🇳🇬", "Nigéria"]];
const RODADAS = { amistoso: 1, torneio: 4, mundial: 8 }, TITULOS = { amistoso: "Amistoso", torneio: "Torneio", mundial: "Campeonato Mundial" };
let modoSolo = "amistoso";
const pais = (id) => PAISES.find((p) => p[0] === id) || PAISES[0];
const paisEscolhido = () => store.get("pingpong:pais") || "br";
const chaveCampanha = (modo) => `pingpong:campanha:${modo}:${paisEscolhido()}`;
const etapa = (modo) => Math.max(0, Math.min(RODADAS[modo] - 1, +(store.get(chaveCampanha(modo)) || 0)));
function adversario(modo, rodada) {
  const outros = PAISES.filter((p) => p[0] !== paisEscolhido());
  const indice = (PAISES.findIndex((p) => p[0] === paisEscolhido()) * 3 + rodada * 5 + (modo === "mundial" ? 7 : 0)) % outros.length;
  return outros[indice];
}
function atualizarSolo() {
  $("soloTitle").textContent = TITULOS[modoSolo];
  $("hCountries").innerHTML = PAISES.map(([id, bandeira, nome]) => `<button data-country="${id}" class="${paisEscolhido() === id ? "on" : ""}" aria-pressed="${paisEscolhido() === id}" title="${nome}"><b>${bandeira}</b>${nome}</button>`).join("");
  const rodada = etapa(modoSolo), total = RODADAS[modoSolo], rival = adversario(modoSolo, rodada);
  $("soloProgress").classList.toggle("hidden", total === 1);
  $("soloProgress").innerHTML = Array.from({ length: total }, (_, i) => `<span class="${i < rodada ? "done" : i === rodada ? "current" : ""}">${i < rodada ? "✓" : i === rodada ? "●" : "○"}<br>${modoSolo === "mundial" && i === 7 ? "Final" : modoSolo === "torneio" && i === 3 ? "Final" : `Jogo ${i + 1}`}</span>`).join("");
  $("soloPreview").textContent = `${pais(paisEscolhido())[1]} ${pais(paisEscolhido())[2]}  ×  ${rival[1]} ${rival[2]} · 11 pontos`;
  $("btnPractice").textContent = rodada ? "Continuar campeonato" : "Entrar na mesa";
}
function abrirModo(modo) {
  if (modo === "online") { $("soloSetup").classList.add("hidden"); $("onlineSetup").classList.remove("hidden"); }
  else { modoSolo = modo; $("onlineSetup").classList.add("hidden"); $("soloSetup").classList.remove("hidden"); atualizarSolo(); }
  $("homeHelp").classList.add("hidden");
}
function fecharModo() { $("soloSetup").classList.add("hidden"); $("onlineSetup").classList.add("hidden"); $("homeHelp").classList.remove("hidden"); }
function telaInicial() { seg("hDif", DIFS, store.get("pingpong:dif") || "medio", "data-hdif"); atualizarSolo(); }
$("btnBackMode").onclick = fecharModo;
$("btnBackOnline").onclick = fecharModo;
$("hOnlineName").oninput = () => { $("hName").value = $("hOnlineName").value; };
$("hName").oninput = () => { $("hOnlineName").value = $("hName").value; };
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.mode) abrirModo(b.dataset.mode);
  else if (b.dataset.country) { store.set("pingpong:pais", b.dataset.country); atualizarSolo(); }
  else if (b.dataset.hdif) { store.set("pingpong:dif", b.dataset.hdif); telaInicial(); }
  else if (b.dataset.lado != null && S) act("lado", { lado: +b.dataset.lado });
  else if (b.dataset.cpontos && S) act("config", { config: { ...S.config, pontos: +b.dataset.cpontos } });
  else if (b.dataset.cgames && S) act("config", { config: { ...S.config, games: +b.dataset.cgames } });
});
const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
const jogador = (id) => S && S.players.find((p) => p.id === id);
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id, dis = isHost ? "" : "disabled";
  const linha = (p) => `<div class="pl ${ME && p.id === ME.id ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "👑 " : ""}${h(p.name)}</div>`;
  for (const l of [0, 1]) {
    const p = jogador(S.lados[l]);
    $("l" + l).innerHTML = p ? linha(p) : `<div class="pl muted" style="font-weight:500">vaga livre</div>`;
    document.querySelector(`[data-lado="${l}"]`).classList.toggle("hidden", !mine || !!p);
  }
  const fora = S.players.filter((p) => !S.lados.includes(p.id)); $("lN").innerHTML = fora.length ? fora.map(linha).join("") : "Ninguém.";
  document.querySelector('[data-lado="-1"]').classList.toggle("hidden", !mine || !S.lados.includes(mine.id));
  seg("cPontos", [[11, "11 pontos"], [21, "21 pontos"]], S.config.pontos, "data-cpontos", dis);
  seg("cGames", [[1, "1 game"], [3, "3 games"]], S.config.games, "data-cgames", dis);
  $("startBox").innerHTML = isHost ? `<button class="primary" id="btnStart" style="width:100%">🏓 Começar</button>` : `<p class="muted">Esperando o organizador começar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}
$("btnPractice").onclick = () => comecarTreino(modoSolo);
$("btnPractice2").onclick = () => comecarTreino("treino");

// ======================================================================
// Rede: entrar, criar, estado, batidas e raquetes
// ======================================================================
$("hName").value = store.get("galera:name") || "";
$("hOnlineName").value = $("hName").value;
if (urlCode) $("hCode").value = urlCode.toUpperCase();
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("pingpong:" + r.code, ME);
  history.replaceState(null, "", "/pingpong/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, config: store.get("pingpong:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("pingpong:" + code) || {};
  socket.emit("join", { code, name, id: saved.id, token: saved.token }, enter);
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
function comecarTreino(modo = "amistoso") {
  if (G.active) pararJogo();
  const rodada = RODADAS[modo] ? etapa(modo) : 0;
  const escolhido = store.get("pingpong:dif") || "medio";
  const dif = modo === "mundial" && rodada >= 5 ? "dificil" : modo === "torneio" && rodada >= 3 && escolhido === "facil" ? "medio" : escolhido;
  Object.assign(G, { offline: true, soloMode: modo, rodada, eu: 0, lado: 0, dif, bot: { lado: 1, x: 0, z: -(MESA.L / 2 + 0.5), y: REPOUSO_Y, vx: 0, vz: 0 } });
  const rival = adversario(modo === "treino" ? "amistoso" : modo, rodada);
  G.nomes = [modo === "treino" ? "Você" : $("hName").value.trim() || "Você", modo === "treino" ? "Robô" : rival[2]];
  G.bandeiras = [modo === "treino" ? "🏓" : pais(paisEscolhido())[1], modo === "treino" ? "🤖" : rival[1]];
  G.est = { phase: "jogo", placar: P.novoPlacar({ pontos: 11, games: 1 }, Math.random() < 0.5 ? 0 : 1), prontoEm: agora() + 1200, ultimo: null };
  iniciar();
}
function comecarOnline() {
  if (G.active) pararJogo();
  const eu = ME && ME.id ? S.lados.indexOf(ME.id) : -1;
  Object.assign(G, { offline: false, eu, lado: eu >= 0 ? eu : 0, est: S, bot: null });
  G.nomes = S.lados.map((id) => (jogador(id) || {}).name || "?");
  G.bandeiras = ["🔵", "🔴"];
  iniciar();
}
function iniciar() {
  Object.assign(G, { active: true, pausa: false, bola: null, rally: null, julgou: false, hist: [], arrasta: false, sacadorVisto: null }); acumulado = 0;
  G.raq = [novaRaq(0), novaRaq(1)];
  show("game"); resize(); $("over").classList.add("hidden"); $("pause").classList.add("hidden");
  camAlvo(1); Som.unlock(); last = performance.now();
}
function pararJogo() { G.active = false; G.arrasta = false; $("game").classList.remove("arrastando"); }
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
  G.bola = b; G.rally = { quem, saque, quiques: [] }; G.julgou = false;
  Som.raquete();
  const r = G.raq[quem]; if (r) { r.golpe = { t0: G.tj, forca: clamp((P.kmh(b) - 15) / 40, 0.2, 1) }; r.tc = -1; }
}
// eu bato (ou saco): calcula aqui e manda para o outro
function euBato(b, saque) {
  novaBatida(b, G.eu, saque); if (!saque) G.batidas++;
  if (!G.offline) socket.emit("bola", { p: b.p, v: b.v, saque, t: agora(), w: b.w || null });
}
function receberBola(d) {
  const b = { p: d.p.slice(), v: d.v.slice(), viva: true, w: d.w ? d.w.slice() : [0, 0, 0] };
  novaBatida(b, d.quem, d.saque);
  voarJulgando(Math.max(0, Math.min(0.5, (agora() - d.t) / 1000))); // a bola já andou o tempo que o pacote levou
}
// anda a bola e passa os eventos pelo juiz; quem julga é quem recebe (no treino, sempre aqui)
function voarJulgando(dt) {
  const b = G.bola; if (!b || !b.viva) return;
  for (const e of P.voar(b, dt)) {
    if (e.tipo === "quique") Som.mesa(); else if (e.tipo === "rede") Som.rede(); else if (e.tipo === "chao") Som.chao();
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
  est.prontoEm = agora() + (r.fimGame ? 2000 : 1200);
  if (r.fim) est.phase = "fim";
  aoPonto(est.ultimo);
  if (r.fim) mostrarFim();
}
function aoPonto(u) {
  G.rally = null;
  if (G.eu >= 0) (u.lado === G.eu ? Som.ponto : Som.perdeu)();
}
function msg(t, ms = 1300) { const m = $("hMsg"); m.innerHTML = t; m.classList.remove("pop"); void m.offsetWidth; m.classList.add("pop"); G.ultMsg = performance.now() + ms; }
function mostrarFim() {
  const pl = estado().placar; if (!pl || pl.vencedor == null) return;
  const ganhei = pl.vencedor === G.eu, nome = G.nomes[pl.vencedor] || "?";
  if (ganhei) Comum.confetti();
  const isHost = !G.offline && ME && S && S.host === ME.id;
  const modo = G.soloMode, total = RODADAS[modo] || 1, campeao = G.offline && ganhei && G.rodada + 1 >= total;
  if (G.offline && ganhei && total > 1) store.set(chaveCampanha(modo), campeao ? 0 : G.rodada + 1);
  $("overBox").innerHTML = `<h2>${campeao && modo !== "amistoso" ? "🏆 Você é campeão!" : ganhei ? "🏓 Você venceu!" : `🏓 ${h(nome)} venceu`}</h2>
    <p class="muted">Placar: ${pl.config.games > 1 ? `games ${pl.games[0]} x ${pl.games[1]}` : `${pl.pts[0]} x ${pl.pts[1]}`}</p>
    <div class="row" style="margin-top:14px">${G.offline ? `<button class="primary" id="bDeNovo">${ganhei && !campeao && total > 1 ? "Próxima partida" : "Jogar de novo"}</button>` : isHost ? `<button class="primary" id="bDeNovo">Voltar para a sala</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" id="bSair">Sair</button></div>`;
  $("over").classList.remove("hidden");
  $("bSair").onclick = () => { $("over").classList.add("hidden"); if (!G.offline && S) act("lado", { lado: -1 }); sair(); };
  if ($("bDeNovo")) $("bDeNovo").onclick = () => { $("over").classList.add("hidden"); if (G.offline) comecarTreino(modo); else act("lobby"); };
}

// ======================================================================
// Controles: segurar e arrastar leva a raquete; o toque saca
// ======================================================================
const ray = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLANO_Y), ponto = new THREE.Vector3(), ndc = new THREE.Vector2(0, -0.6);
let toqueIni = null; // onde e quando o dedo (ou o botão) desceu: um toque rápido, sem arrastar, saca
const lerPonteiro = (e) => ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
const jogo = $("game");
jogo.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, .overlay")) return;
  lerPonteiro(e); G.arrasta = true; G.hist = []; jogo.classList.add("arrastando");
  toqueIni = { x: e.clientX, y: e.clientY, t: performance.now() };
  try { jogo.setPointerCapture(e.pointerId); } catch {}
});
jogo.addEventListener("pointermove", (e) => { if (G.arrasta) lerPonteiro(e); });
function soltar(e) {
  if (!G.arrasta) return;
  G.arrasta = false; jogo.classList.remove("arrastando");
  const t = toqueIni; toqueIni = null;
  if (t && e && performance.now() - t.t < 300 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 12 && G.active && !G.pausa && G.eu >= 0 && podeSacar(G.eu)) sacar({ frente: 2.5, lat: 0 });
}
jogo.addEventListener("pointerup", soltar);
jogo.addEventListener("pointercancel", soltar);
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && G.active) pausar(!G.pausa);
  if ((e.key === " " || e.key === "Enter") && G.active && !G.pausa && G.eu >= 0 && podeSacar(G.eu)) { e.preventDefault(); sacar({ frente: 2.5, lat: 0 }); }
});
$("hSair").onclick = () => pausar(true);
$("btnResume").onclick = () => pausar(false);
$("btnLeave").onclick = () => { pausar(false); if (!G.offline && S) act("lado", { lado: -1 }); sair(); };
$("vol").value = Som.vol; $("volV").textContent = Math.round(Som.vol * 100) + "%";
$("vol").oninput = (e) => { Som.setVol(+e.target.value); $("volV").textContent = Math.round(Som.vol * 100) + "%"; };
function pausar(on) { G.pausa = on && G.offline; $("pause").classList.toggle("hidden", !on); } // online o jogo não para: só abre o menu

// o saque: a bola parada na frente da raquete de quem saca sai com o arrasto do momento
const bolaDoSaque = (r, lado) => [clamp(r.x, -0.6, 0.6) * 0.8, MESA.H + 0.2, P.S(lado) * P.SAQUE_Z];
function sacar(golpe) { const r = G.raq[G.eu]; euBato(P.sacar(G.eu, r.x, golpe, P.SAQUE_Z), true); }

// a minha raquete: arrastando, vai para onde o ponteiro aponta, presa ao meu lado da mesa; solta, vai atrás da bola
// sozinha. A altura vai sempre sozinha até onde a bola vai passar.
function moverMinhaRaq(dt) {
  const r = G.raq[G.eu], s = P.S(G.eu);
  if (G.arrasta) {
    ray.setFromCamera(ndc, camRef);
    if (ray.ray.intersectPlane(plano, ponto)) { r.x = clamp(ponto.x, -1.4, 1.4); r.z = s * clamp(s * ponto.z, 0.25, MESA.L / 2 + 1.0); }
  } else { // solta: vai até onde a bola vai estar boa para bater (a curta, em cima da mesa)
    if ((G.autoEm = (G.autoEm || 0) - dt) <= 0) {
      G.autoEm = 0.06;
      const pv = G.bola && G.bola.viva && G.rally && G.rally.quem !== G.eu ? P.prever(G.bola, G.rally, G.eu) : null;
      G.autoAlvo = pv ? { x: pv.x, z: pv.z + s * 0.05 } : { x: 0, z: s * (MESA.L / 2 + 0.3) };
    }
    const a = G.autoAlvo || { x: 0, z: r.z };
    r.x += clamp(a.x - r.x, -AUTO * dt, AUTO * dt);
    r.z = s * clamp(s * (r.z + clamp(a.z - r.z, -AUTO * dt, AUTO * dt)), 0.25, MESA.L / 2 + 1.0);
  }
  // o arrasto: a velocidade da raquete nos últimos ~90 ms (para a frente, pelo movimento na tela, que não satura perto
  // da rede); solta, a raquete devolve macio
  const t = G.tj * 1000; G.hist.push({ t, x: r.x, ny: ndc.y }); while (G.hist.length > 2 && t - G.hist[0].t > 90) G.hist.shift();
  const h0 = G.hist[0], d = Math.max(0.016, (t - h0.t) / 1000);
  if (G.arrasta) { r.vx = clamp((r.x - h0.x) / d, -8, 8); r.vz = clamp(-s * (ndc.y - h0.ny) * 1.3 / d, -11, 11); }
  else { r.vx = 0; r.vz = -s * 2; }
  alturaSozinha(r, G.eu, dt);
  // o saque: arrastando a raquete para a frente com força
  if (G.arrasta && podeSacar(G.eu) && -s * r.vz > 3) sacar({ frente: -s * r.vz, lat: r.vx });
}
// a altura da raquete (minha e do robô): de tempos em tempos prevê onde a bola cruza o plano dela e vai para lá
function alturaSozinha(r, lado, dt) {
  const b = G.bola, vem = b && b.viva && G.rally && G.rally.quem !== lado;
  r.preverEm -= dt; if (r.tc > 0) r.tc -= dt;
  if (!vem) { r.yAlvo = REPOUSO_Y; r.tc = -1; }
  else if (r.preverEm <= 0) {
    r.preverEm = 0.05;
    const pv = P.prever(b, G.rally, lado, r.z) || P.prever(b, G.rally, lado);
    if (pv) { r.yAlvo = clamp(pv.y, MESA.H + 0.02, MESA.H + 0.95); r.tc = pv.t; }
  }
  r.y = lerp(r.y, r.yAlvo, 1 - Math.exp(-dt * 22));
}
// a bola passou pela raquete? então rebate, no ponto em que ela cruzou o plano da raquete
function tentarRebater(lado, raq, pAntes, rzAntes, batida) {
  const b = G.bola, s = P.S(lado);
  if (!b || !b.viva || !P.podeRebater(G.rally, lado)) return false;
  const antes = (pAntes[2] - rzAntes) * s, depois = (b.p[2] - raq.z) * s;
  if (!(antes < 0.03 && depois >= -0.03)) return false;
  const k = depois - antes > 1e-6 ? clamp(-antes / (depois - antes), 0, 1) : 1, p = [0, 1, 2].map((i) => lerp(pAntes[i], b.p[i], k));
  if (Math.abs(p[0] - raq.x) > ALCANCE || Math.abs(p[1] - raq.y) > ALTURA) return false;
  b.p = [p[0], p[1], raq.z - s * 0.01];
  P.rebater(b, batida ? batida() : raq, lado);
  return true;
}

// ======================================================================
// Laço do jogo (passos fixos de 1/60 s)
// ======================================================================
let last = performance.now(), acumulado = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.13, (t - last) / 1000); last = t;
  if (!G.active) return;
  if (!G.pausa) {
    acumulado += dt;
    for (let i = 0; acumulado >= 1 / 60 && i < 8; i++) { passo(1 / 60); acumulado -= 1 / 60; }
    if (acumulado > 1 / 60) acumulado = 0;
  } else acumulado = 0;
  desenhar(dt);
  renderer.render(scene, cam);
}
requestAnimationFrame(loop);

function passo(dt) {
  G.tj += dt; // relógio do jogo (o arrasto da raquete é medido nele)
  const b = G.bola, pAntes = b ? b.p.slice() : null, rz = [G.raq[0].z, G.raq[1].z];
  if (G.eu >= 0) moverMinhaRaq(dt);
  if (G.bot) {
    const bot = G.bot, r = G.raq[1];
    P.robo(bot, b, G.rally, dt, G.dif);
    Object.assign(r, { x: bot.x, z: bot.z, vx: bot.vx }); alturaSozinha(r, 1, dt);
    if (podeSacar(1) && agora() > estado().prontoEm + 700) {
      const d = P.DIF[G.dif] || P.DIF.medio, frente = Math.random() < 0.4 ? -2 - Math.random() * 3 : Math.random() * (d.forca[1] - 1);
      novaBatida(P.sacar(1, bot.x, { frente, lat: (Math.random() - 0.5) * 6 }, P.SAQUE_Z), 1, true);
    }
  }
  // a raquete do outro (online): vai até onde ele mandou
  for (const l of [0, 1]) { const r = G.raq[l]; if (l !== G.eu && r.alvo) { const k = 1 - Math.exp(-dt * 18); r.x = lerp(r.x, r.alvo.x, k); r.y = lerp(r.y, r.alvo.y, k); r.z = lerp(r.z, r.alvo.z, k); } }
  if (b && b.viva) {
    voarJulgando(dt);
    if (G.eu >= 0 && G.rally && tentarRebater(G.eu, G.raq[G.eu], pAntes, rz[G.eu])) euBato(G.bola, false);
    else if (G.bot && G.rally && tentarRebater(1, G.raq[1], pAntes, rz[1], () => P.batidaRobo(G.bot, G.bola, G.dif))) novaBatida(G.bola, 1, false);
  } else if (b) P.rolar(b, dt); // a bola morta continua quicando no chão
  // mando a minha raquete ~30 vezes por segundo
  if (!G.offline && G.eu >= 0 && agora() - G.ultEnvio > 33) { G.ultEnvio = agora(); const r = G.raq[G.eu]; socket.volatile.emit("raq", { x: +r.x.toFixed(3), y: +r.y.toFixed(3), z: +r.z.toFixed(3) }); }
}

// ======================================================================
// Desenho: a câmera, a bola, as raquetes e o placar
// ======================================================================
const camPos = new THREE.Vector3(), camOlha = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
// a câmera do Table Tennis Pro: atrás da mesa e no alto, olhando a mesa inteira; vira em volta da mesa atrás da minha
// raquete (com ela à esquerda, a câmera vai para a esquerda e olha a mesa meio de lado)
const CAM = { alto: 1.0, longe: 1.7, olhaY: -0.5, olhaZ: -0.3 }; // medida para a mesa ficar no mesmo lugar da tela do Table Tennis Pro
function camAlvo(k) {
  const l = G.eu >= 0 ? G.eu : 0, s = P.S(l), rx = G.raq[l] ? G.raq[l].x : 0, cel = cam.aspect < 1 ? 0.5 : 0;
  const ang = clamp(rx * 0.18, -0.25, 0.25), d = MESA.L / 2 + CAM.longe + cel;
  camPos.lerp(_a.set(Math.sin(ang) * d * s + rx * 0.25, MESA.H + CAM.alto + cel, Math.cos(ang) * d * s), k);
  camOlha.lerp(_b.set(rx * 0.12, MESA.H + CAM.olhaY, CAM.olhaZ * s), k);
  camRef.position.set(0, MESA.H + CAM.alto + cel, s * d); camRef.lookAt(0, MESA.H + CAM.olhaY, CAM.olhaZ * s); camRef.updateMatrixWorld();
}
// a raquete de pé, com a borracha para a rede; inclina para o lado com o arrasto e bate para a frente no golpe
function posarRaquete(m, r, lado) {
  const s = P.S(lado), g = r.golpe;
  let frente = 0;
  if (g) { const k = (G.tj - g.t0) / 0.25; if (k >= 1) r.golpe = null; else frente = Math.sin(k * Math.PI) * (0.4 + 0.6 * g.forca); }
  m.position.set(r.x, r.y - frente * 0.02, r.z - s * frente * 0.12);
  m.rotation.set(-s * (0.35 + frente * 0.5), lado ? Math.PI : 0, clamp(-(r.vx || 0) * 0.05, -0.5, 0.5) * s);
}
function desenhar(dt) {
  const est = estado(), b = G.bola;
  // a bola: voando, morta no chão, ou parada na frente da raquete de quem vai sacar
  if (b && (G.rally || agora() < (est.prontoEm || 0) - 300)) bola.position.set(b.p[0], b.p[1], b.p[2]);
  else if (est.phase === "jogo") { const l = sacador(), p = bolaDoSaque(G.raq[l], l); bola.position.set(p[0], p[1] + Math.sin(performance.now() / 260) * 0.015, p[2]); }
  const naMesa = Math.abs(bola.position.x) <= MESA.W / 2 && Math.abs(bola.position.z) <= MESA.L / 2 && bola.position.y > MESA.H;
  sombra.position.set(bola.position.x, naMesa ? MESA.H + 0.002 : 0.004, bola.position.z);
  const alt = Math.max(0, bola.position.y - (naMesa ? MESA.H : 0)); sombra.scale.setScalar(1 + alt * 1.2); sombra.material.opacity = 0.4 / (1 + alt * 2.5);
  for (const l of [0, 1]) {
    const tem = G.offline || (est.lados && est.lados[l]);
    raqMesh[l].visible = !!tem; if (tem) posarRaquete(raqMesh[l], G.raq[l], l);
  }
  camAlvo(1 - Math.exp(-dt * 5)); cam.position.copy(camPos); cam.lookAt(camOlha);
  // o placar: a bandeira e o número em cada canto (o meu lado à esquerda); "Troca de saque" quando o saque muda
  const pl = est.placar, nomes = G.nomes || ["?", "?"], band = G.bandeiras || ["", ""];
  if (pl) {
    const ordem = G.eu === 1 ? [1, 0] : [0, 1];
    ordem.forEach((l, canto) => {
      const html = `<div class="fl">${band[l]}</div><div class="nm">${h(nomes[l])}</div><div class="pt">${pl.pts[l]}</div>${pl.config.games > 1 ? `<div class="gm">games ${pl.games[l]}</div>` : ""}`;
      const el = $("pl" + canto); if (el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; }
      el.classList.toggle("saca", pl.sacador === l);
    });
    if (G.sacadorVisto != null && G.sacadorVisto !== pl.sacador && est.phase === "jogo") msg("Troca de saque", 1600);
    G.sacadorVisto = pl.sacador;
  }
  let dica = "";
  if (est.phase === "jogo" && !G.rally && agora() >= (est.prontoEm || 0) && sacador() === G.eu) dica = "Arraste a raquete para a frente passando pela bola para sacar";
  if (dica !== G.dica) { G.dica = dica; $("hHint").innerHTML = dica; $("hHint").classList.toggle("hidden", !dica); }
  if (performance.now() > G.ultMsg) $("hMsg").innerHTML = "";
}

telaInicial();
if (urlCode) abrirModo("online");
// para os testes automáticos (#debug): o estado do jogo
if (location.hash === "#debug") window.__pingpong = {
  G, P, podeSacar, cam, avancar: (s) => { for (let t = 0; t < s; t += 1 / 60) { passo(1 / 60); G.adiant = (G.adiant || 0) + 1000 / 60; } },
  quadro: (dt = 1 / 60) => { desenhar(dt); renderer.render(scene, cam); },
  // onde o ponteiro tem que estar para a raquete ficar no ponto (x, z) da mesa
  tela: (x, z) => { const v = new THREE.Vector3(x, PLANO_Y, z).project(camRef); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; },
};
