// Mônaco — o cenário dos pontos famosos da volta, a partir das fotos da transmissão: o arco de patrocínio sobre a pista na chegada a Sainte Dévote
// (a arquibancada A1 fica por dentro da curva 1, a capela por fora) e o prédio claro atrás da arquibancada da Anthony Noghès, a última curva à direita.
// As arquibancadas desses pontos, as do porto da Nouvelle Chicane e a Rascasse com o bar vêm de monaco.js (`arquibancadasMonaco`) e de detalhes.js (`rascasse`).
// Tudo respeita a barreira de cada trecho (`tr.latMuro`), os escapes (`noEscape`), os prédios de verdade, a água e o que já foi posto (`ocupado`).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { marcaTex } from "../marcas.js";
import { livre, ocupado, sinalDaCurva } from "../comum.js";
import { portico } from "../torres.js";
import { D, fundoMonaco } from "./mundo.js";
import { noEscape } from "./escapes.js";

const noTraco = (tr, f) => { const i = Math.floor((((f % 1) + 1) % 1) * tr.n) % tr.n; return [tr.pts[i], i]; };
const ponto = (p, lado, d) => [p.x + p.nx * lado * d, p.y + p.ny * lado * d];

// O arco: duas colunas fora da barreira dos dois lados e a viga com o letreiro sobre a pista (Sainte Dévote, logo antes da curva 1, na reta dos boxes larga).
export function arcoSainteDevote(tr, add) {
  const { reservado = (tr.reservado = []) } = tr;
  tr.arcoMonaco = null;
  for (const f of [0.0535, 0.0465, 0.043, 0.04, 0.057, 0.036, 0.0325]) {
    const [p, i] = noTraco(tr, f), meio = Math.max(Math.max(tr.latMuro(1, i), tr.latMuro(-1, i)) + 9, tr.wallLat + 8), vao = 2 * meio; // (os pés ficam fora da faixa de enfeites: `ocupado` começa em wallLat + 8)
    const pes = [-1, 1].map((s) => ponto(p, s, meio + 4));
    if (!pes.every(([x, z]) => livre(tr, x, z, 20) && fundoMonaco(tr, x, z) < -10 && !noEscape(tr, x, z, 12) && !tr.noCorredor?.(x, z))) continue; // (os pés podem encostar numa fachada: na rua estreita o arco se apoia nos prédios, como nas fotos)
    const g = portico({ vao, alto: 66, viga: 14, cor: "#0b1530", corColuna: "#202328", texto: "MONACO GRAND PRIX   ·   FORMULA 1   ·   SAINTE DÉVOTE", corTexto: "#ffffff", corFaixa: "#c8102e" });
    g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(-p.ny, p.nx); add(g);
    for (const [x, z] of pes) reservado.push([x, z, 26]);
    tr.arcoMonaco = { f, vao }; return;
  }
}

// Um prédio claro de andares com janelas e uma faixa de patrocínio virada para a pista, atrás da barreira (ou da arquibancada): tenta algumas distâncias e frações até caber.
function predioAtras(tr, add, { fracoes, lado, distancias, largura = 64, prof = 40, andares = 9, marca, cor = "#e8dfcb" }) {
  const andar = 3.1 * D.projecao.k * 1.1, h = andares * andar;
  for (const f of fracoes) for (const d of distancias) {
    const [p, i] = noTraco(tr, f), amostras = [];
    for (const a of [-largura / 2, 0, largura / 2]) for (const b of [0, prof / 2, prof]) amostras.push([p.x + p.tx * a + p.nx * lado * (d + b), p.y + p.ty * a + p.ny * lado * (d + b)]);
    if (!amostras.every(([x, z]) => tr.distAt(x, z) > d - 4 && fundoMonaco(tr, x, z) < -10 && !tr.predioEmMonaco?.(x, z, 6) && !ocupado(tr, x, z, i) && !noEscape(tr, x, z, 6) && !tr.noCorredor?.(x, z))) continue;
    const [cx, cz] = ponto(p, lado, d + prof / 2), base = Math.min(...amostras.map(([x, z]) => tr.chao(x, z))) - 1.5;
    const parede = canvasTex(128, 128, (x, w, hh, rr) => {
      x.fillStyle = cor; x.fillRect(0, 0, w, hh);
      for (let k = 0; k < 400; k++) { x.fillStyle = rr() < 0.5 ? "#0000000c" : "#ffffff22"; x.fillRect(rr() * w, rr() * hh, 3, 3); }
      for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) { const x0 = c * 64, y0 = a * 64; x.fillStyle = "#00000014"; x.fillRect(x0, y0 + 60, 64, 4); x.fillStyle = "#e9e2d2"; x.fillRect(x0 + 18, y0 + 10, 28, 40); x.fillStyle = "#3d5063"; x.fillRect(x0 + 21, y0 + 13, 22, 34); x.fillStyle = "#ffffff38"; x.fillRect(x0 + 23, y0 + 15, 7, 30); x.fillStyle = "#7d8f78"; x.fillRect(x0 + 10, y0 + 13, 10, 34); x.fillRect(x0 + 44, y0 + 13, 10, 34); }
    });
    parede.wrapS = parede.wrapT = THREE.RepeatWrapping; parede.repeat.set(largura / (3.5 * D.projecao.k * 2), andares / 2);
    const g = new THREE.Group(); g.position.set(cx, base, cz); g.rotation.y = Math.atan2(-p.nx * lado, -p.ny * lado); add(g);
    const caixa = new THREE.Mesh(new THREE.BoxGeometry(largura, h + 14, prof), [M(0xd8cfb8), M(0xd8cfb8), M(0xb8b09c), M(0xb8b09c), new THREE.MeshStandardMaterial({ map: parede, roughness: 0.85 }), M(0xd8cfb8)]);
    caixa.position.y = (h + 14) / 2 - 7; caixa.name = "monaco-predio-ponto"; caixa.castShadow = caixa.receiveShadow = true; g.add(caixa);
    const topo = new THREE.Mesh(new THREE.BoxGeometry(largura + 3, 3, prof + 3), M(0xa59d8a)); topo.position.y = h + 7.5; g.add(topo);
    if (marca) { const faixa = new THREE.Mesh(new THREE.PlaneGeometry(largura * 0.8, 15), new THREE.MeshBasicMaterial({ map: marcaTex(marca, 512, 96) })); faixa.position.set(0, andar * 2.3, prof / 2 + 0.3); g.add(faixa); }
    (tr.reservado ||= []).push([cx, cz, largura * 0.7]);
    return { f, d, cx, cz };
  }
  return null;
}

// O prédio atrás da arquibancada da Anthony Noghès: por dentro da curva 19, de frente para a saída da Rascasse.
export function predioAnthonyNoghes(tr, add) {
  const c = D.frac.curvas, i = Math.floor(c.anthonyNoghes * tr.n), dentro = sinalDaCurva(tr.pts, tr.n, i);
  tr.predioNoghesMonaco = predioAtras(tr, add, { fracoes: [c.anthonyNoghes, c.anthonyNoghes - 0.006, c.anthonyNoghes + 0.006, c.anthonyNoghes - 0.012], lado: dentro, distancias: [tr.wallLat + 52, tr.wallLat + 64, tr.wallLat + 80], andares: 9, marca: "heineken" });
}
