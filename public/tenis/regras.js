// Tênis da Galera — quadra, bola, golpes, pontuação e os robôs (estilo arcade, inspirado no Mario Tennis).
// Usado pelo servidor (quem manda na bola e no placar, online) e pelo navegador (treino contra robôs, sem internet,
// rodando as mesmas regras). Tudo em metros e segundos.
//
// A quadra fica ao longo do eixo z: a rede em z = 0, o time A do lado +z e o time B do lado −z. O x é a largura.
// Como no Mario Tennis, o golpe é "armado": você aperta o botão ANTES da bola chegar e o jogador bate sozinho quando a
// bola entra no alcance do braço. Quanto antes apertar, mais forte sai (mas, armado, ele anda mais devagar). A direção
// (setas/analógico) na hora da batida escolhe para onde a bola vai. Isso deixa o jogo gostoso mesmo com o atraso da
// internet: ninguém precisa acertar o instante exato da batida.
(function (root) {
  // medidas oficiais (m)
  const Q = { L: 11.885, WS: 4.115, WD: 5.485, SERV: 6.4, REDE: 0.914, REDE_POSTE: 1.07, R: 0.04,
    FX: 9, FZ: 18 }; // até onde dá para correr (de lado e para trás) — além disso, muro
  const G = 9.81;
  // golpes: tipo de efeito (gravidade "efetiva", quique), profundidade do alvo, tempo de voo e a tecla
  const GOLPES = {
    // (bola mais lenta e quicando mais alto que o tênis de verdade: é arcade, para dar tempo de chegar)
    top: { nome: "Top spin", g: 1.3, e: 0.8, kh: 1.0, prof: [8.2, 10.6], T: [1.25, 0.95] },      // cai forte e quica alto para a frente
    slice: { nome: "Cortada", g: 0.8, e: 0.64, kh: 0.82, prof: [7.2, 9.6], T: [1.5, 1.22] },       // flutua e quica mais baixo
    lob: { nome: "Balão", g: 1.0, e: 0.82, kh: 0.9, prof: [9.6, 10.9], T: [2.35, 2.1] },           // passa por cima de quem está na rede
    curta: { nome: "Curtinha", g: 1.0, e: 0.52, kh: 0.6, prof: [2.2, 4.0], T: [1.3, 1.15] },       // morre logo depois da rede
    smash: { nome: "Smash", g: 1.2, e: 0.82, kh: 1.0, prof: [7.5, 10.4], T: [0.68, 0.55] },        // bola alta: pancada para baixo
    saque: { nome: "Saque", g: 1.2, e: 0.8, kh: 0.95, prof: [4.6, 6.1], T: [1.05, 0.8] },
  };
  // jogador
  const VEL = 6.3, VEL_ARMADO = 0.7, ACEL = 30, ALCANCE = 1.5, ALTURA_MAX = 2.45, ALTURA_SMASH = 2.15, ARMADO_MAX = 2.6, CARGA_T = 1.0;
  // robôs
  const DIF = {
    facil: { nome: "Fácil", vel: 0.72, reac: 0.45, erro: 1.6, arma: 0.55 },
    medio: { nome: "Médio", vel: 0.88, reac: 0.28, erro: 1.0, arma: 0.7 },
    dificil: { nome: "Difícil", vel: 1.0, reac: 0.14, erro: 0.6, arma: 0.85 },
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ladoDe = (z) => (z >= 0 ? "A" : "B"); // de que lado da rede está
  const sinal = (team) => (team === "A" ? 1 : -1); // lado +z ou −z
  const outro = (t) => (t === "A" ? "B" : "A");

  // ---------- partida ----------
  // jogadores: [{ id, team, slot (0 ou 1), bot, nome }]; cfg: { duplas, games, dif }
  function novaPartida(jogadores, cfg, agora) {
    const m = { cfg: { duplas: !!cfg.duplas, games: cfg.games || 4, dif: DIF[cfg.dif] ? cfg.dif : "medio" },
      jogadores: jogadores.map((j) => ({ ...j, x: 0, z: sinal(j.team) * (Q.L + 1), vx: 0, vz: 0, mira: { x: 0, z: 0 }, armado: null, giroT: -9, alvo: null, pensa: 0 })),
      bola: novaBola(), placar: { A: 0, B: 0 }, games: { A: 0, B: 0 }, tie: false, sacaTime: "A", ordemSaque: { A: 0, B: 0 }, sacador: null,
      fase: "saque", ate: agora + 1200, faltas: 0, pontoNoGame: 0, fim: false, vencedor: null, ev: [], seq: 0, rally: 0 };
    m.sacador = escolherSacador(m);
    posicionar(m);
    return m;
  }
  const novaBola = () => ({ x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, g: G, e: 0.7, kh: 0.95, viva: false, ultimo: null, quiques: 0, saque: false, ladoQuique: null, tipo: null, rede: false });
  function escolherSacador(m) {
    const t = m.sacaTime, lista = m.jogadores.filter((j) => j.team === t).sort((a, b) => a.slot - b.slot);
    return lista[m.ordemSaque[t] % lista.length].id;
  }
  // lado do saque: pontos pares do game, do lado direito de quem saca (olhando para a rede); ímpares, do esquerdo.
  // A "direita" de quem olha para a rede: time A (olha para −z) é +x; time B é −x, ou seja, direita = sinal(time).
  const ladoSaque = (m) => (m.pontoNoGame % 2 === 0 ? 1 : -1);
  // quem recebe: em simples, o adversário; em duplas, um de cada vez (pares: o do slot 0; ímpares: o do slot 1)
  function recebedor(m) {
    const sac = m.jogadores.find((j) => j.id === m.sacador), rivais = m.jogadores.filter((j) => j.team !== sac.team).sort((a, b) => a.slot - b.slot);
    return rivais.length < 2 ? rivais[0] : rivais[ladoSaque(m) === 1 ? 0 : 1];
  }
  // todo mundo no lugar para o saque: quem saca atrás da linha de fundo, quem recebe na diagonal, os parceiros na rede
  function posicionar(m) {
    const sac = m.jogadores.find((j) => j.id === m.sacador), s = sinal(sac.team);
    m.sacX = s * ladoSaque(m) * 1.0; // onde quem saca fica (em x)
    const diag = -Math.sign(m.sacX), rec = recebedor(m); // o saque cai do outro lado em x (diagonal)
    for (const j of m.jogadores) {
      const sj = sinal(j.team); let x, z;
      if (j === sac) { x = m.sacX; z = s * (Q.L + 0.4); }
      else if (j.team === sac.team) { x = diag * 2.4; z = s * 3.8; }   // parceiro de quem saca: na rede, do outro lado
      else if (j === rec) { x = diag * 2.6; z = sj * (Q.L - 0.4); }
      else { x = -diag * 2.4; z = sj * 5.5; }                         // parceiro de quem recebe
      Object.assign(j, { x, z, vx: 0, vz: 0, armado: null, alvo: null });
    }
    Object.assign(m.bola, novaBola(), { x: sac.x, z: sac.z, y: 1, viva: false });
  }

  // ---------- jogador: anda (o navegador mexe o próprio; o servidor e o treino mexem os robôs) ----------
  // dir: {x, z} (comprimento até 1). Não passa da rede nem dos muros.
  // Golpe armado: o jogador só vai perdendo a velocidade devagar (DESACEL) e o direcional passa a ser, quase só, a
  // mira; sobra um pouquinho de controle (ARMADO_CONTROLE) para ajeitar a posição.
  const DESACEL = 4.5, ARMADO_CONTROLE = 0.22;
  function mover(j, dir, dt, soLado = false, m = null) {
    const armado = !!j.armado, vmax = VEL * (j.bot ? DIF_ATUAL.vel : 1) * (armado ? ARMADO_CONTROLE : 1);
    if (soLado) dir = { x: dir.x, z: 0 };
    const l = Math.hypot(dir.x, dir.z), tx = l > 1 ? (dir.x / l) * vmax : dir.x * vmax, tz = l > 1 ? (dir.z / l) * vmax : dir.z * vmax;
    const dx = tx - j.vx, dz = tz - j.vz, d = Math.hypot(dx, dz), a = (armado ? DESACEL : ACEL) * dt;
    if (d <= a) { j.vx = tx; j.vz = tz; } else { j.vx += (dx / d) * a; j.vz += (dz / d) * a; }
    if (soLado) j.vz = 0;
    j.x += j.vx * dt; j.z += j.vz * dt;
    limitar(j, m);
  }
  function limitar(j, m) {
    const s = sinal(j.team);
    j.x = clamp(j.x, -Q.FX, Q.FX);
    // no saque, quem saca anda só na sua metade da linha de fundo (não passa do meio)
    if (m && j.id === m.sacador && m.sacX && m.fase !== "jogo") j.x = m.sacX > 0 ? clamp(j.x, 0.2, Q.WD) : clamp(j.x, -Q.WD, -0.2);
    if (s > 0) j.z = clamp(j.z, 0.45, Q.FZ); else j.z = clamp(j.z, -Q.FZ, -0.45);
  }
  let DIF_ATUAL = DIF.medio;

  // ---------- bola ----------
  // altura da rede em x (mais alta nos postes)
  const alturaRede = (x) => Q.REDE + (Q.REDE_POSTE - Q.REDE) * Math.min(1, Math.abs(x) / (Q.WD + 0.9));
  // um passo da bola; devolve o que aconteceu: "quique", "rede", "fora" (saiu da área)
  function passoBola(b, dt) {
    const z0 = b.z;
    b.vy -= b.g * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    let ev = null;
    // rede: cruzou z = 0 baixo demais (e dentro dos postes)
    if (Math.sign(z0) !== Math.sign(b.z) && z0 !== 0 && Math.abs(b.x) < Q.WD + 0.9 && b.y < alturaRede(b.x) + Q.R) {
      b.z = Math.sign(z0) * 0.05; b.vz = -b.vz * 0.12; b.vx *= 0.3; b.vy = Math.min(b.vy, 0) * 0.3; b.rede = true; ev = "rede";
    }
    if (b.y <= Q.R) { // quique: o efeito do golpe vale só no primeiro
      b.y = Q.R;
      if (b.vy < -0.6) { b.vy = -b.vy * b.e; b.vx *= b.kh; b.vz *= b.kh; ev = "quique"; b.g = G; b.e = 0.72; b.kh = 0.9; }
      else { b.vy = 0; b.vx *= 1 - 2 * dt; b.vz *= 1 - 2 * dt; if (!ev && b.viva) ev = "rolando"; }
    }
    if (Math.abs(b.x) > Q.FX + 1 || Math.abs(b.z) > Q.FZ + 1) ev = "fora";
    return ev;
  }
  // onde a bola vai estar daqui a t segundos (copia e simula; usada pelos robôs)
  function prever(b, t, passo = 1 / 60) { const c = { ...b }; for (let k = 0; k < t / passo; k++) passoBola(c, passo); return c; }

  // ---------- golpe ----------
  // monta a velocidade para a bola sair de (b) e cair no alvo (alvo.x, alvo.z) em T segundos com a gravidade do golpe;
  // se não passa da rede, vai aumentando o tempo (a bola sobe mais) até passar
  function lancar(b, alvo, T, g) {
    for (let k = 0; k < 14; k++) {
      const vx = (alvo.x - b.x) / T, vz = (alvo.z - b.z) / T, vy = (Q.R - b.y + 0.5 * g * T * T) / T;
      const tn = -b.z / vz; // quando cruza a rede
      if (!(tn > 0 && tn < T) || b.y + vy * tn - 0.5 * g * tn * tn > alturaRede(b.x + vx * tn) + 0.18) return { vx, vy, vz };
      T *= 1.08;
    }
    const vx = (alvo.x - b.x) / T, vz = (alvo.z - b.z) / T; return { vx, vy: (Q.R - b.y + 0.5 * g * T * T) / T, vz };
  }
  const gauss = (rnd) => (rnd() + rnd() + rnd() - 1.5) / 0.5;
  // bate: tipo do golpe, força (0 a 1), mira {x: −1..1 (lado), z: −1..1 (curta/funda)} vista por quem bate
  // o alvo do golpe (sem o erro): do lado do adversário. Mira de lado: até 82% da largura; sem mira, cruzado (do lado
  // oposto de quem bate). Mira para a frente: mais funda; para trás: mais curta. O navegador usa para desenhar a mira.
  function alvoGolpe(duplas, sacX, j, tipo, mira) {
    const s = sinal(j.team), Gp = GOLPES[tipo], larg = duplas && tipo !== "saque" ? Q.WD : Q.WS;
    const ax = mira && Math.abs(mira.x) > 0.15 ? mira.x : -Math.sign(j.x || 1) * 0.35;
    const prof = Gp.prof[0] + (Gp.prof[1] - Gp.prof[0]) * clamp(0.5 + (mira ? mira.z : 0) * 0.5, 0, 1);
    if (tipo === "saque") return { x: -Math.sign(sacX || 1) * Q.WS * (0.3 + 0.55 * Math.abs(ax)), z: -s * prof, ax }; // na caixa da diagonal
    return { x: ax * larg * 0.82, z: -s * prof, ax };
  }
  function bater(m, j, tipo, forca, mira, rnd = Math.random) {
    const b = m.bola, s = sinal(j.team), Gp = GOLPES[tipo];
    const alvo = alvoGolpe(m.cfg.duplas, m.sacX, j, tipo, mira), ax = alvo.ax;
    let tx = alvo.x, tz = alvo.z;
    // erro: cresce com a força, com a mira na linha e com a bola mal pega (atrás do corpo)
    const atras = (b.z - j.z) * s > 0.4 ? 1 : 0, extremo = Math.abs(ax) > 0.8 ? 1 : 0;
    const sig = (0.22 + 0.45 * forca * (0.4 + extremo) + 0.5 * atras) * (j.bot ? DIF_ATUAL.erro : 1);
    tx += gauss(rnd) * sig; tz += gauss(rnd) * sig * 0.8;
    const T = Gp.T[0] + (Gp.T[1] - Gp.T[0]) * forca, g = G * Gp.g;
    const v = lancar(b, { x: tx, z: tz }, T, g);
    Object.assign(b, { vx: v.vx, vy: v.vy, vz: v.vz, g, e: Gp.e, kh: Gp.kh, ultimo: j.team, quiques: 0, ladoQuique: null, tipo, viva: true, rede: false, por: j.id, saque: tipo === "saque" });
    if (b.y < Q.R + 0.05) b.y = Q.R + 0.05;
    j.giroT = m.t; j.armado = null; m.rally++;
    m.ev.push({ tipo: "batida", id: j.id, golpe: tipo, forca });
  }
  // a bola está no alcance de j? (do lado dele, no alcance do braço, numa altura boa, depois do quique quando é saque)
  function alcanca(m, j, folga = 0) {
    const b = m.bola; if (!b.viva || b.ultimo === j.team) return null;
    if (ladoDe(b.z) !== j.team) return null;
    if (b.saque && b.quiques < 1) return null; // saque: tem que quicar antes
    const d = Math.hypot(b.x - j.x, b.z - j.z);
    if (d > ALCANCE + folga || b.y > ALTURA_MAX + 0.6 + folga) return null;
    if (b.y > ALTURA_SMASH && b.quiques === 0) return "smash"; // bola alta antes de quicar (balão, bola alta na rede): smash
    return b.y > ALTURA_MAX + 0.25 ? null : "normal";
  }
  // armar o golpe (apertou o botão)
  function armar(m, j, tipo, agora) { if (m.fase !== "jogo" || !GOLPES[tipo] || tipo === "saque" || tipo === "smash") return; j.armado = { tipo, t0: agora }; }
  // saque: primeiro toque joga a bola para cima; o segundo bate (mais forte perto do alto)
  function sacar(m, j, agora) {
    if (j.id !== m.sacador) return;
    const b = m.bola;
    if (m.fase === "saque" && agora >= m.ate) { Object.assign(b, { x: j.x + 0.25, z: j.z - sinal(j.team) * 0.2, y: 1.2, vx: 0, vy: 6.2, vz: 0, g: G, viva: false }); m.fase = "lancado"; m.ev.push({ tipo: "lanca", id: j.id }); return; }
    if (m.fase === "lancado" && b.y > 1.6) {
      const forca = clamp(1 - Math.abs(b.vy) / 6.2, 0, 1) * 0.6 + 0.4 * (b.y > 2.6 ? 1 : 0.5); // pertinho do alto: saque forte
      m.fase = "jogo"; bater(m, j, "saque", clamp(forca, 0.3, 1), j.mira);
    }
  }

  // ---------- pontos ----------
  const NOMES_PONTO = ["0", "15", "30", "40"];
  function textoPlacar(m) {
    const a = m.placar.A, b = m.placar.B;
    if (m.tie) return `${a} x ${b}`;
    if (a >= 3 && b >= 3) return a === b ? "Iguais" : a > b ? "Vantagem A" : "Vantagem B";
    return `${NOMES_PONTO[Math.min(3, a)]} x ${NOMES_PONTO[Math.min(3, b)]}`;
  }
  function ponto(m, time, motivo, agora) {
    m.placar[time]++; m.pontoNoGame++;
    m.ev.push({ tipo: "ponto", time, motivo, rally: m.rally });
    const a = m.placar[time], b = m.placar[outro(time)];
    const ganhouGame = m.tie ? a >= 7 && a - b >= 2 : a >= 4 && a - b >= 2;
    if (ganhouGame) {
      m.games[time]++; m.placar = { A: 0, B: 0 }; m.pontoNoGame = 0;
      const ga = m.games[time], gb = m.games[outro(time)], N = m.cfg.games;
      m.ev.push({ tipo: "game", time, games: { ...m.games } });
      if ((ga >= N && ga - gb >= 2) || m.tie) { m.fim = true; m.vencedor = time; m.fase = "fim"; m.ev.push({ tipo: "fim", time }); return; }
      m.tie = ga === N && gb === N; // N a N: tie-break (a 7)
      // o saque passa para o outro time (e, em duplas, cada time alterna quem saca)
      m.ordemSaque[m.sacaTime]++; m.sacaTime = outro(m.sacaTime);
    } else if (m.tie && m.pontoNoGame % 2 === 1) { m.ordemSaque[m.sacaTime]++; m.sacaTime = outro(m.sacaTime); } // no tie-break, troca a cada 2 pontos
    m.faltas = 0; m.rally = 0;
    m.fase = "ponto"; m.ate = agora + 1700;
  }
  function falta(m, agora) {
    m.faltas++;
    if (m.faltas >= 2) { m.ev.push({ tipo: "dupla" }); return ponto(m, outro(m.sacaTime), "dupla falta", agora); }
    m.ev.push({ tipo: "falta" });
    m.fase = "saque"; m.ate = agora + 900; posicionarSaqueDeNovo(m);
  }
  function posicionarSaqueDeNovo(m) { const sac = m.jogadores.find((j) => j.id === m.sacador); Object.assign(m.bola, novaBola(), { x: sac.x, z: sac.z }); }

  // ---------- um passo do jogo (bola, regras e robôs) ----------
  // humanos: o navegador de cada um mexe o próprio jogador (offline, o treino chama mover para mim antes)
  function passo(m, dt, agora, rnd = Math.random) {
    m.t = agora; DIF_ATUAL = DIF[m.cfg.dif];
    if (m.fim) return;
    if (m.fase === "ponto") { passoBola(m.bola, dt); if (agora >= m.ate) { m.sacador = escolherSacador(m); posicionar(m); m.fase = "saque"; m.ate = agora + 700; } robos(m, dt, agora, rnd); return; }
    robos(m, dt, agora, rnd);
    const b = m.bola;
    if (m.fase === "saque") { const sac = m.jogadores.find((j) => j.id === m.sacador); Object.assign(b, { x: sac.x + 0.25, z: sac.z - sinal(sac.team) * 0.2, y: 1, vx: 0, vy: 0, vz: 0 }); return; }
    if (m.fase === "lancado") { passoBola(b, dt); if (b.y < 1.1 && b.vy < 0) { m.fase = "saque"; m.ate = agora; } return; } // deixou cair: joga de novo (não é falta)
    // jogo
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let k = 0; k < n && m.fase === "jogo"; k++) {
      const ev = passoBola(b, dt / n);
      if (ev === "quique") quique(m, agora);
      else if (ev === "fora" || (ev === "rolando" && b.quiques >= 1)) {
        if (b.quiques === 0 && ev === "fora") { if (b.saque) falta(m, agora); else ponto(m, outro(b.ultimo), "fora", agora); }
        else ponto(m, b.ultimo, "não devolveu", agora);
      }
      else if (ev === "rede") m.ev.push({ tipo: "rede" });
      if (m.fase !== "jogo") break;
      // golpes armados: quem estiver no alcance bate
      for (const j of m.jogadores) {
        if (!j.armado) continue;
        if (agora - j.armado.t0 > ARMADO_MAX * 1000) { j.armado = null; continue; }
        const a = alcanca(m, j, j.bot ? 0 : 0.25); if (!a) continue;
        const forca = clamp((agora - j.armado.t0) / (CARGA_T * 1000), 0.15, 1);
        bater(m, j, a === "smash" ? "smash" : j.armado.tipo, forca, j.mira, rnd);
        break;
      }
    }
  }
  function quique(m, agora) {
    const b = m.bola, lado = ladoDe(b.z);
    m.ev.push({ tipo: "quique", x: b.x, z: b.z });
    if (b.quiques === 0) {
      // primeiro quique depois da batida: tem que ser do outro lado e dentro (no saque, dentro da caixa certa)
      if (lado === b.ultimo) { if (b.saque) return falta(m, agora); return ponto(m, outro(b.ultimo), b.rede ? "rede" : "do próprio lado", agora); }
      const larg = m.cfg.duplas && !b.saque ? Q.WD : Q.WS;
      let dentro = Math.abs(b.x) <= larg + Q.R && Math.abs(b.z) <= Q.L + Q.R;
      if (b.saque) dentro = Math.abs(b.z) <= Q.SERV + Q.R && Math.abs(b.x) <= Q.WS + Q.R && b.x * -Math.sign(m.sacX) >= -Q.R; // na caixa da diagonal
      if (!dentro) { if (b.saque) return falta(m, agora); return ponto(m, outro(b.ultimo), "fora", agora); }
      b.quiques = 1; b.ladoQuique = lado;
      if (b.saque) m.ev.push({ tipo: "saqueBom" });
    } else return ponto(m, b.ultimo, b.saque ? "ace" : "dois quiques", agora);
  }

  // ---------- robôs ----------
  // Lugar de espera: simples, no meio da linha de fundo; duplas, um na rede e um no fundo (do lado de cada um).
  // Bola vindo: acha (simulando) onde ela vai estar numa altura boa depois do quique (ou no voleio, se estiver na
  // rede) e corre para lá, ficando de lado para a bola. Arma o golpe pouco antes, com o tempo de reação da
  // dificuldade, escolhendo o tipo (curtinha se o adversário está no fundo, balão se está na rede...).
  function robos(m, dt, agora, rnd) {
    const b = m.bola, d = DIF[m.cfg.dif];
    for (const j of m.jogadores) {
      if (!j.bot) continue;
      const s = sinal(j.team);
      if (m.fase === "saque" && j.id === m.sacador && agora >= m.ate + 500) { sacar(m, j, agora); continue; }
      if (m.fase === "lancado" && j.id === m.sacador) { if (b.vy < 0.6 && b.vy > -1.5) { j.mira = { x: rnd() * 2 - 1, z: rnd() * 2 - 1 }; sacar(m, j, agora); } continue; }
      let alvo = null;
      const vindo = m.fase === "jogo" && b.viva && b.ultimo !== j.team;
      const parceiro = m.jogadores.find((o) => o !== j && o.team === j.team);
      if (vindo && agora >= j.pensa) {
        j.pensa = agora + d.reac * 1000 * (0.5 + rnd() * 0.5);
        // simula a bola e procura o melhor ponto do meu lado (o parceiro mais perto da bola vai nela)
        const c = { ...b }; let best = null;
        for (let t = 0; t < 3; t += 1 / 60) {
          passoBola(c, 1 / 60);
          if (ladoDe(c.z) !== j.team) continue;
          const pode = (c.quiques >= 1 || (!b.saque && c.y > 0.6)) && c.y > 0.25 && c.y < ALTURA_MAX;
          if (c.y <= Q.R + 0.01 && c.vy > 0) c.quiques = (c.quiques || 0) + 1; // contou o quique
          if (pode) { best = { x: c.x, z: c.z, t }; if (c.quiques >= 1 && c.vy < 0) break; }
        }
        if (best) {
          const meuD = Math.hypot(best.x - j.x, best.z - j.z), dele = parceiro ? Math.hypot(best.x - parceiro.x, best.z - parceiro.z) : 99;
          if (!parceiro || meuD <= dele) j.alvo = { x: best.x + (best.x > j.x ? -0.55 : 0.55), z: best.z + s * 0.35, t: agora + best.t * 1000 };
          else j.alvo = null;
        }
      }
      if (vindo && j.alvo) {
        alvo = j.alvo;
        const falta = (j.alvo.t - agora) / 1000;
        const perto = Math.hypot(j.alvo.x - j.x, j.alvo.z - j.z);
        const bolaPerto = ladoDe(b.z) === j.team && Math.hypot(b.x - j.x, b.z - j.z) < 3.2;
        if (!j.armado && (falta < 0.3 || bolaPerto || (falta < 0.7 && perto < 0.9))) { // arma o golpe quando já está chegando
          const rival = m.jogadores.filter((o) => o.team !== j.team).sort((p, q) => Math.abs(p.z) - Math.abs(q.z))[0];
          const r = rnd(); let tipo = r < 0.5 ? "top" : r < 0.78 ? "slice" : "lob";
          if (rival && Math.abs(rival.z) < 5 && rnd() < 0.5) tipo = "lob";
          else if (rival && Math.abs(rival.z) > Q.L - 1 && rnd() < 0.18) tipo = "curta";
          j.armado = { tipo, t0: agora - (1 - d.arma) * 800 * rnd() - d.arma * 700 };
          j.mira = { x: (rnd() * 2 - 1) * 0.9, z: rnd() * 2 - 1 };
        }
      } else if (!vindo || !j.alvo) {
        j.alvo = null;
        const duplas = !!parceiro, naRede = duplas && j.slot === 1;
        const bx = m.fase === "jogo" ? b.x * 0.4 : j.x;
        alvo = m.fase === "jogo" ? { x: clamp(bx + (duplas ? (j.slot ? 1.5 : -1.5) : 0), -Q.WD, Q.WD), z: s * (naRede ? 3.6 : Q.L + 0.7) } : null;
      }
      if (m.fase === "ponto" || m.fase === "saque" || m.fase === "lancado") { j.vx *= 0.8; j.vz *= 0.8; continue; }
      let dir = { x: 0, z: 0 };
      if (alvo) { const dx = alvo.x - j.x, dz = alvo.z - j.z, dd = Math.hypot(dx, dz); if (dd > 0.15) dir = { x: dx / dd * Math.min(1, dd / 0.8), z: dz / dd * Math.min(1, dd / 0.8) }; }
      mover(j, dir, dt);
    }
  }

  // ---------- pacote compacto (online) ----------
  const q2 = (v) => Math.round(v * 100) / 100;
  function pacote(m) {
    const b = m.bola;
    return { j: m.jogadores.map((j) => [j.id, q2(j.x), q2(j.z), q2(j.vx), q2(j.vz), j.armado ? 1 : 0]), b: [q2(b.x), q2(b.y), q2(b.z), q2(b.vx), q2(b.vy), q2(b.vz), q2(b.g)] };
  }
  function estado(m) {
    return { placar: m.placar, games: m.games, tie: m.tie, texto: textoPlacar(m), sacador: m.sacador, sacaTime: m.sacaTime, fase: m.fase, ate: m.ate, faltas: m.faltas, fim: m.fim, vencedor: m.vencedor, cfg: m.cfg };
  }

  const api = { alvoGolpe, Q, G, GOLPES, DIF, VEL, ALCANCE, CARGA_T, sinal, outro, ladoDe, novaPartida, mover, limitar, passoBola, prever, alturaRede, armar, sacar, passo, alcanca, textoPlacar, pacote, estado, posicionar };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Tenis = api;
})(typeof window !== "undefined" ? window : globalThis);
