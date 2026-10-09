// Carreira: a festa do campeão. Quando uma competição acaba (liga ou copa), abre para todos da sala (ou para quem joga sozinho)
// um pop-up que passa como um vídeo curto, em cenas, adaptado da festa do Leilão (public/leilao/campeao.js):
//   1. Fim de jogo (copas: o placar da final) ou fim de campeonato (ligas: os pontos);  2. os gols da final (copas);
//   3. a campanha;  4. os artilheiros do campeão;  5. a foto do elenco com a taça e a faixa CAMPEÕES (dá para baixar).
// O telão é um canvas de 160x90 em pixel-art (bonecos e comemorações de lances.js, cabeças de rostos.js); os textos ficam em
// HTML por cima. Os dados vêm do servidor em E.competicoes[id].festa (só existe com a competição encerrada e visível).
// Várias competições podem acabar na mesma rodada: uma festa só, com as outras em fichinhas lado a lado (nunca em fila).
// Abre uma vez por competição (guardado no navegador); "Rever a festa" na Tabela abre de novo. Com "menos movimento" no
// sistema, vai direto para a foto, parada.
(function () {
  const K = Lances.kit, W = 160, H = 90;
  const quieto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prende = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const fase = (t, a, b) => prende((t - a) / (b - a));
  const suave = (f) => f * f * (3 - 2 * f);
  const sorteio = (txt) => { let s = 2166136261; for (const c of String(txt)) s = Math.imul(s ^ c.charCodeAt(0), 16777619); return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296; };
  const cor = (g, c, a = 1) => { g.fillStyle = c; g.globalAlpha = a; };
  const EM_V = { bE: [-150, -160], bD: [150, 160] };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const nomeDe = (pid) => (JOGADORES[pid] || {}).nome || "Jogador";

  // ---------- os sons (sintetizados): o apito, a torcida e a fanfarra; o botão liga e desliga ----------
  const Som = (() => {
    let ac = null, master = null;
    const ligado = () => store.get("carreira:somFesta") !== false;
    const ctx = () => {
      if (!ligado()) return null;
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination); } catch { return null; } }
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
    function ruido(dur, ganho, freq, atraso = 0) {
      const c = ctx(); if (!c) return;
      const n = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) { const f = i / d.length; d[i] = (Math.random() * 2 - 1) * Math.min(1, f * 8) * (1 - f); }
      const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + atraso;
      s.buffer = n; fl.type = "bandpass"; fl.frequency.value = freq; fl.Q.value = 0.7; g.gain.value = ganho;
      s.connect(fl).connect(g).connect(master); s.start(t);
    }
    return {
      ligado, liberar: ctx,
      alternar() { store.set("carreira:somFesta", !ligado()); if (!ligado() && ac) ac.suspend().catch(() => {}); else ctx(); },
      apito() { tom(2350, 2300, 0.16, 0.14, "square"); tom(2350, 2300, 0.16, 0.14, "square", 0.24); tom(2350, 2250, 0.7, 0.14, "square", 0.48); },
      torcida(f = 1) { ruido(2.4, 0.5 * f, 900); ruido(1.8, 0.28 * f, 1700, 0.15); },
      gol() { tom(110, 55, 0.18, 0.45, "triangle"); ruido(0.25, 0.35, 600); this.torcida(0.7); },
      conta() { tom(900, 1200, 0.05, 0.04, "square"); },
      foto() { ruido(0.07, 0.55, 3000); ruido(0.09, 0.45, 1800, 0.11); },
      fanfarra() { [523, 659, 784, 1047].forEach((f, i) => tom(f, f, i === 3 ? 0.8 : 0.22, 0.11, "triangle", i * 0.16)); },
    };
  })();

  // ---------- os dados de uma festa (do servidor) ----------
  function dados(f) {
    const camp = f.campeao, vice = f.vice, u = uniformeDoClube(camp, vice), uVice = uniformeDoClube(vice, camp), luva = { ...u, luva: "#f4f4f4" };
    const gols = Object.fromEntries((f.artilheiros || []).map((a) => [a.id, a.gols]));
    // o time do campeão: o melhor goleiro e os 10 melhores de linha de titulares, mais os reservas (até 8 na foto)
    // a festa guardada de uma temporada passada leva os 20 melhores daquele elenco (f.elenco); a de agora usa o elenco atual
    const todos = (f.elenco ? f.elenco.map((id) => JOGADORES[id]).filter(Boolean) : elencoDe(camp)).slice().sort((a, b) => notaDe(b) - notaDe(a));
    const goleiros = todos.filter((j) => Motor.grupoDe(j.pos) === "GK"), linha = todos.filter((j) => Motor.grupoDe(j.pos) !== "GK");
    const titulares = [...goleiros.slice(0, 1), ...linha.slice(0, 10)], resto = [...goleiros.slice(1, 2), ...linha.slice(10)];
    const vaga = (j) => (Motor.grupoDe(j.pos) === "GK" ? "GK" : "");
    const elenco = [...titulares.map((j) => ({ id: j.id, nome: j.nome, vaga: vaga(j), titular: true })),
      ...resto.slice(0, 8).map((j) => ({ id: j.id, nome: j.nome, vaga: vaga(j), titular: false }))].map((p) => ({ ...p, gols: gols[p.id] || 0 }));
    const figura = (p) => K.figura(p.nome, p.vaga === "GK" ? luva : u, p.vaga === "GK" ? { goleiro: true } : {});
    const artilharia = (f.artilheiros || []).map((a) => ({ id: a.id, nome: nomeDe(a.id), gols: a.gols }));
    return { f, camp, vice, u, uVice, elenco, figura, artilharia, semente: `${f.nome}:${f.ano}:${camp}`, copa: f.tipo === "copa" && !!f.final, eu: camp === E.clube };
  }

  // ---------- o desenho do telão (pixel-art 160x90) ----------
  const fundos = new Map();
  function fundo(F, u, chave) {
    const k = F.semente + "|" + chave;
    if (!fundos.has(k)) fundos.set(k, K.fundoClose({ semente: F.semente + chave, futsal: false, art: { u } }));
    return fundos.get(k);
  }
  let SOLO = null;
  function comemoracao(nome, semente) {
    if (!SOLO) SOLO = Object.keys(Lances.COMEMORA).filter((k) => { try { const c = Lances.COMEMORA[k](600); return c && c.p && !c.extras; } catch { return false; } });
    const propria = Lances.ASSINATURA[nome], s = sorteio(semente + nome)();
    if (propria && SOLO.includes(propria) && s < 0.6) return propria;
    return SOLO[Math.floor(s * SOLO.length)] || "soco";
  }
  function papelPicado(g, F, t, n = 30) {
    const cores = [F.u.cam, F.u.det, "#ffffff", "#f6c64e", "#e8be4f"], s = sorteio(F.semente + "papel");
    for (let k = 0; k < n; k++) {
      const x0 = s() * W, v = 14 + s() * 22, fz = s() * 6, y = ((s() * H + (t / 1000) * v) % (H + 8)) - 4;
      cor(g, cores[k % cores.length]); g.fillRect(Math.round(x0 + Math.sin(t / 260 + fz) * 3), Math.round(y), Math.floor(t / 140 + k) % 2 ? 2 : 1, 1);
    }
    g.globalAlpha = 1;
  }
  function taca(g, x, y, esc = 1, brilho = 0) {
    const px = (c, a, b, w, h) => { cor(g, c); g.fillRect(Math.round(x + a * esc), Math.round(y + b * esc), w * esc, h * esc); };
    px("#6b4a12", -6, -3, 12, 3); px("#8a5f17", -5, -4, 10, 1);
    px("#c8901f", -2, -9, 4, 5); px("#e0a92b", -1, -9, 2, 5);
    px("#f6c64e", -7, -20, 14, 8); px("#ffd96b", -5, -19, 4, 6);
    px("#e0a92b", -6, -12, 12, 3); px("#f6c64e", -4, -12, 8, 2);
    px("#c8901f", -10, -19, 3, 2); px("#c8901f", -10, -17, 2, 4); px("#c8901f", -9, -14, 3, 2);
    px("#c8901f", 7, -19, 3, 2); px("#c8901f", 8, -17, 2, 4); px("#c8901f", 6, -14, 3, 2);
    px("#fff3c4", -4, -18, 1, 3);
    if (brilho) { cor(g, "#fffbe0", brilho); g.fillRect(Math.round(x - 1), Math.round(y - 25 * esc), 2, 3 * esc); g.fillRect(Math.round(x - 3 * esc), Math.round(y - 24 * esc), 6 * esc, 1); g.globalAlpha = 1; }
    g.globalAlpha = 1;
  }
  function fotoElenco(g, F, t, parado) {
    g.drawImage(fundo(F, F.u, "foto"), 0, 0);
    let atras = F.elenco.filter((p) => p.titular), frente = F.elenco.filter((p) => !p.titular).slice(0, 8);
    if (!frente.length && atras.length > 6) { frente = atras.slice(6); atras = atras.slice(0, 6); }
    if (atras.length > 7) { frente = [...atras.slice(7), ...frente].slice(0, 8); atras = atras.slice(0, 7); }
    const goleiro = atras.findIndex((p) => p.vaga === "GK"), meio = Math.floor((atras.length - 1) / 2);
    if (goleiro >= 0) atras.splice(meio, 0, atras.splice(goleiro, 1)[0]);
    const passoA = atras.length > 5 ? 20 : 24, xa = atras.map((_, k) => 80 + (k - (atras.length - 1) / 2) * passoA);
    const passoF = frente.length > 6 ? 17 : 21, esq = Math.ceil(frente.length / 2);
    const xf = frente.map((_, k) => (k < esq ? 80 - 20 - (esq - 1 - k) * passoF : 80 + 20 + (k - esq) * passoF));
    atras.forEach((p, i) => {
      const pula = parado ? 0 : Math.max(0, Math.sin(t / 230 + i * 1.3)) * 2;
      K.sombra(g, xa[i], 66, pula, 1);
      K.poe(g, F.figura(p), { ...K.P0, ...EM_V, pes: "fora", sobe: pula, ol: 0 }, xa[i], 66, 1);
    });
    taca(g, 80, 86, 1, parado ? 0.8 : 0.4 + 0.4 * Math.sin(t / 200));
    frente.forEach((p, i) => K.poe(g, F.figura(p), { ...K.P0, ag: 5, pE: [-10, -95], pD: [10, 95], bE: [-60, -30], bD: [60, 30], pes: "fora" }, xf[i], 88, 1));
    if (!parado) papelPicado(g, F, t, 34);
  }

  // ---------- as cenas ----------
  function cenas(F) {
    const f = F.f, fin = f.final, lista = [], nomeA = fin ? nomeClube(fin.casa) : nomeClube(f.campeao), nomeB = fin ? nomeClube(fin.fora) : nomeClube(f.vice);
    const campeaoLado = fin ? (fin.casa === f.campeao ? 0 : 1) : 0, doCampeao = (lado) => lado === campeaoLado;
    const uDe = (lado) => (doCampeao(lado) ? F.u : F.uVice);
    // 1. fim de jogo (copa) ou fim de campeonato (liga)
    lista.push({ id: "fim", titulo: F.copa ? "Fim de jogo" : "Fim de campeonato", dur: 4200,
      desenhar(g, t) {
        g.drawImage(fundo(F, F.u, "fim"), 0, 0);
        const xs = [32, 56, 80, 104, 128], tit = F.elenco.filter((p) => p.titular).slice(0, 5);
        tit.forEach((p, i) => {
          const c = Lances.COMEMORA[comemoracao(p.nome, F.semente + i)](t + i * 170);
          K.sombra(g, xs[i], 86, (c.p && c.p.sobe) || 0, 1);
          K.poe(g, F.figura(p), c.p, xs[i] + (c.dx || 0) * 0.4, 86, 1, c.rot || 0, c.vira, c.deitado || 0);
        });
        papelPicado(g, F, t);
        if (t < 160) { cor(g, "#ffffff", 0.5 * (1 - t / 160)); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      },
      html() {
        const lado = (id, ganhou) => `<div class="fsTime ${ganhou ? "ganhou" : ""}">${ganhou ? ic("taca") : ""}<span>${h(nomeClube(id))}</span></div>`;
        if (!F.copa) {
          const dif = (f.pontos || 0) - (f.pontosVice || 0);
          return `<div class="fsTopo"><span class="fsCarimbo">${ic("apito")}Fim de campeonato</span><span class="fsSub">${h(f.nome)}</span></div>
            <div class="fsPlacar">${lado(f.campeao, true)}<div class="fsGols"><b data-conta="${f.pontos}">0</b><i>pts</i><b data-conta="${f.pontosVice}">0</b></div>${lado(f.vice, false)}</div>
            <div class="fsRodape"><span class="fsTag">${dif > 0 ? `${plural(dif, "ponto", "pontos")} na frente do vice` : "ganhou no critério de desempate"}</span></div>`;
        }
        const pens = fin.penaltis ? `<div class="fsPens">${fin.penaltis[0]} x ${fin.penaltis[1]} nos pênaltis</div>` : "";
        return `<div class="fsTopo"><span class="fsCarimbo">${ic("apito")}Fim de jogo</span><span class="fsSub">${h(f.nome)} · a grande final</span></div>
          <div class="fsPlacar">${lado(fin.casa, doCampeao(0))}<div class="fsGols"><b data-conta="${fin.placar[0]}">0</b><i>x</i><b data-conta="${fin.placar[1]}">0</b></div>${lado(fin.fora, doCampeao(1))}</div>
          <div class="fsRodape">${pens}</div>`;
      },
      tocar() { Som.apito(); setTimeout(() => Som.torcida(1.2), 900); },
    });
    // 2. os gols da final, um por um
    const gols = fin ? fin.gols || [] : [], porGol = gols.length > 6 ? 1900 : 2600;
    if (gols.length) {
      let a = 0, b = 0;
      const placares = gols.map((x) => (x.lado === 0 ? ++a : ++b, [a, b]));
      lista.push({ id: "gols", titulo: "Os gols da final", dur: gols.length * porGol,
        desenhar(g, t) {
          const i = Math.min(gols.length - 1, Math.floor(t / porGol)), x = gols[i], tc = t - i * porGol, nome = nomeDe(x.jogador), u = uDe(x.lado);
          g.drawImage(fundo(F, u, "gol" + x.lado), 0, 0);
          const c = Lances.COMEMORA[comemoracao(nome, F.semente + i)](tc), esc2 = c.zoom || 2, chao = c.chao || 85, px = 80 + (c.dx || 0) * 2;
          if (!c.deitado) K.sombra(g, px, chao, (c.p && c.p.sobe) || 0, esc2);
          K.poe(g, K.figura(nome, u, {}), c.p, px, chao, esc2, c.rot || 0, c.vira, c.deitado || 0);
          if (doCampeao(x.lado)) papelPicado(g, { ...F, u }, tc, 22);
          if (tc < 140) { cor(g, "#ffffff", 0.45 * (1 - tc / 140)); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
        },
        html() { return `<div class="fsTopo"><span class="fsCarimbo">${ic("bola")}Os gols da final</span><span class="fsSub">${h(nomeA)} <b class="fsMini" data-placar>0 x 0</b> ${h(nomeB)}</span></div><div class="fsGolBox"></div>`; },
        passo(el, t) {
          const i = Math.min(gols.length - 1, Math.floor(t / porGol));
          if (el._gol === i) return;
          el._gol = i; const x = gols[i], [pa, pb] = placares[i], nome = nomeDe(x.jogador);
          el.querySelector("[data-placar]").textContent = `${pa} x ${pb}`;
          el.querySelector(".fsGolBox").innerHTML = `<div class="fsGol ${doCampeao(x.lado) ? "nosso" : "deles"}"><span class="fsMin">${x.min}'${x.acr ? `+${x.acr}` : ""}</span><img class="fsRosto" src="${Rostos.de(nome)}" alt=""><span class="fsQuem"><b>${h(nome)}</b><small>${h(nomeClube(x.lado === 0 ? fin.casa : fin.fora))}</small></span><span class="fsBola">${ic("bola")}</span></div>`;
          Som.gol();
        },
      });
    }
    // 3. a campanha
    const c = f.campanha, saldo = c.gp - c.gc;
    lista.push({ id: "campanha", titulo: "A campanha", dur: 4600,
      desenhar(g, t) {
        g.drawImage(fundo(F, F.u, "volta"), 0, 0);
        F.elenco.slice(0, 7).forEach((p, i) => {
          const x = ((t / 1000) * 34 - i * 22) % (W + 60) - 20, pose = K.corre(t + i * 90, "alto", 240);
          K.sombra(g, x, 84, pose.sobe || 0, 1); K.poe(g, F.figura(p), pose, x, 84, 1);
        });
        papelPicado(g, F, t, 20);
      },
      html() {
        const tile = (n, nome, cls = "") => `<div class="fsNum ${cls}"><b data-conta="${n}">0</b><span>${nome}</span></div>`;
        return `<div class="fsTopo"><span class="fsCarimbo">${ic("grafico")}A campanha</span><span class="fsSub">${plural(c.jogos, "jogo", "jogos")} · ${h(nomeClube(f.campeao))}</span></div>
          <div class="fsNums">${tile(c.gp, "gols feitos", "bom")}${tile(c.gc, "gols sofridos", "ruim")}${tile(c.v, c.v === 1 ? "vitória" : "vitórias")}${tile(c.e, c.e === 1 ? "empate" : "empates")}${tile(c.d, c.d === 1 ? "derrota" : "derrotas")}</div>
          <div class="fsRodape"><span class="fsTag">saldo ${saldo > 0 ? "+" : ""}${saldo}</span></div>`;
      },
      tocar() { Som.torcida(0.7); },
    });
    // 4. os artilheiros do campeão
    if (F.artilharia.length) {
      const top = F.artilharia.slice(0, 5), max = top[0].gols;
      lista.push({ id: "artilharia", titulo: "Quem fez os gols", dur: 4200,
        desenhar(g, t) {
          const p = top[0];
          g.drawImage(fundo(F, F.u, "art"), 0, 0);
          const cm = Lances.COMEMORA[comemoracao(p.nome, F.semente + "art")](t);
          if (!cm.deitado) K.sombra(g, 118, 85, (cm.p && cm.p.sobe) || 0, 2);
          K.poe(g, K.figura(p.nome, F.u, {}), cm.p, 118 + (cm.dx || 0), 85, 2, cm.rot || 0, cm.vira, cm.deitado || 0);
        },
        html() {
          const linha = (p, i) => `<div class="fsArt" style="--i:${i};--w:${Math.max(8, (p.gols / max) * 100)}%"><img class="fsRosto" src="${Rostos.de(p.nome)}" alt=""><span class="fsNome">${h(p.nome)}</span><span class="fsBarra"><i></i></span><b>${p.gols}</b></div>`;
          return `<div class="fsTopo"><span class="fsCarimbo">${ic("chuteira")}Quem fez os gols</span><span class="fsSub">${h(nomeClube(f.campeao))} na temporada</span></div><div class="fsArts">${top.map(linha).join("")}</div><div class="fsRodape"></div>`;
        },
      });
    }
    // 5. a foto do elenco
    lista.push({ id: "foto", titulo: "Campeões", dur: Infinity,
      desenhar(g, t) { fotoElenco(g, F, t, quieto()); if (t < 220 && !quieto()) { cor(g, "#ffffff", 1 - t / 220); g.fillRect(0, 0, W, H); g.globalAlpha = 1; } },
      html() {
        return `<div class="fsFaixa"><b>Campeões</b><span>${h(nomeClube(f.campeao))}</span></div>
          <div class="fsLegenda">${F.eu ? `<b class="fsVoce">${ic("coroa")}O título é seu!</b>` : ""}<span>${h(f.nome)} ${f.ano || ""}</span></div>`;
      },
      tocar() {
        Som.foto(); setTimeout(() => Som.fanfarra(), 250); setTimeout(() => Som.torcida(1.3), 400);
        if (!quieto()) Comum.confetti(["#e8be4f", "#f6c64e", "#ffffff", F.u.cam, F.u.det], { onde: FESTA.dlg });
      },
    });
    return lista;
  }

  // ---------- o pop-up ----------
  const FESTA = { dlg: null, F: null, cenas: [], i: -1, t: 0, ult: 0, raf: 0, lista: [], atual: 0, g: null };
  const chaveDe = (id) => `${EM_GRUPO && SALA ? SALA.code : "solo"}:${E.clube}:${E.ano}:${E.temporada}:${id}`;
  const vistas = () => store.get("carreira:festas") || [];
  const marcarVista = (chave) => { const v = vistas(); if (!v.includes(chave)) store.set("carreira:festas", [...v, chave].slice(-120)); };
  // a ordem: o título do seu clube, depois a sua liga, depois as finais que ele jogou, depois a importância
  const IMPORTANCIA = ["champions", "libertadores", "supermundial", "mundial", "copadobrasil", "sulamericana"];
  function ordem(id, f) {
    const meu = f.campeao === E.clube ? 0 : 1, liga = id === (typeof ligaDoClube === "function" ? ligaDoClube(E.clube) : "") ? 0 : 1;
    const jogou = f.final && (f.final.casa === E.clube || f.final.fora === E.clube) ? 0 : 1, imp = IMPORTANCIA.indexOf(id);
    return [meu, liga, jogou, imp < 0 ? 9 : imp];
  }
  const cmp = (a, b) => { for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] - b[k]; return 0; };
  // chamada a cada estado novo: abre a festa das competições que acabaram e ainda não foram vistas
  function verificar() {
    if (!E || !E.competicoes || FESTA.dlg || !window.Lances || !window.Rostos) return;
    if (typeof telaAtual !== "undefined" && (telaAtual === "partida" || !telaAtual || telaAtual === "inicio")) return;
    if (document.querySelector("dialog[open]")) return; // espera a partida, a decisão ou o pós-jogo fecharem
    const novas = Object.entries(E.competicoes).filter(([id, c]) => c.festa && !vistas().includes(chaveDe(id))).sort((a, b) => cmp(ordem(a[0], a[1].festa), ordem(b[0], b[1].festa)));
    if (!novas.length) return;
    abrir(novas.map(([id, c]) => ({ id, f: c.festa })));
  }
  // lista: [{ id, f }]; a primeira é a festa principal, as outras viram fichinhas para trocar sem fila
  function abrir(lista, atual = 0) {
    fechar(false);
    const dlg = document.createElement("dialog");
    dlg.className = "festa"; dlg.id = "festa";
    dlg.innerHTML = `<div class="fsChips"></div>
      <div class="fsTela"><canvas width="${W}" height="${H}" aria-hidden="true"></canvas><div class="fsCena" aria-live="polite"></div></div>
      <div class="fsFicha hidden"></div>
      <div class="fsBarraCenas"></div>
      <div class="fsBotoes">
        <button class="discreto fsSom" type="button"></button>
        <button class="fsPular" type="button">${ic("play")}Pular para a foto</button>
        <button class="primario fsBaixar hidden" type="button">${ic("imagem")}Baixar a foto</button>
        <button class="fsRever hidden" type="button">${ic("play")}Ver de novo</button>
        <button class="discreto fsFechar" type="button">${ic("fechar")}Fechar</button>
      </div>`;
    document.body.appendChild(dlg);
    Object.assign(FESTA, { dlg, lista, atual, g: null });
    const g = dlg.querySelector("canvas").getContext("2d"); g.imageSmoothingEnabled = false; FESTA.g = g;
    const som = () => { dlg.querySelector(".fsSom").innerHTML = `${ic("som")}<span>${Som.ligado() ? "Som" : "Sem som"}</span>`; };
    som();
    dlg.querySelector(".fsSom").onclick = () => { Som.alternar(); som(); };
    dlg.querySelector(".fsPular").onclick = () => irPara(FESTA.cenas.length - 1);
    dlg.querySelector(".fsRever").onclick = () => irPara(0);
    dlg.querySelector(".fsBaixar").onclick = () => baixarFoto(FESTA.F);
    dlg.querySelector(".fsFechar").onclick = () => fechar();
    dlg.addEventListener("click", (e) => { if (e.target === dlg) fechar(); });
    dlg.addEventListener("cancel", () => fechar(false));
    dlg.addEventListener("pointerdown", () => Som.liberar(), { once: true });
    dlg.showModal();
    FESTA.ult = performance.now();
    mostrar(atual);
  }
  // troca a festa mostrada (as fichinhas): a mesma tela, sem fila
  function mostrar(k) {
    const dlg = FESTA.dlg; if (!dlg) return;
    FESTA.atual = k; const { id, f } = FESTA.lista[k];
    if (!FESTA.lista[k].sem) marcarVista(chaveDe(id));
    const F = FESTA.F = dados(f), lista = FESTA.cenas = cenas(F);
    dlg.setAttribute("aria-label", `Festa do campeão: ${nomeClube(f.campeao)}`);
    dlg.style.cssText = coresClube(f.campeao);
    dlg.querySelector(".fsChips").innerHTML = FESTA.lista.length > 1 ? FESTA.lista.map((x, n) => `<button class="fsChip ${n === k ? "on" : ""}" data-k="${n}" type="button">${escudo(x.f.campeao, 1)}<span>${h(x.f.nome)}</span></button>`).join("") : "";
    dlg.querySelectorAll(".fsChip").forEach((b) => (b.onclick = () => mostrar(+b.dataset.k)));
    dlg.querySelector(".fsBarraCenas").innerHTML = lista.map((c, i) => `<button class="fsSeg" data-i="${i}" title="${h(c.titulo)}" aria-label="${h(c.titulo)}"><i></i></button>`).join("");
    dlg.querySelectorAll(".fsSeg").forEach((b) => (b.onclick = () => irPara(+b.dataset.i)));
    irPara(quieto() ? lista.length - 1 : 0);
    if (!quieto() && !FESTA.raf) { FESTA.ult = performance.now(); FESTA.raf = requestAnimationFrame(quadro); }
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
  }
  function placarTxt(f) { const fin = f.final; return `${nomeClube(fin.casa)} ${fin.placar[0]} x ${fin.placar[1]} ${nomeClube(fin.fora)}` + (fin.penaltis ? ` (${fin.penaltis[0]} x ${fin.penaltis[1]} pên.)` : ""); }
  function fichaHTML(F) {
    const f = F.f, c = f.campanha;
    const linha = [f.final ? `Final: <b>${h(placarTxt(f))}</b>` : f.pontos != null ? `<b>${f.pontos} pontos</b> (vice: ${f.pontosVice})` : "", plural(c.gp, "gol feito", "gols feitos"), plural(c.gc, "gol sofrido", "gols sofridos"), `${c.v}V ${c.e}E ${c.d}D`].filter(Boolean).join(" · ");
    const jog = (p) => `<span class="fsJog ${p.titular ? "" : "reserva"}"><img class="fsRosto" src="${Rostos.de(p.nome)}" alt=""><b>${h(p.nome)}</b>${p.gols ? `<i>${ic("bola")}${p.gols}</i>` : ""}</span>`;
    return `<p class="fsLinha">${linha}</p><div class="fsElenco" aria-label="Os jogadores campeões">${F.elenco.map(jog).join("")}</div>`;
  }
  function atualizarBarra() {
    const { dlg, cenas: lista, i, t } = FESTA; if (!dlg) return;
    dlg.querySelectorAll(".fsSeg").forEach((b, k) => {
      const f = k < i ? 1 : k > i ? 0 : Number.isFinite(lista[k].dur) ? prende(t / lista[k].dur) : 1;
      b.firstElementChild.style.width = `${Math.round(f * 100)}%`; b.classList.toggle("on", k === i);
    });
  }
  function desenharAgora() { const c = FESTA.cenas[FESTA.i]; if (c && FESTA.g) c.desenhar(FESTA.g, quieto() ? 1200 : FESTA.t); }
  // o tempo da cena anda no máximo 250 ms por quadro: com a aba escondida o vídeo continua de onde parou, sem pular cenas
  function quadro(agora) {
    if (!FESTA.dlg) return;
    const dt = Math.min(250, agora - FESTA.ult); FESTA.ult = agora; FESTA.t += dt;
    const c = FESTA.cenas[FESTA.i], el = FESTA.dlg.querySelector(".fsCena");
    if (FESTA.t >= c.dur) { irPara(FESTA.i + 1); return void (FESTA.raf = requestAnimationFrame(quadro)); }
    if (c.passo) c.passo(el, FESTA.t);
    for (const b of el.querySelectorAll("[data-conta]")) {
      const alvo = +b.dataset.conta; if (!Number.isFinite(alvo) || b.dataset.conta === "") continue;
      const v = Math.round(alvo * suave(fase(FESTA.t, 250, 1500)));
      if (b.textContent !== String(v)) { b.textContent = v; if (v) Som.conta(); }
    }
    c.desenhar(FESTA.g, FESTA.t);
    atualizarBarra();
    FESTA.raf = requestAnimationFrame(quadro);
  }
  function fechar(fecharDialog = true) {
    cancelAnimationFrame(FESTA.raf); FESTA.raf = 0;
    const dlg = FESTA.dlg; FESTA.dlg = null;
    if (dlg) { if (fecharDialog && dlg.open) dlg.close(); dlg.remove(); }
    if (fecharDialog) setTimeout(verificar, 300); // sobrou outra competição que acabou? abre sem fila entre elas
  }

  // ---------- a foto para baixar ----------
  async function baixarFoto(F) {
    const f = F.f, Wd = 1080, esc = 6.25, fy = 330, LIN = 48, fin = f.final;
    const golsFinal = fin ? (fin.gols || []).filter((x) => (x.lado === 0) === (fin.casa === f.campeao)).map((x) => `${nomeDe(x.jogador)} ${x.min}'`).join(" · ") : "";
    const y0 = fy + H * esc + 70, yE = y0 + (fin ? 46 + (golsFinal ? 40 : 0) : 46) + 112;
    const Hd = Math.max(1350, Math.round(yE + Math.ceil(F.elenco.length / 2) * LIN + 50));
    const cv = document.createElement("canvas"); cv.width = Wd; cv.height = Hd;
    const g = cv.getContext("2d"), D = '"Geist", system-ui, sans-serif';
    try { await document.fonts.load("800 40px Geist"); } catch {}
    const fundoG = g.createLinearGradient(0, 0, 0, Hd); fundoG.addColorStop(0, "#111114"); fundoG.addColorStop(1, "#09090b");
    g.fillStyle = fundoG; g.fillRect(0, 0, Wd, Hd);
    const brilho = g.createRadialGradient(Wd / 2, 160, 20, Wd / 2, 160, 560); brilho.addColorStop(0, "rgba(232,190,79,.25)"); brilho.addColorStop(1, "rgba(232,190,79,0)");
    g.fillStyle = brilho; g.fillRect(0, 0, Wd, 760);
    const texto = (t, x, y, tam, peso, corT, max = Wd - 100) => { let s2 = tam; do { g.font = `${peso} ${s2}px ${D}`; if (g.measureText(t).width <= max) break; s2 -= 2; } while (s2 > 12); g.fillStyle = corT; g.fillText(t, x, y); };
    g.textAlign = "center";
    texto(`${f.nome} ${f.ano || ""}`.toUpperCase(), Wd / 2, 74, 28, 600, "#a1a1aa");
    texto("CAMPEÕES", Wd / 2, 178, 120, 800, "#e8be4f");
    texto(nomeClube(f.campeao).toUpperCase(), Wd / 2, 250, 64, 800, "#f4f4f5");
    const tela = document.createElement("canvas"); tela.width = W; tela.height = H;
    const tg = tela.getContext("2d"); tg.imageSmoothingEnabled = false; fotoElenco(tg, F, 0, true);
    const fx = (Wd - W * esc) / 2;
    g.fillStyle = "#e8be4f"; g.fillRect(fx - 8, fy - 8, W * esc + 16, H * esc + 16);
    g.imageSmoothingEnabled = false; g.drawImage(tela, fx, fy, W * esc, H * esc);
    let y = y0;
    if (fin) { texto(`Final: ${placarTxt(f)}`, Wd / 2, y, 38, 800, "#e8be4f"); y += 46; if (golsFinal) { texto(`Gols: ${golsFinal}`, Wd / 2, y, 24, 600, "#f4f4f5"); y += 40; } }
    else { texto(`${f.pontos} pontos · ${plural(f.pontos - f.pontosVice, "ponto", "pontos")} sobre o vice`, Wd / 2, y, 38, 800, "#e8be4f"); y += 46; }
    const c = f.campanha;
    texto(`${plural(c.gp, "gol feito", "gols feitos")} · ${plural(c.gc, "gol sofrido", "gols sofridos")} · ${c.v}V ${c.e}E ${c.d}D`, Wd / 2, y + 8, 30, 700, "#f4f4f5");
    if (F.artilharia[0]) texto(`Artilheiro do time: ${F.artilharia[0].nome} (${plural(F.artilharia[0].gols, "gol", "gols")})`, Wd / 2, y + 54, 26, 600, "#a1a1aa");
    const rostos = await Promise.all(F.elenco.map((p) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = Rostos.de(p.nome); })));
    const colW = 460; g.textAlign = "left";
    F.elenco.forEach((p, i) => {
      const col = i % 2, x = Wd / 2 - colW - 10 + col * (colW + 20), yy = yE + Math.floor(i / 2) * LIN;
      if (rostos[i]) g.drawImage(rostos[i], x, yy - 30, 36, 36);
      texto(p.nome + (p.titular ? "" : " (reserva)"), x + 48, yy, 26, 700, p.titular ? "#f4f4f5" : "#a1a1aa", colW - 120);
      if (p.gols) { g.textAlign = "right"; texto(plural(p.gols, "gol", "gols"), x + colW, yy, 24, 800, "#e8be4f"); g.textAlign = "left"; }
    });
    g.textAlign = "center";
    texto("CARREIRA DE TREINADOR · VILA DA GALERA", Wd / 2, Hd - 30, 22, 600, "#71717a");
    try { const r = await ChampionCard.baixar(cv, "campeoes-" + nomeClube(f.campeao)); if (r === "downloaded") toast("Foto baixada!"); }
    catch (e) { console.error(e); toast("Não consegui gerar a foto."); }
  }

  // reabrir (o botão "Rever a festa" da Tabela): as competições encerradas, começando pela pedida
  function rever(id) {
    if (!E || !E.competicoes) return;
    const lista = Object.entries(E.competicoes).filter(([, c]) => c.festa).sort((a, b) => cmp(ordem(a[0], a[1].festa), ordem(b[0], b[1].festa))).map(([i, c]) => ({ id: i, f: c.festa }));
    const k = Math.max(0, lista.findIndex((x) => x.id === id));
    if (lista.length) abrir(lista, k);
  }
  // a festa de uma temporada que já passou (a tela Temporadas): não conta como vista
  function reverArquivo(a, id) { const c = a.competicoes[id]; if (c && c.festa) abrir([{ id, f: c.festa, sem: true }]); }
  window.Campeoes = { verificar, rever, reverArquivo, abrir, fechar };
  if (location.hash === "#debug") window.__festa = { FESTA, irPara, dados, cenas, abrir, mostrar, verificar };
})();
