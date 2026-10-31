// Corrida da Galera — a dinâmica do carro de F1 (UMD: o navegador carrega por <script>/import e o servidor usa `require`).
// Só contas, sem desenho e sem pista: a mesma física roda no navegador (previsão) e no servidor (autoridade), e os robôs
// usam as funções de análise do fim do arquivo (velocidade máxima de curva, frenagem, aceleração por marcha, rampa).
//
// O MODELO (em unidades do SI por dentro; a pista fala em "unidades", e 1 unidade = ESC metros, a mesma conta do
// velocímetro: km/h = 0,75 × u/s):
//  - carro de verdade: massa, inércia de guinada, distância entre eixos, centro de gravidade (45% da carga na frente);
//  - motor: curva de potência por rotação, 8 marchas que esticam até o corte (12 mil rpm), troca com corte de força;
//  - arrasto aerodinâmico ∝ v², resistência de rolagem, downforce ∝ v² (mais aderência quanto mais rápido);
//  - pneu: força lateral cresce com o ângulo de deriva até um pico (~6°) e depois cai (curva sin(C·atan(B·α)));
//    círculo de atrito: quem usa a aderência para acelerar ou frear tem menos para virar;
//  - modelo de bicicleta (eixo da frente e de trás), com transferência de peso na frenagem e na aceleração: passou do
//    limite, sai de frente (understeer) ou de traseira (oversteer, sobretudo com o acelerador cheio saindo de curva);
//  - freio progressivo (o pedal sobe com o tempo) que trava a roda quando passa do que o pneu segura;
//  - gravidade na rampa (subida tira velocidade, descida dá).
// O `spec` do carro (vmax, acc, brake, grip, kin, turn, scrub, offMax, wall; ver CARROS em pistas.js e f1-equipes.js)
// continua sendo a descrição do carro: `parametros(spec)` converte nos números físicos.
(function (root) {

const ESC = 0.75 / 3.6;      // metros por unidade da pista
const G = 9.81, G_U = G / ESC; // gravidade (m/s² e u/s²)
const RHO = 1.2;
const PASSO = 1 / 120;       // o passo fixo da física, no navegador e no servidor: nada depende do tempo do quadro
// O FREIO: a força que o pedal cheio pede é `FREIO_G` vezes o peso a zero de velocidade e cresce com a carga aerodinâmica (FREIO_AERO por
// peso de carga): a 300 km/h o carro freia uns 5 g (com o arrasto), a 100 km/h uns 2,5 g. Quem pede mais do que o pneu segura (molhado, pneu
// gasto, freio na curva) trava a roda. O pedal sobe em 1/FREIO_SOBE s.
// (+20% sobre a versão anterior, 1,925 e 0,55: o freio pedido e o que o pneu segura antes de travar crescem juntos, então o pedal cheio com o pneu bom segue sem travar)
const FREIO_G = 2.31, FREIO_AERO = 0.66, FREIO_SOBE = 4.5;
// O quanto o pneu aguenta de freio antes de travar (múltiplo da aderência lateral): folgado com o pneu bom (1,25) e justo com o pneu que
// perdeu aderência (gasto, frio, molhado, depois de uma batida), onde o pedal cheio já trava a roda. Vai de ATRITO_MIN a ATRITO_MAX
// conforme a aderência `kGrip` sobe de GRIP_TRAVA a GRIP_TRAVA + 0,25.
const ATRITO_MIN = 0.72, ATRITO_MAX = 1.5, GRIP_TRAVA = 1.04;
const atritoDeFreio = (kGrip) => { const x = limite((kGrip - GRIP_TRAVA) / 0.25, 0, 1); return ATRITO_MIN + (ATRITO_MAX - ATRITO_MIN) * x * x * (3 - 2 * x); };
const limite = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- o câmbio de 8 marchas ----------
// `FRACAO[i]`: a velocidade em que a marcha i+1 chega ao corte (12 mil rpm), em fração da da 8ª. Espaçadas como numa F1:
// as de baixo mais abertas, as de cima mais juntas, para o motor ficar entre ~8,9 e ~11,8 mil rpm acelerando. Num carro de 300 km/h
// de velocidade final (corte da 8ª a 321 km/h) cada marcha segura até: 98, 130, 165, 198, 230, 262, 292 e 321 km/h.
const NUM = 8, RPM_MAX = 12000;
const FRACAO = [0.305, 0.405, 0.514, 0.617, 0.717, 0.816, 0.91, 1];
const CORTE = 1.07;          // a 8ª chega ao corte a 1,07 × a velocidade final: sobra para DRS, vácuo e ERS
const SOBE = 0.985, DESCE = 0.62; // o automático sobe perto do corte e desce quando a rotação cai demais
const TROCA_T = 0.05;        // quanto dura a troca: a força do motor some
const DESCE_FREANDO = 0.9, DESCE_INTERVALO = 0.13; // freando, o automático reduz uma por vez (a cada 0,13 s) assim que a de baixo cabe abaixo de 90% do corte
// a potência pela rotação (fração do corte): fraco embaixo (embreagem patinando), cheio de 9 a 11 mil rpm, nada no corte
const CURVA = [[0, 0.38], [0.33, 0.42], [0.5, 0.62], [0.67, 0.84], [0.75, 0.93], [0.83, 1], [0.92, 0.995], [1, 0.95], [1.001, 0]];
function potencia(x) {
  if (x <= 0) return CURVA[0][1];
  for (let i = 1; i < CURVA.length; i++) if (x <= CURVA[i][0]) { const [x0, y0] = CURVA[i - 1], [x1, y1] = CURVA[i]; return y0 + (y1 - y0) * ((x - x0) / (x1 - x0)); }
  return 0;
}
// a velocidade (m/s) do corte na marcha g, para um carro de velocidade final `vmaxU` (u/s)
const vCorte = (vmaxU, g) => vmaxU * ESC * CORTE * FRACAO[limite(g, 1, NUM) - 1];
// a rotação em fração do corte (1 = 12 mil rpm) a v (u/s) na marcha g
const rotacao = (vU, vmaxU, g) => Math.max(0, vU) * ESC / vCorte(vmaxU, g);
const rpmDe = (vU, vmaxU, g) => Math.round(Math.max(0.3, rotacao(vU, vmaxU, g)) * RPM_MAX);
// a marcha que o automático escolheria: a partir de `g` sobe no corte e desce com a rotação baixa
function marchaAuto(vU, vmaxU, g) {
  let m = limite(g || 1, 1, NUM);
  while (m < NUM && rotacao(vU, vmaxU, m) >= SOBE) m++;
  while (m > 1 && rotacao(vU, vmaxU, m) < DESCE && rotacao(vU, vmaxU, m - 1) < 0.97) m--;
  return m;
}
// a marcha que dá mais força à velocidade `vU` (a que o automático usaria acelerando de verdade)
function marchaIdeal(vU, vmaxU) { let m = 1; while (m < NUM && rotacao(vU, vmaxU, m) >= 0.93) m++; return m; }

// ---------- do spec aos números físicos ----------
const EXTRA_PADRAO = Object.freeze({ potencia: 1, arrasto: 1, carga: 1, grip: 1, freio: 1, tracao: 1 });
const CACHE = new Map();
// Atalho para quem pede os parâmetros do mesmo `spec` milhares de vezes (os robôs e as contas de ritmo): o último de cada objeto,
// conferido pelos números (se o spec mudar, a conta refaz). Só acelera, o resultado é o mesmo.
const RAPIDO = new WeakMap();
function parametros(spec) {
  const r = RAPIDO.get(spec);
  if (r && r.v === spec.vmax && r.a === spec.acc && r.b === spec.brake && r.g === spec.grip && r.k === spec.kin && r.t === spec.turn && r.s === spec.scrub && r.o === spec.offMax && r.w === spec.wall && r.d === (spec.drs ?? 1) && r.c === (spec.cda ?? 1)) return r.p;
  const p = parametrosLento(spec);
  RAPIDO.set(spec, { p, v: spec.vmax, a: spec.acc, b: spec.brake, g: spec.grip, k: spec.kin, t: spec.turn, s: spec.scrub, o: spec.offMax, w: spec.wall, d: spec.drs ?? 1, c: spec.cda ?? 1 });
  return p;
}
function parametrosLento(spec) {
  const chave = [spec.vmax, spec.acc, spec.brake, spec.grip, spec.kin, spec.turn, spec.scrub, spec.offMax, spec.wall, spec.drs ?? 1, spec.cda ?? 1].join("|");
  let p = CACHE.get(chave); if (p) return p;
  const massa = 800 * (0.72 + 0.5 * spec.wall);                 // o tanque é mais pesado, a formiga mais leve
  const W = massa * G;
  const L = 3.6, a = 0.55 * L, b = 0.45 * L, h = 0.25;          // distância entre eixos, CG→frente, CG→trás e altura do CG (m)
  const Iz = massa * (0.5 * L) ** 2;
  const gn = spec.grip / 470;
  const ClA = 3.5 * gn ** 2.5, CdA = (0.9 + 0.8 * ClA) * (spec.cda ?? 1); // carga e arrasto: mais carga, mais arrasto (e menos velocidade final); `cda` (opcional, 1) escala o arrasto: o carro de F1 usa menos, para chegar a 300 km/h sem virar um foguete
  const crr = 0.012;
  const vmaxM = spec.vmax * ESC;
  const qv = 0.5 * RHO * vmaxM * vmaxM;
  const res = qv * CdA + crr * (W + qv * ClA);                  // a força que o carro vence a toda velocidade final
  const eta = 0.94;
  const Ppico = (res * vmaxM) / (eta * potencia(1 / CORTE));
  // aderência: o pneu segura `mu` vezes a carga na lateral, e a arrancada (`acc`) define a tração do eixo traseiro
  const mu = 2.1 * 1.3 * (0.35 + 0.65 * gn); // mais força lateral; a montagem aerodinâmica, os pneus e o dano continuam importando
  const a0 = spec.acc * ESC;
  const muTr = (massa * a0) / (0.55 * W + massa * a0 * (h / L));
  const alfaP = 0.11;                                           // o ângulo de deriva do pico (rad), ~6,3°
  const kin = limite(spec.kin, 0.5, 0.95);
  const C = Math.PI / (Math.PI - Math.asin(limite(kin * 1.04, 0.5, 0.97))); // a curva cai até ~kin·1,04 do pico quando o pneu escorrega todo
  const B = Math.tan(Math.PI / (2 * C)) / alfaP;
  const frenagem = FREIO_G * (spec.brake / 470);               // o freio a zero de velocidade, em g (a carga aerodinâmica soma, ver FREIO_AERO)
  p = { massa, W, L, a, b, h, Iz, ClA, CdA, crr, Ppico, eta, mu, muTr, C, B, alfaP, frenagem, gripU: spec.grip, kinU: limite(spec.kin, 0.3, 1),
    // o balanço aerodinâmico (parte da carga que vai para a frente) e o do freio (parte da força que vai para a frente)
    balAero: 0.34, balFreio: 0.6, balPneu: 1.03,
    vmaxU: spec.vmax, offMax: spec.offMax, accU: spec.acc, scrub: spec.scrub, turn: spec.turn, desgaste: spec.desgaste ?? 1, drs: spec.drs ?? 1 };
  if (CACHE.size > 80) CACHE.clear();
  CACHE.set(chave, p);
  return p;
}

// ---------- o pneu ----------
// A força lateral relativa (-1..1) no ângulo de deriva `al`: sobe até o pico (|al| = alfaP) e cai um pouco depois.
const pneuLateral = (p, al) => Math.sin(p.C * Math.atan(p.B * al));

// o ângulo máximo do volante (rad) a `vm` m/s: acompanha o que o pneu segura na velocidade (um pouco além, para o teclado
// não ficar curto), então de batente a batente nunca é "volante demais" para a velocidade
function volanteMaximo(p, vm, kGrip = 1, kCarga = 1) {
  const umin = Math.max(vm, 5), q = 0.5 * RHO * umin * umin;
  const aLat = p.mu * kGrip * (G + (q * p.ClA * kCarga) / p.massa); // a aceleração lateral que o pneu segura (m/s²)
  return limite(1.25 * (p.L * aLat) / (umin * umin) + 0.035, 0.05, 0.5);
}
// ---------- o passo da dinâmica ----------
// Estado (`c`, em unidades da pista e radianos; `novoCarro` cria um): x, y, a (rumo), v (velocidade para a frente, u/s), vl (para o
// lado, u/s, positiva para o lado em que `a` cresce), r (guinada, rad/s), steer (volante suavizado, -1..1), gasP e brkP (os pedais,
// 0..1), marcha, trocaT (a troca de marcha em andamento), axL (aceleração longitudinal filtrada, m/s², que move o peso entre os
// eixos), rpm (fração do corte), travada e patina (0..1: roda travada na frenagem, roda patinando na tração), slip (u/s: o
// quanto os pneus escorregam de lado), alF e alR (os ângulos de deriva dos eixos, rad) e vx, vy (a velocidade no mundo).
// Entrada: { gas, brake, steer (-1..1) } — gas e brake são 0 ou 1 (ou analógicos).
// Ambiente: { chao (sobre o asfalto?), subida (inclinação dh/ds do chão no rumo), ar (no ar), manual, marchaManual,
//   pn: F1.aderencia(pneu) ou null, dano: F1.efeitoDoDano(dano) ou null, drs (aberto), ers (ativo), vacuo ({final,acel,aderencia} ou null),
//   curva (para o ar sujo), limiteV (teto de velocidade em u/s por bandeira), extra (multiplicadores soltos) }
const sub = { fx: 0, fy: 0, mz: 0 };
const INST_GRIP = 0.35, INST_TRASEIRA = 0.3; // com a instabilidade cheia: -35% de aderência lateral nos dois eixos e mais -30% atrás
function passo(c, ent, amb, p, dt = PASSO) {
  const ex = amb.extra || EXTRA_PADRAO, pn = amb.pn, dn = amb.dano;
  // a instabilidade da batida (`c.inst`, 0..1, cai sozinha em 0,2 a 2 s conforme a força): os pneus seguram menos de lado, mais o eixo de trás
  const ins = c.inst > 0 ? c.inst : 0;
  if (ins > 0) c.inst = Math.max(0, ins - (c.instK || 1) * dt);
  const kGrip = (pn ? pn.grip : 1) * (dn ? dn.grip : 1) * (ex.grip || 1) * (amb.chao === false ? 0.5 : 1) * (amb.vacuo ? amb.vacuo.aderencia : 1) * (1 - INST_GRIP * ins);
  const kFreio = (pn ? pn.freio : 1) * (dn ? dn.freio : 1) * (ex.freio || 1);
  const kTracao = (pn ? pn.tracao : 1) * (dn ? dn.tracao : 1) * (ex.tracao || 1);
  const fin = (pn ? pn.final : 1) * (dn ? dn.final : 1);
  const kPot = fin * fin * fin * (ex.potencia || 1) * (amb.ers ? 1.09 : 1);
  const drsK = amb.drs ? p.drs : 0;
  const kArr = (ex.arrasto || 1) * (amb.drs ? (1 + 0.05 * drsK) ** -3 : 1) * (amb.vacuo ? (1 + amb.vacuo.final) ** -3 : 1);
  const kCarga = (ex.carga || 1) * (amb.drs ? 0.85 : 1);
  // pedais: o acelerador sobe em ~0,3 s e solta rápido; o freio sobe em ~0,22 s (por isso dá para frear "progressivo" soltando antes)
  const gasT = ent.gas ? 1 : 0, brkT = ent.brake ? 1 : 0;
  c.gasP += limite(gasT - c.gasP, -dt * 8, dt * 3.5);
  c.brkP += limite(brkT - c.brkP, -dt * 7, dt * FREIO_SOBE);
  // volante: o alvo é o comando; sobe a ~5/s e volta a ~8/s (teclado: de batente a batente em 0,4 s)
  const alvo = limite(ent.steer || 0, -1, 1);
  const arc = !!(pn && pn.arcade); // macio dentro da vida útil: a dirigibilidade arcade antiga (o fim do passo)
  if (arc) c.steer += (alvo - c.steer) * Math.min(1, dt * 10); // (a suavização de antes, ~0,1 s)
  else c.steer += limite(alvo - c.steer, -dt * (Math.abs(alvo) < Math.abs(c.steer) ? 8 : 5), dt * (Math.abs(alvo) < Math.abs(c.steer) ? 8 : 5));
  const uU = c.v;
  // câmbio
  const vmaxU = p.vmaxU;
  if (amb.manual) { const g = limite(amb.marchaManual || c.marcha || 1, 1, NUM); if (g !== c.marcha) { c.marcha = g; c.trocaT = TROCA_T; } }
  else {
    // freando de verdade (sem acelerador), reduz marcha a marcha durante a frenagem, com a rotação alta como numa F1, em vez de
    // segurar a marcha alta até a rotação cair e despencar tudo de uma vez quando volta a acelerar
    const freando = c.brkP > 0.3 && c.gasP < 0.1 && uU > 0;
    let g = marchaAuto(Math.max(0, uU), vmaxU, c.marcha);
    if (freando && g >= c.marcha && c.marcha > 1 && rotacao(uU, vmaxU, c.marcha - 1) < DESCE_FREANDO) g = c.marcha - 1;
    if (freando && g < c.marcha) g = (c.desceT || 0) > 0 ? c.marcha : c.marcha - 1;
    if (g !== c.marcha) { if (g < c.marcha) c.desceT = DESCE_INTERVALO; c.marcha = g; c.trocaT = TROCA_T; }
  }
  c.trocaT = Math.max(0, c.trocaT - dt); c.desceT = Math.max(0, (c.desceT || 0) - dt);
  const x = rotacao(uU, vmaxU, c.marcha);
  c.rpm = Math.max(0.3, x);
  if (amb.ar) { // no ar: sem pneu e sem motor; só o arrasto e a guinada que já tinha
    const V = Math.hypot(c.v, c.vl) * ESC, q = 0.5 * RHO * V * V * p.CdA * kArr;
    const fric = Math.min(1, (q / p.massa) * dt / Math.max(V, 1));
    c.v -= c.v * fric; c.vl -= c.vl * fric; c.r *= Math.exp(-dt * 0.4); c.slip = 0; c.travada = 0; c.patina = 0;
    return;
  }
  // limite de velocidade por bandeira (safety car, amarela): corta o acelerador e freia
  const limiteV = amb.limiteV || Infinity, acima = uU > limiteV;
  const gas = acima ? 0 : c.gasP, freioAuto = acima ? Math.min(1, (uU - limiteV) / 25 + 0.25) : 0;
  const pedalFreio = Math.max(c.brkP, freioAuto);
  const rev = uU < 1 && ent.brake && !ent.gas && c.brkP > 0.5; // parado e só o freio: dá ré
  const usoC = c.uso || 0; // (arcade) o quanto a curva pediu do pneu no passo anterior: divide o pneu com o freio e a tração
  const h = dt / 2; // duas passadas por passo: o eixo da frente e de trás ficam estáveis em baixa velocidade
  for (let s = 0; s < 2; s++) {
    const u = c.v * ESC, w = c.vl * ESC, r = c.r;
    const V2 = u * u + w * w, V = Math.sqrt(V2), q = 0.5 * RHO * V2;
    const DF = q * p.ClA * kCarga * (amb.curva && amb.vacuo ? amb.vacuo.aderencia : 1);
    const NdF = DF * p.balAero, NdR = DF * (1 - p.balAero);
    const ax = c.axL;
    const dN = p.massa * ax * p.h / p.L;
    const Nf = Math.max(0.06 * p.W, p.W * (p.b / p.L) - dN + NdF);
    const Nr = Math.max(0.06 * p.W, p.W * (p.a / p.L) + dN + NdR);
    // o volante: o limite acompanha o que o pneu segura na velocidade (um pouco além, para o teclado), e a assistência de contraesterço
    const muF = p.mu * kGrip, muR = p.mu * kGrip * p.balPneu * (1 - INST_TRASEIRA * ins);
    let delta = 0, alF = 0, alR = 0, FyF = 0, FyR = 0;
    if (!arc) { // (no arcade a lateral é o fim do passo; aqui só o que é para a frente)
      const umin = Math.max(Math.abs(u), 5);
      delta = c.steer * volanteMaximo(p, Math.abs(u), kGrip, kCarga);
      const alR0 = Math.atan2(w - p.b * r, umin);
      if (Math.abs(u) > 12) delta -= limite(alR0 * 0.35, -0.08, 0.08) * (1 - 0.6 * Math.abs(c.steer)); // contraesterço automático: ajuda a segurar o escorregão
      // ângulos de deriva
      alF = Math.atan2(w + p.a * r, umin) - delta; alR = Math.atan2(w - p.b * r, umin);
      // forças laterais pedidas pelo pneu (antes do círculo de atrito)
      const kv = limite(V / 2, 0, 1); // o pneu parado não faz força de lado
      FyF = -muF * Nf * pneuLateral(p, alF) * kv; FyR = -muR * Nr * pneuLateral(p, alR) * kv;
    }
    // motor
    let FxMotor = 0;
    if (rev) FxMotor = -0.55 * p.W * Math.max(0, 1 - Math.abs(u) / (70 * ESC)); // a ré chega a uns 70 u/s
    else if (gas > 0 && c.trocaT <= 0) {
      const xr = rotacao(Math.abs(u) / ESC, vmaxU, c.marcha);
      FxMotor = gas * p.eta * p.Ppico * kPot * potencia(xr) / Math.max(Math.abs(u), 5);
    }
    // tração: o eixo de trás segura `muTr·Nr·kTracao` para a frente e `muR·Nr` para o lado, no mesmo círculo (elipse) de atrito:
    // se o motor pede mais força que o pneu dá junto com a lateral, a de tração encolhe para o que o pneu aguenta (o carro
    // patina) e a lateral da traseira perde até 60% da diferença: é o oversteer de quem acelera forte saindo de curva
    const capXr = p.muTr * kTracao * Nr * (amb.chao === false ? 0.5 : 1), capYr = muR * Nr;
    let FxR = FxMotor;
    c.patina = 0;
    if (FxR > 0) {
      const uso = Math.hypot(FxR / capXr, arc ? 0.6 * usoC : FyR / capYr);
      if (uso > 0.97) { const k = 0.97 / uso; c.patina = Math.min(1, (uso - 0.97) / 0.5); FxR *= k; if (!arc) FyR *= 1 - 0.6 * (1 - k); }
    }
    // freio: a força pedida cresce com o pedal, com a carga aerodinâmica (o freio de F1 segura mais em alta) e o que o pneu pode dar
    let FxF = 0, FxBr = 0;
    c.travada = 0;
    if (pedalFreio > 0 && !rev) {
      const atritoFreio = atritoDeFreio(pn ? kGrip : kGrip * 1.35); // (sem pneu das regras de F1, vale o pneu bom de referência)
      const demanda = pedalFreio * kFreio * p.frenagem * p.W * (1 + FREIO_AERO * (DF / p.W));
      const dirB = u > 0.3 ? -1 : u < -0.3 ? 1 : 0;
      const demF = demanda * p.balFreio, demR = demanda * (1 - p.balFreio);
      const usoYF = arc ? usoC : Math.min(1, Math.abs(FyF) / (muF * Nf)), capF = atritoFreio * muF * Nf * Math.sqrt(Math.max(0, 1 - usoYF * usoYF));
      const usoYR = arc ? usoC : Math.min(1, Math.abs(FyR) / capYr), capR = atritoFreio * muR * Nr * Math.sqrt(Math.max(0, 1 - usoYR * usoYR));
      let lockF = 0, lockR = 0, fF = demF, fR = demR;
      if (demF > capF) { lockF = Math.min(1, (demF / Math.max(capF, 1) - 1) / 0.2); fF = capF * (1 - 0.12 * lockF); }
      if (demR > capR) { lockR = Math.min(1, (demR / Math.max(capR, 1) - 1) / 0.2); fR = capR * (1 - 0.12 * lockR); }
      // roda travada perde a lateral: a da frente "não vira", a de trás escapa
      FyF *= 1 - 0.2 * lockF; FyR *= 1 - 0.2 * lockR;
      c.travada = Math.max(lockF, lockR);
      const fatorVel = Math.min(1, Math.abs(u) / 1.5); // parando, o freio some devagar (não vira ré sozinho)
      FxF = dirB * fF * fatorVel; FxBr = dirB * fR * fatorVel;
    }
    // motor parado: freio motor (rotação alta, marcha baixa freiam mais) quando soltou o acelerador
    let FxEb = 0;
    if (gas < 0.05 && u > 0.5 && !rev) FxEb = -p.W * 0.11 * Math.min(1.1, x) * Math.sqrt(1 / FRACAO[c.marcha - 1] / 6) * (c.trocaT > 0 ? 0 : 1);
    // arrasto e rolagem
    const arrasto = q * p.CdA * kArr, rola = p.crr * (p.W + DF);
    let Fres = arrasto + rola;
    const fricGrama = amb.chao === false ? p.massa * (Math.abs(c.v) / p.offMax) ** 2 * 55 * ESC : 0; // a grama segura o carro perto de offMax
    Fres += fricGrama;
    // gravidade na rampa: a inclinação no rumo (dh/ds) puxa para trás na subida e empurra na descida
    const sub_ = amb.subida || 0, Fg = -p.massa * G * (sub_ / Math.sqrt(1 + sub_ * sub_));
    // direções: arrasto contra a velocidade total
    const fxRes = V > 0.01 ? -Fres * (u / V) : 0, fyRes = V > 0.01 ? -(Fres * 2.5) * (w / V) * Math.min(1, V / 8) : 0;
    const cd = Math.cos(delta), sd = Math.sin(delta);
    sub.fx = FxF * cd - FyF * sd + FxR + FxBr + FxEb + fxRes + Fg;
    sub.fy = FyF * cd + FxF * sd + FyR + fyRes;
    sub.mz = p.a * (FyF * cd + FxF * sd) - p.b * FyR;
    // integra
    if (arc) { // arcade: só a velocidade para a frente muda aqui (o lado, no fim do passo)
      const dua = sub.fx / p.massa; let na = u + dua * h;
      if (Math.abs(na) < 0.04 && gas < 0.05 && pedalFreio > 0.05 && !rev) na = 0;
      c.v = na / ESC; c.axL += (dua - c.axL) * Math.min(1, h / 0.08); c.alF = c.alR = 0;
      continue;
    }
    const du = sub.fx / p.massa + w * r, dw = sub.fy / p.massa - u * r, dr = sub.mz / p.Iz;
    let nu = u + du * h, nw = w + dw * h, nr = r + dr * h;
    // parado de vez: nada de deslizar sozinho com o pedal solto (a rampa pequena não move o carro freado)
    if (Math.abs(nu) < 0.04 && gas < 0.05 && pedalFreio > 0.05 && !rev) { nu = 0; }
    c.v = nu / ESC; c.vl = nw / ESC; c.r = nr;
    c.alF = alF; c.alR = alR;
    c.axL += ((du - w * r) - c.axL) * Math.min(1, h / 0.08); // filtro da aceleração para a transferência de peso (≈ 80 ms)
    c.slip = Math.max(Math.abs(Math.sin(alF)), Math.abs(Math.sin(alR))) * V / ESC;
  }
  if (arc) { lateralArcade(c, p, kGrip, ex, pn, amb); return; }
  // posição e rumo
  const velocidade = Math.abs(c.v), vM = velocidade * ESC, qFinal = 0.5 * RHO * vM * vM;
  const ayPneu = p.mu * kGrip * (G + qFinal * p.ClA * kCarga / p.massa) / ESC;
  const guinadaMax = Math.min(p.turn * Math.min(1, velocidade / 90), 1.25 * ayPneu / Math.max(velocidade, 20));
  c.r = limite(c.r, -guinadaMax, guinadaMax); // evita girar o bico mais rápido que os pneus conseguem puxar o carro
  const ca = Math.cos(c.a), sa = Math.sin(c.a);
  c.vx = c.v * ca - c.vl * sa; c.vy = c.v * sa + c.vl * ca;
  c.a += c.r * dt;
  c.x += c.vx * dt; c.y += c.vy * dt;
}

// ---------- a dirigibilidade arcade antiga (o macio dentro da vida útil) ----------
// O volante gira o bico (`turn` do carro, plena a partir de 90 u/s) e a velocidade continua indo para onde ia; é medida de novo no
// eixo novo, e os pneus tiram até `grip` (u/s², sem depender da velocidade) da velocidade de lado. O que passa disso escorrega, come
// velocidade (`scrub`) e, depois de 30 u/s de escorregão, o pneu satura (`kin`). Grudado e responsivo. O resto (motor, freio, câmbio,
// tração) é o do passo normal; a curva divide o pneu com o freio e a tração pelo `uso`.
const VOLANTE_PLENO = 90, KIN_SATURA = 30, PERDA_PATINANDO = 0.3;
const guinadaDoVolante = (p, vU, steer = 1) => steer * p.turn * Math.min(1, Math.abs(vU) / VOLANTE_PLENO) * (vU < 0 ? -1 : 1);
// o contrário: o volante (-1..1) que dá a guinada `w` a `vU` (o piloto automático e os robôs)
const volanteParaGuinada = (p, vU, w) => { const k = p.turn * Math.min(1, Math.abs(vU) / VOLANTE_PLENO) * (vU < 0 ? -1 : 1); return Math.abs(k) < 1e-6 ? 0 : limite(w / k, -1, 1); };
function lateralArcade(c, p, kGrip, ex, pn, amb) {
  const dt = PASSO, w = guinadaDoVolante(p, c.v, c.steer);
  // o pneu relativo ao médio novo (o `grip` do carro já é o do médio) e o resto (dano, asfalto, ar sujo) como no passo normal
  const k = kGrip / (pn.rel ? pn.grip / pn.rel : 1);
  const sat = c.slip > KIN_SATURA ? limite(p.kinU * (pn.kin || 1), 0.3, 1) : 1;
  const gripU = p.gripU * k * sat * (1 - 0.2 * c.travada) * (1 - PERDA_PATINANDO * c.patina) * (1 - 0.5 * (c.inst > 0 ? c.inst : 0));
  c.uso = gripU > 1 ? limite(Math.abs(c.v * w) / gripU, 0, 1) : 0;
  // a guinada que a batida deu (`rIns`) segue além do volante e se apaga sozinha
  const ri = c.rIns || 0; c.rIns = Math.abs(ri) < 0.01 ? 0 : ri * Math.exp(-dt * (1.2 + 3 * (1 - (c.inst > 0 ? c.inst : 0))));
  c.r = w + ri;
  const ca0 = Math.cos(c.a), sa0 = Math.sin(c.a), vx = c.v * ca0 - c.vl * sa0, vy = c.v * sa0 + c.vl * ca0;
  c.a += c.r * dt; // gira o bico: a velocidade no mundo não muda e passa a ser medida no eixo novo
  const cn = Math.cos(c.a), sn = Math.sin(c.a);
  c.v = vx * cn + vy * sn; c.vl = -vx * sn + vy * cn;
  const g = gripU * dt; // os pneus puxam o carro para o novo rumo até o limite de aderência; o resto escorrega e freia
  if (Math.abs(c.vl) <= g) c.vl = 0;
  else { c.vl -= Math.sign(c.vl) * g; c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), p.scrub * 3 * Math.abs(c.vl) * dt); }
  c.slip = Math.abs(c.vl);
  const ca = Math.cos(c.a), sa = Math.sin(c.a);
  c.vx = c.v * ca - c.vl * sa; c.vy = c.v * sa + c.vl * ca;
  c.x += c.vx * dt; c.y += c.vy * dt;
}
// ---------- análise (para os robôs e para os testes) ----------
// Tudo em u e u/s. `ext` (opcional): multiplicadores soltos { potencia, arrasto, carga, grip, freio, tracao }.
const em = (ext, k) => (ext && ext[k]) || 1;
// a aceleração lateral que o pneu segura a `vU` (u/s²), com a carga aerodinâmica
function aceleracaoLateral(spec, vU, ext) {
  const p = parametros(spec), v = vU * ESC, q = 0.5 * RHO * v * v;
  return (p.mu * em(ext, "grip") * (G + (q * p.ClA * em(ext, "carga")) / p.massa)) / ESC;
}
// a maior velocidade (u/s) numa curva de raio `raioU` (u): v²/R = a_lat(v). Sem limite (reta ou curva aberta): a velocidade final
function velocidadeDeCurva(spec, raioU, ext) {
  const p = parametros(spec), top = velocidadeFinal(spec, ext);
  if (!(raioU > 0) || raioU > 1e8) return top;
  const R = raioU * ESC, mu = p.mu * em(ext, "grip"), k = (0.5 * RHO * p.ClA * em(ext, "carga")) / p.massa; // a_lat = mu·(G + k·v²)
  const den = 1 / R - mu * k;
  if (den <= 1e-9) return top;
  return Math.min(top, Math.sqrt((mu * G) / den) / ESC);
}
// a velocidade final (u/s) a toda força numa reta plana: onde a força do motor na marcha ideal iguala o arrasto
function velocidadeFinal(spec, ext) {
  const p = parametros(spec), P = p.Ppico * em(ext, "potencia"), arr = em(ext, "arrasto");
  let lo = 20, hi = spec.vmax * 1.6;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2, v = m * ESC, q = 0.5 * RHO * v * v, x = rotacao(m, p.vmaxU, NUM);
    const F = p.eta * P * potencia(x) / v, R = q * p.CdA * arr + p.crr * (p.W + q * p.ClA * em(ext, "carga"));
    if (F > R) lo = m; else hi = m;
  }
  return lo;
}
// a aceleração longitudinal máxima a `vU` na marcha ideal (u/s²), numa subida de inclinação `subida` (dh/ds)
function aceleracaoMaxima(spec, vU, subida = 0, ext) {
  const p = parametros(spec), v = vU * ESC, q = 0.5 * RHO * v * v, DF = q * p.ClA * em(ext, "carga");
  const g = marchaIdeal(vU, p.vmaxU), x = rotacao(vU, p.vmaxU, g);
  const Fm = p.eta * p.Ppico * em(ext, "potencia") * potencia(x) / Math.max(v, 5);
  const Nr = 0.55 * p.W + 0.6 * DF + p.massa * 6 * p.h / p.L;
  const Ft = p.muTr * em(ext, "tracao") * Nr * 0.9;
  const F = Math.min(Fm, Ft) - q * p.CdA * em(ext, "arrasto") - p.crr * (p.W + DF) - p.massa * G * (subida / Math.sqrt(1 + subida * subida));
  return F / p.massa / ESC;
}
// a frenagem máxima (u/s², positiva) a `vU` em linha reta: o freio de F1 segura mais em alta, e o arrasto e a descida ajudam ou atrapalham
function frenagemMaxima(spec, vU, subida = 0, ext) {
  const p = parametros(spec), v = vU * ESC, q = 0.5 * RHO * v * v, DF = q * p.ClA * em(ext, "carga");
  // o freio pedido (com o pedal cheio) e o que os pneus da frente e de trás seguram antes de travar (a mesma conta do passo, em linha reta)
  const dem = em(ext, "freio") * p.frenagem * p.W * (1 + FREIO_AERO * DF / p.W), kG = ext && ext.grip ? ext.grip : 1;
  const mu = atritoDeFreio(ext && ext.grip ? kG : kG * 1.35) * p.mu * kG;
  let Fb = dem;
  for (let i = 0; i < 3; i++) { // o peso passa para a frente com a própria frenagem: itera a desaceleração
    const a = (Fb + q * p.CdA * em(ext, "arrasto") + p.crr * (p.W + DF)) / p.massa, dN = (p.massa * a * p.h) / p.L;
    const capF = mu * Math.max(0.06 * p.W, p.W * (p.b / p.L) + dN + DF * p.balAero), capR = mu * p.balPneu * Math.max(0.06 * p.W, p.W * (p.a / p.L) - dN + DF * (1 - p.balAero));
    Fb = Math.min(dem * p.balFreio, capF) + Math.min(dem * (1 - p.balFreio), capR);
  }
  const F = Fb + q * p.CdA * em(ext, "arrasto") + p.crr * (p.W + DF) + p.massa * G * (subida / Math.sqrt(1 + subida * subida));
  return F / p.massa / ESC;
}
// a distância (u) para ir de v0 a v1 freando no máximo, e o tempo (s); integra passo a passo
function distanciaDeFrenagem(spec, v0, v1, subida = 0, ext) {
  let v = v0, d = 0, t = 0;
  const dt = 0.005;
  for (let i = 0; i < 20000 && v > v1; i++) { const a = frenagemMaxima(spec, v, subida, ext); v -= a * dt; d += v * dt; t += dt; }
  return { distancia: d, tempo: t };
}
// o tempo (s) e a distância para acelerar de v0 a v1 (u/s) a toda força numa reta plana; Infinity se não chega lá
function tempoParaAcelerar(spec, v0, v1, subida = 0, ext) {
  let v = v0, t = 0, d = 0;
  const dt = 0.01;
  for (let i = 0; i < 20000; i++) {
    if (v >= v1) return { tempo: t, distancia: d };
    const a = aceleracaoMaxima(spec, v, subida, ext);
    if (a <= 0.01) return { tempo: Infinity, distancia: Infinity };
    v += a * dt; d += v * dt; t += dt;
  }
  return { tempo: Infinity, distancia: Infinity };
}
// o perfil de velocidade ideal numa pista (limite de aderência): `pts` têm k (curvatura) e h (altura), de `passo` em `passo` unidades.
// Devolve as velocidades (u/s) em cada ponto: a menor entre a da curva e o que dá para frear até lá e acelerar daqui.
// `margem` (0..1) fica abaixo do limite de curva (um piloto ideal usa ~0,97) e `margemFreio` abaixo da frenagem máxima: frear
// no limite e virar ao mesmo tempo passa do círculo de atrito (trava a roda), então o piloto freia um pouco mais cedo.
function perfilIdeal(pts, spec, passo = 6, margem = 0.97, ext, margemFreio = 0.8) {
  const n = pts.length, top = velocidadeFinal(spec, ext), lim = new Float64Array(n), v = new Float64Array(n);
  const incl = (i) => (pts[(i + 1) % n].h - pts[i].h) / passo;
  for (let i = 0; i < n; i++) lim[i] = pts[i].k > 1e-6 ? velocidadeDeCurva(spec, 1 / pts[i].k, ext) * margem : top;
  for (let i = 0; i < n; i++) v[i] = Math.min(lim[i], top);
  for (let volta = 0; volta < 3; volta++) { // para trás: onde dá para frear; para frente: onde dá para acelerar
    for (let k = n * 2 - 1; k >= 0; k--) {
      const i = k % n, j = (i + 1) % n, a = frenagemMaxima(spec, v[j], incl(i), ext) * margemFreio;
      v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * a * passo));
    }
    for (let k = 0; k < n * 2; k++) {
      const i = k % n, j = (i + 1) % n, a = Math.max(0, aceleracaoMaxima(spec, v[i], incl(i), ext));
      v[j] = Math.min(v[j], Math.sqrt(v[i] * v[i] + 2 * a * passo));
    }
  }
  return v;
}
// o estado inicial de um carro parado
function novoCarro(x = 0, y = 0, a = 0) {
  return { x, y, a, v: 0, vl: 0, r: 0, vx: 0, vy: 0, steer: 0, gasP: 0, brkP: 0, marcha: 1, trocaT: 0, rpm: 0.3, axL: 0, travada: 0, patina: 0, slip: 0, uso: 0, inst: 0, instK: 0, rIns: 0 };
}

const api = { ESC, G, G_U, RHO, PASSO, NUM, RPM_MAX, FRACAO, CORTE, SOBE, DESCE, TROCA_T, EXTRA_PADRAO, parametros, potencia, vCorte, rotacao, rpmDe, marchaAuto, marchaIdeal, pneuLateral, guinadaDoVolante, volanteParaGuinada,
  passo, novoCarro, volanteMaximo, aceleracaoLateral, velocidadeDeCurva, velocidadeFinal, aceleracaoMaxima, frenagemMaxima, distanciaDeFrenagem, tempoParaAcelerar, perfilIdeal };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Dinamica = api;
})(typeof window !== "undefined" ? window : globalThis);
