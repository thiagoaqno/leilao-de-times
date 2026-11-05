// Linha de auxílio pessoal: marcas sobre o centro da pista, sem alterar os comandos ou a física.
import * as THREE from "three";
import { carOf, me } from "./estado.js";

const CHAVE = "corrida:linha-frenagem", QUANTAS = 28, PASSO = 4;
let ligada = false;
try { ligada = localStorage.getItem(CHAVE) === "1"; } catch {}
const botoes = [document.getElementById("btnLinhaFreio"), document.getElementById("bLinhaFreio")].filter(Boolean);
function atualizarBotoes() {
  for (const b of botoes) { b.setAttribute("aria-pressed", String(ligada)); b.textContent = b.id === "bLinhaFreio" ? `Linha: ${ligada ? "ligada" : "desligada"}` : `Linha de frenagem: ${ligada ? "ativada" : "desativada"}`; }
}
for (const b of botoes) b.addEventListener("click", () => { ligada = !ligada; try { localStorage.setItem(CHAVE, ligada ? "1" : "0"); } catch {} atualizarBotoes(); });
atualizarBotoes();

export function criarLinhaFreio(cena) {
  const geometria = new THREE.BufferGeometry(), pos = new Float32Array(QUANTAS * 18), cores = new Float32Array(QUANTAS * 18);
  geometria.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geometria.setAttribute("color", new THREE.BufferAttribute(cores, 3).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.86, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const malha = new THREE.Mesh(geometria, material); malha.frustumCulled = false; malha.renderOrder = 2; cena.add(malha);
  let ultima = -Infinity, pista = null, carro = null, limites = new Map();
  const cor = new THREE.Color();
  function limite(tr, i, spec) {
    const n = tr.n, k = ((i % n) + n) % n;
    if (limites.has(k)) return limites.get(k);
    // Uma janela larga mede a curva sem reagir aos pequenos ruídos do traçado GPS.
    const a = tr.pts[(k - 12 + n) % n], b = tr.pts[(k + 12) % n];
    const ang = Math.abs(Math.atan2(a.tx * b.ty - a.ty * b.tx, a.tx * b.tx + a.ty * b.ty));
    const curvatura = ang / 144;
    const v = curvatura > 0.00001 ? window.Dinamica.velocidadeDeCurva(spec, 1 / curvatura) * 0.9 : spec.vmax;
    limites.set(k, v); return v;
  }
  function atualizar(race, visivel) {
    malha.visible = ligada && !!race && !!me() && visivel;
    if (!malha.visible) return;
    const agora = performance.now(); if (agora - ultima < 150) return; ultima = agora;
    const tr = race.tr, spec = carOf(me()), n = tr.n, velocidade = Math.abs(race.car.v || 0);
    if (pista !== tr || carro !== spec) { pista = tr; carro = spec; limites = new Map(); }
    const freio = Math.max(20, window.Dinamica.frenagemMaxima(spec, velocidade) * 0.7);
    const origem = Number.isFinite(race.car.idx) ? race.car.idx : race.idx;
    for (let j = 0; j < QUANTAS; j++) {
      const i = (origem + 3 + j * PASSO) % n, a = tr.pts[i], b = tr.pts[(i + 2) % n];
      let alvo = spec.vmax;
      for (let d = 0; d <= 80; d += 4) alvo = Math.min(alvo, Math.sqrt(limite(tr, i + d, spec) ** 2 + 2 * freio * d * 6));
      const razao = velocidade / Math.max(1, alvo);
      cor.set(razao > 1.04 ? 0xf12d2d : razao > 0.88 ? 0xffce2d : 0x55e48b);
      const largura = 2.7, pontos = [
        [a.x+a.nx*largura,a.h+1,a.y+a.ny*largura], [a.x-a.nx*largura,a.h+1,a.y-a.ny*largura], [b.x+b.nx*largura,b.h+1,b.y+b.ny*largura],
        [b.x+b.nx*largura,b.h+1,b.y+b.ny*largura], [a.x-a.nx*largura,a.h+1,a.y-a.ny*largura], [b.x-b.nx*largura,b.h+1,b.y-b.ny*largura]
      ];
      pontos.forEach((p, t) => { const o = j * 18 + t * 3; pos.set(p, o); cores[o] = cor.r; cores[o+1] = cor.g; cores[o+2] = cor.b; });
    }
    geometria.attributes.position.needsUpdate = true; geometria.attributes.color.needsUpdate = true;
  }
  return { atualizar, parar() { cena.remove(malha); geometria.dispose(); material.dispose(); } };
}
