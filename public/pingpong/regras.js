// Tênis de Mesa da Galera — as regras e a física, iguais no servidor e no navegador.
// Tudo em metros, segundos e radianos, com as medidas oficiais: mesa de 2,74 x 1,525 m a 76 cm do chão, rede de
// 15,25 cm e a bola de 40 mm (2,7 g). O jogador do lado 0 fica no +z, o do lado 1 no −z (S(lado) dá o sinal).
// A bola voa com gravidade, arrasto do ar (ela perde velocidade de verdade: a cortada morre, o smash chega) e o efeito
// Magnus do giro w = [wx, wy, wz] (rad/s): o top spin mergulha, a cortada flutua, o lateral faz a curva. No quique
// da mesa, o atrito entre a borracha da bola e o tampo troca velocidade por giro (o top spin acelera e baixa, a
// cortada freia e chega a voltar). Quem recebe o pacote da batida (posição, velocidade, giro e a hora) calcula o
// mesmo voo, passo a passo.
// A raquetada é assistida (como no Table Tennis Pro): o gesto do mouse na hora da batida vira força, efeito e mira, e
// daí sai o alvo na mesa do outro lado; um resolvedor acha a velocidade que leva a bola até lá com o ar e o giro. O
// erro vem do próprio gesto (forte demais sai longo, de lado demais sai pela lateral) e do giro de quem mandou a bola
// (devolver um top spin sem fechar a raquete sobe; uma cortada sem abrir cai na rede).
(function (root) {
  const MESA = { L: 2.74, W: 1.525, H: 0.76, REDE: 0.1525, POSTE: 0.1525 };
  const G = 9.81, R = 0.02, PASSO = 1 / 240;
  // ar: arrasto (½ρCdA/m), Magnus (½ρAr·Cl/m) e a perda de giro por segundo
  const AR = { arrasto: 0.13, magnus: 0.0052, giro: 0.05 };
  // quique na mesa: restituição (a bola de 30 cm volta a ~23 cm) e o atrito da borracha da bola no tampo
  const QUIQUE = { e: 0.88, atrito: 0.35 };
  const S = (lado) => (lado ? -1 : 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mod = (x, z) => Math.sqrt(x * x + z * z);

  // ---------- o voo ----------
  // um passo de integração (Euler semi-implícito, igual nos dois navegadores)
  function passo(p, v, w, h) {
    const vel = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]), kd = AR.arrasto * vel, km = AR.magnus;
    const ax = -kd * v[0] + km * (w[1] * v[2] - w[2] * v[1]);
    const ay = -kd * v[1] + km * (w[2] * v[0] - w[0] * v[2]) - G;
    const az = -kd * v[2] + km * (w[0] * v[1] - w[1] * v[0]);
    v[0] += ax * h; v[1] += ay * h; v[2] += az * h;
    p[0] += v[0] * h; p[1] += v[1] * h; p[2] += v[2] * h;
    const perde = 1 - AR.giro * h; w[0] *= perde; w[1] *= perde; w[2] *= perde;
  }
  // o quique no tampo: a restituição na vertical e o atrito no ponto de contato (esfera oca: I = ⅔mr²). O atrito
  // tenta fazer a bola rolar; se não dá (escorrega), fica no limite do coeficiente.
  function quicar(v, w) {
    const vn = -v[1];
    v[1] = vn * QUIQUE.e;
    const ux = v[0] + w[2] * R, uz = v[2] - w[0] * R, u = mod(ux, uz);
    if (u > 1e-6) {
      const j = Math.min(QUIQUE.atrito * (1 + QUIQUE.e) * vn, 0.4 * u), jx = -j * ux / u, jz = -j * uz / u;
      v[0] += jx; v[2] += jz;
      w[0] += -1.5 * jz / R; w[2] += 1.5 * jx / R;
    }
  }
  // b = { p: [x, y, z], v: [vx, vy, vz], w: [wx, wy, wz], viva }. Devolve os eventos do trecho: quique (com o
  // lado), rede, chão.
  function voar(b, dt, ev = []) {
    if (!b.w) b.w = [0, 0, 0];
    for (let t = 0; t < dt - 1e-9; t += PASSO) {
      const h = Math.min(PASSO, dt - t), p = b.p, v = b.v, z0 = p[2], y0 = p[1];
      passo(p, v, b.w, h);
      if (v[1] < 0 && p[1] <= MESA.H + R && y0 > MESA.H - 0.03 && Math.abs(p[0]) <= MESA.W / 2 && Math.abs(p[2]) <= MESA.L / 2) {
        p[1] = MESA.H + R; quicar(v, b.w);
        ev.push({ tipo: "quique", lado: p[2] > 0 ? 0 : 1 });
      }
      if (z0 !== 0 && Math.sign(z0) !== Math.sign(p[2])) { // cruzou a rede: na altura da fita, bateu
        const k = z0 / (z0 - p[2]), y = y0 + (p[1] - y0) * k;
        if (y < MESA.H + MESA.REDE + R * 0.6 && y > MESA.H - 0.02 && Math.abs(p[0]) < MESA.W / 2 + MESA.POSTE) {
          p[2] = z0; v[2] = -v[2] * 0.12; v[0] *= 0.3; b.w = [0, 0, 0]; ev.push({ tipo: "rede" }); // cai do lado de quem bateu
        }
      }
      if (p[1] < R) { p[1] = R; b.viva = false; ev.push({ tipo: "chao" }); break; }
      if (Math.abs(p[2]) > MESA.L / 2 + 6 || Math.abs(p[0]) > 7) { b.viva = false; ev.push({ tipo: "chao" }); break; }
    }
    return ev;
  }
  // a bola morta (depois do ponto): continua quicando no chão e na mesa só para a tela
  function rolar(b, dt) {
    for (let t = 0; t < dt - 1e-9; t += PASSO) {
      const h = Math.min(PASSO, dt - t), p = b.p, v = b.v, y0 = p[1];
      passo(p, v, b.w || (b.w = [0, 0, 0]), h);
      const naMesa = Math.abs(p[0]) <= MESA.W / 2 && Math.abs(p[2]) <= MESA.L / 2;
      if (v[1] < 0 && naMesa && p[1] <= MESA.H + R && y0 > MESA.H - 0.03) { p[1] = MESA.H + R; quicar(v, b.w); }
      else if (v[1] < 0 && p[1] <= R) { p[1] = R; v[1] = -v[1] * 0.7; v[0] *= 0.85; v[2] *= 0.85; b.w = [0, 0, 0]; if (v[1] < 0.15) v[1] = 0; }
    }
  }

  // ---------- o juiz de uma troca de bola ----------
  // rally = { quem (lado de quem bateu por último), saque, quiques: [lados] }. No saque a bola quica primeiro do lado
  // de quem saca e depois do outro; na troca normal, uma vez do lado de quem recebe. Devolve o lado que fez o ponto.
  const precisa = (r) => (r.saque ? [r.quem, 1 - r.quem] : [1 - r.quem]);
  function julgar(r, e) {
    const pr = precisa(r);
    if (e.tipo === "quique") {
      const i = r.quiques.length; r.quiques.push(e.lado);
      if (i < pr.length) return e.lado === pr[i] ? null : { vence: 1 - r.quem, motivo: r.saque ? "saque errado" : e.lado === r.quem ? "quicou do lado de quem bateu" : "fora" };
      return { vence: r.quem, motivo: "quicou duas vezes" };
    }
    // na rede: de quem bateu, é ponto do outro; depois dos quiques certos (a cortada que volta sozinha), ninguém devolveu
    if (e.tipo === "rede") return r.quiques.length >= pr.length ? { vence: r.quem, motivo: "não devolveu" } : { vence: 1 - r.quem, motivo: "na rede" };
    if (e.tipo === "chao") return r.quiques.length >= pr.length ? { vence: r.quem, motivo: "não devolveu" } : { vence: 1 - r.quem, motivo: "fora" };
    return null;
  }
  // pode rebater? só quem recebe, depois do quique certo do seu lado (antes disso a bola passa pela raquete)
  const podeRebater = (r, lado) => !!r && r.quem !== lado && r.quiques.length === precisa(r).length;

  // ---------- o resolvedor ----------
  // a velocidade que leva a bola de p até o alvo (x, y, z) em T segundos, com o ar e o giro w (sem colisões): chuta
  // a conta sem ar e corrige pelo erro, voando de verdade, até chegar
  function resolver(p, w, alvo, T) {
    const v = [(alvo[0] - p[0]) / T, (alvo[1] - p[1]) / T + 0.5 * G * T, (alvo[2] - p[2]) / T];
    for (let k = 0; k < 10; k++) {
      const q = p.slice(), u = v.slice(), ww = w.slice();
      for (let t = 0; t < T - 1e-9; t += PASSO) passo(q, u, ww, Math.min(PASSO, T - t));
      const ex = alvo[0] - q[0], ey = alvo[1] - q[1], ez = alvo[2] - q[2];
      if (Math.abs(ex) + Math.abs(ey) + Math.abs(ez) < 1e-4) break;
      const g = 1.15 / T; v[0] += ex * g; v[1] += ey * g; v[2] += ez * g;
    }
    return v;
  }
  // voa uma cópia e conta o que acontece: os eventos (até `max`), a maior altura sobre a mesa e a folga na rede
  function ensaiar(b, max = 1, seg = 2) {
    const c = { p: b.p.slice(), v: b.v.slice(), w: b.w.slice(), viva: true }, ev = [];
    let apice = -1, folga = null;
    for (let t = 0; t < seg && c.viva && ev.length < max; t += PASSO) {
      const z0 = c.p[2], y0 = c.p[1];
      voar(c, PASSO, ev);
      if (Math.abs(c.p[2]) <= MESA.L / 2) apice = Math.max(apice, c.p[1] - MESA.H);
      if (folga == null && z0 !== 0 && Math.sign(z0) !== Math.sign(c.p[2])) folga = y0 - MESA.H - MESA.REDE;
    }
    return { ev, apice, folga, p: c.p };
  }
  // giro de top spin (rad/s) da bola, em relação ao caminho dela (positivo: top; negativo: cortada)
  function topDe(w, v) {
    const h = mod(v[0], v[2]);
    if (!w || h < 1e-6) return 0;
    return (w[0] * v[2] - w[2] * v[0]) / h; // w · (cima × direção)
  }
  // o vetor de giro para uma bola indo de (x, z) para (tx, tz): top (rad/s, positivo = top spin) e lateral
  function giroPara(x, z, tx, tz, top, lateral) {
    const d = mod(tx - x, tz - z) || 1, dx = (tx - x) / d, dz = (tz - z) / d;
    return [top * dz, lateral, -top * dx];
  }
  // a bola sai de b.p e cai em (tx, tz) com a velocidade horizontal vh e o giro w. Não deixa subir mais que ARCO
  // acima da mesa (fica no alcance de quem recebe) e sobe o arco o que precisar para passar a rede.
  const ARCO = 0.62;
  function lancar(b, tx, tz, vh, w) {
    const alvo = [tx, MESA.H + R, tz], dist = mod(tx - b.p[0], tz - b.p[2]);
    let T = clamp(dist / vh, 0.2, 1.1);
    const tenta = (T) => { const c = { p: b.p.slice(), v: resolver(b.p, w, alvo, T), w: w.slice() }; return { v: c.v, r: ensaiar(c) }; };
    const ladoAlvo = tz > 0 ? 0 : 1, naMesa = Math.abs(tx) <= MESA.W / 2 && Math.abs(tz) <= MESA.L / 2;
    // passa a rede com folga e cai do lado certo (ou sai, se o alvo já era fora da mesa)
    const passa = (x) => { const e = x.r.ev[0]; return x.r.folga != null && x.r.folga >= 0.05 && !!e && e.tipo !== "rede" && (e.tipo === "quique" ? e.lado === ladoAlvo : !naMesa); };
    let x = tenta(T);
    for (let k = 0; k < 24 && !passa(x) && T < 1.25; k++) { T *= 1.06; x = tenta(T); }
    for (let k = 0; k < 20 && x.r.apice > ARCO && T > 0.22; k++) { const n = tenta(T * 0.93); if (!passa(n)) break; T *= 0.93; x = n; }
    b.v = x.v; b.w = w.slice(); b.viva = true;
    return b;
  }

  // ---------- a raquetada ----------
  // golpe = { frente (m/s da raquete rumo à rede; para trás é negativo), lat (m/s para o lado), off (onde a bola pegou
  // na raquete, em x) }. frente ~7 é o golpe cheio; acima disso a bola sai longa.
  //   para a frente: drive e top spin (a raquete fecha e escova a bola); com a bola alta, smash (reto e rápido)
  //   parado: bloqueio (devolve com o giro que veio, mais fraco)
  //   para trás: cortada / chop (raquete aberta, a bola sai com giro para trás, mais lenta e curta)
  //   para o lado: mira e efeito lateral (a bola faz a curva)
  const FORTE = 7;
  function bater(b, g, lado) {
    const s = S(lado), f = clamp((g.frente || 0) / FORTE, -1, 1.45), fp = clamp(f, 0, 1), fn = clamp(-f, 0, 1), extra = Math.max(0, f - 1);
    const lat = clamp(g.lat || 0, -8, 8), off = g.off || 0;
    const alto = clamp((b.p[1] - MESA.H - 0.18) / 0.32, 0, 1); // bola alta: dá para matar
    const topIn = topDe(b.w, b.v), ladoIn = b.w ? b.w[1] : 0;
    const vh = f >= 0 ? 7 + fp * (6.5 + 6 * alto) + extra * 4 : 7 - fn * 3;
    const top = f >= 0 ? 90 + 470 * fp * (1 - 0.6 * alto * fp) - Math.max(0, -topIn) * 0.15 * (1 - fp) : -(140 + 340 * fn);
    const tx = b.p[0] * 0.2 + lat * 0.1 + off * 1.05 + ladoIn * 0.0007 * s;
    const tz = f >= 0 ? -s * (0.5 + 0.72 * fp + 0.55 * extra) : -s * (0.42 + 0.32 * (1 - fn));
    const w = giroPara(b.p[0], b.p[2], tx, tz, top, -s * clamp(lat / 6, -1, 1) * 240);
    lancar(b, tx, tz, vh, w);
    // a leitura do giro que veio: o top spin faz a bola subir (se a raquete não fechou), a cortada derruba (se não abriu)
    const k = topIn > 0 ? 1 - 1.4 * fp : 1 - 1.6 * fn - 0.6 * fp;
    b.v[1] += 0.0012 * topIn * Math.max(0, k);
    return b;
  }
  // compatível com a raquete: { x, z, vx, vz } (posição e velocidade dela)
  function rebater(b, raq, lado) {
    return bater(b, { frente: -S(lado) * (raq.vz || 0), lat: raq.vx || 0, off: b.p[0] - (raq.x ?? b.p[0]) }, lado);
  }
  // o nome do golpe (para mostrar na tela), pelo giro e pela velocidade
  function nomeEfeito(b) {
    if (!b || !b.v) return "";
    const t = topDe(b.w, b.v), l = b.w ? Math.abs(b.w[1]) : 0, vel = Math.sqrt(b.v[0] ** 2 + b.v[1] ** 2 + b.v[2] ** 2);
    if (vel > 14 && t < 320) return "Smash";
    if (t > 380) return l > 140 ? "Top spin com curva" : "Top spin pesado";
    if (t > 230) return "Top spin";
    if (t < -300) return "Chop";
    if (t < -150) return "Cortada";
    if (l > 140) return "Efeito lateral";
    return "";
  }
  const kmh = (b) => Math.round(Math.sqrt(b.v[0] ** 2 + b.v[1] ** 2 + b.v[2] ** 2) * 3.6);

  // ---------- o saque ----------
  // a bola sobe da mão (mais de 16 cm, pela regra) e é batida atrás da linha de fundo, quica do próprio lado e passa
  // para o outro. golpe = { frente, lat } (ou um número: a mira para os lados, de −1 a 1). Para a frente: saque longo
  // com top; para trás: curto e cortado; para o lado: mira e efeito. Procura a primeira quicada que leva a bola ao
  // alvo do outro lado, baixinha sobre a rede.
  function sacar(lado, x, golpe = 0) {
    const g = typeof golpe === "number" ? { frente: 0, lat: golpe * 4 } : golpe || {};
    const s = S(lado), f = clamp((g.frente || 0) / 6, -1, 1), fp = clamp(f, 0, 1), fn = clamp(-f, 0, 1), lat = clamp(g.lat || 0, -8, 8);
    const p0 = [clamp(x, -0.6, 0.6) * 0.8, MESA.H + 0.2, s * (MESA.L / 2 + 0.1)];
    const x2 = clamp(p0[0] * 0.3 + lat * 0.14, -0.66, 0.66), z2 = -s * (0.42 + 0.8 * fp);
    const w = giroPara(p0[0], p0[2], x2, z2, f >= 0 ? 60 + 300 * fp : -(120 + 300 * fn), -s * clamp(lat / 6, -1, 1) * 200);
    let melhor = null;
    for (const fz of [0.82, 0.7, 0.58, 0.46, 0.34]) for (const T of [0.13, 0.16, 0.2, 0.24, 0.29, 0.35]) {
      const z1 = s * fz * MESA.L / 2, x1 = p0[0] + (x2 - p0[0]) * 0.35;
      const b = { p: p0.slice(), v: resolver(p0, w, [x1, MESA.H + R, z1], T), w: w.slice(), viva: true };
      const r = ensaiar(b, 2, 2.5), [e1, e2] = r.ev;
      if (!e1 || !e2 || e1.tipo !== "quique" || e1.lado !== lado || e2.tipo !== "quique" || e2.lado !== 1 - lado || -s * r.p[2] < 0.2) continue;
      const depois = ensaiar(b, 3, 2.5).ev[2]; if (depois && depois.tipo !== "quique") { /* sai da mesa: bom */ } else if (depois && depois.lado !== 1 - lado) continue; // a cortada que volta sozinha não vale
      const nota = mod(r.p[0] - x2, r.p[2] - z2) + Math.max(0, (r.folga ?? 1) - 0.1) * 1.5 + Math.max(0, r.apice - 0.45);
      if (!melhor || nota < melhor.nota) melhor = { nota, b };
    }
    if (melhor) return melhor.b;
    // sem saída (não deve acontecer): o saque reto, sem efeito
    return sacar(lado, 0, { frente: 0, lat: 0 });
  }

  // ---------- placar ----------
  // config: pontos (11 ou 21) e games (1 ou 3: melhor de). Saque troca a cada 2 pontos (no 10 a 10, a cada ponto).
  function novoPlacar(config, sacaPrimeiro = 0) {
    return { pts: [0, 0], games: [0, 0], sacador: sacaPrimeiro, abriu: sacaPrimeiro, vencedor: null, config: { pontos: config.pontos === 21 ? 21 : 11, games: config.games === 3 ? 3 : 1 } };
  }
  function marcar(pl, lado) {
    pl.pts[lado]++;
    const [a, b] = pl.pts, alvo = pl.config.pontos;
    let fimGame = false;
    if ((a >= alvo || b >= alvo) && Math.abs(a - b) >= 2) {
      fimGame = true; pl.games[lado]++;
      if (pl.games[lado] > pl.config.games / 2) pl.vencedor = lado;
      else { pl.pts = [0, 0]; pl.abriu = 1 - pl.abriu; pl.sacador = pl.abriu; }
    }
    if (!fimGame) { const n = pl.pts[0] + pl.pts[1], deuce = pl.pts[0] >= alvo - 1 && pl.pts[1] >= alvo - 1; pl.sacador = (pl.abriu + (deuce ? n : Math.floor(n / 2))) % 2; }
    return { fimGame, fim: pl.vencedor != null };
  }

  // ---------- onde a bola vai estar para quem recebe ----------
  // voa uma cópia até o lado poder rebater e devolve o primeiro ponto bom para bater: no alto do quique (a bola já
  // começou a cair) ou quando passa da linha de fundo, sem ir mais perto da rede que `perto`. Com `plano`, devolve onde
  // ela cruza esse z. Junto vai o tempo até lá.
  function prever(b, rally, lado, plano = null, perto = MESA.L / 2 - 0.4) {
    if (!b || !rally) return null;
    const s = S(lado), c = { p: b.p.slice(), v: b.v.slice(), w: (b.w || [0, 0, 0]).slice(), viva: true }, r = { ...rally, quiques: rally.quiques.slice() };
    let ultimo = null, curta = null; // curta: a bola que morre antes de `perto` (vai buscar em cima da mesa, no alto dela)
    for (let i = 0, t = 0; i < 360 && c.viva; i++) {
      const z0 = c.p[2], dt = 1 / 120; t += dt;
      for (const e of voar(c, dt)) if (julgar(r, e)) return plano == null ? ultimo || curta : null;
      if (!podeRebater(r, lado)) continue;
      if (plano != null) { if ((z0 - plano) * (c.p[2] - plano) <= 0) return { x: c.p[0], y: c.p[1], z: plano, t }; continue; }
      if (s * c.v[2] <= 0) continue;
      if (s * c.p[2] < perto) { if (c.p[1] > MESA.H + 0.04 && (!curta || c.p[1] >= curta.y)) curta = { x: c.p[0], y: c.p[1], z: c.p[2], t }; continue; }
      ultimo = { x: c.p[0], y: c.p[1], z: c.p[2], t };
      if ((c.v[1] <= 0 && c.p[1] > MESA.H + 0.05) || s * c.p[2] >= MESA.L / 2 + 0.25) return ultimo;
    }
    return plano == null ? ultimo || curta : null;
  }

  // ---------- o robô ----------
  // Espera o tempo de reação, prevê onde vai bater (x, altura e o quanto recua), vai até lá (com velocidade máxima e
  // o erro da dificuldade) e, na hora, escolhe o golpe: a força, a mira e a resposta ao giro que veio (ler o giro é o
  // que separa o fácil do difícil).
  const DIF = {
    facil: { vel: 3.2, acel: 22, erro: 0.13, falha: 0.1, forca: [0.5, 4.2], leitura: 0.4, reacao: 0.2, mata: 0.15 },
    medio: { vel: 4.2, acel: 32, erro: 0.07, falha: 0.05, forca: [1.5, 6], leitura: 0.72, reacao: 0.13, mata: 0.45 },
    dificil: { vel: 5.5, acel: 45, erro: 0.03, falha: 0.03, forca: [4, 8.2], leitura: 0.95, reacao: 0.07, mata: 0.85 },
  };
  const casaDo = (lado) => ({ x: 0, z: S(lado) * (MESA.L / 2 + 0.5), y: MESA.H + 0.2 });
  function robo(bot, b, rally, dt, dif = "medio") {
    const d = DIF[dif] || DIF.medio, s = S(bot.lado), vem = b && b.viva && rally && rally.quem !== bot.lado;
    if (bot.rallyVisto !== rally) { bot.rallyVisto = rally; bot.desvio = (Math.random() - 0.5) * 3 * d.erro; bot.espera = d.reacao; bot.alvo = null; bot.preverEm = 0; }
    bot.espera = (bot.espera || 0) - dt; bot.preverEm = (bot.preverEm || 0) - dt;
    if (vem && bot.espera <= 0 && bot.preverEm <= 0) {
      bot.preverEm = 0.06; // não simular o voo inteiro a cada quadro
      const pv = prever(b, rally, bot.lado);
      // perto da batida, segura o alvo (senão ele persegue a bola, que está sempre um passo à frente)
      if (pv && (!bot.alvo || pv.t > 0.14)) bot.alvo = { x: clamp(pv.x + bot.desvio, -1.3, 1.3), z: pv.z + s * 0.06, y: pv.y };
    }
    const alvo = vem && bot.alvo ? bot.alvo : casaDo(bot.lado);
    bot.vz = bot.vz || 0; bot.y = bot.y ?? MESA.H + 0.2;
    for (const [k, vk, lim] of [["x", "vx", 1.35], ["z", "vz", null]]) {
      const quer = clamp((alvo[k] - bot[k]) * 9, -d.vel, d.vel);
      bot[vk] += clamp(quer - bot[vk], -d.acel * dt, d.acel * dt);
      bot[k] += bot[vk] * dt;
      if (lim) bot[k] = clamp(bot[k], -lim, lim);
    }
    bot.z = s * clamp(s * bot.z, 0.3, MESA.L / 2 + 1.5);
    bot.y += (clamp(alvo.y, MESA.H + 0.03, MESA.H + 0.9) - bot.y) * (1 - Math.exp(-dt * 14));
  }
  // a raquetada do robô: escolhe o golpe e devolve a raquete ({ x, z, vx, vz }) que faz esse golpe
  function batidaRobo(bot, b, dif = "medio") {
    const d = DIF[dif] || DIF.medio, s = S(bot.lado), topIn = topDe(b.w, b.v), alto = b.p[1] - MESA.H > 0.4;
    let frente = d.forca[0] + Math.random() * (d.forca[1] - d.forca[0]);
    const le = Math.random() < d.leitura;
    if (alto && Math.random() < d.mata) frente = FORTE * (0.95 + Math.random() * 0.12); // smash
    else if (topIn < -150) frente = le ? (Math.random() < 0.5 ? -(1.5 + Math.random() * 3) : 4 + Math.random() * 2.5) : Math.random() * 1.2; // cortada: corta de volta ou levanta no top; sem ler, cai
    else if (topIn > 250 && !le) frente = Math.random() * 0.8; // top spin sem fechar: sobe
    else if (topIn > 250) frente = Math.max(frente, 2.6);
    // a bola rápida ou muito girada aperta: mais chance de errar
    const vel = Math.sqrt(b.v[0] ** 2 + b.v[1] ** 2 + b.v[2] ** 2), pressao = clamp((vel - 9) / 8, 0, 1) + Math.min(1, Math.abs(topIn) / 700);
    const erra = Math.random() < d.falha + 0.1 * pressao * (1.3 - d.leitura), tx = erra ? (Math.random() < 0.5 ? -1 : 1) * (0.85 + Math.random() * 0.3) : (Math.random() - 0.5) * 1.3;
    const off = b.p[0] - bot.x, lat = clamp((tx - b.p[0] * 0.2 - off * 1.05) / 0.1, -8, 8);
    return { x: bot.x, z: bot.z, vx: lat, vz: -s * frente };
  }

  const api = { MESA, G, R, AR, QUIQUE, S, FORTE, ARCO, nomeEfeito, kmh, topDe, voar, rolar, julgar, precisa, podeRebater, resolver, ensaiar, lancar, bater, rebater, sacar, novoPlacar, marcar, prever, robo, batidaRobo, casaDo, DIF };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PingPong = api;
})(typeof window !== "undefined" ? window : globalThis);
