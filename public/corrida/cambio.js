// Corrida da Galera — o câmbio de 8 marchas da F1 (as contas estão em dinamica.js, as mesmas do servidor). Cada marcha vai
// até o corte (12 mil rpm) numa fração da velocidade da 8ª, que chega ao corte um pouco acima da velocidade final do carro;
// a rotação é a fração do corte (1 = 12 mil rpm). No automático, a troca para cima é perto do corte e a para baixo quando
// a rotação cai demais, e a troca leva uns 50 ms sem força. No manual (opção da sala, para todos os humanos; os robôs são
// sempre automáticos), Shift sobe e Ctrl direito desce: marcha alta demais deixa o carro sem força, e no corte ele não
// passa do topo da marcha.
const D = globalThis.Dinamica || window.Dinamica;
export const NUM = D.NUM;
export const MARCHAS = D.FRACAO;
// a velocidade (u/s) em que a marcha g chega ao corte, para um carro de velocidade final `vmax` (u/s)
export const topo = (g, vmax) => D.vCorte(vmax, g) / D.ESC;
// a rotação em fração do corte a `v` u/s
export const rotacao = (v, vmax, g) => D.rotacao(v, vmax, g);
// a força do motor pela rotação (0 a 1, em fração da potência de pico): fraco embaixo, cheio de 9 a 11 mil rpm, nada no corte
export const torque = (rpm) => D.potencia(rpm);
export const marchaAuto = (v, vmax, g) => D.marchaAuto(v, vmax, g);
export const rpmReal = (v, vmax, g) => D.rpmDe(v, vmax, g);
