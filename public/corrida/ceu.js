// Corrida da Galera — os céus: fotos de céu de verdade em volta da pista (HDRIs "pure sky" do Poly Haven, CC0, em
// public/corrida/ceus/). A foto vira o fundo da cena e também o reflexo nos carros (scene.environment). Na hora que
// a foto chega, ela é medida: a cor do horizonte vira a cor da neblina (o chão longe some no céu sem emenda) e o
// ponto mais claro vira a direção do sol, para as sombras baterem com o sol da foto.
import * as THREE from "three";
import { renderer, scene, hemi } from "./cena.js";

// brilho: quanto a foto aparece no fundo · luz: quanto ela ilumina e reflete nos carros · noite: fica a neblina e o sol do tema
export const CEUS = {
  monaco: { brilho: 1, luz: 0.55 },
  interlagos: { brilho: 1, luz: 0.55 },
  monza: { brilho: 1, luz: 0.55 },
  barcelona: { brilho: 1, luz: 0.55 },
  silverstone: { brilho: 0.95, luz: 0.5, arquivo: "nurburgring" }, // o céu nublado do Nürburgring serve para a Inglaterra
  // as pistas convertidas do calendário de F1 usam os céus que já existem, pelo clima de cada uma
  melbourne: { brilho: 1, luz: 0.55, arquivo: "monza" },
  xangai: { brilho: 1, luz: 0.55, arquivo: "nurburgring" },
  suzuka: { brilho: 1, luz: 0.55, arquivo: "interlagos" },
  bahrein: { brilho: 1, luz: 0.55, arquivo: "deserto" },
  jeddah: { brilho: 1, luz: 0.55, arquivo: "deserto" },
  miami: { brilho: 1, luz: 0.55, arquivo: "rio" },
  montreal: { brilho: 1, luz: 0.55, arquivo: "monza" },
  redbullring: { brilho: 1, luz: 0.55, arquivo: "serra" },
  spa: { brilho: 1, luz: 0.55, arquivo: "nurburgring" },
  hungaroring: { brilho: 1, luz: 0.55, arquivo: "barcelona" },
  zandvoort: { brilho: 0.95, luz: 0.5, arquivo: "nurburgring" }, // o céu nublado do litoral do mar do Norte
  madri: { brilho: 1, luz: 0.55, arquivo: "barcelona" },
  baku: { brilho: 1, luz: 0.55, arquivo: "barcelona" },
  singapura: { brilho: 1, luz: 0.55, arquivo: "losangeles" },
  austin: { brilho: 1, luz: 0.55, arquivo: "laguna" },
  mexico: { brilho: 1, luz: 0.55, arquivo: "interlagos" },
  lasvegas: { brilho: 1, luz: 0.55, arquivo: "losangeles" },
  catar: { brilho: 1, luz: 0.55, arquivo: "deserto" },
  abudhabi: { brilho: 1, luz: 0.55, arquivo: "losangeles" },
  losangeles: { brilho: 1, luz: 0.6 },
  rio: { brilho: 1, luz: 0.55 },
  serra: { brilho: 1, luz: 0.5 },
  deserto: { brilho: 1, luz: 0.5 },
  luigi: { brilho: 1, luz: 0.55 },
  sorvete: { brilho: 1.05, luz: 0.6 },
  nurburgring: { brilho: 0.95, luz: 0.5 },
  laguna: { brilho: 1, luz: 0.6 },
  tokyo: { brilho: 0.32, luz: 0.25, noite: true },
  arcoiris: { brilho: 0.16, luz: 0.2, noite: true },
};
const pmrem = new THREE.PMREMGenerator(renderer);
const cache = new Map();
let atual = null;

// mede a foto num canvas pequeno: a cor média logo acima do horizonte e o pixel mais claro do céu (o sol)
function medir(img) {
  const W = 256, H = 128, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, lum = (i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  let r = 0, g = 0, b = 0, k = 0;
  for (let y = 56; y < 62; y++) for (let i = 0; i < W; i++) { const p = (y * W + i) * 4; r += d[p]; g += d[p + 1]; b += d[p + 2]; k++; }
  let best = -1, bx = 0, by = 0;
  for (let y = 0; y < 60; y++) for (let i = 0; i < W; i++) { const l = lum((y * W + i) * 4); if (l > best) { best = l; bx = i; by = y; } }
  const horizonte = new THREE.Color().setRGB(r / k / 255, g / k / 255, b / k / 255, THREE.SRGBColorSpace);
  // pixel -> direção no mundo (a mesma conta do Three para fotos equirretangulares: u = atan(z, x), v = asin(y))
  const u = (bx + 0.5) / W, v = 1 - (by + 0.5) / H, fi = (u - 0.5) * Math.PI * 2;
  const el = Math.max(0.42, Math.min(1.05, (v - 0.5) * Math.PI)); // sol muito baixo deixaria as sombras compridas demais
  const sol = best > 235 ? new THREE.Vector3(Math.cos(el) * Math.cos(fi), Math.sin(el), Math.cos(el) * Math.sin(fi)) : null;
  return { horizonte, sol };
}
function carregar(id) {
  if (!cache.has(id)) cache.set(id, new THREE.TextureLoader().loadAsync(`/corrida/ceus/${id}.jpg`).then((tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
    const env = pmrem.fromEquirectangular(tex).texture;
    return { tex, env, ...medir(tex.image) };
  }).catch(() => null));
  return cache.get(id);
}
// troca o céu ao trocar de pista (enquanto a foto não chega, fica a cor lisa do tema).
// A luz da foto (scene.environment) muda o shader de TODOS os materiais: o Three.js recompila tudo de uma vez, e a
// página trava meio segundo. Com o carro andando isso não pode acontecer: se a foto chega com a corrida já valendo
// (podeMudarLuz falso), entra só o fundo (que não recompila nada) e a luz fica guardada para a próxima largada.
let pendente = null;
export function aplicarCeu(tr, look, noite = false, podeMudarLuz = () => true) {
  const chave = `${tr.id}:${noite}`;
  atual = chave; scene.background = null; scene.environment = null; tr.sol = null; pendente = null;
  const cfg = noite ? { brilho: 0.52, luz: 0.32, noite: true } : CEUS[tr.id]; if (!cfg) { if (look.sol) tr.sol = look.sol; return Promise.resolve(); } // (`look.sol`: a luz baixa do entardecer de Baku, sem foto de céu)
  // Qwantani Night (Pure Sky), Poly Haven CC0; já usado em Tóquio e compartilhado pelas versões noturnas.
  return carregar(noite ? "tokyo" : cfg.arquivo || tr.id).then((s) => {
    if (!s || atual !== chave) return;
    scene.background = s.tex; scene.backgroundIntensity = cfg.brilho;
    if (!cfg.noite) {
      tr.sol = s.sol;
      scene.fog.color.copy(s.horizonte); renderer.setClearColor(s.horizonte);
    }
    const luz = () => {
      scene.environment = s.env; scene.environmentIntensity = cfg.luz;
      hemi.intensity = noite ? 0.95 : look.hemi[2] * (cfg.noite ? 1 : 0.65); // a foto já ilumina: a luz ambiente do tema baixa
    };
    if (podeMudarLuz()) luz(); else pendente = { id: chave, luz };
  });
}
// na próxima largada da mesma pista, a luz que chegou atrasada entra (antes de preparar os shaders)
export function luzPendente() { if (pendente && pendente.id === atual) pendente.luz(); pendente = null; }
export const ceuPronto = (id) => carregar(CEUS[id]?.arquivo || id);
