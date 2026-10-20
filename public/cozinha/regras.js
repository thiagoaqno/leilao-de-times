// Cozinha da Galera — as regras, iguais no servidor (require) e no navegador (window.Cozinha).
// Tudo o que é comida é DADO: ingredientes (a cadeia de estados de cada um), processos (picar, cozinhar, fritar),
// recipientes (panela, frigideira, prato), receitas (as do Overcooked) e cozinhas (um desenho de texto com a legenda).
// O motor só sabe juntar uma coisa na outra, andar os processos e contar os pedidos: cozinha ou receita nova não
// mexe aqui embaixo.
(function (raiz, fabrica) {
  const C = fabrica();
  if (typeof module === "object" && module.exports) module.exports = C;
  else raiz.Cozinha = C;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- medidas ----------
  const TILE = 1.5;            // uma casa da cozinha (o boneco tem ~1,9 de altura)
  const RAIO = 0.42;           // o cozinheiro é um círculo no chão
  const MOV = { vel: 6.2, acel: 55, freio: 45, dash: 17, dashT: 0.13, dashRec: 0.5 };
  const TEMPOS = {
    conta: 7,         // tempo para ler as fichas das receitas antes de abrir a cozinha
    lavar: 2.2,       // cada prato na pia
    voltaPrato: 9,    // o prato sujo volta este tempo depois da entrega
    gorjeta: 8,       // a gorjeta máxima (entregando o pedido logo que ele chega)
    multa: 10,        // pedido que vence sem ser entregue
    alerta: 0.45,     // fração do tempo de queimar em que a panela começa a apitar
  };

  // ---------- processos e ingredientes ----------
  // cada processo leva o ingrediente de um estado para o próximo; "onde" é a bancada (tábua) ou o recipiente
  const PROCESSOS = {
    picar: { onde: "tabua", para: "picado", nome: "Picar" },
    cozinhar: { onde: "panela", para: "cozido", nome: "Cozinhar" },
    fritar: { onde: "frigideira", para: "frito", nome: "Fritar" },
  };
  // passos: a cadeia do ingrediente (cru → ...); picar: segundos na tábua; cor e forma: o desenho
  const INGREDIENTES = {
    cebola: { nome: "Cebola", fem: true, passos: ["picar", "cozinhar"], picar: 2.4, cor: "#e9d6a8", cor2: "#b3742f", forma: "bola" },
    tomate: { nome: "Tomate", passos: ["picar", "cozinhar"], picar: 2.2, cor: "#e33b2c", cor2: "#3f9a3a", forma: "bola" },
    cogumelo: { nome: "Cogumelo", passos: ["picar", "cozinhar"], picar: 2.2, cor: "#c89a6a", cor2: "#f2e6d2", forma: "cogumelo" },
    alface: { nome: "Alface", fem: true, passos: ["picar"], picar: 2.4, cor: "#7fcf4a", cor2: "#4e9a2a", forma: "bola" },
    pepino: { nome: "Pepino", passos: ["picar"], picar: 2.4, cor: "#3f8f3a", cor2: "#cfe8a8", forma: "comprido" },
    carne: { nome: "Carne", fem: true, passos: ["picar", "fritar"], picar: 2.6, cor: "#c0444a", cor2: "#f2c4c0", forma: "bife" },
    pao: { nome: "Pão", passos: [], cor: "#e0a050", cor2: "#f6e2b0", forma: "pao" },
    peixe: { nome: "Peixe", passos: ["picar"], picar: 2.6, cor: "#f08a5a", cor2: "#ffe0cc", forma: "peixe" },
    arroz: { nome: "Arroz", passos: ["cozinhar"], cor: "#f4f1e6", cor2: "#d8d2bc", forma: "saco" },
    alga: { nome: "Alga", fem: true, passos: [], cor: "#1f3a2a", cor2: "#2f5a3e", forma: "folha" },
  };
  const NOME_ESTADO = { cru: "", picado: "picad", cozido: "cozid", frito: "frit", queimado: "queimad" }; // + "a" ou "o"
  // os estados de um ingrediente, em ordem (cru primeiro)
  const estadosDe = (t) => ["cru", ...INGREDIENTES[t].passos.map((p) => PROCESSOS[p].para)];
  // o próximo processo do ingrediente (null se já está no fim da cadeia ou queimou)
  function proximoPasso(ing) {
    const def = INGREDIENTES[ing.t]; if (!def) return null;
    const i = estadosDe(ing.t).indexOf(ing.e);
    return i >= 0 && i < def.passos.length ? def.passos[i] : null;
  }

  // ---------- recipientes ----------
  // tempo: segundos por ingrediente dentro; queima: segundos depois de pronto até queimar
  const RECIPIENTES = {
    panela: { nome: "Panela", cap: 3, processo: "cozinhar", tempo: 4.5, queima: 11 },
    frigideira: { nome: "Frigideira", cap: 1, processo: "fritar", tempo: 6, queima: 9 },
  };

  // ---------- receitas (as do Overcooked) ----------
  // itens: "ingrediente:estado", com repetição; pontos: o valor do pedido; tempo: a paciência do cliente
  const RECEITAS = {
    sopa_cebola: { nome: "Sopa de cebola", itens: ["cebola:cozido", "cebola:cozido", "cebola:cozido"], pontos: 20, tempo: 75, sopa: true },
    sopa_tomate: { nome: "Sopa de tomate", itens: ["tomate:cozido", "tomate:cozido", "tomate:cozido"], pontos: 20, tempo: 75, sopa: true },
    sopa_cogumelo: { nome: "Sopa de cogumelo", itens: ["cogumelo:cozido", "cogumelo:cozido", "cogumelo:cozido"], pontos: 20, tempo: 75, sopa: true },
    salada: { nome: "Salada", itens: ["alface:picado"], pontos: 10, tempo: 55 },
    salada_tomate: { nome: "Salada com tomate", itens: ["alface:picado", "tomate:picado"], pontos: 15, tempo: 65 },
    salada_completa: { nome: "Salada completa", itens: ["alface:picado", "tomate:picado", "pepino:picado"], pontos: 20, tempo: 75 },
    hamburguer: { nome: "Hambúrguer", itens: ["pao:cru", "carne:frito"], pontos: 20, tempo: 75 },
    hamburguer_alface: { nome: "Hambúrguer com alface", itens: ["pao:cru", "carne:frito", "alface:picado"], pontos: 25, tempo: 85 },
    hamburguer_completo: { nome: "Hambúrguer completo", itens: ["pao:cru", "carne:frito", "alface:picado", "tomate:picado"], pontos: 30, tempo: 95 },
    sushi_peixe: { nome: "Sushi de peixe", itens: ["peixe:picado", "arroz:cozido", "alga:cru"], pontos: 25, tempo: 85 },
  };
  const chaveIng = (ing) => ing.t + ":" + ing.e;
  function contagem(lista) { const m = new Map(); for (const k of lista) m.set(k, (m.get(k) || 0) + 1); return m; }
  // cabe: o conteúdo é parte de alguma receita do cardápio (o prato não aceita o que não leva a receita nenhuma)
  function cabe(conteudo, cardapio) {
    const tem = contagem(conteudo.map(chaveIng));
    return cardapio.some((id) => { const precisa = contagem(RECEITAS[id].itens); for (const [k, n] of tem) if ((precisa.get(k) || 0) < n) return false; return true; });
  }
  // a receita que está pronta no prato (ou null)
  function receitaDe(conteudo, cardapio = Object.keys(RECEITAS)) {
    if (!conteudo.length) return null;
    const tem = contagem(conteudo.map(chaveIng));
    for (const id of cardapio) {
      const precisa = contagem(RECEITAS[id].itens);
      if (precisa.size === tem.size && [...precisa].every(([k, n]) => tem.get(k) === n)) return id;
    }
    return null;
  }

  // ---------- as cozinhas ----------
  // mapa: "." chão, "#" bancada, "=" tábua, "F" fogão com panela, "f" fogão com frigideira, "P" pia, "E" escorredor
  // (os pratos limpos), "S" entrega, "R" volta dos pratos sujos, "L" lixo, "W" parede, " " nada; "1" a "4" onde cada
  // cozinheiro começa; as letras da legenda são as caixas de ingrediente.
  // as metas das estrelas são calculadas por metaDe para cada número de cozinheiros
  const COZINHAS = {
    "1-1": {
      nome: "Sopa de cebola", desc: "A primeira cozinha: pique a cebola, três na panela, sirva no prato e lave a louça.",
      mapa: [
        "#oo#==#SS##",
        "#.........F",
        "E....1....F",
        "P.........#",
        "#....2....L",
        "#.........#",
        "#R#==##oo##",
      ],
      legenda: { o: "cebola" }, receitas: ["sopa_cebola"], tempo: 180, pratos: 3,
      pedidos: { max: 4, inicio: 2, intervalo: [16, 24] },
    },
    "1-2": {
      nome: "Sopas da casa", desc: "Cebola e tomate, cada sopa na sua panela. A bancada do meio divide a cozinha.",
      mapa: [
        "#oo###SS#tt#",
        "#....#.....F",
        "=..1.#..2..F",
        "=....#.....F",
        "#..........#",
        "E....#.....L",
        "#PR###=##=##",
      ],
      legenda: { o: "cebola", t: "tomate" }, receitas: ["sopa_cebola", "sopa_tomate"], tempo: 210, pratos: 4,
      pedidos: { max: 4, inicio: 2, intervalo: [14, 22] },
    },
    "1-3": {
      nome: "Lanchonete", desc: "Saladas e hambúrguer: pique a alface e o tomate, frite a carne e monte o lanche.",
      mapa: [
        "#aa#tt#cc#pp#",
        "#...........#",
        "=...1...2...f",
        "=...........f",
        "#...#####...#",
        "S...........L",
        "S...........#",
        "#PE#R#==#####",
      ],
      legenda: { a: "alface", t: "tomate", c: "carne", p: "pao" }, receitas: ["salada", "salada_tomate", "hamburguer", "hamburguer_alface"], tempo: 240, pratos: 4,
      pedidos: { max: 5, inicio: 2, intervalo: [12, 20] },
    },
  };
  // Planejador compartilhado: caminho mais curto pelo chão até uma bancada. O robô pode seguir estes mesmos pontos.
  function rota(mapa, origem, bancada) {
    const c0 = Math.floor(origem[0] / TILE), r0 = Math.floor(origem[1] / TILE), chave = (c, r) => c + "," + r;
    const livres = new Set([[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => chave(bancada.c + dc, bancada.r + dr)));
    const fila = [[c0, r0]], anterior = new Map([[chave(c0, r0), null]]);
    for (let k = 0; k < fila.length; k++) {
      const [c, r] = fila[k], id = chave(c, r);
      if (livres.has(id)) { const caminho = []; let atual = id; while (atual) { const [x, z] = atual.split(",").map(Number); caminho.push([(x + 0.5) * TILE, (z + 0.5) * TILE]); atual = anterior.get(atual); } return caminho.reverse(); }
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr, nid = chave(nc, nr);
        if (nc < 0 || nr < 0 || nc >= mapa.w || nr >= mapa.h || solido(mapa, nc, nr) || anterior.has(nid)) continue;
        anterior.set(nid, id); fila.push([nc, nr]);
      }
    }
    return [];
  }
  function tempoEntre(mapa, a, b) {
    if (!a || !b) return 0;
    const vizinhos = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => [a.c + dc, a.r + dr]).filter(([c, r]) => !solido(mapa, c, r));
    return Math.min(...vizinhos.map(([c, r]) => {
      const pontos = rota(mapa, [(c + 0.5) * TILE, (r + 0.5) * TILE], b);
      return pontos.length ? (pontos.length - 1) * TILE / MOV.vel : Infinity;
    }));
  }
  // Uma cozinha sem erros, sem espera por pedidos e com as distâncias reais do mapa. Trabalho independente é dividido
  // entre os cozinheiros; a tábua, o fogão e a travessia final continuam limitando o tempo de cada prato.
  function simularPerfeito(coz, n) {
    const mapa = montarMapa(coz), tiles = mapa.tiles, de = (tipo, f = () => true) => tiles.filter((t) => t.tipo === tipo && f(t));
    const maisPerto = (a, candidatos) => candidatos.reduce((melhor, t) => !melhor || tempoEntre(mapa, a, t) < tempoEntre(mapa, a, melhor) ? t : melhor, null);
    const esc = de("escorredor")[0], ent = de("entrega")[0], ret = de("retorno")[0], pia = de("pia")[0];
    const duracoes = coz.receitas.map((id) => {
      const R = RECEITAS[id], tabuas = de("tabua"), fogoes = de("fogao"), trabalhos = [];
      let cozimento = 0, usado = null;
      for (const chaveIng of R.itens) {
        const [tipo, estado] = chaveIng.split(":"), ing = INGREDIENTES[tipo], caixa = de("caixa", (t) => t.ing === tipo)[0];
        let ultimo = caixa, dur = 0.55, passos = ing.passos.slice(0, estadosDe(tipo).indexOf(estado));
        for (const passo of passos) {
          if (passo === "picar") { const tab = maisPerto(ultimo, tabuas); dur += tempoEntre(mapa, ultimo, tab) + ing.picar + 0.4; ultimo = tab; }
          else { const fog = maisPerto(ultimo, fogoes.filter((t) => t.rec === (passo === "fritar" ? "frigideira" : "panela"))); dur += tempoEntre(mapa, ultimo, fog) + 0.35; usado = fog; cozimento += RECIPIENTES[fog.rec].tempo; ultimo = fog; }
        }
        if (!passos.some((p) => p === "cozinhar" || p === "fritar")) dur += tempoEntre(mapa, ultimo, esc) + 0.35;
        trabalhos.push(dur);
      }
      const preparo = trabalhos.reduce((a, b) => a + b, 0) / Math.min(n, Math.max(1, de("tabua").length));
      const base = usado || esc, servir = tempoEntre(mapa, esc, base) + tempoEntre(mapa, base, ent) + 1.3;
      const lavar = ret && pia ? (tempoEntre(mapa, ret, pia) + tempoEntre(mapa, pia, esc) + TEMPOS.lavar) / Math.max(1, coz.pratos) : 0;
      return Math.max(Math.max(...trabalhos), preparo) + cozimento + servir + lavar;
    });
    let tempo = 0, pontos = 0, combo = 0, pratos = 0;
    while (pratos < 100) {
      const idx = pratos % coz.receitas.length, dur = duracoes[idx];
      tempo += dur; if (tempo > coz.tempo) break;
      combo = Math.min(4, combo + 1); pontos += (RECEITAS[coz.receitas[idx]].pontos + TEMPOS.gorjeta) * combo; pratos++;
    }
    return { pontos, pratos, duracoes, tempo };
  }
  const metaDe = (coz, n) => {
    const maximo = simularPerfeito(coz, Math.max(1, Math.min(4, n))).pontos;
    return [0.35, 0.60, 0.85].map((f) => Math.max(5, Math.round(maximo * f / 5) * 5));
  };

  // ---------- o mapa ----------
  const SIMBOLOS = { "#": "balcao", "=": "tabua", F: "fogao", f: "fogao", P: "pia", E: "escorredor", S: "entrega", R: "retorno", L: "lixo", W: "parede", " ": "vazio" };
  const CHAO = new Set([".", "1", "2", "3", "4"]);
  const USAVEL = new Set(["balcao", "tabua", "fogao", "pia", "escorredor", "entrega", "retorno", "lixo", "caixa"]);
  // monta a grade: tiles (só as bancadas, com índice), o chão e onde cada um começa. Não guarda estado de jogo.
  function montarMapa(coz) {
    const h = coz.mapa.length, w = Math.max(...coz.mapa.map((l) => l.length));
    const grade = [], tiles = [], inicio = [];
    for (let r = 0; r < h; r++) {
      grade.push([]);
      for (let c = 0; c < w; c++) {
        const ch = coz.mapa[r][c] ?? " ";
        if (CHAO.has(ch)) { grade[r].push(null); if (ch !== ".") inicio[+ch - 1] = [(c + 0.5) * TILE, (r + 0.5) * TILE]; continue; }
        const tipo = coz.legenda && coz.legenda[ch] ? "caixa" : SIMBOLOS[ch] || "balcao";
        const t = { i: tiles.length, c, r, tipo, ch };
        if (tipo === "caixa") t.ing = coz.legenda[ch];
        if (ch === "F") t.rec = "panela";
        if (ch === "f") t.rec = "frigideira";
        tiles.push(t); grade[r].push(t);
      }
    }
    // quem não tem lugar marcado começa perto do primeiro
    for (let k = 0; k < 4; k++) if (!inicio[k]) { const b = inicio[0] || [w * TILE / 2, h * TILE / 2]; inicio[k] = [b[0] + (k % 2 ? 1 : -1) * TILE * 0.8, b[1] + (k > 1 ? TILE * 0.8 : 0)]; }
    return { w, h, W: w * TILE, H: h * TILE, grade, tiles, inicio };
  }
  const tileEm = (mapa, c, r) => (r < 0 || c < 0 || r >= mapa.h || c >= mapa.w ? { tipo: "vazio" } : mapa.grade[r][c]);
  const solido = (mapa, c, r) => !!tileEm(mapa, c, r);

  // ---------- movimento (o navegador roda; o servidor confere) ----------
  const frente = (d) => [-Math.sin(d), -Math.cos(d)]; // o boneco olha para -z quando d = 0
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // empurra o círculo para fora das bancadas e das bordas
  function colidir(mapa, j) {
    for (let k = 0; k < 2; k++) {
      const c0 = Math.floor(j.x / TILE), r0 = Math.floor(j.z / TILE);
      for (let r = r0 - 1; r <= r0 + 1; r++) for (let c = c0 - 1; c <= c0 + 1; c++) {
        if (!solido(mapa, c, r)) continue;
        const px = clamp(j.x, c * TILE, (c + 1) * TILE), pz = clamp(j.z, r * TILE, (r + 1) * TILE);
        let dx = j.x - px, dz = j.z - pz, d = Math.hypot(dx, dz);
        if (d >= RAIO) continue;
        if (d < 1e-6) { // o centro entrou na casa: sai pelo lado mais perto
          const cx = (c + 0.5) * TILE, cz = (r + 0.5) * TILE; dx = j.x - cx; dz = j.z - cz;
          if (Math.abs(dx) > Math.abs(dz)) { j.x = cx + Math.sign(dx || 1) * (TILE / 2 + RAIO); j.vx = 0; } else { j.z = cz + Math.sign(dz || 1) * (TILE / 2 + RAIO); j.vz = 0; }
          continue;
        }
        const em = RAIO - d; j.x += (dx / d) * em; j.z += (dz / d) * em;
        const vn = (j.vx * dx + j.vz * dz) / d; if (vn < 0) { j.vx -= (vn * dx) / d; j.vz -= (vn * dz) / d; }
      }
    }
  }
  // um passo do cozinheiro: ent = { x, z } (de -1 a 1, o direcional) e dash (apertou o impulso)
  function mover(mapa, j, ent, dt) {
    let mx = ent.x || 0, mz = ent.z || 0;
    const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
    if (len > 0.15) j.d = Math.atan2(-mx, -mz);
    j.dashRec = Math.max(0, (j.dashRec || 0) - dt);
    if (ent.dash && j.dashRec <= 0) { j.dashT = MOV.dashT; j.dashRec = MOV.dashRec; }
    if (j.dashT > 0) {
      const [fx, fz] = frente(j.d || 0); j.dashT -= dt; j.vx = fx * MOV.dash; j.vz = fz * MOV.dash;
    } else {
      const tx = mx * MOV.vel, tz = mz * MOV.vel, a = (len > 0.15 ? MOV.acel : MOV.freio) * dt;
      const dvx = tx - j.vx, dvz = tz - j.vz, dv = Math.hypot(dvx, dvz);
      if (dv <= a || dv < 1e-9) { j.vx = tx; j.vz = tz; } else { j.vx += (dvx / dv) * a; j.vz += (dvz / dv) * a; }
    }
    // resolve cada eixo separadamente para deslizar pela quina em vez de travar a diagonal inteira
    j.x += j.vx * dt; colidir(mapa, j);
    j.z += j.vz * dt; colidir(mapa, j);
  }
  // os cozinheiros não se atravessam: cada um se afasta do outro (o navegador faz com os outros que ele vê)
  function afastar(j, outro) {
    const dx = j.x - outro.x, dz = j.z - outro.z, d = Math.hypot(dx, dz), min = RAIO * 2;
    if (d >= min || d < 1e-6) return;
    j.x += (dx / d) * (min - d); j.z += (dz / d) * (min - d);
  }

  // ---------- a bancada da frente ----------
  // a casa usável mais bem alinhada com a frente do cozinheiro (até ~1,2 casa de distância)
  function alvo(mapa, j) {
    const [fx, fz] = frente(j.d || 0), c0 = Math.floor(j.x / TILE), r0 = Math.floor(j.z / TILE);
    let melhor = null, nota = -Infinity;
    for (let r = r0 - 1; r <= r0 + 1; r++) for (let c = c0 - 1; c <= c0 + 1; c++) {
      const t = tileEm(mapa, c, r); if (!t || !USAVEL.has(t.tipo)) continue;
      const dx = (c + 0.5) * TILE - j.x, dz = (r + 0.5) * TILE - j.z, d = Math.hypot(dx, dz);
      if (d > TILE * 1.3) continue;
      const alinhado = (dx * fx + dz * fz) / d; if (alinhado < 0.3) continue;
      const n = alinhado * 2 - d / TILE; // bem na frente e perto ganha
      if (n > nota) { nota = n; melhor = t; }
    }
    return melhor;
  }

  // ---------- as coisas ----------
  const novoIng = (t) => ({ k: "ing", t, e: "cru", p: 0 });
  const novoRec = (k) => ({ k, c: [], p: 0, q: false });
  const novoPrato = () => ({ k: "prato", c: [] });
  const ehRec = (o) => o && RECIPIENTES[o.k];
  const tempoRec = (o) => RECIPIENTES[o.k].tempo * o.c.length;
  const pronto = (o) => ehRec(o) && o.c.length > 0 && !o.q && o.p >= tempoRec(o);

  // põe "orig" dentro de "dest" (mexe nos dois). Devolve true se coube.
  function colocar(dest, orig, cardapio) {
    if (!dest || !orig || dest === orig) return false;
    if (ehRec(dest)) {
      const R = RECIPIENTES[dest.k];
      if (orig.k !== "ing" || dest.q || dest.c.length >= R.cap || proximoPasso(orig) !== R.processo) return false;
      dest.p = Math.min(dest.p, R.tempo * dest.c.length); // o que já estava pronto espera o novo cozinhar (e o queimar recomeça)
      dest.c.push({ t: orig.t, e: orig.e }); return true;
    }
    if (dest.k === "prato") {
      if (orig.k === "ing") {
        if (!cabe([...dest.c, orig], cardapio)) return false;
        dest.c.push({ t: orig.t, e: orig.e }); return true;
      }
      if (ehRec(orig)) { // a sopa (ou a carne frita) vai para o prato
        if (!pronto(orig) || !cabe([...dest.c, ...orig.c], cardapio)) return false;
        dest.c.push(...orig.c.map((i) => ({ t: i.t, e: i.e }))); orig.c = []; orig.p = 0; return true;
      }
    }
    return false;
  }
  // juntar o que está na mão com o que está na bancada (a regra de "encostar uma coisa na outra" do Overcooked).
  // Devolve { mao, alvo } (o que fica em cada lugar) ou null se não juntou.
  function juntar(mao, noLugar, cardapio) {
    if (colocar(noLugar, mao, cardapio)) return { mao: mao.k === "ing" ? null : mao, alvo: noLugar };
    if (colocar(mao, noLugar, cardapio)) return { mao, alvo: noLugar.k === "ing" ? null : noLugar };
    return null;
  }
  // o que cada bancada aceita em cima
  function aceita(t, o) {
    if (t.tipo === "fogao") return !!ehRec(o);
    return t.tipo === "balcao" || t.tipo === "tabua" || t.tipo === "caixa";
  }

  // ---------- a partida ----------
  function novaPartida(cozId, jogadores, opcoes = {}) {
    const coz = COZINHAS[cozId] || COZINHAS["1-1"], mapa = montarMapa(coz);
    const m = {
      coz: COZINHAS[cozId] ? cozId : "1-1", mapa, fase: "conta", t: -TEMPOS.conta, resta: coz.tempo, pontos: 0,
      meta: metaDe(coz, jogadores.length), estrelas: 0, entregues: 0, perdidos: 0, gorjetas: 0, combo: 0,
      pedidos: [], seqPedido: 0, proxPedido: 0, voltando: [], voando: [], caidos: [], seqVoo: 0, ev: [], versao: 1,
      rng: opcoes.rng || Math.random,
      estado: mapa.tiles.map((t) => ({ item: t.rec ? novoRec(t.rec) : null, n: 0, p: 0 })),
      jogadores: jogadores.map((jg, k) => ({ id: jg.id, nome: jg.nome, skin: jg.skin, x: mapa.inicio[k][0], z: mapa.inicio[k][1], vx: 0, vz: 0, d: Math.PI, mao: null, trab: null })),
    };
    // os pratos limpos começam no primeiro escorredor (sem escorredor, num balcão vazio)
    const esc = mapa.tiles.find((t) => t.tipo === "escorredor");
    if (esc) m.estado[esc.i].n = coz.pratos;
    else for (let k = 0, i = 0; k < coz.pratos && i < mapa.tiles.length; i++) if (mapa.tiles[i].tipo === "balcao" && !m.estado[i].item) { m.estado[i].item = novoPrato(); k++; }
    return m;
  }
  const cozDe = (m) => COZINHAS[m.coz];
  const mudou = (m) => { m.versao++; };
  const evento = (m, e) => { m.ev.push(e); };

  function novoPedido(m) {
    const coz = cozDe(m), r = coz.receitas[Math.floor(m.rng() * coz.receitas.length)], dur = RECEITAS[r].tempo;
    m.pedidos.push({ id: ++m.seqPedido, r, ini: m.t, ate: m.t + dur });
    evento(m, { tipo: "pedido", r }); mudou(m);
  }

  // pegar / soltar / juntar na bancada da frente
  function interagir(m, j) {
    if (m.fase !== "jogo") return false;
    if (!j.mao) {
      const k = m.caidos.findIndex((o) => Math.hypot(j.x - o.x, j.z - o.z) < 0.9);
      if (k >= 0) { j.mao = m.caidos.splice(k, 1)[0].item; evento(m, { tipo: "pegou", j: j.id }); mudou(m); return true; }
    }
    const t = alvo(m.mapa, j); if (!t) return false;
    const s = m.estado[t.i], mao = j.mao, card = cozDe(m).receitas;
    const feito = (tipo, extra) => { j.trab = null; evento(m, { tipo, j: j.id, i: t.i, ...extra }); mudou(m); return true; };
    switch (t.tipo) {
      case "escorredor":
        if (!mao && s.n > 0) { s.n--; j.mao = novoPrato(); return feito("pegou"); }
        if (mao && mao.k === "prato" && !mao.c.length) { s.n++; j.mao = null; return feito("soltou"); }
        return false;
      case "pia":
        if (mao && mao.k === "sujos") { s.n += mao.n; j.mao = null; return feito("soltou"); }
        return false;
      case "retorno":
        if (!mao && s.item) { j.mao = s.item; s.item = null; return feito("pegou"); }
        return false;
      case "lixo":
        if (!mao) return false;
        if (mao.k === "ing") { j.mao = null; return feito("lixo"); }
        if ((ehRec(mao) || mao.k === "prato") && mao.c.length) { mao.c = []; mao.p = 0; mao.q = false; return feito("lixo"); }
        return false;
      case "entrega":
        if (!mao || mao.k !== "prato") return false;
        return entregar(m, j, t);
    }
    // bancadas com lugar em cima: balcão, tábua, fogão e a caixa de ingrediente
    if (!mao) {
      if (s.item) { j.mao = s.item; s.item = null; return feito("pegou"); }
      if (t.tipo === "caixa") { j.mao = novoIng(t.ing); return feito("pegou"); }
      return false;
    }
    if (s.item) {
      const r = juntar(mao, s.item, card);
      if (!r) return false;
      j.mao = r.mao; s.item = r.alvo; return feito("juntou");
    }
    if (t.tipo === "caixa") { // com o prato (ou a panela) na mão, a caixa põe o ingrediente direto nele
      const ing = novoIng(t.ing);
      if (colocar(mao, ing, card)) return feito("juntou");
    }
    if (!aceita(t, mao)) return false;
    s.item = mao; j.mao = null; return feito("soltou");
  }

  // usar a bancada da frente (picar na tábua, lavar na pia): fica valendo enquanto o cozinheiro estiver de frente,
  // de mãos livres
  function podeUsar(m, j, t) {
    if (!t || j.mao) return false;
    const s = m.estado[t.i];
    if (t.tipo === "tabua") return !!(s.item && s.item.k === "ing" && proximoPasso(s.item) === "picar");
    if (t.tipo === "pia") return s.n > 0;
    return false;
  }
  function usar(m, j) {
    if (m.fase !== "jogo") return false;
    const t = alvo(m.mapa, j);
    if (!podeUsar(m, j, t)) return false;
    j.trab = t.i; mudou(m); return true;
  }
  function arremessar(m, j, forca = 0) {
    if (m.fase !== "jogo" || j.mao?.k !== "ing") return false;
    const [fx, fz] = frente(j.d || 0), v = 3 + 6 * clamp(forca, 0, 1);
    m.voando.push({ id: ++m.seqVoo, item: j.mao, dono: j.id, idade: 0, x: j.x + fx * 0.45, z: j.z + fz * 0.45,
      y: 1.1, vx: fx * v, vz: fz * v, vy: 3.5 });
    j.mao = null; j.trab = null; evento(m, { tipo: "arremessou", j: j.id }); mudou(m); return true;
  }
  function pousar(m, o) {
    const c = Math.floor(o.x / TILE), r = Math.floor(o.z / TILE), t = tileEm(m.mapa, c, r);
    if (t?.i != null) {
      const s = m.estado[t.i];
      if (s.item && colocar(s.item, o.item, cozDe(m).receitas)) { evento(m, { tipo: "caiu", i: t.i }); mudou(m); return; }
      if (!s.item && aceita(t, o.item)) { s.item = o.item; evento(m, { tipo: "caiu", i: t.i }); mudou(m); return; }
    }
    let chao = null, distancia = Infinity;
    for (let r = 0; r < m.mapa.h; r++) for (let c = 0; c < m.mapa.w; c++) {
      if (solido(m.mapa, c, r)) continue;
      const x = (c + 0.5) * TILE, z = (r + 0.5) * TILE, d = Math.hypot(x - o.x, z - o.z);
      if (d < distancia) { distancia = d; chao = [x, z]; }
    }
    m.caidos.push({ id: o.id, item: o.item, x: chao[0], z: chao[1] });
    evento(m, { tipo: "caiu" }); mudou(m);
  }

  function entregar(m, j, t) {
    const coz = cozDe(m), r = receitaDe(j.mao.c, coz.receitas);
    if (!r) { evento(m, { tipo: "errou", j: j.id, msg: j.mao.c.length ? "Isso não é nenhum prato do cardápio." : "O prato está vazio." }); return false; }
    const k = m.pedidos.findIndex((p) => p.r === r);
    if (k < 0) { evento(m, { tipo: "errou", j: j.id, msg: "Ninguém pediu " + RECEITAS[r].nome.toLowerCase() + " agora." }); return false; }
    const p = m.pedidos[k], frac = clamp((p.ate - m.t) / (p.ate - p.ini), 0, 1), gorjeta = Math.ceil(TEMPOS.gorjeta * frac);
    m.pedidos.splice(k, 1);
    m.combo = k === 0 ? Math.min(4, m.combo + 1) : 0;
    const multiplicador = Math.max(1, m.combo), ganhos = (RECEITAS[r].pontos + gorjeta) * multiplicador;
    m.pontos += ganhos; m.gorjetas += gorjeta * multiplicador; m.entregues++;
    j.mao = null; j.trab = null;
    m.voltando.push({ em: m.t + TEMPOS.voltaPrato });
    m.proxPedido = Math.min(m.proxPedido, m.t + 1 + m.rng() * 2);
    evento(m, { tipo: "entregou", j: j.id, i: t.i, r, pontos: RECEITAS[r].pontos * multiplicador, gorjeta: gorjeta * multiplicador, multiplicador }); mudou(m);
    return true;
  }

  // um passo da partida (dt em segundos)
  function passo(m, dt) {
    if (m.fase === "fim") return;
    m.t += dt;
    if (m.fase === "conta") {
      if (m.t < 0) return;
      m.fase = "jogo"; evento(m, { tipo: "abriu" }); mudou(m);
      for (let k = 0; k < cozDe(m).pedidos.inicio; k++) novoPedido(m);
      m.proxPedido = Infinity;
    }
    const coz = cozDe(m);
    m.resta = Math.max(0, coz.tempo - m.t);
    for (let k = m.voando.length - 1; k >= 0; k--) {
      const o = m.voando[k]; o.idade += dt; o.x += o.vx * dt; o.z += o.vz * dt; o.y += o.vy * dt; o.vy -= 15 * dt;
      const receptor = m.jogadores.find((j) => (!j.mao && (j.id !== o.dono || o.idade > 0.25) && Math.hypot(j.x - o.x, j.z - o.z) < 0.53 && o.y > 0.7 && o.y < 1.65));
      if (receptor) { receptor.mao = o.item; m.voando.splice(k, 1); evento(m, { tipo: "pegouAr", j: receptor.id }); mudou(m); continue; }
      const t = tileEm(m.mapa, Math.floor(o.x / TILE), Math.floor(o.z / TILE));
      if (o.y > (t?.i != null ? 1.08 : 0.15) && o.idade < 2) continue;
      m.voando.splice(k, 1); pousar(m, o);
    }
    // picar e lavar: quem está trabalhando continua enquanto estiver de frente e de mãos livres
    for (const j of m.jogadores) {
      if (j.trab == null) continue;
      const t = alvo(m.mapa, j);
      if (!t || t.i !== j.trab || !podeUsar(m, j, t)) { j.trab = null; mudou(m); continue; }
      const s = m.estado[t.i];
      if (t.tipo === "tabua") {
        const ing = s.item; ing.p += dt;
        if (ing.p >= INGREDIENTES[ing.t].picar) { ing.e = PROCESSOS.picar.para; ing.p = 0; j.trab = null; evento(m, { tipo: "picou", i: t.i }); mudou(m); }
      } else if (t.tipo === "pia") {
        s.p += dt;
        if (s.p >= TEMPOS.lavar) {
          s.p = 0; s.n--;
          const esc = m.mapa.tiles.find((x) => x.tipo === "escorredor");
          if (esc) m.estado[esc.i].n++;
          if (!s.n) j.trab = null;
          evento(m, { tipo: "lavou", i: t.i }); mudou(m);
        }
      }
    }
    // o fogo: panela e frigideira no fogão cozinham; passou muito do ponto, queima
    for (const t of m.mapa.tiles) {
      if (t.tipo !== "fogao") continue;
      const o = m.estado[t.i].item;
      if (!ehRec(o) || !o.c.length || o.q) continue;
      const R = RECIPIENTES[o.k], antes = o.p, prec = tempoRec(o);
      o.p += dt;
      if (antes < prec && o.p >= prec) { for (const i of o.c) i.e = PROCESSOS[R.processo].para; evento(m, { tipo: "pronto", i: t.i }); mudou(m); }
      if (antes < prec + R.queima * TEMPOS.alerta && o.p >= prec + R.queima * TEMPOS.alerta) { evento(m, { tipo: "alerta", i: t.i }); mudou(m); }
      if (o.p >= prec + R.queima) { o.q = true; for (const i of o.c) i.e = "queimado"; evento(m, { tipo: "queimou", i: t.i }); mudou(m); }
    }
    // os pedidos: vencem (multa) e chegam novos
    for (let k = m.pedidos.length - 1; k >= 0; k--) {
      const p = m.pedidos[k];
      if (m.t >= p.ate) { m.pedidos.splice(k, 1); m.pontos = Math.max(0, m.pontos - TEMPOS.multa); m.perdidos++; m.combo = 0; evento(m, { tipo: "perdeu", r: p.r }); mudou(m); }
    }
    if (m.pedidos.length < coz.pedidos.inicio && m.proxPedido === Infinity) m.proxPedido = m.t + intervalo(m);
    if (m.t >= m.proxPedido) {
      if (m.pedidos.length < coz.pedidos.max) novoPedido(m);
      m.proxPedido = m.pedidos.length < coz.pedidos.inicio ? m.t + intervalo(m) : Infinity;
    }
    // os pratos sujos voltam (empilhados no retorno; sem retorno, limpos no escorredor)
    for (let k = m.voltando.length - 1; k >= 0; k--) {
      if (m.t < m.voltando[k].em) continue;
      m.voltando.splice(k, 1);
      const ret = m.mapa.tiles.find((x) => x.tipo === "retorno"), esc = m.mapa.tiles.find((x) => x.tipo === "escorredor");
      if (ret) { const s = m.estado[ret.i]; if (s.item && s.item.k === "sujos") s.item.n++; else s.item = { k: "sujos", n: 1 }; }
      else if (esc) m.estado[esc.i].n++;
      evento(m, { tipo: "voltou" }); mudou(m);
    }
    if (m.t >= coz.tempo) {
      m.fase = "fim"; m.estrelas = m.meta.filter((p) => m.pontos >= p).length;
      for (const j of m.jogadores) j.trab = null;
      evento(m, { tipo: "fim", estrelas: m.estrelas, pontos: m.pontos }); mudou(m);
    }
  }
  function intervalo(m) { const [a, b] = cozDe(m).pedidos.intervalo; return a + m.rng() * (b - a); }

  // o que vai para o navegador quando a cozinha muda (as posições vão à parte, no pacote rápido)
  function mesa(m) {
    return {
      v: m.versao, coz: m.coz, fase: m.fase, t: m.t, pontos: m.pontos, meta: m.meta, estrelas: m.estrelas, combo: m.combo,
      entregues: m.entregues, perdidos: m.perdidos, gorjetas: m.gorjetas,
      pedidos: m.pedidos.map((p) => ({ id: p.id, r: p.r, ini: p.ini, ate: p.ate })),
      lugares: m.estado.map((s) => [s.item, s.n, Math.round(s.p * 100) / 100]),
      maos: Object.fromEntries(m.jogadores.map((j) => [j.id, j.mao])),
      voando: m.voando.map((o) => ({ id: o.id, item: o.item, x: o.x, z: o.z, y: o.y, vx: o.vx, vz: o.vz, vy: o.vy })),
      caidos: m.caidos.map((o) => ({ id: o.id, item: o.item, x: o.x, z: o.z })),
      trab: Object.fromEntries(m.jogadores.filter((j) => j.trab != null).map((j) => [j.id, j.trab])),
    };
  }
  // tem coisa andando sozinha (picar, lavar, fogão): o servidor manda a mesa mais vezes para a barra andar
  const andando = (m) => m.fase === "jogo" && (m.voando.length > 0 || m.jogadores.some((j) => j.trab != null) || m.mapa.tiles.some((t) => t.tipo === "fogao" && ehRec(m.estado[t.i].item) && m.estado[t.i].item.c.length && !m.estado[t.i].item.q));

  // o nome de um item para os avisos e a tela
  function nomeItem(o) {
    if (!o) return "";
    if (o.k === "ing") { const d = INGREDIENTES[o.t]; return d.nome + (NOME_ESTADO[o.e] ? " " + NOME_ESTADO[o.e] + (d.fem ? "a" : "o") : ""); }
    if (o.k === "sujos") return o.n > 1 ? o.n + " pratos sujos" : "Prato sujo";
    if (o.k === "prato") { const r = receitaDe(o.c); return r ? RECEITAS[r].nome : o.c.length ? "Prato montando" : "Prato"; }
    return RECIPIENTES[o.k].nome;
  }

  return {
    TILE, RAIO, MOV, TEMPOS, PROCESSOS, INGREDIENTES, RECIPIENTES, RECEITAS, COZINHAS, SIMBOLOS,
    estadosDe, proximoPasso, cabe, receitaDe, rota, simularPerfeito, metaDe, montarMapa, tileEm, solido, frente, colidir, mover, afastar, alvo,
    novoIng, novoRec, novoPrato, pronto, tempoRec, colocar, juntar, aceita, novaPartida, interagir, usar, arremessar, podeUsar, passo,
    mesa, andando, nomeItem,
  };
});
