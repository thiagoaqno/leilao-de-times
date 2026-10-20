// Caixas e perigos da corrida. O estado real vem da sala; estas malhas só representam os eventos.
// Os modelos 3D (a caixa de vidro com o "?" e os seis poderes) ficam em modelos.js.
import * as THREE from "three";
import { E, socket, sNow, $, me } from "./estado.js";
import { scene } from "./cena.js";
import { Sound } from "./sons.js";
import { caixaItem, animarCaixa, modeloItem, animarItem, iconeItem } from "./modelos.js";
import { estourar, explodir, pow } from "./efeitos.js";

const NOME = { banana: "Banana", verde: "Casco verde", vermelho: "Casco vermelho", cogumelo: "Cogumelo", estrela: "Estrela", bomba: "Bomba" };
const TIPOS = Object.keys(NOME);
const ESCALA_CAIXA = 17, ESCALA_ITEM = 15;
let group = null, boxes = [], hazards = new Map(), nextHazards = [], asked = [], pops = [];
const sombraMat = new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.28, depthWrite: false });
const sombraGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);

export function startItems(tr, enabled) {
  stopItems(); if (!enabled) return;
  group = new THREE.Group(); scene.add(group);
  boxes = window.Pistas.boxesFor(tr.id).map((b) => {
    const cube = caixaItem(); cube.scale.setScalar(ESCALA_CAIXA); cube.position.set(b.x, b.h + 18, b.y); group.add(cube);
    const sh = new THREE.Mesh(sombraGeo, sombraMat); sh.scale.setScalar(10); sh.position.set(b.x, b.h + 0.8, b.y); group.add(sh);
    return { ...b, mesh: cube, sombra: sh };
  });
  asked = boxes.map(() => 0);
}
export function stopItems() {
  if (group) scene.remove(group);
  for (const p of pops) scene.remove(p.m);
  group = null; boxes = []; hazards.clear(); nextHazards = []; asked = []; pops = [];
}
export function setHazards(list) { nextHazards = Array.isArray(list) ? list : []; }
const alvo = new THREE.Vector3();
export function stepItems(race, dt) {
  const now = sNow(), t = performance.now() / 1000;
  // o poder que acabou de ser usado sobe por cima do kart e some
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.t += dt;
    if (p.t > 0.9) { scene.remove(p.m); pops.splice(i, 1); continue; }
    p.m.position.y = p.y0 + 20 + p.t * 30; p.m.rotation.y += dt * 8; p.m.scale.setScalar(ESCALA_ITEM * Math.min(1, p.t * 6) * (p.t > 0.7 ? (0.9 - p.t) / 0.2 : 1));
  }
  if (!group || !race) return;
  const ready = E.S?.boxReady || [], c = race.car;
  for (const b of boxes) {
    b.mesh.visible = b.sombra.visible = (!ready[b.i] || ready[b.i] <= now) && (!b.hiddenUntil || b.hiddenUntil <= now);
    if (!b.mesh.visible) { b.cresce = 0; continue; }
    b.cresce = Math.min(1, (b.cresce ?? 1) + dt * 3); // reaparece crescendo
    animarCaixa(b.mesh, t, b.i); b.mesh.scale.setScalar(ESCALA_CAIXA * (0.2 + 0.8 * b.cresce));
    b.mesh.position.y = b.h + 18 + Math.sin(t * 2.6 + b.i) * 2;
    if (me() && !me().item && now > race.startAt && asked[b.i] < now && Math.hypot(c.x - b.x, c.y - b.y) < 23 && Math.abs(c.z - b.h) < 20) {
      asked[b.i] = now + 650; socket.emit("item:pick", { i: b.i });
    }
  }
  const keep = new Set();
  for (const h of nextHazards) {
    keep.add(h.id);
    let obj = hazards.get(h.id);
    if (!obj) {
      const mesh = modeloItem(h.type); mesh.scale.setScalar(ESCALA_ITEM); mesh.position.set(h.x, h.h - 2, h.y); mesh.rotation.y = Math.random() * 6;
      group.add(mesh); obj = { mesh, nasce: t }; hazards.set(h.id, obj);
    }
    if (obj.tx !== h.x || obj.ty !== h.y) obj.at = performance.now(); // pacote novo: a previsão recomeça dele
    obj.tx = h.x; obj.ty = h.y; obj.th = h.h; obj.type = h.type; obj.vx = h.vx || 0; obj.vy = h.vy || 0;
  }
  for (const [id, obj] of hazards) {
    if (!keep.has(id)) { group.remove(obj.mesh); hazards.delete(id); continue; }
    const k = Math.min(0.15, (performance.now() - (obj.at || 0)) / 1000); // o casco é rápido: anda pela velocidade até o próximo pacote
    obj.mesh.position.lerp(alvo.set(obj.tx + obj.vx * k, obj.th - 2, obj.ty + obj.vy * k), 1 - Math.exp(-dt * 25));
    animarItem(obj.mesh, t, obj.type === "bomba" ? Math.min(1, (t - obj.nasce) / 2.2) : 0);
  }
}
export function onBox(e) {
  const b = boxes[e.i]; if (!b) return;
  b.mesh.visible = false; b.hiddenUntil = sNow() + 500; Sound.pop();
  estourar(b.x, b.h + 18, b.y, ["#ff5f9e", "#ffd84a", "#5fff8f", "#5fc8ff", "#c45fff", "#ffffff"], 26, 70, 0.7, 110, 2.6);
}
export function onUse(e, race) {
  if (e.type === "cogumelo" || e.type === "estrela") { // o poder aparece por cima de quem usou
    const m = modeloItem(e.type); m.scale.setScalar(0.01); m.position.set(e.x, (e.z || 0) + 20, e.y); scene.add(m); pops.push({ m, t: 0, y0: e.z || 0 });
  }
  if (!race || e.id !== E.ME?.id) return;
  if (e.type === "cogumelo") { race.boostUntil = sNow() + 1500; Sound.sling(); }
  else if (e.type === "estrela") Sound.lap();
  else Sound.pop();
}
export function onHit(e, race) {
  estourar(e.x, (e.z || 0) + 10, e.y, ["#ffd84a", "#ffffff", "#ff8a00"], 24, 70, 0.7, 90, 2);
  pow(e.x, (e.z || 0) + 34, e.y);
  if (race) (race.atingidos ||= {})[e.id] = sNow() + 1100; // o estado da sala só chega depois: o giro dos outros começa já
  if (!race || e.id !== E.ME?.id) return;
  race.spinUntil = sNow() + 1100; race.shake = 0.25;
  race.car.v *= 0.42; race.car.vx *= 0.42; race.car.vy *= 0.42; Sound.crash(130);
}
export function onBoom(e) { explodir(e.x, e.h || 0, e.y, 105); }
export function useItem(back = false) {
  const p = me(); if (!p || !p.item || p.rolling > sNow()) return;
  socket.emit("item:use", { back });
}
// o botão do item: a foto 3D do poder; enquanto a roleta gira, os poderes passam rápido
let ultimo = "";
export function drawItemHud() {
  const p = me(), el = $("hItem");
  const enabled = !!E.S?.config.caixas && !!p; el.classList.toggle("hidden", !enabled);
  if (!enabled) return;
  const girando = p.item && p.rolling > sNow(), tipo = !p.item ? "caixa" : girando ? TIPOS[Math.floor(performance.now() / 80) % TIPOS.length] : p.item;
  const chave = tipo + (girando ? "?" : p.item ? "!" : "");
  if (chave !== ultimo) {
    ultimo = chave;
    el.innerHTML = `<img src="${iconeItem(tipo)}" alt="" width="52" height="52">${p.item && !girando ? `<span>${NOME[p.item]}<small>ESPAÇO</small></span>` : ""}`;
    el.setAttribute("aria-label", p.item && !girando ? `Usar ${NOME[p.item]}` : "Sem item");
  }
  el.disabled = !p.item || girando;
  el.classList.toggle("ready", !!p.item && !girando);
  el.classList.toggle("rolling", !!girando);
}
