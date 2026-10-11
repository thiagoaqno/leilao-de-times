// Carreira de Treinador: a mesa de botão. Os 22 jogadores viram botões nas cores dos clubes, num campo visto de cima (como o
// futebol de botão), e andam seguindo os lances que o motor já sorteou: o chute, o gol, a defesa, o pênalti, os cartões e as
// trocas. O motor não guarda posição nenhuma; aqui só se desenha (nada disso muda o placar). Entre os lances, os botões trocam
// passes de enfeite para a mesa não ficar parada. O mandante ataca para a direita.
// Uso (partida.js): Mesa.montar(raiz, cfg) ao abrir o jogo, Mesa.evento(e) em cada lance, Mesa.ativa/vel/rapido pelo relógio.
const Mesa = (() => {
  const W = 105, H = 68, NS = "http://www.w3.org/2000/svg";
  const M = { vel: 1, ativa: false, rapido: false, ligada: true };
  let S = null;
  const sorte = (a, b) => a + Math.random() * (b - a);
  const limita = (v, a, b) => Math.max(a, Math.min(b, v));
  const calmo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dir = (lado) => (lado === 0 ? 1 : -1);
  const golX = (lado) => (lado === 0 ? W : 0); // o gol que o time do lado ataca
  const turbo = () => M.rapido || (S && S.fila.length > 3);
  const ms = (t) => (turbo() ? 0 : calmo() ? 0 : t / M.vel);
  const espera = (t) => { const d = turbo() ? 0 : calmo() ? 120 : t / M.vel; return d ? new Promise((r) => setTimeout(r, d)) : Promise.resolve(); };
  const el = (tag, attrs, pai) => { const e = document.createElementNS(NS, tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); if (pai) pai.appendChild(e); return e; };
  const numeroDe = (pid) => 2 + ([...String(pid)].reduce((s, c) => s + c.charCodeAt(0), 0) % 28);

  // ---------- o campo ----------
  function campo(svg) {
    const g = el("g", { class: "m-campo" }, svg);
    el("rect", { width: W, height: H, fill: "#2f8a43" }, g);
    for (let k = 0; k < 10; k++) if (k % 2) el("rect", { x: k * W / 10, width: W / 10, height: H, fill: "#37974c" }, g);
    const L = { fill: "none", stroke: "#f3f6ef", "stroke-width": ".35", opacity: ".9" };
    el("rect", { x: 1.5, y: 1.5, width: W - 3, height: H - 3, ...L }, g);
    el("line", { x1: W / 2, y1: 1.5, x2: W / 2, y2: H - 1.5, ...L }, g);
    el("circle", { cx: W / 2, cy: H / 2, r: 9, ...L }, g); el("circle", { cx: W / 2, cy: H / 2, r: .5, fill: "#f3f6ef" }, g);
    for (const lado of [0, 1]) {
      const x0 = lado ? W - 1.5 : 1.5, s = lado ? -1 : 1;
      el("rect", { x: lado ? W - 1.5 - 16.5 : 1.5, y: H / 2 - 20, width: 16.5, height: 40, ...L }, g);
      el("rect", { x: lado ? W - 1.5 - 5.5 : 1.5, y: H / 2 - 9, width: 5.5, height: 18, ...L }, g);
      el("circle", { cx: x0 + s * 11, cy: H / 2, r: .45, fill: "#f3f6ef" }, g);
      el("path", { d: `M ${x0 + s * 16.5} ${H / 2 - 7.3} A 9 9 0 0 ${lado ? 0 : 1} ${x0 + s * 16.5} ${H / 2 + 7.3}`, ...L }, g);
      el("rect", { x: lado ? W - 1.5 : -0.2, y: H / 2 - 3.7, width: 1.7, height: 7.4, fill: "#ffffff22", stroke: "#f3f6ef", "stroke-width": ".3" }, g); // o gol
    }
  }

  // ---------- as peças ----------
  const spotsDe = (forma) => { try { return Taticas.spots(forma); } catch (e) { return Taticas.spots("4-3-3"); } };
  const vagasDe = (forma) => { try { return Taticas.vagasDe(forma); } catch (e) { return Taticas.vagasDe("4-3-3"); } };
  // o lugar de cada vaga no campo (o gol embaixo no campinho vira o gol da esquerda; o visitante é o espelho)
  function base(p) {
    const s = S.spots[p.lado][p.spot] || { x: 50, y: 50, row: 1 }, d = (91 - s.y) / 76;
    const x = 6 + limita(d, 0, 1.05) * 44, y = 6 + (s.x / 100) * 56;
    return p.lado === 0 ? { x, y } : { x: W - x, y: H - y };
  }
  function alvo(p) {
    if (p.over) return p.over;
    const b = base(p), bola = S.bola, d = dir(p.lado);
    let x = b.x + (bola.x - W / 2) * (p.gk ? .08 : .26), y = b.y + (bola.y - H / 2) * (p.gk ? .1 : .13);
    if (!p.gk && S.posse === p.lado) x += d * 3 * Math.min(p.row, 3) / 3;
    if (p.gk) x = p.lado === 0 ? limita(x, 3.5, 11) : limita(x, W - 11, W - 3.5);
    return { x: limita(x, 3, W - 3), y: limita(y, 4, H - 4) };
  }
  function pecaSVG(p) {
    const u = S.cores[p.lado], g = el("g", { class: "bt" }), dentro = el("g", { class: "bt-in" }, g);
    el("circle", { r: 2.75, cy: .5, fill: "#000", opacity: ".32" }, dentro);
    el("circle", { r: 2.65, fill: p.gk ? "#1c1c1c" : u.det }, dentro);
    el("circle", { r: 2.1, fill: p.gk ? (p.lado ? "#2dc0a5" : "#f2c230") : u.cam, stroke: "#00000040", "stroke-width": ".15" }, dentro);
    el("circle", { r: 1.55, fill: "none", stroke: p.gk ? "#1c1c1c" : u.det, "stroke-width": ".18", opacity: ".65" }, dentro);
    el("ellipse", { cx: -.75, cy: -.85, rx: .9, ry: .5, fill: "#fff", opacity: ".28" }, dentro);
    const t = el("text", { y: .75, "text-anchor": "middle", "font-size": "2.1", "font-weight": "700", fill: p.gk ? "#fff" : tintaSobre(u.cam, "#ffffff") }, dentro);
    t.textContent = p.num;
    p.g = g; S.camadaPecas.appendChild(g);
    return g;
  }
  function criar(lado, spot, id) {
    const vaga = vagasDe(S.forma[lado])[spot] || { fino: "", g: "MID" };
    const p = { lado, spot, id, gk: vaga.fino === "GOL", row: (S.spots[lado][spot] || { row: 1 }).row, num: id ? numeroDe(id) : spot + 1, over: null, fora: false };
    pecaSVG(p); S.pecas[lado].push(p);
    const a = alvo(p); p.x = a.x; p.y = a.y; p.g.style.transitionDuration = "0ms"; p.g.style.transform = `translate(${a.x}px,${a.y}px)`;
    return p;
  }
  function relayout(t) {
    const d = ms(t == null ? 600 : t);
    for (const lado of [0, 1]) for (const p of S.pecas[lado]) {
      const a = alvo(p); p.x = a.x; p.y = a.y;
      p.g.style.transitionDuration = `${d}ms`; p.g.style.transform = `translate(${a.x}px,${a.y}px)`;
    }
  }
  function moverBola(x, y, t) {
    S.bola = { x, y };
    S.bolaEl.style.transitionDuration = `${ms(t)}ms`; S.bolaEl.style.transform = `translate(${x}px,${y}px)`;
  }
  // o botão vai para (x, y) levando a bola, enquanto o resto do time anda atrás
  async function com(p, x, y, t) {
    if (!p) return;
    if (S.carrier && S.carrier !== p) S.carrier.over = null;
    S.carrier = p; S.posse = p.lado; p.over = { x: limita(x, 3, W - 3), y: limita(y, 4, H - 4) };
    moverBola(p.over.x + dir(p.lado) * 2.1, p.over.y, t); relayout(t);
    await espera(t);
  }
  const vivos = (lado) => S.pecas[lado].filter((p) => !p.fora);
  function pecaDe(lado, id, modo) {
    const todos = vivos(lado), achou = id && todos.find((p) => p.id === id);
    if (achou) return achou;
    const campoTodo = todos.filter((p) => !p.gk);
    if (!campoTodo.length) return todos[0];
    if (modo === "frente") { const mx = Math.max(...campoTodo.map((p) => p.row)); const f = campoTodo.filter((p) => p.row === mx); return f[Math.floor(Math.random() * f.length)]; }
    return campoTodo[Math.floor(Math.random() * campoTodo.length)];
  }
  const goleiroDe = (lado) => vivos(lado).find((p) => p.gk);
  function legenda(p, texto, t) {
    if (!p || turbo()) return;
    const g = el("g", { class: "m-leg", transform: `translate(${limita(p.x, 9, W - 9)} ${Math.max(4, p.y - 3.6)})` }, S.camadaRotulos);
    const tx = el("text", { "text-anchor": "middle", "font-size": "2.3" }, g); tx.textContent = texto;
    setTimeout(() => g.remove(), (t || 1800) / M.vel + 200);
  }
  const nomeCurto = (id) => { const n = id && S.nome ? S.nome(id) : ""; return n || ""; };
  function cartao(p, cor) {
    if (!p || turbo()) return;
    const g = el("g", { class: "m-cartao", transform: `translate(${p.x + 2.3} ${p.y - 4.3})` }, S.camadaRotulos);
    el("rect", { x: -.9, y: -1.3, width: 1.8, height: 2.6, rx: .25, fill: cor, stroke: "#0006", "stroke-width": ".15" }, g);
    setTimeout(() => g.remove(), 2400 / M.vel + 200);
  }

  // ---------- recomeços ----------
  function reiniciar(posse, t) {
    for (const lado of [0, 1]) for (const p of S.pecas[lado]) p.over = null;
    S.carrier = null; S.posse = posse; S.bola = { x: W / 2, y: H / 2 };
    moverBola(W / 2, H / 2, t == null ? 700 : t); relayout(t == null ? 700 : t);
  }

  // ---------- o chute ----------
  const zonaY = (z, lado) => { const l = z && z[0] === "e" ? -1 : z && z[0] === "d" ? 1 : 0; return H / 2 + l * dir(lado) * 3.1; };
  async function chute(e, resultado) {
    const lado = e.lado, d = dir(lado), gx = golX(lado), pen = e.como === "penalti";
    const aut = pecaDe(lado, e.jogador, "frente"), gk = goleiroDe(1 - lado);
    const ass = e.assist && e.assist !== e.jogador ? pecaDe(lado, e.assist) : null;
    if (!(pen && S.jaChutou)) {
      if (pen) {
        const bx = gx - d * 11; await com(aut, bx - d * 2, H / 2, 350);
      } else {
        if (ass && ass !== aut) { await com(ass, gx - d * sorte(24, 30), sorte(14, 54), 420); legenda(ass, S.nome ? nomeCurto(e.assist) : "", 1200); }
        await com(aut, gx - d * sorte(14, 20), sorte(22, 46), ass ? 360 : 560);
      }
      legenda(aut, nomeCurto(e.jogador), 1400);
    }
    const yAlvo = pen && S.jaChutou && S.zona ? zonaY(S.zona, lado) : H / 2 + sorte(-3.2, 3.2);
    if (!(pen && S.jaChutou)) {
      if (resultado === "gol") { moverBola(gx + d * 1.2, yAlvo, 340); if (gk) { gk.over = { x: gk.x, y: limita(H / 2 + (H / 2 - yAlvo) * 1.2 + sorte(-2, 2), 28, 40) }; relayout(340); } }
      else if (resultado === "defesa") { moverBola(gx - d * 3.2, yAlvo, 340); if (gk) { gk.over = { x: gx - d * 3.6, y: yAlvo }; relayout(340); } }
      else { const lado2 = Math.random() < .5 ? -1 : 1; moverBola(gx + d * 4, H / 2 + lado2 * sorte(6, 9.5), 420); }
      await espera(resultado === "perdeu" ? 460 : 380);
    } else await espera(220);
    S.jaChutou = false; S.zona = null;
    if (resultado === "gol") {
      if (!turbo()) {
        const u = S.cores[lado], b = el("g", { class: "m-gol" }, S.camadaRotulos);
        const t = el("text", { x: W / 2, y: H / 2 + 3.2, "text-anchor": "middle", "font-size": "11", "font-weight": "800", fill: u.cam, stroke: u.det === u.cam ? "#fff" : u.det, "stroke-width": ".9", "paint-order": "stroke" }, b);
        t.textContent = "GOL!";
        for (const p of vivos(lado)) { p.g.classList.add("festa"); setTimeout(() => p.g.classList.remove("festa"), 1500 / M.vel + 100); }
        setTimeout(() => b.remove(), 1700 / M.vel + 200);
      }
      await espera(1500);
      reiniciar(1 - lado);
    } else {
      S.carrier = gk || null; S.posse = 1 - lado;
      if (aut) aut.over = null;
      if (gk) { const gb = base(gk); moverBola(gk.over ? gk.over.x : gb.x, gk.over ? gk.over.y : gb.y, 350); }
      await espera(500);
      if (gk) gk.over = null;
      relayout(600);
    }
  }
  // o pênalti: a bola na marca; com `chute` (lance decisivo) o canto escolhido
  async function penalti(e) {
    const lado = e.lado, d = dir(lado), gx = golX(lado), aut = pecaDe(lado, e.jogador, "frente"), gk = goleiroDe(1 - lado);
    if (!e.chute) { await com(aut, gx - d * 13, H / 2, 380); legenda(aut, nomeCurto(e.jogador), 1400); await espera(300); return; }
    if (!S.jaChutou) { await com(aut, gx - d * 13, H / 2, 300); }
    const y = zonaY(e.chute, lado);
    if (gk && e.pulo) gk.over = { x: gx - d * 2.4, y: zonaY(e.pulo, lado) }; relayout(300);
    if (e.fora) moverBola(gx + d * 3.6, y + (y >= H / 2 ? 6.5 : -6.5), 380); else moverBola(gx + d * 1.2, y, 340);
    S.jaChutou = true; S.zona = e.chute;
    await espera(420);
  }
  async function disputa(e) {
    const lado = e.lado, d = dir(lado), gx = golX(lado), aut = pecaDe(lado, e.jogador, "frente"), gk = goleiroDe(1 - lado);
    reiniciar(lado, 0);
    await com(aut, gx - d * 13, H / 2, 280); legenda(aut, nomeCurto(e.jogador), 900);
    if (gk && e.pulo) { gk.over = { x: gx - d * 2.4, y: zonaY(e.pulo, lado) }; relayout(260); }
    const y = zonaY(e.chute, lado);
    if (e.fora) moverBola(gx + d * 3.6, y + (y >= H / 2 ? 6.5 : -6.5), 320); else if (e.entrou) moverBola(gx + d * 1.2, y, 300); else moverBola(gx - d * 3, y, 300);
    await espera(650);
    if (gk) gk.over = null; if (aut) aut.over = null; relayout(300);
  }

  // ---------- os lances ----------
  async function exec(e) {
    const lado = e.lado;
    switch (e.tipo) {
      case "gol": return chute(e, "gol");
      case "defesa": return chute(e, "defesa");
      case "perdeu": return chute(e, "perdeu");
      case "penalti": return penalti(e);
      case "disputa": return disputa(e);
      case "disputa_inicio": return reiniciar(0, 300);
      case "lance": {
        const aut = pecaDe(lado, e.jogador, "frente"), gx = golX(lado);
        await com(aut, gx - dir(lado) * sorte(17, 24), sorte(18, 50), 520); return;
      }
      case "contra_ataque": {
        const meio = vivos(lado).filter((p) => !p.gk && p.row <= 2), a = meio[Math.floor(Math.random() * meio.length)] || pecaDe(lado), d = dir(lado);
        await com(a, W / 2 - d * 14, sorte(20, 48), 320);
        const f = pecaDe(lado, null, "frente");
        await com(f, W / 2 + d * 16, sorte(18, 50), 600); return;
      }
      case "amarelo": { const p = pecaDe(lado, e.jogador); cartao(p, "#f5c518"); legenda(p, nomeCurto(e.jogador), 1600); await espera(500); return; }
      case "vermelho": {
        const p = pecaDe(lado, e.jogador); cartao(p, "#d62828"); legenda(p, nomeCurto(e.jogador), 1600);
        await espera(700);
        if (p && !p.gk) { p.fora = true; p.g.classList.add("saiu"); setTimeout(() => p.g.remove(), turbo() ? 0 : 700); S.pecas[lado] = S.pecas[lado].filter((x) => x !== p); if (S.carrier === p) S.carrier = null; relayout(600); }
        return;
      }
      case "lesao": { const p = pecaDe(lado, e.jogador); if (p) { p.g.classList.add("ferido"); legenda(p, "lesão", 1600); } await espera(500); return; }
      case "sub": {
        const p = S.pecas[lado].find((x) => x.id === e.sai) || null;
        if (p) { p.id = e.entra; p.num = numeroDe(e.entra); p.g.classList.remove("ferido"); p.g.querySelector("text").textContent = p.num; p.g.classList.add("pop"); setTimeout(() => p.g.classList.remove("pop"), 900); legenda(p, `entra ${nomeCurto(e.entra)}`, 1600); }
        await espera(400); return;
      }
      case "reposicao": case "entrada": {
        const vagas = vagasDe(S.forma[lado]), i = vagas.findIndex((v, k) => v.fino === e.fino && !S.pecas[lado].some((p) => p.spot === k && !p.fora));
        const j = i >= 0 ? i : vagas.findIndex((v) => v.fino === e.fino);
        if (j < 0) return;
        let p = S.pecas[lado].find((x) => x.id === e.jogador);
        if (!p && e.tipo === "entrada") p = criar(lado, j, e.jogador);
        if (p) { p.spot = j; p.row = (S.spots[lado][j] || { row: 1 }).row; p.gk = vagas[j].fino === "GOL"; }
        relayout(700); await espera(500); return;
      }
      case "posicao": {
        const a = S.pecas[lado].find((x) => x.id === e.a), b = S.pecas[lado].find((x) => x.id === e.b);
        if (a && b) { [a.spot, b.spot] = [b.spot, a.spot]; [a.row, b.row] = [b.row, a.row]; }
        relayout(700); await espera(400); return;
      }
      case "formacao": {
        S.forma[lado] = e.formacao; S.spots[lado] = spotsDe(e.formacao);
        const ordem = [...S.pecas[lado]].sort((a, b) => a.spot - b.spot);
        ordem.forEach((p, k) => { p.spot = k; p.row = (S.spots[lado][k] || { row: 1 }).row; });
        relayout(800); await espera(500); return;
      }
      case "intervalo": return reiniciar(1, 900);
      case "fim": return reiniciar(0, 900);
    }
  }
  async function bombear() {
    if (S.rodando) return;
    S.rodando = true;
    const meu = S;
    while (S === meu && S.fila.length) {
      const e = S.fila.shift();
      try { await exec(e); } catch (err) { console.warn("mesa", err); }
    }
    if (S === meu) S.rodando = false;
  }

  // ---------- os passes de enfeite ----------
  let ritmo = null;
  async function passe() {
    if (!S || !M.ligada || !M.ativa || S.rodando || S.fila.length || document.hidden) return;
    S.rodando = true;
    const meu = S;
    try {
      const lado = S.posse, d = dir(lado), b = S.bola, fundo = d > 0 ? b.x > 86 : b.x < W - 86;
      let virou = Math.random() < (fundo ? .4 : .09);
      if (virou) {
        const rivais = vivos(1 - lado).filter((p) => !p.gk), p = rivais.sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0];
        await com(p, b.x, b.y, 380);
      } else {
        const gente = vivos(lado).filter((p) => !p.gk && p !== S.carrier);
        const recua = fundo ? .8 : .12 + (d > 0 ? (b.x < 26) : (b.x > W - 26)) * .5;
        const passo = (Math.random() < recua ? -1 : 1) * sorte(5, 13);
        const x = limita(b.x + d * passo, 9, W - 9), y = limita(b.y + sorte(-16, 16), 6, H - 6);
        const p = gente.sort((a, c) => Math.hypot(base(a).x - x, base(a).y - y) - Math.hypot(base(c).x - x, base(c).y - y))[Math.floor(Math.random() * Math.min(3, gente.length))];
        await com(p, x, y, 520);
      }
    } finally { if (S === meu) S.rodando = false; }
    if (S === meu && S.fila.length) bombear();
  }
  function ligarRitmo() {
    clearInterval(ritmo);
    ritmo = setInterval(passe, 1100);
  }

  // ---------- a interface ----------
  // cfg: { chave, casa, fora, uniformes: [uni0, uni1], formacoes: [f0, f1], times: [{ formacao, titulares }] | null, eventos, nome(pid) }
  function montar(raiz, cfg) {
    if (S && S.chave === cfg.chave && S.raiz === raiz) return;
    raiz.innerHTML = "";
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Mesa de botão: os jogadores em campo" });
    raiz.appendChild(svg); campo(svg);
    const camadaPecas = el("g", {}, svg), bolaEl = el("g", { class: "bt-bola" }, svg), camadaRotulos = el("g", {}, svg);
    el("circle", { r: 1.25, cy: .35, fill: "#000", opacity: ".3" }, bolaEl); el("circle", { r: 1.1, fill: "#fff", stroke: "#222", "stroke-width": ".2" }, bolaEl); el("path", { d: "M-.4 -.3 L0 -.7 L.4 -.3 L.25 .25 L-.25 .25 Z", fill: "#222" }, bolaEl);
    const forma = [0, 1].map((l) => (cfg.times && cfg.times[l] && cfg.times[l].formacao) || cfg.formacoes[l] || "4-3-3");
    S = { chave: cfg.chave, raiz, svg, camadaPecas, camadaRotulos, bolaEl, cores: cfg.uniformes, nome: cfg.nome, forma, spots: forma.map(spotsDe), pecas: [[], []], fila: [], rodando: false, posse: 0, carrier: null, bola: { x: W / 2, y: H / 2 }, jaChutou: false, zona: null };
    moverBola(W / 2, H / 2, 0);
    for (const lado of [0, 1]) {
      // a escalação do começo: o time guardado é o de agora, então desfaz as trocas que já aconteceram
      const tit = cfg.times && cfg.times[lado] && cfg.times[lado].titulares ? [...cfg.times[lado].titulares] : null;
      if (tit) {
        for (const e of [...(cfg.eventos || [])].reverse()) if (e.tipo === "sub" && e.lado === lado) { const i = tit.indexOf(e.entra); if (i >= 0 && !tit.includes(e.sai)) tit[i] = e.sai; }
        for (const e of cfg.eventos || []) if (e.tipo === "vermelho" && e.lado === lado && e.jogador && !tit.includes(e.jogador) && tit.length < S.spots[lado].length) tit.push(e.jogador);
      }
      const n = tit ? tit.length : 11;
      for (let i = 0; i < Math.min(n, S.spots[lado].length); i++) criar(lado, i, tit ? tit[i] : null);
    }
    relayout(0);
    ligarRitmo();
  }
  function evento(e) {
    if (!S || !M.ligada) return;
    if (M.rapido && !["gol", "penalti"].includes(e.tipo) && S.fila.length > 8) S.fila.shift();
    S.fila.push(e); bombear();
  }
  function parar() { if (S) { S.fila.length = 0; } }
  const api = { montar, evento, parar, reiniciar: (p) => S && reiniciar(p, 0) };
  Object.defineProperties(api, {
    vel: { get: () => M.vel, set: (v) => { M.vel = v || 1; } },
    ativa: { get: () => M.ativa, set: (v) => { M.ativa = !!v; } },
    rapido: { get: () => M.rapido, set: (v) => { M.rapido = !!v; } },
    ligada: { get: () => M.ligada, set: (v) => { M.ligada = !!v; } },
    montada: { get: () => !!S },
  });
  return api;
})();
