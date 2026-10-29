// Corrida da Galera — as câmeras da corrida (o laço de jogo.js chama `quadroCamera` uma vez por quadro).
// Ciclo (tecla C, botão 🎥 e Y do controle): cockpit → onboard → bico → perseguição próxima → perseguição afastada →
// aérea → TV. Os ids "perto", "longe", "cockpit" e "cima" são os de sempre (a escolha guardada e o som do motor usam).
//  - cockpit: primeira pessoa, atrás do volante (a de sempre).
//  - onboard: a câmera T (T-cam), em cima da entrada de ar, na altura do capacete; o bico aparece embaixo.
//  - bico: baixa, em cima do nariz, um pouco atrás do eixo da frente: as rodas da frente ficam nas bordas.
//  - perto / longe: atrás do carro, com a guinada atrasada, o FOV crescendo com a velocidade e a câmera descendo na
//    frenagem e subindo na aceleração.
//  - cima: a aérea, um helicóptero de TV (camera-aerea.js): alto, atrás do carro numa mola amortecida, olhando um ponto
//    à frente na pista, desviando de cenário alto.
//  - tv: câmeras fixas na beira da pista; troca para a mais perto do carro seguido e o zoom acompanha. Quem só assiste
//    e quem já recebeu a bandeirada começam nela (até apertar C).
// Toda troca de câmera (e cada corte da TV) leva a varredura de TV de transicao-f1.js; o corte vem no meio dela (~0,2 s).
// As medidas do carro (onde fica a entrada de ar, a altura do bico) vêm da malha do modelo, não de números soltos.
import * as THREE from "three";
import { cam, V3 } from "./cena.js";
import { groundH } from "./pista.js";
import { KS } from "./carros.js";
import { ocupado } from "./kit/comum.js";
import { toast } from "./estado.js";
import { aereaHeli } from "./camera-aerea.js";
import { transicaoF1 } from "./transicao-f1.js";

export const ORDEM = ["cockpit", "onboard", "bico", "perto", "longe", "cima", "tv"];
export const NOMES = {
  cockpit: "Cockpit (primeira pessoa)", onboard: "Onboard (T-cam)", bico: "Bico do carro", perto: "Perseguição próxima",
  longe: "Perseguição afastada", cima: "Aérea (helicóptero)", tv: "TV (câmeras da pista)",
};
const DE_DENTRO = new Set(["cockpit", "onboard", "bico"]); // precisam do meu carro (quem só assiste não tem)
export const usavel = (id, assistindo) => !(assistindo && DE_DENTRO.has(id));
// o som do motor e o clima só conhecem as câmeras de antes: cada nova cai na parecida
const SOM = { onboard: "cockpit", bico: "perto", tv: "longe" };
export const somDaCamera = (id) => SOM[id] || id;
// o que o laço está usando agora (controles.js lê para trocar a partir da câmera que se vê, e não da guardada)
export const camEstado = { modo: null, assistindo: false };

const lim = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- as medidas do carro, tiradas da malha ----------
// Padrão: o modelo F1 de agora (metros do modelo; f = para a frente a partir do meio do carro, y = acima do chão).
const PADRAO = { tcam: { f: -0.3, y: 1.18 }, bico: { f: 0.92, y: 0.64 } };
function medidas(kart) {
  if (kart.medidas) return kart.medidas;
  const kt = kart.kt;
  if (!kt || !kt.rodas.length) return PADRAO; // o modelo ainda não montou: vale o padrão e tenta de novo no outro quadro
  let r = PADRAO;
  try {
    kart.g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(kt.carro.matrixWorld).invert(), m = new THREE.Matrix4(), v = new THREE.Vector3();
    const giras = new Set(kt.rodas.map((q) => q.gira)), NB = 90, B = 0.1, F0 = -4.5, topo = new Float32Array(NB).fill(-1);
    const emRoda = (o) => { for (let p = o; p && p !== kt.carro; p = p.parent) if (giras.has(p)) return true; return false; };
    kt.carro.traverse((o) => {
      if (!o.isMesh || emRoda(o)) return;
      const pos = o.geometry.attributes.position; if (!pos) return;
      m.multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pos.count; i += 2) { v.fromBufferAttribute(pos, i).applyMatrix4(m); const b = Math.floor((-v.z - F0) / B); if (b >= 0 && b < NB && v.y > topo[b]) topo[b] = v.y; }
    });
    const em = (f) => { const b = lim(Math.floor((f - F0) / B), 0, NB - 1); for (let d = 0; d < 6; d++) for (const q of [b - d, b + d]) if (q >= 0 && q < NB && topo[q] > 0) return topo[q]; return 0.6; };
    // a entrada de ar: o platô mais alto atrás do volante (a traseira, com a asa, fica de fora)
    let alto = 0; for (let f = -1.2; f <= 0.1; f += B) alto = Math.max(alto, em(f));
    let soma = 0, n = 0; for (let f = -1.2; f <= 0.1; f += B) if (em(f) >= alto - 0.03) { soma += f; n++; }
    const eixo = kt.rodas.find((q) => q.esterca), fEixo = eixo ? -eixo.esterca.position.z : 1.2;
    const fBico = fEixo - 0.28;
    r = { tcam: { f: lim(n ? soma / n : -0.3, -0.9, 0.1), y: lim(alto + 0.22, 0.7, 1.6) }, bico: { f: fBico, y: lim(em(fBico) + 0.08, 0.3, 0.9) } };
  } catch (e) { r = PADRAO; }
  return (kart.medidas = r);
}

// ---------- as câmeras de TV da pista ----------
function postesDeTV(tr) {
  if (tr.camsTV) return tr.camsTV;
  const n = tr.n, qtd = lim(Math.round((n * 6) / 3500), 10, 24), lista = [];
  for (let k = 0; k < qtd; k++) {
    const i = Math.floor((k + 0.5) * n / qtd) % n, p = tr.pts[i];
    if (tr.coberto?.(i)) continue; // o túnel de Mônaco
    const a = tr.pts[(i - 30 + n) % n], b = tr.pts[(i + 30) % n], giro = a.tx * b.ty - a.ty * b.tx; // >0 curva para a esquerda
    let lado = Math.abs(giro) > 0.12 ? (giro > 0 ? -1 : 1) : (k % 2 ? 1 : -1); // fora da curva (de onde se vê o carro entrar e sair); na reta, alterna
    let post = null;
    for (const [s, extra] of [[lado, 0], [-lado, 0], [lado, 60], [-lado, 60]]) {
      const lat = s * (tr.W / 2 + 80 + extra), x = p.x + p.nx * lat, y = p.y + p.ny * lat;
      if (x < 40 || y < 40 || x > tr.t.world - 40 || y > tr.t.world - 40 || ocupado(tr, x, y, i)) continue;
      post = { x, y, z: groundH(tr, x, y, i) + 42, i }; break;
    }
    if (post) lista.push(post);
  }
  if (!lista.length) { const p = tr.pts[0]; lista.push({ x: p.x + p.nx * (tr.W / 2 + 90), y: p.y + p.ny * (tr.W / 2 + 90), z: p.h + 42, i: 0 }); }
  return (tr.camsTV = lista);
}

// ---------- o quadro ----------
// o: { dt, tr, c (meu carro como é desenhado), src (o carro seguido), nearest, rm (movimento reduzido), escolha, assistindo, acabou, spec }
// devolve a câmera em uso (o jogo usa para o clima, o desfoque e o som)
export function quadroCamera(R, o) {
  const { dt, tr, c, src, nearest, rm, assistindo, acabou } = o, C = R.cam, kart = R.kart;
  // quem só assiste, ou já passou a bandeirada, começa na TV; apertar C tira dela (e vale como escolha)
  const vendo = assistindo || acabou;
  if (R.camVendo !== vendo) { R.camVendo = vendo; R.camTv = vendo; if (vendo && !assistindo) toast("📺 Câmera de TV (C troca)", 2200); }
  const alvoModo = camEstado.modo = !vendo || !R.camTv ? (usavel(o.escolha, assistindo) ? o.escolha : "longe") : "tv";
  camEstado.assistindo = assistindo;
  // a câmera que se vê muda no meio da varredura de TV (o corte fica escondido); sem varredura (movimento reduzido), na hora
  if (C.modoVis == null || !usavel(C.modoVis, assistindo) || (DE_DENTRO.has(C.modoVis) && !kart)) { C.modoVis = alvoModo; C.modoQuando = null; }
  if (C.modoVis !== alvoModo) {
    const agora = performance.now();
    if (C.modoQuando == null) { const d = transicaoF1({ rotulo: NOMES[alvoModo], rm }); if (d > 0) C.modoQuando = agora + d; else C.modoVis = alvoModo; }
    if (C.modoQuando != null && agora >= C.modoQuando) { C.modoVis = alvoModo; C.modoQuando = null; }
  } else C.modoQuando = null;
  const mode = C.modoVis;
  if (mode !== "cima") C.heli = null; // a aérea recomeça do carro quando volta
  const speedK = Math.min(1.2, Math.abs(src.v || 0) / 300);
  if (C.lastV == null) C.lastV = src.v || 0;
  const acelRaw = ((src.v || 0) - C.lastV) / Math.max(dt, 0.01);
  const surge = Math.max(0, Math.min(1, acelRaw / 90));
  C.lastV = src.v || 0;
  C.surge = (C.surge || 0) + ((rm ? 0 : surge) - (C.surge || 0)) * (1 - Math.exp(-dt * 5));
  C.acel = (C.acel || 0) + ((rm ? 0 : lim(acelRaw / 170, -1, 1)) - (C.acel || 0)) * (1 - Math.exp(-dt * 3)); // -1 frenando forte ... 1 acelerando forte
  const fovStep = 1 - Math.exp(-dt * 5), ctx = { ...o, C, R, speedK, fovStep, mode };
  if (kart) { const fora = !DE_DENTRO.has(mode); kart.roof.visible = kart.cabin.visible = fora; for (const b of kart.roofBits) b.visible = fora; } // de dentro, cabine, teto e faixa do teto tapariam a vista
  if (mode !== "perto" && mode !== "longe") guinada(C, src, dt, 5);
  if (mode === "cima") aereaHeli(ctx);
  else if (mode === "cockpit") {
    const eyeU = kart.eye.u, eyeH = kart.eye.h, spec = o.spec;
    pov(ctx, { fo: (eyeU - spec.L / 2) * KS, eh: eyeH * KS, lift: 1.5, mira: 0.5, fov: 72, fovV: 22, rolar: 0.035, trem: 1, tremOff: 0.7, tremBatida: 1.6 });
  } else if (mode === "onboard") {
    const M = medidas(kart).tcam, esc = kart.sc * KS;
    pov(ctx, { fo: M.f * esc, eh: M.y * esc, lift: 0, mira: 0.42, fov: 76, fovV: 18, rolar: 0.025, trem: 0.9, tremOff: 0.6, tremBatida: 1.3 });
  } else if (mode === "bico") {
    const M = medidas(kart).bico, esc = kart.sc * KS;
    pov(ctx, { fo: M.f * esc, eh: M.y * esc, lift: 0, mira: 0.6, fov: 82, fovV: 14, rolar: 0.02, trem: 1.25, tremOff: 0.9, tremBatida: 1.4 });
  } else if (mode === "tv") tv(ctx);
  else perseguicao(ctx);
  return mode;
}

// dentro do carro (cockpit, onboard e bico): a câmera anda com o carro; na subida a vista levanta e na descida abaixa
function pov(x, p) {
  const { R, C, dt, tr, c, rm, speedK, fovStep, nearest } = x;
  const fx = Math.cos(c.a), fy = Math.sin(c.a), fo = p.fo, eh = p.eh;
  const ahead = c.air ? c.z : groundH(tr, c.x + fx * 70, c.y + fy * 70, nearest(tr, c.x + fx * 70, c.y + fy * 70, R.idx));
  C.lookY = C.lookY == null ? ahead : C.lookY + (ahead - C.lookY) * (1 - Math.exp(-dt * 6));
  C.pitch = (C.pitch || 0) + ((R.pitch || 0) - (C.pitch || 0)) * (1 - Math.exp(-dt * 8));
  cam.position.set(c.x + fx * fo, c.z + eh + p.lift + Math.sin(C.pitch) * fo * 0.5, c.y + fy * fo); C.pos = null;
  cam.lookAt(c.x + fx * (fo + 70), Math.max(C.lookY, c.z + Math.tan(C.pitch) * 70 - 6) + eh * p.mira, c.y + fy * (fo + 70));
  if (!rm) { // a vibração cresce com a velocidade e o volante inclina um pouco a cabeça
    const trem = (speedK * speedK * 0.35 + (R.offroad ? p.tremOff : 0)) * p.trem;
    cam.position.y += (Math.random() - 0.5) * trem; cam.position.x += (Math.random() - 0.5) * trem * 0.5;
    cam.rotateZ(-c.steer * p.rolar * Math.min(1, speedK * 1.5));
  }
  if (R.shake > 0) { R.shake -= dt; if (!rm) cam.position.y += (Math.random() - 0.5) * p.tremBatida; }
  cam.fov += ((p.fov + speedK * (rm ? 6 : p.fovV) + C.surge * 4) - cam.fov) * fovStep; cam.updateProjectionMatrix();
}

// atrás do carro: perto (como nos jogos de F1: logo atrás da asa) ou longe
function perseguicao(x) {
  const { R, C, dt, tr, src, rm, speedK, fovStep, mode, nearest } = x, near = mode === "perto";
  // a guinada atrasa um pouco (a de longe, mais): na curva o carro aparece de três quartos, sem a câmera chicotear
  guinada(C, src, dt, near ? 6.5 : 4.5);
  const fx = Math.cos(C.a), fy = Math.sin(C.a), a = rm ? 0 : C.acel;
  // acelerando, a câmera sobe e se afasta; freando, desce e chega mais perto
  const back = (near ? 58 + speedK * (rm ? 4 : 14) + a * 5 : 118 + speedK * (rm ? 8 : 26) + a * 9) + C.surge * 6;
  const up = near ? 17 + speedK * 1.5 + a * 3.2 : 38 + speedK * 4 + a * 7;
  const wx = src.x - fx * back, wz = src.y - fy * back;
  const y = Math.max((src.z || 0) + up, groundH(tr, wx, wz, nearest(tr, wx, wz, R.idx)) + (near ? 8 : 6));
  if (!C.pos) C.pos = V3(wx, y, wz); else { C.pos.x = wx; C.pos.z = wz; C.pos.y += (y - C.pos.y) * (1 - Math.exp(-dt * 9)); }
  // No túnel de Mônaco, a câmera externa fica abaixo do teto opaco.
  if (tr.coberto?.(R.idx)) C.pos.y = Math.min(C.pos.y, (src.z || 0) + 23);
  cam.position.copy(C.pos);
  if (R.shake > 0) { R.shake -= dt; if (!rm) { cam.position.x += (Math.random() - 0.5) * 3; cam.position.y += (Math.random() - 0.5) * 3; } }
  if (R.offroad && !rm) cam.position.y += (Math.random() - 0.5) * 1.2;
  if (!rm && speedK > 0.75) cam.position.y += (Math.random() - 0.5) * (speedK - 0.75) * 1.4; // tremidinha no fim de reta
  // olha para o chão lá na frente: na subida a câmera levanta o olhar, na descida abaixa
  const la = near ? 60 : 85, lx = src.x + fx * la, ly = src.y + fy * la, chao = groundH(tr, lx, ly, nearest(tr, lx, ly, R.idx));
  C.lookH = C.lookH == null ? chao : C.lookH + (chao - C.lookH) * (1 - Math.exp(-dt * 5));
  cam.lookAt(lx, Math.max((src.z || 0) + 4 + (C.lookH - (src.z || 0)) * 0.6, C.lookH + 2), ly);
  cam.fov += ((near ? 62 : 56) + speedK * (rm ? 4 : near ? 20 : 17) + C.surge * 5 - cam.fov) * fovStep; cam.updateProjectionMatrix();
}

// a guinada suavizada de C.a: as câmeras que não a usam a mantêm em dia, para a troca para a perseguição não girar de repente
function guinada(C, src, dt, taxa) { let d = src.a - C.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; C.a += d * (1 - Math.exp(-dt * taxa)); }

// câmeras fixas de TV: a mais perto do carro seguido, com um pouco de teimosia para não ficar pulando, e o zoom
// fecha conforme o carro se afasta
function tv(x) {
  const { R, C, dt, tr, src, rm, speedK } = x, postes = postesDeTV(tr), agora = performance.now();
  C.pos = null;
  const dist = (p) => Math.hypot(p.x - src.x, p.y - src.y);
  let melhor = 0, md = Infinity; postes.forEach((p, k) => { const d = dist(p); if (d < md) { md = d; melhor = k; } });
  const atual = postes[C.tvI];
  if (!atual) { C.tvI = melhor; C.tvT = agora; C.tvPend = null; C.tvZoom = true; }
  else if (C.tvPend != null) { // o corte combinado com a varredura de TV: a câmera de antes segura até ela cobrir a tela
    if (agora >= C.tvCorte) { C.tvI = C.tvPend; C.tvT = agora; C.tvPend = null; C.tvZoom = true; }
  } else if (melhor !== C.tvI && agora - (C.tvT || 0) > 1400 && md < dist(atual) * 0.72) {
    const d = transicaoF1({ rotulo: "Câmera " + (melhor + 1), rm });
    if (d > 0) { C.tvPend = melhor; C.tvCorte = agora + d; } else { C.tvI = melhor; C.tvT = agora; C.tvZoom = true; }
  }
  const p = postes[C.tvI], alvo = V3(src.x, (src.z || 0) + 7, src.y);
  C.tvAlvo = C.tvAlvo ? C.tvAlvo.lerp(alvo, 1 - Math.exp(-dt * 9)) : alvo.clone();
  cam.position.set(p.x, p.z, p.y); cam.lookAt(C.tvAlvo);
  const d = Math.max(60, Math.hypot(p.x - src.x, p.y - src.y, p.z - (src.z || 0)));
  const fovAlvo = lim(2 * Math.atan((70 + speedK * 40) / d) * 180 / Math.PI, 9, 62); // o carro (e um pouco de pista em volta) enche o quadro
  if (C.tvZoom) { C.tvZoom = false; cam.fov = fovAlvo; } // câmera nova: já entra com o zoom dela (o corte está escondido)
  else cam.fov += (fovAlvo - cam.fov) * (1 - Math.exp(-dt * (rm ? 8 : 3.5)));
  cam.updateProjectionMatrix();
  if (R.shake > 0) R.shake -= dt;
}
