// Festa da Galera — os minijogos: regras, física da arena e os robôs. O servidor roda tudo (festa.js); o navegador
// usa só o nome, a regra e os controles de cada um para mostrar na tela.
// Cada minijogo: { id, nome, emoji, tipo ("arena": bonecos andando numa plataforma; "tela": botões na tela),
//   dur (segundos, no máximo), regra, controles, iniciar(m, rnd), passo(m, dt, rnd), entrada(m, j, d) (tela),
//   robo(m, j, dt, rnd), acabou(m), ranking(m) -> grupos de ids do 1º ao último (empate no mesmo grupo), snap(m) }.
// m = { t (segundos desde o começo), dur, js: { id: jogador }, ...coisas do minijogo }.
(function (root) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot;
  const r2 = (v) => Math.round(v * 100) / 100;
  const vivos = (m) => Object.values(m.js).filter((j) => j.vivo);
  const sorteio = (rnd, a, b) => a + rnd() * (b - a);
  const gauss = (rnd) => (rnd() + rnd() + rnd() - 1.5) / 0.5;

  // ---------- arena: os bonecos andando ----------
  const VEL = 6, ACEL = 34, PULO = 6.2, G = 18, RAIO = 0.45;
  function posicionar(m, raio = 4) {
    const lista = Object.values(m.js);
    lista.forEach((j, i) => { const a = (i / lista.length) * Math.PI * 2; Object.assign(j, { x: Math.cos(a) * raio, z: Math.sin(a) * raio, y: 0, vx: 0, vz: 0, vy: 0, vivo: true, saiu: null, pts: 0, cd: 0, tonto: 0, face: a + Math.PI, inp: j.inp || { dx: 0, dz: 0, p: 0, a: 0 }, usadoP: (j.inp || {}).p || 0, usadoA: (j.inp || {}).a || 0 }); });
  }
  // apertou o pulo / a ação desde a última vez? (o navegador manda contadores, então nenhum toque se perde)
  const apertou = (j, k) => { const c = j.inp[k] || 0, u = k === "p" ? "usadoP" : "usadoA"; if (c !== j[u]) { j[u] = c; return true; } return false; };
  function mover(m, j, dt, vel = VEL) {
    const inp = j.tonto > 0 ? { dx: 0, dz: 0 } : j.inp, l = Math.min(1, hyp(inp.dx || 0, inp.dz || 0)) || 0;
    const tx = l ? (inp.dx / hyp(inp.dx, inp.dz)) * vel * l : 0, tz = l ? (inp.dz / hyp(inp.dx, inp.dz)) * vel * l : 0, v = hyp(j.vx, j.vz);
    if (v > vel + 0.5) { const k = Math.max(0, v - 13 * dt) / v; j.vx *= k; j.vz *= k; } // levou um empurrão: escorrega
    else { const dx = tx - j.vx, dz = tz - j.vz, d = hyp(dx, dz), a = ACEL * dt; if (d <= a) { j.vx = tx; j.vz = tz; } else { j.vx += (dx / d) * a; j.vz += (dz / d) * a; } }
    if (l > 0.2) j.face = Math.atan2(inp.dz, inp.dx);
    j.x += j.vx * dt; j.z += j.vz * dt;
    if (j.y > 0 || j.vy > 0) { j.vy -= G * dt; j.y = Math.max(0, j.y + j.vy * dt); if (j.y === 0) j.vy = 0; }
    j.cd = Math.max(0, j.cd - dt); j.tonto = Math.max(0, j.tonto - dt);
  }
  const pular = (j) => { if (j.y === 0) { j.vy = PULO; j.y = 0.001; } };
  // empurrão (sumô e colina): um tranco para onde está olhando
  const empurrao = (j, forca = 12) => { if (j.cd > 0 || j.tonto > 0) return false; j.vx = Math.cos(j.face) * forca; j.vz = Math.sin(j.face) * forca; j.cd = 1.2; return true; };
  // ninguém atravessa ninguém; quem vem rápido empurra quem está parado
  function colisoes(m, quique = 0.7) {
    const l = vivos(m);
    for (let i = 0; i < l.length; i++) for (let k = i + 1; k < l.length; k++) {
      const a = l[i], b = l[k], dx = b.x - a.x, dz = b.z - a.z, d = hyp(dx, dz) || 0.001;
      if (d >= RAIO * 2 || Math.abs(a.y - b.y) > 1) continue;
      const nx = dx / d, nz = dz / d, sobra = (RAIO * 2 - d) / 2;
      a.x -= nx * sobra; a.z -= nz * sobra; b.x += nx * sobra; b.z += nz * sobra;
      const vn = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      if (vn < 0) { const im = (-(1 + quique) * vn) / 2; a.vx -= im * nx; a.vz -= im * nz; b.vx += im * nx; b.vz += im * nz; }
    }
  }
  const prenderNoCirculo = (j, R) => { const d = hyp(j.x, j.z); if (d > R) { j.x *= R / d; j.z *= R / d; } };
  const sair = (m, j) => { if (j.vivo) { j.vivo = false; j.saiu = m.t; } };
  // ranking por quem durou mais: os vivos empatados em 1º, depois quem saiu por último
  function porSobrevivencia(m, desempate) {
    const l = Object.values(m.js), grupos = [], vivosL = l.filter((j) => j.vivo);
    if (vivosL.length) grupos.push(...agrupar(vivosL, desempate || (() => 0)));
    const mortos = l.filter((j) => !j.vivo).sort((a, b) => b.saiu - a.saiu);
    grupos.push(...agrupar(mortos, (j) => j.saiu));
    return grupos;
  }
  // agrupa uma lista já em ordem: quem tem o mesmo valor fica no mesmo grupo
  function agrupar(lista, valor) {
    const out = []; let ult;
    for (const j of lista) { const v = valor(j); if (out.length && v === ult) out[out.length - 1].push(j.id); else out.push([j.id]); ult = v; }
    return out;
  }
  const porPontos = (m) => agrupar(Object.values(m.js).sort((a, b) => b.pts - a.pts), (j) => r2(j.pts));
  const snapJ = (m) => Object.values(m.js).map((j) => [j.id, r2(j.x), r2(j.z), r2(j.y), j.vivo ? 1 : 0, r2(j.face), Math.round(j.pts * 10) / 10, j.tonto > 0 ? 1 : 0, r2(hyp(j.vx, j.vz))]);
  // robô andando para um ponto (com folga) ou fugindo de outro
  const ir = (j, x, z, folga = 0.3) => { const dx = x - j.x, dz = z - j.z, d = hyp(dx, dz); j.inp.dx = d > folga ? dx / d : 0; j.inp.dz = d > folga ? dz / d : 0; };
  const fugir = (j, x, z, R) => { let dx = j.x - x, dz = j.z - z; const d = hyp(dx, dz) || 1; dx /= d; dz /= d; const c = hyp(j.x, j.z); if (c > R * 0.7) { dx -= (j.x / c) * 1.2; dz -= (j.z / c) * 1.2; } const n = hyp(dx, dz) || 1; j.inp.dx = dx / n; j.inp.dz = dz / n; };
  const maisPerto = (j, lista) => lista.filter((o) => o !== j).sort((a, b) => hyp(a.x - j.x, a.z - j.z) - hyp(b.x - j.x, b.z - j.z))[0];
  const robP = (j) => { j.inp.p = (j.inp.p || 0) + 1; }, robA = (j) => { j.inp.a = (j.inp.a || 0) + 1; };

  const MJ = {};

  // 1. Batata quente
  MJ.batata = {
    nome: "Batata quente", emoji: "💣", tipo: "arena", dur: 90,
    regra: "Quem está com a bomba passa ela encostando em alguém. Quando ela explode, quem está com ela sai. O último que sobrar ganha.",
    controles: "Ande com WASD ou as setas.",
    iniciar(m, rnd) { posicionar(m, 5); m.R = 8.5; this.novaBomba(m, rnd); },
    novaBomba(m, rnd) { const l = vivos(m); m.com = l[Math.floor(rnd() * l.length)].id; m.explode = m.t + sorteio(rnd, 13, 19) * (l.length > 3 ? 1 : 0.85); m.passe = 0.8; },
    passo(m, dt, rnd) {
      m.passe = Math.max(0, m.passe - dt);
      for (const j of vivos(m)) { mover(m, j, dt, j.id === m.com ? 6.8 : VEL); prenderNoCirculo(j, m.R); }
      colisoes(m);
      const dono = m.js[m.com];
      if (m.passe <= 0 && dono) { const alvo = vivos(m).find((o) => o !== dono && hyp(o.x - dono.x, o.z - dono.z) < 1.05); if (alvo) { m.com = alvo.id; m.passe = 0.6; m.ev.push(["passou", alvo.id]); } }
      if (m.t >= m.explode) { m.ev.push(["boom", m.com]); sair(m, m.js[m.com]); if (vivos(m).length > 1) this.novaBomba(m, rnd); else m.com = null; }
    },
    robo(m, j) { const dono = m.js[m.com]; if (!dono) return; if (j.id === m.com) { const o = maisPerto(j, vivos(m)); if (o) ir(j, o.x, o.z, 0); } else fugir(j, dono.x, dono.z, m.R); },
    acabou: (m) => vivos(m).length <= 1,
    ranking: (m) => porSobrevivencia(m),
    snap: (m) => ({ com: m.com, falta: m.com ? r2(Math.max(0, m.explode - m.t)) : 0 }),
  };

  // 2. Pular o laser
  MJ.laser = {
    nome: "Pular o laser", emoji: "🔴", tipo: "arena", dur: 80,
    regra: "Um laser gira rente ao chão. Pule na hora em que ele passar! Encostou no laser, saiu. Ele vai ficando mais rápido.",
    controles: "Ande com WASD · Espaço pula.",
    iniciar(m, rnd) { posicionar(m, 4); m.R = 7.5; m.feixes = [{ a: rnd() * 6.28, w: 1.3 }]; },
    passo(m, dt) {
      if (m.t > 28 && m.feixes.length < 2) m.feixes.push({ a: m.feixes[0].a + Math.PI, w: -m.feixes[0].w });
      for (const j of vivos(m)) { if (apertou(j, "p")) pular(j); mover(m, j, dt); prenderNoCirculo(j, m.R); }
      colisoes(m);
      for (const f of m.feixes) {
        const a0 = f.a; f.w = Math.sign(f.w) * (1.3 + m.t * 0.035); f.a += f.w * dt;
        for (const j of vivos(m)) {
          if (j.y > 0.32) continue;
          const th = Math.atan2(j.z, j.x), d0 = Math.atan2(Math.sin(th - a0), Math.cos(th - a0)), d1 = Math.atan2(Math.sin(th - f.a), Math.cos(th - f.a));
          if (Math.sign(d0) !== Math.sign(d1) && Math.abs(d0) < 1) { m.ev.push(["zap", j.id]); sair(m, j); }
        }
      }
    },
    robo(m, j, dt, rnd) {
      ir(j, Math.cos(m.t * 0.3 + j.x) * 3, Math.sin(m.t * 0.3 + j.z) * 3, 1);
      if (j.y > 0) return;
      const th = Math.atan2(j.z, j.x);
      for (const f of m.feixes) { const d = Math.atan2(Math.sin(th - f.a), Math.cos(th - f.a)), tempo = d / f.w; if (tempo > 0 && tempo < (j.reflexo || (j.reflexo = sorteio(rnd, 0.1, 0.24)))) { if (rnd() > 0.04) robP(j); j.reflexo = sorteio(rnd, 0.1, 0.24); } }
    },
    acabou: (m) => vivos(m).length <= 1,
    ranking: (m) => porSobrevivencia(m),
    snap: (m) => ({ f: m.feixes.map((f) => r2(f.a)) }),
  };

  // 3. Chuva de moedas
  MJ.moedas = {
    nome: "Chuva de moedas", emoji: "🪙", tipo: "arena", dur: 60,
    regra: "Caem moedas do céu: pegue o máximo que der. A dourada vale 3. Cuidado com as bombas: quem estiver perto fica tonto e perde 2 moedas.",
    controles: "Ande com WASD ou as setas.",
    iniciar(m) { posicionar(m, 3); m.R = 8; m.itens = []; m.prox = 0; m.seq = 0; },
    passo(m, dt, rnd) {
      m.prox -= dt;
      if (m.prox <= 0) { m.prox = 0.32; const a = rnd() * 6.28, r = Math.sqrt(rnd()) * (m.R - 0.6), k = rnd(); m.itens.push({ id: ++m.seq, x: Math.cos(a) * r, z: Math.sin(a) * r, y: 9, tipo: k < 0.12 ? "ouro" : k < 0.32 ? "bomba" : "moeda", chao: 0 }); }
      for (const j of vivos(m)) { mover(m, j, dt); prenderNoCirculo(j, m.R); }
      colisoes(m);
      for (const it of m.itens) {
        if (it.y > 0) { it.y = Math.max(0, it.y - 7 * dt); if (it.y === 0 && it.tipo === "bomba") { it.fora = true; m.ev.push(["boom", it.x, it.z]); for (const j of vivos(m)) if (hyp(j.x - it.x, j.z - it.z) < 1.8) { j.tonto = 1.4; j.pts = Math.max(0, j.pts - 2); } } continue; }
        it.chao += dt; if (it.chao > 4) it.fora = true;
      }
      for (const it of m.itens) if (!it.fora && it.tipo !== "bomba" && it.y < 1.2) for (const j of vivos(m)) if (hyp(j.x - it.x, j.z - it.z) < 0.85) { j.pts += it.tipo === "ouro" ? 3 : 1; it.fora = true; m.ev.push(["pegou", j.id]); break; }
      m.itens = m.itens.filter((it) => !it.fora);
    },
    robo(m, j) {
      const bomba = m.itens.find((it) => it.tipo === "bomba" && hyp(it.x - j.x, it.z - j.z) < 2.2);
      if (bomba) return fugir(j, bomba.x, bomba.z, m.R);
      const alvo = m.itens.filter((it) => it.tipo !== "bomba" && it.y < 4).sort((a, b) => hyp(a.x - j.x, a.z - j.z) - (b.tipo === "ouro" ? 2 : 0) - hyp(b.x - j.x, b.z - j.z) + (a.tipo === "ouro" ? 2 : 0))[0];
      if (alvo) ir(j, alvo.x, alvo.z, 0); else ir(j, 0, 0, 1);
    },
    acabou: () => false,
    ranking: porPontos,
    snap: (m) => ({ it: m.itens.map((it) => [it.id, r2(it.x), r2(it.z), r2(it.y), it.tipo[0]]) }),
  };

  // 4. Sumô
  MJ.sumo = {
    nome: "Sumô", emoji: "🤼", tipo: "arena", dur: 75,
    regra: "Empurre todo mundo para fora da plataforma. Ela vai encolhendo! Quem cair, sai. O último em cima ganha.",
    controles: "Ande com WASD · Espaço dá o empurrão (para onde você está olhando).",
    iniciar(m) { posicionar(m, 4.5); m.R = 8; },
    passo(m, dt) {
      m.R = Math.max(3.6, 8 - m.t * 0.07);
      for (const j of vivos(m)) { if (apertou(j, "a") && empurrao(j)) m.ev.push(["tranco", j.id]); mover(m, j, dt); }
      colisoes(m, 0.95);
      for (const j of vivos(m)) if (hyp(j.x, j.z) > m.R + 0.2) { m.ev.push(["caiu", j.id]); sair(m, j); }
    },
    robo(m, j, dt, rnd) {
      const c = hyp(j.x, j.z);
      if (c > m.R - 2.2) return ir(j, 0, 0, 0);
      const o = maisPerto(j, vivos(m)); if (!o) return;
      ir(j, o.x, o.z, 0);
      if (hyp(o.x - j.x, o.z - j.z) < 2 && rnd() < dt * 1.4) { j.face = Math.atan2(o.z - j.z, o.x - j.x); robA(j); }
    },
    acabou: (m) => vivos(m).length <= 1,
    ranking: (m) => porSobrevivencia(m),
    snap: (m) => ({ R: r2(m.R) }),
  };

  // 5. Chão que cai
  const N = 12, TAM = 1.6;
  const ladrilho = (x, z) => { const i = Math.floor(x / TAM + N / 2), k = Math.floor(z / TAM + N / 2); return i >= 0 && k >= 0 && i < N && k < N ? k * N + i : -1; };
  MJ.chao = {
    nome: "Chão que cai", emoji: "🟥", tipo: "arena", dur: 90,
    regra: "Cada ladrilho que você pisa fica vermelho e cai logo depois (e só volta um tempo depois, cada vez mais devagar). Não fique parado e não caia no buraco! O último em pé ganha.",
    controles: "Ande com WASD · Espaço pula (dá para pular um buraco).",
    iniciar(m) { posicionar(m, 4); m.lad = Array(N * N).fill(-1); }, // -1: inteiro; senão: quando foi pisado
    passo(m, dt) {
      const volta = 1.1 + 3 + m.t * 0.12; // o buraco fecha depois de um tempo, cada vez maior
      for (let i = 0; i < m.lad.length; i++) if (m.lad[i] >= 0 && m.t - m.lad[i] > volta) m.lad[i] = -1;
      for (const j of vivos(m)) {
        if (apertou(j, "p")) pular(j);
        mover(m, j, dt, 5.4);
        const L = TAM * N / 2; j.x = clamp(j.x, -L - 1, L + 1); j.z = clamp(j.z, -L - 1, L + 1);
        if (j.y > 0) continue;
        const i = ladrilho(j.x, j.z);
        if (i < 0 || (m.lad[i] >= 0 && m.t - m.lad[i] > 1.1)) { m.ev.push(["caiu", j.id]); sair(m, j); continue; }
        if (m.lad[i] < 0) m.lad[i] = m.t;
      }
      colisoes(m);
    },
    robo(m, j, dt, rnd) {
      const aqui = ladrilho(j.x, j.z);
      if (!j.alvo || m.t > j.trocar || (m.lad[j.alvo] >= 0)) {
        // só destinos com o caminho todo inteiro (sem ladrilho pisado no meio), de preferência pertinho
        const cx = (i) => ((i % N) - N / 2 + 0.5) * TAM, cz = (i) => (Math.floor(i / N) - N / 2 + 0.5) * TAM;
        const livre = (i) => { const d = hyp(cx(i) - j.x, cz(i) - j.z), n = Math.ceil(d / 0.4); for (let k = 1; k <= n; k++) { const t = ladrilho(j.x + ((cx(i) - j.x) * k) / n, j.z + ((cz(i) - j.z) * k) / n), chega = (d * k) / n / 5.4; if (t < 0 || (t !== aqui && m.lad[t] >= 0 && m.t + chega - m.lad[t] > 0.95)) return false; } return true; }; // o ladrilho ainda vai estar lá quando ele passar?
        const livres = []; for (let i = 0; i < N * N; i++) if (m.lad[i] < 0 && i !== aqui && livre(i)) livres.push(i);
        livres.sort((a, b) => hyp(cx(a) - j.x, cz(a) - j.z) - hyp(cx(b) - j.x, cz(b) - j.z));
        if (!livres.length) for (let i = 0; i < N * N; i++) if (m.lad[i] < 0 && i !== aqui) livres.push(i); // sem caminho limpo: vai pulando
        livres.sort((a, b) => hyp(cx(a) - j.x, cz(a) - j.z) - hyp(cx(b) - j.x, cz(b) - j.z));
        j.alvo = livres.length ? livres[Math.min(livres.length - 1, Math.floor(rnd() * 3))] : null; j.trocar = m.t + 0.9;
      }
      if (j.alvo == null) return;
      ir(j, ((j.alvo % N) - N / 2 + 0.5) * TAM, (Math.floor(j.alvo / N) - N / 2 + 0.5) * TAM, 0.1);
      const fx = j.x + j.inp.dx * 0.9, fz = j.z + j.inp.dz * 0.9, f = ladrilho(fx, fz);
      if (j.y === 0 && f >= 0 && f !== aqui && m.lad[f] >= 0 && m.t - m.lad[f] > 0.4) robP(j);
    },
    acabou: (m) => vivos(m).length <= 1,
    ranking: (m) => porSobrevivencia(m),
    snap: (m) => ({ l: m.lad.map((v) => (v < 0 ? 0 : m.t - v > 1.1 ? 2 : 1)).join("") }),
  };

  // 6. Pega-pega zumbi
  MJ.zumbi = {
    nome: "Pega-pega zumbi", emoji: "🧟", tipo: "arena", dur: 60,
    regra: "Começa com zumbi no meio da galera. Quem o zumbi pegar vira zumbi também. Quem não for pego até o fim ganha.",
    controles: "Ande com WASD ou as setas.",
    iniciar(m, rnd) {
      posicionar(m, 5.5); m.R = 9;
      const l = Object.values(m.js), n = l.length >= 6 ? 2 : 1;
      for (let i = 0; i < n; i++) { const livres = l.filter((j) => !j.zumbi); const z = livres[Math.floor(rnd() * livres.length)]; z.zumbi = true; z.inicial = true; z.saiu = 0; }
      for (const j of l) j.pegou = 0;
    },
    passo(m, dt) {
      for (const j of Object.values(m.js)) { mover(m, j, dt, j.zumbi ? 5.4 : 6.2); prenderNoCirculo(j, m.R); }
      const l = Object.values(m.js);
      for (const z of l.filter((j) => j.zumbi)) for (const h of l.filter((j) => !j.zumbi)) if (!h.zumbi && hyp(h.x - z.x, h.z - z.z) < 0.95) { h.zumbi = true; h.saiu = m.t; h.tonto = 2; z.tonto = 0.8; z.pegou++; m.ev.push(["pegou", h.id]); } // quem vira zumbi demora 2 s para "acordar"
      colisoesTodos(m);
    },
    robo(m, j) {
      const l = Object.values(m.js);
      if (j.zumbi) { const alvo = l.filter((o) => !o.zumbi).sort((a, b) => hyp(a.x - j.x, a.z - j.z) - hyp(b.x - j.x, b.z - j.z))[0]; if (alvo) ir(j, alvo.x + alvo.vx * 0.3, alvo.z + alvo.vz * 0.3, 0); }
      else { // foge de todos os zumbis (os mais perto pesam mais) e não se encurrala na beirada
        let fx = 0, fz = 0; for (const z of l.filter((o) => o.zumbi && o.tonto <= 0)) { const dx = j.x - z.x, dz = j.z - z.z, d2 = dx * dx + dz * dz + 0.1; fx += dx / d2; fz += dz / d2; }
        const c = hyp(j.x, j.z); if (c > m.R * 0.6) { fx -= (j.x / c) * (c / m.R) * 0.6; fz -= (j.z / c) * (c / m.R) * 0.6; }
        const n = hyp(fx, fz) || 1; j.inp.dx = fx / n; j.inp.dz = fz / n; }
    },
    acabou: (m) => Object.values(m.js).every((j) => j.zumbi),
    // humanos que escaparam em 1º; depois quem foi pego por último; os zumbis do começo pelo tanto que pegaram
    ranking(m) {
      const l = Object.values(m.js), livres = l.filter((j) => !j.zumbi), pegos = l.filter((j) => j.zumbi && !j.inicial).sort((a, b) => b.saiu - a.saiu), ini = l.filter((j) => j.inicial).sort((a, b) => b.pegou - a.pegou);
      return [...(livres.length ? [livres.map((j) => j.id)] : []), ...agrupar(pegos, (j) => j.saiu), ...agrupar(ini, (j) => j.pegou)];
    },
    snap: (m) => ({ z: Object.values(m.js).filter((j) => j.zumbi).map((j) => j.id) }),
  };
  // no pega-pega ninguém sai, então a colisão vale para todos (vivo = está no jogo)
  function colisoesTodos(m) { colisoes(m); }

  // 7. Rei da colina
  MJ.colina = {
    nome: "Rei da colina", emoji: "👑", tipo: "arena", dur: 60,
    regra: "Fique dentro do círculo dourado para ganhar pontos. Sozinho lá dentro vale o dobro! O círculo anda. Empurre quem estiver no seu caminho.",
    controles: "Ande com WASD · Espaço dá o empurrão.",
    iniciar(m, rnd) { posicionar(m, 6); m.R = 9; m.zona = { x: 0, z: 0, r: 2.2 }; m.alvo = { x: 0, z: 0 }; m.trocar = 6; },
    passo(m, dt, rnd) {
      if (m.t > m.trocar) { const a = rnd() * 6.28, r = sorteio(rnd, 2, 6); m.alvo = { x: Math.cos(a) * r, z: Math.sin(a) * r }; m.trocar = m.t + 8; }
      const dx = m.alvo.x - m.zona.x, dz = m.alvo.z - m.zona.z, d = hyp(dx, dz); if (d > 0.05) { const s = Math.min(d, 1.6 * dt) / d; m.zona.x += dx * s; m.zona.z += dz * s; }
      for (const j of vivos(m)) { if (apertou(j, "a") && empurrao(j, 12)) m.ev.push(["tranco", j.id]); mover(m, j, dt); prenderNoCirculo(j, m.R); }
      colisoes(m, 0.9);
      const dentro = vivos(m).filter((j) => hyp(j.x - m.zona.x, j.z - m.zona.z) < m.zona.r);
      for (const j of dentro) j.pts += dt * (dentro.length === 1 ? 2 : 1);
    },
    robo(m, j, dt, rnd) { ir(j, m.zona.x, m.zona.z, 0.6); const o = maisPerto(j, vivos(m)); if (o && hyp(o.x - j.x, o.z - j.z) < 2 && rnd() < 0.05) { j.face = Math.atan2(o.z - j.z, o.x - j.x); robA(j); } },
    acabou: () => false,
    ranking: (m) => agrupar(Object.values(m.js).sort((a, b) => b.pts - a.pts), (j) => Math.floor(j.pts)),
    snap: (m) => ({ zx: r2(m.zona.x), zz: r2(m.zona.z), zr: m.zona.r }),
  };

  // 8. Chuva de meteoros
  MJ.meteoros = {
    nome: "Chuva de meteoros", emoji: "☄️", tipo: "arena", dur: 70,
    regra: "Meteoros caem onde aparece a sombra vermelha. Saia de baixo! Cada um tem 3 vidas. Quem durar mais ganha.",
    controles: "Ande com WASD ou as setas.",
    iniciar(m) { posicionar(m, 4); m.R = 8; m.met = []; m.prox = 1; m.seq = 0; for (const j of Object.values(m.js)) { j.vidas = 3; j.inv = 0; } },
    passo(m, dt, rnd) {
      m.prox -= dt;
      if (m.prox <= 0) {
        m.prox = Math.max(0.28, 0.8 - m.t * 0.008);
        const l = vivos(m), mira = l.length && rnd() < 0.45 ? l[Math.floor(rnd() * l.length)] : null, a = rnd() * 6.28, r = Math.sqrt(rnd()) * (m.R - 0.5);
        m.met.push({ id: ++m.seq, x: mira ? mira.x + gauss(rnd) * 0.8 : Math.cos(a) * r, z: mira ? mira.z + gauss(rnd) * 0.8 : Math.sin(a) * r, cai: m.t + 1.1 });
      }
      for (const j of vivos(m)) { mover(m, j, dt); prenderNoCirculo(j, m.R); j.inv = Math.max(0, j.inv - dt); }
      colisoes(m);
      for (const mt of m.met) if (m.t >= mt.cai && !mt.foi) {
        mt.foi = true; m.ev.push(["boom", mt.x, mt.z]);
        for (const j of vivos(m)) if (j.inv <= 0 && hyp(j.x - mt.x, j.z - mt.z) < 1.35) { j.vidas--; j.inv = 1.2; j.tonto = 0.5; m.ev.push(["ai", j.id]); if (j.vidas <= 0) sair(m, j); }
      }
      m.met = m.met.filter((mt) => m.t - mt.cai < 0.6);
    },
    robo(m, j) { const perigo = m.met.filter((mt) => !mt.foi && hyp(mt.x - j.x, mt.z - j.z) < 1.9).sort((a, b) => a.cai - b.cai)[0]; if (perigo) fugir(j, perigo.x, perigo.z, m.R); else ir(j, Math.cos(m.t * 0.4 + j.x) * 2.5, Math.sin(m.t * 0.4) * 2.5, 1); },
    acabou: (m) => vivos(m).length <= 1,
    ranking: null, // logo abaixo: entre os vivos, quem tem mais vidas fica na frente
    snap: (m) => ({ m: m.met.map((mt) => [mt.id, r2(mt.x), r2(mt.z), r2(mt.cai - m.t)]), v: Object.fromEntries(Object.values(m.js).map((j) => [j.id, j.vidas])) }),
  };
  // nos meteoros, entre os vivos, quem tem mais vidas fica na frente
  MJ.meteoros.ranking = (m) => { const l = Object.values(m.js), v = l.filter((j) => j.vivo).sort((a, b) => b.vidas - a.vidas), mortos = l.filter((j) => !j.vivo).sort((a, b) => b.saiu - a.saiu); return [...agrupar(v, (j) => j.vidas), ...agrupar(mortos, (j) => j.saiu)]; };

  // ---------- jogos de tela ----------
  // 9. Cronômetro cego
  MJ.cronometro = {
    nome: "Cronômetro cego", emoji: "⏱️", tipo: "tela", dur: 75,
    regra: "Pare o cronômetro no tempo pedido. Ele aparece só nos primeiros 3 segundos, depois some: conte de cabeça! São 3 tentativas; ganha quem errar menos no total.",
    controles: "Espaço, clique ou toque para parar.",
    iniciar(m, rnd) { m.rodada = 0; m.rodadas = 3; for (const j of Object.values(m.js)) { j.erro = 0; j.parou = null; } this.nova(m, rnd); },
    nova(m, rnd) { m.alvo = Math.round(sorteio(rnd, 6, 12) * 10) / 10; m.ini = m.t + 2.5; for (const j of Object.values(m.js)) j.parou = null; m.rodada++; },
    entrada(m, j, d) { if (d.tipo === "parar" && j.parou == null && m.t >= m.ini) { j.parou = clamp(+d.s || 0, 0, m.alvo + 6); } },
    passo(m, dt, rnd) {
      const l = Object.values(m.js), fim = m.ini + m.alvo + 5;
      if (m.t >= fim || (m.t > m.ini && l.every((j) => j.parou != null))) {
        for (const j of l) { const e = j.parou == null ? 5 : Math.abs(j.parou - m.alvo); j.erro += e; j.ult = j.parou == null ? null : r2(j.parou); }
        m.ev.push(["rodada", m.rodada, m.alvo]);
        if (m.rodada >= m.rodadas) m.fim = true; else this.nova(m, rnd);
      }
    },
    robo(m, j, dt, rnd) { if (j.parou == null && m.t >= m.ini) { if (j.quer == null || j.queria !== m.rodada) { j.quer = m.alvo + gauss(rnd) * 0.55; j.queria = m.rodada; } if (m.t - m.ini >= j.quer) j.parou = r2(m.t - m.ini); } },
    acabou: (m) => !!m.fim,
    ranking: (m) => agrupar(Object.values(m.js).sort((a, b) => a.erro - b.erro), (j) => r2(j.erro)),
    snap: (m) => ({ alvo: m.alvo, ini: r2(m.ini), rod: m.rodada, de: m.rodadas, p: Object.fromEntries(Object.values(m.js).map((j) => [j.id, [j.parou != null ? 1 : 0, r2(j.erro), j.ult ?? null]])) }),
  };

  // 10. Reflexo
  MJ.reflexo = {
    nome: "Reflexo", emoji: "⚡", tipo: "tela", dur: 75,
    regra: "Espere a tela ficar VERDE e aperte o mais rápido que puder. Apertou antes da hora, leva 1 segundo de castigo. 8 rodadas: ganha quem tiver o menor tempo somado.",
    controles: "Espaço, clique ou toque.",
    iniciar(m, rnd) { m.rodada = 0; for (const j of Object.values(m.js)) j.soma = 0; this.nova(m, rnd); },
    nova(m, rnd) { m.rodada++; m.verde = m.t + sorteio(rnd, 1.6, 4.2); for (const j of Object.values(m.js)) j.r = null; },
    entrada(m, j, d) { if (d.tipo === "aperta" && j.r == null && d.rodada === m.rodada) { const ms = +d.ms; j.r = d.cedo || !(ms >= 0) ? 1 : clamp(ms, 0.08, 1); } },
    passo(m, dt, rnd) {
      const l = Object.values(m.js);
      if (m.t > m.verde + 1.6 || (m.t > m.verde && l.every((j) => j.r != null))) {
        for (const j of l) { j.soma += j.r == null ? 1 : j.r; j.ult = j.r == null ? 1 : j.r; }
        m.ev.push(["rodada", m.rodada]);
        if (m.rodada >= 8) m.fim = true; else this.nova(m, rnd);
      }
    },
    robo(m, j, dt, rnd) { if (j.r == null && m.t >= m.verde) { if (j.rodadaR !== m.rodada) { j.rodadaR = m.rodada; j.tempo = sorteio(rnd, 0.21, 0.42); } if (m.t - m.verde >= j.tempo) j.r = r2(j.tempo); } },
    acabou: (m) => !!m.fim,
    ranking: (m) => agrupar(Object.values(m.js).sort((a, b) => a.soma - b.soma), (j) => r2(j.soma)),
    snap: (m) => ({ rod: m.rodada, verde: r2(m.verde), p: Object.fromEntries(Object.values(m.js).map((j) => [j.id, [j.r != null ? 1 : 0, r2(j.soma), j.ult ?? null]])) }),
  };

  // 11. Conta os bichos
  const BICHOS = ["🐔", "🐷", "🐮", "🐑", "🐶", "🐸", "🦆", "🐢"];
  MJ.bichos = {
    nome: "Conta os bichos", emoji: "🐔", tipo: "tela", dur: 50,
    regra: "Vai passar uma bicharada correndo pela tela. Conte só o bicho que for pedido no fim! Ganha quem chegar mais perto do número certo.",
    controles: "Depois, escolha o número com os botões e confirme.",
    iniciar(m, rnd) {
      const tipos = BICHOS.slice().sort(() => rnd() - 0.5).slice(0, 3); m.tipos = tipos; m.alvo = tipos[0];
      m.desfile = []; let t = 1.5; const n = Math.floor(sorteio(rnd, 42, 58));
      for (let i = 0; i < n; i++) { t += sorteio(rnd, 0.15, 0.6); m.desfile.push([tipos[Math.floor(rnd() * 3)], r2(t), Math.floor(rnd() * 5), rnd() < 0.5 ? 1 : -1, r2(sorteio(rnd, 2.2, 3.4))]); }
      m.certo = m.desfile.filter((b) => b[0] === m.alvo).length; m.pergunta = t + 3.5; m.prazo = m.pergunta + 12;
      for (const j of Object.values(m.js)) { j.resp = null; j.quando = null; }
    },
    entrada(m, j, d) { if (d.tipo === "resp" && j.resp == null && m.t >= m.pergunta) { j.resp = clamp(Math.round(+d.n || 0), 0, 99); j.quando = m.t; } },
    passo(m) { if (m.t >= m.prazo || (m.t > m.pergunta && Object.values(m.js).every((j) => j.resp != null))) m.fim = true; },
    robo(m, j, dt, rnd) { if (j.resp == null && m.t >= m.pergunta + (j.pensa || (j.pensa = sorteio(rnd, 2, 7)))) { j.resp = Math.max(0, Math.round(m.certo + gauss(rnd) * 1.6)); j.quando = m.t; } },
    acabou: (m) => !!m.fim,
    ranking: (m) => { const err = (j) => (j.resp == null ? 99 : Math.abs(j.resp - m.certo)); return agrupar(Object.values(m.js).sort((a, b) => err(a) - err(b) || (a.quando ?? 99) - (b.quando ?? 99)), (j) => err(j) + "|" + (err(j) === 0 ? 0 : j.quando)); },
    snap: (m) => ({ d: m.desfile, alvo: m.alvo, perg: r2(m.pergunta), prazo: r2(m.prazo), certo: m.t >= m.prazo || m.fim ? m.certo : null, p: Object.fromEntries(Object.values(m.js).map((j) => [j.id, m.fim ? j.resp : j.resp != null ? -1 : null])) }),
  };

  // 12. Enche o balão
  MJ.balao = {
    nome: "Enche o balão", emoji: "🎈", tipo: "tela", dur: 30,
    regra: "Cada bombada enche o seu balão (1 ponto). Mas cada balão estoura num ponto secreto diferente! Pare antes de estourar: estourou, fica com zero. Ganha o maior balão.",
    controles: "Espaço/clique enche · P ou o botão Parar guarda.",
    iniciar(m, rnd) { for (const j of Object.values(m.js)) { j.n = 0; j.lim = Math.floor(sorteio(rnd, 18, 60)); j.estado = "enchendo"; j.ult = 0; } m.ini = m.t + 2; m.fimT = m.ini + 22; },
    entrada(m, j, d) {
      if (j.estado !== "enchendo" || m.t < m.ini) return;
      if (d.tipo === "bomba") { if (m.t - j.ult < 0.06) return; j.ult = m.t; j.n++; if (j.n >= j.lim) { j.estado = "estourou"; m.ev.push(["pof", j.id]); } }
      if (d.tipo === "parar") j.estado = "guardou";
    },
    passo(m) { if (m.t >= m.fimT) for (const j of Object.values(m.js)) if (j.estado === "enchendo") j.estado = "guardou"; },
    robo(m, j, dt, rnd) { if (j.estado !== "enchendo" || m.t < m.ini) return; if (j.quer == null) j.quer = Math.floor(sorteio(rnd, 14, 48)); if (j.n >= j.quer) { j.estado = "guardou"; return; } if (rnd() < dt * 8) { this.entrada(m, j, { tipo: "bomba" }); } },
    acabou: (m) => m.t >= m.ini && Object.values(m.js).every((j) => j.estado !== "enchendo"),
    ranking: (m) => { const v = (j) => (j.estado === "estourou" ? -1 : j.n); return agrupar(Object.values(m.js).sort((a, b) => v(b) - v(a)), v); },
    snap: (m) => ({ ini: r2(m.ini), fim: r2(m.fimT), p: Object.fromEntries(Object.values(m.js).map((j) => [j.id, [j.n, { enchendo: "n", estourou: "x", guardou: "g" }[j.estado]]])) }), // n: enchendo · x: estourou · g: guardou
  };

  // 13. Sequência de cores
  MJ.sequencia = {
    nome: "Sequência de cores", emoji: "🟩", tipo: "tela", dur: 100,
    regra: "As cores piscam numa ordem: repita a sequência apertando as cores. A cada rodada vem uma cor a mais. Errou, saiu. O último que sobrar ganha.",
    controles: "Clique/toque nas cores, ou as teclas 1, 2, 3 e 4.",
    iniciar(m, rnd) { m.seq = [0, 1, 2].map(() => Math.floor(rnd() * 4)); m.rodada = 0; for (const j of Object.values(m.js)) { j.vivo = true; j.saiu = null; j.pos = 0; } this.nova(m, rnd); },
    nova(m, rnd) { m.rodada++; if (m.rodada > 1) m.seq.push(Math.floor(rnd() * 4)); m.mostra = m.t + 1; m.vez = m.mostra + m.seq.length * 0.6 + 0.3; m.prazo = m.vez + 2.5 + m.seq.length * 0.7; for (const j of Object.values(m.js)) j.pos = 0; },
    entrada(m, j, d) {
      if (d.tipo !== "cor" || !j.vivo || m.t < m.vez || j.pos >= m.seq.length) return;
      if (+d.c === m.seq[j.pos]) j.pos++; else { sair(m, j); m.ev.push(["errou", j.id]); }
    },
    passo(m, dt, rnd) {
      const l = vivos(m);
      if (m.t >= m.prazo || (m.t >= m.vez && l.every((j) => j.pos >= m.seq.length))) {
        for (const j of l) if (j.pos < m.seq.length) sair(m, j);
        if (vivos(m).length <= 1 || m.rodada >= 14) m.fim = true; else this.nova(m, rnd);
      }
    },
    robo(m, j, dt, rnd) { if (!j.vivo || m.t < m.vez || j.pos >= m.seq.length) return; if (rnd() < dt * 2.5) this.entrada(m, j, { tipo: "cor", c: rnd() < 0.985 - m.seq.length * 0.018 ? m.seq[j.pos] : (m.seq[j.pos] + 1) % 4 }); },
    acabou: (m) => !!m.fim,
    ranking: (m) => porSobrevivencia(m),
    snap: (m) => ({ s: m.t < m.vez ? m.seq : null, n: m.seq.length, mostra: r2(m.mostra), vez: r2(m.vez), prazo: r2(m.prazo), rod: m.rodada, p: Object.fromEntries(Object.values(m.js).map((j) => [j.id, [j.vivo ? 1 : 0, j.pos]])) }),
  };

  // 14. Tiro ao alvo
  MJ.alvo = {
    nome: "Tiro ao alvo", emoji: "🎯", tipo: "tela", dur: 60,
    regra: "Os alvos aparecem na tela. Quem acertar primeiro leva o ponto (o dourado vale 3). Ganha quem fizer mais pontos.",
    controles: "Clique ou toque no alvo.",
    iniciar(m) { m.alvos = []; m.prox = 1.5; m.seq = 0; m.total = 0; for (const j of Object.values(m.js)) j.pts = 0; },
    entrada(m, j, d) { if (d.tipo !== "tiro") return; const a = m.alvos.find((x) => x.id === +d.id); if (!a || a.dono) return; a.dono = j.id; j.pts += a.ouro ? 3 : 1; m.ev.push(["acertou", j.id, a.id]); },
    passo(m, dt, rnd) {
      m.prox -= dt;
      if (m.prox <= 0 && m.total < 26) { m.prox = sorteio(rnd, 0.9, 1.8); m.total++; m.alvos.push({ id: ++m.seq, x: r2(sorteio(rnd, 0.08, 0.92)), y: r2(sorteio(rnd, 0.12, 0.88)), nasce: m.t, ouro: rnd() < 0.12 }); }
      m.alvos = m.alvos.filter((a) => !a.dono && m.t - a.nasce < 2.8 || (a.dono && m.t - a.nasce < 3.2 && (a.mostrou = (a.mostrou || 0) + dt) < 0.5));
      if (m.total >= 26 && !m.alvos.length) m.fim = true;
    },
    robo(m, j, dt, rnd) { for (const a of m.alvos) if (!a.dono && m.t - a.nasce > (a["r" + j.id] || (a["r" + j.id] = sorteio(rnd, 0.55, 1.6)))) { this.entrada(m, j, { tipo: "tiro", id: a.id }); break; } },
    acabou: (m) => !!m.fim,
    ranking: porPontos,
    snap: (m) => ({ a: m.alvos.map((a) => [a.id, a.x, a.y, a.dono || 0, a.ouro ? 1 : 0]), p: Object.fromEntries(Object.values(m.js).map((j) => [j.id, j.pts])) }),
  };

  // 15. Conta de cabeça
  MJ.conta = {
    nome: "Conta de cabeça", emoji: "🧮", tipo: "tela", dur: 80,
    regra: "Aparece uma conta e quatro respostas. Quem acertar primeiro ganha 2 pontos; quem acertar depois, 1. Errou, fica sem nessa. São 10 contas.",
    controles: "Clique/toque na resposta, ou as teclas 1, 2, 3 e 4.",
    iniciar(m, rnd) { m.q = 0; for (const j of Object.values(m.js)) j.pts = 0; this.nova(m, rnd); },
    nova(m, rnd) {
      m.q++; const op = Math.floor(rnd() * 3); let a, b, c, txt;
      if (op === 0) { a = Math.floor(sorteio(rnd, 12, 80)); b = Math.floor(sorteio(rnd, 5, 60)); c = a + b; txt = `${a} + ${b}`; }
      else if (op === 1) { a = Math.floor(sorteio(rnd, 30, 99)); b = Math.floor(sorteio(rnd, 5, a)); c = a - b; txt = `${a} − ${b}`; }
      else { a = Math.floor(sorteio(rnd, 3, 13)); b = Math.floor(sorteio(rnd, 3, 10)); c = a * b; txt = `${a} × ${b}`; }
      const ops = new Set([c]); while (ops.size < 4) ops.add(Math.max(0, c + (Math.floor(rnd() * 13) - 6 || 7)));
      m.conta = { txt, certo: c, ops: [...ops].sort(() => rnd() - 0.5), ini: m.t + 0.8, fim: m.t + 8, primeiro: null };
      for (const j of Object.values(m.js)) j.resp = null;
    },
    entrada(m, j, d) { const c = m.conta; if (d.tipo !== "resp" || j.resp != null || m.t < c.ini || d.q !== m.q) return; j.resp = +d.v; if (j.resp === c.certo) { j.pts += c.primeiro ? 1 : 2; if (!c.primeiro) c.primeiro = j.id; } },
    passo(m, dt, rnd) { const c = m.conta; if (m.t >= c.fim || (m.t > c.ini && Object.values(m.js).every((j) => j.resp != null))) { m.ev.push(["conta", m.q, c.certo]); if (m.q >= 10) m.fim = true; else this.nova(m, rnd); } },
    robo(m, j, dt, rnd) { const c = m.conta; if (j.resp != null || m.t < c.ini) return; if (j.qR !== m.q) { j.qR = m.q; j.pensa = sorteio(rnd, 1.6, 5); } if (m.t - c.ini >= j.pensa) this.entrada(m, j, { tipo: "resp", q: m.q, v: rnd() < 0.8 ? c.certo : c.ops[Math.floor(rnd() * 4)] }); },
    acabou: (m) => !!m.fim,
    ranking: porPontos,
    snap: (m) => ({ q: m.q, txt: m.conta.txt, ops: m.conta.ops, ini: r2(m.conta.ini), fim: r2(m.conta.fim), certo: m.t >= m.conta.fim ? m.conta.certo : null, prim: m.conta.primeiro, p: Object.fromEntries(Object.values(m.js).map((j) => [j.id, [j.pts, j.resp != null ? 1 : 0]])) }),
  };

  for (const [id, mj] of Object.entries(MJ)) mj.id = id;
  // moedas por colocação (empatados levam as da melhor posição do grupo)
  const MOEDAS = [10, 7, 5, 3, 2, 1, 1, 1];
  function premiar(grupos) { const out = {}; let pos = 0; for (const g of grupos) { for (const id of g) out[id] = { pos: pos + 1, moedas: MOEDAS[Math.min(pos, MOEDAS.length - 1)] }; pos += g.length; } return out; }

  // roda um minijogo do começo ao fim (servidor): novo(), passo(), e o resultado
  function novo(id, ids, rnd = Math.random) { const mj = MJ[id], m = { id, t: 0, dur: mj.dur, js: {}, ev: [] }; for (const pid of ids) m.js[pid] = { id: pid, inp: { dx: 0, dz: 0, p: 0, a: 0 } }; mj.iniciar(m, rnd); return m; }
  function passo(m, dt, robos, rnd = Math.random) { const mj = MJ[m.id]; m.t += dt; for (const id of robos) if (m.js[id] && (mj.tipo === "tela" || m.js[id].vivo !== false)) mj.robo(m, m.js[id], dt, rnd); mj.passo(m, dt, rnd); return m.t >= m.dur || mj.acabou(m); }
  const snap = (m) => ({ id: m.id, t: r2(m.t), dur: m.dur, j: MJ[m.id].tipo === "arena" ? snapJ(m) : null, e: MJ[m.id].snap(m) });

  const api = { MJ, LISTA: Object.keys(MJ), MOEDAS, premiar, novo, passo, snap, N, TAM };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Minijogos = api;
})(typeof window !== "undefined" ? window : globalThis);
