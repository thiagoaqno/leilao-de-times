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
  if (!t.espaco && !t.muro) { // barreiras de pneus: do lado de fora das curvas fechadas (o mesmo cálculo de pista.js)
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 3) % n]; if (!(p.k > 1 / 170)) continue;
      const fora = p.tx * q.ty - p.ty * q.tx > 0 ? -1 : 1;
      for (let j = i - 4; j <= i + 4; j++) tr.pneus[(j + n) % n] = fora;
    }
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
// a posição de largada g: atrás da linha, em duas filas (nas regras de F1 as filas ficam a 8 pontos uma da outra)
function vagaDoGrid(pts, g, W, f1 = false) {
  const n = pts.length, idx = (n - 6 - Math.floor(g / 2) * (f1 ? 8 : 13) + n * 2) % n, p = pts[idx], nx = -p.ty, ny = p.tx, lado = g % 2 ? 1 : -1, lat = lado * W * 0.22;
  return { x: p.x + nx * lat, y: p.y + ny * lat, a: Math.atan2(p.ty, p.tx), idx };
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

// o pneu da largada: na classificação, macio novo e já quente; na corrida, o escolhido na sala, frio
function pneuDaLargada(fase, composto) {
  if (fase !== "quali") return F1.pneuNovo(composto);
  const pn = F1.pneuNovo("macio"); pn.temp = 0.8; return pn;
}

// ---------- a entrada de um passo, em um número só ----------
// bits 0 acelerador · 1 freio · 2 ERS · 3 voltar à pista · 4-5 pedido de box (0 nenhum, 1 macio, 2 médio, 3 duro) ·
// 6-9 marcha do câmbio manual (0 = automático) · 10-18 volante (0..510 → -1..1)
const COMPOSTOS = ["macio", "medio", "duro"];
function empacotar(e) {
  const st = Math.round(limite(e.steer || 0, -1, 1) * 255) + 255;
  return (e.gas ? 1 : 0) | (e.brake ? 2 : 0) | (e.ers ? 4 : 0) | (e.respawn ? 8 : 0) | ((e.pedido ? COMPOSTOS.indexOf(e.pedido) + 1 : 0) << 4) | (limite(e.marcha || 0, 0, 15) << 6) | (st << 10);
}
function desempacotar(n, saida = {}) {
  saida.gas = n & 1; saida.brake = (n >> 1) & 1; saida.ers = (n >> 2) & 1; saida.respawn = (n >> 3) & 1;
  const pd = (n >> 4) & 3; saida.pedido = pd ? COMPOSTOS[pd - 1] : null;
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
function pilotoAutomatico(c, tr, spec, vAlvo, latAlvo, saida = {}) {
  const p = D.parametros(spec), n = tr.n, v = Math.max(c.v, 30), Ld = Math.max(22, v * 0.3);
  let j = c.idx, acc = 0; while (acc < Ld) { j = (j + 1) % n; acc += 6; }
  const q = tr.pts[j], tx = q.x + q.nx * latAlvo, ty = q.y + q.ny * latAlvo;
  let e = Math.atan2(ty - c.y, tx - c.x) - c.a; e = Math.atan2(Math.sin(e), Math.cos(e));
  const delta = Math.atan2(2 * p.L * Math.sin(e), Ld * ESC), dm = D.volanteMaximo(p, Math.max(0, c.v) * ESC);
  saida.steer = limite(delta / dm, -1, 1); saida.gas = c.v < vAlvo ? 1 : 0; saida.brake = c.v > vAlvo * 1.04 ? 1 : 0; if (saida.brake) saida.gas = 0;
  saida.ers = 0; saida.respawn = 0; saida.pedido = null; saida.marcha = 0;
  return saida;
}

// ---------- um passo ----------
// amb (o ambiente, que quem chama monta a cada passo):
//   spec (o carro: carOf), manual (câmbio manual da sala), dano (%), drsZona (a zona liberada pela direção de prova, ou -1),
//   amarela (o setor atual está sob bandeira amarela), safety, ersAuto (false = o ERS é pelo comando), voltas (da corrida),
//   laps (as voltas que já completei), paradas (quantas já fiz), semente, id, grid, finish (já recebi a bandeirada?),
//   segurar (o carro fica parado: antes da largada), dnf (perda total), outros (os carros em volta, para o vácuo),
//   quali (classificação: sem box), f1 (regras de F1: pneu, DRS, ERS)
// ev (opcional): lista onde o passo põe o que aconteceu: { t: "muro"|"bump"|"setor"|"box"|"pouso"|"respawn", ... }
const SAIDA = {}, ENT_AUTO = {};
function passo(c, ent, amb, tr, ev) {
  const dt = PASSO, spec = amb.spec, p = D.parametros(spec), n = tr.n;
  c.tick++;
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
  const fr0 = quadro(tr, c.x, c.y, c.idx), estrada = Math.abs(fr0.lat) <= tr.W / 2 + 6;
  const fx = Math.cos(c.a), fy = Math.sin(c.a);
  // o vácuo e o ar sujo
  const alvo = vacuoAlvo(c, amb.outros);
  c.draft += (alvo - c.draft) * Math.min(1, dt * 4);
  const pn = F1.aderencia(c.pneu), dano = F1.efeitoDoDano(amb.dano);
  const curva = (tr.pts[c.idx].k || 0) > 1 / 600, vac = F1.vacuoF1(c.draft, curva);
  c.arSujo = 1 - vac.aderencia;
  // DRS e ERS
  const zona = F1.zonaDRS(c.idx / n, tr.t.drs);
  const drs = !!(amb.drsZona === zona && zona >= 0 && !ent.brake && !amb.amarela && !amb.safety);
  F1.carregarErs(c.ers, dt, !!ent.brake && c.v > 40, !ent.gas, amb.laps || 0);
  const usarErs = !!(ent.gas && !amb.safety && (amb.ersAuto !== false ? F1.usarErsAuto(c.ers.carga, c.v, spec.vmax, (tr.pts[c.idx].k || 0) < 1e-4, c.draft > 0.25) : ent.ers));
  const ersAtivo = F1.gastarErs(c.ers, dt, usarErs);
  c.drsAtivo = drs; c.ersAtivo = ersAtivo;
  // o relevo: a gravidade puxa para baixo da pista
  const h0 = alturaDoChao(tr, c.x, c.y, c.idx), h1 = alturaDoChao(tr, c.x + fx * 10, c.y + fy * 10, c.idx);
  const bandeira = amb.safety ? 0.54 : amb.amarela ? 0.82 : 1;
  const amb2 = c.amb || (c.amb = {});
  amb2.chao = estrada; amb2.subida = (h1 - h0) / 10; amb2.ar = c.air; amb2.manual = !!amb.manual; amb2.marchaManual = ent.marcha || c.marcha;
  amb2.pn = pn; amb2.dano = dano; amb2.drs = drs; amb2.ers = ersAtivo; amb2.vacuo = vac; amb2.curva = curva;
  amb2.limiteV = bandeira < 1 ? bandeira * spec.vmax * pn.final * dano.final * (1 + (drs ? 0.05 * (spec.drs ?? 1) : 0)) : Infinity;
  // a dinâmica
  const xAnt = c.x, yAnt = c.y;
  D.passo(c, ent, amb2, p, dt);
  // anda; no muro escorrega junto dele (o muro fica a uma distância fixa do meio da pista)
  let nx = c.x, ny = c.y;
  c.idx = procurar(tr, nx, ny, c.idx);
  const fr = quadro(tr, nx, ny, c.idx), lim = tr.wallLat - 8;
  const pneu = tr.pneus && tr.pneus[c.idx], limiteL = pneu && Math.sign(fr.lat) === pneu ? tr.W / 2 + 26 : lim;
  if (Math.abs(fr.lat) > limiteL || nx < 2 || ny < 2 || nx > tr.t.world - 2 || ny > tr.t.world - 2) {
    const q = tr.pts[c.idx], s = Math.sign(fr.lat) || 1, over = Math.abs(fr.lat) - limiteL;
    if (over > 0) { nx -= q.nx * s * over; ny -= q.ny * s * over; }
    nx = limite(nx, 2, tr.t.world - 2); ny = limite(ny, 2, tr.t.world - 2);
    const vn = c.vx * q.nx * s + c.vy * q.ny * s, hit = Math.abs(vn);
    // a batida tira a velocidade que ia contra o muro (com um quiquezinho) e, do resto, perde mais quanto mais de frente bateu
    if (vn > 0) { c.vx -= q.nx * s * vn * 1.2; c.vy -= q.ny * s * vn * 1.2; }
    const pancada = 1 - (1 - spec.wall) * 0.5 * Math.min(1, hit / 260) * (vn > 0 ? 1 : 0), raspa = Math.exp(-(1 - spec.wall) * 0.7 * dt);
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
  if (amb.f1 !== false) F1.gastarPneu(c.pneu, { dist: Math.hypot(nx - xAnt, ny - yAnt), volta: n * 6, slip: c.slip, travada: c.travada, patina: c.patina, v: c.v, vmax: spec.vmax, dt, fator: spec.desgaste });
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
    Object.assign(B, { fase: "entra", u: rel + 0.5, lat0: lado, t: 0, composto: B.pedido, volta: (amb.laps || 0) + 1, n, parada: F1.tempoDeParada(amb.semente, amb.id, n), garagem: F1.garagemDe(cor, amb.grid || 0), tick0: c.tick });
    if (ev) ev.push({ t: "box", fase: "entra", volta: B.volta, n });
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
    if (B.t >= B.parada) { c.pneu = Object.assign(c.pneu, F1.pneuNovo(B.composto)); B.fase = "sai"; if (ev) ev.push({ t: "boxTrocou" }); }
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
    if (ev) ev.push({ t: "box", fase: "sai", composto: B.composto, tempo: (c.tick - B.tick0) * dt, volta: B.volta });
    B.fase = null; B.pedido = null;
  }
  return !fim; // no último passo o carro já está na beira da pista e a física de sempre continua dali
}

// ---------- batida entre carros ----------
// Cada carro vira 3 círculos ao longo do corpo (L e W em unidades da pista). O contato separa as carrocerias suavemente, sem
// alterar a velocidade de nenhum piloto: encostar não vira freio nem impulso de ultrapassagem. Mexe só no `eu`.
// eu: { x, y, a, vx, vy, L, W }; outro: { x, y, a, v, L, W }. Devolve a força (a velocidade de aproximação; 0 = nada).
const PUXAO = 1.8; // o quanto um passo empurra para fora (unidades): 3,5 por quadro de 60 Hz, na conta dos 120 passos
function circulos(x, y, a, L, W) { const fx = Math.cos(a), fy = Math.sin(a), r = W * 0.45, d = Math.max(0, L / 2 - r); return [-d, 0, d].map((u) => [x + fx * u, y + fy * u, r]); }
function baterNoOutro(eu, outro) {
  const A = circulos(eu.x, eu.y, eu.a, eu.L, eu.W), B = circulos(outro.x, outro.y, outro.a, outro.L, outro.W);
  let melhor = null;
  for (const [ax, ay, ar] of A) for (const [bx, by, br] of B) {
    const dx = ax - bx, dy = ay - by, d = Math.hypot(dx, dy), pen = ar + br - d;
    if (pen > 0 && (!melhor || pen > melhor.pen)) melhor = { pen, nx: d > 1e-6 ? dx / d : Math.cos(eu.a + Math.PI / 2), ny: d > 1e-6 ? dy / d : Math.sin(eu.a + Math.PI / 2) };
  }
  if (!melhor) return 0;
  const { pen, nx, ny } = melhor, correcao = Math.min(PUXAO, pen * 0.5);
  eu.x += nx * correcao; eu.y += ny * correcao;
  const ovx = Math.cos(outro.a) * (outro.v || 0), ovy = Math.sin(outro.a) * (outro.v || 0);
  return Math.max(0, -((eu.vx - ovx) * nx + (eu.vy - ovy) * ny));
}
// o tamanho (u) de cada carro, o mesmo de CARS3 em carros.js (metros do modelo × KS = 10)
const DIMENSOES = { equilibrado: [44, 26], foguete: [48, 25], formiga: [41, 26], drifteiro: [44, 25], tanque: [46, 29] };
const dimensoes = (car) => DIMENSOES[car] || DIMENSOES.equilibrado;
// Bate o carro `c` (de `quem`) nos outros. Quem já recebeu a bandeirada é fantasma: não bate e não leva batida.
// outros: [{ id, x, y, z, a, v, car, fant, dnf }]. Devolve as batidas: [{ id, forca }]
function baterNosOutros(c, car, outros, ev) {
  if (c.air || c.fant) return;
  const [L, W] = dimensoes(car), eu = { x: c.x, y: c.y, a: c.a, vx: c.vx, vy: c.vy, L, W };
  for (const o of outros) {
    if (o.dnf || o.fant || Math.abs((o.z || 0) - c.z) > 12) continue;
    const [oL, oW] = dimensoes(o.car), forca = baterNoOutro(eu, { x: o.x, y: o.y, a: o.a, v: o.v || 0, L: oL, W: oW });
    if (forca > 0 && ev) ev.push({ t: "carro", id: o.id, forca });
  }
  if (eu.x !== c.x || eu.y !== c.y) { c.x = eu.x; c.y = eu.y; }
}

// ---------- copiar o estado (a rede) ----------
const R = (v, k) => Math.round(v * k) / k;
function serializar(c) {
  const s = { x: R(c.x, 100), y: R(c.y, 100), z: R(c.z, 100), a: R(c.a, 10000), v: R(c.v, 100), vl: R(c.vl, 100), r: R(c.r, 1000), st: R(c.steer, 1000), gp: R(c.gasP, 100), bp: R(c.brkP, 100),
    m: c.marcha, tt: R(c.trocaT, 1000), ax: R(c.axL, 100), vz: R(c.vz, 10), air: c.air ? 1 : 0, gvz: R(c.gvz || 0, 10), ix: c.idx, pg: R(c.prog, 10), sc: c.sector, dr: R(c.draft, 1000), tk: c.tick, fa: c.fant ? 1 : 0,
    pn: [c.pneu.composto, R(c.pneu.desgaste, 100000), R(c.pneu.temp, 10000)], er: [R(c.ers.carga, 10000), R(c.ers.recarga, 10000), c.ers.volta] };
  if (c.box) { const B = c.box; s.bx = [B.fase, R(B.u, 1000), R(B.lat0, 100), R(B.t, 1000), R(B.parada, 100), R(B.garagem, 1000), B.composto, B.volta, B.n, B.tick0 ?? 0, B.pedido]; }
  return s;
}
function aplicar(c, s, tr) {
  c.x = s.x; c.y = s.y; c.z = s.z; c.a = s.a; c.v = s.v; c.vl = s.vl; c.r = s.r; c.steer = s.st; c.gasP = s.gp; c.brkP = s.bp; c.marcha = s.m; c.trocaT = s.tt; c.axL = s.ax; c.vz = s.vz; c.air = !!s.air; c.gvz = s.gvz;
  c.idx = s.ix; c.prog = s.pg; c.sector = s.sc; c.draft = s.dr; c.tick = s.tk; c.fant = !!s.fa; c.idxAnt = s.ix;
  const ca = Math.cos(c.a), sa = Math.sin(c.a); c.vx = c.v * ca - c.vl * sa; c.vy = c.v * sa + c.vl * ca;
  c.pneu.composto = s.pn[0]; c.pneu.desgaste = s.pn[1]; c.pneu.temp = s.pn[2];
  c.ers.carga = s.er[0]; c.ers.recarga = s.er[1]; c.ers.volta = s.er[2];
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

const api = { PASSO, ATRASO, EXTRAPOLA, amostraEm, ERRO_SALTO, TEMPO_DO_DESVIO, decairDesvio, gastarTempo, reconciliar, pneuDaLargada, criarPista, preparar, quadro, alturaDoChao, procurar, vagaDoGrid, novo, empacotar, desempacotar, vacuoAlvo, pilotoAutomatico, passo, voltarParaPista, baterNoOutro, baterNosOutros, DIMENSOES, dimensoes, serializar, aplicar, COMPOSTOS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Sim = api;
})(typeof window !== "undefined" ? window : globalThis);
