// Ginásio da Galera — as marcas que os golpes deixam no chão da quadra: a cratera de um golpe de área, o buraco do
// Dig, a poça do mergulho, o chamusco do fogo, as rachaduras do raio... Cada marca nasce forte e vai sumindo devagar,
// de um jeito que ela acabe de sumir justo no fim da partida (uma marca feita aos 30 s some aos poucos até os 90 s).
// Nada disto vai para o servidor: nasce dos mesmos eventos que o navegador já recebe (explosao e sumiu), então só
// enfeita e não muda dano nem acerto. Usa as peças de desenho.js (ctx, camera, pontoTela, movimentoReduzido), de
// golpes.js (familiaDe, paletaDe) e de temas.js (fixo).
const marcas = [];
const MAX_MARCAS = 48; // passou disso, a mais velha sai
const VIDA_MINIMA = 6; // uma marca feita nos últimos segundos ainda dura isto, para dar tempo de ver

// o jeito da marca de cada família de tipo (o que não está aqui vira cratera)
const MARCA_DA_FAMILIA = {
  fogo: "chamusco", dragao: "chamusco", raio: "raio", agua: "poca", gelo: "gelo", planta: "mato", inseto: "mato",
  psiquico: "mancha", fantasma: "mancha", veneno: "mancha", sombrio: "mancha", fada: "mancha",
};
// golpes que somem e caem no ponto mirado: o jeito de sumir manda na marca
const MARCA_DO_SUMIR = { cova: "buraco", voo: "cratera", mergulho: "poca", sombra: "mancha" };

// 1 = marca nova, 0 = sumiu. Linear de quando nasceu (t0) até o fim da partida (duracao), todos em segundos de jogo.
function alfaDaMarca(t0, tempo, duracao) {
  const restante = Math.max(VIDA_MINIMA, duracao - t0);
  return Math.max(0, Math.min(1, 1 - (tempo - t0) / restante));
}
// quanto da partida já passou, em segundos (o do último pacote do servidor mais o que andou desde então)
function tempoDePartida(agora) {
  const sn = N.snap;
  if (!sn) return 0;
  return sn.tempo + (S?.phase === "play" ? Math.max(0, agora - sn.t) / 1000 : 0);
}
// (nome próprio: animacao.js já tem uma "semente" global, e as duas não podem conviver)
const sementeMarca = (txt) => { let h = 7; for (const c of String(txt)) h = (h * 31 + c.charCodeAt(0)) % 9973; return h; };

function novaMarca(jeito, x, y, r, elemento, chave) {
  if (marcas.some((m) => m.chave === chave)) return; // o mesmo evento chegando duas vezes
  const agora = relogio.agora();
  marcas.push({ jeito, x, y, r, elemento, chave, sem: sementeMarca(chave), t0: tempoDePartida(agora), nasceu: agora });
  if (marcas.length > MAX_MARCAS) marcas.splice(0, marcas.length - MAX_MARCAS);
}
// chamado por efeitoVisual (desenho.js) a cada evento do servidor
function registrarMarca(ev) {
  if (ev.tipo === "explosao") {
    const golpe = dexAtual().MOVES[ev.golpe], hab = golpe ? Ginasio.habilidadeDeGolpe(ev.golpe, golpe) : null;
    const jeito = hab && hab.classe === "sumir" ? MARCA_DO_SUMIR[hab.jeito] : MARCA_DA_FAMILIA[familiaDe(ev.elemento)];
    novaMarca(jeito || "cratera", ev.x, ev.y, ev.r, ev.elemento, `a${ev.id}`);
  } else if (ev.tipo === "sumiu" && ev.de) { // por onde o bicho entrou: um buraquinho (ou poça)
    if (ev.jeito === "cova") novaMarca("buraco", ev.de.x, ev.de.y, 0.55, ev.elemento, `s${ev.id}:${Math.round(ev.de.x * 10)}:${Math.round(ev.de.y * 10)}:${Math.round((ev.t || 0) / 100)}`);
    else if (ev.jeito === "mergulho") novaMarca("poca", ev.de.x, ev.de.y, 0.5, ev.elemento, `s${ev.id}:${Math.round(ev.de.x * 10)}:${Math.round(ev.de.y * 10)}:${Math.round((ev.t || 0) / 100)}`);
  }
}

// ---------- desenho ----------
const raios = (m, n, de, ate, cor, largura) => { // n riscos saindo do centro (cratera, gelo, raio)
  ctx.strokeStyle = cor; ctx.lineWidth = largura;
  for (let i = 0; i < n; i++) {
    const ang = fixo(m.sem + i * 3) * Math.PI * 2, d1 = de, d2 = ate * (0.75 + fixo(m.sem + i * 5) * 0.5);
    ctx.beginPath(); ctx.moveTo(m.px + Math.cos(ang) * d1 * m.rx, m.py + Math.sin(ang) * d1 * m.ry); ctx.lineTo(m.px + Math.cos(ang) * d2 * m.rx, m.py + Math.sin(ang) * d2 * m.ry); ctx.stroke();
  }
};
const elipse = (m, k, cor, dx = 0, dy = 0) => { ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(m.px + dx, m.py + dy, m.rx * k, m.ry * k, 0, 0, Math.PI * 2); ctx.fill(); };
const pedrinhas = (m, n, cor, de, ate, tam) => { // pedacinhos no chão em volta
  ctx.fillStyle = cor;
  for (let i = 0; i < n; i++) {
    const ang = fixo(m.sem + i * 7) * Math.PI * 2, d = de + fixo(m.sem + i * 11) * (ate - de);
    ctx.fillRect(Math.round(m.px + Math.cos(ang) * d * m.rx), Math.round(m.py + Math.sin(ang) * d * m.ry), tam, tam);
  }
};

function desenharMarca(a, m, agora) {
  const s = camera.escala, p = pontoTela(m.x, m.y), parado = movimentoReduzido.matches;
  const cresce = parado ? 1 : Math.min(1, 0.45 + ((agora - m.nasceu) / 260) * 0.55); // estoura e abre
  const rx = m.r * s * cresce, ry = rx * 0.82, idade = (agora - m.nasceu) / 1000, pal = paletaDe(m.elemento);
  const f = { sem: m.sem, px: p.x, py: p.y, rx, ry }, lw = Math.max(1, s * 0.07), tam = Math.max(1, Math.round(s * 0.1));
  ctx.save(); ctx.globalAlpha = a;
  if (m.jeito === "buraco") {
    elipse(f, 1.2, "#8a6436"); elipse(f, 1, "#5f3f1f"); elipse(f, 0.68, "#140c06", 0, ry * 0.06);
    ctx.strokeStyle = "#c28a4a"; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * 1.1, ry * 1.1, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
    pedrinhas(f, 7, "#a8743a", 1.05, 1.5, tam);
  } else if (m.jeito === "chamusco") {
    for (let i = 0; i < 7; i++) elipse(f, 0.32 + fixo(m.sem + i) * 0.22, "rgba(18,10,6,.5)", (fixo(m.sem + i * 2) - 0.5) * rx * 1.1, (fixo(m.sem + i * 3) - 0.5) * ry * 1.1);
    elipse(f, 0.62, "rgba(10,5,3,.55)");
    const brasa = Math.max(0, 1 - idade / 4); // as brasas se apagam em poucos segundos
    if (brasa > 0) for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = a * brasa * (parado ? 0.8 : 0.55 + 0.45 * Math.sin(agora / 90 + i * 2));
      ctx.fillStyle = pal[1]; ctx.fillRect(Math.round(p.x + (fixo(m.sem + i * 4) - 0.5) * rx * 1.1), Math.round(p.y + (fixo(m.sem + i * 6) - 0.5) * ry * 1.1), tam, tam);
    }
  } else if (m.jeito === "raio") {
    elipse(f, 0.55, "rgba(0,0,0,.4)");
    raios(f, 6, 0.1, 1.15, "rgba(20,15,5,.7)", lw);
    if (idade < 3) { ctx.globalAlpha = a * (parado ? 0.7 : 0.45 + 0.4 * Math.sin(agora / 60)); raios(f, 6, 0.1, 1.15, pal[1], Math.max(1, lw * 0.5)); }
  } else if (m.jeito === "poca") {
    ctx.globalAlpha = a * 0.5; elipse(f, 1, pal[2]); ctx.globalAlpha = a;
    ctx.strokeStyle = pal[0]; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    const onda = parado ? 0.5 : (idade * 0.6 + fixo(m.sem)) % 1; // a marolinha que abre e some
    ctx.globalAlpha = a * (1 - onda) * 0.7; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * (0.3 + onda * 0.6), ry * (0.3 + onda * 0.6), 0, 0, Math.PI * 2); ctx.stroke();
  } else if (m.jeito === "gelo") {
    ctx.globalAlpha = a * 0.55; elipse(f, 1, pal[1]); ctx.globalAlpha = a;
    ctx.strokeStyle = pal[0]; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    raios(f, 7, 0.05, 0.95, pal[3], Math.max(1, lw * 0.6));
    pedrinhas(f, 5, "#ffffff", 0.2, 0.9, tam);
  } else if (m.jeito === "mato") {
    ctx.globalAlpha = a * 0.45; elipse(f, 1, "#14320f"); ctx.globalAlpha = a;
    for (let i = 0; i < 14; i++) { // folhas e capim arrancados
      const ang = fixo(m.sem + i * 3) * Math.PI * 2, d = 0.2 + fixo(m.sem + i * 5) * 1.05;
      ctx.fillStyle = pal[i % 2 ? 1 : 3];
      ctx.fillRect(Math.round(p.x + Math.cos(ang) * d * rx), Math.round(p.y + Math.sin(ang) * d * ry), tam, tam * 2);
    }
  } else if (m.jeito === "mancha") {
    ctx.globalAlpha = a * 0.3; elipse(f, 1, pal[2]); ctx.globalAlpha = a * 0.35; elipse(f, 0.68, pal[3]); ctx.globalAlpha = a;
    const giro = parado ? 0 : agora / 2500; // uma runa girando bem devagar
    ctx.strokeStyle = pal[1]; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 4; i++) { const ang = giro + (i * Math.PI) / 2; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(ang) * rx * 0.8, p.y + Math.sin(ang) * ry * 0.8); ctx.lineTo(p.x + Math.cos(ang) * rx * 1.05, p.y + Math.sin(ang) * ry * 1.05); ctx.stroke(); }
  } else { // cratera
    elipse(f, 1.1, "rgba(0,0,0,.18)"); elipse(f, 1, "rgba(30,20,10,.42)"); elipse(f, 0.62, "rgba(15,8,4,.5)");
    ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
    raios(f, 5, 0.9, 1.3, "rgba(0,0,0,.45)", lw);
    pedrinhas(f, 6, pal[2], 1, 1.45, tam);
  }
  ctx.restore();
}
// as marcas de baixo dos bichos: depois da quadra, antes dos bichos e dos pilares
function desenharMarcas(agora) {
  const duracao = S?.match?.duracao;
  if (!marcas.length || !duracao) return;
  const tempo = tempoDePartida(agora), s = camera.escala;
  ctx.save(); ctx.beginPath(); ctx.rect(camera.x - 9 * s, camera.y - 6 * s, 18 * s, 12 * s); ctx.clip(); // só em cima do piso
  for (let i = marcas.length - 1; i >= 0; i--) if (alfaDaMarca(marcas[i].t0, tempo, duracao) <= 0) marcas.splice(i, 1); // já sumiu
  for (const m of marcas) desenharMarca(alfaDaMarca(m.t0, tempo, duracao), m, agora); // da mais velha para a mais nova
  ctx.restore();
}
