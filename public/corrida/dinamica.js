// Corrida da Galera — a dinâmica do carro de F1 (UMD: o navegador carrega por <script>/import e o servidor usa `require`).
// Só contas, sem desenho e sem pista: a mesma física roda no navegador (previsão) e no servidor (autoridade), e os robôs
// usam as funções de análise do fim do arquivo (velocidade máxima de curva, frenagem, aceleração por marcha, rampa).
//
// O MODELO (em unidades do SI por dentro; a pista fala em "unidades", e 1 unidade = ESC metros, a mesma conta do
// velocímetro: km/h = 0,75 × u/s). Dois pedaços, de épocas diferentes:
//  PARA A FRENTE (a física de F1 de verdade):
//  - carro de verdade: massa, distância entre eixos, centro de gravidade (45% da carga na frente), transferência de peso;
//  - motor: curva de potência por rotação, 8 marchas que esticam até o corte (12 mil rpm), troca com corte de força;
//  - arrasto aerodinâmico ∝ v², resistência de rolagem, downforce ∝ v² (carga e arrasto andam juntos);
//  - tração do eixo de trás limitada pelo pneu (patina), freio progressivo (o pedal sobe com o tempo) que trava a roda;
//  - gravidade na rampa (subida tira velocidade, descida dá).
//  PARA O LADO (a dirigibilidade de antes, a do kart de F1 de `cfac976`, agora com o pneu mandando mais):
//  - virar gira o bico (`turn` do carro × o volante × a velocidade até 90 u/s) e a velocidade continua indo para onde ia;
//  - os pneus puxam o carro para a nova direção até `grip` (u/s² de velocidade de lado que tiram); o que passa disso
//    escorrega, come velocidade (`scrub`) e, depois que o escorregão passa de 30 u/s, o pneu satura (`kin`);
//  - o composto, o desgaste e a temperatura do pneu (f1-regras.js) mexem no `grip`, no `kin`, na agilidade do volante e na
//    "solta": pneu frio ou acabado perde a frente (understeer) fora do acelerador e a traseira (oversteer) no acelerador.
// O `spec` do carro (vmax, acc, brake, grip, kin, turn, scrub, offMax, wall; ver CARROS em pistas.js e f1-equipes.js)
// continua sendo a descrição do carro: `parametros(spec)` converte nos números físicos.
(function (root) {

const ESC = 0.75 / 3.6;      // metros por unidade da pista
const G = 9.81, G_U = G / ESC; // gravidade (m/s² e u/s²)
const RHO = 1.2;
const PASSO = 1 / 120;       // o passo fixo da física, no navegador e no servidor: nada depende do tempo do quadro
const limite = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- o câmbio de 8 marchas ----------
// `FRACAO[i]`: a velocidade em que a marcha i+1 chega ao corte (12 mil rpm), em fração da da 8ª. Espaçadas como numa F1:
// as de baixo mais abertas, as de cima mais juntas, para o motor ficar entre ~9,8 e ~11,8 mil rpm acelerando.
const NUM = 8, RPM_MAX = 12000;
const FRACAO = [0.265, 0.348, 0.434, 0.526, 0.632, 0.75, 0.87, 1];
const CORTE = 1.07;          // a 8ª chega ao corte a 1,07 × a velocidade final: sobra para DRS, vácuo e ERS
const SOBE = 0.985, DESCE = 0.62; // o automático sobe perto do corte e desce quando a rotação cai demais
const TROCA_T = 0.05;        // quanto dura a troca: a força do motor some
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
function parametros(spec) {
  const chave = [spec.vmax, spec.acc, spec.brake, spec.grip, spec.kin, spec.turn, spec.scrub, spec.offMax, spec.wall, spec.drs ?? 1].join("|");
  let p = CACHE.get(chave); if (p) return p;
  const massa = 800 * (0.72 + 0.5 * spec.wall);                 // o tanque é mais pesado, a formiga mais leve
  const W = massa * G;
  const L = 3.6, a = 0.55 * L, b = 0.45 * L, h = 0.25;          // distância entre eixos, CG→frente, CG→trás e altura do CG (m)
  const Iz = massa * (0.5 * L) ** 2;
  const gn = spec.grip / 470;
  const ClA = 3.5 * gn ** 2.5, CdA = 0.9 + 0.8 * ClA;        // carga e arrasto: mais carga, mais arrasto (e menos velocidade final)
  const crr = 0.012;
  const vmaxM = spec.vmax * ESC;
  const qv = 0.5 * RHO * vmaxM * vmaxM;
  const res = qv * CdA + crr * (W + qv * ClA);                  // a força que o carro vence a toda velocidade final
  const eta = 0.94;
  const Ppico = (res * vmaxM) / (eta * potencia(1 / CORTE));
  // aderência: a lateral é a de antes (`grip` em u/s², sem depender da velocidade); `mu` só vale para a trava do freio, e a
  // arrancada (`acc`) define a tração do eixo traseiro
  const mu = 2.1 * 1.3 * (0.35 + 0.65 * gn);
  const a0 = spec.acc * ESC;
  const muTr = (massa * a0) / (0.55 * W + massa * a0 * (h / L));
  const frenagem = 1.75 * (spec.brake / 470);                  // o freio a zero de velocidade, em g
  p = { massa, W, L, a, b, h, Iz, ClA, CdA, crr, Ppico, eta, mu, muTr, frenagem, gripU: spec.grip, kin: limite(spec.kin, 0.3, 1),
    // o balanço aerodinâmico (parte da carga que vai para a frente) e o do freio (parte da força que vai para a frente)
    balAero: 0.34, balFreio: 0.6, balPneu: 1.03,
    vmaxU: spec.vmax, offMax: spec.offMax, accU: spec.acc, scrub: spec.scrub, turn: spec.turn, desgaste: spec.desgaste ?? 1, drs: spec.drs ?? 1 };
  if (CACHE.size > 80) CACHE.clear();
  CACHE.set(chave, p);
  return p;
}

// ---------- a direção (a de antes) ----------
// A guinada (rad/s) que o volante `steer` (-1..1) dá a `vU` (u/s): `turn` do carro, plena a partir de 90 u/s e crescendo
// com a velocidade até lá. Sentido contrário na ré. `agil` é a agilidade do pneu (o macio vira mais "na mão").
const VOLANTE_PLENO = 90;
const guinadaDoVolante = (p, vU, steer = 1, agil = 1) => steer * p.turn * agil * Math.min(1, Math.abs(vU) / VOLANTE_PLENO) * (vU < 0 ? -1 : 1);
// o contrário: o volante (-1..1) que dá a guinada `w` a `vU` (para o piloto automático e os robôs)
const volanteParaGuinada = (p, vU, w, agil = 1) => { const k = p.turn * agil * Math.min(1, Math.abs(vU) / VOLANTE_PLENO) * (vU < 0 ? -1 : 1); return Math.abs(k) < 1e-6 ? 0 : limite(w / k, -1, 1); };

// ---------- o passo da dinâmica ----------
// Estado (`c`, em unidades da pista e radianos; `novoCarro` cria um): x, y, a (rumo), v (velocidade para a frente, u/s), vl (para o
// lado, u/s, positiva para o lado em que `a` cresce), r (guinada aplicada neste passo, rad/s), steer (volante suavizado, -1..1), gasP e
// brkP (os pedais, 0..1), marcha, trocaT (a troca de marcha em andamento), axL (aceleração longitudinal filtrada, m/s², que move o
// peso entre os eixos), rpm (fração do corte), travada e patina (0..1: roda travada na frenagem, roda patinando na tração), slip
// (u/s: a velocidade de lado que o pneu não segurou; passou de 30, o pneu satura), uso (0..1: quanto da aderência lateral a
// curva pede, que divide o pneu com o freio e a tração) e vx, vy (a velocidade no mundo).
// Entrada: { gas, brake, steer (-1..1) } — gas e brake são 0 ou 1 (ou analógicos).
// Ambiente: { chao (sobre o asfalto?), subida (inclinação dh/ds do chão no rumo), ar (no ar), manual, marchaManual,
//   pn: F1.aderencia(pneu) ou null, dano: F1.efeitoDoDano(dano) ou null, drs (aberto), ers (ativo), vacuo ({final,acel,aderencia} ou null),
//   curva (para o ar sujo), limiteV (teto de velocidade em u/s por bandeira), extra (multiplicadores soltos) }
const KIN_SATURA = 30;         // a partir de quanto de escorregão lateral (u/s) o pneu satura e passa a segurar só `kin` do grip
const PERDA_PATINANDO = 0.3;   // quanto do grip lateral some com a traseira patinando (saída de curva lenta com o acelerador cheio)
const SOLTA_FRENTE = 1.2, SOLTA_TRASEIRA = 0.45; // o peso da "solta" do pneu na perda da frente e no giro da traseira
const GRIP_REF = 1.06;         // o grip do pneu médio novo e quente: a trava do freio não ganha nem perde com o composto
function passo(c, ent, amb, p, dt = PASSO) {
  const ex = amb.extra || EXTRA_PADRAO, pn = amb.pn, dn = amb.dano;
  // a aderência lateral: o pneu (composto, desgaste, temperatura), o dano, o asfalto e o ar sujo multiplicam o `grip` do carro
  const kGrip = (pn ? pn.grip : 1) * (dn ? dn.grip : 1) * (ex.grip || 1) * (amb.chao === false ? 0.5 : 1) * (amb.vacuo ? amb.vacuo.aderencia : 1);
  const kLong = pn ? kGrip / GRIP_REF : kGrip; // a mesma conta sem a vantagem do composto (a trava do freio usa esta)
  const kFreio = (pn ? pn.freio : 1) * (dn ? dn.freio : 1) * (ex.freio || 1);
  const kTracao = (pn ? pn.tracao : 1) * (dn ? dn.tracao : 1) * (ex.tracao || 1);
  const fin = (pn ? pn.final : 1) * (dn ? dn.final : 1);
  const kPot = fin * fin * fin * (ex.potencia || 1) * (amb.ers ? 1.09 : 1);
  const drsK = amb.drs ? p.drs : 0;
  const kArr = (ex.arrasto || 1) * (amb.drs ? (1 + 0.05 * drsK) ** -3 : 1) * (amb.vacuo ? (1 + amb.vacuo.final) ** -3 : 1);
  const kCarga = (ex.carga || 1) * (amb.drs ? 0.85 : 1);
  // pedais: o acelerador sobe em ~0,3 s e solta rápido; o freio sobe em ~0,3 s (por isso dá para frear "progressivo" soltando antes)
  const gasT = ent.gas ? 1 : 0, brkT = ent.brake ? 1 : 0;
  c.gasP += limite(gasT - c.gasP, -dt * 8, dt * 3.5);
  c.brkP += limite(brkT - c.brkP, -dt * 7, dt * 3.2);
  // volante: o alvo é o comando e o volante o segue em ~0,1 s (a mesma suavização de antes)
  c.steer += (limite(ent.steer || 0, -1, 1) - c.steer) * Math.min(1, dt * 10);
  const uU = c.v;
  // câmbio
  const vmaxU = p.vmaxU;
  if (amb.manual) { const g = limite(amb.marchaManual || c.marcha || 1, 1, NUM); if (g !== c.marcha) { c.marcha = g; c.trocaT = TROCA_T; } }
  else { const g = marchaAuto(Math.max(0, uU), vmaxU, c.marcha); if (g !== c.marcha) { c.marcha = g; c.trocaT = TROCA_T; } }
  c.trocaT = Math.max(0, c.trocaT - dt);
  const x = rotacao(uU, vmaxU, c.marcha);
  c.rpm = Math.max(0.3, x);
  const agil = pn ? pn.agil : 1;
  if (amb.ar) { // no ar: sem pneu e sem motor; só o arrasto, e o bico gira pouco (a velocidade no mundo não muda)
    const V = Math.hypot(c.v, c.vl) * ESC, q = 0.5 * RHO * V * V * p.CdA * kArr;
    const fric = Math.min(1, (q / p.massa) * dt / Math.max(V, 1));
    c.v -= c.v * fric; c.vl -= c.vl * fric; c.slip = 0; c.travada = 0; c.patina = 0; c.uso = 0;
    c.r = guinadaDoVolante(p, c.v, c.steer, agil) * 0.35;
    girar(c, c.r * dt);
    mover(c, dt);
    return;
  }
  // limite de velocidade por bandeira (safety car, amarela): corta o acelerador e freia
  const limiteV = amb.limiteV || Infinity, acima = uU > limiteV;
  const gas = acima ? 0 : c.gasP, freioAuto = acima ? Math.min(1, (uU - limiteV) / 25 + 0.25) : 0;
  const pedalFreio = Math.max(c.brkP, freioAuto);
  const rev = uU < 1 && ent.brake && !ent.gas && c.brkP > 0.5; // parado e só o freio: dá ré
  const h = dt / 2; // duas passadas por passo: o eixo da frente e de trás ficam estáveis em baixa velocidade
  const uso = c.uso || 0; // o quanto a curva está pedindo do pneu (do passo anterior)
  for (let s = 0; s < 2; s++) {
    const u = c.v * ESC, w = c.vl * ESC;
    const V2 = u * u + w * w, V = Math.sqrt(V2), q = 0.5 * RHO * V2;
    const DF = q * p.ClA * kCarga * (amb.curva && amb.vacuo ? amb.vacuo.aderencia : 1);
    const NdF = DF * p.balAero, NdR = DF * (1 - p.balAero);
    const dN = p.massa * c.axL * p.h / p.L;
    const Nf = Math.max(0.06 * p.W, p.W * (p.b / p.L) - dN + NdF);
    const Nr = Math.max(0.06 * p.W, p.W * (p.a / p.L) + dN + NdR);
    // motor
    let FxMotor = 0;
    if (rev) FxMotor = -0.55 * p.W * Math.max(0, 1 - Math.abs(u) / (70 * ESC)); // a ré chega a uns 70 u/s
    else if (gas > 0 && c.trocaT <= 0) {
      const xr = rotacao(Math.abs(u) / ESC, vmaxU, c.marcha);
      FxMotor = gas * p.eta * p.Ppico * kPot * potencia(xr) / Math.max(Math.abs(u), 5);
    }
    // tração: o eixo de trás segura `muTr·Nr·kTracao` para a frente; a curva (`uso`) divide o mesmo círculo de atrito: se o motor
    // pede mais força que o pneu dá junto com a lateral, a de tração encolhe para o que o pneu aguenta (o carro patina)
    const capXr = p.muTr * kTracao * Nr * (amb.chao === false ? 0.5 : 1);
    let FxR = FxMotor;
    c.patina = 0;
    if (FxR > 0) {
      const usoT = Math.hypot(FxR / capXr, 0.6 * uso);
      if (usoT > 0.97) { const k = 0.97 / usoT; c.patina = Math.min(1, (usoT - 0.97) / 0.5); FxR *= k; }
    }
    // freio: a força pedida cresce com o pedal, com a carga aerodinâmica (o freio de F1 segura mais em alta) e o que o pneu pode dar
    let FxBr = 0;
    c.travada = 0;
    if (pedalFreio > 0 && !rev) {
      const demanda = pedalFreio * kFreio * p.frenagem * p.W * (1 + 0.55 * (DF / p.W));
      const dirB = u > 0.3 ? -1 : u < -0.3 ? 1 : 0;
      const demF = demanda * p.balFreio, demR = demanda * (1 - p.balFreio);
      const rest = Math.sqrt(Math.max(0, 1 - uso * uso)); // a curva usa parte da aderência: sobra menos para frear
      const muF = p.mu * kLong, muR = muF * p.balPneu;
      const capF = 1.25 * muF * Nf * rest, capR = 1.25 * muR * Nr * rest;
      let lockF = 0, lockR = 0, fF = demF, fR = demR;
      if (demF > capF) { lockF = Math.min(1, (demF / Math.max(capF, 1) - 1) / 0.2); fF = capF * (1 - 0.12 * lockF); }
      if (demR > capR) { lockR = Math.min(1, (demR / Math.max(capR, 1) - 1) / 0.2); fR = capR * (1 - 0.12 * lockR); }
      c.travada = Math.max(lockF, lockR);
      const fatorVel = Math.min(1, Math.abs(u) / 1.5); // parando, o freio some devagar (não vira ré sozinho)
      FxBr = dirB * (fF + fR) * fatorVel;
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
    // o arrasto age contra a velocidade para a frente
    const fxRes = V > 0.01 ? -Fres * (u / V) : 0;
    const du = (FxBr + FxR + FxEb + fxRes + Fg) / p.massa;
    let nu = u + du * h;
    // parado de vez: nada de deslizar sozinho com o pedal solto (a rampa pequena não move o carro freado)
    if (Math.abs(nu) < 0.04 && gas < 0.05 && pedalFreio > 0.05 && !rev) { nu = 0; }
    c.v = nu / ESC;
    c.axL += (du - c.axL) * Math.min(1, h / 0.08); // filtro da aceleração para a transferência de peso (≈ 80 ms)
  }
  // ---------- para o lado: o jeito de virar de antes ----------
  // O volante gira o bico; a velocidade continua no mundo e é medida de novo no eixo novo; os pneus tiram até `grip·dt` da
  // velocidade de lado, e o que sobra é escorregão (que come velocidade). Na ré a direção vira ao contrário.
  const vf = c.v;
  let w = guinadaDoVolante(p, vf, c.steer, agil);
  const saturado = c.slip > KIN_SATURA;
  const gripU = p.gripU * kGrip * (saturado ? limite(p.kin * (pn ? pn.kin : 1), 0.3, 1) : 1) * (1 - 0.2 * c.travada) * (1 - PERDA_PATINANDO * c.patina);
  // quanto o volante pede do pneu (1 = no limite): divide o pneu com o freio e a tração, e é o que faz o pneu "soltar"
  const pede = gripU > 1 ? Math.abs(vf * w) / gripU : 0, passou = Math.min(1.5, Math.max(0, pede - 1));
  c.uso = limite(pede, 0, 1);
  // pneu frio ou acabado: sem acelerador a frente não aguenta o que o volante pede (o carro abre a trajetória); no acelerador a
  // traseira vem (o carro gira mais do que o volante, e a saída de curva exige contraesterço)
  if (pn && pn.solta > 0 && passou > 0) {
    const frente = 1 / (1 + SOLTA_FRENTE * pn.solta * (1 - c.gasP) * passou), traseira = 1 + SOLTA_TRASEIRA * pn.solta * c.gasP * Math.min(1, passou);
    w *= frente * traseira;
  }
  c.r = w;
  girar(c, w * dt);
  // os pneus puxam o carro para o novo rumo até o limite de aderência; o resto escorrega e freia
  const g = gripU * dt;
  if (Math.abs(c.vl) <= g) c.vl = 0;
  else { c.vl -= Math.sign(c.vl) * g; c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), p.scrub * 3 * Math.abs(c.vl) * dt); }
  c.slip = Math.abs(c.vl);
  mover(c, dt);
}
// gira o bico em `da` radianos: a velocidade no mundo não muda e passa a ser medida no eixo novo (o que sobra de lado é escorregão)
function girar(c, da) {
  const ca = Math.cos(c.a), sa = Math.sin(c.a), vx = c.v * ca - c.vl * sa, vy = c.v * sa + c.vl * ca;
  c.a += da;
  const cn = Math.cos(c.a), sn = Math.sin(c.a);
  c.v = vx * cn + vy * sn; c.vl = -vx * sn + vy * cn;
}
// a velocidade no mundo e a posição
function mover(c, dt) {
  const ca = Math.cos(c.a), sa = Math.sin(c.a);
  c.vx = c.v * ca - c.vl * sa; c.vy = c.v * sa + c.vl * ca;
  c.x += c.vx * dt; c.y += c.vy * dt;
}

// ---------- análise (para os robôs e para os testes) ----------
// Tudo em u e u/s. `ext` (opcional): multiplicadores soltos { potencia, arrasto, carga, grip, freio, tracao, agil }.
const em = (ext, k) => (ext && ext[k]) || 1;
// a aceleração lateral que o pneu segura (u/s²): a de antes, `grip` do carro vezes a aderência do pneu, que não depende da velocidade
function aceleracaoLateral(spec, vU, ext) {
  return spec.grip * em(ext, "grip");
}
// a maior velocidade (u/s) numa curva de raio `raioU` (u): v²/R = grip (o pneu segura) e v/R = guinada do volante todo (o carro
// vira). Sem limite (reta ou curva aberta): a velocidade final
function velocidadeDeCurva(spec, raioU, ext) {
  const top = velocidadeFinal(spec, ext);
  if (!(raioU > 0) || raioU > 1e8) return top;
  // o volante todo nunca fecha mais que o raio mínimo (VOLANTE_PLENO / turn): uma quina da linha (raio quase zero) é feita no
  // raio mínimo, e não parada
  const raio = Math.max(raioU, VOLANTE_PLENO / (spec.turn * em(ext, "agil")));
  return Math.min(top, Math.sqrt(spec.grip * em(ext, "grip") * raio), raio * spec.turn * em(ext, "agil"));
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
  const Fb = em(ext, "freio") * p.frenagem * p.W * (1 + 0.55 * DF / p.W);
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
  return { x, y, a, v: 0, vl: 0, r: 0, vx: 0, vy: 0, steer: 0, gasP: 0, brkP: 0, marcha: 1, trocaT: 0, rpm: 0.3, axL: 0, travada: 0, patina: 0, slip: 0, uso: 0 };
}

const api = { ESC, G, G_U, RHO, PASSO, NUM, RPM_MAX, FRACAO, CORTE, SOBE, DESCE, TROCA_T, EXTRA_PADRAO, parametros, potencia, vCorte, rotacao, rpmDe, marchaAuto, marchaIdeal,
  passo, novoCarro, guinadaDoVolante, volanteParaGuinada, aceleracaoLateral, velocidadeDeCurva, velocidadeFinal, aceleracaoMaxima, frenagemMaxima, distanciaDeFrenagem, tempoParaAcelerar, perfilIdeal };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Dinamica = api;
})(typeof window !== "undefined" ? window : globalThis);
