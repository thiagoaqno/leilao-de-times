// Pelada da Galera — o estilo Strikers: drible com giro, cerca elétrica, itens e o Super Chute (desligado por
// enquanto: SUPER_ATIVO = false).
import * as THREE from "three";
import { E, C, $, h, setH, clamp, socket, myP, P, G, now, local, isCar, PAD, myAttackTeam } from "./estado.js";
import { addRag } from "./bonecos.js";
import { Sound } from "./sons.js";
import { scene, M, ballMesh, liberar } from "./cena.js";
import { flashMsg, pushFeed } from "./hud.js";
import { temBola } from "./controles.js";

// ======================================================================
// Strikers (estilo arcade, inspirado no Mario Strikers): campo maior com cerca elétrica, posse firme, sem fôlego,
// drible com giro, itens e o Super Chute. A física fica em campo.js (MODES.strikers); aqui, o que é do jogador.
// ======================================================================
export const DEKE_T = 0.42, DEKE_CD = 1.1;
// drible com giro (Espaço com a bola, no Strikers): o jogador gira 360° com a bola colada, ganha um tranco de
// velocidade e, durante o giro, o carrinho não pega nele
export function tentarDeke(p) {
  if (!G.F.strikers || p.dekeCd > 0 || p.downT > 0 || p.slideT > 0) return false;
  p.dekeT = DEKE_T; p.dekeCd = DEKE_CD; Sound.deke(); return true;
}
export function tempoStrikers(p, dt) { for (const k of ["dekeT", "dekeCd", "cogumeloT", "estrelaT"]) p[k] = Math.max(0, (p[k] || 0) - dt); }
// multiplicador de velocidade do Strikers (campo maior, jogo mais rápido; giro dá um tranco; cogumelo e estrela também)
export const velStrikers = (p) => (G.F.vel || 1) * ((p.dekeT || 0) > 0 ? 1.3 : 1) * ((p.cogumeloT || 0) > 0 ? 1.45 : 1) * ((p.estrelaT || 0) > 0 ? 1.2 : 1);
// cerca elétrica: quem bate forte nela (correndo ou empurrado) leva choque: cai um instante, é jogado de volta para
// dentro, solta a bola e sai faísca. O vão do gol não tem cerca. Devolve true se deu choque.
export function cercaEletrica(p, nome) {
  const F = G.F, bt = p.bateu; if (!F.cerca || !bt || bt.v < 4 || p.downT > 0 || (p.estrelaT || 0) > 0) return false;
  if (bt.nx && !bt.nz && Math.abs(p.z) < F.goalW + 0.2) return false; // boca do gol
  p.downT = 0.9; p.slideT = 0; p.vx = -bt.nx * 6; p.vz = -bt.nz * 6;
  faiscas(p.x + bt.nx * 0.35, 1.0, p.z + bt.nz * 0.35, 18); Sound.choque();
  if (nome) pushFeed(`⚡ ${h(nome)} levou choque na cerca`);
  return true;
}
// faíscas (choque, itens): caixinhas brilhando que voam e somem
const FAISCAS = [];
const faiscaGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
export function faiscas(x, y, z, n = 14, cor = 0x9ff8ff) {
  for (let i = 0; i < n; i++) {
    let f = FAISCAS.find((q) => q.t <= 0);
    if (!f) { if (FAISCAS.length > 120) break; f = { m: new THREE.Mesh(faiscaGeo, new THREE.MeshBasicMaterial({ color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })), t: 0 }; scene.add(f.m); FAISCAS.push(f); }
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
    f.m.material.color.setHex(cor); f.m.position.set(x, y, z); f.v = [Math.cos(a) * v, 1 + Math.random() * 4, Math.sin(a) * v]; f.t = 0.35 + Math.random() * 0.3; f.m.visible = true;
  }
}
export function updateFaiscas(dt) {
  for (const f of FAISCAS) {
    if (f.t <= 0) continue; f.t -= dt;
    f.v[1] -= 12 * dt; f.m.position.x += f.v[0] * dt; f.m.position.y += f.v[1] * dt; f.m.position.z += f.v[2] * dt;
    f.m.scale.setScalar(Math.max(0.05, f.t * 2.5)); f.m.material.opacity = Math.min(1, f.t * 3); if (f.t <= 0) f.m.visible = false;
  }
}
// ---------- itens do Strikers (no navegador) ----------
// Inventário: até 2 por jogador (p.itens). Contra bots e no treino tudo roda aqui; online, o servidor manda (evento
// "item" para usar; os itens que andam no campo chegam nos pacotes). Efeitos em quem usa: p.cogumeloT e p.estrelaT.
const ITEM_MAX = 2;
// visual de cada item no campo (caixinhas e formas simples, no estilo do jogo)
function itemMesh(tipo) {
  const g = new THREE.Group();
  if (tipo === "casco" || tipo === "teleguiado") {
    const cor = tipo === "casco" ? 0x2fbf4a : 0xe53935;
    const casco = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(cor, { roughness: 0.35 })); g.add(casco);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 16), M(0xf4f4f4)); aro.rotation.x = Math.PI / 2; g.add(aro);
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.12), M(0xf4f4f4)); const a = (i / 5) * Math.PI * 2; p.position.set(Math.cos(a) * 0.18, 0.22, Math.sin(a) * 0.18); g.add(p); }
    g.position.y = 0.06;
  } else if (tipo === "banana") {
    const b = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 10, Math.PI * 0.9), M(0xffd83a, { roughness: 0.5 })); b.rotation.x = Math.PI / 2 - 0.3; b.position.y = 0.1; g.add(b);
    const ponta = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), M(0x5a3d1a)); ponta.position.set(0.22, 0.12, 0); g.add(ponta);
  } else if (tipo === "bomba") {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), M(0x1b1b22, { roughness: 0.4, metalness: 0.3 })); s.position.y = 0.3; g.add(s);
    const pavio = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), M(0xc9a36a)); pavio.position.y = 0.66; g.add(pavio);
    const fogo = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa31a, toneMapped: false })); fogo.position.y = 0.78; g.add(fogo); g.userData.fogo = fogo;
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const itemMeshes = new Map(); // id -> { g, tipo }
// desenha a lista de itens no campo: [{id, tipo, x, z, t}] (cria e tira os bonecos que entraram/saíram)
export function desenharItens(lista, dt) {
  const vivos = new Set();
  for (const it of lista) {
    vivos.add(it.id);
    let m = itemMeshes.get(it.id);
    if (!m) { m = { g: itemMesh(it.tipo), tipo: it.tipo }; scene.add(m.g); itemMeshes.set(it.id, m); }
    m.g.position.x = it.x; m.g.position.z = it.z;
    if (it.tipo === "casco" || it.tipo === "teleguiado") m.g.rotation.y += dt * 14; // gira deslizando
    if (it.tipo === "bomba") { const k = 1 + Math.max(0, (it.t || 0) - 0.8) * 0.5 * (1 + Math.sin(now() * 30)); m.g.scale.setScalar(k); if (m.g.userData.fogo) m.g.userData.fogo.visible = Math.sin(now() * 40) > 0; }
  }
  for (const [id, m] of itemMeshes) if (!vivos.has(id)) { scene.remove(m.g); liberar(m.g); itemMeshes.delete(id); }
}
export function limparItens() { for (const m of itemMeshes.values()) { scene.remove(m.g); liberar(m.g); } itemMeshes.clear(); if (G.itens) G.itens.length = 0; }
// explosão da bomba: faíscas laranja e uma bola de luz que cresce e some
const boomGeo = new THREE.SphereGeometry(1, 16, 12);
const BOOMS = [];
export function boomFx(x, z) {
  faiscas(x, 0.6, z, 40, 0xff8a1a);
  const m = new THREE.Mesh(boomGeo, new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.position.set(x, 0.6, z); scene.add(m); BOOMS.push({ m, t: 0 }); Sound.boom();
}
export function updateBooms(dt) {
  for (let i = BOOMS.length - 1; i >= 0; i--) { const b = BOOMS[i]; b.t += dt; b.m.scale.setScalar(0.3 + b.t * 11); b.m.material.opacity = Math.max(0, 0.8 - b.t * 3); if (b.t > 0.3) { scene.remove(b.m); b.m.material.dispose(); BOOMS.splice(i, 1); } }
}
// ganhou um item (derrubado sem a bola, ou 3 passes seguidos do time)
export function darItem(p, motivo) {
  if (!G.F.strikers || !p) return null;
  p.itens ||= []; if (p.itens.length >= ITEM_MAX) return null;
  const k = C.sortearItem(); p.itens.push(k);
  if (p === G.me) { flashMsg("", `${C.ITENS[k].emoji} ${C.ITENS[k].nome}! ${motivo ? `(${motivo})` : ""} · G para usar`, 1600, "#ffe14a"); Sound.item(); }
  return k;
}
// usa o primeiro item (sem servidor): efeito em quem usa ou um objeto que sai andando
function usarItemLocal(p, id, team) {
  const k = p.itens && p.itens.shift(); if (!k) return null;
  const I = C.ITENS[k];
  if (I.eu) { p[k + "T"] = I.dura; Sound.item(); }
  else { const it = C.lancarItem(k, p, team, id); if (it) { G.itens.push(it); Sound.lanca(); } }
  if (p === G.me) flashMsg("", `${I.emoji} ${I.nome}!`, 800, "#ffe14a");
  return k;
}
// quem está em campo (sem servidor), para os itens: eu, os bots
export function entsLocais() {
  return [{ e: G.me, id: "eu", team: "A", eu: true, name: "Você" }, ...(G.bots || []).map((x) => ({ e: x, id: x.id, team: x.team, name: `${x.team === "A" ? "Seu" : "Bot"} ${x.name}` }))];
}
// sem servidor: anda os itens, derruba quem eles acertam, a estrela derruba quem encosta
export function itensLocais(dt) {
  if (!G.F.strikers) return;
  G.itens ||= [];
  const ents = entsLocais(), b = local.ball;
  const corpos = ents.map((o) => ({ id: o.id, team: o.team, x: o.e.x, z: o.e.z, imune: o.e.downT > 0 || (o.e.estrelaT || 0) > 0, bola: b && b.dono === o.id }));
  const r = C.stepItens(G.F, G.itens, corpos, dt);
  for (const e of r.explosoes) boomFx(e.x, e.z);
  for (const a of r.acertos) { const o = ents.find((q) => q.id === a.id); if (o) derrubarPor(o, a.x, a.z, ents.find((q) => q.id === a.por)); }
  for (const s of ents) if ((s.e.estrelaT || 0) > 0) for (const o of ents) // estrela: quem encostar cai
    if (o.team !== s.team && !(o.e.downT > 0) && !((o.e.estrelaT || 0) > 0) && Math.hypot(o.e.x - s.e.x, o.e.z - s.e.z) < 1.0) derrubarPor(o, s.e.x, s.e.z, s);
  desenharItens(G.itens, dt);
}
// derrubado por um item ou pela estrela (sem servidor)
function derrubarPor(o, hx, hz, quem) {
  const e = o.e; e.downT = 1.4; e.slideT = 0; Sound.fall();
  if (local.ball && local.ball.dono === o.id) local.ball.dono = null;
  const model = o.eu ? G.meModel : e.model;
  if (model && !(o.eu && G.view === "primeira")) { const dx = e.x - hx, dz = e.z - hz, l = Math.hypot(dx, dz) || 1; addRag(model, e.x, e.y || 0, e.z, e.facing, { x: e.vx || 0, y: 0, z: e.vz || 0 }, { x: (dx / l) * 4, y: 3, z: (dz / l) * 4 }, 1.15); }
  if (o.eu) E.charge = null;
  pushFeed(`💥 ${h(quem ? quem.name : "Item")} derrubou ${h(o.name)}`);
}
// efeitos de quem usou cogumelo/estrela: rastro e brilho
export function auraItens(p, dt) {
  if ((p.cogumeloT || 0) > 0 && Math.random() < dt * 30) faiscas(p.x, 0.25, p.z, 1, 0xff5a5a);
  if ((p.estrelaT || 0) > 0 && Math.random() < dt * 45) faiscas(p.x + (Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 1.4, p.z + (Math.random() - 0.5) * 0.6, 1, [0xffe14a, 0x7ff7ff, 0xff7ad9][Math.floor(Math.random() * 3)]);
}
// os bots usam os itens quando faz sentido: casco/bomba em quem está na frente, teleguiado em quem tem a bola,
// banana em quem vem atrás, cogumelo/estrela quando estão com a bola
export function botUsaItem(bot, t, d) {
  const k = bot.itens && bot.itens[0]; if (!k || t < (bot.itemT || 0)) return;
  bot.itemT = t + 0.4 + Math.random() * d.reac * 3;
  const b = local.ball, tem = b.dono === bot.id, rivais = entsLocais().filter((o) => o.team !== bot.team && !(o.e.downT > 0));
  const fx = -Math.sin(bot.facing), fz = -Math.cos(bot.facing);
  const naFrente = rivais.filter((o) => { const dx = o.e.x - bot.x, dz = o.e.z - bot.z, dd = Math.hypot(dx, dz); return dd < 14 && (dx * fx + dz * fz) / (dd || 1) > 0.9; });
  const atras = rivais.some((o) => { const dx = o.e.x - bot.x, dz = o.e.z - bot.z, dd = Math.hypot(dx, dz); return dd < 4 && (dx * fx + dz * fz) / (dd || 1) < -0.5; });
  const comBola = rivais.find((o) => b.dono === o.id);
  let usa = false;
  if (C.ITENS[k].eu) usa = tem;
  else if (k === "banana") usa = atras;
  else if (k === "teleguiado") usa = !!comBola && Math.hypot(comBola.e.x - bot.x, comBola.e.z - bot.z) < 18;
  else usa = naFrente.length > 0;
  if (usa) usarItemLocal(bot, bot.id, bot.team);
}
// usar o meu item: sem servidor, aqui; online, o servidor decide (e manda de volta o efeito ou o item andando)
export function usarMeuItem() {
  if (G.mode === "online") { const inv = (myP() || {}).itens || []; if (inv.length) { socket.emit("item"); Sound.lanca(); } return; }
  usarItemLocal(G.me, "eu", "A");
}
// treino no Strikers: ganha um item a cada 6 s para treinar
export function itensTreino(t) { if (!G.F.strikers || G.falta) return; G.me.itens ||= []; if (G.me.itens.length < ITEM_MAX && t > (G.itemTreinoT || 0)) { G.itemTreinoT = t + 6; darItem(G.me, "treino"); } }
// barrinha com os itens (canto de baixo, à esquerda)
export function hudItens() {
  let el = $("hItens");
  if (!el) { el = document.createElement("div"); el.id = "hItens"; el.className = "hud"; el.style.cssText = "left:18px;bottom:22px;display:flex;gap:8px;align-items:center;font:700 13px Figtree,system-ui,sans-serif;color:#fff;text-shadow:0 2px 4px #000"; document.getElementById("game").appendChild(el); }
  const ativo = G.active && !isCar() && G.F.strikers && G.meModel;
  el.classList.toggle("hidden", !ativo); if (!ativo) return;
  const inv = G.mode === "online" ? (myP() || {}).itens || [] : G.me.itens || [];
  const slot = (k, i) => `<div style="width:${i ? 40 : 54}px;height:${i ? 40 : 54}px;border-radius:12px;background:#0b0f26cc;border:2px solid ${i ? "#7ff7ff55" : "#ffe14a"};display:grid;place-items:center;font-size:${i ? 22 : 30}px">${k ? C.ITENS[k].emoji : ""}</div>`;
  const ef = (G.me.estrelaT > 0 ? "⭐ " : "") + (G.me.cogumeloT > 0 ? "🍄 " : "");
  setH("hItens", `${slot(inv[0], 0)}${slot(inv[1], 1)}<span style="margin-left:4px">${inv.length ? (PAD.on ? "↑ usa" : "G usa") : "sem item"} ${ef}</span>`);
}
// ---------- Super Chute (Strikers) ----------
// Com a bola no campo de ataque, segure o chute: com ~1,4 s o jogador brilha (fica parado e dá para levar carrinho).
// Solte e aparece a barra: o ponteiro vai e volta, e você aperta o chute de novo no verde. Quanto mais perto do verde,
// mais bolas (2 a 5). Cada bola que o goleiro não pega vale um gol. Sem servidor, a conta é aqui; online, o servidor
// sorteia as defesas e todo mundo vê a mesma animação.
export const SUPER_CARGA = 1.4, SUPER_ZONA = 0.82, SUPER_LARG = 0.3, SUPER_BARRA = 0.9, SUPER_ANIM = 0.55;
const superPonteiro = (t0) => (1 - Math.cos((2 * Math.PI * (now() - t0)) / SUPER_BARRA)) / 2;
export const superBolas = (q) => 2 + Math.round(clamp(q, 0, 1) * 3);
function podeSuper() { if (!G.F.strikers || isCar() || !G.me) return false; const s = myAttackTeam() === "B" ? -1 : 1; return temBola() && s * G.me.x > 0; }
// o chute segurado chegou no ponto do super?
const SUPER_ATIVO = false; // Super Chute desligado por enquanto (duplicava a bola)
export const superArmado = () => SUPER_ATIVO && !!E.charge && E.charge.kind === "chute" && G.F.strikers && now() - E.charge.t0 >= SUPER_CARGA && podeSuper();
// soltou o chute armado: começa a barra
export function iniciarBarra() { G.superBarra = { t0: now() }; Sound.deke(); }
// apertou o chute de novo na barra: quantas bolas
export function pararBarra() {
  const sb = G.superBarra; if (!sb) return; G.superBarra = null;
  const p = superPonteiro(sb.t0), q = 1 - Math.abs(p - SUPER_ZONA) / SUPER_LARG, n = superBolas(q);
  G.ultimoSuper = { p, q, n }; // (para conferir nos testes)
  flashMsg(q > 0.85 ? "PERFEITO!" : q > 0.4 ? "BOA!" : "", `⚡ Super Chute: ${n} bolas`, 1100, "#ffe14a", q > 0.85);
  if (G.mode === "online") socket.emit("super", { n });
  else executarSuperLocal("eu", "A", G.me, n);
}
// sem servidor: sorteia as defesas e começa a animação
export function executarSuperLocal(id, team, p, n) {
  const F = G.F, s = team === "A" ? 1 : -1;
  const k = G.mode === "bots" ? (G.keepers || []).find((q) => q.team !== team) : team === "A" ? G.keeper : null;
  const chance = k && !(k.diveT > 0) ? 0.42 : 0.3; // (igual ao servidor: sem goleiro, ainda se perde algumas)
  const alvos = [], salvas = [];
  for (let i = 0; i < n; i++) { alvos.push([(Math.random() * 2 - 1) * F.goalW * 0.8, 0.3 + Math.random() * (F.goalH - 0.7)]); salvas.push(Math.random() < chance); }
  const gols = salvas.filter((x) => !x).length;
  comecarSuper({ by: id, team, x: p.x, z: p.z, alvos, salvas, gols }, k);
  if (G.mode === "bots" && G.bm) G.bm.phase = "super";
  return gols;
}
// animação (online também, com o que o servidor mandou): n bolas saem do pé até o gol, as defendidas voltam
export function comecarSuper(d, k) {
  const F = G.F, s = d.team === "A" ? 1 : -1, gx = s * F.L;
  const bolas = d.alvos.map(([z, y], i) => { const m = ballMesh.clone(); m.material = ballMesh.material; scene.add(m); return { m, z, y, salva: d.salvas[i], atraso: i * 0.13 }; });
  G.superAnim = { ...d, t0: now(), gx, s, k, bolas, fim: now() + (d.alvos.length - 1) * 0.13 + SUPER_ANIM + 1.1 };
  ballMesh.visible = false; Sound.kick(1); Sound.boom();
  faiscas(d.x, 0.6, d.z, 30, 0xffe14a);
  pushFeed(`⚡ ${h(d.by === "eu" ? "Você" : (P(d.by) || (G.bots || []).find((x) => x.id === d.by) || { name: "Bot" }).name)}: Super Chute (${d.alvos.length} bolas)`);
}
// anda a animação; no fim, chama fim(gols)
export function animarSuper(dt, fim) {
  const a = G.superAnim; if (!a) return;
  const t = now() - a.t0;
  for (const b of a.bolas) {
    const u = clamp((t - b.atraso) / SUPER_ANIM, 0, 1), ux = a.x + (a.gx + a.s * (b.salva ? -0.9 : 0.7) - a.x) * u;
    if (u < 1 || !b.salva) { b.m.position.set(ux, b.y * u + 0.17 + Math.sin(Math.PI * u) * 1.2, a.z + (b.z - a.z) * u); if (u > 0 && u < 1 && Math.random() < 0.6) faiscas(b.m.position.x, b.m.position.y, b.m.position.z, 1, 0xffb84a); }
    else { // defendida: volta para o campo caindo
      const v = t - b.atraso - SUPER_ANIM; b.m.position.set(a.gx - a.s * (0.9 + v * 7), Math.max(0.17, b.y + 3 * v - 9 * v * v), b.z + v * 2 * Math.sign(b.z || 1));
      if (!b.batida) { b.batida = true; Sound.catch(); if (a.k) { a.k.diveT = 0.6; a.k.st.diveSide = Math.sign(b.z - a.k.z) || 1; } }
    }
    if (u >= 1 && !b.salva && !b.rede) { b.rede = true; Sound.net(); faiscas(b.m.position.x, b.m.position.y, b.m.position.z, 10, 0xffe14a); }
    b.m.rotation.x += dt * 20;
  }
  if (now() >= a.fim) {
    for (const b of a.bolas) scene.remove(b.m);
    G.superAnim = null; ballMesh.visible = true;
    flashMsg(a.gols ? `+${a.gols} GOL${a.gols > 1 ? "S" : ""}!` : "DEFENDEU TUDO!", a.gols ? "⚡ SUPER CHUTE" : "o goleiro pegou as bolas", 2200, a.gols ? "#ffe14a" : "#ffffff", true);
    if (a.gols) Sound.cheer(); else Sound.ooh();
    if (fim) fim(a);
  }
}
// sem servidor, depois da animação: soma os gols (ou a bola fica com o goleiro)
export function fimSuperLocal(a) {
  const F = G.F, b = local.ball;
  if (G.mode === "bots" && G.bm) {
    const bm = G.bm;
    if (a.gols) { bm.score[a.team] += a.gols; bm.phase = "goal"; bm.until = now() + 1.4; bm.kicking = a.team === "A" ? "B" : "A"; }
    else { bm.phase = "live"; Object.assign(b, C.newBall(F), { x: a.gx - a.s * 2, z: 0 }); }
  } else if (G.mode === "treino") {
    if (a.gols) { G.tGoals += a.gols; Object.assign(b, C.newBall(F), { x: 3 }); G.me.x = -2; G.me.z = 0; }
    else Object.assign(b, C.newBall(F), { x: a.gx - a.s * 2, z: 0 });
  }
}
// barra do Super Chute na tela (e o aviso de que está armado)
export function hudSuper() {
  let el = $("hSuper");
  if (!el) { el = document.createElement("div"); el.id = "hSuper"; el.className = "hud"; el.style.cssText = "left:50%;bottom:120px;transform:translateX(-50%);text-align:center;font:800 15px Figtree,system-ui,sans-serif;color:#ffe14a;text-shadow:0 2px 6px #000"; document.getElementById("game").appendChild(el); }
  const sb = G.superBarra;
  if (sb) {
    const p = superPonteiro(sb.t0), z0 = (SUPER_ZONA - 0.1) * 100, z1 = (SUPER_ZONA + 0.1) * 100;
    setH("hSuper", `<div>⚡ APERTE ${PAD.on ? "B" : "K"} NO VERDE!</div><div style="position:relative;width:320px;height:22px;margin:6px auto 0;border-radius:11px;background:#0b0f26dd;border:2px solid #ffe14a;overflow:hidden">
      <i style="position:absolute;left:${z0}%;width:${z1 - z0}%;top:0;bottom:0;background:#3ee07a"></i><i style="position:absolute;left:${(SUPER_ZONA - 0.3) * 100}%;width:60%;top:0;bottom:0;background:#3ee07a33"></i>
      <b style="position:absolute;left:calc(${p * 100}% - 3px);width:6px;top:-2px;bottom:-2px;background:#fff;box-shadow:0 0 8px #fff"></b></div>`);
    el.classList.remove("hidden");
  } else if (superArmado()) { setH("hSuper", `⚡ SUPER CHUTE ARMADO — solte ${PAD.on ? "B" : "K"}!`); el.classList.remove("hidden"); }
  else el.classList.add("hidden");
}
// os bots também dão Super Chute: no ataque, perto do gol e sem marcação, param e carregam
export function botSuper(bot, t, d, s) {
  const F = G.F; if (!SUPER_ATIVO || !F.strikers || bot.superT || s * bot.x < 2) return false;
  const dGol = Math.hypot(s * F.L - bot.x, bot.z), livre = !entsLocais().some((o) => o.team !== bot.team && Math.hypot(o.e.x - bot.x, o.e.z - bot.z) < 4.5);
  if (dGol > 17 || !livre || Math.random() > 0.35) return false;
  bot.superT = t; return true;
}