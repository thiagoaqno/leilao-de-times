// O desenho da arena, em três passadas por quadro. Os bichos (animacao.js), os golpes de cada tipo (golpes.js), as
// marcas (marcas.js), o tema (temas.js) e a cena 3D (cena3d.js) moram em arquivos próprios; aqui fica a ordem.
// 1. O chão (chaoCv): a quadra do tema, as marcas, os avisos de área, a mira e o que fica no chão embaixo dos bichos
//    (sombra, anel do lado, buraco), tudo visto de cima. Vira a textura do piso na cena 3D.
// 2. O atlas (atlasCv): cada bicho e cada projétil numa casa de 128 pixels, que vira um cartaz em pé na cena.
// 3. O #cv: a cena 3D na resolução da tela e, por cima, o que é da tela (partículas, estouros, números de dano, vida,
//    clima). O #cv é ampliado com pixels nítidos (image-rendering: pixelated, sem suavizar).
// Quem desenha usa o ctx e a camera da passada da vez: pontoTela(x, y, altura) leva da arena ao ctx de agora, e
// pontoMundo(clientX, clientY) leva de um ponto da página ao chão da arena (a mira do mouse).
// Sem WebGL (ou enquanto o Three carrega), o #cv mostra o chão reto, visto de cima, com os cartazes por cima.
const cv = $("cv"), ctxTela = cv.getContext("2d");
let ctx = ctxTela; // troca de dono durante as passadas (chão, atlas, tela)
const camera = { x: 0, y: 0, escala: 1, largura: 0, altura: 0, projetar: null, traco: 1 }; // traco: a grossura de uma linha fina
const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)");
const efeitos = [], ataques = new Map(), projeteisVisuais = new Map(), areasVisuais = new Map();
let tremor = 0;
const coresLados = ["#237dcd", "#df515a"];
// os eventos que viram palavra em cima do bicho
const TEXTO_DO_EVENTO = {
  perfeita: ["Perfeita!", "#c79a14"], aparou: ["Aparou!", "#2f86b8"], guardaQuebrou: ["Guarda quebrada!", "#c0472f"],
  interrompido: ["Interrompido!", "#9f3254"], batida: ["Na parede!", "#8a5a2b"], tombo: ["Tombo!", "#8a5a2b"], errou: ["Errou!", "#687675"],
};
const TEXTOS_EVENTO = Object.keys(TEXTO_DO_EVENTO);
const corTipo = (t) => dexAtual().TYPES[t] || "#bccdbd";
// o chão visto de cima: a quadra com a borda, 18,5 x 12,5 casas, PX_CHAO pixels por casa
const CHAO = { w: 18.5, h: 12.5 }, PX_CHAO = 48;
// os dois canvases moram na memória (willReadFrequently): a cena 3D compara cada quadro com o anterior e sobe para a
// placa de vídeo só o que mudou (cena3d.js, texturaParcial)
const chaoCv = document.createElement("canvas"), chaoCtx = chaoCv.getContext("2d", { willReadFrequently: true });
chaoCv.width = CHAO.w * PX_CHAO; chaoCv.height = CHAO.h * PX_CHAO;
const atlasCv = document.createElement("canvas"), atlasCtx = atlasCv.getContext("2d", { willReadFrequently: true });
atlasCv.width = ATLAS.w; atlasCv.height = ATLAS.h;
// o modo leve: ?leve=1 liga, ?leve=0 desliga; sem nada, liga sozinho num celular fraco ou se os quadros saem lentos
const pedidoLeve = new URLSearchParams(location.search).get("leve");
cena3d.leve = pedidoLeve === "1" || (pedidoLeve !== "0" && Toque.isTouch() && ((navigator.deviceMemory || 8) <= 3 || (navigator.hardwareConcurrency || 8) <= 4));
const ritmo = { n: 0, soma: 0, decidido: pedidoLeve != null };
const usar3d = () => iniciarCena3d();
const tela = { x: 0, y: 0, escala: 1 }; // a câmera da tela, guardada para quando a passada é outra

// ---------- da arena para a tela e de volta ----------
const projetarReto = (x, y, h = 0) => ({ x: camera.x + x * camera.escala, y: camera.y + (y - h) * camera.escala });
const projetarRetoTela = (x, y, h = 0) => ({ x: tela.x + x * tela.escala, y: tela.y + (y - h) * tela.escala });
const projetarTela = (x, y, h = 0) => (cena3d.ok ? projetar3d(x, y, h) : projetarRetoTela(x, y, h));
function pontoTela(x, y, h = 0) { return camera.projetar(x, y, h); }
function pontoMundo(x, y) {
  const r = cv.getBoundingClientRect(), px = (x - r.left) * cv.width / r.width, py = (y - r.top) * cv.height / r.height;
  if (cena3d.ok) return chao3d(px, py);
  return { x: (px - tela.x) / tela.escala, y: (py - tela.y) / tela.escala };
}
// pixels de tela por casa da arena naquele ponto (perto da câmera é maior)
function escalaEm(x, y, h = 0) {
  if (!cena3d.ok) return tela.escala;
  const a = projetar3d(x - 0.5, y, h), b = projetar3d(x + 0.5, y, h);
  return Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
}
// o ângulo, na tela, de uma direção da arena saindo de (x, y)
function anguloTela(x, y, dx, dy) {
  const a = projetarTela(x, y, 0.4), b = projetarTela(x + dx * 0.5, y + dy * 0.5, 0.4);
  return Math.atan2(b.y - a.y, b.x - a.x);
}
// desenha fn com outro ctx e outra câmera, e volta tudo como estava
function passada(novoCtx, cam, fn) {
  const antes = { ...camera }, ctxAntes = ctx;
  ctx = novoCtx; Object.assign(camera, cam);
  try { fn(); } finally { ctx = ctxAntes; Object.assign(camera, antes); }
}

function ajustarCanvas() {
  // a resolução da tela, até 1,5 pixel por pixel da página (numa tela 2x, quase igual de nítido e bem mais leve para a
  // placa de vídeo); meia resolução no modo leve
  const r = cv.getBoundingClientRect(), fator = cena3d.leve ? 2 : 1 / Math.min(1.5, devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width / fator)), hh = Math.max(1, Math.round(r.height / fator));
  if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
  camera.largura = w; camera.altura = hh;
  const paisagemToque = toque && r.height < 320 && r.width > r.height && document.body.classList.contains("jogando");
  const cima = S?.phase === "play" ? 22 : 6, baixo = paisagemToque ? 52 : 6; // pixels da página livres em cima e embaixo
  if (usar3d()) {
    enquadrar3d(w, hh, 1 - 2 * cima / Math.max(1, r.height), -1 + 2 * baixo / Math.max(1, r.height));
    Object.assign(camera, { x: w / 2, y: hh / 2, escala: escalaEm(0, 0), projetar: projetar3d, traco: 2 / fator });
  } else {
    const fundo = baixo / fator;
    tela.escala = Math.max(1, Math.min((w - 8) / 19, (hh - fundo - 8) / 13));
    tela.x = w / 2; tela.y = (hh - fundo) / 2 + (S?.phase === "play" ? cima / fator / 2 : 0);
    Object.assign(camera, { ...tela, projetar: projetarReto, traco: 2 / fator });
  }
  ctx.imageSmoothingEnabled = false;
}
function ret(x, y, w, hh, cor) { ctx.fillStyle = cor; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(hh)); }
function circulo(x, y, r, cor, cheio = true) {
  ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), Math.max(0.1, r), 0, Math.PI * 2);
  if (cheio) { ctx.fillStyle = cor; ctx.fill(); } else { ctx.strokeStyle = cor; ctx.lineWidth = camera.traco; ctx.stroke(); }
}
function texto(t, x, y, cor = "#fff", tam = 6, alinhamento = "center") {
  ctx.fillStyle = cor; ctx.font = `700 ${tam}px ui-monospace,monospace`; ctx.textAlign = alinhamento; ctx.fillText(t, Math.round(x), Math.round(y));
}

// ---------- 1. o chão ----------
// o piso com o tema do ginásio (temas.js): borda, faixas, o desenho do chão, as laterais e as linhas
function desenharPiso(agora) {
  const s = camera.escala, x = camera.x, y = camera.y, T = temaAtual(), lw = Math.max(2, s * 0.11);
  ret(0, 0, chaoCv.width, chaoCv.height, T.borda);
  ret(x - 9 * s, y - 6 * s, 18 * s, 12 * s, T.piso[1]);
  for (let faixa = 0; faixa < 18; faixa++) ret(x + (-9 + faixa) * s, y - 6 * s, s - 0.2, 12 * s, faixa % 2 ? T.piso[0] : T.piso[1]);
  desenharChao(T, agora);
  ret(x - 9 * s, y - 6 * s, 0.7 * s, 12 * s, T.laterais[0]);
  ret(x + 8.3 * s, y - 6 * s, 0.7 * s, 12 * s, T.laterais[1]);
  ctx.strokeStyle = T.linha; ctx.lineWidth = lw;
  ctx.strokeRect(Math.round(x - 8.1 * s), Math.round(y - 5.35 * s), Math.round(16.2 * s), Math.round(10.7 * s));
  ctx.beginPath(); ctx.moveTo(x, y - 5.35 * s); ctx.lineTo(x, y + 5.35 * s); ctx.stroke();
  circulo(x, y, 2.1 * s, T.centro); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, 2.1 * s, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 1.04 * s, Math.PI, 0); ctx.closePath(); ctx.fillStyle = T.meio[0]; ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 1.04 * s, 0, Math.PI); ctx.closePath(); ctx.fillStyle = T.meio[1]; ctx.fill(); ctx.restore();
  ret(x - 1.04 * s, y - s * 0.07, 2.08 * s, s * 0.14, T.miolo); circulo(x, y, s * 0.3, T.miolo); circulo(x, y, s * 0.17, T.meio[1]);
}
const faltaDaArea = (a, agora) => Math.max(0, a.falta - Math.max(0, agora - a.t) / 1000);
// cada jeito de área tem o seu desenho no chão (visto de cima; a cena 3D põe o volume por cima: golpes3d.js)
function desenharArea(a, agora) {
  const forma = a.forma || "queda", cor = corTipo(a.elemento), falta = faltaDaArea(a, agora), s = camera.escala, lw = Math.max(2, s * 0.1);
  const meu = a.lado === meuJogador()?.lado, t = agora / 1000;
  ctx.save();
  if (forma === "queda" || forma === "bomba") {
    const p = pontoTela(a.x, a.y), r = a.r * s;
    ctx.globalAlpha = 0.25; circulo(p.x, p.y, r, cor); ctx.globalAlpha = 1;
    ctx.setLineDash([4, 3]); ctx.lineWidth = lw; ctx.strokeStyle = meu ? "#287253" : "#b33744";
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = cor; ctx.lineWidth = lw * 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.85, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(1 - falta / (a.aviso || 0.7), 0, 1)); ctx.stroke();
    ret(p.x - 5, p.y - 1, 10, 2, "#536458"); ret(p.x - 1, p.y - 5, 2, 10, "#536458");
  } else if (forma === "anel") { // o tremor: o anel que abre a partir de quem usou
    const p = pontoTela(a.x, a.y), r = a.r * s * clamp(1 - falta / a.aviso, 0, 1);
    ctx.globalAlpha = 0.18; circulo(p.x, p.y, a.r * s, cor); ctx.globalAlpha = 0.9;
    ctx.strokeStyle = cor; ctx.lineWidth = s * 0.5; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = s * 0.12; ctx.stroke();
  } else if (forma === "onda") { // a parede que anda
    const andou = (a.falta - falta) * (a.v || 6.5), cx = a.x + a.dx * andou, cy = a.y + a.dy * andou, px = -a.dy, py = a.dx;
    const c1 = pontoTela(cx + px * a.r, cy + py * a.r), c2 = pontoTela(cx - px * a.r, cy - py * a.r);
    const t1 = pontoTela(cx + px * a.r - a.dx * 1.2, cy + py * a.r - a.dy * 1.2), t2 = pontoTela(cx - px * a.r - a.dx * 1.2, cy - py * a.r - a.dy * 1.2);
    ctx.globalAlpha = 0.35; ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t1.x, t1.y); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = "#ffffffcc"; ctx.lineWidth = s * 0.18; ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.stroke();
  } else if (forma === "zona") { // o chão tomado (redemoinho, fogo, fumaça): gira
    const p = pontoTela(a.x, a.y), r = a.r * s;
    ctx.globalAlpha = 0.3 * Math.min(1, falta * 2); circulo(p.x, p.y, r, cor);
    ctx.globalAlpha = 0.8 * Math.min(1, falta * 2); ctx.strokeStyle = cor; ctx.lineWidth = lw;
    for (let i = 0; i < 3; i++) { const g = t * (a.puxa ? 5 : 2) + i * 2.1; ctx.beginPath(); ctx.arc(p.x, p.y, r * (0.35 + i * 0.25), g, g + 1.6); ctx.stroke(); }
  } else if (forma === "armadilha") { // as pontas no chão (fracas enquanto não armam)
    const p = pontoTela(a.x, a.y), r = a.r * s, armada = (a.arma || 0) - (a.falta - falta) <= 0;
    ctx.globalAlpha = armada ? 0.95 : 0.4;
    for (let i = 0; i < 5; i++) {
      const g = i * 1.256 + a.id, x = p.x + Math.cos(g) * r * 0.55, y = p.y + Math.sin(g) * r * 0.4;
      ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(x, y + s * 0.06, s * 0.12, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(x - s * 0.1, y); ctx.lineTo(x, y - s * 0.24); ctx.lineTo(x + s * 0.1, y); ctx.fill();
    }
    ctx.globalAlpha = armada ? 0.5 : 0.2; ctx.strokeStyle = meu ? "#287253" : "#b33744"; ctx.lineWidth = lw * 0.6; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  } else if (forma === "feixe") { // o rastro queimado do feixe
    const k = clamp(falta / a.aviso, 0, 1), o = pontoTela(a.x, a.y), f = pontoTela(a.x + a.dx * a.len, a.y + a.dy * a.len);
    ctx.globalAlpha = k; ctx.lineCap = "round";
    ctx.strokeStyle = cor; ctx.lineWidth = a.r * 2 * s; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(f.x, f.y); ctx.stroke();
    ctx.strokeStyle = "#fffbe8"; ctx.lineWidth = a.r * 0.8 * s; ctx.stroke();
  } else if (forma === "cone") { // o sopro em leque
    const k = clamp(falta / a.aviso, 0, 1), o = pontoTela(a.x, a.y), ang = Math.atan2(a.dy, a.dx);
    ctx.globalAlpha = 0.45 * k; ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(o.x, o.y);
    for (let i = 0; i <= 12; i++) { const g = ang - a.arco / 2 + (a.arco * i) / 12, q = pontoTela(a.x + Math.cos(g) * a.len * (1.1 - k * 0.1), a.y + Math.sin(g) * a.len * (1.1 - k * 0.1)); ctx.lineTo(q.x, q.y); }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// o aviso de quem está preparando (a linha do feixe, o leque do sopro, a mão do agarrão) e onde o salto vai cair
function desenharAvisos(poses, agora) {
  const s = camera.escala;
  for (const { e } of poses) {
    if (!e.campo) continue;
    const pr = e.preparo, cor = corTipo(pr?.elemento || e.salto?.elemento);
    ctx.save();
    if (pr && pr.mira) {
      const k = clamp(1 - pr.t / pr.total, 0, 1), m = pr.mira, o = pontoTela(e.x, e.y), pisca = 0.55 + 0.35 * Math.sin(agora / 45);
      if (pr.classe === "feixe") {
        const f = pontoTela(e.x + m.x * pr.alcance, e.y + m.y * pr.alcance);
        ctx.globalAlpha = pisca; ctx.strokeStyle = cor; ctx.lineWidth = Math.max(2, (pr.largura || 0.35) * 2 * s * (0.3 + 0.7 * k));
        ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(f.x, f.y); ctx.stroke(); ctx.setLineDash([]);
      } else if (pr.classe === "cone") {
        const ang = Math.atan2(m.y, m.x), arco = pr.arco || 1.2;
        ctx.globalAlpha = 0.3 * pisca; ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(o.x, o.y);
        for (let i = 0; i <= 10; i++) { const g = ang - arco / 2 + (arco * i) / 10, q = pontoTela(e.x + Math.cos(g) * pr.alcance, e.y + Math.sin(g) * pr.alcance); ctx.lineTo(q.x, q.y); }
        ctx.closePath(); ctx.fill();
      } else {
        const q = pontoTela(e.x + m.x * 1.1, e.y + m.y * 1.1);
        ctx.globalAlpha = pisca; ctx.strokeStyle = "#ffd36a"; ctx.lineWidth = Math.max(2, s * 0.12);
        ctx.beginPath(); ctx.arc(q.x, q.y, s * 0.45 * (1.2 - k * 0.4), 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (e.salto && e.salto.para) { // o alvo do salto: o anel que fecha até a hora de cair
      const k = clamp(1 - e.salto.t / e.salto.total, 0, 1), p = pontoTela(e.salto.para.x, e.salto.para.y), r = (e.salto.r || 1.3) * s;
      ctx.globalAlpha = 0.22; circulo(p.x, p.y, r, cor); ctx.globalAlpha = 0.9;
      ctx.strokeStyle = e.lado === meuJogador()?.lado ? "#287253" : "#b33744"; ctx.lineWidth = Math.max(2, s * 0.1);
      ctx.beginPath(); ctx.arc(p.x, p.y, r * (1.6 - k * 0.6), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}
// a mira de quem segura o golpe (toque): a linha tracejada até o alcance e o círculo do golpe de área
function desenharMira() {
  if (entrada.preparando == null || !N.previsto) return;
  const e = N.previsto, c = comandoAtual(), dex = dexAtual(), golpe = dex.MONS[e.bicho.as || e.bicho.id].moves[entrada.preparando];
  const hab = Ginasio.habilidadeDeGolpe(golpe, dex.MOVES[golpe]);
  const distancia = c.alvo ? Math.hypot(c.alvo.x - e.x, c.alvo.y - e.y) : hab.alcance;
  const alcance = Math.min(hab.alcance, distancia), p = pontoTela(e.x, e.y), alvo = pontoTela(e.x + c.mira.x * alcance, e.y + c.mira.y * alcance);
  ctx.strokeStyle = "#ffdc65"; ctx.lineWidth = camera.traco * 1.2; ctx.setLineDash([9, 6]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(alvo.x, alvo.y); ctx.stroke(); ctx.setLineDash([]);
  if (["area", "bomba", "salto", "zona", "armadilha", "sumir"].includes(hab.classe)) { ctx.strokeStyle = "#c18e2d"; ctx.beginPath(); ctx.arc(alvo.x, alvo.y, hab.raio * camera.escala, 0, Math.PI * 2); ctx.stroke(); }
}
function pintarChao(agora, poses, projeteis) {
  passada(chaoCtx, { escala: PX_CHAO, x: CHAO.w / 2 * PX_CHAO, y: CHAO.h / 2 * PX_CHAO, projetar: projetarReto, traco: PX_CHAO / 20 }, () => {
    ctx.imageSmoothingEnabled = false;
    desenharPiso(agora);
    desenharMarcas(agora); // no chão, por baixo dos avisos de área e dos bichos
    for (const a of areasVisuais.values()) desenharArea(a, agora);
    desenharAvisos(poses, agora);
    for (const p of poses) bichoNoChao(p, agora);
    for (const j of projeteis) { // a sombrinha do projétil, para ver onde ele passa
      const p = pontoTela(j.x, j.y); ctx.fillStyle = "#00000038";
      ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(2, j.pr.raio * PX_CHAO), Math.max(1, j.pr.raio * PX_CHAO * 0.6), 0, 0, Math.PI * 2); ctx.fill();
    }
    desenharMira();
  });
}

// ---------- 2. o atlas dos cartazes ----------
function projeteisAgora(agora) {
  const lista = [];
  for (const pr of projeteisVisuais.values()) {
    const idade = Math.max(0, (agora - pr.t) / 1000); if (idade > pr.vida) continue;
    lista.push({ pr, x: pr.x + pr.dx * pr.v * idade, y: pr.y + pr.dy * pr.v * idade });
  }
  return lista;
}
function pintarAtlas(agora, poses, projeteis) {
  const casa = ATLAS.casa, colunas = ATLAS.w / casa, total = colunas * (ATLAS.h / casa), lista = [];
  atlasCtx.clearRect(0, 0, ATLAS.w, ATLAS.h);
  const proxima = () => { const i = lista.length; return { i, x: (i % colunas) * casa, y: Math.floor(i / colunas) * casa }; };
  passada(atlasCtx, { escala: PX_CARTAZ, x: 0, y: 0, projetar: projetarReto, traco: 1.5 }, () => {
    for (const p of poses) {
      if (!p.visivel || p.escondido || lista.length >= total) continue;
      const c = proxima();
      ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, casa, casa); ctx.clip();
      p.alturaSprite = bichoNoQuadro(p, agora, c.x + casa / 2, c.y + PE_CARTAZ) / PX_CARTAZ;
      ctx.restore();
      const volume = cena3d.ok && !cena3d.leve;
      if (volume) medirEspessura(atlasCtx, c.x, c.y); // o bicho com volume (volume.js)
      lista.push({ casa: c.i, x: p.wx, y: p.wy, altura: p.altura, bicho: true, volume, sombra: p.sombra > 0.5 && p.altura < 1 });
    }
    for (const j of projeteis) {
      if (lista.length >= total) break;
      const c = proxima(), pr = j.pr;
      ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, casa, casa); ctx.clip();
      desenharProjetil(pr.elemento, c.x + casa / 2, c.y + casa / 2, Math.max(2, pr.raio * PX_CARTAZ), anguloTela(j.x, j.y, pr.dx, pr.dy), agora, pr.id);
      ctx.restore();
      lista.push({ casa: c.i, x: j.x, y: j.y, altura: 0.4 });
    }
  });
  return lista;
}

// ---------- 3. a tela ----------
// sem 3D: o chão reto visto de cima, os pilares e os cartazes por cima, do fundo para a frente
function desenharPilar(pilar) {
  const s = camera.escala, p = pontoTela(pilar.x, pilar.y), r = pilar.r * s, [sombra, corpo, topo, brilho] = temaAtual().pilar;
  circulo(p.x + s * 0.16, p.y + s * 0.18, r + 1, sombra);
  circulo(p.x, p.y, r, corpo); circulo(p.x, p.y - 1, r * 0.75, topo);
  ret(p.x - r * 0.5, p.y - r * 0.4, r * 0.7, 2, brilho);
}
function desenharReto(cartazes) {
  const s = camera.escala, casa = ATLAS.casa, colunas = ATLAS.w / casa, k = s / PX_CARTAZ;
  ret(0, 0, cv.width, cv.height, temaAtual().fundo[0]);
  ctx.drawImage(chaoCv, Math.round(camera.x - CHAO.w / 2 * s), Math.round(camera.y - CHAO.h / 2 * s), Math.round(CHAO.w * s), Math.round(CHAO.h * s));
  const objetos = [...cartazes.map((c) => ({ y: c.y, c })), ...Ginasio.ARENA.pilares.map((p) => ({ y: p.y, pilar: p }))].sort((a, b) => a.y - b.y);
  for (const o of objetos) {
    if (o.pilar) { desenharPilar(o.pilar); continue; }
    const c = o.c, p = pontoTela(c.x, c.y, c.altura), ay = c.bicho ? PE_CARTAZ : casa / 2;
    ctx.drawImage(atlasCv, (c.casa % colunas) * casa, Math.floor(c.casa / colunas) * casa, casa, casa, Math.round(p.x - casa / 2 * k), Math.round(p.y - ay * k), Math.round(casa * k), Math.round(casa * k));
  }
}
function efeitoVisual(ev) {
  const agora = ev.t || relogio.agora();
  if (ev.tipo === "projetil") projeteisVisuais.set(ev.id, { ...ev });
  if (ev.tipo === "area") { areasVisuais.set(ev.id, { ...ev, t: agora }); efeitos.push({ ...ev, t: agora }); }
  if (ev.tipo === "impacto") { projeteisVisuais.delete(ev.id); estouro(ev.elemento, ev.x, ev.y, ev.classe === "rajada" ? 0.35 : 0.6, ev.golpe); }
  if (ev.tipo === "explosao") { areasVisuais.delete(ev.id); estouro(ev.elemento, ev.x, ev.y, ev.forma === "armadilha" ? 0.8 : 1.4, ev.golpe); }
  if (ev.tipo === "fimArea") areasVisuais.delete(ev.id);
  if (ev.tipo === "aterrissou") estouro(ev.elemento, ev.x, ev.y, 1.2);
  animarEvento(ev, Math.min(agora, relogio.agora())); // o relógio da tela pode estar um tiquinho atrás do servidor
  registrarMarca(ev); // a cratera, o buraco ou a poça que o golpe deixa no chão (marcas.js)
  const e = N.snap?.entidades.find((p) => p.id === (ev.id || ev.em));
  if (ev.tipo === "golpe") ataques.set(ev.id, { ...ev, t: agora });
  if (["golpe", "dano", "cura", "esquiva", "troca", "desmaiou", "explosao", "impacto", "atributo", "transformar", "voltou", ...TEXTOS_EVENTO, "aterrissou", "combo", "refletiu"].includes(ev.tipo)) {
    efeitos.push({ ...ev, t: agora, x: ev.x ?? e?.x ?? 0, y: ev.y ?? e?.y ?? 0, mira: e?.mira || { x: 1, y: 0 } });
    if (efeitos.length > 120) efeitos.splice(0, efeitos.length - 120);
  }
  encenarEvento(ev, Math.min(agora, relogio.agora())); // os 8 tempos do golpe: carga, estouro, reação, som, rescaldo, números (encenacao.js)
  if (ev.tipo === "dano" && ev.em === ME?.id && !movimentoReduzido.matches) tremor = ev.bloqueado ? 0.06 : 0.14;
  if ((ev.tipo === "batida" || ev.tipo === "guardaQuebrou") && ev.id === ME?.id && !movimentoReduzido.matches) tremor = 0.22;
}
function sincronizarVisuais(sn) {
  const agora = sn.t;
  projeteisVisuais.clear(); areasVisuais.clear();
  for (const pr of sn.projeteis) projeteisVisuais.set(pr.id, { ...pr, t: agora });
  for (const a of sn.areas) areasVisuais.set(a.id, { ...a, t: agora });
}
function desenharEfeitos(agora) {
  const escalaTela = camera.escala;
  for (let i = efeitos.length - 1; i >= 0; i--) {
    const f = efeitos[i], idade = (agora - f.t) / 1000;
    if (idade > 0.8) { efeitos.splice(i, 1); continue; }
    if (idade < 0) continue;
    const escrito = TEXTOS_EVENTO.includes(f.tipo); // os números de dano agora são de encenacao.js (desenharNumeros)
    if (cena3d.ok && !escrito) continue; // o resto é 3D (golpes3d.js)
    const s = (camera.escala = escalaEm(f.x, f.y)), meio = pontoTela(f.x, f.y, 0.5);
    ctx.save();
    if (TEXTOS_EVENTO.includes(f.tipo)) { // as palavras grandes: Perfeita!, Aparou!, Guarda quebrada...
      const [frase, cor] = TEXTO_DO_EVENTO[f.tipo], p = pontoTela(f.x, f.y, 2.3 + (movimentoReduzido.matches ? 0 : idade * 0.8));
      const pop = movimentoReduzido.matches ? 1 : 1 + Math.max(0, 0.12 - idade) * 3;
      ctx.globalAlpha = Math.min(1, (0.8 - idade) * 3);
      texto(frase, p.x, p.y, cor, Math.max(7, s * 0.5 * pop));
    } else if (f.tipo === "golpe" && f.classe === "corpo" && idade < 0.2) desenharCorte({ ...f, elemento: f.elemento || dexAtual().MOVES[f.golpe]?.t }, idade);
    else if (f.tipo === "estouro") desenharEstouro(f, idade);
    else if (f.tipo === "explosao") desenharGolpeArea(f, idade); else if (f.tipo === "esquiva" && idade < 0.25) { ctx.globalAlpha = 1 - idade * 4; circulo(meio.x, meio.y, s * 0.65, "#fef5aa", false); }
    else if (["cura", "atributo", "troca", "transformar"].includes(f.tipo) && idade < 0.4) { ctx.globalAlpha = 1 - idade / 0.4; circulo(meio.x, meio.y, s * (movimentoReduzido.matches ? 0.9 : 0.7 + idade), "#68b987", false); }
    ctx.restore();
  }
  camera.escala = escalaTela;
}
function entidadesVisuais(agora) {
  if (!S?.match || S.phase === "lobby") return [
    { id: "previa0", bicho: times[modoAtual()][0], forma: times[modoAtual()][0], x: -5.5, y: 0, vx: 0, vy: 0, lado: 0, campo: true, mira: { x: 1, y: 0 }, hp: 1, max: 1 },
    { id: "previa1", bicho: LIDER ? LIDER.times[modoAtual()][0] : dexAtual().DEFAULT_TEAM[1], forma: LIDER ? LIDER.times[modoAtual()][0] : dexAtual().DEFAULT_TEAM[1], x: 5.5, y: 0, vx: 0, vy: 0, lado: 1, campo: true, mira: { x: -1, y: 0 }, hp: 1, max: 1 },
  ];
  const remoto = interpolarEntidades(agora - 100);
  if (N.previsto && S.phase === "play") {
    const i = remoto.findIndex((e) => e.id === ME?.id);
    if (i >= 0) remoto[i] = { ...remoto[i], x: N.previsto.x + N.erro.x, y: N.previsto.y + N.erro.y, mira: N.previsto.mira, vx: N.previsto.vx, vy: N.previsto.vy, oculto: N.previsto.oculto, dash: N.previsto.dash, guardando: N.previsto.guardando, salto: N.previsto.salto, kx: N.previsto.kx, ky: N.previsto.ky };
  }
  return remoto;
}
// quadros lentos demais no começo da partida: passa para o modo leve (uma vez só)
function medirRitmo(dt) {
  if (ritmo.decidido || S?.phase !== "play" || !cena3d.ok || dt <= 0) return;
  ritmo.n++; ritmo.soma += dt;
  if (ritmo.n < 150) return;
  ritmo.decidido = true;
  if (ritmo.soma / ritmo.n > 0.045) definirLeve(true);
}
function desenhar(agora = relogio.agora(), dt = 0) {
  ajustarCanvas();
  const escalaTela = camera.escala;
  const poses = entidadesVisuais(agora).map((e) => poseBicho(e, agora, modoAtual())), projeteis = projeteisAgora(agora);
  atualizarParticulas(dt);
  encenarQuadro(agora, poses, projeteis); // carga longa, rastros, efeito da reação e rescaldo (encenacao.js)
  pintarChao(agora, poses, projeteis);
  // com a cena 3D, os projéteis, estouros e partículas são de golpes3d.js; sem ela, ficam no atlas e na tela
  const cartazes = pintarAtlas(agora, poses, cena3d.ok ? [] : projeteis);
  if (cena3d.ok) { atualizarGolpes3d(projeteis, agora, dt, poses); ctx.drawImage(renderizar3d(cartazes, agora, tremor), 0, 0); }
  else desenharReto(cartazes);
  if (tremor > 0) tremor = Math.max(0, tremor - dt);
  // por cima da cena, na tela
  if (!cena3d.ok) {
    desenharParticulas();
    for (const a of areasVisuais.values()) { camera.escala = escalaEm(a.x, a.y); desenharQuedaArea(a, faltaDaArea(a, agora)); desenharBomba2d(a, faltaDaArea(a, agora)); }
  }
  if (G3.clarao > 0) { ctx.save(); ctx.globalAlpha = G3.clarao * 0.3; ret(0, 0, cv.width, cv.height, "#fffbe0"); ctx.restore(); } // o clarão do raio
  for (const p of poses) bichoInfo(p, agora);
  if (!cena3d.ok || temaAtual().clima === "faiscas") desenharClima(temaAtual(), agora); // o resto do clima é 3D (cenarios.js)
  desenharEfeitos(agora);
  desenharNumeros(poses, agora);
  camera.escala = escalaTela;
  medirRitmo(dt);
}
