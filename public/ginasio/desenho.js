// Quadra e efeitos em canvas de baixa resolucao; os sprites continuam sendo os dos dois dex.
const cv = $("cv"), ctx = cv.getContext("2d");
const camera = { x: 0, y: 0, escala: 1, largura: 0, altura: 0 };
const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)");
const efeitos = [], ataques = new Map(), projeteisVisuais = new Map(), areasVisuais = new Map();
let tremor = 0;
const coresLados = ["#237dcd", "#df515a"];
const corTipo = (t) => dexAtual().TYPES[t] || "#bccdbd";

function ajustarCanvas() {
  const r = cv.getBoundingClientRect(), w = Math.max(1, Math.round(r.width / 2)), hh = Math.max(1, Math.round(r.height / 2));
  if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
  camera.largura = w; camera.altura = hh;
  const paisagemToque = toque && r.height < 320 && r.width > r.height && document.body.classList.contains("jogando");
  const fundo = paisagemToque ? 26 : 0;
  camera.escala = Math.max(1, Math.min((w - 12) / 22, (hh - fundo - 12) / 16));
  camera.x = w / 2; camera.y = (hh - fundo) / 2 + (S?.phase === "play" ? 8 : 0);
  ctx.imageSmoothingEnabled = false;
}
function pontoTela(x, y) { return { x: camera.x + x * camera.escala, y: camera.y + y * camera.escala }; }
function pontoMundo(x, y) {
  const r = cv.getBoundingClientRect();
  return { x: ((x - r.left) * cv.width / r.width - camera.x) / camera.escala, y: ((y - r.top) * cv.height / r.height - camera.y) / camera.escala };
}
function ret(x, y, w, hh, cor) { ctx.fillStyle = cor; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(hh)); }
function circulo(x, y, r, cor, cheio = true) {
  ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), Math.max(0.1, r), 0, Math.PI * 2);
  if (cheio) { ctx.fillStyle = cor; ctx.fill(); } else { ctx.strokeStyle = cor; ctx.lineWidth = 1; ctx.stroke(); }
}
function texto(t, x, y, cor = "#fff", tam = 6, alinhamento = "center") {
  ctx.fillStyle = cor; ctx.font = `700 ${tam}px ui-monospace,monospace`; ctx.textAlign = alinhamento; ctx.fillText(t, Math.round(x), Math.round(y));
}
function desenharQuadra() {
  const s = camera.escala, x = camera.x, y = camera.y;
  ret(0, 0, cv.width, cv.height, "#556961");
  for (let yy = 0; yy < cv.height; yy += 16) for (let xx = (yy / 16 % 2) * 8; xx < cv.width; xx += 32) ret(xx, yy, 30, 14, "#5a6e65");
  for (const lado of [-1, 1]) {
    for (let fila = 0; fila < 3; fila++) {
      const yy = y + lado * (6.55 + fila * 0.35) * s;
      ret(x - 9.8 * s, yy, 19.6 * s, s * 0.28, "#31443c");
      for (let i = 0; i < 29; i++) {
        const xx = x + (-9.4 + i * 0.65) * s, cor = i < 14 ? "#70a9c4" : "#ce8586";
        ret(xx, yy, s * 0.46, s * 0.2, cor);
        if ((i + fila) % 3 !== 0) { ret(xx + s * 0.15, yy - lado * s * 0.16, s * 0.17, s * 0.16, "#d9bf9f"); ret(xx + s * 0.09, yy, s * 0.28, s * 0.14, "#edf2e9"); }
      }
    }
  }
  ret(x - 9.25 * s, y - 6.25 * s, 18.5 * s, 12.5 * s, "#233c30");
  ret(x - 9 * s, y - 6 * s, 18 * s, 12 * s, "#dce6db");
  for (let faixa = 0; faixa < 18; faixa++) ret(x + (-9 + faixa) * s, y - 6 * s, s - 0.2, 12 * s, faixa % 2 ? "#d9e2d6" : "#e3e9df");
  ret(x - 9 * s, y - 6 * s, 0.7 * s, 12 * s, "#63aaba");
  ret(x + 8.3 * s, y - 6 * s, 0.7 * s, 12 * s, "#c78080");
  ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, s * 0.09);
  ctx.strokeRect(Math.round(x - 8.1 * s), Math.round(y - 5.35 * s), Math.round(16.2 * s), Math.round(10.7 * s));
  ctx.beginPath(); ctx.moveTo(x, y - 5.35 * s); ctx.lineTo(x, y + 5.35 * s); ctx.stroke();
  circulo(x, y, 2.1 * s, "#b0c8b3"); circulo(x, y, 2.1 * s, "#fff", false);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 1.04 * s, Math.PI, 0); ctx.closePath(); ctx.fillStyle = "#c77778"; ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 1.04 * s, 0, Math.PI); ctx.closePath(); ctx.fillStyle = "#f4f6ed"; ctx.fill(); ctx.restore();
  ret(x - 1.04 * s, y - s * 0.07, 2.08 * s, s * 0.14, "#4e6557"); circulo(x, y, s * 0.3, "#4e6557"); circulo(x, y, s * 0.17, "#f4f6ed");
  texto("GINÁSIO DA GALERA", x, y + 5.85 * s, "#617b68", Math.max(4, Math.min(8, s * 0.45)));
}
function desenharPilar(pilar) {
  const s = camera.escala, p = pontoTela(pilar.x, pilar.y), r = pilar.r * s;
  circulo(p.x + s * 0.16, p.y + s * 0.18, r + 1, "#a2afa1");
  circulo(p.x, p.y, r, "#59716d"); circulo(p.x, p.y - 1, r * 0.75, "#cad7cc");
  ret(p.x - r * 0.5, p.y - r * 0.4, r * 0.7, 2, "#eef4ec");
}
function partituraTipo(tipo, x, y, r, direcao = 0, fase = 0) {
  const cor = corTipo(tipo); ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(direcao);
  if (tipo === "Fogo" || tipo === "Dragão") {
    ret(-r * 1.7, -r * 0.45, r * 1.6, r * 0.9, tipo === "Fogo" ? "#e4523c" : cor);
    ret(-r, -r * 0.7, r * 1.6, r * 1.4, "#f6b955"); ret(-r * 0.2, -r * 0.35, r * 0.8, r * 0.7, "#fff5b5");
  } else if (tipo === "Raio" || tipo === "Elétrico") {
    ctx.strokeStyle = "#866d19"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r * 2, -r * 0.6); ctx.lineTo(-r * 0.6, r * 0.6); ctx.lineTo(0, -r * 0.4); ctx.lineTo(r, r * 0.1); ctx.stroke(); ctx.strokeStyle = "#fff18d"; ctx.lineWidth = 1; ctx.stroke();
  } else if (tipo === "Água") {
    circulo(-r * 0.7, 0, r * 0.8, "#357aaa"); circulo(r * 0.1, 0, r * 0.7, "#63c9dd"); ret(0, -r * 0.4, r * 0.45, 1, "#e0ffff");
  } else if (tipo === "Grama" || tipo === "Inseto") {
    ctx.fillStyle = cor; for (const sy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(0, sy * r); ctx.lineTo(r, 0); ctx.fill(); } ret(-r * 0.8, 0, r * 1.7, 1, "#effbb9");
  } else if (tipo === "Gelo" || tipo === "Aço") {
    ctx.strokeStyle = tipo === "Gelo" ? "#cffcff" : "#eaf0f7"; ctx.lineWidth = 2; for (let a = 0; a < 3; a++) { ctx.beginPath(); ctx.moveTo(Math.cos(a * Math.PI / 3) * r, Math.sin(a * Math.PI / 3) * r); ctx.lineTo(-Math.cos(a * Math.PI / 3) * r, -Math.sin(a * Math.PI / 3) * r); ctx.stroke(); } circulo(0, 0, r * 0.4, cor);
  } else if (tipo === "Pedra" || tipo === "Terrestre") {
    ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(-r, -r * 0.5); ctx.lineTo(0, -r); ctx.lineTo(r, -r * 0.2); ctx.lineTo(r * 0.5, r); ctx.lineTo(-r * 0.8, r * 0.7); ctx.fill(); ret(-r * 0.4, -r * 0.4, r * 0.7, r * 0.5, "#e9dda2");
  } else if (tipo === "Psíquico" || tipo === "Fantasma" || tipo === "Venenoso" || tipo === "Sombrio") {
    circulo(0, 0, r, cor); circulo(0, 0, r * 0.5, "#f2e4ee", false); ret(-r * 1.7, -1, r * 0.55, 2, cor); ret(-r * 1.3, r * 0.5, 1, 1, "#fff");
  } else if (tipo === "Voador") {
    ctx.strokeStyle = "#f3f7ed"; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r * 1.7, i * r * 0.6); ctx.lineTo(r, i * r * 0.6 - r * 0.3); ctx.stroke(); }
  } else {
    ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(0, -r); ctx.lineTo(r * 1.2, 0); ctx.lineTo(0, r); ctx.fill(); ret(-1, -1, 2, 2, "#fff6cb");
  }
  ctx.restore();
}
function desenharArea(a, agora) {
  const p = pontoTela(a.x, a.y), r = a.r * camera.escala, falta = Math.max(0, a.falta - Math.max(0, agora - a.t) / 1000);
  ctx.save(); ctx.globalAlpha = 0.2; circulo(p.x, p.y, r, corTipo(a.elemento)); ctx.globalAlpha = 1;
  ctx.setLineDash([2, 2]); circulo(p.x, p.y, r, a.lado === meuJogador()?.lado ? "#287253" : "#b33744", false); ctx.setLineDash([]);
  ctx.strokeStyle = corTipo(a.elemento); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.85, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(1 - falta / a.aviso, 0, 1)); ctx.stroke();
  ret(p.x - 3, p.y - 0.5, 6, 1, "#536458"); ret(p.x - 0.5, p.y - 3, 1, 6, "#536458"); ctx.restore();
}
function desenharBicho(e, agora, modo) {
  const s = camera.escala, p = pontoTela(e.x, e.y), tamanho = Math.max(8, Math.round(s * (modo === "pokemon" ? 3.1 : 1.8)));
  const ataque = ataques.get(e.id), atacando = ataque && agora - ataque.t < 200;
  const andando = Math.hypot(e.vx || 0, e.vy || 0) > 0.1;
  const salto = movimentoReduzido.matches ? 0 : andando ? Math.round(Math.abs(Math.sin(agora / 95)) * Math.min(2, s * 0.18)) : 0;
  const imagem = imagemDe(e.forma || e.bicho, modo);
  const morreu = efeitos.find((f) => f.tipo === "desmaiou" && f.id === e.id && agora - f.t < 450);
  if (!e.campo && !morreu) return;
  ctx.save();
  if (!e.campo) ctx.globalAlpha = Math.max(0, 1 - (agora - morreu.t) / 450);
  ctx.fillStyle = "#314c3450"; ctx.beginPath(); ctx.ellipse(p.x, p.y + s * 0.4, s * 0.65, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  circulo(p.x, p.y + s * 0.27, s * 0.57, e.id === ME?.id ? "#ffe56a" : coresLados[e.lado], false);
  if (e.escudo) circulo(p.x, p.y, s * 0.9, "#75c8c3", false);
  if (e.invulneravel > 0) ctx.globalAlpha *= 0.65;
  const inclinar = atacando && !movimentoReduzido.matches ? Math.sin((agora - ataque.t) / 200 * Math.PI) * s * 0.15 : 0;
  ctx.translate(Math.round(p.x + e.mira.x * inclinar), Math.round(p.y - salto));
  if (e.mira.x < 0) ctx.scale(-1, 1);
  if (imagem.pronto) ctx.drawImage(imagem.img, -tamanho / 2, -tamanho * 0.65, tamanho, tamanho);
  else { ret(-s * 0.4, -s * 0.6, s * 0.8, s * 0.9, corTipo(dexDe(modo).MONS[e.bicho].types[0])); texto(imagem.erro ? "?" : "·", 0, 0, "#fff", Math.max(6, s * 0.7)); }
  ctx.restore();
  if (!e.campo) return;
  const largura = Math.max(15, s * 1.5), topoVida = p.y - s * (modo === "pokemon" ? 2.15 : 1.25);
  ret(p.x - largura / 2 - 1, topoVida - 1, largura + 2, 4, "#334d3b");
  ret(p.x - largura / 2, topoVida, largura * Math.max(0, e.hp / e.max), 2, e.lado ? "#ec828b" : "#55b49c");
  if (e.canal) { ret(p.x - largura / 2, p.y + s * 0.68, largura, 2, "#315747"); ret(p.x - largura / 2, p.y + s * 0.68, largura * (1 - e.canal.t / 0.8), 2, "#b7f59b"); }
  if (Object.values(e.st || {}).some((v) => v > 0)) texto("+", p.x + s * 0.7, p.y - s * 0.5, "#167247", 8);
  if (Object.values(e.st || {}).some((v) => v < 0)) texto("−", p.x - s * 0.7, p.y - s * 0.5, "#9f3254", 8);
}
function efeitoVisual(ev) {
  const agora = ev.t || relogio.agora();
  if (ev.tipo === "projetil") projeteisVisuais.set(ev.id, { ...ev });
  if (ev.tipo === "area") areasVisuais.set(ev.id, { ...ev });
  if (ev.tipo === "impacto") projeteisVisuais.delete(ev.id);
  if (ev.tipo === "explosao") areasVisuais.delete(ev.id);
  const e = N.snap?.entidades.find((p) => p.id === (ev.id || ev.em));
  if (ev.tipo === "golpe") ataques.set(ev.id, { ...ev, t: agora });
  if (["golpe", "dano", "cura", "esquiva", "troca", "desmaiou", "explosao", "impacto", "atributo", "transformar"].includes(ev.tipo)) {
    efeitos.push({ ...ev, t: agora, x: ev.x ?? e?.x ?? 0, y: ev.y ?? e?.y ?? 0, mira: e?.mira || { x: 1, y: 0 } });
    if (efeitos.length > 120) efeitos.splice(0, efeitos.length - 120);
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
  for (let i = efeitos.length - 1; i >= 0; i--) {
    const f = efeitos[i], idade = (agora - f.t) / 1000;
    if (idade > 0.8) { efeitos.splice(i, 1); continue; }
    if (idade < 0) continue;
    const p = pontoTela(f.x, f.y), s = camera.escala;
    ctx.save();
    if (f.tipo === "dano" || f.tipo === "cura") {
      ctx.globalAlpha = Math.min(1, (0.8 - idade) * 3);
      texto(f.tipo === "cura" ? "+" : String(f.dano), p.x, p.y - s * (1.1 + (movimentoReduzido.matches ? 0 : idade)), f.tipo === "cura" ? "#176c43" : f.crit ? "#a9500f" : "#852c45", Math.max(7, s * 0.65));
    } else if (f.tipo === "golpe" && f.classe === "corpo" && idade < 0.18) {
      const mv = dexAtual().MOVES[f.golpe], a = Math.atan2(f.mira.y, f.mira.x), r = 1.2 * s;
      ctx.strokeStyle = corTipo(mv?.t); ctx.lineWidth = Math.max(2, s * 0.25); ctx.beginPath(); ctx.arc(p.x, p.y, r, a - Math.PI / 4, a + Math.PI / 4); ctx.stroke();
    } else if ((f.tipo === "explosao" || f.tipo === "impacto") && idade < 0.4) {
      const raio = (f.r || 0.7) * s, progresso = movimentoReduzido.matches ? 0.5 : idade / 0.4;
      ctx.globalAlpha = 1 - idade / 0.4;
      for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; partituraTipo(f.elemento, p.x + Math.cos(a) * raio * progresso, p.y + Math.sin(a) * raio * progresso, Math.max(2, s * 0.3), a); }
    } else if (f.tipo === "esquiva" && idade < 0.25) { ctx.globalAlpha = 1 - idade * 4; circulo(p.x, p.y, s * 0.65, "#fef5aa", false); }
    else if (["cura", "atributo", "troca", "transformar"].includes(f.tipo) && idade < 0.4) { ctx.globalAlpha = 1 - idade / 0.4; circulo(p.x, p.y, s * (movimentoReduzido.matches ? 0.9 : 0.7 + idade), "#68b987", false); }
    ctx.restore();
  }
}
function entidadesVisuais(agora) {
  if (!S?.match || S.phase === "lobby") return [
    { id: "previa0", bicho: times[modoAtual()][0], forma: times[modoAtual()][0], x: -5.5, y: 0, vx: 0, vy: 0, lado: 0, campo: true, mira: { x: 1, y: 0 }, hp: 1, max: 1 },
    { id: "previa1", bicho: dexAtual().DEFAULT_TEAM[1], forma: dexAtual().DEFAULT_TEAM[1], x: 5.5, y: 0, vx: 0, vy: 0, lado: 1, campo: true, mira: { x: -1, y: 0 }, hp: 1, max: 1 },
  ];
  const remoto = interpolarEntidades(agora - 100);
  if (N.previsto && S.phase === "play") {
    const i = remoto.findIndex((e) => e.id === ME?.id);
    if (i >= 0) remoto[i] = { ...remoto[i], x: N.previsto.x + N.erro.x, y: N.previsto.y + N.erro.y, mira: N.previsto.mira, vx: N.previsto.vx, vy: N.previsto.vy };
  }
  return remoto;
}
function desenhar(agora = relogio.agora(), dt = 0) {
  ajustarCanvas(); ctx.save();
  if (tremor > 0 && !movimentoReduzido.matches) { ctx.translate(Math.sin(agora * 0.03) * 1.5, Math.cos(agora * 0.04)); tremor = Math.max(0, tremor - dt); }
  desenharQuadra();
  for (const a of areasVisuais.values()) desenharArea(a, agora);
  const lista = entidadesVisuais(agora);
  const objetos = [...lista.map((e) => ({ y: e.y, bicho: e })), ...Ginasio.ARENA.pilares.map((p) => ({ y: p.y, pilar: p }))].sort((a, b) => a.y - b.y);
  for (const objeto of objetos) objeto.pilar ? desenharPilar(objeto.pilar) : desenharBicho(objeto.bicho, agora, modoAtual());
  for (const pr of projeteisVisuais.values()) {
    const idade = Math.max(0, (agora - pr.t) / 1000); if (idade > pr.vida) continue;
    const p = pontoTela(pr.x + pr.dx * pr.v * idade, pr.y + pr.dy * pr.v * idade);
    partituraTipo(pr.elemento, p.x, p.y, Math.max(2, pr.raio * camera.escala), Math.atan2(pr.dy, pr.dx), agora);
  }
  desenharEfeitos(agora);
  if (entrada.preparando != null && N.previsto) {
    const e = N.previsto, c = comandoAtual(), hab = Ginasio.habilidadeDeGolpe(dexAtual().MONS[e.bicho.as || e.bicho.id].moves[entrada.preparando], dexAtual().MOVES[dexAtual().MONS[e.bicho.as || e.bicho.id].moves[entrada.preparando]]);
    const distancia = c.alvo ? Math.hypot(c.alvo.x - e.x, c.alvo.y - e.y) : hab.alcance;
    const alcance = Math.min(hab.alcance, distancia), p = pontoTela(e.x, e.y), alvo = pontoTela(e.x + c.mira.x * alcance, e.y + c.mira.y * alcance);
    ctx.strokeStyle = "#ffdc65"; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(alvo.x, alvo.y); ctx.stroke(); ctx.setLineDash([]);
    if (hab.classe === "area") circulo(alvo.x, alvo.y, hab.raio * camera.escala, "#c18e2d", false);
  }
  ctx.restore();
}
