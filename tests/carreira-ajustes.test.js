// Carreira: o impulso da defesa arriscada, a formação trocada no meio do jogo com um jogador a menos, o pós-jogo do jogo certo e os escudos da API.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const Motor = require("../public/carreira/motor.js");
const Temporada = require("../public/carreira/temporada.js");
const { novaCarreira, proximoJogoMundo, simularMinha, fecharRodada, estado, sementeDoJogo } = require("../carreira.js").paraTestes;

const POSICOES = ["GOL", "ZAG", "ZAG", "LD", "LE", "VOL", "MC", "MC", "MEI", "PE", "PD", "ATA", "ATA", "ZAG"];
const time = (id, formacao = "4-3-3") => ({ id, nome: id, formacao, jogadores: POSICOES.map((pos, i) => ({ id: `${id}${i}`, nome: `${id} ${i}`, pos, nota: 74, atr: { fin: 70, pas: 70, dri: 70, def: 70, fis: 70, rit: 70, gol: 70 } })) });

// roda o jogo escolhendo, em cada lance de defesa (ataque do rival), a opção `opcao`; o resto no automático
function jogarDefendendo(semente, opcao, extra = {}) {
  const decisoes = {}; let r;
  for (let v = 0; v < 40; v++) {
    r = Motor.simularPartida({ casa: time("a"), fora: time("b"), semente, modo: 3, controla: 0, decisoes, ...extra });
    if (r.completo) return r;
    const p = r.parado;
    decisoes[p.id] = p.tipo === "lance" && p.lance === "ataque_contra" ? opcao : Motor.decisaoAutomatica(p);
  }
  throw new Error("não terminou");
}

test("defender arriscando mais paga mais: as opções de defesa trazem o bônus no próximo lance de ataque (maior onde a chance de evitar o gol é menor)", () => {
  let pedido = null;
  for (let k = 0; k < 400 && !pedido; k++) {
    const decisoes = {};
    for (let v = 0; v < 40; v++) { const r = Motor.simularPartida({ casa: time("a"), fora: time("b"), semente: `d${k}`, modo: 3, controla: 0, decisoes }); if (r.completo) break; if (r.parado.lance === "ataque_contra") { pedido = r.parado; break; } decisoes[r.parado.id] = Motor.decisaoAutomatica(r.parado); }
  }
  assert.ok(pedido, "um lance de defesa");
  const por = Object.fromEntries(pedido.opcoes.map((o) => [o.id, o]));
  assert.ok(Object.values(por).every((o) => o.bonus > 0), "toda opção de defesa mostra o bônus");
  const ordem = [...pedido.opcoes].sort((a, b) => a.chance - b.chance);
  assert.ok(ordem.every((o, i, l) => i === 0 || o.bonus <= l[i - 1].bonus + 1e-9), "quanto menor a chance de evitar o gol, maior o bônus");
  assert.ok(por.bloco.chance > por.contra.chance && por.contra.bonus > por.bloco.bonus + 0.4, "o bloco baixo é seguro; o contra-ataque paga muito mais");
});

test("o impulso vale: quem defende arriscando faz mais gols (e leva mais) do que quem fecha o bloco", () => {
  let gfMano = 0, gaMano = 0, gfBloco = 0, gaBloco = 0, jogos = 0;
  for (let k = 0; k < 220; k++) {
    const m = jogarDefendendo(`i${k}`, "contra"), b = jogarDefendendo(`i${k}`, "bloco");
    gfMano += m.placar[0]; gaMano += m.placar[1]; gfBloco += b.placar[0]; gaBloco += b.placar[1]; jogos++;
  }
  assert.ok(gfMano > gfBloco, `o contra-ataque faz mais gols (${(gfMano / jogos).toFixed(2)} x ${(gfBloco / jogos).toFixed(2)})`);
  assert.ok(gaMano > gaBloco, `e leva mais gols (${(gaMano / jogos).toFixed(2)} x ${(gaBloco / jogos).toFixed(2)})`);
});

test("trocar a formação com um jogador a menos mantém os mesmos 10 em campo, cada um na vaga em que rende mais, e a vaga aberta pode ser ocupada na formação nova", () => {
  const cfg = { casa: time("a"), fora: time("b"), modo: 2, controla: 0 };
  let achou = null;
  for (let k = 0; k < 4000 && !achou; k++) {
    const decisoes = {};
    for (let v = 0; v < 12; v++) { const r = Motor.simularPartida({ ...cfg, semente: `f${k}`, decisoes }); if (r.completo) break; if (r.parado.motivo === "vermelho") { achou = { semente: `f${k}`, decisoes: { ...decisoes }, p: r.parado }; break; } decisoes[r.parado.id] = Motor.decisaoAutomatica(r.parado); }
  }
  assert.ok(achou);
  const { p } = achou, antes = p.campo.filter((v) => v.id).map((v) => v.id).sort();
  const seguir = (d) => { const decisoes = { ...achou.decisoes, [p.id]: d }; for (let v = 0; v < 12; v++) { const r = Motor.simularPartida({ ...cfg, semente: achou.semente, decisoes }); if (r.completo) return { r, proximo: null }; if (r.parado.id !== p.id) return { r, proximo: r.parado }; } };
  const { proximo } = seguir({ tatica: p.tatica, formacao: "5-4-1", subs: [], trocas: [] });
  assert.ok(proximo && proximo.formacao === "5-4-1", "a formação mudou");
  assert.deepStrictEqual(proximo.campo.filter((v) => v.id).map((v) => v.id).sort(), antes, "os mesmos jogadores, sem o expulso nem reservas");
  assert.strictEqual(proximo.campo.filter((v) => !v.id).length, 1, "ainda falta um (a vaga aberta passa para a formação nova)");
  // a vaga aberta da formação nova é ocupada por um reserva: depois da troca de formação a lista é a ocupar2
  const aberta = proximo.campo.findIndex((v) => !v.id), reserva = p.banco.find((b) => b.pos !== "GK");
  const { r: r2 } = seguir({ tatica: p.tatica, formacao: "5-4-1", subs: [], trocas: [], ocupar2: [["e", reserva.id, (() => { const d = Motor.escalacaoDetalhada; return aberta; })()]] });
  assert.ok(r2.eventos.some((e) => e.tipo === "entrada" && e.jogador === reserva.id), "o reserva entrou na vaga aberta da formação nova");
});

test("o pós-jogo diz de que jogo é (a competição e a rodada ou a fase) e é sempre o do jogo que acabou de terminar", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  const vistos = [];
  for (let i = 0; i < 6; i++) {
    const jogo = proximoJogoMundo(save);
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, agregado: [0, 0], casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    const r = simularMinha(save); fecharRodada(save, r);
    const pj = estado(save).posJogo;
    assert.strictEqual(pj.jogoId, jogo.id); assert.deepStrictEqual(pj.placar, r.placar); assert.strictEqual(pj.casa, jogo.casa);
    vistos.push(pj.rotulo);
  }
  assert.ok(vistos[0].startsWith("Brasileirão Série A · rodada 1"), vistos[0]);
  assert.ok(vistos.some((x) => x.startsWith("Libertadores · ") && /grupos|fase/.test(x)), `a Libertadores aparece com a fase: ${vistos.join(" | ")}`);
  assert.ok(vistos.every((x) => x.includes(" · ")));
});

test("os escudos da API: o arquivo existe, cada clube tem um endereço da TheSportsDB e a página carrega o arquivo", () => {
  const raiz = path.join(__dirname, "..", "public", "carreira");
  const js = fs.readFileSync(path.join(raiz, "escudos-api.js"), "utf8");
  const api = JSON.parse(js.slice(js.indexOf("{"), js.lastIndexOf("}") + 1));
  const ids = Object.keys(api);
  assert.ok(ids.length >= 120, `a maioria dos clubes tem escudo da API (${ids.length})`);
  assert.ok(ids.every((id) => /^https:\/\/(r2\.)?thesportsdb\.com\/images\/media\/team\/badge\//.test(api[id].url)), "só endereços de escudo da TheSportsDB");
  for (const id of ["flamengo", "palmeiras", "real-madrid", "manchester-city"]) assert.ok(api[id], id);
  assert.ok(fs.readFileSync(path.join(raiz, "index.html"), "utf8").includes('src="escudos-api.js"'));
  assert.ok(fs.readFileSync(path.join(raiz, "inicio.js"), "utf8").includes("ESCUDOS_API"));
});
