// Spa-Francorchamps: dois paddocks, La Source, Eau Rouge/Raidillon, Pouhon e a floresta das Ardenas.
// Frações desde a chegada: La Source .04-.07, Eau Rouge/Raidillon .10-.16, Les Combes .31-.35,
// Bruxelles .41, Pouhon .50-.53, Fagnes .60, Stavelot .68, Blanchimont .84, chicane final .94.
import { gpSimples } from "../kit/gp-simples.js";
import { cenarioSpa, depoisSpa } from "../spa.js";

const base = gpSimples("spa", { bandeira: [0x000000, 0xfdda24, 0xef3340],
  marcas: ["pirelli", "rolex", "aramco", "dhl", "heineken", "f1", "aws", "lenovo", "msc"],
  horizonte: { cor: 0x4f6e46 } });
const torcida = ["#d52931", "#f6d634", "#1b2430", "#ffffff", "#ff8b25", "#3875b8"];
const tribuna = (de, ate, lado, cor, cobertura = false) => ({ de, ate, lado, degraus: 8, cor, encosto: "#e8e8e5", cobertura, torcida });

export const GP_SPA = {
  ...base,
  chao: { ...base.chao, margem: { cor: "#667077" }, zebra: { cores: ["#d62828", "#f2f2ef"], dentro: 350, fora: 230 },
    amarelas: [[0.101, 0.165], [0.31, 0.35], [0.93, 0.96]], remendos: 26 },
  escape: { brita: [[0.042, 0.075, "fora"], [0.115, 0.161, "fora"], [0.31, 0.36, "fora"],
    [0.49, 0.535, "fora"], [0.595, 0.635, "fora"], [0.925, 0.962, "fora"]],
    listrado: [[0.105, 0.16, "fora"], [0.935, 0.96, 0]], cores: ["#d6262f", "#e7ca34"],
    corBrita: "#b7b6aa", largura: 31,
    pneus: [[0.042, 0.072, "fora"], [0.31, 0.35, "fora"], [0.49, 0.53, "fora"]] },
  arquibancadas: { trechos: [
    tribuna(0.005, 0.04, -1, "#c6222a", true), // largada
    tribuna(0.045, 0.075, -1, "#d2aa2d", true), // La Source
    tribuna(0.105, 0.14, -1, "#c2252b", true), // Eau Rouge
    tribuna(0.145, 0.17, 1, "#d1bb31", true), // Raidillon alto
    tribuna(0.309, 0.346, -1, "#284f78"), // Les Combes
    tribuna(0.49, 0.532, -1, "#b42d2c", true), // Pouhon
    tribuna(0.595, 0.63, 1, "#2d5c82"), // Fagnes
    tribuna(0.93, 0.96, -1, "#d2b53a"), // Bus Stop
  ] },
  cenario: cenarioSpa, depois: depoisSpa,
  ambiente: { ...base.ambiente, placas: [150, 100, 50], outdoors: ["pirelli", "rolex", "heineken", "dhl"] },
  passarelas: { candidatos: [0.018, 0.22, 0.31, 0.71, 0.87], marcas: ["pirelli", "rolex", "heineken"], max: 3 },
  parque: { recuo: 47, fundo: 210, alturas: [170, 310], densidade: 1.2, coniferas: 0.55,
    folhas: ["#20542c", "#285f30", "#316c35", "#3a7038", "#1c4d29", "#507848"] },
  vida: { helicoptero: true, fiscais: true, gaivotas: [], som: { campo: () => 1, cidade: 0.04 } },
};
