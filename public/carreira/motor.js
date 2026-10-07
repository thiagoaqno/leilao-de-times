// Carreira de Treinador: o motor da partida (roda igual no servidor e no navegador).
// Uma partida minuto a minuto, com semente: a mesma semente e as mesmas decisões dão sempre o mesmo jogo.
// - As forças vêm da escalação e da formação (FORMATIONS/FIT/strength de escalacao.js, os mesmos do Leilão).
// - Tática: mentalidade (-2 retranca a +2 tudo ao ataque), pressão (0 a 2) e altura da linha (0 baixa a 2 alta).
// - Cansaço, cartões, lesões, substituições, mando de campo e acréscimos.
// - Três jeitos de jogar (modo): 1 simulada; 2 simulada com paradas táticas; 3 também com os lances decisivos.
//   Quando chega um ponto de decisão sem resposta em `decisoes`, a partida PARA ali e devolve o que precisa ser decidido
//   (como os pênaltis do Leilão). Quem chama guarda a resposta em decisoes[id] e simula de novo: o que já aconteceu
//   continua igual, porque o sorteio é o mesmo até aquele ponto.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../escalacao.js"), require("../leilao/ritmo.js"));
  else root.Motor = factory(root.Escalacao, root.Ritmo);
})(typeof self !== "undefined" ? self : this, function (Escalacao, Ritmo) {
  const { FIT, FORMATIONS, strength } = Escalacao;
  const ZONAS = Ritmo.ZONAS, FORA = Ritmo.DUELO.FORA;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // a calibragem (ver tests/carreira-motor.test.js): ~2,5 gols por jogo, mandante vence ~46%, empate ~27%
  const AJUSTE = {
    CHANCE: 0.11, // chance de um time criar um lance num minuto, entre times iguais
    K: 0.05, // quanto cada ponto de ataque-defesa muda isso
    MANDO: 1.17, VISITANTE: 0.87,
    PERIGOSA: 0.3, CONV_PERIGOSA: 0.27, CONV_COMUM: 0.055, CONV_PENALTI: 0.76, CONV_FALTA: 0.09,
    PENALTI: 0.013, FALTA_PERIGOSA: 0.07, // parte dos lances que vira pênalti ou falta perto da área
    FALTA: 0.13, AMARELO: 0.14, VERMELHO: 0.004, LESAO: 0.0009,
    DECISIVO: 0.5, MAX_DECISIVOS: 6, SUBS: 5,
  };

  function sorteDe(txt) { // o mesmo sorteio com semente do simulador do Leilão
    let a = 2166136261;
    for (const ch of String(txt)) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // posição da base (GOL, ZAG, LAT, VOL, MC, MEI, PE, PD, ATA) para o grupo do FIT
  const GRUPO = { GOL: "GK", GK: "GK", ZAG: "DEF", LAT: "DEF", LD: "DEF", LE: "DEF", DEF: "DEF", VOL: "VOL", MC: "MID", MID: "MID", MEI: "MEI", PE: "ATT", PD: "ATT", ATA: "ATT", ATT: "ATT" };
  const grupoDe = (pos) => GRUPO[String(pos || "").toUpperCase()] || "MID";
  const ATRIBUTOS = ["rit", "fin", "pas", "dri", "def", "fis", "gol"];
  const PESO_GOL = { ATT: 5, MEI: 3, MID: 1.6, VOL: 0.8, DEF: 0.5, GK: 0 };
  const PESO_PASSE = { ATT: 2, MEI: 4, MID: 3, VOL: 1.5, DEF: 1, GK: 0.1 };
  const PESO_FALTA = { ATT: 1, MEI: 1, MID: 1.4, VOL: 2.2, DEF: 2, GK: 0.1 };
  const TATICA_PADRAO = { mentalidade: 0, pressao: 1, linha: 1 };

  // ---------- os times ----------
  function prepararJogador(j) {
    const nota = clamp(Number(j.nota) || 60, 30, 99), atr = {};
    for (const k of ATRIBUTOS) atr[k] = clamp(Number(j.atr && j.atr[k]) || nota, 20, 99);
    return { id: String(j.id ?? j.nome), nome: j.nome || String(j.id), grp: grupoDe(j.pos), nota, atr, mania: j.mania || null, energia: 100, amarelos: 0, fora: false, lesionado: false };
  }
  const valorNa = (p, slot) => p.nota * FIT[p.grp][slot] * (0.84 + 0.16 * p.energia / 100);
  // escala o time: as vagas da formação, cada uma com quem rende mais nela (os escolhidos primeiro, se houver)
  // as vagas da formação, na ordem do campinho: o goleiro, a defesa, o meio e o ataque
  function vagasDe(formacao) {
    const form = { GK: 1, ...FORMATIONS.futebol[FORMATIONS.futebol[formacao] ? formacao : "4-3-3"] }, vagas = [];
    for (const [g, n] of Object.entries(form)) for (let i = 0; i < n; i++) vagas.push(g);
    return vagas;
  }
  // escala o time: as vagas da formação, cada uma com quem rende mais nela (os escolhidos primeiro, se houver).
  // fixo: os escolhidos já vêm na ordem das vagas (o técnico pôs cada um no seu lugar); quem não puder jogar (lesão,
  // suspensão) deixa a vaga para o melhor que sobrou no elenco
  function escalar(jogadores, formacao, preferidos, fixo) {
    const vagas = vagasDe(formacao);
    const livres = jogadores.filter((p) => !p.fora && !p.lesionado), em = new Array(vagas.length).fill(null), usados = new Set();
    if (fixo && preferidos && preferidos.length === vagas.length) {
      preferidos.forEach((id, i) => { const p = livres.find((x) => x.id === id); if (p && !usados.has(p.id)) { em[i] = p; usados.add(p.id); } });
    }
    const ordem = !fixo && preferidos && preferidos.length ? preferidos.map((id) => livres.find((p) => p.id === id)).filter(Boolean) : null;
    // o goleiro primeiro, depois as outras vagas, cada uma com o melhor que sobrou (dos escolhidos, e depois do elenco)
    const fila = vagas.map((g, i) => i).sort((a, b) => (vagas[a] === "GK" ? -1 : vagas[b] === "GK" ? 1 : 0));
    for (const pool of [ordem, livres]) {
      if (!pool) continue;
      for (const i of fila) {
        if (em[i]) continue;
        let melhor = null, bv = -1;
        for (const p of pool) if (!usados.has(p.id)) { const v = valorNa(p, vagas[i]); if (v > bv) { bv = v; melhor = p; } }
        if (melhor) { em[i] = melhor; usados.add(melhor.id); }
      }
    }
    return vagas.map((slot, i) => ({ slot, p: em[i] }));
  }
  function prepararTime(t, lado) {
    const jogadores = (t.jogadores || []).map(prepararJogador);
    const formacao = FORMATIONS.futebol[t.formacao] ? t.formacao : "4-3-3";
    const time = { lado, id: t.id || `time${lado}`, nome: t.nome || `Time ${lado + 1}`, jogadores, formacao, tatica: { ...TATICA_PADRAO, ...(t.tatica || {}) }, subs: AJUSTE.SUBS, cansacoAvisado: false, mexeu: 0 };
    time.campo = escalar(jogadores, formacao, t.titulares, t.fixo);
    time.emCampo = new Set(time.campo.filter((v) => v.p).map((v) => v.p.id));
    recalcular(time);
    return time;
  }
  function recalcular(time) {
    const xi = time.campo.map((v) => ({ slot: v.slot, eff: v.p && !v.p.fora ? valorNa(v.p, v.slot) : 0, cm: 1 }));
    const fora = time.campo.filter((v) => !v.p || v.p.fora).length;
    const f = strength(xi.map((x) => (x.eff ? x : { ...x, eff: 30 })));
    const menos = Math.pow(0.9, fora); // cada um a menos pesa
    time.att = f.att * menos; time.def = f.def * menos;
    time.gk = time.campo[0].p && !time.campo[0].p.fora ? time.campo[0].p : null;
  }
  const titulares = (time) => time.campo.filter((v) => v.p && !v.p.fora).map((v) => v.p);
  const banco = (time) => time.jogadores.filter((p) => !time.emCampo.has(p.id) && !p.fora && !p.lesionado && !p.saiu);
  const media = (lista, k) => (lista.length ? lista.reduce((s, p) => s + (k ? p.atr[k] : p.nota), 0) / lista.length : 50);
  const doGrupo = (time, gs) => titulares(time).filter((p) => gs.includes(p.grp));
  function sortearPeso(rng, lista, peso) {
    const total = lista.reduce((s, p) => s + peso(p), 0);
    let r = rng() * total;
    for (const p of lista) { r -= peso(p); if (r <= 0) return p; }
    return lista[lista.length - 1];
  }
  // a "mania" do batedor e do goleiro no pênalti: os cantos preferidos (da base, ou sorteados pelo nome, sempre iguais)
  function maniaDe(p) {
    if (p && Array.isArray(p.mania) && p.mania.length === 6) return p.mania.map(Number);
    const r = sorteDe("mania:" + (p ? p.id : "?")), pesos = ZONAS.map(() => 0.4 + r());
    pesos[Math.floor(r() * 6)] += 1.2;
    const s = pesos.reduce((a, b) => a + b, 0);
    return pesos.map((x) => x / s);
  }

  // ---------- os lances decisivos (modo 3) ----------
  const pct = (x) => Math.round(clamp(x, 0.03, 0.97) * 100) / 100;
  // opções de cada lance: chance de dar certo e o que acontece se der errado (quanto o gol fica provável)
  function opcoesDoLance(tipo, at, df, quem, goleiro) {
    const atq = doGrupo(at, ["ATT", "MEI"]), dfs = doGrupo(df, ["DEF", "VOL"]);
    const gk = goleiro ? goleiro.atr.gol : 45, defesa = media(dfs, "def"), fisD = media(dfs, "fis");
    if (tipo === "ataque_favor") return [
      { id: "chutar", nome: "Chutar de primeira", chance: pct(0.27 + 0.012 * (quem.atr.fin - gk)) },
      { id: "tocar", nome: "Tocar para quem chega", chance: pct(0.3 + 0.012 * (media(atq, "pas") - defesa)) },
      { id: "driblar", nome: "Driblar o marcador", chance: pct(0.23 + 0.015 * (quem.atr.dri - defesa)) },
      { id: "cruzar", nome: "Cruzar na área", chance: pct(0.22 + 0.012 * (media(atq, "fis") - fisD)) },
    ];
    if (tipo === "ataque_contra") { // aqui "chance" é de evitar o gol
      const meus = doGrupo(at, ["DEF", "VOL"]), eles = doGrupo(df, ["ATT", "MEI"]);
      const d = media(meus, "def"), r = media(meus, "rit");
      return [
        { id: "impedimento", nome: "Fazer a linha de impedimento", chance: pct(0.52 + 0.014 * (r - media(eles, "rit")) + 0.04 * (at.tatica.linha - 1)), risco: 0.62 },
        { id: "bloco", nome: "Marcar em bloco baixo", chance: pct(0.66 + 0.01 * (d - media(eles, "fin"))), risco: 0.32 },
        { id: "mano", nome: "Mano a mano", chance: pct(0.5 + 0.015 * (d - media(eles, "dri"))), risco: 0.45 },
        { id: "contra", nome: "Deixar o time pronto para o contra-ataque", chance: pct(0.34 + 0.01 * (media(doGrupo(at, ["ATT"]), "rit") - d)), risco: 0.55, contra: true },
      ];
    }
    if (tipo === "falta_favor") return [
      { id: "direto", nome: "Chute direto", chance: pct(0.13 + 0.01 * (quem.atr.fin - gk)) },
      { id: "cruzamento", nome: "Cruzamento na área", chance: pct(0.15 + 0.01 * (media(doGrupo(at, ["DEF", "ATT"]), "fis") - fisD)) },
      { id: "ensaiada", nome: "Jogada ensaiada", chance: pct(0.17 + 0.01 * (media(atq, "pas") - defesa)) },
    ];
    if (tipo === "falta_contra") {
      const meuGk = at.gk ? at.gk.atr.gol : 45, meus = doGrupo(at, ["DEF", "VOL"]);
      return [
        { id: "barreira", nome: "Barreira com mais gente", chance: pct(0.8 + 0.006 * (meuGk - quem.atr.fin)), risco: 0.4 },
        { id: "adiantado", nome: "Goleiro adiantado", chance: pct(0.72 + 0.012 * (meuGk - quem.atr.fin)), risco: 0.5 },
        { id: "zona", nome: "Marcar por zona", chance: pct(0.76 + 0.01 * (media(meus, "fis") - media(doGrupo(df, ["DEF", "ATT"]), "fis"))), risco: 0.45 },
      ];
    }
    return [];
  }
  // pênalti: a favor, escolhe o canto (chance = gol); contra, escolhe o pulo (chance = defesa)
  function opcoesDoPenalti(aFavor, batedor, goleiro) {
    const m = maniaDe(aFavor ? goleiro : batedor);
    return ZONAS.map((z, i) => ({ id: z, nome: Ritmo.ZONA_NOME[z], chance: pct(aFavor ? (1 - FORA) * (1 - m[i]) : (1 - FORA) * m[i]) }));
  }

  // ---------- a partida ----------
  const PARAR = Symbol("parar");
  function simularPartida(cfg = {}) {
    const rng = sorteDe(cfg.semente || "partida");
    const modo = [1, 2, 3].includes(cfg.modo) ? cfg.modo : 1;
    const controla = cfg.controla === 0 || cfg.controla === 1 ? cfg.controla : null;
    const decisoes = cfg.decisoes || {};
    const times = [prepararTime(cfg.casa || {}, 0), prepararTime(cfg.fora || {}, 1)];
    const neutro = !!cfg.neutro;
    const placar = [0, 0], eventos = [], est = [0, 1].map(() => ({ chutes: 0, noAlvo: 0, faltas: 0, amarelos: 0, vermelhos: 0, lances: 0 }));
    let decisivos = 0, golsContra = 0, minuto = 0, acrescimo = 0, parado = null;
    const ev = (e) => eventos.push({ min: minuto, ...(acrescimo ? { acr: acrescimo } : {}), ...e });
    const humano = (lado) => controla === lado && modo >= 2;

    // pede (ou usa) a decisão do ponto `id`; sem resposta, para a partida aqui
    function decidir(id, pedido) {
      if (decisoes[id] != null) return decisoes[id];
      parado = { id, min: minuto, ...(acrescimo ? { acr: acrescimo } : {}), placar: [...placar], ...pedido };
      throw PARAR;
    }
    function pedidoTatico(time, motivo) {
      return {
        tipo: "tatica", motivo, lado: time.lado, formacao: time.formacao, tatica: { ...time.tatica }, subs: time.subs,
        titulares: titulares(time).map((p) => ({ id: p.id, nome: p.nome, pos: p.grp, nota: p.nota, energia: Math.round(p.energia), amarelos: p.amarelos })),
        campo: time.campo.map((v) => ({ slot: v.slot, id: v.p && !v.p.fora ? v.p.id : null })), // o lugar de cada um, para o campinho
        banco: banco(time).map((p) => ({ id: p.id, nome: p.nome, pos: p.grp, nota: p.nota })),
      };
    }
    function aplicarTatica(time, d) {
      if (!d || typeof d !== "object") return;
      if (d.tatica) for (const k of Object.keys(TATICA_PADRAO)) if (d.tatica[k] != null) time.tatica[k] = clamp(Math.round(Number(d.tatica[k]) || 0), k === "mentalidade" ? -2 : 0, 2);
      for (const [sai, entra] of Array.isArray(d.subs) ? d.subs : []) substituir(time, sai, entra);
      // trocar dois de lugar no campo (sem gastar substituição)
      for (const [a, b] of Array.isArray(d.trocas) ? d.trocas : []) {
        const va = time.campo.find((v) => v.p && v.p.id === a), vb = time.campo.find((v) => v.p && v.p.id === b);
        if (va && vb && va !== vb) { [va.p, vb.p] = [vb.p, va.p]; ev({ tipo: "posicao", lado: time.lado, a, b }); }
      }
      if (d.formacao && FORMATIONS.futebol[d.formacao] && d.formacao !== time.formacao) {
        time.formacao = d.formacao;
        time.campo = escalar(time.jogadores.filter((p) => time.emCampo.has(p.id)), d.formacao);
        ev({ tipo: "formacao", lado: time.lado, formacao: d.formacao });
      }
      recalcular(time);
    }
    function parada(time, id, motivo) { if (humano(time.lado)) aplicarTatica(time, decidir(id, pedidoTatico(time, motivo))); }
    function substituir(time, saiId, entraId) {
      if (time.subs <= 0) return false;
      const vaga = time.campo.find((v) => v.p && v.p.id === saiId && !v.p.fora);
      const entra = banco(time).find((p) => p.id === entraId);
      if (!vaga || !entra) return false;
      vaga.p.saiu = true; time.emCampo.delete(saiId); time.emCampo.add(entra.id); vaga.p = entra; time.subs--;
      ev({ tipo: "sub", lado: time.lado, sai: saiId, entra: entra.id });
      recalcular(time);
      return true;
    }
    // o técnico do computador: tira os mais cansados, arrisca quando perde e segura quando ganha
    function tecnicoRobo(time) {
      if (humano(time.lado)) return;
      const dif = placar[time.lado] - placar[1 - time.lado];
      if (minuto >= 60 && time.subs > 0 && time.mexeu < 3 && minuto % 8 === 0) {
        const cansado = titulares(time).filter((p) => p.grp !== "GK").sort((a, b) => a.energia - b.energia)[0];
        const vaga = cansado && time.campo.find((v) => v.p === cansado);
        if (cansado && cansado.energia < 75 && vaga) {
          const melhor = banco(time).filter((p) => p.grp !== "GK").sort((a, b) => valorNa(b, vaga.slot) - valorNa(a, vaga.slot))[0];
          if (melhor && substituir(time, cansado.id, melhor.id)) time.mexeu++;
        }
      }
      if (minuto === 70 && dif < 0) time.tatica.mentalidade = clamp(time.tatica.mentalidade + 1, -2, 2);
      if (minuto === 82 && dif === 1) time.tatica.mentalidade = clamp(time.tatica.mentalidade - 1, -2, 2);
    }
    function gol(at, autor, assist, como) {
      placar[at.lado]++;
      ev({ tipo: "gol", lado: at.lado, jogador: autor.id, ...(assist ? { assist: assist.id } : {}), como, placar: [...placar] });
      if (controla === 1 - at.lado) { golsContra++; parada(times[controla], `gol${golsContra}`, "gol_sofrido"); }
    }
    function finalizador(at) { return sortearPeso(rng, titulares(at), (p) => PESO_GOL[p.grp] * p.atr.fin); }
    function garcom(at, autor) { const l = titulares(at).filter((p) => p !== autor && p.grp !== "GK"); return l.length && rng() < 0.75 ? sortearPeso(rng, l, (p) => PESO_PASSE[p.grp] * p.atr.pas) : null; }

    // um lance de `at` contra `df`
    function lance(at, df) {
      est[at.lado].lances++;
      const r = rng(), tipo = r < AJUSTE.PENALTI ? "penalti" : r < AJUSTE.PENALTI + AJUSTE.FALTA_PERIGOSA ? "falta" : "jogada";
      const perigosa = tipo !== "jogada" || rng() < AJUSTE.PERIGOSA;
      const autor = tipo === "jogada" ? finalizador(at) : sortearPeso(rng, titulares(at), (p) => (p.grp === "GK" ? 0 : p.atr.fin * (p.grp === "ATT" ? 2 : 1)));
      const gk = df.gk, gkNota = gk ? gk.atr.gol : 40;
      const decisivo = modo === 3 && controla != null && perigosa && decisivos < AJUSTE.MAX_DECISIVOS && rng() < AJUSTE.DECISIVO;
      if (decisivo) return lanceDecisivo(at, df, tipo, autor, gk);
      let conv = tipo === "penalti" ? AJUSTE.CONV_PENALTI : tipo === "falta" ? AJUSTE.CONV_FALTA : perigosa ? AJUSTE.CONV_PERIGOSA : AJUSTE.CONV_COMUM;
      if (tipo !== "penalti") conv *= Math.exp(0.03 * (autor.atr.fin - gkNota)) * (1 + 0.1 * (df.tatica.linha - 1));
      est[at.lado].chutes++;
      if (tipo === "penalti") ev({ tipo: "penalti", lado: at.lado, jogador: autor.id });
      if (rng() < conv) { est[at.lado].noAlvo++; return gol(at, autor, tipo === "jogada" ? garcom(at, autor) : null, tipo); }
      const noAlvo = rng() < 0.45;
      if (noAlvo) est[at.lado].noAlvo++;
      if (perigosa) ev({ tipo: noAlvo && gk ? "defesa" : "perdeu", lado: at.lado, jogador: autor.id, ...(noAlvo && gk ? { goleiro: gk.id } : {}), como: tipo });
    }
    function lanceDecisivo(at, df, tipo, autor, gk) {
      decisivos++;
      const id = `lance${decisivos}`, aFavor = at.lado === controla, euDecido = aFavor ? at : df;
      est[at.lado].chutes++;
      if (tipo === "penalti") {
        const opcoes = opcoesDoPenalti(aFavor, autor, gk);
        const dec = decidir(id, { tipo: "lance", lance: aFavor ? "penalti_favor" : "penalti_contra", lado: euDecido.lado, batedor: autor.id, goleiro: gk ? gk.id : null, opcoes });
        const escolha = ZONAS.includes(dec) ? dec : ZONAS.includes(dec && dec.opcao) ? dec.opcao : ZONAS[0];
        const outro = ZONAS[Math.floor(sortearIndice(rng, maniaDe(aFavor ? gk : autor)))];
        const chute = aFavor ? escolha : outro, pulo = aFavor ? outro : escolha, foraDoGol = rng() < FORA;
        const entrou = !foraDoGol && chute !== pulo;
        ev({ tipo: "penalti", lado: at.lado, jogador: autor.id, chute, pulo, fora: foraDoGol, decisivo: id });
        if (entrou) { est[at.lado].noAlvo++; return gol(at, autor, null, "penalti"); }
        return ev({ tipo: foraDoGol ? "perdeu" : "defesa", lado: at.lado, jogador: autor.id, ...(gk && !foraDoGol ? { goleiro: gk.id } : {}), como: "penalti" });
      }
      const qual = tipo === "falta" ? (aFavor ? "falta_favor" : "falta_contra") : aFavor ? "ataque_favor" : "ataque_contra";
      const opcoes = opcoesDoLance(qual, euDecido, aFavor ? df : at, autor, aFavor ? gk : euDecido.gk);
      const dec = decidir(id, { tipo: "lance", lance: qual, lado: euDecido.lado, jogador: autor.id, adversario: aFavor ? null : at.id, opcoes: opcoes.map(({ id: oid, nome, chance }) => ({ id: oid, nome, chance })) });
      const op = opcoes.find((o) => o.id === (dec && dec.opcao ? dec.opcao : dec)) || opcoes[0];
      const certo = rng() < op.chance;
      ev({ tipo: "lance", lado: at.lado, lance: qual, opcao: op.id, certo, jogador: autor.id, decisivo: id });
      if (aFavor) {
        if (certo) { est[at.lado].noAlvo++; return gol(at, autor, op.id === "tocar" || op.id === "cruzar" || op.id === "ensaiada" ? garcom(at, autor) : null, tipo); }
        return gk && rng() < 0.5 ? ev({ tipo: "defesa", lado: at.lado, jogador: autor.id, goleiro: gk.id, como: tipo }) : ev({ tipo: "perdeu", lado: at.lado, jogador: autor.id, como: tipo });
      }
      if (certo) {
        if (op.contra) { ev({ tipo: "contra_ataque", lado: df.lado }); est[df.lado].chutes++; if (rng() < 0.33) { const a = finalizador(df); est[df.lado].noAlvo++; return gol(df, a, garcom(df, a), "contra_ataque"); } }
        return;
      }
      if (rng() < op.risco) { est[at.lado].noAlvo++; return gol(at, autor, garcom(at, autor), tipo); }
      ev({ tipo: "perdeu", lado: at.lado, jogador: autor.id, como: tipo });
    }
    function sortearIndice(r, pesos) { let x = r() * pesos.reduce((a, b) => a + b, 0); for (let i = 0; i < pesos.length; i++) { x -= pesos[i]; if (x <= 0) return i; } return pesos.length - 1; }

    function faltasECartoes(time) {
      if (rng() >= AJUSTE.FALTA * (1 + 0.15 * (time.tatica.pressao - 1))) return;
      est[time.lado].faltas++;
      const r = rng();
      if (r >= AJUSTE.AMARELO + AJUSTE.VERMELHO) return;
      const p = sortearPeso(rng, titulares(time), (x) => PESO_FALTA[x.grp]);
      if (r < AJUSTE.VERMELHO || ++p.amarelos >= 2) expulsar(time, p, r < AJUSTE.VERMELHO ? "direto" : "segundo_amarelo");
      else { est[time.lado].amarelos++; ev({ tipo: "amarelo", lado: time.lado, jogador: p.id }); }
    }
    function expulsar(time, p, como) {
      p.fora = true; est[time.lado].vermelhos++;
      ev({ tipo: "vermelho", lado: time.lado, jogador: p.id, como });
      if (p.grp === "GK" || time.campo[0].p === p) { // sem goleiro: entra o reserva no lugar de um da linha, ou um da linha vai para o gol
        const reserva = banco(time).find((x) => x.grp === "GK"), sacrificado = titulares(time).filter((x) => x.grp !== "GK").sort((a, b) => a.nota - b.nota)[0];
        if (reserva && sacrificado && time.subs > 0) { const v = time.campo.find((x) => x.p === sacrificado); v.p = null; time.campo[0].p = reserva; time.emCampo.delete(sacrificado.id); sacrificado.saiu = true; time.emCampo.add(reserva.id); time.subs--; ev({ tipo: "sub", lado: time.lado, sai: sacrificado.id, entra: reserva.id }); }
        else if (sacrificado) { const v = time.campo.find((x) => x.p === sacrificado); v.p = null; time.campo[0].p = sacrificado; }
      }
      recalcular(time);
      if (humano(time.lado)) parada(time, `vermelho${est[time.lado].vermelhos}`, "vermelho");
    }
    function lesoes(time) {
      if (rng() >= AJUSTE.LESAO) return;
      const p = sortearPeso(rng, titulares(time), () => 1);
      p.lesionado = true;
      ev({ tipo: "lesao", lado: time.lado, jogador: p.id });
      const vaga = time.campo.find((v) => v.p === p);
      const subst = banco(time).filter((x) => (vaga.slot === "GK") === (x.grp === "GK")).sort((a, b) => valorNa(b, vaga.slot) - valorNa(a, vaga.slot))[0];
      if (!subst || !substituir(time, p.id, subst.id)) { vaga.p = null; time.emCampo.delete(p.id); recalcular(time); }
    }
    function cansar(time) {
      const gasto = 0.24 + 0.1 * time.tatica.pressao;
      for (const p of titulares(time)) p.energia = Math.max(30, p.energia - gasto * (1.15 - p.atr.fis / 400) * (p.grp === "GK" ? 0.3 : 1));
    }
    function minutoDeJogo() {
      for (const t of times) { cansar(t); faltasECartoes(t); lesoes(t); tecnicoRobo(t); }
      if (minuto % 5 === 0) times.forEach(recalcular);
      for (const [a, d] of [[0, 1], [1, 0]]) {
        const at = times[a], df = times[d];
        const mando = neutro ? 1 : a === 0 ? AJUSTE.MANDO : AJUSTE.VISITANTE;
        const taxa = AJUSTE.CHANCE * Math.exp(AJUSTE.K * (at.att - df.def)) * mando
          * (1 + 0.12 * at.tatica.mentalidade) * (1 + 0.08 * df.tatica.mentalidade) * (1 - 0.06 * (df.tatica.pressao - 1)) * (1 - 0.04 * (df.tatica.linha - 1));
        if (rng() < taxa) lance(at, df);
      }
      if (controla != null && modo >= 2) {
        const t = times[controla];
        const linha = titulares(t).filter((p) => p.grp !== "GK");
        if (!t.cansacoAvisado && linha.length && linha.reduce((soma, p) => soma + p.energia, 0) / linha.length < 72) {
          t.cansacoAvisado = true; parada(t, "cansaco", "cansaco");
        }
        if (minuto === 70 && !acrescimo) parada(t, "m70", "minuto_70");
      }
    }

    try {
      const acr = [1 + Math.floor(rng() * 3), 2 + Math.floor(rng() * 4)];
      for (let tempo = 0; tempo < 2; tempo++) {
        for (minuto = tempo * 45 + 1; minuto <= (tempo + 1) * 45; minuto++) { acrescimo = 0; minutoDeJogo(); }
        minuto = (tempo + 1) * 45;
        for (acrescimo = 1; acrescimo <= acr[tempo]; acrescimo++) minutoDeJogo();
        acrescimo = 0;
        if (tempo === 0) {
          ev({ tipo: "intervalo", placar: [...placar] });
          for (const t of times) t.jogadores.forEach((p) => { if (!p.fora) p.energia = Math.min(100, p.energia + 8); });
          if (controla != null && modo >= 2) parada(times[controla], "intervalo", "intervalo");
        }
      }
      minuto = 90;
      ev({ tipo: "fim", placar: [...placar] });
    } catch (e) { if (e !== PARAR) throw e; }

    return {
      placar, eventos, parado, completo: !parado, estatisticas: est,
      times: times.map((t) => ({ id: t.id, nome: t.nome, formacao: t.formacao, tatica: { ...t.tatica }, titulares: titulares(t).map((p) => p.id), subs: t.subs })),
    };
  }

  // o técnico do computador nos lances decisivos (para testar o modo 3 sem gente): pega a opção de maior chance
  function decisaoAutomatica(parado) {
    if (!parado) return null;
    if (parado.tipo === "tatica") return {};
    return [...parado.opcoes].sort((a, b) => b.chance - a.chance)[0].id;
  }

  // quem entra jogando se o técnico deixar no automático (a mesma conta da partida)
  const escalacaoAutomatica = (t) => titulares(prepararTime(t, 0)).map((p) => p.id);
  // a escalação com o lugar de cada um (na ordem das vagas de vagasDe): para o campinho da tela
  const escalacaoDetalhada = (t) => prepararTime(t, 0).campo.map((v) => ({ slot: v.slot, id: v.p ? v.p.id : null }));

  return { AJUSTE, simularPartida, decisaoAutomatica, escalacaoAutomatica, escalacaoDetalhada, vagasDe, valorNa: (j, slot) => valorNa(prepararJogador(j), slot), sorteDe, grupoDe };
});
