// Galeramon — desenhos dos bichos. Cada um é pintado numa tela de 32x32 e ampliado sem suavizar (pixel art).
(function () {
  const S = 32;
  const OUT = "#1b1b2f";
  function ell(c, x, y, rx, ry, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 7); c.fill(); }
  function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  // desenha as formas duas vezes: primeiro maiores na cor do contorno, depois por cima na cor certa
  function body(c, parts) {
    for (const p of parts) p[0] === "e" ? ell(c, p[1], p[2], p[3] + 1, p[4] + 1, OUT) : rect(c, p[1] - 1, p[2] - 1, p[3] + 2, p[4] + 2, OUT);
    for (const p of parts) p[0] === "e" ? ell(c, p[1], p[2], p[3], p[4], p[5]) : rect(c, p[1], p[2], p[3], p[4], p[5]);
  }
  function eye(c, x, y, big) {
    rect(c, x, y, big ? 3 : 2, big ? 3 : 2, OUT);
    rect(c, x, y, 1, 1, "#ffffff");
  }

  const DRAW = {
    churrasquilo(c) {
      rect(c, 2, 25, 28, 2, "#8a5a34"); rect(c, 1, 25, 2, 2, "#c9c9d6"); // o espeto
      body(c, [["e", 11, 27, 2.5, 2, "#e77f9b"], ["e", 21, 27, 2.5, 2, "#e77f9b"], ["e", 16, 19, 11, 8.5, "#f4a3b8"], ["e", 8.5, 11.5, 3, 3, "#f4a3b8"], ["e", 23.5, 11.5, 3, 3, "#f4a3b8"], ["e", 16, 21.5, 4.5, 3, "#e77f9b"]]);
      ell(c, 12, 15, 4, 2, "#fbc7d4");
      rect(c, 14, 21, 1, 2, OUT); rect(c, 17, 21, 1, 2, OUT);
      eye(c, 11, 17); eye(c, 20, 17);
      rect(c, 10, 15, 3, 1, OUT); rect(c, 20, 15, 3, 1, OUT); // sobrancelha brava
      ell(c, 16, 8, 3.5, 4.5, "#ff6a1a"); ell(c, 15, 5, 2, 3, "#ff6a1a"); ell(c, 16, 8.5, 2, 3, "#ffd34d"); rect(c, 16, 3, 1, 2, "#ffd34d");
    },
    sirizao(c) {
      for (const x of [6, 9, 23, 26]) { rect(c, x, 24, 1, 5, OUT); rect(c, x - 1, 28, 2, 1, OUT); }
      body(c, [["e", 16, 20, 11, 7.5, "#e0503a"], ["e", 5.5, 12.5, 4.5, 4.5, "#e0503a"], ["e", 26.5, 12.5, 4.5, 4.5, "#e0503a"], ["r", 11, 8, 2, 7, "#e0503a"], ["r", 19, 8, 2, 7, "#e0503a"], ["e", 12, 7, 2.5, 2.5, "#ffffff"], ["e", 20, 7, 2.5, 2.5, "#ffffff"]]);
      rect(c, 3, 11, 5, 1, OUT); rect(c, 24, 11, 5, 1, OUT); // pinças abertas
      rect(c, 12, 6, 2, 2, OUT); rect(c, 20, 6, 2, 2, OUT);
      ell(c, 13, 17, 5, 2, "#f07a60");
      rect(c, 13, 22, 6, 1, OUT); rect(c, 12, 21, 1, 1, OUT); rect(c, 19, 21, 1, 1, OUT);
    },
    caipirito(c) {
      rect(c, 21, 2, 2, 10, "#ff5aa0"); rect(c, 19, 1, 4, 2, "#ff5aa0"); // canudinho
      body(c, [["e", 16, 19, 10.5, 10, "#b7e04a"], ["e", 26, 19, 2, 2.5, "#b7e04a"], ["e", 11, 8, 4, 2, "#2e8b3a"]]);
      ell(c, 12, 14, 3.5, 2.5, "#e3f79a");
      rect(c, 11, 8, 4, 1, "#1f6a2a");
      eye(c, 11, 18); eye(c, 19, 18);
      rect(c, 13, 23, 6, 1, OUT); rect(c, 12, 22, 1, 1, OUT); rect(c, 19, 22, 1, 1, OUT);
      ell(c, 9, 21, 1.5, 1, "#ff9aa8"); ell(c, 23, 21, 1.5, 1, "#ff9aa8");
      rect(c, 3, 25, 4, 4, "#dff4ff"); rect(c, 3, 25, 4, 1, "#ffffff"); // gelinho
    },
    pasteletrico(c) {
      body(c, [["e", 16, 21, 13, 8, "#f0c060"]]);
      c.clearRect(0, 22, S, 10);
      rect(c, 3, 21, 26, 1, OUT);
      for (let x = 4; x < 29; x += 3) rect(c, x, 20, 1, 1, "#c9913a"); // beirada apertada com o garfo
      ell(c, 12, 16, 4, 2, "#ffe09a");
      eye(c, 11, 16, true); eye(c, 19, 16, true);
      rect(c, 14, 20, 4, 1, OUT);
      c.fillStyle = "#ffe066"; c.beginPath(); c.moveTo(25, 3); c.lineTo(20, 12); c.lineTo(24, 12); c.lineTo(21, 19); c.lineTo(29, 9); c.lineTo(25, 9); c.lineTo(28, 3); c.closePath(); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
      rect(c, 4, 9, 1, 3, "#fff27a"); rect(c, 3, 10, 3, 1, "#fff27a"); rect(c, 8, 4, 1, 1, "#fff27a");
      for (const x of [9, 22]) { rect(c, x, 22, 2, 5, OUT); rect(c, x - 1, 26, 4, 2, OUT); }
    },
    pedrolho(c) {
      body(c, [["e", 4, 20, 3, 3, "#8f8f9c"], ["e", 28, 20, 3, 3, "#8f8f9c"], ["r", 6, 9, 20, 18, "#9a9aa8"]]);
      rect(c, 6, 9, 20, 3, "#b5b5c2"); rect(c, 6, 24, 20, 3, "#7a7a88");
      rect(c, 9, 12, 1, 4, "#6f6f7c"); rect(c, 10, 15, 3, 1, "#6f6f7c"); rect(c, 22, 20, 1, 4, "#6f6f7c"); rect(c, 19, 19, 3, 1, "#6f6f7c"); // rachaduras
      rect(c, 10, 14, 5, 1, OUT); rect(c, 18, 14, 5, 1, OUT); rect(c, 14, 13, 1, 1, OUT); rect(c, 18, 13, 1, 1, OUT);
      eye(c, 11, 16, true); eye(c, 19, 16, true);
      rect(c, 13, 22, 7, 1, OUT);
      rect(c, 8, 27, 5, 2, "#6f6f7c"); rect(c, 19, 27, 5, 2, "#6f6f7c");
    },
    saci(c) {
      // redemoinho embaixo
      for (let i = 0; i < 4; i++) ell(c, 16, 28 - i * 2, 9 - i * 1.5, 1.5, i % 2 ? "#d9d2ff" : "#b3a6f0");
      body(c, [["r", 15, 19, 3, 8, "#5a3320"], ["e", 16, 17, 5, 5, "#e0352b"], ["e", 16, 10, 5.5, 5.5, "#6b3b22"]]);
      c.fillStyle = OUT; c.beginPath(); c.moveTo(9, 7); c.lineTo(23, 7); c.lineTo(18, -1); c.closePath(); c.fill();
      c.fillStyle = "#e0352b"; c.beginPath(); c.moveTo(10, 6); c.lineTo(22, 6); c.lineTo(18, 0); c.closePath(); c.fill();
      eye(c, 13, 9); eye(c, 18, 9);
      rect(c, 14, 13, 4, 1, "#ffffff");
      rect(c, 20, 12, 5, 1, "#8a5a34"); rect(c, 24, 10, 2, 3, "#8a5a34"); // cachimbo
      ell(c, 26, 7, 1.5, 1.5, "#dcdce6"); ell(c, 28, 4, 2, 2, "#ececf4");
    },
    capivarao(c) {
      body(c, [["e", 14, 21, 12.5, 7.5, "#a87445"], ["e", 24, 14, 6.5, 5.5, "#a87445"], ["r", 27, 13, 4, 5, "#8a5a34"], ["e", 21, 9.5, 2, 2, "#8a5a34"]]);
      ell(c, 12, 18, 7, 2.5, "#bf8a58");
      rect(c, 29, 14, 1, 1, OUT);
      rect(c, 23, 13, 3, 1, OUT); // olho sonolento
      for (const x of [6, 11, 18, 23]) rect(c, x, 27, 3, 3, "#7a4f2a");
      ell(c, 23, 6, 3.5, 3.5, "#ff9a1a"); rect(c, 23, 2, 1, 2, "#5a3a1a"); ell(c, 25, 2.5, 2, 1, "#3aa04a"); // a laranja
      ell(c, 22, 5, 1, 1, "#ffc46a");
    },
    boitata(c) {
      const seg = [[6, 26, 3.5], [10, 23, 4.5], [15, 24, 5], [20, 22, 5], [22, 16, 5.5]];
      body(c, seg.map(([x, y, r]) => ["e", x, y, r, r * 0.85, "#ff6a1a"]).concat([["e", 17, 10, 8, 6.5, "#ff6a1a"]]));
      seg.forEach(([x, y, r]) => ell(c, x, y - 1, r * 0.55, r * 0.4, "#ffd34d"));
      for (const [x, y] of [[13, 3], [17, 2], [21, 3]]) { ell(c, x, y + 2, 1.8, 3, "#ff6a1a"); ell(c, x, y + 3, 1, 1.8, "#ffd34d"); }
      ell(c, 13, 9, 3, 3, "#fff6a0"); ell(c, 21, 9, 3, 3, "#fff6a0");
      rect(c, 13, 8, 1, 3, "#ff3a1a"); rect(c, 21, 8, 1, 3, "#ff3a1a");
      rect(c, 14, 14, 6, 1, OUT); rect(c, 16, 15, 1, 2, "#e0352b");
    },
    tucanudo(c) {
      rect(c, 2, 28, 22, 2, "#8a5a34"); // galho
      body(c, [["r", 9, 24, 4, 5, "#1e1e28"], ["e", 11, 18, 7.5, 9, "#26263a"], ["e", 22, 13, 8, 3.5, "#ff8a1a"]]);
      ell(c, 22, 11.5, 7, 1.6, "#ffd34d"); ell(c, 29.5, 13.5, 1.6, 2.4, "#26263a");
      rect(c, 15, 14, 14, 1, "#e0352b");
      ell(c, 11, 17, 4, 4.5, "#fff2b0");
      ell(c, 12, 11, 2.6, 2.6, "#4fb3ff"); rect(c, 12, 10, 2, 2, OUT); rect(c, 12, 10, 1, 1, "#ffffff");
      rect(c, 10, 28, 2, 1, "#ff8a1a"); rect(c, 14, 28, 2, 1, "#ff8a1a");
      rect(c, 25, 4, 1, 3, "#fff27a"); rect(c, 24, 5, 3, 1, "#fff27a"); // brilho de neon
    },
    jacareu(c) {
      for (const x of [6, 12, 18]) rect(c, x, 24, 3, 5, "#4a6a2e");
      body(c, [["e", 2.5, 22, 3, 2, "#5d7f3a"], ["e", 13, 20, 11, 5.5, "#5d7f3a"], ["e", 26, 18, 6, 3, "#5d7f3a"], ["e", 25, 22.5, 5.5, 2, "#6f9448"]]);
      for (let x = 6; x < 22; x += 4) { rect(c, x, 14, 3, 2, "#8f8f9c"); rect(c, x, 14, 3, 1, "#b5b5c2"); } // placas de pedra nas costas
      for (let x = 21; x < 31; x += 2) { rect(c, x, 20, 1, 1, "#ffffff"); rect(c, x + 1, 21, 1, 1, "#ffffff"); }
      ell(c, 22, 15, 2.2, 2.2, "#ffd34d"); rect(c, 22, 14, 1, 3, OUT);
      rect(c, 30, 17, 1, 1, OUT);
      ell(c, 12, 22, 7, 2, "#8fb866");
    },
    oncarada(c) {
      body(c, [["e", 16, 27, 9, 4, "#f2b33d"], ["e", 8, 8, 3.2, 3.2, "#f2b33d"], ["e", 24, 8, 3.2, 3.2, "#f2b33d"], ["e", 16, 16, 10.5, 9, "#f2b33d"]]);
      ell(c, 8, 8, 1.5, 1.5, "#d98a2a"); ell(c, 24, 8, 1.5, 1.5, "#d98a2a");
      for (const [x, y] of [[9, 14], [23, 14], [12, 9], [20, 9], [16, 8], [7, 19], [25, 19], [10, 27], [22, 27], [16, 29]]) { ell(c, x, y, 1.6, 1.4, "#3a2414"); rect(c, x, y, 1, 1, "#f2b33d"); }
      ell(c, 16, 20, 5.5, 3.8, "#fff2d8");
      rect(c, 15, 18, 3, 2, "#3a2414"); rect(c, 16, 20, 1, 2, "#3a2414"); rect(c, 14, 22, 5, 1, "#3a2414");
      ell(c, 12, 15, 2, 1.8, "#7fd14a"); ell(c, 20, 15, 2, 1.8, "#7fd14a"); rect(c, 12, 14, 1, 3, OUT); rect(c, 20, 14, 1, 3, OUT);
      rect(c, 9, 20, 3, 1, "#ffffff"); rect(c, 21, 20, 3, 1, "#ffffff"); // bigode
    },
    botoso(c) {
      body(c, [["e", 4, 16, 3, 4, "#f59bc4"], ["e", 15, 21, 11, 7, "#f59bc4"], ["e", 27, 22.5, 4.5, 2.2, "#f59bc4"], ["e", 13, 14, 3, 3.5, "#f59bc4"]]);
      ell(c, 16, 24, 8, 3, "#ffd0e4");
      rect(c, 21, 17, 2, 2, OUT); rect(c, 21, 17, 1, 1, "#ffffff");
      rect(c, 26, 23, 4, 1, OUT);
      // chapéu branco de galã
      rect(c, 13, 6, 12, 7, OUT); rect(c, 14, 7, 10, 5, "#ffffff"); rect(c, 14, 10, 10, 1, "#e0352b");
      rect(c, 10, 12, 18, 3, OUT); rect(c, 11, 13, 16, 1, "#ffffff");
      rect(c, 6, 5, 1, 1, "#ffe066"); rect(c, 8, 2, 1, 1, "#ffe066"); // encanto
    },
    micoleao(c) {
      c.save(); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.arc(25, 23, 4, Math.PI, Math.PI * 2.4); c.stroke();
      c.strokeStyle = "#ff9a1a"; c.lineWidth = 1.5; c.stroke(); c.restore(); // rabo enrolado
      body(c, [["e", 16, 26, 6.5, 4.5, "#ff9a1a"], ["e", 16, 14, 11, 10.5, "#ff9a1a"]]);
      for (let a = 0; a < 12; a++) { const x = 16 + Math.cos(a / 12 * 6.28) * 10, y = 14 + Math.sin(a / 12 * 6.28) * 10; ell(c, x, y, 2, 2, "#ffc24a"); }
      ell(c, 16, 15, 6, 6.5, "#5a3320");
      ell(c, 16, 18, 3.5, 2.5, "#7a4a2e");
      eye(c, 13, 13); eye(c, 18, 13);
      rect(c, 15, 18, 2, 1, OUT);
      ell(c, 16, 3, 2.2, 3, "#ff5a1a"); ell(c, 16, 4, 1.2, 1.8, "#ffe066"); ell(c, 10, 5, 1.5, 2, "#ff5a1a"); ell(c, 22, 5, 1.5, 2, "#ff5a1a");
    },
    tatubala(c) {
      for (const y of [12, 18, 24]) rect(c, 0, y, 5, 1, "#ffffff"); // riscos de velocidade
      body(c, [["e", 16, 18, 11, 10.5, "#b08a5e"], ["e", 26, 25, 4.5, 3.5, "#c9a57a"], ["e", 24, 20, 1.5, 2.5, "#c9a57a"]]);
      for (const x of [9, 13, 17, 21]) rect(c, x, 9, 1, 19, "#8a6a44");
      ell(c, 13, 12, 5, 2.5, "#ccaa7c");
      rect(c, 26, 24, 2, 2, OUT); rect(c, 26, 24, 1, 1, "#ffffff");
      rect(c, 30, 26, 1, 1, OUT);
    },
    fofocaio(c) {
      rect(c, 3, 29, 20, 2, "#8a5a34");
      body(c, [["e", 9, 27, 3, 2, "#2f8f3a"], ["e", 13, 20, 7.5, 9, "#3cb44a"], ["e", 14, 10, 6.5, 6, "#3cb44a"], ["e", 20, 12, 3, 3, "#ffcf3a"]]);
      rect(c, 21, 13, 2, 2, OUT);
      ell(c, 11, 12, 2.2, 1.6, "#ffe066"); ell(c, 13, 22, 4.5, 5, "#5fd06a");
      eye(c, 15, 8);
      ell(c, 7, 19, 3, 6, "#2f8f3a"); rect(c, 5, 24, 4, 2, "#e0352b"); rect(c, 6, 26, 3, 1, "#2f6fd6");
      rect(c, 12, 29, 2, 1, OUT); rect(c, 16, 29, 2, 1, OUT);
      // balão de fofoca
      rect(c, 22, 1, 10, 7, OUT); rect(c, 23, 2, 8, 5, "#ffffff"); rect(c, 23, 8, 2, 2, OUT);
      rect(c, 24, 4, 1, 1, OUT); rect(c, 26, 4, 1, 1, OUT); rect(c, 28, 4, 1, 1, OUT);
    },
    sucurri(c) {
      body(c, [["e", 16, 27, 13, 3.5, "#4a8a3a"], ["e", 16, 22, 10.5, 3.5, "#4a8a3a"], ["e", 16, 17, 7.5, 3, "#4a8a3a"], ["r", 18, 8, 4, 8, "#4a8a3a"], ["e", 21, 8, 6, 4, "#4a8a3a"]]);
      for (const [x, y] of [[6, 27], [12, 28], [20, 28], [26, 27], [9, 22], [16, 23], [23, 22], [12, 17], [19, 17]]) ell(c, x, y, 1.6, 1, "#26502a");
      ell(c, 18, 23, 7, 1, "#8fc46a"); ell(c, 16, 28, 9, 1, "#8fc46a");
      ell(c, 19, 7, 1.8, 1.8, "#ffe066"); ell(c, 24, 7, 1.8, 1.8, "#ffe066"); rect(c, 19, 6, 1, 2, OUT); rect(c, 24, 6, 1, 2, OUT);
      rect(c, 18, 10, 8, 1, OUT); // sorrisão
      rect(c, 27, 9, 3, 1, "#e0352b"); rect(c, 30, 8, 1, 1, "#e0352b"); rect(c, 30, 10, 1, 1, "#e0352b");
    },
    preguicudo(c) {
      rect(c, 0, 3, 32, 3, "#8a5a34"); ell(c, 4, 3, 3, 2, "#3aa04a"); ell(c, 27, 2, 3.5, 2, "#3aa04a"); // galho
      body(c, [["r", 7, 5, 3, 12, "#9c8266"], ["r", 22, 5, 3, 12, "#9c8266"], ["e", 16, 20, 9.5, 9.5, "#9c8266"]]);
      for (const x of [7, 22]) { rect(c, x, 4, 1, 3, "#f2e6c8"); rect(c, x + 2, 4, 1, 3, "#f2e6c8"); }
      ell(c, 16, 17, 6.5, 5, "#e8d8b8");
      ell(c, 12.5, 16.5, 2.5, 1.5, "#4a3a2a"); ell(c, 19.5, 16.5, 2.5, 1.5, "#4a3a2a");
      rect(c, 12, 16, 2, 1, "#1b1b2f"); rect(c, 19, 16, 2, 1, "#1b1b2f"); // olho fechado de sono
      rect(c, 15, 18, 2, 1, "#4a3a2a"); rect(c, 14, 20, 4, 1, "#4a3a2a");
      ell(c, 16, 25, 5, 3, "#b39a7c");
      rect(c, 26, 12, 1, 1, "#ffffff"); rect(c, 28, 9, 2, 1, "#ffffff"); rect(c, 29, 10, 1, 1, "#ffffff"); // zzz
    },
    loboguarana(c) {
      rect(c, 2, 19, 5, 10, OUT); rect(c, 3, 20, 3, 8, "#1f9d55"); rect(c, 3, 23, 3, 2, "#e0352b"); rect(c, 3, 19, 3, 1, "#c9c9d6"); // latinha de guaraná
      for (const x of [11, 14, 20, 23]) rect(c, x, 20, 2, 9, "#1b1b2f");
      body(c, [["e", 17, 17, 8.5, 5.5, "#e2702a"], ["e", 25, 11, 4.5, 4, "#e2702a"], ["e", 29.5, 12.5, 2.5, 1.8, "#e2702a"], ["e", 23, 4.5, 1.6, 3.5, "#e2702a"], ["e", 27, 4.5, 1.6, 3.5, "#e2702a"]]);
      rect(c, 21, 10, 3, 8, "#1b1b2f"); // crina preta
      ell(c, 16, 19, 6, 2, "#f59050");
      rect(c, 31, 12, 1, 1, OUT);
      rect(c, 25, 10, 2, 2, OUT); rect(c, 25, 10, 1, 1, "#ffffff");
      rect(c, 9, 15, 1, 3, "#fff27a"); rect(c, 8, 16, 3, 1, "#fff27a"); rect(c, 12, 9, 1, 1, "#fff27a");
    },
  };

  const cache = {};
  function sprite(id) {
    if (cache[id]) return cache[id];
    const cv = document.createElement("canvas"); cv.width = S; cv.height = S;
    const c = cv.getContext("2d");
    (DRAW[id] || DRAW.capivarao)(c);
    return (cache[id] = cv.toDataURL());
  }
  window.GaleramonSprite = sprite;
})();
