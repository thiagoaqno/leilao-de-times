// Gatinhos Explosivos — sons (WebAudio, sem arquivos) e animações dos eventos `fx` que o servidor manda.
// A página entrega em `L` onde ficam as coisas na tela (lugar de cada jogador, monte, descarte, mão) e este arquivo
// só desenha por cima: cartas voando, avisos grandes, clarões, tremida e fagulhas. Nada aqui muda o jogo.
(function (root) {
  const reduz = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const camada = () => {
    let c = document.getElementById("fxlayer");
    if (!c) { c = document.createElement("div"); c.id = "fxlayer"; c.className = "fxlayer"; document.body.appendChild(c); }
    return c;
  };

  // ---------- sons ----------
  const Som = (() => {
    let ctx = null, mudo = !!(root.Comum && Comum.store.get("kittens:mudo"));
    const ac = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } if (ctx && ctx.state === "suspended") ctx.resume(); return ctx; };
    function tom(freq, dur, { tipo = "sine", vol = 0.15, em = 0, desliza = 0 } = {}) {
      const c = ac(); if (!c || mudo) return;
      const t = c.currentTime + em, o = c.createOscillator(), g = c.createGain();
      o.type = tipo; o.frequency.setValueAtTime(freq, t);
      if (desliza) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + desliza), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    function ruido(dur, { vol = 0.2, em = 0, freq = 2000, q = 1, tipo = "bandpass" } = {}) {
      const c = ac(); if (!c || mudo) return;
      const t = c.currentTime + em, buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; f.type = tipo; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
      s.connect(f).connect(g).connect(c.destination); s.start(t);
    }
    const sons = {
      draw() { ruido(0.1, { vol: 0.3, freq: 5000, q: 0.7 }); },
      deal() { for (let k = 0; k < 8; k++) ruido(0.05, { vol: 0.22, freq: 4500, em: k * 0.07 }); },
      play() { ruido(0.1, { vol: 0.4, freq: 3200, q: 0.8 }); tom(260, 0.09, { vol: 0.14, em: 0.07, desliza: -120 }); },
      nope() { tom(190, 0.28, { tipo: "sawtooth", vol: 0.13, desliza: -90 }); tom(120, 0.3, { tipo: "square", vol: 0.1, em: 0.06 }); },
      cancel() { tom(600, 0.25, { tipo: "triangle", vol: 0.12, desliza: -420 }); },
      shuffle() { for (let k = 0; k < 6; k++) ruido(0.06, { vol: 0.2, freq: 3000 + k * 400, em: k * 0.06 }); },
      peek() { tom(660, 0.18, { vol: 0.1 }); tom(990, 0.3, { vol: 0.1, em: 0.1 }); tom(1320, 0.4, { vol: 0.07, em: 0.2 }); },
      skip() { tom(420, 0.1, { tipo: "square", vol: 0.1 }); tom(300, 0.2, { tipo: "square", vol: 0.1, em: 0.1 }); },
      attack() { ruido(0.35, { vol: 0.6, freq: 500, q: 0.6 }); tom(150, 0.35, { tipo: "sawtooth", vol: 0.2, desliza: -90 }); },
      steal() { tom(900, 0.08, { tipo: "square", vol: 0.08 }); tom(1300, 0.12, { tipo: "square", vol: 0.08, em: 0.08 }); },
      tic() { tom(1500, 0.04, { tipo: "square", vol: 0.1 }); tom(1500, 0.04, { tipo: "square", vol: 0.1, em: 0.22 }); },
      boom() { ruido(0.9, { vol: 1, freq: 160, q: 0.5, tipo: "lowpass" }); tom(80, 0.7, { tipo: "sine", vol: 0.5, desliza: -50 }); },
      defuse() { [523, 659, 784, 1047].forEach((f, k) => tom(f, 0.2, { tipo: "triangle", vol: 0.13, em: k * 0.09 })); },
      turn() { tom(784, 0.12, { tipo: "triangle", vol: 0.14 }); tom(1175, 0.3, { tipo: "triangle", vol: 0.14, em: 0.11 }); },
      win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, k) => tom(f, k === 6 ? 0.6 : 0.16, { tipo: "square", vol: 0.07, em: k * 0.12 })); },
      pop() { tom(700, 0.09, { vol: 0.12, desliza: 800 }); },
    };
    return {
      tocar(n) { try { if (!mudo && !document.hidden && sons[n]) sons[n](); } catch {} },
      get mudo() { return mudo; },
      alternar() { mudo = !mudo; Comum.store.set("kittens:mudo", mudo); if (!mudo) ac(); return mudo; },
      destravar() { if (!mudo) ac(); },
    };
  })();

  // ---------- peças das animações ----------
  const centro = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  function voa(html, de, para, { dur = 520, esc = [1, 1], giro = [0, 0], atraso = 0, aoFim } = {}) {
    if (reduz() || !de || !para) { if (aoFim) aoFim(); return; }
    const el = document.createElement("div"); el.className = "fly"; el.innerHTML = html;
    const w = el.firstElementChild ? parseFloat(getComputedStyle(el.firstElementChild).width) || 70 : 70, h = w * 1.45;
    camada().appendChild(el);
    const p = (c, e, g) => `translate(${c.x - w / 2}px,${c.y - h / 2}px) scale(${e}) rotate(${g}deg)`;
    const a = el.animate([{ transform: p(de, esc[0], giro[0]), opacity: 0.2 }, { opacity: 1, offset: 0.15 }, { transform: p(para, esc[1], giro[1]), opacity: 1 }], { duration: dur, delay: atraso, easing: "cubic-bezier(.3,.7,.3,1)", fill: "both" });
    a.onfinish = () => { el.remove(); if (aoFim) aoFim(); };
  }
  function aviso(texto, cor = "#ff8a1f", dur = 1100) {
    const b = document.createElement("div"); b.className = "banner"; b.textContent = texto; b.style.setProperty("--bc", cor);
    camada().appendChild(b);
    if (reduz()) { setTimeout(() => b.remove(), 700); return; }
    const a = b.animate([{ transform: "translate(-50%,-50%) scale(.3) rotate(-6deg)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1.15) rotate(2deg)", opacity: 1, offset: 0.22 }, { transform: "translate(-50%,-50%) scale(1) rotate(0)", opacity: 1, offset: 0.7 }, { transform: "translate(-50%,-62%) scale(1.05)", opacity: 0 }], { duration: dur, easing: "ease-out" });
    a.onfinish = () => b.remove();
  }
  function clarao(cor = "#ff8a1f", dur = 520, forca = 0.85) {
    if (reduz()) return;
    const f = document.createElement("div"); f.className = "flash"; f.style.setProperty("--fc", cor); camada().appendChild(f);
    const a = f.animate([{ opacity: forca }, { opacity: 0 }], { duration: dur, easing: "ease-out" });
    a.onfinish = () => f.remove();
  }
  function treme(el) { if (reduz() || !el) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); setTimeout(() => el.classList.remove("shake"), 520); }
  function fagulhas(c, simbolos = ["💥", "🔥", "✨", "💨"], n = 22) {
    if (reduz() || !c) return;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div"); p.className = "part"; p.textContent = simbolos[i % simbolos.length];
      camada().appendChild(p);
      const ang = Math.random() * Math.PI * 2, d = 70 + Math.random() * 190;
      const a = p.animate([{ transform: `translate(${c.x}px,${c.y}px) scale(.4)`, opacity: 1 }, { transform: `translate(${c.x + Math.cos(ang) * d}px,${c.y + Math.sin(ang) * d - 40}px) scale(${1 + Math.random() * 1.6}) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 700 + Math.random() * 500, easing: "cubic-bezier(.1,.8,.3,1)" });
      a.onfinish = () => p.remove();
    }
  }
  function balancar(el) {
    if (reduz() || !el) return;
    el.animate([{ transform: "rotate(0)" }, { transform: "rotate(-6deg) scale(1.05)" }, { transform: "rotate(6deg) scale(1.05)" }, { transform: "rotate(-4deg)" }, { transform: "rotate(0)" }], { duration: 520 });
  }

  // ---------- o que fazer com cada evento ----------
  // L: { eu, nome(pid), lugar(pid) -> elemento, monte, descarte, mao, mesa, verso(), frente(carta) }
  function animar(ev, L) {
    const lugarOuMao = (pid) => (pid === L.eu ? L.mao : L.lugar(pid)) || L.mesa;
    switch (ev.kind) {
      case "deal": {
        Som.tocar("deal");
        const de = centro(L.monte);
        (L.jogadores || []).forEach((pid, i) => voa(L.verso(), de, centro(lugarOuMao(pid)), { dur: 480, atraso: i * 110, esc: [1, 0.7], giro: [0, 18 * (i % 2 ? 1 : -1)] }));
        break;
      }
      case "draw":
        Som.tocar("draw");
        if (ev.pid !== L.eu) voa(L.verso(), centro(L.monte), centro(L.lugar(ev.pid) || L.mesa), { dur: 450, esc: [1, 0.6] });
        break;
      case "play":
        Som.tocar("play");
        (ev.cards || []).forEach((c, i) => voa(L.frente(c), centro(lugarOuMao(ev.pid)), centro(L.descarte), { dur: 480, atraso: i * 110, esc: [0.8, 1], giro: [-10, 0] }));
        break;
      case "nope": Som.tocar("nope"); aviso("NEM PENSAR!", "#c1121f", 900); clarao("#ff4d4d", 350, 0.45); break;
      case "cancel": Som.tocar("cancel"); aviso("Cancelada!", "#7c3aed", 800); break;
      case "shuffle": Som.tocar("shuffle"); balancar(L.monte); aviso("Embaralhou!", "#7c3aed", 800); break;
      case "peek": Som.tocar("peek"); if (ev.pid === L.eu) aviso("🔮 Espiando…", "#0b7f86", 800); else balancar(L.monte); break;
      case "skip": Som.tocar("skip"); aviso("PULOU!", "#1d4ed8", 850); break;
      case "attack": Som.tocar("attack"); treme(L.mesa); clarao("#ff8a1f", 400, 0.5); aviso("ATAQUE!", "#c2410c", 950); break;
      case "favor": Som.tocar("steal"); aviso("Favor!", "#b0206a", 800); break;
      case "give": Som.tocar("steal"); voa(L.verso(), centro(lugarOuMao(ev.pid)), centro(lugarOuMao(ev.to)), { dur: 500, esc: [0.9, 0.7] }); break;
      case "steal": Som.tocar("steal"); voa(L.verso(), centro(lugarOuMao(ev.from)), centro(lugarOuMao(ev.pid)), { dur: 500, esc: [0.9, 0.7], giro: [0, 14] }); break;
      case "miss": Som.tocar("cancel"); aviso("Errou!", "#6b7280", 800); break;
      case "bomb": Som.tocar("tic"); setTimeout(() => Som.tocar("tic"), 450); clarao("#ff4d4d", 600, 0.55); treme(L.mesa); aviso("💣 GATINHO EXPLOSIVO!", "#b91c1c", 1400); break;
      case "defuse": setTimeout(() => { Som.tocar("defuse"); clarao("#5fe08a", 650, 0.6); aviso("DESARMADO!", "#15803d", 1100); }, 500); break;
      case "place": Som.tocar("draw"); voa(L.verso(), centro(lugarOuMao(ev.pid)), centro(L.monte), { dur: 480, esc: [0.7, 1] }); break;
      case "out": {
        Som.tocar("boom"); clarao("#ff8a1f", 800, 0.9); treme(L.mesa);
        fagulhas(centro(L.lugar(ev.pid) || L.mesa));
        aviso(`💥 ${L.nome(ev.pid)} explodiu!`, "#b91c1c", 1500);
        break;
      }
      case "turn": if (ev.pid === L.eu) Som.tocar("turn"); break;
      case "win":
        Som.tocar("win");
        if (!reduz()) Comum.confetti(["#ff8a1f", "#ff4f8b", "#31d6d0", "#ffd24a", "#a98bff", "#5fe08a"]);
        aviso(ev.pid === L.eu ? "🏆 VOCÊ VENCEU!" : `🏆 ${L.nome(ev.pid)} venceu!`, "#a16207", 1800);
        break;
    }
  }
  root.Efeitos = { Som, animar, voa, aviso, clarao, treme, fagulhas };
})(window);
