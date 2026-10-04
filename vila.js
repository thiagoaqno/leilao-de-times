// Vila da Galera — o lobby em mapinha 2D. Canal "/vila" do Socket.io.
// Guarda quem está andando pela vila agora (posição, direção, roupa e nick) e repassa para os outros.
// Também cuida dos desafios e das batalhas de Galeramon/Pokémon entre quem está na vila.
//
// Cada pessoa tem um id público (o que os outros veem) e um "token" secreto guardado na aba.
// Se a conexão cair no meio de uma batalha (celular bloqueou, trocou de rede, a aba recarregou…),
// a pessoa tem RECONNECT_MS para voltar com o mesmo token e a batalha continua de onde parou.
const G = require("./galeramon.js");
const { rid, limparNome: cleanName } = require("./salas.js");
const MW = 34, MH = 45, LOOKS = 6, MAX = 80; // o mesmo tamanho do mapa da página (public/index.html)
const INVITE_MS = 20000, CHOICE_MS = 45000, RECONNECT_MS = +process.env.VILA_RECONNECT_MS || 45000;
const POKEMON_ON = process.env.POKEMON !== "0"; // modo Pokémon (sprites do PokeAPI). POKEMON=0 desliga.
const GAMES = ["leilao", "banco", "uno", "sinuca", "truco", "domino", "ludo", "botao", "corrida", "tiro", "pelada", "rocket", "batalha", "tenis", "rumi", "proibida", "pingpong"];
const DIRS = ["up", "down", "left", "right"];
const int = (v, d) => { const n = parseInt(v); return Number.isFinite(n) ? n : d; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cleanToken = (t) => (typeof t === "string" && /^[a-f0-9]{16,64}$/.test(t) ? t : null);

module.exports = function attachVila(io) {
  const nsp = io.of("/vila");
  const players = new Map(); // id público -> { id, token, sock, name, look, x, y, dir, battle, offline, dropTimer }
  const byToken = new Map(); // token -> jogador
  const invites = new Map(); // id de quem foi desafiado -> { from, team, mode, timer }

  const pub = (p) => ({ id: p.id, name: p.name, look: p.look, x: p.x, y: p.y, dir: p.dir, busy: !!p.battle });
  const to = (id) => { const p = players.get(id); return nsp.to(p ? p.sock : "-"); }; // manda só para essa pessoa
  // avisa os outros que alguém mudou. A própria pessoa não recebe, senão vira um "clone" dela na tela.
  const tellOthers = (p, ev = "update") => nsp.except(p.sock).emit(ev, pub(p));

  // ---------- batalhas ----------
  function sendBattle(b, only) {
    b.state.sides.forEach((side, s) => {
      if (only && side.pid !== only) return;
      to(side.pid).emit("bt", { ...G.view(b.state, s), events: b.state.events, seq: b.seq, deadline: b.deadline });
    });
  }
  function armTimer(b) {
    clearTimeout(b.timer);
    if (b.state.phase === "over") { b.deadline = null; return; }
    b.deadline = Date.now() + CHOICE_MS;
    b.timer = setTimeout(() => { // quem não escolheu a tempo usa um golpe (ou troca) sorteado
      [0, 1].forEach((s) => { if (G.needs(b.state, s) && !b.state.sides[s].choice) b.state.sides[s].choice = G.autoChoice(b.state, s); });
      step(b);
    }, CHOICE_MS);
  }
  function step(b) {
    const st = b.state;
    if ([0, 1].some((s) => G.needs(st, s) && !st.sides[s].choice)) { sendBattle({ ...b, state: { ...st, events: [] } }); return; }
    G.resolve(st);
    b.seq++;
    armTimer(b);
    sendBattle(b);
    if (st.phase === "over") endBattle(b);
  }
  function endBattle(b) {
    clearTimeout(b.timer);
    b.state.sides.forEach((side) => {
      const p = players.get(side.pid);
      if (p && p.battle === b) { p.battle = null; if (!p.offline) tellOthers(p); }
    });
    const w = b.state.winner;
    if (w >= 0) nsp.emit("news", { text: `⚔️ ${b.state.sides[w].name} venceu ${b.state.sides[1 - w].name} no ${b.state.mode === "pokemon" ? "Pokémon" : "Galeramon"}!` });
  }
  function leaveBattle(p) { // desistiu (ou não voltou a tempo): perde
    const b = p.battle;
    if (!b || b.state.phase === "over") return;
    const s = b.state.sides.findIndex((x) => x.pid === p.id);
    G.forfeit(b.state, s);
    b.seq++;
    sendBattle(b);
    endBattle(b);
  }
  const rival = (p) => { const b = p.battle; return b && b.state.sides.find((x) => x.pid !== p.id); };
  function dropInvites(id) {
    const inv = invites.get(id);
    if (inv) { clearTimeout(inv.timer); invites.delete(id); to(inv.from).emit("inviteGone", { id, why: "saiu" }); }
    for (const [t, v] of invites) if (v.from === id) { clearTimeout(v.timer); invites.delete(t); to(t).emit("inviteGone", { id }); }
  }
  function remove(p, game) { // sai da vila de vez
    clearTimeout(p.dropTimer);
    dropInvites(p.id);
    leaveBattle(p);
    players.delete(p.id);
    if (byToken.get(p.token) === p) byToken.delete(p.token);
    nsp.except(p.sock).emit("leave", { id: p.id, name: p.name, game });
  }

  nsp.on("connection", (socket) => {
    let me = null, budget = 40, lastRefill = Date.now();
    socket.emit("cfg", { pokemon: POKEMON_ON });
    const allow = () => { // no máximo ~20 atualizações por segundo por pessoa
      const now = Date.now();
      budget = Math.min(40, budget + ((now - lastRefill) / 1000) * 20); lastRefill = now;
      if (budget < 1) return false;
      budget--; return true;
    };
    const mine = () => me && me.sock === socket.id; // esta conexão ainda é a "dona" do jogador?

    socket.on("hello", (d = {}) => {
      const name = cleanName(d.name);
      if (!name) return;
      const token = cleanToken(d.token) || rid();
      const look = clamp(int(d.look, 0), 0, LOOKS - 1);
      const back = byToken.get(token);
      if (back && back !== me) { // voltou depois de cair: assume o mesmo jogador (e a batalha, se tiver)
        clearTimeout(back.dropTimer);
        const was = back.sock;
        back.sock = socket.id; back.offline = false; back.name = name; back.look = look;
        me = back;
        if (was !== socket.id) nsp.sockets.get(was)?.disconnect(true); // a aba antiga, se ainda estiver aberta, perde a vez
        socket.emit("me", { id: me.id });
        socket.emit("all", [...players.values()].filter((p) => p !== me && !p.offline).map(pub));
        tellOthers(me); // quem caiu e voltou reaparece sem o aviso de "chegou na vila"
        if (me.battle) {
          const r = rival(me);
          if (r) to(r.pid).emit("news", { text: `🔌 ${me.name} voltou! A batalha continua.` });
          sendBattle({ ...me.battle, state: { ...me.battle.state, events: [] } }, me.id);
        }
        return;
      }
      if (!me && players.size >= MAX) return socket.emit("full");
      const fresh = !me;
      if (fresh) {
        me = { id: rid(6), token, sock: socket.id, battle: null, offline: false };
        players.set(me.id, me); byToken.set(token, me);
      }
      Object.assign(me, { name, look, x: clamp(int(d.x, 16), 0, MW - 1), y: clamp(int(d.y, 13), 0, MH - 1), dir: DIRS.includes(d.dir) ? d.dir : "down" });
      socket.emit("me", { id: me.id, token });
      socket.emit("all", [...players.values()].filter((p) => p !== me && !p.offline).map(pub));
      tellOthers(me, fresh ? "join" : "update");
    });

    socket.on("move", (d = {}) => {
      if (!mine() || !allow()) return;
      me.x = clamp(int(d.x, me.x), 0, MW - 1); me.y = clamp(int(d.y, me.y), 0, MH - 1);
      if (DIRS.includes(d.dir)) me.dir = d.dir;
      nsp.except(me.sock).emit("move", { id: me.id, x: me.x, y: me.y, dir: me.dir, run: !!d.run });
    });

    socket.on("look", (d = {}) => {
      if (!mine() || !allow()) return;
      me.look = clamp(int(d.look, me.look), 0, LOOKS - 1);
      const name = cleanName(d.name); if (name) me.name = name;
      tellOthers(me);
    });

    socket.on("enter", (game) => { if (mine()) { remove(me, GAMES.includes(game) ? game : null); me = null; } }); // entrou numa casinha
    socket.on("disconnect", () => {
      if (!mine()) return;
      const p = me;
      if (p.battle && p.battle.state.phase !== "over") { // caiu no meio da batalha: espera um pouco antes de dar a derrota
        p.offline = true;
        dropInvites(p.id);
        nsp.except(p.sock).emit("leave", { id: p.id });
        const r = rival(p);
        if (r) to(r.pid).emit("news", { text: `📵 ${p.name} caiu. Esperando voltar (até ${RECONNECT_MS / 1000}s)…` });
        p.dropTimer = setTimeout(() => remove(p, null), RECONNECT_MS);
      } else remove(p, null);
    });

    // ---------- desafio ----------
    socket.on("challenge", (d = {}, cb) => {
      const reply = typeof cb === "function" ? cb : () => {};
      if (!mine() || !allow()) return reply({ error: "Espere um pouco." });
      const target = players.get(String(d.to || ""));
      if (!target || target === me || target.offline) return reply({ error: "Essa pessoa não está mais na vila." });
      if (me.battle) return reply({ error: "Você já está numa batalha." });
      if (target.battle) return reply({ error: `${target.name} já está numa batalha.` });
      if (invites.has(target.id)) return reply({ error: `${target.name} já tem um desafio esperando resposta.` });
      if ([...invites.values()].some((v) => v.from === me.id)) return reply({ error: "Você já desafiou alguém. Espere a resposta." });
      const mode = d.mode === "pokemon" && POKEMON_ON ? "pokemon" : "galeramon";
      const from = me.id;
      const inv = { from, team: d.team, mode, timer: setTimeout(() => { invites.delete(target.id); to(from).emit("inviteGone", { id: target.id, why: "tempo" }); to(target.id).emit("inviteGone", { id: from }); }, INVITE_MS) };
      invites.set(target.id, inv);
      to(target.id).emit("invite", { from, name: me.name, ms: INVITE_MS, mode });
      reply({ ok: true, ms: INVITE_MS });
    });

    socket.on("answer", (d = {}) => {
      if (!mine()) return;
      const inv = invites.get(me.id);
      if (!inv || inv.from !== d.from) return;
      clearTimeout(inv.timer); invites.delete(me.id);
      const other = players.get(inv.from);
      if (!d.ok || !other || other.offline || other.battle || me.battle) { to(inv.from).emit("inviteGone", { id: me.id, why: d.ok ? "ocupado" : "recusou" }); return; }
      const b = { state: G.createBattle({ id: other.id, name: other.name, team: inv.team }, { id: me.id, name: me.name, team: d.team }, inv.mode), seq: 0, timer: null, deadline: null };
      other.battle = b; me.battle = b;
      dropInvites(other.id); dropInvites(me.id);
      tellOthers(other); tellOthers(me);
      armTimer(b);
      sendBattle({ ...b, state: { ...b.state, events: [{ t: "start" }] } });
    });

    // ---------- na batalha ----------
    socket.on("act", (d = {}) => {
      const b = mine() && me.battle;
      if (!b) return;
      const s = b.state.sides.findIndex((x) => x.pid === me.id);
      if (!G.needs(b.state, s) || b.state.sides[s].choice) return;
      const c = G.validChoice(b.state, s, d);
      if (!c) return;
      b.state.sides[s].choice = c;
      step(b);
    });
    socket.on("forfeit", () => { if (mine()) leaveBattle(me); });
  });
};
