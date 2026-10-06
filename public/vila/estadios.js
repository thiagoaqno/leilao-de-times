// Vila da Galera — os estádios (o lado de fora no mapa e o lado de dentro, onde dá para entrar).
// Cada estádio fica longe da vila, no seu canto do mapa (como em São Paulo), e só dá para chegar de carro.
// - Estadios.LISTA: onde fica cada um (em casas do mapa), a praça em volta, o estacionamento e o portão;
// - Estadios.fachada(c, e): desenha o estádio visto de cima, no mapa da vila;
// - Estadios.interior(e): monta o lado de dentro (gramado, arquibancada, túnel, gols) e devolve o mapa dele;
// - Estadios.desenhaTorcida / desenhaTelao: o que mexe lá dentro (a torcida pulando e o telão).
// Tudo em pixel-art: 16 px por casa, desenhado aqui mesmo.
(function () {
  const TS = 16;
  const P = (c, col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const hash = (x, y, i = 0) => { let n = (x * 374761393 + y * 668265263 + i * 1274126177) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0); };
  const texto = (c, t, x, y, cor, tam = 7, alinha = "center") => { c.font = `700 ${tam}px "Pixelify Sans", monospace`; c.fillStyle = cor; c.textAlign = alinha; c.textBaseline = "middle"; c.fillText(t, x, y); c.textAlign = "left"; };

  // ---------- onde fica cada estádio (casas do mapa) ----------
  // ret: o estádio (sólido); praca: o chão de pedestre em volta; lote: o estacionamento; portao: as casas da entrada
  const LISTA = [
    { id: "nubank", nome: "Nubank Parque", curto: "NUBANK PARQUE", clube: "Palmeiras", bairro: "Perdizes",
      desc: "A arena moderna da Pompeia: fachada branca de escamas, cobertura inteira e cadeiras verdes.",
      ret: { x: 40, y: 28, w: 22, h: 16 }, praca: { x0: 36, y0: 24, x1: 65, y1: 47 }, lote: { x0: 44, y0: 48, x1: 57, y1: 53 }, portao: [[50, 44], [51, 44]],
      forma: "ret", teto: true, cadeiras: ["#1f7a3e", "#17652f", "#2c8c4a"], torcida: ["#1f7a3e", "#ffffff", "#2c8c4a", "#0f3d22"], led: "#9b3df0",
      gramado: ["#2e8b45", "#2a7e3f"], telao: "Nubank Parque", casa: "PALMEIRAS" },
    { id: "neoquimica", nome: "Neo Química Arena", curto: "NEO QUÍMICA ARENA", clube: "Corinthians", bairro: "Itaquera",
      desc: "Lá no fim da Radial Leste: a fachada de vidro do lado oeste, o telão gigante e as cadeiras pretas e brancas.",
      ret: { x: 280, y: 118, w: 24, h: 18 }, praca: { x0: 274, y0: 114, x1: 307, y1: 139 }, lote: { x0: 264, y0: 122, x1: 273, y1: 131 }, portao: [[279, 126], [279, 127]],
      forma: "ret", teto: true, vidro: true, cadeiras: ["#1d1d1f", "#2c2c30", "#e9e9e6"], torcida: ["#111111", "#ffffff", "#2b2b2b", "#d9d9d9"], led: "#ffffff",
      gramado: ["#2f8f48", "#2a8141"], telao: "Neo Química Arena", casa: "CORINTHIANS" },
    { id: "morumbis", nome: "Morumbis", curto: "MORUMBIS", clube: "São Paulo", bairro: "Morumbi",
      desc: "O gigante de concreto: o oval enorme, os pilares em volta e a arquibancada tricolor sem cobertura.",
      ret: { x: 50, y: 176, w: 26, h: 22 }, praca: { x0: 46, y0: 170, x1: 79, y1: 201 }, lote: { x0: 56, y0: 164, x1: 69, y1: 169 }, portao: [[62, 175], [63, 175]],
      forma: "oval", teto: false, cadeiras: ["#d7262e", "#f2f2f0", "#1b1b1b"], torcida: ["#d7262e", "#ffffff", "#1b1b1b", "#b31d24"], led: "#ffd34d",
      gramado: ["#3a9a4e", "#348a46"], telao: "Morumbis", casa: "SÃO PAULO" },
    { id: "belmiro", nome: "Vila Belmiro", curto: "VILA BELMIRO", clube: "Santos", bairro: "Santos",
      desc: "Lá embaixo da serra, perto da praia: o estádio pequeno e apertado, de muro branco e alma alvinegra.",
      ret: { x: 220, y: 206, w: 16, h: 12 }, praca: { x0: 212, y0: 204, x1: 243, y1: 229 }, lote: { x0: 222, y0: 196, x1: 233, y1: 203 }, portao: [[227, 205], [228, 205]],
      forma: "ret", teto: false, pequeno: true, cadeiras: ["#f4f4f2", "#1b1b1b", "#dcdcd8"], torcida: ["#ffffff", "#111111", "#e6e6e6", "#2a2a2a"], led: "#ffffff",
      gramado: ["#3b9b4f", "#358b47"], telao: "Vila Belmiro", casa: "SANTOS" },
  ];
  LISTA.forEach((e) => { e.tipo = "estadio"; e.meta = `${e.clube} · ${e.bairro}`; });

  // ---------- o lado de fora (visto de cima) ----------
  function sombra(c, X, Y, W, H) { P(c, "#00000038", X + 4, Y + H, W - 2, 5); P(c, "#00000038", X + W, Y + 5, 4, H); }
  function gramadoVisto(c, x, y, w, h, cores) {
    for (let k = 0; k < w; k += 6) P(c, (k / 6) % 2 ? cores[1] : cores[0], x + k, y, Math.min(6, w - k), h);
    c.strokeStyle = "#f2f2ea"; c.lineWidth = 1; c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    P(c, "#f2f2ea", x + w / 2, y + 2, 1, h - 4);
    c.beginPath(); c.arc(x + w / 2 + 0.5, y + h / 2, Math.min(w, h) / 7, 0, 7); c.stroke();
    c.strokeRect(x + 1.5, y + h / 2 - h / 5, w / 7, (2 * h) / 5); c.strokeRect(x + w - 1.5 - w / 7, y + h / 2 - h / 5, w / 7, (2 * h) / 5);
  }
  function portaoVisto(c, e) { // o portão na parede, onde ficam as casas da entrada
    for (const [gx, gy] of e.portao) {
      const r = e.ret, X = gx * TS, Y = gy * TS;
      if (gy === r.y + r.h) { P(c, "#2a1a10", X, Y - 14, TS, 14); P(c, "#5a5f68", X + 1, Y - 13, TS - 2, 12); for (let k = 2; k < TS; k += 3) P(c, "#3a3e46", X + k, Y - 13, 1, 12); }
      else if (gy === r.y - 1) { P(c, "#2a1a10", X, Y + TS, TS, 6); P(c, "#5a5f68", X + 1, Y + TS, TS - 2, 5); }
      else if (gx === r.x - 1) { P(c, "#2a1a10", X + TS, Y, 6, TS); P(c, "#5a5f68", X + TS, Y + 1, 5, TS - 2); }
    }
  }
  const FACHADA = {
    // Morumbis: o oval de concreto com os pilares em volta, a arquibancada tricolor e o campo à vista
    morumbis(c, e) {
      const r = e.ret, X = r.x * TS, Y = r.y * TS, W = r.w * TS, H = r.h * TS, cx = X + W / 2, cy = Y + H / 2;
      const oval = (rx, ry, cor) => { c.fillStyle = cor; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill(); };
      c.fillStyle = "#00000040"; c.beginPath(); c.ellipse(cx + 5, cy + 6, W / 2, H / 2, 0, 0, 7); c.fill();
      oval(W / 2, H / 2, "#b9b5ac"); oval(W / 2 - 3, H / 2 - 3, "#d4d0c6");
      for (let k = 0; k < 64; k++) { // os pilares do anel externo
        const a = (k / 64) * Math.PI * 2, x1 = cx + Math.cos(a) * (W / 2 - 2), y1 = cy + Math.sin(a) * (H / 2 - 2);
        P(c, "#9a968c", x1 - 1, y1 - 1, 2, 2); P(c, "#8a867c", cx + Math.cos(a) * (W / 2 - 10), cy + Math.sin(a) * (H / 2 - 10), 1, 1);
      }
      oval(W / 2 - 14, H / 2 - 14, "#7d7a72"); // o anel de circulação
      const faixas = [["#1b1b1b", 18], ["#f2f2f0", 30], ["#d7262e", 42], ["#f2f2f0", 54], ["#d7262e", 66], ["#1b1b1b", 78]];
      faixas.forEach(([cor, d]) => oval(W / 2 - d, H / 2 - d * (H / W), cor));
      oval(W / 2 - 86, H / 2 - 86 * (H / W), "#2d6a3a");
      gramadoVisto(c, cx - 112, cy - 70, 224, 140, e.gramado);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; P(c, "#3a3e46", cx + Math.cos(a) * (W / 2 - 15) - 2, cy + Math.sin(a) * (H / 2 - 15) - 2, 4, 4); P(c, "#fff4c2", cx + Math.cos(a) * (W / 2 - 15) - 1, cy + Math.sin(a) * (H / 2 - 15) - 1, 2, 2); }
    },
    // Vila Belmiro: pequenininho e retangular, muro branco, a arquibancada de concreto colada no campo, a cobertura da
    // social e a faixa alvinegra na fachada (com os arcos) virada para a rua
    belmiro(c, e) {
      const r = e.ret, X = r.x * TS, Y = r.y * TS, W = r.w * TS, H = r.h * TS;
      sombra(c, X, Y, W, H);
      P(c, "#f2f1ec", X, Y, W, H); P(c, "#1b1b1b", X, Y + H - 3, W, 3);
      for (let k = 0; k < 4; k++) { const d = 6 + k * 5; c.strokeStyle = k % 2 ? "#a9a79f" : "#bdbbb3"; c.lineWidth = 5; c.strokeRect(X + d, Y + d + 14, W - 2 * d, H - 2 * d - 14); }
      for (let k = X + 8; k < X + W - 8; k += 3) for (let yy = Y + 26; yy < Y + H - 10; yy += 3) if ((k * 7 + yy * 3) % 11 === 0) P(c, (k + yy) % 2 ? "#1b1b1b" : "#ffffff", k, yy, 1, 1); // a torcida espalhada
      P(c, "#8f8d86", X + 4, Y + 16, W - 8, 14); for (let k = X + 6; k < X + W - 6; k += 6) P(c, "#7b7972", k, Y + 16, 1, 14); // a cobertura da social
      for (let k = 0; k < W; k += 8) P(c, (k / 8) % 2 ? "#1b1b1b" : "#ffffff", X + k, Y, 8, 6); // a faixa alvinegra
      P(c, "#f2f1ec", X, Y + 6, W, 10); for (let k = 0; k < 8; k++) { const ax = X + 14 + k * ((W - 28) / 7); P(c, "#3a3a3a", ax - 4, Y + 8, 8, 8); P(c, "#f2f1ec", ax - 3, Y + 7, 6, 3); } // os arcos
      gramadoVisto(c, X + 34, Y + 38, W - 68, H - 62, e.gramado);
      texto(c, "VILA BELMIRO", X + W / 2, Y + 23, "#ffffff", 7);
    },
    // Nubank Parque: a caixa de cantos arredondados com a fachada branca de escamas, a cobertura cinza em anel, as
    // cadeiras verdes e o campo no vão do meio
    nubank(c, e) {
      const r = e.ret, X = r.x * TS, Y = r.y * TS, W = r.w * TS, H = r.h * TS;
      const caixa = (x, y, w, h, raio, cor) => { c.fillStyle = cor; c.beginPath(); c.roundRect(x, y, w, h, raio); c.fill(); };
      c.fillStyle = "#00000040"; c.beginPath(); c.roundRect(X + 5, Y + 6, W, H, 30); c.fill();
      caixa(X, Y, W, H, 30, "#e2e6eb");
      c.save(); c.beginPath(); c.roundRect(X, Y, W, H, 30); c.clip();
      for (let yy = Y; yy < Y + H; yy += 5) for (let xx = X + ((yy - Y) / 5 % 2) * 4; xx < X + W; xx += 8) { P(c, "#c7cdd5", xx, yy + 3, 6, 1); P(c, "#f6f8fa", xx, yy, 6, 1); } // as escamas
      c.restore();
      caixa(X + 14, Y + 14, W - 28, H - 28, 22, "#98a0aa"); // a cobertura (anel cinza)
      for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2, cx = X + W / 2, cy = Y + H / 2; c.strokeStyle = "#8a929c"; c.lineWidth = 1; c.beginPath(); c.moveTo(cx + Math.cos(a) * (W / 2 - 16), cy + Math.sin(a) * (H / 2 - 16)); c.lineTo(cx + Math.cos(a) * (W / 2 - 64), cy + Math.sin(a) * (H / 2 - 54)); c.stroke(); }
      caixa(X + 62, Y + 52, W - 124, H - 104, 10, "#1f7a3e"); // as cadeiras verdes no vão
      for (let yy = Y + 54; yy < Y + H - 52; yy += 3) P(c, "#196833", X + 64, yy, W - 128, 1);
      c.strokeStyle = e.led; c.lineWidth = 2; c.beginPath(); c.roundRect(X + 61, Y + 51, W - 122, H - 102, 11); c.stroke(); // a luz roxa na beirada da cobertura
      gramadoVisto(c, X + 78, Y + 66, W - 156, H - 132, e.gramado);
      P(c, "#7a1fd1", X + W / 2 - 38, Y + H - 13, 76, 10); texto(c, "NUBANK PARQUE", X + W / 2, Y + H - 8, "#ffffff", 7);
    },
    // Neo Química Arena: as duas coberturas brancas nos lados compridos, a fachada de vidro azul de um lado e o telão
    // gigante do outro; nas cabeceiras abertas, as cadeiras pretas
    neoquimica(c, e) {
      const r = e.ret, X = r.x * TS, Y = r.y * TS, W = r.w * TS, H = r.h * TS;
      sombra(c, X, Y, W, H);
      P(c, "#c9ccd1", X, Y, W, H);
      P(c, "#1d1d1f", X + 10, Y + 60, W - 20, H - 120); // as cabeceiras (cadeiras pretas)
      for (let yy = Y + 62; yy < Y + H - 60; yy += 3) { P(c, "#2c2c30", X + 10, yy, 50, 1); P(c, "#2c2c30", X + W - 60, yy, 50, 1); }
      P(c, "#ffffff", X + 6, Y + 12, W - 12, 52); P(c, "#ffffff", X + 6, Y + H - 62, W - 12, 52); // as coberturas
      for (let xx = X + 12; xx < X + W - 8; xx += 10) { P(c, "#dfe2e6", xx, Y + 12, 2, 52); P(c, "#dfe2e6", xx, Y + H - 62, 2, 52); }
      P(c, "#4f8fc8", X + 4, Y, W - 8, 12); for (let xx = X + 6; xx < X + W - 6; xx += 7) P(c, "#2f5f8f", xx, Y, 1, 12); P(c, "#8cc0ea", X + 4, Y + 3, W - 8, 1); // o vidro
      P(c, "#151515", X + W / 2 - 110, Y + H - 10, 220, 10); // o telão gigante de fora
      for (let xx = X + W / 2 - 108; xx < X + W / 2 + 108; xx += 2) for (let yy = Y + H - 9; yy < Y + H - 1; yy += 2) P(c, (xx + yy) % 6 ? "#2a2a2a" : "#e9e9e6", xx, yy, 1, 1);
      gramadoVisto(c, X + 64, Y + 66, W - 128, H - 132, e.gramado);
      texto(c, "NEO QUÍMICA ARENA", X + W / 2, Y + H - 5, "#ffffff", 7);
    },
  };
  function fachada(c, e) { FACHADA[e.id](c, e); portaoVisto(c, e); }

  // ---------- o lado de dentro ----------
  // casas: G gramado, M beira do campo, A arquibancada, X fora, T túnel, S saída, B banco de reservas, R rede, P trave, L telão
  const IW = 50, IH = 36, CAMPO = { x0: 11, y0: 8, x1: 38, y1: 27 };
  function interior(e) {
    const g = Array.from({ length: IH }, () => Array(IW).fill("A"));
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < IW && y < IH) g[y][x] = t; };
    const peq = e.pequeno ? 4 : 0; // a Vila Belmiro é apertada: a arquibancada encosta no campo
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
      if (e.forma === "oval") { const dx = (x + 0.5 - IW / 2) / (IW / 2), dy = (y + 0.5 - IH / 2) / (IH / 2); if (dx * dx + dy * dy > 1) set(x, y, "X"); }
      else if (x < 1 + peq || y < 1 + peq / 2 || x >= IW - 1 - peq || y >= IH - 1 - peq / 2) set(x, y, "X");
    }
    for (let y = CAMPO.y0 - 2; y <= CAMPO.y1 + 2; y++) for (let x = CAMPO.x0 - 2; x <= CAMPO.x1 + 2; x++) set(x, y, x >= CAMPO.x0 && x <= CAMPO.x1 && y >= CAMPO.y0 && y <= CAMPO.y1 ? "G" : "M");
    const meio = Math.floor(IW / 2) - 1;
    for (let y = CAMPO.y1 + 3; y < IH; y++) { if (g[y][meio] === "X") break; set(meio, y, "T"); set(meio + 1, y, "T"); }
    let saida = null; for (let y = IH - 1; y > CAMPO.y1; y--) if (g[y][meio] === "T") { set(meio, y, "S"); set(meio + 1, y, "S"); saida = y; break; }
    for (const x of [meio - 6, meio - 5, meio - 4, meio + 5, meio + 6, meio + 7]) set(x, CAMPO.y1 + 2, "B"); // os bancos de reservas
    const gy0 = Math.floor((CAMPO.y0 + CAMPO.y1) / 2) - 1; // os dois gols: a rede atrás da linha e as traves
    for (let y = gy0; y <= gy0 + 3; y++) { set(CAMPO.x0 - 1, y, "R"); set(CAMPO.x0 - 2, y, "R"); set(CAMPO.x1 + 1, y, "R"); set(CAMPO.x1 + 2, y, "R"); }
    for (const x of [CAMPO.x0 - 1, CAMPO.x1 + 1]) { set(x, gy0 - 1, "P"); set(x, gy0 + 4, "P"); }
    const solido = g.map((l) => l.map((t) => "AXBPL".includes(t)));
    const it = { e, W: IW, H: IH, g, solido, saida: [meio, saida], spawn: [meio, CAMPO.y1 + 2], campo: CAMPO, gol: { y0: gy0, y1: gy0 + 3 }, placar: [0, 0] };
    it.cv = document.createElement("canvas"); it.cv.width = IW * TS; it.cv.height = IH * TS;
    desenhaInterior(it.cv.getContext("2d"), it);
    it.torcida = [0, 1].map((q) => { const cv = document.createElement("canvas"); cv.width = IW * TS; cv.height = IH * TS; desenhaTorcidaQuadro(cv.getContext("2d"), it, q); return cv; });
    return it;
  }
  function desenhaInterior(c, it) {
    const { e, g } = it, cor = e.cadeiras;
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
      const t = g[y][x], X = x * TS, Y = y * TS;
      if (t === "X") { P(c, e.forma === "oval" ? "#8a867c" : "#3a3d44", X, Y, TS, TS); if (e.forma === "oval" && hash(x, y) % 5 === 0) P(c, "#77736a", X + 3, Y + 4, 2, 6); continue; }
      if (t === "A" || t === "B" || t === "L") {
        // a arquibancada: degraus em faixas, na cor das cadeiras (a distância até o campo decide a faixa)
        const d = Math.max(CAMPO.x0 - 2 - x, x - CAMPO.x1 - 2, CAMPO.y0 - 2 - y, y - CAMPO.y1 - 2);
        const base = e.forma === "oval" ? cor[Math.floor(d / 2) % cor.length] : cor[d % 2];
        P(c, base, X, Y, TS, TS);
        for (let k = 0; k < TS; k += 4) P(c, "#00000026", X, Y + k + 3, TS, 1);
        if (t === "B") { P(c, "#d8dce2", X, Y + 2, TS, 10); P(c, "#7fb2e8", X + 1, Y + 3, TS - 2, 6); P(c, "#3a3e46", X, Y + 12, TS, 2); }
        continue;
      }
      if (t === "T" || t === "S") { P(c, "#5d6068", X, Y, TS, TS); P(c, "#4a4d54", X, Y, 2, TS); P(c, "#4a4d54", X + TS - 2, Y, 2, TS); if (t === "S") { P(c, "#2a2c31", X, Y + 8, TS, 8); } continue; }
      if (t === "M" || t === "R" || t === "P") P(c, e.forma === "oval" ? "#b24c39" : "#2f7d40", X, Y, TS, TS); // a beira do campo (no Morumbis, a pista)
      if (t === "G") P(c, ((x - CAMPO.x0) >> 1) % 2 ? e.gramado[1] : e.gramado[0], X, Y, TS, TS);
    }
    // as linhas do campo
    const x0 = CAMPO.x0 * TS, y0 = CAMPO.y0 * TS, w = (CAMPO.x1 - CAMPO.x0 + 1) * TS, h = (CAMPO.y1 - CAMPO.y0 + 1) * TS, br = "#f4f4ec";
    c.strokeStyle = br; c.lineWidth = 2; c.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
    P(c, br, x0 + w / 2 - 1, y0, 2, h);
    c.beginPath(); c.arc(x0 + w / 2, y0 + h / 2, 44, 0, 7); c.stroke(); P(c, br, x0 + w / 2 - 2, y0 + h / 2 - 2, 4, 4);
    for (const lado of [0, 1]) {
      const gx = lado ? x0 + w : x0, s = lado ? -1 : 1;
      c.strokeRect(lado ? gx - 64 : gx, y0 + h / 2 - 88, 64, 176); c.strokeRect(lado ? gx - 24 : gx, y0 + h / 2 - 40, 24, 80);
      P(c, br, gx + s * 46 - 2, y0 + h / 2 - 2, 4, 4);
      c.beginPath(); c.arc(gx + s * 46, y0 + h / 2, 36, lado ? Math.PI - 0.9 : -0.9, lado ? Math.PI + 0.9 : 0.9); c.stroke();
    }
    for (const [cx, cy, a0] of [[x0, y0, 0], [x0 + w, y0, Math.PI / 2], [x0 + w, y0 + h, Math.PI], [x0, y0 + h, -Math.PI / 2]]) { c.beginPath(); c.arc(cx, cy, 8, a0, a0 + Math.PI / 2); c.stroke(); }
    // os gols: a rede quadriculada e as traves brancas
    const gy = it.gol.y0 * TS;
    for (const gx of [(CAMPO.x0 - 2) * TS, (CAMPO.x1 + 1) * TS]) {
      P(c, "#ffffff22", gx, gy, 32, 64);
      for (let k = 0; k <= 32; k += 4) P(c, "#ffffff70", gx + k, gy, 1, 64);
      for (let k = 0; k <= 64; k += 4) P(c, "#ffffff70", gx, gy + k, 32, 1);
    }
    for (const x of [CAMPO.x0 - 1, CAMPO.x1 + 1]) for (const y of [it.gol.y0 - 1, it.gol.y1 + 1]) { P(c, "#ffffff", x * TS + 6, y * TS + (y < it.gol.y0 ? 10 : 0), 4, 6); }
    P(c, "#ffffff", (CAMPO.x0 - 1) * TS + 6, gy - 6, 4, 64 + 12); P(c, "#ffffff", (CAMPO.x1 + 1) * TS + 6, gy - 6, 4, 64 + 12);
    // a cobertura (Nubank e Neo Química): sombra na parte de cima das arquibancadas e a faixa de luz
    if (e.teto) {
      c.fillStyle = "#00000040"; c.fillRect(0, 0, IW * TS, 3 * TS); c.fillRect(0, (IH - 3) * TS, IW * TS, 3 * TS); c.fillRect(0, 0, 3 * TS, IH * TS); c.fillRect((IW - 3) * TS, 0, 3 * TS, IH * TS);
      c.strokeStyle = e.led; c.lineWidth = 2; c.strokeRect(3 * TS, 3 * TS, (IW - 6) * TS, (IH - 6) * TS);
    }
    if (e.vidro) { P(c, "#4f8fc8", TS, 4 * TS, TS * 1.5, (IH - 8) * TS); for (let yy = 4 * TS; yy < (IH - 4) * TS; yy += 6) P(c, "#8cc0ea", TS + 2, yy, TS, 1); }
    if (e.forma === "oval") for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, X = IW * TS / 2 + Math.cos(a) * (IW * TS / 2 - 14), Y = IH * TS / 2 + Math.sin(a) * (IH * TS / 2 - 12); P(c, "#3a3e46", X - 4, Y - 4, 8, 8); P(c, "#fff4c2", X - 3, Y - 3, 6, 6); } // os refletores no anel
  }
  // a torcida: cabecinhas nas cores do clube; dois quadros que se alternam (a galera pulando)
  function desenhaTorcidaQuadro(c, it, q) {
    const { e, g } = it;
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
      if (g[y][x] !== "A") continue;
      for (let k = 0; k < 4; k++) {
        const h = hash(x, y, k), X = x * TS + 2 + (k % 2) * 7 + (h % 3), Y = y * TS + 2 + (k >> 1) * 7 - ((h >>> 4) % 2 === q ? 1 : 0);
        if (h % 7 === 0) continue; // cadeira vazia
        P(c, "#f2c9a0", X + 1, Y, 3, 2); P(c, e.torcida[(h >>> 8) % e.torcida.length], X, Y + 2, 5, 3);
        if ((h >>> 12) % 9 === 0) P(c, e.torcida[0], X + 4, Y - 3 + (q ? 0 : 1), 1, 4); // uma bandeirinha
      }
    }
  }
  // o telão em cima da arquibancada do fundo: o nome e o placar (ou "GOL!")
  function desenhaTelao(c, it, t, gol) {
    const { e } = it, w = e.pequeno ? 8 * TS : 12 * TS, h = 2.5 * TS, x = (IW * TS - w) / 2, y = e.pequeno ? 3 * TS : 1.5 * TS;
    P(c, "#0b0b0d", x - 2, y - 2, w + 4, h + 4); P(c, "#141418", x, y, w, h);
    for (let yy = y; yy < y + h; yy += 2) P(c, "#ffffff08", x, yy, w, 1);
    if (gol && Math.floor(t / 180) % 2) { P(c, e.led, x, y, w, h); texto(c, "GOOOL!", x + w / 2, y + h / 2, "#0b0b0d", 16); return; }
    texto(c, e.pequeno ? e.casa : `${e.casa}  ${it.placar[0]} x ${it.placar[1]}  VISITANTE`, x + w / 2, y + h / 2 - (e.pequeno ? 5 : 0), e.led === "#ffffff" ? "#ffd34d" : e.led, e.pequeno ? 8 : 9);
    if (e.pequeno) texto(c, `${it.placar[0]} x ${it.placar[1]}`, x + w / 2, y + h / 2 + 7, "#ffffff", 9);
  }
  window.Estadios = { LISTA, fachada, interior, desenhaTelao, TS };
})();
