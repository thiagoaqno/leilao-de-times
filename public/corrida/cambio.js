// Corrida da Galera — o câmbio de 8 marchas do F1. Cada marcha vai até uma fração da velocidade final do carro; a
// rotação é a velocidade dividida pelo topo da marcha (1 = corte de giro). No automático, a troca para cima é no corte
// e a para baixo quando a rotação cai demais. No manual (opção da sala, para todos os humanos; os robôs são sempre
// automáticos), Shift sobe e Ctrl direito desce: marcha alta demais deixa o carro sem força, e no corte ele não passa
// do topo da marcha.
export const MARCHAS = [0.25, 0.37, 0.48, 0.58, 0.67, 0.76, 0.87, 1.0];
export const topo = (g, vmax) => MARCHAS[Math.max(0, Math.min(7, g - 1))] * vmax;
export const rotacao = (v, vmax, g) => Math.max(0, v) / topo(g, vmax);
// força do motor pela rotação: fraco embaixo (marcha alta demais), cheio no meio, nada no corte
export function torque(rpm) {
  if (rpm >= 1) return 0;
  if (rpm < 0.35) return 0.35 + rpm * 1.4;
  return rpm > 0.9 ? 1.05 : 0.84 + rpm * 0.2;
}
// troca automática: sobe no corte, desce quando a rotação fica baixa (com folga, para não ficar trocando)
export function marchaAuto(v, vmax, g) {
  let m = Math.max(1, Math.min(8, g || 1));
  while (m < 8 && rotacao(v, vmax, m) >= 0.985) m++;
  while (m > 1 && rotacao(v, vmax, m - 1) < 0.78) m--;
  return m;
}
