// Jeddah (Jeddah Corniche Circuit, Arábia Saudita): configuração do GP no kit. O que só ele tem (o Mar Vermelho, a corniche, a Fonte
// do Rei Fahd, a Mesquita Al-Rahma, o prédio dos boxes escalonado, a Jeddah Tower e a cidade) fica em ../jeddah.js e ../kit/jeddah/.
// O traçado veio de bacinger/f1-circuits (sa-2021, licença MIT). As frações (0 a 1) são da volta, a partir da linha de chegada:
// reta dos boxes 0,90-0,064 (a chegada, o prédio dos boxes a oeste e a arquibancada principal a leste) · T1 e T2 (esquerda e direita)
// 0,064-0,083 · T4 a T7, a serpente 0,147-0,225 · T10 0,238-0,266 · reta do norte 0,27-0,364 · T13, o retão de 196 graus à beira do mar
// 0,364-0,405 · reta de volta 0,405-0,47 · curvas 0,47-0,51 · reta da corniche 0,51-0,68 · T22 a T24 0,677-0,725 · reta da lagoa 0,73-0,88 ·
// grampo final (T27) 0,883-0,90.
import "../kit/jeddah/marcas.js";
import { PISTAS } from "../estado.js";
import { cenarioJeddah, depoisJeddah } from "../jeddah.js";

const BOXES = PISTAS.jeddah.boxes; // o corredor dos boxes (pistas.js): as linhas SC 1 e SC 2 são a entrada e a saída dele
const VERDE = "#0a7f45", BRANCO = "#f4f4f4";
// a torcida de túnicas brancas e lenços vermelhos e brancos
const TORCIDA = ["#ffffff", "#f4f1e6", "#e8e4d8", "#ffffff", VERDE, "#c8102e", "#1b1b1b"];

export const GP_JEDDAH = {
  asfalto: true,
  chao: {
    margem: { cor: "#4d4f54" }, // a faixa de asfalto escuro junto das zebras
    zebra: { cores: ["#d62828", BRANCO], dentro: 360, fora: 230 },
    amarelas: [[0.147, 0.153], [0.206, 0.226], [0.258, 0.268], [0.482, 0.505], [0.678, 0.69], [0.716, 0.727]], // zebra alta anticorte
    sc: [[BOXES.sai, "SC 2"], [BOXES.entra, "SC 1"]],
    grid: true, remendos: 30,
  },
  guardrail: { paineis: ["stc", "aramco", null, "pirelli", "saudigp", null, "rolex", "dhl"], cores: [VERDE, BRANCO] },
  arquibancadas: {
    trechos: [
      { de: 0.925, ate: 1.045, lado: 1, degraus: 14, cor: VERDE, encosto: BRANCO, cobertura: true, torcida: TORCIDA },   // a arquibancada principal, em frente aos boxes
      { de: 0.052, ate: 0.095, lado: 1, degraus: 10, cor: "#4f008c", encosto: BRANCO, cobertura: true, torcida: TORCIDA }, // o "estádio" do T1 ao T3
      { de: 0.052, ate: 0.095, lado: -1, degraus: 9, cor: VERDE, encosto: BRANCO, cobertura: true, torcida: TORCIDA },
      { de: 0.368, ate: 0.405, lado: 1, degraus: 10, cor: VERDE, encosto: BRANCO, cobertura: true, torcida: TORCIDA },    // por fora do T13
      { de: 0.236, ate: 0.268, lado: 1, degraus: 8, cor: "#e8e2d2", encosto: VERDE, cobertura: false, torcida: TORCIDA },
      { de: 0.88, ate: 0.9, lado: 1, degraus: 8, cor: "#4f008c", encosto: BRANCO, cobertura: true, torcida: TORCIDA },     // o grampo final
    ],
  },
  cenario: (tr, ctx) => cenarioJeddah(tr, ctx),
  ambiente: {
    marcas: ["stc", "aramco", "saudigp", "pirelli", "rolex", "saudia", "dhl", "roshn", "aws", "lenovo", "msc", "visitsaudi", "redsea", "f1"],
    outdoors: ["stc", "aramco", "saudigp", "saudia", "roshn", "pirelli", "rolex", "visitsaudi"],
    posto: "saudigp", bandeira: [0x006c35, 0xf4f4f4], placas: [150, 100, 50],
  },
  passarelas: { candidatos: [0.04, 0.3, 0.55, 0.75, 0.96], marcas: ["stc", "saudigp", "aramco"], max: 3 },
  postes: { passo: 44 },
  montanha: { angulo: 0, afastamento: 5200, altura: 420, largura: 6000, rocha: "#b49a78", mato: "#c7b28f", longe: "#e2d1b6" }, // a serra do Hejaz, a leste
  beira: {}, // as palmeiras e os prédios são do cenário próprio
  horizonte: false,
  depois: (tr, ctx) => depoisJeddah(tr, ctx),
  vida: {
    gaivotas: (tr) => Array.from({ length: 16 }, (_, k) => { const z = 800 + k * 420; return { x: tr.marJeddah.xCosta(z) - 120 - (k % 4) * 90, z, raio: 130 }; }),
    som: { porto: (tr, x, y) => { const m = tr.marJeddah; return m ? Math.max(0, Math.min(1, 1 - Math.max(0, x - m.xCosta(y)) / 650)) : 0; }, cidade: 0.25, campo: () => 0.2 },
  },
};
