// Miami — o prédio dos boxes temporário e o paddock: módulos brancos de dois andares com as portas das garagens (uma cor por equipe), o
// terraço de hospitalidade com toldos aqua e rosa, a torre de controle de vidro e os painéis no teto; e, atrás, os motorhomes e as carretas
// das equipes. Cor chapada por vértice (kit/montagem.js): cada peça fica em poucas chamadas de desenho. Origem no meio da frente, frente
// para +z (a pista), o prédio cresce para -z.
import * as THREE from "three";
import { Montador, solido, tom } from "../montagem.js";
import { marcaTex } from "../marcas.js";

const AQUA = "#0aa3ad", ROSA = "#ff5fa2", BRANCO = "#f4f2ec", VIDRO = "#1b2a36", AZUL_VIDRO = "#5f8fa8";
export const EQUIPES = ["#e10600", "#00a3e0", "#ffd100", "#ff7a00", "#00a86b", "#1e41ff", "#f4f4f4", "#7b2cbf", "#0aa3ad", "#ff5fa2", "#2a2f36"];

export function predioDosBoxes({ comprimento = 560, fundo = 46, torre = 0, paineis = ["mimiami", "migp", "mimiami", "migp"] } = {}) {
  const m = new Montador(), S = solido(), L = comprimento, F = fundo, H1 = 34, g = new THREE.Group();
  // o térreo: a caixa branca, as portas das garagens com a faixa da cor da equipe e o friso aqua em cima
  m.caixa(S, [0, H1 / 2, -F / 2], [L, H1, F], { cor: BRANCO });
  const n = Math.floor((L - 60) / 24), x0 = -((n - 1) * 24) / 2;
  for (let k = 0; k < n; k++) {
    const x = x0 + k * 24, eq = EQUIPES[k % EQUIPES.length];
    m.caixa(S, [x, 13, 0.3], [19, 26, 0.8], { cor: "#242a31" }); // a porta
    for (let y = 3; y < 26; y += 4) m.caixa(S, [x, y, 0.8], [19, 0.5, 0.4], { cor: "#3a424b" });
    m.caixa(S, [x, 27.5, 0.7], [20, 3, 1], { cor: eq }); // a faixa da equipe
    m.caixa(S, [x + 12, 14, 0.3], [1.2, 28, 0.8], { cor: "#d9d6cd" }); // o pilar entre as portas
  }
  m.caixa(S, [0, H1 - 1.4, 0.5], [L, 2.8, 1.4], { cor: AQUA });
  // o terraço (a laje avança para a pista) com o parapeito de vidro
  m.caixa(S, [0, H1 + 0.7, -F / 2 + 2], [L + 2, 1.4, F + 4], { cor: "#ffffff" });
  m.caixa(S, [0, H1 + 4.6, 1.8], [L, 6.4, 0.5], { cor: AZUL_VIDRO });
  for (let x = -L / 2 + 6; x <= L / 2 - 5; x += 22) m.caixa(S, [x, H1 + 4, 1.8], [0.8, 7, 0.9], { cor: "#e9e6df" });
  // o primeiro andar recuado: vidraça escura com montantes brancos, e os toldos que descem em rampa, alternando aqua e rosa
  const FD = F - 18;
  m.caixa(S, [0, H1 + 17.5, -F + FD / 2 + 2], [L - 16, 33, FD], { cor: BRANCO });
  m.caixa(S, [0, H1 + 15, -F + FD + 2.3], [L - 18, 24, 0.9], { cor: VIDRO });
  for (let x = -L / 2 + 14; x <= L / 2 - 13; x += 12) m.caixa(S, [x, H1 + 15, -F + FD + 2.8], [0.9, 25, 1.1], { cor: "#ffffff" });
  for (let k = 0, x = -L / 2 + 18; x <= L / 2 - 28; k++, x += 24) m.caixa(S, [x + 10, H1 + 29, -F + FD + 8], [22, 0.9, 12], { cor: k % 2 ? ROSA : AQUA, rx: 0.34 });
  m.caixa(S, [0, H1 + 36, -F + FD / 2 + 2], [L - 10, 2.4, FD + 6], { cor: "#ffffff" }); // o teto
  m.caixa(S, [0, H1 + 38, -F + 4], [L - 10, 2, 1], { cor: AQUA }); // a platibanda do fundo
  // as caixas de ar e os degraus de serviço no teto, e as escadas externas atrás (azul-claro, de andaime)
  for (let k = 0; k < 9; k++) m.caixa(S, [-L / 2 + 40 + k * ((L - 80) / 8), H1 + 39, -F + 14 + (k % 2) * 6], [14, 4, 10], { cor: "#b9bec4" });
  for (const sx of [-1, 1]) for (const k of [0, 1]) m.caixa(S, [sx * (L / 2 - 8 - k * (L - 16) / 3), (H1 + 36) / 2, -F - 4], [8, H1 + 36, 8], { cor: "#d9d6cd" });
  // a torre de controle: dois andares de vidro com a cobertura, o mastro das bandeiras e a antena
  const tx = torre, tz = -F / 2 - 4;
  m.caixa(S, [tx, H1 + 36 + 14, tz], [40, 28, 26], { cor: VIDRO });
  for (let k = 0; k < 8; k++) m.caixa(S, [tx - 17.5 + k * 5, H1 + 36 + 14, tz + 13.4], [0.8, 28, 0.8], { cor: "#ffffff" });
  m.caixa(S, [tx, H1 + 36 + 14.5, tz + 13.4], [40, 1, 0.8], { cor: "#ffffff" });
  m.caixa(S, [tx, H1 + 36 + 29, tz], [44, 2.4, 30], { cor: AQUA });
  m.cilindro(S, [tx + 14, H1 + 36 + 46, tz], [0.7, 36], { cor: "#d9dde0", seg: 6 }); m.cilindro(S, [tx - 14, H1 + 36 + 40, tz], [0.4, 24], { cor: "#9aa3aa", seg: 5 });
  m.caixa(S, [tx + 21, H1 + 36 + 56, tz + 0.2], [14, 8, 0.4], { cor: "#f4f4f4" }); for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) m.caixa(S, [tx + 16 + a * 3.5 + (b ? 0 : 0), H1 + 36 + 54 + b * 4, tz + 0.5], [3.5, 4, 0.2], { cor: (a + b) % 2 ? "#111" : "#fff" }); // a bandeira quadriculada
  g.add(m.montar("miami-boxes"));
  // os painéis de cima do teto, de frente para a pista
  const passo = Math.min(120, (L - 40) / paineis.length);
  paineis.forEach((nome, k) => {
    const x = (k - (paineis.length - 1) / 2) * passo, p = new THREE.Mesh(new THREE.PlaneGeometry(passo * 0.78, 17), new THREE.MeshBasicMaterial({ map: marcaTex(nome, 512, 128), side: THREE.DoubleSide }));
    p.position.set(x, H1 + 36 + 12, -F + FD + 4.4); g.add(p);
  });
  g.userData = { comprimento: L, fundo: F, alto: H1 + 100 };
  return g;
}

// um motorhome de dois andares com o terraço, o toldo e a faixa da equipe
export function motorhome({ cor = "#0aa3ad", faixa = ROSA, c = 64, p = 24 } = {}) {
  const m = new Montador(), S = solido(), g = new THREE.Group();
  m.caixa(S, [0, 9, -p / 2], [c, 18, p], { cor: BRANCO });
  m.caixa(S, [0, 20, -p / 2 - 3], [c - 4, 12, p - 8], { cor: "#e9e6df" });
  m.caixa(S, [0, 9, 0.3], [c - 10, 7, 0.4], { cor: VIDRO }); m.caixa(S, [0, 21, -p / 2 + 1.2], [c - 8, 6, 0.4], { cor: VIDRO });
  m.caixa(S, [0, 14.2, -p / 2], [c + 1, 1.2, p + 1], { cor: "#ffffff" }); m.caixa(S, [0, 27.5, -p / 2 - 3], [c - 2, 1.4, p - 6], { cor: tom(cor, 1.05) });
  m.caixa(S, [0, 4, 0.6], [c, 2.4, 0.4], { cor }); m.caixa(S, [0, 6.8, 0.6], [c, 1, 0.4], { cor: faixa });
  m.caixa(S, [0, 16.5, 3.6], [c - 6, 0.7, 7], { cor: faixa, rx: 0.4 });
  for (let x = -c / 2 + 6; x < c / 2 - 4; x += 12) m.caixa(S, [x, 17.6, 1], [0.5, 3.2, 0.5], { cor: "#cfd3d6" });
  g.add(m.montar("miami-motorhome")); g.userData = { largura: c, profundidade: p };
  return g;
}

// uma carreta de equipe (cabine e baú) com a faixa colorida
export function carreta({ cor = "#0aa3ad", c = 96 } = {}) {
  const m = new Montador(), S = solido(), g = new THREE.Group();
  m.caixa(S, [-c / 2 + 3, 9, -10], [c - 18, 18, 20], { cor: "#f4f2ec" }); m.caixa(S, [-c / 2 + 3, 5.5, -10], [c - 18, 3, 20.4], { cor });
  m.caixa(S, [c / 2 - 6, 8, -10], [14, 16, 18], { cor: tom(cor, 0.9) }); m.caixa(S, [c / 2 - 1, 11, -10], [3, 6, 16], { cor: VIDRO });
  for (const x of [-c / 2 + 10, -c / 2 + 22, c / 2 - 8]) for (const z of [-1.6, -18.4]) m.caixa(S, [x, 2.6, z], [5.2, 5.2, 2.4], { cor: "#1a1d22" });
  g.add(m.montar("miami-carreta")); g.userData = { largura: c, profundidade: 20 };
  return g;
}
