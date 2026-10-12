// Arrancada JDM — as regras do drag (UMD): a garagem de carros japoneses, as peças de tuning, as contas de fisica do
// 1/4 de milha e as apostas. O servidor roda a corrida; o navegador usa as mesmas contas para mostrar a estimativa.
// Os números dos carros são os de fábrica (aproximados), na falta de uma API de fichas técnicas: ver drag.js.
(function (root) {
  const G = 9.81, QUARTO = 402.34; // 1/4 de milha em metros
  // frac: quanto do peso cai sobre as rodas que puxam (dianteira-traseira, central-traseira, dianteira, integral)
  const CARROS = [
    { id: "ae86", marca: "Toyota", nome: "Sprinter Trueno AE86", ano: 1985, motor: "1.6 4A-GE", hp: 130, kg: 940, trac: "RWD", frac: 0.62, cda: 0.62, preco: 250, cor: "#f4f4f2", cor2: "#16161a" },
    { id: "mx5", marca: "Mazda", nome: "Eunos Roadster NA", ano: 1992, motor: "1.6 B6", hp: 120, kg: 940, trac: "RWD", frac: 0.62, cda: 0.6, preco: 220, cor: "#d63a2f", cor2: "#8a1c14" },
    { id: "ek9", marca: "Honda", nome: "Civic Type R EK9", ano: 1997, motor: "1.6 B16B", hp: 185, kg: 1050, trac: "FWD", frac: 0.58, cda: 0.64, preco: 320, cor: "#f2f2ee", cor2: "#c8102e" },
    { id: "s15", marca: "Nissan", nome: "Silvia S15 Spec-R", ano: 1999, motor: "2.0 SR20DET turbo", hp: 250, kg: 1240, trac: "RWD", frac: 0.64, cda: 0.64, preco: 460, cor: "#7ec8e8", cor2: "#2b6f94" },
    { id: "sw20", marca: "Toyota", nome: "MR2 GT-S SW20", ano: 1995, motor: "2.0 3S-GTE turbo", hp: 245, kg: 1250, trac: "RWD", frac: 0.74, cda: 0.62, preco: 450, cor: "#f2c315", cor2: "#a37e00" },
    { id: "gc8", marca: "Subaru", nome: "Impreza WRX STI GC8", ano: 1998, motor: "2.0 EJ207 turbo", hp: 280, kg: 1330, trac: "AWD", frac: 0.92, cda: 0.68, preco: 520, cor: "#1c46c9", cor2: "#0d2a85" },
    { id: "evo6", marca: "Mitsubishi", nome: "Lancer Evolution VI", ano: 1999, motor: "2.0 4G63 turbo", hp: 280, kg: 1360, trac: "AWD", frac: 0.92, cda: 0.7, preco: 540, cor: "#d8d8dc", cor2: "#e1261c" },
    { id: "fd3s", marca: "Mazda", nome: "RX-7 FD3S", ano: 1999, motor: "13B-REW biturbo", hp: 280, kg: 1280, trac: "RWD", frac: 0.64, cda: 0.62, preco: 580, cor: "#f26a1b", cor2: "#a63d08" },
    { id: "na1", marca: "Honda", nome: "NSX NA1", ano: 1991, motor: "3.0 V6 C30A", hp: 280, kg: 1350, trac: "RWD", frac: 0.74, cda: 0.62, preco: 650, cor: "#c8102e", cor2: "#7a0a1c" },
    { id: "bnr32", marca: "Nissan", nome: "Skyline GT-R R32", ano: 1991, motor: "2.6 RB26DETT", hp: 280, kg: 1480, trac: "AWD", frac: 0.9, cda: 0.7, preco: 620, cor: "#5a5f6b", cor2: "#2a2d34" },
    { id: "jza80", marca: "Toyota", nome: "Supra RZ JZA80", ano: 1996, motor: "3.0 2JZ-GTE biturbo", hp: 320, kg: 1510, trac: "RWD", frac: 0.64, cda: 0.66, preco: 720, cor: "#e8a41a", cor2: "#8a5d06" },
    { id: "bnr34", marca: "Nissan", nome: "Skyline GT-R R34", ano: 1999, motor: "2.6 RB26DETT", hp: 330, kg: 1560, trac: "AWD", frac: 0.92, cda: 0.68, preco: 780, cor: "#4a7bd6", cor2: "#1d3f86" },
  ];
  const carroPorId = (id) => CARROS.find((c) => c.id === id) || null;

  // peças de tuning: níveis 0 a 3; custo[i] é o preço de subir para o nível i+1
  const PECAS = {
    turbo: { nome: "Turbo / motor", icone: "🌀", custo: [150, 220, 340], desc: "Mais cavalos: +12%, +26%, +45%.", efeito: [1, 1.12, 1.26, 1.45] },
    pneus: { nome: "Pneus", icone: "🛞", custo: [90, 140, 230], desc: "Mais aderência: sem pneu bom, o carro patina na largada.", efeito: [1, 1.12, 1.26, 1.42] },
    peso: { nome: "Redução de peso", icone: "🪶", custo: [100, 150, 250], desc: "Tira banco, vidro e lastro: -40, -90, -150 kg.", efeito: [0, 40, 90, 150] },
    cambio: { nome: "Câmbio curto", icone: "⚙️", custo: [80, 120, 200], desc: "Trocas de marcha mais rápidas.", efeito: [0.22, 0.16, 0.11, 0.07] },
    nitro: { nome: "Nitro (NOS)", icone: "💨", custo: [110, 160, 260], desc: "Um tiro de +32% de potência: 1,6 s, 2,6 s ou 3,6 s. Você escolhe a hora.", efeito: [0, 1.6, 2.6, 3.6] },
  };
  const NOS_REFORCO = 0.32;
  const NIVEL_MAX = 3;
  const custoDaPeca = (peca, nivel) => (PECAS[peca] && nivel >= 1 && nivel <= NIVEL_MAX ? PECAS[peca].custo[nivel - 1] : null);
  const pecasZeradas = () => ({ turbo: 0, pneus: 0, peso: 0, cambio: 0, nitro: 0 });
  const gastoEmPecas = (pecas) => Object.keys(PECAS).reduce((s, k) => { let t = 0; for (let n = 1; n <= (pecas[k] || 0); n++) t += PECAS[k].custo[n - 1]; return s + t; }, 0);

  // os números do carro com as peças
  function ficha(carro, pecas = pecasZeradas()) {
    const nv = (k) => Math.max(0, Math.min(NIVEL_MAX, pecas[k] | 0));
    const eta = carro.trac === "AWD" ? 0.8 : carro.trac === "FWD" ? 0.87 : 0.85;
    return {
      hp: carro.hp * PECAS.turbo.efeito[nv("turbo")], kg: carro.kg - PECAS.peso.efeito[nv("peso")],
      mu: 1.05 * PECAS.pneus.efeito[nv("pneus")], corte: PECAS.cambio.efeito[nv("cambio")], nosDur: PECAS.nitro.efeito[nv("nitro")],
      eta, frac: carro.frac, cda: carro.cda,
    };
  }

  // o carro correndo. delay = quando ele sai (segundos depois do verde); o relógio dele (t) começa na saída.
  const MARCHAS = [10, 19, 29, 41, 54]; // velocidade (m/s) em que troca para a próxima marcha
  function novoCorredor(ficha_, delay = 0.2) {
    return { f: ficha_, x: 0, v: 0, t: 0, marcha: 0, cutRest: 0, nosRest: 0, nosUsado: false, delay, fim: null, vfim: null, patina: false };
  }
  function passo(c, dt) {
    if (c.fim != null) return;
    const f = c.f;
    c.t += dt;
    let pot = f.hp * 745.7 * f.eta;
    if (c.nosRest > 0) { pot *= 1 + NOS_REFORCO; c.nosRest = Math.max(0, c.nosRest - dt); }
    if (c.cutRest > 0) { c.cutRest -= dt; pot = 0; }
    else if (c.marcha < MARCHAS.length && c.v >= MARCHAS[c.marcha]) { c.marcha++; c.cutRest = f.corte; }
    const fe = pot / Math.max(c.v, 4);
    const ft = f.mu * f.kg * G * f.frac;
    c.patina = fe > ft * 1.02 && c.cutRest <= 0;
    const tracao = c.patina ? ft * 0.94 : fe; // girou em falso: perde um pouco
    const arrasto = 0.5 * 1.2 * f.cda * c.v * c.v + 0.015 * f.kg * G;
    const a = (tracao - arrasto) / (f.kg * 1.06);
    const v0 = c.v;
    c.v = Math.max(0, c.v + a * dt);
    const dx = (v0 + c.v) / 2 * dt;
    c.x += dx;
    if (c.x >= QUARTO) { c.fim = c.t - (c.x - QUARTO) / Math.max(c.v, 1); c.vfim = c.v; c.x = QUARTO; }
  }
  function usarNitro(c) {
    if (c.nosUsado || c.f.nosDur <= 0 || c.fim != null) return false;
    c.nosUsado = true; c.nosRest = c.f.nosDur; return true;
  }
  // corre sozinho (testes, estimativa e robôs): nitro no instante tNos (segundos depois de sair), null = sem nitro
  function correrSozinho(f, tNos = null, delay = 0) {
    const c = novoCorredor(f, delay);
    for (let i = 0; i < 6000 && c.fim == null; i++) {
      if (tNos != null && !c.nosUsado && c.t >= tNos) usarNitro(c);
      passo(c, 0.01);
    }
    return c;
  }
  // a estimativa de quanto o carro faz o 1/4 de milha, com o melhor momento de usar o nitro
  function estimar(f) {
    let melhor = null;
    for (const tn of f.nosDur > 0 ? [0.5, 1, 1.5, 2, 3, 4, 5, 6] : [null]) {
      const c = correrSozinho(f, tn);
      if (!melhor || c.fim < melhor.fim) melhor = c;
    }
    return { tempo: melhor.fim, vel: melhor.vfim * 3.6 };
  }

  // apostas pari-mutuel: quem apostou no vencedor divide tudo o que foi apostado, na proporção do que pôs.
  // Se ninguém apostou no vencedor, devolve as apostas.
  function pagar(apostas, vencedor) {
    const total = apostas.reduce((s, a) => s + a.valor, 0);
    const noVencedor = apostas.filter((a) => a.alvo === vencedor).reduce((s, a) => s + a.valor, 0);
    return apostas.map((a) => {
      if (!noVencedor) return { id: a.id, valor: a.valor, ganho: a.valor, delta: 0 };
      const ganho = a.alvo === vencedor ? Math.floor((a.valor * total) / noVencedor) : 0;
      return { id: a.id, valor: a.valor, ganho, delta: ganho - a.valor };
    });
  }

  const api = { G, QUARTO, CARROS, carroPorId, PECAS, NIVEL_MAX, NOS_REFORCO, custoDaPeca, pecasZeradas, gastoEmPecas, ficha, novoCorredor, passo, usarNitro, correrSozinho, estimar, pagar };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Drag = api;
})(typeof window !== "undefined" ? window : globalThis);
