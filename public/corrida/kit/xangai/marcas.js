// Xangai — os letreiros do circuito. Sem marcas registradas novas: são nomes de lugar (o circuito, os distritos, o rio Huangpu, o Bund, o Jardim
// Yu) e de comida de Xangai (xiaolongbao, shengjian, hongshao rou, jiaozi), desenhados no canvas como o resto de `kit/marcas.js` (que é quem
// desenha). Os nomes começam com `xg` para não brigar com as marcas das outras pistas.
import { MARCAS } from "../marcas.js";

export function registrarMarcasXangai() {
  Object.assign(MARCAS, {
    xgcircuito: { fundo: "#c8102e", cor: "#ffd34a", texto: "SHANGHAI CIRCUIT", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#ffd34a" },
    xggp: { fundo: "#ffffff", cor: "#c8102e", texto: "CHINA GRAND PRIX", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif", moldura: "#c8102e" },
    xgjiading: { fundo: "#1d3b5c", cor: "#ffffff", texto: "JIADING", fonte: "900 {s}px Arial, sans-serif", moldura: "#ffd34a" },
    xgpudong: { fundo: "#0e2a47", cor: "#8fd3ff", texto: "PUDONG", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif" },
    xgwaitan: { fundo: "#f4efe2", cor: "#7a1f1f", texto: "WAITAN · THE BUND", fonte: "700 {s}px Georgia, serif", moldura: "#7a1f1f" },
    xghuangpu: { fundo: "#2d7a80", cor: "#ffffff", texto: "HUANGPU RIVER", fonte: "900 {s}px Arial, sans-serif", moldura: "#ffffff" },
    xgyuyuan: { fundo: "#3f6b4a", cor: "#f4efe2", texto: "YU GARDEN", fonte: "700 {s}px Georgia, serif", moldura: "#f4efe2" },
    xglotus: { fundo: "#f6d6dd", cor: "#a1294d", texto: "LIANHUA · LOTUS", fonte: "700 {s}px Georgia, serif", moldura: "#a1294d" },
    xgxlb: { fundo: "#ffffff", cor: "#d1301f", texto: "XIAOLONGBAO", fonte: "900 {s}px Arial, sans-serif", moldura: "#d1301f" },
    xgsjb: { fundo: "#f2c230", cor: "#7a1f1f", texto: "SHENGJIANBAO", fonte: "900 {s}px Arial, sans-serif", moldura: "#7a1f1f" },
    xghsr: { fundo: "#7a1f1f", cor: "#ffe9b0", texto: "HONGSHAO ROU", fonte: "700 {s}px Georgia, serif", moldura: "#ffe9b0" },
    xgjiaozi: { fundo: "#e9f2ea", cor: "#2c6a3e", texto: "JIAOZI", fonte: "900 {s}px Arial, sans-serif", moldura: "#2c6a3e" },
    xgcha: { fundo: "#2c6a3e", cor: "#ffffff", texto: "LONGJING CHA", fonte: "700 {s}px Georgia, serif" },
    xgchina: { fundo: "#c8102e", cor: "#ffffff", texto: "ZHONGGUO · CHINA", fonte: "900 {s}px Arial, sans-serif", moldura: "#ffd34a" },
  });
}
