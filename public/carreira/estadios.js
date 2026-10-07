// Carreira de Treinador: o estádio de quem joga em casa, em pixel-art, no fundo da prancheta do meio do jogo. A
// arquibancada veste as cores do mandante (com um cantinho da torcida visitante), e cada estádio tem o seu jeito
// (perfil): oval ou retangular, coberto ou não, quantos anéis e um detalhe marcante. O céu segue o clima do jogo
// (dia, noite com os refletores, chuva). Quem pede "menos movimento" vê a torcida parada.
const Estadio = (() => {
  const W = 240, H = 96;
  // forma: "oval" | "ret"; teto: "todo" | "meio" | "nao"; aneis: 1 a 3; marca: o detalhe (arco, telao, predios, membrana, vidro, morro, trem)
  const PERFIS = {
    "Maracanã": { forma: "oval", teto: "todo", aneis: 3, marca: "arco" },
    "Allianz Parque": { forma: "ret", teto: "todo", aneis: 2, marca: "vidro" },
    "Mineirão": { forma: "oval", teto: "todo", aneis: 3, marca: "arco" },
    "Maião": { forma: "ret", teto: "nao", aneis: 1, marca: "morro" },
    "Nilton Santos": { forma: "ret", teto: "todo", aneis: 2, marca: "telao" },
    "Fonte Nova": { forma: "oval", teto: "meio", aneis: 2, marca: "membrana" },
    "Morumbi": { forma: "oval", teto: "nao", aneis: 3, marca: "arco" },
    "Arena do Grêmio": { forma: "ret", teto: "todo", aneis: 2, marca: "telao" },
    "Nabi Abi Chedid": { forma: "ret", teto: "meio", aneis: 1, marca: "morro" },
    "Arena MRV": { forma: "ret", teto: "todo", aneis: 2, marca: "vidro" },
    "Vila Belmiro": { forma: "ret", teto: "nao", aneis: 1, marca: "predios" },
    "Arena Corinthians": { forma: "ret", teto: "meio", aneis: 2, marca: "telao" },
    "São Januário": { forma: "ret", teto: "meio", aneis: 1, marca: "predios" },
    "Barradão": { forma: "ret", teto: "nao", aneis: 2, marca: "morro" },
    "Beira-Rio": { forma: "oval", teto: "todo", aneis: 2, marca: "membrana" },
    "Couto Pereira": { forma: "ret", teto: "meio", aneis: 2, marca: "predios" },
    "Arena da Baixada": { forma: "ret", teto: "todo", aneis: 2, marca: "vidro" },
    "Arena Condá": { forma: "ret", teto: "meio", aneis: 1, marca: "morro" },
    "Baenão": { forma: "ret", teto: "nao", aneis: 1, marca: "trem" },
  };
  const perfilDe = (c) => PERFIS[c.estadio] || { forma: "ret", teto: c.tamanho >= 4 ? "meio" : "nao", aneis: c.tamanho >= 4 ? 2 : 1, marca: "telao" };
  const sorte = (txt) => { let a = 2166136261; for (const ch of txt) a = Math.imul(a ^ ch.charCodeAt(0), 16777619); return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const escurece = (hex, f) => { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.round((n >> 16) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`; };

  // desenha um quadro (t em ms; pula: a torcida pulando nesse quadro)
  function quadro(g, casa, fora, clima, t) {
    const p = perfilDe(casa), r = sorte(casa.id + (casa.estadio || "")), noite = clima && clima.hora === "noite", chuva = clima && clima.chuva;
    const P = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    // o céu
    const ceu = noite ? ["#0a1430", "#16244a"] : chuva ? ["#5c6b78", "#7b8995"] : ["#5fa8e8", "#a6d4f5"];
    for (let y = 0; y < 30; y++) P(y < 15 ? ceu[0] : ceu[1], 0, y, W, 1);
    if (noite) for (let k = 0; k < 14; k++) P("#ffffffaa", r() * W, r() * 14);
    // o que fica atrás do estádio
    if (p.marca === "predios") for (let x = 0; x < W; x += 14 + Math.floor(r() * 10)) { const h = 10 + r() * 16; P(noite ? "#1d2638" : "#8a96a6", x, 30 - h, 12, h); for (let k = 0; k < 4; k++) P(noite ? "#ffd86b" : "#c9d6e4", x + 2 + (k % 2) * 5, 30 - h + 3 + Math.floor(k / 2) * 5, 2, 2); }
    if (p.marca === "morro") { g.fillStyle = noite ? "#13241a" : "#4f8a4a"; g.beginPath(); g.moveTo(0, 30); for (let x = 0; x <= W; x += 20) g.lineTo(x, 18 + Math.sin(x / 37) * 6 + r() * 3); g.lineTo(W, 30); g.fill(); }
    if (p.marca === "trem") { P(noite ? "#2a2f3a" : "#6d7686", 0, 24, W, 3); for (let x = 10; x < W; x += 30) P("#c9452f", x, 19, 24, 5); }
    // os anéis da arquibancada: a torcida nas cores do mandante; o setor visitante no canto direito
    const base = 30, alto = 12 * p.aneis + 8, topo = base, chao = base + alto;
    const camisas = [casa.cores[0], casa.cores[0], casa.cores[1] || "#f4f4f4", casa.cores[0], "#f4f4f4"], visita = [fora.cores[0], fora.cores[1] || fora.cores[0]];
    const peles = ["#f6d3b5", "#e6b48a", "#c68b5e", "#9c6640", "#5f3a24"];
    for (let anel = 0; anel < p.aneis; anel++) {
      const y0 = topo + anel * 12 + 4, curva = p.forma === "oval" ? 6 : 0;
      P(escurece(casa.cores[0], 0.25), 0, y0, W, 12);
      for (let fil = 0; fil < 3; fil++) for (let x = (fil & 1) * 2; x < W; x += 4) {
        const dy = curva ? Math.round(curva * Math.pow((x - W / 2) / (W / 2), 2)) : 0;
        if (r() < 0.1) continue;
        const pula = t != null && Math.floor(t / 180 + x / 4 + fil) % 3 === 0 ? 1 : 0;
        const vis = x > W - 34 && anel === p.aneis - 1, c = vis ? visita[Math.floor(r() * 2)] : camisas[Math.floor(r() * camisas.length)];
        const y = y0 + 1 + fil * 4 - dy * 0.3 - pula;
        P(peles[Math.floor(r() * 5)], x, y); P(c, x - 0.5, y + 1, 2, 2);
      }
      P(escurece(casa.cores[0], 0.5), 0, y0 + 11, W, 1); // o degrau
    }
    // a cobertura
    if (p.teto !== "nao") {
      const larg = p.teto === "todo" ? W : W * 0.6, x0 = p.teto === "todo" ? 0 : W * 0.2;
      const corTeto = p.marca === "membrana" ? "#eef2f4" : p.marca === "vidro" ? "#9fb7c9" : "#2b3440";
      P(corTeto, x0, topo - 6, larg, 7); P("#00000040", x0, topo + 1, larg, 2);
      for (let x = x0 + 4; x < x0 + larg; x += 12) P(p.marca === "membrana" ? "#c9d2d8" : "#55606e", x, topo - 6, 1, 7);
      if (p.marca === "arco") { g.strokeStyle = "#f4f4f4"; g.lineWidth = 1; g.beginPath(); g.ellipse(W / 2, topo + 4, W * 0.52, 14, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
    }
    // o telão no canto e as placas de propaganda
    if (p.marca === "telao" || p.marca === "vidro") { P("#111", 14, topo - 4, 34, 16); P(casa.cores[0], 16, topo - 2, 30, 12); P("#ffffffcc", 18, topo + 2, 26, 2); }
    for (let x = 0; x < W; x += 40) { P(x % 80 ? casa.cores[0] : casa.cores[1] || "#f4f4f4", x, chao, 40, 5); P("#00000033", x + 39, chao, 1, 5); }
    // o gramado (o da prancheta continua embaixo)
    for (let y = chao + 5; y < H; y++) P(Math.floor((y - chao) / 5) % 2 ? "#3f8f3a" : "#4a9c43", 0, y, W, 1);
    P("#ffffffb0", 0, chao + 9, W, 1);
    // à noite, os refletores
    if (noite) for (const x of [8, W - 9]) { P("#cfd6dd", x, 4, 2, topo - 4); for (const [rr, a] of [[14, "10"], [9, "22"], [5, "55"], [2, "ff"]]) P(`#fffbd0${a}`, x - rr, 4 - rr / 2, rr * 2 + 2, rr); }
    if (chuva) { P("#5b6f8040", 0, 0, W, H); const s = sorte("chuva" + casa.id); for (let k = 0; k < 70; k++) { const x0 = s() * W, v = 0.08 + s() * 0.05, y = ((s() * H) + (t || 0) * v) % H; P("#d9e8f5aa", (x0 - y * 0.25 + W) % W, y, 1, 3); } }
  }
  // monta o canvas no elemento e anima enquanto ele estiver na página (para sozinho quando o diálogo fecha)
  function montar(el, casa, fora, clima) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; cv.className = "estadio-canvas";
    el.prepend(cv);
    const g = cv.getContext("2d"), parado = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (parado) { quadro(g, casa, fora, clima, null); return; }
    let t0 = 0;
    const anda = (agora) => { if (!cv.isConnected) return; if (!t0) t0 = agora; quadro(g, casa, fora, clima, agora - t0); requestAnimationFrame(anda); };
    requestAnimationFrame(anda);
  }
  return { PERFIS, perfilDe, quadro, montar, W, H };
})();
