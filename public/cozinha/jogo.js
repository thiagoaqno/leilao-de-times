// Cozinha da Galera — o jogo no navegador: telas (entrar, brigada e cozinha), a cozinha em 3D (Three.js), os
// cozinheiros (os bonecos e skins da Pelada com o chapéu), os controles, os sons e a rede. As regras ficam em
// regras.js (window.Cozinha), as mesmas do servidor: eu mexo o meu cozinheiro aqui e mando a posição; pegar, soltar,
// picar, lavar, o fogão e os pedidos são do servidor, que manda a cozinha ("mesa") quando ela muda.
import * as THREE from "three";
import { makePlayer, animate, descartarJogador, configurarBonecos } from "/pelada/bonecos.js";
import * as Mod from "/cozinha/modelos.js";

const K = window.Cozinha, CP = window.Campo, T = K.TILE, { $, h, store } = Comum;
const toast = Comum.criarToast(2600), socket = io("/cozinha"), act = Comum.criarAct(socket, toast);
const KITS = ["corinthians", "celeste", "laranja", "palmeiras"];
const INTERP = 90, ENVIO = 33;
let S = null, ME = null;
const urlCode = new URLSearchParams(location.search).get("sala");
// G: o que está na tela agora. mesa: a última cozinha do servidor (com a hora em que chegou)
const G = { active: false, coz: null, mapa: null, me: null, myId: null, corpos: new Map(), buf: [], mesa: null, mesaEm: 0, lugares: [], pausa: false, ultEnvio: 0, matchKey: null, alvo: null, tChop: 0, pedidosVistos: new Set() };

// ======================================================================
// 3D: renderizador, câmera de cima (de lado, como no Overcooked) e luz
// ======================================================================
const canvas = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1b120e);
const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
configurarBonecos({ scene, limites: () => ({ L: 50, W: 50, goalD: 0 }) });
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a4030, 1.5));
const sol = new THREE.DirectionalLight(0xfff0d8, 2.2); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.03; scene.add(sol, sol.target);
const cozinha3d = new THREE.Group(); scene.add(cozinha3d);
function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); enquadrar(); }
addEventListener("resize", resize);
// a câmera enquadra a cozinha inteira, de cima e de frente (a fileira de baixo fica mais perto)
function enquadrar() {
  if (!G.mapa) return;
  const { W, H } = G.mapa, inc = 0.98, vf = THREE.MathUtils.degToRad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
  const dW = (W / 2 + 0.7) / Math.tan(hf / 2), dH = (H / 2 + 1.2) / Math.tan(vf / 2) * 0.9;
  const d = Math.max(dW, dH), cx = W / 2, cz = H / 2 + 0.35;
  cam.position.set(cx, Math.sin(inc) * d + 0.6, cz + Math.cos(inc) * d);
  cam.lookAt(cx, 0.2, cz);
  sol.position.set(cx - 6, 18, cz + 8); sol.target.position.set(cx, 0, cz);
  Object.assign(sol.shadow.camera, { left: -W, right: W, top: H, bottom: -H, near: 1, far: 60 }); sol.shadow.camera.updateProjectionMatrix();
}

// ---------- a cozinha: as bancadas, o que está em cima, as barras ----------
function montarCozinha(cozId) {
  limparCozinha();
  const coz = K.COZINHAS[cozId]; G.coz = cozId; G.mapa = K.montarMapa(coz);
  cozinha3d.add(Mod.chao(G.mapa.w, G.mapa.h), Mod.paredes(G.mapa.w, G.mapa.h));
  const fora = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1 })); fora.rotation.x = -Math.PI / 2; fora.position.y = -0.01; fora.receiveShadow = true; cozinha3d.add(fora);
  G.lugares = G.mapa.tiles.map((t) => {
    const g = Mod.estacao(t); g.position.set((t.c + 0.5) * T, 0, (t.r + 0.5) * T); cozinha3d.add(g);
    const b = Mod.barra(); b.visible = false; b.position.set(g.position.x, 2.1, g.position.z); cozinha3d.add(b);
    const av = Mod.aviso(); av.visible = false; av.position.set(g.position.x, 2.5, g.position.z); cozinha3d.add(av);
    return { t, g, barra: b, aviso: av, chave: "", obj: null, chama: g.userData.chama || null };
  });
  // o anel de luz da bancada da frente (a que o meu cozinheiro vai usar)
  G.luz = new THREE.Mesh(new THREE.BoxGeometry(T * 1.04, 0.06, T * 1.04), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.45, depthWrite: false }));
  G.luz.visible = false; cozinha3d.add(G.luz);
  enquadrar();
}
function limparCozinha() {
  for (const o of [...cozinha3d.children]) cozinha3d.remove(o);
  G.lugares = []; G.mapa = null; G.luz = null;
}
// a mesa nova do servidor: troca o modelo só do que mudou
function aplicarMesa() {
  const ms = G.mesa; if (!ms || !G.mapa) return;
  ms.lugares.forEach(([item, n], i) => {
    const L = G.lugares[i]; if (!L) return;
    const pilhaN = L.t.tipo === "escorredor" ? n : 0, chave = JSON.stringify([item && { ...item, p: 0 }, pilhaN]);
    if (chave === L.chave) return;
    L.chave = chave; if (L.obj) cozinha3d.remove(L.obj);
    L.obj = item ? Mod.item(item) : pilhaN ? Mod.pilha(pilhaN) : null;
    if (L.t.tipo === "pia" && n) L.obj = Mod.item({ k: "sujos", n }); // os pratos sujos dentro da pia
    if (L.obj) { L.obj.position.set(L.g.position.x, L.t.tipo === "pia" ? Mod.ALTURA - 0.12 : L.t.tipo === "lixo" ? 0.9 : Mod.ALTURA, L.g.position.z); cozinha3d.add(L.obj); }
  });
  // o que cada um tem na mão
  for (const [id, c] of G.corpos) {
    const item = ms.maos[id] || null, chave = JSON.stringify(item && { ...item, p: 0 });
    if (chave === c.maoChave) continue;
    c.maoChave = chave; if (c.mao) c.model.remove(c.mao);
    c.mao = item ? Mod.item(item) : null; c.st.holding = !!item;
    if (c.mao) { c.mao.position.set(0, 0.95, -0.62); c.model.add(c.mao); }
  }
}
// as barras (picar, lavar, cozinhar), o fogo aceso e o aviso de queimar: a cada quadro, com o tempo andando aqui
function barras(tJogo) {
  const ms = G.mesa; if (!ms) return;
  const trabalhando = new Set(Object.values(ms.trab || {})), passou = Math.max(0, tJogo - ms.t);
  ms.lugares.forEach(([item, n, p], i) => {
    const L = G.lugares[i]; if (!L) return;
    let v = null, cor = 0x4cd964, alerta = false;
    if (L.t.tipo === "tabua" && item && item.k === "ing" && K.proximoPasso(item) === "picar" && item.p > 0) v = (item.p + (trabalhando.has(i) ? passou : 0)) / K.INGREDIENTES[item.t].picar;
    if (L.t.tipo === "pia" && n && (p > 0 || trabalhando.has(i))) v = (p + (trabalhando.has(i) ? passou : 0)) / K.TEMPOS.lavar;
    if (item && K.RECIPIENTES[item.k] && item.c.length && !item.q) {
      const R = K.RECIPIENTES[item.k], prec = R.tempo * item.c.length, pp = item.p + (L.t.tipo === "fogao" && ms.fase === "jogo" ? passou : 0);
      if (pp < prec) v = pp / prec;
      else if (pp >= prec + R.queima * K.TEMPOS.alerta) alerta = true;
      if (L.chama) L.chama.material.emissiveIntensity = L.t.tipo === "fogao" ? 1.4 : 0;
    } else if (L.chama) L.chama.material.emissiveIntensity = 0;
    L.barra.visible = v != null && v < 1; if (L.barra.visible) { L.barra.userData.set(v, cor); L.barra.quaternion.copy(cam.quaternion); }
    L.aviso.visible = alerta && Math.floor(performance.now() / 250) % 2 === 0;
    if (alerta && performance.now() - (L.bip || 0) > 700) { L.bip = performance.now(); Som.bip(); }
  });
}

// ---------- a fumaça da panela queimada ----------
const geoFumaca = new THREE.SphereGeometry(1, 8, 6), fumacas = [];
function fumaca(dt) {
  const agora = performance.now();
  for (const L of G.lugares) {
    const it = G.mesa && G.mesa.lugares[L.t.i] && G.mesa.lugares[L.t.i][0];
    if (!it || !it.q || agora - (L.fumou || 0) < 220 || fumacas.length > 60) continue;
    L.fumou = agora;
    const m = new THREE.Mesh(geoFumaca, new THREE.MeshBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.6, depthWrite: false }));
    m.position.set(L.g.position.x + (Math.random() - 0.5) * 0.3, Mod.ALTURA + 0.35, L.g.position.z + (Math.random() - 0.5) * 0.3); m.scale.setScalar(0.12);
    cozinha3d.add(m); fumacas.push({ m, vida: 0 });
  }
  for (let k = fumacas.length - 1; k >= 0; k--) {
    const f = fumacas[k]; f.vida += dt;
    f.m.position.y += dt * 0.9; f.m.position.x += Math.sin(f.vida * 3 + k) * dt * 0.2; f.m.scale.setScalar(0.12 + f.vida * 0.35); f.m.material.opacity = Math.max(0, 0.6 - f.vida * 0.35);
    if (f.vida > 1.7 || !f.m.parent) { cozinha3d.remove(f.m); f.m.material.dispose(); fumacas.splice(k, 1); }
  }
}

// ---------- os cozinheiros: os bonecos da Pelada com o chapéu ----------
function criarCorpo(j, k) {
  const model = makePlayer(KITS[k % KITS.length], k + 1, j.nome || "", { skin: j.skin });
  const chapeu = Mod.chapeu(); chapeu.position.y = 1.86; model.add(chapeu);
  scene.add(model);
  const [x, z] = G.mapa.inicio[k];
  return { id: j.id, model, st: {}, x, z, vx: 0, vz: 0, d: Math.PI, mao: null, maoChave: "null" };
}
function limparCorpos() { for (const c of G.corpos.values()) descartarJogador(c.model); G.corpos.clear(); }

// ======================================================================
// Sons (sintetizados)
// ======================================================================
const Som = (() => {
  let ac = null, vol = store.get("cozinha:vol") ?? 0.7, master = null;
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination); } catch { return null; } } if (ac.state === "suspended") ac.resume(); return ac; };
  function tom(f0, f1, dur, ganho, tipo = "sine", atraso = 0) { const c = ctx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + atraso; o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02); }
  function ruido(dur, ganho, freq, tipo = "bandpass") { const c = ctx(); if (!c) return; const n = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = n; f.type = tipo; f.frequency.value = freq; g.gain.value = ganho; s.connect(f).connect(g).connect(master); s.start(); }
  return {
    get vol() { return vol; }, setVol(v) { vol = v; store.set("cozinha:vol", v); if (master) master.gain.value = v; }, unlock: ctx,
    pegar() { tom(500, 760, 0.07, 0.18, "triangle"); },
    soltar() { tom(420, 260, 0.08, 0.2, "triangle"); },
    juntar() { tom(600, 900, 0.06, 0.15, "triangle"); tom(900, 1200, 0.06, 0.12, "triangle", 0.05); },
    picar() { ruido(0.05, 0.6, 2600); tom(180, 120, 0.04, 0.2, "square"); },
    lavar() { ruido(0.25, 0.35, 900, "lowpass"); },
    pronto() { tom(1320, 1300, 0.18, 0.18); tom(1760, 1740, 0.25, 0.15, "sine", 0.12); },
    bip() { tom(1900, 1900, 0.08, 0.1, "square"); },
    queimou() { ruido(0.8, 0.5, 400, "lowpass"); tom(220, 90, 0.5, 0.2, "sawtooth"); },
    entregou() { [880, 1108, 1318].forEach((f, i) => tom(f, f, 0.16, 0.16, "triangle", i * 0.07)); ruido(0.12, 0.25, 5000); },
    pedido() { tom(1046, 1040, 0.12, 0.12, "sine"); tom(1318, 1310, 0.14, 0.1, "sine", 0.1); },
    perdeu() { tom(300, 140, 0.45, 0.22, "sawtooth"); },
    errou() { tom(200, 180, 0.15, 0.2, "square"); },
    lixo() { ruido(0.2, 0.4, 700); },
    apito() { tom(2100, 2050, 0.35, 0.14, "square"); },
    fim() { [523, 659, 784, 1046].forEach((f, i) => tom(f, f, 0.3, 0.15, "triangle", i * 0.14)); },
  };
})();
$("vol").value = Som.vol; $("volV").textContent = Math.round(Som.vol * 100) + "%";
$("vol").oninput = (e) => { Som.setVol(+e.target.value); $("volV").textContent = Math.round(Som.vol * 100) + "%"; };

// ======================================================================
// Telas: inicial, brigada (a sala de espera) e o fim do expediente
// ======================================================================
function show(id) { for (const s of ["home", "lobby"]) $(s).classList.toggle("hidden", s !== id); $("game").classList.toggle("hidden", id !== "game"); $("bar").classList.toggle("hidden", id === "game"); }
const skinBotoes = (atual) => Object.entries(CP.SKINS).map(([k, s]) => `<button data-skin="${k}" class="${k === (atual || "padrao") ? "on" : ""}">${h(s.name)}</button>`).join("");
const minhaSkin = () => store.get("galera:skin") || "padrao";
function telaInicial() { $("hSkins").innerHTML = skinBotoes(minhaSkin()); }
const myP = () => (S && ME && ME.id ? S.players.find((p) => p.id === ME.id) : null);
// o cartão de uma cozinha: o número, o nome, o texto e os pratos do cardápio
function cartaoCozinha(id, atual, pode) {
  const c = K.COZINHAS[id];
  return `<button class="coz ${id === atual ? "on" : ""}" data-coz="${id}" ${pode ? "" : "disabled"}><span class="num">${id}</span><span><b>${h(c.nome)}</b><small>${h(c.desc)}</small>
    <span class="rec">${c.receitas.map((r) => `<img src="${Mod.figuraReceita(r)}" alt="${h(K.RECEITAS[r].nome)}" title="${h(K.RECEITAS[r].nome)}">`).join("")}</span></span></button>`;
}
function renderLobby() {
  const mine = myP(), isHost = ME && S.host === ME.id;
  const linha = (p) => `<div class="pl ${ME && p.id === ME.id ? "me" : ""}"><i class="dot ${p.online ? "on" : ""}"></i>${h(p.name)}<span class="tag">${p.id === S.host ? "organizador · " : ""}${h((CP.SKINS[p.skin] || {}).name || "")}</span>${isHost && p.id !== ME.id ? `<button class="x" data-kick="${p.id}" title="Tirar da sala">✕</button>` : ""}</div>`;
  const chefs = S.players.filter((p) => p.chef), fora = S.players.filter((p) => !p.chef);
  $("lChefs").innerHTML = chefs.map(linha).join("") + Array.from({ length: Math.max(0, 4 - chefs.length) }, () => `<div class="pl muted" style="font-weight:500">vaga livre na cozinha</div>`).join("");
  $("lFora").innerHTML = fora.length ? "Só olhando: " + fora.map((p) => h(p.name)).join(", ") : "";
  $("btnChef").classList.toggle("hidden", !mine); if (mine) $("btnChef").textContent = mine.chef ? "Só olhar" : "Entrar na cozinha";
  $("lSkins").innerHTML = skinBotoes(mine && mine.skin);
  $("lCoz").innerHTML = Object.keys(K.COZINHAS).map((id) => cartaoCozinha(id, S.config.cozinha, isHost)).join("");
  $("startBox").innerHTML = isHost ? `<button class="primary" id="btnStart" style="width:100%">Abrir a cozinha</button>` : `<p class="muted">Esperando o organizador abrir a cozinha…</p>`;
  if ($("btnStart")) $("btnStart").onclick = () => { Som.unlock(); act("start"); };
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.skin) { store.set("galera:skin", b.dataset.skin); if (ME && ME.id && S) act("skin", { skin: b.dataset.skin }); telaInicial(); if (S && S.phase === "lobby") renderLobby(); }
  else if (b.dataset.coz && S) { store.set("cozinha:cfg", { cozinha: b.dataset.coz }); act("config", { config: { cozinha: b.dataset.coz } }); }
  else if (b.dataset.kick) act("kick", { id: b.dataset.kick });
});
$("btnChef").onclick = () => { const p = myP(); if (p) act("chef", { on: !p.chef }); };

// o fim do expediente: as estrelas, a conta e os botões do organizador
const ESTRELA = (sim) => `<svg viewBox="0 0 24 24" class="${sim ? "sim" : ""}"><path d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z" fill="${sim ? "#f2b632" : "#5a4a3c"}" stroke="#2a1d17" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
function mostrarFim() {
  const ms = G.mesa; if (!ms) return;
  const isHost = ME && S && S.host === ME.id, frase = ["Fecharam a cozinha sem estrela…", "Deu para o gasto!", "Cozinha caprichada!", "Cozinha de chef!"][ms.estrelas];
  $("overBox").innerHTML = `<h2 style="text-align:center">${frase}</h2>
    <div class="estrelas">${[1, 2, 3].map((k) => ESTRELA(ms.estrelas >= k)).join("")}</div>
    <div class="metas">${ms.meta.map((p, k) => `<span>${k + 1}★ ${p}</span>`).join("·")}</div>
    <div class="conta"><span>Pedidos entregues</span><b>${ms.entregues}</b><span>Pedidos perdidos</span><b>${ms.perdidos}</b><span>Gorjetas</span><b>${ms.gorjetas}</b><span class="tot">Total</span><b class="tot">${ms.pontos}</b></div>
    ${isHost ? `<div class="row"><button class="primary" id="btnDeNovo" style="flex:1">De novo</button><button id="btnTrocar" style="flex:1">Trocar de cozinha</button></div>` : `<p class="muted" style="text-align:center">Esperando o organizador…</p>`}`;
  $("over").classList.remove("hidden");
  if ($("btnDeNovo")) $("btnDeNovo").onclick = () => act("start");
  if ($("btnTrocar")) $("btnTrocar").onclick = () => act("lobby");
  if (!G.fimTocado) { G.fimTocado = true; Som.fim(); if (ms.estrelas && !matchMedia("(prefers-reduced-motion: reduce)").matches) Comum.confetti(["#f2b632", "#e2553d", "#fff8ea", "#3aa65b"]); }
}

// ---------- HUD: pedidos, moedas, relógio ----------
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
function desenharPedidos() {
  const ms = G.mesa, box = $("hPed"); if (!ms) { box.innerHTML = ""; return; }
  const ids = new Set(ms.pedidos.map((p) => String(p.id)));
  for (const el of [...box.children]) if (!ids.has(el.dataset.id) && !el.classList.contains("sai")) { el.classList.add("sai"); setTimeout(() => el.remove(), 420); }
  for (const p of ms.pedidos) {
    if (box.querySelector(`[data-id="${p.id}"]`)) continue;
    const R = K.RECEITAS[p.r], vistos = new Map();
    for (const k of R.itens) vistos.set(k, (vistos.get(k) || 0) + 1);
    const ings = [...vistos].map(([k]) => { const [t, e] = k.split(":"); const passo = K.INGREDIENTES[t].passos[K.estadosDe(t).indexOf(e) - 1] || ""; return `<span class="ing"><img src="${Mod.iconeIng(t, e)}" alt="">${passo ? `<em class="${passo}"></em>` : ""}</span>`; }).join("");
    const el = document.createElement("div"); el.className = "ped"; el.dataset.id = p.id;
    el.innerHTML = `<div class="tempo"><i></i></div><img class="fig" src="${Mod.figuraReceita(p.r)}" alt=""><div class="nome">${h(R.nome)}</div><div class="ings">${ings}</div>`;
    box.appendChild(el);
  }
}
function hud(tJogo) {
  const ms = G.mesa; if (!ms) return;
  for (const p of ms.pedidos) {
    const el = $("hPed").querySelector(`[data-id="${p.id}"]`); if (!el) continue;
    const f = Math.max(0, Math.min(1, (p.ate - tJogo) / (p.ate - p.ini))), bar = el.firstChild.firstChild;
    bar.style.width = f * 100 + "%"; bar.style.background = f > 0.5 ? "#3aa65b" : f > 0.25 ? "#f2b632" : "#d9412b";
    el.classList.toggle("urgente", f < 0.2);
  }
  const resta = ms.fase === "conta" ? K.COZINHAS[ms.coz].tempo : Math.max(0, K.COZINHAS[ms.coz].tempo - tJogo);
  $("hRel").textContent = mmss(resta); $("hRel").classList.toggle("pouco", ms.fase === "jogo" && resta <= 30);
  $("hPtsN").textContent = ms.pontos;
  const msg = $("hMsg");
  if (ms.fase === "conta") { const n = Math.ceil(-tJogo); const txt = n > 0 ? String(n) : "Valendo!"; if (msg.textContent !== txt) { msg.textContent = txt; msg.classList.remove("pop"); void msg.offsetWidth; msg.classList.add("pop"); } }
  else if (ms.fase === "jogo" && tJogo < 1.2) { if (msg.textContent !== "Valendo!") msg.textContent = "Valendo!"; }
  else if (ms.fase === "fim") msg.textContent = "";
  else if (msg.textContent) msg.textContent = "";
}
// o texto que sobe da bancada (pontos da entrega)
function flutuar(i, html) {
  const L = G.lugares[i]; if (!L) return;
  const v = L.g.position.clone(); v.y = 1.6; v.project(cam);
  const el = document.createElement("div"); el.className = "flutua"; el.innerHTML = html;
  el.style.left = (v.x * 0.5 + 0.5) * innerWidth + "px"; el.style.top = (-v.y * 0.5 + 0.5) * innerHeight + "px";
  $("game").appendChild(el); setTimeout(() => el.remove(), 1400);
}

// ======================================================================
// Rede: entrar, criar, estado, mesa, pacotes e eventos
// ======================================================================
$("hName").value = store.get("galera:name") || "";
if (urlCode) $("hCode").value = urlCode.toUpperCase();
if (window.Toque && Toque.isTouch()) $("mobileWarn").classList.remove("hidden");
function enter(r) {
  if (!r.ok) { $("hErr").textContent = r.error; return; }
  ME = { code: r.code, id: r.id, token: r.token };
  if (r.id) store.set("cozinha:" + r.code, ME);
  history.replaceState(null, "", "/cozinha/?sala=" + r.code);
  $("roomTag").classList.remove("hidden"); $("rCode").textContent = r.code;
}
$("btnCreate").onclick = () => { const name = $("hName").value.trim(); store.set("galera:name", name); Som.unlock(); socket.emit("create", { name, skin: minhaSkin(), config: store.get("cozinha:cfg") || {} }, enter); };
$("btnJoin").onclick = () => {
  const name = $("hName").value.trim(), code = $("hCode").value.trim().toUpperCase(); store.set("galera:name", name); Som.unlock();
  if (code.length !== 5) return ($("hErr").textContent = "O código tem 5 letras.");
  const saved = store.get("cozinha:" + code) || {};
  socket.emit("join", { code, name, skin: minhaSkin(), id: saved.id, token: saved.token }, enter);
};
$("btnWatch").onclick = () => { const code = $("hCode").value.trim().toUpperCase(); if (code.length !== 5) return ($("hErr").textContent = "Coloque o código da sala."); socket.emit("join", { code, watch: true }, enter); };
$("hCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnJoin").click(); });
$("btnInvite").onclick = async () => { const link = location.origin + "/cozinha/?sala=" + ME.code; try { await navigator.clipboard.writeText(link); toast("Convite copiado! Manda no grupo."); } catch { prompt("Copie o convite:", link); } };
function aoConectar() {
  const code = urlCode ? urlCode.toUpperCase() : null, saved = code && store.get("cozinha:" + code);
  if (ME) socket.emit("join", { code: ME.code, watch: !ME.id, id: ME.id, token: ME.token }, () => {});
  else if (saved && saved.id) socket.emit("join", { code, id: saved.id, token: saved.token }, (r) => { if (r.ok) enter(r); else { show("home"); $("hErr").textContent = r.error; } });
  else if (!G.active) show("home");
}
socket.on("connect", aoConectar);
if (socket.connected) aoConectar();
socket.on("png", (ack) => typeof ack === "function" && ack());
socket.on("removido", () => { toast("O organizador tirou você da sala."); ME = null; S = null; history.replaceState(null, "", "/cozinha/"); $("roomTag").classList.add("hidden"); pararJogo(); show("home"); });
socket.on("state", (st) => {
  S = st;
  if (st.phase === "lobby") { if (G.active) pararJogo(); show("lobby"); renderLobby(); return; }
  const chave = st.match.coz + "|" + st.match.jogadores.map((j) => j.id + ":" + j.skin).join();
  if (!G.active || G.matchKey !== chave) comecar(chave);
  if (st.phase !== "over") $("over").classList.add("hidden");
});
socket.on("mesa", (ms) => {
  if (!G.active || ms.coz !== G.coz) { G.mesaPendente = ms; return; }
  const nova = !G.mesa || ms.t < G.mesa.t - 1; // partida nova (de novo): zera o fim
  G.mesa = ms; G.mesaEm = performance.now();
  if (nova) { G.fimTocado = false; $("over").classList.add("hidden"); $("hPed").innerHTML = ""; reposicionar(); }
  aplicarMesa(); desenharPedidos();
  if (ms.fase === "fim") mostrarFim();
});
socket.on("snap", (d) => { if (!G.active) return; G.buf.push(d); if (G.buf.length > 30) G.buf.shift(); });
socket.on("ev", (lista) => { if (G.active) for (const e of lista) aoEvento(e); });
function aoEvento(e) {
  const meu = e.j && e.j === G.myId;
  switch (e.tipo) {
    case "abriu": Som.apito(); break;
    case "pegou": if (meu) Som.pegar(); break;
    case "soltou": if (meu) Som.soltar(); break;
    case "juntou": Som.juntar(); break;
    case "picou": Som.picar(); break;
    case "lavou": Som.lavar(); break;
    case "pronto": Som.pronto(); break;
    case "queimou": Som.queimou(); toast("Queimou! Jogue no lixo e comece de novo."); break;
    case "entregou": Som.entregou(); flutuar(e.i, `+${e.pontos}${e.gorjeta ? `<small>+${e.gorjeta} de gorjeta</small>` : ""}`); break;
    case "pedido": Som.pedido(); break;
    case "perdeu": Som.perdeu(); toast(`Um cliente desistiu: ${K.RECEITAS[e.r].nome.toLowerCase()} (-${K.TEMPOS.multa}).`); break;
    case "errou": if (meu) { Som.errou(); toast(e.msg); } break;
    case "lixo": Som.lixo(); break;
  }
}

// ======================================================================
// Começar e parar
// ======================================================================
function comecar(chave) {
  if (G.active) pararJogo();
  G.matchKey = chave;
  montarCozinha(S.match.coz);
  S.match.jogadores.forEach((j, k) => G.corpos.set(j.id, criarCorpo(j, k)));
  const eu = ME && S.match.jogadores.find((j) => j.id === ME.id);
  G.myId = eu ? eu.id : null; G.me = eu ? G.corpos.get(eu.id) : null;
  G.buf = []; G.mesa = null; G.fimTocado = false; $("hPed").innerHTML = ""; $("hMsg").textContent = "";
  show("game"); resize(); G.active = true; pausar(false);
  $("hHint").innerHTML = G.me ? `<kbd>Espaço</kbd> pegar/soltar · <kbd>F</kbd> picar/lavar · <kbd>Shift</kbd> impulso · <kbd>Esc</kbd> menu` : "Assistindo";
  if (window.Toque && Toque.isTouch()) Toque.setup({
    buttons: [{ icon: ICONE.impulso, label: "impulso", code: "ShiftLeft" }, { icon: ICONE.mao, label: "pegar", code: "Space", big: true }, { icon: ICONE.faca, label: "picar", code: "KeyF" }],
    top: [{ icon: ICONE.menu, down: () => pausar(true) }],
    onStick: (x, y) => { G.stick = [x, y]; },
  });
  if (window.Toque) Toque.show(!!G.me);
  if (G.mesaPendente && G.mesaPendente.coz === G.coz) { const ms = G.mesaPendente; G.mesaPendente = null; G.mesa = ms; G.mesaEm = performance.now(); aplicarMesa(); desenharPedidos(); if (ms.fase === "fim") mostrarFim(); }
}
// os desenhos dos botões de toque
const svg = (d) => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONE = {
  mao: svg('<path d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11M10 10.5V4.5a1.5 1.5 0 0 1 3 0V11M13 10.5V5.5a1.5 1.5 0 0 1 3 0V12M16 11V8.5a1.5 1.5 0 0 1 3 0V14c0 4-3 7-7 7h-1c-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 0 1 2.6-1.5L7 14"/>'),
  faca: svg('<path d="M3 21l9-9M12 12l7.5-7.5a2.1 2.1 0 0 1 3 3L15 15z"/><path d="M5 19l-2 2"/>'),
  impulso: svg('<path d="M4 12h11M11 6l6 6-6 6M19 6v12"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
};
// partida nova na mesma cozinha: cada um volta para o seu lugar
function reposicionar() { S.match.jogadores.forEach((j, k) => { const c = G.corpos.get(j.id); if (c) { [c.x, c.z] = G.mapa.inicio[k]; c.vx = c.vz = 0; c.d = Math.PI; } }); G.buf = []; }
function pararJogo() {
  G.active = false; limparCorpos(); limparCozinha(); G.mesa = null; G.me = null; G.myId = null; G.buf = []; G.matchKey = null;
  if (window.Toque) Toque.show(false);
  $("over").classList.add("hidden"); $("pause").classList.add("hidden"); $("hPed").innerHTML = "";
}
function sair() {
  if (!confirm("Sair da cozinha?")) return;
  socket.disconnect(); ME = null; S = null; pararJogo(); history.replaceState(null, "", "/cozinha/"); $("roomTag").classList.add("hidden"); show("home"); socket.connect();
}
$("btnLeave").onclick = sair;
function pausar(on) { G.pausa = on; $("pause").classList.toggle("hidden", !on); if (window.Toque) Toque.show(!on && !!G.me && G.active); }
$("btnResume").onclick = () => { Som.unlock(); pausar(false); if (window.Toque && Toque.isTouch()) Toque.fullscreen(); };

// ======================================================================
// Controles: teclado, controle e toque (os botões da tela apertam as mesmas teclas)
// ======================================================================
const keys = new Set();
const PEGAR = new Set(["Space", "KeyJ", "KeyE"]), USAR = new Set(["KeyF", "KeyK", "ControlLeft", "ControlRight"]), IMPULSO = new Set(["ShiftLeft", "ShiftRight", "KeyL"]);
addEventListener("keydown", (e) => {
  if (!G.active) return;
  if (e.code === "Escape") { pausar(!G.pausa); return; }
  if (e.code.startsWith("Arrow") || e.code === "Space" || (e.ctrlKey && e.code !== "ControlLeft" && e.code !== "ControlRight")) e.preventDefault();
  if (!e.repeat && !G.pausa) { if (PEGAR.has(e.code)) pegar(); if (USAR.has(e.code)) usar(); if (IMPULSO.has(e.code)) G.dash = true; }
  keys.add(e.code);
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
const PAD = { prev: [], lx: 0, ly: 0 };
function lerPad() {
  const gp = [...(navigator.getGamepads?.() || [])].find((g) => g && g.connected); if (!gp) { PAD.lx = PAD.ly = 0; return; }
  const dz = (v) => (Math.abs(v || 0) < 0.2 ? 0 : v); PAD.lx = dz(gp.axes[0]); PAD.ly = dz(gp.axes[1]);
  gp.buttons.forEach((b, i) => { const v = b.pressed, era = !!PAD.prev[i]; PAD.prev[i] = v; if (!v || era) return; if (i === 9) pausar(!G.pausa); else if (G.pausa) return; else if (i === 0) pegar(); else if (i === 2 || i === 1) usar(); else if (i === 5 || i === 7 || i === 3) G.dash = true; });
}
function entrada() {
  let x = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  let z = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  if (PAD.lx || PAD.ly) { x = PAD.lx; z = PAD.ly; }
  if (G.stick && (Math.abs(G.stick[0]) > 0.15 || Math.abs(G.stick[1]) > 0.15)) { x = G.stick[0]; z = G.stick[1]; } // o joystick da tela é analógico
  const dash = !!G.dash; G.dash = false;
  return { x, z, dash };
}
const pos = () => { const m = G.me; return { x: m.x, z: m.z, vx: m.vx, vz: m.vz, d: m.d }; };
function pegar() { if (!G.me || !G.mesa || G.mesa.fase !== "jogo") return; Som.unlock(); socket.emit("pegar", pos()); }
function usar() { if (!G.me || !G.mesa || G.mesa.fase !== "jogo") return; Som.unlock(); socket.emit("usar", pos()); }

// ======================================================================
// O laço: meu cozinheiro (aqui), os outros (interpolados), a cozinha e o HUD
// ======================================================================
let ultimo = performance.now();
function quadro(agora) {
  requestAnimationFrame(quadro);
  desenhar(agora);
}
function desenhar(agora) {
  const dt = Math.max(0, Math.min(0.05, (agora - ultimo) / 1000)); ultimo = Math.max(ultimo, agora);
  if (!G.active || !G.mapa) return;
  lerPad();
  const ms = G.mesa, tJogo = ms ? ms.t + (ms.fase === "fim" ? 0 : (agora - G.mesaEm) / 1000) : -3;
  // os outros: 90 ms no passado, entre dois pacotes
  const alvoT = Date.now() - INTERP;
  let a = null, b = null;
  for (let k = G.buf.length - 1; k >= 0; k--) if (G.buf[k].t <= alvoT) { a = G.buf[k]; b = G.buf[k + 1] || a; break; }
  if (!a && G.buf.length) a = b = G.buf[0];
  if (a) {
    const f = b.t > a.t ? Math.min(1, (alvoT - a.t) / (b.t - a.t)) : 1, porId = new Map(b.j.map((x) => [x[0], x]));
    for (const ja of a.j) {
      const c = G.corpos.get(ja[0]), jb = porId.get(ja[0]) || ja; if (!c) continue;
      if (c === G.me) { // o servidor me segurou (ou a partida voltou): obedeço se ficou longe demais
        const ult = G.buf[G.buf.length - 1].j.find((x) => x[0] === c.id);
        if (ult && Math.hypot(ult[1] - c.x, ult[2] - c.z) > 2.5) { c.x = ult[1]; c.z = ult[2]; }
        continue;
      }
      c.x = ja[1] + (jb[1] - ja[1]) * f; c.z = ja[2] + (jb[2] - ja[2]) * f; c.vx = jb[3]; c.vz = jb[4];
      let dd = jb[5] - ja[5]; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); c.d = ja[5] + dd * f;
    }
  }
  // eu: as mesmas regras de movimento do servidor; os outros me empurram
  if (G.me && ms && ms.fase === "jogo" && !G.pausa) {
    K.mover(G.mapa, G.me, entrada(), dt);
    for (const c of G.corpos.values()) if (c !== G.me) K.afastar(G.me, c);
    K.colidir(G.mapa, G.me);
    if (agora - G.ultEnvio > ENVIO) { G.ultEnvio = agora; socket.volatile.emit("st", pos()); }
  } else if (G.me) { G.me.vx = G.me.vz = 0; }
  // a bancada da frente acende
  const alvo = G.me && ms && ms.fase === "jogo" ? K.alvo(G.mapa, G.me) : null;
  if (G.luz) { G.luz.visible = !!alvo; if (alvo) G.luz.position.set((alvo.c + 0.5) * T, alvo.tipo === "lixo" ? 0.92 : Mod.ALTURA + 0.01, (alvo.r + 0.5) * T); }
  // os bonecos
  const trab = ms ? ms.trab || {} : {};
  for (const c of G.corpos.values()) {
    const vel = Math.hypot(c.vx, c.vz);
    c.model.position.set(c.x, 0, c.z);
    let dd = c.d - c.model.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); c.model.rotation.y += dd * Math.min(1, dt * 18);
    animate(c.model, vel, dt, c.st, 0);
    const u = c.model.userData;
    if (trab[c.id] != null && u.arms) { // picando ou lavando: o braço sobe e desce
      const tt = performance.now() / 1000, L = G.lugares[trab[c.id]];
      u.arms[1].rotation.x = 1.3 + Math.sin(tt * (L && L.t.tipo === "pia" ? 10 : 18)) * 0.45;
      u.arms[0].rotation.x = 1.1;
      if (c === G.me && L && L.t.tipo === "tabua" && tt - G.tChop > 0.22) { G.tChop = tt; Som.picar(); }
    }
  }
  barras(tJogo); hud(tJogo); fumaca(dt);
  renderer.render(scene, cam);
}
requestAnimationFrame(quadro);

telaInicial();
// #debug: window.__cozinha para os testes; quadros(n) anda n quadros na mão (o painel escondido pausa o requestAnimationFrame)
if (location.hash === "#debug") window.__cozinha = { G, get S() { return S; }, get ME() { return ME; }, K, socket, keys, quadros: (n = 1) => { for (let i = 0; i < n; i++) desenhar(ultimo + 1000 / 60); } };
