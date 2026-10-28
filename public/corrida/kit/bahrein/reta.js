// Bahrein — a reta de largada à noite (a foto 7 do Thiago): a mureta branca contínua com a publicidade e a faixa vermelha, o
// pórtico branco de treliça que atravessa a pista com a faixa "Gulf Air" e, em cima da arquibancada principal, a cobertura de
// velas com a fileira de lâmpadas quentes embaixo (de noite, a estrutura dourada iluminada).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { solido } from "../montagem.js";
import { faixa } from "../arquibancadas.js";
import { moldura, Regiao, pintor, materialDaNoite } from "./base.js";

// ---- a mureta: painéis brancos com a faixa vermelha em cima e a marca; dois lados visíveis, tampa cinza ----
export function muretaBranca(tr, add, trechos, { v = 80, alto = 9.5 } = {}) {
  const { n } = tr, mat = new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide, map: canvasTex(64, 512, (c) => {
    c.setTransform(0, 1, -1, 0, 64, 0); const w = 512, h = 64; // o u da faixa sobe pela parede e o v corre ao longo dela: o desenho entra girado
    c.fillStyle = "#f6f4ee"; c.fillRect(0, 0, w, h); c.fillStyle = "#ce1126"; c.fillRect(0, 0, w, 9); c.fillStyle = "#d4d1c8"; c.fillRect(0, h - 5, w, 5);
    c.textBaseline = "middle"; c.textAlign = "center";
    c.fillStyle = "#ce1126"; c.font = "italic 900 30px Georgia, serif"; c.fillText("Gulf Air", 128, 34); c.fillStyle = "#b8942c"; c.fillRect(70, 52, 116, 2);
    c.fillStyle = "#15171b"; c.font = "italic 900 24px Arial Black, Impact, sans-serif"; c.fillText("BAHRAIN GP", 384, 34); c.fillStyle = "#ce1126"; c.fillRect(0, 0, 3, h); c.fillRect(256, 0, 3, h);
  }, true) }), tampa = M(0x9ea3a8, { roughness: 0.6 });
  let pontos = 0;
  for (const [f0, f1, lado] of trechos) {
    const a = Math.floor(f0 * n), b = Math.floor(f1 * n);
    faixa(tr, add, a, b, lado * v, lado * v, 0, alto, mat, 96);
    faixa(tr, add, a, b, lado * (v - 1.2), lado * (v + 1.2), alto, alto, tampa, 60); pontos += b - a;
  }
  tr.muretaBahrein = pontos;
}

// ---- o pórtico branco de treliça: duas pernas largas, a viga com a faixa "Gulf Air" e o capitel de treliça por cima ----
export function porticoBahrein(tr, add) {
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx), alto = 62;
  const trelica = canvasTex(64, 64, (c, w, h) => { c.fillStyle = "#f4f5f6"; c.fillRect(0, 0, w, h); c.strokeStyle = "#a9b0b8"; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4); c.beginPath(); c.moveTo(2, 2); c.lineTo(w - 2, h - 2); c.moveTo(w - 2, 2); c.lineTo(2, h - 2); c.stroke(); });
  const branco = new THREE.MeshStandardMaterial({ map: trelica, roughness: 0.55 }); branco.map.repeat.set(1, 8);
  const pernas = (largura) => { const mapa = trelica.clone(); mapa.needsUpdate = true; mapa.repeat.set(1, 8); return new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.55 }); };
  const perna = pernas();
  for (const k of [1, -1]) {
    const m = add(new THREE.Mesh(new THREE.BoxGeometry(11, alto + 14, 11), perna)); m.position.set(p.x + p.nx * k * (L + 3), p.h + (alto + 14) / 2 - 1, p.y + p.ny * k * (L + 3)); m.rotation.y = rot; m.castShadow = true;
  }
  const capitel = add(new THREE.Mesh(new THREE.BoxGeometry(2 * L + 18, 8, 7), (() => { const mapa = trelica.clone(); mapa.needsUpdate = true; mapa.repeat.set(16, 1); return new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.55 }); })()));
  capitel.position.set(p.x, p.h + alto + 9, p.y); capitel.rotation.y = rot; capitel.castShadow = true;
  // a faixa da viga: fundo branco, "Gulf Air" em vermelho e o dourado, dos dois lados
  const faixaTex = canvasTex(1024, 64, (c, w, h) => {
    c.fillStyle = "#f7f5ef"; c.fillRect(0, 0, w, h); c.fillStyle = "#ce1126"; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6);
    c.textBaseline = "middle"; c.textAlign = "center";
    [["Gulf Air", 170, "#ce1126"], ["BAHRAIN GRAND PRIX", 512, "#15171b"], ["Gulf Air", 854, "#ce1126"]].forEach(([t, x, cor], i) => { c.fillStyle = cor; c.font = i === 1 ? "italic 900 30px Arial Black, Impact, sans-serif" : "italic 900 38px Georgia, serif"; c.fillText(t, x, 34); });
    c.fillStyle = "#b8942c"; c.fillRect(70, 50, 200, 3); c.fillRect(754, 50, 200, 3);
  }, false);
  for (const s of [1, -1]) {
    const f = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 10), new THREE.MeshBasicMaterial({ map: faixaTex, side: THREE.FrontSide })));
    f.position.set(p.x, p.h + 62, p.y); f.rotation.y = rot + (s > 0 ? 0 : Math.PI); f.translateZ(s * 1.8);
  }
}

// ---- a cobertura de velas da arquibancada principal e a fileira de lâmpadas quentes embaixo ----
export function velasTribuna(tr, add, idx = 0) {
  const a = (tr.arqDegraus || [])[idx]; if (!a) return;
  const F = moldura(tr, a.i0, a.i1, a.lado), reg = new Regiao(360), P = pintor(F, reg), S = solido();
  const quente = materialDaNoite(tr, "#e9e3d2", "#ffb94d"), L = F.comprimento, vao = L / Math.max(2, Math.round(L / 46));
  const l0 = Math.abs(a.l0), fundoTot = a.degraus * 9, topo = 4 + a.degraus * 6, y0 = topo + 24, d = 40;
  const sob = (v) => 4 + ((v - l0) / 9) * 6; // a altura dos degraus no lado v
  for (let s = vao / 2; s < L; s += vao) {
    for (let r = 0; r < 2; r++) {
      const v = l0 + fundoTot - d * (1.5 - r) + 2 - 8, h = r ? 26 : 21;
      P.vela(s, v, y0, { w: vao - 0.6, d: d - 0.6, h, cor: "#f3e8c9" });
      P.mastro(s, v, y0 + h - 1, 16 + r * 8, "#f2f4f6", 1.1);
    }
    P.caixa(quente, s, l0 + fundoTot - d * 2 - 4, y0 - 1, [vao, 1.4, 1.4], "#ffffff"); // a viga acesa da frente
    for (let k = 0; k < 4; k++) P.caixa(quente, s - vao / 2 + (k + 0.5) * vao / 4, l0 + fundoTot - d - 8, y0 - 1.2, [3.2, 1.2, 3.2], "#ffffff"); // as lâmpadas do meio
    if (Math.round(s / vao) % 2 === 0) P.caixa(S, s, l0 + fundoTot - d * 2 - 4, sob(l0 + fundoTot - d * 2 - 4) - 2, [1.8, y0 - sob(l0 + fundoTot - d * 2 - 4) + 1, 1.8], "#d8dde2"); // o pilar da frente
  }
  reg.montar(add, "bahrein-tribuna");
}
