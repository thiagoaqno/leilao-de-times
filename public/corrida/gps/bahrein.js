// Bahrein (Bahrain International Circuit - Sakhir):
// O que o GP usa do kit e o que só ele tem, em ../bahrein.js (Torre Al Sakhir, postes de iluminação noturna, oásis de palmeiras, boxes e pórtico).
// As frações (0 a 1) são da volta, a partir da chegada:
// Reta Principal 0,92-1,0 / 0-0,08 · Curva Michael Schumacher (1) 0,09-0,12 · Curvas 2 e 3 0,12-0,15 ·
// Reta para Curva 4 0,15-0,24 · Curva 4 0,24-0,27 · S rápidos do miolo (5, 6, 7) 0,28-0,35 ·
// Grampo da Curva 8 0,38-0,41 · Curvas 9 e 10 cegas 0,46-0,50 · Reta de trás do Oásis 0,50-0,60 ·
// Curva 11 0,60-0,64 · Curvas 12 e 13 subindo 0,66-0,74 · Reta para a Curva 14 0,75-0,86 ·
// Curvas 14 e 15 finais 0,87-0,92.
import { cenarioBahrein, depoisBahrein } from "../bahrein.js";

export const GP_BAHREIN = {
  asfalto: true,
  chao: {
    margem: { cor: "#9a8a6a" }, // faixa de asfalto cinza-areia de escape junto da zebra
    zebra: { cores: ["#d62828", "#f4f4f4"], dentro: 380, fora: 240 },
    amarelas: [
      [0.098, 0.122], // Curvas 1-2 Schumacher
      [0.245, 0.265], // Curva 4
      [0.380, 0.405], // Grampo 8
      [0.465, 0.490], // Curva 10
      [0.875, 0.910], // Curvas 14-15
    ],
    sc: [[0.94, "SC 1"], [0.52, "SC 2"]],
    grid: true,
    remendos: 22,
  },
  // Áreas de escape de Sakhir: asfalto listrado vermelho e branco característico nas saídas de curva,
  // brita cor de areia do deserto (#d8c49a) e muros de pneus
  escape: {
    cores: ["#ce1126", "#ffffff"],
    corBrita: "#d8c49a",
    largura: 28,
    listrado: [
      [0.088, 0.145, "fora"], // Saída da Curva 1-2
      [0.235, 0.275, "fora"], // Curva 4
      [0.375, 0.415, "fora"], // Grampo 8
      [0.455, 0.505, "fora"], // Curva 10
      [0.865, 0.925, "fora"], // Curvas finais 14-15
    ],
    brita: [
      [0.095, 0.140, "fora"],
      [0.240, 0.275, "fora"],
      [0.290, 0.350, "fora"],
      [0.380, 0.410, "fora"],
      [0.460, 0.500, "fora"],
      [0.595, 0.635, "fora"],
      [0.690, 0.745, "fora"],
      [0.870, 0.920, "fora"],
    ],
    pneus: [
      [0.088, 0.145, "fora"],
      [0.235, 0.275, "fora"],
      [0.290, 0.350, "fora"],
      [0.375, 0.415, "fora"],
      [0.455, 0.505, "fora"],
      [0.595, 0.635, "fora"],
      [0.690, 0.745, "fora"],
      [0.865, 0.925, "fora"],
    ],
  },
  // Arquibancadas oficiais de Sakhir
  arquibancadas: {
    trechos: [
      { de: 0.935, ate: 1.055, lado: -1, degraus: 14, cor: "#ce1126", encosto: "#f4f4f4", cobertura: true, torcida: ["#ffffff", "#ce1126", "#ffffff", "#222222"] }, // Main Grandstand
      { de: 0.085, ate: 0.125, lado: -1, degraus: 12, cor: "#ce1126", encosto: "#f4f4f4", cobertura: true }, // Turn 1 Schumacher
      { de: 0.390, ate: 0.445, lado: -1, degraus: 10, cor: "#e03a3e", encosto: "#ffffff", cobertura: true }, // Batelco Grandstand
      { de: 0.815, ate: 0.865, lado: -1, degraus: 10, cor: "#ce1126", encosto: "#f4f4f4", cobertura: true }, // Victory Grandstand
    ],
  },
  cenario: (tr, ctx) => cenarioBahrein(tr, ctx),
  ambiente: {
    marcas: ["gulfair", "bahrain", "aramco", "rolex", "pirelli", "dhl", "heineken", "aws", "lenovo", "msc", "qatar"],
    outdoors: ["gulfair", "bahrain", "aramco", "rolex", "pirelli", "dhl", "qatar", "aws"],
    posto: "gulfair",
    bandeira: [0xce1126, 0xffffff], // Bandeira oficial do Bahrein
    placas: [150, 100, 50],
  },
  passarelas: {
    candidatos: [0.035, 0.215, 0.550, 0.835],
    marcas: ["gulfair", "bahrain", "aramco"],
    max: 2,
  },
  montanha: {
    angulo: Math.PI / 3,
    afastamento: 4600,
    altura: 340,
    largura: 5200,
    rocha: "#ba9d73",
    mato: "#cbb48b",
    longe: "#e5cfb1",
  },
  beira: {
    palmeiras: 0.05,
    longe: { palmeiras: 0.02 },
  },
  vida: {
    som: {
      campo: () => 0.8,
      cidade: 0.1,
    },
    helicoptero: true,
    gaivotas: false,
    fiscais: true,
  },
  depois: (tr, ctx) => depoisBahrein(tr, ctx),
};
