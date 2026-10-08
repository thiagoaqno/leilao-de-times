// Ginásio da Galera — motor da batalha em tempo real.
// Roda igual no servidor e no navegador: o servidor decide dano, acertos, desmaios e fim da partida.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../galeramon/dados.js"), require("../galeramon/pokemon.js"), require("../galeramon/naruto.js"), require("../galeramon/lideres.js"));
  else root.Ginasio = factory(root.Galeramon, root.PokeDex, root.NarutoDex, root.Lideres);
})(typeof self !== "undefined" ? self : this, function (Galeramon, PokeDex, NarutoDex, Lideres) {
  const DEX = { galeramon: Galeramon, pokemon: PokeDex, naruto: NarutoDex };
  const ARENA = {
    w: 18, h: 12,
    pilares: [
      { x: -3.2, y: -2.1, r: 0.62 }, { x: 3.2, y: -2.1, r: 0.62 },
      { x: -3.2, y: 2.1, r: 0.62 }, { x: 3.2, y: 2.1, r: 0.62 },
    ],
  };
  const RAIO_BICHO = 0.34;
  const TEMPO_MAX = 240;
  const TROCA_RECARGA = 10;
  const ENTRADA_DESMAIO = 2;
  const K_DANO = 0.48;
  const K_DANO_POKEMON = 0.18;
  const LEVEL_K = (2 * 50) / 5 + 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const norm = (x, y, fallback = { x: 1, y: 0 }) => {
    const l = Math.hypot(x, y);
    return l > 1e-6 ? { x: x / l, y: y / l, l } : { x: fallback.x, y: fallback.y, l: 0 };
  };

  // O mesmo sorteio com semente usado no simulador do Leilão.
  function sorteDe(txt) {
    let a = 2166136261;
    for (const ch of String(txt)) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const stageMult = (D, n) => (D.stageMult ? D.stageMult(n || 0) : n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
  const spec = (p, bicho) => p.dex.MONS[bicho.as || bicho.id];
  const ativo = (j) => j.time[j.ativo];
  const vivo = (m) => m.hp > 0;
  const emCampo = (e) => e.campo && e.bicho && e.bicho.hp > 0;
  // quem está voando alto ou debaixo da terra não pode ser acertado
  const alcancavel = (e) => emCampo(e) && !e.oculto;

  // golpes que viram movimento: o bicho some (voando, cavando, mergulhando ou nas sombras) e cai em cima do alvo
  const SUMIR = { fly: "voo", bounce: "voo", dig: "cova", escavar: "cova", mergulho: "mergulho", shadowforce: "sombra" };
  const DURACAO_SUMIR = { voo: 1.1, cova: 1, mergulho: 1, sombra: 0.9 };
  // golpes de giro: viram investida, e o bicho gira no caminho
  const GIROS = new Set(["gyroball", "flamewheel", "rolamento", "cambalhota"]);

  function habilidadeDeGolpe(id, mv) {
    if (!mv) throw new Error(`Golpe desconhecido: ${id}`);
    const poder = Math.max(0, Number(mv.p) || 0);
    const precisao = clamp(Number(mv.a) || 100, 1, 100);
    const fisico = mv.c !== "s";
    const base = {
      id, nome: mv.n || id, tipo: mv.t || "Normal", poder, precisao, fisico,
      recarga: clamp(1.5 + poder / 40, 1, 6),
      velocidade: 6 + (precisao / 100) * 4,
      largura: 0.14 + (precisao / 100) * 0.16,
      raio: 1.5,
      alcance: 5,
      mv,
    };
    if (mv.counter) return { ...base, classe: "escudo", recarga: 8 };
    if (mv.metronome) return { ...base, classe: "metronomo", recarga: 2.5 };
    if (mv.transform) return { ...base, classe: "transformar", recarga: 10 };
    if (mv.bellydrum) return { ...base, classe: "tambor", recarga: 12 };
    if (mv.heal && poder <= 0) return { ...base, classe: "cura", recarga: 8 };
    if (mv.halve) return { ...base, classe: "projetil", especial: "metade", poder: 1, recarga: 3.8, velocidade: 7.2, largura: 0.22 };
    if (mv.self && poder <= 0 && !mv.foe) return { ...base, classe: "reforco", recarga: 8 };
    if (mv.foe && poder <= 0) return { ...base, classe: "debuff", recarga: 4.5, velocidade: 4.6, largura: 0.24 };
    if (SUMIR[id] && poder > 0) {
      const jeito = SUMIR[id];
      return { ...base, classe: "sumir", jeito, duracao: DURACAO_SUMIR[jeito], raio: 1.3, alcance: 5.5, recarga: clamp(2.5 + poder / 40, 3, 6) };
    }
    if (GIROS.has(id) && poder > 0) return { ...base, classe: "investida", giro: true, alcance: 3.2, velocidade: 11, recarga: clamp(1.4 + poder / 50, 1, 3.5) };
    if (poder > 0 && mv.pri > 0) return { ...base, classe: "investida", alcance: 3, velocidade: 13, recarga: clamp(1.1 + poder / 55, 1, 3.5) };
    if (poder >= 100) return { ...base, classe: "area", aviso: 0.7, raio: 1.5, alcance: 5 };
    if (poder > 0 && !fisico) return { ...base, classe: "projetil" };
    if (poder > 0) return { ...base, classe: "corpo", alcance: 1.2, arco: Math.PI / 2 };
    return { ...base, classe: "nada", recarga: 1.5 };
  }

  function habilidadesDoDex(modo) {
    const D = DEX[modo] || DEX.galeramon;
    return Object.fromEntries(Object.entries(D.MOVES).map(([id, mv]) => [id, habilidadeDeGolpe(id, mv)]));
  }

  function novoBicho(D, id) {
    const m = D.MONS[id];
    return { id, hp: m.hp, max: m.hp, st: { atk: 0, def: 0, spd: 0 }, usos: {}, mods: [], cds: [0, 0, 0, 0], as: null, folga: false, ...(D.CHAKRA_MAX && { chakra: D.CHAKRA_START }) };
  }

  function timePadrao(D, lado, slot) {
    const ids = D.IDS.length >= 6 ? D.IDS : D.DEFAULT_TEAM;
    return [0, 1, 2].map((i) => ids[(lado * 3 + slot * 5 + i) % ids.length]);
  }

  function jogadoresDoLado(lados, lado) {
    const l = Array.isArray(lados) ? lados[lado] : null;
    if (Array.isArray(l)) return l;
    if (l && Array.isArray(l.jogadores)) return l.jogadores;
    if (l && Array.isArray(l.players)) return l.players;
    return l ? [l] : [];
  }

  function criarPartida(config = {}, lados = []) {
    const modo = DEX[config.modo] ? config.modo : "galeramon";
    const dex = DEX[modo];
    const formato = config.formato === "2x2" ? "2x2" : "1x1";
    const porLado = formato === "2x2" ? 2 : 1;
    const p = {
      modo, dex, formato, porLado,
      t: 0, seq: 1, fim: false, vencedor: null, empate: false,
      duracao: config.duracao || TEMPO_MAX,
      rng: sorteDe(config.seed || "ginasio"),
      lados: [{ jogadores: [] }, { jogadores: [] }],
      entidades: [], projeteis: [], areas: [], ev: [], arena: ARENA,
    };
    for (let lado = 0; lado < 2; lado++) {
      const lista = jogadoresDoLado(lados, lado);
      for (let slot = 0; slot < porLado; slot++) {
        const raw = lista[slot] || {};
        // o robô usa o time do líder (no lado de lá) ou um dos times temáticos, sorteado
        const lider = lado === 1 && Lideres && Lideres.de(config.lider);
        const doRobo = () => (lider ? lider.times[modo].slice() : Lideres ? Lideres.timeDeRobo(modo, p.rng) : timePadrao(dex, lado, slot));
        const team = dex.cleanTeam(raw.time || raw.team || raw.bichos || doRobo());
        const j = {
          id: raw.id || `bot${lado + 1}${slot + 1}`,
          nome: raw.nome || raw.name || `Robô ${lado + 1}-${slot + 1}`,
          bot: raw.bot !== false && (raw.bot || !lista[slot]),
          lado, slot, ativo: 0, trocaCd: 0, entradaEm: 0, ...(modo === "naruto" && { substitutes: 2 }),
          time: team.map((id) => novoBicho(dex, id)),
        };
        p.lados[lado].jogadores.push(j);
        p.entidades.push(criarEntidade(p, j));
      }
    }
    return p;
  }

  function criarEntidade(p, j) {
    const x = j.lado === 0 ? -6 : 6;
    const y = (j.slot ? 2 : -2) * (j.lado === 0 ? 1 : -1);
    return {
      id: j.id, lado: j.lado, slot: j.slot, jogador: j, bicho: ativo(j),
      x, y, vx: 0, vy: 0, mira: { x: j.lado === 0 ? 1 : -1, y: 0 },
      campo: true, raio: RAIO_BICHO, invulneravel: 0, esquivaCd: 0, esquivaT: 0,
      dash: null, canal: null, escudo: null, impedido: 0, oculto: null,
    };
  }

  function comandoDe(comandos, e) {
    if (!comandos) return {};
    if (Array.isArray(comandos)) return comandos.find((c) => c && (c.id === e.id || c.id === e.jogador.id)) || {};
    return comandos[e.id] || comandos[e.jogador.id] || comandos[`${e.lado}:${e.slot}`] || {};
  }

  function dirMov(c) {
    const x = Number(c.dx ?? c.x ?? c.ax ?? 0);
    const y = Number(c.dy ?? c.y ?? c.ay ?? 0);
    const d = norm(x, y, { x: 0, y: 0 });
    return d.l > 1 ? { x: d.x, y: d.y } : { x, y };
  }

  function dirMira(e, c) {
    if (c.alvo) return norm(Number(c.alvo.x) - e.x, Number(c.alvo.y) - e.y, e.mira);
    const m = c.mira || {};
    const x = Number(m.x ?? c.mx ?? c.miraX ?? 0);
    const y = Number(m.y ?? c.my ?? c.miraY ?? 0);
    const d = norm(x, y, e.mira);
    return d.l > 1e-6 ? d : { ...e.mira, l: 1 };
  }

  function pontoMira(e, c, hab) {
    if (c.alvo) {
      const dx = Number(c.alvo.x) - e.x, dy = Number(c.alvo.y) - e.y;
      const d = norm(dx, dy, e.mira), l = Math.min(hab.alcance || 5, d.l || 0);
      return { x: e.x + d.x * l, y: e.y + d.y * l };
    }
    const m = c.mira || {};
    const raw = { x: Number(m.x ?? c.mx ?? c.miraX ?? e.mira.x), y: Number(m.y ?? c.my ?? c.miraY ?? e.mira.y) };
    const d = norm(raw.x, raw.y, e.mira);
    const l = clamp(d.l > 1.2 ? d.l : hab.alcance || 5, 0.8, hab.alcance || 5);
    return { x: e.x + d.x * l, y: e.y + d.y * l };
  }

  function velocidade(p, e) {
    const s = spec(p, e.bicho).spd || 80;
    return clamp(2.5 + ((s - 30) / 120) * 2, 2.5, 4.5) * stageMult(p.dex, e.bicho.st.spd || 0);
  }

  function limitar(e) {
    const hx = ARENA.w / 2 - e.raio, hy = ARENA.h / 2 - e.raio;
    e.x = clamp(e.x, -hx, hx);
    e.y = clamp(e.y, -hy, hy);
    for (const pilar of ARENA.pilares) {
      const dx = e.x - pilar.x, dy = e.y - pilar.y, d = Math.hypot(dx, dy), min = e.raio + pilar.r;
      if (d < min) {
        const n = norm(dx, dy, { x: 1, y: 0 });
        e.x = pilar.x + n.x * min;
        e.y = pilar.y + n.y * min;
      }
    }
  }

  function projetilBateParede(pr) {
    if (Math.abs(pr.x) > ARENA.w / 2 - pr.raio || Math.abs(pr.y) > ARENA.h / 2 - pr.raio) return true;
    return ARENA.pilares.some((p) => Math.hypot(pr.x - p.x, pr.y - p.y) < pr.raio + p.r);
  }

  function aplicarMod(p, e, delta, tempo = 6) {
    const b = e.bicho;
    const feito = {};
    for (const [k, v] of Object.entries(delta || {})) {
      const antes = b.st[k] || 0;
      b.st[k] = clamp(antes + v, -3, 3);
      feito[k] = b.st[k] - antes;
    }
    if (Object.values(feito).some((v) => v)) b.mods.push({ t: tempo, delta: feito });
    p.ev.push({ tipo: "atributo", id: e.id, delta: feito });
  }

  function atualizarMods(b, dt) {
    for (let i = b.mods.length - 1; i >= 0; i--) {
      const m = b.mods[i];
      m.t -= dt;
      if (m.t > 0) continue;
      for (const [k, v] of Object.entries(m.delta)) b.st[k] = clamp((b.st[k] || 0) - v, -3, 3);
      b.mods.splice(i, 1);
    }
  }

  function prepararGolpe(p, hab) {
    if (!hab.mv.randtype) return hab;
    const opts = Array.isArray(hab.mv.randtype) ? hab.mv.randtype : Object.keys(p.dex.TYPES).filter((t) => t !== "Normal");
    return { ...hab, tipo: opts[Math.floor(p.rng() * opts.length)] };
  }

  function alvoMaisPerto(p, e) {
    let best = null, bd = Infinity;
    for (const o of p.entidades) if (o.lado !== e.lado && emCampo(o)) {
      const d = dist(e, o);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  function usarGolpe(p, e, idx, c = {}) {
    if (!emCampo(e) || e.canal || e.impedido > 0 || e.oculto) return false;
    const b = e.bicho, spc = spec(p, b), key = spc.moves[idx], mv = p.dex.MOVES[key];
    if (!mv || b.cds[idx] > 0 || (p.modo === "naruto" && b.chakra < (mv.custo || 0))) return false;
    let hab = prepararGolpe(p, habilidadeDeGolpe(key, mv));
    if (spc.abil === "truant") {
      if (b.folga) {
        b.folga = false;
        b.cds[idx] = Math.max(b.cds[idx], 1);
        p.ev.push({ tipo: "mensagem", texto: `${spc.n} está fazendo corpo mole.` });
        return false;
      }
      b.folga = true;
    }
    if (mv.max) {
      if ((b.usos[key] || 0) >= mv.max) { p.ev.push({ tipo: "falhou", id: e.id, golpe: key }); return false; }
      b.usos[key] = (b.usos[key] || 0) + 1;
    }
    b.cds[idx] = hab.recarga;
    if (p.modo === "naruto") b.chakra -= mv.custo || 0;
    p.ev.push({ tipo: "golpe", id: e.id, golpe: key, classe: hab.classe, elemento: hab.tipo });

    if (hab.classe === "metronomo") {
      const opts = Object.entries(p.dex.MOVES).filter(([, x]) => x.p > 0);
      const [mid, mmv] = opts[Math.floor(p.rng() * opts.length)];
      hab = prepararGolpe(p, habilidadeDeGolpe(mid, mmv));
    }
    if (hab.classe === "nada") return true;
    if (hab.classe === "escudo") { e.escudo = { t: 1, tipo: mv.counter }; return true; }
    if (hab.classe === "tambor") {
      if (b.hp > Math.floor(b.max / 2) && b.st.atk < 3) {
        b.hp -= Math.floor(b.max / 2);
        b.st.atk = 3;
        p.ev.push({ tipo: "tambor", id: e.id, hp: b.hp });
      }
      return true;
    }
    if (hab.classe === "transformar") {
      const alvo = alvoMaisPerto(p, e);
      if (alvo && !alvo.oculto) { b.as = alvo.bicho.as || alvo.bicho.id; b.st = { ...alvo.bicho.st }; p.ev.push({ tipo: "transformar", id: e.id, alvo: alvo.id }); }
      return true;
    }
    if (hab.classe === "cura") { e.canal = { t: 0.8, heal: mv.heal || 0.5 }; e.vx = 0; e.vy = 0; return true; }
    if (hab.classe === "reforco") { aplicarMod(p, e, mv.self || {}); return true; }

    const mira = dirMira(e, c);
    e.mira = { x: mira.x, y: mira.y };
    if (hab.classe === "corpo") acertarCorpo(p, e, hab);
    else if (hab.classe === "sumir") sumir(p, e, c, hab);
    else if (hab.classe === "investida") e.dash = { x: mira.x, y: mira.y, falta: hab.alcance, hab, hit: new Set() };
    else if (hab.classe === "area") p.areas.push({ id: p.seq++, lado: e.lado, dono: e.id, x: pontoMira(e, c, hab).x, y: pontoMira(e, c, hab).y, r: hab.raio, t: hab.aviso, hab });
    else if (hab.classe === "projetil" || hab.classe === "debuff") p.projeteis.push({ id: p.seq++, lado: e.lado, dono: e.id, x: e.x + mira.x * 0.45, y: e.y + mira.y * 0.45, dx: mira.x, dy: mira.y, v: hab.velocidade, raio: hab.largura, vida: 1.8, hab });
    if (mv.self && hab.classe !== "reforco") aplicarMod(p, e, mv.self);
    return true;
  }

  // some agora e volta no ponto mirado quando a área cair (os dois acabam no mesmo passo)
  function sumir(p, e, c, hab) {
    const para = pontoMira(e, c, hab);
    e.oculto = { jeito: hab.jeito, t: hab.duracao, total: hab.duracao, de: { x: e.x, y: e.y }, para };
    e.vx = 0; e.vy = 0;
    p.areas.push({ id: p.seq++, lado: e.lado, dono: e.id, x: para.x, y: para.y, r: hab.raio, t: hab.duracao, hab });
    p.ev.push({ tipo: "sumiu", id: e.id, jeito: hab.jeito, elemento: hab.tipo, de: { ...e.oculto.de }, para: { ...para } });
  }

  function acertarCorpo(p, e, hab) {
    for (const o of p.entidades) if (o.lado !== e.lado && alcancavel(o)) {
      const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy);
      if (d > hab.alcance + o.raio) continue;
      const frente = (dx / (d || 1)) * e.mira.x + (dy / (d || 1)) * e.mira.y;
      if (frente >= Math.cos((hab.arco || Math.PI / 2) / 2)) aplicarDano(p, e, o, hab);
    }
  }

  function calcularDano(p, atacante, defensor, hab, op = {}) {
    const D = p.dex, mv = hab.mv || {};
    const me = atacante.bicho, foe = defensor.bicho;
    const as = spec(p, me), ds = spec(p, foe);
    const tipo = hab.tipo || mv.t || "Normal";
    const eff = D.effect(tipo, ds.types || ["Normal"]);
    const especial = mv.c === "s" && as.sat != null;
    if (eff === 0) return { dano: 0, eff, crit: false, especial };
    if (ds.abil === "wonderguard" && eff <= 1) return { dano: 0, eff, crit: false, especial };
    if (mv.halve || hab.especial === "metade") return { dano: Math.max(1, Math.floor(foe.hp / 2)), eff, crit: false, especial };
    const poder = mv.hpscale ? Math.max(1, Math.floor((hab.poder * me.hp) / me.max)) : Math.max(1, hab.poder || mv.p || 1);
    const huge = !especial && as.abil === "hugepower" ? 2 : 1;
    const A = (as[especial ? "sat" : "atk"] || as.atk || 80) * huge * stageMult(D, me.st.atk || 0);
    const Df = (ds[especial ? "sdf" : "def"] || ds.def || 80) * stageMult(D, foe.st.def || 0);
    const crit = op.critico != null ? op.critico : p.rng() < (mv.crit ? 1 / 4 : 1 / 16);
    const stab = (as.types || []).includes(tipo) ? 1.5 : 1;
    const variacao = op.variacao != null ? op.variacao : 0.9 + p.rng() * 0.1;
    const escala = p.modo === "pokemon" ? K_DANO_POKEMON : K_DANO;
    let dano = ((LEVEL_K * poder * (A / Df)) / 50 + 2) * stab * eff * (crit ? 1.5 : 1) * variacao * escala;
    return { dano: Math.max(1, Math.floor(dano)), eff, crit, especial };
  }

  function aplicarDano(p, atacante, defensor, hab) {
    if (!emCampo(defensor) || defensor.invulneravel > 0 || defensor.oculto) { p.ev.push({ tipo: "esquivou", id: defensor.id }); return false; }
    const r = calcularDano(p, atacante, defensor, hab);
    if (r.dano <= 0) { p.ev.push({ tipo: "imune", id: defensor.id, eff: r.eff }); return true; }
    const b = defensor.bicho, antes = b.hp;
    b.hp = Math.max(0, b.hp - Math.min(b.hp, r.dano));
    if (defensor.canal) defensor.canal = null;
    p.ev.push({ tipo: "dano", de: atacante.id, em: defensor.id, dano: antes - b.hp, hp: b.hp, eff: r.eff, crit: r.crit });
    if (hab.mv && hab.mv.foe && b.hp > 0 && p.rng() * 100 < (hab.mv.chance ?? 100)) aplicarMod(p, defensor, hab.mv.foe);
    if (hab.mv && hab.mv.drain && atacante.bicho.hp > 0) curar(p, atacante, (antes - b.hp) * hab.mv.drain, "drain");
    if (hab.mv && hab.mv.recoil && atacante.bicho.hp > 0) ferirRecuo(p, atacante, Math.max(1, Math.floor((antes - b.hp) * hab.mv.recoil)));
    if (defensor.escudo && defensor.escudo.t > 0 && defensor.escudo.tipo === (r.especial ? "s" : "p") && atacante.bicho.hp > 0) {
      atacante.bicho.hp = Math.max(0, atacante.bicho.hp - Math.min(atacante.bicho.hp, (antes - b.hp) * 2));
      p.ev.push({ tipo: "contra", de: defensor.id, em: atacante.id, hp: atacante.bicho.hp });
      if (atacante.bicho.hp <= 0) desmaiar(p, atacante);
    }
    if (b.hp <= 0) desmaiar(p, defensor);
    return true;
  }

  function curar(p, e, valor, motivo = "cura") {
    const b = e.bicho;
    const h = Math.min(b.max - b.hp, Math.max(1, Math.floor(valor)));
    if (h > 0) { b.hp += h; p.ev.push({ tipo: "cura", id: e.id, hp: b.hp, motivo }); }
  }

  function ferirRecuo(p, e, dano) {
    e.bicho.hp = Math.max(0, e.bicho.hp - Math.min(e.bicho.hp, dano));
    p.ev.push({ tipo: "recuo", id: e.id, hp: e.bicho.hp });
    if (e.bicho.hp <= 0) desmaiar(p, e);
  }

  function desmaiar(p, e) {
    if (!e.campo) return;
    e.campo = false; e.dash = null; e.canal = null; e.escudo = null; e.oculto = null;
    e.jogador.entradaEm = temReserva(e.jogador) ? ENTRADA_DESMAIO : 0;
    p.ev.push({ tipo: "desmaiou", id: e.id, bicho: e.bicho.id });
  }

  function temReserva(j) {
    return j.time.some((m, i) => i !== j.ativo && m.hp > 0);
  }

  function trocar(p, e, idx, forcar = false) {
    const j = e.jogador, novo = j.time[idx];
    if (!novo || novo.hp <= 0 || idx === j.ativo) return false;
    if (!forcar && (j.trocaCd > 0 || e.oculto)) return false;
    e.bicho.mods.length = 0;
    e.bicho.st = { atk: 0, def: 0, spd: 0 };
    e.bicho.as = null;
    j.ativo = idx;
    e.bicho = ativo(j);
    e.campo = true; e.invulneravel = Math.max(e.invulneravel, 0.45); e.canal = null; e.dash = null; e.oculto = null;
    if (!forcar) j.trocaCd = TROCA_RECARGA;
    const spawn = spawnDe(j.lado, j.slot);
    e.x = spawn.x; e.y = spawn.y; e.vx = 0; e.vy = 0;
    p.ev.push({ tipo: "troca", id: e.id, ativo: idx, bicho: e.bicho.id });
    return true;
  }

  function spawnDe(lado, slot) {
    return { x: lado === 0 ? -6.5 : 6.5, y: (slot ? 2.2 : -2.2) * (lado === 0 ? 1 : -1) };
  }

  function atualizarEntrada(p, e, dt) {
    const j = e.jogador;
    if (e.campo || !j.entradaEm) return;
    j.entradaEm -= dt;
    if (j.entradaEm > 0) return;
    const idx = j.time.findIndex((m, i) => i !== j.ativo && m.hp > 0);
    if (idx >= 0) trocar(p, e, idx, true);
    j.entradaEm = 0;
  }

  function esquivar(p, e, c) {
    if (!emCampo(e) || e.esquivaCd > 0 || e.oculto) return;
    if (p.modo === "naruto") {
      if (e.jogador.substitutes <= 0 || e.bicho.chakra < 20) return;
      e.jogador.substitutes--;
      e.bicho.chakra -= 20;
    }
    const mov = dirMov(c), d = norm(mov.x, mov.y, e.mira);
    e.invulneravel = Math.max(e.invulneravel, 0.25);
    e.esquivaCd = p.modo === "naruto" ? 5 : 3;
    e.esquivaT = 0.18;
    e.vx = d.x * 8;
    e.vy = d.y * 8;
    p.ev.push({ tipo: "esquiva", id: e.id });
  }

  function mover(e, dt, c, p, previsao = false) {
    if (!emCampo(e)) return;
    if (e.oculto) {
      const o = e.oculto;
      o.t = Math.max(0, o.t - dt);
      const k = 1 - o.t / o.total;
      e.x = o.de.x + (o.para.x - o.de.x) * k; e.y = o.de.y + (o.para.y - o.de.y) * k;
      if (o.t <= 0) {
        limitar(e); e.oculto = null; e.invulneravel = Math.max(e.invulneravel, 0.1);
        p.ev.push({ tipo: "voltou", id: e.id, jeito: o.jeito, x: e.x, y: e.y });
      }
      return;
    }
    if (e.dash) {
      const d = Math.min(e.dash.falta, e.dash.hab.velocidade * dt);
      e.x += e.dash.x * d; e.y += e.dash.y * d; e.dash.falta -= d; limitar(e);
      for (const o of previsao ? [] : p.entidades) if (o.lado !== e.lado && alcancavel(o) && !e.dash.hit.has(o.id) && dist(e, o) < e.raio + o.raio + 0.35) {
        e.dash.hit.add(o.id); aplicarDano(p, e, o, e.dash.hab);
      }
      if (e.dash.falta <= 0) e.dash = null;
      return;
    }
    if (e.canal || e.impedido > 0) return;
    if (e.esquivaT > 0) {
      e.x += e.vx * dt; e.y += e.vy * dt; e.esquivaT -= dt; limitar(e); return;
    }
    const m = dirMov(c);
    const d = norm(m.x, m.y, { x: 0, y: 0 });
    const v = d.l > 1e-6 ? velocidade(p, e) : 0;
    e.vx = d.x * v; e.vy = d.y * v;
    e.x += e.vx * dt; e.y += e.vy * dt;
    limitar(e);
  }

  function atualizarProjetil(p, pr, dt) {
    pr.x += pr.dx * pr.v * dt; pr.y += pr.dy * pr.v * dt; pr.vida -= dt;
    if (pr.vida <= 0 || projetilBateParede(pr)) return false;
    const dono = p.entidades.find((e) => e.id === pr.dono);
    if (!dono) return false;
    for (const o of p.entidades) if (o.lado !== pr.lado && alcancavel(o) && Math.hypot(o.x - pr.x, o.y - pr.y) < o.raio + pr.raio) {
      if (pr.hab.classe === "debuff") aplicarMod(p, o, pr.hab.mv.foe || {});
      else aplicarDano(p, dono, o, pr.hab);
      return false;
    }
    return true;
  }

  function atualizarArea(p, a, dt) {
    a.t -= dt;
    if (a.t > 0) return true;
    const dono = p.entidades.find((e) => e.id === a.dono);
    if (dono) for (const o of p.entidades) if (o.lado !== a.lado && alcancavel(o) && Math.hypot(o.x - a.x, o.y - a.y) <= a.r + o.raio) aplicarDano(p, dono, o, a.hab);
    return false;
  }

  function pensarRobo(p, e) {
    if (!emCampo(e)) return {};
    const alvo = alvoMaisPerto(p, e);
    if (!alvo) return {};
    const dx = alvo.x - e.x, dy = alvo.y - e.y, d = Math.hypot(dx, dy) || 1;
    let ideal = 3.2, golpe = null, valor = -Infinity;
    const moves = spec(p, e.bicho).moves || [];
    for (let i = 0; i < moves.length; i++) {
      if (e.bicho.cds[i] > 0 || (p.modo === "naruto" && e.bicho.chakra < (p.dex.MOVES[moves[i]].custo || 0))) continue;
      const hab = habilidadeDeGolpe(moves[i], p.dex.MOVES[moves[i]]);
      const alcance = hab.classe === "corpo" ? 1.1 : hab.classe === "investida" ? 2.5 : 4.2;
      const eff = p.dex.effect(hab.tipo, spec(p, alvo.bicho).types || ["Normal"]);
      const v = (hab.poder || 30) * Math.max(0.25, eff) / hab.recarga - Math.abs(d - alcance) * 4;
      if (v > valor) { valor = v; golpe = i; ideal = alcance; }
    }
    let mx = 0, my = 0;
    if (d > ideal + 0.35) { mx = dx / d; my = dy / d; }
    else if (d < ideal - 0.35) { mx = -dx / d; my = -dy / d; }
    const perigo = p.projeteis.some((pr) => pr.lado !== e.lado && vindoNaDirecao(pr, e));
    const cmd = { dx: mx, dy: my, mira: { x: dx, y: dy } };
    if (perigo && e.esquivaCd <= 0 && (p.modo !== "naruto" || (e.jogador.substitutes > 0 && e.bicho.chakra >= 20))) { cmd.esquiva = true; cmd.dx = -dy / d; cmd.dy = dx / d; }
    if (golpe != null && (d < 5 || valor > 4) && p.rng() < 0.18) {
      cmd.golpe = golpe;
      const hab = habilidadeDeGolpe(moves[golpe], p.dex.MOVES[moves[golpe]]);
      if (hab.classe === "area" || hab.classe === "sumir") cmd.alvo = { x: alvo.x, y: alvo.y };
    }
    if (e.bicho.hp < e.bicho.max * 0.18 && e.jogador.trocaCd <= 0) {
      const idx = e.jogador.time.findIndex((m, i) => i !== e.jogador.ativo && m.hp > m.max * 0.4);
      if (idx >= 0) cmd.troca = idx;
    }
    return cmd;
  }

  function vindoNaDirecao(pr, e) {
    const ex = e.x - pr.x, ey = e.y - pr.y;
    const frente = ex * pr.dx + ey * pr.dy;
    if (frente < 0 || frente > pr.v * 0.55) return false;
    const lateral = Math.abs(ex * pr.dy - ey * pr.dx);
    return lateral < e.raio + pr.raio + 0.35;
  }

  function ladoVivo(p, lado) {
    return p.lados[lado].jogadores.some((j) => j.time.some((m) => m.hp > 0));
  }

  function vidaPercentual(p, lado) {
    let soma = 0;
    for (const j of p.lados[lado].jogadores) for (const m of j.time) soma += m.hp / m.max;
    return soma;
  }

  function terminar(p, vencedor, empate = false) {
    p.fim = true; p.vencedor = vencedor; p.empate = empate;
    p.ev.push({ tipo: "fim", vencedor, empate });
  }

  function checarFim(p) {
    const vivos = [ladoVivo(p, 0), ladoVivo(p, 1)];
    if (!vivos[0] || !vivos[1]) return terminar(p, vivos[0] ? 0 : vivos[1] ? 1 : -1, !vivos[0] && !vivos[1]);
    if (p.t >= p.duracao) {
      const a = vidaPercentual(p, 0), b = vidaPercentual(p, 1);
      return terminar(p, a > b ? 0 : b > a ? 1 : -1, a === b);
    }
  }

  function passo(p, dt, comandos = {}) {
    if (p.fim) return p.ev;
    dt = clamp(Number(dt) || 0, 0, 0.1);
    p.ev = [];
    p.t += dt;
    for (const e of p.entidades) {
      const b = e.bicho;
      for (let i = 0; i < b.cds.length; i++) b.cds[i] = Math.max(0, b.cds[i] - dt);
      if (p.modo === "naruto" && e.campo && b.hp > 0) b.chakra = Math.min(p.dex.CHAKRA_MAX, b.chakra + dt * 8);
      atualizarMods(b, dt);
      e.invulneravel = Math.max(0, e.invulneravel - dt);
      e.esquivaCd = Math.max(0, e.esquivaCd - dt);
      e.impedido = Math.max(0, e.impedido - dt);
      if (e.escudo) { e.escudo.t -= dt; if (e.escudo.t <= 0) e.escudo = null; }
      e.jogador.trocaCd = Math.max(0, e.jogador.trocaCd - dt);
      if (e.canal) {
        e.canal.t -= dt;
        if (e.canal.t <= 0) { curar(p, e, e.bicho.max * e.canal.heal); e.canal = null; }
      }
      atualizarEntrada(p, e, dt);
    }
    for (const e of p.entidades) {
      const c = e.jogador.bot ? pensarRobo(p, e) : comandoDe(comandos, e);
      const mira = dirMira(e, c);
      e.mira = { x: mira.x, y: mira.y };
      if (c.troca != null) trocar(p, e, Number(c.troca), false);
      if (c.esquiva) esquivar(p, e, c);
      if (c.golpe != null) usarGolpe(p, e, clamp(Number(c.golpe), 0, 3), c);
      mover(e, dt, c, p);
    }
    p.projeteis = p.projeteis.filter((pr) => atualizarProjetil(p, pr, dt));
    p.areas = p.areas.filter((a) => atualizarArea(p, a, dt));
    checarFim(p);
    return p.ev;
  }

  function estado(p) {
    return {
      modo: p.modo, t: p.t, fim: p.fim, vencedor: p.vencedor, empate: p.empate,
      entidades: p.entidades.map((e) => ({ id: e.id, lado: e.lado, x: e.x, y: e.y, campo: e.campo, bicho: e.bicho.id, hp: e.bicho.hp, max: e.bicho.max, ativo: e.jogador.ativo, ...(p.modo === "naruto" && { chakra: e.bicho.chakra, substitutes: e.jogador.substitutes }) })),
      projeteis: p.projeteis.map((pr) => ({ id: pr.id, x: pr.x, y: pr.y, tipo: pr.hab.tipo })),
      areas: p.areas.map((a) => ({ id: a.id, x: a.x, y: a.y, r: a.r, t: a.t, tipo: a.hab.tipo })),
    };
  }

  // A tela preve somente o movimento. Vida, acertos, golpes e trocas continuam no servidor.
  function preverMovimento(p, e, dt, c = {}) {
    dt = clamp(Number(dt) || 0, 0, 0.1);
    e.invulneravel = Math.max(0, e.invulneravel - dt);
    e.esquivaCd = Math.max(0, e.esquivaCd - dt);
    e.impedido = Math.max(0, (e.impedido || 0) - dt);
    if (e.canal) { e.canal.t -= dt; if (e.canal.t <= 0) e.canal = null; }
    if (e.oculto) { mover(e, dt, c, p, true); return e; }
    const mira = dirMira(e, c);
    e.mira = { x: mira.x, y: mira.y };
    if (c.esquiva) esquivar(p, e, c);
    mover(e, dt, c, p, true);
    return e;
  }

  const api = { ARENA, TEMPO_MAX, K_DANO, K_DANO_POKEMON, sorteDe, criarPartida, passo, preverMovimento, pensarRobo, habilidadeDeGolpe, habilidadesDoDex, calcularDano, estado };
  return api;
});
