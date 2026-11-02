// Inclinação visual do carro: acompanha o asfalto enquanto as rodas o tocam e o terreno ao sair dele.
export function inclinacao(tr, x, y, a, idx, L, W, vz, noAr, v, f1, Sim, groundH) {
  if (noAr) return { pitch: Math.max(-0.5, Math.min(0.4, Math.atan2(vz || 0, Math.max(60, Math.abs(v))))), roll: 0 };
  const naPista = f1 && Math.abs(Sim.quadro(tr, x, y, idx).lat) <= (tr.W + W) / 2;
  const fx = Math.cos(a), fy = Math.sin(a), h = (dx, dy) => naPista ? Sim.quadro(tr, x + dx, y + dy, idx).h : groundH(tr, x + dx, y + dy, idx);
  const frente = h(fx * L / 2, fy * L / 2), tras = h(-fx * L / 2, -fy * L / 2), dir = h(-fy * W / 2, fx * W / 2), esq = h(fy * W / 2, -fx * W / 2);
  return { pitch: Math.atan2(frente - tras, L), roll: Math.atan2(dir - esq, W) };
}
