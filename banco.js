// Banco da Galera — jogo de tabuleiro de compra e venda de imóveis, até 6 jogadores.
// Roda no mesmo servidor do leilão, num canal separado do Socket.io ("/banco").
// Todas as regras ficam aqui; o navegador só mostra o estado e manda as ações.
// TB = módulo do tabuleiro (makeBoard e o que não depende do tamanho). Cada mesa guarda o seu tabuleiro em room.T.
const TB = require("./public/banco/tabuleiro.js");
const { rid, novoCodigo, limparNome: cleanName, ok, falha: fail, contexto, ligarSocket, buscarSala, quemVolta, nomeEmUso, limparSalasParadas } = require("./salas.js"); // as peças de sala que todo jogo repete
const noite = require("./noite.js"); // o placar da Noite da Galera (quem ganhou e quem perdeu cada partida)
const nomesDe = (room, ids) => ids.map((id) => room.players[id] && room.players[id].name).filter(Boolean);

const MAX_PLAYERS = 8; // o tabuleiro normal aceita até 6; o grande, até 8
const TURN_MS = +process.env.BANCO_TURN_MS || 40000, TURN_MS_OFFLINE = Math.min(TURN_MS, 15000); // tempo de cada jogada (quem caiu da internet tem menos)
// Ritmo das animações (ms). BANCO_ANIM=0 zera tudo nos testes automáticos.
const ANIM = process.env.BANCO_ANIM != null ? +process.env.BANCO_ANIM : 1;
const DICE_MS = 850, STEP_MS = 190, FAST_MS = 110, CARD_MS = 2600, BEAT_MS = 700, JAIL_MS = 1000;
const AUCTION_FIRST = 15000, AUCTION_BID = 8000; // ms: tempo inicial do leilão e tempo depois de cada lance
const AUCTION_COMMISSION = 0.1; // quem mandou a leilão fica com 10% do lance vencedor (pago pelo banco)
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const die = () => 1 + Math.floor(Math.random() * 6);

module.exports = function attachBanco(io) {
  const nsp = io.of("/banco");
  const rooms = new Map();

  function cleanConfig(c = {}) {
    return {
      startCash: clamp(int(c.startCash, 1500), 500, 5000),
      salary: clamp(int(c.salary, 200), 0, 1000),
      auction: c.auction !== false,        // quem não compra manda para leilão
      freeParking: !!c.freeParking,        // impostos e multas vão para o pote das Férias
      doubleGo: !!c.doubleGo,              // cair exatamente no Início paga salário dobrado
      board: TB.KINDS[c.board] ? c.board : "normal", // tamanho do tabuleiro: normal (40 casas) ou grande (52)
      specials: c.specials !== false,      // eventos da rodada e cartas de poder
      quick: !!c.quick,                    // modo rápido: casas sem ter a cor toda (hotel continua exigindo)
      teams: [0, 2, 3, 4].includes(int(c.teams, 0)) ? int(c.teams, 0) : 0, // modo equipes: 0 = cada um por si
      maxMinutes: [0, 15, 30, 45, 60, 90].includes(int(c.maxMinutes, 30)) ? int(c.maxMinutes, 30) : 30, // 0 = sem limite
    };
  }

  // ---------- estado público ----------
  function publicState(room) {
    const players = room.order.map((id) => {
      const p = room.players[id];
      return { id, name: p.name, pawn: p.pawn, color: p.color, cash: p.cash, pos: p.pos, inJail: p.inJail, jailTurns: p.jailTurns, jailCards: p.jailCards, bankrupt: p.bankrupt, online: p.sockets.size > 0, worth: room.T.netWorth(room.props, p), rank: p.rank || null, team: room.config.teams ? p.team : null };
    });
    const a = room.auction;
    return {
      code: room.code, host: room.host, phase: room.phase, config: room.config, players,
      turn: room.phase === "playing" ? room.order[room.turn] : null, stage: room.stage, round: room.round,
      dice: room.dice, doubles: room.doublesCount, props: room.props, jackpot: room.jackpot,
      debts: room.debts, buyOffer: room.buyOffer,
      auction: a ? { prop: a.prop, bid: a.bid, leader: a.leader, host: a.host, endsAt: a.endsAt, passed: [...a.passed] } : null,
      trades: Object.values(room.trades), card: room.card, move: room.move, fx: room.fx,
      choice: room.choice ? { player: room.choice.player, kind: room.choice.kind, step: room.choice.step, options: room.choice.options, prop: room.choice.prop } : null,
      event: room.event ? { ...room.T.EVENTS.find((e) => e.id === room.event), seq: room.eventSeq } : null,
      deckCount: room.deck.length,
      houses: room.T.HOUSES - builtCount(room, false), hotels: room.T.HOTELS - builtCount(room, true),
      log: room.log.slice(-60), seq: room.seq, now: Date.now(), winner: room.winner, winnerTeam: room.winnerTeam ?? null, teamTotals: room.teamTotals || null,
      deadline: room.deadline ? { who: room.deadline.who, at: room.deadline.at, total: room.deadline.total } : null, endsAt: room.endsAt || null,
    };
  }
  function broadcast(room) { armTurn(room); room.seq++; room.t = Date.now(); nsp.to(room.code).emit("state", publicState(room)); }
  function log(room, text) { room.log.push({ t: Date.now(), text }); if (room.log.length > 200) room.log.splice(0, room.log.length - 200); }
  const nameOf = (room, id) => (id && room.players[id] ? room.players[id].name : "o banco");
  const $ = TB.money;

  function builtCount(room, hotels) {
    let n = 0;
    for (const p of Object.values(room.props)) { if (hotels ? p.houses === 5 : p.houses > 0 && p.houses < 5) n += hotels ? 1 : p.houses; }
    return n;
  }
  const active = (room) => room.order.filter((id) => !room.players[id].bankrupt);
  // Modo equipes: mapa jogador → equipe (null fora do modo), para as contas do tabuleiro.
  const teamsOf = (room) => room.config.teams ? Object.fromEntries(room.order.map((id) => [id, room.players[id].team])) : null;
  const mates = (room, a, b) => room.T.sameSide(a, b, teamsOf(room));
  const teamName = (t) => `${TB.TEAMS[t].icon} ${TB.TEAMS[t].name}`;
  // Coloca cada jogador sem equipe (ou em equipe que não existe mais) na equipe com menos gente.
  function balanceTeams(room, all = false) {
    const n = room.config.teams;
    if (!n) return;
    const count = Array(n).fill(0);
    const list = all ? shuffle(room.order.slice()) : room.order;
    if (all) for (const id of list) room.players[id].team = null;
    for (const id of list) { const t = room.players[id].team; if (t != null && t < n) count[t]++; else room.players[id].team = null; }
    for (const id of list) {
      if (room.players[id].team != null) continue;
      const t = count.indexOf(Math.min(...count));
      room.players[id].team = t; count[t]++;
    }
  }
  const current = (room) => room.players[room.order[room.turn]];

  // ---------- dinheiro e dívidas ----------
  // Cada movimento de dinheiro vira um efeito (fx) que o navegador anima como uma nota voando.
  // from/to: id do jogador, null (banco) ou "pot" (pote das Férias). sq: casa do tabuleiro envolvida.
  function fx(room, from, to, amount, label, sq = null) {
    if (!(amount > 0)) return;
    room.fx.push({ id: ++room.fxSeq, from, to, amount, label, sq });
    if (room.fx.length > 40) room.fx.splice(0, room.fx.length - 40);
  }
  function anim(room, o) {
    room.fx.push({ id: ++room.fxSeq, ...o });
    if (room.fx.length > 40) room.fx.splice(0, room.fx.length - 40);
  }
  // Destaque que aparece grande no meio do tabuleiro, para todo mundo (tone: good | bad | info).
  function news(room, icon, title, text, tone = "info", sq = null) { anim(room, { kind: "news", icon, title, text, tone, sq }); }
  function give(room, id, v) { if (id && room.players[id]) room.players[id].cash += v; }
  // Dinheiro pago ao banco vai para o pote das Férias quando a regra está ligada.
  function toBank(room, amount, pot) { if (pot && room.config.freeParking) { room.jackpot += amount; return "pot"; } return null; }
  // Cobra `amount` de `from` para `to` (null = banco). Se não tiver dinheiro, vira dívida e o jogo espera.
  function charge(room, from, to, amount, reason, pot = false, sq = null) {
    amount = Math.round(amount);
    if (amount <= 0) return;
    const p = room.players[from];
    if (p.cash >= amount && !room.debts.some((d) => d.from === from)) {
      p.cash -= amount; give(room, to, amount);
      fx(room, from, to || toBank(room, amount, pot), amount, reason, sq);
    } else {
      room.debts.push({ id: rid(4), from, to, amount, reason, pot, sq });
      log(room, `${p.name} não tem ${$(amount)} para pagar (${reason}). Precisa vender, hipotecar ou negociar.`);
    }
  }
  function payDebts(room, id) {
    const p = room.players[id];
    while (room.debts.length) {
      const i = room.debts.findIndex((d) => d.from === id);
      if (i < 0) break;
      const d = room.debts[i];
      if (p.cash < d.amount) return false;
      p.cash -= d.amount; give(room, d.to, d.amount);
      fx(room, id, d.to || toBank(room, d.amount, d.pot), d.amount, d.reason, d.sq);
      room.debts.splice(i, 1);
      log(room, `${p.name} pagou ${$(d.amount)} a ${nameOf(room, d.to)} (${d.reason}).`);
    }
    return true;
  }

  // ---------- andamento do turno ----------
  // Depois de qualquer coisa que possa gerar dívida, decide o que vem a seguir.
  function settle(room) {
    if (room.phase !== "playing") return;
    if (room.auction) { room.stage = "auction"; return; }
    if (room.debts.length) { room.stage = "debt"; return; }
    const cur = current(room);
    if (cur.bankrupt) return nextTurn(room);
    if (room.buyOffer != null) { room.stage = "buy"; return; }
    room.stage = !room.hasRolled || (room.rollAgain && !cur.inJail) ? "roll" : "done";
  }
  function nextTurn(room) {
    room.buyOffer = null; room.rollAgain = false; room.doublesCount = 0; room.card = null; room.hasRolled = false;
    if (checkEnd(room)) return;
    let i = room.turn;
    for (let k = 0; k < room.order.length; k++) {
      i = (i + 1) % room.order.length;
      if (i === 0) { room.round++; newRound(room); }
      if (!room.players[room.order[i]].bankrupt) break;
    }
    room.turn = i;
    room.stage = room.debts.length ? "debt" : "roll"; // o IPTU pode deixar alguém devendo
  }
  // Evento da rodada: sorteado no começo de cada rodada (1 em 4 rodadas é tranquila).
  function newRound(room) {
    room.event = null;
    if (!room.config.specials || Math.random() < 0.25) return;
    const pool = room.T.EVENTS.filter((e) => e.id !== room.lastEvent);
    const e = pool[Math.floor(Math.random() * pool.length)];
    room.event = e.id; room.lastEvent = e.id; room.eventSeq++;
    log(room, `${e.icon} Rodada ${room.round}: ${e.name}! ${e.text}`);
    if (e.bonus) for (const id of active(room)) { room.players[id].cash += e.bonus; fx(room, null, id, e.bonus, e.name); }
    if (e.iptu) for (const id of active(room)) {
      const n = Object.values(room.props).filter((x) => x.owner === id).length;
      if (n) charge(room, id, null, n * e.iptu, "IPTU", true);
    }
  }
  function checkEnd(room) {
    const left = active(room);
    if (room.config.teams) {
      const alive = new Set(left.map((id) => room.players[id].team));
      if (alive.size <= 1) { endGame(room, alive.size ? `Só sobrou o ${teamName([...alive][0])}!` : "Todo mundo faliu."); return true; }
      return false;
    }
    if (left.length <= 1) { endGame(room, left.length ? `${nameOf(room, left[0])} é o último que sobrou!` : "Todo mundo faliu."); return true; }
    return false;
  }
  function endGame(room, why) {
    clearAuction(room); stopClocks(room);
    room.gen++; // interrompe qualquer jogada que ainda esteja animando
    room.phase = "ended"; room.stage = null; room.debts = []; room.buyOffer = null; room.trades = {}; room.choice = null; room.choiceResolve = null; room.event = null;
    // ranking: quem ainda está no jogo por patrimônio; falidos por ordem de falência (o último a falir fica na frente)
    const alive = active(room).sort((a, b) => room.T.netWorth(room.props, room.players[b]) - room.T.netWorth(room.props, room.players[a]));
    const dead = room.order.filter((id) => room.players[id].bankrupt).sort((a, b) => room.players[b].bankruptAt - room.players[a].bankruptAt);
    [...alive, ...dead].forEach((id, k) => { room.players[id].rank = k + 1; });
    room.winner = alive[0] || dead[0] || null;
    room.winnerTeam = null;
    if (room.config.teams) {
      // equipe vencedora: a de maior patrimônio somado entre quem não faliu
      const tot = Array(room.config.teams).fill(0);
      for (const id of active(room)) tot[room.players[id].team] += room.T.netWorth(room.props, room.players[id]);
      room.teamTotals = tot;
      room.winnerTeam = tot.indexOf(Math.max(...tot));
      const order = [...alive, ...dead].sort((a, b) => (room.players[a].team === room.winnerTeam ? 0 : 1) - (room.players[b].team === room.winnerTeam ? 0 : 1));
      order.forEach((id, k) => { room.players[id].rank = k + 1; });
      noite.vitoria("banco", room.code, nomesDe(room, room.order.filter((id) => room.players[id].team === room.winnerTeam)), nomesDe(room, room.order.filter((id) => room.players[id].team !== room.winnerTeam)));
      log(room, `🏁 ${why} O ${teamName(room.winnerTeam)} venceu!`);
      return;
    }
    if (room.winner) noite.vitoria("banco", room.code, nomesDe(room, [room.winner]), nomesDe(room, room.order.filter((id) => id !== room.winner)));
    log(room, `🏁 ${why} ${room.winner ? `${nameOf(room, room.winner)} venceu!` : ""}`);
  }

  // ---------- jogada no ritmo da animação ----------
  // O servidor espera os dados rolarem e o peão andar antes de resolver a casa, para ninguém ver
  // o resultado (aluguel, compra, carta) antes do peão chegar. room.gen muda quando a partida
  // acaba, recomeça ou quem estava jogando sai; aí a jogada em andamento para.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * ANIM));
  const live = (room, g) => room.phase === "playing" && room.gen === g;

  // Anda com o peão casa por casa. `ms` é o tempo de cada passo no navegador.
  async function walk(room, p, to, g, { salary = true, steps = null, ms = STEP_MS } = {}) {
    const from = p.pos, n = steps ?? ((to - from + room.T.N) % room.T.N);
    p.pos = to;
    room.move = { player: p.id, from, to, steps: n, ms, seq: (room.move?.seq || 0) + 1 };
    broadcast(room);
    await sleep(Math.abs(n) * (ms + 15) + 350);
    if (!live(room, g)) return false;
    if (salary && n > 0 && to < from && to !== 0) {
      const v = room.config.salary * room.T.mods(room.event).salary;
      p.cash += v; fx(room, null, p.id, v, "salário", 0);
      log(room, `${p.name} passou pelo Início e recebeu ${$(v)}.`);
    }
    return true;
  }
  async function goJail(room, p, g) {
    room.move = { player: p.id, from: p.pos, to: room.T.JAIL, jail: true, seq: (room.move?.seq || 0) + 1 };
    p.pos = room.T.JAIL; p.inJail = true; p.jailTurns = 0;
    room.rollAgain = false;
    log(room, `🚓 ${p.name} foi para a prisão.`);
    news(room, "🚓", "Preso!", `${p.name} foi para a prisão.`, "bad", room.T.JAIL);
    broadcast(room);
    await sleep(JAIL_MS);
    return live(room, g);
  }

  // Resolve a casa onde o jogador parou.
  async function land(room, p, g, opts = {}) {
    const s = room.T.BOARD[p.pos];
    const dice = room.dice ? room.dice[0] + room.dice[1] : 0;
    switch (s.type) {
      case "go": {
        const v = (room.config.doubleGo ? 2 : 1) * room.config.salary * room.T.mods(room.event).salary;
        p.cash += v; fx(room, null, p.id, v, "salário", 0);
        log(room, `${p.name} caiu no Início e recebeu ${$(v)}.`);
        break;
      }
      case "prop": case "air": case "util": {
        const pr = room.props[s.i];
        if (!pr || pr.owner == null) { room.buyOffer = s.i; break; }
        if (pr.owner === p.id) { log(room, `${p.name} caiu na própria ${s.name}.`); break; }
        if (mates(room, pr.owner, p.id)) { log(room, `${p.name} caiu em ${s.name}, do colega ${nameOf(room, pr.owner)}. Entre colegas não tem aluguel.`); break; }
        if (pr.mortgaged) { log(room, `${p.name} caiu em ${s.name}, que está hipotecada. Não paga nada.`); break; }
        let rent;
        if (s.type === "util" && opts.tenX) {
          const d = [die(), die()]; room.dice = d;
          log(room, `🎲 ${p.name} jogou ${d[0]} + ${d[1]} para a conta de ${s.name}.`);
          broadcast(room); await sleep(DICE_MS);
          if (!live(room, g)) return;
          rent = room.T.rentOf(room.props, s.i, d[0] + d[1], { tenX: true, event: room.event, teams: teamsOf(room) });
        } else rent = room.T.rentOf(room.props, s.i, dice, { double: opts.double, event: room.event, teams: teamsOf(room) });
        if (!rent) { log(room, `${p.name} caiu em ${s.name}, mas o evento da rodada zerou o aluguel.`); break; }
        log(room, `${p.name} paga ${$(rent)} de aluguel a ${nameOf(room, pr.owner)} por ${s.name}.`);
        charge(room, p.id, pr.owner, rent, `aluguel de ${s.name}`, false, s.i);
        news(room, "💸", `Aluguel: ${$(rent)}`, `${p.name} paga para ${nameOf(room, pr.owner)} por ${s.name}.`, "bad", s.i);
        break;
      }
      case "tax":
        log(room, `${p.name} caiu em ${s.name}: paga ${$(s.amount)}.`);
        charge(room, p.id, null, s.amount, s.name, true, s.i);
        news(room, "🧾", s.name, `${p.name} paga ${$(s.amount)} ao banco.`, "bad", s.i);
        break;
      case "card": await drawCard(room, p, g); break;
      case "free":
        if (room.config.freeParking && room.jackpot > 0) {
          log(room, `🏖️ ${p.name} tirou Férias e levou o pote de ${$(room.jackpot)}!`);
          fx(room, "pot", p.id, room.jackpot, "pote das Férias", s.i);
          news(room, "🏖️", "Pote das Férias!", `${p.name} levou ${$(room.jackpot)}.`, "good", s.i);
          p.cash += room.jackpot; room.jackpot = 0;
        } else log(room, `🏖️ ${p.name} está de Férias.`);
        break;
      case "gojail":
        log(room, `👮 ${p.name} caiu em "Vá para a prisão"!`);
        broadcast(room); await sleep(BEAT_MS);
        if (live(room, g)) await goJail(room, p, g);
        break;
      case "jail": log(room, `${p.name} está só visitando a prisão.`); break;
    }
  }

  async function drawCard(room, p, g) {
    if (!room.deck.length) room.deck = shuffle(cardPool(room).filter((i) => !room.heldCards.includes(i)));
    const ci = room.deck.shift();
    const c = room.T.CARDS[ci];
    room.card = { player: p.id, text: c.text, good: c.t === "jailfree" || (c.t === "cash" && c.v > 0) || (c.t === "each" && c.v > 0) || (c.t === "goto" && c.to === 0), seq: (room.cardSeq = (room.cardSeq || 0) + 1) };
    log(room, `🃏 ${p.name}: “${c.text}”`);
    broadcast(room);
    await sleep(CARD_MS); // tempo de todo mundo ler a carta
    if (!live(room, g)) return;
    switch (c.t) {
      case "cash":
        if (c.v > 0) { p.cash += c.v; fx(room, null, p.id, c.v, "Sorte ou Revés", p.pos); }
        else charge(room, p.id, null, -c.v, "Sorte ou Revés", true, p.pos);
        break;
      case "goto": if (await walk(room, p, c.to, g, { ms: FAST_MS })) await land(room, p, g); break;
      case "back": {
        const to = (p.pos - c.n + room.T.N) % room.T.N;
        if (await walk(room, p, to, g, { salary: false, steps: -c.n })) await land(room, p, g);
        break;
      }
      case "jail": await goJail(room, p, g); break;
      case "jailfree": p.jailCards.push(ci); room.heldCards.push(ci); break; // não volta para o monte
      case "nearest": {
        const list = c.kind === "air" ? room.T.AIRPORTS : room.T.UTILS;
        const to = list.find((i) => i > p.pos) ?? list[0];
        if (await walk(room, p, to, g, { ms: FAST_MS })) await land(room, p, g, c.kind === "air" ? { double: true } : { tenX: true });
        break;
      }
      case "each":
        for (const id of active(room)) {
          if (id === p.id) continue;
          if (c.v > 0) charge(room, id, p.id, c.v, "Sorte ou Revés");
          else charge(room, p.id, id, -c.v, "Sorte ou Revés");
        }
        break;
      case "power": {
        const opts = powerOptions(room, p.id, c.kind);
        if (!opts.length) { log(room, `${room.T.POWER[c.kind].icon} Não há imóvel que sirva para a ${room.T.POWER[c.kind].title}. A carta não teve efeito.`); break; }
        await waitChoice(room, { player: p.id, kind: c.kind, step: 1, options: opts });
        break;
      }
      case "repairs": {
        let n = 0;
        for (const pr of Object.values(room.props)) if (pr.owner === p.id && pr.houses) n += pr.houses === 5 ? c.hotel : pr.houses * c.house;
        if (n) charge(room, p.id, null, n, "reforma", true, p.pos); else log(room, `${p.name} não tem construções. Não paga nada.`);
        break;
      }
    }
  }

  // ---------- cartas de poder ----------
  function cardPool(room) { return room.T.CARDS.map((_, i) => i).filter((i) => room.config.specials || room.T.CARDS[i].t !== "power"); }
  // Alvos possíveis de cada carta. Imóvel blindado (shield) não pode ser demolido nem tomado.
  function powerOptions(room, pid, kind) {
    const all = Object.keys(room.props).map(Number);
    const own = (i) => room.props[i].owner === pid;
    const other = (i) => !mates(room, room.props[i].owner, pid) && room.players[room.props[i].owner] && !room.players[room.props[i].owner].bankrupt;
    if (kind === "demolish") return all.filter((i) => other(i) && room.props[i].houses > 0 && !room.props[i].shield);
    if (kind === "steal") return all.filter((i) => other(i) && !room.props[i].shield && !locked(room, i));
    if (kind === "donate") return active(room).length > 1 ? all.filter((i) => own(i) && !locked(room, i)) : [];
    if (kind === "shield") return all.filter((i) => own(i) && !room.props[i].shield);
    return [];
  }
  // A jogada fica parada até o jogador escolher o alvo (ou o relógio escolher por ele).
  function waitChoice(room, choice) {
    return new Promise((resolve) => { room.choice = choice; room.choiceResolve = resolve; room.stage = "choose"; broadcast(room); });
  }
  function finishChoice(room, v) {
    const c = room.choice, p = room.players[c.player];
    if (c.kind === "donate" && c.step === 1) { c.prop = v; c.step = 2; c.options = active(room).filter((id) => id !== p.id); return; }
    const i = c.kind === "donate" ? c.prop : v, s = room.T.BOARD[i], pr = room.props[i];
    if (c.kind === "demolish") {
      const hotel = pr.houses === 5; pr.houses--;
      anim(room, { kind: "boom", sq: i });
      news(room, "💥", "Demolição!", `${p.name} derrubou ${hotel ? "o hotel" : "uma casa"} de ${nameOf(room, pr.owner)} em ${s.name}.`, "bad", i);
      log(room, `💥 ${p.name} derrubou ${hotel ? "o hotel" : "uma casa"} de ${nameOf(room, pr.owner)} em ${s.name}!`);
    } else if (c.kind === "steal") {
      const from = pr.owner; pr.owner = p.id;
      anim(room, { kind: "deed", from, to: p.id, sq: i });
      news(room, "🦹", "Usucapião!", `${p.name} tomou ${s.name} de ${nameOf(room, from)}.`, "bad", i);
      log(room, `🦹 ${p.name} tomou ${s.name} de ${nameOf(room, from)}!`);
    } else if (c.kind === "donate") {
      pr.owner = v;
      anim(room, { kind: "deed", from: p.id, to: v, sq: i });
      news(room, "🎁", "Doação", `${p.name} deu ${s.name} para ${nameOf(room, v)}.`, "good", i);
      log(room, `🎁 ${p.name} doou ${s.name} para ${nameOf(room, v)}.`);
    } else if (c.kind === "shield") {
      pr.shield = true;
      anim(room, { kind: "shield", sq: i });
      news(room, "🛡️", "Escritura blindada", `${s.name} de ${p.name} está protegida.`, "good", i);
      log(room, `🛡️ ${p.name} blindou ${s.name}. Ninguém derruba nem toma.`);
    }
    const r = room.choiceResolve;
    room.choice = null; room.choiceResolve = null; room.stage = "moving";
    if (r) r();
  }
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  async function roll(room, p) {
    const g = room.gen;
    const d = [die(), die()];
    room.dice = d; room.card = null; room.stepNo++; room.stage = "moving"; room.hasRolled = true;
    const dbl = d[0] === d[1], sum = d[0] + d[1];
    let fine = false;
    if (p.inJail) {
      room.rollAgain = false; // dupla que tira da prisão não dá outra jogada
      if (dbl) { p.inJail = false; p.jailTurns = 0; log(room, `🎲 ${p.name} tirou ${d[0]} + ${d[1]}: dupla! Saiu da prisão.`); }
      else {
        p.jailTurns++;
        if (p.jailTurns < 3) {
          log(room, `🎲 ${p.name} tirou ${d[0]} + ${d[1]} e continua preso (${p.jailTurns}ª tentativa).`);
          broadcast(room); await sleep(DICE_MS);
          if (live(room, g)) { settle(room); broadcast(room); }
          return;
        }
        p.inJail = false; p.jailTurns = 0; fine = true;
        log(room, `🎲 ${p.name} tirou ${d[0]} + ${d[1]} na 3ª tentativa: paga a fiança de ${$(TB.JAIL_FINE)} e sai.`);
      }
    } else if (dbl) {
      room.doublesCount++;
      if (room.doublesCount >= 3) {
        log(room, `🎲 ${p.name} tirou a 3ª dupla seguida. Excesso de velocidade!`);
        broadcast(room); await sleep(DICE_MS);
        if (live(room, g) && await goJail(room, p, g)) { settle(room); broadcast(room); }
        return;
      }
      room.rollAgain = true;
      log(room, `🎲 ${p.name} tirou ${d[0]} + ${d[1]}: dupla, joga de novo!`);
    } else { room.rollAgain = false; log(room, `🎲 ${p.name} tirou ${d[0]} + ${d[1]}.`); }
    broadcast(room); await sleep(DICE_MS); // dados girando
    if (!live(room, g)) return;
    if (fine) charge(room, p.id, null, TB.JAIL_FINE, "fiança", true, room.T.JAIL);
    if (!(await walk(room, p, (p.pos + sum) % room.T.N, g, { steps: sum }))) return;
    await land(room, p, g);
    if (!live(room, g)) return;
    settle(room); broadcast(room);
  }

  // ---------- relógios: 40 s por jogada e tempo máximo da partida ----------
  function stopClocks(room) { clearTimeout(room.turnTimer); clearTimeout(room.gameTimer); room.deadline = null; room.endsAt = null; }
  // Quem precisa agir agora (quem deve dinheiro vem antes). O relógio recomeça a cada etapa nova
  // e a cada ação de quem está com a vez.
  function armTurn(room) {
    if (room.phase !== "playing" || room.auction || !room.stage || room.stage === "moving") { clearTimeout(room.turnTimer); room.deadline = null; return; }
    const who = room.debts.length ? room.debts[0].from : room.order[room.turn];
    const key = `${who}|${room.stage}|${room.stepNo}|${room.debts.length}`;
    if (room.deadline && room.deadline.key === key && !room.forceArm) return;
    room.forceArm = false;
    clearTimeout(room.turnTimer);
    const ms = room.players[who].sockets.size ? TURN_MS : TURN_MS_OFFLINE;
    room.deadline = { who, key, at: Date.now() + ms, total: ms };
    room.turnTimer = setTimeout(() => {
      if (room.phase !== "playing" || !room.deadline || room.deadline.key !== key) return;
      turnTimeout(room); broadcast(room);
    }, ms + 100);
  }
  function turnTimeout(room) {
    const who = room.deadline.who, p = room.players[who];
    room.deadline = null;
    if (room.debts.some((d) => d.from === who)) return autoRaise(room, who);
    if (room.order[room.turn] !== who) return;
    if (room.stage === "roll") { log(room, `⏱️ ${p.name} demorou: o dado rodou sozinho.`); roll(room, p); }
    else if (room.stage === "buy") {
      log(room, `⏱️ ${p.name} não decidiu a tempo.`);
      if (room.config.auction) startAuction(room, room.buyOffer); else { room.buyOffer = null; settle(room); }
    } else if (room.stage === "done") { log(room, `⏱️ ${p.name} demorou: a vez passou.`); nextTurn(room); }
    else if (room.stage === "choose" && room.choice) {
      log(room, `⏱️ ${p.name} não escolheu a tempo: o alvo foi sorteado.`);
      finishChoice(room, pick(room.choice.options));
      if (room.choice) finishChoice(room, pick(room.choice.options)); // doação: sorteia também para quem vai
    }
  }
  // Tempo esgotado com conta para pagar: o banco vende construções e hipoteca pelo jogador.
  function autoRaise(room, pid) {
    const p = room.players[pid];
    const need = () => room.debts.filter((d) => d.from === pid).reduce((a, d) => a + d.amount, 0);
    const mine = () => Object.keys(room.props).filter((i) => room.props[i].owner === pid);
    let sold = 0, mort = 0, raised = 0;
    while (p.cash < need()) {
      const b = mine().filter((i) => room.props[i].houses > 0).sort((a, c) => room.props[c].houses - room.props[a].houses)[0];
      if (b == null) break;
      room.props[b].houses--; p.cash += Math.floor(room.T.houseCost(b) / 2); raised += Math.floor(room.T.houseCost(b) / 2); sold++;
    }
    while (p.cash < need()) {
      const m = mine().filter((i) => !room.props[i].mortgaged && !locked(room, +i)).sort((a, c) => room.T.BOARD[a].price - room.T.BOARD[c].price)[0];
      if (m == null) break;
      room.props[m].mortgaged = true; p.cash += room.T.mortgageValue(m); raised += room.T.mortgageValue(m); mort++;
    }
    if (sold || mort) fx(room, null, pid, raised, "venda pelo banco");
    if (sold || mort) log(room, `⏱️ Tempo esgotado: o banco ${[sold && `vendeu ${sold} construç${sold > 1 ? "ões" : "ão"}`, mort && `hipotecou ${mort} imóve${mort > 1 ? "is" : "l"}`].filter(Boolean).join(" e ")} de ${p.name}.`);
    if (payDebts(room, pid)) return settle(room);
    log(room, `⏱️ ${p.name} não conseguiu pagar a tempo.`);
    goBroke(room, pid, room.debts.find((d) => d.from === pid).to);
  }
  function goBroke(room, pid, creditor) {
    const wasTurn = room.order[room.turn] === pid;
    if (wasTurn) room.gen++;
    bankrupt(room, pid, creditor);
    if (checkEnd(room)) return;
    if (room.auction) auctionMaybeEnd(room);
    if (wasTurn && !room.auction) nextTurn(room); else settle(room);
  }

  // ---------- leilão ----------
  function startAuction(room, i) {
    room.buyOffer = null;
    // host: quem mandou a leilão; ganha comissão sobre a venda se outro jogador levar
    const a = { prop: i, bid: 0, leader: null, host: room.order[room.turn], endsAt: Date.now() + AUCTION_FIRST, passed: new Set(), timer: null };
    room.auction = a;
    armAuction(room);
    log(room, `🔨 ${room.T.BOARD[i].name} foi a leilão.`);
    news(room, "🔨", "Leilão!", `${room.T.BOARD[i].name} está em leilão. Todo mundo pode dar lance.`, "info", i);
    room.stage = "auction";
  }
  function armAuction(room) {
    const a = room.auction;
    clearTimeout(a.timer);
    a.timer = setTimeout(() => { if (room.auction === a) { finishAuction(room); broadcast(room); } }, Math.max(0, a.endsAt - Date.now()) + 150);
  }
  function clearAuction(room) { if (room.auction) clearTimeout(room.auction.timer); room.auction = null; }
  function auctionMaybeEnd(room) {
    const a = room.auction;
    const still = active(room).filter((id) => !a.passed.has(id) && id !== a.leader && room.players[id].cash > a.bid);
    if (!still.length) finishAuction(room);
  }
  function finishAuction(room) {
    const a = room.auction; if (!a) return;
    clearAuction(room);
    const s = room.T.BOARD[a.prop];
    if (a.leader && room.players[a.leader] && !room.players[a.leader].bankrupt && room.players[a.leader].cash >= a.bid) {
      const w = room.players[a.leader];
      w.cash -= a.bid; fx(room, w.id, null, a.bid, "leilão", a.prop); anim(room, { kind: "deed", from: "pile", to: w.id, sq: a.prop, gavel: true });
      room.props[a.prop] = { owner: w.id, houses: 0, mortgaged: false };
      log(room, `🔨 Vendido! ${w.name} levou ${s.name} por ${$(a.bid)}.`);
      const host = room.players[a.host], cut = Math.round(a.bid * AUCTION_COMMISSION);
      if (host && !host.bankrupt && host.id !== w.id && cut > 0) {
        host.cash += cut; fx(room, null, host.id, cut, "comissão do leilão", a.prop);
        log(room, `💼 ${host.name} ganhou ${$(cut)} de comissão pelo leilão.`);
      }
      news(room, "🔨", "Vendido!", `${w.name} levou ${s.name} por ${$(a.bid)}.${host && host.id !== w.id && cut > 0 ? ` ${host.name} ganhou ${$(cut)} de comissão.` : ""}`, "good", a.prop);
    } else log(room, `🔨 Ninguém deu lance em ${s.name}. Continua com o banco.`);
    settle(room);
  }

  // ---------- construções e hipoteca ----------
  function groupOf(room, i) { return room.T.BOARD[i].type === "prop" ? room.T.GROUP_SQUARES[room.T.BOARD[i].group] : [i]; }
  function groupHasBuildings(room, i) { return groupOf(room, i).some((j) => room.props[j] && room.props[j].houses > 0); }
  // Imóvel "travado" para hipoteca, troca e cartas: no jogo normal, qualquer construção no grupo trava
  // o grupo todo; no modo rápido, só as construções do próprio imóvel.
  function locked(room, i) { return room.config.quick ? !!(room.props[i] && room.props[i].houses > 0) : groupHasBuildings(room, i); }
  function canBuild(room, pid, i) {
    const s = room.T.BOARD[i], pr = room.props[i];
    if (s.type !== "prop" || !pr || pr.owner !== pid) return "Esse imóvel não é seu.";
    if (pr.houses >= 5) return "Já tem hotel.";
    if (pr.mortgaged) return "Resgate a hipoteca antes de construir.";
    const g = room.T.GROUP_SQUARES[s.group], full = room.T.ownsGroup(room.props, pid, s.group, teamsOf(room));
    const whose = room.config.teams ? "a sua equipe precisa ter" : "você precisa ter";
    // modo rápido: até 4 casas em qualquer imóvel; o hotel continua exigindo a cor completa
    if (!room.config.quick || pr.houses === 4) {
      if (!full) return pr.houses === 4 ? `Hotel só com a cor completa: ${whose} todas as cidades de ${TB.GROUPS[s.group].name}.` : `Para construir, ${whose} todas as cidades de ${TB.GROUPS[s.group].name}.`;
      if (g.some((j) => room.props[j] && room.props[j].mortgaged)) return "Resgate as hipotecas do grupo antes de construir.";
      if (!room.config.quick && pr.houses > Math.min(...g.map((j) => room.props[j].houses))) return "Construa por igual: as outras cidades do grupo precisam ter a mesma quantidade antes.";
    }
    if (pr.houses === 4 ? builtCount(room, true) >= room.T.HOTELS : builtCount(room, false) >= room.T.HOUSES) return pr.houses === 4 ? "Acabaram os hotéis do banco." : "Acabaram as casas do banco.";
    if (room.players[pid].cash < room.T.buildCost(i, room.event)) return "Dinheiro insuficiente.";
    return null;
  }
  function canSell(room, pid, i) {
    const s = room.T.BOARD[i], pr = room.props[i];
    if (s.type !== "prop" || !pr || pr.owner !== pid || !pr.houses) return "Não há o que vender aqui.";
    const g = room.T.GROUP_SQUARES[s.group];
    if (!room.config.quick && pr.houses < Math.max(...g.map((j) => room.props[j].houses))) return "Venda por igual: comece pelas cidades com mais construções.";
    return null;
  }

  // ---------- trocas ----------
  function cleanOffer(room, o = {}) {
    return {
      props: [...new Set((Array.isArray(o.props) ? o.props : []).map((x) => int(x, -1)).filter((i) => room.T.BOARD[i] && room.T.BOARD[i].price))].slice(0, 28),
      cash: clamp(int(o.cash, 0), 0, 1e6),
      cards: clamp(int(o.cards, 0), 0, 2),
    };
  }
  function checkSide(room, pid, side) {
    const p = room.players[pid];
    if (!p || p.bankrupt) return "Jogador fora do jogo.";
    if (p.cash < side.cash) return `${p.name} não tem ${$(side.cash)}.`;
    if (p.jailCards.length < side.cards) return `${p.name} não tem essa carta de saída da prisão.`;
    for (const i of side.props) {
      const pr = room.props[i];
      if (!pr || pr.owner !== pid) return `${room.T.BOARD[i].name} não é de ${p.name}.`;
      if (locked(room, i)) return room.config.quick ? `Venda as construções de ${room.T.BOARD[i].name} antes de negociar.` : `Venda as construções de ${TB.GROUPS[room.T.BOARD[i].group]?.name || room.T.BOARD[i].name} antes de negociar ${room.T.BOARD[i].name}.`;
    }
    return null;
  }
  function transferSide(room, from, to, side) {
    const a = room.players[from], b = room.players[to];
    a.cash -= side.cash; b.cash += side.cash; fx(room, from, to, side.cash, "troca");
    for (const i of side.props) { room.props[i].owner = to; anim(room, { kind: "deed", from, to, sq: i }); }
    for (let k = 0; k < side.cards; k++) b.jailCards.push(a.jailCards.pop());
  }
  function describe(room, side) {
    const parts = side.props.map((i) => room.T.BOARD[i].name);
    if (side.cash) parts.push($(side.cash));
    if (side.cards) parts.push(side.cards > 1 ? `${side.cards} cartas de habeas corpus` : "carta de habeas corpus");
    return parts.join(", ") || "nada";
  }
  function dropTradesOf(room, pid) { for (const [id, t] of Object.entries(room.trades)) if (t.from === pid || t.to === pid) delete room.trades[id]; }

  // ---------- falência ----------
  function bankrupt(room, pid, creditor) {
    const p = room.players[pid];
    const to = creditor && room.players[creditor] && !room.players[creditor].bankrupt ? creditor : null;
    clearTradesAndDebts(room, pid);
    // construções voltam ao banco pela metade do preço; o dinheiro vai para o credor
    let cash = Math.max(0, p.cash);
    for (const [i, pr] of Object.entries(room.props)) {
      if (pr.owner !== pid) continue;
      if (pr.houses) { cash += Math.floor(pr.houses * room.T.houseCost(i) / 2); pr.houses = 0; }
      if (to) pr.owner = to; else delete room.props[i];
    }
    if (to) { room.players[to].cash += cash; fx(room, pid, to, cash, "falência"); room.players[to].jailCards.push(...p.jailCards); }
    else room.heldCards = room.heldCards.filter((c) => !p.jailCards.includes(c)); // cartas voltam ao monte
    p.cash = 0; p.jailCards = []; p.bankrupt = true; p.bankruptAt = Date.now(); p.inJail = false;
    news(room, "💀", "Faliu!", `${p.name} ${to ? `entregou tudo para ${nameOf(room, to)}` : "devolveu tudo ao banco"}.`, "bad");
    log(room, `💀 ${p.name} faliu${to ? ` e entregou tudo para ${nameOf(room, to)}` : " e devolveu tudo ao banco"}.`);
    if (room.auction) { room.auction.passed.add(pid); if (room.auction.leader === pid) { room.auction.leader = null; room.auction.bid = 0; } }
    if (room.order[room.turn] === pid) { room.buyOffer = null; room.rollAgain = false; }
  }
  function clearTradesAndDebts(room, pid) {
    dropTradesOf(room, pid);
    room.debts = room.debts.filter((d) => d.from !== pid);
    for (const d of room.debts) if (d.to === pid) d.to = null; // quem devia a um falido passa a dever ao banco
  }

  // ---------- conexões ----------
  nsp.on("connection", (socket) => {
    const ctx = () => contexto(socket, rooms);
    const bind = (room, pid) => ligarSocket(socket, rooms, room, pid);
    function addPlayer(room, name) {
      const used = new Set(Object.values(room.players).map((p) => p.pawn));
      const usedC = new Set(Object.values(room.players).map((p) => p.color));
      const id = rid(6);
      room.players[id] = { id, name, token: rid(), pawn: room.T.PAWNS.find((x) => !used.has(x)), color: room.T.COLORS.find((x) => !usedC.has(x)), cash: 0, pos: 0, inJail: false, jailTurns: 0, jailCards: [], bankrupt: false, sockets: new Set() };
      room.order.push(id);
      balanceTeams(room); // no modo equipes, entra na equipe com menos gente
      return room.players[id];
    }

    socket.on("create", (data = {}, cb) => {
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      const room = {
        code: novoCodigo(rooms), host: null, phase: "lobby", config: cleanConfig(data.config), players: {}, order: [], turn: 0, round: 1,
        stage: null, dice: null, doublesCount: 0, stepNo: 0, gen: 0, fx: [], fxSeq: 0, hasRolled: false, choice: null, choiceResolve: null, event: null, eventSeq: 0, lastEvent: null, deadline: null, turnTimer: null, gameTimer: null, endsAt: null, forceArm: false, rollAgain: false, props: {}, jackpot: 0, debts: [], buyOffer: null,
        auction: null, trades: {}, deck: [], heldCards: [], card: null, move: null, log: [], seq: 0, t: Date.now(), winner: null,
      };
      room.T = TB.makeBoard(room.config.board); // o tabuleiro desta mesa
      rooms.set(room.code, room);
      const p = addPlayer(room, name);
      room.host = p.id;
      bind(room, p.id);
      log(room, `Mesa criada por ${name}.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    socket.on("join", (data = {}, cb) => {
      const room = buscarSala(rooms, data.code);
      if (!room) return fail(cb, "Mesa não encontrada. Confira o código (se o servidor reiniciou, a mesa se perdeu).");
      // volta de quem caiu
      const back = quemVolta(room, data);
      if (back) { bind(room, back.id); ok(cb, { code: room.code, id: back.id, token: back.token }); return broadcast(room); }
      if (data.watch || room.phase !== "lobby") {
        if (!data.watch && room.phase !== "lobby") return fail(cb, "O jogo já começou. Você pode entrar para assistir.");
        bind(room, null); ok(cb, { code: room.code, id: null }); return broadcast(room);
      }
      const name = cleanName(data.name);
      if (!name) return fail(cb, "Coloque o seu nome.");
      if (room.order.length >= MAX_PLAYERS) return fail(cb, `A mesa já tem ${MAX_PLAYERS} jogadores. Você pode entrar para assistir.`);
      if (nomeEmUso(room, name)) return fail(cb, "Já tem alguém com esse nome na mesa.");
      const p = addPlayer(room, name);
      bind(room, p.id);
      log(room, `${name} sentou à mesa.`);
      ok(cb, { code: room.code, id: p.id, token: p.token });
      broadcast(room);
    });

    // Todas as ações do jogo passam por aqui.
    socket.on("act", (data = {}, cb) => {
      const { room, me } = ctx();
      if (!room) return fail(cb, "Você não está numa mesa.");
      const isHost = me && room.host === me.id;
      const myTurn = me && room.phase === "playing" && room.order[room.turn] === me.id && !me.bankrupt;
      const err = handle(data.type);
      if (err) return fail(cb, err);
      if (me && room.deadline && room.deadline.who === me.id) room.forceArm = true; // agiu: o relógio recomeça
      ok(cb);
      broadcast(room);

      function handle(type) {
        // ---- sala de espera ----
        if (type === "pawn") {
          if (!me || room.phase !== "lobby") return "Só dá para trocar antes de começar.";
          const pawn = room.T.PAWNS.includes(data.pawn) ? data.pawn : null, color = room.T.COLORS.includes(data.color) ? data.color : null;
          const others = Object.values(room.players).filter((p) => p !== me);
          if (pawn && others.some((p) => p.pawn === pawn)) return "Esse peão já é de outra pessoa.";
          if (color && others.some((p) => p.color === color)) return "Essa cor já é de outra pessoa.";
          if (pawn) me.pawn = pawn; if (color) me.color = color;
          return;
        }
        if (type === "config") {
          if (!isHost || room.phase !== "lobby") return "Só o organizador muda as regras, antes de começar.";
          const before = room.config.teams;
          room.config = cleanConfig(data.config);
          room.T = TB.makeBoard(room.config.board);
          if (room.config.teams !== before) balanceTeams(room);
          return;
        }
        if (type === "team") {
          if (!me || room.phase !== "lobby" || !room.config.teams) return "Só dá para trocar de equipe antes de começar.";
          const t = int(data.team, -1);
          if (t < 0 || t >= room.config.teams) return "Equipe inválida.";
          me.team = t; return;
        }
        if (type === "shuffleTeams") {
          if (!isHost || room.phase !== "lobby" || !room.config.teams) return "Só o organizador.";
          balanceTeams(room, true); log(room, "🎲 Equipes sorteadas."); return;
        }
        if (type === "kick") {
          if (!isHost || room.phase !== "lobby") return "Só o organizador, antes de começar.";
          const p = room.players[data.id]; if (!p || p.id === me.id) return "Jogador inválido.";
          for (const sid of p.sockets) nsp.sockets.get(sid)?.emit("kicked");
          delete room.players[p.id]; room.order = room.order.filter((x) => x !== p.id);
          log(room, `${p.name} saiu da mesa.`); return;
        }
        if (type === "start") {
          if (!isHost || room.phase !== "lobby") return "Só o organizador começa o jogo.";
          if (room.order.length < 2) return "Precisa de pelo menos 2 jogadores.";
          if (room.order.length > room.T.maxPlayers) return `O tabuleiro ${room.T.KINDS[room.T.kind].name.toLowerCase()} aceita até ${room.T.maxPlayers} jogadores. Com ${room.order.length}, escolha o tabuleiro grande.`;
          if (room.config.teams) {
            balanceTeams(room);
            const empty = [...Array(room.config.teams).keys()].find((t) => !room.order.some((id) => room.players[id].team === t));
            if (empty != null) return `O ${teamName(empty)} está sem ninguém. Mude alguém de equipe ou use menos equipes.`;
          }
          shuffle(room.order);
          for (const id of room.order) Object.assign(room.players[id], { cash: room.config.startCash, pos: 0, inJail: false, jailTurns: 0, jailCards: [], bankrupt: false, rank: null });
          room.gen++; room.fx = [];
          Object.assign(room, { phase: "playing", turn: 0, round: 1, stage: "roll", props: {}, jackpot: 0, debts: [], trades: {}, deck: shuffle(cardPool(room)), heldCards: [], choice: null, choiceResolve: null, event: null, lastEvent: null, hasRolled: false, card: null, move: null, dice: null, winner: null });
          stopClocks(room);
          if (room.config.maxMinutes) {
            room.endsAt = Date.now() + room.config.maxMinutes * 60000;
            room.gameTimer = setTimeout(() => { if (room.phase === "playing") { endGame(room, `Acabaram os ${room.config.maxMinutes} minutos.`); broadcast(room); } }, room.config.maxMinutes * 60000);
          }
          room.winnerTeam = null; room.teamTotals = null;
          log(room, `🎲 Começou! Ordem: ${room.order.map((id) => room.players[id].name).join(" → ")}.`);
          if (room.config.teams) for (let t = 0; t < room.config.teams; t++) log(room, `${teamName(t)}: ${room.order.filter((id) => room.players[id].team === t).map((id) => room.players[id].name).join(", ")}.`);
          return;
        }
        if (type === "restart") {
          if (!isHost || room.phase === "lobby") return "Só o organizador.";
          clearAuction(room); stopClocks(room); room.gen++;
          room.order = room.order.filter((id) => room.players[id]);
          Object.assign(room, { phase: "lobby", stage: null, props: {}, debts: [], trades: {}, choice: null, choiceResolve: null, event: null, buyOffer: null, card: null, move: null, dice: null, winner: null, jackpot: 0 });
          for (const id of room.order) Object.assign(room.players[id], { bankrupt: false, rank: null, pos: 0, cash: 0, jailCards: [], inJail: false });
          log(room, "A mesa voltou para a sala de espera.");
          return;
        }
        if (room.phase !== "playing") return "O jogo não está em andamento.";

        // ---- encerrar (organizador) ----
        if (type === "end") { if (!isHost) return "Só o organizador encerra."; endGame(room, "O organizador encerrou a partida."); return; }
        if (type === "forceBankrupt") {
          if (!isHost) return "Só o organizador.";
          const p = room.players[data.id]; if (!p || p.bankrupt) return "Jogador inválido.";
          if (p.sockets.size) return "Só dá para tirar quem está desconectado.";
          log(room, `O organizador tirou ${p.name} do jogo.`);
          goBroke(room, p.id, null);
          return;
        }
        if (!me || me.bankrupt) return "Você está só assistindo.";

        // ---- vez do jogador ----
        if (type === "roll") {
          if (!myTurn || room.stage !== "roll") return "Não é hora de jogar os dados.";
          roll(room, me); return;
        }
        if (type === "payJail") {
          if (!myTurn || room.stage !== "roll" || !me.inJail) return "Você não está preso.";
          if (me.cash < TB.JAIL_FINE) return "Dinheiro insuficiente para a fiança.";
          me.cash -= TB.JAIL_FINE; fx(room, me.id, toBank(room, TB.JAIL_FINE, true), TB.JAIL_FINE, "fiança", room.T.JAIL);
          me.inJail = false; me.jailTurns = 0;
          log(room, `${me.name} pagou a fiança de ${$(TB.JAIL_FINE)} e saiu da prisão.`); return;
        }
        if (type === "useCard") {
          if (!myTurn || room.stage !== "roll" || !me.inJail || !me.jailCards.length) return "Você não tem a carta.";
          const c = me.jailCards.pop(); room.heldCards = room.heldCards.filter((x) => x !== c); room.deck.push(c);
          me.inJail = false; me.jailTurns = 0;
          log(room, `${me.name} usou o habeas corpus e saiu da prisão.`); return;
        }
        if (type === "buy") {
          if (!myTurn || room.stage !== "buy") return "Nada para comprar agora.";
          const i = room.buyOffer, s = room.T.BOARD[i];
          const price = room.T.priceOf(i, room.event);
          if (me.cash < price) return "Dinheiro insuficiente. Hipoteque algo ou mande a leilão.";
          me.cash -= price; fx(room, me.id, null, price, "compra", i); anim(room, { kind: "deed", from: "pile", to: me.id, sq: i }); room.props[i] = { owner: me.id, houses: 0, mortgaged: false }; room.buyOffer = null;
          log(room, `🏠 ${me.name} comprou ${s.name} por ${$(price)}.`);
          news(room, "🏠", "Comprou!", `${me.name} comprou ${s.name} por ${$(price)}.`, "good", i);
          settle(room); return;
        }
        if (type === "decline") {
          if (!myTurn || room.stage !== "buy") return "Nada para recusar agora.";
          const i = room.buyOffer;
          if (room.config.auction) startAuction(room, i);
          else { room.buyOffer = null; log(room, `${me.name} não quis comprar ${room.T.BOARD[i].name}.`); settle(room); }
          return;
        }
        if (type === "endTurn") {
          if (!myTurn || room.stage !== "done") return "Ainda não dá para passar a vez.";
          nextTurn(room); return;
        }

        // ---- modo equipes: mandar dinheiro para um colega ----
        if (type === "gift") {
          const to = room.players[data.to], v = int(data.value, 0);
          if (!room.config.teams || !to || to.bankrupt || to.id === me.id || to.team !== me.team) return "Só dá para mandar dinheiro para colegas de equipe.";
          if (v <= 0) return "Coloque um valor.";
          if (v > me.cash) return "Você não tem esse dinheiro.";
          me.cash -= v; to.cash += v; fx(room, me.id, to.id, v, "ajuda do colega");
          news(room, "🤝", "Ajuda do colega", `${me.name} mandou ${$(v)} para ${to.name}.`, "good");
          log(room, `🤝 ${me.name} mandou ${$(v)} para o colega ${to.name}.`);
          return;
        }

        // ---- carta de poder: escolher o alvo ----
        if (type === "choose") {
          const c = room.choice;
          if (!c || c.player !== me.id) return "Não é você quem escolhe agora.";
          const v = c.step === 2 ? String(data.value) : int(data.value, -1);
          if (!c.options.includes(v)) return "Escolha uma das opções destacadas.";
          finishChoice(room, v); return;
        }

        // ---- leilão (qualquer um) ----
        if (type === "bid") {
          const a = room.auction; if (!a) return "Não há leilão.";
          if (a.passed.has(me.id)) return "Você já saiu deste leilão.";
          const v = int(data.value, 0);
          if (v <= a.bid) return `O lance precisa ser maior que ${$(a.bid)}.`;
          if (v > me.cash) return "Você não tem esse dinheiro.";
          a.bid = v; a.leader = me.id;
          a.endsAt = Math.max(a.endsAt, Date.now() + AUCTION_BID); armAuction(room);
          log(room, `🔨 ${me.name}: ${$(v)}.`);
          auctionMaybeEnd(room); return;
        }
        if (type === "pass") {
          const a = room.auction; if (!a) return "Não há leilão.";
          if (a.leader === me.id) return "Você está na frente. Espere o martelo.";
          a.passed.add(me.id); auctionMaybeEnd(room); return;
        }

        // ---- dívidas ----
        if (type === "pay") {
          if (!room.debts.some((d) => d.from === me.id)) return "Você não deve nada.";
          if (!payDebts(room, me.id)) return "Ainda falta dinheiro. Venda construções, hipoteque ou negocie.";
          settle(room); return;
        }
        if (type === "bankrupt") {
          const d = room.debts.find((x) => x.from === me.id);
          if (!d) return "Você só pode declarar falência quando deve e não consegue pagar.";
          goBroke(room, me.id, d.to);
          return;
        }

        // ---- imóveis (a qualquer hora, fora de leilão) ----
        const i = int(data.i, -1), s = room.T.BOARD[i], pr = room.props[i];
        if (["build", "sell", "mortgage", "unmortgage", "sellbank"].includes(type)) {
          if (!s || !pr || pr.owner !== me.id) return "Esse imóvel não é seu.";
          if (room.auction && !["mortgage", "sell", "sellbank"].includes(type)) return "Espere o leilão acabar.";
        }
        if (type === "build") {
          const e = canBuild(room, me.id, i); if (e) return e;
          const cost = room.T.buildCost(i, room.event); me.cash -= cost; fx(room, me.id, null, cost, "construção", i); pr.houses++;
          if (pr.houses === 5) news(room, "🏨", "Hotel novo!", `${me.name} ergueu um hotel em ${s.name}.`, "good", i);
          log(room, `🏗️ ${me.name} construiu ${pr.houses === 5 ? "um hotel" : "uma casa"} em ${s.name}.`); return;
        }
        if (type === "sell") {
          const e = canSell(room, me.id, i); if (e) return e;
          const back = Math.floor(TB.GROUPS[s.group].house / 2);
          if (pr.houses === 5 && room.T.HOUSES - builtCount(room, false) < 4) return "O banco não tem 4 casas para trocar pelo hotel agora.";
          pr.houses--; me.cash += back; fx(room, null, me.id, back, "venda", i);
          log(room, `${me.name} vendeu ${pr.houses === 4 ? "o hotel" : "uma casa"} de ${s.name} por ${$(back)}.`); return;
        }
        if (type === "mortgage") {
          if (pr.mortgaged) return "Já está hipotecada.";
          if (locked(room, i)) return room.config.quick ? "Venda as construções deste imóvel antes de hipotecar." : "Venda as construções do grupo antes de hipotecar.";
          pr.mortgaged = true; me.cash += room.T.mortgageValue(i); fx(room, null, me.id, room.T.mortgageValue(i), "hipoteca", i);
          log(room, `${me.name} hipotecou ${s.name} e recebeu ${$(room.T.mortgageValue(i))}.`); return;
        }
        // vender ao banco (como no Business Tour): o imóvel volta a ficar livre no tabuleiro.
        // Recebe metade do preço; se estava hipotecado, não recebe nada (o banco já tinha pago essa metade).
        if (type === "sellbank") {
          if (locked(room, i)) return room.config.quick ? "Venda as construções deste imóvel antes." : "Venda as construções do grupo antes.";
          const v = pr.mortgaged ? 0 : room.T.mortgageValue(i);
          delete room.props[i];
          me.cash += v;
          if (v) fx(room, null, me.id, v, "venda ao banco", i);
          for (const [k, o] of Object.entries(room.trades)) if (checkSide(room, o.from, o.give) || checkSide(room, o.to, o.get)) delete room.trades[k]; // propostas com esse imóvel caem
          log(room, `🏦 ${me.name} vendeu ${s.name} ao banco${v ? ` por ${$(v)}` : " (estava hipotecada)"}. Está à venda de novo.`);
          return;
        }
        if (type === "unmortgage") {
          if (!pr.mortgaged) return "Não está hipotecada.";
          const c = room.T.unmortgageCost(i); if (me.cash < c) return `Precisa de ${$(c)} para resgatar.`;
          pr.mortgaged = false; me.cash -= c; fx(room, me.id, null, c, "resgate", i);
          log(room, `${me.name} resgatou ${s.name} por ${$(c)}.`); return;
        }

        // ---- trocas ----
        if (type === "propose") {
          const to = room.players[data.to];
          if (!to || to.bankrupt || to.id === me.id) return "Escolha com quem trocar.";
          const give = cleanOffer(room, data.give), get = cleanOffer(room, data.get);
          if (!give.props.length && !get.props.length && !give.cards && !get.cards) return "A troca precisa ter pelo menos um imóvel ou carta.";
          const e = checkSide(room, me.id, give) || checkSide(room, to.id, get); if (e) return e;
          if (Object.values(room.trades).filter((t) => t.from === me.id).length >= 3) return "Você já tem 3 propostas abertas.";
          const id = rid(4);
          room.trades[id] = { id, from: me.id, to: to.id, give, get };
          log(room, `🤝 ${me.name} propôs uma troca a ${to.name}: ${describe(room, give)} ⇄ ${describe(room, get)}.`); return;
        }
        if (type === "accept" || type === "reject" || type === "cancel") {
          const t = room.trades[data.id]; if (!t) return "Essa proposta não existe mais.";
          if (type === "cancel") { if (t.from !== me.id) return "A proposta não é sua."; delete room.trades[t.id]; log(room, `${me.name} retirou a proposta.`); return; }
          if (t.to !== me.id) return "A proposta não é para você.";
          delete room.trades[t.id];
          if (type === "reject") { log(room, `❌ ${me.name} recusou a troca de ${nameOf(room, t.from)}.`); return; }
          const e = checkSide(room, t.from, t.give) || checkSide(room, t.to, t.get);
          if (e) return "A troca não vale mais: " + e;
          transferSide(room, t.from, t.to, t.give); transferSide(room, t.to, t.from, t.get);
          news(room, "🤝", "Troca feita!", `${nameOf(room, t.from)} deu ${describe(room, t.give)} e recebeu ${describe(room, t.get)}.`, "info");
          log(room, `✅ Troca feita! ${nameOf(room, t.from)} deu ${describe(room, t.give)} e recebeu ${describe(room, t.get)} de ${me.name}.`);
          // propostas que ficaram impossíveis caem
          for (const [k, o] of Object.entries(room.trades)) if (checkSide(room, o.from, o.give) || checkSide(room, o.to, o.get)) delete room.trades[k];
          return;
        }
        return "Ação desconhecida.";
      }
    });

    // Reação com emoji: vai direto para a mesa, sem mexer no estado do jogo.
    socket.on("react", (data = {}) => {
      const { room, me } = ctx();
      if (!room || !me || room.phase === "lobby" || !room.T.REACTIONS.includes(data.emoji)) return;
      const now = Date.now();
      if (now - (me.lastReact || 0) < 700) return;
      me.lastReact = now;
      nsp.to(room.code).emit("react", { player: me.id, emoji: data.emoji });
    });

    socket.on("disconnect", () => {
      const { room, me } = ctx();
      if (!room) return;
      if (me) me.sockets.delete(socket.id);
      broadcast(room);
    });
  });

  // mesas paradas há mais de 12 horas somem
  limparSalasParadas(rooms, { aoApagar: (r) => { clearAuction(r); stopClocks(r); } });
};
