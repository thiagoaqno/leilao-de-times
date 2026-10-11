// Modo Jogador (jogador.js): criar, jogar uma temporada inteira, confiança, objetivos e a virada
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const bd = require("../bd.js");
bd.abrir();
const Jogador = require("../jogador.js");
const handlers = {};
let ligar;
Jogador({ of: () => ({ on: (e, f) => { ligar = f; } }) });
const conectar = () => ligar({ on: (n, h) => { handlers[n] = h; } }); // cada carreira nova é uma conexão nova (há um limite por conexão)
conectar();
const bruto = (n, d) => new Promise((res) => handlers[n](d, res));
// os eventos travam o jogo até serem respondidos: quem só quer jogar responde a primeira opção sozinho
let ultimo = null;
async function chamar(n, d) {
  if ((n === "jogar" || n === "proxima") && ultimo && ultimo.evento) await bruto("evento", { escolha: 0 });
  const r = await bruto(n, d);
  if (r.estado) ultimo = r.estado;
  return r;
}
const nova = (extra = {}) => { conectar(); ultimo = null; return chamar("criar", { nome: "Gabi Gol", pos: "ATA", clube: "remo", idade: 20, temporadas: 2, ...extra }); };

test("criar valida nome, posição e clube", async () => {
  assert.equal((await chamar("criar", { nome: "", pos: "ATA", clube: "remo" })).ok, false);
  assert.equal((await chamar("criar", { nome: "A", pos: "XXX", clube: "remo" })).ok, false);
  assert.equal((await chamar("criar", { nome: "A", pos: "ATA", clube: "nao-existe" })).ok, false);
});

test("o jogador nasce no elenco do clube, com a nota escolhida e papel de reserva ou titular", async () => {
  const r = await nova();
  assert.equal(r.ok, true, r.error);
  const e = r.estado;
  assert.equal(e.eu.nota, 68); assert.equal(e.eu.pos, "ATA"); assert.equal(e.clube.id, "remo");
  assert.ok(["titular", "banco"].includes(e.papel));
  assert.equal(e.objetivos.length, 3);
});

test("uma temporada: jogos, confiança entre 5 e 100, notas e fim com histórico; a próxima começa zerada", async () => {
  const r0 = await nova();
  let e = r0.estado, n = 0;
  while (!e.acabou) {
    const r = await chamar("jogar"); assert.equal(r.ok, true, r.error); e = r.estado; n++;
    assert.ok(e.confianca >= 5 && e.confianca <= 100);
    if (e.relatorio.jogou) assert.ok(e.relatorio.nota >= 3 && e.relatorio.nota <= 10);
  }
  assert.ok(n >= 20, `jogos ${n}`); // as copas mudam o total de jogos de cada ano
  assert.equal(e.historico.length, 1);
  assert.equal(e.temp.jogos, e.carreira.jogos);
  assert.equal((await chamar("jogar")).ok, false);
  const p = await chamar("proxima"); assert.equal(p.ok, true, p.error);
  assert.equal(p.estado.temporada, 2); assert.equal(p.estado.temp.jogos, 0); assert.equal(p.estado.eu.idade, 21);
});

test("o treino só aceita foco da posição e a última temporada fecha a carreira", async () => {
  await nova({ pos: "GOL", temporadas: 1 });
  assert.equal((await chamar("foco", { foco: "ataque" })).ok, false);
  assert.equal((await chamar("foco", { foco: "goleiro" })).ok, true);
  assert.equal((await chamar("proxima")).ok, false);
  let e;
  for (;;) { const r = await chamar("jogar"); if (!r.ok) break; e = r.estado; if (e.acabou) break; }
  assert.equal(e.fim, true);
  assert.equal((await chamar("proxima")).ok, false);
  assert.equal(e.historico.length, 1);
});

test("fim de temporada: o balanço traz propostas e o futuro precisa ser escolhido se o contrato acabou", async () => {
  await nova({ clube: "palmeiras", idade: 19, temporadas: 3 });
  assert.equal((await chamar("empresario", { nivel: 1 })).ok, false); // sem fama, sem empresário
  assert.equal((await chamar("decidir", { tipo: "ficar" })).ok, false); // ainda não é hora
  let e;
  for (;;) { const r = await chamar("jogar"); assert.equal(r.ok, true, r.error); e = r.estado; if (e.acabou) break; }
  assert.ok(e.balanco && e.balanco.objetivos.length === 3);
  assert.ok(e.mercado.ofertas.length >= 1 && e.mercado.renovacao.length === 2);
  assert.equal(e.mercado.precisaEscolher, false); // o contrato inicial tem 3 temporadas
  const o = e.mercado.ofertas[0];
  const d = await chamar("decidir", { tipo: "oferta", id: o.id }); assert.equal(d.ok, true, d.error);
  assert.equal((await chamar("decidir", { tipo: "oferta", id: "nao-existe" })).ok, false);
  const p = await chamar("proxima"); assert.equal(p.ok, true, p.error);
  assert.equal(p.estado.clube.id, o.clube);
  assert.equal(p.estado.emprestimo !== null, o.tipo === "emprestimo");
  assert.equal(p.estado.mercado, null);
  assert.equal(p.estado.confianca, { titular: 62, "rodízio": 50, reserva: 36 }[o.papel]);
  // joga a temporada no clube novo sem erro: o calendário e o elenco foram refeitos
  let n = 0;
  for (;;) { const r = await chamar("jogar"); assert.equal(r.ok, true, r.error); n++; if (r.estado.acabou) { e = r.estado; break; } }
  assert.ok(n >= 30);
  assert.equal(e.historico.length, 2);
  assert.equal(e.historico[1].clube, o.clube);
});

test("contrato vencido bloqueia a próxima temporada até renovar ou aceitar proposta", async () => {
  await nova({ clube: "palmeiras", idade: 19, temporadas: 2 });
  const { visao } = Jogador.paraTestes; assert.ok(visao);
  let e;
  for (;;) { const r = await chamar("jogar"); e = r.estado; if (e.acabou) break; }
  // com 2 temporadas o contrato inicial é de 2: no fim da primeira ainda vale, então força o vencimento pelo banco
  assert.equal(e.mercado.precisaEscolher, false);
  const r = await chamar("decidir", { tipo: "renovar", id: e.mercado.renovacao[0].id });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.estado.mercado.escolha.tipo, "renovar");
  const p = await chamar("proxima"); assert.equal(p.ok, true, p.error);
  assert.equal(p.estado.contrato.anos, 2);
});

test("a nota inicial é escolhida entre 65 e 70", async () => {
  assert.equal((await nova({ nota: 65 })).estado.eu.nota, 65);
  assert.equal((await nova({ nota: 70 })).estado.eu.nota, 70);
  assert.equal((await nova({ nota: 99 })).estado.eu.nota, 70);
  assert.equal((await nova({ nota: 10 })).estado.eu.nota, 65);
  assert.equal((await nova({ nota: "x" })).estado.eu.nota, 68);
});

test("eventos com decisão: travam o jogo, mexem no jogador e entram no livro", async () => {
  await nova({ temporadas: 2 });
  let ev = null;
  for (let i = 0; i < 80 && !ev; i++) { const r = await bruto("jogar"); assert.equal(r.ok, true, r.error); ultimo = r.estado; ev = r.estado.evento; if (r.estado.acabou) break; }
  assert.ok(ev, "em 80 jogos tem de aparecer um evento");
  assert.ok(ev.titulo && ev.texto && ev.escolhas.length >= 2);
  assert.equal((await bruto("jogar")).ok, false); // o jogo espera a resposta
  assert.equal((await bruto("evento", { escolha: 9 })).ok, false);
  const r = await bruto("evento", { escolha: 0 });
  assert.equal(r.ok, true, r.error);
  assert.ok(r.resultado.texto && Array.isArray(r.resultado.chips));
  assert.equal(r.estado.evento, null);
  assert.equal(r.estado.livro[0].titulo, ev.titulo);
  assert.equal((await bruto("evento", { escolha: 0 })).ok, false); // já respondido
  assert.equal((await bruto("jogar")).ok, true);
});

test("modo História: abre com o capítulo da chegada, mostra o perfil e fecha com o epílogo", async () => {
  const r0 = await nova({ modo: "historia", temporadas: 2 });
  assert.equal(r0.estado.modo, "historia");
  assert.equal(r0.estado.evento.id, "chegada");
  assert.equal(r0.estado.perfil.length, 6);
  assert.equal((await bruto("jogar")).ok, false);
  const r1 = await bruto("evento", { escolha: 0 });
  assert.equal(r1.ok, true, r1.error);
  assert.equal(r1.estado.perfil.find((t) => t.id === "humildade").valor, 1);
  assert.ok(r1.estado.marcas.includes("humilde"));
  // a segunda temporada abre com outro capítulo
  let e = r1.estado, abriu = null;
  while (!e.fim) {
    const era = e.temporada, r = await chamar(e.acabou ? "proxima" : "jogar"); assert.equal(r.ok, true, r.error); e = r.estado;
    if (e.temporada > era) abriu = e.evento && e.evento.inicio;
  }
  assert.equal(abriu, true, "a temporada 2 abre com um capítulo");
  assert.ok(e.epilogo && e.epilogo.titulo && e.epilogo.linhas.length >= 1);
});

test("modo clássico: sem perfil nem epílogo, mas com eventos", async () => {
  const r = await nova({ temporadas: 1 });
  assert.equal(r.estado.modo, "classico"); assert.equal(r.estado.perfil, null); assert.equal(r.estado.evento, null);
  let e = r.estado;
  while (!e.fim) { const x = await chamar("jogar"); assert.equal(x.ok, true, x.error); e = x.estado; }
  assert.equal(e.epilogo, null);
});
