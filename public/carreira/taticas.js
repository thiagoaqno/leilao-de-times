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
  // onde cada vaga fica no campinho (x e y em %, o gol embaixo e o ataque em cima), na mesma ordem das vagas
  function spots(nome) {
    const f = FORMACOES[FORMACOES[nome] ? nome : "4-3-3"], R = f.length, [topo, base] = [15, 73];
    const out = [{ x: 50, y: 91, row: 0 }];
    f.forEach(([, codigos], r) => {
      const y = R === 1 ? (topo + base) / 2 : base - r * (base - topo) / (R - 1), n = codigos.length, gap = n > 1 ? Math.min(26, 80 / (n - 1)) : 0;
      codigos.forEach((c, j) => out.push({ x: 50 + (j - (n - 1) / 2) * gap, y, row: r + 1 }));
    });
    return out;
  }

  // ---------- o encaixe: quanto de cada jogador rende em cada vaga ----------
  // posições da base: GOL, ZAG, LE, LD, VOL, MC, MEI, PE, PD, ATA. Cada uma tem a linha (de trás para a frente) e o lado.
  const COORD = { GOL: [0, 0], ZAG: [1, 0], LE: [1, -1], LD: [1, 1], VOL: [2, 0], MC: [3, 0], MEI: [4, 0], F9: [5, 0], PE: [5, -1], PD: [5, 1], ATA: [6, 0] };
  const SINONIMOS = { GK: "GOL", LAT: "LE", DEF: "ZAG", MID: "MC", ATT: "ATA" };
  const posDe = (p) => { const x = String(p || "").toUpperCase(); return COORD[x] ? x : SINONIMOS[x] || "MC"; };
  // 1 na posição dele; perde 3,5% por linha de distância e 4% por lado trocado; lateral na zaga (e o contrário) perde mais 6%;
  // goleiro fora do gol (e quem não é goleiro no gol) rende 50%
  function afinidade(pos, vaga) {
    const a = posDe(pos), b = posDe(vaga);
    if (a === b) return 1;
    if (a === "GOL" || b === "GOL") return 0.5;
    const [la, sa] = COORD[a], [lb, sb] = COORD[b];
    let pen = 0.035 * Math.abs(la - lb) + 0.04 * Math.abs(sa - sb);
    if ((a === "ZAG" && (b === "LE" || b === "LD")) || (b === "ZAG" && (a === "LE" || a === "LD"))) pen += 0.06;
    return Math.round(clamp(1 - pen, 0.6, 1) * 1000) / 1000;
  }

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
  return { FORMACOES, NOMES_FORMACOES, DESCRICAO_FORMACAO, ROTULO_FORMACAO, ESQUEMAS, baseDe, variacoesDe, vagasDe, spots, afinidade, posDe, ESTILOS, NOMES_ESTILOS, estiloValido, encaixe, perfilDe, estiloIdeal, fatores, efeitos };
});
