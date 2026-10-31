// Corrida da Galera — o cenário de Mônaco, montado em cima de dados reais (kit/monaco/): o relevo do morro (EU-DEM e SRTM), a costa e
// os píeres do Port Hercule, as plantas e as alturas de cerca de 1600 prédios (OpenStreetMap), o túnel sob o Fairmont, o Casino, o Hôtel
// de Paris, o Hermitage, a capela de Sainte Dévote, o Palácio e a catedral no Rochedo, as arquibancadas onde há lugar, e as palmeiras
// e plátanos. Os dados vêm de kit/monaco/dados.js (ferramentas/monaco-dados.js os gera). O traçado é a linha central real do circuito.
// pista.js usa `relevoMonaco` (o chão), `corDoChaoMonaco` (a cor do terreno) e `fundoMonaco` (o mar afunda o chão).
import { sinalDaCurva } from "./kit/comum.js";
import { arquibancadas } from "./kit/arquibancadas.js";
import { D, fundoMonaco, aguaMonaco, orlaMonaco, relevoMonaco, afastarMuro, NIVEL_DO_MAR } from "./kit/monaco/mundo.js";
import { lerPredios, indiceDePredios, predios, adensarRua } from "./kit/monaco/predios.js";
import { marcosMonaco } from "./kit/monaco/marcos.js";
import { mar, porto, piscinas, atracados } from "./kit/monaco/agua.js";
import { tecpro, telaos, largada, cais, fonte, cruzeiros, muroDeArrimo } from "./kit/monaco/detalhes.js";
import { tunel } from "./kit/monaco/tunel.js";
import { paddockMonaco } from "./kit/monaco/paddock.js";
import { grampoMonaco } from "./kit/monaco/grampo.js";
import { arvores, corDoChao } from "./kit/monaco/beira.js";
import { vidaMonaco as vidaDeMonaco } from "./kit/monaco/vida.js";

export { fundoMonaco, aguaMonaco, orlaMonaco, relevoMonaco, afastarMuro, NIVEL_DO_MAR };
export const corDoChaoMonaco = corDoChao;
export const vidaMonaco = (tr, ctx) => vidaDeMonaco(tr, ctx, tr.contextoVidaMonaco); // (chamada por gps/monaco.js `depois`)

// as arquibancadas de Mônaco ficam só onde há calçada livre: cada candidato é cortado nos pedaços onde a faixa dos degraus não toca
// prédio, água, túnel nem o corredor dos boxes
function arquibancadasMonaco(tr, add, predioEm) {
  const { pts, n } = tr, L = tr.wallLat, f = D.frac, t = f.trechos, c = f.curvas;
  const lado = (i, quer) => { // quer: "agua" (o lado do porto) ou "fora" (de fora da curva)
    const p = pts[i % n];
    if (quer === "terra") return -lado(i, "agua"); // o lado oposto ao da água (as arquibancadas do Tabac ficam do lado da Piscina, e o porto fica livre)
    if (quer === "agua") { const a = fundoMonaco(tr, p.x + p.nx * (L + 60), p.y + p.ny * (L + 60)), b = fundoMonaco(tr, p.x - p.nx * (L + 60), p.y - p.ny * (L + 60)); return a > b ? 1 : -1; }
    return -sinalDaCurva(pts, n, i % n);
  };
  const candidatos = [
    // (a arquibancada da reta dos boxes ficou de fora: com a pista mais estreita ela passaria a caber, mas estoura o teto de malhas do CI)
    ["cais", t.cais[0], Math.min(t.cais[1], c.tabac - 0.025), "agua", 3], // o cais do porto, de frente para os iates
    ["sainteDevote", c.sainteDevote - 0.01, c.sainteDevote + 0.015, "fora", 4],
    ["tabac", c.tabac - 0.012, c.tabac + 0.012, "terra", 3], // do lado de dentro, o da Piscina (K): o lado da água continua livre, com o guard-rail baixo
    ["piscine", c.piscine1 - 0.01, c.piscine2 + 0.012, "agua", 3],
    ["rascasse", c.rascasse - 0.012, c.anthonyNoghes + 0.008, "fora", 4],
  ];
  const out = [];
  for (const [nome, de, ate, quer, degraus] of candidatos) {
    const i0 = Math.floor(de * n); let i1 = Math.floor(ate * n); if (i1 < i0) i1 += n; // (a reta dos boxes cruza a linha de chegada)
    if (i1 - i0 < 22) continue;
    const meio = Math.floor((i0 + i1) / 2), l = quer === "fora-da-reta" ? (tr.t.boxes?.lado ? -tr.t.boxes.lado : -1) : lado(meio, quer);
    let a = -1, melhor = null; // só o pedaço livre mais comprido de cada candidato (menos malhas)
    const livre = (i) => {
      const p = pts[((i % n) + n) % n];
      for (const d of [L + 6, L + 6 + 4.5 * degraus, L + 6 + 9 * degraus + 1]) {
        const x = p.x + p.nx * l * d, z = p.y + p.ny * l * d;
        if (predioEm(x, z, 5) || fundoMonaco(tr, x, z) > -4 || tr.coberto?.(i) || tr.noCorredor?.(x, z) || tr.distAt(x, z) < d - 3) return false;
      }
      return true;
    };
    for (let i = i0; i <= i1 + 1; i++) {
      const ok = i <= i1 && livre(i);
      if (ok && a < 0) a = i;
      if ((!ok || i === i1 + 1) && a >= 0) { if (i - 1 - a >= 22 && (!melhor || i - 1 - a > melhor.ate - melhor.de)) melhor = { de: a, ate: i - 1 }; a = -1; }
    }
    if (melhor) out.push({ de: melhor.de / n, ate: melhor.ate / n, lado: l, degraus, cor: "#1f5fbf", encosto: "#3f86e8", cobertura: degraus > 3, nome }); // (as de 3 degraus ficam abertas)
  }
  if (out.length) arquibancadas(tr, add, { trechos: out });
  tr.arquibancadasMonaco = out.map((q) => q.nome);
}

// ---------- monta tudo (chamado por pista.js, dentro do grupo da pista) ----------
export function cenarioMonaco(tr, ctx) {
  const { add, hAt } = ctx, { pts, n } = tr, L = tr.wallLat, reservado = (tr.reservado ||= []);
  tr.arquibancadas = [];
  if (Math.abs(D.projecao.mundo - tr.t.world) > 1) console.warn("Mônaco: os dados (kit/monaco/dados.js) foram gerados para outro tamanho de mundo; rode ferramentas/monaco-dados.js de novo");
  const lista = lerPredios(tr); adensarRua(tr, lista); const predioEm = indiceDePredios(lista);
  tr.predioEmMonaco = predioEm;
  // onde os enfeites de vida.js e do kit não entram: na água, dentro de um prédio, em cima do túnel, no que já foi montado e grudados no guard-rail
  tr.ocupado = (x, y, i) => {
    if ((i != null && tr.coberto?.(i)) || fundoMonaco(tr, x, y) > -10 || predioEm(x, y, 3) || reservado.some(([cx, cy, rr]) => (x - cx) ** 2 + (y - cy) ** 2 < rr * rr)) return true;
    return tr.distAt(x, y) < L + 8;
  };
  mar(tr, ctx);
  tunel(tr, add);
  predios(tr, add, lista);
  marcosMonaco(tr, add, lista, hAt);
  porto(tr, add, ctx);
  piscinas(tr, add, ctx);
  arquibancadasMonaco(tr, add, predioEm);
  arvores(tr, add, { hAt, predioEm });
  paddockMonaco(tr, add, hAt); // as hospitalidades das equipes, as tendas de apoio e o paddock flutuante (substituem as tendas genéricas)
  grampoMonaco(tr, add, hAt, predioEm); // o canteiro com palmeiras e os postes verdes do grampo do Fairmont
  muroDeArrimo(tr, add); // o muro de pedra entre trechos empilhados (grampo e Mirabeau): fecha o desnível que o terreno deixaria aberto
  tr.contextoVidaMonaco = { lista, predioEm, hAt };
  const f = D.frac, c = f.curvas, tc = f.trechos;
  atracados(tr, ctx, tc.cais);
  tecpro(tr, add, [[c.sainteDevote + 0.006, c.sainteDevote + 0.028, "fora"], [tc.nouvelleChicane[0] - 0.012, tc.nouvelleChicane[1] + 0.012, "fora"], [c.rascasse - 0.01, c.rascasse + 0.008, "fora"], [c.mirabeauHaute - 0.006, c.mirabeauHaute + 0.014, "fora"]]); // (só nas áreas de escape: Sainte Dévote, chicane do porto, Rascasse e Mirabeau)
  telaos(tr, add, [0.03, c.casino, c.mirabeauHaute + 0.012, tc.cais[0] + 0.03, c.rascasse - 0.02]);
  largada(tr, add); cais(tr, add, tc.cais); fonte(tr, add, hAt); cruzeiros(tr, add);
  tr.marcosPos = D.marcos; // (para conferir no navegador: __corrida.race.tr.marcosPos)
  tr.pracaCassino = { x: D.marcos.praca[0], y: D.marcos.praca[1] }; // o som da fonte
}
