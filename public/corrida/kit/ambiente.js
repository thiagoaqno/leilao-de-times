// Kit de pista — os equipamentos de GP na beira: a cerca sobre o guard-rail, os painéis dos patrocinadores, os mastros
// com a bandeira do país, os postos dos fiscais (que vida.js anima, em tr.postosGP), as placas de 100 e 50 m antes das
// curvas e as guias luminosas do túnel. Tudo em InstancedMesh, sem luz nova.
//
// cfg: { marcas: nomes de marcas.js para os painéis, posto: a marca do posto, bandeira: [cor de cima, cor de baixo] (ou três cores: faixas verticais),
//        placas: as distâncias das placas de frenagem em metros (100 e 50), outdoors: as marcas dos outdoors de vida.js }
import * as THREE from "three";
import { canvasTex, M } from "../cena.js";
import { marcaTex, PATROCINIO } from "./marcas.js";
import { ocupado } from "./comum.js";

export function ambienteGP(tr, add, { marcas = PATROCINIO.slice(0, 9), posto = "f1", bandeira = [0xc42d38, 0xf0eee6], placas = [100, 50], outdoors = PATROCINIO } = {}) {
  const { pts, n, W } = tr, L = tr.wallLat < 1e9 ? tr.wallLat : W / 2 + 30, lotes = new Map();
  const metal = M(0x697780), branco = M(0xf0eee6), vermelho = M(0xc42d38), laranja = M(0xf27421), escuro = M(0x18242b), bandCima = M(bandeira[0]), bandBaixo = M(bandeira[1]), bandMeio = bandeira[2] != null ? M(bandeira[2]) : null;
  const luz = new THREE.MeshBasicMaterial({ color: 0xffdf9c, toneMapped: false });
  const placa = (texto, fundo, cor = "#ffffff") => new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (x, w, h) => {
    x.fillStyle = fundo; x.fillRect(0, 0, w, h); x.fillStyle = cor; x.fillRect(0, h - 6, w, 6);
    x.font = "900 65px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, w / 2, h / 2, w - 24);
  }, false) });
  const anuncios = marcas.map((nome) => new THREE.MeshBasicMaterial({ map: marcaTex(nome, 512, 128) })), painelPosto = new THREE.MeshBasicMaterial({ map: marcaTex(posto, 512, 128) });
  const distancias = placas.map(v => placa(String(v), "#f5f4ee", "#18242b"));
  tr.postosGP = []; tr.marcasGP = outdoors; // os outdoors de vida.js também levam as marcas
  const stats = tr.ambienteGP = { paineis: 0, postos: 0, placas: 0, bandeiras: 0, luzesTunel: 0, setores: [0, 0, 0, 0] };
  function caixa(mat, x, y, z, sx, sy, sz, ry = 0) {
    if (!lotes.has(mat)) lotes.set(mat, []);
    lotes.get(mat).push({ x, y, z, sx, sy, sz, ry });
  }
  // a entrada e a saída do corredor dos boxes (regras de F1) ficam livres de painel e cerca
  const bx = tr.t.boxes && window.F1Regras ? window.F1Regras.corredor(tr.t, n, W) : null;
  const naRampa = (i, lado) => { if (!bx || lado !== bx.lado) return false; const r = (((i - bx.i0) % n) + n) % n, ra = window.F1Regras.RAMPA + 3; return r <= (tr.t.muro ? bx.len + 3 : ra) || (r >= bx.len - ra && r <= bx.len + 3); }; // rua com guard-rail: o corredor inteiro fica livre, o guard-rail dá lugar à mureta
  function lugar(i, lado, lat = L + 1, raio = 12) {
    if (naRampa(i, lado)) return null;
    const p = pts[(i + n) % n], x = p.x + p.nx * lado * lat, z = p.y + p.ny * lado * lat;
    if (tr.noCorredor?.(x, z)) return null;
    // Distância exata a qualquer ponto do traçado, inclusive o trecho vizinho de um grampo e o outro lado de uma curva fechada
    // (nada pode estar mais perto da pista do que o deslocamento desenhado `lat`; a peça fica a `raio` do asfalto, no mínimo).
    const minimo = Math.max(lat - 3, W / 2 + raio);
    if (tr.distAt(x, z) < minimo || tr.distAt(x + p.tx * 16, z + p.ty * 16) < minimo || tr.distAt(x - p.tx * 16, z - p.ty * 16) < minimo) return null; // e as pontas das peças de 32
    return { p, x, z, h: p.h, ry: Math.atan2(-p.nx * lado, -p.ny * lado) };
  }
  for (let i = 0; i < n; i += 9) for (const lado of [-1, 1]) {
    const o = lugar(i, lado); if (!o) continue;
    const { p, x, z, h, ry } = o;
    if (tr.coberto?.(i)) {
      // Guias luminosas baixas; não acrescentam luzes dinâmicas nem atravessam o teto.
      caixa(luz, x - p.nx * lado * 3, h + 9, z - p.ny * lado * 3, 20, 0.8, 0.5, ry);
      stats.luzesTunel++; continue;
    }
    // Cerca sobre o guard-rail existente; postes altos e travessas seguem o relevo.
    caixa(metal, x, h + 24, z, 0.8, 24, 0.8);
    for (const altura of [15, 23, 34]) caixa(metal, x, h + altura, z, 32, 0.5, 0.5, ry);
    for (const deslocamento of [-12, -6, 6, 12]) caixa(metal, x + p.tx * deslocamento, h + 24, z + p.ty * deslocamento, 0.22, 22, 0.22);
    if (i % 27 === 0) {
      caixa(anuncios[(i / 27) % anuncios.length], x - p.nx * lado * 1.6, h + 7, z - p.ny * lado * 1.6, 30, 9, 0.6, ry);
      stats.paineis++; stats.setores[Math.floor(i / n * 4)]++;
    }
    if (i % 81 === 0) {
      caixa(metal, x, h + 31, z, 1, 38, 1);
      if (bandMeio) for (const [m, s] of [[bandCima, -1], [bandMeio, 0], [bandBaixo, 1]]) caixa(m, x + s * 5 * Math.cos(ry), h + 44.5, z - s * 5 * Math.sin(ry), 5, 9, 0.5, ry); // três faixas verticais (Itália)
      else { caixa(bandCima, x, h + 47, z, 15, 4.5, 0.5, ry); caixa(bandBaixo, x, h + 42.5, z, 15, 4.5, 0.5, ry); }
      stats.bandeiras++;
    }
  }
  // Postos compactos só onde há calçada livre, sem ocupar piscina, arquibancadas ou porto.
  for (let i = 20; i < n; i += 55) for (const lado of [-1, 1]) {
    if (tr.coberto?.(i)) continue;
    const o = lugar(i, lado, L + 30, 17); if (!o || ocupado(tr, o.x, o.z, i)) continue;
    const { x, z, ry } = o, h = tr.chao(x, z);
    caixa(escuro, x, h + 1, z, 23, 2, 20, ry);
    for (const s of [-1, 1]) caixa(metal, x + s * 9 * Math.cos(ry), h + 13, z - s * 9 * Math.sin(ry), 1, 24, 1);
    caixa(vermelho, x, h + 26, z, 26, 2, 23, ry);
    caixa(painelPosto, x, h + 19, z, 21, 6, 1, ry);
    // Equipamentos e dois fiscais enfileirados no posto, com capacete branco.
    for (const s of [-1, 1]) {
      caixa(laranja, x + s * 5, h + 7, z, 3.4, 8, 3, ry);
      caixa(branco, x + s * 5, h + 12, z, 3, 2.5, 3, ry);
    }
    stats.postos++; (tr.reservado ||= []).push([x, z, 22]); tr.postosGP.push({ x, z, h, ry, i }); // vida.js põe o fiscal com a bandeira
  }
  // Placas compactas de frenagem no lado de fora das curvas, apoiadas sobre a barreira.
  let ultima = -n;
  for (let i = 0; i < n; i += 3) {
    if (pts[i].k < 1 / 350 || i - ultima < n / 12) continue;
    ultima = i;
    const p = pts[i], q = pts[(i + 3) % n], lado = p.tx * q.ty - p.ty * q.tx > 0 ? -1 : 1;
    placas.forEach((distancia, j) => {
      const idx = (i - Math.round(distancia * 10 / 6) + n) % n, o = lugar(idx, lado, L + 6, 5);
      if (!o || tr.coberto?.(idx)) return;
      caixa(distancias[j], o.x, o.h + 22, o.z, 13, 9, 0.8, Math.atan2(-o.p.tx, -o.p.ty)); stats.placas++;
    });
  }
  const geo = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D();
  for (const [mat, lista] of lotes) {
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    lista.forEach((o, i) => { d.position.set(o.x, o.y, o.z); d.rotation.y = o.ry; d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.name = `${tr.id}-ambiente-gp`; m.receiveShadow = true; add(m);
  }
}
