// Os carros importados e a garagem: onde ficam as lanternas e os faróis de cada modelo, a peça que leva a pintura, e as
// cores que dá para escolher na garagem (guardadas no navegador, por carro, em `drag:garagem`).
//
// As posições são do carro já encaixado como main.js encaixa (importedCar: a frente para +z, o carro centrado e o
// chão em y = 0, cabendo em 2,1 x 2,0 x 4,6 m). Conferidas de frente e de trás em cada modelo; ao trocar um GLB,
// confira de novo. `tras`: uma lanterna por ponto (o R33, o R34 e a Supra têm duas redondas de cada lado). `banco`: o
// olho de quem dirige, para a câmera interna (conferido olhando de dentro: o volante bem na frente). O motorista fica
// à esquerda (x positivo), menos no R33 e no R34, que são de mão inglesa. `motor`: o som (main.js, EngineAudio):
// cilindros, giro no corte, turbo (assobio e a válvula na troca) e aspereza (o quanto o ronco rasga).
const par = (x, y, z) => [[-x, y, z], [x, y, z]];
export const MODELOS = {
  supra: { pintura: /Paint_Material/, tras: [...par(0.36, 0.86, -2.28), ...par(0.52, 0.86, -2.28)], frente: par(0.47, 0.62, 2.12), banco: [0.37, 1.0, -0.42], motor: { cil: 6, giro: 7200, turbo: true, aspereza: 0.45 } },
  "skyline-r33": { giro: Math.PI, pintura: /^body$/, tras: [...par(0.41, 0.78, -2.2), ...par(0.55, 0.78, -2.2)], frente: par(0.5, 0.5, 2.12), banco: [-0.37, 0.97, -0.4], motor: { cil: 6, giro: 8000, turbo: true, aspereza: 0.55 } },
  "skyline-r34": { pintura: /PaintTNR/, tras: [...par(0.4, 0.83, -2.3), ...par(0.57, 0.83, -2.3)], frente: par(0.56, 0.65, 2.2), banco: [-0.37, 1.0, -0.4], motor: { cil: 6, giro: 8000, turbo: true, aspereza: 0.55 } },
  "bmw-m4": { pintura: /PaintTNR/, tras: par(0.55, 0.8, -2.25), frente: par(0.55, 0.64, 2.15), banco: [0.37, 0.98, -0.35], motor: { cil: 6, giro: 7200, turbo: true, aspereza: 0.6 } },
  "porsche-911": { pintura: /^paint$/, tras: par(0.55, 0.55, -1.64), frente: par(0.48, 0.54, 1.55), banco: [0.33, 0.86, -0.1], motor: { cil: 6, giro: 7500, turbo: true, aspereza: 0.85 } },
  "porsche-718": { pintura: /Paint_Material/, tras: par(0.56, 0.78, -2.25), frente: par(0.6, 0.72, 2.1), banco: [0.37, 0.95, -0.42], motor: { cil: 6, giro: 8000, turbo: false, aspereza: 0.85 } },
  "ferrari-sf90": { pintura: /^PLASTIC_INT_4$/, tras: par(0.64, 0.7, -2.16), frente: par(0.57, 0.56, 2.05), banco: [0.36, 0.82, -0.25], motor: { cil: 8, giro: 8000, turbo: true, aspereza: 0.7 } },
  gallardo: { pintura: /Gallardo_Base/, tras: par(0.5, 0.73, -2.05), frente: par(0.64, 0.6, 1.85), banco: [0.37, 0.9, -0.3], motor: { cil: 10, giro: 8500, turbo: false, aspereza: 0.75 } },
  "vw-phideon": { pintura: /^carpaint$/, tras: par(0.55, 0.78, -2.22), frente: par(0.6, 0.58, 2.15), banco: [0.38, 1.1, 0.05], motor: { cil: 4, giro: 6500, turbo: true, aspereza: 0.3 } },
  "vw-polo": { pintura: /^carpaint_C1$/, tras: par(0.65, 0.9, -2.0), frente: par(0.62, 0.66, 1.95), banco: [0.38, 1.25, -0.2], motor: { cil: 4, giro: 6200, turbo: true, aspereza: 0.3 } },
  "vw-tcross": { pintura: /^carpaint$/, tras: par(0.6, 0.95, -2.1), frente: par(0.58, 0.78, 2.1), banco: [0.38, 1.32, -0.2], motor: { cil: 4, giro: 6200, turbo: true, aspereza: 0.25 } },
};

// As escolhas da garagem. `null` na pintura = a cor de fábrica; `null` no neon = sem neon.
export const PINTURAS = [
  { nome: "De fábrica", cor: null }, { nome: "Preto fosco", cor: "#141518" }, { nome: "Branco pérola", cor: "#e9ebee" },
  { nome: "Prata", cor: "#9aa1a8" }, { nome: "Vermelho doce", cor: "#b3121f" }, { nome: "Laranja", cor: "#e2570f" },
  { nome: "Amarelo", cor: "#f2c014" }, { nome: "Verde-limão", cor: "#6fd11c" }, { nome: "Azul-noite", cor: "#1b2f8c" },
  { nome: "Ciano", cor: "#12a6c4" }, { nome: "Roxo meia-noite", cor: "#3a1466" }, { nome: "Rosa", cor: "#d0247a" },
];
export const NEONS = [
  { nome: "Sem neon", cor: null }, { nome: "Azul", cor: "#2f7bff" }, { nome: "Ciano", cor: "#00e5ff" }, { nome: "Rosa", cor: "#ff2bd6" },
  { nome: "Roxo", cor: "#8a3cff" }, { nome: "Verde", cor: "#2bff88" }, { nome: "Vermelho", cor: "#ff2a3a" }, { nome: "Âmbar", cor: "#ffb21c" },
];
export const FAROIS = [
  { nome: "Xenon", cor: "#eef4ff" }, { nome: "Halógeno", cor: "#ffe2a8" }, { nome: "Azulado", cor: "#a8c8ff" }, { nome: "Amarelo", cor: "#ffd23a" },
];
export const CHAMAS = [
  { nome: "Azul", cor: "#3aa0ff" }, { nome: "Roxa", cor: "#a24dff" }, { nome: "Verde", cor: "#3dff9a" }, { nome: "Laranja", cor: "#ff7a1a" }, { nome: "Rosa", cor: "#ff3fb4" },
];

const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;
// O visual de um carro: o que foi escolhido na garagem, ou o de fábrica (o neon de fábrica é o do carro em logic.mjs).
export function visualDe(id, neonDeFabrica) {
  let salvo = {};
  try { salvo = JSON.parse(localStorage.getItem("drag:garagem") || "{}")[id] || {}; } catch {}
  return { pintura: null, neon: hex(neonDeFabrica), farol: FAROIS[0].cor, chama: CHAMAS[0].cor, ...salvo };
}
export function salvarVisual(id, visual) {
  try {
    const tudo = JSON.parse(localStorage.getItem("drag:garagem") || "{}");
    tudo[id] = visual; localStorage.setItem("drag:garagem", JSON.stringify(tudo));
  } catch {}
}
