// Corrida da Galera — o carro na pista, a 120 passos por segundo (UMD: o navegador prevê com ele e o servidor manda com ele).
// Une a dinâmica do carro (dinamica.js) com a pista (relevo, muros, grama), o pneu, o DRS, o ERS, o vácuo, o corredor dos
// boxes, os checkpoints e as batidas das regras de F1 (f1-regras.js). Nada aqui depende do tempo do quadro: o estado só anda
// de `passo` em `passo` (PASSO = 1/120 s), com a entrada daquele passo. O mesmo estado e a mesma entrada dão o mesmo
// resultado no navegador e no servidor, e é isso que permite ao navegador prever e ao servidor ser a autoridade.
//
//   const tr = Sim.criarPista(PISTAS.interlagos, "interlagos");        // no servidor (o navegador usa o `tr` de pista.js)
//   const c = Sim.novo(tr, { grid: 3, f1: true, pneu: F1.pneuNovo("medio"), box: true, voltas: 3 });
//   Sim.passo(c, { gas: 1, brake: 0, steer: -0.4 }, amb, tr, eventos);   // amb: ver `ambiente` abaixo
(function (root) {
const D = root.Dinamica || require("./dinamica.js");
const P = root.Pistas || require("./pistas.js");
const F1 = root.F1Regras || require("./f1-regras.js");

const { ESC, PASSO } = D;
const GRAV_Z = 160;          // a gravidade do voo (a vertical continua a do jogo: a lombada dá voo curto)
const SECTORS = P.SECTORS;
const limite = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- a pista para a física ----------
// Os mesmos pontos de pista.js (de 6 em 6 unidades, com a normal) e as mesmas barreiras, sem nada de Three.js.
const PISTAS_FISICAS = new Map();
function criarPista(t, id) {
  if (id && PISTAS_FISICAS.has(id)) return PISTAS_FISICAS.get(id);
  const pts = P.pontos(t, 6), n = pts.length, W = t.width;
  for (const p of pts) { p.nx = -p.ty; p.ny = p.tx; }
  const tr = { id, t, pts, n, W, wallLat: t.walls ? W / 2 + t.wall : Infinity, pneus: new Int8Array(n) };
  if (t.superficieEscape) tr.superficiesEscape = P.mapaSuperficies(pts, t.superficieEscape);
  if (t.escapeLivre) tr.murosEscape = P.murosDoEscape(pts, W, tr.superficiesEscape, t);
  if (!t.espaco && !t.muro && !t.escapeLivre) { // barreiras de pneus: do lado de fora das curvas fechadas (o mesmo cálculo de pista.js)
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 3) % n]; if (!(p.k > 1 / 170)) continue;
      const fora = p.tx * q.ty - p.ty * q.tx > 0 ? -1 : 1;
      for (let j = i - 4; j <= i + 4; j++) tr.pneus[(j + n) % n] = fora;
    }
  }
  if (id === "montreal") {
    const m = P.muroCampeoes(pts);
    if (m) for (let i = m.i0; i <= m.i1; i++) tr.pneus[i % n] = m.lado;
  }
  if (id) PISTAS_FISICAS.set(id, tr);
  return tr;
}
// o que a física exige de qualquer `tr` (o do navegador já tem tudo, menos o corredor, que se calcula uma vez)
function preparar(tr) { if (!tr.pneus) tr.pneus = new Int8Array(tr.n); if (tr.t.boxes && tr.corredor === undefined) tr.corredor = F1.corredor(tr.t, tr.n, tr.W); return tr; }

// o ponto da pista mais perto (já sabendo o índice), com a altura e a distância de lado
function quadro(tr, x, y, idx) {
  const pts = tr.pts, n = tr.n, a = pts[idx], b = pts[(idx + 1) % n], c = pts[(idx - 1 + n) % n];
  let l2 = 0, dx = b.x - a.x, dy = b.y - a.y; l2 = dx * dx + dy * dy || 1;
  let k = limite(((x - a.x) * dx + (y - a.y) * dy) / l2, 0, 1), px = a.x + dx * k, py = a.y + dy * k;
  let d2 = (x - px) ** 2 + (y - py) ** 2, h = a.h + (b.h - a.h) * k;
  dx = a.x - c.x; dy = a.y - c.y; l2 = dx * dx + dy * dy || 1;
  const k2 = limite(((x - c.x) * dx + (y - c.y) * dy) / l2, 0, 1), px2 = c.x + dx * k2, py2 = c.y + dy * k2, d22 = (x - px2) ** 2 + (y - py2) ** 2;
  if (d22 < d2) { d2 = d22; px = px2; py = py2; h = c.h + (a.h - c.h) * k2; }
  return { h, lat: (x - px) * a.nx + (y - py) * a.ny };
}
function alturaDoChao(tr, x, y, idx) {
  const f = quadro(tr, x, y, idx), t = tr.t, off = Math.abs(f.lat) - tr.W / 2 - t.flat;
  return f.h * (off <= 0 ? 1 : Math.max(0, 1 - off / t.fall));
}
// o ponto da pista mais perto de (x, y): procura perto do último, ou na pista toda
function procurar(tr, x, y, de) {
  let best = de, bd = Infinity;
  const pts = tr.pts, n = tr.n;
  const varre = (i0, i1, st = 1) => { for (let k = i0; k <= i1; k += st) { const i = (k + n) % n, p = pts[i], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } } };
  varre(de - 40, de + 40);
  if (bd > 160 * 160) { varre(0, n - 1, 2); varre(best - 3, best + 3); }
  return best;
}
// a posição de largada g: atrás da linha, em duas filas (nas regras de F1 as filas ficam a 25,2 pontos uma da outra, em média)
function vagaDoGrid(pts, g, W, f1 = false) {
  const n = pts.length, idx = (n - 6 - Math.round(Math.floor(g / 2) * (f1 ? 25.2 : 13)) + n * 2) % n, p = pts[idx], nx = -p.ty, ny = p.tx, lado = g % 2 ? 1 : -1, lat = lado * W * 0.22;
  return { x: p.x + nx * lat, y: p.y + ny * lat, tx: p.tx, ty: p.ty, nx, ny, a: Math.atan2(p.ty, p.tx), idx };
}

// ---------- o estado do carro ----------
function novo(tr, o = {}) {
  preparar(tr);
  const v = vagaDoGrid(tr.pts, o.grid || 0, tr.W, o.f1 !== false);
  const c = D.novoCarro(v.x, v.y, v.a);
  Object.assign(c, { z: tr.pts[v.idx].h, vz: 0, gvz: 0, air: false, idx: v.idx, prog: v.idx - tr.n, sector: SECTORS - 1, perdeu: -1, wrong: 0, sp: null,
    draft: 0, tick: o.tick || 0, fant: false, offroad: false, drsAtivo: false, ersAtivo: false, arSujo: 0, gridIdx: v.idx,
    pneu: o.pneu || F1.pneuNovo(), ers: F1.ersNovo(), box: o.box && tr.corredor ? caixaDoBox(tr) : null });
  return c;
}
const caixaDoBox = (tr) => ({ cor: tr.corredor, pedido: null, fase: null, u: 0, lat0: 0, t: 0, parada: 0, garagem: 0, composto: null, volta: 0, n: 0 });

// o pneu da largada: na classificação, macio novo e já quente (ou o de chuva, se a pista abre molhada: `agua` é a água na pista
// quando a sessão abre); na corrida, o escolhido na sala, frio
function pneuDaLargada(fase, composto, agua = 0) {
  if (fase !== "quali") return F1.pneuNovo(composto);
  const pn = F1.pneuNovo(F1.compostoDaClassificacao(agua)); pn.temp = 0.8; return pn;
}

// ---------- a entrada de um passo, em um número só ----------
// bits 0 acelerador · 1 freio · 2 ERS · 3 voltar à pista · 4-5 pedido de box (0 nenhum, 1 macio, 2 médio, 3 duro) ·
// 6-9 marcha do câmbio manual (0 = automático) · 10-18 volante (0..510 → -1..1) · 19 o bit alto do pedido de box (4 = chuva)
const COMPOSTOS = ["macio", "medio", "duro", "chuva"];
function empacotar(e) {
  const st = Math.round(limite(e.steer || 0, -1, 1) * 255) + 255, pd = e.pedido ? COMPOSTOS.indexOf(e.pedido) + 1 : 0;
  return (e.gas ? 1 : 0) | (e.brake ? 2 : 0) | (e.ers ? 4 : 0) | (e.respawn ? 8 : 0) | ((pd & 3) << 4) | ((pd >> 2) << 19) | (limite(e.marcha || 0, 0, 15) << 6) | (st << 10);
}
function desempacotar(n, saida = {}) {
  saida.gas = n & 1; saida.brake = (n >> 1) & 1; saida.ers = (n >> 2) & 1; saida.respawn = (n >> 3) & 1;
  const pd = ((n >> 4) & 3) | (((n >> 19) & 1) << 2); saida.pedido = pd ? COMPOSTOS[pd - 1] : null;
  saida.marcha = (n >> 6) & 15; saida.steer = (((n >> 10) & 511) - 255) / 255;
  return saida;
}

// ---------- o vácuo ----------
// Logo atrás de outro carro (até ~17 m, na mesma linha e na mesma direção) o ar empurra menos. Devolve 0..1 (1 = colado).
// outros: [{ x, y, z, a, dnf, fant }]
function vacuoAlvo(c, outros) {
  if (c.air || c.v <= 120 || !outros) return 0;
  const fx = Math.cos(c.a), fy = Math.sin(c.a);
  let d = 0;
  for (const o of outros) {
    if (o.dnf || o.fant) continue;
    const dx = o.x - c.x, dy = o.y - c.y, along = dx * fx + dy * fy, lat = Math.abs(-dx * fy + dy * fx);
    if (along < 22 || along > 170 || lat > 24 || Math.abs((o.z || 0) - c.z) > 15 || Math.cos(o.a - c.a) < 0.9) continue;
    d = Math.max(d, 1 - (along - 22) / 148);
  }
  return d;
}

// ---------- o piloto automático (o fantasma depois da bandeirada; os robôs também podem usar) ----------
// Segue a pista a `latAlvo` do meio e a `vAlvo` (u/s). Devolve a entrada do passo.
// O volante do piloto automático (robôs e fantasma): olha LD_K s à frente; soma ao ângulo de roda o contra-esterço pela deriva da traseira
// (K_TRASEIRA rad de roda por rad de deriva: segura a saída de curva) e a diferença entre a guinada pedida e a que o carro faz (K_GUINADA).
const LD_K = 0.6, K_TRASEIRA = 2, K_GUINADA = 0.5;
function pilotoAutomatico(c, tr, spec, vAlvo, latAlvo, saida = {}) {
  const p = D.parametros(spec), n = tr.n, v = Math.max(c.v, 30), Ld = Math.max(22, v * LD_K);
  let j = c.idx, acc = 0; while (acc < Ld) { j = (j + 1) % n; acc += 6; }
  const q = tr.pts[j], la = typeof latAlvo === "function" ? latAlvo(j) : latAlvo, tx = q.x + q.nx * la, ty = q.y + q.ny * la;
  let e = Math.atan2(ty - c.y, tx - c.x) - c.a; e = Math.atan2(Math.sin(e), Math.cos(e));
  if (c.amb && c.amb.pn && c.amb.pn.arcade) saida.steer = D.volanteParaGuinada(p, Math.max(0, c.v), (2 * Math.sin(e) / Ld) * Math.max(0, c.v)); // macio (arcade): o volante dá guinada, não ângulo de roda
  else { const delta = Math.atan2(2 * p.L * Math.sin(e), Ld * ESC) + K_TRASEIRA * (c.alR || 0) + K_GUINADA * (2 * Math.sin(e) / Ld * v - (c.r||0)) * p.L / Math.max(v * ESC,20), dm = D.volanteMaximo(p, Math.max(0, c.v) * ESC); saida.steer = limite(delta / dm, -1, 1); }
  saida.gas = c.v < vAlvo ? 1 : 0; saida.brake = c.v > vAlvo * 1.04 ? 1 : 0; if (saida.brake) saida.gas = 0;
  saida.ers = 0; saida.respawn = 0; saida.pedido = null; saida.marcha = 0;
  return saida;
}

// ---------- um passo ----------
// amb (o ambiente, que quem chama monta a cada passo):
//   spec (o carro: carOf), manual (câmbio manual da sala), dano (%), drsZona (a zona liberada pela direção de prova, ou -1),
//   amarela (o setor atual está sob bandeira amarela), safety, ersAuto (false = o ERS é pelo comando), voltas (da corrida),
//   laps (as voltas que já completei), paradas (quantas já fiz), semente, id, grid, finish (já recebi a bandeirada?),
//   segurar (o carro fica parado: antes da largada), dnf (perda total), outros (os carros em volta, para o vácuo),
//   quali (classificação: sem box), f1 (regras de F1: pneu, DRS, ERS), agua (a água na pista, 0 a 1: F1.climaEm)
// ev (opcional): lista onde o passo põe o que aconteceu: { t: "muro"|"bump"|"setor"|"box"|"pouso"|"respawn", ... }
const SAIDA = {}, ENT_AUTO = {};
function passo(c, ent, amb, tr, ev) {
  const dt = PASSO, spec = amb.spec, p = D.parametros(spec), n = tr.n;
  c.tick++;
  c.x0 = c.x; c.y0 = c.y; c.a0 = c.a; // onde o carro estava no começo do passo (a varredura da batida)
  if (amb.dnf) { c.v = c.vl = c.r = c.vx = c.vy = 0; c.gasP = c.brkP = 0; return; }
  if (amb.segurar) {
    c.v = c.vl = c.r = c.vx = c.vy = 0; c.gasP = c.brkP = 0; c.slip = 0; c.travada = 0; c.patina = 0;
    c.steer += (limite(ent.steer || 0, -1, 1) - c.steer) * Math.min(1, dt * 10); c.rpm = 0.3 + 0.2 * (c.gasP || 0);
    c.idx = procurar(tr, c.x, c.y, c.idx);
    return;
  }
  if (ent.respawn) voltarParaPista(c, tr, ev);
  if (c.fant) ent = pilotoAutomatico(c, tr, spec, 70, (c.latFant ?? (c.latFant = Math.sign(quadro(tr, c.x, c.y, c.idx).lat || 1) * (tr.W / 2 - 30))), ENT_AUTO);
  c.fant = c.fant || !!amb.fantasma;
  // o corredor dos boxes: o carro anda sozinho
  if (c.box && passoBox(c, ent, amb, tr, p, ev)) { fechar(c, tr, amb, ev); return; }
  const fr0 = quadro(tr, c.x, c.y, c.idx), superficie = tr.t.superficieEscape ? P.superficieEscape(tr, c.idx, fr0.lat) : (Math.abs(fr0.lat) <= tr.W / 2 + 6 ? "asfalto" : "grama"), estrada = superficie === "asfalto";
  const fx = Math.cos(c.a), fy = Math.sin(c.a);
  // o vácuo e o ar sujo
  const alvo = vacuoAlvo(c, amb.outros);
  c.draft += (alvo - c.draft) * Math.min(1, dt * 4);
  const pn = F1.aderencia(c.pneu, amb.agua), dano = F1.efeitoDoDano(amb.dano);
  const curva = (tr.pts[c.idx].k || 0) > 1 / 600, vac = F1.vacuoF1(c.draft, curva);
  c.arSujo = 1 - vac.aderencia;
  // DRS e ERS
  const zona = F1.zonaDRS(c.idx / n, tr.t.drs);
  const drs = !!(amb.drsZona === zona && zona >= 0 && !ent.brake && !amb.amarela && !amb.safety);
  F1.carregarErs(c.ers, dt, !!ent.brake && c.v > 40, !ent.gas, amb.laps || 0);
  const usarErs = !!(ent.gas && !amb.safety && (amb.ersAuto !== false ? F1.usarErsAuto(c.ers.carga, c.v, spec.vmax, (tr.pts[c.idx].k || 0) < 1e-4, c.draft > 0.25) : ent.ers));
  const ersAtivo = F1.gastarErs(c.ers, dt, usarErs, amb.ersAuto === false || c.draft > 0.25); // (overtake: colado no da frente, ou o botão no modo manual; senão o gasto suave da reta)
  c.drsAtivo = drs; c.ersAtivo = ersAtivo;
  // o relevo: a gravidade puxa para baixo da pista
  const h0 = alturaDoChao(tr, c.x, c.y, c.idx), h1 = alturaDoChao(tr, c.x + fx * 10, c.y + fy * 10, c.idx);
  const bandeira = amb.safety ? 0.54 : amb.amarela ? 0.82 : 1;
  const amb2 = c.amb || (c.amb = {});
  amb2.chao = estrada; amb2.superficie = superficie; amb2.subida = (h1 - h0) / 10; amb2.ar = c.air; amb2.manual = !!amb.manual; amb2.marchaManual = ent.marcha || c.marcha;
  amb2.pn = pn; amb2.dano = dano; amb2.drs = drs; amb2.ers = ersAtivo; amb2.vacuo = vac; amb2.curva = curva;
  amb2.limiteV = bandeira < 1 ? bandeira * spec.vmax * pn.final * dano.final * (1 + (drs ? 0.05 * (spec.drs ?? 1) : 0)) : Infinity;
  // a dinâmica
  const xAnt = c.x, yAnt = c.y;
  D.passo(c, ent, amb2, p, dt);
  // anda; no muro escorrega junto dele (o muro fica a uma distância fixa do meio da pista)
  let nx = c.x, ny = c.y;
  c.idx = procurar(tr, nx, ny, c.idx);
  const fr = quadro(tr, nx, ny, c.idx), lim = tr.wallLat - (tr.t.muroFolga ?? 8);
  const pneu = tr.pneus && tr.pneus[c.idx], lado = Math.sign(fr.lat) || 1;
  const limiteL = Math.min(P.limiteViaduto(tr.t, tr.n, c.idx, tr.W), tr.murosEscape?.[lado]?.[c.idx] ? tr.W / 2 + tr.murosEscape[lado][c.idx] - 8 : pneu && lado === pneu ? tr.W / 2 + 26 : lim);
  if (Math.abs(fr.lat) > limiteL || nx < 2 || ny < 2 || nx > tr.t.world - 2 || ny > tr.t.world - 2) {
    const q = tr.pts[c.idx], s = Math.sign(fr.lat) || 1, over = Math.abs(fr.lat) - limiteL;
    if (over > 0) { nx -= q.nx * s * over; ny -= q.ny * s * over; }
    nx = limite(nx, 2, tr.t.world - 2); ny = limite(ny, 2, tr.t.world - 2);
    const vn = c.vx * q.nx * s + c.vy * q.ny * s, hit = Math.abs(vn);
    // a batida tira a velocidade que ia contra o muro (com um quiquezinho) e, do resto, perde mais quanto mais de frente bateu
    if (vn > 0) { c.vx -= q.nx * s * vn * 1.2; c.vy -= q.ny * s * vn * 1.2; }
    const pancada = 1 - (1 - spec.wall) * 0.5 * ALIVIO * Math.min(1, hit / 260) * (vn > 0 ? 1 : 0), raspa = Math.exp(-(1 - spec.wall) * 0.7 * dt);
    c.vx *= pancada * raspa; c.vy *= pancada * raspa;
    const ca = Math.cos(c.a), sa = Math.sin(c.a); c.v = c.vx * ca + c.vy * sa; c.vl = -c.vx * sa + c.vy * ca;
    if (vn > 0 && ev) { if (hit > 60) ev.push({ t: "bump", forca: hit }); ev.push({ t: "muro", forca: hit }); }
  }
  // a mureta do corredor dos boxes é de verdade: quem não vai parar fica na pista
  if (c.box && !c.box.fase && tr.mostrarBoxes !== false) {
    const sobra = muretaDoBox(tr, c.idx, fr.lat, c.box.cor);
    if (sobra) {
      const q = tr.pts[c.idx], s = sobra.lado, vn = (c.vx * q.nx + c.vy * q.ny) * s;
      nx -= q.nx * s * sobra.over; ny -= q.ny * s * sobra.over;
      if (vn > 0) { c.vx -= q.nx * s * vn * 1.2; c.vy -= q.ny * s * vn * 1.2; const ca = Math.cos(c.a), sa = Math.sin(c.a); c.v = c.vx * ca + c.vy * sa; c.vl = -c.vx * sa + c.vy * ca; if (vn > 60 && ev) ev.push({ t: "bump", forca: vn }); }
    }
  }
  if (amb.f1 !== false) F1.gastarPneu(c.pneu, { dist: Math.hypot(nx - xAnt, ny - yAnt), volta: n * 6, slip: c.slip, travada: c.travada, patina: c.patina, v: c.v, vmax: spec.vmax, dt, fator: spec.desgaste, agua: amb.agua });
  c.x = nx; c.y = ny;
  // altura: no chão acompanha o relevo; se o chão some (lombada rápida), voa e cai com a gravidade
  const gh = alturaDoChao(tr, c.x, c.y, c.idx);
  if (c.air) {
    c.vz -= GRAV_Z * dt; c.z += c.vz * dt;
    if (c.z <= gh) { const duro = -c.vz; c.z = gh; c.vz = 0; c.air = false; if (duro > 60 && ev) ev.push({ t: "pouso", forca: duro }); }
  } else if (gh < c.z - 2.5) { c.air = true; c.vz = Math.max(0, c.gvz || 0); c.z += c.vz * dt; }
  else { c.gvz = limite((gh - c.z) / dt, -400, 400); c.z = gh; }
  c.offroad = !estrada && !c.air && Math.abs(c.v) > 30;
  fechar(c, tr, amb, ev);
}
// o fim de todo passo: o progresso contínuo, os checkpoints e o resto da contabilidade
function fechar(c, tr, amb, ev) {
  const n = tr.n;
  let d = c.idx - (c.idxAnt ?? c.idx); if (d > n / 2) d -= n; else if (d < -n / 2) d += n;
  c.prog += d; c.idxAnt = c.idx;
  setores(c, tr, ev);
}
// checkpoints (como no Forza): o próximo só vale passando pelo portão dele, perto da pista e na ordem. Passou direto (cortou
// caminho)? Fica "perdido" até voltar nele, e o "↺ Pista" leva de volta para ele.
function setores(c, tr, ev) {
  const n = tr.n, prox = (c.sector + 1) % SECTORS, gi = P.checkpoint(prox, n), depois = (c.idx - gi + n) % n, fr = quadro(tr, c.x, c.y, c.idx);
  const ant = c.sp; c.sp = { x: c.x, y: c.y };
  const cruzou = !!ant && P.cruzouSetor(tr.pts, n, prox, ant.x, ant.y, c.x, c.y, c.z, tr.W / 2 + 70);
  if ((depois < 30 && Math.abs(fr.lat) < tr.W / 2 + 70) || cruzou) {
    c.sector = prox; if (ev) ev.push({ t: "setor", s: prox });
  }
  c.perdeu = !cruzou && depois >= 30 && depois < n / 3 ? prox : -1;
  const q = tr.pts[c.idx], dot = Math.cos(c.a) * q.tx + Math.sin(c.a) * q.ty;
  c.wrong = dot < -0.3 && c.v > 40 ? c.wrong + PASSO : 0;
}
// "↺ Pista": volta para o ponto em que estava (ou para antes do checkpoint perdido), parado
function voltarParaPista(c, tr, ev) {
  const n = tr.n;
  if (c.perdeu >= 0) c.idx = (P.checkpoint(c.perdeu, n) - 5 + n) % n;
  const q = tr.pts[c.idx];
  Object.assign(c, { x: q.x, y: q.y, z: q.h, vz: 0, air: false, a: Math.atan2(q.ty, q.tx), v: 0, vl: 0, r: 0, vx: 0, vy: 0, slip: 0, gasP: 0, brkP: 0, axL: 0, sp: { x: q.x, y: q.y } });
  if (ev) ev.push({ t: "respawn" });
}

// ---------- o pit stop ----------
// a mureta entre a pista e o corredor (a que kit/corredor-boxes.js desenha, a W/2 + 11): quanto o carro passou dela, só no trecho
// reto (nas rampas não tem mureta) e só um pouco (quem já está dentro do corredor não é empurrado)
function muretaDoBox(tr, idx, lat, cor) {
  const rel = (idx - cor.i0 + tr.n) % tr.n;
  if (rel <= F1.RAMPA + 1 || rel >= cor.len - F1.RAMPA - 1) return null;
  const over = lat * cor.lado - (tr.W / 2 + 11);
  return over > 0 && over < 10 ? { over, lado: cor.lado } : null;
}
// o ponto (x, y) do carro no corredor, no ponto u (em pontos da pista), saindo do lado lat0
function pontoDoBox(tr, cor, u, lat0, garagem) {
  const n = tr.n, i = cor.i0 + Math.floor(u), f = u - Math.floor(u), a = tr.pts[i % n], b = tr.pts[(i + 1) % n], lat = cor.latParada(u, garagem, lat0);
  return { x: a.x + (b.x - a.x) * f + (a.nx + (b.nx - a.nx) * f) * lat, y: a.y + (b.y - a.y) * f + (a.ny + (b.ny - a.ny) * f) * lat };
}
// um passo do carro no corredor; true enquanto o carro está nele (a física normal fica de fora)
function passoBox(c, ent, amb, tr, p, ev) {
  const B = c.box, cor = B.cor, spec = amb.spec, dt = PASSO, vlim = F1.LIMITADOR * spec.vmax;
  if (!B.fase) {
    B.pedido = ent.pedido || null;
    if (!B.pedido || amb.finish != null || c.air || (amb.laps || 0) + 1 >= (amb.voltas || 1) || amb.quali) return false;
    const rel = (c.idx - cor.i0 + tr.n) % tr.n;
    if (rel > 8) return false;
    const q = tr.pts[c.idx], lado = (c.x - q.x) * q.nx + (c.y - q.y) * q.ny, n = (amb.paradas || 0) + 1;
    // com um stop-and-go pendente (`amb.stopGo`: os segundos parado) a visita começa com ele: fica parado esses segundos SEM mexer no pneu e, se o
    // composto pedido é outro (`troca`), a equipe troca o pneu em seguida, na mesma parada, com o tempo normal da troca somado
    // `B.parada`/`B.t`: a parada em si (no stop-and-go, os segundos dele); `B.troca = { parada, t }`: a troca de pneu que vem logo depois (null se não troca)
    const stopGo = amb.stopGo > 0, atual = c.pneu ? c.pneu.composto : B.pedido, tempoTroca = F1.tempoDeParada(amb.semente, amb.id, n);
    Object.assign(B, { fase: "entra", u: rel + 0.5, lat0: lado, t: 0, composto: B.pedido, stopGo, troca: stopGo && B.pedido !== atual ? { parada: tempoTroca, t: 0 } : null, sg: stopGo ? amb.stopGo : 0, volta: (amb.laps || 0) + 1, n, parada: stopGo ? amb.stopGo : tempoTroca, garagem: F1.garagemDe(cor, amb.grid || 0), tick0: c.tick });
    if (ev) ev.push({ t: "box", fase: "entra", volta: B.volta, n, stopGo: stopGo || undefined });
  }
  const frena = 180, acel = 90; // o corredor tem o seu próprio jeito de frear e de arrancar
  const vai = (alvo, a) => { c.v = c.v > alvo ? Math.max(alvo, c.v - frena * dt) : Math.min(alvo, c.v + a * dt); };
  if (B.fase === "entra") {
    const falta = Math.max(0, B.garagem - B.u) * 6;
    vai(Math.min(vlim, Math.sqrt(2 * frena * 0.6 * falta)), acel);
    B.u = Math.min(B.garagem, B.u + (c.v * dt) / 6);
    if (B.u >= B.garagem - 0.02) { B.u = B.garagem; c.v = 0; B.fase = "parada"; B.t = 0; if (ev) ev.push({ t: "boxParou" }); }
  } else if (B.fase === "parada") {
    c.v = 0; B.t += dt;
    if (B.t >= B.parada) {
      if (B.troca) B.troca.t += dt; // o stop-and-go já foi cumprido: agora a equipe troca o pneu
      if (!B.troca || B.troca.t >= B.troca.parada) {
        const trocou = !B.stopGo || !!B.troca; // (parada normal, ou stop-and-go com troca)
        if (trocou) c.pneu = Object.assign(c.pneu, F1.pneuNovo(B.composto));
        B.fase = "sai"; if (ev && trocou) ev.push({ t: "boxTrocou" });
      }
    }
  } else {
    vai(vlim, acel); B.u = Math.min(cor.len, B.u + (c.v * dt) / 6);
  }
  const fim = B.u >= cor.len, a = pontoDoBox(tr, cor, B.u, B.lat0, B.garagem), b = pontoDoBox(tr, cor, Math.min(cor.len, B.u + 0.4), B.lat0, B.garagem);
  const saida = fim ? F1.saidaDoCorredor(cor, tr.pts) : null;
  c.a = saida ? saida.a : Math.atan2(b.y - a.y, b.x - a.x);
  c.x = a.x; c.y = a.y;
  c.vx = Math.cos(c.a) * c.v; c.vy = Math.sin(c.a) * c.v; c.vl = 0; c.r = 0; c.slip = 0; c.vz = 0; c.air = false; c.steer *= 0.8; c.offroad = false; c.travada = 0; c.patina = 0;
  c.gasP = 0; c.brkP = 0;
  c.idx = saida ? saida.indice : procurar(tr, c.x, c.y, c.idx); c.z = alturaDoChao(tr, c.x, c.y, c.idx);
  c.rpm = Math.max(0.3, D.rotacao(c.v, spec.vmax, c.marcha)); c.marcha = D.marchaAuto(c.v, spec.vmax, c.marcha);
  if (fim) {
    if (ev) ev.push({ t: "box", fase: "sai", composto: B.composto, tempo: (c.tick - B.tick0) * dt, volta: B.volta, stopGo: B.stopGo || undefined, troca: B.stopGo ? !!B.troca : true, sg: B.sg || undefined });
    B.fase = null; B.pedido = null;
  }
  return !fim; // no último passo o carro já está na beira da pista e a física de sempre continua dali
}

// A fase da parada no box para o HUD: "stopgo" enquanto cumpre os segundos do stop-and-go, "troca" na troca do pneu (o stop-and-go já cumprido, ou a
// parada normal), `resta` os segundos que faltam dessa fase e `total` os que faltam da parada inteira. null se não está parado na garagem.
function faseDoBox(B) {
  if (!B || B.fase !== "parada") return null;
  const noSg = B.stopGo && B.t < B.parada, tr = B.troca ? B.troca.parada - B.troca.t : noSg ? 0 : B.parada - B.t;
  return { fase: noSg ? "stopgo" : "troca", resta: Math.max(0, noSg ? B.parada - B.t : tr), total: Math.max(0, (noSg ? B.parada - B.t : 0) + (B.troca ? B.troca.parada - (noSg ? 0 : B.troca.t) : 0)), stopGo: !!B.stopGo, troca: !!B.troca };
}

// ---------- batida entre carros ----------
// Cada carro vira 3 círculos ao longo do corpo (L e W em unidades da pista). O contato TROCA MOMENTO de verdade: o impulso sai da
// massa de cada carro e da velocidade relativa no ponto do contato (com restituição baixa, E_BATIDA), então quem é atingido por
// trás ganha velocidade para a frente e quem bate perde; a batida de lado empurra para o lado e, como o ponto do contato fica
// longe do centro, gira o carro (guinada). Um atrito tangencial (MU_BATIDA) leva o carro de raspão a girar um pouco também. Depois
// da batida o carro fica instável (`c.inst`, ver dinamica.js: menos aderência lateral por 0,2 a 2 s conforme a força).
// É uma função só, no navegador (previsão), no servidor (autoridade) e nos robôs. Mexe só no carro `c`; o outro é um modelo
// cinemático { id, x, y, a, vx, vy, r, L, W, massa } (x, y e a no fim do passo; vx, vy e r dão onde ele estava no começo).
// A conta é uma VARREDURA: confere vários instantes do passo (do começo ao fim), então nem dois carros a 400 u/s se atravessam.
const PUXAO = 1.8;        // o quanto um passo empurra para fora (unidades): 3,5 por quadro de 60 Hz, na conta dos 120 passos
const E_BATIDA = 0.15, MU_BATIDA = 0.25, R_MAX_BATIDA = 2; // restituição, atrito do contato e a guinada máxima que uma batida dá (rad/s)
const ALIVIO = 0.8;       // as batidas punem 20% menos: o atrito do raspão, a guinada, a instabilidade e a perda no muro saem a 80% (o impulso que separa fica inteiro, senão os carros seguem se enterrando)
const FORCA_EV = 5;       // abaixo disto (u/s de aproximação) a batida troca momento mas não conta como evento (encostar, roçar)
const INST_FORCA = 200;   // a força (u/s de aproximação) que dá a instabilidade cheia
// Quem CAUSOU a batida, pela velocidade de cada carro ANTES do impulso (depois dele as velocidades já estão trocadas e a culpa some): o quanto
// cada um se move em direção ao outro. Culpado claro só quando um se aproxima bem mais que o outro (a traseira que acerta quem estava
// na frente, quem fecha a porta em cima de quem está ao lado); lado a lado, ou os dois se aproximando, não tem culpado. Só aí o impulso
// é assimétrico: o culpado leva o impacto inteiro e a vítima só uma parte (não perde velocidade nem fica instável de forma exagerada).
const CULPA_MIN = 8, CULPA_RAZAO = 1.6; // u/s: a aproximação mínima do culpado, e quantas vezes ela passa a do outro
const K_CULPADO = 1.15, K_VITIMA = 0.4; // o quanto do impulso cada um leva quando há culpado claro
// (vA, vB: as velocidades dos centros antes do impulso; n: o vetor unitário de B para A no contato). +1: A causou; -1: B causou; 0: ninguém
function culpaEntre(vAx, vAy, vBx, vBy, nx, ny) {
  const atkA = Math.max(0, -(vAx * nx + vAy * ny)), atkB = Math.max(0, vBx * nx + vBy * ny);
  if (atkA > CULPA_RAZAO * atkB + CULPA_MIN) return 1;
  if (atkB > CULPA_RAZAO * atkA + CULPA_MIN) return -1;
  return 0;
}
function circulos(x, y, a, L, W) { const fx = Math.cos(a), fy = Math.sin(a), r = W * 0.45, d = Math.max(0, L / 2 - r); return [-d, 0, d].map((u) => [x + fx * u, y + fy * u, r]); }
// o tamanho (u) de cada carro, o mesmo de CARS3 em carros.js (metros do modelo × KS = 10)
const DIMENSOES = { equilibrado: [44, 26], foguete: [48, 25], formiga: [41, 26], drifteiro: [44, 25], tanque: [46, 29] };
const dimensoes = (car) => DIMENSOES[car] || DIMENSOES.equilibrado;
const massaDe = (spec) => (spec ? D.parametros(spec).massa : 800);
// o par de círculos mais enterrado entre A e B: { pen, nx, ny (de B para A), px, py (o ponto do contato) } ou null
function maisEnterrado(ax, ay, aa, aL, aW, bx, by, ba, bL, bW) {
  const A = circulos(ax, ay, aa, aL, aW), B = circulos(bx, by, ba, bL, bW);
  let m = null;
  for (const [cx, cy, cr] of A) for (const [ex, ey, er] of B) {
    const dx = cx - ex, dy = cy - ey, d = Math.hypot(dx, dy), pen = cr + er - d;
    if (pen > 0 && (!m || pen > m.pen)) {
      const nx = d > 1e-6 ? dx / d : Math.cos(aa + Math.PI / 2), ny = d > 1e-6 ? dy / d : Math.sin(aa + Math.PI / 2);
      m = { pen, nx, ny, px: ex + nx * (er - pen / 2), py: ey + ny * (er - pen / 2) };
    }
  }
  return m;
}
const ESC2 = D.ESC * D.ESC, RAIO_GIRO2 = 1.5 * (0.5 * 3.6) ** 2 / ESC2; // (inércia de guinada / massa, em u²)
// a batida do carro `c` (geometria eu: L, W, massa) com o modelo `o`, varrendo o passo de duração `dt` (0 = só a posição de agora).
// Soma em `reg` o que mudou no carro (o navegador reaplica na reconciliação). Devolve a força (u/s de aproximação, 0 = nada).
function contatoCom(c, eu, o, dt, reg, semImpulso) {
  const ox1 = o.x, oy1 = o.y, oa1 = o.a, ovx = o.vx || 0, ovy = o.vy || 0, orr = o.r || 0;
  const ax0 = c.x0 ?? c.x, ay0 = c.y0 ?? c.y, aa0 = c.a0 ?? c.a;
  let da = c.a - aa0; da = Math.atan2(Math.sin(da), Math.cos(da));
  const rel = dt > 0 ? Math.hypot(c.x - ax0 - ovx * dt, c.y - ay0 - ovy * dt) : 0, nsub = dt > 0 ? Math.min(16, Math.max(1, Math.ceil(rel / 5))) : 1;
  let f = 1, m = null, ax = c.x, ay = c.y, aa = c.a, bx = ox1, by = oy1;
  const folga = o.folga || 0; // (o navegador, que só tem uma previsão do outro carro, exige que ele esteja mais enterrado que isto; o servidor, com a pose de verdade, não)
  for (let i = 1; i <= nsub; i++) {
    const g = i / nsub, qx = ax0 + (c.x - ax0) * g, qy = ay0 + (c.y - ay0) * g, qa = aa0 + da * g;
    const rx = ox1 - ovx * dt * (1 - g), ry = oy1 - ovy * dt * (1 - g), ra = oa1 - orr * dt * (1 - g);
    const hit = maisEnterrado(qx, qy, qa, eu.L, eu.W, rx, ry, ra, o.L, o.W);
    if (hit && hit.pen > folga) { m = hit; f = g; ax = qx; ay = qy; aa = qa; bx = rx; by = ry; break; }
  }
  if (!m) return 0;
  // a velocidade dos dois no ponto do contato (a de cada centro mais a guinada vezes o braço)
  const rAx = m.px - ax, rAy = m.py - ay, rBx = m.px - bx, rBy = m.py - by, nx = m.nx, ny = m.ny;
  const vAx = c.vx - c.r * rAy, vAy = c.vy + c.r * rAx, vBx = ovx - orr * rBy, vBy = ovy + orr * rBx;
  const rvx = vAx - vBx, rvy = vAy - vBy, vn = rvx * nx + rvy * ny;
  const mA = eu.massa || 800, mB = o.massa || 800, IA = mA * RAIO_GIRO2, IB = mB * RAIO_GIRO2;
  const vx0 = c.vx, vy0 = c.vy, r0 = c.r;
  let forca = 0;
  o.de = null; o.pre = null; o.culpa = 0; // (o que o outro carro leva da mesma batida: o oposto, para quem o move no servidor)
  if (vn < 0 && !semImpulso) { // se aproximando: troca o momento
    forca = -vn;
    // as velocidades de ANTES do impulso: a gravidade e a culpa saem delas (o servidor guarda em corrida-contato.js)
    const culpa = culpaEntre(c.vx, c.vy, ovx, ovy, nx, ny), kA = culpa === 1 ? K_CULPADO : culpa === -1 ? K_VITIMA : 1, kB = culpa === -1 ? K_CULPADO : culpa === 1 ? K_VITIMA : 1;
    o.culpa = culpa; o.pre = { vx: c.vx, vy: c.vy, ovx, ovy, nx, ny, a: aa, oa: oa1, r: c.r, orr };
    const cAn = rAx * ny - rAy * nx, cBn = rBx * ny - rBy * nx;
    const j = -(1 + E_BATIDA) * vn / (1 / mA + 1 / mB + cAn * cAn / IA + cBn * cBn / IB);
    // atrito no contato: o carro de raspão é puxado e gira um pouco, até MU_BATIDA do impulso normal
    const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, cAt = rAx * ty - rAy * tx, cBt = rBx * ty - rBy * tx;
    const jt = ALIVIO * Math.max(-MU_BATIDA * j, Math.min(MU_BATIDA * j, -vt / (1 / mA + 1 / mB + cAt * cAt / IA + cBt * cBt / IB)));
    const Fx = j * nx + jt * tx, Fy = j * ny + jt * ty;
    c.vx += kA * Fx / mA; c.vy += kA * Fy / mA;
    o.de = { dvx: -kB * Fx / mB, dvy: -kB * Fy / mB, dr: Math.max(-R_MAX_BATIDA, Math.min(R_MAX_BATIDA, -kB * ALIVIO * (rBx * Fy - rBy * Fx) / IB)), k: kB };
    const dr = Math.max(-R_MAX_BATIDA, Math.min(R_MAX_BATIDA, kA * ALIVIO * (rAx * Fy - rAy * Fx) / IA));
    // o carro com o pneu arcade (o macio) tem a guinada do volante; a da batida vai à parte e se apaga sozinha
    if (c.amb && c.amb.pn && c.amb.pn.arcade) c.rIns = (c.rIns || 0) + dr; else c.r += dr;
    // a instabilidade: mais forte e mais longa quanto maior a força
    const nivel = ALIVIO * Math.min(1, Math.min(1, kA) * forca / INST_FORCA), dur = 0.2 + 1.8 * nivel, ins = Math.max(0.15, nivel);
    if (ins >= (c.inst || 0)) { c.inst = ins; c.instK = ins / dur; }
  }
  // separa os carros (um pouco por passo, de graça nos que já se afastam): a posição vai ao instante do contato e anda o resto do passo
  const puxa = Math.min(PUXAO, m.pen * 0.6), rest = dt > 0 ? (1 - f) * dt : 0;
  c.x = ax + nx * puxa + c.vx * rest; c.y = ay + ny * puxa + c.vy * rest;
  if (f < 1) c.a = aa + c.r * rest;
  const ca = Math.cos(c.a), sa = Math.sin(c.a); c.v = c.vx * ca + c.vy * sa; c.vl = -c.vx * sa + c.vy * ca;
  if (reg) { reg.dvx += c.vx - vx0; reg.dvy += c.vy - vy0; reg.dr += (c.amb && c.amb.pn && c.amb.pn.arcade ? 0 : c.r - r0); reg.dx += nx * puxa; reg.dy += ny * puxa; reg.inst = Math.max(reg.inst, c.inst || 0); reg.instK = c.instK || 0; reg.forca = Math.max(reg.forca, forca); }
  return forca;
}
const novoRegistro = () => ({ dvx: 0, dvy: 0, dr: 0, dx: 0, dy: 0, inst: 0, instK: 0, forca: 0 });
// Reaplica o que uma batida fez (a reconciliação do navegador: o passo refeito não vê os outros carros, então repete o resultado)
function aplicarContato(c, reg) {
  c.vx += reg.dvx; c.vy += reg.dvy; c.x += reg.dx; c.y += reg.dy; c.r += reg.dr;
  if ((reg.inst || 0) >= (c.inst || 0)) { c.inst = reg.inst; c.instK = reg.instK; }
  const ca = Math.cos(c.a), sa = Math.sin(c.a); c.v = c.vx * ca + c.vy * sa; c.vl = -c.vx * sa + c.vy * ca;
}
// O impulso que outro carro deu neste (calculado no servidor pelo carro que bateu primeiro): o mesmo efeito de contatoCom, sem geometria.
function impulsoExterno(c, d, forca) {
  c.vx += d.dvx; c.vy += d.dvy;
  if (c.amb && c.amb.pn && c.amb.pn.arcade) c.rIns = (c.rIns || 0) + d.dr; else c.r += d.dr;
  const nivel = ALIVIO * Math.min(1, Math.min(1, d.k ?? 1) * forca / INST_FORCA), dur = 0.2 + 1.8 * nivel, ins = Math.max(0.15, nivel);
  if (ins >= (c.inst || 0)) { c.inst = ins; c.instK = ins / dur; }
  const ca = Math.cos(c.a), sa = Math.sin(c.a); c.v = c.vx * ca + c.vy * sa; c.vl = -c.vx * sa + c.vy * ca;
}
// Bate o carro `c` (o passo que acabou de andar) nos outros. Quem já recebeu a bandeirada é fantasma: não bate e não leva batida.
// eu: { L, W, massa }; outros: [{ id, x, y, z, a, vx, vy, r, v, L, W, massa, fant, dnf }] (sem vx e vy, o outro vai para a frente a `v`).
// `podeImpulso(o)` (opcional) diz se a batida com `o` pode trocar momento (o servidor evita contar a mesma batida duas vezes). `ev` recebe { t: "carro", id, forca, k: o passo, de: o que o outro leva }. `reg` (opcional) soma o que mudou no carro. Devolve a maior força.
function contatoPasso(c, eu, outros, ev, reg, dt = PASSO, podeImpulso) {
  if (c.air || c.fant || !outros) return 0;
  let maior = 0;
  for (let o of outros) {
    if (o.dnf || o.fant || Math.abs((o.z || 0) - c.z) > 12) continue;
    if (Math.abs(o.x - c.x) > 110 || Math.abs(o.y - c.y) > 110) continue; // longe demais para encostar neste passo
    if (o.vx === undefined) o = { ...o, vx: Math.cos(o.a) * (o.v || 0), vy: Math.sin(o.a) * (o.v || 0), r: o.r || 0 };
    const forca = contatoCom(c, eu, o, dt, reg, podeImpulso ? !podeImpulso(o) : false);
    if (forca > 0) { maior = Math.max(maior, forca); if (ev) ev.push({ t: "carro", id: o.id, forca, k: c.tick, de: o.de, pre: o.pre, culpa: o.culpa }); }
  }
  return maior;
}
// (a forma de antes, só a posição de agora, sem varrer: o tamanho vem do nome do carro) As batidas vão em `ev`.
function baterNosOutros(c, car, outros, ev) {
  const [L, W] = dimensoes(car);
  contatoPasso(c, { L, W, massa: 800 }, outros.map((o) => { const [oL, oW] = dimensoes(o.car); return { ...o, L: o.L || oL, W: o.W || oW }; }), ev, null, 0);
}
// A força do contato entre dois carros SEM mexer em nenhum (quem só precisa saber): a velocidade com que se aproximam no ponto de contato.
function forcaEntre(A, B) { // A, B: { x, y, a, vx, vy, r, L, W }
  const m = maisEnterrado(A.x, A.y, A.a, A.L, A.W, B.x, B.y, B.a, B.L, B.W); if (!m) return 0;
  const rAx = m.px - A.x, rAy = m.py - A.y, rBx = m.px - B.x, rBy = m.py - B.y;
  return Math.max(0, -(((A.vx - (A.r || 0) * rAy) - (B.vx - (B.r || 0) * rBy)) * m.nx + ((A.vy + (A.r || 0) * rAx) - (B.vy + (B.r || 0) * rBx)) * m.ny));
}

// ---------- copiar o estado (a rede) ----------
const R = (v, k) => Math.round(v * k) / k;
function serializar(c) {
  const s = { x: R(c.x, 100), y: R(c.y, 100), z: R(c.z, 100), a: R(c.a, 10000), v: R(c.v, 100), vl: R(c.vl, 100), r: R(c.r, 1000), st: R(c.steer, 1000), gp: R(c.gasP, 100), bp: R(c.brkP, 100), sl: R(c.slip, 100), us: R(c.uso || 0, 1000),
    m: c.marcha, tt: R(c.trocaT, 1000), ds: R(c.desceT || 0, 1000), ax: R(c.axL, 100), vz: R(c.vz, 10), air: c.air ? 1 : 0, gvz: R(c.gvz || 0, 10), ix: c.idx, pg: R(c.prog, 10), sc: c.sector, dr: R(c.draft, 1000), tk: c.tick, fa: c.fant ? 1 : 0,
    pn: [c.pneu.composto, R(c.pneu.desgaste, 100000), R(c.pneu.temp, 10000)], er: [R(c.ers.carga, 10000), R(c.ers.recarga, 10000), c.ers.volta] };
  if (c.inst > 0 || c.rIns) s.ni = [R(c.inst || 0, 1000), R(c.instK || 0, 1000), R(c.rIns || 0, 1000)]; // (a instabilidade da batida)
  if (c.box) { const B = c.box; s.bx = [B.fase, R(B.u, 1000), R(B.lat0, 100), R(B.t, 1000), R(B.parada, 100), R(B.garagem, 1000), B.composto, B.volta, B.n, B.tick0 ?? 0, B.pedido]; }
  return s;
}
function aplicar(c, s, tr) {
  c.x = s.x; c.y = s.y; c.z = s.z; c.a = s.a; c.v = s.v; c.vl = s.vl; c.r = s.r; c.steer = s.st; c.gasP = s.gp; c.brkP = s.bp; c.slip = s.sl ?? 0; c.uso = s.us ?? 0; c.marcha = s.m; c.trocaT = s.tt; c.desceT = s.ds ?? 0; c.axL = s.ax; c.vz = s.vz; c.air = !!s.air; c.gvz = s.gvz;
  c.idx = s.ix; c.prog = s.pg; c.sector = s.sc; c.draft = s.dr; c.tick = s.tk; c.fant = !!s.fa; c.idxAnt = s.ix;
  const ca = Math.cos(c.a), sa = Math.sin(c.a); c.vx = c.v * ca - c.vl * sa; c.vy = c.v * sa + c.vl * ca;
  c.pneu.composto = s.pn[0]; c.pneu.desgaste = s.pn[1]; c.pneu.temp = s.pn[2];
  c.ers.carga = s.er[0]; c.ers.recarga = s.er[1]; c.ers.volta = s.er[2];
  if (s.ni) { c.inst = s.ni[0]; c.instK = s.ni[1]; c.rIns = s.ni[2]; } else { c.inst = 0; c.instK = 0; c.rIns = 0; }
  if (s.bx && c.box) { const B = c.box; [B.fase, B.u, B.lat0, B.t, B.parada, B.garagem, B.composto, B.volta, B.n, B.tick0, B.pedido] = s.bx; }
  else if (c.box && !s.bx) { c.box.fase = null; }
  c.sp = { x: c.x, y: c.y };
}

// ---------- os outros carros ----------
// O servidor manda a posição de todos 20 vezes por segundo, com a hora dele. Cada carro guarda as últimas amostras e é desenhado
// ATRASO ms no passado, interpolando entre duas delas: um pacote atrasado ou perdido não faz o carro andar para trás (nem
// tremer), e o atraso fixo cobre a oscilação da rede. Sem amostra mais nova, o carro segue na direção em que ia por no máximo
// EXTRAPOLA s e depois fica parado onde estava. `b`: amostras { t, x, y, z, a, v } em ordem de tempo; `rt`: a hora (do servidor) que se quer.
const ATRASO = 130, EXTRAPOLA = 0.2;
function amostraEm(b, rt, alvo = {}) {
  if (rt <= b[0].t) { Object.assign(alvo, b[0]); return alvo; }
  let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--;
  const B = b[i], A = b[i - 1];
  if (!A || rt >= B.t) {
    const f = Math.min(EXTRAPOLA, Math.max(0, (rt - B.t) / 1000));
    alvo.t = rt; alvo.x = B.x + Math.cos(B.a) * B.v * f; alvo.y = B.y + Math.sin(B.a) * B.v * f; alvo.z = B.z; alvo.a = B.a; alvo.v = B.v; return alvo;
  }
  const u = (rt - A.t) / (B.t - A.t); let da = B.a - A.a; da = Math.atan2(Math.sin(da), Math.cos(da));
  alvo.t = rt; alvo.x = A.x + (B.x - A.x) * u; alvo.y = A.y + (B.y - A.y) * u; alvo.z = A.z + (B.z - A.z) * u; alvo.a = A.a + da * u; alvo.v = A.v + (B.v - A.v) * u;
  return alvo;
}

// O modelo cinemático de um carro no instante `rt` (ms do servidor), a partir da amostra mais nova `B` { t, x, y, z, a, v, vx, vy, r }:
// segue a velocidade e a guinada que ele tinha, por no máximo `max` s. Serve para desenhar os outros NO PRESENTE (a hora do meu carro),
// para o navegador prever a batida e para o servidor olhar um carro que ainda não chegou àquela hora.
const EXTRAPOLA_MAX = 0.35;
function extrapolar(B, rt, alvo = {}, max = EXTRAPOLA_MAX) {
  const f = Math.min(max, Math.max(0, (rt - B.t) / 1000)), vx = B.vx ?? Math.cos(B.a) * (B.v || 0), vy = B.vy ?? Math.sin(B.a) * (B.v || 0), r = B.r || 0;
  alvo.t = rt; alvo.x = B.x + vx * f; alvo.y = B.y + vy * f; alvo.z = B.z || 0; alvo.a = B.a + Math.max(-1, Math.min(1, r * f)); alvo.vx = vx; alvo.vy = vy; alvo.r = r; alvo.v = B.v || 0;
  return alvo;
}

// ---------- o tempo do quadro vira passos fixos ----------
// O navegador gasta o tempo de cada quadro em passos de PASSO segundos: `acc` é o que sobrou dos quadros anteriores. Um quadro de
// 33 ms dá 4 passos e um de 7 ms dá 0 ou 1, mas o total de passos por segundo é sempre o mesmo, então 30 ou 144 quadros por segundo
// dão a mesma corrida. `max` corta quadros enormes (a aba ficou escondida): o tempo perdido não se acumula.
function gastarTempo(acc, dt, max = 0.25) {
  acc = Math.min(max, acc + dt);
  const n = Math.floor(acc / PASSO + 1e-9);
  return { passos: n, acc: acc - n * PASSO };
}

// ---------- reconciliar a previsão com o servidor ----------
// Um erro de até ERRO_SALTO unidades (uns 55 m) é corrigido aos poucos: o desenho carrega a diferença (`desvio`) e ela se apaga em
// TEMPO_DO_DESVIO s. Só um erro maior que isso (o servidor tirou o carro do lugar) faz o carro saltar.
const ERRO_SALTO = 260, TEMPO_DO_DESVIO = 0.15;
function decairDesvio(d, dt) { const f = Math.exp(-dt / TEMPO_DO_DESVIO); d.ex *= f; d.ey *= f; d.ea *= f; if (Math.abs(d.ex) < 0.01 && Math.abs(d.ey) < 0.01) d.ex = d.ey = 0; }
// O navegador previu o carro até o passo `c.tick`; o servidor mandou o estado verdadeiro `st` depois de `st.tk` passos. Volta ao
// estado do servidor e reaplica os passos que ele ainda não viu (`ctx.passo(c, k)` anda o passo k com a entrada que o navegador
// mandou nele; `ctx.hx/hy` guardam a previsão de cada passo, `ctx.mascara` é o tamanho do anel menos 1). Devolve o erro (distância
// entre a previsão e o servidor no passo `st.tk`) e quanto o carro andou por causa da correção (`dx`, `dy`, `da`: onde estava
// menos onde ficou), que o desenho usa para se corrigir aos poucos em vez de pular.
function reconciliar(c, st, tr, ctx) {
  const agora = c.tick, tk = st.tk, m = ctx.mascara, dentro = tk <= agora && agora - tk < m - 8;
  const erro = dentro ? Math.hypot(st.x - ctx.hx[tk & m], st.y - ctx.hy[tk & m]) : Infinity;
  const ox = c.x, oy = c.y, oa = c.a;
  aplicar(c, st, tr);
  if (dentro) for (let k = tk; k < agora; k++) { ctx.passo(c, k); ctx.hx[(k + 1) & m] = c.x; ctx.hy[(k + 1) & m] = c.y; }
  let da = oa - c.a; da = Math.atan2(Math.sin(da), Math.cos(da));
  return { erro, dentro, dx: ox - c.x, dy: oy - c.y, da };
}

const api = { PASSO, ATRASO, EXTRAPOLA, EXTRAPOLA_MAX, extrapolar, amostraEm, ERRO_SALTO, TEMPO_DO_DESVIO, decairDesvio, gastarTempo, reconciliar, pneuDaLargada, criarPista, preparar, quadro, alturaDoChao, procurar, vagaDoGrid, novo, empacotar, desempacotar, vacuoAlvo, pilotoAutomatico, passo, voltarParaPista, faseDoBox, contatoPasso, impulsoExterno, culpaEntre, K_CULPADO, K_VITIMA, FORCA_EV, novoRegistro, aplicarContato, forcaEntre, massaDe, baterNosOutros, DIMENSOES, dimensoes, serializar, aplicar, COMPOSTOS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Sim = api;
})(typeof window !== "undefined" ? window : globalThis);
