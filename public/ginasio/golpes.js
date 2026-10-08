// Os golpes de cada tipo em pixel-art animada: o projétil voando (bola de fogo que tremula, raio que pisca, folhas
// girando...), o corte do corpo a corpo, o estouro do impacto e o golpe de área caindo (raio do céu, coluna de fogo,
// gêiser, pedras caindo). Os quadros andam pelo relógio do jogo, então todo mundo vê o mesmo ritmo.
const FAMILIA = {
  Fogo: "fogo", "Dragão": "dragao", "Água": "agua", Raio: "raio", "Elétrico": "raio", Grama: "planta", Inseto: "inseto",
  Gelo: "gelo", "Aço": "aco", Pedra: "pedra", Terrestre: "terra", "Psíquico": "psiquico", Fantasma: "fantasma",
  Venenoso: "veneno", Sombrio: "sombrio", Voador: "voador", Lutador: "lutador", Fada: "fada", Normal: "normal",
};
// do mais claro ao mais escuro
const PALETA = {
  fogo: ["#fff3a0", "#ffb43a", "#f0602a", "#a8321e"], dragao: ["#eadcff", "#9a6cff", "#5a38d8", "#2c1d78"],
  agua: ["#e8ffff", "#8fe0f6", "#3f9ee0", "#245e9e"], raio: ["#ffffff", "#fff27a", "#f2c41a", "#8c6c0c"],
  planta: ["#e8ffb0", "#8fdc5a", "#3fa83a", "#1f6a2a"], inseto: ["#f4ffb0", "#c4d83a", "#8aa020", "#4a5a10"],
  gelo: ["#ffffff", "#d4fbff", "#8fe0f0", "#3f96b8"], aco: ["#ffffff", "#dfe4ee", "#9aa2b8", "#545a72"],
  pedra: ["#efe0b0", "#c8ac6a", "#8f7440", "#4f3f20"], terra: ["#f4dca0", "#d8a858", "#a8743a", "#5f3f1f"],
  psiquico: ["#ffe0f0", "#ff8fc4", "#e0529c", "#8a2a60"], fantasma: ["#efe0ff", "#b49ae0", "#705898", "#3a2a58"],
  veneno: ["#f4d8ff", "#c46ae0", "#9040a8", "#4a1f5a"], sombrio: ["#d8c8b8", "#8a7060", "#4a3a30", "#1f1814"],
  voador: ["#ffffff", "#e4ecff", "#b4c4f0", "#7a8ac8"], lutador: ["#fff0d0", "#f0a060", "#c03028", "#6a1810"],
  fada: ["#ffffff", "#ffd8ec", "#f090b8", "#b05080"], normal: ["#ffffff", "#f0ecd8", "#c8c0a0", "#7a7458"],
};
const familiaDe = (tipo) => FAMILIA[tipo] || "normal";
const paletaDe = (tipo) => PALETA[familiaDe(tipo)];
// zigue-zagues prontos para o raio (um por quadro)
const ZIGUE = [[0.5, -0.45, 0.6, -0.5], [-0.5, 0.5, -0.3, 0.45], [0.35, -0.6, 0.2, -0.3], [-0.3, 0.3, -0.6, 0.5]];

function poligono(pontos, cor, contorno) {
  ctx.beginPath(); pontos.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  ctx.fillStyle = cor; ctx.fill();
  if (contorno) { ctx.strokeStyle = contorno; ctx.lineWidth = 1; ctx.stroke(); }
}
function estrela(n, r1, r2, giro, cor, contorno) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = giro + (i * Math.PI) / n, r = i % 2 ? r2 : r1; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  poligono(pts, cor, contorno);
}
function raioZigue(de, ate, r, quadro, grosso, fina) {
  const z = ZIGUE[quadro % 4], pts = [[de, 0]];
  for (let i = 0; i < 4; i++) pts.push([de + ((ate - de) * (i + 1)) / 5, z[i] * r]);
  pts.push([ate, 0]);
  for (const [cor, lw] of [[grosso, Math.max(2, r * 0.55)], [fina, 1]]) {
    ctx.strokeStyle = cor; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
}

// o projétil voando; x vai para a frente (o desenho é girado na direção do tiro)
function desenharProjetil(tipo, x, y, r, angulo, agora, id = 0) {
  const fam = familiaDe(tipo), P = PALETA[fam], t = agora + id * 137, quadro = Math.floor(t / 70) % 4;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(angulo);
  if (fam === "fogo" || fam === "dragao") {
    for (let i = 4; i >= 0; i--) circulo(-i * r * 0.6, Math.sin(t / 45 + i * 1.7) * r * 0.25 * (i ? 1 : 0), r * (1.05 - i * 0.17), P[Math.min(3, i)]);
    circulo(r * 0.15, 0, r * 0.45, P[0]);
  } else if (fam === "agua") {
    circulo(-r * 1.25, (quadro % 2 ? 1 : -1) * r * 0.3, r * 0.3, P[2]); circulo(-r * 1.9, (quadro % 2 ? -1 : 1) * r * 0.25, r * 0.2, P[1]);
    circulo(0, 0, r, P[2]); circulo(r * 0.1, 0, r * 0.7, P[1]);
    ret(Math.cos(t / 90) * r * 0.35, Math.sin(t / 90) * r * 0.35 - 1, Math.max(1, r * 0.3), Math.max(1, r * 0.3), P[0]);
  } else if (fam === "raio") {
    raioZigue(-r * 2.4, r * 0.9, r, quadro, P[3], quadro % 2 ? P[0] : P[1]);
    circulo(r * 0.6, 0, r * 0.45, quadro % 2 ? P[0] : P[1]);
    if (quadro % 2) { ret(-r, -r * 1.1, 1, 1, P[1]); ret(-r * 1.6, r * 0.9, 1, 1, P[0]); }
  } else if (fam === "planta" || fam === "inseto") {
    if (fam === "inseto") { ctx.globalAlpha = quadro % 2 ? 0.8 : 0.35; circulo(-r * 0.2, -r * 0.7, r * 0.5, P[0]); circulo(-r * 0.2, r * 0.7, r * 0.5, P[0]); ctx.globalAlpha = 1; poligono([[r * 1.2, 0], [-r * 0.6, -r * 0.55], [-r * 0.6, r * 0.55]], P[2], P[3]); }
    else for (let k = 0; k < 3; k++) {
      const a = t / 70 + k * 2.09, lx = Math.cos(a) * r * 0.75, ly = Math.sin(a) * r * 0.75;
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(a * 2);
      poligono([[-r * 0.6, 0], [0, -r * 0.32], [r * 0.6, 0], [0, r * 0.32]], P[2], P[3]); ret(-r * 0.45, 0, r * 0.9, 1, P[0]);
      ctx.restore();
    }
  } else if (fam === "gelo" || fam === "aco") {
    ctx.rotate(t / (fam === "gelo" ? 90 : 45));
    if (fam === "gelo") {
      ctx.strokeStyle = P[3]; ctx.lineWidth = Math.max(2, r * 0.35);
      for (let a = 0; a < 3; a++) { const c = Math.cos((a * Math.PI) / 3) * r * 1.1, s2 = Math.sin((a * Math.PI) / 3) * r * 1.1; ctx.beginPath(); ctx.moveTo(c, s2); ctx.lineTo(-c, -s2); ctx.stroke(); }
      ctx.strokeStyle = P[1]; ctx.lineWidth = 1; ctx.stroke();
      estrela(4, r * 0.55, r * 0.25, 0, P[0]);
    } else { estrela(4, r * 1.15, r * 0.4, 0, P[2], P[3]); estrela(4, r * 0.55, r * 0.2, 0, P[0]); }
  } else if (fam === "pedra" || fam === "terra") {
    ret(-r * 1.6, -r * 0.1 + (quadro % 2), Math.max(1, r * 0.35), Math.max(1, r * 0.35), P[1]);
    ret(-r * 2.2, r * 0.3 - (quadro % 2), Math.max(1, r * 0.25), Math.max(1, r * 0.25), P[1]);
    ctx.rotate(t / 90);
    poligono([[-r, -r * 0.5], [-r * 0.2, -r], [r * 0.9, -r * 0.4], [r, r * 0.45], [r * 0.1, r], [-r * 0.85, r * 0.6]], P[2], P[3]);
    ret(-r * 0.45, -r * 0.5, r * 0.6, r * 0.35, P[1]);
  } else if (fam === "psiquico") {
    for (let i = 0; i < 3; i++) { const k = ((t / 260 + i / 3) % 1); ctx.globalAlpha = 1 - k; circulo(0, 0, r * (0.35 + k * 0.9), P[1 + (i % 2)], false); }
    ctx.globalAlpha = 1; circulo(0, 0, r * 0.45, P[2]); circulo(0, 0, r * 0.22, P[0]);
  } else if (fam === "fantasma") {
    ctx.globalAlpha = 0.75 + (quadro % 2) * 0.2;
    for (let i = 3; i >= 1; i--) circulo(-i * r * 0.55, Math.sin(t / 70 + i) * r * 0.35, r * (0.75 - i * 0.15), P[2]);
    circulo(0, 0, r, P[2]); ctx.globalAlpha = 1;
    ret(r * 0.1, -r * 0.35, Math.max(1, r * 0.22), Math.max(1, r * 0.3), P[0]); ret(r * 0.45, -r * 0.35, Math.max(1, r * 0.22), Math.max(1, r * 0.3), P[0]);
  } else if (fam === "veneno") {
    circulo(0, 0, r, P[2]); circulo(0, r * 0.25, r * 0.7, P[3]); circulo(-r * 0.25, -r * 0.3, r * 0.3, P[1]);
    for (let i = 0; i < 3; i++) { const k = ((t / 300 + i / 3) % 1); circulo(-r * (0.6 + k * 1.2), Math.sin(i * 2.3) * r * 0.6, r * 0.25 * (1 - k), P[1]); }
  } else if (fam === "sombrio") {
    ctx.rotate(t / 60);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.1, -Math.PI * 0.75, Math.PI * 0.75); ctx.arc(r * 0.45, 0, r * 0.8, Math.PI * 0.62, -Math.PI * 0.62, true); ctx.closePath();
    ctx.fillStyle = P[3]; ctx.fill(); ctx.strokeStyle = P[1]; ctx.lineWidth = 1; ctx.stroke();
  } else if (fam === "voador") {
    ctx.strokeStyle = P[2]; ctx.lineWidth = Math.max(2, r * 0.3);
    for (let i = -1; i <= 1; i++) { const dx = ((quadro + i + 3) % 3) * r * 0.25; ctx.beginPath(); ctx.arc(-r * 0.4 - dx, i * r * 0.55, r * 0.9, -Math.PI * 0.35, Math.PI * 0.35); ctx.stroke(); }
    ctx.strokeStyle = P[0]; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-r * 0.4, 0, r * 0.9, -Math.PI * 0.35, Math.PI * 0.35); ctx.stroke();
  } else if (fam === "lutador") {
    for (let i = -1; i <= 1; i++) ret(-r * 2.2 + (quadro % 2) * r * 0.3, i * r * 0.6, r * 1.1, 1, P[1]);
    ret(-r * 0.7, -r * 0.8, r * 1.5, r * 1.6, P[3]); ret(-r * 0.55, -r * 0.65, r * 1.2, r * 1.3, P[1]);
    for (let i = 0; i < 4; i++) ret(r * 0.45, -r * 0.65 + i * r * 0.33, r * 0.25, 1, P[3]);
  } else if (fam === "fada") {
    for (let i = 0; i < 3; i++) { const a = t / 120 + i * 2.09, tw = (Math.floor(t / 90) + i) % 2; ctx.save(); ctx.translate(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); estrela(4, r * (tw ? 0.75 : 0.5), r * 0.18, 0, P[i % 2 ? 0 : 2]); ctx.restore(); }
    circulo(0, 0, r * 0.35, P[1]);
  } else {
    estrela(5, r * 1.1, r * 0.5, t / 80, P[1], P[3]); circulo(0, 0, r * 0.3, P[0]);
  }
  ctx.restore();
}

// o corte do corpo a corpo: um arco na cor do tipo que afina em 3 quadros
function desenharCorte(f, idade) {
  const s = camera.escala, p = pontoTela(f.x, f.y), P = paletaDe(f.elemento), a = anguloTela(f.x, f.y, f.mira.x, f.mira.y);
  const k = idade / 0.2, r = (1 + k * 0.35) * s, abre = Math.PI * (0.25 + k * 0.2);
  ctx.save();
  ctx.globalAlpha = 1 - k * 0.6;
  for (const [cor, lw] of [[P[2], Math.max(2, s * 0.32 * (1 - k))], [P[0], Math.max(1, s * 0.12 * (1 - k))]]) {
    ctx.strokeStyle = cor; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(p.x, p.y - s * 0.4, r, a - abre, a + abre); ctx.stroke();
  }
  ctx.restore();
}

// o estouro: o anel e as partículas no jeito do tipo (brasas sobem, gotas espirram, pedras quicam...)
function estouro(tipo, x, y, forca = 1) {
  const fam = familiaDe(tipo), P = PALETA[fam], n = Math.round(6 + forca * 8);
  const o = {
    fogo: { vel: 1.6, sobe: 2.5, g: -1.5, vida: 0.55, tam: 0.12 }, dragao: { vel: 1.8, sobe: 2.5, g: -1, vida: 0.55, tam: 0.12 },
    agua: { vel: 2, sobe: 4.5, g: 12, vida: 0.5, tam: 0.11, quica: 0 }, raio: { vel: 4, sobe: 1, g: 0, vida: 0.22, tam: 0.09 },
    planta: { vel: 1.4, sobe: 2.2, g: 1.5, vida: 0.8, tam: 0.13, atrito: 2 }, inseto: { vel: 2, sobe: 1.5, g: 3, vida: 0.4, tam: 0.09 },
    gelo: { vel: 2.4, sobe: 3, g: 10, vida: 0.5, tam: 0.11 }, aco: { vel: 3, sobe: 2.5, g: 10, vida: 0.4, tam: 0.09 },
    pedra: { vel: 1.8, sobe: 4, g: 12, vida: 0.7, tam: 0.16 }, terra: { vel: 1.8, sobe: 4, g: 12, vida: 0.7, tam: 0.15 },
    psiquico: { vel: 1, sobe: 1, g: -1, vida: 0.5, tam: 0.1 }, fantasma: { vel: 0.8, sobe: 1.2, g: -2, vida: 0.7, tam: 0.12 },
    veneno: { vel: 1.2, sobe: 2.4, g: 4, vida: 0.6, tam: 0.12, quica: 0 }, sombrio: { vel: 1.6, sobe: 1.5, g: 2, vida: 0.45, tam: 0.12 },
    voador: { vel: 1.6, sobe: 1.6, g: 0.8, vida: 0.8, tam: 0.12, atrito: 2.5 }, lutador: { vel: 3, sobe: 1.5, g: 6, vida: 0.3, tam: 0.1 },
    fada: { vel: 1.2, sobe: 2, g: -0.6, vida: 0.7, tam: 0.1 }, normal: { vel: 2.2, sobe: 2, g: 8, vida: 0.4, tam: 0.1 },
  }[fam];
  espalhar(x, y, n, [P[0], P[1], P[2]], { ...o, z: 0.4 });
  efeitos.push({ tipo: "estouro", elemento: tipo, x, y, forca, t: relogio.agora() });
}
function desenharEstouro(f, idade) {
  if (idade > 0.32) return;
  const s = camera.escala, p = pontoTela(f.x, f.y), P = paletaDe(f.elemento), k = idade / 0.32, r = s * (0.35 + k * 0.75) * (0.7 + f.forca * 0.3);
  ctx.save();
  if (idade < 0.06) circulo(p.x, p.y - s * 0.4, r * 0.8, P[0]);
  ctx.globalAlpha = 1 - k; ctx.strokeStyle = P[1]; ctx.lineWidth = Math.max(1, s * 0.22 * (1 - k));
  ctx.beginPath(); ctx.arc(p.x, p.y - s * 0.4, r, 0, Math.PI * 2); ctx.stroke();
  if (familiaDe(f.elemento) === "raio" && idade < 0.15) for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(p.x, p.y - s * 0.4); ctx.rotate(i * 1.57 + idade * 20); raioZigue(0, r * 1.2, s * 0.25, i, P[3], P[0]); ctx.restore(); }
  ctx.restore();
}

// o golpe de área caindo (na tela, por cima da cena): pedras no fim do aviso; na hora, raio do céu, coluna de fogo ou gêiser
function desenharQuedaArea(a, falta) {
  const fam = familiaDe(a.elemento);
  if ((fam !== "pedra" && fam !== "terra") || falta > 0.35 || movimentoReduzido.matches) return;
  const s = camera.escala, P = PALETA[fam], k = falta / 0.35;
  for (let i = 0; i < 3; i++) {
    const ang = i * 2.1 + a.id, px = a.x + Math.cos(ang) * a.r * 0.45, py = a.y + Math.sin(ang) * a.r * 0.35;
    const p = pontoTela(px, py, k * 6 + i * 0.6), r = s * 0.28;
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.rotate(k * 6 + i);
    poligono([[-r, -r * 0.5], [-r * 0.2, -r], [r * 0.9, -r * 0.4], [r, r * 0.45], [r * 0.1, r], [-r * 0.85, r * 0.6]], P[2], P[3]);
    ctx.restore();
  }
}
function desenharGolpeArea(f, idade) {
  if (idade > 0.3) return;
  const fam = familiaDe(f.elemento), P = PALETA[fam], s = camera.escala, p = pontoTela(f.x, f.y), k = idade / 0.3;
  ctx.save();
  if (fam === "raio" && idade < 0.16) {
    ctx.translate(p.x, p.y); ctx.rotate(-Math.PI / 2);
    raioZigue(0, p.y + 10, s * 0.7, Math.floor(idade / 0.04), P[3], P[0]);
  } else if (fam === "fogo" || fam === "dragao") {
    ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 6; i++) { const w = (f.r || 1.5) * s * (0.8 - i * 0.1) * (1 + Math.sin(idade * 60 + i) * 0.08); ret(p.x - w / 2, p.y - s * (i + 1) * 0.7 * (1 + k), w, s * 0.75, P[Math.min(3, Math.floor(i / 1.5))]); }
  } else if (fam === "agua") {
    ctx.globalAlpha = 1 - k;
    const w = (f.r || 1.5) * s * 0.7, alt = s * 3.5 * Math.sin(k * Math.PI);
    ret(p.x - w / 2, p.y - alt, w, alt, P[2]); ret(p.x - w / 4, p.y - alt, w / 2, alt, P[1]); circulo(p.x, p.y - alt, w * 0.55, P[0]);
  }
  ctx.restore();
}
