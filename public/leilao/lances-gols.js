// Leilão da Galera — os tipos de gol dos replays (lances.js): 20 jeitos de a bola entrar, cada um com o seu roteiro.
// Cada tipo diz quando a bola entra (tGol), o peso no sorteio pela posição de quem marcou (peso), para onde vai a bola
// (alvo) e onde cada um está no tempo t (cena: veja as peças em lances.js). Os craques têm os seus preferidos em
// Lances.FINALIZACAO (somam no peso; não é sempre).
(function () {
  const G = Lances.GOLS;
  const { mix, fase, suave, entre, corre, CHUTE, GOLEIRO, GOL_X, marcaPenalti, ESCANTEIO, naLinha, voo, curva, naRede, conduz, chutando, festejando, goleiroVoa } = Lances.kit;
  // o peso no sorteio: base, por posição (GK, DEF, VOL, MEI, ATT), o a mais dos craques (nota 88+) e o fator do futsal
  const peso = (base, pos = {}, craque = 0, futsal = 1) => (p, ovr, fs) => ((pos[p] !== undefined ? pos[p] : base) + (ovr >= 88 ? craque : 0)) * (fs ? futsal : 1);
  const canto = (s) => (s() < 0.5 ? 8 + s() * 5 : 31 + s() * 6); // perto de uma das traves (rasteiro ou meia altura)
  const angulo = (s) => (s() < 0.6 ? 34 + s() * 3 : 7 + s() * 3); // no canto de cima
  const parada = (X, D) => ({ X, D, A: 0 });
  // o gol de pé: corre conduzindo, bate em tc e a bola entra em tGol
  function deChute(L, t, { x0 = 42, xc = 99, tc = 780, bate = CHUTE.bate, arco = 2, curva: cv = 0, rastro = false, goleiro = {} } = {}) {
    const d0 = L.d0;
    const art = t < tc - 80 ? { X: mix(x0, xc, t / (tc - 80)), D: d0, p: corre(t) }
      : t < L.tGol ? { X: xc + 5 * fase(t, tc - 80, tc + 180), D: d0, p: chutando(t, tc, bate) } : festejando(L, t, xc + 5, d0);
    const bola = t < tc ? conduz(art, t) : t < L.tGol ? { ...voo(t, tc, L.tGol, { X: xc + 7.5, D: d0 - 1, A: 1 }, naLinha(L), arco, cv), rastro } : naRede(L, t);
    return { art, bola, gol: goleiroVoa(L, t, { reage: tc + 90, ...goleiro }) };
  }
  // o cruzamento, da ponta esquerda, até o ponto p
  const cruzamento = (L, t, t0, t1, p, alto = 16, arco = 14) => voo(t, t0, t1, { X: 4, D: L.d0 + 16, A: alto }, p, arco);

  // ---------- os de pé ----------
  G.chute = { tGol: 1120, peso: peso(3, { VOL: 4, DEF: 2, GK: 1 }), alvo: (s) => ({ D: canto(s), A: 1 + s() * 2 }), cena: (L, t) => deChute(L, t) };
  G.angulo = { tGol: 1120, peso: peso(2, { MEI: 3, VOL: 2.5, DEF: 0.8, GK: 0.3 }, 1.5), alvo: (s) => ({ D: angulo(s), A: 18 + s() * 3 }),
    cena: (L, t) => deChute(L, t, { arco: 9 }) };
  // de trivela: com o lado de fora do pé, a bola sai para um lado e faz a curva de volta
  G.trivela = { tGol: 1180, peso: peso(0.8, { MEI: 2, VOL: 1.5, ATT: 1.2, DEF: 0.3, GK: 0 }, 0.8), alvo: (s) => ({ D: angulo(s), A: 6 + s() * 10 }),
    cena: (L, t) => deChute(L, t, { arco: 4, curva: L.alvo.D > L.d0 ? -12 : 12, bate: CHUTE.trivela, rastro: true }) };
  // a bomba de longe: a bola chega antes de o goleiro pular, e a rede estufa com força
  G.bomba = { tGol: 880, forcaRede: 2, peso: peso(1, { VOL: 2.5, MEI: 1.5, DEF: 1, GK: 0.6 }, 0.5, 1.2), alvo: (s) => ({ D: canto(s), A: 6 + s() * 14 }),
    cena: (L, t) => deChute(L, t, { x0: 28, xc: 58, tc: 660, arco: 3, rastro: true, goleiro: { reage: 830, alto: 3 } }) };
  // de cavadinha: o goleiro sai e a bola passa por cima dele
  G.cavadinha = { tGol: 1180, peso: peso(1, { ATT: 1.5, MEI: 1.5, DEF: 0.2, GK: 0 }, 0.5), alvo: (s) => ({ D: 16 + s() * 10, A: 5 + s() * 4 }),
    cena: (L, t) => deChute(L, t, { xc: 104, bate: CHUTE.cavada, arco: 22, goleiro: { sai: { t0: 450, t1: 840, X: 113 }, frente: true, alto: 3 } }) };

  // ---------- os do alto ----------
  G.voleio = { tGol: 1120, peso: peso(1.2, { ATT: 2, DEF: 0.8, GK: 0 }, 1), alvo: (s) => ({ D: canto(s), A: 7 + s() * 9 }),
    cena(L, t) {
      const d0 = L.d0, tc = 780, pulo = 640, fim = 980, f = fase(t, pulo, fim), sobe = 6.5 * Math.sin(Math.PI * f);
      const art = t < pulo ? { X: mix(66, 96, t / pulo), D: d0, p: corre(t) }
        : t < fim ? { X: 96 + 6 * f, D: d0, p: { ...(t < tc ? entre(CHUTE.arma, CHUTE.voleio, fase(t, pulo, tc)) : entre(CHUTE.voleio, CHUTE.segue, fase(t, tc, fim))), sobe } }
        : t < L.tGol ? { X: 102, D: d0, p: entre(CHUTE.segue, CHUTE.olha, fase(t, fim, fim + 120)) } : festejando(L, t, 102, d0);
      const fc = fase(tc, pulo, fim), toque = { X: 102 + 6 * fc, D: d0, A: 8 + 6.5 * Math.sin(Math.PI * fc) };
      const bola = t < tc ? cruzamento(L, t, 0, tc, toque) : t < L.tGol ? voo(t, tc, L.tGol, toque, naLinha(L)) : naRede(L, t);
      return { art, bola, gol: goleiroVoa(L, t, { reage: tc + 90 }) };
    } };
  G.cabeca = { tGol: 1120, peso: peso(1.2, { DEF: 5, ATT: 2, GK: 0.2 }, 0, 0.5), alvo: (s) => ({ D: canto(s), A: s() < 0.6 ? 2 + s() * 4 : 15 + s() * 4 }),
    cena(L, t) {
      const d0 = L.d0, tc = 820, pulo = 600, fim = 960, f = fase(t, pulo, fim), sobe = 7.5 * Math.sin(Math.PI * f);
      const art = t < pulo ? { X: mix(72, 106, t / pulo), D: d0, p: corre(t) }
        : t < fim ? { X: 106 + 6 * f, D: d0, p: { ...CHUTE.cabeca, tr: t < tc ? -1 : 3, sobe } }
        : t < L.tGol ? { X: 112, D: d0, p: entre(CHUTE.cabeca, CHUTE.olha, fase(t, fim, fim + 120)) } : festejando(L, t, 112, d0);
      const fc = fase(tc, pulo, fim), toque = { X: 109 + 6 * fc, D: d0, A: 29 + 7.5 * Math.sin(Math.PI * fc) };
      const bola = t < tc ? cruzamento(L, t, 0, tc, toque) : t < L.tGol ? voo(t, tc, L.tGol, toque, naLinha(L)) : naRede(L, t);
      return { art, bola, gol: goleiroVoa(L, t, { reage: tc + 70 }) };
    } };
  // de bicicleta: de costas para o gol, sobe deitando no ar e bate por cima da cabeça
  G.bicicleta = { tGol: 1150, peso: peso(0.3, { ATT: 0.8, MEI: 0.4, DEF: 0.2, GK: 0 }, 0.6, 0.6), alvo: (s) => ({ D: canto(s), A: 6 + s() * 10 }),
    cena(L, t) {
      const d0 = L.d0, tc = 820, x = 100;
      let art;
      if (t < 560) art = { X: mix(84, x, t / 560), D: d0, p: corre(t) };
      else if (t < 660) art = { X: x, D: d0, vira: true, p: { ...CHUTE.olha, ag: 3, pE: [-12, 8], pD: [12, -8] } }; // de costas, agacha para subir
      else if (t < 1000) {
        const f = fase(t, 660, 1000), k = fase(t, 700, tc + 60);
        art = { X: x, D: d0, vira: true, deitado: 90, p: { pE: [mix(60, -25, k), mix(30, -20, k)], pD: [mix(20, 105, k), mix(10, 115, k)], bE: [-80, -60], bD: [-100, -120], pernasPorCima: true, sobe: 13 * Math.sin(Math.PI * f) } };
      } else if (t < L.tGol + 80) art = { X: x, D: d0, vira: true, deitado: 90, p: { ...GOLEIRO.chao, ol: 0 } }; // caído de costas, vendo a bola entrar
      else art = festejando(L, t, x, d0);
      const toque = { X: x + 3, D: d0, A: 24 };
      const bola = t < tc ? cruzamento(L, t, 0, tc, toque, 18, 12) : t < L.tGol ? voo(t, tc, L.tGol, toque, naLinha(L)) : naRede(L, t);
      return { art, bola, gol: goleiroVoa(L, t, { reage: tc + 80 }) };
    } };
  // de peixinho: mergulha de cabeça num cruzamento rasteiro e sai deslizando
  G.peixinho = { tGol: 1080, peso: peso(0.5, { ATT: 1, DEF: 1.2, GK: 0 }, 0.2, 0.5), alvo: (s) => ({ D: canto(s), A: 1 + s() * 4 }),
    cena(L, t) {
      const d0 = L.d0, tc = 820;
      const art = t < 700 ? { X: mix(70, 104, t / 700), D: d0, p: corre(t) }
        : t < L.tGol + 140 ? { X: 104 + 12 * suave(fase(t, 700, 1150)), D: d0, deitado: 90, p: { pE: [-4, -2], pD: [4, 2], bE: [-20, -10], bD: [20, 10], ol: 1, sobe: Math.max(0, 5 * Math.sin(Math.PI * fase(t, 700, 900))) } }
        : festejando(L, t, 116, d0);
      const toque = { X: 113, D: d0, A: 4 };
      const bola = t < tc ? cruzamento(L, t, 0, tc, toque, 6, 4) : t < L.tGol ? voo(t, tc, L.tGol, toque, naLinha(L)) : naRede(L, t);
      return { art, bola, poeira: t > 900 && t < 1180 ? { X: art.X - 10, D: d0 } : null, gol: goleiroVoa(L, t, { reage: tc + 60 }) };
    } };

  // ---------- os de bola parada ----------
  // de falta: a barreira pula, a bola passa por cima com efeito e entra no ângulo
  G.falta = { tGol: 1200, peso: peso(0.6, { MEI: 1.6, VOL: 1.2, GK: 0.8, DEF: 0.6 }, 0.6), alvo: (s) => ({ D: angulo(s), A: 16 + s() * 4 }),
    prepara(L) { const bx = L.futsal ? 72 : 64; L.falta = { bx, wx: bx + 22, dm: L.d0 + (L.alvo.D - L.d0) * 0.4 }; },
    cena(L, t) {
      const d0 = L.d0, tc = 780, { bx, wx, dm } = L.falta;
      const art = t < 300 ? { X: bx - 12, D: d0 + 2, p: { ...CHUTE.olha, bE: [-25, 40], bD: [25, -40] } } // as mãos na cintura, olhando o gol
        : t < tc - 80 ? { X: mix(bx - 12, bx - 2, fase(t, 300, tc - 80)), D: mix(d0 + 2, d0, fase(t, 300, tc - 80)), p: corre(t, "balanca", 300) }
        : t < L.tGol ? { X: bx - 2 + 3 * fase(t, tc - 80, tc + 180), D: d0, p: chutando(t, tc) } : festejando(L, t, bx + 1, d0);
      const salto = 5 * Math.sin(Math.PI * fase(t, tc - 20, tc + 320));
      const extras = [-1, 0, 1].map((k) => ({ b: L.rivais[k + 1], X: wx, D: dm + k * 4, vira: true, p: { pE: [-5, -3], pD: [5, 3], bE: [25, 100], bD: [-25, -100], ol: -1, sobe: salto } }));
      const bola = t < tc ? parada(bx, d0 - 0.5) : t < L.tGol ? voo(t, tc, L.tGol, { X: bx + 5, D: d0 - 0.5, A: 1 }, naLinha(L), 20, (L.alvo.D > dm ? 1 : -1) * 7) : naRede(L, t);
      return { art, extras, bola, spray: { X: wx - 3, D0: dm - 7, D1: dm + 7 }, gol: goleiroVoa(L, t, { reage: tc + 160, D0: 22 + (dm > 22 ? -4 : 4) }) };
    } };
  // de pênalti: o goleiro pula para o outro lado
  G.penalti = { tGol: 1000, peso: peso(0.7, { GK: 3, DEF: 0.5 }, 0.2), alvo: (s) => ({ D: canto(s), A: s() < 0.7 ? 2 + s() * 4 : 10 + s() * 6 }),
    cena: (L, t) => batePenalti(L, t, { tc: 760, bate: CHUTE.bate, arco: 1, reage: 790, para: L.alvo.D > 22 ? 9 : 35 }) };
  // a cavadinha no pênalti (a Panenka): o goleiro já foi para um canto e a bola sai devagar pelo meio
  G.panenka = { tGol: 1320, peso: peso(0.15, { GK: 0.5, MEI: 0.3 }, 0.3), alvo: (s) => ({ D: 19 + s() * 6, A: 7 + s() * 3 }),
    cena: (L, t) => batePenalti(L, t, { tc: 760, bate: CHUTE.cavada, arco: 12, reage: 740, para: L.alvo.D < 22 ? 36 : 8 }) };
  function batePenalti(L, t, { tc, bate, arco, reage, para }) {
    const mx = marcaPenalti(L.futsal);
    const art = t < 450 ? { X: mx - 12, D: 26, p: { ...CHUTE.olha, sobe: Math.abs(Math.sin(t / 200)) * 0.8 } }
      : t < tc - 80 ? { X: mix(mx - 12, mx - 3, fase(t, 450, tc - 80)), D: mix(26, 23, fase(t, 450, tc - 80)), p: corre(t, "balanca", 260) }
      : t < L.tGol ? { X: mx - 3 + 3 * fase(t, tc - 80, tc + 180), D: 23, p: chutando(t, tc, bate) } : festejando(L, t, mx, 23);
    const bola = t < tc ? parada(mx, 22) : t < L.tGol ? voo(t, tc, L.tGol, { X: mx + 1, D: 22, A: 1 }, naLinha(L), arco) : naRede(L, t);
    return { art, bola, gol: goleiroVoa(L, t, { reage, X0: 131, D0: 22, para, alto: 5, fim: reage + 300, pose: GOLEIRO.alto }) };
  }
  // olímpico: direto do escanteio, a bola faz a curva e entra
  G.olimpico = { tGol: 1260, escanteio: true, peso: peso(0.15, { MEI: 0.5, VOL: 0.3, GK: 0 }, 0.3), alvo: (s) => ({ D: 6 + s() * 14, A: 12 + s() * 6 }),
    cena(L, t) {
      const tc = 760, cx = ESCANTEIO.X - 1, cd = ESCANTEIO.D + 1; // a bola na marca do escanteio; ele vem pela esquerda
      const art = t < 400 ? { X: cx - 16, D: cd - 4, p: CHUTE.olha }
        : t < tc - 80 ? { X: mix(cx - 16, cx - 8, fase(t, 400, tc - 80)), D: mix(cd - 4, cd - 2, fase(t, 400, tc - 80)), p: corre(t, "balanca", 260) }
        : t < L.tGol ? { X: cx - 8 + 2 * fase(t, tc - 80, tc + 180), D: cd - 2, p: chutando(t, tc) } : festejando(L, t, cx - 6, cd - 2, -20, 10);
      const bola = t < tc ? parada(cx, cd) : t < L.tGol ? curva(t, tc, L.tGol, { X: cx, D: cd, A: 0 }, { X: 112, D: 14, A: 30 }, naLinha(L)) : naRede(L, t);
      return { art, bola, gol: goleiroVoa(L, t, { reage: 1080, X0: 129, D0: 12, para: L.alvo.D + 5, alto: 9 }) };
    } };

  // ---------- os de jogada ----------
  // de calcanhar: de costas para o gol, recebe o passe do companheiro e toca de calcanhar para trás
  G.calcanhar = { tGol: 1080, peso: peso(0.5, { ATT: 0.9, MEI: 0.8, DEF: 0.1, GK: 0 }, 0.5), alvo: (s) => ({ D: canto(s), A: 1 + s() * 3 }),
    cena(L, t) {
      const d0 = L.d0, tc = 820, px = 112, passe = 600, cd = d0 + 10;
      const art = t < 560 ? { X: mix(90, px, t / 560), D: d0, p: corre(t) }
        : t < tc - 60 ? { X: px, D: d0, vira: true, p: CHUTE.olha }
        : t < L.tGol + 60 ? { X: px, D: d0, vira: true, p: entre({ ...CHUTE.olha, pD: [-20, -30] }, { pE: [-4, -2], pD: [-75, -50], bE: [-60, -30], bD: [60, 90], tr: 1, ol: 1 }, fase(t, tc - 60, tc)) }
        : festejando(L, t, px, d0);
      const comp = { b: L.parceiros[0], X: 72, D: cd, p: t > passe - 80 && t < passe + 140 ? chutando(t, passe, CHUTE.toque) : t >= L.tGol ? corre(t, "alto", 240) : CHUTE.olha };
      const bola = t < passe ? parada(78, cd - 0.5) : t < tc ? voo(t, passe, tc, { X: 78, D: cd - 0.5, A: 0 }, { X: px - 2, D: d0 - 0.5, A: 0 }) : t < L.tGol ? voo(t, tc, L.tGol, { X: px + 3, D: d0 - 0.5, A: 0.5 }, naLinha(L)) : naRede(L, t);
      return { art, extras: [comp], bola, gol: goleiroVoa(L, t, { reage: tc + 140 }) };
    } };
  // de chapéu: levanta a bola por cima do zagueiro, passa por ele e bate antes de ela cair
  G.chapeu = { tGol: 1240, peso: peso(0.4, { ATT: 0.8, MEI: 0.9, DEF: 0.1, GK: 0 }, 0.6), alvo: (s) => ({ D: canto(s), A: 3 + s() * 10 }),
    cena(L, t) {
      const d0 = L.d0, tl = 620, tc = 960, zx = 100;
      const art = t < tl - 60 ? { X: mix(50, zx - 12, t / (tl - 60)), D: d0, p: corre(t) }
        : t < tl + 100 ? { X: zx - 12 + 2 * fase(t, tl - 60, tl + 100), D: d0, p: chutando(t, tl, { ...CHUTE.toque, pD: [30, 0] }) }
        : t < tc - 60 ? { X: mix(zx - 10, zx + 8, fase(t, tl + 100, tc - 60)), D: d0 + 4 * Math.sin(Math.PI * fase(t, tl + 100, tc - 60)), p: corre(t, "balanca", 240) }
        : t < L.tGol ? { X: zx + 8 + 2 * fase(t, tc - 60, tc + 180), D: d0, p: { ...chutando(t, tc, CHUTE.voleio), sobe: 2 * Math.sin(Math.PI * fase(t, tc - 80, tc + 120)) } }
        : festejando(L, t, zx + 10, d0);
      const zag = { b: L.rivais[0], X: zx, D: d0 + 0.5, vira: t < tc, p: t < tl ? GOLEIRO.base : { ...CHUTE.cabeca, ol: -1, sobe: 3 * Math.sin(Math.PI * fase(t, tl + 60, tl + 300)) } };
      const sobeBola = { X: zx + 14, D: d0, A: 5 };
      const bola = t < tl ? conduz(art, t) : t < tc ? voo(t, tl, tc, { X: zx - 6, D: d0 - 1, A: 1 }, sobeBola, 16) : t < L.tGol ? voo(t, tc, L.tGol, sobeBola, naLinha(L)) : naRede(L, t);
      return { art, extras: [zag], bola, gol: goleiroVoa(L, t, { reage: tc + 90 }) };
    } };
  // no rebote: o chute bate na trave, volta, e ele empurra para o gol
  G.rebote = { tGol: 1440, peso: peso(1, { ATT: 2, DEF: 1.4, GK: 0 }), alvo: (s) => ({ D: 14 + s() * 14, A: 1 + s() * 2 }),
    prepara(L, s) { L.trave = s() < 0.5 ? 4 : 40; },
    cena(L, t) {
      const d0 = L.d0, tc = 780, bate = 1040, tc2 = 1300, tv = L.trave, volta = { X: 117, D: tv + (tv > 22 ? -9 : 9), A: 0 };
      const art = t < tc - 80 ? { X: mix(42, 98, t / (tc - 80)), D: d0, p: corre(t) }
        : t < bate ? { X: 98 + 4 * fase(t, tc - 80, tc + 180), D: d0, p: chutando(t, tc) }
        : t < tc2 - 60 ? { X: mix(102, volta.X - 6, fase(t, bate, tc2 - 60)), D: mix(d0, volta.D, fase(t, bate, tc2 - 60)), p: corre(t, "balanca", 230) }
        : t < L.tGol ? { X: volta.X - 6, D: volta.D, p: chutando(t, tc2, CHUTE.toque) } : festejando(L, t, volta.X - 5, volta.D);
      const naTrave = { X: GOL_X, D: tv, A: 8 }, f = fase(t, bate, tc2);
      const bola = t < tc ? conduz(art, t) : t < bate ? voo(t, tc, bate, { X: 106, D: d0 - 1, A: 1 }, naTrave, 3)
        : t < tc2 ? { ...voo(t, bate, tc2, naTrave, volta), A: 8 * (1 - f) * Math.abs(Math.cos(Math.PI * 1.5 * f)) }
        : t < L.tGol ? voo(t, tc2, L.tGol, { X: volta.X + 1, D: volta.D, A: 1 }, naLinha(L)) : naRede(L, t);
      const bateu = t >= bate && t < bate + 180 ? { lado: tv < 22 ? "perto" : "longe", treme: Math.floor((t - bate) / 45) % 2 ? 1 : -1, onde: naTrave, t: t - bate } : null;
      return { art, bola, bate: bateu, gol: goleiroVoa(L, t, { reage: tc + 90, para: tv + (tv > 22 ? -6 : 6), alto: 6, fim: bate + 100 }) };
    } };
  // driblando o goleiro: o goleiro sai, ele corta para o lado e toca para o gol vazio
  G.dribla = { tGol: 1220, peso: peso(0.8, { ATT: 2, MEI: 1, DEF: 0.1, GK: 0 }, 0.6), alvo: (s, L) => ({ D: Math.max(8, Math.min(36, L.d0 + 12)), A: 1 }),
    cena(L, t) {
      const d0 = L.d0, corta = 780, tc = 1040, dd = Math.max(8, Math.min(36, d0 + 12));
      const art = t < corta ? { X: mix(50, 108, t / corta), D: d0, p: corre(t) }
        : t < tc - 60 ? { X: mix(108, 116, fase(t, corta, tc - 60)), D: mix(d0, dd, suave(fase(t, corta, tc - 60))), p: corre(t, "balanca", 220) }
        : t < L.tGol ? { X: 116 + 2 * fase(t, tc - 60, tc + 180), D: dd, p: chutando(t, tc, CHUTE.toque) } : festejando(L, t, 118, dd);
      const bola = t < tc ? conduz(art, t) : t < L.tGol ? voo(t, tc, L.tGol, { X: 122, D: dd - 1, A: 1 }, naLinha(L)) : naRede(L, t);
      return { art, bola, gol: goleiroVoa(L, t, { reage: corta + 20, sai: { t0: 300, t1: 760, X: 117 }, D0: d0, frente: true, alto: 2, fim: corta + 320 }) };
    } };
  // arrancada: sai lá de trás, pula o carrinho do zagueiro e chuta
  G.arrancada = { tGol: 1380, peso: peso(0.6, { ATT: 1.3, MEI: 1, DEF: 0.2, GK: 0 }, 0.6), alvo: (s) => ({ D: canto(s), A: 1 + s() * 8 }),
    cena(L, t) {
      const d0 = L.d0, tc = 1080, p0 = 520, p1 = 680;
      const correndo = { ...corre(t, "balanca", 230) };
      if (t > p0 && t < p1) correndo.sobe = 5 * Math.sin(Math.PI * fase(t, p0, p1)); // pula o carrinho
      const art = t < tc - 80 ? { X: mix(12, 102, t / (tc - 80)), D: d0, p: correndo }
        : t < L.tGol ? { X: 102 + 4 * fase(t, tc - 80, tc + 180), D: d0, p: chutando(t, tc) } : festejando(L, t, 106, d0);
      const deslizando = t > 420, zx = t < 420 ? mix(86, 80, t / 420) : mix(80, 58, fase(t, 420, 760));
      const zag = { b: L.rivais[0], X: zx, D: t < 420 ? d0 + 10 : mix(d0 + 10, d0 + 1, fase(t, 420, 620)), vira: true, deitado: deslizando ? 90 : 0,
        p: deslizando ? { pE: [-10, -5], pD: [70, 60], bE: [-140, -150], bD: [40, 20], ol: -1 } : corre(t, "balanca", 240) };
      const bola = t < tc ? conduz(art, t) : t < L.tGol ? voo(t, tc, L.tGol, { X: 108, D: d0 - 1, A: 1 }, naLinha(L), 3) : naRede(L, t);
      return { art, extras: [zag], bola, poeira: deslizando && t < 820 ? { X: zx + 8, D: zag.D } : null, gol: goleiroVoa(L, t, { reage: tc + 90 }) };
    } };
  // tabelinha: toca para o companheiro, recebe de volta na frente e bate de primeira
  G.tabela = { tGol: 1200, peso: peso(1, { MEI: 1.8, ATT: 1.4, VOL: 1.2, DEF: 0.4, GK: 0 }), alvo: (s) => ({ D: canto(s), A: 1 + s() * 6 }),
    cena(L, t) {
      const d0 = L.d0, p1 = 260, chega = 520, p2 = 560, tc = 900, cx = 97, cd = Math.min(36, d0 + 14), xa = (k) => mix(54, 100, k / (tc - 80));
      const art = t < tc - 80 ? { X: xa(t), D: d0, p: t > p1 - 80 && t < p1 + 120 ? chutando(t, p1, CHUTE.toque) : corre(t) }
        : t < L.tGol ? { X: 100 + 4 * fase(t, tc - 80, tc + 180), D: d0, p: chutando(t, tc) } : festejando(L, t, 104, d0);
      const comp = { b: L.parceiros[0], X: cx, D: cd, p: t > p2 - 80 && t < p2 + 140 ? chutando(t, p2, CHUTE.toque) : t >= L.tGol ? corre(t, "alto", 240) : CHUTE.olha };
      const bola = t < p1 ? conduz(art, t) : t < chega ? voo(t, p1, chega, { X: xa(p1) + 6, D: d0 - 1, A: 0 }, { X: cx + 1, D: cd - 1, A: 0 })
        : t < p2 ? parada(cx + 1, cd - 1) : t < tc ? voo(t, p2, tc, { X: cx + 2, D: cd - 1, A: 0 }, { X: 106, D: d0 - 1, A: 0 })
        : t < L.tGol ? voo(t, tc, L.tGol, { X: 107, D: d0 - 1, A: 1 }, naLinha(L), 2) : naRede(L, t);
      return { art, extras: [comp], bola, gol: goleiroVoa(L, t, { reage: tc + 90 }) };
    } };
  // de carrinho: chega deslizando num cruzamento rasteiro e empurra para o gol
  G.carrinho = { tGol: 1020, peso: peso(0.7, { ATT: 1.5, DEF: 0.8, GK: 0 }, 0, 0.8), alvo: (s) => ({ D: canto(s), A: 1 }),
    cena(L, t) {
      const d0 = L.d0, tc = 880;
      const art = t < 700 ? { X: mix(68, 108, t / 700), D: d0, p: corre(t) }
        : t < L.tGol + 60 ? { X: 108 + 10 * suave(fase(t, 700, 960)), D: d0, p: { ag: 7, pE: [-40, 60], pD: [82, 88], bE: [-130, -150], bD: [-40, -60], tr: -2, ol: 1 } }
        : festejando(L, t, 118, d0);
      const toque = { X: 120, D: d0, A: 0 };
      const bola = t < tc ? voo(t, 300, tc, { X: 30, D: d0 + 22, A: 0 }, toque) : t < L.tGol ? voo(t, tc, L.tGol, { X: 121, D: d0, A: 0.5 }, naLinha(L)) : naRede(L, t);
      return { art, bola, poeira: t > 720 && t < 980 ? { X: art.X - 4, D: d0 } : null, gol: goleiroVoa(L, t, { reage: tc + 40, alto: 3 }) };
    } };

  // os jeitos preferidos dos craques (somam no peso do sorteio)
  Object.assign(Lances.FINALIZACAO, {
    "Diego Maradona": { arrancada: 4, dribla: 1 }, "Lionel Messi": { arrancada: 2, dribla: 2, cavadinha: 1 }, "Ronaldo Fenômeno": { dribla: 3, arrancada: 1 },
    "Roberto Carlos": { falta: 3, trivela: 3, bomba: 2 }, "Zico": { falta: 3 }, "Juninho Pernambucano": { falta: 4 }, "Rogério Ceni": { falta: 4, penalti: 3 },
    "Zlatan Ibrahimović": { bicicleta: 3, calcanhar: 2 }, "Rivaldo": { bicicleta: 3, bomba: 2 }, "Ronaldinho Gaúcho": { chapeu: 2, calcanhar: 2, falta: 1 },
    "Pelé": { chapeu: 2, bicicleta: 1 }, "Cristiano Ronaldo": { falta: 2, cabeca: 1, bomba: 1 }, "Romário": { cavadinha: 2, dribla: 1 },
    "Andrea Pirlo": { falta: 3, panenka: 2 }, "Francesco Totti": { panenka: 2, cavadinha: 1 }, "Neymar": { chapeu: 1, dribla: 1 },
    "Erling Haaland": { voleio: 2, chute: 1 }, "Kaká": { arrancada: 2 }, "Thierry Henry": { trivela: 1, angulo: 1 }, "David Beckham": { falta: 3 },
  });
})();
