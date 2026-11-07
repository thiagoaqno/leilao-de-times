// Kit de pista — o corredor dos boxes (regras de F1): a faixa de asfalto ao lado da reta, com a linha branca da entrada e a
// vermelha da saída, a mureta entre ela e a pista, o quadrado pintado onde cada carro para e as 11 garagens, uma por equipe,
// com a cor e o logo dela na fachada e no fundo. O traçado do corredor vem de `boxes` em ../pistas.js (frações da volta) e da conta de
// `F1Regras.corredor` (f1-regras.js), a mesma que o carro e os robôs usam para andar nele. Só pintura e cenário: quem
// segura o carro no corredor é box.js. Aparece só quando a sala usa as regras de F1 (`tr.mostrarBoxes`).
//
// cfg (tudo opcional):
//   asfalto: "#46484d"  — a cor do asfalto do corredor
//   cores: ["#e8002d", …] — a cor de cada garagem (11, uma por equipe); sem isso elas ficam cinzas até o jogo pintar (grp.userData.colorir)
//   mureta: true | false — a mureta entre a pista e o corredor (padrão: sim, menos onde a pista já tem muro de rua)
//   garagens: false — só o corredor e os quadrados pintados, sem as garagens (Mônaco)
import * as THREE from "three";
import { canvasTex } from "../cena.js";
import { lotes } from "./comum.js";

// uma garagem por equipe, na ordem de F1Regras.EQUIPES_GARAGEM (é por ela que cada carro acha a sua): [id, nome, cor]
const EQUIPES = [
  ["mclaren", "McLaren", "#ff8700"], ["ferrari", "Ferrari", "#e8002d"], ["mercedes", "Mercedes", "#27f4d2"], ["red-bull", "Red Bull", "#3671c6"],
  ["racing-bulls", "Racing Bulls", "#6692ff"], ["aston-martin", "Aston Martin", "#229971"], ["williams", "Williams", "#37bedd"],
  ["audi", "Audi", "#d7172f"], ["alpine", "Alpine", "#ff87bc"], ["haas", "Haas", "#c6cbd0"], ["cadillac", "Cadillac", "#c9a227"],
];
const equipeDa = (k) => EQUIPES[k % EQUIPES.length];
// o logo da equipe (o mesmo do resto do jogo, /api/corrida/logo/:id) desenhado num canvas: a fachada e o painel do fundo da garagem.
// O desenho sai na hora com o nome e é refeito quando a imagem chega (no Node dos testes não há Image, e fica só o nome).
function placaDaEquipe(id, nome, cor, w, h, comNome) {
  const pintar = (ctx, img) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, cor); g.addColorStop(1, "#111418"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff22"; ctx.fillRect(0, 0, w, h * 0.08); ctx.fillStyle = "#00000040"; ctx.fillRect(0, h * 0.92, w, h * 0.08);
    const lado = h * 0.78, x0 = comNome ? h * 0.12 : (w - lado * 1.6) / 2;
    if (img) {
      const r = Math.min((lado * (comNome ? 1.4 : 1.6)) / img.width, lado / img.height), iw = img.width * r, ih = img.height * r;
      ctx.shadowColor = "#0008"; ctx.shadowBlur = h * 0.06; ctx.drawImage(img, x0 + ((comNome ? lado * 1.4 : lado * 1.6) - iw) / 2, (h - ih) / 2, iw, ih); ctx.shadowBlur = 0;
    }
    if (comNome || !img) {
      ctx.fillStyle = "#ffffff"; ctx.font = `900 ${Math.round(h * 0.42)}px Arial, sans-serif`; ctx.textBaseline = "middle";
      ctx.textAlign = comNome ? "left" : "center"; ctx.fillText(nome.toUpperCase(), comNome ? x0 + lado * 1.4 + h * 0.15 : w / 2, h / 2, comNome ? w - (x0 + lado * 1.4 + h * 0.3) : w - 20);
    }
  };
  let ctx2 = null;
  const tex = canvasTex(w, h, (ctx) => { ctx2 = ctx; pintar(ctx, null); }, false);
  if (typeof Image !== "undefined" && ctx2) {
    const img = new Image(); img.decoding = "async";
    img.onload = () => { pintar(ctx2, img); tex.needsUpdate = true; };
    img.src = `/api/corrida/logo/${encodeURIComponent(id)}`;
  }
  return tex;
}

export function boxesGP(tr, add, cfg = {}) {
  const F = window.F1Regras, cor = F.corredor(tr.t, tr.n, tr.W); if (!cor) return;
  const { pts, n, W } = tr, lado = cor.lado, meia = cor.larguraCorredor / 2, grp = new THREE.Group(), L = lotes();
  grp.name = `${tr.id}-boxes`; grp.visible = !!tr.mostrarBoxes; tr.boxesGP = grp; add(grp);
  const latDe = (u) => cor.lat(u, lado * (W / 2 - 10)) + cor.centroAsfalto - cor.D, cores = cfg.cores;
  // o ponto da pista no ponto u (inteiro ou não) do corredor, com o lado `l`
  const em = (u, l) => {
    const i = cor.i0 + Math.floor(u), f = u - Math.floor(u), a = pts[i % n], b = pts[(i + 1) % n];
    const x = a.x + (b.x - a.x) * f + (a.nx + (b.nx - a.nx) * f) * l, y = a.y + (b.y - a.y) * f + (a.ny + (b.ny - a.ny) * f) * l;
    return { x, y, h: tr.chao(x, y) };
  };
  // uma fita de u0 a u1: de `la(u)` a `lb(u)`, na altura do chão + ya e + yb (iguais: fita deitada; lados iguais: parede)
  const fita = (mat, u0, u1, la, lb, ya, yb, vRep = 60) => {
    const l = L.de(mat), base = l.vs.length / 3, passos = Math.max(1, Math.ceil(u1 - u0));
    for (let k = 0; k <= passos; k++) {
      const u = u0 + ((u1 - u0) * k) / passos, a = em(u, la(u)), b = em(u, lb(u)), v = (u * 6) / vRep;
      l.vs.push(a.x, a.h + ya, a.y, b.x, b.h + yb, b.y); l.uv.push(0, v, 1, v);
      if (k < passos) { const q = base + k * 2; l.idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
  };
  const desloc = (f) => (u) => latDe(u) + f;
  // materiais: asfalto escuro, a linha branca, a vermelha e o concreto da mureta (na frente do asfalto da pista, sem brigar)
  const poly = (o) => new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...o });
  const asfalto = poly({ map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = cfg.asfalto || "#46484d"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 500; i++) { x.fillStyle = rr() < 0.5 ? "#0000001a" : "#ffffff12"; x.fillRect(rr() * w, rr() * hh, 2, 2); } }) });
  const branco = poly({ color: 0xf1f1ec, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), vermelho = poly({ color: 0xd8232a, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const concreto = poly({ map: canvasTex(32, 32, (x, w, hh, rr) => { x.fillStyle = "#b9b6ad"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 160; i++) { x.fillStyle = rr() < 0.5 ? "#00000018" : "#ffffff20"; x.fillRect(rr() * w, rr() * hh, 2, 2); } x.fillStyle = "#7f7c74"; x.fillRect(0, 0, w, 3); }) });
  const y0 = 0.62, fim = cor.len;
  fita(asfalto, 0, fim, desloc(-meia), desloc(meia), y0, y0);
  // as bordas do corredor (a linha branca do lado da pista é a "linha branca de entrada") e as linhas de entrada e saída
  fita(branco, 1, fim - 1, desloc(-meia + 0.4), desloc(-meia + 1.8), y0 + 0.04, y0 + 0.04);
  fita(branco, 1, fim - 1, desloc(meia - 1.8), desloc(meia - 0.4), y0 + 0.04, y0 + 0.04);
  // A linha entre a faixa rápida e a faixa das garagens deixa livre a passagem de quem não para.
  fita(branco, F.RAMPA, fim - F.RAMPA, desloc(-0.45), desloc(0.45), y0 + 0.04, y0 + 0.04);
  fita(branco, F.RAMPA - 1, F.RAMPA - 0.5, desloc(-meia), desloc(meia), y0 + 0.05, y0 + 0.05);
  fita(vermelho, fim - F.RAMPA, fim - F.RAMPA + 0.5, desloc(-meia), desloc(meia), y0 + 0.05, y0 + 0.05);
  // Entrada destacada: guias amarelas e setas no asfalto levam da pista à rampa.
  // Os desenhos usam a mesma curva do corredor, inclusive em pistas com o box à esquerda.
  const amarelo = poly({ color: 0xffd52a, emissive: 0x342500, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const guia = (u) => cor.lat(u, lado * (W / 2 - 8));
  for (let u = 0; u < F.RAMPA; u += 3) {
    const a = u, b = Math.min(u + 1.8, F.RAMPA);
    fita(amarelo, a, b, (v) => guia(v) - lado * 8, (v) => guia(v) - lado * 6.4, y0 + 0.10, y0 + 0.10);
    fita(amarelo, a, b, (v) => guia(v) + lado * 6.4, (v) => guia(v) + lado * 8, y0 + 0.10, y0 + 0.10);
  }
  for (const u of [2, 6, 10]) {
    const ponta = em(u + 2, guia(u + 2)), esq = em(u, guia(u) - lado * 5), dir = em(u, guia(u) + lado * 5);
    const l = L.de(amarelo), base = l.vs.length / 3;
    for (const p of [ponta, esq, dir]) { l.vs.push(p.x, p.h + y0 + 0.11, p.y); l.uv.push(0, 0); }
    l.idx.push(base, base + 1, base + 2);
  }
  // Placa alta, voltada para quem chega, visível mesmo quando há carros sobre a pintura.
  const placaTex = canvasTex(512, 160, (x, w, h) => {
    x.fillStyle = "#101418"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffd52a"; x.fillRect(0, 0, w, 12); x.fillRect(0, h - 12, w, 12);
    x.fillStyle = "#fff"; x.font = "900 82px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("PIT ENTRY", w / 2, h / 2);
  });
  const pEntrada = em(1, lado * (W / 2 + 40)), qEntrada = pts[(cor.i0 + 1) % n];
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(55, 17), new THREE.MeshBasicMaterial({ map: placaTex, side: THREE.DoubleSide }));
  placa.position.set(pEntrada.x, pEntrada.h + 31, pEntrada.y); placa.rotation.y = Math.atan2(-qEntrada.tx, -qEntrada.ty); placa.name = `${tr.id}-entrada-box-placa`; grp.add(placa);
  // a mureta entre a pista e o corredor, só no trecho reto (nas rampas o carro cruza); pista de rua já tem o guard-rail
  if ((cfg.mureta ?? !tr.t.walls) !== false) {
    const lm = (u) => lado * (W / 2 + 12.5), a = F.RAMPA + 1, b = fim - F.RAMPA - 1, alt = 3.6;
    fita(concreto, a, b, lm, lm, 0, alt, 8); fita(concreto, a, b, (u) => lm(u) + lado * 2.4, (u) => lm(u) + lado * 2.4, alt, 0, 8);
    fita(concreto, a, b, lm, (u) => lm(u) + lado * 2.4, alt, alt, 8);
  }
  L.montar((o) => (grp.add(o), o), `${tr.id}-boxes`);
  // as garagens, os mecânicos e o quadrado pintado onde o carro para: tudo numa malha só, com a cor nos vértices. As
  // partes na cor da equipe ficam anotadas em "faixas" para "colorir" trocar (jogo.js pinta com a cor de quem usa cada uma)
  const geo = { vs: [], cs: [] }, faixas = cor.garagens.map(() => []), cor3 = (c) => new THREE.Color(c);
  // caixa com o centro em (a ao longo da pista, b para o lado de fora), de altura sy a partir de y, nos eixos da pista no ponto q
  const caixa = (q, tx, ty, nx, ny, a, b, y, sa, sb, sy, c, k = -1) => {
    const col = cor3(c), v0 = geo.vs.length / 3, cantos = [];
    for (const [ka, kb, ky] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) {
      const pa = a + (ka * sa) / 2, pb = b + (kb * sb) / 2;
      cantos.push([q.x + tx * pa + nx * pb, q.h + y + ((ky + 1) / 2) * sy, q.y + ty * pa + ny * pb]);
    }
    for (const f of [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]]) for (const i of [f[0], f[1], f[2], f[0], f[2], f[3]]) { geo.vs.push(...cantos[i]); geo.cs.push(col.r, col.g, col.b); }
    if (k >= 0) faixas[k].push([v0, geo.vs.length / 3]);
  };
  const fundo = 16, alt = 14, pele = "#e2b48c", cinza = "#8c8f96", comGaragem = cfg.garagens !== false;
  // a garagem só é construída onde nenhum outro trecho da pista passa mais perto do que ela está do próprio (Mônaco, Zandvoort...)
  const garagemLivre = (ref, tx, ty, nx, ny, largura) => [0, fundo + 3].every((b) => [-1, 0, 1].every((s) => tr.distAt(ref.x + nx * b + tx * s * largura / 2, ref.y + ny * b + ty * s * largura / 2) >= Math.abs(cor.garagemLat) + meia / 2 + b - 4));
  cor.garagens.forEach((u, k) => {
    const i = cor.i0 + Math.floor(u), p = pts[i % n], tx = p.tx, ty = p.ty, nx = p.nx * lado, ny = p.ny * lado;
    const largura = Math.max(18, cor.gap * 6 * 0.92), q = em(u, cor.garagemLat), [idEq, nomeEq, corEq] = equipeDa(k), c = cfg.cores?.[k % cfg.cores.length] || corEq;
    const ref = { x: q.x + nx * (meia / 2), y: q.y + ny * (meia / 2), h: q.h }; // a borda externa da faixa das garagens
    if (comGaragem && garagemLivre(ref, tx, ty, nx, ny, largura)) {
      caixa(ref, tx, ty, nx, ny, 0, fundo - 0.7, -9, largura, 1.4, 9 + alt, "#2b2e34"); // o fundo, escuro, onde fica o painel com o logo
      caixa(ref, tx, ty, nx, ny, 0, fundo - 1.5, alt - 3, largura, 0.4, 1.2, c, k); // o friso na cor da equipe no alto do fundo
      for (const s of [-1, 1]) caixa(ref, tx, ty, nx, ny, s * (largura / 2 - 0.4), fundo / 2, -9, 0.8, fundo, 9 + alt, "#d9d7d0"); // as laterais
      for (const s of [-1, 1]) caixa(ref, tx, ty, nx, ny, s * (largura / 2 - 1.2), fundo / 2, 0, 0.6, fundo - 1, 1.6, c, k); // o rodapé na cor da equipe
      caixa(ref, tx, ty, nx, ny, 0, fundo / 2, 0.62, largura - 1.6, fundo - 1.4, 0.1, "#c9ccd2"); // o piso de resina
      caixa(ref, tx, ty, nx, ny, 0, fundo / 2, 0.74, 1.2, fundo - 2, 0.04, c, k); // a faixa no piso
      caixa(ref, tx, ty, nx, ny, 0, fundo / 2 - 1.5, alt, largura + 1.4, fundo + 3, 1.2, "#e4e2dc"); // o teto, saindo para o corredor
      caixa(ref, tx, ty, nx, ny, 0, -2.4, alt - 6, largura + 1.4, 1.2, 6, "#15181d"); // a fachada (o painel com o logo vai na frente)
      // os pneus empilhados dos dois lados, com a faixa do composto, e a bancada de ferramentas no fundo
      for (const s of [-1, 1]) for (let j = 0; j < 4; j++) {
        caixa(ref, tx, ty, nx, ny, s * (largura / 2 - 3.2), fundo - 4, 0.7 + j * 1.5, 3.2, 3.2, 1.4, "#1a1a1c");
        caixa(ref, tx, ty, nx, ny, s * (largura / 2 - 3.2), fundo - 4, 0.7 + j * 1.5 + 0.55, 3.3, 3.3, 0.3, ["#e8202a", "#ffd100", "#f4f4f4", "#39c85a"][(j + (s > 0 ? 1 : 0)) % 4]);
      }
      caixa(ref, tx, ty, nx, ny, 0, fundo - 2.6, 0.7, largura * 0.45, 2.4, 3.6, "#5d6168"); caixa(ref, tx, ty, nx, ny, 0, fundo - 2.6, 4.3, largura * 0.45, 2.6, 0.3, c, k);
      // o painel da fachada (logo e nome) e o do fundo (só o logo, grande): o logo de verdade da equipe
      const fachada = new THREE.Mesh(new THREE.PlaneGeometry(largura, 5.2), new THREE.MeshBasicMaterial({ map: placaDaEquipe(idEq, nomeEq, c, 640, 104, true), side: THREE.DoubleSide }));
      fachada.position.set(ref.x - nx * 3.05, ref.h + alt - 3, ref.y - ny * 3.05); fachada.rotation.y = Math.atan2(-nx, -ny); // virada para o corredor (quem passa lê o nome) fachada.name = `${tr.id}-garagem-${idEq}`;
      grp.add(fachada);
      const fundoLogo = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(largura - 4, 16), 7), new THREE.MeshBasicMaterial({ map: placaDaEquipe(idEq, nomeEq, c, 384, 168, false), side: THREE.DoubleSide }));
      const pf = fundo - 1.45; fundoLogo.position.set(ref.x + nx * pf, ref.h + alt - 6.5, ref.y + ny * pf); fundoLogo.rotation.y = Math.atan2(-nx, -ny);
      grp.add(fundoLogo);
      caixa(ref, tx, ty, nx, ny, 0, fundo + 0.2, alt + 1.2, 7, 1, 6, c, k); caixa(ref, tx, ty, nx, ny, 0, fundo + 0.2, alt + 6.8, 9, 1, 1.4, "#f4f4f4"); // a placa da garagem em cima do teto
      // os mecânicos da equipe: macacão da cor dela e capacete, em fila na frente da garagem
      for (const s of [-1.5, -0.5, 0.5, 1.5]) {
        caixa(ref, tx, ty, nx, ny, s * 5, 2.2, 0, 2.2, 1.8, 5.2, c, k);
        caixa(ref, tx, ty, nx, ny, s * 5, 2.2, 5.2, 1.8, 1.6, 1.8, pele);
        caixa(ref, tx, ty, nx, ny, s * 5, 2.2, 6.6, 2.1, 1.9, 1, "#f4f4f4");
      }
    }
    caixa(q, tx, ty, nx, ny, 0, 0, 0.7, 13, 8.5, 0.05, c, k); // o quadrado pintado no corredor onde o carro para
    caixa(q, tx, ty, nx, ny, 0, 0, 0.78, 11.5, 7, 0.05, "#2c2e33");
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(geo.vs, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(geo.cs, 3)); g.computeVertexNormals();
  const malha = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
  malha.castShadow = malha.receiveShadow = true; malha.name = `${tr.id}-garagens`; grp.add(malha);
  // pinta as partes da equipe de cada garagem: cores[k] (ou cinza) vale para a garagem k
  grp.userData.colorir = (cores) => {
    const atr = g.attributes.color;
    faixas.forEach((lista, k) => { const col = cor3(cores[k] || cfg.cores?.[k] || equipeDa(k)[2]); for (const [v0, v1] of lista) for (let v = v0; v < v1; v++) atr.setXYZ(v, col.r, col.g, col.b); });
    atr.needsUpdate = true;
  };
  // os balizadores que ficariam no meio do corredor saem de cena enquanto ele aparece (as regras de F1)
  const noCorredor = (tr.cones || []).filter((co) => { for (let u = 0; u <= fim; u += 3) { const q = em(u, latDe(u)); if (Math.hypot(q.x - co.x, q.y - co.y) < meia + 6) return true; } return false; });
  grp.userData.mostrar = (on) => { grp.visible = on; for (const m of tr.guardaBox || []) m.visible = !on; for (const co of noCorredor) { co.mesh.visible = !on; co.cooldown = on ? Infinity : 0; } };
  // os enfeites soltos de depois não entram em cima das garagens
  for (let u = F.RAMPA; u <= fim - F.RAMPA; u += 8) { const q = em(u, cor.D + lado * 28); if (comGaragem) tr.reservado.push([q.x, q.y, 50]); }
  grp.userData.mostrar(!!tr.mostrarBoxes);
  tr.boxesInfo = { garagens: cor.garagens.length, comprimento: cor.comprimento, lado };
}
