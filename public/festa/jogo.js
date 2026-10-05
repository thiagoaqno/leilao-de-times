// Festa da Galera — o jogo no navegador: telas (início e sala), a arena em 3D com os bonecos da Pelada (as skins),
// as telas dos minijogos de botão, a explicação, o resultado de cada minijogo e o pódio. Quem manda em tudo é o
// servidor (festa.js); aqui eu mando os controles e desenho o que chega (~20x por segundo, 100 ms "no passado").
import * as THREE from "three";
import { makePlayer, animate, descartarJogador, configurarBonecos } from "/pelada/bonecos.js";
import { M } from "/pelada/tex.js";

const F = window.Minijogos, C = window.Campo, { $, h, store } = Comum;
const toast = Comum.criarToast(3000), socket = io("/festa"), relogio = Comum.relogio(), act = Comum.criarAct(socket, toast);
const KITS = ["celeste", "laranja", "palmeiras", "rubronegro", "canarinho", "corinthians", "saopaulo", "santos"];
const CORES = ["#3a8dff", "#ff8a2a", "#2fbf5f", "#e53935", "#f5d000", "#e8e8e8", "#c8102e", "#9a9a9a"];
let S = null, ME = null, urlCode = new URLSearchParams(location.search).get("sala");
const G = { snaps: [], corpos: new Map(), cena: null, mjId: null, sub: null, telaId: null, eu: null, inp: { dx: 0, dz: 0, p: 0, a: 0 }, ultEnvio: 0, local: {} };

// ======================================================================
// Telas: início e sala
// ======================================================================
function show(id) { for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id); $("game").classList.toggle("hidden", id !== "game"); $("bar").classList.toggle("hidden", id === "game"); }
const CORES_TITULO = ["#ff5fa2", "#ffc93c", "#33d6e8", "#5ee07a", "#b18cff", "#ff8a2a"];
$("titulo").innerHTML = [..."Festa!"].map((c, i) => `<span style="--c:${CORES_TITULO[i % 6]};--i:${i}">${c}</span>`).join("");
$("listaMJ").innerHTML = F.LISTA.map((id) => `<div class="mj"><i>${F.MJ[id].emoji}</i>${h(F.MJ[id].nome)}</div>`).join("");
const skinBotoes = (atual) => Object.entries(C.SKINS).map(([k, s]) => `<button data-skin="${k}" class="${k === (atual || "padrao") ? "on" : ""}"><i>${s.emoji}</i>${h(s.name)}</button>`).join("");
const telaSkins = () => { $("hSkins").innerHTML = skinBotoes(store.get("galera:skin")); };
telaSkins();
const seg = (el, ops, atual, attr, dis = "") => ($(el).innerHTML = ops.map(([v, t]) => `<button ${attr}="${v}" class="${String(atual) === String(v) ? "on" : ""}" ${dis}>${t}</button>`).join(""));
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.skin) { store.set("galera:skin", b.dataset.skin); telaSkins(); if (ME && ME.id && S) act("skin", { skin: b.dataset.skin }); }
  else if (b.dataset.qtd && S) act("config", { config: { ...S.config, qtd: +b.dataset.qtd } });
  else if (b.dataset.robos && S) act("config", { config: { ...S.config, robos: +b.dataset.robos } });
  else if (b.dataset.kick) act("kick", { id: b.dataset.kick });
});
const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id, dis = isHost ? "" : "disabled", n = S.players.length + S.config.robos;
  $("cont").textContent = `${S.players.length} pessoa${S.players.length === 1 ? "" : "s"} + ${S.config.robos} robô${S.config.robos === 1 ? "" : "s"} (máximo 8)`;
  $("plist").innerHTML = S.players.map((p) => `<div class="pl ${ME && p.id === ME.id ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${p.id === S.host ? "👑 " : ""}${h(p.name)} <span>${(C.SKINS[p.skin] || {}).emoji || ""}</span>${isHost && p.id !== ME.id ? `<button class="small ghost" data-kick="${p.id}" style="margin-left:auto">✕</button>` : ""}</div>`).join("")
    + Array.from({ length: S.config.robos }, () => `<div class="pl muted">🤖 robô</div>`).join("");
  $("lSkins").innerHTML = mine ? skinBotoes(mine.skin) : `<p class="muted">Você está assistindo.</p>`;
  seg("cQtd", [[5, "5"], [8, "8"], [10, "10"], [15, "15 (todos)"]], S.config.qtd, "data-qtd", dis);
  const maxR = Math.max(0, 8 - S.players.length);
  seg("cRobos", Array.from({ length: maxR + 1 }, (_, i) => [i, String(i)]), S.config.robos, "data-robos", dis);
  $("startBox").innerHTML = isHost ? `<button class="primary" id="btnStart" style="width:100%" ${n < 2 ? "disabled" : ""}>🎉 Começar a festa</button>${n < 2 ? `<p class="muted" style="margin:8px 0 0">Chame alguém ou coloque robôs: precisa de pelo menos 2.</p>` : ""}` : `<p class="muted">Esperando o organizador começar…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => act("start");
}

// ======================================================================
// Rede
// ======================================================================
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token }; if (r.id) store.set("festa:" + r.code, ME);
  history.replaceState(null, "", "/festa/?sala=" + r.code); $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); socket.emit("create", { name, skin: store.get("galera:skin"), config: store.get("festa:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name);
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("festa:" + code) || {};
  socket.emit("join", { code, name, skin: store.get("galera:skin"), id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("btnInvite").onclick = async () => { const link = location.origin + "/festa/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado!"); } catch { prompt("Copie o convite:", link); } };
$("sair").onclick = () => { if (confirm("Sair da festa? Você volta para a tela inicial.")) { location.href = "/festa/"; } };
socket.on("connect", () => {
  relogio.sincronizar(socket);
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("festa:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else show("home");
});
setInterval(() => socket.connected && relogio.sincronizar(socket, 2), 15000);
socket.on("removido", () => { toast("O organizador tirou você da sala."); location.href = "/festa/"; });
socket.on("state", (st) => {
  const antes = S; S = st;
  if (st.phase === "lobby") { G.mjId = null; limparCena(); show("lobby"); renderLobby(); return; }
  show("game");
  const f = st.festa;
  if (!antes || !antes.festa || antes.festa.idx !== f.idx || antes.festa.sub !== f.sub) mudouParte(f);
  placar();
});
socket.on("snap", (s) => { G.snaps.push(s); if (G.snaps.length > 30) G.snaps.shift(); });
socket.on("ev", (lista) => { for (const e of lista) aoEvento(e); });
const nomeDe = (id) => { const g = S && S.festa && S.festa.gente.find((x) => x.id === id); return g ? g.name : "?"; };
const souEu = (id) => ME && ME.id === id;

// a parte da festa mudou: explicação, jogo, resultado ou fim
function mudouParte(f) {
  const id = f.lista[f.idx], mj = F.MJ[id];
  G.sub = f.sub;
  if (f.sub === "intro") {
    G.snaps = []; G.local = {};
    montarCena(id);
    cartao(`<div class="emoji">${mj.emoji}</div><p class="muted" style="margin:6px 0 0">Minijogo ${f.idx + 1} de ${f.lista.length}</p><h2>${h(mj.nome)}</h2><p class="regra">${h(mj.regra)}</p><div class="ctl">🎮 ${h(mj.controles)}</div><div class="conta" id="contagem"></div>`);
  } else if (f.sub === "jogo") { cartao(null); G.snaps = []; if (mj.tipo === "tela") abrirTela(id); }
  else if (f.sub === "resultado") mostrarResultado(f);
  else if (f.sub === "fim") mostrarFim(f);
  $("dica").textContent = mj && mj.tipo === "arena" ? mj.controles : "";
  $("dica").classList.toggle("hidden", !(mj && mj.tipo === "arena" && f.sub === "jogo"));
  if (window.Toque && Toque.isTouch()) Toque.show(mj && mj.tipo === "arena" && f.sub === "jogo" && !!ME && !!ME.id);
}
function cartao(html) { $("cartao").classList.toggle("hidden", !html); if (html) $("cartaoBox").innerHTML = html; }
function placar() {
  const f = S.festa; if (!f) return;
  const lista = f.gente.slice().sort((a, b) => f.moedas[b.id] - f.moedas[a.id]);
  $("placar")._h = null; // o placar da rodada (pontos, vidas) volta a ser desenhado por cima, quando o minijogo tem
  $("placar").innerHTML = `<div class="info">🪙 moedas</div>` + lista.map((g) => `<div class="${souEu(g.id) ? "eu" : ""}">${(C.SKINS[g.skin] || {}).emoji || "🙂"} ${h(g.name)}<b>${f.moedas[g.id]}</b></div>`).join("");
}
function mostrarResultado(f) {
  const r = f.res, mj = F.MJ[r.id];
  const linhas = r.grupos.flatMap((g) => g.map((id) => ({ id, ...r.pr[id] }))).map((x) => `<div class="p${x.pos}"><span class="pos">${x.pos}º</span>${h(nomeDe(x.id))}${souEu(x.id) ? " (você)" : ""}<span class="mais">+${x.moedas}</span><span class="tot">${f.moedas[x.id]} 🪙</span></div>`).join("");
  cartao(`<div class="emoji">${mj.emoji}</div><h2>${h(mj.nome)}</h2>${detalheResultado(r)}<div class="rank">${linhas}</div>`);
  const meu = ME && r.pr[ME.id]; if (meu && meu.pos === 1) Comum.confetti();
  fecharTela();
}
function detalheResultado(r) {
  const e = r.snap.e;
  if (r.id === "bichos") return `<p class="regra">Passaram <b>${e.certo}</b> ${e.alvo}</p>`;
  if (r.id === "cronometro") return `<p class="regra">Erro somado nas ${e.de} tentativas: quanto menos, melhor</p>`;
  return "";
}
function mostrarFim(f) {
  const ordem = f.final, top = ordem.slice(0, 3), isHost = ME && S.host === ME.id;
  const pod = [top[1], top[0], top[2]].map((x, i) => (x ? `<div class="d${[2, 1, 3][i]}"><i>${[2, 1, 3][i]}º</i>${h(nomeDe(x.id))}<br>${x.moedas} 🪙</div>` : "")).join("");
  cartao(`<div class="emoji">🏆</div><h2>${h(nomeDe(ordem[0].id))} ganhou a festa!</h2><div class="podio">${pod}</div>
    <div class="rank">${ordem.map((x, i) => `<div class="p${i + 1}"><span class="pos">${i + 1}º</span>${h(nomeDe(x.id))}<span class="mais">${x.moedas} 🪙</span><span class="tot">${x.primeiros}× 1º</span></div>`).join("")}</div>
    <div class="row" style="justify-content:center;margin-top:14px">${isHost ? `<button class="primary" id="btnDeNovo">🎉 Outra festa</button><button id="btnSala">Voltar pra sala</button>` : `<span class="muted">Esperando o organizador…</span>`}</div>`);
  if ($("btnDeNovo")) $("btnDeNovo").onclick = () => act("start");
  if ($("btnSala")) $("btnSala").onclick = () => act("lobby");
  if (ME && ordem[0].id === ME.id) Comum.confetti();
  fecharTela(); limparCena();
}

// ======================================================================
// 3D: a arena
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1b1036); scene.fog = new THREE.Fog(0x1b1036, 26, 60);
const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
configurarBonecos({ scene });
scene.add(new THREE.HemisphereLight(0xfff0ff, 0x2a1a52, 1.5));
const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(6, 18, 8); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 }); scene.add(sol);
function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();
// o chão do salão: confete espalhado num piso escuro (fica embaixo de todas as arenas)
{
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  x.fillStyle = "#24164a"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 140; i++) { x.fillStyle = CORES_TITULO[i % 6]; x.save(); x.translate(Math.random() * 256, Math.random() * 256); x.rotate(Math.random() * 3); x.fillRect(-3, -1.5, 6, 3); x.restore(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12); t.colorSpace = THREE.SRGBColorSpace;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); piso.rotation.x = -Math.PI / 2; piso.position.y = -3; scene.add(piso);
}
function limparCena() {
  for (const c of G.corpos.values()) descartarJogador(c.model); G.corpos.clear();
  if (G.cena) { scene.remove(G.cena.grupo); G.cena.grupo.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); }); }
  G.cena = null;
}
// monta a arena do minijogo (só os de arena; os de tela usam a tela por cima)
function montarCena(id) {
  limparCena();
  const mj = F.MJ[id], grupo = new THREE.Group(); scene.add(grupo);
  G.cena = { id, grupo, extra: {} }; G.mjId = id;
  $("tela").classList.add("hidden");
  if (mj.tipo !== "arena") return;
  const R = { batata: 8.5, laser: 7.5, moedas: 8, sumo: 8, zumbi: 9, colina: 9, meteoros: 8 }[id];
  if (id === "chao") {
    const lad = [], geo = new THREE.BoxGeometry(F.TAM * 0.94, 0.4, F.TAM * 0.94);
    for (let k = 0; k < F.N; k++) for (let i = 0; i < F.N; i++) { const m = new THREE.Mesh(geo, M((i + k) % 2 ? 0x33d6e8 : 0x2aa8c0)); m.position.set((i - F.N / 2 + 0.5) * F.TAM, -0.2, (k - F.N / 2 + 0.5) * F.TAM); m.receiveShadow = true; grupo.add(m); lad.push(m); }
    G.cena.extra.lad = lad;
  } else {
    // a plataforma redonda: borda listrada como bolo de aniversário
    const topo = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.5, 64), [M(0xff5fa2), M(0x3a2670), M(0x3a2670)]);
    topo.position.y = -0.25; topo.receiveShadow = true; grupo.add(topo); G.cena.extra.plat = topo; G.cena.extra.R0 = R;
    const anel = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 8, 64), M(0xffc93c, { emissive: 0x553300 })); anel.rotation.x = Math.PI / 2; grupo.add(anel); G.cena.extra.anel = anel;
  }
  if (id === "laser") G.cena.extra.feixes = [0, 1].map(() => { const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(R, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); b.position.x = R / 2; g.add(b); const brilho = new THREE.Mesh(new THREE.BoxGeometry(R, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.25 })); brilho.position.x = R / 2; g.add(brilho); g.position.y = 0.18; g.visible = false; grupo.add(g); return g; });
  if (id === "batata") { const b = new THREE.Group(); const s = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), M(0x1a1a1a, { roughness: 0.3 })); b.add(s); const pav = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3), M(0xc8a060)); pav.position.y = 0.48; b.add(pav); const fa = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffb020 })); fa.position.y = 0.66; b.add(fa); grupo.add(b); G.cena.extra.bomba = b; G.cena.extra.faisca = fa; G.cena.extra.corBomba = s.material; }
  if (id === "colina") { const z = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.2, 48), new THREE.MeshBasicMaterial({ color: 0xffc93c, side: THREE.DoubleSide })); z.rotation.x = -Math.PI / 2; z.position.y = 0.03; grupo.add(z); const d = new THREE.Mesh(new THREE.CircleGeometry(2.0, 48), new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.22 })); d.rotation.x = -Math.PI / 2; d.position.y = 0.02; grupo.add(d); G.cena.extra.zona = [z, d]; }
  G.cena.extra.itens = new Map();
  // câmera de cima, inclinada, vendo a arena toda
  const longe = id === "chao" ? 1.25 : 1;
  cam.position.set(0, 16 * longe, 12.5 * longe); cam.lookAt(0, 0, 0.6);
}
// os bonecos de quem está jogando (as skins)
function corpo(id) {
  let c = G.corpos.get(id); if (c) return c;
  const f = S.festa, i = f.gente.findIndex((g) => g.id === id), g = f.gente[i];
  const model = makePlayer(KITS[i % KITS.length], i + 1, g.name, { skin: g.skin }); scene.add(model);
  c = { model, st: {}, x: 0, z: 0, y: 0, cor: CORES[i % CORES.length], caiu: 0 }; G.corpos.set(id, c); return c;
}
// um emoji flutuando (em cima da cabeça)
const emojis = new Map();
function emojiSprite(ch) {
  let mat = emojis.get(ch);
  if (!mat) { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); x.font = "52px serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ch, 32, 36); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; mat = new THREE.SpriteMaterial({ map: t, depthTest: false }); emojis.set(ch, mat); }
  const s = new THREE.Sprite(mat); s.scale.set(0.9, 0.9, 1); s.renderOrder = 6; return s;
}
const MOEDA_GEO = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 20), BOMBA_GEO = new THREE.SphereGeometry(0.38, 14, 10), SOMBRA_GEO = new THREE.CircleGeometry(1, 32);
function item(chave, criar) { const it = G.cena.extra.itens; let m = it.get(chave); if (!m) { m = criar(); G.cena.grupo.add(m); it.set(chave, m); } m.userData.visto = true; return m; }

// ======================================================================
// Controles
// ======================================================================
const teclas = new Set();
addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("input")) return;
  teclas.add(e.code);
  if (e.code === "Space") { e.preventDefault(); if (!e.repeat) { G.inp.p++; G.inp.a++; teclaTela(" "); } }
  else if (!e.repeat) teclaTela(e.key);
});
addEventListener("keyup", (e) => teclas.delete(e.code));
let stick = null;
if (window.Toque && Toque.isTouch()) Toque.setup({ buttons: [{ icon: "⬆", label: "pular/empurrar", code: "Space", big: true }], top: [], onStick: (x, y) => { stick = Math.hypot(x, y) > 0.15 ? { x, y } : null; } });
function lerControles() {
  let dx = (teclas.has("KeyD") || teclas.has("ArrowRight") ? 1 : 0) - (teclas.has("KeyA") || teclas.has("ArrowLeft") ? 1 : 0);
  let dz = (teclas.has("KeyS") || teclas.has("ArrowDown") ? 1 : 0) - (teclas.has("KeyW") || teclas.has("ArrowUp") ? 1 : 0);
  if (stick) { dx = stick.x; dz = stick.y; }
  const l = Math.hypot(dx, dz); if (l > 1) { dx /= l; dz /= l; }
  G.inp.dx = dx; G.inp.dz = dz;
}

// ======================================================================
// Jogos de tela
// ======================================================================
const tempoMJ = () => { const s = G.snaps[G.snaps.length - 1]; return s ? s.t + (relogio.agora() - s.T) / 1000 : 0; };
const ultimo = () => G.snaps[G.snaps.length - 1];
const fmt = (s) => s.toFixed(2).replace(".", ",");
const enviarTela = (d) => socket.emit("tela", d);
function abrirTela(id) { G.telaId = id; G.local = {}; $("tela").classList.remove("hidden"); $("telaArea").innerHTML = ""; }
function fecharTela() { G.telaId = null; $("tela").classList.add("hidden"); }
function teclaTela(k) {
  const id = G.telaId, s = ultimo(); if (!id || !s || G.sub !== "jogo") return;
  if (id === "cronometro" && k === " ") pararCrono();
  if (id === "reflexo" && k === " ") apertarReflexo();
  if (id === "balao") { if (k === " ") enviarTela({ tipo: "bomba" }); if (k === "p" || k === "P") enviarTela({ tipo: "parar" }); }
  if (id === "sequencia" && "1234".includes(k) && k !== " ") enviarCor(+k - 1);
  if (id === "conta" && "1234".includes(k) && k !== " ") { const e = s.e; if (e.ops[+k - 1] != null) responderConta(e.ops[+k - 1]); }
}
function pararCrono() { const s = ultimo(); if (!s || G.local.parou === s.e.rod) return; const t = tempoMJ() - s.e.ini; if (t < 0) return; G.local.parou = s.e.rod; G.local.meu = t; enviarTela({ tipo: "parar", s: Math.round(t * 100) / 100 }); }
function apertarReflexo() { const s = ultimo(); if (!s || G.local.foi === s.e.rod) return; const t = tempoMJ() - s.e.verde; G.local.foi = s.e.rod; G.local.meu = t; enviarTela({ tipo: "aperta", rodada: s.e.rod, ms: t, cedo: t < 0 }); }
function enviarCor(c) { const s = ultimo(); if (!s) return; G.local.flash = { c, ate: performance.now() + 180 }; enviarTela({ tipo: "cor", c }); }
function responderConta(v) { const s = ultimo(); if (!s || G.local.q === s.e.q) return; G.local.q = s.e.q; G.local.v = v; enviarTela({ tipo: "resp", q: s.e.q, v }); }
const genteTela = (p, txt) => `<div class="gente">${S.festa.gente.map((g) => { const v = p[g.id]; return `<span class="${txt(v, g) || ""}">${h(g.name)}</span>`; }).join("")}</div>`;
// desenha a tela do minijogo (chamado a cada quadro, mas só mexe no que mudou)
function desenharTela() {
  const id = G.telaId, s = ultimo(), A = $("telaArea"); if (!id || !s || s.id !== id) return;
  const e = s.e, t = tempoMJ(), set = (html) => { if (A._h !== html) { A._h = html; A.innerHTML = html; } };
  if (id === "cronometro") {
    const dt = t - e.ini, parei = G.local.parou === e.rod, mostra = dt >= 0 && dt < 3 && !parei;
    const rel = dt < 0 ? `<div class="grande muted">${Math.ceil(-dt)}</div>` : parei ? `<div class="grande" style="color:var(--ciano)">${fmt(G.local.meu)} s</div>` : `<div class="grande">${mostra ? fmt(dt) : "?,??"} s</div>`;
    set(`<p class="muted">Tentativa ${e.rod} de ${e.de}</p><h2 style="font-size:34px">Pare em <span style="color:var(--ouro)">${fmt(e.alvo)} s</span></h2>${rel}
      <button class="primary botao-grande" id="bParar" ${parei || dt < 0 ? "disabled" : ""}>⏱️ Parar</button>
      ${genteTela(e.p, (v) => (v && v[0] ? "ok" : ""))}<p class="muted" style="margin-top:10px">O relógio some depois de 3 segundos. Conte de cabeça!</p>`);
    if ($("bParar")) $("bParar").onclick = pararCrono;
  } else if (id === "reflexo") {
    const verde = t >= e.verde, foi = G.local.foi === e.rod, cor = foi ? "#3a2670" : verde ? "#2fbf5f" : "#c62828";
    const txt = foi ? (G.local.meu < 0 ? "Cedo demais! +1 s" : `${Math.round(G.local.meu * 1000)} ms`) : verde ? "AGORA!" : "Espere…";
    set(`<p class="muted">Rodada ${e.rod} de 8</p><button id="bRef" style="width:100%;height:min(46vh,360px);font:clamp(40px,9vw,80px) var(--display);background:${cor};border-color:#0006">${txt}</button>
      ${genteTela(e.p, (v) => (v && v[0] ? "ok" : ""))}`);
    $("bRef").onclick = apertarReflexo;
  } else if (id === "bichos") {
    if (t < e.perg) {
      if (!A.querySelector(".campo")) { A._h = ""; A.innerHTML = `<p class="muted">Conte só o bicho que vai ser pedido no fim… (preste atenção em todos!)</p><div class="campo" id="campo">${e.d.map((b, i) => `<span class="bicho" data-i="${i}" style="top:${8 + b[2] * 17}%">${b[0]}</span>`).join("")}</div>`; }
      const W = A.querySelector(".campo").clientWidth;
      A.querySelectorAll(".bicho").forEach((el) => { const b = e.d[+el.dataset.i], k = (t - b[1]) / b[4]; if (k < 0 || k > 1) { el.style.display = "none"; return; } el.style.display = ""; const x = b[3] > 0 ? -60 + k * (W + 120) : W + 60 - k * (W + 120); el.style.transform = `translateX(${x}px) scaleX(${b[3] > 0 ? -1 : 1})`; });
    } else {
      if (G.local.n == null) G.local.n = 10;
      const mandei = G.local.mandou;
      set(`<h2 style="font-size:38px">Quantos ${e.alvo} passaram?</h2><div class="grande" style="margin:10px 0">${G.local.n}</div>
        <div class="row" style="justify-content:center"><button class="botao-grande" id="bMenos" ${mandei ? "disabled" : ""}>−</button><button class="botao-grande" id="bMais" ${mandei ? "disabled" : ""}>+</button></div>
        <button class="primary botao-grande" id="bResp" style="margin-top:12px" ${mandei ? "disabled" : ""}>${mandei ? "Respondido!" : "Confirmar"}</button>
        ${genteTela(e.p, (v) => (v != null ? "ok" : ""))}<p class="muted">Faltam ${Math.max(0, Math.ceil(e.prazo - t))} s</p>`);
      if ($("bMenos")) $("bMenos").onclick = () => { G.local.n = Math.max(0, G.local.n - 1); A._h = ""; };
      if ($("bMais")) $("bMais").onclick = () => { G.local.n = Math.min(99, G.local.n + 1); A._h = ""; };
      if ($("bResp")) $("bResp").onclick = () => { G.local.mandou = true; enviarTela({ tipo: "resp", n: G.local.n }); A._h = ""; };
    }
  } else if (id === "balao") {
    const meu = ME && e.p[ME.id], n = meu ? meu[0] : 0, est = meu ? meu[1] : "g", antes = t < e.ini, pode = est === "n" && !antes;
    const outros = S.festa.gente.filter((g) => !souEu(g.id)).map((g) => { const v = e.p[g.id] || [0, "n"]; return `<span class="${v[1] === "g" ? "ok" : v[1] === "x" ? "fora" : ""}">${h(g.name)} ${v[1] === "x" ? "💥" : `🎈 ${v[0]}`}${v[1] === "g" ? " ✋" : ""}</span>`; }).join("");
    set(`<p class="muted">${antes ? "Prepare…" : `Faltam ${Math.max(0, Math.ceil(e.fim - t))} s`}</p>
      <div style="height:min(40vh,320px);display:grid;place-items:center"><span class="bal" style="font-size:${est === "x" ? 120 : 60 + n * 4.5}px">${est === "x" ? "💥" : "🎈"}</span></div>
      <div class="grande" style="font-size:54px">${est === "x" ? "Estourou! 0" : est === "g" ? `Guardou ${n}` : n}</div>
      <div class="row" style="justify-content:center;margin-top:8px"><button class="primary botao-grande" id="bEnche" ${pode ? "" : "disabled"}>Encher 🎈</button><button class="botao-grande" id="bGuarda" ${pode ? "" : "disabled"}>Parar ✋</button></div>
      <div class="gente">${outros}</div>`);
    if ($("bEnche")) $("bEnche").onclick = () => enviarTela({ tipo: "bomba" });
    if ($("bGuarda")) $("bGuarda").onclick = () => enviarTela({ tipo: "parar" });
  } else if (id === "sequencia") {
    const CORS = ["#e53935", "#2f80ed", "#2fbf5f", "#f5c400"], mostrando = t < e.vez, eu = ME && e.p[ME.id], vivo = eu && eu[0];
    let aceso = -1;
    if (mostrando && e.s) { const k = Math.floor((t - e.mostra) / 0.6); if (k >= 0 && k < e.s.length && t - e.mostra - k * 0.6 < 0.45) aceso = e.s[k]; G.local.vista = e.s; }
    if (G.local.flash && performance.now() < G.local.flash.ate) aceso = G.local.flash.c;
    const pads = CORS.map((c, i) => `<button data-cor="${i}" style="background:${c}" class="${aceso === i ? "aceso" : ""}" ${mostrando || !vivo ? "disabled" : ""} aria-label="cor ${i + 1}"></button>`).join("");
    set(`<p class="muted">Rodada ${e.rod} · ${e.n} cores</p><h2 style="font-size:32px">${!vivo && eu ? "Você errou 😵" : mostrando ? "Preste atenção…" : `Sua vez! (${eu ? eu[1] : 0} de ${e.n})`}</h2><div class="pads">${pads}</div>${genteTela(e.p, (v) => (v && !v[0] ? "fora" : v && v[1] >= e.n ? "ok" : ""))}`);
    A.querySelectorAll("[data-cor]").forEach((b) => (b.onclick = () => { enviarCor(+b.dataset.cor); A._h = ""; }));
  } else if (id === "alvo") {
    if (!A.querySelector(".campo")) { A._h = ""; A.innerHTML = `<div class="campo" id="campoAlvo"></div><div id="ptsAlvo"></div>`; A.querySelector(".campo").onclick = (ev) => { const b = ev.target.closest("[data-alvo]"); if (b) { enviarTela({ tipo: "tiro", id: +b.dataset.alvo }); b.classList.add("foi"); } }; }
    const campo = A.querySelector(".campo"), html = e.a.map((a) => `<button class="alvo ${a[4] ? "ouro" : ""} ${a[3] ? "foi" : ""}" data-alvo="${a[0]}" style="left:${a[1] * 100}%;top:${a[2] * 100}%" aria-label="alvo">${a[3] ? `<b style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:13px">${h(nomeDe(a[3]))}</b>` : ""}</button>`).join("");
    if (campo._h !== html) { campo._h = html; campo.innerHTML = html; }
    const el = $("ptsAlvo"), ph = `<div class="gente">${S.festa.gente.map((g) => `<span>${h(g.name)} ${e.p[g.id] || 0}</span>`).join("")}</div>`; if (el._h !== ph) { el._h = ph; el.innerHTML = ph; }
  } else if (id === "conta") {
    const pronto = t >= e.ini, eu = G.local.q === e.q;
    const ops = e.ops.map((v, i) => `<button data-v="${v}" class="${e.certo != null ? (v === e.certo ? "certo" : eu && v === G.local.v ? "errado" : "") : eu && v === G.local.v ? "on" : ""}" ${!pronto || eu || e.certo != null ? "disabled" : ""}><small style="font:14px var(--body);opacity:.7">${i + 1}</small> ${v}</button>`).join("");
    set(`<p class="muted">Conta ${e.q} de 10</p><div class="grande">${pronto ? h(e.txt) : "…"}</div><div class="ops">${ops}</div>
      <div class="gente">${S.festa.gente.map((g) => { const v = e.p[g.id] || [0, 0]; return `<span class="${v[1] ? "ok" : ""}">${h(g.name)} ${v[0]}</span>`; }).join("")}</div>`);
    A.querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => { responderConta(+b.dataset.v); A._h = ""; }));
  }
}

// ======================================================================
// Eventos (sons e avisos)
// ======================================================================
const Som = (() => {
  let ac = null; const ctx = () => { if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } if (ac.state === "suspended") ac.resume(); return ac; };
  const tom = (f0, f1, dur, g = 0.12, tipo = "square") => { const c = ctx(); if (!c) return; const o = c.createOscillator(), v = c.createGain(), t = c.currentTime; o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(v).connect(c.destination); o.start(t); o.stop(t + dur + 0.02); };
  return { boom: () => tom(160, 40, 0.45, 0.25, "sawtooth"), plim: () => tom(900, 1500, 0.1, 0.08, "triangle"), pof: () => tom(500, 80, 0.2, 0.15), tic: () => tom(1200, 1200, 0.04, 0.05) };
})();
addEventListener("pointerdown", () => Som.plim && null, { once: true });
function aoEvento(e) {
  const [tipo, a] = e;
  if (tipo === "boom" || tipo === "zap" || tipo === "caiu") Som.boom();
  else if (tipo === "pegou" || tipo === "acertou") { if (souEu(a)) Som.plim(); }
  else if (tipo === "pof" || tipo === "errou" || tipo === "ai") { if (souEu(a)) Som.pof(); }
  if ((tipo === "boom" && typeof a === "string") || tipo === "zap" || tipo === "caiu") { const c = G.corpos.get(a); if (c) c.caiu = performance.now(); }
}

// ======================================================================
// Laço: interpola e desenha
// ======================================================================
const INTERP = 0.1;
function amostra() {
  const s = G.snaps; if (!s.length) return null;
  const alvo = tempoMJ() - INTERP;
  let a = s[0], b = s[s.length - 1];
  for (let i = 0; i < s.length - 1; i++) if (s[i].t <= alvo && s[i + 1].t >= alvo) { a = s[i]; b = s[i + 1]; break; }
  const k = b.t > a.t ? Math.min(1, Math.max(0, (alvo - a.t) / (b.t - a.t))) : 1;
  return { a, b, k };
}
let ult = performance.now();
function loop(agora) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (agora - ult) / 1000); ult = agora;
  if (!S || !S.festa) return;
  const f = S.festa, mj = F.MJ[f.lista[f.idx]];
  // contagem da explicação
  if (f.sub === "intro" && $("contagem")) $("contagem").textContent = Math.max(0, Math.ceil((f.ate - relogio.agora()) / 1000));
  const s = ultimo();
  $("topo").innerHTML = `<span>${mj ? mj.emoji : "🎉"} ${h(mj ? mj.nome : "Festa")}</span>${f.sub === "jogo" && s ? `<span class="t">${Math.max(0, Math.ceil(s.dur - tempoMJ()))}</span>` : ""}`;
  // controles: mando ~20x por segundo (ou na hora, quando mudam)
  if (f.sub === "jogo" && mj && mj.tipo === "arena" && ME && ME.id) {
    lerControles();
    const chave = `${G.inp.dx.toFixed(2)},${G.inp.dz.toFixed(2)},${G.inp.p},${G.inp.a}`;
    if (chave !== G.ultChave || agora - G.ultEnvio > 200) { G.ultChave = chave; G.ultEnvio = agora; socket.volatile.emit("in", G.inp); }
  }
  if (mj && mj.tipo === "tela" && f.sub === "jogo") desenharTela();
  if (mj && mj.tipo === "arena" && G.cena && G.cena.id === mj.id) desenharArena(dt);
  renderer.render(scene, cam);
}
requestAnimationFrame(loop);

function desenharArena(dt) {
  const am = amostra(); if (!am) return;
  const { a, b, k } = am, e = b.e, ex = G.cena.extra, id = G.cena.id, agora = performance.now();
  const pa = new Map((a.j || []).map((x) => [x[0], x]));
  for (const jb of b.j || []) {
    const ja = pa.get(jb[0]) || jb, c = corpo(jb[0]);
    const x = ja[1] + (jb[1] - ja[1]) * k, z = ja[2] + (jb[2] - ja[2]) * k, y = ja[3] + (jb[3] - ja[3]) * k, vivo = jb[4] === 1 || id === "zumbi";
    const vel = jb[8] || 0;
    if (!vivo && !c.caiu) c.caiu = agora;
    if (!vivo) { const q = (agora - c.caiu) / 1000; c.model.position.y = -q * q * 9; c.model.visible = q < 1.2; continue; }
    c.caiu = 0; c.model.visible = true;
    c.model.position.set(x, y, z);
    const face = jb[5]; c.model.rotation.y = Math.atan2(-Math.cos(face), -Math.sin(face)) + (jb[7] ? Math.sin(agora / 60) * 0.6 : 0);
    animate(c.model, vel, dt, c.st, 0);
    if (id === "zumbi") { // zumbi: brilho verde no corpo e um 🧟 em cima da cabeça
      const z2 = e.z.includes(jb[0]);
      if (c.zumbi !== z2) { c.zumbi = z2; c.model.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setHex(z2 ? 0x2f7a10 : 0x000000); }); }
      if (!c.selo) { c.selo = emojiSprite("🧟"); c.selo.position.y = 3.1; c.model.add(c.selo); }
      c.selo.visible = z2;
    }
  }
  for (const [pid, c] of G.corpos) if (!(b.j || []).some((x) => x[0] === pid)) c.model.visible = false;
  for (const m of ex.itens.values()) m.userData.visto = false;
  if (id === "batata" && ex.bomba) {
    const dono = e.com && G.corpos.get(e.com);
    ex.bomba.visible = !!dono;
    if (dono) { ex.bomba.position.set(dono.model.position.x, dono.model.position.y + 2.7 + Math.sin(agora / 120) * 0.08, dono.model.position.z); const pisca = e.falta < 3 && Math.floor(agora / (e.falta < 1.2 ? 70 : 160)) % 2; ex.corBomba.color.setHex(pisca ? 0xe53935 : 0x1a1a1a); ex.faisca.scale.setScalar(0.7 + Math.random() * 0.6); }
  }
  if (id === "laser") ex.feixes.forEach((g, i) => { g.visible = e.f[i] != null; if (g.visible) g.rotation.y = -e.f[i]; });
  if (id === "sumo" && ex.plat) { const s = e.R / ex.R0; ex.plat.scale.set(s, 1, s); ex.anel.scale.set(s, s, 1); }
  if (id === "colina") for (const m of ex.zona) m.position.set(e.zx, m.position.y, e.zz);
  if (id === "chao" && ex.lad) for (let i = 0; i < ex.lad.length; i++) { const st = e.l[i], m = ex.lad[i]; m.visible = st !== "2"; if (st === "1") m.material.color.setHex(0xff5a5a); else if (st === "0") m.material.color.setHex((i % F.N + Math.floor(i / F.N)) % 2 ? 0x33d6e8 : 0x2aa8c0); }
  if (id === "moedas") for (const [iid, x, z, y, t] of e.it) {
    const m = item("i" + iid, () => { const g = new THREE.Group(); const o = t === "b" ? new THREE.Mesh(BOMBA_GEO, M(0x1a1a1a)) : new THREE.Mesh(MOEDA_GEO, M(t === "o" ? 0xffd34d : 0xd9a300, { metalness: 0.7, roughness: 0.25, emissive: t === "o" ? 0x664400 : 0x221100 })); if (t !== "b") o.rotation.x = Math.PI / 2; g.add(o); g.userData.o = o; const sb = new THREE.Mesh(SOMBRA_GEO, new THREE.MeshBasicMaterial({ color: t === "b" ? 0xff2a2a : 0x000000, transparent: true, opacity: 0.35 })); sb.rotation.x = -Math.PI / 2; g.userData.sb = sb; G.cena.grupo.add(sb); return g; });
    m.position.set(x, y + 0.4, z); m.userData.o.rotation.z += dt * 3; m.userData.sb.position.set(x, 0.02, z); m.userData.sb.scale.setScalar(t === "b" ? 1.8 : 0.4); m.userData.sb.visible = true;
  }
  if (id === "meteoros") for (const [mid, x, z, falta] of e.m) {
    const m = item("m" + mid, () => { const g = new THREE.Group(); const pedra = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7), M(0x7a3a1a, { emissive: 0xff5a00, emissiveIntensity: 0.6 })); g.add(pedra); g.userData.p = pedra; const sb = new THREE.Mesh(SOMBRA_GEO, new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.4 })); sb.rotation.x = -Math.PI / 2; g.userData.sb = sb; G.cena.grupo.add(sb); return g; });
    m.userData.p.position.set(x, Math.max(0.3, falta * 14), z); m.userData.sb.position.set(x, 0.02, z); m.userData.sb.scale.setScalar(1.35 * Math.min(1, 1.15 - falta * 0.6)); m.userData.sb.visible = falta > -0.3; m.userData.p.visible = falta > -0.1;
  }
  for (const [chave, m] of ex.itens) if (!m.userData.visto) { G.cena.grupo.remove(m); if (m.userData.sb) G.cena.grupo.remove(m.userData.sb); ex.itens.delete(chave); }
  // informação do minijogo no placar da direita
  const info = id === "moedas" || id === "colina" ? Object.fromEntries((b.j || []).map((x) => [x[0], id === "colina" ? Math.floor(x[6]) : x[6]])) : id === "meteoros" ? e.v : null;
  if (info) { const el = $("placar"), linhas = S.festa.gente.map((g) => `<div class="${souEu(g.id) ? "eu" : ""}">${h(g.name)}<b>${id === "meteoros" ? "❤️".repeat(Math.max(0, info[g.id] || 0)) || "💀" : info[g.id]}</b></div>`).join(""), html = `<div class="info">${id === "moedas" ? "🪙 nesta rodada" : id === "colina" ? "👑 pontos" : "❤️ vidas"}</div>` + linhas; if (el._h !== html) { el._h = html; el.innerHTML = html; } }
}

if (!urlCode) show("home");
if (location.hash === "#debug") window.__festa = { get S() { return S; }, G, F, socket, act };
