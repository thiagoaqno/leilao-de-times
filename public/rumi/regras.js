// Rumi da Galera — as regras (as do jogo de peças numeradas clássico). Usado pelo servidor (que confere cada jogada)
// e pelo navegador (que mostra na hora se a mesa está valendo, antes de confirmar).
//   - 106 peças: 1 a 13 em 4 cores, duas de cada, e 2 coringas. Cada um começa com 14.
//   - Na sua vez: baixe combinações (e mexa nas da mesa) e confirme; ou compre uma peça e passe.
//   - Combinação: SEQUÊNCIA (3 ou mais números seguidos da mesma cor, sem dar a volta do 13 para o 1) ou GRUPO
//     (3 ou 4 peças do mesmo número, cada uma de uma cor). O coringa vale pela peça que substitui.
//   - Primeira descida: só com peças da sua mão, somando pelo menos 30 pontos. Antes dela, não dá para mexer na mesa.
//   - No fim da vez, toda peça que estava na mesa continua na mesa (pode mudar de combinação) e tudo tem que valer.
//   - Quem baixa todas as peças bate: os outros perdem os pontos que ficaram na mão (coringa: 30) e quem bateu ganha
//     a soma.
(function (root) {
  const CORES = ["v", "a", "m", "p"]; // vermelho, azul, amarelo, preto
  const NOME_COR = { v: "vermelho", a: "azul", m: "amarelo", p: "preto" };
  const CORINGA_PONTOS = 30, MAO_INICIAL = 14, ABERTURA = 30;

  // as 106 peças (id de 0 a 105): n = número (0 = coringa), c = cor
  function novoJogo() {
    const p = []; let id = 0;
    for (let k = 0; k < 2; k++) for (const c of CORES) for (let n = 1; n <= 13; n++) p.push({ id: id++, n, c });
    p.push({ id: id++, n: 0, c: "j" }, { id: id++, n: 0, c: "j" });
    return p;
  }
  const coringa = (t) => t.n === 0;
  const pontos = (t) => (coringa(t) ? CORINGA_PONTOS : t.n);

  // ---------- uma combinação ----------
  // devolve { ok, tipo: "seq" | "grupo", valor, ordem } (ordem: as peças na ordem de mostrar, com o coringa no lugar
  // dele) ou { ok: false, motivo }
  function avaliar(pecas) {
    if (pecas.length < 3) return { ok: false, motivo: "precisa de pelo menos 3 peças" };
    const js = pecas.filter(coringa), ns = pecas.filter((t) => !coringa(t));
    if (!ns.length) return { ok: true, tipo: "seq", valor: pecas.length * 2, ordem: pecas }; // só coringas: vale qualquer coisa
    // grupo: mesmo número, cores todas diferentes, até 4
    if (ns.every((t) => t.n === ns[0].n) && new Set(ns.map((t) => t.c)).size === ns.length && pecas.length <= 4)
      return { ok: true, tipo: "grupo", valor: ns[0].n * pecas.length, ordem: [...ns, ...js] };
    // sequência: mesma cor, números diferentes, os buracos cabem nos coringas, sem passar de 1..13
    if (!ns.every((t) => t.c === ns[0].c)) return { ok: false, motivo: "nem sequência (cores misturadas) nem grupo" };
    const ord = [...ns].sort((x, y) => x.n - y.n);
    for (let i = 1; i < ord.length; i++) if (ord[i].n === ord[i - 1].n) return { ok: false, motivo: "número repetido na sequência" };
    const L = pecas.length, a = ord[0].n, b = ord[ord.length - 1].n;
    if (b - a + 1 > L) return { ok: false, motivo: "faltam peças no meio da sequência" };
    if (L > 13) return { ok: false, motivo: "sequência longa demais" };
    // onde começa: o mais alto possível (o coringa sobrando vai para cima, valendo mais), sem passar do 13
    const ini = Math.max(1, Math.min(a, 14 - L));
    if (ini + L - 1 < b) return { ok: false, motivo: "não cabe entre 1 e 13" };
    const ordem = [], resto = [...js];
    for (let n = ini; n < ini + L; n++) { const t = ord.find((x) => x.n === n); ordem.push(t || resto.shift()); }
    return { ok: true, tipo: "seq", valor: L * ini + (L * (L - 1)) / 2, ordem };
  }

  // ---------- a jogada inteira ----------
  // antes: mesa do começo da vez ([[id]]), mao: ids da mão no começo da vez, depois: a mesa proposta ([[id]]),
  // abriu: se o jogador já fez a primeira descida, P: id -> peça. Devolve { ok, usadas: [ids da mão], motivo }
  function conferir(antes, mao, depois, abriu, P) {
    const naMesa = new Set(antes.flat()), daMao = new Set(mao), vistos = new Set(), usadas = [];
    for (const g of depois) for (const id of g) {
      if (vistos.has(id)) return { ok: false, motivo: "peça repetida" };
      vistos.add(id);
      if (naMesa.has(id)) continue;
      if (!daMao.has(id)) return { ok: false, motivo: "peça que não é sua" };
      usadas.push(id);
    }
    for (const id of naMesa) if (!vistos.has(id)) return { ok: false, motivo: "peça da mesa não pode voltar para a mão" };
    if (!usadas.length) return { ok: false, motivo: "baixe pelo menos uma peça (ou compre)" };
    for (const g of depois) { const r = avaliar(g.map((id) => P[id])); if (!r.ok) return { ok: false, motivo: r.motivo }; }
    if (!abriu) { // primeira descida: a mesa de antes fica igual e as combinações novas são só da mão, somando 30
      const chave = (g) => [...g].sort((x, y) => x - y).join(",");
      const velhas = new Set(antes.map(chave)), novas = depois.filter((g) => !velhas.has(chave(g)));
      if (antes.length + novas.length !== depois.length) return { ok: false, motivo: "na primeira descida não dá para mexer na mesa" };
      if (novas.some((g) => g.some((id) => naMesa.has(id)))) return { ok: false, motivo: "na primeira descida não dá para usar peças da mesa" };
      const soma = novas.reduce((s, g) => s + avaliar(g.map((id) => P[id])).valor, 0);
      if (soma < ABERTURA) return { ok: false, motivo: `a primeira descida precisa de ${ABERTURA} pontos (tem ${soma})` };
    }
    return { ok: true, usadas };
  }
  const somaMao = (ids, P) => ids.reduce((s, id) => s + pontos(P[id]), 0);

  // ---------- robô ----------
  // Simples, mas honesto: procura combinações na mão (grupos e sequências, usando coringa quando ajuda), escolhe as
  // que valem mais sem repetir peça; na primeira descida só joga se chegar a 30. Depois de aberto, também tenta
  // encaixar peças soltas nas pontas das sequências e completar grupos da mesa. Não consegue nada: compra.
  function combinacoes(ids, P) {
    const pecas = ids.map((id) => P[id]), js = pecas.filter(coringa), out = [];
    const add = (lista) => { const r = avaliar(lista); if (r.ok) out.push({ ids: lista.map((t) => t.id), valor: r.valor, j: lista.filter(coringa).length }); };
    // grupos
    for (let n = 1; n <= 13; n++) {
      const porCor = {}; for (const t of pecas) if (t.n === n && !porCor[t.c]) porCor[t.c] = t;
      const g = Object.values(porCor);
      if (g.length >= 3) add(g.slice(0, 4));
      if (g.length === 2 && js.length) add([...g, js[0]]);
      if (g.length === 3 && js.length) add([...g, js[0]]);
    }
    // sequências: em cada cor, todos os trechos de números seguidos (até 1 buraco preenchido com coringa)
    for (const c of CORES) {
      const porN = {}; for (const t of pecas) if (t.c === c && !porN[t.n]) porN[t.n] = t;
      for (let a = 1; a <= 11; a++) {
        if (!porN[a]) continue;
        let lista = [porN[a]], usados = 0;
        for (let n = a + 1; n <= 13; n++) {
          if (porN[n]) lista.push(porN[n]);
          else if (usados < js.length) { lista.push(js[usados++]); }
          else break;
          if (lista.length >= 3) add([...lista]);
        }
      }
    }
    return out;
  }
  // escolhe combinações sem repetir peça, as de mais valor primeiro (as sem coringa ganham um pouco de preferência)
  function escolher(cands) {
    const usadas = new Set(), sel = [];
    for (const c of [...cands].sort((x, y) => y.valor - x.valor - (y.j - x.j) * 3)) if (c.ids.every((id) => !usadas.has(id))) { sel.push(c); c.ids.forEach((id) => usadas.add(id)); }
    return sel;
  }
  function jogadaRobo(mesa, mao, abriu, P) {
    let nova = mesa.map((g) => [...g]), resto = [...mao];
    const sel = escolher(combinacoes(resto, P));
    const soma = sel.reduce((s, c) => s + c.valor, 0);
    if (!abriu && soma < ABERTURA) return null;
    for (const c of sel) { nova.push(c.ids); resto = resto.filter((id) => !c.ids.includes(id)); }
    // já aberto: encaixa peças soltas na mesa, de três jeitos, enquanto der
    let mexeu = abriu;
    while (mexeu) {
      mexeu = false;
      // 1) numa ponta de sequência ou completando um grupo
      for (const id of [...resto]) { const g = nova.find((g) => avaliar([...g, id].map((x) => P[x])).ok); if (g) { g.push(id); resto = resto.filter((x) => x !== id); mexeu = true; } }
      // 2) no meio de uma sequência que tem o mesmo número: parte em duas (3-4-5-6-7 + 5 = 3-4-5 e 5-6-7)
      for (const id of [...resto]) {
        const t = P[id]; if (coringa(t)) continue;
        for (let gi = 0; gi < nova.length; gi++) {
          const r = avaliar(nova[gi].map((x) => P[x])); if (r.tipo !== "seq") continue;
          const i = r.ordem.findIndex((x) => !coringa(x) && x.c === t.c && x.n === t.n);
          if (i >= 2 && r.ordem.length - i >= 3) {
            const a = r.ordem.slice(0, i + 1).map((x) => x.id), b = [id, ...r.ordem.slice(i + 1).map((x) => x.id)];
            if (avaliar(a.map((x) => P[x])).ok && avaliar(b.map((x) => P[x])).ok) { nova.splice(gi, 1, a, b); resto = resto.filter((x) => x !== id); mexeu = true; break; }
          }
        }
      }
      // 3) par da mão + uma peça que sobra na mesa (de grupo de 4 ou da ponta de sequência de 4 ou mais)
      const sobra = [];
      nova.forEach((g, gi) => { const r = avaliar(g.map((x) => P[x])); if (g.length < 4) return;
        if (r.tipo === "grupo") r.ordem.forEach((x) => sobra.push({ gi, id: x.id }));
        else { sobra.push({ gi, id: r.ordem[0].id }); sobra.push({ gi, id: r.ordem[r.ordem.length - 1].id }); } });
      achou: for (let i = 0; i < resto.length; i++) for (let j = i + 1; j < resto.length; j++) for (const s of sobra) {
        const trio = [resto[i], resto[j], s.id];
        if (!avaliar(trio.map((x) => P[x])).ok) continue;
        const resta = nova[s.gi].filter((x) => x !== s.id);
        if (!avaliar(resta.map((x) => P[x])).ok) continue;
        nova[s.gi] = resta; nova.push(trio); resto = resto.filter((x) => x !== trio[0] && x !== trio[1]); mexeu = true; break achou;
      }
    }
    if (resto.length === mao.length) return null;
    const conf = conferir(mesa, mao, nova, abriu, P);
    return conf.ok ? nova : null;
  }

  const api = { CORES, NOME_COR, CORINGA_PONTOS, MAO_INICIAL, ABERTURA, novoJogo, coringa, pontos, avaliar, conferir, somaMao, combinacoes, jogadaRobo };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Rumi = api;
})(typeof window !== "undefined" ? window : globalThis);
