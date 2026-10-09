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
  if (typeof module === "object" && module.exports) module.exports = factory(require("../escalacao.js"), require("../leilao/ritmo.js"), require("./taticas.js"));
  else root.Motor = factory(root.Escalacao, root.Ritmo, root.Taticas);
})(typeof self !== "undefined" ? self : this, function (Escalacao, Ritmo, Taticas) {
  const { strength } = Escalacao;
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
  // o grupo em que o jogador atua de verdade (pela vaga em que esta) e o quanto rende ali: valem nos lances e nos pesos
  const efG = (p) => p.efGrp || p.grp;

  // ---------- os times ----------
  function prepararJogador(j) {
    const nota = clamp(Number(j.nota) || 60, 30, 99), atr = {};
    for (const k of ATRIBUTOS) atr[k] = clamp(Number(j.atr && j.atr[k]) || nota, 20, 99);
    return { id: String(j.id ?? j.nome), nome: j.nome || String(j.id), grp: grupoDe(j.pos), pos: Taticas.posDe(j.pos), nota, atr, mania: j.mania || null, energia: 100, amarelos: 0, fora: false, lesionado: false };
  }
  // o rendimento na vaga: a nota, o encaixe da posicao dele na vaga fina (lateral na zaga, ponta de centroavante...) e o cansaco
  const slotPadrao = (slot) => ({ GK: "GOL", DEF: "ZAG", MID: "MC", ATT: "ATA" })[slot] || "MC";
  const valorNa = (p, slot, fino) => p.nota * Taticas.afinidade(p.pos, fino || slotPadrao(slot)) * (0.84 + 0.16 * p.energia / 100);
  // escala o time: as vagas da formação, cada uma com quem rende mais nela (os escolhidos primeiro, se houver)
  // as vagas da formação, na ordem do campinho: o goleiro, a defesa, o meio e o ataque
  const vagasDe = (formacao) => Taticas.vagasDe(formacao).map((v) => v.g);
  // escala o time: as vagas da formação, cada uma com quem rende mais nela (os escolhidos primeiro, se houver).
  // fixo: os escolhidos já vêm na ordem das vagas (o técnico pôs cada um no seu lugar); quem não puder jogar (lesão,
  // suspensão) deixa a vaga para o melhor que sobrou no elenco
  function escalar(jogadores, formacao, preferidos, fixo) {
    const finas = Taticas.vagasDe(formacao), vagas = finas.map((v) => v.g);
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
        for (const p of pool) if (!usados.has(p.id)) { const v = valorNa(p, vagas[i], finas[i].fino); if (v > bv) { bv = v; melhor = p; } }
        if (melhor) { em[i] = melhor; usados.add(melhor.id); }
      }
    }
    return vagas.map((slot, i) => ({ slot, fino: finas[i].fino, p: em[i] }));
  }
  function prepararTime(t, lado) {
    const jogadores = (t.jogadores || []).map(prepararJogador);
    // a energia com que cada um chega ao jogo: a que sobrou dos jogos anteriores (t.energia = { id: 0 a 100 }); sem registro, 100
    if (t.energia) for (const p of jogadores) if (t.energia[p.id] != null) p.energia = clamp(Number(t.energia[p.id]) || 0, 20, 100);
    const energiaInicial = jogadores.length ? jogadores.reduce((s, p) => s + p.energia, 0) / jogadores.length : 100;
    const formacao = Taticas.FORMACOES[t.formacao] ? t.formacao : "4-3-3";
    const estilo = Taticas.estiloValido(t.tatica && t.tatica.estilo);
    const time = { lado, id: t.id || `time${lado}`, nome: t.nome || `Time ${lado + 1}`, jogadores, formacao, tatica: { ...TATICA_PADRAO, ...(t.tatica || {}), estilo }, subs: AJUSTE.SUBS, cansacoAvisado: false, mexeu: 0, energiaInicial };
    time.campo = escalar(jogadores, formacao, t.titulares, t.fixo);
    // estilo "auto" (o computador): o que mais combina com o elenco que vai a campo
    if (t.tatica && t.tatica.estilo === "auto") time.tatica.estilo = Taticas.estiloIdeal(time.campo.filter((v) => v.p).map((v) => ({ grp: v.p.grp, atr: v.p.atr })));
    time.emCampo = new Set(time.campo.filter((v) => v.p).map((v) => v.p.id));
    recalcular(time);
    return time;
  }
  function recalcular(time) {
    // cada titular leva o encaixe da vaga em que esta (p.fit) e o grupo em que atua (p.efGrp)
    for (const v of time.campo) if (v.p) {
      v.p.fit = Taticas.afinidade(v.p.pos, v.fino);
      v.p.efGrp = v.slot === "DEF" ? "DEF" : v.slot === "ATT" ? "ATT" : v.slot === "GK" ? "GK" : ["MEI", "VOL", "MID"].includes(v.p.grp) ? v.p.grp : "MID";
    }
    const xi = time.campo.map((v) => ({ slot: v.slot, eff: v.p && !v.p.fora ? valorNa(v.p, v.slot, v.fino) : 0, cm: 1 }));
    // o estilo de jogo: o bonus vale pelo encaixe do elenco (nos 11 em campo), o custo vale sempre
    const jogando = time.campo.filter((v) => v.p && !v.p.fora).map((v) => ({ grp: v.p.efGrp, atr: v.p.atr }));
    time.estF = Taticas.encaixe(time.tatica.estilo, jogando); time.est = Taticas.fatores(time.tatica.estilo, time.estF);
    const fora = time.campo.filter((v) => !v.p || v.p.fora).length;
    const f = strength(xi.map((x) => (x.eff ? x : { ...x, eff: 30 })));
    const menos = Math.pow(0.9, fora); // cada um a menos pesa
    time.att = f.att * menos; time.def = f.def * menos;
    time.gk = time.campo[0].p && !time.campo[0].p.fora ? time.campo[0].p : null;
  }
  const titulares = (time) => time.campo.filter((v) => v.p && !v.p.fora).map((v) => v.p);
  const banco = (time) => time.jogadores.filter((p) => !time.emCampo.has(p.id) && !p.fora && !p.lesionado && !p.saiu);
  const media = (lista, k) => (lista.length ? lista.reduce((s, p) => s + (k ? p.atr[k] * (p.fit || 1) : p.nota), 0) / lista.length : 50);
  const doGrupo = (time, gs) => titulares(time).filter((p) => gs.includes(efG(p)));
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
    const lista = opcoesBase(tipo, at, df, quem, goleiro), aj = at.est ? at.est.lance : {};
    return lista.map((o) => (aj[o.id] ? { ...o, chance: pct(o.chance + aj[o.id]) } : o));
  }
  function opcoesBase(tipo, at, df, quem, goleiro) {
    const atq = doGrupo(at, ["ATT", "MEI", "MID"]), dfs = doGrupo(df, ["DEF", "VOL", "MID"]);
    const gk = goleiro ? goleiro.atr.gol : 45, defesa = media(dfs, "def"), fisD = media(dfs, "fis");
    if (tipo === "ataque_favor") return [
      { id: "chutar", nome: "Chutar de primeira", chance: pct(0.27 + 0.012 * (quem.atr.fin - gk)) },
      { id: "tocar", nome: "Tocar para quem chega", chance: pct(0.3 + 0.012 * (media(atq, "pas") - defesa)) },
      { id: "driblar", nome: "Driblar o marcador", chance: pct(0.23 + 0.015 * (quem.atr.dri - defesa)) },
      { id: "cruzar", nome: "Cruzar na área", chance: pct(0.22 + 0.012 * (media(atq, "fis") - fisD)) },
    ];
    if (tipo === "ataque_contra") { // aqui "chance" é de evitar o gol
      const meus = doGrupo(at, ["DEF", "VOL", "MID"]), eles = doGrupo(df, ["ATT", "MEI", "MID"]);
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
      const meuGk = at.gk ? at.gk.atr.gol : 45, meus = doGrupo(at, ["DEF", "VOL", "MID"]);
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
    // controla: o lado do humano (0 casa, 1 fora) ou 2, os dois lados humanos (carreira em grupo, humano contra humano):
    // aí as paradas e os lances pedem a decisão dos dois de uma vez (parado.ambos, com o pedido de cada lado em
    // parado.pedidos), e a resposta é { 0: ..., 1: ... }
    const ambos = cfg.controla === 2;
    const controla = ambos ? null : cfg.controla === 0 || cfg.controla === 1 ? cfg.controla : null;
    const decisoes = cfg.decisoes || {};
    const times = [prepararTime(cfg.casa || {}, 0), prepararTime(cfg.fora || {}, 1)];
    const neutro = !!cfg.neutro;
    const placar = [0, 0], eventos = [], est = [0, 1].map(() => ({ chutes: 0, noAlvo: 0, faltas: 0, amarelos: 0, vermelhos: 0, lances: 0 }));
    let decisivos = 0, golsContra = 0, minuto = 0, acrescimo = 0, parado = null;
    const ev = (e) => eventos.push({ min: minuto, ...(acrescimo ? { acr: acrescimo } : {}), ...e });
    const humano = (lado) => (ambos || controla === lado) && modo >= 2;

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
        campo: time.campo.map((v) => ({ slot: v.slot, fino: v.fino, id: v.p && !v.p.fora ? v.p.id : null })), // o lugar de cada um, para o campinho
        estiloF: time.estF,
        banco: banco(time).map((p) => ({ id: p.id, nome: p.nome, pos: p.grp, nota: p.nota })),
      };
    }
    function aplicarTatica(time, d) {
      if (!d || typeof d !== "object") return;
      if (d.tatica) {
        for (const k of Object.keys(TATICA_PADRAO)) if (d.tatica[k] != null) time.tatica[k] = clamp(Math.round(Number(d.tatica[k]) || 0), k === "mentalidade" ? -2 : 0, 2);
        if (d.tatica.estilo != null) time.tatica.estilo = Taticas.estiloValido(d.tatica.estilo);
      }
      for (const [sai, entra] of Array.isArray(d.subs) ? d.subs : []) substituir(time, sai, entra);
      // trocar dois de lugar no campo (sem gastar substituição)
      for (const [a, b] of Array.isArray(d.trocas) ? d.trocas : []) {
        const va = time.campo.find((v) => v.p && v.p.id === a), vb = time.campo.find((v) => v.p && v.p.id === b);
        if (va && vb && va !== vb) { [va.p, vb.p] = [vb.p, va.p]; ev({ tipo: "posicao", lado: time.lado, a, b }); }
      }
      if (d.formacao && Taticas.FORMACOES[d.formacao] && d.formacao !== time.formacao) {
        time.formacao = d.formacao;
        time.campo = escalar(time.jogadores.filter((p) => time.emCampo.has(p.id)), d.formacao);
        ev({ tipo: "formacao", lado: time.lado, formacao: d.formacao });
      }
      recalcular(time);
    }
    function parada(time, id, motivo) {
      if (!humano(time.lado)) return;
      if (ambos) { const d = decidir(`${id}:${time.lado}`, { tipo: "tatica", ambos: true, pedidos: { [time.lado]: pedidoTatico(time, motivo) } }); return aplicarTatica(time, d && d[time.lado]); }
      aplicarTatica(time, decidir(id, pedidoTatico(time, motivo)));
    }
    // as paradas dos dois técnicos ao mesmo tempo (intervalo e reta final, no humano contra humano)
    function paradaDosDois(id, motivo) {
      const d = decidir(id, { tipo: "tatica", ambos: true, pedidos: { 0: pedidoTatico(times[0], motivo), 1: pedidoTatico(times[1], motivo) } });
      for (const t of times) aplicarTatica(t, d && d[t.lado]);
    }
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
          const melhor = banco(time).filter((p) => p.grp !== "GK").sort((a, b) => valorNa(b, vaga.slot, vaga.fino) - valorNa(a, vaga.slot, vaga.fino))[0];
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
      else if (ambos) { golsContra++; parada(times[1 - at.lado], `gol${golsContra}`, "gol_sofrido"); }
    }
    function finalizador(at) { return sortearPeso(rng, titulares(at), (p) => PESO_GOL[efG(p)] * p.atr.fin * (p.fit || 1)); }
    function garcom(at, autor) { const l = titulares(at).filter((p) => p !== autor && p.grp !== "GK"); return l.length && rng() < 0.75 ? sortearPeso(rng, l, (p) => PESO_PASSE[efG(p)] * p.atr.pas) : null; }

    // um lance de `at` contra `df`
    function lance(at, df) {
      est[at.lado].lances++;
      const r = rng(), tipo = r < AJUSTE.PENALTI ? "penalti" : r < AJUSTE.PENALTI + AJUSTE.FALTA_PERIGOSA ? "falta" : "jogada";
      const perigosa = tipo !== "jogada" || rng() < AJUSTE.PERIGOSA;
      const autor = tipo === "jogada" ? finalizador(at) : sortearPeso(rng, titulares(at), (p) => (p.grp === "GK" ? 0 : p.atr.fin * (efG(p) === "ATT" ? 2 : 1)));
      const gk = df.gk, gkNota = gk ? gk.atr.gol : 40;
      const decisivo = modo === 3 && (controla != null || ambos) && perigosa && decisivos < AJUSTE.MAX_DECISIVOS && rng() < AJUSTE.DECISIVO;
      if (decisivo) return ambos ? lanceDosDois(at, df, tipo, autor, gk) : lanceDecisivo(at, df, tipo, autor, gk);
      let conv = tipo === "penalti" ? AJUSTE.CONV_PENALTI : tipo === "falta" ? AJUSTE.CONV_FALTA : perigosa ? AJUSTE.CONV_PERIGOSA : AJUSTE.CONV_COMUM;
      if (tipo !== "penalti") conv *= Math.exp(0.03 * (autor.atr.fin - gkNota)) * (1 + 0.1 * (df.tatica.linha - 1)) * at.est.conv;
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
    // o lance decisivo no humano contra humano: quem ataca escolhe a jogada e quem defende escolhe a defesa, ao mesmo
    // tempo. No pênalti, o duelo do Leilão: quem bate escolhe o canto e o goleiro escolhe o pulo.
    function lanceDosDois(at, df, tipo, autor, gk) {
      decisivos++;
      const id = `lance${decisivos}`;
      est[at.lado].chutes++;
      if (tipo === "penalti") {
        const pedidos = { [at.lado]: { tipo: "lance", lance: "penalti_favor", lado: at.lado, batedor: autor.id, goleiro: gk ? gk.id : null, opcoes: opcoesDoPenalti(true, autor, gk) },
          [df.lado]: { tipo: "lance", lance: "penalti_contra", lado: df.lado, batedor: autor.id, goleiro: gk ? gk.id : null, opcoes: opcoesDoPenalti(false, autor, gk) } };
        const dec = decidir(id, { tipo: "lance", ambos: true, pedidos }) || {};
        const zona = (x) => (ZONAS.includes(x) ? x : ZONAS.includes(x && x.opcao) ? x.opcao : ZONAS[0]);
        const chute = zona(dec[at.lado]), pulo = zona(dec[df.lado]), foraDoGol = rng() < FORA;
        ev({ tipo: "penalti", lado: at.lado, jogador: autor.id, chute, pulo, fora: foraDoGol, decisivo: id });
        if (!foraDoGol && chute !== pulo) { est[at.lado].noAlvo++; return gol(at, autor, null, "penalti"); }
        return ev({ tipo: foraDoGol ? "perdeu" : "defesa", lado: at.lado, jogador: autor.id, ...(gk && !foraDoGol ? { goleiro: gk.id } : {}), como: "penalti" });
      }
      const favor = tipo === "falta" ? "falta_favor" : "ataque_favor", contra = tipo === "falta" ? "falta_contra" : "ataque_contra";
      const opA = opcoesDoLance(favor, at, df, autor, gk), opD = opcoesDoLance(contra, df, at, autor, df.gk);
      const so = (l) => l.map(({ id: oid, nome, chance }) => ({ id: oid, nome, chance }));
      const dec = decidir(id, { tipo: "lance", ambos: true, pedidos: { [at.lado]: { tipo: "lance", lance: favor, lado: at.lado, jogador: autor.id, opcoes: so(opA) },
        [df.lado]: { tipo: "lance", lance: contra, lado: df.lado, jogador: autor.id, adversario: at.id, opcoes: so(opD) } } }) || {};
      const escolha = (lista, x) => lista.find((o) => o.id === (x && x.opcao ? x.opcao : x)) || lista[0];
      const a = escolha(opA, dec[at.lado]), d = escolha(opD, dec[df.lado]);
      // a jogada dá certo pela chance dela, descontada a da defesa escolhida
      const certo = rng() < clamp(a.chance * (1.45 - d.chance), 0.05, 0.9);
      ev({ tipo: "lance", lado: at.lado, lance: favor, opcao: a.id, defesa: d.id, certo, jogador: autor.id, decisivo: id });
      if (certo) { est[at.lado].noAlvo++; return gol(at, autor, a.id === "tocar" || a.id === "cruzar" || a.id === "ensaiada" ? garcom(at, autor) : null, tipo); }
      if (d.contra && rng() < 0.5) { ev({ tipo: "contra_ataque", lado: df.lado }); est[df.lado].chutes++; if (rng() < 0.33) { const x = finalizador(df); est[df.lado].noAlvo++; return gol(df, x, garcom(df, x), "contra_ataque"); } return; }
      return gk && rng() < 0.5 ? ev({ tipo: "defesa", lado: at.lado, jogador: autor.id, goleiro: gk.id, como: tipo }) : ev({ tipo: "perdeu", lado: at.lado, jogador: autor.id, como: tipo });
    }
    function sortearIndice(r, pesos) { let x = r() * pesos.reduce((a, b) => a + b, 0); for (let i = 0; i < pesos.length; i++) { x -= pesos[i]; if (x <= 0) return i; } return pesos.length - 1; }

    function faltasECartoes(time) {
      if (rng() >= AJUSTE.FALTA * (1 + 0.15 * (time.tatica.pressao - 1)) * time.est.faltas) return;
      est[time.lado].faltas++;
      const r = rng();
      if (r >= AJUSTE.AMARELO + AJUSTE.VERMELHO) return;
      const p = sortearPeso(rng, titulares(time), (x) => PESO_FALTA[efG(x)]);
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
      const tit = titulares(time), media = tit.length ? tit.reduce((s, p) => s + p.energia, 0) / tit.length : 100;
      if (rng() >= AJUSTE.LESAO * (1 + clamp((80 - media) / 40, 0, 1.5))) return;
      const p = sortearPeso(rng, titulares(time), () => 1);
      p.lesionado = true;
      ev({ tipo: "lesao", lado: time.lado, jogador: p.id });
      const vaga = time.campo.find((v) => v.p === p);
      const subst = banco(time).filter((x) => (vaga.slot === "GK") === (x.grp === "GK")).sort((a, b) => valorNa(b, vaga.slot, vaga.fino) - valorNa(a, vaga.slot, vaga.fino))[0];
      if (!subst || !substituir(time, p.id, subst.id)) { vaga.p = null; time.emCampo.delete(p.id); recalcular(time); }
    }
    function cansar(time) {
      const gasto = (0.24 + 0.1 * time.tatica.pressao) * time.est.cansaco;
      for (const p of titulares(time)) p.energia = Math.max(30, p.energia - gasto * (1.15 - p.atr.fis / 400) * (p.grp === "GK" ? 0.3 : 1));
    }
    function minutoDeJogo() {
      for (const t of times) { cansar(t); faltasECartoes(t); lesoes(t); tecnicoRobo(t); }
      if (minuto % 5 === 0) times.forEach(recalcular);
      for (const [a, d] of [[0, 1], [1, 0]]) {
        const at = times[a], df = times[d];
        const mando = neutro ? 1 : a === 0 ? AJUSTE.MANDO : AJUSTE.VISITANTE;
        const taxa = AJUSTE.CHANCE * Math.exp(AJUSTE.K * (at.att - df.def)) * mando
          * (1 + 0.12 * at.tatica.mentalidade) * (1 + 0.08 * df.tatica.mentalidade) * (1 - 0.06 * (df.tatica.pressao - 1)) * (1 - 0.04 * (df.tatica.linha - 1))
          * at.est.chance * df.est.cede;
        if (rng() < taxa) lance(at, df);
      }
      if (ambos && modo >= 2) {
        for (const t of times) {
          const linha = titulares(t).filter((p) => p.grp !== "GK");
          if (!t.cansacoAvisado && linha.length && linha.reduce((soma, p) => soma + p.energia, 0) / linha.length < Math.min(72, t.energiaInicial - 8)) { t.cansacoAvisado = true; parada(t, "cansaco", "cansaco"); }
        }
        if (minuto === 70 && !acrescimo) paradaDosDois("m70", "minuto_70");
      } else if (controla != null && modo >= 2) {
        const t = times[controla];
        const linha = titulares(t).filter((p) => p.grp !== "GK");
        if (!t.cansacoAvisado && linha.length && linha.reduce((soma, p) => soma + p.energia, 0) / linha.length < Math.min(72, t.energiaInicial - 8)) {
          t.cansacoAvisado = true; parada(t, "cansaco", "cansaco");
        }
        if (minuto === 70 && !acrescimo) parada(t, "m70", "minuto_70");
      }
    }

    // a disputa de pênaltis (mata-mata empatado no agregado): 5 cobranças para cada lado e depois uma de cada vez. Nos modos 2 e 3
    // quem tem humano escolhe o canto (ao bater) e o pulo (ao defender), como no Leilão; sem humano, os cantos saem das manias.
    // Acaba assim que um lado não alcança mais o outro. O resultado vai em `penaltis` ([casa, fora]) e em eventos "disputa".
    let penaltis = null;
    function disputaDePenaltis() {
      const gols = [0, 0], cobradas = [0, 0];
      const quem = times.map((t) => {
        const linha = titulares(t).filter((p) => p.grp !== "GK").sort((a, b) => b.atr.fin - a.atr.fin || (a.id < b.id ? -1 : 1));
        return { batedores: linha.length ? linha : titulares(t), goleiro: t.gk || titulares(t).find((p) => p.grp === "GK") || null };
      });
      const zona = (x) => (ZONAS.includes(x) ? x : ZONAS.includes(x && x.opcao) ? x.opcao : ZONAS[0]);
      const sorteio = (p) => ZONAS[sortearIndice(rng, maniaDe(p))];
      const decidida = () => {
        if (cobradas[0] >= 5 && cobradas[1] >= 5) return cobradas[0] === cobradas[1] && gols[0] !== gols[1];
        return gols[0] > gols[1] + (5 - cobradas[1]) || gols[1] > gols[0] + (5 - cobradas[0]);
      };
      ev({ tipo: "disputa_inicio" });
      let n = 0;
      for (let rodada = 0; rodada < 40 && !decidida(); rodada++) {
        for (const lado of [0, 1]) {
          if (decidida()) break;
          const bat = quem[lado].batedores[cobradas[lado] % quem[lado].batedores.length], gk = quem[1 - lado].goleiro;
          const id = `pen${++n}`, base = { disputa: { n, gols: [...gols], cobradas: [...cobradas], lado }, batedor: bat.id, goleiro: gk ? gk.id : null };
          const pedido = (aFavor) => ({ tipo: "lance", lance: aFavor ? "penalti_favor" : "penalti_contra", lado: aFavor ? lado : 1 - lado, ...base, opcoes: opcoesDoPenalti(aFavor, bat, gk) });
          let chute, pulo;
          if (ambos && modo >= 2) {
            const d = decidir(id, { tipo: "lance", ambos: true, ...base, pedidos: { [lado]: pedido(true), [1 - lado]: pedido(false) } }) || {};
            chute = zona(d[lado]); pulo = zona(d[1 - lado]);
          } else if (modo >= 2 && controla === lado) { chute = zona(decidir(id, pedido(true))); pulo = sorteio(gk); }
          else if (modo >= 2 && controla === 1 - lado) { pulo = zona(decidir(id, pedido(false))); chute = sorteio(bat); }
          else { chute = sorteio(bat); pulo = sorteio(gk); }
          const fora = rng() < FORA, entrou = !fora && chute !== pulo;
          cobradas[lado]++; if (entrou) gols[lado]++;
          ev({ tipo: "disputa", lado, jogador: bat.id, ...(gk ? { goleiro: gk.id } : {}), chute, pulo, fora, entrou, n, placar: [...gols] });
        }
      }
      penaltis = [...gols];
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
          if (ambos && modo >= 2) paradaDosDois("intervalo", "intervalo");
          else if (controla != null && modo >= 2) parada(times[controla], "intervalo", "intervalo");
        }
      }
      minuto = 90;
      ev({ tipo: "fim", placar: [...placar] });
      const antes = (cfg.desempate && cfg.desempate.agregado) || [0, 0];
      if (cfg.desempate && placar[0] + antes[0] === placar[1] + antes[1]) disputaDePenaltis();
    } catch (e) { if (e !== PARAR) throw e; }

    return {
      placar, eventos, parado, completo: !parado, estatisticas: est, ...(penaltis && { penaltis }),
      // a energia de cada jogador no fim (quem ficou no banco guarda a que tinha): o que o jogo seguinte herda
      energia: Object.fromEntries(times.flatMap((tm) => tm.jogadores.map((p) => [p.id, Math.round(p.energia)]))),
      times: times.map((t) => ({ id: t.id, nome: t.nome, formacao: t.formacao, tatica: { ...t.tatica }, titulares: titulares(t).map((p) => p.id), subs: t.subs })),
    };
  }

  // o técnico do computador nos lances decisivos (para testar o modo 3 sem gente): pega a opção de maior chance
  function decisaoAutomatica(parado) {
    if (!parado) return null;
    if (parado.ambos) return Object.fromEntries(Object.entries(parado.pedidos).map(([lado, p]) => [lado, decisaoAutomatica(p)]));
    if (parado.tipo === "tatica") return {};
    return [...parado.opcoes].sort((a, b) => b.chance - a.chance)[0].id;
  }

  // quem entra jogando se o técnico deixar no automático (a mesma conta da partida)
  const escalacaoAutomatica = (t) => titulares(prepararTime(t, 0)).map((p) => p.id);
  // a escalação com o lugar de cada um (na ordem das vagas de vagasDe): para o campinho da tela
  const escalacaoDetalhada = (t) => prepararTime(t, 0).campo.map((v) => ({ slot: v.slot, fino: v.fino, id: v.p ? v.p.id : null }));
  // o estilo de jogo de um time cru ({ jogadores, formacao, titulares, tatica }): o encaixe do elenco nos 11 e as contas, para a tela
  function resumoDoEstilo(t, estilo) {
    const time = prepararTime({ ...t, tatica: { ...(t.tatica || {}), estilo: estilo || (t.tatica && t.tatica.estilo) } }, 0);
    const jogando = time.campo.filter((v) => v.p).map((v) => ({ grp: v.p.efGrp, atr: v.p.atr }));
    return { f: time.estF, perfil: Taticas.perfilDe(time.tatica.estilo, jogando), fat: time.est };
  }

  return { AJUSTE, simularPartida, decisaoAutomatica, escalacaoAutomatica, escalacaoDetalhada, vagasDe, valorNa: (j, slot, fino) => valorNa(prepararJogador(j), slot, fino), resumoDoEstilo, sorteDe, grupoDe };
});
