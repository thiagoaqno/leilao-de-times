// Corrida da Galera — batida entre carros (pura, sem página: o teste carrega este arquivo direto).
// Cada carro vira 3 círculos ao longo do corpo. Quem bate empurra os dois: cada navegador resolve a sua metade com a
// mesma conta (impulso pela massa e pela velocidade relativa), então os dois lados chegam quase no mesmo resultado.
export const MASSA = { equilibrado: 1, foguete: 0.9, formiga: 0.8, drifteiro: 1, tanque: 1.5 };
const ELASTICIDADE = 0.35;

// os 3 círculos do carro: [x, y] no mundo e o raio (L e W em unidades da pista)
export function circulos(x, y, a, L, W) {
  const fx = Math.cos(a), fy = Math.sin(a), r = W * 0.45, d = Math.max(0, L / 2 - r);
  return [-d, 0, d].map((u) => [x + fx * u, y + fy * u, r]);
}

// Confere o carro `eu` contra o `outro` e mexe só no `eu` (posição e velocidade). Devolve a força da batida (0 = nada).
// eu: { x, y, a, vx, vy, L, W, massa }; outro: { x, y, a, v, L, W, massa } (o outro só tem velocidade para a frente)
export function baterNoOutro(eu, outro) {
  const A = circulos(eu.x, eu.y, eu.a, eu.L, eu.W), B = circulos(outro.x, outro.y, outro.a, outro.L, outro.W);
  let melhor = null;
  for (const [ax, ay, ar] of A) for (const [bx, by, br] of B) {
    const dx = ax - bx, dy = ay - by, d = Math.hypot(dx, dy), pen = ar + br - d;
    if (pen > 0 && (!melhor || pen > melhor.pen)) melhor = { pen, nx: d > 1e-6 ? dx / d : Math.cos(eu.a + Math.PI / 2), ny: d > 1e-6 ? dy / d : Math.sin(eu.a + Math.PI / 2) };
  }
  if (!melhor) return 0;
  const { pen, nx, ny } = melhor, ma = eu.massa || 1, mb = outro.massa || 1;
  // sai de dentro: cada lado resolve a sua parte da penetração (a do mais leve é maior)
  const parte = mb / (ma + mb) * 1.05;
  eu.x += nx * pen * parte; eu.y += ny * pen * parte;
  const ovx = Math.cos(outro.a) * (outro.v || 0), ovy = Math.sin(outro.a) * (outro.v || 0);
  const vn = (eu.vx - ovx) * nx + (eu.vy - ovy) * ny; // negativo = se aproximando
  if (vn >= 0) return 0;
  const j = -(1 + ELASTICIDADE) * vn / (1 / ma + 1 / mb);
  eu.vx += (j / ma) * nx; eu.vy += (j / ma) * ny;
  return -vn;
}
