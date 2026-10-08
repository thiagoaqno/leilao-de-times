// Os bichos se mexendo na arena.
// - Os quadros: os Pokémon usam o GIF animado do Black/White (lido por gif.js), e os Galeramon, os quadros desenhados
//   em sprites.js. Enquanto o GIF não chega, vale o sprite parado de antes.
// - O jeito de cada momento: parado, andando, virando, golpe (com antecipação), apanhando, esquiva, investida, giro,
//   voo, buraco, mergulho, troca e desmaio. Tudo só visual: o servidor continua decidindo acertos e dano.
// - As partículas (poeira, pedrinhas, gotas, faíscas...) numa lista de tamanho fixo.
// - De costas: andando ou mirando para o fundo da quadra, o bicho vira de costas. Os Pokémon usam o GIF de costas do
//   Black/White (ou o sprite parado de costas); os Galeramon, o próprio desenho sem o rosto e um pouco mais escuro.
const animacoes = new Map(), visuais = new Map();
const ESCALA_GIF = 3.1 / 96, ESCALA_PARADO = 3.1 / 64, ESCALA_GALERAMON = 2 / PX_CARTAZ; // casas da arena por pixel do sprite (o Galeramon fica com 2 pixels do atlas por pixel)
const NAO_FLUTUAM = new Set(["doduo", "dodrio", "farfetchd", "chatot", "murkrow"]); // voadores que ficam no chão
const FLUTUAM_GALERAMON = new Set(["saci"]);
const OCULTO_VOO = 9; // quantas casas o bicho sobe ao voar (sai da tela)

function medirQuadros(lista, w, h) {
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (const px of lista) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 24) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? { cx: w / 2, pe: h, topo: 0 } : { cx: (x0 + x1 + 1) / 2, pe: y1 + 1, topo: y0 };
}
function medirCanvas(cv) { return medirQuadros([cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data], cv.width, cv.height); }
function canvasDe(rgba, w, h) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  cv.getContext("2d").putImageData(new ImageData(rgba, w, h), 0, 0);
  return cv;
}
function usarQuadros(a, quadros, atrasos, medida, escala) {
  Object.assign(a, { quadros, atrasos, total: atrasos.reduce((s, x) => s + x, 0), medida: { ...medida, escala }, pronto: true });
  a.brancos = new Map();
}
function animacaoDe(id, modo = modoAtual()) {
  const chave = `${modo}:${id}`;
  let a = animacoes.get(chave);
  if (a) return a;
  a = { id, modo, quadros: [], atrasos: [], total: 1, medida: null, piscar: null, brancos: new Map(), pronto: false, olha: modo === "pokemon" ? -1 : 1 };
  animacoes.set(chave, a);
  if (modo !== "pokemon") {
    const q = GaleramonSprite.quadros(id);
    usarQuadros(a, q.slice(0, 4), [240, 240, 240, 240], medirCanvas(q[0]), ESCALA_GALERAMON);
    a.piscar = q[4];
    return a;
  }
  a.parado = imagemDe(id, modo);
  fetch(PokeDex.spriteAnimado(id))
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((buf) => {
      const g = GifQuadros.decodificar(new Uint8Array(buf));
      usarQuadros(a, g.quadros.map((q) => canvasDe(q.rgba, g.w, g.h)), g.quadros.map((q) => q.atraso), medirQuadros(g.quadros.map((q) => q.rgba), g.w, g.h), ESCALA_GIF);
    })
    .catch(() => { a.erro = true; });
  return a;
}
// o bicho de costas (ver o começo do arquivo). Devolve null enquanto não há quadro de costas: aí vale o de frente.
function animacaoCostas(id, modo = modoAtual()) {
  const chave = `${modo}:${id}:costas`;
  let a = animacoes.get(chave);
  if (!a) {
    a = { id, modo, quadros: [], atrasos: [], total: 1, medida: null, piscar: null, brancos: new Map(), pronto: false, olha: 1, costas: true };
    animacoes.set(chave, a);
    if (modo !== "pokemon") {
      const q = GaleramonSprite.quadros(id).slice(0, 4).map(semRosto);
      usarQuadros(a, q, [240, 240, 240, 240], medirCanvas(q[0]), ESCALA_GALERAMON);
      a.olha = animacaoDe(id, modo).olha;
    } else {
      const img = new Image(); img.crossOrigin = "anonymous";
      a.parado = { img, pronto: false };
      img.onload = () => { a.parado.pronto = true; };
      img.onerror = () => { a.erroParado = true; };
      img.src = PokeDex.sprite(id, true);
      fetch(PokeDex.spriteAnimado(id, true))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((buf) => {
          const g = GifQuadros.decodificar(new Uint8Array(buf));
          usarQuadros(a, g.quadros.map((q) => canvasDe(q.rgba, g.w, g.h)), g.quadros.map((q) => q.atraso), medirQuadros(g.quadros.map((q) => q.rgba), g.w, g.h), ESCALA_GIF);
        })
        .catch(() => { a.erro = true; });
    }
  }
  return a.pronto || a.parado?.pronto ? a : null;
}
// as costas de um Galeramon: o mesmo corpo, mas os olhos, a boca e os brilhos de dentro viram a cor do corpo ao lado,
// e tudo fica um pouco mais escuro (a luz vem da frente)
function semRosto(cv) {
  const w = cv.width, h = cv.height, src = cv.getContext("2d").getImageData(0, 0, w, h), d = src.data, o = new Uint8ClampedArray(d);
  const opaco = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 24;
  const escuroOuBranco = (i) => (d[i] + d[i + 1] + d[i + 2] < 140) || (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (!opaco(x, y)) continue;
    // um detalhe de dentro do corpo (não o contorno): procura a cor do corpo mais perto na mesma linha
    if (escuroOuBranco(i) && opaco(x - 1, y) && opaco(x + 1, y) && opaco(x, y - 1) && opaco(x, y + 1)) {
      for (let k = 1; k < 5; k++) {
        const viz = [[x - k, y], [x + k, y], [x, y - k], [x, y + k]].find(([a, b]) => opaco(a, b) && !escuroOuBranco((b * w + a) * 4));
        if (viz) { const j = (viz[1] * w + viz[0]) * 4; o[i] = d[j]; o[i + 1] = d[j + 1]; o[i + 2] = d[j + 2]; break; }
      }
    }
    o[i] *= 0.82; o[i + 1] *= 0.82; o[i + 2] *= 0.86;
  }
  return canvasDe(o, w, h);
}
// o quadro de costas da vez (o GIF, ou o sprite parado enquanto o GIF carrega)
function quadroCostas(a, tempo) {
  if (a.pronto) return quadroDe(a, tempo, false);
  if (!a.reserva) {
    const img = a.parado.img, cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext("2d").drawImage(img, 0, 0);
    a.reserva = { cv, medida: { ...medirCanvas(cv), escala: ESCALA_PARADO } };
  }
  return a.reserva;
}
// o sprite parado (FireRed) enquanto o GIF carrega ou se ele falhar
function quadroReserva(a) {
  if (a.reserva) return a.reserva;
  if (!a.parado?.pronto) return null;
  const img = a.parado.img;
  try {
    const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext("2d").drawImage(img, 0, 0);
    a.reserva = { cv, medida: { ...medirCanvas(cv), escala: ESCALA_PARADO } };
  } catch { a.reserva = { cv: img, medida: { cx: 32, pe: 60, topo: 6, escala: ESCALA_PARADO } }; }
  return a.reserva;
}
function quadroDe(a, tempo, piscando) {
  if (a.pronto) {
    if (piscando && a.piscar) return { cv: a.piscar, medida: a.medida };
    let t = tempo % a.total, i = 0;
    while (i < a.atrasos.length - 1 && t >= a.atrasos[i]) { t -= a.atrasos[i]; i++; }
    return { cv: a.quadros[i], medida: a.medida };
  }
  return quadroReserva(a);
}
// a silhueta branca do quadro: o "pisca branco" de quando apanha ou entra em campo
function silhuetaBranca(a, cv) {
  let b = a.brancos.get(cv);
  if (b) return b;
  b = document.createElement("canvas"); b.width = cv.width; b.height = cv.height;
  const c = b.getContext("2d");
  c.drawImage(cv, 0, 0); c.globalCompositeOperation = "source-atop"; c.fillStyle = "#fff"; c.fillRect(0, 0, b.width, b.height);
  a.brancos.set(cv, b);
  return b;
}
function flutua(id, modo) {
  if (modo !== "pokemon") return FLUTUAM_GALERAMON.has(id);
  const m = PokeDex.MONS[id];
  return !!m && !NAO_FLUTUAM.has(id) && (m.types.includes("Voador") || m.types.includes("Fantasma"));
}
const semente = (txt) => { let h = 7; for (const ch of String(txt)) h = (h * 31 + ch.charCodeAt(0)) % 9973; return h; };

// ---------- partículas ----------
const PARTICULAS = Array.from({ length: 260 }, () => ({ vida: 0 }));
function particula(x, y, o) {
  if (movimentoReduzido.matches) return;
  const p = PARTICULAS.find((q) => q.vida <= 0);
  if (!p) return;
  Object.assign(p, { x, y, z: o.z || 0, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, g: o.g ?? 9, vida: o.vida || 0.5, total: o.vida || 0.5, cor: o.cor, tam: o.tam || 0.1, atrito: o.atrito || 0, quica: o.quica ?? 0.35 });
}
// um punhado de partículas saindo de um ponto
function espalhar(x, y, n, cores, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (o.vel ?? 2) * (0.4 + Math.random() * 0.8);
    particula(x + Math.cos(a) * (o.raio || 0), y + Math.sin(a) * (o.raio || 0) * 0.6, {
      vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: (o.sobe ?? 3) * (0.5 + Math.random() * 0.8), z: o.z || 0,
      g: o.g ?? 9, vida: (o.vida || 0.5) * (0.7 + Math.random() * 0.6), cor: cores[i % cores.length], tam: (o.tam || 0.1) * (0.7 + Math.random() * 0.6), atrito: o.atrito || 0, quica: o.quica,
    });
  }
}
function atualizarParticulas(dt) {
  for (const p of PARTICULAS) if (p.vida > 0) {
    p.vida -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= p.g * dt; p.z += p.vz * dt;
    if (p.z < 0) { p.z = 0; p.vz = -p.vz * p.quica; p.vx *= 0.6; p.vy *= 0.6; }
    if (p.atrito) { const f = Math.exp(-p.atrito * dt); p.vx *= f; p.vy *= f; }
  }
}
// na tela, por cima da cena: z é a altura (o quadradinho fica menor longe da câmera)
function desenharParticulas() {
  for (const p of PARTICULAS) if (p.vida > 0) {
    const t = pontoTela(p.x, p.y, p.z), k = p.vida / p.total, tam = Math.max(1, p.tam * escalaEm(p.x, p.y) * (0.45 + 0.55 * k));
    ret(t.x - tam / 2, t.y - tam / 2, tam, tam, p.cor);
  }
}
const POEIRA = ["#c7d0c2", "#b3bdae", "#e1e7dc"];
const TERRA = ["#8a6436", "#a87d48", "#6b4a26", "#c49a5e"];
const AGUA = ["#e8ffff", "#8fe0f6", "#3f9ee0"];
const SOMBRA = ["#3a2a58", "#705898", "#1f1814"];

// ---------- o estado visual de cada bicho ----------
function visualDe(id) {
  let v = visuais.get(id);
  if (!v) visuais.set(id, (v = { lado: 1, viradaEm: -1e9, tempo: 0, ultimo: null, passo: 0, rastro: [], rastroEm: 0, piscaEm: 0 }));
  return v;
}
function direcaoDe(de, para) {
  const a = N.snap?.entidades.find((e) => e.id === de), b = N.snap?.entidades.find((e) => e.id === para);
  if (!a || !b) return { x: 0, y: 0 };
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
}
// chamado para cada evento do servidor (efeitoVisual)
function animarEvento(ev, agora) {
  if (ev.tipo === "golpe") visualDe(ev.id).golpe = { t: agora, classe: ev.classe, elemento: ev.elemento || dexAtual().MOVES[ev.golpe]?.t };
  else if (ev.tipo === "dano") visualDe(ev.em).dano = { t: agora, dir: direcaoDe(ev.de, ev.em), crit: ev.crit };
  else if (ev.tipo === "esquiva") visualDe(ev.id).esquiva = agora;
  else if (ev.tipo === "troca") { const v = visualDe(ev.id); v.entrada = agora; v.desmaio = null; v.rastro.length = 0; }
  else if (ev.tipo === "desmaiou") visualDe(ev.id).desmaio = { t: agora, bicho: ev.bicho };
  else if (ev.tipo === "sumiu") {
    const { x, y } = ev.de;
    if (ev.jeito === "voo") espalhar(x, y, 8, POEIRA, { vel: 2.6, sobe: 1.2, vida: 0.45, tam: 0.14 });
    else if (ev.jeito === "cova") espalhar(x, y, 14, TERRA, { vel: 1.8, sobe: 4, vida: 0.6, tam: 0.13 });
    else if (ev.jeito === "mergulho") espalhar(x, y, 14, AGUA, { vel: 1.6, sobe: 4.5, vida: 0.55, tam: 0.11, quica: 0 });
    else espalhar(x, y, 10, SOMBRA, { vel: 1.2, sobe: 1.5, g: -2, vida: 0.6, tam: 0.12 });
    visualDe(ev.id).buraco = { t: agora, x, y, jeito: ev.jeito };
  } else if (ev.tipo === "voltou") {
    const { x, y } = ev;
    if (ev.jeito === "voo") espalhar(x, y, 16, POEIRA, { vel: 3.4, sobe: 1.6, vida: 0.5, tam: 0.15, atrito: 3 });
    else if (ev.jeito === "cova") espalhar(x, y, 22, TERRA, { vel: 2.6, sobe: 6, vida: 0.8, tam: 0.16 });
    else if (ev.jeito === "mergulho") espalhar(x, y, 22, AGUA, { vel: 2.2, sobe: 6.5, vida: 0.7, tam: 0.12, quica: 0 });
    else espalhar(x, y, 16, SOMBRA, { vel: 2.4, sobe: 2, g: -1, vida: 0.7, tam: 0.14 });
  }
}

// o que fica no chão enquanto o bicho está escondido: o montinho de terra andando, as bolhas, a sombra
// (no chão da quadra, visto de cima: ver pintarChao em desenho.js)
function desenharEscondido(e, o, agora) {
  const s = camera.escala, p = pontoTela(e.x, e.y), t = agora / 1000;
  if (o.jeito === "cova") {
    const mexe = Math.round(Math.sin(t * 30) * s * 0.05);
    ctx.fillStyle = "#6b4a26"; ctx.beginPath(); ctx.ellipse(p.x + mexe, p.y, s * 0.55, s * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8a6436"; ctx.beginPath(); ctx.ellipse(p.x + mexe, p.y - s * 0.05, s * 0.4, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    if (Math.random() < 0.3) particula(e.x + (Math.random() - 0.5) * 0.6, e.y, { vz: 2.5, vx: (Math.random() - 0.5) * 2, cor: TERRA[Math.floor(Math.random() * 4)], vida: 0.35, tam: 0.09 });
  } else if (o.jeito === "mergulho") {
    ctx.fillStyle = "#3f9ee0aa"; ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.42, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 2; i++) {
      const fase = (t * 2.2 + i / 2) % 1;
      ctx.globalAlpha = 1 - fase; ctx.strokeStyle = "#e8ffff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, s * (0.25 + fase * 0.45), s * (0.18 + fase * 0.32), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (Math.random() < 0.35) particula(e.x + (Math.random() - 0.5) * 0.5, e.y, { vz: 1.6, g: 1, cor: "#e8ffff", vida: 0.4, tam: 0.08, quica: 0 });
  } else if (o.jeito === "sombra") {
    ctx.globalAlpha = 0.55 + Math.sin(t * 14) * 0.15;
    ctx.fillStyle = "#1f1430"; ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.6, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
// o buraco (ou poça) que fica onde o bicho entrou
function desenharBuraco(v, agora) {
  const b = v.buraco;
  if (!b || agora - b.t > 900 || b.jeito === "voo") return;
  const s = camera.escala, p = pontoTela(b.x, b.y), k = 1 - (agora - b.t) / 900;
  ctx.globalAlpha = Math.min(1, k * 1.6);
  if (b.jeito === "cova") { ctx.fillStyle = "#8a6436"; ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.62, s * 0.46, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = b.jeito === "cova" ? "#3d2a14" : b.jeito === "mergulho" ? "#2a6aa8" : "#1f1430";
  ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.5, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// desenha o quadro com tudo junto: posição dos pés, altura, esticar numa direção, achatar, girar e o recorte do chão
function pintarQuadro(a, q, x, chao, o) {
  const m = q.medida, k = m.escala * camera.escala, altura = (m.pe - m.topo) * k;
  ctx.save();
  ctx.globalAlpha *= o.alfa ?? 1;
  ctx.translate(Math.round(x), Math.round(chao - (o.altura || 0) * camera.escala));
  if (o.afundar) { ctx.beginPath(); ctx.rect(-4000, -4000, 8000, 4000); ctx.clip(); ctx.translate(0, Math.round(o.afundar * altura)); }
  if (o.tombo) ctx.rotate(o.tombo);
  ctx.translate(0, -altura / 2);
  if (o.giro) ctx.rotate(o.giro);
  if (o.estica) { ctx.rotate(o.anguloEstica); ctx.scale(1 + o.estica, 1 - o.estica * 0.5); ctx.rotate(-o.anguloEstica); }
  ctx.translate(0, altura / 2);
  ctx.scale((o.lado || 1) * a.olha * (o.sx || 1) * k, (o.sy || 1) * k);
  ctx.imageSmoothingEnabled = k < 0.95; // reduzido demais, o pixel puro some; aí vale suavizar
  ctx.drawImage(o.branco ? silhuetaBranca(a, q.cv) : q.cv, -m.cx, -m.pe);
  ctx.restore();
  ctx.imageSmoothingEnabled = false;
  return altura * (o.sy || 1);
}

// O bicho é desenhado em três partes, uma em cada passada de desenho.js:
// - poseBicho: o jeito do momento (uma vez por quadro; anda o relógio do GIF e solta as partículas);
// - bichoNoChao: o que fica no chão (sombra, anel do lado, buraco, o montinho de quem está escondido);
// - bichoNoQuadro: o corpo, numa casa do atlas, que vira o cartaz em pé na cena 3D;
// - bichoInfo: a vida, a barra de canalizar e os sinais de atributo, na tela.
function poseBicho(e, agora, modo) {
  const v = visualDe(e.id), calmo = movimentoReduzido.matches;
  const desm = v.desmaio && agora - v.desmaio.t < 800 ? v.desmaio : null;
  const pose = { e, v, modo, visivel: false };
  if (!e.campo && !desm) { v.rastro.length = 0; return pose; }
  const id = e.forma || e.bicho, a = animacaoDe(id, modo);
  const dt = v.ultimo == null ? 0 : clamp(agora - v.ultimo, 0, 100); v.ultimo = agora;
  const o = e.oculto, andando = Math.hypot(e.vx || 0, e.vy || 0) > 0.1 && !e.dash && !o;
  v.tempo += dt * (andando ? 1.7 : 1) * (o?.jeito === "voo" ? 2.5 : 1);
  const lado = e.mira.x < -0.05 ? -1 : e.mira.x > 0.05 ? 1 : v.lado;
  if (lado !== v.lado) { v.lado = lado; v.viradaEm = agora; }
  // de costas: mirando para o fundo da quadra (com uma folga, para não ficar trocando à toa perto do meio)
  const costas = e.mira.y < -0.55 ? true : e.mira.y > -0.25 ? false : !!v.costas;
  if (costas !== !!v.costas) { v.costas = costas; v.viradaEm = agora; }
  if (agora > v.piscaEm + 3000 + (semente(e.id) % 1500)) v.piscaEm = agora;
  const ac = costas ? animacaoCostas(id, modo) : null;
  const q = ac ? quadroCostas(ac, v.tempo) : quadroDe(a, v.tempo, agora - v.piscaEm < 130);
  const anim = ac || a, mira = e.mira;
  const f = { lado: v.lado, altura: 0, sx: 1, sy: 1, estica: 0, anguloEstica: Math.atan2(mira.y, mira.x), alfa: 1 };
  let ox = 0, oy = 0, sombra = 1, carga = null;

  if (flutua(id, modo)) { f.altura += 0.45 + (calmo ? 0 : Math.sin(agora / 320 + semente(e.id)) * 0.08); sombra = 0.7; }
  if (andando) {
    if (!calmo) f.altura += Math.abs(Math.sin(agora / 95)) * 0.09;
    const passo = Math.floor(agora / 190);
    if (passo !== v.passo) { v.passo = passo; if (sombra === 1) espalhar(e.x, e.y, 2, POEIRA, { vel: 0.6, sobe: 0.8, vida: 0.35, tam: 0.1 }); }
  }
  if (agora - v.viradaEm < 80) { f.sx *= 0.8; f.sy *= 1.08; } // virar de lado: achata por um instante
  // o golpe: antecipação, avanço e volta (só visual: o acerto já foi decidido no servidor)
  const g = v.golpe, ig = g ? agora - g.t : 1e9;
  if (g && ig < 320 && !o) {
    if (g.classe === "corpo") {
      if (ig < 80) { const k = ig / 80; ox -= mira.x * 0.14 * k; oy -= mira.y * 0.14 * k; f.sx *= 1 - 0.08 * k; f.sy *= 1 + 0.08 * k; }
      else if (ig < 190) { const k = (ig - 80) / 110, fr = -0.14 + 0.46 * Math.sin((k * Math.PI) / 2); ox += mira.x * fr; oy += mira.y * fr; f.estica = 0.22 * (1 - k); }
      else { const fr = 0.32 * (1 - (ig - 190) / 130); ox += mira.x * fr; oy += mira.y * fr; }
    } else if (["projetil", "debuff", "area", "sumir"].includes(g.classe)) {
      if (ig < 90) { const k = ig / 90; f.sy *= 1 - 0.1 * k; f.sx *= 1 + 0.06 * k; carga = { k, elemento: g.elemento }; }
      else if (ig < 230) { const r = 0.18 * (1 - (ig - 90) / 140); ox -= mira.x * r; oy -= mira.y * r; }
    } else if (ig < 300) { const k = Math.sin((ig / 300) * Math.PI); f.sy *= 1 + 0.12 * k; f.sx *= 1 - 0.05 * k; carga = { k: k * 0.8, elemento: g.elemento }; }
  }
  // apanhando: pisca branco e é empurrado
  const d = v.dano, idn = d ? agora - d.t : 1e9;
  if (idn < 170) { const k = 1 - idn / 170; ox += d.dir.x * (d.crit ? 0.4 : 0.26) * k; oy += d.dir.y * (d.crit ? 0.4 : 0.26) * k; if (idn < 75) f.branco = true; }
  // esquiva: um pulinho e o achatado ao cair
  const ie = v.esquiva != null ? agora - v.esquiva : 1e9;
  if (ie < 250) f.altura += Math.sin((ie / 250) * Math.PI) * 0.45;
  else if (ie < 330) { f.sy *= 0.84; f.sx *= 1.14; }
  // investida e giro
  if (e.dash) {
    f.estica = Math.max(f.estica, 0.28); f.anguloEstica = Math.atan2(e.dash.y, e.dash.x);
    if (e.dash.giro || e.dash.hab?.giro) { f.giro = (agora / 1000) * 22 * v.lado; f.estica = 0.08; }
  }
  // entrando em campo
  const ien = v.entrada != null ? agora - v.entrada : 1e9;
  if (ien < 220) { const k = ien / 220; f.sy *= 0.65 + 0.35 * k; f.sx *= 1.25 - 0.25 * k; if (ien < 90) f.branco = true; }
  // voar, cavar, mergulhar, sumir nas sombras
  let escondido = false;
  if (o) {
    const passou = o.total - o.t;
    if (o.jeito === "voo") {
      const subir = 0.28, descer = 0.24;
      if (passou < subir) { const k = passou / subir; f.altura += k * k * OCULTO_VOO; f.sy *= 1 + 0.25 * k; f.sx *= 1 - 0.15 * k; }
      else if (o.t < descer) { const k = o.t / descer; f.altura += k * k * OCULTO_VOO; f.sy *= 1.25; f.sx *= 0.85; }
      else { f.altura += OCULTO_VOO; escondido = true; }
      sombra = 0.35 + 0.65 * clamp(passou / o.total, 0, 1);
    } else {
      const entrar = 0.2, sair = 0.18;
      f.afundar = passou < entrar ? passou / entrar : o.t < sair ? o.t / sair : 1;
      escondido = f.afundar >= 1; sombra = 0;
    }
  }
  // desmaio: tomba de lado, quica e vira pó
  if (desm) {
    const it = agora - desm.t;
    f.tombo = v.lado * Math.min(1, it / 260) * (Math.PI / 2) * (calmo ? 0 : 1);
    if (it > 260 && it < 420) f.altura += Math.sin(((it - 260) / 160) * Math.PI) * 0.18;
    if (it > 450) f.alfa = Math.max(0, 1 - (it - 450) / 350);
    if (it > 450 && !desm.po) { desm.po = true; espalhar(e.x, e.y, 14, POEIRA, { vel: 1.4, sobe: 1.6, g: 1, vida: 0.6, tam: 0.18, atrito: 2 }); }
    sombra *= f.alfa;
  }
  if (e.invulneravel > 0 && !f.branco && ie >= 250) f.alfa *= 0.65;
  if (calmo) { f.altura = Math.min(f.altura, o?.jeito === "voo" ? f.altura : 0.45); f.estica = 0; f.giro = 0; }

  const wx = e.x + ox, wy = e.y + oy, altura = f.altura;
  // o rastro (investida, esquiva, velocidade em alta): os quadros de antes, onde o bicho estava
  const rapido = e.dash || ie < 250 || (andando && (e.st?.spd || 0) > 0);
  if (!calmo && rapido && !escondido && q && agora - v.rastroEm > 35) {
    v.rastroEm = agora;
    v.rastro.unshift({ wx, wy, altura, f: { ...f, branco: false }, q, a: anim, t: agora });
    v.rastro.length = Math.min(v.rastro.length, 4);
  }
  for (let i = v.rastro.length - 1; i >= 0; i--) if (agora - v.rastro[i].t > 180) v.rastro.splice(i, 1);
  return Object.assign(pose, { visivel: true, a, anim, q, f, o, desm, ie, sombra, carga, escondido, wx, wy, altura, alturaSprite: 1.2 });
}
function bichoNoChao(pose, agora) {
  const { e, v } = pose, s = camera.escala;
  desenharBuraco(v, agora);
  if (!pose.visivel) return;
  if (pose.escondido && pose.o.jeito !== "voo") desenharEscondido(e, pose.o, agora);
  const p = pontoTela(pose.wx, pose.wy);
  // a mancha embaixo do bicho, menor quando ele está no alto (com sombra de verdade, só um contato fraquinho)
  if (pose.sombra > 0) {
    const k = pose.sombra * clamp(1 - pose.altura / 12, 0.3, 1);
    ctx.fillStyle = cena3d.ok && !cena3d.leve ? "#00000030" : "#0000004c"; ctx.beginPath();
    ctx.ellipse(p.x, p.y, s * 0.62 * k, s * 0.42 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (e.campo && !pose.escondido) {
    ctx.strokeStyle = e.id === ME?.id ? "#ffe56a" : coresLados[e.lado]; ctx.lineWidth = Math.max(2, s * 0.1);
    ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.57, 0, Math.PI * 2); ctx.stroke();
  }
}
// o corpo na casa do atlas: x e chao são os pés, em pixels; a altura vai no cartaz (cena3d.js), não aqui.
// Devolve a altura do desenho, em pixels.
function bichoNoQuadro(pose, agora, x, chao) {
  const { e, v, f, q, a, anim } = pose, s = camera.escala, calmo = movimentoReduzido.matches;
  for (let i = v.rastro.length - 1; i >= 0; i--) {
    const r = v.rastro[i], idade = agora - r.t;
    const rx = x + (r.wx - pose.wx) * s, ry = chao + ((r.wy - pose.wy) * 0.6 - (r.altura - pose.altura)) * s;
    pintarQuadro(r.a || a, r.q, rx, ry, { ...r.f, altura: 0, alfa: 0.32 * (1 - idade / 180) });
  }
  if (pose.carga && !calmo) { // brilho do tipo carregando o golpe
    ctx.save(); ctx.globalAlpha = 0.35 * pose.carga.k; circulo(x, chao - s * 0.6, s * (0.5 + pose.carga.k * 0.35), corTipo(pose.carga.elemento)); ctx.restore();
  }
  if (e.escudo) { ctx.strokeStyle = "#75c8c3"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, chao - s * 0.5, s * (0.9 + Math.sin(agora / 80) * 0.05), 0, Math.PI * 2); ctx.stroke(); }
  if (q) return pintarQuadro(anim, q, x, chao, { ...f, altura: 0 });
  ret(x - s * 0.4, chao - s * 0.9, s * 0.8, s * 0.9, corTipo(dexDe(pose.modo).MONS[e.bicho]?.types[0])); texto(a.erro ? "?" : "·", x, chao - s * 0.4, "#fff", Math.max(6, s * 0.7));
  return s * 1.2;
}
// a vida em cima da cabeça (ou no chão, enquanto o bicho está no alto ou debaixo da terra) e o resto, na tela
function bichoInfo(pose, agora) {
  const { e } = pose;
  if (!pose.visivel || !e.campo) return;
  const s = escalaEm(pose.wx, pose.wy), alto = pose.escondido || pose.o;
  // o topo do cartaz, que deita um pouco para trás (cena3d.js)
  const h = alto ? 1.3 : pose.alturaSprite * ESTICA_CARTAZ + 0.25, deita = alto || !cena3d.ok ? 0 : DEITA_CARTAZ;
  const topo = pontoTela(pose.wx, pose.wy - h * Math.sin(deita), (alto ? 0 : pose.altura) + h * Math.cos(deita));
  const largura = Math.max(15, s * 1.5), x = topo.x, topoVida = Math.max(6, topo.y);
  ret(x - largura / 2 - 1, topoVida - 1, largura + 2, 4, "#334d3b");
  ret(x - largura / 2, topoVida, largura * Math.max(0, e.hp / e.max), 2, e.lado ? "#ec828b" : "#55b49c");
  if (e.canal) {
    const pe = pontoTela(pose.wx, pose.wy);
    ret(x - largura / 2, pe.y + 2, largura, 2, "#315747"); ret(x - largura / 2, pe.y + 2, largura * (1 - e.canal.t / 0.8), 2, "#b7f59b");
    if (Math.random() < 0.25) particula(e.x + (Math.random() - 0.5) * 0.7, e.y, { vz: 1.4, g: -0.5, cor: "#b7f59b", vida: 0.6, tam: 0.09 });
  }
  if (Object.values(e.st || {}).some((n) => n > 0)) texto("+", x + largura / 2 + 3, topoVida + 6, "#167247", 8);
  if (Object.values(e.st || {}).some((n) => n < 0)) texto("−", x - largura / 2 - 3, topoVida + 6, "#9f3254", 8);
}
