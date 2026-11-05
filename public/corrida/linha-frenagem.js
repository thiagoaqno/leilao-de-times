// Linha de auxílio pessoal: o mesmo traçado otimizado usado pelos robôs, sem interferir nos comandos.
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
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const malha = new THREE.Mesh(geometria, material); malha.name = "linha-frenagem"; malha.visible = false; malha.frustumCulled = false; malha.renderOrder = 2; cena.add(malha);
  let ultima = -Infinity, pista = null, carro = null, limites = new Map(), linha = null, requisitando = false, novaTentativa = 0, parou = false;
  const cor = new THREE.Color();
  function carregar(tr) {
    if (requisitando || performance.now() < novaTentativa) return;
    requisitando = true;
    fetch(`/api/corrida/linha/${encodeURIComponent(tr.id)}`).then((r) => r.ok ? r.json() : null).then((dados) => {
      if (!parou && pista === tr && dados?.lat?.length === tr.n && dados?.k?.length === tr.n) { linha = dados; limites.clear(); }
    }).catch(() => {}).finally(() => { requisitando = false; novaTentativa = performance.now() + 3000; });
  }
  function limite(tr, i, spec) {
    const k = ((i % tr.n) + tr.n) % tr.n;
    if (limites.has(k)) return limites.get(k);
    const curvatura = linha.k[k];
    const v = curvatura > 0.00001 ? window.Dinamica.velocidadeDeCurva(spec, 1 / curvatura) * 0.95 : spec.vmax;
    limites.set(k, v); return v;
  }
  function atualizar(race, visivel) {
    malha.visible = false;
    if (!ligada || !race || !me() || !visivel) return;
    const agora = performance.now(), tr = race.tr, spec = carOf(me()), n = tr.n;
    if (pista !== tr) { pista = tr; linha = null; limites.clear(); novaTentativa = 0; }
    if (!linha) { carregar(tr); return; }
    malha.visible = true;
    if (agora - ultima < 150) return; ultima = agora;
    if (carro !== spec) { carro = spec; limites.clear(); }
    const velocidade = Math.abs(race.car.v || 0), dano = window.F1Regras.efeitoDoDano(me().dano || 0);
    const freio = Math.max(20, window.Dinamica.frenagemMaxima(spec, velocidade) * 0.7 * dano.freio);
    const indice = Number.isFinite(race.car.idx) ? race.car.idx : race.idx;
    const origem = Math.floor(indice / PASSO) * PASSO;
    const ponto = (i) => { const k = ((i % n) + n) % n, p = tr.pts[k], lat = linha.lat[k]; return { x: p.x + p.nx * lat, y: p.y + p.ny * lat, h: p.h }; };
    for (let j = 0; j < QUANTAS; j++) {
      const i = (origem + 3 + j * PASSO) % n, a = ponto(i), b = ponto(i + 2);
      let alvoFreio = spec.vmax, alvoSoltar = spec.vmax;
      for (let d = 0; d <= 100; d += 4) {
        const curva = limite(tr, i + d, spec), dist = d * 6;
        alvoFreio = Math.min(alvoFreio, Math.sqrt(curva * curva + 2 * freio * dist));
        alvoSoltar = Math.min(alvoSoltar, Math.sqrt(curva * curva + 2 * Math.min(18, freio * 0.16) * dist));
      }
      cor.set(velocidade > alvoFreio * 1.02 ? 0xf12d2d : velocidade > alvoSoltar * 0.98 ? 0xffce2d : 0x55e48b);
      const dx = b.x - a.x, dy = b.y - a.y, comprimento = Math.hypot(dx, dy) || 1, nx = -dy / comprimento * 2.7, ny = dx / comprimento * 2.7;
      const pontos = [[a.x+nx,a.h+1,a.y+ny], [a.x-nx,a.h+1,a.y-ny], [b.x+nx,b.h+1,b.y+ny], [b.x+nx,b.h+1,b.y+ny], [a.x-nx,a.h+1,a.y-ny], [b.x-nx,b.h+1,b.y-ny]];
      pontos.forEach((p, t) => { const o = j * 18 + t * 3; pos.set(p, o); cores[o] = cor.r; cores[o+1] = cor.g; cores[o+2] = cor.b; });
    }
    geometria.attributes.position.needsUpdate = true; geometria.attributes.color.needsUpdate = true;
  }
  return { atualizar, parar() { parou = true; cena.remove(malha); geometria.dispose(); material.dispose(); } };
}
