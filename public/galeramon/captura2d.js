// A cena da Pokébola em 2D (pixel art, num canvas por cima da página), na Vila e no Ginásio. É a mesma encenação em 8
// tempos dos golpes do Ginásio (encenacao.js), agora para a captura:
// 1. Carga: a bola cresce na mão, o anel da cor da raridade fecha em volta e as faíscas vêm para ela;
// 2. Núcleo: a bola em si, girando, com o botão aceso (o brilho pulsa a cada balanço);
// 3. Rastro: o arco do arremesso, com a fita atrás e as faíscas caindo;
// 4. Estouro: a bola abre no Pokémon com o clarão e os raios, ele vira luz vermelha e é puxado para dentro;
// 5. Reação: a bola cai, quica e balança (uma vez por checagem que passou); escapando, ela estoura e ele volta;
// 6. Som: o zumbido da carga, o assobio, o estalo, o "tuc" de cada balanço, o clique e a musiquinha (ou o estouro);
// 7. Rescaldo: pegou, as três estrelas, a bola apaga e o brilho assenta; escapou, as metades voam e sobe a fumaça;
// 8. Números: a chance antes de jogar, o 1, 2, 3 de cada balanço e o "Capturado!" ou "Escapou!".
// Os tempos são os de Niveis.TEMPOS_DA_BOLA (o Ginásio pausa a luta o mesmo tanto). Com "menos movimento", fica só a
// bola, os balanços e o texto, sem partículas nem tremor.
// Uso: Captura2D.tocar({ de: {x, y}, alvo: {x, y}, tamanho, sprite, brilhante, cor, balancos, pegou, chance,
// tempos, aoEsconder, aoMostrar, som }) → Promise (de e alvo em pixels da página).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Captura2D = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const TEMPOS = { carga: 550, voo: 650, abre: 600, balanco: 700, pegou: 1300, escapou: 900 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const suave = (k) => k * k * (3 - 2 * k);

  // a linha do tempo: cada fase com começo e fim (ms desde o começo da cena)
  function fasesDe(tempos, balancos, pegou) {
    const T = { ...TEMPOS, ...(tempos || {}) }, f = {};
    let t = 0;
    const fase = (nome, dur) => { f[nome] = { de: t, ate: t + dur }; t += dur; };
    fase("carga", T.carga); fase("voo", T.voo); fase("abre", T.abre);
    for (let i = 0; i < balancos; i++) fase(`balanco${i + 1}`, T.balanco);
    fase(pegou ? "pegou" : "escapou", pegou ? T.pegou : T.escapou);
    f.total = t;
    return f;
  }
  // o arco do arremesso (k de 0 a 1): sobe um terço da distância e mais um pouco
  function noVoo(k, de, alvo) {
    const x = de.x + (alvo.x - de.x) * k, y = de.y + (alvo.y - de.y) * k;
    const altura = Math.max(60, Math.hypot(alvo.x - de.x, alvo.y - de.y) * 0.35);
    return { x, y: y - Math.sin(Math.PI * k) * altura };
  }
  // a inclinação da bola no balanço (k de 0 a 1): vai, volta, para (em radianos)
  const inclinacao = (k) => (k < 0.7 ? Math.sin((k / 0.7) * Math.PI * 2) * 0.42 * (1 - k / 0.7 * 0.3) : 0);

  // ---------- o som (WebAudio, tudo sintetizado) ----------
  let audio = null;
  function ctxDeAudio() {
    if (audio) return audio;
    try { const C = window.AudioContext || window.webkitAudioContext; audio = C ? new C() : null; } catch { audio = null; }
    return audio;
  }
  function nota(freq, ini, dur, tipo = "square", vol = 0.08, ate = null) {
    const a = ctxDeAudio(); if (!a) return;
    const t = a.currentTime + ini / 1000, o = a.createOscillator(), g = a.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t);
    if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur / 1000);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur / 1000);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur / 1000 + 0.02);
  }
  function chiado(ini, dur, de, ate, vol = 0.12) {
    const a = ctxDeAudio(); if (!a) return;
    const t = a.currentTime + ini / 1000, n = Math.floor(a.sampleRate * dur / 1000), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const fonte = a.createBufferSource(), filtro = a.createBiquadFilter(), g = a.createGain();
    fonte.buffer = buf; filtro.type = "bandpass"; filtro.Q.value = 2;
    filtro.frequency.setValueAtTime(de, t); filtro.frequency.exponentialRampToValueAtTime(ate, t + dur / 1000);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur / 1000);
    fonte.connect(filtro).connect(g).connect(a.destination); fonte.start(t);
  }
  // o roteiro do som, pela linha do tempo
  function tocarSom(f, balancos, pegou) {
    const a = ctxDeAudio(); if (!a) return;
    if (a.state === "suspended") a.resume().catch(() => {});
    nota(220, f.carga.de, f.carga.ate - f.carga.de, "sawtooth", 0.035, 660);   // a carga sobe
    chiado(f.voo.de, f.voo.ate - f.voo.de, 600, 2400, 0.08);                   // o assobio do voo
    nota(1200, f.abre.de, 90, "square", 0.07, 300);                            // o estalo da bola abrindo
    nota(900, f.abre.de + 80, 420, "sine", 0.06, 120);                         // o Pokémon sendo puxado
    nota(160, f.abre.ate - 120, 90, "triangle", 0.12);                         // a bola cai no chão
    for (let i = 1; i <= balancos; i++) { const b = f[`balanco${i}`]; nota(330, b.de + 60, 70, "triangle", 0.1); nota(260, b.de + 300, 70, "triangle", 0.08); }
    if (pegou) { const t = f.pegou.de; nota(1500, t, 60, "square", 0.08); [523, 659, 784, 1047].forEach((fr, i) => nota(fr, t + 250 + i * 120, 160, "square", 0.05)); }
    else { const t = f.escapou.de; chiado(t, 380, 3000, 300, 0.16); nota(520, t, 300, "sawtooth", 0.05, 110); }
  }

  // ---------- o desenho ----------
  // a Pokébola em pixel art (r: o raio; aberta: 0 fechada, 1 aberta; brilho: o botão aceso, 0 a 1; apagada: a bola cinza)
  function desenharBola(c, x, y, r, giro, aberta = 0, brilho = 0, apagada = 0) {
    const px = Math.max(1, Math.round(r / 6));
    c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate(giro);
    const verm = apagada ? "#8a6a6a" : "#e8483b", branco = apagada ? "#b8b8b8" : "#f4f4f4";
    // a metade de baixo
    c.fillStyle = "#1b1b1b"; c.beginPath(); c.arc(0, 0, r + px, 0, Math.PI); c.fill();
    c.fillStyle = branco; c.beginPath(); c.arc(0, 0, r, 0, Math.PI); c.fill();
    // a metade de cima (abre girando para trás)
    c.save(); c.translate(-r, 0); c.rotate(-aberta * 1.9); c.translate(r, 0);
    c.fillStyle = "#1b1b1b"; c.beginPath(); c.arc(0, 0, r + px, Math.PI, Math.PI * 2); c.fill();
    c.fillStyle = verm; c.beginPath(); c.arc(0, 0, r, Math.PI, Math.PI * 2); c.fill();
    c.fillStyle = "#ffffff55"; c.fillRect(-r * 0.55, -r * 0.75, px * 2, px * 2); // o reflexo
    c.restore();
    // a faixa e o botão
    c.fillStyle = "#1b1b1b"; c.fillRect(-r - px, -px, (r + px) * 2, px * 2);
    c.beginPath(); c.arc(0, 0, r * 0.36, 0, Math.PI * 2); c.fill();
    c.fillStyle = apagada ? "#9a9a9a" : "#ffffff"; c.beginPath(); c.arc(0, 0, r * 0.22, 0, Math.PI * 2); c.fill();
    if (brilho > 0) { c.globalAlpha = brilho; c.fillStyle = "#ff5a4a"; c.beginPath(); c.arc(0, 0, r * 0.2, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
    c.restore();
  }
  function estrela(c, x, y, r, cor) {
    c.fillStyle = cor; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  function texto(c, s, x, y, tam, cor, alfa = 1) {
    c.save(); c.globalAlpha = alfa; c.font = `700 ${Math.round(tam)}px "Pixelify Sans", ui-monospace, monospace`; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = Math.max(3, tam / 5); c.strokeStyle = "#10141a"; c.strokeText(s, x, y); c.fillStyle = cor; c.fillText(s, x, y); c.restore();
  }
  // o Pokémon virando luz (k: 0 inteiro, 1 dentro da bola), pintado de vermelho por cima do desenho dele
  function silhueta(c, img, x, y, tam, k, para) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const s = tam * (1 - k * 0.9), px = x + (para.x - x) * k * k, py = y + (para.y - y) * k * k;
    const cv = silhueta.cv || (silhueta.cv = document.createElement("canvas")), w = 96;
    cv.width = cv.height = w; const g = cv.getContext("2d");
    g.clearRect(0, 0, w, w); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, w, w);
    g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(255,${Math.round(90 - k * 60)},${Math.round(80 - k * 60)},${0.55 + k * 0.45})`; g.fillRect(0, 0, w, w); g.globalCompositeOperation = "source-over";
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 1 - k * 0.3; c.drawImage(cv, px - s / 2, py - s / 2, s, s); c.restore();
  }

  function tocar(op) {
    return new Promise((pronto) => {
      if (typeof document === "undefined") return pronto();
      const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const f = fasesDe(op.tempos, op.balancos, op.pegou), cor = op.cor || "#ffd84a", tam = op.tamanho || 96;
      const de = op.de, alvo = op.alvo, chao = { x: alvo.x, y: alvo.y + tam * 0.32 }, r = clamp(tam * 0.13, 7, 16);
      const cv = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1);
      cv.className = "captura2d"; cv.setAttribute("aria-hidden", "true");
      Object.assign(cv.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 60 });
      document.body.appendChild(cv);
      const ajustar = () => { cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); };
      ajustar(); addEventListener("resize", ajustar);
      const c = cv.getContext("2d");
      let img = null;
      if (op.sprite) { img = new Image(); img.crossOrigin = "anonymous"; img.src = op.sprite; }
      if (op.som !== false) tocarSom(f, op.balancos, op.pegou);
      const parts = [], rastro = [], restos = [];
      const faisca = (x, y, vx, vy, vida, corP, tamP = 2) => { if (!calmo && parts.length < 220) parts.push({ x, y, vx, vy, vida, max: vida, cor: corP, tam: tamP }); };
      let escondido = false, mostrado = false, inicio = performance.now(), ultimo = inicio, pronta = false;
      const fase = (t, nome) => (f[nome] && t >= f[nome].de && t < f[nome].ate ? (t - f[nome].de) / (f[nome].ate - f[nome].de) : null);
      function quadro(agora) {
        const t = agora - inicio, dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
        c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight); c.imageSmoothingEnabled = false;
        // 1. carga: a bola nasce na mão, o anel fecha e as faíscas vêm para ela
        const kc = fase(t, "carga");
        if (kc != null) {
          const rr = r * (0.3 + suave(kc) * 0.7);
          c.strokeStyle = cor; c.lineWidth = 3; c.globalAlpha = 0.85 * (1 - kc * 0.4);
          c.beginPath(); c.arc(de.x, de.y, rr + 28 * (1 - suave(kc)) + 4, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
          if (Math.random() < 0.8) { const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 20; faisca(de.x + Math.cos(a) * d, de.y + Math.sin(a) * d, -Math.cos(a) * d * 3, -Math.sin(a) * d * 3, 0.3, Math.random() < 0.5 ? cor : "#ffffff"); }
          desenharBola(c, de.x, de.y, rr, -kc * 4, 0, kc);
          // 8. números: a chance em cima da mão
          if (op.chance != null) texto(c, op.chanceTexto || `${Math.round(op.chance * 100)}%`, de.x, de.y - r * 3 - 6, 16, cor, suave(Math.min(1, kc * 2)));
        }
        // 2. núcleo e 3. rastro: o voo em arco, girando, com a fita e as faíscas
        const kv = fase(t, "voo");
        if (kv != null) {
          const p = noVoo(suave(kv), de, alvo);
          rastro.push({ x: p.x, y: p.y }); if (rastro.length > 14) rastro.shift();
          if (!calmo) for (let i = 1; i < rastro.length; i++) {
            const a = rastro[i - 1], b = rastro[i], k = i / rastro.length;
            c.strokeStyle = `rgba(255,255,255,${k * 0.7})`; c.lineWidth = r * 1.4 * k; c.lineCap = "round";
            c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
            if (i % 3 === 0) faisca(b.x, b.y, (Math.random() - 0.5) * 40, 30 + Math.random() * 40, 0.4, i % 2 ? "#ff6a5a" : cor);
          }
          desenharBola(c, p.x, p.y, r, kv * 14, 0, 0.4 + Math.sin(t / 50) * 0.3);
        }
        // 4. estouro: abre no Pokémon, clarão, raios, ele vira luz e entra; depois a bola cai no chão
        const ka = fase(t, "abre");
        if (ka != null) {
          if (!escondido) { escondido = true; op.aoEsconder && op.aoEsconder(); for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; faisca(alvo.x, alvo.y, Math.cos(a) * 220, Math.sin(a) * 220, 0.45, i % 2 ? "#ffffff" : cor, 3); } }
          const abre = ka < 0.65 ? Math.min(1, ka * 4) : Math.max(0, 1 - (ka - 0.65) * 5);
          if (ka < 0.55) {
            const k = ka / 0.55;
            if (!calmo) { // o clarão e os raios
              c.globalAlpha = (1 - k) * 0.8; c.fillStyle = "#ffffff"; c.beginPath(); c.arc(alvo.x, alvo.y, tam * (0.3 + k * 0.9), 0, Math.PI * 2); c.fill();
              c.strokeStyle = cor; c.lineWidth = 3;
              for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + k, d1 = tam * 0.35 + k * tam * 0.6, d2 = d1 + tam * 0.35; c.beginPath(); c.moveTo(alvo.x + Math.cos(a) * d1, alvo.y + Math.sin(a) * d1); c.lineTo(alvo.x + Math.cos(a) * d2, alvo.y + Math.sin(a) * d2); c.stroke(); }
              c.globalAlpha = 1;
            }
            silhueta(c, img, alvo.x, alvo.y, tam, k, { x: alvo.x, y: alvo.y - tam * 0.45 });
          }
          // a bola paira, abre, fecha e cai até o chão com um quique
          const queda = ka < 0.6 ? 0 : (ka - 0.6) / 0.4, by = alvo.y - tam * 0.45 + (chao.y - (alvo.y - tam * 0.45)) * (queda < 0.75 ? suave(queda / 0.75) : 1) - (queda >= 0.75 ? Math.sin((queda - 0.75) / 0.25 * Math.PI) * 10 : 0);
          desenharBola(c, alvo.x, by, r, 0, abre, ka < 0.6 ? 1 : 0.3);
        }
        // 5. reação: os balanços, com o botão piscando, a poeira e (8.) o número de cada um
        for (let i = 1; i <= op.balancos; i++) {
          const kb = fase(t, `balanco${i}`); if (kb == null) continue;
          desenharBola(c, chao.x, chao.y, r, inclinacao(kb), 0, kb < 0.5 ? 1 - kb * 2 : 0);
          if (kb < 0.08 && !calmo) for (let j = 0; j < 3; j++) faisca(chao.x + (Math.random() - 0.5) * r * 2, chao.y + r, (Math.random() - 0.5) * 60, -20 - Math.random() * 30, 0.4, "#c9b48a", 3);
          texto(c, String(i), chao.x + r * 2.2, chao.y - r * 2 - kb * 14, 18 + (1 - kb) * 6, "#ffffff", 1 - Math.max(0, kb - 0.6) / 0.4);
        }
        // 7. rescaldo: pegou (estrelas, a bola apaga) ou escapou (estoura, as metades voam, a fumaça)
        const kp = fase(t, "pegou"), ke = fase(t, "escapou");
        if (kp != null || (t >= f.total && op.pegou)) {
          const k = kp ?? 1;
          if (!pronta) { pronta = true; for (let i = 0; i < 3; i++) restos.push({ tipo: "estrela", a: -Math.PI / 2 + (i - 1) * 0.7 }); for (let i = 0; i < 20; i++) faisca(chao.x, chao.y, (Math.random() - 0.5) * 160, -60 - Math.random() * 120, 0.8, i % 2 ? "#ffe56a" : "#ffffff", 2); }
          if (!calmo) { c.globalAlpha = 0.35 * (1 - k); c.fillStyle = cor; c.beginPath(); c.arc(chao.x, chao.y, r * 3 + k * r * 3, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
          desenharBola(c, chao.x, chao.y, r, 0, 0, 0, Math.min(1, k * 2));
          for (const s of restos) if (s.tipo === "estrela") { const d = r * 1.5 + suave(Math.min(1, k * 2)) * r * 2.2; estrela(c, chao.x + Math.cos(s.a) * d, chao.y + Math.sin(s.a) * d, r * 0.55, "#ffe56a"); }
          // 8. números: o resultado
          texto(c, "Capturado!", chao.x, chao.y - tam * 0.75, 26 * (k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - Math.min(0.2, (k - 0.15))), "#ffe56a", Math.min(1, k * 5));
        }
        if (ke != null) {
          if (!mostrado) {
            mostrado = true; op.aoMostrar && op.aoMostrar();
            for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2; faisca(chao.x, chao.y, Math.cos(a) * 200, Math.sin(a) * 200 - 60, 0.5, i % 3 ? "#ffffff" : "#ff6a5a", 3); }
            restos.push({ tipo: "metade", x: chao.x, y: chao.y, vx: -120, vy: -260, giro: 0, cima: true }, { tipo: "metade", x: chao.x, y: chao.y, vx: 130, vy: -200, giro: 0, cima: false });
          }
          if (ke < 0.4) silhueta(c, img, alvo.x, alvo.y, tam, 1 - ke / 0.4, { x: chao.x, y: chao.y });
          for (const s of restos) if (s.tipo === "metade") {
            s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.giro += (s.cima ? -8 : 8) * dt;
            c.save(); c.globalAlpha = 1 - ke; c.translate(s.x, s.y); c.rotate(s.giro); c.fillStyle = "#1b1b1b";
            c.beginPath(); c.arc(0, 0, r + 1, s.cima ? Math.PI : 0, s.cima ? Math.PI * 2 : Math.PI); c.fill();
            c.fillStyle = s.cima ? "#e8483b" : "#f4f4f4"; c.beginPath(); c.arc(0, 0, r, s.cima ? Math.PI : 0, s.cima ? Math.PI * 2 : Math.PI); c.fill(); c.restore();
          }
          if (!calmo) { c.globalAlpha = 0.45 * (1 - ke); c.fillStyle = "#d8d8d8"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(chao.x + (i - 1.5) * r, chao.y - ke * 40 - i * 4, r * (1 + ke * 1.5), 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1; }
          texto(c, "Escapou!", alvo.x, alvo.y - tam * 0.75 - ke * 10, 24, "#ff8a80", ke < 0.8 ? 1 : (1 - ke) * 5);
        }
        // as faíscas
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]; p.vida -= dt; if (p.vida <= 0) { parts.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; p.vx *= 0.96;
          c.globalAlpha = p.vida / p.max; c.fillStyle = p.cor; c.fillRect(Math.round(p.x), Math.round(p.y), p.tam, p.tam);
        }
        c.globalAlpha = 1;
        if (t < f.total + 200) requestAnimationFrame(quadro);
        else { removeEventListener("resize", ajustar); cv.remove(); if (!op.pegou && !mostrado) op.aoMostrar && op.aoMostrar(); pronto(); }
      }
      requestAnimationFrame(quadro);
    });
  }
  return { TEMPOS, fasesDe, noVoo, inclinacao, tocar };
});
