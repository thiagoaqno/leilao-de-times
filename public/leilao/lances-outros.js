// Leilão da Galera — os outros lances em pixel-art (além do gol, que fica em lances.js): a defesa do goleiro, a chance
// perdida (na trave, raspando ou por cima), o pênalti marcado, os cartões, a lesão com o médico, a substituição com a placa
// do quarto árbitro e o contra-ataque. Mesmo telão do gol (160x90, ampliado sem borrar), as peças de Lances.kit e o
// sorteio pela semente do lance: todo mundo vê a mesma cena, e recarregar repete.
// Lances.criarLance(tipo, d, { auto }) devolve o telão. d: { id, min, lado ("A"/"B"), nome, uniforme, uniformeRival,
// outro (o goleiro, ou quem entra), numeros ([sai, entra]), estadio, clima, cor ("amarelo"/"vermelho") }.
(function () {
  const K = Lances.kit, { W, H, mix, fase, suave, sorteio, cor, tela, poe, corre, entre, CHUTE, GOLEIRO, GOL_X, figura, bola, sombra, escreve } = K;
  const quieto = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PRETO = { cam: "#141414", det: "#f4f4f4", desenho: "", calcao: "#141414", meiao: "#141414", chuteira: "#141414" };
  const BRANCO = { cam: "#f4f4f4", det: "#d62828", desenho: "", calcao: "#f4f4f4", meiao: "#f4f4f4", chuteira: "#f4f4f4" };
  const GOLEIRO_KIT = (cam) => ({ cam, det: "#1a1a1a", desenho: "", calcao: "#1a1a1a", meiao: cam, chuteira: "#1a1a1a", luva: "#f4f4f4" });
  const ator = (g, a) => { const [x, y] = tela(a.X, a.D); sombra(g, x, y, (a.p && a.p.sobe) || 0, 1, a.deitado ? 3 : 0); };
  const desenhaAtor = (g, a) => { const [x, y] = tela(a.X, a.D); poe(g, a.b, a.p, x, y, 1, 0, a.vira, a.deitado || 0); };
  // os atores em ordem de profundidade (o do fundo primeiro), com a bola no meio
  function palco(g, atores, b, t) {
    for (const a of atores) ator(g, a);
    if (b) { const [x, y] = tela(b.X, b.D); cor(g, "#000", 0.28); g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); g.globalAlpha = 1; }
    const coisas = atores.map((a) => ({ D: a.D, faz: () => desenhaAtor(g, a) }));
    if (b) coisas.push({ D: b.D - 0.5, faz: () => { const [x, y] = tela(b.X, b.D, b.A); bola(g, x, y, t / 60); } });
    coisas.sort((p, q) => q.D - p.D).forEach((k) => k.faz());
  }
  function gol(g, L, bate) {
    const { nt, ft, bft, bfb, bnb, nb, bnt } = K.GOL;
    K.rede(g, [nt, ft, bft, bfb, bnb, nb], [150, 60], 0, 0.36); K.traves(g, false, bate);
    return () => { K.rede(g, [nt, bnt, bnb, nb], [150, 60], 0, 0.22); K.traves(g, true, bate); };
  }
  const voa = (t, t0, t1, a, b, arco = 0) => { const f = fase(t, t0, t1); return { X: mix(a.X, b.X, f), D: mix(a.D, b.D, f), A: mix(a.A, b.A, f) + arco * Math.sin(Math.PI * f) }; };
  // o atacante chegando e chutando (tc: a hora do chute)
  function chutador(t, tc) {
    if (t < tc - 120) return { X: mix(92, 104, fase(t, 0, tc - 120)), D: 22, p: corre(t) };
    return { X: 104, D: 22, p: K.chutando(t, tc) };
  }
  // o close (o fundo com a torcida desfocada e o chão liso)
  const close = (g, L) => { if (!L.fundoC) L.fundoC = K.fundoClose(L); g.drawImage(L.fundoC, 0, 0); };
  const aberta = (g, L) => { if (!L.fundoA) L.fundoA = K.fundoAberto(L, false); g.drawImage(L.fundoA, 0, 0); };

  const CENAS = {
    // o goleiro voa e espalma para o lado
    defesa: { dur: 2300, grito: "Defendeu!", icone: "luva", rotulo: "Defesa", quem: (d) => d.outro || d.curto || d.nome, momento: 640,
      monta(L, s) { L.alvo = { X: GOL_X, D: s() < 0.5 ? 10 + s() * 6 : 30 + s() * 6, A: 4 + s() * 14 }; },
      desenha(g, L, t) {
        aberta(g, L);
        const fecha = gol(g, L, null), tc = 380, a = L.alvo, fora = { X: 118, D: a.D + (a.D > 22 ? 14 : -14), A: 0 };
        const b = t < tc ? K.conduz(chutador(t, tc), t) : t < 640 ? voa(t, tc, 640, { X: 108, D: 22, A: 1 }, a) : voa(t, 640, 1050, a, fora, 12);
        let gk = { X: 128, D: 22, p: { ...GOLEIRO.base, sobe: Math.abs(Math.sin(t / 160)) } };
        if (t > 470) { const f = fase(t, 470, 720); gk = { X: 128, D: mix(22, a.D, suave(f)), deitado: -90, p: { ...(f < 1 ? GOLEIRO.voa : GOLEIRO.chao), sobe: (a.A > 10 ? 9 : 5) * Math.sin(Math.PI * Math.min(1, f)) } }; }
        palco(g, [{ b: L.art, ...chutador(t, tc) }, { b: L.gol, ...gk }], b, t);
        fecha();
        if (t > 640 && t < 760) { const [x, y] = tela(a.X, a.D, a.A); cor(g, "#ffffff", 0.9); for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) g.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1); g.globalAlpha = 1; }
      } },
    // na trave, raspando ou por cima; depois, o close de quem perdeu com as mãos na cabeça
    perdeu: { dur: 2600, grito: "Uhhh!", icone: "alvo", rotulo: "Perdeu", quem: (d) => d.curto || d.nome, momento: 640,
      monta(L, s) { const r = s(); L.jeito = r < 0.4 ? "trave" : r < 0.75 ? "raspando" : "alto"; L.alvo = L.jeito === "trave" ? { X: GOL_X, D: s() < 0.5 ? 4 : 40, A: 8 + s() * 10 } : L.jeito === "raspando" ? { X: GOL_X + 6, D: s() < 0.5 ? -4 : 48, A: 3 } : { X: GOL_X + 6, D: 18 + s() * 10, A: 32 }; L.grito = L.jeito === "trave" ? "Na trave!" : "Pra fora!"; },
      desenha(g, L, t) {
        if (t >= 1150) { // o close: as mãos na cabeça
          close(g, L);
          const tc = t - 1150, c = Lances.COMEMORA.naoAcredita ? Lances.COMEMORA.naoAcredita(tc, L) : { p: { bE: [-150, -40], bD: [150, 40] } };
          sombra(g, 80, 85, 0, 2); poe(g, L.art, c.p, 80 + (c.dx || 0) * 2, 85, 2, 0, c.vira);
          if (tc < 120) { cor(g, "#ffffff", 0.5 * (1 - tc / 120)); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
          return;
        }
        aberta(g, L);
        const tc = 380, a = L.alvo, bate = L.jeito === "trave" && t > 640 && t < 900 ? { lado: a.D > 22 ? "longe" : "perto", treme: Math.round(Math.sin(t / 20)) } : null;
        const fecha = gol(g, L, bate), volta = { X: 112, D: a.D > 22 ? 34 : 8, A: 0 };
        const b = t < tc ? K.conduz(chutador(t, tc), t) : t < 640 ? voa(t, tc, 640, { X: 108, D: 22, A: 1 }, a) : L.jeito === "trave" ? voa(t, 640, 1000, a, volta, 8) : voa(t, 640, 900, a, { X: a.X + 14, D: a.D, A: a.A * 0.6 });
        const gk = { X: 128, D: t > 480 ? mix(22, a.D, 0.4 * suave(fase(t, 480, 700))) : 22, p: { ...GOLEIRO.base } };
        palco(g, [{ b: L.art, ...chutador(t, tc) }, { b: L.gol, ...gk }], b, t);
        fecha();
      } },
    // o juiz aponta a marca do pênalti e o defensor reclama
    penalti: { dur: 2000, grito: "Pênalti!", icone: "apito", rotulo: "Pênalti", quem: (d) => d.curto || d.nome, momento: 500,
      desenha(g, L, t) {
        aberta(g, L);
        const fecha = gol(g, L, null), aponta = suave(fase(t, 250, 500));
        const juiz = { b: L.juiz, X: 96, D: 26, p: entre(K.P0, { bD: [95, 100], bE: [-20, -10], ol: 1 }, aponta) };
        const reclama = { b: L.rival, X: 112, D: 16, vira: true, p: { bE: [-150, -40], bD: [150, 40], sobe: Math.abs(Math.sin(t / 140)) * (t > 500 ? 1.5 : 0) } };
        const caido = { b: L.art, X: 120, D: 30, deitado: 90, p: { ...GOLEIRO.chao } };
        palco(g, [juiz, reclama, caido], { X: K.marcaPenalti(false), D: 22, A: 0 }, t);
        fecha();
        if (t > 500) { cor(g, "#ffffff"); escreve(g, "PRIII", 70, 8, false); g.globalAlpha = 1; }
      } },
    // o juiz levanta o cartão; no vermelho, o jogador vai embora de cabeça baixa
    cartao: { dur: 2400, icone: "cartas", quem: (d) => d.curto || d.nome, momento: 600,
      monta(L) { L.grito = L.d.cor === "vermelho" ? "Expulso!" : "Amarelo!"; L.rotulo = L.d.cor === "vermelho" ? "Vermelho" : "Amarelo"; },
      desenha(g, L, t) {
        close(g, L);
        const sobe = suave(fase(t, 250, 600)), jx = 56, chao = 85, vermelho = L.d.cor === "vermelho";
        sombra(g, jx, chao, 0, 2);
        poe(g, L.juiz, entre({ bD: [40, 80], bE: [-20, -10], ol: 1 }, { bD: [172, 176], bE: [-20, -10], ol: 1 }, sobe), jx, chao, 2);
        if (sobe > 0.6) { const cx = jx + 9, cy = chao - 76; cor(g, "#141414"); g.fillRect(cx - 1, cy - 1, 9, 12); cor(g, vermelho ? "#e0281c" : "#ffd21f"); g.fillRect(cx, cy, 7, 10); cor(g, "#ffffff", 0.4); g.fillRect(cx + 1, cy + 1, 2, 4); g.globalAlpha = 1; }
        // o jogador: reclama (amarelo) ou sai andando de cabeça baixa (vermelho)
        const sai = vermelho ? fase(t, 1100, 2400) : 0, px = 112 + sai * 70;
        const pose = vermelho && t > 1100 ? { ...corre(t, "balanca", 420), ol: 1, sobe: 0, ag: 1 } : { bE: [-120, -60], bD: [120, 60], ol: -1, sobe: Math.abs(Math.sin(t / 180)) * 1.2 };
        sombra(g, px, chao, 0, 2); poe(g, L.art, pose, px, chao, 2, 0, !(vermelho && t > 1100));
      } },
    // o jogador no chão e o médico chegando com a maleta
    lesao: { dur: 2600, grito: "Lesão", icone: "alerta", rotulo: "Lesão", quem: (d) => d.curto || d.nome, momento: 700,
      desenha(g, L, t) {
        aberta(g, L);
        const chega = fase(t, 300, 1300), mx = mix(18, 62, chega), rola = Math.sin(t / 220) * (t < 1300 ? 1 : 0.3);
        const medico = { b: L.medico, X: mx, D: 24, p: chega < 1 ? corre(t, "balanca", 240) : { bE: [-60, -20], bD: [60, 120], ag: 4, pE: [-60, -90], pD: [40, 60] } };
        const caido = { b: L.art, X: 70, D: 26, deitado: rola > 0 ? 90 : -90, p: { ...GOLEIRO.chao, bE: [-150, -170], bD: [150, 170] } };
        const companheiro = { b: L.parceiro, X: 80, D: 34, vira: true, p: { bE: [-60, -120], bD: [60, 120], ol: -1 } };
        palco(g, [companheiro, caido, medico], null, t);
        // a maleta com a cruz
        const [x, y] = tela(mx + 4, 23); cor(g, "#f4f4f4"); g.fillRect(Math.round(x), Math.round(y) - 6, 7, 5); cor(g, "#d62828"); g.fillRect(Math.round(x) + 3, Math.round(y) - 5, 1, 3); g.fillRect(Math.round(x) + 2, Math.round(y) - 4, 3, 1); g.globalAlpha = 1;
      } },
    // a placa de LED do quarto árbitro: o número que sai em vermelho, o que entra em verde
    sub: { dur: 2200, grito: "Troca", icone: "troca", rotulo: "Troca", quem: (d) => `${d.outro || "?"} no lugar de ${d.curto || d.nome}`, momento: 500,
      desenha(g, L, t) {
        close(g, L);
        const chao = 85, x = 80, sobe = suave(fase(t, 150, 450));
        sombra(g, x, chao, 0, 2);
        poe(g, L.juiz, entre({ bE: [-30, -20], bD: [30, 20], ol: 0 }, { bE: [-165, -175], bD: [165, 175], ol: 0 }, sobe), x, chao, 2);
        const by = mix(60, 6, sobe), [sai, entra] = L.d.numeros || [9, 19], aceso = Math.floor(t / 260) % 2 === 0 || t > 1200;
        cor(g, "#0b0b0b"); g.fillRect(x - 26, Math.round(by), 52, 18); cor(g, "#333"); g.fillRect(x - 25, Math.round(by) + 1, 50, 16);
        if (aceso && sobe > 0.8) {
          const num = (n, cx, c) => { const t2 = String(n); cor(g, c); for (let k = 0; k < 2; k++) escreve(g, t2, cx - t2.length * 2 + k, Math.round(by) + 6, false); };
          num(sai, x - 12, "#ff3b30"); num(entra, x + 12, "#34d058");
          cor(g, "#ff3b30"); g.fillRect(x - 4, Math.round(by) + 3, 2, 1); cor(g, "#34d058"); g.fillRect(x + 2, Math.round(by) + 14, 2, 1);
        }
        g.globalAlpha = 1;
      } },
    // três correndo para o ataque, a bola no pé e as linhas de vento
    contra_ataque: { dur: 1900, grito: "Contra-ataque!", icone: "raio", rotulo: "Contra-ataque", quem: (d) => d.curto || d.nome, momento: 900,
      desenha(g, L, t) {
        aberta(g, L);
        const f = fase(t, 0, 1700), x = mix(20, 116, suave(f));
        const lider = { b: L.art, X: x, D: 22, p: corre(t, "balanca", 170) };
        const a1 = { b: L.parceiro, X: x - 14, D: 10, p: corre(t + 60, "balanca", 180) }, a2 = { b: L.parceiro2, X: x - 10, D: 36, p: corre(t + 120, "balanca", 175) };
        const marcador = { b: L.rival, X: x - 30, D: 26, p: corre(t, "balanca", 200) };
        cor(g, "#ffffff", 0.35);
        for (const a of [lider, a1, a2]) { const [px, py] = tela(a.X, a.D); for (let k = 0; k < 3; k++) g.fillRect(Math.round(px - 14 - k * 6), Math.round(py - 8 - k * 3), 5, 1); }
        g.globalAlpha = 1;
        palco(g, [marcador, a1, a2, lider], K.conduz(lider, t), t);
      } },
  };
  CENAS.amarelo = CENAS.vermelho = CENAS.cartao;

  function criarLance(tipo, d, { auto = true } = {}) {
    const cena = CENAS[tipo]; if (!cena) return null;
    const semente = `${d.id}|${tipo}|${d.min}|${d.nome}`, s = sorteio(semente);
    const rival = d.uniformeRival || PRETO, golCam = ["#f7d417", "#3ad37a", "#ff7a2f", "#b06cff"][Math.floor(s() * 4)];
    const L = { d, semente, futsal: false, espelho: d.lado === "B", estadio: d.estadio || null, clima: d.clima || null,
      art: figura(d.nome, d.uniforme), rival: figura(`rival ${semente}`, rival), gol: figura(d.outro || `goleiro ${semente}`, GOLEIRO_KIT(golCam), { goleiro: true }),
      juiz: figura(`juiz ${semente}`, PRETO), medico: figura(`medico ${semente}`, BRANCO),
      parceiro: figura(`parceiro ${semente} 1`, d.uniforme), parceiro2: figura(`parceiro ${semente} 2`, d.uniforme) };
    L.art.espelho = L.espelho;
    if (tipo === "amarelo" || tipo === "vermelho") d.cor = d.cor || tipo;
    if (cena.monta) cena.monta(L, s);
    const grito = L.grito || cena.grito, rotulo = L.rotulo || cena.rotulo, ms = cena.dur;
    const el = document.createElement("div"), icone = (n) => (window.Icones ? Icones.ic(n) : "");
    el.className = `telao lance-outro lance-${tipo} lado${d.lado}`;
    el.setAttribute("role", "button"); el.tabIndex = 0;
    el.setAttribute("aria-label", `${rotulo} aos ${d.min} minutos: ${cena.quem(d)}`);
    el.innerHTML = `<canvas width="${W}" height="${H}" aria-hidden="true"></canvas><span class="lcTag"><i></i><span>Lance</span></span>
      <b class="lcGrito" aria-hidden="true">${K.escapa(grito)}</b><span class="lcPlay" aria-hidden="true">${icone("play")}</span>
      <div class="lcFaixa">${icone(cena.icone)}<span>${K.escapa(rotulo)}</span><b>${K.escapa(cena.quem(d))}</b><span>${d.min}'</span></div>`;
    const ctx = el.querySelector("canvas").getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const quadro = (t) => { cena.desenha(ctx, L, t); K.chuvaQuadro(ctx, L, t); };
    const parado = () => { quadro(ms - 1); el.classList.remove("tocando", "gol"); el.classList.add("close", "fim"); L.fundoA = null; };
    let vez = 0;
    const toca = () => {
      const esta = ++vez; let t0 = 0;
      el.classList.remove("fim", "close", "gol"); void el.offsetWidth; el.classList.add("tocando");
      const anda = (agora) => {
        if (esta !== vez) return;
        if (!t0) t0 = agora;
        const t = agora - t0;
        if (!el.isConnected && t > 300) return;
        if (t >= ms) return parado();
        quadro(t);
        el.classList.toggle("gol", t >= cena.momento);
        el.classList.toggle("close", t >= cena.momento);
        requestAnimationFrame(anda);
      };
      requestAnimationFrame(anda);
    };
    el.addEventListener("click", toca);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toca(); } });
    if (auto && !quieto()) toca(); else parado();
    return el;
  }
  Lances.criarLance = criarLance;
  Lances.CENAS_LANCE = CENAS;
})();
