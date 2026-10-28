// Bahrein — a Torre de controle de Sakhir, a de anéis azuis das fotos: o pódio de pedra clara e o saguão rosado, nove andares de
// vidro azul-escuro com a laje larga (mais larga no meio) e o guarda-corpo claro, o tambor rosado do alto e a coroa de velas
// brancas com os mastros e a bandeira do Bahrein. As vidraças acendem de noite (mapa emissivo ligado por luzDaNoite).
// Uma Montador só (cor por vértice) mais o material das janelas: 3 chamadas de desenho para a torre inteira.
import * as THREE from "three";
import { Montador, solido, vidro, tex } from "../montagem.js";
import { velaEm } from "../coberturas.js";
import { sorteio } from "../comum.js";
import { emissivoDaNoite } from "./base.js";

const MASTRO = new THREE.CylinderGeometry(0.22, 1, 1, 6);

export function torreSakhir(tr, add, { x, z, raio = 29, aneis = 9 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), seg = 32, r = sorteio(8101);
  // as vidraças: o dia mostra só o vidro azul, de noite o mapa emissivo acende metade delas
  const base = tex(32, 32, (c, w, h) => { c.fillStyle = "#17335a"; c.fillRect(0, 0, w, h); for (let k = 0; k < 4; k++) { c.fillStyle = "#3b6ea8"; c.fillRect(k * 8 + 1, 5, 6, 22); c.fillStyle = "#ffffff30"; c.fillRect(k * 8 + 1, 5, 6, 2); } }, { repeat: true });
  const acesas = tex(32, 32, (c, w, h) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, h); for (let k = 0; k < 4; k++) if (r() < 0.6) { c.fillStyle = r() < 0.5 ? "#ffd27a" : "#fff0c2"; c.fillRect(k * 8 + 1, 5, 6, 22); } }, { repeat: true });
  const janelas = emissivoDaNoite(tr, new THREE.MeshStandardMaterial({ map: base, emissive: 0xffffff, emissiveMap: acesas, roughness: 0.3, metalness: 0.25 }), 0, 1.1);
  const topo = (y, h) => y + h;
  // o pódio e o saguão
  m.cilindro(S, [0, -10, 0], [raio * 2.25, 28], { cor: "#d9ceb3", seg: 40 });
  m.cilindro(S, [0, 6, 0], [raio * 1.85, 4], { cor: "#ebe4d2", seg: 40 });
  m.cilindro(S, [0, 26, 0], [raio * 1.38, 36], { cor: "#e8cdb9", seg });
  m.cilindro(V, [0, 24, 0], [raio * 1.4, 18], { cor: "#1c3552", seg, aberto: true });
  m.cilindro(S, [0, 44.5, 0], [raio * 1.75, 3], { cor: "#f6f3ec", seg: 40 }); // a marquise redonda em volta do saguão
  // os andares: vidro azul e laje (navy e azul médio, de dois em dois), mais larga no meio
  let y = 46;
  const hAndar = 8, hLaje = 2.4;
  for (let i = 0; i < aneis; i++) {
    const rl = raio * (1.3 - Math.abs(i - (aneis - 1) / 2) * 0.035);
    m.cilindro(janelas, [0, y + hAndar / 2, 0], [raio, hAndar], { seg, aberto: true, uv: [16, 1] });
    m.cilindro(S, [0, y + hAndar + hLaje / 2, 0], [rl, hLaje], { cor: i % 2 ? "#2a63ad" : "#173f7c", seg });
    m.cilindro(S, [0, y + hAndar + hLaje + 0.5, 0], [rl - 0.2, 1], { cor: "#e9eef3", seg }); // o guarda-corpo claro
    y += hAndar + hLaje + 1;
  }
  // o tambor rosado do alto, a laje e a coroa de velas
  for (let i = 0; i < 3; i++) { m.cilindro(S, [0, y + 4.5, 0], [raio * 0.76, 9], { cor: "#d9aa90", seg }); m.cilindro(V, [0, y + 4.5, 0], [raio * 0.775, 4.2], { cor: "#141b25", seg, aberto: true }); y += 9; }
  m.cilindro(S, [0, y + 1.1, 0], [raio * 1.05, 2.2], { cor: "#f6f3ec", seg }); y += 2.2;
  const rc = raio * 0.62, wv = raio * 0.74;
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2, px = Math.cos(a) * rc, pz = Math.sin(a) * rc, h = raio * 0.72;
    velaEm(m, px, y, pz, { w: wv, d: wv, h, sag: 2, cor: "#f4f1ea", mastro: 0, ry: -a });
    m.geo(S, MASTRO, { x: px, y: y + h + 8, z: pz, sx: 0.9, sy: 18, sz: 0.9, cor: "#f2f4f6" });
  }
  velaEm(m, 0, y, 0, { w: raio * 1.1, d: raio * 1.1, h: raio * 1.1, sag: 2.6, cor: "#f4f1ea", mastro: 0, ry: Math.PI / 4 });
  const yTopo = topo(y, raio * 1.1);
  m.geo(S, MASTRO, { x: 0, y: yTopo + 24, z: 0, sx: 1.2, sy: 52, sz: 1.2, cor: "#e6e9ec" });
  const g = m.montar("bahrein-torre");
  const bandeira = new THREE.Mesh(new THREE.PlaneGeometry(26, 15), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: tex(70, 40, (c, w, h) => {
    c.fillStyle = "#ce1126"; c.fillRect(0, 0, w, h); c.fillStyle = "#ffffff"; c.fillRect(0, 0, 14, h);
    for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(14, k * 8); c.lineTo(24, k * 8 + 4); c.lineTo(14, k * 8 + 8); c.fill(); }
  }) }));
  bandeira.position.set(14, yTopo + 40, 0); g.add(bandeira);
  g.position.set(x, tr.chao(x, z) + 0.3, z); add(g);
  tr.reservado ||= []; tr.reservado.push([x, z, raio * 2.3 + 16]);
  tr.torreAlSakhir = { x, y: z, alto: yTopo + 50 };
  return g;
}
