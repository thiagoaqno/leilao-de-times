// Ajustes pessoais no lobby: usa o carro e os espelhos da corrida numa pequena cena de pista.
import * as THREE from "three";
import { makeKart, dropKart, ocultarPiloto, MODS_PADRAO } from "./carros.js";
import { quadroEspelhosPreview } from "./espelhos.js";
import { EDITAVEIS, camposDe, ajusteDe, definir, restaurarCamera } from "./camera-ajuste.js";
import { ajusteEspelho, definirEspelho, restaurarEspelhos } from "./retrovisores-ajuste.js";
import { NOMES } from "./cameras.js";
import { estiloHud, definirEstiloHud, htmlHudTelemetria, atualizarHudTelemetria, posicionarHudNoHalo } from "./hud-telemetria.js";

let renderer, cena, camera, kart, host, raf = 0, chave = "", modo = "cockpit", controles;
const $ = (s) => document.querySelector(s);
function iniciar() {
  if (renderer) return true;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (_) { return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.toneMapping = THREE.ACESFilmicToneMapping;
  cena = new THREE.Scene(); cena.background = new THREE.Color("#a8c5df");
  camera = new THREE.PerspectiveCamera(64, 1, 0.5, 3000);
  cena.add(new THREE.HemisphereLight(0xe4f1ff, 0x5c5a51, 2));
  const sol = new THREE.DirectionalLight(0xffffff, 2); sol.position.set(-100, 180, -60); cena.add(sol);
  const plano = (w, h, cor, x, y, z) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: cor })); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); cena.add(o); };
  plano(1300, 1800, 0x4f7441, 0, -0.3, 0); plano(180, 1800, 0x34363a, 0, -0.2, 0);
  for (let z = -850; z < 850; z += 60) { plano(1.5, 30, 0xecebe2, -60, -0.1, z); plano(1.5, 30, 0xecebe2, 60, -0.1, z); }
  const bloco = new THREE.BoxGeometry(7, 14, 7);
  for (let z = -300; z < 600; z += 85) for (const x of [-100, 100]) { const o = new THREE.Mesh(bloco, new THREE.MeshStandardMaterial({ color: z % 170 ? 0xe9e9e4 : 0xd92d32 })); o.position.set(x, 7, z); cena.add(o); }
  // Carros de referência atrás ajudam a perceber para onde cada espelho aponta.
  for (const [x, z, cor] of [[-30, 145, 0xed3030], [35, 220, 0x2987e8]]) {
    const carro = new THREE.Group(), tinta = new THREE.MeshStandardMaterial({ color: cor }), pneu = new THREE.MeshStandardMaterial({ color: 0x111215 });
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(15, 4, 36), tinta); corpo.position.y = 5; carro.add(corpo);
    for (const xx of [-9, 9]) for (const zz of [-11, 11]) { const roda = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 7), pneu); roda.position.set(xx, 4, zz); carro.add(roda); }
    carro.position.set(x, 0, z); cena.add(carro);
  }
  return true;
}
function linhas() {
  const a = ajusteDe(modo);
  $("#alCamCampos").innerHTML = camposDe(modo).map(c => `<label><span>${c.nome} <b>${a[c.id]}${c.un}</b></span><input type="range" data-campo="${c.id}" min="${c.min}" max="${c.max}" step="${c.passo}" value="${a[c.id]}"><small>${c.dica}</small></label>`).join("");
  $("#alModo").value = modo;
  $("#alEspCampos").innerHTML = ["esquerda", "direita"].map(l => { const e = ajusteEspelho(l); return `<fieldset><legend>Retrovisor ${l === "esquerda" ? "esquerdo" : "direito"}</legend>${[["horizontal", "Abertura", -25, 40], ["vertical", "Altura", -25, 20]].map(([k,n,min,max]) => `<label><span>${n} <b>${e[k]}°</b></span><input type="range" data-lado="${l}" data-esp="${k}" min="${min}" max="${max}" step="1" value="${e[k]}"></label>`).join("")}</fieldset>`; }).join("");
}
function iniciarControles() {
  if (controles) return; controles = true;
  $("#alHud").value = estiloHud();
  $("#alHud").addEventListener("change", e => { definirEstiloHud(e.target.value); if (host) host.dataset.hud = estiloHud(); });
  $("#alModo").innerHTML = EDITAVEIS.map(k => `<option value="${k}">${NOMES[k]}</option>`).join("");
  $("#alModo").addEventListener("change", e => { modo = e.target.value; linhas(); });
  $("#alCamCampos").addEventListener("input", e => { const x = e.target; if (!x.dataset.campo) return; definir(modo, x.dataset.campo, x.value); x.parentNode.querySelector("b").textContent = ajusteDe(modo)[x.dataset.campo] + camposDe(modo).find(c => c.id === x.dataset.campo).un; });
  $("#alEspCampos").addEventListener("input", e => { const x = e.target; if (!x.dataset.esp) return; definirEspelho(x.dataset.lado, x.dataset.esp, x.value); x.parentNode.querySelector("b").textContent = ajusteEspelho(x.dataset.lado)[x.dataset.esp] + "°"; });
  $("#alRestCam").addEventListener("click", () => { restaurarCamera(modo); linhas(); });
  $("#alRestEsp").addEventListener("click", () => { restaurarEspelhos(); linhas(); });
}
export function montarAjustes(el, jogador, mods) {
  if (!el || !jogador) return;
  iniciarControles(); if (host !== el) linhas();
  if (!iniciar()) { el.textContent = "A prévia 3D não está disponível neste navegador. Os ajustes continuam funcionando."; return; }
  host = el; if (renderer.domElement.parentNode !== el) el.prepend(renderer.domElement);
  if (!el.querySelector(".hud-tele")) el.insertAdjacentHTML("beforeend", htmlHudTelemetria());
  el.dataset.hud = estiloHud(); atualizarHudTelemetria(el, { kmh: 0, marcha: "N", modo: "BALANCED", bateria: 0.65, acel: 0, freio: 0, rpm: 0.25, drs: false });
  const nova = JSON.stringify([jogador.color, jogador.car, mods]);
  if (nova !== chave) { if (kart) dropKart(kart); chave = nova; kart = makeKart(jogador.color, jogador.car, false, "", mods || MODS_PADRAO, cena, false, { volante: true }); }
  if (!raf) raf = requestAnimationFrame(quadro);
}
export function pararAjustes() { if (raf) cancelAnimationFrame(raf); raf = 0; if (kart) dropKart(kart); kart = null; chave = ""; renderer?.domElement.remove(); host?.querySelector(".hud-tele")?.remove(); host = null; }
function quadro() {
  raf = requestAnimationFrame(quadro);
  if (!host?.isConnected || !host.clientWidth || document.hidden || !kart) return;
  const w = host.clientWidth, h = host.clientHeight; if (renderer.domElement.width !== Math.floor(w * renderer.getPixelRatio()) || renderer.domElement.height !== Math.floor(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
  camera.aspect = w / h; const a = ajusteDe(modo), scale = kart.sc * 10, eye = kart.kt.olho;
  ocultarPiloto(kart, modo === "cockpit"); kart.roof.visible = modo !== "cockpit"; kart.cabin.visible = modo === "perto" || modo === "longe";
  if (modo === "cockpit") camera.position.set(0, eye.y * scale + 1.5 + a.y * 10, eye.z * scale - a.z * 10);
  else if (modo === "onboard") camera.position.set(0, (1.1 + a.y) * scale, (0.3 - a.z) * scale);
  else if (modo === "bico") camera.position.set(0, (0.52 + a.y) * scale, (-1.75 - a.z) * scale);
  else camera.position.set(0, (modo === "perto" ? 15 : 29) + a.y * 10, (modo === "perto" ? 52 : 98) + a.z * 10);
  camera.position.x = a.x * 10; camera.fov = a.fov;
  // Mesma mira da corrida em pista plana e com o carro parado; o tremor depende da velocidade.
  const fora = modo === "perto" || modo === "longe", distancia = fora ? (modo === "perto" ? 60 : 85) : 70;
  const alvoY = fora ? 4 : modo === "cockpit" ? eye.y * scale * 0.5 - (kart.kt.olhoBaixo || 0) * 70 : (modo === "onboard" ? 1.1 * scale * 0.42 : 0.52 * scale * 0.6);
  camera.lookAt(camera.position.x, alvoY + Math.tan(a.incl * Math.PI / 180) * distancia, fora ? -distancia : camera.position.z - distancia); camera.updateProjectionMatrix();
  posicionarHudNoHalo(host.querySelector(".hud-tele"), kart, camera, modo, host);
  quadroEspelhosPreview(kart, renderer, cena); renderer.render(cena, camera);
}
