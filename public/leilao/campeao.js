// Leilão da Galera — a festa do campeão. Quando o campeonato acaba (tudo revelado e a final já terminou na tela), abre
// para todo mundo da sala um pop-up que passa como um vídeo curto, em cenas:
//   1. Fim de jogo: o apito e o placar final da decisão (com prorrogação e pênaltis);
//   2. Os gols da final: cada gol com o minuto, o rosto de quem marcou e a comemoração dele no telão;
//   3. A campanha: gols feitos, gols sofridos, vitórias, empates e derrotas;
//   4. Os artilheiros do time campeão;
//   5. A foto: o elenco inteiro com a taça e a faixa CAMPEÕES (dá para baixar a foto).
// O telão é um canvas de 160x90 em pixel-art, com os bonecos e as comemorações dos replays (lances.js, com a cabeça de
// rostos.js), ampliado sem borrar; os textos ficam em HTML por cima (nítidos e com acento). Tudo vem do resumo do
// campeonato (S.reveal.summary, montado em simulador.js: o placar da final, os gols, a campanha e o elenco).
// Abre uma vez por campeonato (guardado no navegador); o botão "Rever a festa" (sala.js) abre de novo. Com "menos
// movimento" no sistema, vai direto para a foto, parada. O tempo do vídeo só anda com a aba aberta (não pula cenas).
(function () {
  const K = Lances.kit, W = 160, H = 90;
  const quieto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prende = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const fase = (t, a, b) => prende((t - a) / (b - a));
  const suave = (f) => f * f * (3 - 2 * f);
  // sorteio com semente (o mesmo para todo mundo da sala)
  const sorteio = (txt) => { let h = 2166136261; for (const c of String(txt)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; };
  const cor = (g, c, a = 1) => { g.fillStyle = c; g.globalAlpha = a; };
  const EM_V = { bE: [-150, -160], bD: [150, 160] }; // braços para cima, em V
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const sem = (txt) => String(txt || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); // o letreiro de pixel não tem acento

  // ======================================================================
  // Os dados da festa (tudo do resumo do campeonato)
  // ======================================================================
  // a final: vem no resumo (simulador.js); num resumo antigo, procura nos jogos ao vivo (a última parte com jogos)
  function acharFinal(sum) {
    if (sum.final) return sum.final;
    const lives = (S && S.reveal && S.reveal.lives) || [], l = [...lives].reverse().find((x) => x && x.jogos && x.jogos.length);
    return l ? l.jogos.find((j) => j.titulo === "Final") || l.jogos[l.jogos.length - 1] : null;
  }
  function dados(sum) {
    const final = acharFinal(sum), lado = final ? final.vencedor || (final.gA >= final.gB ? "A" : "B") : "A", outro = lado === "A" ? "B" : "A";
    const elenco = [...(sum.time || []).map((p) => ({ ...p, titular: true })), ...(sum.reservas || []).map((p) => ({ ...p, titular: false }))];
    const craque = (sum.craque && sum.craque.nome) || (elenco[0] && elenco[0].nome) || "";
    // o uniforme do time na festa: a camisa do craque (como nos replays, em que os companheiros vestem a camisa de quem marcou)
    const u = Rostos.uniformeDe(craque), luva = { ...u, luva: "#f4f4f4" };
    const figura = (p) => K.figura(p.nome, p.vaga === "GK" ? luva : u, p.vaga === "GK" ? { goleiro: true } : {});
    const artilharia = elenco.filter((p) => p.gols > 0).sort((a, b) => b.gols - a.gols || (b.nota || 0) - (a.nota || 0));
    return { sum, final, lado, outro, elenco, craque, u, figura, artilharia, semente: (final && final.id) || sum.data || sum.campeao, futsal: sum.modalidade !== "futebol" };
  }

  // ======================================================================
  // Sons (sintetizados): o apito, a torcida, a bola na rede e o clique da foto. O botão liga e desliga (guardado).
  // ======================================================================
  const Som = (() => {
    let ac = null, master = null;
    const ligado = () => store.get("lt_somFesta") !== false;
    const ctx = () => {
      if (!ligado()) return null;
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination); } catch { return null; } }
      if (ac.state === "suspended") ac.resume().catch(() => {});
      return ac;
    };
    function tom(f0, f1, dur, ganho, tipo = "sine", atraso = 0) {
      const c = ctx(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + atraso;
      o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ganho, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    function ruido(dur, ganho, freq, atraso = 0, q = 0.7) {
      const c = ctx(); if (!c) return;
      const n = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) { const f = i / d.length; d[i] = (Math.random() * 2 - 1) * Math.min(1, f * 8) * (1 - f); }
      const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + atraso;
      s.buffer = n; fl.type = "bandpass"; fl.frequency.value = freq; fl.Q.value = q; g.gain.value = ganho;
      s.connect(fl).connect(g).connect(master); s.start(t);
    }
    return {
      ligado, liberar: ctx,
      alternar() { store.set("lt_somFesta", !ligado()); if (!ligado() && ac) ac.suspend().catch(() => {}); else ctx(); },
      apito() { tom(2350, 2300, 0.16, 0.16, "square"); tom(2350, 2300, 0.16, 0.16, "square", 0.24); tom(2350, 2250, 0.7, 0.16, "square", 0.48); },
      torcida(forca = 1) { ruido(2.4, 0.55 * forca, 900); ruido(1.8, 0.3 * forca, 1700, 0.15); },
      gol() { tom(110, 55, 0.18, 0.5, "triangle"); ruido(0.25, 0.4, 600); this.torcida(0.8); },
      conta() { tom(900, 1200, 0.05, 0.05, "square"); },
      foto() { ruido(0.07, 0.6, 3000, 0, 2); ruido(0.09, 0.5, 1800, 0.11, 2); },
      fanfarra() { [523, 659, 784, 1047].forEach((f, i) => tom(f, f, i === 3 ? 0.8 : 0.22, 0.12, "triangle", i * 0.16)); },
    };
  })();

  // ======================================================================
  // O desenho do telão (pixel-art 160x90)
  // ======================================================================
  const fundos = new Map(); // o fundo do close de cada uniforme (desenhado uma vez)
  function fundo(F, u, chave) {
    const k = F.semente + "|" + chave;
    if (!fundos.has(k)) fundos.set(k, K.fundoClose({ semente: F.semente + chave, futsal: F.futsal, art: { u } }));
    return fundos.get(k);
  }
  // as comemorações sem companheiros (as que só precisam de quem marcou)
  let SOLO = null;
  function comemoracao(nome, semente) {
    if (!SOLO) SOLO = Object.keys(Lances.COMEMORA).filter((k) => { try { const c = Lances.COMEMORA[k](600); return c && c.p && !c.extras; } catch { return false; } });
    const propria = Lances.ASSINATURA[nome], s = sorteio(semente + nome)();
    if (propria && SOLO.includes(propria) && s < 0.6) return propria;
    return SOLO[Math.floor(s * SOLO.length)] || "soco";
  }
  function papelPicado(g, F, t, n = 30) {
    const cores = [F.u.cam, F.u.det, "#ffffff", "#f6c64e", "#c6ff3a"], s = sorteio(F.semente + "papel");
    for (let k = 0; k < n; k++) {
      const x0 = s() * W, v = 14 + s() * 22, fz = s() * 6, y = ((s() * H + (t / 1000) * v) % (H + 8)) - 4;
      cor(g, cores[k % cores.length]); g.fillRect(Math.round(x0 + Math.sin(t / 260 + fz) * 3), Math.round(y), Math.floor(t / 140 + k) % 2 ? 2 : 1, 1);
    }
    g.globalAlpha = 1;
  }
  // a taça em pixel-art (dourada, com brilho), com a base em (x, y)
  function taca(g, x, y, esc = 1, brilho = 0) {
    const px = (c, a, b, w, h) => { cor(g, c); g.fillRect(Math.round(x + a * esc), Math.round(y + b * esc), w * esc, h * esc); };
    px("#6b4a12", -6, -3, 12, 3); px("#8a5f17", -5, -4, 10, 1);          // a base
    px("#c8901f", -2, -9, 4, 5); px("#e0a92b", -1, -9, 2, 5);             // o pé
    px("#f6c64e", -7, -20, 14, 8); px("#ffd96b", -5, -19, 4, 6);          // o copo
    px("#e0a92b", -6, -12, 12, 3); px("#f6c64e", -4, -12, 8, 2);
    px("#c8901f", -10, -19, 3, 2); px("#c8901f", -10, -17, 2, 4); px("#c8901f", -9, -14, 3, 2); // as asas
    px("#c8901f", 7, -19, 3, 2); px("#c8901f", 8, -17, 2, 4); px("#c8901f", 6, -14, 3, 2);
    px("#fff3c4", -4, -18, 1, 3);
    if (brilho) { cor(g, "#fffbe0", brilho); g.fillRect(Math.round(x - 1), Math.round(y - 25 * esc), 2, 3 * esc); g.fillRect(Math.round(x - 3 * esc), Math.round(y - 24 * esc), 6 * esc, 1); g.globalAlpha = 1; }
    g.globalAlpha = 1;
  }
  // o placar de pixel do telão (o letreiro de cima)
  function letreiro(g, txt, y, c = "#c6ff3a") {
    const t = sem(txt).slice(0, 38), x = Math.round((W - t.length * 4) / 2);
    cor(g, "#050a08", 0.75); g.fillRect(x - 3, y - 2, t.length * 4 + 5, 9); cor(g, c); K.escreve(g, t, x, y); g.globalAlpha = 1;
  }
  // o time inteiro na foto: os titulares em pé (braços para cima) atrás e os reservas de joelho na frente; com muita
  // gente e sem reservas, a segunda fila de titulares também ajoelha
  function fotoElenco(g, F, t, parado) {
    g.drawImage(fundo(F, F.u, "foto"), 0, 0);
    const lista = [...F.elenco];
    let atras = lista.filter((p) => p.titular), frente = lista.filter((p) => !p.titular).slice(0, 8);
    if (!frente.length && atras.length > 6) { frente = atras.slice(6); atras = atras.slice(0, 6); }
    if (atras.length > 7) { frente = [...atras.slice(7), ...frente].slice(0, 8); atras = atras.slice(0, 7); }
    // a fila de trás centralizada, com o goleiro no meio
    const goleiro = atras.findIndex((p) => p.vaga === "GK"), meio = Math.floor((atras.length - 1) / 2);
    if (goleiro >= 0) atras.splice(meio, 0, atras.splice(goleiro, 1)[0]);
    const passoA = atras.length > 5 ? 20 : 24, xa = atras.map((_, k) => 80 + (k - (atras.length - 1) / 2) * passoA);
    // na fila da frente, o meio fica para a taça: metade de cada lado dela
    const passoF = frente.length > 6 ? 17 : 21, esq = Math.ceil(frente.length / 2);
    const xf = frente.map((_, k) => (k < esq ? 80 - 20 - (esq - 1 - k) * passoF : 80 + 20 + (k - esq) * passoF));
    atras.forEach((p, i) => {
      const pula = parado ? 0 : Math.max(0, Math.sin(t / 230 + i * 1.3)) * 2;
      K.sombra(g, xa[i], 66, pula, 1);
      K.poe(g, F.figura(p), { ...K.P0, ...EM_V, pes: "fora", sobe: pula, ol: 0 }, xa[i], 66, 1);
    });
    taca(g, 80, 86, 1, parado ? 0.8 : 0.4 + 0.4 * Math.sin(t / 200));
    frente.forEach((p, i) => {
      K.poe(g, F.figura(p), { ...K.P0, ag: 5, pE: [-10, -95], pD: [10, 95], bE: [-60, -30], bD: [60, 30], pes: "fora" }, xf[i], 88, 1);
    });
    if (!parado) papelPicado(g, F, t, 34);
  }

  // ======================================================================
  // As cenas: cada uma com a duração, o desenho do telão (t em ms desde o começo dela) e o texto por cima
  // ======================================================================
  function cenas(F) {
    const s = F.sum, fin = F.final, lista = [];
    const nomeA = fin ? fin.A.nome : s.campeao, nomeB = fin ? fin.B.nome : s.vice;
    const campeaoEh = (l) => l === F.lado;
    // 1. fim de jogo
    lista.push({ id: "fim", titulo: "Fim de jogo", dur: 4200,
      desenhar(g, t) {
        g.drawImage(fundo(F, F.u, "fim"), 0, 0);
        const xs = [32, 56, 80, 104, 128], tit = F.elenco.filter((p) => p.titular).slice(0, 5);
        tit.forEach((p, i) => { // o time do campeão pulando junto, cada um com a sua comemoração
          const c = Lances.COMEMORA[comemoracao(p.nome, F.semente + i)](t + i * 170);
          K.sombra(g, xs[i], 86, (c.p && c.p.sobe) || 0, 1);
          K.poe(g, F.figura(p), c.p, xs[i] + (c.dx || 0) * 0.4, 86, 1, c.rot || 0, c.vira, c.deitado || 0);
        });
        papelPicado(g, F, t);
        if (t < 160) { cor(g, "#ffffff", 0.5 * (1 - t / 160)); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      },
      html() {
        const pens = fin && fin.pens ? `<div class="fsPens">${fin.pens.a} x ${fin.pens.b} nos pênaltis</div>` : "";
        const prorr = fin && fin.extra ? `<div class="fsTag">com prorrogação</div>` : "";
        const lado = (l, nome) => `<div class="fsTime ${campeaoEh(l) ? "ganhou" : ""}">${campeaoEh(l) ? ic("taca") : ""}<span>${esc(nome)}</span></div>`;
        return `<div class="fsTopo"><span class="fsCarimbo">${ic("apito")}Fim de jogo</span><span class="fsSub">${esc(fin && fin.titulo && fin.titulo !== "Final" ? fin.titulo : "A grande final")}</span></div>
          <div class="fsPlacar">${lado("A", nomeA)}<div class="fsGols"><b data-conta="${fin ? fin.gA : ""}">0</b><i>x</i><b data-conta="${fin ? fin.gB : ""}">0</b></div>${lado("B", nomeB)}</div>
          <div class="fsRodape">${prorr}${pens}</div>`;
      },
      tocar() { Som.apito(); setTimeout(() => Som.torcida(1.2), 900); },
    });
    // 2. os gols da final (um por um, cada um com a comemoração de quem marcou)
    const gols = fin ? fin.gols || [] : [];
    const porGol = gols.length > 6 ? 1900 : 2600;
    if (gols.length) {
      let a = 0, b = 0;
      const placares = gols.map((x) => (x.lado === "A" ? ++a : ++b, [a, b]));
      lista.push({ id: "gols", titulo: "Os gols da final", dur: gols.length * porGol,
        desenhar(g, t) {
          const i = Math.min(gols.length - 1, Math.floor(t / porGol)), x = gols[i], tc = t - i * porGol;
          const u = campeaoEh(x.lado) ? F.u : Rostos.uniformeDe(x.nome);
          g.drawImage(fundo(F, u, "gol" + x.lado), 0, 0);
          const c = Lances.COMEMORA[comemoracao(x.nome, F.semente + i)](tc), esc2 = c.zoom || 2, chao = c.chao || 85, px = 80 + (c.dx || 0) * 2;
          if (!c.deitado) K.sombra(g, px, chao, (c.p && c.p.sobe) || 0, esc2);
          K.poe(g, K.figura(x.nome, u, {}), c.p, px, chao, esc2, c.rot || 0, c.vira, c.deitado || 0);
          if (campeaoEh(x.lado)) papelPicado(g, { ...F, u }, tc, 22);
          if (tc < 140) { cor(g, "#ffffff", 0.45 * (1 - tc / 140)); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
        },
        html() {
          return `<div class="fsTopo"><span class="fsCarimbo">${ic("bola")}Os gols da final</span><span class="fsSub">${esc(nomeA)} <b class="fsMini" data-placar>0 x 0</b> ${esc(nomeB)}</span></div><div class="fsGolBox"></div>`;
        },
        // um gol novo a cada porGol: troca a faixa de baixo e o placar pequeno
        passo(el, t) {
          const i = Math.min(gols.length - 1, Math.floor(t / porGol));
          if (el._gol === i) return;
          el._gol = i; const x = gols[i], [pa, pb] = placares[i], fim = fin.mins || 40;
          const minuto = x.min > fim ? `${x.min}' (prorr.)` : `${x.min}'`, extra = x.penalti ? `<span class="fsTag">de pênalti</span>` : "";
          el.querySelector("[data-placar]").textContent = `${pa} x ${pb}`;
          el.querySelector(".fsGolBox").innerHTML = `<div class="fsGol ${campeaoEh(x.lado) ? "nosso" : "deles"}">
            <span class="fsMin">${minuto}</span><img class="fsRosto" src="${Rostos.de(x.nome)}" alt=""><span class="fsQuem"><b>${esc(x.nome)}</b><small>${esc(x.lado === "A" ? nomeA : nomeB)}</small></span>${extra}<span class="fsBola">${ic("bola")}</span></div>`;
          Som.gol();
        },
      });
    }
    // 2b. a disputa de pênaltis (quando a final foi para os pênaltis)
    if (fin && fin.pens && fin.pens.cob && fin.pens.cob.length) {
      const cob = fin.pens.cob;
      lista.push({ id: "pens", titulo: "Os pênaltis", dur: 1200 + cob.length * 380,
        desenhar(g, t) {
          g.drawImage(fundo(F, F.u, "pens"), 0, 0);
          const ult = cob[Math.min(cob.length - 1, Math.floor(Math.max(0, t - 600) / 380))], u = campeaoEh(ult.lado) ? F.u : Rostos.uniformeDe(ult.nome);
          const ok = ult.ok, pose = ok ? { ...K.P0, ...EM_V, pes: "fora" } : { ...K.P0, bE: [-150, -120], bD: [150, 120], ag: 2, pes: "fora" };
          K.sombra(g, 80, 85, 0, 2); K.poe(g, K.figura(ult.nome, u, {}), pose, 80, 85, 2);
        },
        html() {
          const fila = (l, nome) => `<div class="fsFila"><span>${esc(nome)}</span>${cob.filter((c) => c.lado === l).map((c, i) => `<i class="${c.ok ? "ok" : "erro"}" style="animation-delay:${600 + cob.indexOf(c) * 380}ms" title="${escA(c.nome)}">${ic(c.ok ? "bola" : "fechar")}</i>`).join("")}</div>`;
          return `<div class="fsTopo"><span class="fsCarimbo">${ic("luva")}Os pênaltis</span><span class="fsSub">${fin.pens.a} x ${fin.pens.b}</span></div><div class="fsPenBox">${fila("A", nomeA)}${fila("B", nomeB)}</div>`;
        },
        tocar() { Som.torcida(0.6); },
      });
    }
    // 3. a campanha (gols feitos e sofridos)
    const c = s.campanha || { v: 0, e: 0, d: 0, gp: 0, gc: 0 }, saldo = c.gp - c.gc;
    lista.push({ id: "campanha", titulo: "A campanha", dur: 4600,
      desenhar(g, t) { // a volta olímpica: o time correndo com os braços para cima, um atrás do outro
        g.drawImage(fundo(F, F.u, "volta"), 0, 0);
        F.elenco.slice(0, 7).forEach((p, i) => {
          const x = ((t / 1000) * 34 - i * 22) % (W + 60) - 20, pose = K.corre(t + i * 90, "alto", 240);
          K.sombra(g, x, 84, pose.sobe || 0, 1); K.poe(g, F.figura(p), pose, x, 84, 1);
        });
        papelPicado(g, F, t, 20);
      },
      html() {
        const tile = (n, nome, cls = "") => `<div class="fsNum ${cls}"><b data-conta="${n}">0</b><span>${nome}</span></div>`;
        return `<div class="fsTopo"><span class="fsCarimbo">${ic("grafico")}A campanha</span><span class="fsSub">${plural(s.jogos || c.v + c.e + c.d, "jogo", "jogos")}</span></div>
          <div class="fsNums">${tile(c.gp, "gols feitos", "bom")}${tile(c.gc, "gols sofridos", "ruim")}${tile(c.v, c.v === 1 ? "vitória" : "vitórias")}${tile(c.e, c.e === 1 ? "empate" : "empates")}${tile(c.d, c.d === 1 ? "derrota" : "derrotas")}</div>
          <div class="fsRodape"><span class="fsTag">saldo ${saldo > 0 ? "+" : ""}${saldo}</span></div>`;
      },
      tocar() { Som.torcida(0.7); },
    });
    // 4. os artilheiros do time campeão
    if (F.artilharia.length) {
      const top = F.artilharia.slice(0, 6), max = top[0].gols, art = s.artilheiro;
      lista.push({ id: "artilharia", titulo: "Quem fez os gols", dur: 4200,
        desenhar(g, t) {
          const p = top[0];
          g.drawImage(fundo(F, F.u, "art"), 0, 0);
          const c = Lances.COMEMORA[comemoracao(p.nome, F.semente + "art")](t);
          if (!c.deitado) K.sombra(g, 118, 85, (c.p && c.p.sobe) || 0, 2);
          K.poe(g, F.figura(p), c.p, 118 + (c.dx || 0), 85, 2, c.rot || 0, c.vira, c.deitado || 0);
        },
        html() {
          const linha = (p, i) => `<div class="fsArt" style="--i:${i};--w:${Math.max(8, (p.gols / max) * 100)}%"><img class="fsRosto" src="${Rostos.de(p.nome)}" alt=""><span class="fsNome">${esc(p.nome)}</span><span class="fsBarra"><i></i></span><b>${p.gols}</b></div>`;
          const destaque = art && art.gols && top.some((p) => p.nome === art.nome) ? `<div class="fsTag ouro">${ic("coroa")}artilheiro da copa: ${esc(art.nome)} (${plural(art.gols, "gol", "gols")})</div>` : "";
          return `<div class="fsTopo"><span class="fsCarimbo">${ic("chuteira")}Quem fez os gols</span><span class="fsSub">${esc(s.campeao)}</span></div><div class="fsArts">${top.map(linha).join("")}</div><div class="fsRodape">${destaque}</div>`;
        },
      });
    }
    // 5. a foto do elenco
    lista.push({ id: "foto", titulo: "Campeões", dur: Infinity,
      desenhar(g, t) { fotoElenco(g, F, t, quieto()); if (t < 220 && !quieto()) { cor(g, "#ffffff", 1 - t / 220); g.fillRect(0, 0, W, H); g.globalAlpha = 1; } },
      html() {
        const meu = me.capId && me.capId === s.id;
        return `<div class="fsFaixa"><b>Campeões</b><span>${esc(s.campeao)}</span></div>
          <div class="fsLegenda">${meu ? `<b class="fsVoce">${ic("coroa")}O título é seu!</b>` : s.dono && s.dono !== s.campeao ? `<span>o time de ${esc(s.dono)}</span>` : ""}<span>${esc(s.torneio || "")}</span></div>`;
      },
      tocar() {
        Som.foto(); setTimeout(() => Som.fanfarra(), 250); setTimeout(() => Som.torcida(1.3), 400);
        if (!quieto()) Comum.confetti(["#c6ff3a", "#f6c64e", "#ffffff", F.u.cam, F.u.det], { onde: FESTA.dlg });
      },
    });
    return lista;
  }

  // ======================================================================
  // O pop-up: o telão, o texto por cima, a barra das cenas e os botões
  // ======================================================================
  const FESTA = { dlg: null, F: null, cenas: [], i: -1, t: 0, ult: 0, raf: 0, vista: null };
  const chaveDe = (sum) => `${S && S.code}|${sum.data || sum.campeao}`;
  // abre a festa (uma vez por campeonato); forcar: o botão "Rever a festa"
  function abrirFesta(sum, forcar = false) {
    if (!sum || !window.Lances || !window.Rostos) return;
    const chave = chaveDe(sum), guardada = S && S.code ? store.get("lt_festa_" + S.code) : null;
    if (!forcar && (FESTA.vista === chave || guardada === chave)) return;
    FESTA.vista = chave;
    if (S && S.code) store.set("lt_festa_" + S.code, chave);
    // um respiro para a última parte entrar na tela antes de cobrir tudo
    setTimeout(() => { if (FESTA.vista === chave && (forcar || (S && S.reveal && S.reveal.summary))) montar(sum); }, forcar ? 0 : 900);
  }
  function montar(sum) {
    fechar(false);
    const F = dados(sum), lista = cenas(F);
    const dlg = document.createElement("dialog");
    dlg.className = "festa"; dlg.id = "festa"; dlg.setAttribute("aria-label", `Festa do campeão: ${sum.campeao}`);
    dlg.innerHTML = `<div class="fsTela"><canvas width="${W}" height="${H}" aria-hidden="true"></canvas><div class="fsCena" aria-live="polite"></div></div>
      <div class="fsFicha hidden"></div>
      <div class="fsBarraCenas">${lista.map((c, i) => `<button class="fsSeg" data-i="${i}" title="${escA(c.titulo)}" aria-label="${escA(c.titulo)}"><i></i></button>`).join("")}</div>
      <div class="fsBotoes">
        <button class="ghost fsSom" type="button"></button>
        <button class="fsPular" type="button">${ic("play")}Pular para a foto</button>
        <button class="primary fsBaixar hidden" type="button">${ic("imagem")}Baixar a foto</button>
        <button class="fsRever hidden" type="button">${ic("desfazer")}Ver de novo</button>
        <button class="ghost fsFechar" type="button">${ic("fechar")}Fechar</button>
      </div>`;
    document.body.appendChild(dlg);
    Object.assign(FESTA, { dlg, F, cenas: lista, i: -1, t: 0, ult: performance.now() });
    const g = dlg.querySelector("canvas").getContext("2d"); g.imageSmoothingEnabled = false; FESTA.g = g;
    const som = () => { dlg.querySelector(".fsSom").innerHTML = `${ic(Som.ligado() ? "som" : "mudo")}<span>${Som.ligado() ? "Som" : "Sem som"}</span>`; };
    som();
    dlg.querySelector(".fsSom").onclick = () => { Som.alternar(); som(); };
    dlg.querySelector(".fsPular").onclick = () => irPara(lista.length - 1);
    dlg.querySelector(".fsRever").onclick = () => irPara(0);
    dlg.querySelector(".fsBaixar").onclick = () => baixarFoto(F);
    dlg.querySelector(".fsFechar").onclick = () => fechar();
    dlg.querySelectorAll(".fsSeg").forEach((b) => (b.onclick = () => irPara(+b.dataset.i)));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) fechar(); }); // clique fora do quadro fecha
    dlg.addEventListener("close", () => parar());
    dlg.addEventListener("pointerdown", () => Som.liberar(), { once: true });
    dlg.showModal();
    irPara(quieto() ? lista.length - 1 : 0);
    if (!quieto()) FESTA.raf = requestAnimationFrame(quadro);
    else desenharAgora();
  }
  function irPara(i) {
    const lista = FESTA.cenas, dlg = FESTA.dlg; if (!dlg) return;
    FESTA.i = prende(i, 0, lista.length - 1); FESTA.t = 0;
    const c = lista[FESTA.i], el = dlg.querySelector(".fsCena");
    el.className = `fsCena fs-${c.id}`; el._gol = undefined;
    el.innerHTML = c.html();
    if (quieto()) for (const b of el.querySelectorAll("[data-conta]")) b.textContent = b.dataset.conta;
    const ultima = FESTA.i === lista.length - 1;
    dlg.querySelector(".fsPular").classList.toggle("hidden", ultima);
    dlg.querySelector(".fsBaixar").classList.toggle("hidden", !ultima);
    dlg.querySelector(".fsRever").classList.toggle("hidden", !ultima || quieto());
    const ficha = dlg.querySelector(".fsFicha"); ficha.classList.toggle("hidden", !ultima); ficha.innerHTML = ultima ? fichaHTML(FESTA.F) : "";
    if (c.tocar) c.tocar();
    atualizarBarra();
    if (quieto()) desenharAgora();
    else if (!FESTA.raf) { FESTA.ult = performance.now(); FESTA.raf = requestAnimationFrame(quadro); }
  }
  // embaixo da foto: a final, a campanha e os jogadores campeões (rosto, nome e gols de cada um)
  function placarTxt(fin) { return `${fin.A.nome} ${fin.gA} x ${fin.gB} ${fin.B.nome}` + (fin.pens ? ` (${fin.pens.a} x ${fin.pens.b} pên.)` : fin.extra ? " (prorr.)" : ""); }
  function fichaHTML(F) {
    const s = F.sum, c = s.campanha || {}, fin = F.final;
    const linha = [fin ? `${esc(fin.titulo && fin.titulo !== "Final" ? fin.titulo : "Final")}: <b>${esc(placarTxt(fin))}</b>` : "", `${plural(c.gp || 0, "gol feito", "gols feitos")}`, `${plural(c.gc || 0, "gol sofrido", "gols sofridos")}`, `${c.v || 0}V ${c.e || 0}E ${c.d || 0}D`].filter(Boolean).join(" · ");
    const jog = (p) => `<span class="fsJog ${p.titular ? "" : "reserva"}"><img class="fsRosto" src="${Rostos.de(p.nome)}" alt=""><b>${esc(p.nome)}</b>${p.gols ? `<i>${ic("bola")}${p.gols}</i>` : ""}</span>`;
    return `<p class="fsLinha">${linha}</p><div class="fsElenco" aria-label="Os jogadores campeões">${F.elenco.map(jog).join("")}</div>`;
  }
  function atualizarBarra() {
    const { dlg, cenas: lista, i, t } = FESTA;
    dlg.querySelectorAll(".fsSeg").forEach((b, k) => {
      const f = k < i ? 1 : k > i ? 0 : Number.isFinite(lista[k].dur) ? prende(t / lista[k].dur) : 1;
      b.firstElementChild.style.width = `${Math.round(f * 100)}%`; b.classList.toggle("on", k === i);
    });
  }
  function desenharAgora() { const c = FESTA.cenas[FESTA.i]; if (c) c.desenhar(FESTA.g, quieto() ? 1200 : FESTA.t); }
  // a cada quadro: o tempo da cena anda (no máximo 250 ms por quadro: com a aba escondida o navegador para os quadros,
  // e na volta o vídeo continua de onde estava, sem pular cenas; num aparelho lento, ele ainda anda no tempo certo)
  function quadro(agora) {
    if (!FESTA.dlg) return;
    const dt = Math.min(250, agora - FESTA.ult); FESTA.ult = agora; FESTA.t += dt;
    const c = FESTA.cenas[FESTA.i], el = FESTA.dlg.querySelector(".fsCena");
    if (FESTA.t >= c.dur) { irPara(FESTA.i + 1); return void (FESTA.raf = requestAnimationFrame(quadro)); }
    if (c.passo) c.passo(el, FESTA.t);
    // os números contando (gols, vitórias...), no primeiro segundo e meio da cena
    for (const b of el.querySelectorAll("[data-conta]")) {
      const alvo = +b.dataset.conta; if (!Number.isFinite(alvo) || b.dataset.conta === "") continue;
      const v = Math.round(alvo * suave(fase(FESTA.t, 250, 1500)));
      if (b.textContent !== String(v)) { b.textContent = v; if (v) Som.conta(); }
    }
    c.desenhar(FESTA.g, FESTA.t);
    atualizarBarra();
    FESTA.raf = requestAnimationFrame(quadro);
  }
  function parar() { cancelAnimationFrame(FESTA.raf); FESTA.raf = 0; }
  function fechar(fecharDialog = true) {
    parar();
    const dlg = FESTA.dlg; FESTA.dlg = null;
    if (dlg) { if (fecharDialog && dlg.open) dlg.close(); dlg.remove(); }
  }

  // ======================================================================
  // A foto para baixar (1080 de largura, pelo menos 1350 de altura: cresce para caber o elenco inteiro): a faixa, o
  // telão da foto ampliado, a final, a campanha e os jogadores campeões
  // ======================================================================
  async function baixarFoto(F) {
    const s = F.sum, fin = F.final, Wd = 1080, esc = 6.25, fy = 330, LIN = 48;
    const golsFinal = fin ? (fin.gols || []).filter((x) => x.lado === F.lado).map((x) => `${x.nome} ${x.min}'`).join(" · ") : "";
    const y0 = fy + H * esc + 70, yE = y0 + (fin ? 46 + (golsFinal ? 40 : 0) : 0) + 112;
    const Hd = Math.max(1350, Math.round(yE + Math.ceil(F.elenco.length / 2) * LIN + 50));
    const cv = document.createElement("canvas"); cv.width = Wd; cv.height = Hd;
    const g = cv.getContext("2d"), D = '"Saira Condensed", "Arial Narrow", sans-serif', B = "Figtree, system-ui, sans-serif";
    try { await Promise.all([document.fonts.load(`800 40px "Saira Condensed"`), document.fonts.load(`600 20px Figtree`)]); } catch {}
    const fundoG = g.createLinearGradient(0, 0, 0, Hd); fundoG.addColorStop(0, "#0c1813"); fundoG.addColorStop(1, "#050a08");
    g.fillStyle = fundoG; g.fillRect(0, 0, Wd, Hd);
    const brilho = g.createRadialGradient(Wd / 2, 160, 20, Wd / 2, 160, 560); brilho.addColorStop(0, "rgba(246,198,78,.25)"); brilho.addColorStop(1, "rgba(246,198,78,0)");
    g.fillStyle = brilho; g.fillRect(0, 0, Wd, 760);
    const texto = (t, x, y, tam, peso, fam, corT, max = Wd - 100) => { let s2 = tam; do { g.font = `${peso} ${s2}px ${fam}`; if (g.measureText(t).width <= max) break; s2 -= 2; } while (s2 > 12); g.fillStyle = corT; g.fillText(t, x, y); };
    g.textAlign = "center";
    texto(String(s.torneio || "Leilão da Galera").toUpperCase(), Wd / 2, 74, 28, 600, B, "#8ba597");
    texto("CAMPEÕES", Wd / 2, 178, 120, 800, D, "#f6c64e");
    texto(String(s.campeao).toUpperCase(), Wd / 2, 250, 64, 800, D, "#eef6f0");
    if (s.dono && s.dono !== s.campeao) texto(`o time de ${s.dono}`, Wd / 2, 296, 30, 600, B, "#8ba597");
    // o telão da foto, ampliado sem borrar, com uma moldura
    const tela = document.createElement("canvas"); tela.width = W; tela.height = H;
    const tg = tela.getContext("2d"); tg.imageSmoothingEnabled = false; fotoElenco(tg, F, 0, true);
    const fx = (Wd - W * esc) / 2;
    g.fillStyle = "#c6ff3a"; g.fillRect(fx - 8, fy - 8, W * esc + 16, H * esc + 16);
    g.imageSmoothingEnabled = false; g.drawImage(tela, fx, fy, W * esc, H * esc);
    // a ficha: o placar da final, os gols e a campanha
    let y = y0;
    if (fin) {
      const pl = `${fin.A.nome} ${fin.gA} x ${fin.gB} ${fin.B.nome}` + (fin.pens ? ` (${fin.pens.a} x ${fin.pens.b} pên.)` : fin.extra ? " (prorr.)" : "");
      texto(fin.titulo && fin.titulo !== "Final" ? `${fin.titulo}: ${pl}` : `Final: ${pl}`, Wd / 2, y, 40, 800, D, "#c6ff3a"); y += 46;
      if (golsFinal) { texto(`Gols: ${golsFinal}`, Wd / 2, y, 24, 600, B, "#eef6f0"); y += 40; }
    }
    const c = s.campanha || {};
    texto(`${plural(c.gp || 0, "gol feito", "gols feitos")} · ${plural(c.gc || 0, "gol sofrido", "gols sofridos")} · ${c.v || 0}V ${c.e || 0}E ${c.d || 0}D`, Wd / 2, y + 8, 30, 700, B, "#eef6f0");
    if (F.artilharia[0]) texto(`Artilheiro do time: ${F.artilharia[0].nome} (${plural(F.artilharia[0].gols, "gol", "gols")})`, Wd / 2, y + 54, 26, 600, B, "#8ba597");
    // os jogadores campeões, em duas colunas, com o rosto de pixel e os gols
    const rostos = await Promise.all(F.elenco.map((p) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = Rostos.de(p.nome); })));
    const colW = 460;
    g.textAlign = "left";
    F.elenco.forEach((p, i) => {
      const col = i % 2, x = Wd / 2 - colW - 10 + col * (colW + 20), yy = yE + Math.floor(i / 2) * LIN;
      if (rostos[i]) g.drawImage(rostos[i], x, yy - 30, 36, 36);
      texto(p.nome + (p.titular ? "" : " (reserva)"), x + 48, yy, 26, 700, B, p.titular ? "#eef6f0" : "#8ba597", colW - 120);
      if (p.gols) { g.textAlign = "right"; texto(plural(p.gols, "gol", "gols"), x + colW, yy, 24, 800, D, "#c6ff3a"); g.textAlign = "left"; }
    });
    g.textAlign = "center";
    texto(`LEILÃO DA GALERA · ${new Date(s.data || Date.now()).toLocaleDateString("pt-BR")}`, Wd / 2, Hd - 30, 22, 600, B, "#587064");
    try { const r = await ChampionCard.baixar(cv, "campeoes-" + String(s.campeao)); if (r === "downloaded") toast("Foto baixada!"); }
    catch (e) { console.error(e); toast("Não consegui gerar a foto."); }
  }

  window.abrirFesta = abrirFesta;
  window.reverFesta = () => { const sum = S && S.reveal && S.reveal.summary; if (sum) abrirFesta(sum, true); };
  if (location.hash === "#debug") window.__festa = { FESTA, irPara, dados, cenas, fechar, baixarFoto };
})();
