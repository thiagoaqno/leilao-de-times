// Futevôlei da Galera — a quadra de areia, a bola, os toques, o placar e os robôs. Usado pelo servidor (quem manda na
// bola e no placar, online) e pelo navegador (o treino contra robôs roda as mesmas regras). Metros e segundos.
//
// A quadra fica ao longo do eixo z: a rede em z = 0, o time A do lado +z e o time B do lado −z. O x é a largura.
// Regras do futevôlei de verdade: a bola não pode cair na areia, cada time tem até 3 toques (em duplas, ninguém toca
// duas vezes seguidas), não vale a mão e o saque é de chute, de trás da linha de fundo. Ponto corrido: quem faz o ponto
// saca o próximo.
//
// Controles bem simples: só PASSAR (para o parceiro; sozinho, levanta para si) e ATACAR (manda para o outro lado). O
// toque é "armado": você aperta antes da bola chegar e o jogador toca sozinho quando ela entra no alcance. O golpe que
// sai depende de onde a bola está: alta é cabeceio, na altura do peito é peito, baixa é pé (de frente ou de lado), atrás
// do corpo é letra ou pé para trás. Atacando, a bola na altura do quadril e de lado vira voleio, a bola por cima e atrás
// vira bicicleta, e lá no alto perto da rede vira Shark Attack: o voleio (de lado) ou a bicicleta (bola atrás do corpo) no
// pulo, com o pé por cima da rede (nunca de cabeça). O pulo é sozinho.
(function (root) {
  // quadra oficial: 18 x 9 m, rede a 2,20 m (masculino). A bola é a de futevôlei (tamanho 5).
  const Q = { MX: 4.5, MZ: 9, REDE: 2.2, ANTENA: 4.6, R: 0.11, FX: 8.5, FZ: 13.5 }; // FX/FZ: até onde dá para correr
  const G = 9.81, ARRASTO = 0.013; // resistência do ar (quadrática): a bola de futebol freia de verdade no ar
  // jogador: na areia corre menos que na quadra
  const VEL = 5.8, ACEL = 24, ALCANCE = 1.3, ALTURA_MAX = 3.0, ALTURA_PULO = 2.15, ARMADO_MAX = 1.6, INTERVALO = 0.28;
  // os golpes: tempo de voo (do mais fraco ao mais forte), profundidade do alvo (metros depois da rede), quanto a bola
  // "mergulha" (efeito para baixo, em m/s²) e o erro. ataque: só sai atacando.
  const GOLPES = {
    frente: { nome: "Pé de frente", T: [1.05, 0.8], prof: [5, 8.4], efeito: 2, erro: 0.75 },
    lado: { nome: "Pé de lado", T: [1.2, 0.95], prof: [4.5, 8], efeito: 1, erro: 0.6 },
    peito: { nome: "Peito", T: [1.25, 1.0], prof: [4, 7.5], efeito: 0, erro: 0.65 },
    cabeca: { nome: "Cabeceio", T: [1.1, 0.85], prof: [3, 7.5], efeito: 1.5, erro: 0.6 },
    letra: { nome: "Letra", T: [1.4, 1.15], prof: [4, 7.8], efeito: 0, erro: 0.9 },
    calcanhar: { nome: "Pé para trás", T: [1.45, 1.2], prof: [3.5, 7], efeito: 0, erro: 0.95 },
    voleio: { nome: "Voleio", T: [0.8, 0.62], prof: [5, 8.4], efeito: 3, erro: 0.85, ataque: true },
    bicicleta: { nome: "Bicicleta", T: [0.85, 0.65], prof: [4, 8.2], efeito: 4, erro: 0.9, ataque: true },
    shark: { nome: "Shark Attack", T: [0.8, 0.64], prof: [3, 7], efeito: 4, erro: 0.75, ataque: true },
    saque: { nome: "Saque", T: [1.6, 1.3], prof: [4.5, 8.3], efeito: 1, erro: 0.6 },
  };
  // robôs
  const DIF = {
    // vel: velocidade de corrida · reac: demora para reagir ao toque do outro · erro: espalha o ataque
    // ataca2: chance de atacar já no 2º toque (de surpresa) · cabeca: chance de mirar no buraco em vez de chutar
    // espirra: chance de errar o domínio (a bola sai torta) num ataque forte
    facil: { nome: "Fácil", vel: 0.7, reac: 0.55, erro: 1.6, ataca2: 0, cabeca: 0.25, espirra: 0.3 },
    medio: { nome: "Médio", vel: 0.84, reac: 0.4, erro: 1.15, ataca2: 0.08, cabeca: 0.6, espirra: 0.17 },
    dificil: { nome: "Difícil", vel: 0.92, reac: 0.3, erro: 0.85, ataca2: 0.18, cabeca: 0.9, espirra: 0.12 },
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ladoDe = (z) => (z >= 0 ? "A" : "B");
  const sinal = (team) => (team === "A" ? 1 : -1);
  const outro = (t) => (t === "A" ? "B" : "A");
  let DIF_ATUAL = DIF.medio;

  // ======================================================================
  // A bola: gravidade, arrasto do ar e o efeito (mergulho). Não quica: na areia, acabou o ponto.
  // ======================================================================
  function acelerar(v, efeito) {
    const s = Math.hypot(v.vx, v.vy, v.vz), k = ARRASTO * s;
    return { ax: -k * v.vx, ay: -G - efeito - k * v.vy, az: -k * v.vz };
  }
  // um passo (semi-implícito). Devolve o que aconteceu: "rede", "antena" (passou por fora), "cruzou", "areia" ou null
  function passoBola(b, dt) {
    const z0 = b.z, a = acelerar(b, b.efeito || 0);
    b.vx += a.ax * dt; b.vy += a.ay * dt; b.vz += a.az * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    b.efeito = (b.efeito || 0) * Math.max(0, 1 - 0.8 * dt); // o efeito vai acabando
    let ev = null;
    if (z0 !== 0 && Math.sign(z0) !== Math.sign(b.z)) {
      if (Math.abs(b.x) > Q.ANTENA) ev = "antena";
      else if (b.y < Q.REDE + Q.R) { // bateu na rede: ela segura a bola, que cai do mesmo lado (continua valendo)
        b.z = Math.sign(z0) * (Q.R + 0.03); b.vz = -b.vz * 0.18; b.vx *= 0.5; b.vy = Math.min(b.vy, 0) * 0.4; b.efeito = 0; ev = "rede";
      } else ev = "cruzou";
    }
    if (b.y <= Q.R) { b.y = Q.R; ev = "areia"; }
    return ev;
  }
  // voo livre (sem rede nem areia), para mirar: onde a bola está depois de T segundos
  function voar(p, v, efeito, T, passo = 1 / 120) {
    const b = { x: p.x, y: p.y, z: p.z, vx: v.vx, vy: v.vy, vz: v.vz };
    let ef = efeito, t = 0, minRede = Infinity;
    while (t < T - 1e-9) {
      const h = Math.min(passo, T - t), z0 = b.z, a = acelerar(b, ef);
      b.vx += a.ax * h; b.vy += a.ay * h; b.vz += a.az * h;
      b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
      ef *= Math.max(0, 1 - 0.8 * h); t += h;
      if (z0 !== 0 && Math.sign(z0) !== Math.sign(b.z)) minRede = Math.min(minRede, b.y);
    }
    return { x: b.x, y: b.y, z: b.z, minRede };
  }
  // a velocidade para a bola sair de p e chegar em alvo (x, y, z) em T segundos, com o arrasto (acerta por tentativas:
  // começa pela conta sem ar e corrige o que faltou). passaRede: se o alvo é do outro lado, sobe a bola até passar.
  // Devolve também o efeito usado (para passar da rede, ele pode ter diminuído).
  function lancar(p, alvo, T, efeito, passaRede) {
    for (let tent = 0; tent < 12; tent++) {
      const v = { vx: (alvo.x - p.x) / T, vy: (alvo.y - p.y + 0.5 * (G + efeito) * T * T) / T, vz: (alvo.z - p.z) / T };
      let f = null;
      for (let k = 0; k < 6; k++) {
        f = voar(p, v, efeito, T);
        v.vx += (alvo.x - f.x) / T; v.vy += (alvo.y - f.y) / T; v.vz += (alvo.z - f.z) / T;
      }
      f = voar(p, v, efeito, T);
      if (!passaRede || f.minRede > Q.REDE + Q.R + 0.25) return { ...v, efeito };
      T *= 1.1; efeito *= 0.7; // não passou: bola mais alta (mais tempo no ar e menos mergulho)
    }
    return { vx: (alvo.x - p.x) / T, vy: (alvo.y - p.y + 0.5 * G * T * T) / T + 2, vz: (alvo.z - p.z) / T, efeito: 0 };
  }
  // onde a bola vai cair na areia (e em quanto tempo), sem contar com ninguém tocando
  function queda(b, max = 4) {
    const c = { ...b };
    for (let t = 0; t < max; t += 1 / 60) { const ev = passoBola(c, 1 / 60); if (ev === "areia") return { x: c.x, z: c.z, t }; }
    return null;
  }

  // ======================================================================
  // Partida
  // ======================================================================
  // jogadores: [{ id, team, slot (0 ou 1), bot, nome, skin }]; cfg: { duplas, pontos, dif }
  function novaPartida(jogadores, cfg, agora) {
    const m = { cfg: { duplas: !!cfg.duplas, pontos: [10, 15, 18].includes(cfg.pontos) ? cfg.pontos : 15, dif: DIF[cfg.dif] ? cfg.dif : "medio" },
      jogadores: jogadores.map((j) => ({ ...j, x: 0, z: sinal(j.team) * 5, vx: 0, vz: 0, mira: { x: 0, z: 0 }, armado: null, alvo: null, pensa: 0 })),
      bola: novaBola(), placar: { A: 0, B: 0 }, sacaTime: "A", ordemSaque: { A: 0, B: 0 }, sacador: null,
      fase: "saque", ate: agora + 1500, fim: false, vencedor: null, ev: [], rally: 0, t: agora };
    m.sacador = escolherSacador(m);
    posicionar(m);
    return m;
  }
  const novaBola = () => ({ x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, efeito: 0, viva: false, ultimo: null, por: null, time: null, toques: 0, tToque: -1e9, golpe: null });
  function escolherSacador(m) {
    const lista = m.jogadores.filter((j) => j.team === m.sacaTime).sort((a, b) => a.slot - b.slot);
    return lista[m.ordemSaque[m.sacaTime] % lista.length].id;
  }
  // todo mundo no lugar: quem saca atrás da linha de fundo; o parceiro dele mais perto da rede; quem recebe, no fundo
  function posicionar(m) {
    const sac = m.jogadores.find((j) => j.id === m.sacador), s = sinal(sac.team);
    for (const j of m.jogadores) {
      const sj = sinal(j.team), dupla = m.jogadores.filter((o) => o.team === j.team).length > 1;
      let x, z;
      if (j === sac) { x = sac.slot ? -1.5 : 1.5; z = s * (Q.MZ + 0.7); }
      else if (j.team === sac.team) { x = sac.slot ? 2 : -2; z = s * 4.5; }
      else { x = dupla ? (j.slot ? 2.1 : -2.1) : 0; z = sj * 6.2; }
      Object.assign(j, { x, z, vx: 0, vz: 0, armado: null, alvo: null });
    }
    Object.assign(m.bola, novaBola());
    bolaNoPe(m);
  }
  // no saque, a bola fica num montinho de areia na frente do pé de quem saca
  function bolaNoPe(m) {
    const sac = m.jogadores.find((j) => j.id === m.sacador);
    Object.assign(m.bola, { x: sac.x + 0.18, y: Q.R + 0.08, z: sac.z - sinal(sac.team) * 0.4, vx: 0, vy: 0, vz: 0, viva: false });
  }

  // ---------- jogador: anda (o navegador mexe o próprio; o servidor e o treino mexem os robôs) ----------
  function mover(j, dir, dt, m = null) {
    const vmax = VEL * (j.bot ? DIF_ATUAL.vel : 1);
    const l = Math.hypot(dir.x, dir.z), tx = (l > 1 ? dir.x / l : dir.x) * vmax, tz = (l > 1 ? dir.z / l : dir.z) * vmax;
    const dx = tx - j.vx, dz = tz - j.vz, d = Math.hypot(dx, dz), a = ACEL * dt;
    if (d <= a) { j.vx = tx; j.vz = tz; } else { j.vx += (dx / d) * a; j.vz += (dz / d) * a; }
    j.x += j.vx * dt; j.z += j.vz * dt;
    limitar(j, m);
  }
  function limitar(j, m) {
    const s = sinal(j.team);
    j.x = clamp(j.x, -Q.FX, Q.FX);
    const naLinha = m && m.fase === "saque" && j.id === m.sacador; // quem saca fica atrás da linha de fundo
    const zmin = naLinha ? Q.MZ + 0.3 : 0.35, zmax = naLinha ? Q.MZ + 1.6 : Q.FZ;
    j.z = s * clamp(s * j.z, zmin, zmax);
  }

  // ======================================================================
  // Toques
  // ======================================================================
  // qual golpe sai, pela posição da bola em relação ao jogador (ele está sempre de frente para a rede).
  // frente: quanto a bola está na frente do corpo (para o lado da rede); lado: quanto está de lado; h: altura.
  function golpeDe(j, b, intencao) {
    const s = sinal(j.team), frente = (j.z - b.z) * s, lado = b.x - j.x, h = b.y, ataque = intencao === "ataque";
    if (ataque && h >= 2.45 && Math.abs(j.z) < 2.6) return "shark";
    if (ataque && frente < -0.12 && h >= 1.25 && h < 2.7) return "bicicleta";
    if (h >= 1.6) return "cabeca";
    if (h >= 1.1) return "peito";
    if (frente < -0.25) return Math.abs(lado) >= 0.4 ? "letra" : "calcanhar";
    if (ataque && h >= 0.6 && Math.abs(lado) >= 0.35) return "voleio";
    if (Math.abs(lado) >= 0.45) return "lado";
    return "frente";
  }
  // pode tocar? (a bola do meu lado, no alcance, numa altura que dá com pulo, e a regra dos toques)
  function alcanca(m, j, folga = 0) {
    const b = m.bola;
    if (!b.viva || m.fase !== "jogo") return false;
    if (ladoDe(b.z) !== j.team) return false;
    if (m.t - b.tToque < INTERVALO * 1000) return false; // acabou de ser tocada
    const meusToques = b.time === j.team ? b.toques : 0;
    if (meusToques >= 3) return false;
    const duplas = m.jogadores.filter((o) => o.team === j.team).length > 1;
    if (duplas && b.time === j.team && b.por === j.id) return false; // em duplas, ninguém toca duas vezes seguidas
    if (b.y < 0.12 || b.y > ALTURA_MAX + folga * 0.5) return false;
    if (b.vy > 1 && b.y > 1.2) return false; // ainda subindo: espera ela descer (ninguém toca a bola subindo lá no alto)
    return Math.hypot(b.x - j.x, b.z - j.z) <= ALCANCE + folga;
  }
  const gauss = (rnd) => (rnd() + rnd() + rnd() - 1.5) / 0.5;
  // o buraco do outro lado: o x mais longe dos rivais
  function buraco(m, j) {
    const rivais = m.jogadores.filter((o) => o.team !== j.team); let melhor = 0, dist = -1;
    for (let k = -4; k <= 4; k++) { const x = (k / 4) * Q.MX * 0.8, d = rivais.length ? Math.min(...rivais.map((o) => Math.abs(o.x - x))) : Math.abs(x); if (d > dist) { dist = d; melhor = x; } }
    return melhor;
  }
  // para onde vai o ataque (sem o erro). mira: { x: −1..1 (lado, no mundo), z: −1..1 (curta / funda) }; sem mira de
  // lado, vai no buraco. O navegador usa para desenhar a mira.
  function alvoAtaque(m, j, golpe, mira) {
    const s = sinal(j.team), Gp = GOLPES[golpe] || GOLPES.frente;
    const prof = lerp(Gp.prof[0], Gp.prof[1], clamp(0.5 + (mira ? mira.z : 0) * 0.5, 0, 1));
    const x = mira && Math.abs(mira.x) > 0.15 ? mira.x * Q.MX * 0.85 : buraco(m, j);
    return { x, z: -s * prof };
  }
  // o passe: para o parceiro, na altura da cabeça; sozinho, levanta para si mesmo. O 2º toque é a levantada: a bola vai
  // alta e perto da rede, onde quem ataca pode subir para o cabeceio ou o Shark Attack.
  function alvoPasse(m, j, levantada) {
    const s = sinal(j.team), parceiro = m.jogadores.find((o) => o !== j && o.team === j.team);
    if (levantada) { const x = parceiro ? parceiro.x : j.x; return { x: clamp(x * 0.6, -3, 3), y: 2.45, z: s * 1.9 }; }
    if (parceiro) return { x: clamp(parceiro.x * 0.9, -Q.MX, Q.MX), y: 1.75, z: s * clamp(Math.abs(parceiro.z) - 0.8, 2.2, 6.5) };
    return { x: clamp(j.x * 0.7, -3.5, 3.5), y: 2.3, z: s * 1.8 };
  }
  // a bola alta ainda vai descer mais dentro do alcance: espera um pouco (o toque sai numa altura boa). Atacando perto
  // da rede, bate lá no alto mesmo (é o Shark Attack).
  function esperaDescer(m, j, intencao) {
    const b = m.bola; if (b.y <= 1.9 || b.vy > 0) return false;
    if (intencao === "ataque" && Math.abs(j.z) < 2.6) return false;
    const t = 0.08, fx = b.x + b.vx * t, fz = b.z + b.vz * t, fy = b.y + b.vy * t;
    return fy > 1.0 && Math.hypot(fx - j.x, fz - j.z) <= ALCANCE;
  }
  function tocar(m, j, intencao, mira, rnd = Math.random) {
    const b = m.bola, s = sinal(j.team);
    if (b.time !== j.team) { b.time = j.team; b.toques = 0; }
    b.toques++;
    if (intencao === "passe" && b.toques >= 3) intencao = "seguranca"; // 3º toque: o passe vira bola de segurança por cima
    const golpe = golpeDe(j, b, intencao === "ataque" ? "ataque" : "passe");
    const Gp = GOLPES[golpe], d = Math.hypot(b.x - j.x, b.z - j.z), qualidade = clamp(d / ALCANCE, 0, 1.3); // longe do corpo: pior
    const p = { x: b.x, y: b.y, z: b.z }, robo = j.bot ? DIF_ATUAL.erro : 1;
    // a bola que chega forte (um ataque) é mais difícil de dominar: o primeiro toque sai pior
    const veloc = Math.hypot(b.vx, b.vy, b.vz), pancada = b.toques === 1 && b.time === j.team ? Math.max(0, veloc - 9) : 0;
    const espirrou = pancada > 0 && rnd() < (j.bot ? DIF_ATUAL.espirra : 0.08) * Math.min(1.6, pancada / 5);
    let v, efeito = 0;
    if (intencao === "passe") {
      const levantada = b.toques === 2 || !m.jogadores.some((o) => o !== j && o.team === j.team);
      const a = alvoPasse(m, j, levantada), sig = ((levantada ? 0.35 : 0.15) + 0.35 * qualidade + 0.09 * pancada) * robo + (espirrou ? 3 : 0), dist = Math.hypot(a.x - p.x, a.z - p.z);
      a.x += gauss(rnd) * sig; a.z += gauss(rnd) * sig * 0.7;
      a.z = s * clamp(s * a.z, 0.8, Q.MZ); // o passe não vai para o outro lado
      v = lancar(p, a, clamp(1.05 + dist * 0.045, 1.05, 1.5), 0, false);
    } else {
      const forca = intencao === "seguranca" ? 0 : clamp(0.55 + 0.45 * (1 - qualidade) + (j.bot ? (rnd() - 0.5) * 0.3 : 0), 0, 1);
      const a = intencao === "seguranca" ? { x: buraco(m, j) * 0.5, z: -s * 6.5 } : alvoAtaque(m, j, golpe, mira);
      const sig = (0.2 + Gp.erro * (0.3 + 0.5 * qualidade + 0.3 * forca)) * robo;
      a.x += gauss(rnd) * sig; a.z += gauss(rnd) * sig * 0.8;
      efeito = intencao === "seguranca" ? 0 : Gp.efeito;
      const T = intencao === "seguranca" ? 1.7 : lerp(Gp.T[0], Gp.T[1], forca);
      v = lancar(p, { x: a.x, y: Q.R, z: a.z }, T, efeito, true); efeito = v.efeito;
    }
    Object.assign(b, { vx: v.vx, vy: v.vy, vz: v.vz, efeito, ultimo: j.team, por: j.id, tToque: m.t, golpe, viva: true });
    const pulo = b.y > ALTURA_PULO || golpe === "shark" || golpe === "bicicleta";
    // o Shark Attack é sempre de pé: de voleio (bola de lado ou na frente) ou de bicicleta (bola atrás do corpo)
    const estilo = golpe === "shark" ? ((j.z - b.z) * s < -0.12 ? "bicicleta" : "voleio") : undefined;
    j.armado = null; m.rally++;
    m.ev.push({ tipo: "toque", id: j.id, golpe, estilo, intencao, pulo, espirrou, h: Math.round(b.y * 100) / 100, lado: Math.sign(b.x - j.x) * sinal(j.team) || 1, toques: b.toques, time: j.team });
  }
  // saque: chute de trás da linha de fundo, por cima da rede, para o fundo do outro lado
  function sacar(m, j, mira, rnd = Math.random) {
    if (m.fase !== "saque" || j.id !== m.sacador || m.t < m.ate) return;
    const b = m.bola, Gp = GOLPES.saque;
    const alvo = alvoAtaque(m, j, "saque", mira), sig = 0.35 * (j.bot ? DIF_ATUAL.erro : 1);
    alvo.x += gauss(rnd) * sig; alvo.z += gauss(rnd) * sig * 0.8;
    const v = lancar({ x: b.x, y: b.y, z: b.z }, { x: alvo.x, y: Q.R, z: alvo.z }, lerp(Gp.T[0], Gp.T[1], 0.5 + rnd() * 0.3), Gp.efeito, true);
    Object.assign(b, { vx: v.vx, vy: v.vy, vz: v.vz, efeito: v.efeito, viva: true, ultimo: j.team, por: j.id, time: j.team, toques: 3, tToque: m.t, golpe: "saque" });
    m.fase = "jogo"; m.rally = 0; j.armado = null;
    m.ev.push({ tipo: "toque", id: j.id, golpe: "saque", intencao: "ataque", pulo: false, h: b.y, lado: 1, toques: 0, time: j.team });
  }
  // apertou um botão: arma o toque (ou saca, se é a vez dele)
  function armar(m, j, intencao, agora, mira, rnd) {
    if (intencao !== "passe" && intencao !== "ataque") return;
    if (m.fase === "saque" && j.id === m.sacador) { // cedo demais: guarda e saca assim que puder
      if (m.t >= m.ate) return sacar(m, j, mira || j.mira, rnd);
      j.armado = { intencao, t0: agora, ate: m.ate + 1500 }; return;
    }
    if (m.fase !== "jogo") return;
    j.armado = { intencao, t0: agora };
  }
  const prazoArmado = (j) => j.armado.ate ?? j.armado.t0 + ARMADO_MAX * 1000;

  // ======================================================================
  // Pontos
  // ======================================================================
  function ponto(m, time, motivo, agora) {
    m.placar[time]++;
    m.ev.push({ tipo: "ponto", time, motivo, rally: m.rally, placar: { ...m.placar } });
    const a = m.placar[time], b = m.placar[outro(time)];
    if (a >= m.cfg.pontos && a - b >= 2) { m.fim = true; m.vencedor = time; m.fase = "fim"; m.ev.push({ tipo: "fim", time }); return; }
    // ponto corrido: quem fez saca. Quando o saque volta para o time, troca quem saca.
    if (m.sacaTime !== time) { m.sacaTime = time; m.ordemSaque[time]++; }
    m.bola.viva = false;
    m.fase = "ponto"; m.ate = agora + 1900;
  }
  // a bola caiu na areia: dentro, perde o time do lado em que caiu; fora, perde quem tocou por último
  function caiu(m, agora) {
    const b = m.bola, dentro = Math.abs(b.x) <= Q.MX + Q.R && Math.abs(b.z) <= Q.MZ + Q.R, lado = ladoDe(b.z);
    m.ev.push({ tipo: "areia", x: b.x, z: b.z, dentro });
    if (!dentro) return ponto(m, outro(b.ultimo), "fora", agora);
    if (lado === b.ultimo) return ponto(m, outro(lado), b.time === lado && b.toques >= 3 ? "não passou" : "caiu do seu lado", agora);
    return ponto(m, outro(lado), b.golpe === "shark" ? "shark" : b.golpe === "bicicleta" ? "bicicleta" : b.time === lado ? "não segurou" : "na areia", agora);
  }

  // ======================================================================
  // Um passo do jogo (bola, regras e robôs). Os humanos: o navegador de cada um mexe o próprio jogador.
  // ======================================================================
  function passo(m, dt, agora, rnd = Math.random) {
    m.t = agora; DIF_ATUAL = DIF[m.cfg.dif];
    if (m.fim) return;
    for (const j of m.jogadores) if (j.armado && agora > prazoArmado(j)) j.armado = null; // não alcançou: desarma
    robos(m, dt, agora, rnd);
    if (m.fase === "ponto") {
      if (m.bola.y > Q.R) passoBola(m.bola, dt); // a bola termina de cair
      if (agora >= m.ate) { m.sacador = escolherSacador(m); posicionar(m); m.fase = "saque"; m.ate = agora + 700; }
      return;
    }
    if (m.fase === "saque") { bolaNoPe(m); const sac = m.jogadores.find((j) => j.id === m.sacador); if (sac && sac.armado && agora >= m.ate) sacar(m, sac, sac.mira, rnd); return; }
    if (m.fase !== "jogo") return;
    const b = m.bola, n = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let k = 0; k < n && m.fase === "jogo"; k++) {
      const ev = passoBola(b, dt / n);
      if (ev === "areia") { caiu(m, agora); break; }
      if (ev === "antena") { m.ev.push({ tipo: "antena" }); ponto(m, outro(b.ultimo), "antena", agora); break; }
      if (ev === "rede") m.ev.push({ tipo: "rede" });
      if (ev === "cruzou") { b.time = null; b.toques = 0; }
      // toques armados: quem estiver no alcance toca
      for (const j of m.jogadores) {
        if (!j.armado || !alcanca(m, j, j.bot ? 0 : 0.4) || esperaDescer(m, j, j.armado.intencao)) continue;
        tocar(m, j, j.armado.intencao, j.mira, rnd);
        break;
      }
    }
  }

  // ======================================================================
  // Robôs
  // ======================================================================
  // O ponto bom para tocar: simulando a bola, o primeiro lugar do meu lado numa altura boa (de preferência entre a
  // canela e a cabeça) aonde dá para chegar a tempo. Também serve para o "ímã" que ajuda quem joga de verdade.
  function pontoDeToque(b, j, vmax, max = 3) {
    const c = { ...b }; let bom = null, qualquer = null, menosAtrasado = null, atraso = Infinity;
    for (let t = 1 / 60; t < max; t += 1 / 60) {
      const ev = passoBola(c, 1 / 60);
      if (ev === "areia" || ev === "antena") break;
      if (ladoDe(c.z) !== j.team || c.y > ALTURA_MAX - 0.2) continue;
      const chega = Math.max(0, Math.hypot(c.x - j.x, c.z - j.z) - ALCANCE * 0.6) / vmax;
      const p = { x: c.x, z: c.z, y: c.y, t };
      if (chega <= t) {
        if (c.y >= 0.5 && c.y <= 2.0 && c.vy < 0) { bom = p; break; }
        if (!qualquer) qualquer = p;
      } else if (chega - t < atraso) { atraso = chega - t; menosAtrasado = p; }
    }
    return bom || qualquer || menosAtrasado;
  }
  // a bola vem para o meu time tocar? (do outro lado vindo para cá, ou do nosso lado com toques sobrando)
  function vemPraMim(m, j) {
    const b = m.bola; if (m.fase !== "jogo" || !b.viva) return false;
    if (b.time === j.team) return b.toques < 3;
    const q = queda(b); return !!q && ladoDe(q.z) === j.team || ladoDe(b.z) === j.team;
  }
  function robos(m, dt, agora, rnd) {
    const b = m.bola, d = DIF[m.cfg.dif];
    for (const j of m.jogadores) {
      if (!j.bot) continue;
      const s = sinal(j.team), parceiro = m.jogadores.find((o) => o !== j && o.team === j.team);
      if (m.fase === "saque") {
        if (j.id === m.sacador && agora >= m.ate + 900) { j.mira = { x: rnd() * 2 - 1, z: rnd() * 2 - 1 }; sacar(m, j, j.mira, rnd); }
        j.vx *= 0.8; j.vz *= 0.8; continue;
      }
      if (m.fase !== "jogo") { j.vx *= 0.8; j.vz *= 0.8; continue; }
      let alvo = null;
      const vem = vemPraMim(m, j);
      // reação: depois de cada toque, demora um pouco para sair correndo
      const marca = b.por + ":" + b.tToque;
      if (vem && j.viuToque !== marca) { j.viuToque = marca; j.pensa = agora + (b.time === j.team ? 0.1 : d.reac) * 1000; j.alvo = null; }
      if (vem && agora >= j.pensa) {
        j.pensa = agora + 120;
        const vmax = VEL * d.vel, p = pontoDeToque(b, j, vmax);
        // vai quem chega melhor (e não quem acabou de tocar, em duplas); o parceiro humano também conta
        let euVou = !!p;
        if (p && parceiro) {
          const proibido = (o) => b.time === j.team && b.por === o.id;
          if (proibido(j)) euVou = false;
          else if (!proibido(parceiro)) euVou = Math.hypot(p.x - j.x, p.z - j.z) <= Math.hypot(p.x - parceiro.x, p.z - parceiro.z) + 0.3;
        }
        j.alvo = euVou ? { x: p.x, z: p.z + s * 0.25, t: agora + p.t * 1000, y: p.y } : null;
      }
      if (vem && j.alvo) {
        alvo = j.alvo;
        // arma pouco antes da bola chegar no alcance
        const perto = Math.hypot(b.x - j.x, b.z - j.z) < 3.5 && ladoDe(b.z) === j.team, falta = (j.alvo.t - agora) / 1000;
        if (!j.armado && (perto || falta < 0.25)) {
          const toques = b.time === j.team ? b.toques : 0, sozinho = !parceiro;
          const atacaJa = toques >= 2 || (sozinho && toques >= 1) || (toques === 1 && rnd() < d.ataca2);
          j.armado = { intencao: atacaJa ? "ataque" : "passe", t0: agora, ate: agora + 1500 };
          j.mira = rnd() < d.cabeca ? { x: 0, z: rnd() * 2 - 1 } : { x: rnd() * 2 - 1, z: rnd() * 2 - 1 }; // x = 0: vai no buraco
        }
      } else {
        j.alvo = null;
        // sem bola: volta para o lugar (em duplas, cada um cobre um lado; quando é o nosso ataque, o outro chega perto da rede)
        const nossa = b.time === j.team && b.por !== j.id && b.viva;
        const bx = clamp(b.x * 0.35, -2, 2), lugarX = parceiro ? (j.slot ? 2 : -2) + bx : bx;
        alvo = { x: lugarX, z: s * (nossa ? 3 : parceiro ? 5.8 : 5.2) };
      }
      let dir = { x: 0, z: 0 };
      if (alvo) { const dx = alvo.x - j.x, dz = alvo.z - j.z, dd = Math.hypot(dx, dz); if (dd > 0.12) dir = { x: dx / dd * Math.min(1, dd / 0.7), z: dz / dd * Math.min(1, dd / 0.7) }; }
      mover(j, dir, dt, m);
    }
  }

  // ======================================================================
  // Pacote compacto (online) e o estado para a tela
  // ======================================================================
  const q2 = (v) => Math.round(v * 100) / 100;
  function pacote(m) {
    const b = m.bola;
    return { j: m.jogadores.map((j) => [j.id, q2(j.x), q2(j.z), q2(j.vx), q2(j.vz), j.armado ? (j.armado.intencao === "ataque" ? 2 : 1) : 0]),
      b: [q2(b.x), q2(b.y), q2(b.z), q2(b.vx), q2(b.vy), q2(b.vz), q2(b.efeito || 0)] };
  }
  function estado(m) {
    const b = m.bola;
    return { placar: m.placar, sacador: m.sacador, sacaTime: m.sacaTime, fase: m.fase, ate: m.ate, fim: m.fim, vencedor: m.vencedor, cfg: m.cfg,
      posse: b.viva && b.time ? { time: b.time, toques: b.toques } : null };
  }

  const api = { Q, G, GOLPES, DIF, VEL, ALCANCE, ALTURA_PULO, ARMADO_MAX, sinal, outro, ladoDe, novaPartida, mover, limitar, passoBola, lancar, voar, queda,
    golpeDe, alcanca, alvoAtaque, alvoPasse, tocar, sacar, armar, passo, pontoDeToque, pacote, estado, posicionar };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Futevolei = api;
})(typeof window !== "undefined" ? window : globalThis);
