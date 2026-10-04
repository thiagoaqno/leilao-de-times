// Pingue-Pongue da Galera — as regras e a física, iguais no servidor e no navegador.
// Medidas em metros, com a mesa oficial. O jogador do lado 0 fica no +z, o do lado 1 no −z (S(lado) dá o sinal).
// A bola tem gravidade, efeito (que vira uma aceleração constante: o top spin derruba, a cortada segura no ar, o
// efeito lateral faz a curva) e o quique na mesa (onde o efeito dá o pulo: o top spin acelera, a cortada freia, o
// lateral espirra para o lado). Quem recebe o pacote da batida (posição, velocidade, efeito e a hora) calcula o mesmo voo. A raquetada mira um ponto na mesa do outro lado: o movimento do mouse na hora da
// batida escolhe para onde (para os lados) e a força (para a frente); bater com a raquete fora do centro desvia a bola.
(function (root) {
  const MESA = { L: 2.74, W: 1.525, H: 0.76, REDE: 0.1525 };
  const G = 9.8, E = 0.86, R = 0.02, PASSO = 1 / 240;
  // efeito w = [lado, top] (de −1 a 1): aceleração que ele dá no ar (m/s²) e o pulo no quique
  const EF = { lado: 2.6, top: 3, quiqueTop: 1.1, quiqueLado: 0.6 };
  const acel = (w) => [w ? w[0] * EF.lado : 0, w ? -w[1] * EF.top : 0];
  const S = (lado) => (lado ? -1 : 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- voo da bola ----------
  // b = { p: [x, y, z], v: [vx, vy, vz], w: [lado, top], viva }. Devolve os eventos do trecho: quique (com o lado),
  // rede, chão.
  function voar(b, dt, ev = []) {
    for (let t = 0; t < dt - 1e-9; t += PASSO) {
      const h = Math.min(PASSO, dt - t), p = b.p, v = b.v, z0 = p[2], [ax, ay] = acel(b.w);
      v[0] += ax * h; v[1] += (ay - G) * h; p[0] += v[0] * h; p[1] += v[1] * h; p[2] += v[2] * h;
      if (v[1] < 0 && p[1] <= MESA.H + R && p[1] > MESA.H - 0.05 && Math.abs(p[0]) <= MESA.W / 2 && Math.abs(p[2]) <= MESA.L / 2) {
        p[1] = MESA.H + R; v[1] = -v[1] * E; v[0] *= 0.98; v[2] *= 0.98;
        if (b.w) { // o pulo do efeito no quique; depois dele o efeito cai pela metade
          v[2] += Math.sign(v[2]) * b.w[1] * EF.quiqueTop; v[1] *= 1 - 0.12 * b.w[1]; v[0] += b.w[0] * EF.quiqueLado;
          b.w = [b.w[0] * 0.5, b.w[1] * 0.5];
        }
        ev.push({ tipo: "quique", lado: p[2] > 0 ? 0 : 1 });
      }
      if (Math.sign(z0) !== Math.sign(p[2]) && z0 !== 0 && p[1] < MESA.H + MESA.REDE + R && p[1] > MESA.H - 0.02 && Math.abs(p[0]) < MESA.W / 2 + 0.15) {
        p[2] = z0; v[2] = -v[2] * 0.15; v[0] *= 0.3; b.w = null; ev.push({ tipo: "rede" }); // bateu na rede: cai do lado de quem bateu
      }
      if (p[1] < R) { p[1] = R; b.viva = false; ev.push({ tipo: "chao" }); break; }
      if (Math.abs(p[2]) > MESA.L / 2 + 5 || Math.abs(p[0]) > 6) { b.viva = false; ev.push({ tipo: "chao" }); break; }
    }
    return ev;
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
    if (e.tipo === "rede") return { vence: 1 - r.quem, motivo: "na rede" };
    if (e.tipo === "chao") return r.quiques.length >= pr.length ? { vence: r.quem, motivo: "não devolveu" } : { vence: 1 - r.quem, motivo: "fora" };
    return null;
  }
  // pode rebater? só quem recebe, depois do quique certo do seu lado (antes disso a bola passa pela raquete)
  const podeRebater = (r, lado) => !!r && r.quem !== lado && r.quiques.length === precisa(r).length;

  // ---------- a raquetada ----------
  // raq = { x, z, vx, vz }: posição e velocidade da raquete (m/s). Para a frente (rumo à rede) = força e top spin;
  // puxando para trás = cortada (efeito para trás); para os lados = mira e efeito lateral (a bola faz a curva).
  // A batida vira um alvo na mesa do outro lado e um tempo de voo, e daí sai a velocidade da bola (já contando a
  // curva do efeito, então ela cai no alvo; o efeito aparece no caminho e no quique).
  function rebater(b, raq, lado) {
    const s = S(lado), frente = Math.max(-2, -s * (raq.vz || 0)), f = Math.tanh(Math.max(0, frente) / 3);
    const tx = b.p[0] * 0.3 + (raq.vx || 0) * 0.2 + (b.p[0] - raq.x) * 1.6;
    const tz = -s * (0.5 + 0.8 * f);
    const T = frente < 0 ? 1.05 : 0.9 - 0.42 * f; // puxando para trás: balão devagar; empurrando forte: bola rápida
    const w = [clamp((raq.vx || 0) / 2.5, -1, 1) * 0.9, frente > 0 ? f : clamp(frente / 2, -0.8, 0)];
    return lancar(b, tx, tz, T, w);
  }
  // velocidade para sair de b.p e cair em (tx, tz) em T segundos, com a aceleração do efeito w
  function lancar(b, tx, tz, T, w = null) {
    const [x, y, z] = b.p, [ax, ay] = acel(w);
    b.v = [(tx - x) / T - 0.5 * ax * T, (MESA.H + R - y) / T - 0.5 * (ay - G) * T, (tz - z) / T];
    b.w = w; b.viva = true;
    return b;
  }
  // o nome do efeito (para mostrar na tela)
  function nomeEfeito(w) {
    if (!w) return "";
    const [l, t] = w;
    if (t > 0.55) return Math.abs(l) > 0.5 ? "Top spin com curva" : "Top spin";
    if (t < -0.3) return "Cortada";
    if (Math.abs(l) > 0.5) return "Efeito lateral";
    return "";
  }
  // saque: a bola sai da raquete, quica do próprio lado e passa para o outro. ax = mira para os lados (−1 a 1).
  function sacar(lado, x, ax = 0) {
    const s = S(lado), T2 = 0.55, z1 = s * 0.75, x1 = clamp(x, -0.6, 0.6) * 0.7, x2 = clamp(x1 * 0.3 + ax * 0.55, -0.68, 0.68), z2 = -s * 0.85;
    const vx = (x2 - x1) / T2, vz = (z2 - z1) / T2, vy2 = 0.5 * G * T2, vy1 = -vy2 / E; // depois do quique sobe com vy2
    const z0 = s * (MESA.L / 2 + 0.15), T1 = (z1 - z0) / vz, vy0 = vy1 + G * T1, y0 = MESA.H + R - vy0 * T1 + 0.5 * G * T1 * T1;
    // o quique tira 2% da velocidade horizontal: compensa antes
    return { p: [x1 - vx * T1 / 0.98, y0, z0], v: [vx / 0.98, vy0, vz / 0.98], viva: true, w: null };
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

  // ---------- o robô ----------
  // Prevê onde a bola cruza a linha dele, vai até lá (com velocidade máxima e erro da dificuldade) e, na hora,
  // escolhe um alvo no lado de lá e mexe a raquete do jeito que manda a bola para lá.
  const DIF = { facil: { vel: 2.2, erro: 0.16, forca: [0.8, 2.2], falha: 0.2 }, medio: { vel: 3.2, erro: 0.08, forca: [1.4, 3.2], falha: 0.11 }, dificil: { vel: 4.5, erro: 0.035, forca: [2, 4.5], falha: 0.05 } };
  function prever(b, rally, lado, zLinha) {
    const c = { p: b.p.slice(), v: b.v.slice(), w: b.w && b.w.slice(), viva: true }, r = { ...rally, quiques: rally.quiques.slice() };
    for (let i = 0; i < 400 && c.viva; i++) {
      const z0 = c.p[2];
      for (const e of voar(c, 1 / 120)) { if (julgar(r, e)) return null; }
      if (podeRebater(r, lado) && (z0 - zLinha) * (c.p[2] - zLinha) <= 0) return { x: c.p[0], y: c.p[1] };
    }
    return null;
  }
  function robo(bot, b, rally, dt, dif = "medio") {
    const d = DIF[dif] || DIF.medio, s = S(bot.lado), zLinha = s * (MESA.L / 2 + 0.3);
    let alvoX = 0;
    if (b && b.viva && rally && rally.quem !== bot.lado) { const pv = prever(b, rally, bot.lado, zLinha); if (pv) alvoX = pv.x + bot.desvio; }
    else bot.desvio = (Math.random() - 0.5) * 2 * d.erro * 3;
    const dx = clamp(alvoX - bot.x, -d.vel * dt, d.vel * dt);
    bot.vx = dx / Math.max(dt, 1e-3); bot.x += dx; bot.z = zLinha; bot.vz = 0;
  }
  // a raquetada do robô: escolhe um alvo e devolve a velocidade de raquete que leva a bola até ele (às vezes ele erra
  // e manda para fora, pelo lado: quanto mais fácil o robô, mais vezes)
  function batidaRobo(bot, b, dif = "medio") {
    const d = DIF[dif] || DIF.medio, erra = Math.random() < d.falha, tx = erra ? (Math.random() < 0.5 ? -1 : 1) * (0.85 + Math.random() * 0.3) : (Math.random() - 0.5) * 1.1, frente = d.forca[0] + Math.random() * (d.forca[1] - d.forca[0]);
    return { x: bot.x, z: bot.z, vx: (tx - b.p[0] * 0.3 - (b.p[0] - bot.x) * 1.6) / 0.2, vz: -S(bot.lado) * frente };
  }

  const api = { MESA, G, R, S, EF, nomeEfeito, voar, julgar, precisa, podeRebater, rebater, lancar, sacar, novoPlacar, marcar, robo, batidaRobo, DIF };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PingPong = api;
})(typeof window !== "undefined" ? window : globalThis);
