// Carreira de Treinador: as formações (com a posição certa de cada vaga: lateral, zagueiro, ponta, centroavante...), o encaixe de
// cada jogador em cada vaga e os estilos de jogo (tiki-taka, gegenpressing...). UMD: roda igual no servidor e no navegador.
// O motor (motor.js) usa tudo isto; a prancheta (elenco.js) e a parada tática (partida.js) mostram em números o que cada
// escolha muda (Taticas.efeitos).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Taticas = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- as formações: as linhas de trás para a frente, cada uma com o grupo (DEF, MID, ATT) e a vaga de cada um ----------
  // O grupo é o que a força do time usa (escalacao.js: strength); a vaga fina (LE, ZAG, VOL, PE, ATA...) é o encaixe de cada jogador.
  const Z4 = ["LE", "ZAG", "ZAG", "LD"], Z5 = ["LE", "ZAG", "ZAG", "ZAG", "LD"], Z3 = ["ZAG", "ZAG", "ZAG"];
  const AT3 = ["PE", "ATA", "PD"], AT3F = ["PE", "F9", "PD"];
  // cada esquema tem variações (o 4-3-3 com 1 volante e 2 meio-campistas, 2 volantes e 1 meia...): o nome é "esquema" ou "esquema X";
  // o rótulo diz o que muda no meio. F9 é o falso 9: o atacante recua para armar (rende como meia e como centroavante).
  const DEFS = [
    ["4-3-3", "1 volante + 2 meio-campistas", [["DEF", Z4], ["MID", ["VOL", "MC", "MC"]], ["ATT", AT3]]],
    ["4-3-3 M", "1 volante + 2 meias", [["DEF", Z4], ["MID", ["VOL", "MEI", "MEI"]], ["ATT", AT3]]],
    ["4-3-3 V", "2 volantes + 1 meia", [["DEF", Z4], ["MID", ["VOL", "VOL", "MEI"]], ["ATT", AT3]]],
    ["4-3-3 C", "3 meio-campistas", [["DEF", Z4], ["MID", ["MC", "MC", "MC"]], ["ATT", AT3]]],
    ["4-3-3 F", "falso 9", [["DEF", Z4], ["MID", ["VOL", "MC", "MC"]], ["ATT", AT3F]]],
    ["4-2-3-1", "2 volantes + 3 meias", [["DEF", Z4], ["MID", ["VOL", "VOL"]], ["MID", ["PE", "MEI", "PD"]], ["ATT", ["ATA"]]]],
    ["4-2-3-1 C", "dupla de meio-campo", [["DEF", Z4], ["MID", ["MC", "MC"]], ["MID", ["PE", "MEI", "PD"]], ["ATT", ["ATA"]]]],
    ["4-2-3-1 M", "3 meias por dentro", [["DEF", Z4], ["MID", ["VOL", "VOL"]], ["MID", ["MEI", "MEI", "MEI"]], ["ATT", ["ATA"]]]],
    ["4-2-3-1 F", "falso 9", [["DEF", Z4], ["MID", ["VOL", "VOL"]], ["MID", ["PE", "MEI", "PD"]], ["ATT", ["F9"]]]],
    ["4-4-2", "linha de 4 com pontas", [["DEF", Z4], ["MID", ["PE", "MC", "MC", "PD"]], ["ATT", ["ATA", "ATA"]]]],
    ["4-4-2 L", "losango", [["DEF", Z4], ["MID", ["VOL"]], ["MID", ["MC", "MC"]], ["MID", ["MEI"]], ["ATT", ["ATA", "ATA"]]]],
    ["4-4-2 V", "linha de 4 com volante", [["DEF", Z4], ["MID", ["PE", "VOL", "MC", "PD"]], ["ATT", ["ATA", "ATA"]]]],
    ["4-1-4-1", "volante + 4 meias", [["DEF", Z4], ["MID", ["VOL"]], ["MID", ["PE", "MC", "MC", "PD"]], ["ATT", ["ATA"]]]],
    ["4-2-4", "4 atacantes", [["DEF", Z4], ["MID", ["VOL", "MC"]], ["ATT", ["PE", "ATA", "ATA", "PD"]]]],
    ["3-5-2", "1 volante + 2 meio-campistas", [["DEF", Z3], ["MID", ["VOL"]], ["MID", ["LE", "MC", "MC", "LD"]], ["ATT", ["ATA", "ATA"]]]],
    ["3-5-2 V", "2 volantes + 1 meia", [["DEF", Z3], ["MID", ["VOL", "VOL"]], ["MID", ["LE", "MEI", "LD"]], ["ATT", ["ATA", "ATA"]]]],
    ["3-4-3", "alas e dois meio-campistas", [["DEF", Z3], ["MID", ["LE", "MC", "MC", "LD"]], ["ATT", AT3]]],
    ["3-4-3 V", "alas, volante e meio-campista", [["DEF", Z3], ["MID", ["LE", "VOL", "MC", "LD"]], ["ATT", AT3]]],
    ["3-2-4-1", "dois volantes e quatro meias", [["DEF", Z3], ["MID", ["VOL", "VOL"]], ["MID", ["PE", "MEI", "MEI", "PD"]], ["ATT", ["ATA"]]]],
    ["3-6-1", "seis no meio", [["DEF", Z3], ["MID", ["VOL", "VOL"]], ["MID", ["LE", "MC", "MC", "LD"]], ["ATT", ["ATA"]]]],
    ["5-3-2", "1 volante + 2 meio-campistas", [["DEF", Z5], ["MID", ["MC", "VOL", "MC"]], ["ATT", ["ATA", "ATA"]]]],
    ["5-3-2 V", "2 volantes + 1 meia", [["DEF", Z5], ["MID", ["VOL", "VOL", "MEI"]], ["ATT", ["ATA", "ATA"]]]],
    ["5-4-1", "ônibus estacionado", [["DEF", Z5], ["MID", ["PE", "MC", "MC", "PD"]], ["ATT", ["ATA"]]]],
    ["2-3-5", "a pirâmide", [["DEF", ["ZAG", "ZAG"]], ["MID", ["MC", "VOL", "MC"]], ["ATT", ["PE", "ATA", "ATA", "ATA", "PD"]]]],
  ];
  const FORMACOES = Object.fromEntries(DEFS.map(([k, , rows]) => [k, rows]));
  const ROTULO_FORMACAO = Object.fromEntries(DEFS.map(([k, r]) => [k, r]));
  const NOMES_FORMACOES = DEFS.map(([k]) => k);
  const baseDe = (nome) => String(nome).split(" ")[0]; // o esquema de uma formação
  const ESQUEMAS = [...new Set(NOMES_FORMACOES.map(baseDe))]; // 4-3-3, 4-2-3-1, 4-4-2...
  const variacoesDe = (esquema) => NOMES_FORMACOES.filter((k) => baseDe(k) === esquema);
  const DESCRICAO_ESQUEMA = {
    "4-3-3": "Dois pontas abertos e três no meio: ofensivo e equilibrado.", "4-2-3-1": "Dupla no meio protege três meias atrás do centroavante.",
    "4-4-2": "Duas linhas de quatro e dupla de ataque.", "4-1-4-1": "Um volante cobre a defesa e quatro meias avançam em bloco.", "4-2-4": "O Brasil de 58: quatro atacantes e pouca proteção.",
    "3-5-2": "Alas cobrem o corredor inteiro; meio congestionado.", "3-4-3": "Agressivo: três atacantes e quatro no meio.", "3-2-4-1": "Dois volantes e quatro meias criam um quadrado central.",
    "3-6-1": "Seis no meio para esconder a bola, um só na frente.", "5-3-2": "Linha de cinco e dois atacantes para o contra-ataque.", "5-4-1": "Duas linhas fechadas, de cinco e de quatro.", "2-3-5": "A pirâmide: quase todo mundo perto do gol.",
  };
  const DESCRICAO_FORMACAO = Object.fromEntries(NOMES_FORMACOES.map((k) => [k, `${DESCRICAO_ESQUEMA[baseDe(k)]} Variação: ${ROTULO_FORMACAO[k]}.`]));
  // as vagas, na ordem do campinho: o gol, e depois a defesa, o meio e o ataque (de trás para a frente, da esquerda para a direita)
  function vagasDe(nome) {
    const f = FORMACOES[FORMACOES[nome] ? nome : "4-3-3"], v = [{ g: "GK", fino: "GOL" }];
    for (const [g, codigos] of f) for (const c of codigos) v.push({ g, fino: c });
    return v;
  }
  // onde cada vaga fica no campinho (x e y em %, o gol embaixo e o ataque em cima), na mesma ordem das vagas. O desenho segue a função:
  // laterais e pontas ficam colados na linha lateral; entre os do centro, o mais recuado (o volante) fica no meio e o mais avançado nas pontas
  // do triângulo; o volante joga um pouco atrás da linha, o meia um pouco à frente e o falso 9 recuado atrás do centroavante.
  const AJUSTE_Y = { VOL: 5, MC: 0, MEI: -5, F9: 7 }, PROFUNDIDADE = { VOL: 0, MC: 1, MEI: 2, F9: 3, ZAG: 1, ATA: 4 }, LARGOS = { LE: -1, PE: -1, LD: 1, PD: 1 };
  function spots(nome) {
    const f = FORMACOES[FORMACOES[nome] ? nome : "4-3-3"], R = f.length, [topo, base] = [15, 73];
    const out = [{ x: 50, y: 91, row: 0 }];
    f.forEach(([, codigos], r) => {
      const y0 = R === 1 ? (topo + base) / 2 : base - r * (base - topo) / (R - 1), xs = new Array(codigos.length);
      const centros = codigos.map((c, k) => [c, k]).filter(([c]) => !LARGOS[c]), temLargos = centros.length < codigos.length;
      codigos.forEach((c, k) => { if (LARGOS[c]) xs[k] = LARGOS[c] < 0 ? 13 : 87; });
      const n = centros.length, gap = n > 1 ? (temLargos ? Math.min(26, 44 / (n - 1)) : Math.min(26, 80 / (n - 1))) : 0;
      // com número ímpar de centrais, o que é diferente dos outros (o único volante entre dois meio-campistas, o único meia entre dois volantes)
      // fica no meio e os outros dois nos lados; nos demais casos vale a ordem da lista, da esquerda para a direita
      const contagem = {}; for (const [c] of centros) contagem[c] = (contagem[c] || 0) + 1;
      const unicos = centros.filter(([c]) => contagem[c] === 1);
      let posic = centros.map(([, k], m) => [k, m]);
      if (n % 2 && unicos.length === 1) {
        const resto = centros.filter((x) => x !== unicos[0]), meio = (n - 1) / 2;
        posic = [[unicos[0][1], meio], ...resto.map(([, k], m) => [k, m < meio ? m : m + 1])];
      }
      for (const [k, lugar] of posic) xs[k] = 50 + (lugar - (n - 1) / 2) * gap;
      codigos.forEach((c, k) => out.push({ x: xs[k], y: y0 + (AJUSTE_Y[c] || 0), row: r + 1 }));
    });
    return out;
  }

  // ---------- o encaixe: quanto de cada jogador rende em cada vaga ----------
  // posições da base: GOL, ZAG, LE, LD, VOL, MC, MEI, PE, PD, ATA. Cada uma tem a linha (de trás para a frente) e o lado.
  const COORD = { GOL: [0, 0], ZAG: [1, 0], LE: [1, -1], LD: [1, 1], VOL: [2, 0], MC: [3, 0], MEI: [4, 0], F9: [5, 0], PE: [5, -1], PD: [5, 1], ATA: [6, 0] };
  const SINONIMOS = { GK: "GOL", LAT: "LE", DEF: "ZAG", MID: "MC", ATT: "ATA" };
  const posDe = (p) => { const x = String(p || "").toUpperCase(); return COORD[x] ? x : SINONIMOS[x] || "MC"; };
  // O encaixe é contado em PONTOS de nota (1 ponto ≈ 1,25% de uma nota 80), e fica leve dentro da mesma linha do campo:
  //   ataque (PE, PD, ATA, F9): ponta trocada de lado 1 ponto; ponta de centroavante e o contrário 2; centroavante de falso 9 e o contrário 1
  //   meio (VOL, MC, MEI): vizinhos (volante-meio, meio-meia) 1 ponto; volante de meia e o contrário 2
  //   defesa: lateral trocado de lado (e ala, que é o lateral no meio) 1 ponto; lateral na zaga e zagueiro na lateral 4
  // Mudar de linha custa mais: 4 pontos por linha de distância (meio na zaga 4, centroavante na zaga 8), mais 1 se trocar o lado.
  // Goleiro fora do gol (e quem não é goleiro no gol) rende 50%.
  const LINHA_DE = { ZAG: 1, LE: 1, LD: 1, VOL: 2, MC: 2, MEI: 2, PE: 3, PD: 3, ATA: 3, F9: 3 };
  const MESMA_LINHA = { "LD LE": 1, "LE ZAG": 4, "LD ZAG": 4, "MC VOL": 1, "MC MEI": 1, "MEI VOL": 2, "PD PE": 1, "ATA PE": 2, "ATA PD": 2, "ATA F9": 1, "F9 PE": 2, "F9 PD": 2 };
  const pontosDeEncaixe = (a, b) => {
    if (a === b) return 0;
    if (LINHA_DE[a] === LINHA_DE[b]) return MESMA_LINHA[[a, b].sort().join(" ")] ?? 1;
    if (a === "MEI" && b === "F9") return 2; // o meia é o falso 9 natural
    if (a === "F9" && b === "MEI") return 2;
    const lado = (COORD[a][1] && COORD[b][1] && COORD[a][1] !== COORD[b][1]) ? 1 : 0;
    return 4 * Math.abs(LINHA_DE[a] - LINHA_DE[b]) + lado;
  };
  function afinidade(pos, vaga) {
    const a = posDe(pos), b = posDe(vaga);
    if (a === b) return 1;
    if (a === "GOL" || b === "GOL") return 0.5;
    return Math.round(clamp(1 - pontosDeEncaixe(a, b) / 80, 0.6, 1) * 1000) / 1000;
  }

  // O cansaço tira de 0 a 3 pontos da nota: 85% ou mais de energia não pesa; de 70 a 84, -1; de 50 a 69, -2; abaixo de 50, -3
  const penalidadeEnergia = (e) => (e >= 85 ? 0 : e >= 70 ? 1 : e >= 50 ? 2 : 3);

  // ---------- os estilos de jogo ----------
  // bonus: o que o estilo dá quando o elenco tem o perfil (multiplicado pelo encaixe f, de 0 a 1,5); custo: o que ele cobra sempre.
  // chance: lances que o seu time cria · cede: lances que o rival cria · conv: o quanto você converte · cansaco e faltas: desgaste.
  // lance: ajuste (em pontos de chance, 0,05 = 5 pontos) das opções dos lances decisivos; o que é positivo também escala com f.
  const ESTILOS = {
    equilibrado: { nome: "Equilibrado", desc: "Sem foco: nada a ganhar nem a perder.", perfil: "—", bonus: {}, custo: {}, lance: {} },
    tikitaka: { nome: "Tiki-taka", desc: "Posse obsessiva, passes curtos e rápidos. Exige meias e atacantes de passe.", perfil: "passe dos meias e atacantes",
      bonus: { chance: 0.11 }, custo: { cede: 0.05, faltas: -0.05 }, lance: { tocar: 0.06, driblar: -0.05, cruzar: -0.05 } },
    gegenpressing: { nome: "Gegenpressing", desc: "Recupera a bola logo depois de perdê-la, sufocando no campo de ataque. Cansa muito.", perfil: "ritmo e físico de quem joga na linha",
      bonus: { chance: 0.04, cede: -0.075 }, custo: { cansaco: 0.18, faltas: 0.11 }, lance: { tocar: -0.02 } },
    posicional: { nome: "Jogo de posição", desc: "Zonas rígidas e triângulos de passe para desmontar a defesa. Exige passe e boa marcação.", perfil: "passe e defesa de quem joga na linha",
      bonus: { cede: -0.056, chance: 0.028 }, custo: { cansaco: 0.05 }, lance: { tocar: 0.025, impedimento: 0.02 } },
    funcional: { nome: "Futebol funcional", desc: "Liberdade para se aproximar da bola, com tabelas e improviso. Exige drible e passe.", perfil: "drible e passe dos meias e atacantes",
      bonus: { chance: 0.1 }, custo: { cede: 0.045 }, lance: { driblar: 0.065, tocar: 0.05, cruzar: -0.03 } },
    catenaccio: { nome: "Retranca (catenaccio)", desc: "Defesa ultrassólida fechando a própria área. Cria pouco. Exige defensores e goleiro fortes.", perfil: "defesa e físico dos defensores e goleiro",
      bonus: { cede: -0.21 }, custo: { chance: -0.11, cansaco: -0.1, faltas: 0.08 }, lance: { bloco: 0.05, barreira: 0.04, impedimento: -0.03, contra: 0.04 } },
    contra: { nome: "Contra-ataque direto", desc: "Entrega a bola, espera e sai em velocidade com passes longos. Exige atacantes rápidos e finalizadores.", perfil: "ritmo e finalização dos atacantes",
      bonus: { conv: 0.115 }, custo: { chance: -0.04, cede: 0.025 }, lance: { contra: 0.08, driblar: 0.03, chutar: 0.03, cruzar: -0.03 } },
  };
  const NOMES_ESTILOS = Object.keys(ESTILOS);
  const estiloValido = (e) => (ESTILOS[e] ? e : "equilibrado");

  // o perfil do elenco para cada estilo: a média do atributo que o estilo pede, entre quem joga naquela função. jogadores: {grp, atr}
  const media = (l, f) => (l.length ? l.reduce((s, p) => s + f(p), 0) / l.length : 60);
  const PERFIL = {
    tikitaka: (J) => media(J.filter((p) => p.grp !== "GK" && p.grp !== "DEF"), (p) => p.atr.pas),
    gegenpressing: (J) => media(J.filter((p) => p.grp !== "GK"), (p) => (p.atr.rit + p.atr.fis) / 2),
    posicional: (J) => media(J.filter((p) => p.grp !== "GK"), (p) => (p.atr.pas + p.atr.def) / 2),
    funcional: (J) => media(J.filter((p) => p.grp !== "GK" && p.grp !== "DEF"), (p) => (p.atr.dri + p.atr.pas) / 2),
    catenaccio: (J) => { const d = J.filter((p) => p.grp === "DEF" || p.grp === "VOL"), g = J.find((p) => p.grp === "GK"); return (media(d, (p) => (p.atr.def + p.atr.fis) / 2) * 3 + (g ? g.atr.gol : 60)) / 4; },
    contra: (J) => media(J.filter((p) => p.grp === "ATT"), (p) => (p.atr.rit + p.atr.fin) / 2),
  };
  // o encaixe f do elenco no estilo: 0 (sem perfil) a 1,5 (elenco ideal); 1 = perfil 75
  const encaixe = (estilo, jogadores) => (PERFIL[estilo] ? clamp((PERFIL[estilo](jogadores) - 55) / 20, 0, 1.5) : 1);
  const perfilDe = (estilo, jogadores) => (PERFIL[estilo] ? Math.round(PERFIL[estilo](jogadores)) : null);
  // o estilo que mais combina com o elenco (os técnicos do computador escolhem assim); só vale se encaixar de verdade
  function estiloIdeal(jogadores) {
    let melhor = "equilibrado", bv = 1.0;
    for (const e of NOMES_ESTILOS) { if (e === "equilibrado") continue; const f = encaixe(e, jogadores); if (f > bv) { bv = f; melhor = e; } }
    return melhor;
  }
  // os fatores que o motor usa: multiplicam os lances criados (chance), os que o rival cria (cede), a conversão, o cansaço e as faltas
  function fatores(estilo, f = 1) {
    const e = ESTILOS[estiloValido(estilo)], b = e.bonus, c = e.custo;
    const lance = {};
    for (const [k, v] of Object.entries(e.lance)) lance[k] = v > 0 ? v * f : v;
    return { chance: 1 + (b.chance || 0) * f + (c.chance || 0), cede: 1 + (b.cede || 0) * f + (c.cede || 0), conv: 1 + (b.conv || 0) * f + (c.conv || 0),
      cansaco: 1 + (c.cansaco || 0), faltas: 1 + (c.faltas || 0), lance };
  }
  // O que a mentalidade, a pressão e a linha mudam (as mesmas contas do motor), em % sobre o ponto neutro (mentalidade 0, pressão 1,
  // linha 1): criar (lances que seu time cria), sofrer (os do rival), seuFinalizar e rivalFinalizar (conversão), cansaco e faltas.
  function efeitos(tatica, fat = fatores("equilibrado")) {
    const m = tatica.mentalidade || 0, p = tatica.pressao == null ? 1 : tatica.pressao, l = tatica.linha == null ? 1 : tatica.linha;
    const pc = (x) => Math.round((x - 1) * 100) || 0;
    return {
      criar: pc((1 + 0.12 * m) * fat.chance),
      sofrer: pc((1 + 0.08 * m) * (1 - 0.06 * (p - 1)) * (1 - 0.04 * (l - 1)) * fat.cede),
      seuFinalizar: pc(fat.conv),
      rivalFinalizar: pc(1 + 0.1 * (l - 1)),
      cansaco: pc(((0.24 + 0.1 * p) / 0.34) * fat.cansaco),
      faltas: pc((1 + 0.15 * (p - 1)) * fat.faltas),
    };
  }
  return { pontosDeEncaixe: (pos, vaga) => { const a = posDe(pos), b = posDe(vaga); return a === b ? 0 : a === "GOL" || b === "GOL" ? 40 : pontosDeEncaixe(a, b); }, penalidadeEnergia, FORMACOES, NOMES_FORMACOES, DESCRICAO_FORMACAO, ROTULO_FORMACAO, ESQUEMAS, baseDe, variacoesDe, vagasDe, spots, afinidade, posDe, ESTILOS, NOMES_ESTILOS, estiloValido, encaixe, perfilDe, estiloIdeal, fatores, efeitos };
});
