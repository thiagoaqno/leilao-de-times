// Kit de pista — o GP simples: a configuração inteira de um GP com as peças de sempre do kit, para as pistas do calendário
// de F1 convertidas de bacinger/f1-circuits (ferramentas/circuitos-f1.js) enquanto não ganham o cenário fino de cada uma.
// Autódromo: asfalto de GP, zebras nas curvas, margem de asfalto, brita do lado de fora das curvas fechadas, grid, o
// prédio dos boxes do lado do corredor, a tribuna na reta do outro lado, painéis, bandeira, passarela e som de campo.
// Rua (`rua: true`, com `walls` na pista): sarjeta, faixas, guard-rail com os painéis, postes e som de cidade.
//
// gpSimples(id, { rua, bandeira, marcas, posto, zebra, margem, escape, arquibancadas, tribuna, boxes, montanha, parque,
//                 beira, fachadas, horizonte, som, gaivotas, amarelas, cenario })
// `arquibancadas`: trechos a mais (os do kit/arquibancadas.js), além da tribuna da reta (`tribuna: false` tira).
// `beira`: o que nasce na beira e longe da pista (pista.js): { arvores, palmeiras, predios, vidro, cores, longe: {...} }.
// `horizonte`: false tira os morros de longe de pista.js (deserto, mar, planície); { cor } muda a cor deles.
import { PISTAS } from "../estado.js";
import { prediosDosBoxes } from "./boxes.js";

export function gpSimples(id, o = {}) {
  const t = PISTAS[id], bx = t.boxes || { entra: 0.98, sai: 0.02, lado: 1 }, rua = !!o.rua;
  const marcas = o.marcas || ["f1", "pirelli", "rolex", "aramco", "dhl", "heineken", "aws", "lenovo"];
  const tribuna = o.tribuna === false ? [] : [{ de: 0.006, ate: 0.075, lado: -bx.lado, degraus: 7, cor: o.corTribuna || "#1f5fbf", encosto: "#f4f4f4" }];
  const cfg = {
    asfalto: true,
    chao: rua
      ? { margem: "sarjeta", amarelas: o.amarelas, faixasPedestre: [0.2, 0.45, 0.7], tracejado: [[0.3, 0.4]], sc: [[bx.sai, "SC 2"], [bx.entra, "SC 1"]], grid: true, remendos: 36, bueiros: 30 }
      : { margem: { cor: o.margem || "#6d6e72" }, zebra: { cores: o.zebra || ["#d62828", "#f4f4f4"], dentro: 340, fora: 220 }, amarelas: o.amarelas, sc: [[bx.sai, "SC 2"], [bx.entra, "SC 1"]], grid: true, remendos: 26 },
    arquibancadas: { trechos: [...tribuna, ...(o.arquibancadas || [])] },
    cenario: (tr, ctx) => {
      if (!rua || o.boxes) prediosDosBoxes(tr, ctx.add, { de: 0.984, ate: 1.062, lado: bx.lado, recuo: 62, torre: !rua, paineis: marcas.slice(0, 4), cores: o.boxes?.cores || {} });
      o.cenario?.(tr, ctx);
    },
    ambiente: { bandeira: o.bandeira, marcas, outdoors: marcas, posto: o.posto || marcas[0] },
    passarelas: { candidatos: [0.965, 0.5, 0.27, 0.73], marcas: marcas.slice(0, 3), max: 2 },
    vida: { gaivotas: o.gaivotas || [], som: o.som || (rua ? { cidade: () => 1 } : { campo: () => 1, cidade: 0.08 }) },
    beira: o.beira || (rua ? { arvores: 0.08, predios: 0.55, longe: { predios: 0.6, arvores: 0.15 } } : { arvores: 0.1, longe: { arvores: 0.12 } }),
    horizonte: o.horizonte,
  };
  if (rua) { cfg.guardrail = { paineis: [marcas[0], marcas[1], null, marcas[2], marcas[3], null, marcas[4], marcas[5]] }; cfg.postes = { passo: 40 }; }
  else cfg.escape = o.escape || { britaCurvas: 420, corBrita: "#ddd3b6", largura: 26 };
  if (o.montanha) cfg.montanha = o.montanha;
  if (o.parque) cfg.parque = o.parque;
  if (o.fachadas) cfg.fachadas = o.fachadas;
  return cfg;
}
