// Corrida da Galera — o jogo no navegador: sala, garagem, e a corrida em 3D (Three.js).
// Este é o módulo de entrada: começa e para a corrida, o laço e o desenho, e a capa da página. O resto fica nos
// outros módulos desta pasta (estado, sons, rede, menus, cena, pista, carros, controles, fisica, fantasma e hud).
import * as THREE from "three";
import { E, PISTAS, SECTORS, COLORS, CARROS, carOf, socket, $, sNow, me, P, act, checkpoint } from "./estado.js";
import { Sound } from "./sons.js";
import { atualizarClima } from "./clima.js";
import { passoClima, limparClima } from "./clima-visual.js";
import { updateGhosts } from "./rede.js";
import { gridSpot, buildTrack, groundH, useTrack } from "./pista.js";
import { renderer, scene, cam, sun, V3 } from "./cena.js";
import { CARS3, KS, makeKart, poseKart, dropKart, puff, stepPuffs, amostraDeFumaca } from "./carros.js";
import { camMode, pollPad } from "./controles.js";
import { quadroCamera, somDaCamera, camEstado } from "./cameras.js";
import { physics, quadroDeFisica, quadroParado, criarRede, PASSO } from "./fisica.js";
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
  const f1 = st.config.regras === "f1", carro = f1 ? window.Sim.novo(tr, { grid: mine ? mine.grid : 0, f1: true, pneu: window.Sim.pneuDaLargada(st.phase, mine && mine.pneu, window.F1Regras.climaEm(st.clima, st.startAt).agua), box: st.phase !== "quali" }) : { x: spot.x, y: spot.y, z: tr.pts[spot.idx].h, vz: 0, air: false, a: spot.a, v: 0, vx: 0, vy: 0, slip: 0, steer: 0 };
  race = { startAt: st.startAt, tr, car: carro, net: f1 && mine ? criarRede() : null, acc: 0, idx: spot.idx, sector: SECTORS - 1, lastSent: 0, wrong: 0, ghosts: new Map(), msg: null, beeped: 0, finished: false, laps: 0, shake: 0,
    kart: mine ? makeKart(mine.color, mine.car, false, "", mine.mods, undefined, false, { numero: mine.numero }) : null, cam: { pos: null, a: spot.a }, lapT0: st.startAt, rec: [], recLast: -1e9, best: loadBest(st.config.pista), bestKart: null, bptr: 0, draft: 0, draftT: 0, sling: 0,
    pneu: f1 ? carro.pneu : null, ers: f1 ? carro.ers : null, box: f1 ? carro.box : null, // regras de F1: pneu, ERS e pit stop
    quali: st.phase === "quali", luzes: st.phase === "race" && st.config.regras === "f1" ? st.luzes : null, luzN: 0,
    tvAte: st.phase === "race" && st.config.regras === "f1" && st.tvAte && st.tv ? st.tvAte : 0 }; // a transmissão de TV antes das luzes // classificação (sem batida nem box) e as cinco luzes da largada
  $("bBox").classList.toggle("hidden", !race.box || !mine);
  $("bReiniciar").classList.toggle("hidden", !mine || st.host !== mine.id || !!st.temporada); // (corrida avulsa: o organizador recomeça)
  $("bErs").classList.toggle("hidden", !race.ers || !mine);
  startItems(tr, st.config.caixas);
  $("results").classList.add("hidden");
  resize(); comecarMedida();
  aquecerPista(tr, ceu);
  if (!raf) raf = requestAnimationFrame(loop);
}
function clearRace() { if (!race) return; stopItems(); limparEfeitos(); dropKart(race.kart); dropKart(race.bestKart); dropKart(race.safetyKart); for (const gh of race.ghosts.values()) dropKart(gh.kart); }
export function stopRace() { clearRace(); race = null; Sound.engine(0, false); limparClima(); }
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

// os 3 carros mais perto, para o som (volume pela distância e Doppler): três objetos que se reaproveitam a cada quadro
const OUTROS_SOM = [0, 1, 2].map(() => ({ dist: 0, vRel: 0, v: 0, lado: 0 })), M_POR_U = 0.75 / 3.6, ALCANCE_SOM = 380;
function outrosParaSom() {
  const c = race.car, sa = Math.sin(c.a), ca = Math.cos(c.a); let n = 0;
  for (const [id, gh] of race.ghosts) {
    if (P(id)?.dnf) continue;
    const dx = gh.x - c.x, dy = gh.y - c.y, du = Math.hypot(dx, dy) || 1, d = du * M_POR_U;
    if (d > ALCANCE_SOM || (n === 3 && d >= OUTROS_SOM[2].dist)) continue;
    let i = n < 3 ? n++ : 2; const s = OUTROS_SOM[i], ux = dx / du, uy = dy / du, gv = gh.v || 0;
    s.dist = d; s.v = Math.abs(gv) * M_POR_U; s.lado = -sa * ux + ca * uy; // (a direita do meu carro é (-sen a, cos a))
    s.vRel = -((Math.cos(gh.a) * gv - (c.vx || 0)) * ux + (Math.sin(gh.a) * gv - (c.vy || 0)) * uy) * M_POR_U; // positivo = se aproximando
    while (i > 0 && OUTROS_SOM[i - 1].dist > s.dist) { OUTROS_SOM[i] = OUTROS_SOM[i - 1]; OUTROS_SOM[i - 1] = s; i--; }
  }
  return n;
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
  atualizarClima(); // a chuva e a água na pista deste quadro (clima.js: o visual e a física leem)
  // a física anda em passos fixos de 1/120 s (fisica.js): o tempo do quadro só diz quantos passos dar, então 30 ou 144 quadros
  // por segundo dão a mesma corrida
  if (ativo()) quadroDeFisica(real); else quadroParado(real);
  updateGhosts(dt, race.net ? Math.min(1, race.acc / PASSO) : 1); // (os outros carros na hora do meu desenho: rede.js)
  recordLap();
  if (me() && ativo() && !race.net && performance.now() - race.lastSent > 100) { race.lastSent = performance.now(); socket.emit("pos", { x: race.car.x, y: race.car.y, z: race.car.z, a: race.car.a, v: race.car.v, prog: myProg() }); }
  const somF1 = E.S?.config.regras === "f1"; // regras de F1: o motor V10 (motor-v10.js), com o limitador e os carros dos outros
  Sound.engine(race.car.v, ativo() && sNow() >= race.startAt - 300 && !!me(), keys.gas, race.marcha || 1, race.rpm || 0, somF1 ? { cam: somDaCamera(camEstado.modo || camMode), lim: race.box?.fase === "entra" ? 0.45 : keys.gas && (race.rpm || 0) >= 0.985 ? 1 : 0 } : null);
  Sound.outros(OUTROS_SOM, somF1 && me() && !(race.tvAte && sNow() < race.tvAte) ? outrosParaSom() : 0); // (na transmissão de TV o grid parado em marcha lenta soava como uma buzina)
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
  return { f1: race.tr.id === "interlagos" || race.tr.id === "monaco" || race.tr.id === "barcelona" || race.tr.id === "silverstone" || race.tr.id === "monza" || !!race.tr.t.f1, zebra: !!extra.zebra, turbo: !!(p && p.boostUntil > now) || !!extra.turbo, estrela: !!(p && p.starUntil > now), rodando: !bala && (!!(p && (p.spinUntil > now || race.atingidos?.[p.id] > now)) || !!extra.rodando), derrapa: extra.derrapa || 0, pneu: extra.pneu !== undefined ? extra.pneu : race.pneu && p ? p.pneuAtual || p.pneu || null : null,
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
    poseKart(race.kart, c.x, c.y, c.z, c.a + (race.net ? 0 : slide * 0.25), c.v, c.steer, fr, dt, -c.steer * 0.04 + inc.roll, inc.pitch, fxDe(me(), now, { turbo, rodando, bala, pneu: race.pneu ? race.pneu.composto : null, zebra: (!tr.zebras || !!tr.zebras[race.idx]) && Math.abs(Math.abs((c.x - tr.pts[race.idx].x) * tr.pts[race.idx].nx + (c.y - tr.pts[race.idx].y) * tr.pts[race.idx].ny) - tr.W / 2) < 9, derrapa: c.slip > 45 ? (c.slip > 110 ? 2 : 1) : 0 }));
    // derrapagem: fumaça branca saindo dos pneus de trás, mais grossa quanto mais o carro escorrega
    if (c.slip > 40 && !c.air) { const forte = Math.min(1, (c.slip - 40) / 120); for (const s of [-1, 1]) if (Math.random() < 0.55 + forte * 0.45) puff(c.x - Math.cos(c.a) * 15 + -Math.sin(c.a) * s * 9, c.z + 3, c.y - Math.sin(c.a) * 15 + Math.cos(c.a) * s * 9, "#eeeeee", 3.2 + forte * 3, 0.8 + forte * 0.6, 1.7, 0.3 + forte * 0.22); }
    if (race.offroad && Math.random() < 0.5) puff(c.x - Math.cos(c.a) * 18, c.z + 2, c.y - Math.sin(c.a) * 18, tr.id === "interlagos" ? "#b39c66" : "#9a9a9a", 2.5);
  }
  // os outros pilotos (carros de verdade: dá para bater)
  for (const [id, gh] of race.ghosts) {
    const pl = P(id); if (!pl) continue;
    if (pl.dnf) { if (gh.kart) { dropKart(gh.kart); gh.kart = null; } continue; }
    const key = pl.color + pl.car + JSON.stringify(pl.mods || {}) + (pl.numero || ""); if (!gh.kart || gh.kartKey !== key) { dropKart(gh.kart); gh.kart = makeKart(pl.color, pl.car, false, pl.name, pl.mods, undefined, true, { numero: pl.numero }); gh.kartKey = key; }
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
      race.safetyKart = makeKart("#202733", "equilibrado", false, "SAFETY CAR", { pintura: "ouro" }, undefined, true, { semPintura: true });
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
  // a câmera (cameras.js): cockpit, onboard, bico, perseguição próxima e afastada, aérea e TV; quem só assiste ou já
  // passou a bandeirada começa na TV
  const mode = quadroCamera(race, { dt, tr, c, src, nearest, rm: motionPreference.matches, escolha: camMode, assistindo: !(src === c && race.kart), acabou: !!me() && me().finish != null, spec: CARS3[me()?.car] || CARS3.equilibrado });
  const modoClima = somDaCamera(mode); // o clima só conhece perto, cockpit, longe e cima
  // sol e sombras acompanham o carro (a direção do sol vem da foto do céu, quando tem)
  const sd = tr.sol; if (sd) sun.position.set(src.x + sd.x * 800, (src.z || 0) + sd.y * 800, src.y + sd.z * 800); else sun.position.set(src.x - 300, (src.z || 0) + 700, src.y + 260);
  sun.target.position.set(src.x, src.z || 0, src.y);
  abrirTV(tr, dt, motionPreference.matches);
  if (tr.sky) tr.sky.position.set(cam.position.x, 0, cam.position.z);
  passoClima(dt, race, cam, modoClima, src, c); // o visual do clima: céu, luz, neblina, chuva, asfalto molhado, borrifo, som e HUD (clima-visual.js)
  // desfoque de velocidade, pela fração da velocidade final do carro (vale igual para os cinco): começa em 40% (uns 90 km/h
  // no equilibrado), fica inteiro a 90% e o turbo e o estilingue borram ainda mais
  const turbo = src === c && (race.boostUntil > now || race.sling > 0 || (me() && me().boostUntil > now));
  const vref = (src === c ? carOf(me()) : CARROS.equilibrado).vmax;
  // (de cima não tem desfoque: o chão inteiro borrado só atrapalha a ver a pista)
  desenhar(mode === "cima" || mode === "tv" ? 0 : Math.min(1, Math.max(0, (Math.abs(src.v || 0) / vref - 0.4) / 0.5)) + (turbo ? 0.4 : 0));
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
