// O tema de cada ginásio: quem desafia um líder (ou treinador) da Vila luta na casa dele. O tipo do líder escolhe as
// cores da quadra e da arquibancada, o desenho do chão (lava, ondas, flores, placas de metal...), os pilares e o clima
// que passa por cima da luta (brasas, bolhas, folhas, faíscas, neve...). Sem líder, fica o Ginásio da Galera de sempre.
// Usa as peças de desenho.js (ctx, camera, ret, circulo, texto, movimentoReduzido).
const TEMAS = {
  padrao: { nome: "GINÁSIO DA GALERA", fundo: ["#556961", "#5a6e65"], arquibancada: "#31443c", torcida: ["#70a9c4", "#ce8586"], borda: "#233c30",
    piso: ["#d9e2d6", "#e3e9df"], laterais: ["#63aaba", "#c78080"], linha: "#ffffff", centro: "#b0c8b3", meio: ["#c77778", "#f4f6ed"], miolo: "#4e6557", letreiro: "#617b68",
    pilar: ["#a2afa1", "#59716d", "#cad7cc", "#eef4ec"] },
  "Fogo": { nome: "GINÁSIO BRASA", fundo: ["#2b1210", "#341713"], arquibancada: "#1c0907", torcida: ["#ff7a2e", "#ffcf4a"], borda: "#120403",
    piso: ["#4a221a", "#53271d"], laterais: ["#ff9a3c", "#d9452b"], linha: "#ffb066", centro: "#6e2a1b", meio: ["#ee6a2c", "#ffd34d"], miolo: "#2b0f0a", letreiro: "#ff9a4d",
    pilar: ["#160605", "#3b1a14", "#7a3a24", "#ffb066"], chao: "lava", clima: "brasas" },
  "Água": { nome: "GINÁSIO MARÉ", fundo: ["#0e2a44", "#123250"], arquibancada: "#0a1d30", torcida: ["#5fb8ff", "#bfe4ff"], borda: "#071726",
    piso: ["#2a6fa8", "#2f78b3"], laterais: ["#bfe4ff", "#5fb8ff"], linha: "#d8f1ff", centro: "#3d8bc8", meio: ["#3f86e0", "#e8f6ff"], miolo: "#0f3a63", letreiro: "#8fd0ff",
    pilar: ["#0a2338", "#2f6f8f", "#7cc6d6", "#e2fbff"], chao: "ondas", clima: "bolhas" },
  "Grama": { nome: "GINÁSIO MATA", fundo: ["#1f3a1a", "#24431e"], arquibancada: "#142810", torcida: ["#7fd36b", "#e7f59a"], borda: "#0e1f0b",
    piso: ["#4f9a3f", "#57a546"], laterais: ["#d8f5a2", "#3a7a2c"], linha: "#f2ffe0", centro: "#68b354", meio: ["#4cb04a", "#d8f5a2"], miolo: "#24501b", letreiro: "#a9e58a",
    pilar: ["#122a0e", "#6b4a2b", "#3f8a32", "#9fdc7a"], chao: "flores", clima: "folhas" },
  "Elétrico": { nome: "GINÁSIO FAÍSCA", fundo: ["#26241a", "#2d2a1e"], arquibancada: "#1a1810", torcida: ["#ffe14d", "#fff5b0"], borda: "#0f0e08",
    piso: ["#4a4a52", "#525259"], laterais: ["#ffe14d", "#1c1c20"], linha: "#ffe14d", centro: "#5d5c63", meio: ["#e9b914", "#fff5b0"], miolo: "#222226", letreiro: "#ffe14d",
    pilar: ["#0f0e08", "#3a3a40", "#8a8a93", "#ffe14d"], chao: "placas", clima: "faiscas" },
  "Pedra": { nome: "ARENA ROCHEDO", fundo: ["#3a3226", "#40372a"], arquibancada: "#2a231a", torcida: ["#c8a46a", "#8a7350"], borda: "#1d1811",
    piso: ["#a08a62", "#a8936b"], laterais: ["#7a6544", "#5d4c33"], linha: "#f4e7c8", centro: "#8f7953", meio: ["#a08a56", "#e9dcbb"], miolo: "#5d4c33", letreiro: "#e0c993",
    pilar: ["#1d1811", "#6e6253", "#a69a88", "#dcd2c2"], chao: "pedras", clima: "poeira" },
  "Psíquico": { nome: "SALÃO MÍSTICO", fundo: ["#2a1530", "#311a38"], arquibancada: "#1c0d21", torcida: ["#ff8acb", "#c79bff"], borda: "#130816",
    piso: ["#7a3d78", "#844383"], laterais: ["#ff8acb", "#c79bff"], linha: "#ffd0f0", centro: "#9a539a", meio: ["#e0529c", "#ffe0f2"], miolo: "#4a1f4a", letreiro: "#ffb3e0",
    pilar: ["#130816", "#5a2a6a", "#b77ad0", "#ffe0f2"], chao: "runas", clima: "estrelas" },
  "Fantasma": { nome: "CASARÃO ASSOMBRADO", fundo: ["#15121f", "#1a1626"], arquibancada: "#0d0b14", torcida: ["#8f7bd0", "#4f4570"], borda: "#08070c",
    piso: ["#3a3350", "#403858"], laterais: ["#705898", "#2a2340"], linha: "#b9a6ff", centro: "#4b4268", meio: ["#705898", "#d9d0ff"], miolo: "#221d33", letreiro: "#b9a6ff",
    pilar: ["#08070c", "#4a4458", "#8b84a0", "#d9d0ff"], chao: "rachaduras", clima: "nevoa" },
  "Dragão": { nome: "TOCA DO DRAGÃO", fundo: ["#1d1430", "#231838"], arquibancada: "#130c20", torcida: ["#a77bff", "#ffcf6b"], borda: "#0b0714",
    piso: ["#4b3a78", "#523f82"], laterais: ["#ffcf6b", "#7038f8"], linha: "#ffcf6b", centro: "#5e4a94", meio: ["#7038f8", "#ffe7a8"], miolo: "#2a1f48", letreiro: "#ffcf6b",
    pilar: ["#0b0714", "#4a2f6e", "#8e6fd0", "#ffcf6b"], chao: "escamas", clima: "brasas" },
  "Lutador": { nome: "DOJÔ DO PUNHO", fundo: ["#2e1d12", "#352216"], arquibancada: "#20140c", torcida: ["#e0573f", "#f2d28a"], borda: "#140c07",
    piso: ["#c9b27a", "#d2bb83"], laterais: ["#c03028", "#7a2a20"], linha: "#7a2a20", centro: "#b89c62", meio: ["#c03028", "#f6ead0"], miolo: "#5a2a1a", letreiro: "#7a2a20",
    pilar: ["#140c07", "#6b3a22", "#a8693f", "#f2d28a"], chao: "tatame", clima: "poeira" },
  "Gelo": { nome: "PISTA GEADA", fundo: ["#163040", "#1a3749"], arquibancada: "#0e212d", torcida: ["#9be3f0", "#ffffff"], borda: "#0a1820",
    piso: ["#bfe6ef", "#c9ecf3"], laterais: ["#78c8c8", "#e8fbff"], linha: "#ffffff", centro: "#a6dbe6", meio: ["#78c8c8", "#ffffff"], miolo: "#5aa7b8", letreiro: "#3f8aa0",
    pilar: ["#0a1820", "#7fb9c9", "#d6f3fa", "#ffffff"], chao: "gelo", clima: "neve" },
};
// o líder da partida (ou o do convite, ainda na sala)
function temaAtual() {
  const l = (S?.config?.lider && Lideres.de(S.config.lider)) || (typeof LIDER !== "undefined" && LIDER);
  return (l && TEMAS[l.tipo]) || TEMAS.padrao;
}
// um número "aleatório" fixo para cada i (o desenho não pisca de um quadro para o outro)
const fixo = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// o desenho do chão, por cima das faixas e por baixo das linhas
function desenharChao(T, agora) {
  const s = camera.escala, x0 = camera.x - 9 * s, y0 = camera.y - 6 * s, W = 18 * s, H = 12 * s;
  const t = movimentoReduzido.matches ? 0 : agora / 1000;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
  if (T.chao === "lava") { // rachaduras com lava, que pulsam devagar
    for (let i = 0; i < 16; i++) {
      let px = x0 + fixo(i) * W, py = y0 + fixo(i + 50) * H;
      ctx.strokeStyle = `rgba(255,${120 + Math.round(60 * Math.sin(t * 2 + i))},40,${0.55 + 0.25 * Math.sin(t * 1.5 + i)})`; ctx.lineWidth = Math.max(1, s * 0.12);
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let k = 0; k < 4; k++) { px += (fixo(i * 7 + k) - 0.5) * s * 2.4; py += (fixo(i * 11 + k) - 0.5) * s * 1.6; ctx.lineTo(px, py); }
      ctx.stroke();
    }
  } else if (T.chao === "ondas") { // a água correndo
    ctx.strokeStyle = "rgba(220,245,255,.35)"; ctx.lineWidth = Math.max(1, s * 0.08);
    for (let fila = 0; fila < 9; fila++) {
      const yy = y0 + (fila + 0.5) * H / 9; ctx.beginPath();
      for (let xx = 0; xx <= W; xx += 2) ctx.lineTo(x0 + xx, yy + Math.sin(xx / (s * 0.9) + t * 1.6 + fila) * s * 0.18);
      ctx.stroke();
    }
  } else if (T.chao === "flores") { // tufos de grama e flores
    for (let i = 0; i < 70; i++) {
      const px = x0 + fixo(i) * W, py = y0 + fixo(i + 90) * H;
      if (i % 5 === 0) { circulo(px, py, Math.max(1, s * 0.16), ["#ffe14d", "#ff8acb", "#ffffff"][i % 3]); circulo(px, py, Math.max(0.5, s * 0.06), "#c98a1a"); }
      else { ret(px, py, Math.max(1, s * 0.08), Math.max(1, s * 0.22), "#3c7d2f"); ret(px + s * 0.14, py + s * 0.05, Math.max(1, s * 0.08), Math.max(1, s * 0.17), "#3c7d2f"); }
    }
  } else if (T.chao === "placas") { // placas de metal com rebites e a faixa de perigo nas pontas
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = camera.traco;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * W / 6, y0); ctx.lineTo(x0 + i * W / 6, y0 + H); ctx.stroke(); }
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + i * H / 4); ctx.lineTo(x0 + W, y0 + i * H / 4); ctx.stroke(); }
    for (let a = 0; a <= 6; a++) for (let b = 0; b <= 4; b++) circulo(x0 + a * W / 6, y0 + b * H / 4, Math.max(0.6, s * 0.08), "#9a9aa3");
    for (const lado of [0, 1]) for (let k = 0; k < 12; k++) {
      const yy = y0 + k * H / 12; ret(lado ? x0 + W - s * 0.7 : x0, yy, s * 0.7, H / 24, "#ffe14d");
    }
    if (!movimentoReduzido.matches && Math.sin(t * 9) > 0.96) { ctx.globalAlpha = 0.12; ret(x0, y0, W, H, "#fff5b0"); }
  } else if (T.chao === "pedras") {
    for (let i = 0; i < 60; i++) {
      const px = x0 + fixo(i) * W, py = y0 + fixo(i + 31) * H, r = s * (0.1 + fixo(i + 7) * 0.22);
      circulo(px + r * 0.3, py + r * 0.3, r, "#7d6a48"); circulo(px, py, r, i % 2 ? "#c2ad84" : "#8f7b58");
    }
  } else if (T.chao === "runas") { // círculos mágicos girando
    ctx.strokeStyle = "rgba(255,190,240,.35)"; ctx.lineWidth = Math.max(1, s * 0.07);
    for (const [cx, cy] of [[-5, 0], [5, 0]]) {
      const p = pontoTela(cx, cy);
      ctx.beginPath(); ctx.arc(p.x, p.y, s * 2.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, s * 2.1, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 6; k++) { const a = t * 0.4 + k * Math.PI / 3; circulo(p.x + Math.cos(a) * s * 2.35, p.y + Math.sin(a) * s * 2.35, Math.max(1, s * 0.12), "#ffd0f0"); }
    }
  } else if (T.chao === "rachaduras") { // tábuas velhas e rachadas
    ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = camera.traco;
    for (let i = 1; i < 12; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + i * H / 12); ctx.lineTo(x0 + W, y0 + i * H / 12); ctx.stroke(); }
    for (let i = 0; i < 40; i++) ret(x0 + fixo(i) * W, y0 + Math.floor(fixo(i + 3) * 12) * H / 12, 1, H / 12, "rgba(0,0,0,.4)");
  } else if (T.chao === "escamas") {
    ctx.strokeStyle = "rgba(255,207,107,.22)"; ctx.lineWidth = Math.max(1, s * 0.06);
    for (let fila = 0; fila < 14; fila++) for (let col = 0; col < 20; col++) {
      const px = x0 + (col + (fila % 2) * 0.5) * W / 19, py = y0 + fila * H / 13;
      ctx.beginPath(); ctx.arc(px, py, W / 38, 0, Math.PI); ctx.stroke();
    }
  } else if (T.chao === "tatame") { // tatames com a borda escura
    ctx.strokeStyle = "#5a3a1e"; ctx.lineWidth = Math.max(1, s * 0.1);
    for (let a = 0; a < 6; a++) for (let b = 0; b < 3; b++) {
      const deitado = (a + b) % 2 === 0; ctx.strokeRect(x0 + a * W / 6, y0 + b * H / 3, W / 6, H / 3);
      if (deitado) { ctx.beginPath(); ctx.moveTo(x0 + a * W / 6, y0 + (b + 0.5) * H / 3); ctx.lineTo(x0 + (a + 1) * W / 6, y0 + (b + 0.5) * H / 3); ctx.stroke(); }
    }
  } else if (T.chao === "gelo") { // trincas e brilhos no gelo
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = camera.traco;
    for (let i = 0; i < 14; i++) {
      let px = x0 + fixo(i) * W, py = y0 + fixo(i + 20) * H; ctx.beginPath(); ctx.moveTo(px, py);
      for (let k = 0; k < 3; k++) { px += (fixo(i * 5 + k) - 0.5) * s * 2; py += (fixo(i * 9 + k) - 0.5) * s * 2; ctx.lineTo(px, py); }
      ctx.stroke();
    }
    for (let i = 0; i < 10; i++) { const b = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7); ctx.globalAlpha = b; ret(x0 + fixo(i + 60) * W, y0 + fixo(i + 70) * H, Math.max(1, s * 0.12), Math.max(1, s * 0.12), "#ffffff"); }
  }
  ctx.restore();
}

// o clima por cima da luta: tudo calculado pelo relógio (não guarda partículas); menos movimento, sem clima
function desenharClima(T, agora) {
  if (!T.clima || movimentoReduzido.matches) return;
  const k = Math.max(1, camera.traco / 2), t = agora / 1000, W = cv.width / k, H = cv.height / k; // em pixels de meia tela
  ctx.save(); ctx.scale(k, k);
  if (T.clima === "brasas") for (let i = 0; i < 26; i++) { // sobem e somem
    const ciclo = 4 + fixo(i) * 3, f = ((t + fixo(i + 9) * ciclo) % ciclo) / ciclo;
    const x = fixo(i + 1) * W + Math.sin(t * 2 + i) * 4, y = H * (1.05 - f * 1.1);
    ctx.globalAlpha = Math.sin(f * Math.PI) * 0.85; ret(x, y, 2, 2, T === TEMAS["Dragão"] ? (i % 2 ? "#c79bff" : "#ffcf6b") : i % 3 ? "#ffb04a" : "#ff5b2e");
  }
  else if (T.clima === "bolhas") for (let i = 0; i < 18; i++) {
    const ciclo = 5 + fixo(i) * 4, f = ((t + fixo(i + 4) * ciclo) % ciclo) / ciclo;
    ctx.globalAlpha = 0.6 * Math.sin(f * Math.PI); circulo(fixo(i + 2) * W + Math.sin(t * 1.5 + i) * 5, H * (1.05 - f * 1.1), 1.5 + fixo(i + 8) * 2.5, "#e2fbff", false);
  }
  else if (T.clima === "folhas") for (let i = 0; i < 16; i++) { // caem balançando
    const ciclo = 7 + fixo(i) * 5, f = ((t + fixo(i + 3) * ciclo) % ciclo) / ciclo;
    const x = fixo(i + 6) * W + Math.sin(t * 1.3 + i) * 12, y = H * (f * 1.1 - 0.05);
    ctx.globalAlpha = 0.85; ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(Math.sin(t * 2 + i));
    ctx.fillStyle = i % 3 ? "#7fd36b" : "#e7c24a"; ctx.fillRect(-2, -1, 4, 2); ctx.restore();
  }
  else if (T.clima === "faiscas") for (let i = 0; i < 6; i++) { // raios curtinhos que piscam pela quadra
    const janela = Math.floor(t * 3 + fixo(i) * 10); if (fixo(janela * 13 + i) < 0.55) continue;
    let x = fixo(janela + i * 31) * W, y = fixo(janela * 3 + i) * H;
    ctx.globalAlpha = 0.9; ctx.strokeStyle = "#fff5b0"; ctx.lineWidth = camera.traco; ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (fixo(janela + k + i) - 0.5) * 10; y += 3 + fixo(k + i * 2 + janela) * 4; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  else if (T.clima === "neve") for (let i = 0; i < 40; i++) {
    const ciclo = 8 + fixo(i) * 6, f = ((t + fixo(i + 5) * ciclo) % ciclo) / ciclo;
    ctx.globalAlpha = 0.9; ret(fixo(i + 12) * W + Math.sin(t + i) * 6, H * (f * 1.1 - 0.05), i % 4 ? 1 : 2, i % 4 ? 1 : 2, "#ffffff");
  }
  else if (T.clima === "poeira") for (let i = 0; i < 14; i++) { // nuvenzinhas de poeira atravessando
    const ciclo = 9 + fixo(i) * 6, f = ((t + fixo(i + 2) * ciclo) % ciclo) / ciclo;
    ctx.globalAlpha = 0.18 * Math.sin(f * Math.PI); circulo(W * (f * 1.2 - 0.1), fixo(i + 40) * H, 3 + fixo(i) * 5, "#e9dcbb");
  }
  else if (T.clima === "estrelas") for (let i = 0; i < 24; i++) { // brilhinhos que piscam
    const b = Math.sin(t * (1.5 + fixo(i) * 2) + i * 2); if (b < 0.3) continue;
    const x = fixo(i + 3) * W, y = fixo(i + 17) * H; ctx.globalAlpha = b;
    ret(x - 1, y, 3, 1, "#ffe0f2"); ret(x, y - 1, 1, 3, "#ffe0f2");
  }
  else if (T.clima === "nevoa") for (let i = 0; i < 8; i++) { // névoa passando devagar
    const ciclo = 18 + fixo(i) * 10, f = ((t + fixo(i + 1) * ciclo) % ciclo) / ciclo;
    ctx.globalAlpha = 0.06; circulo(W * (f * 1.4 - 0.2), H * (0.2 + fixo(i + 30) * 0.7), W * (0.05 + fixo(i) * 0.05), "#d9d0ff");
  }
  ctx.restore();
}
