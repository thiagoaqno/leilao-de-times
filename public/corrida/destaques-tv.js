import monaco from "./kit/monaco/dados.js";
import baku from "./kit/baku/dados.js";
import singapura from "./kit/singapura/dados.js";
import lasvegas from "./kit/lasvegas/dados.js";

// Frações medidas nos arquivos gps; os marcos urbanos usam os mesmos dados que constroem a cidade.
const lv = (nome) => { const m = lasvegas.marcos.find((p) => p.chave === nome); return [m.cx, m.cz]; };
export const DESTAQUES = {
  monaco: [["Cassino de Monte Carlo", monaco.marcos.casino], ["Porto de Mônaco", monaco.marcos.yachtClub], ["Grampo do Fairmont", 0.389]],
  interlagos: [["S do Senna", 0.10], ["Lago e reta oposta", 0.34], ["Subida dos boxes", 0.92]],
  monza: [["Parabolica", 0.88], ["Sopraelevata", 0.53], ["Tribunas e boxes", 0.99]],
  barcelona: [["Campsa e as serras", 0.61], ["La Caixa", 0.74], ["Tribuna e torre de controle", 0.99]],
  silverstone: [["Maggotts e Becketts", 0.62], ["O antigo aeródromo", 0.75], ["The Wing", 0.99]],
  melbourne: [["Albert Park e o lago", 0.40], ["Curvas 9 e 10", 0.51], ["Cidade e reta principal", 0.99]],
  suzuka: [["Os esses de Suzuka", 0.19], ["O viaduto do circuito em oito", 0.40], ["Parque e reta principal", 0.99]],
  bahrein: [["Refletores e boxes de Sakhir", 0.99], ["Dunas e curvas do deserto", 0.39], ["Curva 11", 0.61]],
  jeddah: [["A corniche e o Mar Vermelho", 0.59], ["Curva 13 à beira-mar", 0.38], ["Boxes de Jeddah", 0.99]],
  montreal: [["Ilha Notre-Dame", 0.51], ["Grampo de Montreal", 0.66], ["Muro dos Campeões", 0.95]],
  spa: [["Eau Rouge e Raidillon", 0.15], ["Pouhon nas Ardenas", 0.54], ["La Source", 0.04]],
  zandvoort: [["Dunas de Zandvoort", 0.51], ["Hugenholtz", 0.21], ["Arie Luyendyk", 0.88]],
  baku: [["Torre da Donzela", baku.marcos.donzela], ["Cidade Velha", 0.43], ["A orla do Cáspio", 0.87]],
  singapura: [["Marina Bay Sands", singapura.marcos.mbs2], ["Singapore Flyer", singapura.marcos.flyer], ["Ponte Anderson", 0.57]],
  lasvegas: [["Sphere", lv("sphere")], ["Torre Eiffel e a Strip", lv("eiffel")], ["Bellagio", lv("bellagio")]],
};

// Para marcos fora do circuito, a câmera parte do ponto da pista mais próximo e olha para o edifício.
const pontosProximos = new WeakMap();
export function cameraDestaque(tr, destaque, u) {
  const [nome, alvo] = destaque, n = tr.n;
  let p;
  if (Array.isArray(alvo)) {
    let cache = pontosProximos.get(tr);
    if (!cache) { cache = new Map(); pontosProximos.set(tr, cache); }
    p = cache.get(destaque);
    if (!p) { p = tr.pts.reduce((a, b) => (b.x - alvo[0]) ** 2 + (b.y - alvo[1]) ** 2 < (a.x - alvo[0]) ** 2 + (a.y - alvo[1]) ** 2 ? b : a); cache.set(destaque, p); }
    let dx = p.x - alvo[0], dz = p.y - alvo[1], d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const distancia = Math.max(200, Math.min(550, d * 0.5));
    const x = p.x + dx * distancia + p.tx * (u - 0.5) * 90, z = p.y + dz * distancia + p.ty * (u - 0.5) * 90;
    const chao = tr.chao(x, z) || 0, base = tr.chao(alvo[0], alvo[1]) || 0;
    return { nome, x, y: Math.max(chao + 180, base + 220), z, ax: alvo[0], ay: base + 100, az: alvo[1], gx: alvo[0], gz: alvo[1], fov: 62 };
  }
  const i = Math.floor(alvo * n) % n; p = tr.pts[i];
  const q = tr.pts[(i + Math.max(1, Math.floor(n * 0.015))) % n];
  const x = p.x - p.ty * 220 - p.tx * 120 + p.tx * (u - 0.5) * 100, z = p.y + p.tx * 220 - p.ty * 120 + p.ty * (u - 0.5) * 100;
  return { nome, x, y: Math.max((tr.chao(x, z) || 0) + 150, (p.h || 0) + 150), z, ax: q.x, ay: (q.h || 0) + 25, az: q.y, gx: q.x, gz: q.y, fov: 66 };
}
