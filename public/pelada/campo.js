// Pelada da Galera — arenas, uniformes, carros e física (bola, jogador a pé e carro). Usado pelo servidor (quem manda
// na bola) e pelo navegador (prever a bola, mexer o próprio jogador/carro e o modo treino).
// Dois modos: "pes" (futsal, quadra 40 x 24 m) e "carros" (estilo Rocket League: arena 80 x 54 m e bola gigante).
// Tudo em metros e segundos. O time A ataca para +x (defende o gol da esquerda); o B ataca para -x.
(function (root) {
  const MODES = {
    // quadra de 48 x 30 m e gols de 5,2 x 2,3 m; a bola é de futsal
    pes: { id: "pes", pe: true, L: 24, W: 15, goalW: 2.6, goalH: 2.3, goalD: 1.4, ballR: 0.15, wallH: 7, ceil: 14, g: 9.81, wallE: 0.6, postR: 0.05, areaR: 7, circle: 4,
      // bola de futsal: gravidade "de jogo" (sobe e cai rápido, nada de bola de lua), arrasto do ar, quique baixo e
      // atrito forte rolando (o passe morre se ninguém dominar). curva = fator do efeito Magnus (Q/E)
      gBola: 25, drag: 0.5, bounce: 0.45, roll: 1.2, curva: 0.03 },
    // carros: física da bola do Rocket League (parâmetros da Psyonix convertidos de uu para metros: 1 uu = 1 cm):
    // gravidade 650 uu/s², quique 0,6, atrito 0,35 com giro, arrasto linear 0,0305/s, até 6000 uu/s e 6 rad/s
    carros: { id: "carros", L: 40, W: 27, goalW: 7, goalH: 5.5, goalD: 4, ballR: 1.25, wallH: 18, ceil: 18, g: 6.5, bounce: 0.6, roll: 0, drag: 0.0305, wallE: 0.6, postR: 0.3, areaR: 14, circle: 9,
      rl: true, mu: 0.35, vmax: 60, wmax: 6, carE: 0.1, rc: 7 }, // rc: raio das quinas arredondadas (chão-parede, parede-parede e parede-teto)
  };
  const P_R = 0.35, P_H = 1.8;
  // o campo de uma partida: carros = Rocket; a pé, futsal
  const campoDe = (mode) => (mode === "carros" ? MODES.carros : MODES.pes);

  // ---------- arena arredondada (Rocket) ----------
  // Como no Rocket League, a arena não tem quina viva: o chão vira parede numa curva de raio rc (a bola sobe por ela),
  // a parede vira teto do mesmo jeito e os cantos (parede com parede) também são curvos. É um "caixote arredondado":
  // a distância até a superfície sai da conta do caixote com as quinas de raio rc (negativa = dentro da arena).
  // Devolve { d, nx, ny, nz } com a normal apontando para FORA.
  function arenaSDF(F, x, y, z) {
    const Rc = F.rc, hy = F.ceil / 2, sx = Math.sign(x) || 1, sy = Math.sign(y - hy) || 1, sz = Math.sign(z) || 1;
    const qx = Math.abs(x) - (F.L - Rc), qy = Math.abs(y - hy) - (hy - Rc), qz = Math.abs(z) - (F.W - Rc);
    const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0), out = Math.hypot(mx, my, mz);
    if (out > 0) return { d: out - Rc, nx: sx * mx / out, ny: sy * my / out, nz: sz * mz / out };
    if (qx >= qy && qx >= qz) return { d: qx - Rc, nx: sx, ny: 0, nz: 0 }; // no miolo: a parede reta mais perto
    if (qy >= qz) return { d: qy - Rc, nx: 0, ny: sy, nz: 0 };
    return { d: qz - Rc, nx: 0, ny: 0, nz: sz };
  }
  // a rampa do chão (para o carro andar nela): quanto o ponto (x, z) já entrou na curva (e), a altura do chão ali (h)
  // e a normal da superfície (para dentro/para cima). Na boca do gol o chão é reto (a curva da parede do fundo some).
  function rampa(F, x, z, baixo = true) {
    const Rc = F.rc; if (!Rc) return { e: 0, h: 0, nx: 0, ny: 1, nz: 0 };
    const corredor = baixo && Math.abs(z) < F.goalW - 1.2;
    const qx = corredor ? 0 : Math.max(0, Math.abs(x) - (F.L - Rc)), qz = Math.max(0, Math.abs(z) - (F.W - Rc)), e = Math.hypot(qx, qz);
    if (e <= 1e-6) return { e: 0, h: 0, nx: 0, ny: 1, nz: 0, dx: 0, dz: 0 };
    const ee = Math.min(e, Rc), h = Rc - Math.sqrt(Rc * Rc - ee * ee), dx = (Math.sign(x) || 1) * qx / e, dz = (Math.sign(z) || 1) * qz / e;
    return { e, h, nx: -dx * ee / Rc, ny: (Rc - h) / Rc, nz: -dz * ee / Rc, dx, dz };
  }

  // camisas (as mesmas do futebol de botão): cor da camisa, desenho e cor do número/calção
  const KITS = {
    corinthians: { name: "Corinthians", kind: "plain", c: ["#f4f4f4"], num: "#151515", shorts: "#151515" },
    saopaulo: { name: "São Paulo", kind: "band", c: ["#f4f4f4", "#c8102e", "#151515"], num: "#151515", shorts: "#f4f4f4" },
    santos: { name: "Santos", kind: "vstripes", c: ["#f4f4f4", "#151515"], num: "#c8102e", shorts: "#f4f4f4" },
    palmeiras: { name: "Palmeiras", kind: "plain", c: ["#0b6b34"], num: "#f4f4f4", shorts: "#f4f4f4" },
    rubronegro: { name: "Rubro-negro", kind: "hstripes", c: ["#c8102e", "#151515"], num: "#f4f4f4", shorts: "#f4f4f4" },
    celeste: { name: "Celeste", kind: "plain", c: ["#1e5bc6"], num: "#f4f4f4", shorts: "#f4f4f4" },
    canarinho: { name: "Canarinho", kind: "plain", c: ["#f5d000"], num: "#0b7a3b", shorts: "#1e5bc6" },
    laranja: { name: "Laranja", kind: "plain", c: ["#f07c1c"], num: "#151515", shorts: "#151515" },
  };
  const kitOf = (k) => KITS[k] || KITS.corinthians;
  // cor principal (placar, nome em cima, pintura do carro) e a segunda cor (faixa do carro)
  const kitColor = (k) => kitOf(k).c[kitOf(k).kind === "band" ? 1 : 0];
  const kitColor2 = (k) => { const K = kitOf(k); return K.c[1] || K.num; };

  // carros (pixelados, de caixinhas) inspirados em clássicos
  const CARS = {
    godzilla: { name: "Godzilla", inspo: "inspirado no Nissan GT-R R34" },
    noveonze: { name: "Nove-Onze", inspo: "inspirado no Porsche 911" },
    cavallino: { name: "Cavallino", inspo: "inspirada na Ferrari F40" },
    bimmer: { name: "Bimmer", inspo: "inspirado no BMW M3 E30" },
  };

  // skins zoeiras dos jogadores a pé (o visual de cada uma fica em bonecos.js, em SKINS_CONFIG)
  const SKINS = {
    padrao: { name: "Padrão", emoji: "🙂" },
    cr7: { name: "CR7", emoji: "🐐" },
    neymar: { name: "Neymar", emoji: "🤸" },
    lula: { name: "Lula", emoji: "🧔" },
    bob_esponja: { name: "Bob Esponja", emoji: "🧽" },
    levi: { name: "Levi", emoji: "⚔️" },
    aranha: { name: "Homem-Aranha", emoji: "🕷️" },
    naruto: { name: "Naruto", emoji: "🍥" },
    tartaruga: { name: "Tartaruga Ninja", emoji: "🐢" },
    ghostface: { name: "Ghostface", emoji: "👻" },
    gojo: { name: "Satoru Gojo", emoji: "🕶️" },
    woody: { name: "Woody", emoji: "🤠" },
    pikachu: { name: "Pikachu", emoji: "⚡" },
    ben10: { name: "Ben 10", emoji: "⌚" },
    shrek: { name: "Shrek", emoji: "🧅" },
    cj: { name: "CJ", emoji: "🚲" },
    steve: { name: "Steve", emoji: "⛏️" },
  };
  // quadras (só o visual muda: o tamanho e a física são os mesmos; detalhes em ARENAS_CONFIG no jogo.js)
  const ARENAS = {
    society: { name: "Society", emoji: "🌇", desc: "grama sintética no fim de tarde" },
    rio: { name: "Rio", emoji: "☀️", desc: "quadra de rua com cimento colorido" },
    ginasio: { name: "Ginásio", emoji: "🏟️", desc: "taco de madeira e refletores" },
  };

  // ---------- posições na saída ----------
  // pés: quem dá a saída fica no meio; goleiro (se tiver) no gol. Carros: em leque, como no Rocket League.
  function spawns(mode, team, list, kicking) {
    const F = MODES[mode], s = team === "A" ? -1 : 1, yaw = team === "A" ? -Math.PI / 2 : Math.PI / 2;
    if (mode === "carros") {
      const spots = [[F.L - 10, 0], [F.L - 16, -11], [F.L - 16, 11], [F.L - 4, -6], [F.L - 4, 6]];
      return list.map((p, i) => [s * spots[i % 5][0], 0, s * spots[i % 5][1], yaw]);
    }
    const field = [[kicking ? 1.2 : 5, 0], [9, -5], [9, 5], [14, -2.5], [14, 2.5]];
    let k = 0;
    return list.map((p) => {
      if (p.gk) return [s * (F.L - 1), 0, 0, yaw];
      const [d, z] = field[k++ % field.length];
      return [s * d, 0, s * z, yaw];
    });
  }
  // a área do goleiro (meio círculo de raio areaR em volta do centro do gol)
  function inArea(mode, team, x, z) {
    const F = MODES[mode], gx = team === "A" ? -F.L : F.L;
    return Math.hypot(x - gx, z) < F.areaR;
  }

  // ---------- jogador a pé ----------
  const RUN = 6.4, SPRINT = 8.4, CHARGING = 4.2, ACC = 34, AIR_ACC = 8, JUMP = 4.6;
  // p: {x,y,z,vx,vy,vz,onGround}; wish: {x, z} (direção no mundo, comprimento 0..1), speed, jump
  // "Corpo molinho" (opcional, a pé: wish.molinho): o tronco é uma mola presa no quadril. A aceleração do corpo empurra o tronco para o lado
  // contrário (inércia): x'' = -k·x - c·x' - a. Em aceleração constante ele fica parado num ponto (x = -a/k); o que
  // atrapalha é o BALANÇO, a distância até esse ponto de equilíbrio, que aparece quando a aceleração muda de repente
  // (virada brusca, freada, meia-volta). Enquanto o tronco balança, o pé tem menos aderência: acelera até 60% menos (só a
  // aceleração; a velocidade máxima não muda), e isso some em ~0,3 s quando o tronco assenta.
  const GINGA = { k: 40, c: 9, max: 1.1, acc: 0.6 };
  function balancoTronco(p) { return Math.min(1, Math.hypot((p.gx || 0) + (p.gax || 0) / GINGA.k, (p.gz || 0) + (p.gaz || 0) / GINGA.k) / GINGA.max); }
  function passoTronco(p, ax, az, dt) {
    p.gax = ax; p.gaz = az;
    const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (let i = 0; i < n; i++) {
      p.gvx = (p.gvx || 0) + (-GINGA.k * (p.gx || 0) - GINGA.c * (p.gvx || 0) - ax) * h; p.gx = (p.gx || 0) + p.gvx * h;
      p.gvz = (p.gvz || 0) + (-GINGA.k * (p.gz || 0) - GINGA.c * (p.gvz || 0) - az) * h; p.gz = (p.gz || 0) + p.gvz * h;
    }
    p.balanco = (p.balanco || 0) + (balancoTronco(p) - (p.balanco || 0)) * Math.min(1, dt * 12); // suavizado
  }
  // Arranque e freada suaves (wish.suave, para quem joga e para os bots): em vez de chegar na velocidade pedida em
  // ~0,2 s, a mudança é separada em duas partes. Na direção em que o jogador já corre: acelera forte saindo do zero e
  // cada vez menos perto do pique (arranque gradual), e freia com força média (para em ~0,4 s). De lado (mudar de
  // direção): mais forte, para a curva continuar firme. O goleiro robô e a barreira continuam com a conta antiga.
  const SUAVE = { acel: 16, perdeAcel: 0.55, freio: 14, vira: 28 };
  function acelSuave(p, tx, tz, k, dt) {
    const sp = Math.hypot(p.vx, p.vz), ts = Math.hypot(tx, tz);
    let ux = sp > 0.05 ? p.vx / sp : ts > 0 ? tx / ts : 0, uz = sp > 0.05 ? p.vz / sp : ts > 0 ? tz / ts : 0;
    const dx = tx - p.vx, dz = tz - p.vz, par = dx * ux + dz * uz, px = dx - ux * par, pz = dz - uz * par, perp = Math.hypot(px, pz);
    const subir = SUAVE.acel * (1 - SUAVE.perdeAcel * Math.min(1, sp / SPRINT)) * k * dt, frear = SUAVE.freio * k * dt, virar = SUAVE.vira * k * dt;
    const dPar = Math.max(-frear, Math.min(subir, par)), dPerp = Math.min(perp, virar);
    p.vx += ux * dPar + (perp > 1e-6 ? (px / perp) * dPerp : 0); p.vz += uz * dPar + (perp > 1e-6 ? (pz / perp) * dPerp : 0);
  }
  function movePlayer(p, wish, dt, F = MODES.pes) {
    const mol = !!wish.molinho, bal = mol ? p.balanco || 0 : 0, v0x = p.vx, v0z = p.vz;
    const acc = (p.onGround ? ACC : AIR_ACC) * (1 - GINGA.acc * bal);
    const tx = wish.x * wish.speed, tz = wish.z * wish.speed;
    const dx = tx - p.vx, dz = tz - p.vz, d = Math.hypot(dx, dz), m = acc * dt;
    if (!wish.free) {
      if (wish.suave && p.onGround) acelSuave(p, tx, tz, 1 - GINGA.acc * bal, dt);
      else if (d <= m) { p.vx = tx; p.vz = tz; } else { p.vx += (dx / d) * m; p.vz += (dz / d) * m; }
    }
    if (wish.jump && p.onGround) { p.vy = JUMP; p.onGround = false; }
    p.vy -= F.g * 1.4 * dt;
    p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
    const lx = F.L - P_R, lz = F.W - P_R;
    // bateu na parede: guarda para que lado e com que força
    let bx = 0, bz = 0, bv = 0;
    if (p.x < -lx) { bx = -1; bv = Math.max(bv, -p.vx); p.x = -lx; p.vx = 0; } if (p.x > lx) { bx = 1; bv = Math.max(bv, p.vx); p.x = lx; p.vx = 0; }
    if (p.z < -lz) { bz = -1; bv = Math.max(bv, -p.vz); p.z = -lz; p.vz = 0; } if (p.z > lz) { bz = 1; bv = Math.max(bv, p.vz); p.z = lz; p.vz = 0; }
    p.bateu = bv > 0 ? { nx: bx, nz: bz, v: bv } : null;
    if (mol && dt > 0) passoTronco(p, wish.free ? 0 : (p.vx - v0x) / dt, wish.free ? 0 : (p.vz - v0z) / dt, dt);
  }

  // ---------- carro (estilo Rocket League) ----------
  const CAR = { hx: 0.95, hy: 0.6, hz: 1.9, lift: 0.65, max: 14, boostMax: 23, jump: 6.2 };
  // vetores 3D (arrays [x, y, z])
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const noPlano = (v, n) => { const d = dot(v, n); return [v[0] - n[0] * d, v[1] - n[1] * d, v[2] - n[2] * d]; };
  const gira = (v, k, a) => { const c = Math.cos(a), s = Math.sin(a), kv = cross(k, v), d = dot(k, v) * (1 - c); return [v[0] * c + kv[0] * s + k[0] * d, v[1] * c + kv[1] * s + k[1] * d, v[2] * c + kv[2] * s + k[2] * d]; };
  // a superfície mais perto de um ponto: distância (negativa = dentro da arena) e a normal para DENTRO.
  // Na boca do gol (e dentro dele) é o chão reto; no resto, o "caixote arredondado".
  function superficie(F, x, y, z) {
    if (Math.abs(z) < F.goalW - 1.2 && y < F.goalH - 1.3 && Math.abs(x) > F.L - F.rc) return { d: -y, n: [0, 1, 0] };
    const s = arenaSDF(F, x, y, z); return { d: s.d, n: [-s.nx, -s.ny, -s.nz] };
  }
  // c: {x,y,z,vx,vy,vz,yaw,pitch,onGround,jumps,jumpT,flipT,boost, fw, up}; inp: {thr, steer, boost, jump (apertou agora), drift}
  // Como no Rocket League: no chão o carro GRUDA na superfície em que está (chão, rampa, parede e até o teto): (x, y, z)
  // é o ponto de contato das rodas, up é a normal da superfície e fw a frente do carro, sempre deitada nela. Acelerar,
  // virar e derrapar valem igual em qualquer superfície; a gravidade só puxa ao longo dela (subindo a parede o carro
  // perde velocidade; devagar demais na parede ou no teto, ele solta e cai). Pulando, sai na direção do "up" do carro e,
  // no ar, vale a gravidade normal do jogo; W/S giram o bico, A/D giram em volta do eixo de cima, e o carro pousa em
  // qualquer superfície que encostar com as rodas (no chão sempre pousa).
  function moveCar(c, inp, dt, F = MODES.carros) {
    const Gr = F.g * 1.1, boosting = inp.boost && c.boost > 0;
    if (boosting) c.boost = Math.max(0, c.boost - 34 * dt); else c.boost = Math.min(100, c.boost + 5 * dt);
    c.jumpT += dt;
    if (c.flipT > 0) c.flipT = Math.max(0, c.flipT - dt);
    let up = c.up || [0, 1, 0], f = c.fw || [-Math.sin(c.yaw), 0, -Math.cos(c.yaw)], v = [c.vx, c.vy, c.vz], px = c.x, py = c.y, pz = c.z;
    const ajeita = () => { let g = noPlano(f, up); if (Math.hypot(g[0], g[1], g[2]) < 1e-3) g = noPlano([0, -1, 0], up); if (Math.hypot(g[0], g[1], g[2]) < 1e-3) g = noPlano([1, 0, 0], up); f = norm(g); };
    let noAr = !c.onGround;
    if (c.onGround) {
      up = superficie(F, px, py, pz).n; ajeita();
      let r = cross(f, up);
      v[1] -= Gr * dt; v = noPlano(v, up); // gravidade: só a parte ao longo da superfície
      let fv = dot(v, f), lat = dot(v, r);
      const t = inp.thr;
      if (t > 0) fv += (fv < 0 ? 32 : 15) * t * dt;
      else if (t < 0) fv += (fv > 0 ? -32 : -12) * -t * dt;
      else fv -= Math.sign(fv) * Math.min(Math.abs(fv), 5 * dt);
      if (boosting) fv += 22 * dt;
      const top = boosting ? CAR.boostMax : CAR.max;
      if (fv > top) fv = boosting ? top : Math.max(top, fv - 9 * dt);
      if (fv < -9) fv = -9;
      lat *= Math.exp(-dt * (inp.drift ? 1.6 : 11)); // aderência (no freio de mão, derrapa)
      const turn = (2.7 / (1 + Math.abs(fv) / 16)) * Math.min(1, Math.abs(fv) / 2.5) * (inp.drift ? 1.5 : 1);
      f = norm(gira(f, up, -inp.steer * turn * Math.sign(fv || 1) * dt)); r = cross(f, up);
      v = [f[0] * fv + r[0] * lat, f[1] * fv + r[1] * lat, f[2] * fv + r[2] * lat];
      const sp = Math.hypot(v[0], v[1], v[2]);
      if (inp.jump) { // pulo: sai na direção de cima do carro (da parede, sai para dentro da arena)
        v = [v[0] + up[0] * CAR.jump, v[1] + up[1] * CAR.jump, v[2] + up[2] * CAR.jump];
        px += up[0] * 0.05; py += up[1] * 0.05; pz += up[2] * 0.05;
        c.onGround = false; c.jumps = 1; c.jumpT = 0;
      } else if (up[1] < 0.3 && sp < 2.5) { c.onGround = false; noAr = true; c.solto = 0.5; } // devagar demais na parede/teto: solta
      else {
        const nx = px + v[0] * dt, ny = py + v[1] * dt, nz = pz + v[2] * dt, s1 = superficie(F, nx, ny, nz);
        if (s1.d < -0.6) { px = nx; py = ny; pz = nz; c.onGround = false; } // o chão acabou (da rampa para a boca do gol): cai
        else if (s1.d > 0.6) { v = [-v[0] * 0.2, -v[1] * 0.2, -v[2] * 0.2]; } // degrau (o lado da boca do gol): bate
        else { // anda e gruda de novo (a rampa vira parede, a parede vira teto), mantendo a velocidade
          px = nx + s1.n[0] * s1.d; py = ny + s1.n[1] * s1.d; pz = nz + s1.n[2] * s1.d; up = s1.n;
          const vt = noPlano(v, up), l = Math.hypot(vt[0], vt[1], vt[2]); v = l > 1e-6 ? [vt[0] / l * sp, vt[1] / l * sp, vt[2] / l * sp] : vt; ajeita();
        }
      }
    }
    c.solto = Math.max(0, (c.solto || 0) - dt);
    if (noAr) {
      v[1] -= Gr * dt; // no ar, a gravidade normal do jogo
      let r = cross(f, up);
      if (inp.thr) { const a = -inp.thr * 3.2 * dt; f = gira(f, r, a); up = gira(up, r, a); } // W abaixa o bico, S levanta
      if (inp.steer) f = gira(f, up, -inp.steer * 2.4 * dt);
      f = norm(f); up = norm(noPlano(up, f)); r = cross(f, up);
      if (boosting) for (let k = 0; k < 3; k++) v[k] += f[k] * 24 * dt;
      if (inp.jump && c.jumps === 1 && c.jumpT < 1.4) {
        c.jumps = 2;
        if (inp.thr || inp.steer) { // mortal: um tranco na direção apertada
          const d = Math.hypot(inp.thr, inp.steer), kf = inp.thr / d, ks = inp.steer / d;
          for (let k = 0; k < 3; k++) v[k] += (f[k] * kf + r[k] * ks) * 9;
          v[1] = Math.max(v[1], 1.5); c.flipT = 0.65; c.flipDir = [kf, ks];
        } else for (let k = 0; k < 3; k++) v[k] += up[k] * 5.2; // pulo duplo
      }
      const sp = Math.hypot(v[0], v[1], v[2]); if (sp > 32) v = v.map((x) => x * 32 / sp);
      px += v[0] * dt; py += v[1] * dt; pz += v[2] * dt;
      const s = superficie(F, px, py, pz);
      if (s.d > -0.02) { // encostou: pousa se estiver com as rodas para a superfície (no chão, sempre); senão, bate
        const vn = dot(v, s.n);
        if ((s.n[1] > 0.7 || (dot(up, s.n) > 0.4 && c.solto <= 0)) && vn < 1) {
          px += s.n[0] * s.d; py += s.n[1] * s.d; pz += s.n[2] * s.d; up = s.n; ajeita(); v = noPlano(v, up);
          c.onGround = true; c.jumps = 0; c.flipT = 0;
        } else { px += s.n[0] * (s.d + 0.05); py += s.n[1] * (s.d + 0.05); pz += s.n[2] * (s.d + 0.05); if (vn < 0) for (let k = 0; k < 3; k++) v[k] -= s.n[k] * vn * 1.3; }
      }
      if (!c.onGround) { // o corpo (teto do carro) também não atravessa a parede
        const cx = px + up[0] * 0.7, cy = py + up[1] * 0.7, cz = pz + up[2] * 0.7, sc = superficie(F, cx, cy, cz);
        if (sc.d > -0.7 && sc.n[1] > 0.7) { // caiu de lado/de ponta-cabeça no chão: desvira e pousa (como no Rocket League)
          const s2 = superficie(F, px, py, pz); px += s2.n[0] * s2.d; py += s2.n[1] * s2.d; pz += s2.n[2] * s2.d; up = s2.n; ajeita(); v = noPlano(v, up);
          c.onGround = true; c.jumps = 0; c.flipT = 0;
        } else if (sc.d > -0.7) { const k = sc.d + 0.7, vn = dot(v, sc.n); px += sc.n[0] * k; py += sc.n[1] * k; pz += sc.n[2] * k; if (vn < 0) for (let q = 0; q < 3; q++) v[q] -= sc.n[q] * vn * 1.2; }
      }
    }
    if (Math.abs(px) > F.L - 0.5 && Math.abs(pz) < F.goalW) { // dentro do gol: as paredes da caixa do gol
      const lz = F.goalW - 1.2, ly = F.goalH - 1.3, lx = F.L + F.goalD - 1.6;
      if (Math.abs(px) > F.L && Math.abs(pz) > lz) { pz = Math.sign(pz) * lz; v[2] *= -0.3; }
      if (Math.abs(px) > F.L && py > ly) { py = ly; if (v[1] > 0) v[1] = 0; }
      if (Math.abs(px) > lx) { px = Math.sign(px) * lx; v[0] *= -0.3; }
    }
    c.x = px; c.y = py; c.z = pz; c.vx = v[0]; c.vy = v[1]; c.vz = v[2]; c.up = up; c.fw = f;
    if (Math.hypot(f[0], f[2]) > 0.15) c.yaw = Math.atan2(-f[0], -f[2]);
    c.pitch = Math.asin(Math.max(-1, Math.min(1, f[1])));
  }

  // ---------- bola ----------
  const newBall = (F = MODES.pes) => ({ x: 0, y: F.ballR, z: 0, vx: 0, vy: 0, vz: 0, sp: 0, wx: 0, wy: 0, wz: 0, holder: null });
  // Rocket League: batida da bola numa superfície (chão, parede, teto) com atrito de Coulomb e giro.
  // O ponto de contato desliza com v + w × r; o atrito tira até mu·Jn desse deslize (ou tudo, e a bola passa a rolar)
  // e vira giro. Devolve a força da batida.
  function rlContact(F, b, nx, ny, nz, pen) {
    const R = F.ballR;
    b.x += nx * pen; b.y += ny * pen; b.z += nz * pen;
    const rx = -nx * R, ry = -ny * R, rz = -nz * R; // do centro até o ponto de contato
    const cx = b.vx + (b.wy * rz - b.wz * ry), cy = b.vy + (b.wz * rx - b.wx * rz), cz = b.vz + (b.wx * ry - b.wy * rx);
    const vn = cx * nx + cy * ny + cz * nz;
    if (vn >= 0) return 0;
    const e = vn > -0.3 ? 0 : F.bounce, jn = -(1 + e) * vn; // impulso por unidade de massa
    const tx = cx - nx * vn, ty = cy - ny * vn, tz = cz - nz * vn, tl = Math.hypot(tx, ty, tz);
    let jx = 0, jy = 0, jz = 0;
    if (tl > 1e-4) { const jt = Math.min((2 / 7) * tl, F.mu * jn); jx = -tx / tl * jt; jy = -ty / tl * jt; jz = -tz / tl * jt; }
    b.vx += nx * jn + jx; b.vy += ny * jn + jy; b.vz += nz * jn + jz;
    const k = 1 / (0.4 * R * R); // giro: (r × J) / I, com I = 2/5·m·R²
    b.wx += (ry * jz - rz * jy) * k; b.wy += (rz * jx - rx * jz) * k; b.wz += (rx * jy - ry * jx) * k;
    return -vn;
  }
  function bounceOff(b, nx, ny, nz, pen, e, vx = 0, vy = 0, vz = 0) {
    b.x += nx * pen; b.y += ny * pen; b.z += nz * pen;
    const rv = (b.vx - vx) * nx + (b.vy - vy) * ny + (b.vz - vz) * nz;
    if (rv < 0) { b.vx -= (1 + e) * rv * nx; b.vy -= (1 + e) * rv * ny; b.vz -= (1 + e) * rv * nz; }
    return rv < 0 ? -rv : 0;
  }
  // corpos: {id, kind: "pe"|"car", x,y,z,vx,vy,vz, yaw, sprint, slide, dive, flip}
  function hitBody(b, p, R, F = MODES.pes) {
    if (p.kind === "car") {
      // orientação do carro: frente (f) e cima (u); na parede ou no teto vem em p.o = [fx, fy, fz, ux, uy, uz]
      const o = Array.isArray(p.o) && p.o.length === 6 ? p.o : null;
      const f3 = o ? [o[0], o[1], o[2]] : [-Math.sin(p.yaw), 0, -Math.cos(p.yaw)], u3 = o ? [o[3], o[4], o[5]] : [0, 1, 0], r3 = cross(f3, u3);
      const ccx = p.x + u3[0] * CAR.lift, cy = p.y + u3[1] * CAR.lift, ccz = p.z + u3[2] * CAR.lift, dl = [b.x - ccx, b.y - cy, b.z - ccz];
      const fx = f3[0], fz = f3[2];
      const qx = Math.max(-CAR.hx, Math.min(CAR.hx, dot(dl, r3))), qy = Math.max(-CAR.hy, Math.min(CAR.hy, dot(dl, u3))), qf = Math.max(-CAR.hz, Math.min(CAR.hz, dot(dl, f3)));
      const px = ccx + r3[0] * qx + u3[0] * qy + f3[0] * qf, py = cy + r3[1] * qx + u3[1] * qy + f3[1] * qf, pz = ccz + r3[2] * qx + u3[2] * qy + f3[2] * qf;
      let ex = b.x - px, ey = b.y - py, ez = b.z - pz, d = Math.hypot(ex, ey, ez);
      if (d >= R) return 0;
      if (d < 1e-6) { ex = 0; ey = 1; ez = 0; d = 1e-6; }
      const nx = ex / d, ny = ey / d, nz = ez / d;
      const rel = Math.hypot(b.vx - p.vx, b.vy - (p.vy || 0), b.vz - p.vz);
      const f = bounceOff(b, nx, ny, nz, R - d, F.carE || 0.35, p.vx, p.vy || 0, p.vz);
      if (F.rl && f > 0.3) { // Rocket League: impulso extra da Psyonix (é o que faz a bola sair forte do carro)
        // direção: do carro para a bola, com a altura achatada (0,35) e só 65% da componente para a frente do carro
        let hx = b.x - ccx, hy = (b.y - cy) * 0.35, hz = b.z - ccz, hl = Math.hypot(hx, hy, hz) || 1; hx /= hl; hy /= hl; hz /= hl;
        const fd = (hx * fx + hy * f3[1] + hz * fz) * (1 - 0.65); hx -= fx * fd; hy -= f3[1] * fd; hz -= fz * fd; hl = Math.hypot(hx, hy, hz) || 1;
        const sp = Math.min(46, rel), u = sp * 100; // velocidade relativa em uu/s
        const fac = u <= 500 ? 0.65 : u <= 2300 ? 0.65 - 0.1 * (u - 500) / 1800 : 0.55 - 0.25 * (u - 2300) / 2300;
        const add = sp * fac * (p.flip ? 1.25 : 1);
        b.vx += hx / hl * add; b.vy += hy / hl * add; b.vz += hz / hl * add;
      } else if (f > 0.3) { // tranco extra (o carro "chuta" a bola), mais forte no mortal
        const sp = Math.hypot(p.vx, p.vy || 0, p.vz), k = Math.min(9, sp * 0.3 + 1.5) * (p.flip ? 1.6 : 1) * (F.kick || 1);
        b.vx += nx * k; b.vy += ny * k + (p.flip ? 2 : 0); b.vz += nz * k;
      }
      return f;
    }
    // a pé: corpo (cilindro) e cabeça. Deitado (carrinho) fica baixo e comprido; no mergulho do goleiro, mais largo.
    const pr = p.slide ? 0.6 : p.dive ? 0.95 : P_R, top = p.slide ? 0.5 : p.dive ? 1.4 : P_H, base = p.dive ? p.y + 0.3 : p.y;
    const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
    if (b.y - R < base + top - (p.slide || p.dive ? 0 : 0.25) && b.y + R > base && d < pr + R && d > 1e-6) {
      const nx = dx / d, nz = dz / d, pv = Math.hypot(p.vx || 0, p.vz || 0);
      // domínio: parado ou indo ao encontro da bola (sem pique/carrinho), o peito/pé amortece e a bola fica colada
      const domina = !p.slide && !p.dive && !p.sprint && (pv < 1 || ((p.vx || 0) * nx + (p.vz || 0) * nz) / pv > 0.3);
      const e = p.slide ? 0.6 : p.sprint ? 0.5 : domina ? 0.12 : 0.25; // correndo, a bola espirra mais longe
      const f = bounceOff(b, nx, 0, nz, pr + R - d, e, p.vx || 0, 0, p.vz || 0);
      if (domina && f > 0) { // tira metade da velocidade relativa que sobrou (de lado e para cima)
        b.vx = (p.vx || 0) + (b.vx - (p.vx || 0)) * 0.5; b.vz = (p.vz || 0) + (b.vz - (p.vz || 0)) * 0.5; if (b.vy > 0) b.vy *= 0.5;
      }
      return f;
    }
    if (p.slide || p.dive) return 0;
    const hy = p.y + P_H - 0.12, ex = b.x - p.x, ey = b.y - hy, ez = b.z - p.z, dd = Math.hypot(ex, ey, ez);
    if (dd < 0.16 + R && dd > 1e-6) return bounceOff(b, ex / dd, ey / dd, ez / dd, 0.16 + R - dd, 0.55, p.vx || 0, p.vy || 0, p.vz || 0);
    return 0;
  }
  // devolve a força da batida mais forte (para o som) e o id de quem encostou por último
  function stepBall(F, b, bodies, dt) {
    if (F.rl) return stepBallRL(F, b, bodies, dt);
    let hit = 0, touch = null;
    const R = F.ballR, noAr = b.y > R + 0.01;
    b.vy -= F.gBola * dt; // gravidade da bola (o pulo do jogador usa F.g)
    // efeito Magnus (chute com curva no Q/E): giro em volta do eixo vertical, spin = (0, sp, 0).
    // força = velocidade × spin × fator: (vx, vy, vz) × (0, sp, 0) = (-vz·sp, 0, vx·sp), perpendicular ao movimento.
    // No ar curva de verdade; rolando, sobra uma curvinha (25%) e o giro acaba rápido no atrito com o chão.
    if (b.sp) {
      const k = b.sp * F.curva * (noAr ? 1 : 0.25) * dt, vx = b.vx;
      b.vx += -b.vz * k; b.vz += vx * k;
      b.sp *= Math.exp(-dt * (noAr ? 0.5 : 3)); if (Math.abs(b.sp) < 0.3) b.sp = 0;
    }
    if (noAr) { const k = Math.max(0, 1 - F.drag * dt); b.vx *= k; b.vy *= k; b.vz *= k; } // arrasto do ar
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < R) {
      b.y = R;
      if (b.vy < -1.2) { hit = Math.max(hit, -b.vy); b.vy = -b.vy * F.bounce; b.vx *= 0.94; b.vz *= 0.94; } // quique baixo: perde altura rápido
      else b.vy = 0;
    }
    if (b.y <= R + 1e-3) { // rolando: atrito forte (velocidade *= 1 - 1,2·dt) e para de vez quando fica bem lenta
      const k = Math.max(0, 1 - F.roll * dt); b.vx *= k; b.vz *= k;
      if (Math.hypot(b.vx, b.vz) < 0.15) { b.vx = 0; b.vz = 0; }
    }
    if (b.y > F.ceil - R) { b.y = F.ceil - R; b.vy = -Math.abs(b.vy) * 0.5; }
    const wz = F.W - R;
    if (b.z > wz) { b.z = wz; if (b.vz > 0) { hit = Math.max(hit, b.vz); b.vz = -b.vz * F.wallE; } }
    if (b.z < -wz) { b.z = -wz; if (b.vz < 0) { hit = Math.max(hit, -b.vz); b.vz = -b.vz * F.wallE; } }
    const inMouth = Math.abs(b.z) < F.goalW - R && b.y < F.goalH - R;
    for (const s of [1, -1]) {
      const line = s * F.L, sx = s * b.x;
      const inGoal = sx > F.L && Math.abs(b.z) < F.goalW;
      if (sx > F.L - R && !inMouth && !inGoal && sx < F.L + F.goalD) { b.x = s * (F.L - R); if (s * b.vx > 0) { hit = Math.max(hit, Math.abs(b.vx)); b.vx = -b.vx * F.wallE; } }
      if (sx > F.L) { // dentro do gol: rede (amortece bastante)
        const back = F.L + F.goalD - R;
        if (sx > back) { b.x = s * back; if (s * b.vx > 0) b.vx = -b.vx * 0.12; b.vz *= 0.6; b.vy *= 0.6; }
        if (Math.abs(b.z) > F.goalW - R) { b.z = Math.sign(b.z) * (F.goalW - R); b.vz = -b.vz * 0.15; b.vx *= 0.7; }
        if (b.y > F.goalH - R) { b.y = F.goalH - R; b.vy = -Math.abs(b.vy) * 0.15; }
      }
      for (const pz of [F.goalW, -F.goalW]) { // traves
        const dx = b.x - line, dz = b.z - pz, d = Math.hypot(dx, dz);
        if (d < F.postR + R && b.y < F.goalH + F.postR && d > 1e-6) hit = Math.max(hit, bounceOff(b, dx / d, 0, dz / d, F.postR + R - d, 0.6));
      }
      if (Math.abs(b.z) < F.goalW) { // travessão
        const dx = b.x - line, dy = b.y - F.goalH, d = Math.hypot(dx, dy);
        if (d < F.postR + R && d > 1e-6) hit = Math.max(hit, bounceOff(b, dx / d, dy / d, 0, F.postR + R - d, 0.6));
      }
    }
    for (const p of bodies || []) {
      const f = hitBody(b, p, R, F);
      if (f > 0.05) { touch = p.id; hit = Math.max(hit, f * 0.45); b.sp = (b.sp || 0) * 0.3; }
    }
    if (F.pe) travaPasse(b, bodies, dt); // passe assistido: perto de quem recebe, a bola se ajeita para o pé dele
    const dono = conduz(F, b, bodies, dt); if (dono) touch = dono;
    return { hit, touch };
  }
  // Condução com TOQUES (estilo FIFA Volta): quem está mais perto da bola rasteira (até ~1,15 m) fica com ela "no pé".
  // A bola nunca fica presa no jogador: é um corpo que rola, e o jogador dá toques curtos e frequentes nela.
  //  - A cada COND.intervalo segundos (mais rápido protegendo, um pouco mais lento no pique), se a bola está ao
  //    alcance do pé, ele toca: a bola sai na velocidade certa para estar, no próximo toque, LEAD metros na frente de
  //    onde ele vai estar (a posição dele daqui a um intervalo, pela velocidade de agora). Andando a bola fica junto do
  //    pé; correndo, um pouco mais longe; no pique, ainda mais longe (mais fácil de perder).
  //  - Entre um toque e outro a bola só rola (com o atrito do chão): a direção dela SÓ muda num toque. Virou o corpo?
  //    A bola segue por um instante e o próximo toque puxa ela para o lado novo (curva suave, sem teletransporte).
  //  - Pé alternado: cada toque sai um pouco para a esquerda ou para a direita (COND.ladoPe).
  //  - Ímã de domínio: com a bola bem perto (COND.dominio) e sem toque neste instante, uma força fraca segura ela
  //    na frente do pé, para não fugir sem motivo. Parado, a bola fica descansando na frente do pé.
  //  - p.forcaToque (drible): o próximo toque sai agora, sem esperar o intervalo.
  //  b.toqueDe: quem deu o último toque; b.toqueT: tempo desde ele; b.toques: contador (o navegador mexe a perna).
  // Não pega: bola alta, bola chegando forte (aí é o domínio), logo depois do chute, carrinho, mergulho, caído.
  // A posse tem inércia (b.dono): quem está com a bola só perde para quem chegar BEM mais perto (25 cm) e com a bola
  // na frente dele; ombro a ombro, a bola continua com quem tinha. O carrinho continua tirando a bola de vez.
  // Os valores ficam em COND (dá para mexer no painel "Ajustar condução" do menu de pausa).
  const COND = {
    intervalo: 0.22,      // s entre toques correndo
    intervaloPique: 0.27, // s entre toques no pique
    intervaloProtege: 0.17,
    leadAndando: 0.55,    // m da bola até o centro do jogador no próximo toque
    leadCorrendo: 0.8,
    leadPique: 1.15,
    leadProtege: 0.4,
    alcance: 1.25,        // m: até onde o pé alcança para tocar
    ladoPe: 0.09,         // m: deslocamento de lado de cada pé
    dominio: 0.6,         // m: raio do ímã
    ima: 3,               // força do ímã (1/s)
  };
  const CONDUZ_R = 1.15, TOMA = 0.25, POSSE_R = 1.9, PARADO = 0.8;
  function conduz(F, b, bodies, dt) {
    if (F.rl || !bodies || b.holder || b.y > F.ballR + 0.12 || b.vy > 1.5) { b.dono = null; b.toqueDe = null; return null; }
    let p = null, best = CONDUZ_R, atual = null, dAtual = 0;
    for (const q of bodies) {
      if (q.kind !== "pe" || !q.conduz || q.slide || q.dive || q.chutou || q.yaw == null || q.y > 0.3) continue;
      const d = Math.hypot(b.x - q.x, b.z - q.z), alcance = b.toqueDe === q.id ? POSSE_R : CONDUZ_R; // a bola que ele mesmo tocou continua dele
      if (q.id === b.dono && d < alcance) { atual = q; dAtual = d; }
      if (d < best) { best = d; p = q; }
    }
    if (atual && !p) { p = atual; best = dAtual; }
    else if (atual && p !== atual) {
      const frente = ((b.x - p.x) * -Math.sin(p.yaw) + (b.z - p.z) * -Math.cos(p.yaw)) / (best || 1) > 0.2;
      if (!(best < dAtual - TOMA && frente)) { p = atual; best = dAtual; } // não tomou: continua com quem tinha
    }
    if (!p) { b.dono = null; b.toqueDe = null; return null; }
    const pvx = p.vx || 0, pvz = p.vz || 0;
    if (b.toqueDe !== p.id && Math.hypot(b.vx - pvx, b.vz - pvz) > 6) { b.dono = null; return null; } // chegando forte: primeiro amortece (domínio)
    if (b.dono !== p.id) { b.toqueDe = null; b.toqueT = 99; }
    b.dono = p.id;
    b.toqueT = (b.toqueT ?? 99) + dt;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), sp = Math.hypot(pvx, pvz);
    const rx = b.x - p.x, rz = b.z - p.z, dist = Math.hypot(rx, rz), along = rx * fx + rz * fz;
    if (sp < PARADO && !p.forcaToque) { // parado: a bola descansa na frente do pé
      const tx = p.x + fx * 0.5, tz = p.z + fz * 0.5, k = 1 - Math.exp(-(along < 0 ? 5 : 10) * dt);
      b.vx += (pvx + (tx - b.x) * 6 - b.vx) * k; b.vz += (pvz + (tz - b.z) * 6 - b.vz) * k;
      if (b.vy > 0) b.vy *= 1 - k; b.sp = (b.sp || 0) * (1 - k);
      b.toqueDe = p.id;
      return p.id;
    }
    const intervalo = p.protege ? COND.intervaloProtege : p.sprint ? COND.intervaloPique : COND.intervalo;
    if (dist < COND.alcance && (b.toqueT >= intervalo || b.toqueDe !== p.id || p.forcaToque)) {
      // toque: onde a bola precisa estar no próximo toque (na frente de onde ele vai estar), com o pé alternado
      const lead = p.protege ? COND.leadProtege : p.sprint ? COND.leadPique : sp < 3.5 ? COND.leadAndando : COND.leadCorrendo;
      b.pe = -(b.pe || 1);
      const T = intervalo, px = p.x + pvx * T, pz = p.z + pvz * T, lado = b.pe * COND.ladoPe;
      const tx = px + fx * lead - fz * lado, tz = pz + fz * lead + fx * lado;
      const atr = 1 + F.roll * T * 0.55; // compensa o atrito do chão no caminho
      b.vx = ((tx - b.x) / T) * atr; b.vz = ((tz - b.z) / T) * atr; b.sp = 0; if (b.vy > 0) b.vy = 0;
      if (along < 0.35 && dist < 0.5) { b.x = p.x + fx * 0.35; b.z = p.z + fz * 0.35; } // não deixa a bola entrar no corpo
      b.toqueDe = p.id; b.toqueT = 0; b.toques = (b.toques || 0) + 1; p.forcaToque = false;
      return p.id;
    }
    // entre os toques: a bola só rola. Bem perto do pé, o ímã fraco segura ela (sem mudar o rumo dela de lado)
    if (dist < COND.dominio) {
      const k = 1 - Math.exp(-COND.ima * dt), vrel = (b.vx - pvx) * fx + (b.vz - pvz) * fz, want = (0.45 - along) * 3;
      const dv = (want - vrel) * k; b.vx += fx * dv; b.vz += fz * dv;
    }
    return p.id;
  }
  // bola do Rocket League: gravidade, arrasto linear, limites de velocidade e giro, e batidas com atrito e giro
  function stepBallRL(F, b, bodies, dt) {
    let hit = 0, touch = null;
    const R = F.ballR;
    b.wx = b.wx || 0; b.wy = b.wy || 0; b.wz = b.wz || 0;
    b.vy -= F.g * dt;
    const ld = Math.max(0, 1 - F.drag * dt), ad = Math.max(0, 1 - 0.015 * dt);
    b.vx *= ld; b.vy *= ld; b.vz *= ld; b.wx *= ad; b.wy *= ad; b.wz *= ad;
    const v = Math.hypot(b.vx, b.vy, b.vz); if (v > F.vmax) { const k = F.vmax / v; b.vx *= k; b.vy *= k; b.vz *= k; }
    const w = Math.hypot(b.wx, b.wy, b.wz); if (w > F.wmax) { const k = F.wmax / w; b.wx *= k; b.wy *= k; b.wz *= k; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    // arena arredondada: dentro do gol e no corredor da boca do gol (perto da linha) o chão é reto e não tem parede do
    // fundo (a rede e as traves cuidam); no resto, a superfície curva do "caixote arredondado"
    const inMouth = Math.abs(b.z) < F.goalW - R && b.y < F.goalH - R, ax = Math.abs(b.x);
    if ((ax > F.L && Math.abs(b.z) < F.goalW) || (inMouth && ax > F.L - F.rc)) { if (b.y < R) hit = Math.max(hit, rlContact(F, b, 0, 1, 0, R - b.y)); }
    else { const s = arenaSDF(F, b.x, b.y, b.z); if (s.d > -R) hit = Math.max(hit, rlContact(F, b, -s.nx, -s.ny, -s.nz, s.d + R)); }
    for (const s of [1, -1]) {
      const line = s * F.L, sx = s * b.x;
      if (sx > F.L) { // dentro do gol: rede (amortece bastante)
        const back = F.L + F.goalD - R;
        if (sx > back) { b.x = s * back; if (s * b.vx > 0) b.vx = -b.vx * 0.12; b.vz *= 0.6; b.vy *= 0.6; }
        if (Math.abs(b.z) > F.goalW - R) { b.z = Math.sign(b.z) * (F.goalW - R); b.vz = -b.vz * 0.15; b.vx *= 0.7; }
        if (b.y > F.goalH - R) { b.y = F.goalH - R; b.vy = -Math.abs(b.vy) * 0.15; }
      }
      for (const pz of [F.goalW, -F.goalW]) { // traves
        const dx = b.x - line, dz = b.z - pz, d = Math.hypot(dx, dz);
        if (d < F.postR + R && b.y < F.goalH + F.postR && d > 1e-6) hit = Math.max(hit, rlContact(F, b, dx / d, 0, dz / d, F.postR + R - d));
      }
      if (Math.abs(b.z) < F.goalW) { // travessão
        const dx = b.x - line, dy = b.y - F.goalH, d = Math.hypot(dx, dy);
        if (d < F.postR + R && d > 1e-6) hit = Math.max(hit, rlContact(F, b, dx / d, dy / d, 0, F.postR + R - d));
      }
    }
    for (const p of bodies || []) {
      const f = hitBody(b, p, R, F);
      if (f > 0.05) { touch = p.id; hit = Math.max(hit, f * 0.45); }
    }
    return { hit, touch };
  }
  // onde a bola vai cair (para a marca no chão): simula até ela descer até o chão, no máximo `secs`
  function landing(F, b0, secs = 3) {
    const b = { ...b0 }; let t = 0;
    while (t < secs) { const vy = b.vy; stepBall(F, b, [], 1 / 60); t += 1 / 60; if (b.y <= F.ballR + 0.05 || (vy < 0 && b.vy > 0 && b.y < F.ballR + 0.5)) return { x: b.x, z: b.z, t }; }
    return null;
  }
  // passos fixos de 1/120 s (servidor e navegador fazem a mesma conta)
  function simulate(F, b, bodies, dt) {
    let hit = 0, touch = null;
    if (b.holder) return { hit, touch };
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < n; i++) { const r = stepBall(F, b, bodies, dt / n); hit = Math.max(hit, r.hit); if (r.touch) touch = r.touch; }
    return { hit, touch };
  }
  // gol? "A" se a bola entrou inteira no gol da direita (+x), "B" se entrou no da esquerda
  function goalOf(F, b) {
    if (b.holder || Math.abs(b.z) >= F.goalW || b.y >= F.goalH) return null;
    if (b.x > F.L + F.ballR) return "A";
    if (b.x < -F.L - F.ballR) return "B";
    return null;
  }

  // ---------- chute (a pé) ----------
  // tipo: "chute" (força pela barra), "passe" (rasteiro), "cavadinha" (alto). Cabeçada se a bola estiver alta.
  // Com a bola na mão, o goleiro solta: chute vira tiro de meta pelo alto, passe vira arremesso rasteiro.
  const KICK_RANGE = 1.35, KICK_CD = 0.3;
  function canKick(p, b, slack = 0) {
    if (b.holder) return b.holder === p.id ? "mao" : null;
    const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz), rel = b.y - p.y;
    if (rel < 1.0) return d < KICK_RANGE + slack ? "pe" : null;
    if (rel < 2.3) return d < 0.9 + slack ? "cabeca" : null;
    return null;
  }
  // curva: -1 (para a esquerda) a 1 (para a direita)
  // opt (passe planejado: curto, longo, enfiada): { vel, elev, alvo } = velocidade e ângulo de saída exatos e quem vai receber (trava)
  function kick(b, p, kind, power, yaw, slack = 0, curve = 0, F = MODES.pes, opt = null) {
    const how = canKick(p, b, slack); if (!how) return null;
    power = Math.max(0, Math.min(1, power));
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let speed, elev;
    if (how === "mao") { b.holder = null; b.x = p.x + fx * 0.6; b.z = p.z + fz * 0.6; b.y = 1.1; speed = kind === "passe" ? 6 + 10 * power : 14 + 12 * power; elev = kind === "passe" ? 0.05 : 0.45; }
    else if (how === "cabeca") { speed = 7 + 9 * power; elev = 0.12; }
    else if (kind === "passe") { speed = 4 + 22 * power; elev = 0.02; } // passe forte: o atrito do futsal segura
    else if (kind === "cavadinha") { speed = 7 + 13 * power; elev = 0.85; }
    else if (kind === "lancamento") { speed = 10 + 16 * power; elev = 0.38; } // passe longo pelo alto (assistência de passe)
    else if (kind === "cruzamento") { speed = 9 + 21 * power; elev = 0.6; } // cruzamento alto: sobe bem e cai na área
    else { speed = 9 + 20 * power; elev = 0.07 + power * 0.1; }
    if (opt && opt.vel && how !== "mao") { speed = Math.max(3, Math.min(34, opt.vel)); elev = Math.max(0, Math.min(1.1, opt.elev ?? 0.02)); }
    const h = Math.cos(elev) * speed, sobe = Math.sqrt((F.gBola || 25) / 9.81); // mesma altura que antes, subindo mais rápido
    const herda = opt && opt.vel ? 0 : 0.3; // passe planejado: a velocidade já é a da bola (não soma a de quem passa)
    b.vx = fx * h + (p.vx || 0) * herda; b.vz = fz * h + (p.vz || 0) * herda; b.vy = Math.sin(elev) * speed * sobe;
    if (how === "pe" && b.y < F.ballR + 0.05) b.y = F.ballR + 0.02;
    b.dono = null; b.toqueDe = null; // a bola saiu do pé
    b.alvoPasse = opt && opt.alvo ? opt.alvo : null; b.alvoT = 0; // passe planejado: quem recebe (trava perto dele)
    curve = Math.max(-1, Math.min(1, curve || 0));
    b.sp = how === "cabeca" ? 0 : curve * (kind === "passe" ? 14 : 24); // positivo: curva para a direita de quem chuta
    return how;
  }
  // chute assistido estilo FIFA (só no futebol a pé e só no último terço do campo, perto do gol que você ataca):
  // se a mira está a menos de 35° do gol (do meio ou de uma das traves; um cone de 70°) e o chute é sem efeito, a direção é puxada para
  // dentro do gol: mirou entre as traves, fica como está (a escolha do canto é sua); mirou para fora, mas dentro do
  // cone, vai no canto mais perto (logo dentro da trave). Fora do cone vale a mira pura: dá para mandar para fora.
  const ASSIST_CONE = 35 * Math.PI / 180;
  // origem: de onde a bola sai (a bola pode estar até ~1,3 m para o lado do jogador)
  function assistShot(p, yaw, team, F = MODES.pes, curve = 0, origem = p) {
    if (F.rl || curve) return yaw; // chute com efeito (Q/E) é chute de habilidade: mira pura
    const o = origem, s = team === "B" ? -1 : 1, gx = s * F.L, dx = gx - o.x;
    if (s * dx <= 0.5 || s * dx > (2 * F.L) / 3) return yaw; // fora do último terço (ou atrás da linha do gol): mira pura
    const ang = (z) => Math.atan2(-dx, -(z - o.z)), dif = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
    const inner = F.goalW - 0.3, aL = ang(-inner), aR = ang(inner), aC = ang(0);
    if (Math.min(Math.abs(dif(yaw, aC)), Math.abs(dif(yaw, ang(-F.goalW))), Math.abs(dif(yaw, ang(F.goalW)))) > ASSIST_CONE) return yaw;
    const lo = dif(aL, aC) < dif(aR, aC) ? aL : aR, hi = lo === aL ? aR : aL; // os dois cantos, em ordem de ângulo
    const d = dif(yaw, aC);
    if (d >= dif(lo, aC) && d <= dif(hi, aC)) return yaw; // já vai no gol
    return Math.abs(dif(yaw, lo)) < Math.abs(dif(yaw, hi)) ? lo : hi; // puxa para o canto mais perto
  }
  // corpo a corpo (a pé): dois jogadores não se atravessam. Cada navegador resolve o próprio jogador contra os outros:
  // sai da sobreposição e perde a velocidade que vai contra o outro (choque sem quique); quem está parado leva o
  // tranco de quem vem correndo. A parte de cada um (w é a minha): metade para cada, mas no ombro a ombro quem vem no
  // pique empurra mais (0,3 para ele, 0,7 para o outro). fixo: o outro não se mexe (barreira da falta), eu levo tudo.
  // local: o outro também é controlado aqui (goleiro robô do treino), então empurro ele também.
  // Caído, deslizando no carrinho ou no mergulho não bloqueia ninguém (o carrinho derruba; isso é com o servidor).
  function corpoACorpo(me, outros, caido = false) {
    if (caido) return;
    const min = 2 * P_R;
    for (const o of outros) {
      if (o.caido || Math.abs((me.y || 0) - (o.y || 0)) > 1.2) continue; // um pulou por cima do outro
      let nx = me.x - o.x, nz = me.z - o.z; const d = Math.hypot(nx, nz);
      if (d >= min) continue;
      if (d < 1e-4) { nx = 1; nz = 0; } else { nx /= d; nz /= d; }
      const w = o.fixo ? 1 : me.sprint && !o.sprint ? 0.3 : o.sprint && !me.sprint ? 0.7 : 0.5, pen = min - d;
      me.x += nx * pen * w; me.z += nz * pen * w;
      if (o.local) { o.x -= nx * pen * (1 - w); o.z -= nz * pen * (1 - w); }
      const rvn = (me.vx - (o.vx || 0)) * nx + (me.vz - (o.vz || 0)) * nz; // < 0: estão se aproximando
      if (rvn < 0) {
        me.vx -= rvn * nx * w; me.vz -= rvn * nz * w;
        if (o.local) { o.vx = (o.vx || 0) + rvn * nx * (1 - w); o.vz = (o.vz || 0) + rvn * nz * (1 - w); }
      }
    }
  }
  // passe assistido (como no FIFA): procura o companheiro num cone de 45° para cada lado da mira (um pouco mais aberto
  // que o do chute, 35°). A força escolhe quem: passe fraquinho vai no mais perto, e quanto mais você carrega, mais
  // longe ele procura (barra cheia ~28 m). Entre dois na mesma distância, vai no mais alinhado com a mira. A bola sai
  // na medida para chegar nele (~2,5 m/s), mirando onde ele vai estar se estiver correndo. Longe (mais de 18 m) rolando
  // não chega (o atrito do futsal segura): vira lançamento pelo alto, que cai perto dele.
  const PASSE_CONE = 45 * Math.PI / 180, LANCA_D = 18;
  // quanto a bola leva até d (a bola sai ~0,6 m na frente do jogador): rolando, pela conta do atrito; pelo alto, da tabela
  const tempoRolando = (d, F = MODES.pes) => Math.log((F.roll * Math.max(0, d - 0.6) + 2.5) / 2.5) / F.roll;
  const tempoLanc = (d, F) => lancamento(d, F).t;
  // colocado (com o modificador, LB): vai no companheiro mais alinhado com a mira (a distância quase não importa) e
  // sai tenso, chegando nele ainda forte (~6 m/s) em vez de morrer no pé.
  function assistPass(p, yaw, mates, power, colocado = false, F = MODES.pes) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), alvoD = 3 + power * 25;
    let best = null, bestScore = Infinity;
    for (const m of mates) {
      const d0 = Math.hypot(m.x - p.x, m.z - p.z);
      if (d0 < 1.5 || d0 > 34) continue;
      let lx = m.x, lz = m.z, d = d0;
      for (let k = 0; k < 4; k++) { // onde ele vai estar quando a bola chegar (algumas voltas: a distância muda o tempo)
        const t = Math.min(2.6, d > LANCA_D ? tempoLanc(d, F) : tempoRolando(d, F));
        lx = m.x + (m.vx || 0) * t; lz = m.z + (m.vz || 0) * t; d = Math.hypot(lx - p.x, lz - p.z);
      }
      const dx = lx - p.x, dz = lz - p.z;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / (d || 1))));
      if (ang > PASSE_CONE) continue;
      const score = ang / PASSE_CONE + (colocado ? d / 200 : Math.abs(d - alvoD) / 10); // alinhado com a mira + perto da distância que a força pede
      if (score < bestScore) { bestScore = score; best = { yaw: Math.atan2(-dx, -dz), d, id: m.id, x: lx, z: lz }; }
    }
    if (!best) return { yaw, power };
    if (best.d > LANCA_D) return { yaw: best.yaw, power: lancamento(best.d, F).power, alvo: best, kind: "lancamento" };
    const chega = colocado ? 6 : 2.5, need = (F.roll * Math.max(0, best.d - 0.6) + chega - 4) / 22; // rolando, a velocidade cai 1,2 por metro
    if (colocado) return { yaw: best.yaw, power: Math.max(0, Math.min(1, need)), alvo: best };
    return { yaw: best.yaw, power: Math.max(0, Math.min(1, Math.max(need, Math.min(power, need + 0.08)))), alvo: best };
  }
  // cruzamento alto (X no controle, U no teclado): a bola sobe e cai na área. Procura um companheiro adiantado num cone
  // de 70° para cada lado da mira (o mais perto do gol); sem ninguém, cai perto da marca do pênalti. A força é a que faz
  // a bola chegar nele ainda no alto (na altura da cabeça), mirando onde ele vai estar.
  function assistCross(p, yaw, team, mates, F = MODES.pes) {
    const s = team === "B" ? -1 : 1, gx = s * F.L, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let alvo = null, bs = Infinity;
    for (const m of mates) {
      const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz);
      if (d < 5 || d > 32) continue;
      if (Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d))) > 70 * Math.PI / 180) continue;
      const sc = Math.hypot(gx - m.x, m.z) + (s * (m.x - p.x) < -2 ? 8 : 0); // perto do gol e não muito para trás
      if (sc < bs) { bs = sc; alvo = m; }
    }
    let tx, tz;
    if (alvo) { const t = 1.1; tx = alvo.x + (alvo.vx || 0) * t; tz = alvo.z + (alvo.vz || 0) * t; }
    else { tx = gx - s * 4.5; tz = 0; }
    const d = Math.max(6, Math.min(32, Math.hypot(tx - p.x, tz - p.z)));
    return { yaw: Math.atan2(-(tx - p.x), -(tz - p.z)), power: cruzamento(d + 1.5, F).power, alvo: { x: tx, z: tz, id: alvo ? alvo.id : null } };
  }
  const tabelaCruz = {};
  function cruzamento(d, F = MODES.pes) { // força que faz o cruzamento quicar pela primeira vez a d metros (calcula uma vez por metro e por campo)
    const k = Math.max(4, Math.min(34, Math.round(d))), chave = F.id + k;
    if (tabelaCruz[chave]) return tabelaCruz[chave];
    let lo = 0, hi = 1;
    for (let i = 0; i < 12; i++) {
      const pw = (lo + hi) / 2, x0 = -F.L + 1, b = newBall(F); b.x = x0; b.y = F.ballR;
      kick(b, { x: x0 - 0.6, y: 0, z: 0, id: "_" }, "cruzamento", pw, -Math.PI / 2, 0, 0, F);
      let t = 0, subiu = false;
      while (t < 4) { stepBall(F, b, [], 1 / 60); t += 1 / 60; if (b.y > 1) subiu = true; if (subiu && b.y <= F.ballR + 0.01) break; }
      if (b.x - x0 > k) hi = pw; else lo = pw;
    }
    return (tabelaCruz[chave] = { power: (lo + hi) / 2 });
  }
  // lançamento: procura (simulando a bola) a força que faz ela chegar no companheiro já devagar, e quanto tempo leva.
  // Guarda numa tabela de metro em metro (calcula uma vez só por distância).
  const tabelaLanc = {};
  function lancamento(d, F = MODES.pes) {
    const k = Math.max(LANCA_D, Math.min(34, Math.round(d))), chave = F.id + k;
    if (tabelaLanc[chave]) return tabelaLanc[chave];
    let lo = 0, hi = 1, tempo = 1;
    for (let i = 0; i < 12; i++) {
      // simula ao longo do comprimento do campo (40 m), saindo de perto de uma linha de fundo
      const pw = (lo + hi) / 2, x0 = -F.L + 1, b = newBall(F); b.x = x0; b.y = F.ballR;
      kick(b, { x: x0 - 0.6, y: 0, z: 0, id: "_" }, "lancamento", pw, -Math.PI / 2, 0, 0, F);
      let t = 0, passou = false;
      while (t < 4) { stepBall(F, b, [], 1 / 60); t += 1 / 60; if (b.x - x0 >= k) { passou = Math.hypot(b.vx, b.vz) > 1.5 || b.y > 0.5; break; } if (b.vx === 0 && b.vz === 0) break; }
      if (passou) hi = pw; else lo = pw; // passou dele ainda rápido: menos força
      if (b.x - x0 >= k) tempo = t;
    }
    return (tabelaLanc[chave] = { power: (lo + hi) / 2, t: tempo });
  }

  // ======================================================================
  // Passe assistido (como no FIFA), em três tipos
  //   curto (toque no A / J): rasteiro, na medida para chegar no pé de quem recebe
  //   longo (A / J segurado por 1 s): cavado, passa por cima de quem está no meio e cai perto do receptor
  //   profundidade, a "bola enfiada" (Y / L): mira à frente de quem corre, para ele apostar corrida
  // Um toque no botão já garante força para a bola chegar. O passe curto procura num cone largo (45° para cada lado)
  // e, sem ninguém nele, ainda olha até 75° antes de virar passe no espaço; o erro dele é a metade do normal.
  // ======================================================================
  const PASSE_S = {
    cone: (60 / 2) * Math.PI / 180, // cone de 60° (30° para cada lado da direção mandada)
    coneAssist: 45 * Math.PI / 180, // passe curto (toque): 45° para cada lado
    coneLargo: 75 * Math.PI / 180,  // ...e, se não achar ninguém, até 75°
    alcance: 34,                    // ninguém mais longe que isso entra na conta
    vChega: 3,                      // um toque: a bola chega no pé com ~3 m/s (fácil de dominar)
    extra: 13,                      // força cheia: +13 m/s na saída
    vMax: 32,                       // teto da velocidade de saída
    folga: 2.5,                     // profundidade: quantos metros à frente de quem corre
    vMorre: 1.5,                    // profundidade: a bola chega quase parando no ponto (ele alcança na corrida)
    elevLongo: 0.62,                // ângulo de saída do passe longo (rad): sobe bem acima da cabeça (1,8 m)
  };
  // ---- a bola rolando (a física do campo): a cada instante ela perde a mesma fração da velocidade ----
  //   dv/dt = −k·v  →  v(t) = v0·e^(−k·t)                         (k = F.roll)
  //   x(t) = ∫ v dt = (v0/k)·(1 − e^(−k·t))
  //   juntando as duas: v(x) = v0 − k·x     (a velocidade cai em linha reta com a distância!)
  //   por isso: para chegar a d metros com velocidade vf, precisa sair com v0 = k·d + vf
  //   e o tempo até lá é t(d) = −ln(1 − k·d/v0) / k   (se v0 ≤ k·d, a bola para antes: tempo infinito)
  // A bola sai ~0,6 m na frente do pé, então a conta usa d − 0,6.
  const v0Rolando = (F, d, vf) => F.roll * Math.max(0, d - 0.6) + vf;
  function tRolando(F, d, v0) { const r = 1 - (F.roll * Math.max(0, d - 0.6)) / v0; return r <= 0.02 ? Infinity : -Math.log(r) / F.roll; }
  // ---- escolher quem recebe: o companheiro mais viável dentro do cone ----
  //   para cada um: ângulo entre a direção mandada (u) e a direção até ele, e a distância.
  //   nota = ângulo/cone (0 no meio do cone, 1 na borda) + distância/30 (o mais perto ganha no empate).
  //   Fora do cone (ou longe demais), não conta. Ninguém no cone: passe no espaço.
  function escolherReceptor(p, yaw, mates, cone = PASSE_S.cone) {
    const ux = -Math.sin(yaw), uz = -Math.cos(yaw);
    let best = null, nota = Infinity;
    for (const m of mates) {
      const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz);
      if (d < 1.5 || d > PASSE_S.alcance) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * ux + dz * uz) / d)));
      if (ang > cone) continue;
      const n = ang / cone + d / 30;
      if (n < nota) { nota = n; best = m; }
    }
    return best;
  }
  // ---- vetor de interceptação (passe em profundidade e passe para quem está correndo) ----
  //   O receptor está em R0 e corre com velocidade V (constante). A bola sai de B0 com v0 e anda d em t(d).
  //   Queremos o ponto P onde os dois chegam JUNTOS:
  //       P = R0 + V·t + L·û        (L = folga à frente na direção da corrida û; 0 no passe curto)
  //       t = t(|P − B0|, v0)      (o tempo da bola até P, pela fórmula do rolamento acima)
  //   A incógnita aparece dos dois lados, então resolvemos por iteração de ponto fixo:
  //       t₀ = 0 → P₀ → d₀ = |P₀ − B0| → t₁ = t(d₀) → P₁ → ...
  //   Converge em poucas voltas porque a bola é bem mais rápida que o jogador (a cada volta o erro em t é
  //   multiplicado por mais ou menos |V|/v_bola < 1). Se v0 não alcança, devolve null (aí aumentamos v0).
  function interceptar(F, B0, R0, V, v0, folga) {
    const sp = Math.hypot(V.x, V.z), ux = sp > 0.5 ? V.x / sp : 0, uz = sp > 0.5 ? V.z / sp : 0;
    let t = 0, P = null;
    for (let i = 0; i < 8; i++) {
      P = { x: R0.x + V.x * t + ux * folga, z: R0.z + V.z * t + uz * folga };
      const d = Math.hypot(P.x - B0.x, P.z - B0.z), t2 = tRolando(F, d, v0);
      if (!isFinite(t2)) return null;
      if (Math.abs(t2 - t) < 0.005) { t = t2; break; }
      t = t2;
    }
    return { x: P.x, z: P.z, t, d: Math.hypot(P.x - B0.x, P.z - B0.z) };
  }
  // ---- passe longo: a velocidade (no ângulo fixo) para a bola QUICAR a d metros ----
  // A bola no ar tem gravidade, arrasto e o "sobe" do chute: em vez de fórmula fechada, simulamos uma vez por metro
  // (busca binária na velocidade) e guardamos numa tabela por campo, como o lançamento do futsal.
  const tabelaLongo = {};
  function velLongo(F, d) {
    const k = Math.max(5, Math.min(36, Math.round(d))), chave = F.id + k;
    if (tabelaLongo[chave]) return tabelaLongo[chave];
    let lo = 4, hi = 34, tempo = 1;
    for (let i = 0; i < 14; i++) {
      const v = (lo + hi) / 2, x0 = -F.L + 1, b = newBall(F); b.x = x0; b.y = F.ballR;
      kick(b, { x: x0 - 0.6, y: 0, z: 0, id: "_" }, "longo", 1, -Math.PI / 2, 0, 0, F, { vel: v, elev: PASSE_S.elevLongo });
      let t = 0, subiu = false;
      while (t < 5) { stepBall(F, b, [], 1 / 60); t += 1 / 60; if (b.y > 1) subiu = true; if (subiu && b.y <= F.ballR + 0.01) break; }
      if (b.x - x0 > k) hi = v; else lo = v;
      tempo = t;
    }
    return (tabelaLongo[chave] = { v: (lo + hi) / 2, t: tempo });
  }
  // ---- erro do passe: cresce com a distância e com marcador colado no passador ----
  //   desvio padrão do ângulo σ = 0,01 + 0,002·d (+0,05 se tiver adversário a menos de 1,6 m)
  //   o sorteio é aproximadamente normal (soma de 3 uniformes), e a velocidade varia ±metade disso.
  function erroPasse(d, pressao, rnd = Math.random) {
    const sig = 0.01 + 0.002 * d + (pressao ? 0.05 : 0), g = () => (rnd() + rnd() + rnd() - 1.5) / 0.5; // ~N(0,1)
    return { dYaw: g() * sig, kVel: 1 + g() * sig * 0.5 };
  }
  // ---- planeja o passe: devolve { kind, yaw, vel, elev, alvo, ponto } (o chute de verdade é kick(...opts)) ----
  //   p: quem passa {x, z}; yaw: direção mandada; mates: [{id, x, z, vx, vz}]; tipo: curto|longo|profundidade;
  //   forca: 0..1 (tempo segurando o botão); pressao: tem adversário colado?; ataque: +1/−1 (para onde é o gol)
  //   o.assist: passe de toque (cone largo, procura até 75° e metade do erro)
  function planejarPasse(F, p, yaw, mates, tipo, forca, pressao = false, ataque = 1, rnd = Math.random, o = {}) {
    const B0 = { x: p.x, z: p.z };
    const alvo = o.assist ? escolherReceptor(p, yaw, mates, PASSE_S.coneAssist) || escolherReceptor(p, yaw, mates, PASSE_S.coneLargo) : escolherReceptor(p, yaw, mates);
    let ponto, vel, elev = tipo === "longo" ? PASSE_S.elevLongo : 0.02;
    if (!alvo) { // ninguém no cone: passe no espaço, na direção exata, com a força da barra
      const d = tipo === "longo" ? 12 + forca * 14 : 8 + forca * 16;
      ponto = { x: p.x - Math.sin(yaw) * d, z: p.z - Math.cos(yaw) * d };
      vel = tipo === "longo" ? velLongo(F, d).v : v0Rolando(F, d, PASSE_S.vChega + forca * 4);
    } else {
      const R0 = { x: alvo.x, z: alvo.z }, V = { x: alvo.vx || 0, z: alvo.vz || 0 };
      // profundidade: se ele está parado, a folga vai na direção do gol que atacamos
      const folga = tipo === "profundidade" ? PASSE_S.folga : 0;
      const Vf = tipo === "profundidade" && Math.hypot(V.x, V.z) < 0.5 ? { x: ataque * 0.6, z: 0 } : V;
      if (tipo === "longo") { // pelo alto: o tempo de voo vem da tabela; mira onde ele vai estar quando ela cair
        let P = R0;
        for (let i = 0; i < 4; i++) { const d = Math.hypot(P.x - B0.x, P.z - B0.z), lg = velLongo(F, d); P = { x: R0.x + V.x * lg.t, z: R0.z + V.z * lg.t }; }
        const d = Math.max(5, Math.hypot(P.x - B0.x, P.z - B0.z) - 1); // quica ~1 m antes e chega rolando
        ponto = P; vel = velLongo(F, d).v * (1 + forca * 0.06);
      } else {
        // rasteiro: a menor velocidade que chega (v0 = k·d + vf) mais o que a força acrescenta; refaz a
        // interceptação com essa velocidade (bola mais rápida = encontra ele mais cedo, ponto mais atrás)
        const vf = tipo === "profundidade" ? PASSE_S.vMorre : PASSE_S.vChega;
        let d = Math.hypot(R0.x - B0.x, R0.z - B0.z), I = null;
        // (na profundidade a força pesa metade: bola forte demais passa de quem corre)
        vel = Math.min(PASSE_S.vMax, v0Rolando(F, d, vf) + forca * PASSE_S.extra * (tipo === "profundidade" ? 0.5 : 1));
        for (let i = 0; i < 4; i++) {
          I = interceptar(F, B0, R0, Vf, vel, folga);
          if (I) break;
          vel = Math.min(PASSE_S.vMax, vel + 3); // não alcança: mais forte
        }
        if (I) { d = I.d; vel = Math.max(vel, v0Rolando(F, d, vf)); ponto = I; }
        else ponto = R0;
      }
    }
    const dist = Math.hypot(ponto.x - B0.x, ponto.z - B0.z), er = erroPasse(dist, pressao, rnd);
    if (o.assist) { er.dYaw *= 0.5; er.kVel = 1 + (er.kVel - 1) * 0.5; }
    return { kind: tipo, yaw: Math.atan2(-(ponto.x - B0.x), -(ponto.z - B0.z)) + er.dYaw, vel: Math.min(PASSE_S.vMax, vel * er.kVel), elev, alvo: alvo ? alvo.id : null, ponto };
  }
  // ---- "trava" do passe (lock-on sutil): perto do receptor, a bola vai se ajeitando para o pé dele ----
  //   Quando a bola está a menos de 2,6 m do receptor e indo na direção dele, giramos a velocidade (sem mudar o
  //   tamanho) um pouco por quadro para o ponto logo na frente do pé (0,45 m na frente do corpo), e a menos de
  //   1,4 m seguramos a velocidade relativa em 5,5 m/s (o domínio e a condução fazem o resto, ou ele chuta de primeira).
  function travaPasse(b, bodies, dt) {
    if (!b.alvoPasse) return;
    b.alvoT = (b.alvoT || 0) + dt;
    const r = bodies && bodies.find((q) => q.id === b.alvoPasse);
    if (!r || b.alvoT > 4 || b.dono) { b.alvoPasse = null; return; }
    const fx = r.x - Math.sin(r.yaw || 0) * 0.45, fz = r.z - Math.cos(r.yaw || 0) * 0.45, dx = fx - b.x, dz = fz - b.z, d = Math.hypot(dx, dz);
    const sp = Math.hypot(b.vx, b.vz);
    if (d > 2.6 || d < 0.05 || sp < 0.5 || (b.vx * dx + b.vz * dz) <= 0 || b.y > 1.6) return;
    const k = Math.min(1, dt * 7), nx = b.vx / sp + (dx / d - b.vx / sp) * k, nz = b.vz / sp + (dz / d - b.vz / sp) * k, nl = Math.hypot(nx, nz) || 1;
    b.vx = (nx / nl) * sp; b.vz = (nz / nl) * sp;
    if (d < 1.4) { const rvx = b.vx - (r.vx || 0), rvz = b.vz - (r.vz || 0), rs = Math.hypot(rvx, rvz); if (rs > 5.5) { b.vx = (r.vx || 0) + rvx / rs * 5.5; b.vz = (r.vz || 0) + rvz / rs * 5.5; } }
  }

  const api = { MODES, campoDe, COND, PASSE_S, planejarPasse, escolherReceptor, interceptar, velLongo, tRolando, v0Rolando, erroPasse, P_R, P_H, RUN, SPRINT, CHARGING, KICK_CD, CAR, KITS, CARS, SKINS, ARENAS, kitOf, kitColor, kitColor2, spawns, inArea,
    movePlayer, corpoACorpo, moveCar, newBall, stepBall, simulate, landing, assistShot, goalOf, canKick, kick, assistPass, assistCross, arenaSDF, rampa };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Campo = api;
})(typeof window !== "undefined" ? window : globalThis);
