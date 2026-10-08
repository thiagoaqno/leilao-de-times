// Leilão: o resumo do campeão (simulador.js) traz o que a festa do campeão mostra (public/leilao/campeao.js): o jogo
// que decidiu o título (placar, quem marcou, prorrogação e pênaltis), quem é o campeão e o dono do time. E continua
// tudo igual com a mesma semente (a festa só copia o que já saiu, não sorteia nada).
const test = require("node:test");
const assert = require("node:assert");
const { simulate } = require("../simulador.js");

const NOMES = ["Neymar (ATA)", "Lionel Messi (ATA)", "Casemiro (MEI)", "Marquinhos (ZAG)", "Alisson (GOL)", "Vinícius Júnior (ATA)", "Rodrygo (ATA)", "Toni Kroos (MEI)",
  "Sergio Ramos (ZAG)", "Thibaut Courtois (GOL)", "Kylian Mbappé (ATA)", "Antoine Griezmann (ATA)", "N'Golo Kanté (MEI)", "Raphaël Varane (ZAG)", "Hugo Lloris (GOL)",
  "Erling Haaland (ATA)", "Mohamed Salah (ATA)", "Kevin De Bruyne (MEI)", "Virgil van Dijk (ZAG)", "Ederson (GOL)", "Harry Kane (ATA)", "Son Heung-min (ATA)",
  "Luka Modrić (MEI)", "Rúben Dias (ZAG)", "Manuel Neuer (GOL)", "Robert Lewandowski (ATA)", "Karim Benzema (ATA)", "Pedri (MEI)", "Éder Militão (ZAG)", "Jan Oblak (GOL)",
  "Bukayo Saka (ATA)", "Phil Foden (ATA)", "Declan Rice (MEI)", "William Saliba (ZAG)", "David Raya (GOL)", "Lamine Yamal (ATA)", "Dani Olmo (ATA)", "Gavi (MEI)",
  "Ronald Araújo (ZAG)", "Marc-André ter Stegen (GOL)", "Jude Bellingham (MEI)", "Jamal Musiala (MEI)", "Florian Wirtz (MEI)", "Achraf Hakimi (LAT)", "Alphonso Davies (LAT)"];
function sala(n, per) {
  const order = [], captains = {};
  for (let i = 0; i < n; i++) {
    const id = "c" + i; order.push(id);
    captains[id] = { name: "Dono" + i, teamName: i % 2 ? "Time " + i : "", team: NOMES.slice((i * per) % 40, (i * per) % 40 + per).map((player) => ({ player })), formation: "auto", pins: {} };
  }
  return { order, captains };
}
// simula até o fim, decidindo os pênaltis da galera sempre do mesmo jeito (sorteado pelo id da cobrança: na morte
// súbita, os dois times não podem acertar e errar sempre juntos, senão a disputa não acaba)
const sorte = (id) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1000003, 7) % 3;
function completo(room, opts, seed) {
  const dec = {}; let res;
  for (let v = 0; v < 400; v++) {
    res = simulate(room, opts, { seed, decisoes: dec, penaltis: opts.penaltis });
    if (res.completo) break;
    for (const l of res.lives) if (l) for (const j of l.jogos) if (j.pendente) { const gol = sorte(j.pendente.id) > 0; dec[j.pendente.id] = { chute: "a", pulo: gol ? "b" : "a", fora: false, gol }; }
  }
  return res;
}

test("leilão: o resumo do campeão traz a final, o campeão e o dono, em todos os formatos", () => {
  let comPenaltis = 0, comProrrogacao = 0;
  for (let k = 0; k < 6; k++) for (const n of [2, 3, 4, 6, 8]) for (const format of ["league", "knockout"]) for (const sport of ["futsal", "futebol"]) {
    const room = sala(n, sport === "futebol" ? 6 : 5), res = completo(room, { sport, format, penaltis: k % 2 === 0 }, "s" + k);
    const s = res.summary, f = s.final, onde = `${n} times, ${format}, ${sport}, semente ${k}`;
    assert.ok(res.completo && s && f, onde);
    assert.ok(f.vencedor === "A" || f.vencedor === "B", `${onde}: a final tem vencedor`);
    assert.strictEqual(f[f.vencedor].id, s.id, `${onde}: o vencedor da final é o campeão`);
    assert.strictEqual(f[f.vencedor].nome, s.campeao, onde);
    assert.strictEqual(res.campeao, s.id, onde);
    assert.strictEqual(s.dono, room.captains[s.id].name, `${onde}: o dono do time`);
    assert.strictEqual(f.gols.length, f.gA + f.gB, `${onde}: um gol para cada um do placar`);
    for (const g of f.gols) assert.ok(g.nome && g.min > 0 && (g.lado === "A" || g.lado === "B"), onde);
    if (n === 2) assert.match(f.titulo, /^Jogo \d$/, `${onde}: na série, o último jogo`); else assert.strictEqual(f.titulo, "Final", onde);
    // o placar da final empatado só pode terminar nos pênaltis
    if (f.gA === f.gB) assert.ok(f.pens && f.pens.cob.length, `${onde}: empate na final vai para os pênaltis`);
    for (const p of s.time) assert.ok(p.pos && p.vaga, onde);
    if (f.pens) comPenaltis++; if (f.extra) comProrrogacao++;
  }
  assert.ok(comPenaltis > 0 && comProrrogacao > 0, `tem final nos pênaltis (${comPenaltis}) e com prorrogação (${comProrrogacao})`);
});

test("leilão: a mesma semente dá o mesmo campeonato (e o mesmo resumo, tirando a data)", () => {
  for (const [n, format, sport] of [[2, "league", "futsal"], [5, "league", "futebol"], [7, "knockout", "futsal"]]) {
    const a = completo(sala(n, 5), { sport, format, penaltis: true }, "fixa"), b = completo(sala(n, 5), { sport, format, penaltis: true }, "fixa");
    assert.deepStrictEqual(a.sections, b.sections); assert.deepStrictEqual(a.lives, b.lives);
    const { data: _a, ...sa } = a.summary, { data: _b, ...sb } = b.summary;
    assert.deepStrictEqual(sa, sb);
  }
});
