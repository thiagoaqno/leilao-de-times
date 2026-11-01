// Corrida da Galera — o cenário de Singapura (Marina Bay Street Circuit), montado em cima de dados reais (kit/singapura/): os prédios do
// OpenStreetMap (planta e altura, com as janelas acesas de noite), a baía de Marina Bay e o rio Singapura, o Marina Bay Sands com o SkyPark, o
// Singapore Flyer (que gira, dentro da pista), o Esplanade das duas cúpulas, o Fullerton, a ponte Anderson, o Merlion, o Padang com a City Hall
// e a Old Supreme Court, o Pit Building, as arquibancadas, as barreiras só onde a pista real tem, a iluminação do GP e as árvores. O GP é à noite
// (a hora padrão da sala de Singapura é "noite"); de dia o céu é o tropical, claro e úmido.
import { barreiras } from "./kit/singapura/barreiras.js";
import { iluminacao } from "./kit/singapura/luz.js";
import { agua, paredoes } from "./kit/singapura/agua.js";
import { lerPredios, indiceDePredios, predios } from "./kit/singapura/predios.js";
import { naAgua } from "./kit/singapura/mundo.js";
import { marcos, pontes } from "./kit/singapura/marcos.js";
import { pitBuilding } from "./kit/singapura/boxes.js";
import { vegetacao } from "./kit/singapura/vegetacao.js";
import { ligarNoite } from "./kit/bahrein/base.js";

// ---------- monta tudo (chamado por pista.js, dentro do grupo da pista) ----------
export function cenarioSingapura(tr, ctx) {
  const { add, hAt } = ctx, reservado = (tr.reservado ||= []);
  tr.arquibancadas = [];
  const L = tr.W / 2;
  pitBuilding(tr, add); // o Pit Building primeiro: reserva o terreno dele antes dos prédios e das árvores
  const lista = lerPredios(tr), predioEm = indiceDePredios(lista);
  tr.predioEmSG = predioEm;
  // onde os enfeites de vida.js e do kit não entram: na água, dentro de um prédio, no que já foi montado e grudados na barreira
  tr.ocupadoSG = (x, z) => naAgua(x, z, -8) || !!predioEm(x, z, 4);
  tr.ocupado = (x, y) => tr.ocupadoSG(x, y) || reservado.some(([cx, cy, rr]) => (x - cx) ** 2 + (y - cy) ** 2 < rr * rr) || tr.distAt(x, y) < L + 16;
  agua(tr, add);
  paredoes(tr, add);
  predios(tr, add, lista);
  // os prédios com marco próprio que a planta resolve (Fullerton, City Hall e Old Supreme Court, o clube de críquete, a base do Esplanade, o terminal do Flyer): extrudados com a cor certa
  const COR = { 5: 5, 8: 4, 9: 3, 10: 5, 14: 3, 4: 7 };
  for (const b of lista) if (COR[b.esp] != null) b.cor = COR[b.esp];
  predios(tr, add, lista, { ignorar: (b) => !(b.esp in COR) });
  marcos(tr, add);
  pontes(tr, add);
  barreiras(tr, add, window.Pistas.PISTAS[tr.id].barreiras || {});
  void hAt;
}

export function depoisSingapura(tr, ctx) {
  vegetacao(tr, ctx.add); // as árvores tropicais
  iluminacao(tr, ctx.add); // os refletores do GP
  ligarNoite(tr); // DEPOIS de vidaGP (que define tr.animarPista)
}
