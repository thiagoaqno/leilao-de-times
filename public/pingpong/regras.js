// Tênis de Mesa da Galera — as regras e a física, iguais no servidor e no navegador.
// A física é a do Table Tennis Pro, lida do próprio jogo (Unity): o mundo de lá é 10 vezes maior que o de verdade (a
// mesa tem 27,4 de comprimento), a gravidade ficou em 9,81 e o tempo roda 2 vezes mais rápido. Em metros, a bola cai
// com G = 9,81 / 10 × 2² ≈ 3,9 m/s²: é por isso que ela flutua. Não tem resistência do ar; no quique na mesa a bola
// volta com 0,6 da velocidade de queda e quase sem atrito (a velocidade para a frente segue igual). O efeito é a curva
// para o lado: w = [curva (m/s² para o lado), 0, 0]; no quique ele dá um tranco para o lado e cai pela metade.
// Cada batida mira um ponto da mesa do outro lado e uma altura sobre a rede (o KickBallNetHeight de lá) e sai da conta
// fechada da parábola. Quem recebe o pacote da batida (posição, velocidade, efeito e a hora) calcula o mesmo voo.
// Medidas da mesa em metros: 2,74 x 1,525 a 76 cm do chão, rede de 15,25 cm. O jogador do lado 0 fica no +z, o do
// lado 1 no −z (S(lado) dá o sinal).
(function (root) {
  const MESA = { L: 2.74, W: 1.525, H: 0.76, REDE: 0.1525, POSTE: 0.1525 };
  const G = 9.81 / 10 * 4, R = 0.025, PASSO = 1 / 240;
  const QUIQUE = { e: 0.6, tranco: 0.06 };
  const S = (lado) => (lado ? -1 : 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- o voo ----------
  // um passo com aceleração constante (a conta exata: os dois navegadores chegam no mesmo lugar)
  function passo(p, v, w, h) {
    const ax = w[0];
    p[0] += v[0] * h + 0.5 * ax * h * h; p[1] += v[1] * h - 0.5 * G * h * h; p[2] += v[2] * h;
    v[0] += ax * h; v[1] -= G * h;
  }
  function quicar(v, w) { v[1] = -v[1] * QUIQUE.e; v[0] += w[0] * QUIQUE.tranco; w[0] *= 0.5; }
  // b = { p: [x, y, z], v: [vx, vy, vz], w: [curva, 0, 0], viva }. Devolve os eventos do trecho: quique (com o lado),
  // rede, chão.
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
      else if (v[1] < 0 && p[1] <= R) { p[1] = R; v[1] = -v[1] * 0.2; v[0] *= 0.8; v[2] *= 0.8; b.w = [0, 0, 0]; if (v[1] < 0.15) v[1] = 0; } // o chão do Table Tennis Pro quica 0,2
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
    // na rede: de quem bateu, é ponto do outro; depois dos quiques certos (a bola que volta sozinha), ninguém devolveu
    if (e.tipo === "rede") return r.quiques.length >= pr.length ? { vence: r.quem, motivo: "não devolveu" } : { vence: 1 - r.quem, motivo: "na rede" };
    if (e.tipo === "chao") return r.quiques.length >= pr.length ? { vence: r.quem, motivo: "não devolveu" } : { vence: 1 - r.quem, motivo: "fora" };
    return null;
  }
  // pode rebater? só quem recebe, depois do quique certo do seu lado (antes disso a bola passa pela raquete)
  const podeRebater = (r, lado) => !!r && r.quem !== lado && r.quiques.length === precisa(r).length;

  // ---------- o chute (o KickBallNetHeight do Table Tennis Pro) ----------
  // a velocidade que leva a bola de b.p até cair em (tx, tz), passando a rede `hRede` acima da fita, com a curva
  // `curva`. É a parábola que passa pelos dois pontos; se a bola já está alta demais para isso (o smash), sai reta e
  // rápida (vMax) e só sobe o que precisar para passar a rede.
  function chutar(b, tx, tz, hRede, curva = 0, vMax = 9) {
    const [x0, y0, z0] = b.p, yL = MESA.H + R, yN = MESA.H + MESA.REDE + R + Math.max(0.02, hRede);
    const f = z0 / (z0 - tz), dist = Math.hypot(tx - x0, tz - z0);
    let T2 = (2 * ((yN - y0) / f - (yL - y0))) / (G * (1 - f));
    let T = T2 > 0 ? Math.sqrt(T2) : 0;
    const Tmin = dist / vMax;
    if (!(T >= Tmin)) { // alta demais: sai reta; sobe o tempo de voo até passar a rede
      T = Tmin;
      for (let k = 0; k < 40; k++) { const vy = (yL - y0 + 0.5 * G * T * T) / T, tn = f * T; if (y0 + vy * tn - 0.5 * G * tn * tn >= yN - 0.01) break; T *= 1.05; }
    }
    b.v = [(tx - x0) / T - 0.5 * curva * T, (yL - y0 + 0.5 * G * T * T) / T, (tz - z0) / T];
    b.w = [curva, 0, 0]; b.viva = true;
    return b;
  }
  // voa uma cópia e conta o que acontece: os eventos (até `max`), a maior altura sobre a mesa e a folga na rede
  function ensaiar(b, max = 1, seg = 3) {
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

  // ---------- a raquetada (o KickBallFromMovement) ----------
  // golpe = { frente (m/s da raquete rumo à rede na hora do toque; para trás é negativo), lat (m/s para o lado), off
  // (onde a bola pegou na raquete, em x) }. Parada, a raquete devolve alto e no meio da mesa; quanto mais rápido para a
  // frente, mais baixo sobre a rede e mais fundo (rápido demais, sai longo); para o lado mira e dá a curva. Bola alta e
  // raquete rápida é o smash. Para trás, a bola sai curta e devagar.
  const FORTE = 5;
  function bater(b, g, lado) {
    const s = S(lado), f = clamp((g.frente || 0) / FORTE, -1, 1.6), fp = clamp(f, 0, 1), fn = clamp(-f, 0, 1), extra = Math.max(0, f - 1);
    const lat = clamp(g.lat || 0, -8, 8), off = g.off || 0;
    const alto = clamp((b.p[1] - MESA.H - 0.3) / 0.3, 0, 1); // bola alta: dá para matar
    const hRede = f >= 0 ? 0.3 - 0.24 * fp - 0.04 * alto * fp : 0.18;
    const tz = f >= 0 ? -s * (0.55 + 0.62 * fp + 0.55 * extra) : -s * (0.4 + 0.15 * (1 - fn));
    const tx = b.p[0] * 0.3 + lat * 0.11 + off * 0.8;
    return chutar(b, tx, tz, hRede, clamp(lat * 0.5, -3, 3), 6 + 6 * fp * (0.4 + alto));
  }
  // compatível com a raquete: { x, z, vx, vz } (posição e velocidade dela)
  function rebater(b, raq, lado) {
    return bater(b, { frente: -S(lado) * (raq.vz || 0), lat: raq.vx || 0, off: b.p[0] - (raq.x ?? b.p[0]) }, lado);
  }
  const kmh = (b) => Math.round(Math.sqrt(b.v[0] ** 2 + b.v[1] ** 2 + b.v[2] ** 2) * 3.6);
  // o nome do golpe (para mostrar na tela): smash e efeito
  function nomeEfeito(b) {
    if (!b || !b.v) return "";
    if (kmh(b) > 26) return "Smash";
    if (b.w && Math.abs(b.w[0]) > 1.4) return "Efeito";
    return "";
  }

  // ---------- o saque ----------
  // a bola sai de cima da mesa, na frente da raquete (z0: a distância da rede), quica do próprio lado e passa para o
  // outro. golpe = { frente, lat } (ou um número: a mira para os lados, de −1 a 1). Para a frente: saque longo e
  // rápido; parado: curto; para o lado: mira e curva. Procura a primeira quicada que leva a bola ao alvo do outro lado,
  // baixinha sobre a rede.
  const SAQUE_Z = MESA.L / 4 + 0.1, SAQUE_Y = 0.3; // onde a bola fica parada esperando o saque
  function sacar(lado, x, golpe = 0, z0 = SAQUE_Z, tentativa = 0) {
    const g = typeof golpe === "number" ? { frente: 0, lat: golpe * 4 } : golpe || {};
    const s = S(lado), fp = clamp((g.frente || 0) / FORTE, 0, 1), lat = clamp(g.lat || 0, -8, 8);
    const p0 = [clamp(x, -0.6, 0.6) * 0.8, MESA.H + SAQUE_Y, s * z0];
    const x2 = clamp(p0[0] * 0.3 + lat * 0.12, -0.66, 0.66), z2 = -s * (0.6 + 0.55 * fp), curva = clamp(lat * 0.4, -2, 2);
    let melhor = null;
    for (const fz of [0.75, 0.6, 0.45, 0.32, 0.2]) for (const T of [0.05, 0.07, 0.09, 0.12, 0.16, 0.2, 0.25]) {
      if (fz * MESA.L / 2 > z0 - 0.08) continue; // a primeira quicada fica entre a bola e a rede
      const z1 = s * fz * MESA.L / 2, x1 = p0[0] + (x2 - p0[0]) * 0.35;
      const b = { p: p0.slice(), v: [(x1 - p0[0]) / T - 0.5 * curva * T, (MESA.H + R - p0[1] + 0.5 * G * T * T) / T, (z1 - p0[2]) / T], w: [curva, 0, 0], viva: true };
      const r = ensaiar(b, 2, 3), [e1, e2] = r.ev;
      if (!e1 || !e2 || e1.tipo !== "quique" || e1.lado !== lado || e2.tipo !== "quique" || e2.lado !== 1 - lado || -s * r.p[2] < 0.2) continue;
      const nota = Math.hypot(r.p[0] - x2, r.p[2] - z2) + Math.max(0, (r.folga ?? 1) - 0.12) * 1.5 + Math.max(0, r.apice - 0.45);
      if (!melhor || nota < melhor.nota) melhor = { nota, b };
    }
    if (melhor) return melhor.b;
    // sem saída (não deve acontecer): tenta de mais longe, depois reto e sem efeito
    if (tentativa === 0) return sacar(lado, x, golpe, MESA.L / 2 - 0.1, 1);
    if (tentativa === 1) return sacar(lado, 0, { frente: 0, lat: 0 }, MESA.L / 2 - 0.1, 2);
    return { p: p0, v: [0, 0, -s * 3], w: [0, 0, 0], viva: true };
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
    for (let i = 0, t = 0; i < 480 && c.viva; i++) {
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
  // o erro da dificuldade) e, na hora, escolhe o golpe: a força e a mira.
  const DIF = {
    facil: { vel: 1.9, acel: 12, erro: 0.16, falha: 0.2, forca: [0, 2.5], reacao: 0.25, mata: 0.1 },
    medio: { vel: 3.2, acel: 24, erro: 0.06, falha: 0.08, forca: [0.5, 4], reacao: 0.16, mata: 0.4 },
    dificil: { vel: 4.2, acel: 34, erro: 0.02, falha: 0.04, forca: [2, 5.5], reacao: 0.09, mata: 0.8 },
  };
  const casaDo = (lado) => ({ x: 0, z: S(lado) * (MESA.L / 2 + 0.4), y: MESA.H + 0.15 });
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
    bot.vz = bot.vz || 0; bot.y = bot.y ?? MESA.H + 0.15;
    for (const [k, vk, lim] of [["x", "vx", 1.35], ["z", "vz", null]]) {
      const quer = clamp((alvo[k] - bot[k]) * 9, -d.vel, d.vel);
      bot[vk] += clamp(quer - bot[vk], -d.acel * dt, d.acel * dt);
      bot[k] += bot[vk] * dt;
      if (lim) bot[k] = clamp(bot[k], -lim, lim);
    }
    bot.z = s * clamp(s * bot.z, 0.3, MESA.L / 2 + 1.5);
    bot.y += (clamp(alvo.y, MESA.H + 0.03, MESA.H + 0.9) - bot.y) * (1 - Math.exp(-dt * 14));
  }
  // a raquetada do robô: escolhe a força e a mira e devolve a raquete ({ x, z, vx, vz }) que faz esse golpe
  function batidaRobo(bot, b, dif = "medio") {
    const d = DIF[dif] || DIF.medio, s = S(bot.lado), alto = b.p[1] - MESA.H > 0.4;
    let frente = d.forca[0] + Math.random() * (d.forca[1] - d.forca[0]);
    if (alto && Math.random() < d.mata) frente = FORTE * (0.95 + Math.random() * 0.1); // smash
    // a bola rápida aperta: mais chance de errar
    const pressao = clamp((kmh(b) - 18) / 12, 0, 1);
    const erra = Math.random() < d.falha + 0.08 * pressao, tx = erra ? (Math.random() < 0.5 ? -1 : 1) * (0.85 + Math.random() * 0.3) : (Math.random() - 0.5) * 1.2;
    const off = b.p[0] - bot.x, lat = clamp((tx - b.p[0] * 0.3 - off * 0.8) / 0.11, -8, 8);
    return { x: bot.x, z: bot.z, vx: lat, vz: -s * frente };
  }

  const api = { MESA, SAQUE_Z, SAQUE_Y, G, R, QUIQUE, S, FORTE, nomeEfeito, kmh, voar, rolar, julgar, precisa, podeRebater, chutar, ensaiar, bater, rebater, sacar, novoPlacar, marcar, prever, robo, batidaRobo, casaDo, DIF };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PingPong = api;
})(typeof window !== "undefined" ? window : globalThis);
