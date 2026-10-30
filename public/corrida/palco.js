// Corrida da Galera — o palco 3D da sala: o carro da equipe girando devagar num palco escuro, com a luz e o anel na cor da equipe.
// Usa o mesmo carro da corrida e da garagem (`makeKart`, de carros.js, com a pintura da equipe de f1-pintura.js) num renderizador
// só dele, ao vivo, que roda enquanto o palco está na tela (a sala escondida não desenha nada). Com "reduzir movimento" o carro
// fica parado, de três quartos. Sem WebGL, `palco.ok` é falso e a sala mostra a foto parada de `carPreview`.
import * as THREE from "three";
import { makeKart, dropKart } from "./carros.js";

const reduz = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
let renderer = null, cena = null, cam = null, anel = null, rim1 = null, rim2 = null, carro = null, chave = "", host = null, ro = null, raf = 0, ultimo = 0, sujo = true, tam = "";
const ANGULO_INICIAL = Math.PI * 0.78; // de três quartos, mostrando a frente (como a foto da garagem)
let angulo = ANGULO_INICIAL;
export const palco = { ok: true, montarEm, parar, mostrar };

function piscina() { // a mancha de luz no chão, sem luz de verdade (o resultado não depende da escala do jogo)
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, "#ffffffcc"); g.addColorStop(0.55, "#ffffff40"); g.addColorStop(1, "#ffffff00");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}

function iniciar() {
  if (renderer) return true;
  if (!palco.ok) return false;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { palco.ok = false; renderer = null; return false; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "sn-palco3d"; renderer.domElement.setAttribute("aria-hidden", "true");
  cena = new THREE.Scene(); cam = new THREE.PerspectiveCamera(28, 16 / 9, 1, 600);
  cena.add(new THREE.HemisphereLight(0xdfe6ff, 0x16181f, 1.25));
  const sol = new THREE.DirectionalLight(0xffffff, 2.6); sol.position.set(-40, 70, -30); cena.add(sol);
  rim1 = new THREE.DirectionalLight(0xffffff, 2.2); rim1.position.set(50, 25, 40); cena.add(rim1); // o contraluz na cor da equipe
  rim2 = new THREE.DirectionalLight(0xffffff, 1.4); rim2.position.set(-60, 18, 50); cena.add(rim2);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(31, 32.5, 1.6, 72), new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.38, metalness: 0.65 }));
  disco.position.y = -0.8; cena.add(disco);
  anel = new THREE.Mesh(new THREE.RingGeometry(27.6, 28.6, 96), new THREE.MeshBasicMaterial({ color: 0xe10600, toneMapped: false, side: THREE.DoubleSide }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = 0.04; cena.add(anel);
  const fino = new THREE.Mesh(new THREE.RingGeometry(30.2, 30.6, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, toneMapped: false, side: THREE.DoubleSide }));
  fino.rotation.x = -Math.PI / 2; fino.position.y = 0.04; cena.add(fino);
  const luz = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshBasicMaterial({ map: piscina(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  luz.rotation.x = -Math.PI / 2; luz.position.y = 0.06; cena.add(luz);
  if (window.ResizeObserver) ro = new ResizeObserver(() => ajustar());
  return true;
}

function ajustar() {
  if (!renderer || !host) return;
  const w = Math.max(2, host.clientWidth), hh = Math.max(2, host.clientHeight), pr = Math.min(window.devicePixelRatio || 1, 1.75), t = `${w}x${hh}@${pr}`;
  if (t === tam) return; tam = t; // (setSize limpa o quadro: só quando o tamanho muda)
  renderer.setPixelRatio(pr); renderer.setSize(w, hh, false);
  const asp = w / hh; cam.aspect = asp; // o carro tem de caber também numa vitrine mais alta que larga (celular)
  const d = 58 * Math.min(1.7, Math.max(1, 1.7 / asp));
  cam.position.set(-0.62 * d, 0.2 * d + 3, -0.76 * d); cam.lookAt(0, 4, 0); cam.updateProjectionMatrix(); sujo = true;
}

// põe o canvas do palco dentro de `el` (a vitrine da etapa) e começa a desenhar
function montarEm(el) {
  if (!el || !iniciar()) return false;
  if (host !== el) {
    if (ro && host) ro.unobserve(host);
    host = el; tam = ""; el.prepend(renderer.domElement); if (ro) ro.observe(el);
  }
  ajustar();
  if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(quadro); }
  return true;
}
// sai da tela: pára o laço e solta o carro (a etapa não tem palco, a sala some ou a corrida começa)
function parar() {
  if (raf) cancelAnimationFrame(raf); raf = 0;
  if (carro) { dropKart(carro); carro = null; chave = ""; }
  if (renderer && renderer.domElement.parentNode) renderer.domElement.remove();
  if (ro && host) ro.unobserve(host);
  host = null; tam = "";
}
// o carro da vitrine: refaz só quando a pintura, a cor, o modelo ou o carregamento mudam; o anel e a luz seguem a cor da equipe
function mostrar({ cor, modelo, mods, corEquipe, prontoF1 }) {
  if (!renderer) return;
  const nova = [cor, modelo, JSON.stringify(mods || {}), prontoF1 ? 1 : 0].join("|"), c = new THREE.Color(corEquipe || "#e10600");
  anel.material.color.copy(c); rim1.color.copy(c); rim2.color.set(0xffffff).lerp(c, 0.45);
  if (nova !== chave) {
    if (carro) { dropKart(carro); carro = null; }
    chave = nova;
    try { carro = makeKart(cor, modelo, false, "", mods, cena); carro.g.rotation.y = angulo; } catch (e) { carro = null; palco.ok = false; }
  }
  sujo = true;
}

function quadro(t) {
  raf = requestAnimationFrame(quadro);
  const dt = Math.min(0.1, (t - ultimo) / 1000); ultimo = t;
  if (!host || !host.isConnected || document.hidden || !host.clientWidth) return;
  if (carro && !reduz.matches) { angulo += dt * 0.36; carro.g.rotation.y = angulo; sujo = true; } // ~17 s por volta
  if (sujo) { renderer.render(cena, cam); sujo = !reduz.matches; }
}
