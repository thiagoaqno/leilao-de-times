// Corrida da Galera — o cenário de Las Vegas (Las Vegas Strip Circuit), montado em cima de dados reais (kit/lasvegas/): as plantas e as alturas dos prédios e das vias do
// OpenStreetMap (a Strip, a Koval Lane, a Sands Avenue e a Harmon), o relevo EU-DEM/SRTM, o Sphere de LED que acende, o Bellagio com o lago e as fontes, a Torre Eiffel do Paris,
// a High Roller do LINQ, o campanário do Venetian, o vulcão do Mirage, a colunata do Caesars Palace, os letreiros de neon e os telões da Strip, o prédio dos boxes do GP, as
// palmeiras do canteiro central e as barreiras de concreto com a cerca de tela só onde a pista real as tem (`muros` de pistas.js: o mesmo mapa da física). O GP é à NOITE
// (a hora padrão da sala de Las Vegas é "noite"): a Strip inteira acende (janelas, neon, telões, o Sphere, as fontes) e de dia ela fica de pé, apagada, sob o céu limpo do deserto.
import { lerPredios, indiceDePredios, predios } from "./kit/lasvegas/predios.js";
import { lagos, arvores } from "./kit/lasvegas/terra.js";
import { barreirasLV } from "./kit/lasvegas/barreiras.js";
import { iluminacao } from "./kit/lasvegas/luz.js";
import { letreiros } from "./kit/lasvegas/neon.js";
import { sphere, fontesDoBellagio, torreEiffel, highRoller, campanario, vulcao, colunataDoCaesars, letrasDosTorres } from "./kit/lasvegas/marcos.js";
import { porticos, retaDosBoxes } from "./kit/lasvegas/reta.js";
import { montanha } from "./kit/marcos.js";
import * as THREE from "three";
import { canvasTex } from "./cena.js";
import { ligarNoite, luzDaNoite, soDeNoite } from "./kit/bahrein/base.js";

// o ponto está entre a pista e a face da barreira (mais uma folga): a área de escape e a rua, onde não entra gente nem enfeite
function dentroDaBarreira(tr, x, y) {
  const i = tr.indiceAt(x, y), p = tr.pts[i], l = (x - p.x) * p.nx + (y - p.y) * p.ny, r = tr.murosEscape?.[l >= 0 ? 1 : -1]?.[i] || 0;
  return r > 0 && Math.abs(l) < tr.W / 2 + r + 16;
}

export function cenarioLasVegas(tr, ctx, cfg) {
  const { add, hAt } = ctx, reservado = (tr.reservado ||= []);
  const lista = lerPredios(tr), predioEm = indiceDePredios(lista); tr.predioEmLV = predioEm;
  // onde os enfeites de vida.js e do kit não entram: dentro de um prédio, no que já foi montado, junto da pista e da barreira
  tr.ocupado = (x, y) => predioEm(x, y, 3) || reservado.some(([cx, cy, rr]) => (x - cx) ** 2 + (y - cy) ** 2 < rr * rr) || tr.distAt(x, y) < tr.W / 2 + 14 || dentroDaBarreira(tr, x, y);
  lagos(tr, ctx);
  predios(tr, add, lista);
  sphere(tr, add, hAt);
  fontesDoBellagio(tr, add, hAt);
  torreEiffel(tr, add, hAt, predioEm);
  highRoller(tr, add, hAt);
  campanario(tr, add, hAt);
  vulcao(tr, add, hAt);
  colunataDoCaesars(tr, add, hAt);
  letrasDosTorres(tr, add, hAt);
  barreirasLV(tr, add, cfg.barreiras);
  porticos(tr, add, cfg.porticos);
  retaDosBoxes(tr, add, { lado: tr.t.boxes.lado, marcas: cfg.marcasBoxes });
  // as Spring Mountains a oeste: de noite, só a silhueta escura
  const serra = montanha(tr, add, cfg.montanha);
  luzDaNoite(tr).materiais.push({ mat: serra.material, dia: 0xffffff, noite: 0x262a3a });
  // o brilho do vale de Las Vegas no horizonte (de noite): uma parede de luz laranja e rosa em volta, que some no alto
  const tex = canvasTex(8, 128, (x, w, h) => { const g = x.createLinearGradient(0, h, 0, 0); g.addColorStop(0, "rgba(255,150,70,0.55)"); g.addColorStop(0.35, "rgba(255,90,120,0.22)"); g.addColorStop(1, "rgba(255,90,120,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); }, false);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.BackSide, fog: false, blending: THREE.AdditiveBlending });
  const cupula = new THREE.Mesh(new THREE.CylinderGeometry(7600, 7600, 2200, 48, 1, true), mat); cupula.position.set(tr.t.world / 2, 900, tr.t.world / 2); cupula.name = "lasvegas-brilho"; cupula.userData.semContato = true; cupula.renderOrder = -1; soDeNoite(tr, add(cupula));
}

// por último (gps/lasvegas.js `depois`, depois de vidaGP, que define tr.animarPista): as palmeiras, os letreiros, os postes de luz e o laço da noite
export function depoisLasVegas(tr, ctx) {
  arvores(tr, ctx.add, { hAt: ctx.hAt, predioEm: tr.predioEmLV });
  letreiros(tr, ctx.add, { hAt: ctx.hAt, predioEm: tr.predioEmLV });
  iluminacao(tr, ctx.add);
  ligarNoite(tr);
}
