// Corrida da Galera — o pódio 3D da tela de resultado do GP: os carros dos 3 primeiros, cada um em cima do seu degrau.
// UM renderizador, UMA cena e UMA câmera (um só contexto WebGL) para os três carros. O canvas fica atrás da tela de resultado (resultado-gp.js)
// e cada carro é posto na tela onde está o degrau de HTML dele: a cada quadro lemos onde o topo do degrau está (ele sobe animado) e
// "penduramos" o carro nesse ponto, todos na mesma profundidade, então o tamanho é igual e o carro acompanha o degrau subindo.
// Cada carro é o modelo LEVE de 2026 (carro-leve.glb) com a pintura da equipe do piloto, o número e o composto, girando devagar, num anel
// e numa luz na cor da equipe (o seu carro ganha também um anel dourado). Independente do palco da sala (palco.js): a sala pára o
// palco dela a cada estado do servidor, e foi isso que fazia o carro sumir da tela de resultado. Com "reduzir movimento" os carros
// ficam parados, de três quartos. Sem WebGL, `montar` devolve falso e a tela fica com os logos grandes. `soltar` libera tudo.
// A festa: os pilotos (podio-pilotos.js, que só é baixado aqui) entram um por quadro e tomam o lugar dos carros, de macacão e capacete, comemorando. O carro segura a
// tela enquanto eles baixam e fica para sempre se a carga falhar; `soltar` também libera o que os pilotos dividem.
import * as THREE from "three";
import { makeKart, dropKart, vitrinePiloto, CARS3, KS } from "./carros.js";
import { trocarComposto, f1Pronto } from "./f1.js";

const reduz = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
const FOV = 22, TF = Math.tan((FOV / 2) * Math.PI / 180); // o campo de visão (graus) e a tangente da metade dele
const INCLINA = 11 * Math.PI / 180; // a câmera olha um pouco de cima, para o anel no chão virar uma elipse
const RAIO = 25; // o raio do anel de luz, nas unidades do carro (o carro tem ~44 de comprimento)
const YAW_FRENTE = -Math.PI * 0.437; // de três quartos, mostrando a frente (a mesma vista da foto da garagem e do palco da sala)
const GIRO = 0.3; // rad/s: ~21 s por volta
const OCIOSO_MS = 4000; // sem tela para desenhar por tanto tempo: solta tudo (a sala voltou e ninguém chamou `soltar`)
const DOURADO = new THREE.Color("#ffd23f");
const TROCA_MS = 420; // o carro sai e o piloto entra
const YAW_PILOTO = { 1: 0, 2: 0.3, 3: -0.3 }; // os de fora viram um pouco para o meio do pódio

export const podio3d = { ok: true, montar, desprender, soltar };

let modPilotos = null, festaId = 0;
let renderer = null, cena = null, cam = null, tex = null, geos = null, canvas = null;
let host = null, ro = null, raf = 0, ultimo = 0, t0 = 0, quenteAte = 0, semHostDesde = 0, tam = "", sujo = true;
let stands = []; // { chave, id, g, car, pos, slot, bloco, mats, luz, vivoDesde, fase, eu, escala }

function piscina() { // a mancha de luz no chão, sem luz de verdade
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, "#ffffffcc"); g.addColorStop(0.55, "#ffffff40"); g.addColorStop(1, "#ffffff00");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}

function iniciar() {
  if (renderer) return true;
  if (!podio3d.ok) return false;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { podio3d.ok = false; renderer = null; return false; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setClearColor(0x000000, 0);
  canvas = renderer.domElement; canvas.className = "rg-podio3d"; canvas.setAttribute("aria-hidden", "true");
  canvas.addEventListener("webglcontextlost", (ev) => { ev.preventDefault(); podio3d.ok = false; soltar(); }); // a placa de vídeo perdeu o contexto: ficam os logos
  cena = new THREE.Scene(); cam = new THREE.PerspectiveCamera(FOV, 2, 10, 4000);
  cam.rotation.x = -INCLINA; cam.updateMatrixWorld(true);
  cena.add(new THREE.HemisphereLight(0xdfe6ff, 0x16181f, 1.3));
  const sol = new THREE.DirectionalLight(0xffffff, 2.4); sol.position.set(-40, 70, 60); cena.add(sol);
  const contra = new THREE.DirectionalLight(0xffffff, 1.2); contra.position.set(50, 25, -60); cena.add(contra);
  tex = piscina();
  geos = { anel: new THREE.RingGeometry(RAIO - 1.1, RAIO, 96), fino: new THREE.RingGeometry(RAIO + 2.3, RAIO + 2.7, 96), ouro: new THREE.RingGeometry(RAIO + 4.6, RAIO + 5.6, 96), luz: new THREE.CircleGeometry(RAIO + 3, 64) };
  if (window.ResizeObserver) ro = new ResizeObserver(() => { ajustar(); pedir(); });
  f1Pronto.then(() => pedir());
  return true;
}

const pedir = () => { sujo = true; quenteAte = performance.now() + 6000; }; // com "reduzir movimento" desenha por uns segundos (o modelo chega, os degraus sobem) e pára

function ajustar() {
  if (!renderer || !host) return;
  const w = Math.max(2, host.clientWidth), hh = Math.max(2, host.clientHeight), pr = Math.min(window.devicePixelRatio || 1, 1.5), t = `${w}x${hh}@${pr}`;
  if (t === tam) return; tam = t; // (setSize limpa o quadro: só quando o tamanho muda)
  renderer.setPixelRatio(pr); renderer.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); sujo = true;
}

// um carro do pódio: o grupo (no ponto do degrau) com o carro, o anel, a luz no chão e a luz de verdade na cor da equipe
function criarStand(it) {
  const cor = new THREE.Color(it.corEquipe || "#e10600"), g = new THREE.Group(), mats = [];
  const mat = (m) => { mats.push(m); return m; };
  const car = makeKart(it.cor, it.modelo, false, "", it.mods, g, true, { numero: it.numero, sigla: it.sigla }); // leve: o carro-leve.glb, sem sombra projetada
  if (it.composto) trocarComposto(car.kt, it.composto);
  const plano = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.rotation.x = -Math.PI / 2; o.position.y = y; g.add(o); return o; };
  plano(geos.anel, mat(new THREE.MeshBasicMaterial({ color: cor, toneMapped: false, side: THREE.DoubleSide })), 0.05);
  plano(geos.fino, mat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, toneMapped: false, side: THREE.DoubleSide })), 0.05);
  plano(geos.luz, mat(new THREE.MeshBasicMaterial({ map: tex, color: cor, transparent: true, opacity: it.eu ? 0.95 : 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })), 0.07);
  if (it.eu) plano(geos.ouro, mat(new THREE.MeshBasicMaterial({ color: DOURADO, toneMapped: false, side: THREE.DoubleSide })), 0.05);
  const luz = new THREE.PointLight(cor, it.eu ? 5200 : 3600, 0, 2); luz.position.set(0, 34, -30); g.add(luz); // o contraluz na cor da equipe, atrás do carro
  const luz2 = new THREE.PointLight(cor, 1500, 0, 2); luz2.position.set(0, 14, 34); g.add(luz2); // e um toque na frente
  g.visible = false; cena.add(g);
  return { g, car, mats, luz, luz2 };
}
function soltarStand(s) {
  s.pil?.soltar(); s.pil = null;
  cena.remove(s.g); if (s.car) dropKart(s.car); s.car = null; s.mats.forEach((m) => m.dispose()); s.luz.dispose?.(); s.luz2.dispose?.();
  s.slot?.classList.remove("tem-3d");
}

// ---- a festa: baixa os pilotos só agora e monta um por quadro, para a tela não engasgar ----
const proximoQuadro = () => new Promise((ok) => requestAnimationFrame(ok));
const logoDe = (s) => (!s.dados.temLogo ? Promise.resolve(null) : new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = `/api/corrida/logo/${s.dados.equipe}`; }));
async function chamarPilotos() {
  const id = ++festaId;
  try {
    modPilotos ||= await import("./podio-pilotos.js");
    await modPilotos.carregarPilotos();
    for (const s of [...stands]) {
      if (s.pil) continue;
      const logo = await logoDe(s);
      await proximoQuadro();
      if (id !== festaId) return;
      if (!stands.includes(s) || s.pil) continue;
      s.pil = modPilotos.criarPilotoPodio({ ...s.dados, logo }, reduz.matches);
      s.pil.g.rotation.y = YAW_PILOTO[s.pos] || 0; s.pil.g.scale.setScalar(0.001); s.g.add(s.pil.g); s.pilDesde = 0;
      pedir();
    }
  } catch (e) { console.warn("Corrida: os pilotos do pódio não carregaram; ficam os carros", e); }
}
// tira o carro de quem já tem o piloto na tela (e solta a memória dele)
function trocaDoCarro(s, agora) {
  if (!s.pil) return 1;
  if (!s.pilDesde) s.pilDesde = agora;
  const e = reduz.matches ? 1 : Math.min(1, (agora - s.pilDesde) / TROCA_MS);
  if (s.car) { if (e >= 1) { dropKart(s.car); s.car = null; } else s.car.g.scale.setScalar(Math.max(0.001, (1 - e) * (s.car.escalaBase || 1))); }
  return 1 - (1 - e) * (1 - e);
}

// põe o canvas no palco do pódio (`el`) e os carros nos degraus. itens: [{ id, pos, slot, bloco, cor, modelo, mods, corEquipe, equipe, temLogo, numero, sigla, composto, eu }]
function montar(el, itens) {
  if (!el || !itens || !itens.length || !iniciar()) return false;
  if (host !== el) { if (ro && host) ro.unobserve(host); host = el; tam = ""; if (ro) ro.observe(el); }
  if (canvas.parentNode !== el) el.prepend(canvas);
  semHostDesde = 0;
  const velhos = stands; stands = [];
  for (const it of itens) {
    const chave = [it.pos, it.cor, it.modelo, JSON.stringify(it.mods || {}), it.numero, it.sigla, it.composto, it.corEquipe, it.equipe, it.eu ? 1 : 0].join("|");
    const i = velhos.findIndex((s) => s.chave === chave);
    let s;
    if (i >= 0) { s = velhos.splice(i, 1)[0]; s.vivoDesde = 0; } // o mesmo carro: só troca o degrau (a tela foi refeita)
    else {
      try { s = { chave, ...criarStand(it), fase: it.pos * 1.7, vivoDesde: 0, escala: it.pos === 1 ? 1.1 : 1, pil: null, pilDesde: 0, dados: { pos: it.pos, equipe: it.equipe, corEquipe: it.corEquipe, cor: it.cor, numero: it.numero, sigla: it.sigla, temLogo: !!it.temLogo } }; s.car.escalaBase = s.car.g.scale.x; } catch (e) { console.warn("Corrida: carro do pódio não montou", e); continue; }
    }
    s.slot = it.slot; s.bloco = it.bloco; s.pos = it.pos; stands.push(s);
  }
  velhos.forEach(soltarStand);
  if (!stands.length) { soltar(); podio3d.ok = false; return false; }
  ajustar(); pedir();
  if (!raf) { ultimo = performance.now(); t0 = ultimo; raf = requestAnimationFrame(quadro); }
  chamarPilotos();
  return true;
}
// a tela vai ser refeita (o servidor mandou outro estado): tira o canvas do DOM e guarda os carros por uns segundos, para a tela nova pegá-los de volta
function desprender() {
  if (canvas && canvas.parentNode) canvas.remove();
  for (const s of stands) { s.slot?.classList.remove("tem-3d"); s.slot = s.bloco = null; }
  if (ro && host) ro.unobserve(host);
  host = null; semHostDesde = performance.now();
}
// sai da tela de resultado: solta os carros, a cena e o renderizador
function soltar() {
  if (raf) cancelAnimationFrame(raf); raf = 0; festaId++;
  stands.forEach(soltarStand); stands = [];
  modPilotos?.liberarPilotos();
  if (canvas && canvas.parentNode) canvas.remove();
  if (ro && host) ro.unobserve(host);
  if (renderer) {
    if (cena) cena.traverse((o) => { if (o.isMesh || o.isLight) o.dispose?.(); });
    if (geos) Object.values(geos).forEach((x) => x.dispose()); if (tex) tex.dispose();
    renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* já perdido */ }
  }
  renderer = cena = cam = tex = geos = canvas = host = null; tam = ""; semHostDesde = 0;
}

// onde cada carro fica: no topo do degrau dele (todos na mesma profundidade, então todos do mesmo tamanho)
const v = new THREE.Vector3();
function posicionar(agora) {
  const hr = host.getBoundingClientRect(), w = hr.width, hh = hr.height;
  let minW = 1e9, minH = 1e9;
  for (const s of stands) { const r = s.slot.getBoundingClientRect(); minW = Math.min(minW, r.width); minH = Math.min(minH, r.height); }
  const anelPx = Math.max(36, Math.min(minW * 0.96, minH * 2.9)); // o diâmetro do anel na tela: cabe na coluna e na altura que sobra em cima do degrau
  const ppu = anelPx / (2 * RAIO), dist = (hh / 2) / (TF * ppu); // pixels por unidade e a distância da câmera que dá esse tamanho
  const asp = w / hh, alturaPx = Math.min(minH * 0.76, minW * 1.5); // o piloto em pé, deixando lugar acima da cabeça para os braços levantados
  for (const s of stands) {
    const sr = s.slot.getBoundingClientRect(), br = s.bloco.getBoundingClientRect();
    const pronto = !!s.pil || !s.car.kt.prov || !s.car.kt.prov.parent || s.car.kt.modelo.falhou; // o piloto chegou, ou o carro de F1 já substituiu a silhueta provisória
    const subiu = br.height >= s.bloco.offsetHeight * 0.985 && sr.width > 0; // o degrau terminou de subir
    const ligado = subiu && pronto;
    if (ligado && !s.vivoDesde) s.vivoDesde = agora;
    s.g.visible = ligado; s.slot.classList.toggle("tem-3d", ligado);
    if (!ligado) continue;
    const px = sr.left + sr.width / 2 - hr.left, py = br.top - hr.top - anelPx * 0.07;
    v.set((px / w * 2 - 1) * TF * asp, (1 - py / hh * 2) * TF, -1).multiplyScalar(dist).applyQuaternion(cam.quaternion);
    s.g.position.copy(v);
    const e = reduz.matches ? 1 : Math.min(1, (agora - s.vivoDesde) / 380), f = 1 - (1 - e) * (1 - e); // o carro "entra" crescendo
    s.g.scale.setScalar(Math.max(0.02, f) * s.escala);
    if (s.pil) s.pil.g.scale.setScalar(Math.max(0.001, trocaDoCarro(s, agora)) * alturaPx / ppu / 1.8); // (o boneco tem 1,8 m; a escala do degrau já vem do grupo)
  }
  return dist;
}

function quadro(agora) {
  raf = requestAnimationFrame(quadro);
  const dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora;
  const visivel = host && host.isConnected && host.clientWidth > 0 && !document.hidden;
  if (!visivel) { // a tela sumiu (outra fase) ou está escondida: não desenha; se demorar, solta tudo
    if (!host || !host.isConnected || !host.clientWidth) { if (!semHostDesde) semHostDesde = agora; else if (agora - semHostDesde > OCIOSO_MS) soltar(); }
    return;
  }
  semHostDesde = 0;
  const hr = host.getBoundingClientRect();
  if (hr.bottom < 0 || hr.top > innerHeight) return; // rolou para fora da janela
  ajustar();
  const parado = reduz.matches;
  if (parado && !sujo && agora > quenteAte) return;
  posicionar(agora);
  const t = (agora - t0) / 1000;
  for (const s of stands) {
    if (!s.g.visible) continue;
    if (s.car) { s.car.g.rotation.y = parado ? YAW_FRENTE : YAW_FRENTE + t * GIRO + s.fase; if (!parado) vitrinePiloto(s.car, dt); }
    s.pil?.atualizar(dt);
  }
  renderer.render(cena, cam); sujo = false;
}
