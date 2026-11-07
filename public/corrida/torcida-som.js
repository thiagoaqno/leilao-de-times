// Corrida da Galera — onde está a torcida de cada pista, para o som de quem passa por ela (Sound.torcida, em sons.js).
// Junta numa grade (células de CEL unidades) tudo o que é público: a galera de vida.js e vida-mais.js (tr.vida), as
// arquibancadas do kit (tr.arquibancadas, trechos da volta), a gente que os GPs põem nas encostas e gramados
// (tr.pontosTorcida: Spa, Red Bull Ring, Zandvoort, Austin) e qualquer peça marcada com userData.torcida (as tribunas
// cobertas do kit 2, a tribuna de Barcelona, a do Raidillon, as arquibancadas da reta dos boxes). `nivelDaTorcida` diz,
// de 0 a 1, o quanto a torcida está perto de um ponto: 1 colado nela, 0 a partir de ALCANCE.
import * as THREE from "three";

const CEL = 40, ALCANCE = 170, PERTO = 35;

export function montarMapaDaTorcida(tr, cena) {
  const celulas = new Map(), chave = (i, j) => i * 100003 + j;
  const marcar = (x, y, peso = 1) => { if (!Number.isFinite(x) || !Number.isFinite(y)) return; const k = chave(Math.floor(x / CEL), Math.floor(y / CEL)); celulas.set(k, (celulas.get(k) || 0) + peso); };
  const V = tr.vida;
  for (const t of [V?.torcida, ...(V?.torcidas || [])]) for (const g of t?.gente || []) marcar(g.x, g.z);
  for (const [x, y] of tr.pontosTorcida || []) marcar(x, y);
  // as arquibancadas do kit: os degraus ficam ao lado da pista, entre os pontos i0 e i1 da volta
  for (const q of tr.arqDegraus || []) for (let i = q.i0; i <= q.i1; i += 3) {
    const p = tr.pts[((i % tr.n) + tr.n) % tr.n], l = q.l0 + Math.sign(q.l0 || q.lado) * 20;
    marcar(p.x + p.nx * l, p.y + p.ny * l, 6);
  }
  for (const [a, b] of tr.arquibancadas || []) if (!(tr.arqDegraus || []).length) for (let i = a; i <= b; i += 3) { const p = tr.pts[((i % tr.n) + tr.n) % tr.n]; marcar(p.x, p.y, 3); }
  // as peças marcadas: amostra a caixa de cada uma ao longo do lado maior
  const caixa = new THREE.Box3();
  cena?.traverse((o) => {
    if (!o.userData?.torcida) return;
    caixa.setFromObject(o); if (caixa.isEmpty()) return;
    const dx = caixa.max.x - caixa.min.x, dz = caixa.max.z - caixa.min.z, passos = Math.max(1, Math.ceil(Math.max(dx, dz) / (CEL / 2)));
    for (let k = 0; k <= passos; k++) {
      const u = k / passos, x = dx >= dz ? caixa.min.x + dx * u : (caixa.min.x + caixa.max.x) / 2, z = dx >= dz ? (caixa.min.z + caixa.max.z) / 2 : caixa.min.z + dz * u;
      marcar(x, z, 8);
    }
  });
  tr.mapaTorcida = { celulas, chave };
  return celulas.size;
}

// de 0 a 1: quão perto (e quão cheia) está a torcida do ponto (x, y)
export function nivelDaTorcida(tr, x, y) {
  const m = tr.mapaTorcida; if (!m || !m.celulas.size) return 0;
  const i0 = Math.floor(x / CEL), j0 = Math.floor(y / CEL), r = Math.ceil(ALCANCE / CEL);
  let melhor = 0;
  for (let i = i0 - r; i <= i0 + r; i++) for (let j = j0 - r; j <= j0 + r; j++) {
    const n = m.celulas.get(m.chave(i, j)); if (!n) continue;
    const d = Math.hypot((i + 0.5) * CEL - x, (j + 0.5) * CEL - y), perto = Math.max(0, Math.min(1, 1 - (d - PERTO) / (ALCANCE - PERTO)));
    const cheia = Math.min(1, Math.sqrt(n / 6)); // uma pessoa sozinha quase não soa; um trecho de arquibancada cheio, sim
    melhor = Math.max(melhor, perto * perto * (0.35 + 0.65 * cheia));
  }
  return melhor;
}
