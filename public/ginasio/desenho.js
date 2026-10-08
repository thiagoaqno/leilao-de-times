// O desenho da arena, em três passadas por quadro. Os bichos (animacao.js), os golpes de cada tipo (golpes.js), as
// marcas (marcas.js), o tema (temas.js) e a cena 3D (cena3d.js) moram em arquivos próprios; aqui fica a ordem.
// 1. O chão (chaoCv): a quadra do tema, as marcas, os avisos de área, a mira e o que fica no chão embaixo dos bichos
//    (sombra, anel do lado, buraco), tudo visto de cima. Vira a textura do piso na cena 3D.
// 2. O atlas (atlasCv): cada bicho e cada projétil numa casa de 128 pixels, que vira um cartaz em pé na cena.
// 3. O #cv: a cena 3D em baixa resolução e, por cima, o que é da tela (partículas, estouros, números de dano, vida,
//    clima). O #cv é ampliado com pixels nítidos (image-rendering: pixelated, sem suavizar).
// Quem desenha usa o ctx e a camera da passada da vez: pontoTela(x, y, altura) leva da arena ao ctx de agora, e
// pontoMundo(clientX, clientY) leva de um ponto da página ao chão da arena (a mira do mouse).
// Sem WebGL (ou enquanto o Three carrega), o #cv mostra o chão reto, visto de cima, com os cartazes por cima.
const cv = $("cv"), ctxTela = cv.getContext("2d");
let ctx = ctxTela; // troca de dono durante as passadas (chão, atlas, tela)
const camera = { x: 0, y: 0, escala: 1, largura: 0, altura: 0, projetar: null };
const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)");
const efeitos = [], ataques = new Map(), projeteisVisuais = new Map(), areasVisuais = new Map();
let tremor = 0;
const coresLados = ["#237dcd", "#df515a"];
const corTipo = (t) => dexAtual().TYPES[t] || "#bccdbd";
// o chão visto de cima: a quadra com a borda, 18,5 x 12,5 casas, PX_CHAO pixels por casa
const CHAO = { w: 18.5, h: 12.5 }, PX_CHAO = 20;
const chaoCv = document.createElement("canvas"), chaoCtx = chaoCv.getContext("2d");
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
  const r = cv.getBoundingClientRect(), fator = clamp(Math.round(r.height / 180), 2, 5) + (cena3d.leve ? 1 : 0);
  const w = Math.max(1, Math.round(r.width / fator)), hh = Math.max(1, Math.round(r.height / fator));
  if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
  camera.largura = w; camera.altura = hh;
  const paisagemToque = toque && r.height < 320 && r.width > r.height && document.body.classList.contains("jogando");
  const cima = S?.phase === "play" ? 22 : 6, baixo = paisagemToque ? 52 : 6; // pixels da página livres em cima e embaixo
  if (usar3d()) {
    enquadrar3d(w, hh, 1 - 2 * cima / Math.max(1, r.height), -1 + 2 * baixo / Math.max(1, r.height));
    Object.assign(camera, { x: w / 2, y: hh / 2, escala: escalaEm(0, 0), projetar: projetar3d });
  } else {
    const fundo = baixo / fator;
    tela.escala = Math.max(1, Math.min((w - 8) / 19, (hh - fundo - 8) / 13));
    tela.x = w / 2; tela.y = (hh - fundo) / 2 + (S?.phase === "play" ? cima / fator / 2 : 0);
    Object.assign(camera, { ...tela, projetar: projetarReto });
  }
  ctx.imageSmoothingEnabled = false;
}
function ret(x, y, w, hh, cor) { ctx.fillStyle = cor; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(hh)); }
function circulo(x, y, r, cor, cheio = true) {
  ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), Math.max(0.1, r), 0, Math.PI * 2);
  if (cheio) { ctx.fillStyle = cor; ctx.fill(); } else { ctx.strokeStyle = cor; ctx.lineWidth = 1; ctx.stroke(); }
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
function desenharArea(a, agora) {
  const p = pontoTela(a.x, a.y), r = a.r * camera.escala, falta = faltaDaArea(a, agora), lw = Math.max(2, camera.escala * 0.1);
  ctx.save(); ctx.globalAlpha = 0.25; circulo(p.x, p.y, r, corTipo(a.elemento)); ctx.globalAlpha = 1;
  ctx.setLineDash([4, 3]); ctx.lineWidth = lw; ctx.strokeStyle = a.lado === meuJogador()?.lado ? "#287253" : "#b33744";
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = corTipo(a.elemento); ctx.lineWidth = lw * 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.85, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(1 - falta / a.aviso, 0, 1)); ctx.stroke();
  ret(p.x - 5, p.y - 1, 10, 2, "#536458"); ret(p.x - 1, p.y - 5, 2, 10, "#536458"); ctx.restore();
}
// a mira de quem segura o golpe (toque): a linha tracejada até o alcance e o círculo do golpe de área
function desenharMira() {
  if (entrada.preparando == null || !N.previsto) return;
  const e = N.previsto, c = comandoAtual(), dex = dexAtual(), golpe = dex.MONS[e.bicho.as || e.bicho.id].moves[entrada.preparando];
  const hab = Ginasio.habilidadeDeGolpe(golpe, dex.MOVES[golpe]);
  const distancia = c.alvo ? Math.hypot(c.alvo.x - e.x, c.alvo.y - e.y) : hab.alcance;
  const alcance = Math.min(hab.alcance, distancia), p = pontoTela(e.x, e.y), alvo = pontoTela(e.x + c.mira.x * alcance, e.y + c.mira.y * alcance);
  ctx.strokeStyle = "#ffdc65"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(alvo.x, alvo.y); ctx.stroke(); ctx.setLineDash([]);
  if (hab.classe === "area") { ctx.strokeStyle = "#c18e2d"; ctx.beginPath(); ctx.arc(alvo.x, alvo.y, hab.raio * camera.escala, 0, Math.PI * 2); ctx.stroke(); }
}
function pintarChao(agora, poses, projeteis) {
  passada(chaoCtx, { escala: PX_CHAO, x: CHAO.w / 2 * PX_CHAO, y: CHAO.h / 2 * PX_CHAO, projetar: projetarReto }, () => {
    ctx.imageSmoothingEnabled = false;
    desenharPiso(agora);
    desenharMarcas(agora); // no chão, por baixo dos avisos de área e dos bichos
    for (const a of areasVisuais.values()) desenharArea(a, agora);
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
  passada(atlasCtx, { escala: PX_CARTAZ, x: 0, y: 0, projetar: projetarReto }, () => {
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
  if (ev.tipo === "area") areasVisuais.set(ev.id, { ...ev });
  if (ev.tipo === "impacto") { projeteisVisuais.delete(ev.id); estouro(ev.elemento, ev.x, ev.y, 0.6); }
  if (ev.tipo === "explosao") { areasVisuais.delete(ev.id); estouro(ev.elemento, ev.x, ev.y, 1.4); }
  animarEvento(ev, agora);
  registrarMarca(ev); // a cratera, o buraco ou a poça que o golpe deixa no chão (marcas.js)
  const e = N.snap?.entidades.find((p) => p.id === (ev.id || ev.em));
  if (ev.tipo === "golpe") ataques.set(ev.id, { ...ev, t: agora });
  if (["golpe", "dano", "cura", "esquiva", "troca", "desmaiou", "explosao", "impacto", "atributo", "transformar"].includes(ev.tipo)) {
    efeitos.push({ ...ev, t: agora, x: ev.x ?? e?.x ?? 0, y: ev.y ?? e?.y ?? 0, mira: e?.mira || { x: 1, y: 0 } });
    if (efeitos.length > 120) efeitos.splice(0, efeitos.length - 120);
  }
  if (ev.tipo === "dano") { // o corpo a corpo e a investida não têm projétil: o estouro sai em quem apanhou
    const g = visuais.get(ev.de)?.golpe, alvo = N.snap?.entidades.find((p) => p.id === ev.em);
    if (g && alvo && ["corpo", "investida"].includes(g.classe) && agora - g.t < 600) estouro(g.elemento, alvo.x, alvo.y, ev.crit ? 1.2 : 0.7);
  }
  if (ev.tipo === "dano" && ev.em === ME?.id && !movimentoReduzido.matches) tremor = 0.14;
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
    const s = (camera.escala = escalaEm(f.x, f.y)), meio = pontoTela(f.x, f.y, 0.5);
    ctx.save();
    if (f.tipo === "dano" || f.tipo === "cura") {
      const p = pontoTela(f.x, f.y, 1.7 + (movimentoReduzido.matches ? 0 : idade));
      ctx.globalAlpha = Math.min(1, (0.8 - idade) * 3);
      texto(f.tipo === "cura" ? "+" : String(f.dano), p.x, p.y, f.tipo === "cura" ? "#176c43" : f.crit ? "#a9500f" : "#852c45", Math.max(7, s * 0.65));
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
    if (i >= 0) remoto[i] = { ...remoto[i], x: N.previsto.x + N.erro.x, y: N.previsto.y + N.erro.y, mira: N.previsto.mira, vx: N.previsto.vx, vy: N.previsto.vy, oculto: N.previsto.oculto, dash: N.previsto.dash };
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
  pintarChao(agora, poses, projeteis);
  const cartazes = pintarAtlas(agora, poses, projeteis);
  if (cena3d.ok) ctx.drawImage(renderizar3d(cartazes, agora, tremor), 0, 0);
  else desenharReto(cartazes);
  if (tremor > 0) tremor = Math.max(0, tremor - dt);
  // por cima da cena, na tela
  desenharParticulas();
  for (const a of areasVisuais.values()) { camera.escala = escalaEm(a.x, a.y); desenharQuedaArea(a, faltaDaArea(a, agora)); }
  for (const p of poses) bichoInfo(p, agora);
  desenharClima(temaAtual(), agora);
  desenharEfeitos(agora);
  camera.escala = escalaTela;
  medirRitmo(dt);
}
