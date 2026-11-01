// Corrida da Galera — o cenário de Baku, montado em cima de dados reais (kit/baku/): o relevo SRTM (a orla do Cáspio a -27 m e a subida da Cidade
// Velha), a costa e as plantas e as alturas de ~2 mil prédios do OpenStreetMap (arenito do Baku Oil Boom, torres de vidro), a muralha e a Torre da
// Donzela, o Palácio do Governo, as três Flame Towers com a fachada de LED, o Bulevar com as árvores e os postes de globos, e as barreiras de
// concreto com a cerca de tela só onde a pista real as tem (`muros` de pistas.js: o mesmo mapa da física). Os dados vêm de kit/baku/dados.js
// (ferramentas/baku-dados.js os gera). O traçado é a linha central real do circuito.
import { D, fundoBaku } from "./kit/baku/mundo.js";
import { lerPredios, indiceDePredios, predios } from "./kit/baku/predios.js";
import { flameTowers, torreDaDonzela, muralha, palacioDoGoverno, torreTV } from "./kit/baku/marcos.js";
import { barreirasBaku } from "./kit/baku/barreiras.js";
import { mar, arvores, postesDeLuz } from "./kit/baku/terra.js";
import { porticos, retaDosBoxes } from "./kit/baku/reta.js";

// o ponto está entre a pista e a face da barreira (mais uma folga): a área de escape e a rua, onde não entra gente nem enfeite
function dentroDaBarreira(tr, x, y) {
  const i = tr.indiceAt(x, y), p = tr.pts[i], l = (x - p.x) * p.nx + (y - p.y) * p.ny, r = tr.murosEscape?.[l >= 0 ? 1 : -1]?.[i] || 0;
  return r > 0 && Math.abs(l) < tr.W / 2 + r + 16;
}

export function cenarioBaku(tr, ctx, cfg) {
  const { add, hAt } = ctx, reservado = (tr.reservado ||= []);
  const lista = lerPredios(tr);
  if (!lista.some((b) => b.esp === 5)) { // o ponto do Palácio do Governo cai no pátio da planta em H: o maior prédio num raio de 150 é ele
    const g = D.marcos.governo; let melhor = null;
    for (const b of lista) { const d = Math.hypot(b.cx - g[0], b.cz - g[1]); if (d < 150 && !b.esp && (!melhor || b.caixa[2] - b.caixa[0] + b.caixa[3] - b.caixa[1] > melhor.caixa[2] - melhor.caixa[0] + melhor.caixa[3] - melhor.caixa[1])) melhor = b; }
    if (melhor) melhor.esp = 5;
  }
  const predioEm = indiceDePredios(lista); tr.predioEmBaku = predioEm;
  // onde os enfeites de vida.js e do kit não entram: na água, dentro de um prédio, no que já foi montado e junto da barreira
  tr.ocupado = (x, y) => fundoBaku(tr, x, y) > -10 || predioEm(x, y, 3) || reservado.some(([cx, cy, rr]) => (x - cx) ** 2 + (y - cy) ** 2 < rr * rr) || tr.distAt(x, y) < tr.W / 2 + 14 || dentroDaBarreira(tr, x, y);
  mar(tr, ctx);
  predios(tr, add, lista);
  flameTowers(tr, add, hAt);
  torreDaDonzela(tr, add, hAt);
  muralha(tr, add, hAt, predioEm, cfg.muralha);
  palacioDoGoverno(tr, add, hAt, lista);
  torreTV(tr, add, hAt);
  arvores(tr, add, { hAt, predioEm });
  postesDeLuz(tr, add, { hAt, predioEm });
  barreirasBaku(tr, add, cfg.barreiras);
  porticos(tr, add, cfg.porticos);
  retaDosBoxes(tr, add, { lado: tr.t.boxes.lado, marcas: cfg.marcasBoxes });
  tr.marcosPos = D.marcos; // (para conferir no navegador: __corrida.race.tr.marcosPos)
}
