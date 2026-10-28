// Corrida da Galera — o jogo no navegador: sala, garagem, e a corrida em 3D (Three.js).
// Este é o módulo de entrada: começa e para a corrida, o laço e o desenho, e a capa da página. O resto fica nos
// outros módulos desta pasta (estado, sons, rede, menus, cena, pista, carros, controles, fisica, fantasma e hud).
import * as THREE from "three";
import { E, PISTAS, SECTORS, COLORS, CARROS, carOf, socket, $, sNow, me, P, act, checkpoint } from "./estado.js";
import { Sound } from "./sons.js";
import { updateGhosts } from "./rede.js";
import { gridSpot, buildTrack, groundH, useTrack } from "./pista.js";
import { renderer, scene, cam, sun, V3 } from "./cena.js";
import { CARS3, KS, makeKart, poseKart, dropKart, puff, stepPuffs, amostraDeFumaca } from "./carros.js";
import { camMode, pollPad } from "./controles.js";
import { physics, quadroDeFisica, quadroParado, criarRede } from "./fisica.js";
import { loadBest, recordLap, drawBest, myProg } from "./fantasma.js";
import { standings, hud } from "./hud.js";
import { f1Pronto } from "./f1.js";
import { propsPronto } from "./props.js";
import { startItems, stopItems, stepItems } from "./itens.js";
import { passoEfeitos, limparEfeitos, amostrasDeEfeitos } from "./efeitos.js";
import { animarVida } from "./vida.js";
import { ceuPronto, luzPendente } from "./ceu.js";
import { desenhar, ajustarTela, medirQuadro, comecarMedida } from "./desfoque.js";
import { quadroTV, pularTV } from "./transmissao.js";
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");

// ---------- corrida ----------
export let race = null, raf = 0;
export const keys = { gas: false, brake: false, left: false, right: false, ers: false };
// ---------- preparar a pista antes de correr ----------
// A primeira volta numa pista travava: o navegador só monta o shader de cada material e só manda cada textura para a
// placa de vídeo na primeira vez que ela aparece na tela, e cada curva nova traz coisas que ainda não tinham aparecido.
// No lobby, assim que a pista é escolhida, a pista é montada e a foto do céu já vem (prepararPista). Na largada, com o
// céu aplicado, as texturas sobem todas e os shaders compilam durante a contagem (aquecerPista: o compileAsync deixa o
// navegador compilar em paralelo, sem travar a página). Os efeitos que só nascem no meio da corrida (fumaça da
// derrapagem, cacos, explosão, "POW!" e os itens) entram escondidos na cena só durante essa preparação. Depois, um
// quadro fora da tela com a pista inteira (subirMalhas) manda as malhas para a placa e compila a sombra.
export function prepararPista(id, hora = "dia") {
  const tr = buildTrack(id);
  ceuPronto(hora === "noite" ? "tokyo" : id).catch(() => {});
  subirTexturas(tr.grp);
}
const MAPAS = ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "alphaMap", "aoMap", "bumpMap"];
function subirTexturas(grp) {
  const vistas = new Set();
  grp.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of MAPAS) { const t = m[k]; if (t && t.isTexture && !vistas.has(t)) { vistas.add(t); renderer.initTexture(t); } } });
}
// Só compilar não bastava: cada malha só vai para a placa de vídeo na primeira vez que é desenhada, e os shaders da
// sombra só compilam no primeiro quadro com sombra. Medido em Mônaco, 10 s depois da largada o primeiro desenho de um
// trecho novo ainda levava ~250 ms (os seguintes, ~20 ms). Um quadro fora da tela, de cima e com a pista inteira,
// faz tudo isso durante a contagem; perto da largada já não dá tempo e fica para a corrida. A câmera é de perspectiva,
// como a do jogo: com uma ortográfica o navegador compilava outra versão de cada shader (1,2 s à toa, medido). E vai
// em 8 partes com mais ou menos o mesmo tanto de triângulos, uma a cada 30 ms: de uma vez só, mandar tudo travava a
// contagem por meio segundo.
const triangulos = (o) => { let n = 0; o.traverse((m) => { const g = m.isMesh && m.geometry; if (g) n += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (m.isInstancedMesh ? m.count : 1); }); return n; };
async function subirMalhas(tr, alvo) {
  const meia = tr.t.world / 2 + 1500, camara = new THREE.PerspectiveCamera(90, 1, 10, meia * 4);
  camara.position.set(tr.t.world / 2, meia * 1.05, tr.t.world / 2); camara.lookAt(tr.t.world / 2, 0, tr.t.world / 2);
  const filhos = tr.grp.children.slice(), PARTES = 8, pesos = filhos.map(triangulos), total = pesos.reduce((a, b) => a + b, 0) || 1, parte = [];
  let soma = 0; pesos.forEach((p) => { parte.push(Math.min(PARTES - 1, Math.floor((soma / total) * PARTES))); soma += p; });
  for (let k = 0; k < PARTES; k++) {
    if (!race || race.tr !== tr || sNow() >= race.startAt - 300) return;
    const anterior = renderer.getRenderTarget(), visivel = filhos.map((o) => o.visible); // o céu pode ter mudado entre uma parte e outra
    filhos.forEach((o, i) => { o.visible = visivel[i] && parte[i] === k; });
    try { renderer.setRenderTarget(alvo); renderer.render(scene, camara); }
    finally { renderer.setRenderTarget(anterior); filhos.forEach((o, i) => { o.visible = visivel[i]; }); }
    await new Promise((ok) => setTimeout(ok, 30));
  }
}
// Cada shader tem duas versões: a de desenhar na tela e a de desenhar numa imagem (cor linear, sem o ajuste de tons),
// que é a que o desfoque de velocidade usa (desfoque.js). Só a da tela era compilada: na primeira vez que o carro
// passava de 40% da velocidade, as ~25 da outra compilavam de uma vez, no meio da reta. Aqui as duas compilam em
// paralelo (o compileAsync escolhe a versão pelo alvo do momento em que é chamado).
function compilarTudo(alvo) {
  const anterior = renderer.getRenderTarget();
  renderer.setRenderTarget(alvo); const naImagem = renderer.compileAsync(scene, cam); renderer.setRenderTarget(anterior);
  return Promise.all([renderer.compileAsync(scene, cam), naImagem]);
}
function aquecerPista(tr, ceu) {
  let fila = Promise.resolve(), ceuChegou = false;
  ceu.then(() => { ceuChegou = true; }, () => {});
  const aquecer = () => { fila = fila.then(() => {
    if (!race || race.tr !== tr || sNow() >= race.startAt - 300) return;
    const amostras = new THREE.Group(); amostras.add(amostrasDeEfeitos(), amostraDeFumaca()); scene.add(amostras);
    subirTexturas(scene);
    const alvo = new THREE.WebGLRenderTarget(2, 2);
    return compilarTudo(alvo).then(() => subirMalhas(tr, alvo)).catch((e) => console.warn("Corrida: aquecimento incompleto", e)).finally(() => { alvo.dispose(); scene.remove(amostras); });
  }); };
  // espera também o carro de F1 e os enfeites do Kenney: quando chegam, os carros e a pista são remontados, e o que
  // nasce depois do aquecimento travaria na primeira vez que aparecesse
  const modelos = Promise.all([f1Pronto, propsPronto]);
  const espera = modelos.then(() => new Promise((ok) => setTimeout(ok, 1500))); // o céu que não chega em 1,5 s não segura a preparação
  Promise.race([Promise.all([modelos, ceu]), espera]).then(() => {
    aquecer();
    // o céu chegou depois: a luz da foto muda todos os materiais, que compilariam de novo (de uma vez, travando) no
    // primeiro quadro; aquece de novo, se ainda der tempo antes da largada
    if (!ceuChegou) Promise.all([modelos, ceu]).then(aquecer, () => {});
  }, () => {});
}
// quem está correndo agora: a corrida, ou uma sessão da classificação em que o meu carro está e que não parou no intervalo
export function ativo() {
  const S = E.S; if (!S) return false;
  if (S.phase === "race") return true;
  const q = S.quali, m = me();
  return S.phase === "quali" && !!q && !q.pausa && !!m && q.ativos.includes(m.id);
}
export function startRace(st) {
  const tr = buildTrack(st.config.pista), mine = me();
  // a luz da foto do céu só muda durante a contagem: com o carro andando, ela recompilaria todos os materiais
  const ceu = useTrack(tr, st.config.hora, () => !race || race.tr !== tr || sNow() < race.startAt);
  luzPendente();
  tr.mostrarBoxes = st.config.regras === "f1"; if (tr.boxesGP) tr.boxesGP.userData.mostrar(tr.mostrarBoxes); // o corredor dos boxes só aparece nas regras de F1
  if (tr.drsPlacas) tr.drsPlacas.visible = tr.mostrarBoxes;
  // regras de F1: o grid de 20 vagas e o pórtico das cinco luzes no lugar do "CORRIDA DA GALERA" (nas pistas de GP)
  if (tr.gridGalera) tr.gridGalera.visible = !tr.mostrarBoxes; if (tr.gridF1) tr.gridF1.visible = tr.mostrarBoxes;
  if (tr.portico) { tr.faixaGalera.visible = !tr.mostrarBoxes; tr.portico.topF1.visible = tr.portico.grupo.visible = tr.mostrarBoxes; tr.luzes.set(0); }
  if (tr.boxesGP) {
    const cores = Object.values(window.EQUIPES_F1 || {}).map((e) => e.cor);
    for (const p of st.players) {
      const equipe = window.Pistas.MODS.pintura[(p.mods || window.Pistas.MODS_PADRAO).pintura]?.equipe;
      cores[p.grid % window.F1Regras.GARAGENS] = window.EQUIPES_F1?.[equipe]?.cor || p.color;
    }
    tr.boxesGP.userData.colorir(cores);
  }
  const spot = gridSpot(tr.pts, mine ? mine.grid : 0, tr.W, st.config.regras === "f1");
  if (race) clearRace();
  // regras de F1: o carro é o da física nova (sim.js), com o pneu, o ERS e o box dentro dele; o servidor é a autoridade (fisica.js)
  const f1 = st.config.regras === "f1", carro = f1 ? window.Sim.novo(tr, { grid: mine ? mine.grid : 0, f1: true, pneu: window.Sim.pneuDaLargada(st.phase, mine && mine.pneu), box: st.phase !== "quali" }) : { x: spot.x, y: spot.y, z: tr.pts[spot.idx].h, vz: 0, air: false, a: spot.a, v: 0, vx: 0, vy: 0, slip: 0, steer: 0 };
  race = { startAt: st.startAt, tr, car: carro, net: f1 && mine ? criarRede() : null, acc: 0, idx: spot.idx, sector: SECTORS - 1, lastSent: 0, wrong: 0, ghosts: new Map(), msg: null, beeped: 0, finished: false, laps: 0, shake: 0,
    kart: mine ? makeKart(mine.color, mine.car, false, "", mine.mods) : null, cam: { pos: null, a: spot.a }, lapT0: st.startAt, rec: [], recLast: -1e9, best: loadBest(st.config.pista), bestKart: null, bptr: 0, draft: 0, draftT: 0, sling: 0,
    pneu: f1 ? carro.pneu : null, ers: f1 ? carro.ers : null, box: f1 ? carro.box : null, // regras de F1: pneu, ERS e pit stop
    quali: st.phase === "quali", luzes: st.phase === "race" && st.config.regras === "f1" ? st.luzes : null, luzN: 0,
    tvAte: st.phase === "race" && st.config.regras === "f1" && st.tvAte && st.tv ? st.tvAte : 0 }; // a transmissão de TV antes das luzes // classificação (sem batida nem box) e as cinco luzes da largada
  $("bBox").classList.toggle("hidden", !race.box || !mine);
  $("bErs").classList.toggle("hidden", !race.ers || !mine);
  startItems(tr, st.config.caixas);
  $("results").classList.add("hidden");
  resize(); comecarMedida();
  aquecerPista(tr, ceu);
  if (!raf) raf = requestAnimationFrame(loop);
}
function clearRace() { if (!race) return; stopItems(); limparEfeitos(); dropKart(race.kart); dropKart(race.bestKart); dropKart(race.safetyKart); for (const gh of race.ghosts.values()) dropKart(gh.kart); }
export function stopRace() { clearRace(); race = null; Sound.engine(0, false); }
function resize() {
  const w = window.innerWidth, hh = window.innerHeight;
  renderer.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); ajustarTela(w, hh);
  const touch = matchMedia("(pointer: coarse)").matches;
  $("padL").classList.toggle("hidden", !touch); $("padR").classList.toggle("hidden", !touch); $("padM").classList.toggle("hidden", !touch || !E.S || E.S.config.cambio !== "manual");
}
window.addEventListener("resize", () => race && resize());

// ponto da pista mais perto (procura perto do último, ou na pista toda)
export function nearest(tr, x, y, from) {
  let best = from, bd = Infinity;
  const scan = (i0, i1, st = 1) => { for (let k = i0; k <= i1; k += st) { const i = (k + tr.n) % tr.n, p = tr.pts[i], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } } };
  scan(from - 40, from + 40);
  if (bd > 160 * 160) { scan(0, tr.n - 1, 2); scan(best - 3, best + 3); }
  return best;
}
export function respawn() {
  if (!race || sNow() < race.startAt) return;
  race.sujou = true; // volta com "↺ Pista" não serve de exemplo para os robôs
  if (race.net) { race.respawnPend = true; return; } // regras de F1: o pedido vai na entrada do próximo passo (sim.js, voltarParaPista), e o servidor faz igual
  if (race.perdeu >= 0) race.idx = (checkpoint(race.perdeu, race.tr.n) - 5 + race.tr.n) % race.tr.n; // perdeu o checkpoint: volta para antes dele
  const p = race.tr.pts[race.idx]; Object.assign(race.car, { x: p.x, y: p.y, z: p.h, vz: 0, air: false, a: Math.atan2(p.ty, p.tx), v: 0, vx: 0, vy: 0, slip: 0 }); Sound.pop();
}

let lastT = 0, ultimoQuadro = 0;
// Telas de 120/144 Hz pediam um quadro a cada 7 ms e a placa de vídeo desenhava tudo 144 vezes por segundo. Um quadro
// precisa de pelo menos 11 ms: em 144 Hz desenha um sim e outro não (72 por segundo), em 60 Hz todos.
const QUADRO_MIN = 11;
function loop(t) {
  raf = requestAnimationFrame(loop);
  if (!race) { raf && cancelAnimationFrame(raf); raf = 0; return; }
  if (t - ultimoQuadro < QUADRO_MIN) return;
  ultimoQuadro = t;
  const real = Math.min(0.25, (t - (lastT || t)) / 1000), dt = Math.min(1 / 30, real); lastT = t;
  pollPad();
  // a física anda em passos fixos de 1/120 s (fisica.js): o tempo do quadro só diz quantos passos dar, então 30 ou 144 quadros
  // por segundo dão a mesma corrida
  if (ativo()) quadroDeFisica(real); else quadroParado(real);
  updateGhosts(dt);
  recordLap();
  if (me() && ativo() && !race.net && performance.now() - race.lastSent > 100) { race.lastSent = performance.now(); socket.emit("pos", { x: race.car.x, y: race.car.y, z: race.car.z, a: race.car.a, v: race.car.v, prog: myProg() }); }
  Sound.engine(race.car.v, ativo() && sNow() >= race.startAt - 300 && !!me(), keys.gas, race.marcha || 1, race.rpm || 0);
  Sound.skid(me() && ativo() && race.car.slip > 45 ? race.car.slip : 0);
  draw(dt);
  medirQuadro();
  hud();
}

// O kart sente o relevo: mede o chão embaixo do bico, da traseira e dos dois lados e inclina junto (sobe o bico na
// subida, desce na descida). No ar, o bico segue a velocidade de subida/queda.
function inclinacao(tr, x, y, a, idx, L, W, vz, noAr, v) {
  if (noAr) return { pitch: Math.max(-0.5, Math.min(0.4, Math.atan2(vz || 0, Math.max(60, Math.abs(v))))), roll: 0 };
  const fx = Math.cos(a), fy = Math.sin(a), h = (dx, dy) => groundH(tr, x + dx, y + dy, idx);
  const frente = h(fx * L / 2, fy * L / 2), tras = h(-fx * L / 2, -fy * L / 2), dir = h(-fy * W / 2, fx * W / 2), esq = h(fy * W / 2, -fx * W / 2);
  return { pitch: Math.atan2(frente - tras, L), roll: Math.atan2(dir - esq, W) };
}
const fxDe = (p, now, extra = {}) => { const bala = !!(p && p.balaUntil > now) || !!extra.bala;
  return { f1: race.tr.id === "interlagos" || race.tr.id === "monaco" || race.tr.id === "barcelona" || race.tr.id === "silverstone" || race.tr.id === "monza" || !!race.tr.t.f1, zebra: !!extra.zebra, turbo: !!(p && p.boostUntil > now) || !!extra.turbo, estrela: !!(p && p.starUntil > now), rodando: !bala && (!!(p && (p.spinUntil > now || race.atingidos?.[p.id] > now)) || !!extra.rodando), derrapa: extra.derrapa || 0,
    pequeno: !bala && !!(p && p.shrinkUntil > now), bala }; };
// câmera atrás do kart (quem só assiste segue o primeiro colocado)
function draw(dt) {
  const tr = race.tr, c = race.vis || race.car, now = sNow(); // (race.vis: o carro como é desenhado, entre um passo da física e outro)
  // meu kart
  if (race.kart) {
    race.kart.g.visible = !me()?.dnf; // o carro destruído é recolhido da pista
    const slide = Math.max(-1, Math.min(1, (c.slip || 0) / 160)) * Math.sign(c.steer || 1), fr = groundH(tr, c.x, c.y, race.idx);
    const spec = CARS3[me()?.car] || CARS3.equilibrado, inc = inclinacao(tr, c.x, c.y, c.a, race.idx, spec.L * KS, spec.W * KS, c.vz, c.air, c.v);
    race.pitch = inc.pitch;
    const turbo = race.boostUntil > now || race.sling > 0, rodando = race.spinUntil > now, bala = race.balaUntil > now;
    poseKart(race.kart, c.x, c.y, c.z, c.a + (race.net ? 0 : slide * 0.25), c.v, c.steer, fr, dt, -c.steer * 0.04 + inc.roll, inc.pitch, fxDe(me(), now, { turbo, rodando, bala, zebra: (!tr.zebras || !!tr.zebras[race.idx]) && Math.abs(Math.abs((c.x - tr.pts[race.idx].x) * tr.pts[race.idx].nx + (c.y - tr.pts[race.idx].y) * tr.pts[race.idx].ny) - tr.W / 2) < 9, derrapa: c.slip > 45 ? (c.slip > 110 ? 2 : 1) : 0 }));
    // derrapagem: fumaça branca saindo dos pneus de trás, mais grossa quanto mais o carro escorrega
    if (c.slip > 40 && !c.air) { const forte = Math.min(1, (c.slip - 40) / 120); for (const s of [-1, 1]) if (Math.random() < 0.55 + forte * 0.45) puff(c.x - Math.cos(c.a) * 15 + -Math.sin(c.a) * s * 9, c.z + 3, c.y - Math.sin(c.a) * 15 + Math.cos(c.a) * s * 9, "#eeeeee", 3.2 + forte * 3, 0.8 + forte * 0.6, 1.7, 0.3 + forte * 0.22); }
    if (race.offroad && Math.random() < 0.5) puff(c.x - Math.cos(c.a) * 18, c.z + 2, c.y - Math.sin(c.a) * 18, tr.id === "interlagos" ? "#b39c66" : "#9a9a9a", 2.5);
  }
  // os outros pilotos (carros de verdade: dá para bater)
  for (const [id, gh] of race.ghosts) {
    const pl = P(id); if (!pl) continue;
    if (pl.dnf) { if (gh.kart) { dropKart(gh.kart); gh.kart = null; } continue; }
    const key = pl.color + pl.car + JSON.stringify(pl.mods || {}); if (!gh.kart || gh.kartKey !== key) { dropKart(gh.kart); gh.kart = makeKart(pl.color, pl.car, false, pl.name, pl.mods, undefined, true); gh.kartKey = key; }
    const spec = CARS3[pl.car] || CARS3.equilibrado, gz = groundH(tr, gh.x, gh.y, gh.idx || 0), noAr = gh.z > gz + 3;
    gh.vz = ((gh.z - (gh.zAnt ?? gh.z)) / Math.max(dt, 1e-3)) * 0.3 + (gh.vz || 0) * 0.7; gh.zAnt = gh.z;
    const inc = inclinacao(tr, gh.x, gh.y, gh.a, gh.idx || 0, spec.L * KS, spec.W * KS, gh.vz, noAr, gh.v || 0);
    // o volante dos outros: pela rapidez com que a direção muda (no carro, girar 2,4 rad/s é o volante todo)
    let da = gh.a - (gh.aAnt ?? gh.a); da = Math.atan2(Math.sin(da), Math.cos(da)); gh.aAnt = gh.a;
    gh.vira = (gh.vira || 0) + (Math.max(-1, Math.min(1, da / Math.max(dt, 1e-3) / 2.4)) - (gh.vira || 0)) * Math.min(1, dt * 8);
    poseKart(gh.kart, gh.x, gh.y, gh.z, gh.a, gh.v || 0, gh.vira, gz, dt, inc.roll, inc.pitch, fxDe(pl, now));
  }
  // Safety car: um carro próprio à frente da fila, calculado pela direção de prova no servidor.
  if (race.safety) {
    if (!race.safetyKart) {
      race.safetyKart = makeKart("#202733", "equilibrado", false, "SAFETY CAR", { pintura: "ouro" }, undefined, true);
      const farol = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 4), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
      farol.position.set(0, 17, 0); race.safetyKart.body.add(farol); race.safetyKart.farol = farol;
    }
    const i = ((Math.floor(race.safety.prog * tr.n) % tr.n) + tr.n) % tr.n, p = tr.pts[i];
    race.safetyKart.farol.visible = motionPreference.matches || Math.floor(now / 250) % 2 === 0;
    poseKart(race.safetyKart, p.x, p.y, p.h, Math.atan2(p.ty, p.tx), 160, 0, p.h, dt, 0, 0, { f1: true });
  } else if (race.safetyKart) { dropKart(race.safetyKart); race.safetyKart = null; }
  // o próximo checkpoint acende e pulsa; o perdido fica vermelho; os outros, apagadinhos
  for (const pt of tr.portais || []) {
    const prox = (race.sector + 1) % SECTORS, seguinte = (race.sector + 2) % SECTORS, perdido = race.perdeu === pt.k;
    pt.g.visible = pt.k === prox || pt.k === seguinte || perdido;
    if (!pt.g.visible) continue;
    pt.mat.color.setHex(perdido ? 0xff5050 : 0xffffff); pt.mat.opacity = pt.k === prox || perdido ? 1 : 0.55;
    pt.panos.forEach((q, j) => { q.rotation.y = pt.base[j] + Math.sin(now / 420 + j * 1.7 + pt.k) * 0.12; }); // balança no vento
  }
  drawBest(dt);
  stepPuffs(dt);
  passoEfeitos(dt);
  stepItems(race, dt);
  for (const cone of tr.cones || []) if (cone.hit > 0) {
    cone.hit = Math.max(0, cone.hit - dt * 0.85);
    cone.mesh.rotation.x = Math.sin(cone.dir) * cone.hit * 0.9;
    cone.mesh.rotation.z = -Math.cos(cone.dir) * cone.hit * 0.9;
  }
  let src = c;
  if (!me()) { const lead = standings()[0]; const gh = lead && race.ghosts.get(lead.id); if (gh) src = gh; }
  animarVida(tr, dt, src);
  const C = race.cam, k = 1 - Math.exp(-dt * 6), mode = src === c && race.kart ? camMode : "longe";
  let da = src.a - C.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; C.a += da * (1 - Math.exp(-dt * (mode === "perto" ? 7 : 5)));
  const reduceMotion = motionPreference.matches;
  const speedK = Math.min(1.2, Math.abs(src.v || 0) / 300);
  const surge = Math.max(0, Math.min(1, ((src.v || 0) - (C.lastV || 0)) / Math.max(dt, 0.01) / 90));
  C.lastV = src.v || 0;
  C.surge = (C.surge || 0) + ((reduceMotion ? 0 : surge) - (C.surge || 0)) * (1 - Math.exp(-dt * 5));
  const fovStep = 1 - Math.exp(-dt * 5);
  if (race.kart) { const out = mode !== "cockpit"; race.kart.roof.visible = race.kart.cabin.visible = out; for (const b of race.kart.roofBits) b.visible = out; } // de dentro, cabine, teto e faixa do teto tapariam a vista
  if (mode === "cima") {
    // de cima, como no Hades: a câmera fica no alto e na diagonal, sempre no mesmo ângulo (não gira com o kart), e só
    // segue o carro. A lente fechada (pouca perspectiva) dá a cara de jogo isométrico. Ela mira um pouco à frente para
    // onde o kart vai, para sobrar pista à vista, e se afasta um pouco quando ele corre
    const vx = Math.cos(src.a), vy = Math.sin(src.a), frente = 30 + speedK * 55, dist = 640 + speedK * (reduceMotion ? 40 : 140);
    const alvo = V3(src.x + vx * frente, src.z || 0, src.y + vy * frente);
    C.alvo = C.alvo ? C.alvo.lerp(alvo, 1 - Math.exp(-dt * 5)) : alvo.clone();
    const el = 0.96, giro = Math.PI / 4; // 55° de inclinação, 45° na diagonal
    const want = V3(C.alvo.x - Math.cos(giro) * Math.cos(el) * dist, C.alvo.y + Math.sin(el) * dist, C.alvo.z + Math.sin(giro) * Math.cos(el) * dist);
    if (!C.pos) C.pos = want.clone(); else C.pos.lerp(want, 1 - Math.exp(-dt * 10));
    cam.position.copy(C.pos);
    if (race.shake > 0) { race.shake -= dt; if (!reduceMotion) { cam.position.x += (Math.random() - 0.5) * 3; cam.position.z += (Math.random() - 0.5) * 3; } }
    cam.lookAt(C.pos.x + (C.alvo.x - want.x), C.pos.y + (C.alvo.y - want.y), C.pos.z + (C.alvo.z - want.z));
    cam.fov += (24 - cam.fov) * fovStep; cam.updateProjectionMatrix();
  } else if (mode === "cockpit") {
    // primeira pessoa: no lugar do piloto, olhando por cima do volante (o bico do kart aparece embaixo)
    const spec = CARS3[me().car] || CARS3.equilibrado, eyeU = race.kart.eye.u, eyeH = race.kart.eye.h;
    const fx = Math.cos(c.a), fy = Math.sin(c.a), fo = (eyeU - spec.L / 2) * KS, eh = eyeH * KS;
    const ahead = c.air ? c.z : groundH(tr, c.x + fx * 70, c.y + fy * 70, nearest(tr, c.x + fx * 70, c.y + fy * 70, race.idx));
    C.lookY = C.lookY == null ? ahead : C.lookY + (ahead - C.lookY) * (1 - Math.exp(-dt * 6));
    // os olhos acompanham o kart: na subida a vista levanta, na descida abaixa (o pitch do kart, suavizado)
    C.pitch = (C.pitch || 0) + ((race.pitch || 0) - (C.pitch || 0)) * (1 - Math.exp(-dt * 8));
    cam.position.set(c.x + fx * fo, c.z + eh + 1.5 + Math.sin(C.pitch) * fo * 0.5, c.y + fy * fo); C.pos = null; // na altura dos olhos, rente ao chão
    cam.lookAt(c.x + fx * (fo + 70), Math.max(C.lookY, c.z + Math.tan(C.pitch) * 70 - 6) + eh * 0.5, c.y + fy * (fo + 70));
    if (!reduceMotion) { // a vibração cresce com a velocidade e o volante inclina um pouco a cabeça
      const trem = speedK * speedK * 0.35 + (race.offroad ? 0.7 : 0);
      cam.position.y += (Math.random() - 0.5) * trem; cam.position.x += (Math.random() - 0.5) * trem * 0.5;
      cam.rotateZ(-c.steer * 0.035 * Math.min(1, speedK * 1.5));
    }
    if (race.shake > 0) { race.shake -= dt; if (!reduceMotion) cam.position.y += (Math.random() - 0.5) * 1.6; }
    cam.fov += ((72 + speedK * (reduceMotion ? 6 : 22) + C.surge * 4) - cam.fov) * fovStep; cam.updateProjectionMatrix();
  } else {
    // atrás do carro: perto (padrão) ou longe; alta e olhando um pouco para baixo, para ver o que vem na frente do kart
    const near = mode === "perto", back = near ? 50 + speedK * (reduceMotion ? 5 : 22) + C.surge * 8 : 88 + speedK * (reduceMotion ? 8 : 27) + C.surge * 8, up = near ? 30 + speedK * 2 : 52 + speedK * 4;
    const fx = Math.cos(C.a), fy = Math.sin(C.a);
    const want = V3(src.x - fx * back, (src.z || 0) + up, src.y - fy * back);
    want.y = Math.max(want.y, groundH(tr, want.x, want.z, nearest(tr, want.x, want.z, race.idx)) + 6);
    if (!C.pos) C.pos = want.clone(); else C.pos.lerp(want, near ? 1 - Math.exp(-dt * 9) : k);
    // No túnel de Mônaco, a câmera externa fica abaixo do teto opaco.
    if (tr.coberto?.(race.idx)) C.pos.y = Math.min(C.pos.y, (src.z || 0) + 23);
    cam.position.copy(C.pos);
    if (race.shake > 0) { race.shake -= dt; if (!reduceMotion) { cam.position.x += (Math.random() - 0.5) * 3; cam.position.y += (Math.random() - 0.5) * 3; } }
    if (race.offroad && !reduceMotion) cam.position.y += (Math.random() - 0.5) * 1.2;
    if (!reduceMotion && speedK > 0.75) cam.position.y += (Math.random() - 0.5) * (speedK - 0.75) * 1.4; // tremidinha no fim de reta
    // olha para o chão lá na frente: na subida a câmera levanta o olhar, na descida abaixa
    const la = near ? 55 : 70, lx = src.x + fx * la, ly = src.y + fy * la, chao = groundH(tr, lx, ly, nearest(tr, lx, ly, race.idx));
    C.lookH = C.lookH == null ? chao : C.lookH + (chao - C.lookH) * (1 - Math.exp(-dt * 5));
    cam.lookAt(lx, Math.max((src.z || 0) + 4 + (C.lookH - (src.z || 0)) * 0.6, C.lookH + 2), ly);
    cam.fov += ((near ? 70 : 68) + speedK * (reduceMotion ? 4 : 19) + C.surge * 4 - cam.fov) * fovStep; cam.updateProjectionMatrix();
  }
  // sol e sombras acompanham o carro (a direção do sol vem da foto do céu, quando tem)
  const sd = tr.sol; if (sd) sun.position.set(src.x + sd.x * 800, (src.z || 0) + sd.y * 800, src.y + sd.z * 800); else sun.position.set(src.x - 300, (src.z || 0) + 700, src.y + 260);
  sun.target.position.set(src.x, src.z || 0, src.y);
  abrirTV(tr, dt, reduceMotion);
  if (tr.sky) tr.sky.position.set(cam.position.x, 0, cam.position.z);
  // desfoque de velocidade, pela fração da velocidade final do carro (vale igual para os cinco): começa em 40% (uns 90 km/h
  // no equilibrado), fica inteiro a 90% e o turbo e o estilingue borram ainda mais
  const turbo = src === c && (race.boostUntil > now || race.sling > 0 || (me() && me().boostUntil > now));
  const vref = (src === c ? carOf(me()) : CARROS.equilibrado).vmax;
  // (de cima não tem desfoque: o chão inteiro borrado só atrapalha a ver a pista)
  desenhar(mode === "cima" ? 0 : Math.min(1, Math.max(0, (Math.abs(src.v || 0) / vref - 0.4) / 0.5)) + (turbo ? 0.4 : 0));
}
// Transmissão de TV (transmissao.js): nas corridas de F1, antes das luzes e com tempo próprio (`race.tvAte`, vindo do servidor).
// Esc pula (o botão e o toque também, no módulo). Nada de TV para quem só assiste.
function abrirTV(tr, dt, reduceMotion) { if (race.tvAte) quadroTV(race, tr, cam, reduceMotion); }
// A largada foi antecipada (todos os humanos pularam a TV): só troca a hora, sem remontar a pista nem o carro.
export function adiantarLargada(st) {
  if (!race || st.phase !== "race" || !race.tvAte || !st.tvAte || st.tvAte >= race.tvAte || race.tr.id !== st.config.pista || sNow() >= race.startAt) return false;
  race.startAt = st.startAt; race.tvAte = st.tvAte; race.lapT0 = st.startAt;
  return true;
}
addEventListener("keydown", (ev) => { if (ev.key === "Escape") pularTV(); });
if (location.hash === "#debug") window.__corrida = { get race() { return race; }, get S() { return E.S; }, keys, physics, groundH, buildTrack, act, renderer, scene, cam };
